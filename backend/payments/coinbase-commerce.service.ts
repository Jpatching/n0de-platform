import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class CoinbaseCommerceService {
  private readonly logger = new Logger(CoinbaseCommerceService.name);
  private readonly apiKey: string;
  private readonly webhookSecret: string;
  private readonly baseUrl = 'https://api.commerce.coinbase.com';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('COINBASE_COMMERCE_API_KEY');
    this.webhookSecret = this.configService.get<string>('COINBASE_COMMERCE_WEBHOOK_SECRET');
  }

  async createCharge(payment: any) {
    try {
      const chargeData = {
        name: `N0DE ${payment.planType} Plan`,
        description: `N0DE RPC Infrastructure - ${payment.planType} Plan Subscription`,
        local_price: {
          amount: payment.amount.toString(),
          currency: payment.currency,
        },
        pricing_type: 'fixed_price',
        metadata: {
          paymentId: payment.id,
          userId: payment.userId,
          planType: payment.planType,
        },
        redirect_url: `${this.configService.get('FRONTEND_URL')}/payment/success?paymentId=${payment.id}`,
        cancel_url: `${this.configService.get('FRONTEND_URL')}/payment/cancel?paymentId=${payment.id}`,
      };

      const response = await fetch(`${this.baseUrl}/charges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CC-Api-Key': this.apiKey,
          'X-CC-Version': '2018-03-22',
        },
        body: JSON.stringify(chargeData),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Coinbase API error: ${response.status} ${error}`);
      }

      const result = await response.json();
      
      this.logger.log(`Created Coinbase charge: ${result.data.id}`);
      
      return {
        id: result.data.id,
        hosted_url: result.data.hosted_url,
        chargeUrl: result.data.hosted_url,
        expires_at: result.data.expires_at,
        pricing: result.data.pricing,
      };
    } catch (error) {
      this.logger.error(`Failed to create Coinbase charge: ${error.message}`);
      throw error;
    }
  }

  async getCharge(chargeId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/charges/${chargeId}`, {
        method: 'GET',
        headers: {
          'X-CC-Api-Key': this.apiKey,
          'X-CC-Version': '2018-03-22',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Coinbase API error: ${response.status} ${error}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      this.logger.error(`Failed to get Coinbase charge: ${error.message}`);
      throw error;
    }
  }

  verifyWebhookSignature(payload: any, signature: string): boolean {
    if (!signature || !this.webhookSecret) {
      return false;
    }

    try {
      const computedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(computedSignature, 'hex')
      );
    } catch (error) {
      this.logger.error(`Webhook signature verification failed: ${error.message}`);
      return false;
    }
  }

  async listCharges(limit = 25, startingAfter?: string) {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
      });

      if (startingAfter) {
        params.append('starting_after', startingAfter);
      }

      const response = await fetch(`${this.baseUrl}/charges?${params}`, {
        method: 'GET',
        headers: {
          'X-CC-Api-Key': this.apiKey,
          'X-CC-Version': '2018-03-22',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Coinbase API error: ${response.status} ${error}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      this.logger.error(`Failed to list Coinbase charges: ${error.message}`);
      throw error;
    }
  }
}