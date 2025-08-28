import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Keypair } from '@solana/web3.js';
import * as nacl from 'tweetnacl';
import * as bs58 from 'bs58';
import { ConfigService } from '@nestjs/config';

// RPS Game Engine Interface
interface RPSChoice {
  choice: 'rock' | 'paper' | 'scissors';
  confidence: number;
}

// Crash Game Engine Interface
interface CrashDecision {
  action: 'wait' | 'cash_out' | 'place_bet';
  targetMultiplier?: number;
  confidence: number;
  reasoning: string;
}

// Simple RPS AI Engine for bots
class RPSGameEngine {
  private opponentHistory: ('rock' | 'paper' | 'scissors')[] = [];
  private myHistory: ('rock' | 'paper' | 'scissors')[] = [];
  
  makeChoice(gameState: any, personality: string): RPSChoice {
    const choices = ['rock', 'paper', 'scissors'] as const;
    
    // Simple strategy based on opponent patterns
    if (this.opponentHistory.length >= 2) {
      const lastChoice = this.opponentHistory[this.opponentHistory.length - 1];
      const counters = { rock: 'paper', paper: 'scissors', scissors: 'rock' } as const;
      
      // 60% chance to counter their last choice, 40% random
      if (Math.random() < 0.6 && lastChoice in counters) {
        const choice = counters[lastChoice];
        return { choice, confidence: 0.8 };
      }
    }
    
    // Random choice with slight bias
    const choice = choices[Math.floor(Math.random() * choices.length)];
    return { choice, confidence: 0.5 };
  }
  
  recordOpponentChoice(choice: 'rock' | 'paper' | 'scissors') {
    this.opponentHistory.push(choice);
    if (this.opponentHistory.length > 10) {
      this.opponentHistory.shift();
    }
  }
  
  recordMyChoice(choice: 'rock' | 'paper' | 'scissors') {
    this.myHistory.push(choice);
    if (this.myHistory.length > 10) {
      this.myHistory.shift();
    }
  }
}

// Advanced Crash AI Engine for bots
class CrashGameEngine {
  private recentCrashes: number[] = [];
  private personalBestMultiplier: number = 1.0;
  private consecutiveLosses: number = 0;
  private averageCashOut: number = 2.0;
  private targetMultiplier: number = 2.5;
  private hasCashedOut: boolean = false;
  
  makeDecision(gameState: any, personality: string): CrashDecision {
    const currentMultiplier = gameState.currentMultiplier || 1.0;
    const phase = gameState.phase || 'betting';
    
    // Betting phase - always ready to bet
    if (phase === 'betting') {
      const target = this.calculateTargetMultiplier(personality);
      this.targetMultiplier = target;
      this.hasCashedOut = false;
      
      return {
        action: 'place_bet',
        targetMultiplier: target,
        confidence: 0.8,
        reasoning: `Betting with target ${target.toFixed(2)}x`
      };
    }
    
    // Flying phase - decide when to cash out
    if (phase === 'flying' && !this.hasCashedOut) {
      const shouldCashOut = this.shouldCashOutNow(currentMultiplier, personality);
      
      if (shouldCashOut) {
        this.hasCashedOut = true;
        return {
          action: 'cash_out',
          confidence: 0.9,
          reasoning: `Cashing out at ${currentMultiplier.toFixed(2)}x (target: ${this.targetMultiplier.toFixed(2)}x)`
        };
      }
    }
    
    return {
      action: 'wait',
      confidence: 0.5,
      reasoning: 'Waiting for better opportunity'
    };
  }
  
  private calculateTargetMultiplier(personality: string): number {
    let baseTarget = 2.0;
    
    // Personality-based adjustments
    switch (personality) {
      case 'conservative':
        baseTarget = 1.5 + Math.random() * 1.0; // 1.5x to 2.5x
        break;
      case 'balanced':
        baseTarget = 2.0 + Math.random() * 1.5; // 2.0x to 3.5x
        break;
      case 'aggressive':
        baseTarget = 2.5 + Math.random() * 2.5; // 2.5x to 5.0x
        break;
      default:
        baseTarget = 1.8 + Math.random() * 1.2; // 1.8x to 3.0x
        break;
    }
    
    // Adjust based on recent performance
    if (this.consecutiveLosses >= 3) {
      baseTarget *= 0.8; // More conservative after losses
    } else if (this.consecutiveLosses === 0) {
      baseTarget *= 1.1; // Slightly more aggressive after wins
    }
    
    return Math.max(1.2, Math.min(10.0, baseTarget));
  }
  
