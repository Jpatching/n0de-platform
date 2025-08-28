using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Networking;
using Photon.Pun;
using Photon.Realtime;

namespace PV3.Unity
{
    /// <summary>
    /// PV3 Game Manager - Handles integration between Unity multiplayer games and PV3 platform
    /// This script manages the complete flow from match initialization to result submission
    /// </summary>
    public class PV3GameManager : MonoBehaviourPunPV, IPunObservable
    {
        [Header("PV3 Configuration")]
        [SerializeField] private string pv3ApiUrl = "https://your-backend-url.com/api";
        [SerializeField] private string gameType = "UnityRacing"; // UnityRacing, UnityFighting, etc.
        [SerializeField] private string unityBuildVersion = "1.0.0";
        [SerializeField] private bool enableAntiCheat = true;
        [SerializeField] private bool enableDebugLogs = true;

        [Header("Game State")]
        [SerializeField] private GameState currentGameState = GameState.Waiting;
        [SerializeField] private float gameStartTime;
        [SerializeField] private float gameEndTime;
        [SerializeField] private int player1Score = 0;
        [SerializeField] private int player2Score = 0;
        [SerializeField] private int totalActions = 0;

        [Header("PV3 Match Data")]
        public string matchId;
        public string photonRoomId;
        public string player1Id;
        public string player2Id;
        public string player1PublicKey;
        public string player2PublicKey;
        public decimal wagerAmount;

        // Events
        public static event Action<GameState> OnGameStateChanged;
        public static event Action<int, int> OnScoreUpdated;
        public static event Action<string> OnGameCompleted;
        public static event Action<string> OnError;

        // Anti-cheat tracking
        private List<GameEvent> gameEvents = new List<GameEvent>();
        private Dictionary<string, object> antiCheatData = new Dictionary<string, object>();

        public enum GameState
        {
            Waiting,
            Initializing,
            Starting,
            Playing,
            Finished,
            Submitting,
            Completed,
            Error
        }

        [System.Serializable]
        public class GameEvent
        {
            public float timestamp;
            public string eventType;
            public string playerId;
            public Dictionary<string, object> data;

            public GameEvent(string type, string player, Dictionary<string, object> eventData = null)
            {
                timestamp = Time.time;
                eventType = type;
                playerId = player;
                data = eventData ?? new Dictionary<string, object>();
            }
        }

        void Start()
        {
            // Initialize PV3 integration
            InitializePV3Integration();
        }

        /// <summary>
        /// Initialize PV3 integration with match data from URL parameters or PlayerPrefs
        /// </summary>
        private void InitializePV3Integration()
        {
            try
            {
                // Get match data from URL parameters (WebGL) or PlayerPrefs
                matchId = GetMatchParameter("matchId");
                photonRoomId = GetMatchParameter("photonRoomId");
                player1Id = GetMatchParameter("player1Id");
                player2Id = GetMatchParameter("player2Id");
                player1PublicKey = GetMatchParameter("player1PublicKey");
                player2PublicKey = GetMatchParameter("player2PublicKey");
                
                if (decimal.TryParse(GetMatchParameter("wagerAmount"), out decimal wager))
                {
                    wagerAmount = wager;
                }

                if (string.IsNullOrEmpty(matchId) || string.IsNullOrEmpty(photonRoomId))
                {
                    LogError("Missing required PV3 match parameters");
                    ChangeGameState(GameState.Error);
                    return;
                }

                LogDebug($"PV3 Match initialized: {matchId}, Room: {photonRoomId}");
                
                // Connect to Photon with the provided room ID
                ConnectToPhotonRoom();
            }
            catch (Exception ex)
            {
                LogError($"Failed to initialize PV3 integration: {ex.Message}");
                ChangeGameState(GameState.Error);
            }
        }

        /// <summary>
        /// Connect to Photon multiplayer room
        /// </summary>
        private void ConnectToPhotonRoom()
        {
            ChangeGameState(GameState.Initializing);
            
            // Set Photon room name to the PV3 photon room ID
            PhotonNetwork.LocalPlayer.NickName = GetCurrentPlayerId();
            
            // Connect to Photon
            if (!PhotonNetwork.IsConnected)
            {
                PhotonNetwork.ConnectUsingSettings();
            }
            else
            {
                JoinPhotonRoom();
            }
        }

