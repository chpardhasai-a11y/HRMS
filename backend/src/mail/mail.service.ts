import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface OnboardingEmailData {
  email: string;
  employeeName: string;
  employeeCode: string;
  loginUrl: string;
  tempPassword: string;
  otpCode: string;
  companyName?: string;
}

export interface PasswordResetEmailData {
  email: string;
  resetUrl: string;
  userName?: string;
}

export interface ApprovalNotificationData {
  email: string;
  employeeName: string;
  reqId: string;
  category: string;
  status: 'Approved' | 'Rejected';
  rejectionNote?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initTransporter();
  }

  private initTransporter() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = parseInt(this.configService.get<string>('SMTP_PORT') || '587', 10);
    const secure = this.configService.get<string>('SMTP_SECURE') === 'true';
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        authMethod: 'LOGIN',
        auth: { user, pass },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000,
        tls: {
          rejectUnauthorized: false
        }
      });
      this.logger.log(`SMTP Mailer initialized with host: ${host}:${port}`);
    } else {
      this.transporter = null;
      this.logger.warn(
        'SMTP credentials not fully configured (SMTP_HOST, SMTP_USER, SMTP_PASS). Emailer operating in simulated log mode.'
      );
    }
  }

  private getFromAddress(): string {
    return (
      this.configService.get<string>('SMTP_FROM') ||
      '"HRMS Portal" <no-reply@hrms.local>'
    );
  }

  private async sendMail(options: { to: string; subject: string; html: string; text?: string }) {
    const from = this.getFromAddress();

    if (!this.transporter) {
      this.initTransporter();
    }

    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html
        });
        this.logger.log(`Email successfully sent to ${options.to} (MessageID: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
      } catch (error) {
        this.logger.error(
          `Failed to send email to ${options.to} via SMTP: ${error instanceof Error ? error.message : error}. Falling back to simulated log mode.`
        );
        this.logger.log(`\n================ [SIMULATED MAIL FALLBACK] ================\nTo: ${options.to}\nSubject: ${options.subject}\nContent:\n${options.text || options.html}\n===========================================================\n`);
        return { success: true, simulated: true, error };
      }
    } else {
      this.logger.log(`\n================ [SIMULATED MAIL] ================\nTo: ${options.to}\nSubject: ${options.subject}\nContent:\n${options.text || options.html}\n==================================================\n`);
      return { success: true, simulated: true };
    }
  }

  async sendOnboardingInvite(data: OnboardingEmailData) {
    const company = data.companyName || 'HRMS Portal';
    const subject = `Welcome to ${company} - Complete Your Onboarding`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
          .header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: #ffffff; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.5px; }
          .header p { margin: 8px 0 0 0; color: #94a3b8; font-size: 14px; }
          .content { padding: 32px; color: #334155; line-height: 1.6; }
          .welcome-text { font-size: 16px; margin-bottom: 24px; }
          .credentials-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0; }
          .cred-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
          .cred-row:last-child { margin-bottom: 0; }
          .cred-label { color: #64748b; font-weight: 500; }
          .cred-val { color: #0f172a; font-weight: 700; font-family: monospace; background: #e2e8f0; padding: 2px 8px; border-radius: 4px; }
          .btn-container { text-align: center; margin: 32px 0; }
          .btn { background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; transition: background 0.2s; }
          .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to ${company}!</h1>
            <p>Employee Onboarding Invitation</p>
          </div>
          <div class="content">
            <p class="welcome-text">Hello <strong>${data.employeeName}</strong>,</p>
            <p>Your employee profile has been created. Please complete your onboarding account setup to access your portal, submit statutory documents, and view your workspace profile.</p>

            <div class="credentials-box">
              <div class="cred-row">
                <span class="cred-label">Employee Code:</span>
                <span class="cred-val">${data.employeeCode}</span>
              </div>
              <div class="cred-row" style="margin-top: 8px;">
                <span class="cred-label">Temporary Password:</span>
                <span class="cred-val">${data.tempPassword}</span>
              </div>
              <div class="cred-row" style="margin-top: 8px;">
                <span class="cred-label">Verification OTP:</span>
                <span class="cred-val">${data.otpCode}</span>
              </div>
            </div>

            <div class="btn-container">
              <a href="${data.loginUrl}" class="btn" target="_blank">Complete Onboarding Now</a>
            </div>

            <p style="font-size: 13px; color: #64748b;">
              If the button above does not work, copy and paste this link into your browser:<br>
              <a href="${data.loginUrl}" style="color: #2563eb;">${data.loginUrl}</a>
            </p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} ${company}. All rights reserved. Secure Automated HRMS Notification.
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendMail({
      to: data.email,
      subject,
      html,
      text: `Hello ${data.employeeName}, welcome to ${company}. Your Employee Code is ${data.employeeCode}. Temporary Password: ${data.tempPassword}, OTP: ${data.otpCode}. Setup link: ${data.loginUrl}`
    });
  }

  async sendPasswordReset(data: PasswordResetEmailData) {
    const subject = `Reset Your HRMS Password`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
          .header { background: #1e293b; color: #ffffff; padding: 25px; text-align: center; }
          .header h1 { margin: 0; font-size: 22px; font-weight: 600; }
          .content { padding: 32px; color: #334155; line-height: 1.6; }
          .btn-container { text-align: center; margin: 28px 0; }
          .btn { background: #dc2626; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; }
          .footer { background: #f8fafc; padding: 18px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
          .alert { background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 20px 0; font-size: 13px; color: #991b1b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello${data.userName ? ' <strong>' + data.userName + '</strong>' : ''},</p>
            <p>We received a request to reset your HRMS portal account password. Click the button below to set up a new password.</p>

            <div class="btn-container">
              <a href="${data.resetUrl}" class="btn" target="_blank">Reset Password</a>
            </div>

            <div class="alert">
              <strong>Security Notice:</strong> This link is valid for 30 minutes. If you did not request a password reset, please ignore this email or contact your HR administrator immediately.
            </div>

            <p style="font-size: 12px; color: #64748b;">
              Link: <a href="${data.resetUrl}" style="color: #2563eb;">${data.resetUrl}</a>
            </p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} HRMS Portal. System Security Notification.
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendMail({
      to: data.email,
      subject,
      html,
      text: `Reset your password by visiting: ${data.resetUrl}. Valid for 30 minutes.`
    });
  }

  async sendApprovalNotification(data: ApprovalNotificationData) {
    const isApproved = data.status === 'Approved';
    const statusColor = isApproved ? '#16a34a' : '#dc2626';
    const subject = `Approval Request ${data.reqId} ${data.status}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
          .header { background: #1e293b; color: #ffffff; padding: 25px; text-align: center; }
          .header h1 { margin: 0; font-size: 22px; font-weight: 600; }
          .content { padding: 32px; color: #334155; line-height: 1.6; }
          .status-badge { display: inline-block; padding: 6px 14px; border-radius: 20px; color: #ffffff; font-weight: 700; font-size: 14px; background-color: ${statusColor}; }
          .details-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0; }
          .footer { background: #f8fafc; padding: 18px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>HR Request Notification</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${data.employeeName}</strong>,</p>
            <p>Your request (<strong>${data.reqId}</strong>) regarding <strong>${data.category}</strong> has been updated:</p>

            <div style="text-align: center; margin: 20px 0;">
              <span class="status-badge">${data.status.toUpperCase()}</span>
            </div>

            <div class="details-box">
              <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Request ID:</strong> ${data.reqId}</p>
              <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Category:</strong> ${data.category}</p>
              ${data.rejectionNote ? `<p style="margin: 0; font-size: 14px; color: #dc2626;"><strong>Note:</strong> ${data.rejectionNote}</p>` : ''}
            </div>

            <p>Log in to your HRMS portal to view the details.</p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} HRMS Portal. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendMail({
      to: data.email,
      subject,
      html,
      text: `Hello ${data.employeeName}, your approval request ${data.reqId} for ${data.category} has been ${data.status}.`
    });
  }
}
