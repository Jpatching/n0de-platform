import { Injectable, Logger } from "@nestjs/common";
import * as sgMail from "@sendgrid/mail";

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

export interface TeamInvitationData {
  to: string;
  inviterName: string;
  organizationName: string;
  role: string;
  inviteToken: string;
  inviteUrl: string;
  message?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly isProduction: boolean;
  private readonly sendGridEnabled: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === "production";
    this.sendGridEnabled = !!process.env.SENDGRID_API_KEY;

    if (this.sendGridEnabled) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.logger.log("EmailService initialized with SendGrid");
    } else {
      this.logger.log(
        "EmailService initialized in development mode - emails will be logged",
      );
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (this.sendGridEnabled) {
        // Production: Send email via SendGrid
        const msg = {
          to: options.to,
          from: {
            email: process.env.SENDGRID_FROM_EMAIL || "noreply@n0de.pro",
            name: "N0DE Platform",
          },
          subject: options.subject,
          text: options.text,
          html: options.html,
        };

        await sgMail.send(msg);
        this.logger.log(`📧 Email sent successfully to ${options.to}`);
      } else {
        // Development mode: log email instead of sending
        this.logger.log("📧 Email would be sent:", {
          to: options.to,
          subject: options.subject,
          template: options.template,
          hasHtml: !!options.html,
          hasText: !!options.text,
        });
      }

      return true;
    } catch (error) {
      this.logger.error("Failed to send email:", error);
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
      template: "payment_success",
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
      template: "payment_failure",
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
      template: "subscription_upgrade",
      context: data,
    });
  }

  async sendSubscriptionCancelledEmail(
    data: BillingEmailData,
  ): Promise<boolean> {
    const subject = `Subscription Cancelled - ${data.planName} Plan`;
    const html = this.generateSubscriptionCancelledHtml(data);

    return this.sendEmail({
      to: data.userEmail,
      subject,
      html,
      template: "subscription_cancelled",
      context: data,
    });
  }

  async sendWelcomeEmail(
    userEmail: string,
    userName?: string,
  ): Promise<boolean> {
    const subject = "Welcome to N0DE Platform!";
    const html = this.generateWelcomeHtml(userName);

    return this.sendEmail({
      to: userEmail,
      subject,
      html,
      template: "welcome",
      context: { userName, userEmail },
    });
  }

  async sendTeamInvitation(data: TeamInvitationData): Promise<boolean> {
    const subject = `You're invited to join ${data.organizationName} on N0DE Platform`;
    const html = this.generateTeamInvitationHtml(data);

    return this.sendEmail({
      to: data.to,
      subject,
      html,
      template: "team_invitation",
      context: data,
    });
  }

  async sendEmailVerification(
    userEmail: string,
    verificationToken: string,
    userName?: string,
  ): Promise<boolean> {
    const subject = "Please verify your N0DE Platform account";
    const verificationUrl = `${process.env.FRONTEND_URL || "https://www.n0de.pro"}/auth/verify?token=${verificationToken}`;
    const html = this.generateEmailVerificationHtml(userName, verificationUrl);

    return this.sendEmail({
      to: userEmail,
      subject,
      html,
      template: "email_verification",
      context: { userName, userEmail, verificationUrl },
    });
  }

  async sendPasswordResetEmail(
    userEmail: string,
    resetToken: string,
    userName?: string,
  ): Promise<boolean> {
    const subject = "Reset your N0DE Platform password";
    const resetUrl = `${process.env.FRONTEND_URL || "https://www.n0de.pro"}/auth/reset-password?token=${resetToken}`;
    const html = this.generatePasswordResetHtml(userName, resetUrl);

    return this.sendEmail({
      to: userEmail,
      subject,
      html,
      template: "password_reset",
      context: { userName, userEmail, resetUrl },
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
              <p>Hi ${data.userName || "there"},</p>
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
            
            ${
              data.receiptUrl
                ? `
              <div style="text-align: center; margin: 20px 0;">
                <a href="${data.receiptUrl}" style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Download Receipt</a>
              </div>
            `
                : ""
            }
            
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
              <p>Hi ${data.userName || "there"},</p>
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
              <p>Hi ${data.userName || "there"},</p>
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
              <p>Hi ${data.userName || "there"},</p>
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
              <p>Hi ${userName || "there"},</p>
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

  private generateTeamInvitationHtml(data: TeamInvitationData): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #4f46e5;">N0DE Platform</h1>
            </div>
            
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #bbf7d0;">
              <h2 style="color: #059669; margin-top: 0;">You're Invited to Join a Team! 👥</h2>
              <p><strong>${data.inviterName}</strong> has invited you to join <strong>${data.organizationName}</strong> on N0DE Platform.</p>
            </div>
            
            <div style="background: white; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px;">
              <h3>Invitation Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>Organization:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${data.organizationName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>Role:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${data.role.charAt(0).toUpperCase() + data.role.slice(1)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>Invited by:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${data.inviterName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Email:</strong></td>
                  <td style="padding: 8px 0;">${data.to}</td>
                </tr>
              </table>
              
              ${
                data.message
                  ? `
                <div style="margin-top: 20px; padding: 15px; background: #f8fafc; border-radius: 6px; border-left: 4px solid #4f46e5;">
                  <p style="margin: 0;"><strong>Personal Message:</strong></p>
                  <p style="margin: 10px 0 0 0; font-style: italic;">"${data.message}"</p>
                </div>
              `
                  : ""
              }
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.inviteUrl}" style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">
                Accept Invitation
              </a>
            </div>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1f2937;">What happens next?</h3>
              <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
                <li>Click "Accept Invitation" to join the team</li>
                <li>If you don't have an account, you'll be guided to create one</li>
                <li>You'll get access to your team's shared resources and projects</li>
                <li>Start collaborating immediately with your new team members</li>
              </ul>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; text-align: center;">
              <p>This invitation was sent to ${data.to}</p>
              <p>If you weren't expecting this invitation or have questions, please contact our support team.</p>
              <p style="margin-top: 15px;">
                <a href="${data.inviteUrl}" style="color: #4f46e5; text-decoration: none;">
                  ${data.inviteUrl}
                </a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateEmailVerificationHtml(
    userName?: string,
    verificationUrl?: string,
  ): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #4f46e5;">N0DE Platform</h1>
            </div>
            
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #bae6fd;">
              <h2 style="color: #0284c7; margin-top: 0;">Verify Your Email Address 📧</h2>
              <p>Hi ${userName || "there"},</p>
              <p>Thank you for signing up for N0DE Platform! Please verify your email address to activate your account and start using our services.</p>
            </div>
            
            <div style="background: white; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px;">
              <h3>Why verify your email?</h3>
              <ul>
                <li>Secure your account and prevent unauthorized access</li>
                <li>Receive important notifications about your API usage</li>
                <li>Get updates about new features and platform improvements</li>
                <li>Enable password recovery if needed</li>
              </ul>
              
              <p><strong>Important:</strong> This verification link expires in 24 hours for security reasons.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background: linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);">
                Verify Email Address
              </a>
            </div>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <p style="margin: 0;"><strong>Can't click the button?</strong></p>
              <p style="margin: 10px 0 0 0; word-break: break-all; font-size: 14px;">
                Copy and paste this link in your browser: <br>
                <a href="${verificationUrl}" style="color: #0284c7;">${verificationUrl}</a>
              </p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; text-align: center;">
              <p>If you didn't create a N0DE Platform account, please ignore this email.</p>
              <p>For security reasons, this verification link will expire in 24 hours.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generatePasswordResetHtml(
    userName?: string,
    resetUrl?: string,
  ): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #4f46e5;">N0DE Platform</h1>
            </div>
            
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #fecaca;">
              <h2 style="color: #dc2626; margin-top: 0;">Password Reset Request 🔒</h2>
              <p>Hi ${userName || "there"},</p>
              <p>We received a request to reset your N0DE Platform account password. If you made this request, click the button below to reset your password.</p>
            </div>
            
            <div style="background: white; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px;">
              <h3>Security Information</h3>
              <ul>
                <li>This password reset link expires in 1 hour for security</li>
                <li>You can only use this link once</li>
                <li>If you didn't request this reset, you can safely ignore this email</li>
                <li>Your current password remains unchanged until you create a new one</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);">
                Reset Password
              </a>
            </div>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <p style="margin: 0;"><strong>Can't click the button?</strong></p>
              <p style="margin: 10px 0 0 0; word-break: break-all; font-size: 14px;">
                Copy and paste this link in your browser: <br>
                <a href="${resetUrl}" style="color: #dc2626;">${resetUrl}</a>
              </p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; text-align: center;">
              <p><strong>Didn't request a password reset?</strong></p>
              <p>If you didn't request this password reset, someone may be trying to access your account. Please contact our support team if you're concerned.</p>
              <p>This reset link expires in 1 hour and can only be used once.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}
