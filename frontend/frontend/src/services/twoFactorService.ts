class TwoFactorService {
  private API_BASE: string;

  constructor() {
    this.API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://pv3-backend-api-production.up.railway.app/api/v1';
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('pv3_session_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  /**
   * Get 2FA status for the current user
   */
  async get2FAStatus(): Promise<{
    enabled: boolean;
    backupCodesGenerated: boolean;
    lastVerification?: string;
  }> {
    try {
      const response = await fetch(`${this.API_BASE}/auth/2fa/status`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to get 2FA status');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get 2FA status:', error);
      return { enabled: false, backupCodesGenerated: false };
    }
  }

  /**
   * Generate 2FA setup (returns QR code and secret)
   */
  async generate2FASetup(): Promise<{
    qrCode: string;
    secret: string;
    backupCodes: string[];
  }> {
    try {
      const response = await fetch(`${this.API_BASE}/auth/2fa/generate`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate 2FA setup');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to generate 2FA setup:', error);
      throw error;
    }
  }

  /**
   * Enable 2FA with verification token
   */
  async enable2FA(token: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.API_BASE}/auth/2fa/enable`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to enable 2FA');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to enable 2FA:', error);
      throw error;
    }
  }

  /**
   * Disable 2FA with verification token
   */
  async disable2FA(token: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.API_BASE}/auth/2fa/disable`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to disable 2FA');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to disable 2FA:', error);
      throw error;
    }
  }

  /**
   * Verify 2FA token
   */
  async verify2FA(token: string): Promise<{ valid: boolean; message: string }> {
    try {
      const response = await fetch(`${this.API_BASE}/auth/2fa/verify`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to verify 2FA token');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to verify 2FA token:', error);
      throw error;
    }
  }

  /**
   * Generate new backup codes
   */
  async generateBackupCodes(): Promise<{ backupCodes: string[] }> {
    try {
      const response = await fetch(`${this.API_BASE}/auth/2fa/backup-codes`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate backup codes');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to generate backup codes:', error);
      throw error;
    }
  }

  /**
   * Use backup code for verification
   */
  async useBackupCode(code: string): Promise<{ valid: boolean; message: string }> {
    try {
      const response = await fetch(`${this.API_BASE}/auth/2fa/backup-code`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ backupCode: code }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to use backup code');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to use backup code:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const twoFactorService = new TwoFactorService();
export default twoFactorService; 