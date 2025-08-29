import { Injectable, Logger } from '@nestjs/common';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  template?: string;
  context?: Record<string, any>;
}

export interface BillingEmailData {
  userEmail: string;
  userName?: string;
  planName: string;
  amount: number;
  currency: string;
  invoiceUrl?: string;
  receiptUrl?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor() {
    // TODO: Initialize email provider (SendGrid, AWS SES, etc.)
    // For now, we'll log emails instead of sending them
    this.logger.log('EmailService initialized - currently in development mode');
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // Development mode: log email instead of sending
      this.logger.log('📧 Email would be sent:', {
        to: options.to,
        subject: options.subject,
        template: options.template,
        hasHtml: !!options.html,
        hasText: !!options.text,
      });

      // In production, replace this with actual email provider logic:
      // - SendGrid: await this.sendgrid.send(options)
      // - AWS SES: await this.ses.sendEmail(options)
      // - Nodemailer: await this.transporter.sendMail(options)

      return true;
    } catch (error) {
      this.logger.error('Failed to send email:', error);
      return false;
    }
  }

  async sendPaymentSuccessEmail(data: BillingEmailData): Promise<boolean> {
    const subject = `Payment Confirmation - ${data.planName} Plan`;
    const html = this.generatePaymentSuccessHtml(data);
    
    return this.sendEmail({
      to: data.userEmail,
      subject,
      html,
      template: 'payment_success',
      context: data,
    });
  }

  async sendPaymentFailureEmail(data: BillingEmailData): Promise<boolean> {
    const subject = `Payment Failed - ${data.planName} Plan`;
    const html = this.generatePaymentFailureHtml(data);
    
    return this.sendEmail({
      to: data.userEmail,
      subject,
      html,
      template: 'payment_failure',
      context: data,
    });
  }

  async sendSubscriptionUpgradeEmail(data: BillingEmailData): Promise<boolean> {
    const subject = `Welcome to ${data.planName} - Subscription Upgraded!`;
    const html = this.generateSubscriptionUpgradeHtml(data);
    
    return this.sendEmail({
      to: data.userEmail,
      subject,
      html,
      template: 'subscription_upgrade',
      context: data,
    });
  }

  async sendSubscriptionCancelledEmail(data: BillingEmailData): Promise<boolean> {
    const subject = `Subscription Cancelled - ${data.planName} Plan`;
    const html = this.generateSubscriptionCancelledHtml(data);
    
    return this.sendEmail({
      to: data.userEmail,
      subject,
      html,
      template: 'subscription_cancelled',
      context: data,
    });
  }

  async sendWelcomeEmail(userEmail: string, userName?: string): Promise<boolean> {
    const subject = 'Welcome to N0DE Platform!';
    const html = this.generateWelcomeHtml(userName);
    
    return this.sendEmail({
      to: userEmail,
      subject,
      html,
      template: 'welcome',
      context: { userName, userEmail },
    });
  }

  private generatePaymentSuccessHtml(data: BillingEmailData): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #4f46e5;">N0DE Platform</h1>
            </div>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #059669; margin-top: 0;">Payment Successful! 🎉</h2>
              <p>Hi ${data.userName || 'there'},</p>
              <p>Your payment for the <strong>${data.planName}</strong> plan has been processed successfully.</p>
            </div>
            
            <div style="background: white; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px;">
              <h3>Payment Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>Plan:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${data.planName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>Amount:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${data.currency.toUpperCase()} ${data.amount}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Email:</strong></td>
                  <td style="padding: 8px 0;">${data.userEmail}</td>
                </tr>
              </table>
            </div>
            
            ${data.receiptUrl ? `
              <div style="text-align: center; margin: 20px 0;">
                <a href="${data.receiptUrl}" style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Download Receipt</a>
              </div>
            ` : ''}
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280;">
              <p>Thank you for choosing N0DE Platform!</p>
              <p>If you have any questions, please contact our support team.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generatePaymentFailureHtml(data: BillingEmailData): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #4f46e5;">N0DE Platform</h1>
            </div>
            
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #fecaca;">
              <h2 style="color: #dc2626; margin-top: 0;">Payment Failed ⚠️</h2>
              <p>Hi ${data.userName || 'there'},</p>
              <p>We were unable to process your payment for the <strong>${data.planName}</strong> plan.</p>
            </div>
            
            <div style="background: white; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px;">
              <h3>What happened?</h3>
              <p>Your payment of ${data.currency.toUpperCase()} ${data.amount} for the ${data.planName} plan could not be processed.</p>
              
              <h3>What can you do?</h3>
              <ul>
                <li>Check your payment method details</li>
                <li>Ensure you have sufficient funds</li>
                <li>Try a different payment method</li>
                <li>Contact your bank if the issue persists</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 20px 0;">
              <a href="https://www.n0de.pro/billing" style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Try Again</a>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280;">
              <p>Need help? Contact our support team - we're here to help!</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateSubscriptionUpgradeHtml(data: BillingEmailData): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #4f46e5;">N0DE Platform</h1>
            </div>
            
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #bbf7d0;">
              <h2 style="color: #059669; margin-top: 0;">Welcome to ${data.planName}! 🚀</h2>
              <p>Hi ${data.userName || 'there'},</p>
              <p>Congratulations! Your account has been successfully upgraded to the <strong>${data.planName}</strong> plan.</p>
            </div>
            
            <div style="background: white; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px;">
              <h3>What's Next?</h3>
              <ul>
                <li>Enhanced API limits and performance</li>
                <li>Priority support</li>
                <li>Advanced analytics and monitoring</li>
                <li>Access to premium features</li>
              </ul>
              
              <p style="margin-top: 20px;">Your new plan is active immediately. Start exploring your enhanced capabilities!</p>
            </div>
            
            <div style="text-align: center; margin: 20px 0;">
              <a href="https://www.n0de.pro/dashboard" style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Go to Dashboard</a>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280;">
              <p>Thank you for upgrading! We're excited to support your growth.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateSubscriptionCancelledHtml(data: BillingEmailData): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #4f46e5;">N0DE Platform</h1>
            </div>
            
            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #fed7aa;">
              <h2 style="color: #d97706; margin-top: 0;">Subscription Cancelled</h2>
              <p>Hi ${data.userName || 'there'},</p>
              <p>Your <strong>${data.planName}</strong> subscription has been cancelled as requested.</p>
            </div>
            
            <div style="background: white; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px;">
              <h3>Important Information</h3>
              <ul>
                <li>Your account will remain active until the end of the current billing period</li>
                <li>You can reactivate your subscription at any time</li>
                <li>Your data and settings are preserved</li>
                <li>You'll automatically be moved to the Free plan after the current period ends</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 20px 0;">
              <a href="https://www.n0de.pro/billing" style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reactivate Subscription</a>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280;">
              <p>We're sorry to see you go! If you have feedback, we'd love to hear from you.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateWelcomeHtml(userName?: string): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #4f46e5;">Welcome to N0DE Platform! 🎉</h1>
            </div>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <p>Hi ${userName || 'there'},</p>
              <p>Welcome to N0DE Platform! We're excited to have you on board.</p>
            </div>
            
            <div style="background: white; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px;">
              <h3>Get Started</h3>
              <ul>
                <li>Generate your first API key</li>
                <li>Explore our documentation</li>
                <li>Join our community</li>
                <li>Check out example applications</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 20px 0;">
              <a href="https://www.n0de.pro/dashboard" style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Get Started</a>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280;">
              <p>Questions? Our support team is here to help!</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}