        /// <summary>
        /// Join the specific Photon room for this match
        /// </summary>
        private void JoinPhotonRoom()
        {
            RoomOptions roomOptions = new RoomOptions
            {
                MaxPlayers = 2,
                IsVisible = false,
                IsOpen = true
            };

            PhotonNetwork.JoinOrCreateRoom(photonRoomId, roomOptions, TypedLobby.Default);
        }

        #region Photon Callbacks

        public override void OnConnectedToMaster()
        {
            LogDebug("Connected to Photon Master");
            JoinPhotonRoom();
        }

        public override void OnJoinedRoom()
        {
            LogDebug($"Joined Photon room: {PhotonNetwork.CurrentRoom.Name}");
            
            // Wait for both players to join
            if (PhotonNetwork.CurrentRoom.PlayerCount == 2)
            {
                StartGame();
            }
            else
            {
                ChangeGameState(GameState.Waiting);
                LogDebug("Waiting for second player...");
            }
        }

        public override void OnPlayerEnteredRoom(Player newPlayer)
        {
            LogDebug($"Player joined: {newPlayer.NickName}");
            
            // Start game when both players are present
            if (PhotonNetwork.CurrentRoom.PlayerCount == 2)
            {
                StartGame();
            }
        }

        public override void OnPlayerLeftRoom(Player otherPlayer)
        {
            LogDebug($"Player left: {otherPlayer.NickName}");
            
            // Handle player disconnect - you might want to pause the game or declare winner
            if (currentGameState == GameState.Playing)
            {
                HandlePlayerDisconnect(otherPlayer.NickName);
            }
        }

        #endregion

        /// <summary>
        /// Start the Unity multiplayer game
        /// </summary>
        private void StartGame()
        {
            if (currentGameState != GameState.Waiting) return;

            ChangeGameState(GameState.Starting);
            gameStartTime = Time.time;
            
            // Record game start event
            RecordGameEvent("game_start", GetCurrentPlayerId(), new Dictionary<string, object>
            {
                {"room_id", photonRoomId},
                {"player_count", PhotonNetwork.CurrentRoom.PlayerCount},
                {"timestamp", gameStartTime}
            });

            // Start your game logic here
            StartCoroutine(StartGameCountdown());
        }

        private IEnumerator StartGameCountdown()
        {
            // 3-second countdown
            for (int i = 3; i > 0; i--)
            {
                LogDebug($"Game starting in {i}...");
                yield return new WaitForSeconds(1f);
            }

            ChangeGameState(GameState.Playing);
            LogDebug("Game started!");
        }

        /// <summary>
        /// Update player score (call this from your game logic)
        /// </summary>
        public void UpdateScore(string playerId, int newScore)
        {
            if (currentGameState != GameState.Playing) return;

            bool isPlayer1 = playerId == player1Id;
            int oldScore = isPlayer1 ? player1Score : player2Score;

            if (isPlayer1)
            {
                player1Score = newScore;
            }
            else
            {
                player2Score = newScore;
            }

            // Record score update event
            RecordGameEvent("score_update", playerId, new Dictionary<string, object>
            {
                {"old_score", oldScore},
                {"new_score", newScore},
                {"timestamp", Time.time}
            });

            OnScoreUpdated?.Invoke(player1Score, player2Score);
            
            // Sync score across network
            if (PhotonNetwork.IsMasterClient)
            {
                photonView.RPC("SyncScore", RpcTarget.Others, playerId, newScore);
            }
        }

        [PunRPC]
        private void SyncScore(string playerId, int score)
        {
            if (playerId == player1Id)
            {
                player1Score = score;
            }
            else
            {
                player2Score = score;
            }
            
            OnScoreUpdated?.Invoke(player1Score, player2Score);
        }

        /// <summary>
        /// Record player action for anti-cheat
        /// </summary>
        public void RecordPlayerAction(string actionType, Dictionary<string, object> actionData = null)
        {
            if (currentGameState != GameState.Playing) return;

            totalActions++;
            
            RecordGameEvent("player_action", GetCurrentPlayerId(), new Dictionary<string, object>
            {
                {"action_type", actionType},
                {"action_data", actionData},
                {"total_actions", totalActions},
                {"timestamp", Time.time}
            });
        }