  private shouldCashOutNow(currentMultiplier: number, personality: string): boolean {
    // Always cash out at target multiplier with some variance
    if (currentMultiplier >= this.targetMultiplier) {
      return Math.random() < 0.85; // 85% chance to cash out at target
    }
    
    // Early cash out based on personality
    const earlyThreshold = this.targetMultiplier * 0.7;
    if (currentMultiplier >= earlyThreshold) {
      switch (personality) {
        case 'conservative':
          return Math.random() < 0.3; // 30% chance to cash out early
        case 'aggressive':
          return Math.random() < 0.1; // 10% chance to cash out early
        default:
          return Math.random() < 0.2; // 20% chance to cash out early
      }
    }
    
    // Panic cash out at very high multipliers
    if (currentMultiplier > 10.0) {
      return Math.random() < 0.6;
    }
    
    return false;
  }
  
  recordCrashResult(crashPoint: number, cashedOut: boolean, cashOutMultiplier?: number) {
    this.recentCrashes.push(crashPoint);
    
    // Keep only last 10 crashes
    if (this.recentCrashes.length > 10) {
      this.recentCrashes.shift();
    }
    
    if (cashedOut && cashOutMultiplier) {
      this.personalBestMultiplier = Math.max(this.personalBestMultiplier, cashOutMultiplier);
      this.consecutiveLosses = 0;
      this.averageCashOut = (this.averageCashOut + cashOutMultiplier) / 2;
    } else {
      this.consecutiveLosses++;
    }
  }
}

export interface BotConfig {
  id: number;
  name: string;
  privateKey: number[];
  wallet: string;
  sessionToken?: string;
  lastActivity: number;
  isActive: boolean;
  activeMatchId?: string; // Track active match
  gameEngine?: RPSGameEngine; // RPS Game AI engine
  crashEngine?: CrashGameEngine; // Crash Game AI engine
  currentGameType?: string; // Track current game type
  preferences: {
    minWager: number;
    maxWager: number;
    preferredGames: string[];
    joinDelayMin: number;
    joinDelayMax: number;
    personality: 'conservative' | 'balanced' | 'aggressive'; // AI personality
  };
}

export interface BotMetrics {
  totalMatches: number;
  averageJoinTime: number;
  overallWinRate: number;
  activeBots: number;
  totalWagered: number;
  totalWon: number;
}

