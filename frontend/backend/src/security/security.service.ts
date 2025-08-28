import { Injectable, BadRequestException } from '@nestjs/common';
import { ReportCheatDto, DisputeResultDto, SecurityReport, MatchDispute, ReportStatus, ReportType } from './dto/security.dto';

@Injectable()
export class SecurityService {
  // In-memory storage for development - replace with actual database
  private reports = new Map<string, SecurityReport>();
  private disputes = new Map<string, MatchDispute>();
  private bannedUsers = new Set<string>();

  async reportCheat(reporterId: string, reportCheatDto: ReportCheatDto): Promise<SecurityReport> {
    const reportId = this.generateReportId();
    
    const report: SecurityReport = {
      id: reportId,
      reporterId,
      reportedUser: reportCheatDto.reportedUser,
      type: reportCheatDto.type,
      description: reportCheatDto.description,
      matchId: reportCheatDto.matchId,
      evidence: reportCheatDto.evidence || [],
      status: ReportStatus.PENDING,
      createdAt: new Date(),
    };

    this.reports.set(reportId, report);
    
    console.log(`🚨 Cheat report filed: ${reporterId} reports ${reportCheatDto.reportedUser} for ${reportCheatDto.type}`);
    
    // Auto-escalate certain report types
    if (reportCheatDto.type === ReportType.CHEATING || reportCheatDto.type === ReportType.EXPLOIT) {
      report.status = ReportStatus.INVESTIGATING;
    }

    return report;
  }

  async getPlayerReports(walletAddress: string): Promise<SecurityReport[]> {
    return Array.from(this.reports.values())
      .filter(report => report.reportedUser === walletAddress)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async disputeResult(disputerId: string, disputeResultDto: DisputeResultDto): Promise<MatchDispute> {
    const disputeId = this.generateDisputeId();
    
    const dispute: MatchDispute = {
      id: disputeId,
      matchId: disputeResultDto.matchId,
      disputerId,
      type: disputeResultDto.type,
      reason: disputeResultDto.reason,
      evidence: disputeResultDto.evidence || [],
      status: ReportStatus.PENDING,
      createdAt: new Date(),
    };

    this.disputes.set(disputeId, dispute);
    
    console.log(`⚖️ Match dispute filed: ${disputerId} disputes match ${disputeResultDto.matchId}`);
    return dispute;
  }

  async getMatchAuditLog(matchId: string): Promise<any[]> {
    // TODO: Implement actual audit log retrieval
    // Mock audit log for development
    return [
      {
        timestamp: new Date(Date.now() - 300000), // 5 minutes ago
        event: 'match_started',
        details: { matchId, players: ['player1', 'player2'] },
      },
      {
        timestamp: new Date(Date.now() - 120000), // 2 minutes ago
        event: 'move_logged',
        details: { player: 'player1', action: 'game_action_1' },
      },
      {
        timestamp: new Date(Date.now() - 60000), // 1 minute ago
        event: 'match_completed',
        details: { winner: 'player1', duration: 240 },
      },
    ];
  }

  async getBannedPlayers(): Promise<string[]> {
    return Array.from(this.bannedUsers);
  }

  async verifySignature(signature: string, message: string, publicKey: string): Promise<boolean> {
    // TODO: Implement actual Ed25519 signature verification
    // For now, return true for development
    console.log(`🔐 Verifying signature for: ${publicKey}`);
    return true;
  }

  async getSecurityStats(): Promise<any> {
    const totalReports = this.reports.size;
    const pendingReports = Array.from(this.reports.values()).filter(r => r.status === ReportStatus.PENDING).length;
    const totalDisputes = this.disputes.size;
    const bannedPlayersCount = this.bannedUsers.size;

    return {
      totalReports,
      pendingReports,
      totalDisputes,
      bannedPlayersCount,
      reportsByType: this.getReportsByType(),
    };
  }

  // Admin methods
  async banPlayer(walletAddress: string, reason: string): Promise<{ success: boolean }> {
    this.bannedUsers.add(walletAddress);
    console.log(`🔨 Player banned: ${walletAddress} - Reason: ${reason}`);
    return { success: true };
  }

  async unbanPlayer(walletAddress: string): Promise<{ success: boolean }> {
    const removed = this.bannedUsers.delete(walletAddress);
    console.log(`✅ Player unbanned: ${walletAddress}`);
    return { success: removed };
  }

  async resolveReport(reportId: string, resolution: string, adminWallet: string): Promise<SecurityReport> {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new BadRequestException('Report not found');
    }

    report.status = ReportStatus.RESOLVED;
    report.resolvedAt = new Date();
    report.adminNotes = resolution;

    console.log(`✅ Report resolved: ${reportId} by ${adminWallet}`);
    return report;
  }

  async resolveDispute(disputeId: string, resolution: string, adminWallet: string): Promise<MatchDispute> {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) {
      throw new BadRequestException('Dispute not found');
    }

    dispute.status = ReportStatus.RESOLVED;
    dispute.resolvedAt = new Date();
    dispute.resolution = resolution;

    console.log(`⚖️ Dispute resolved: ${disputeId} by ${adminWallet}`);
    return dispute;
  }

  private getReportsByType(): Record<string, number> {
    const reportsByType: Record<string, number> = {};
    
    Array.from(this.reports.values()).forEach(report => {
      reportsByType[report.type] = (reportsByType[report.type] || 0) + 1;
    });

    return reportsByType;
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  private generateDisputeId(): string {
    return `dispute_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  // Helper method to check if user is banned
  isPlayerBanned(walletAddress: string): boolean {
    return this.bannedUsers.has(walletAddress);
  }
} 