        /// <summary>
        /// End the game and submit results to PV3
        /// </summary>
        public void EndGame(string winnerId = null)
        {
            if (currentGameState != GameState.Playing) return;

            ChangeGameState(GameState.Finished);
            gameEndTime = Time.time;

            // Determine winner if not provided
            if (string.IsNullOrEmpty(winnerId))
            {
                winnerId = player1Score > player2Score ? player1Id : 
                          player2Score > player1Score ? player2Id : 
                          null; // Tie
            }

            // Record game end event
            RecordGameEvent("game_end", GetCurrentPlayerId(), new Dictionary<string, object>
            {
                {"winner_id", winnerId},
                {"final_scores", new Dictionary<string, int> { {player1Id, player1Score}, {player2Id, player2Score} }},
                {"game_duration", gameEndTime - gameStartTime},
                {"total_actions", totalActions}
            });

            LogDebug($"Game ended. Winner: {winnerId}, Scores: P1={player1Score}, P2={player2Score}");

            // Submit results to PV3 (only master client submits)
            if (PhotonNetwork.IsMasterClient)
            {
                StartCoroutine(SubmitGameResultToPV3(winnerId));
            }
        }

        /// <summary>
        /// Submit game result to PV3 backend for smart contract processing
        /// </summary>
        private IEnumerator SubmitGameResultToPV3(string winnerId)
        {
            ChangeGameState(GameState.Submitting);
            
            try
            {
                // Create game result data
                var gameResult = new
                {
                    photonRoomId = this.photonRoomId,
                    gameDurationMs = (int)((gameEndTime - gameStartTime) * 1000),
                    player1Score = this.player1Score,
                    player2Score = this.player2Score,
                    totalActions = this.totalActions,
                    gameEventsHash = CalculateGameEventsHash(),
                    photonSessionHash = CalculatePhotonSessionHash(),
                    unityBuildVersion = this.unityBuildVersion,
                    antiCheatSignature = GenerateAntiCheatSignature(),
                    winner = winnerId
                };

                var requestData = new
                {
                    photonRoomId = this.photonRoomId,
                    gameResult = gameResult
                };

                string jsonData = JsonUtility.ToJson(requestData);
                
                LogDebug($"Submitting game result to PV3: {jsonData}");

                // Submit to PV3 backend
                using (UnityWebRequest request = new UnityWebRequest($"{pv3ApiUrl}/unity/game-complete", "POST"))
                {
                    byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(jsonData);
                    request.uploadHandler = new UploadHandlerRaw(bodyRaw);
                    request.downloadHandler = new DownloadHandlerText();
                    request.SetRequestHeader("Content-Type", "application/json");

                    yield return request.SendWebRequest();

                    if (request.result == UnityWebRequest.Result.Success)
                    {
                        LogDebug($"PV3 submission successful: {request.downloadHandler.text}");
                        
                        var response = JsonUtility.FromJson<PV3Response>(request.downloadHandler.text);
                        
                        if (response.success)
                        {
                            ChangeGameState(GameState.Completed);
                            OnGameCompleted?.Invoke(response.data.transactionSignature);
                            LogDebug($"Game completed! Transaction: {response.data.transactionSignature}");
                        }
                        else
                        {
                            throw new Exception($"PV3 submission failed: {response.message}");
                        }
                    }
                    else
                    {
                        throw new Exception($"HTTP Error: {request.error}");
                    }
                }
            }
            catch (Exception ex)
            {
                LogError($"Failed to submit game result to PV3: {ex.Message}");
                ChangeGameState(GameState.Error);
                OnError?.Invoke(ex.Message);
            }
        }

        #region Helper Methods

        private void ChangeGameState(GameState newState)
        {
            if (currentGameState == newState) return;
            
            GameState oldState = currentGameState;
            currentGameState = newState;
            
            LogDebug($"Game state changed: {oldState} → {newState}");
            OnGameStateChanged?.Invoke(newState);
        }

        private void RecordGameEvent(string eventType, string playerId, Dictionary<string, object> data = null)
        {
            if (!enableAntiCheat) return;

            gameEvents.Add(new GameEvent(eventType, playerId, data));
            
            // Limit event history to prevent memory issues
            if (gameEvents.Count > 1000)
            {
                gameEvents.RemoveAt(0);
            }
        }

