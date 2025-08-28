import { Injectable, Logger } from '@nestjs/common';
import { RedisCacheService } from '../../common/redis-cache.service';

export interface PatternAnalysisResult {
  isSuspicious: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suspiciousScore: number;
  reasons: string[];
  evidence: any;
}

export interface PlayerRiskAssessment {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  trustScore: number;
  recentViolations: number;
  shouldMonitor: boolean;
  shouldBan: boolean;
}

interface ClickData {
  position: string;
  timestamp: number;
  interval?: number;
}

@Injectable()
export class SuspiciousActivityService {
  private readonly logger = new Logger(SuspiciousActivityService.name);

  // 🛡️ MINES-OPTIMIZED PATTERN DETECTION (Allows fast legitimate gameplay)
  private readonly PERFECT_TIMING_THRESHOLD = 5; // Perfect timing variance (bot indicator)
  private readonly RAPID_CLICK_THRESHOLD = 50; // Clicks faster than 50ms (humanly impossible)
  private readonly PATTERN_SEQUENCE_LENGTH = 8; // Analyze last 8 clicks for patterns
  private readonly TRUST_SCORE_DECAY = 0.98; // Daily trust score decay (more forgiving)
  private readonly MAX_VIOLATIONS_PER_HOUR = 5; // Max violations before ban consideration

  constructor(
    private readonly redisCacheService: RedisCacheService,
  ) {
    this.logger.log('🛡️ SUSPICIOUS-ACTIVITY: Pattern detection initialized');
  }

  /**
   * 🛡️ CRITICAL: Analyze click patterns to detect automation
   */
  async analyzeClickPattern(
    playerId: string,
    tilePosition: string,
    timestamp: number
  ): Promise<PatternAnalysisResult> {
    try {
      const clickHistoryKey = `clicks:${playerId}`;
      const recentClicks = await this.redisCacheService.get<ClickData[]>(clickHistoryKey) || [];
      
      // Add current click to history
      const currentClick: ClickData = {
        position: tilePosition,
        timestamp,
        interval: recentClicks.length > 0 ? timestamp - recentClicks[recentClicks.length - 1].timestamp : 0
      };
      
      recentClicks.push(currentClick);
      
      // Keep only last 20 clicks for analysis
      if (recentClicks.length > 20) {
        recentClicks.shift();
      }
      
      // Store updated history
      await this.redisCacheService.set(clickHistoryKey, recentClicks, 3600000); // 1 hour TTL
      
      // Run pattern analysis
      return await this.analyzePatterns(playerId, recentClicks);

    } catch (error) {
      this.logger.error('❌ Pattern analysis error:', error);
      return {
        isSuspicious: false,
        severity: 'low',
        suspiciousScore: 0,
        reasons: [],
        evidence: {}
      };
    }
  }

  /**
   * 🛡️ CRITICAL: Analyze patterns for bot detection
   */
  private async analyzePatterns(playerId: string, clicks: ClickData[]): Promise<PatternAnalysisResult> {
    const reasons: string[] = [];
    let suspiciousScore = 0;
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    const evidence: any = {};

    if (clicks.length < 3) {
      return {
        isSuspicious: false,
        severity: 'low',
        suspiciousScore: 0,
        reasons: [],
        evidence: {}
      };
    }

    // 🔴 CRITICAL: Perfect timing detection (bot indicator)
    const intervals = clicks.filter(c => c.interval && c.interval > 0).map(c => c.interval);
    if (intervals.length >= 3) {
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((acc, val) => acc + Math.pow(val - avgInterval, 2), 0) / intervals.length;
      
      if (variance < this.PERFECT_TIMING_THRESHOLD && avgInterval < 200) {
        reasons.push('Perfect timing consistency (bot indicator)');
        suspiciousScore += 40;
        severity = 'critical';
        evidence.timingVariance = variance;
        evidence.avgInterval = avgInterval;
      }
    }

    // 🔴 CRITICAL: Rapid clicking detection
    const rapidClicks = intervals.filter(interval => interval < this.RAPID_CLICK_THRESHOLD).length;
    if (rapidClicks >= 3) {
      reasons.push('Multiple rapid clicks (superhuman speed)');
      suspiciousScore += 35;
      severity = severity === 'critical' ? 'critical' : 'high';
      evidence.rapidClickCount = rapidClicks;
    }

    // 🔴 SUSPICIOUS: Sequential pattern detection
    const sequentialPattern = this.detectSequentialPattern(clicks);
    if (sequentialPattern.isSequential) {
      reasons.push('Sequential tile clicking pattern');
      suspiciousScore += 25;
      severity = severity === 'critical' ? 'critical' : 'high';
      evidence.sequentialPattern = sequentialPattern;
    }

    // 🔴 SUSPICIOUS: Grid pattern detection (methodical bot behavior)
    const gridPattern = this.detectGridPattern(clicks);
    if (gridPattern.isGridBased) {
      reasons.push('Systematic grid-based clicking');
      suspiciousScore += 20;
      severity = severity === 'critical' ? 'critical' : 'medium';
      evidence.gridPattern = gridPattern;
    }

    // 🔴 SUSPICIOUS: Timestamp manipulation
    const timestampAnomalies = this.detectTimestampAnomalies(clicks);
    if (timestampAnomalies.hasAnomalies) {
      reasons.push('Timestamp irregularities detected');
      suspiciousScore += 30;
      severity = 'high';
      evidence.timestampAnomalies = timestampAnomalies;
    }

    // Update player trust score
    if (suspiciousScore > 0) {
      await this.updateTrustScore(playerId, -suspiciousScore / 10);
      await this.logViolation(playerId, 'SUSPICIOUS_PATTERN', { score: suspiciousScore, reasons });
    }

    return {
      isSuspicious: suspiciousScore > 30,
      severity,
      suspiciousScore,
      reasons,
      evidence
    };
  }

