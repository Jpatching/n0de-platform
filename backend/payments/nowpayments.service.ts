import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";

@Injectable()
export class NOWPaymentsService {
  private readonly logger = new Logger(NOWPaymentsService.name);
  private readonly apiKey: string;
  private readonly ipnSecret: string;
  private readonly baseUrl = "https://api.nowpayments.io/v1";

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>("NOWPAYMENTS_API_KEY");
    this.ipnSecret = this.configService.get<string>("NOWPAYMENTS_IPN_SECRET");
  }

  async createPayment(payment: any) {
    try {
      const paymentData = {
        price_amount: payment.amount,
        price_currency: payment.currency,
        pay_currency: "USDTTRC20", // Default to USDT TRC20
        order_id: payment.id,
        order_description: `N0DE ${payment.planType} Plan Subscription`,
        ipn_callback_url: `${this.configService.get("BACKEND_URL")}/api/v1/payments/webhooks/nowpayments`,
        success_url: `${this.configService.get("FRONTEND_URL")}/payment/success?paymentId=${payment.id}`,
        cancel_url: `${this.configService.get("FRONTEND_URL")}/payment/cancel?paymentId=${payment.id}`,
        is_fixed_rate: true,
        is_fee_paid_by_user: true,
      };

      const response = await fetch(`${this.baseUrl}/payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`NOWPayments API error: ${response.status} ${error}`);
      }

      const result = await response.json();

      this.logger.log(`Created NOWPayments payment: ${result.payment_id}`);

      return {
        id: result.payment_id,
        payment_url: result.invoice_url,
        paymentUrl: result.invoice_url,
        pay_address: result.pay_address,
        pay_amount: result.pay_amount,
        pay_currency: result.pay_currency,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create NOWPayments payment: ${error.message}`,
      );
      throw error;
    }
  }

  async getPayment(paymentId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/payment/${paymentId}`, {
        method: "GET",
        headers: {
          "x-api-key": this.apiKey,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`NOWPayments API error: ${response.status} ${error}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      this.logger.error(`Failed to get NOWPayments payment: ${error.message}`);
      throw error;
    }
  }

  verifyWebhookSignature(payload: any, signature: string): boolean {
    if (!signature || !this.ipnSecret) {
      return false;
    }

    try {
      const payloadString = JSON.stringify(
        payload,
        Object.keys(payload).sort(),
      );
      const computedSignature = crypto
        .createHmac("sha512", this.ipnSecret)
        .update(payloadString)
        .digest("hex");

      return crypto.timingSafeEqual(
        Buffer.from(signature, "hex"),
        Buffer.from(computedSignature, "hex"),
      );
    } catch (error) {
      this.logger.error(
        `Webhook signature verification failed: ${error.message}`,
      );
      return false;
    }
  }

  async getAvailableCurrencies() {
    try {
      const response = await fetch(`${this.baseUrl}/currencies`, {
        method: "GET",
        headers: {
          "x-api-key": this.apiKey,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`NOWPayments API error: ${response.status} ${error}`);
      }

      const result = await response.json();
      return result.currencies;
    } catch (error) {
      this.logger.error(
        `Failed to get NOWPayments currencies: ${error.message}`,
      );
      throw error;
    }
  }

  async getEstimatedPrice(
    amount: number,
    currency_from: string,
    currency_to: string,
  ) {
    try {
      const params = new URLSearchParams({
        amount: amount.toString(),
        currency_from,
        currency_to,
      });

      const response = await fetch(`${this.baseUrl}/estimate?${params}`, {
        method: "GET",
        headers: {
          "x-api-key": this.apiKey,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`NOWPayments API error: ${response.status} ${error}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      this.logger.error(`Failed to get NOWPayments estimate: ${error.message}`);
      throw error;
    }
  }

  async listPayments(
    limit = 10,
    page = 0,
    sortBy = "created_at",
    orderBy = "desc",
  ) {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        page: page.toString(),
        sortBy,
        orderBy,
      });

      const response = await fetch(`${this.baseUrl}/payment/?${params}`, {
        method: "GET",
        headers: {
          "x-api-key": this.apiKey,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`NOWPayments API error: ${response.status} ${error}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      this.logger.error(
        `Failed to list NOWPayments payments: ${error.message}`,
      );
      throw error;
    }
  }
}