        private string CalculateGameEventsHash()
        {
            // Create deterministic hash of game events for anti-cheat
            string eventsJson = JsonUtility.ToJson(gameEvents);
            return CalculateHash(eventsJson);
        }

        private string CalculatePhotonSessionHash()
        {
            // Create hash of Photon session data
            var sessionData = new
            {
                roomName = PhotonNetwork.CurrentRoom.Name,
                playerCount = PhotonNetwork.CurrentRoom.PlayerCount,
                gameStartTime = this.gameStartTime,
                gameEndTime = this.gameEndTime
            };
            
            string sessionJson = JsonUtility.ToJson(sessionData);
            return CalculateHash(sessionJson);
        }

        private string GenerateAntiCheatSignature()
        {
            // Generate anti-cheat signature (simplified - in production use proper cryptography)
            var signatureData = new
            {
                matchId = this.matchId,
                photonRoomId = this.photonRoomId,
                gameDuration = gameEndTime - gameStartTime,
                totalActions = this.totalActions,
                finalScores = new { player1Score, player2Score },
                buildVersion = unityBuildVersion,
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
            };

            string signatureJson = JsonUtility.ToJson(signatureData);
            return CalculateHash(signatureJson);
        }

        private string CalculateHash(string input)
        {
            // Simple hash calculation (in production, use SHA256 or similar)
            return input.GetHashCode().ToString("X");
        }

        private string GetMatchParameter(string paramName)
        {
            // Try to get from URL parameters first (WebGL builds)
            #if UNITY_WEBGL && !UNITY_EDITOR
            string urlParam = GetURLParameter(paramName);
            if (!string.IsNullOrEmpty(urlParam)) return urlParam;
            #endif

            // Fallback to PlayerPrefs
            return PlayerPrefs.GetString($"PV3_{paramName}", "");
        }

        #if UNITY_WEBGL && !UNITY_EDITOR
        [System.Runtime.InteropServices.DllImport("__Internal")]
        private static extern string GetURLParameter(string param);
        #endif

        private string GetCurrentPlayerId()
        {
            // Determine which player this client represents
            string currentWalletAddress = PlayerPrefs.GetString("WalletAddress", "");
            
            if (currentWalletAddress == player1PublicKey)
                return player1Id;
            else if (currentWalletAddress == player2PublicKey)
                return player2Id;
            else
                return PhotonNetwork.LocalPlayer.NickName;
        }

        private void HandlePlayerDisconnect(string disconnectedPlayer)
        {
            // Declare the remaining player as winner
            string remainingPlayer = disconnectedPlayer == player1Id ? player2Id : player1Id;
            
            LogDebug($"Player {disconnectedPlayer} disconnected. Declaring {remainingPlayer} as winner.");
            
            // Award maximum score to remaining player
            if (remainingPlayer == player1Id)
                player1Score = 999999;
            else
                player2Score = 999999;
            
            EndGame(remainingPlayer);
        }

        private void LogDebug(string message)
        {
            if (enableDebugLogs)
            {
                Debug.Log($"[PV3GameManager] {message}");
            }
        }

        private void LogError(string message)
        {
            Debug.LogError($"[PV3GameManager] {message}");
        }

        #endregion

        #region Photon Serialization

        public void OnPhotonSerializeView(PhotonStream stream, PhotonMessageInfo info)
        {
            if (stream.IsWriting)
            {
                // Send game state data
                stream.SendNext(currentGameState);
                stream.SendNext(player1Score);
                stream.SendNext(player2Score);
                stream.SendNext(totalActions);
            }
            else
            {
                // Receive game state data
                currentGameState = (GameState)stream.ReceiveNext();
                player1Score = (int)stream.ReceiveNext();
                player2Score = (int)stream.ReceiveNext();
                totalActions = (int)stream.ReceiveNext();
            }
        }

        #endregion

        [System.Serializable]
        public class PV3Response
        {
            public bool success;
            public string message;
            public PV3ResponseData data;
        }

        [System.Serializable]
        public class PV3ResponseData
        {
            public string transactionSignature;
            public string photonRoomId;
            public string winner;
            public int player1Score;
            public int player2Score;
            public int gameDuration;
        }
    }
} 