  /**
   * 🛡️ Detect sequential clicking patterns
   */
  private detectSequentialPattern(clicks: ClickData[]): { isSequential: boolean; pattern?: string } {
    if (clicks.length < 4) return { isSequential: false };

    const recentClicks = clicks.slice(-5); // Last 5 clicks
    const positions = recentClicks.map(c => c.position);
    
    // Check for sequential patterns (0,0 -> 0,1 -> 0,2 etc.)
    for (let i = 0; i < positions.length - 2; i++) {
      const pos1 = positions[i].split(',').map(Number);
      const pos2 = positions[i + 1].split(',').map(Number);
      const pos3 = positions[i + 2].split(',').map(Number);
      
      // Check if positions are in sequence
      if (this.isSequentialPosition(pos1, pos2, pos3)) {
        return {
          isSequential: true,
          pattern: `${positions[i]} -> ${positions[i + 1]} -> ${positions[i + 2]}`
        };
      }
    }

    return { isSequential: false };
  }

  /**
   * 🛡️ Detect grid-based systematic patterns
   */
  private detectGridPattern(clicks: ClickData[]): { isGridBased: boolean; pattern?: string } {
    if (clicks.length < 6) return { isGridBased: false };

    const recentClicks = clicks.slice(-8); // Last 8 clicks
    const positions = recentClicks.map(c => c.position.split(',').map(Number));
    
    // Check for systematic row/column patterns
    const rowPattern = this.checkRowPattern(positions);
    const columnPattern = this.checkColumnPattern(positions);
    
    if (rowPattern || columnPattern) {
      return {
        isGridBased: true,
        pattern: rowPattern ? 'Row-based' : 'Column-based'
      };
    }

    return { isGridBased: false };
  }

  /**
   * 🛡️ Detect timestamp anomalies
   */
  private detectTimestampAnomalies(clicks: ClickData[]): { hasAnomalies: boolean; anomalies?: string[] } {
    const anomalies: string[] = [];
    
    // Check for future timestamps
    const now = Date.now();
    const futureClicks = clicks.filter(c => c.timestamp > now + 5000); // 5 seconds in future
    if (futureClicks.length > 0) {
      anomalies.push('Future timestamps detected');
    }
    
    // Check for negative intervals
    const negativeIntervals = clicks.filter(c => c.interval && c.interval < 0);
    if (negativeIntervals.length > 0) {
      anomalies.push('Negative time intervals detected');
    }
    
    return {
      hasAnomalies: anomalies.length > 0,
      anomalies
    };
  }

  /**
   * 🛡️ Update player trust score
   */
  async updateTrustScore(playerId: string, delta: number): Promise<void> {
    const trustKey = `trust:${playerId}`;
    const currentScore = await this.redisCacheService.get<number>(trustKey) || 100;
    const newScore = Math.max(0, Math.min(100, currentScore + delta));
    
    await this.redisCacheService.set(trustKey, newScore, 2592000000); // 30 days TTL
  }

  /**
   * 🛡️ Log security violation
   */
  async logViolation(playerId: string, violationType: string, data: any): Promise<void> {
    const violationKey = `violations:${playerId}`;
    const violations = await this.redisCacheService.get<any[]>(violationKey) || [];
    
    violations.push({
      type: violationType,
      timestamp: Date.now(),
      data
    });
    
    // Keep only last 50 violations
    if (violations.length > 50) {
      violations.shift();
    }
    
    await this.redisCacheService.set(violationKey, violations, 604800000); // 7 days TTL
  }

  /**
   * 🛡️ Get player risk assessment
   */
  async getPlayerRiskAssessment(playerId: string): Promise<PlayerRiskAssessment> {
    const trustScore = await this.redisCacheService.get<number>(`trust:${playerId}`) || 100;
    const violations = await this.redisCacheService.get<any[]>(`violations:${playerId}`) || [];
    
    // Count recent violations (last hour)
    const oneHourAgo = Date.now() - 3600000;
    const recentViolations = violations.filter(v => v.timestamp > oneHourAgo).length;
    
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let shouldMonitor = false;
    let shouldBan = false;
    
    if (trustScore < 30 || recentViolations >= this.MAX_VIOLATIONS_PER_HOUR) {
      riskLevel = 'critical';
      shouldBan = true;
      shouldMonitor = true;
    } else if (trustScore < 50 || recentViolations >= 2) {
      riskLevel = 'high';
      shouldMonitor = true;
    } else if (trustScore < 70 || recentViolations >= 1) {
      riskLevel = 'medium';
      shouldMonitor = true;
    }
    
    return {
      riskLevel,
      trustScore,
      recentViolations,
      shouldMonitor,
      shouldBan
    };
  }

  // Helper methods
  private isSequentialPosition(pos1: number[], pos2: number[], pos3: number[]): boolean {
    // Check if positions form a sequence (horizontal, vertical, or diagonal)
    const dx1 = pos2[0] - pos1[0];
    const dy1 = pos2[1] - pos1[1];
    const dx2 = pos3[0] - pos2[0];
    const dy2 = pos3[1] - pos2[1];
    
    return dx1 === dx2 && dy1 === dy2 && (dx1 !== 0 || dy1 !== 0);
  }

  private checkRowPattern(positions: number[][]): boolean {
    // Check if clicks follow a row-by-row pattern
    const sortedByRow = [...positions].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    return JSON.stringify(positions) === JSON.stringify(sortedByRow);
  }

  private checkColumnPattern(positions: number[][]): boolean {
    // Check if clicks follow a column-by-column pattern
    const sortedByColumn = [...positions].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    return JSON.stringify(positions) === JSON.stringify(sortedByColumn);
  }
} 