'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { 
  Trophy, 
  Users, 
  DollarSign, 
  Calendar,
  Play,
  Pause,
  CheckCircle,
  Clock,
  TrendingUp,
  Star,
  Award,
  Target,
  Zap
} from 'lucide-react';
import { adminApi } from '@/services/api';
import Layout from '@/components/admin/Layout';

interface Tournament {
  id: string;
  name: string;
  gameType: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  startTime: string;
  endTime?: string;
  maxParticipants: number;
  currentParticipants: number;
  prizePool: number;
  entryFee: number;
  winner?: string;
  createdAt: string;
  description: string;
  rules: string[];
}

interface TournamentStats {
  totalTournaments: number;
  activeTournaments: number;
  completedTournaments: number;
  totalPrizePool: number;
  totalParticipants: number;
  averageParticipation: number;
}

interface TournamentPlayer {
  userWallet: string;
  username?: string;
  rank: number;
  score: number;
  gamesPlayed: number;
  winRate: number;
  earnings: number;
  joinedAt: string;
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [tournamentPlayers, setTournamentPlayers] = useState<TournamentPlayer[]>([]);
  const [stats, setStats] = useState<TournamentStats>({
    totalTournaments: 0,
    activeTournaments: 0,
    completedTournaments: 0,
    totalPrizePool: 0,
    totalParticipants: 0,
    averageParticipation: 0
  });
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchTournaments();
    fetchStats();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchTournaments();
      fetchStats();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchTournaments = async () => {
    try {
      const response = await adminApi.getTournaments();
      setTournaments((response.data as any)?.items || (response.data as any) || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await adminApi.getSystemStats();
      const data = response.data || {};
      setStats({
        totalTournaments: (data as any).totalTournaments || 0,
        activeTournaments: (data as any).activeTournaments || 0,
        completedTournaments: (data as any).completedTournaments || 0,
        totalPrizePool: (data as any).totalTournamentPrizePool || 0,
        totalParticipants: (data as any).totalTournamentParticipants || 0,
        averageParticipation: (data as any).averageTournamentParticipation || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchTournamentPlayers = async (tournamentId: string) => {
    try {
      const response = await adminApi.getTournamentPlayers(tournamentId);
      setTournamentPlayers((response.data as any) || []);
    } catch (error) {
      console.error('Error fetching tournament players:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400';
      case 'scheduled': return 'text-blue-400';
      case 'completed': return 'text-purple-400';
      case 'cancelled': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="w-4 h-4 text-green-400" />;
      case 'scheduled': return <Clock className="w-4 h-4 text-blue-400" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-purple-400" />;
      case 'cancelled': return <Pause className="w-4 h-4 text-red-400" />;
      default: return <Calendar className="w-4 h-4 text-gray-400" />;
    }
  };

  const handleCreateTournament = async (tournamentData: any) => {
    try {
      await adminApi.createTournament(tournamentData);
      fetchTournaments();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating tournament:', error);
    }
  };

  const handleStartTournament = async (tournamentId: string) => {
    try {
      await adminApi.startTournament(tournamentId);
      fetchTournaments();
    } catch (error) {
      console.error('Error starting tournament:', error);
    }
  };

  const handleEndTournament = async (tournamentId: string) => {
    try {
      await adminApi.endTournament(tournamentId);
      fetchTournaments();
    } catch (error) {
      console.error('Error ending tournament:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-yellow-400">Tournament Management</h1>
            <p className="text-text-muted mt-1">Manage tournaments, players, and competitions</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-300 rounded w-1/2"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-yellow-400">Tournament Management</h1>
            <p className="text-text-muted mt-1">Manage tournaments, players, and competitions</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              Create Tournament
            </button>
          </div>
        </div>

        {/* Tournament Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 admin-card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Total Tournaments</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.totalTournaments}</p>
              </div>
              <Trophy className="w-8 h-8 text-yellow-400" />
            </div>
          </Card>

          <Card className="p-6 admin-card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Active Now</p>
                <p className="text-2xl font-bold text-green-400">{stats.activeTournaments}</p>
              </div>
              <Play className="w-8 h-8 text-green-400" />
            </div>
          </Card>

          <Card className="p-6 admin-card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Total Prize Pool</p>
                <p className="text-2xl font-bold text-purple-400">${stats.totalPrizePool.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-400" />
            </div>
          </Card>

          <Card className="p-6 admin-card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Total Players</p>
                <p className="text-2xl font-bold text-blue-400">{stats.totalParticipants.toLocaleString()}</p>
              </div>
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </Card>
        </div>

        {/* Tournament List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Active & Upcoming Tournaments</h2>
              <Trophy className="w-5 h-5 text-text-muted" />
            </div>

            {tournaments.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="w-16 h-16 text-text-muted mx-auto mb-4" />
                <p className="text-text-muted text-lg">No tournaments</p>
                <p className="text-text-muted text-sm mt-2">Create your first tournament</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tournaments.map((tournament) => (
                  <div
                    key={tournament.id}
                    className="p-4 rounded-lg border border-gray-700 bg-gray-800/50 hover:bg-gray-800 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedTournament(tournament);
                      fetchTournamentPlayers(tournament.id);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(tournament.status)}
                          <div>
                            <h3 className="font-semibold text-white">{tournament.name}</h3>
                            <p className="text-sm text-text-muted capitalize">{tournament.gameType} Tournament</p>
                          </div>
                        </div>
                        
                        <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-text-muted">Players:</span>
                            <span className="text-white ml-2">{tournament.currentParticipants}/{tournament.maxParticipants}</span>
                          </div>
                          <div>
                            <span className="text-text-muted">Prize Pool:</span>
                            <span className="text-green-400 ml-2">${tournament.prizePool.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-text-muted">Entry Fee:</span>
                            <span className="text-blue-400 ml-2">${tournament.entryFee}</span>
                          </div>
                          <div>
                            <span className="text-text-muted">Status:</span>
                            <span className={`ml-2 capitalize ${getStatusColor(tournament.status)}`}>
                              {tournament.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col space-y-2">
                        {tournament.status === 'scheduled' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartTournament(tournament.id);
                            }}
                            className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                          >
                            Start
                          </button>
                        )}
                        {tournament.status === 'active' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEndTournament(tournament.id);
                            }}
                            className="text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                          >
                            End
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Tournament Details */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {selectedTournament ? `${selectedTournament.name} - Leaderboard` : 'Tournament Details'}
              </h2>
              <Award className="w-5 h-5 text-text-muted" />
            </div>

            {!selectedTournament ? (
              <div className="text-center py-12">
                <Target className="w-16 h-16 text-text-muted mx-auto mb-4" />
                <p className="text-text-muted text-lg">Select a tournament</p>
                <p className="text-text-muted text-sm mt-2">Click on a tournament to view details</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Tournament ID:</span>
                    <span className="text-white font-mono text-sm">{selectedTournament.id.substring(0, 8)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Game Type:</span>
                    <span className="text-white capitalize">{selectedTournament.gameType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Start Time:</span>
                    <span className="text-white">{new Date(selectedTournament.startTime).toLocaleString()}</span>
                  </div>
                  {selectedTournament.winner && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Winner:</span>
                      <span className="text-yellow-400 font-medium">{selectedTournament.winner.substring(0, 8)}...</span>
                    </div>
                  )}
                </div>

                {tournamentPlayers.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Leaderboard</h3>
                    <div className="space-y-2">
                      {tournamentPlayers.slice(0, 10).map((player) => (
                        <div
                          key={player.userWallet}
                          className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              player.rank === 1 ? 'bg-yellow-500 text-black' :
                              player.rank === 2 ? 'bg-gray-400 text-black' :
                              player.rank === 3 ? 'bg-orange-600 text-white' :
                              'bg-gray-700 text-white'
                            }`}>
                              {player.rank}
                            </div>
                            <div>
                              <p className="text-white font-medium">
                                {player.username || player.userWallet.substring(0, 8) + '...'}
                              </p>
                              <p className="text-sm text-text-muted">
                                {player.gamesPlayed} games • {player.winRate.toFixed(1)}% win rate
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-bold">{player.score.toLocaleString()}</p>
                            <p className="text-sm text-green-400">${player.earnings.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
} 