@Injectable()
export class BotManagerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BotManagerService.name);
  private bots: Map<number, BotConfig> = new Map();
  private matchPollingInterval: NodeJS.Timeout;
  private readonly API_BASE: string;
  private io: any; // Socket.io client

  constructor(
    private configService: ConfigService
  ) {
    this.API_BASE = this.configService.get<string>('API_BASE', 'https://pv3-backend-api-production.up.railway.app/api/v1');
  }

  async onModuleInit() {
    this.logger.log('🤖 Bot Manager Service initializing...');
    await this.initializeBots();
    await this.initializeSocketConnection();
    this.startMatchPolling();
  }

  private async initializeSocketConnection() {
    try {
      // Import socket.io-client dynamically
      const { io } = await import('socket.io-client');
      
      this.io = io(this.API_BASE.replace('/api/v1', ''), {
        transports: ['websocket'],
        autoConnect: false
      });

      this.io.on('connect', () => {
        this.logger.log('🔌 Bot socket connected');
      });

      this.io.on('disconnect', () => {
        this.logger.log('🔌 Bot socket disconnected');
      });

      // Listen for match events
      this.io.on('match_joined', (data: any) => {
        this.handleMatchJoined(data);
      });

      // Listen for RPS game events
      this.io.on('rps_result', (data: any) => {
        this.handleRPSResult(data);
      });

      // Listen for crash game events
      this.io.on('crash_round_started', (data: any) => {
        this.handleCrashRoundStarted(data);
      });

      this.io.on('crash_multiplier_update', (data: any) => {
        this.handleCrashMultiplierUpdate(data);
      });

      this.io.on('crash_result', (data: any) => {
        this.handleCrashResult(data);
      });

      this.io.connect();
      
    } catch (error) {
      this.logger.error('Failed to initialize socket connection:', error.message);
    }
  }

  private handleMatchJoined(data: any) {
    this.logger.log('🎮 Match joined event:', data);
    
    // Find bot by match ID and set as active
    for (const bot of this.bots.values()) {
      if (bot.activeMatchId === data.matchId) {
        this.logger.log(`🤖 Bot ${bot.name} confirmed joined match ${data.matchId}`);
        break;
      }
    }
  }

  private async handleRPSResult(data: any) {
    this.logger.log('🎯 RPS result received:', data);
    
    // Find bot in this match
    const botInMatch = Array.from(this.bots.values()).find(bot => 
      bot.activeMatchId === data.gameState?.matchId || 
      (data.gameState?.player1 === bot.wallet || data.gameState?.player2 === bot.wallet)
    );

    if (botInMatch && botInMatch.gameEngine) {
      // Record opponent's choice for learning
      const isPlayer1 = data.gameState?.player1 === botInMatch.wallet;
      const opponentChoice = isPlayer1 ? data.player2Result?.roundResult?.playerChoice : data.player1Result?.roundResult?.playerChoice;
      
      if (opponentChoice) {
        botInMatch.gameEngine.recordOpponentChoice(opponentChoice);
        this.logger.log(`🧠 Bot ${botInMatch.name} learned opponent chose: ${opponentChoice}`);
      }

      // Check if match is complete
      if (data.gameState?.matchComplete) {
        this.logger.log(`🏁 Bot ${botInMatch.name} match completed`);
        botInMatch.activeMatchId = undefined;
        botInMatch.gameEngine = undefined; // Reset for next match
      } else {
        // Match continues - bot will make next choice when needed
        this.logger.log(`🎮 Bot ${botInMatch.name} ready for next round`);
      }
    }
  }

  private async handleCrashRoundStarted(data: any) {
    this.logger.log('🚀 Crash round started:', data);
    
    // Find bot in this match
    const botInMatch = Array.from(this.bots.values()).find(bot => 
      bot.activeMatchId === data.matchId
    );

    if (botInMatch && botInMatch.crashEngine) {
      this.logger.log(`🎮 Bot ${botInMatch.name} detected crash round start`);
      
      // Bot will make decisions during multiplier updates
      const gameState = {
        matchId: data.matchId,
        phase: 'betting',
        currentMultiplier: 1.0,
        crashSeed: data.crashSeed,
        crashNonce: data.crashNonce
      };

      const decision = botInMatch.crashEngine.makeDecision(gameState, botInMatch.preferences.personality);
      
      if (decision.action === 'place_bet') {
        this.logger.log(`🎯 Bot ${botInMatch.name} ready to fly: ${decision.reasoning}`);
      }
    }
  }

  private async handleCrashMultiplierUpdate(data: any) {
    // Find bot in this match
    const botInMatch = Array.from(this.bots.values()).find(bot => 
      bot.activeMatchId === data.matchId
    );

    if (botInMatch && botInMatch.crashEngine) {
      const gameState = {
        matchId: data.matchId,
        phase: 'flying',
        currentMultiplier: data.multiplier || data.currentMultiplier || 1.0
      };

      const decision = botInMatch.crashEngine.makeDecision(gameState, botInMatch.preferences.personality);
      
      if (decision.action === 'cash_out') {
        // Add some realistic thinking delay
        const thinkingTime = 200 + Math.random() * 500; // 200-700ms
        
        setTimeout(async () => {
          await this.makeBotCashOut(botInMatch, data.matchId, gameState.currentMultiplier);
        }, thinkingTime);
      }
    }
  }

  private async handleCrashResult(data: any) {
    this.logger.log('🎯 Crash result received:', data);
    
    // Find bot in this match
    const botInMatch = Array.from(this.bots.values()).find(bot => 
      bot.activeMatchId === data.gameState?.matchId || 
      (data.gameState?.player1 === bot.wallet || data.gameState?.player2 === bot.wallet)
    );

    if (botInMatch && botInMatch.crashEngine) {
      const crashPoint = data.roundResult?.crashMultiplier || data.crashMultiplier;
      const botCashedOut = data.roundResult?.player1Result?.cashOut !== null || data.roundResult?.player2Result?.cashOut !== null;
      const cashOutMultiplier = data.roundResult?.player1Result?.cashOut || data.roundResult?.player2Result?.cashOut;
      
      // Record result for learning
      botInMatch.crashEngine.recordCrashResult(crashPoint, botCashedOut, cashOutMultiplier);
      this.logger.log(`🧠 Bot ${botInMatch.name} learned crash result: ${crashPoint.toFixed(2)}x, cashed out: ${botCashedOut}`);

      // Check if match is complete
      if (data.gameState?.matchComplete) {
        this.logger.log(`🏁 Bot ${botInMatch.name} crash match completed`);
        botInMatch.activeMatchId = undefined;
        botInMatch.crashEngine = undefined; // Reset for next match
        botInMatch.currentGameType = undefined;
      } else {
        // Match continues - prepare for next round
        this.logger.log(`🎮 Bot ${botInMatch.name} ready for next crash round`);
      }
    }
  }

  private async initializeBots() {
    this.logger.log('🤖 Initializing PV3 Bots...');

    // Bot configurations with private keys from environment
    const botConfigs = [
      {
        id: 1,
        name: 'CryptoNewbie',
        privateKey: [0,208,93,110,7,28,73,114,232,124,112,29,36,241,28,3,79,162,223,30,7,124,60,198,15,175,145,233,30,213,52,127,19,184,72,97,75,142,40,25,11,108,98,196,97,191,234,50,110,18,171,154,47,90,50,69,1,8,244,46,15,183,120,16],
        preferences: {
          minWager: 0.05,
          maxWager: 0.5,
          preferredGames: ['mines', 'coin-flip', 'rock-paper-scissors', 'crash'],
          joinDelayMin: 3,
          joinDelayMax: 12,
          personality: 'conservative' as const
        }
      },
      {
        id: 2,
        name: 'QuickFlip',
        privateKey: [237,167,2,155,47,30,243,116,17,173,88,140,111,55,56,19,97,65,15,59,78,173,49,101,208,134,86,74,189,232,15,137,55,21,106,235,216,250,37,45,176,181,38,52,85,210,54,230,68,175,246,32,238,167,91,213,144,139,163,148,170,99,254,136],
        preferences: {
          minWager: 0.1,
          maxWager: 1.0,
          preferredGames: ['coin-flip', 'rock-paper-scissors', 'crash'],
          joinDelayMin: 2,
          joinDelayMax: 8,
          personality: 'balanced' as const
        }
      },
      {
        id: 3,
        name: 'RockPaperPro',
        privateKey: [112,237,203,118,64,55,250,235,166,68,231,58,14,99,207,144,116,58,119,102,151,225,72,28,246,179,165,35,116,35,103,1,46,206,103,16,45,109,244,53,170,226,254,197,230,166,0,90,217,147,239,26,48,120,198,75,189,146,27,13,189,201,158,18],
        preferences: {
          minWager: 0.1,
          maxWager: 2.0,
          preferredGames: ['rock-paper-scissors', 'crash'],
          joinDelayMin: 1,
          joinDelayMax: 6,
          personality: 'aggressive' as const
        }
      },
      {
        id: 4,
        name: 'AdaptiveGamer',
        privateKey: [184,152,126,162,180,48,141,101,252,214,1,183,132,220,175,172,131,254,131,178,246,205,21,202,100,235,180,223,237,72,31,165,133,41,16,194,130,136,107,198,249,66,241,13,129,48,248,108,194,50,60,5,95,173,32,92,41,244,201,205,123,92,27,120],
        preferences: {
          minWager: 0.1,
          maxWager: 1.2,
          preferredGames: ['mines', 'coin-flip', 'crash'],
          joinDelayMin: 4,
          joinDelayMax: 11,
          personality: 'balanced' as const
        }
      },
      {
        id: 5,
        name: 'SkillSeeker',
        privateKey: [159,59,11,3,232,144,57,113,119,197,7,42,210,210,45,195,186,171,209,112,60,76,118,13,27,107,19,134,95,112,72,215,87,184,2,118,127,231,96,16,68,155,171,30,210,216,90,162,218,68,175,246,32,238,167,91,213,144,139,163,148,170,99,254,136],
        preferences: {
          minWager: 0.1,
          maxWager: 1.5,
          preferredGames: ['mines', 'rock-paper-scissors', 'crash'],
          joinDelayMin: 4,
          joinDelayMax: 10,
          personality: 'aggressive' as const
        }
      },
      {
        id: 6,
        name: 'RPSMaster',
        privateKey: [148,251,101,93,204,117,118,100,46,171,6,148,55,1,47,141,238,19,193,217,135,109,182,75,177,94,108,73,246,160,33,14,246,247,224,225,93,76,63,38,235,179,171,7,171,4,81,241,171,51,141,123,95,227,37,0,28,39,201,141,104,145,82,41],
        preferences: {
          minWager: 0.05,
          maxWager: 0.3,
          preferredGames: ['rock-paper-scissors', 'crash'],
          joinDelayMin: 1,
          joinDelayMax: 6,
          personality: 'conservative' as const
        }
      }
    ];

    // Initialize bots (without authentication for now)
    for (const config of botConfigs) {
      try {
        const keypair = Keypair.fromSecretKey(new Uint8Array(config.privateKey));
        const wallet = keypair.publicKey.toString();
        
        const bot: BotConfig = {
          id: config.id,
          name: config.name,
          privateKey: config.privateKey,
          wallet,
          lastActivity: Date.now(),
          isActive: true,
          preferences: config.preferences
        };

        // Skip authentication during initialization since we're inside the same backend
        // The bots already have funded session vaults from our earlier script
        
        this.bots.set(config.id, bot);
        this.logger.log(`✅ Bot ${config.id} (${config.name}) initialized - Wallet: ${wallet}`);
      } catch (error) {
        this.logger.error(`❌ Failed to initialize bot ${config.id}: ${error.message}`);
      }
    }

    this.logger.log(`✅ ${this.bots.size}/6 bots active and ready`);
  }

  private async authenticateBot(bot: BotConfig): Promise<void> {
    // For now, skip authentication since bots are running inside the backend
    // In production, you might want to implement internal service calls
    // or use a different authentication mechanism for internal bots
    this.logger.log(`🔄 Bot ${bot.id} authentication skipped (internal bot)`);
  }

  private startMatchPolling() {
    this.logger.log('🔍 Starting match polling...');
    
    this.matchPollingInterval = setInterval(async () => {
      await this.pollAndJoinMatches();
    }, 15000); // Poll every 15 seconds (increased frequency)
  }

  private async pollAndJoinMatches() {
    try {
      // For now, just log that we're polling
      // In a future update, we can implement internal match service calls
      this.logger.log(`🔍 Polling for matches... ${this.getActiveBotsCount()} bots active`);
      
      // Get available matches using HTTP request (external API)
      const matchesResponse = await fetch(`${this.API_BASE}/matches/available`);
      
      if (!matchesResponse.ok) {
        this.logger.warn(`Failed to fetch available matches: ${matchesResponse.status}`);
        return; // Skip this poll cycle
      }

      const responseData = await matchesResponse.json();
      
      // Check if response has the expected structure
      if (!responseData.success || !responseData.matches || !Array.isArray(responseData.matches)) {
        this.logger.warn('Invalid response structure from matches API');
        return;
      }

      const matches = responseData.matches;
      // ✅ FIXED: Smart filtering to prevent joining abandoned matches
      const now = Date.now();
      const waitingMatches = matches.filter(match => {
        // Basic status and player checks
        if (match.status !== 'pending' || match.player2) return false;
        
        // Wager range check
        if (match.wager < 0.05 || match.wager > 2.0) return false;
        
        // ✅ CRITICAL: Match age filtering - don't join old abandoned matches
        const matchCreatedAt = new Date(match.createdAt).getTime();
        const matchAge = now - matchCreatedAt;
        
        // Don't join matches older than 3 minutes (likely abandoned)
        if (matchAge > 3 * 60 * 1000) {
          this.logger.log(`🚫 Skipping old match ${match.id}: ${Math.round(matchAge / 60000)}min old`);
          return false;
        }
        
        // Don't join matches created less than 10 seconds ago (give creator time)
        if (matchAge < 10 * 1000) {
          this.logger.log(`⏳ Skipping too-new match ${match.id}: ${Math.round(matchAge / 1000)}s old`);
          return false;
        }
        
        // ✅ CRITICAL: Check if match has expiry time and if it's expired
        if (match.gameData && match.gameData.expiryTime) {
          const expiryTime = new Date(match.gameData.expiryTime).getTime();
          if (now > expiryTime) {
            this.logger.log(`🚫 Skipping expired match ${match.id}: expired ${Math.round((now - expiryTime) / 60000)}min ago`);
            return false;
          }
        }
        
        return true;
      });

      if (waitingMatches.length === 0) {
        this.logger.log('🔍 No waiting matches found');
        return; // No matches to join
      }

      this.logger.log(`🎯 Found ${waitingMatches.length} waiting matches`);

      // Try to assign bots to matches
      for (const match of waitingMatches) {
        this.logger.log(`🔍 Checking match ${match.id}: ${match.gameType}, ${match.wager} SOL`);
        
        const suitableBots = Array.from(this.bots.values()).filter(bot => 
          bot.isActive &&
          !bot.activeMatchId &&  // Bot is not already in a match
          bot.preferences.preferredGames.includes(match.gameType) &&
          match.wager >= bot.preferences.minWager && // Fixed: was checking wagerAmount
          match.wager <= bot.preferences.maxWager && // Fixed: was checking wagerAmount
          (Date.now() - bot.lastActivity) > 10000 // 10 second cooldown
        );
        
        this.logger.log(`🤖 Found ${suitableBots.length} suitable bots for ${match.gameType} match:`, suitableBots.map(b => `${b.name}(${b.preferences.preferredGames.join(',')})`));

        if (suitableBots.length > 0) {
          // Select random bot
          const selectedBot = suitableBots[Math.floor(Math.random() * suitableBots.length)];
          
          // Random delay before joining
          const delay = Math.random() * (selectedBot.preferences.joinDelayMax - selectedBot.preferences.joinDelayMin) + selectedBot.preferences.joinDelayMin;
          
          this.logger.log(`🤖 Bot ${selectedBot.name} will join match ${match.id} in ${delay.toFixed(1)}s`);
          
          setTimeout(async () => {
            await this.joinMatch(selectedBot, match);
          }, delay * 1000);
          
          // Update bot activity
          selectedBot.lastActivity = Date.now();
          break; // Only assign one bot per polling cycle
        }
      }
      
    } catch (error) {
      this.logger.error(`Match polling error: ${error.message}`);
    }
  }

  private async joinMatch(bot: BotConfig, match: any) {
    try {
      this.logger.log(`🤖 Bot ${bot.id} (${bot.name}) attempting to join match ${match.id} - ${match.wager} SOL`);
      
      // Get or create authentication token for the bot
      const token = await this.getOrCreateBotToken(bot);
      if (!token) {
        this.logger.error(`❌ Failed to authenticate bot ${bot.id}`);
        return;
      }

      // Join the match via API call
      const joinResponse = await fetch(`${this.API_BASE}/matches/${match.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          playerWallet: bot.wallet
        })
      });

      if (joinResponse.ok) {
        const joinData = await joinResponse.json();
        this.logger.log(`✅ Bot ${bot.id} successfully joined match ${match.id}`);
        this.logger.log(`🎮 Match status: ${joinData.match?.status || 'unknown'}`);
        
        bot.lastActivity = Date.now();
        bot.activeMatchId = match.id;
        
        // Initialize game engine for this match
        if (match.gameType === 'rock-paper-scissors') {
          bot.gameEngine = new RPSGameEngine();
          this.logger.log(`🧠 Initialized RPS AI engine for bot ${bot.name}`);
          
          // Join the match room via WebSocket
          if (this.io?.connected) {
            this.io.emit('join_match', { 
              matchId: match.id, 
              botWallet: bot.wallet,
              playerType: 'bot'
            });
            this.logger.log(`🔌 Bot ${bot.name} joined WebSocket room for match ${match.id}`);
            
            // Start playing the game
            await this.startBotGameplay(bot, match);
          } else {
            this.logger.warn(`⚠️ Bot ${bot.name} WebSocket not connected - will retry connection`);
            // Try to reconnect WebSocket
            await this.initializeSocketConnection();
          }
        }
      } else {
        const errorData = await joinResponse.json().catch(() => ({ message: 'Unknown error' }));
        this.logger.warn(`⚠️ Bot ${bot.id} failed to join match ${match.id}: ${joinResponse.status} - ${errorData.message || errorData.error}`);
        
        // If the match is already full or doesn't exist, clear the bot's activity
        if (joinResponse.status === 400) {
          bot.activeMatchId = undefined;
        }
      }
    } catch (error) {
      this.logger.error(`❌ Error joining match for bot ${bot.id}: ${error.message}`);
      // Clear bot's active match on error
      bot.activeMatchId = undefined;
    }
  }

  private async getOrCreateBotToken(bot: BotConfig): Promise<string | null> {
    try {
      // If we already have a token, use it
      if (bot.sessionToken) {
        return bot.sessionToken;
      }

      // Generate authentication message
      const messageResponse = await fetch(`${this.API_BASE}/auth/generate-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: bot.wallet })
      });

      if (!messageResponse.ok) {
        throw new Error(`Failed to get auth message: ${messageResponse.status}`);
      }

      const { message, timestamp } = await messageResponse.json();
      
      // Sign the message (only the message, not message + timestamp)
      const keypair = Keypair.fromSecretKey(new Uint8Array(bot.privateKey));
      const messageBytes = new TextEncoder().encode(message);
      const signature = nacl.sign.detached(messageBytes, keypair.secretKey);
      const signatureBase58 = bs58.encode(signature);

      // Authenticate with the signature
      const authResponse = await fetch(`${this.API_BASE}/auth/authenticate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: bot.wallet,
          signature: signatureBase58,
          message,
          timestamp
        })
      });

      if (!authResponse.ok) {
        throw new Error(`Authentication failed: ${authResponse.status}`);
      }

      const { token } = await authResponse.json();
      bot.sessionToken = token;
      
      this.logger.log(`🔐 Bot ${bot.id} authenticated successfully`);
      return token;
      
    } catch (error) {
      this.logger.error(`❌ Failed to authenticate bot ${bot.id}: ${error.message}`);
      return null;
    }
  }

  private async startBotGameplay(bot: BotConfig, match: any) {
    this.logger.log(`🎮 Starting gameplay for bot ${bot.name} in match ${match.id}`);
    
    // Set current game type for the bot
    bot.currentGameType = match.gameType;
    
    if (match.gameType === 'rock-paper-scissors') {
      // Listen for when it's time to make RPS choices
      this.startRPSGameplay(bot, match);
    } else if (match.gameType === 'crash') {
      // Initialize crash gameplay
      this.startCrashGameplay(bot, match);
    }
  }

  private startRPSGameplay(bot: BotConfig, match: any) {
    // Set up interval to check if bot needs to make a choice
    const gameplayInterval = setInterval(async () => {
      if (!bot.activeMatchId || bot.activeMatchId !== match.id) {
        clearInterval(gameplayInterval);
        return;
      }

      try {
        // Get current game state
        const gameStateResponse = await fetch(`${this.API_BASE}/matches/${match.id}/rps/state`, {
          headers: {
            'Authorization': `Bearer ${bot.sessionToken}`
          }
        });

        if (gameStateResponse.ok) {
          const gameState = await gameStateResponse.json();
          
          // Check if bot needs to make a choice
          const isPlayer1 = gameState.player1?.wallet === bot.wallet;
          const isPlayer2 = gameState.player2?.wallet === bot.wallet;
          const botPlayerKey = isPlayer1 ? 'player1' : 'player2';
          
          // Check if it's a new round and bot hasn't chosen yet
          const botHasChosen = gameState.pendingChoices?.[botPlayerKey];
          const shouldMakeChoice = !botHasChosen && !gameState.matchComplete;
          
          if (shouldMakeChoice && bot.gameEngine) {
            // Make choice using AI engine
            const decision = bot.gameEngine.makeChoice(gameState, bot.preferences.preferredGames[0]);
            
            // Add realistic thinking delay
            const thinkingTime = 1000 + Math.random() * 3000; // 1-4 seconds
            
            setTimeout(async () => {
              await this.makeBotRPSChoice(bot, match.id, decision.choice);
              bot.gameEngine?.recordMyChoice(decision.choice);
            }, thinkingTime);
          }
        }
      } catch (error) {
        this.logger.error(`Error in RPS gameplay for bot ${bot.name}: ${error.message}`);
      }
    }, 2000); // Check every 2 seconds
  }

  private async makeBotRPSChoice(bot: BotConfig, matchId: string, choice: 'rock' | 'paper' | 'scissors') {
    try {
      this.logger.log(`🎯 Bot ${bot.name} making RPS choice: ${choice} in match ${matchId}`);
      
      // Send choice via WebSocket (same as human players)
      if (this.io?.connected) {
        this.io.emit('rps_choice', {
          matchId: matchId,
          playerId: bot.wallet,
          choice: choice,
          timestamp: Date.now()
        });
        
        this.logger.log(`✅ Bot ${bot.name} sent RPS choice: ${choice}`);
      } else {
        this.logger.error(`❌ Bot ${bot.name} not connected to WebSocket`);
      }
    } catch (error) {
      this.logger.error(`❌ Error making RPS choice for bot ${bot.name}: ${error.message}`);
    }
  }

  private startCrashGameplay(bot: BotConfig, match: any) {
    this.logger.log(`🚀 Starting crash gameplay for bot ${bot.name}`);
    
    // Initialize crash engine for this bot
    if (!bot.crashEngine) {
      bot.crashEngine = new CrashGameEngine();
    }

    // Set up interval to monitor crash game state and make decisions
    const gameplayInterval = setInterval(async () => {
      if (!bot.activeMatchId || bot.activeMatchId !== match.id || bot.currentGameType !== 'crash') {
        clearInterval(gameplayInterval);
        return;
      }

      try {
        // Get current crash game state
        const gameStateResponse = await fetch(`${this.API_BASE}/matches/${match.id}/crash/state`, {
          headers: {
            'Authorization': `Bearer ${bot.sessionToken}`
          }
        });

        if (gameStateResponse.ok) {
          const gameState = await gameStateResponse.json();
          
          // Let the crash engine handle real-time decisions
          // (Most crash decisions happen via WebSocket events, this is backup/monitoring)
          this.logger.log(`🎮 Bot ${bot.name} monitoring crash game state: ${gameState.phase || 'unknown'}`);
        }
      } catch (error) {
        this.logger.error(`Error in crash gameplay monitoring for bot ${bot.name}: ${error.message}`);
      }
    }, 1000); // Check every second for monitoring
  }

  private async makeBotCashOut(bot: BotConfig, matchId: string, multiplier: number) {
    try {
      this.logger.log(`🚀 Bot ${bot.name} cashing out at ${multiplier.toFixed(2)}x in match ${matchId}`);
      
      // Send cash out via WebSocket (same as human players)
      if (this.io?.connected) {
        this.io.emit('crash_cash_out', {
          matchId: matchId,
          playerId: bot.wallet,
          multiplier: multiplier,
          timestamp: Date.now()
        });
        
        this.logger.log(`✅ Bot ${bot.name} sent cash out at ${multiplier.toFixed(2)}x`);
      } else {
        this.logger.error(`❌ Bot ${bot.name} not connected to WebSocket for cash out`);
      }
    } catch (error) {
      this.logger.error(`❌ Error making crash cash out for bot ${bot.name}: ${error.message}`);
    }
  }

  getActiveBotsCount(): number {
    return Array.from(this.bots.values()).filter(bot => bot.isActive).length;
  }

  getBotStatus() {
    const activeBots = this.getActiveBotsCount();
      return {
      totalBots: this.bots.size,
        activeBots,
      inactiveBots: this.bots.size - activeBots,
      lastUpdate: new Date().toISOString()
    };
  }

  onModuleDestroy() {
    if (this.matchPollingInterval) {
      clearInterval(this.matchPollingInterval);
      this.logger.log('🛑 Bot match polling stopped');
    }
  }

  async startAllBots(): Promise<void> {
    this.logger.log('🚀 Starting all bots...');
    for (const bot of this.bots.values()) {
      bot.isActive = true;
    }
  }

  async stopAllBots(): Promise<void> {
    this.logger.log('🛑 Stopping all bots...');
    for (const bot of this.bots.values()) {
      bot.isActive = false;
    }
    if (this.matchPollingInterval) {
      clearInterval(this.matchPollingInterval);
    }
  }

  async restartBot(botId: number): Promise<void> {
    const bot = this.bots.get(botId);
    if (bot) {
      this.logger.log(`🔄 Restarting bot ${botId}...`);
      bot.isActive = true;
      bot.sessionToken = undefined; // Force re-authentication
      bot.lastActivity = Date.now();
    }
  }

  async getBotsStatus(): Promise<BotConfig[]> {
    return Array.from(this.bots.values());
  }

  async getPerformanceMetrics(): Promise<BotMetrics> {
    return {
      totalMatches: 0, // TODO: Track this
      averageJoinTime: 0, // TODO: Track this
      overallWinRate: 0, // TODO: Track this
      activeBots: this.getActiveBotsCount(),
      totalWagered: 0, // TODO: Track this
      totalWon: 0 // TODO: Track this
    };
  }
} 