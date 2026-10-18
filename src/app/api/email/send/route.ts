import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const FROM_EMAIL = process.env.FROM_EMAIL || 'FDC Platform <onboarding@resend.dev>';
const APP_NAME = 'Friends Development Committee (FDC)';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('RESEND_API_KEY is not configured in environment.');
      return NextResponse.json(
        { error: 'RESEND_API_KEY is not set. Please configure RESEND_API_KEY in .env.local' },
        { status: 503 }
      );
    }

    const resend = new Resend(apiKey);
    const body = await request.json();
    const { type, to, data } = body;

    if (!type || !to) {
      return NextResponse.json({ error: 'Missing required fields: type, to' }, { status: 400 });
    }

    let subject = '';
    let html = '';

    switch (type) {

      // ─── 1. OTP for Forgot Password ──────────────────────────────────
      case 'otp': {
        subject = `${data.otp} - Your FDC Password Reset OTP`;
        html = `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <div style="background:linear-gradient(135deg,#4f46e5,#6366f1);padding:32px;text-align:center;">
              <img src="${process.env.NEXT_PUBLIC_APP_URL}/logo.jpg" alt="FDC Logo" style="width:64px;height:64px;border-radius:50%;background:#fff;padding:4px;object-fit:contain;" />
              <h1 style="color:#fff;font-size:20px;margin:12px 0 0;font-weight:700;">${APP_NAME}</h1>
            </div>
            <div style="padding:32px;">
              <h2 style="color:#111827;font-size:18px;margin:0 0 8px;">Password Reset OTP</h2>
              <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">You requested a password reset. Use the OTP below to reset your password:</p>
              <div style="text-align:center;background:#f3f4f6;border-radius:12px;padding:24px;margin:0 0 24px;">
                <div style="font-size:42px;font-weight:800;letter-spacing:10px;color:#4f46e5;font-family:'Courier New',monospace;">${data.otp}</div>
                <p style="color:#9ca3af;font-size:12px;margin:8px 0 0;">Valid for <strong>10 minutes</strong></p>
              </div>
              <p style="color:#6b7280;font-size:13px;">If you did not request this, please ignore this email. Do not share this OTP with anyone.</p>
            </div>
            <div style="background:#f9fafb;padding:16px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="color:#9ca3af;font-size:11px;margin:0;">© ${new Date().getFullYear()} ${APP_NAME} · Automated Security Email</p>
            </div>
          </div>`;
        break;
      }

      // ─── 2. Approval Alert ───────────────────────────────────────────
      case 'approval': {
        subject = `✅ Payment Approved — ${data.month} | ${APP_NAME}`;
        html = `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <div style="background:linear-gradient(135deg,#059669,#10b981);padding:28px;text-align:center;">
              <h1 style="color:#fff;font-size:18px;margin:0;font-weight:700;">✅ Payment Approved!</h1>
              <p style="color:#a7f3d0;font-size:13px;margin:6px 0 0;">পেমেন্ট অনুমোদিত হয়েছে</p>
            </div>
            <div style="padding:28px;">
              <p style="color:#374151;font-size:14px;margin:0 0 20px;">Dear <strong>${data.memberName}</strong>,</p>
              <p style="color:#6b7280;font-size:13px;margin:0 0 20px;">Your subscription payment has been approved by the admin. Details below:</p>
              <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:8px;overflow:hidden;">
                <tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:10px 14px;color:#6b7280;font-size:12px;font-weight:600;">Receipt No</td><td style="padding:10px 14px;color:#111827;font-size:12px;font-family:monospace;">${data.receiptNo}</td></tr>
                <tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:10px 14px;color:#6b7280;font-size:12px;font-weight:600;">Billing Month</td><td style="padding:10px 14px;color:#111827;font-size:12px;">${data.month}</td></tr>
                <tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:10px 14px;color:#6b7280;font-size:12px;font-weight:600;">Amount Paid</td><td style="padding:10px 14px;color:#059669;font-size:14px;font-weight:700;">${data.amount} TK</td></tr>
                <tr><td style="padding:10px 14px;color:#6b7280;font-size:12px;font-weight:600;">Approved By</td><td style="padding:10px 14px;color:#111827;font-size:12px;">${data.approvedBy}</td></tr>
              </table>
              <p style="color:#6b7280;font-size:13px;margin:20px 0 0;">আপনার বকেয়া পরিশোধ সম্পন্ন হয়েছে। ধন্যবাদ!</p>
            </div>
            <div style="background:#f9fafb;padding:16px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="color:#9ca3af;font-size:11px;margin:0;">© ${new Date().getFullYear()} ${APP_NAME}</p>
            </div>
          </div>`;
        break;
      }

      // ─── 3. Rejection Alert ──────────────────────────────────────────
      case 'rejection': {
        subject = `❌ Payment Rejected — ${data.month} | ${APP_NAME}`;
        html = `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <div style="background:linear-gradient(135deg,#dc2626,#ef4444);padding:28px;text-align:center;">
              <h1 style="color:#fff;font-size:18px;margin:0;font-weight:700;">❌ Payment Rejected</h1>
              <p style="color:#fecaca;font-size:13px;margin:6px 0 0;">পেমেন্ট বাতিল হয়েছে</p>
            </div>
            <div style="padding:28px;">
              <p style="color:#374151;font-size:14px;margin:0 0 20px;">Dear <strong>${data.memberName}</strong>,</p>
              <p style="color:#6b7280;font-size:13px;margin:0 0 20px;">Your payment submission for <strong>${data.month}</strong> was rejected.</p>
              <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px;margin:0 0 20px;">
                <p style="color:#b91c1c;font-size:12px;font-weight:600;margin:0 0 4px;">Rejection Reason:</p>
                <p style="color:#374151;font-size:13px;margin:0;">${data.reason || 'Please contact the admin for details.'}</p>
              </div>
              <p style="color:#6b7280;font-size:13px;">Please re-submit your payment or contact the admin for assistance.</p>
            </div>
            <div style="background:#f9fafb;padding:16px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="color:#9ca3af;font-size:11px;margin:0;">© ${new Date().getFullYear()} ${APP_NAME}</p>
            </div>
          </div>`;
        break;
      }

      // ─── 4. Due Reminder ─────────────────────────────────────────────
      case 'due_reminder': {
        subject = `⏰ Due Reminder — ${data.month} Subscription | ${APP_NAME}`;
        html = `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <div style="background:linear-gradient(135deg,#d97706,#f59e0b);padding:28px;text-align:center;">
              <h1 style="color:#fff;font-size:18px;margin:0;font-weight:700;">⏰ Payment Due Reminder</h1>
              <p style="color:#fef3c7;font-size:13px;margin:6px 0 0;">মাসিক চাঁদা পরিশোধের অনুস্মারক</p>
            </div>
            <div style="padding:28px;">
              <p style="color:#374151;font-size:14px;margin:0 0 16px;">Dear <strong>${data.memberName}</strong>,</p>
              <p style="color:#6b7280;font-size:13px;margin:0 0 20px;">Your monthly subscription for <strong>${data.month}</strong> is due. Please pay before the cutoff date to avoid late fine.</p>
              <table style="width:100%;border-collapse:collapse;background:#fffbeb;border-radius:8px;overflow:hidden;border:1px solid #fde68a;">
                <tr style="border-bottom:1px solid #fde68a;"><td style="padding:10px 14px;color:#92400e;font-size:12px;font-weight:600;">Month</td><td style="padding:10px 14px;color:#111827;font-size:12px;">${data.month}</td></tr>
                <tr style="border-bottom:1px solid #fde68a;"><td style="padding:10px 14px;color:#92400e;font-size:12px;font-weight:600;">Amount</td><td style="padding:10px 14px;color:#d97706;font-size:14px;font-weight:700;">${data.amount} TK</td></tr>
                <tr style="border-bottom:1px solid #fde68a;"><td style="padding:10px 14px;color:#92400e;font-size:12px;font-weight:600;">Due Date</td><td style="padding:10px 14px;color:#dc2626;font-size:12px;font-weight:600;">${data.dueDate}</td></tr>
                <tr><td style="padding:10px 14px;color:#92400e;font-size:12px;font-weight:600;">Late Fine</td><td style="padding:10px 14px;color:#dc2626;font-size:12px;">+${data.lateFine} TK (after due date)</td></tr>
              </table>
              <p style="color:#6b7280;font-size:12px;margin:20px 0 0;">Login to FDC Platform to submit your payment online.</p>
            </div>
            <div style="background:#f9fafb;padding:16px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="color:#9ca3af;font-size:11px;margin:0;">© ${new Date().getFullYear()} ${APP_NAME}</p>
            </div>
          </div>`;
        break;
      }

      // ─── 5. Loan Approved ────────────────────────────────────────────
      case 'loan_approved': {
        subject = `💰 Loan Approved — ${data.loanNo} | ${APP_NAME}`;
        html = `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <div style="background:linear-gradient(135deg,#7c3aed,#8b5cf6);padding:28px;text-align:center;">
              <h1 style="color:#fff;font-size:18px;margin:0;font-weight:700;">💰 Loan Approved!</h1>
              <p style="color:#ddd6fe;font-size:13px;margin:6px 0 0;">ঋণ অনুমোদিত হয়েছে</p>
            </div>
            <div style="padding:28px;">
              <p style="color:#374151;font-size:14px;margin:0 0 20px;">Dear <strong>${data.memberName}</strong>,</p>
              <p style="color:#6b7280;font-size:13px;margin:0 0 20px;">Your loan application has been approved. Details:</p>
              <table style="width:100%;border-collapse:collapse;background:#f5f3ff;border-radius:8px;overflow:hidden;border:1px solid #ddd6fe;">
                <tr style="border-bottom:1px solid #ddd6fe;"><td style="padding:10px 14px;color:#6d28d9;font-size:12px;font-weight:600;">Loan No</td><td style="padding:10px 14px;color:#111827;font-size:12px;font-family:monospace;">${data.loanNo}</td></tr>
                <tr style="border-bottom:1px solid #ddd6fe;"><td style="padding:10px 14px;color:#6d28d9;font-size:12px;font-weight:600;">Amount</td><td style="padding:10px 14px;color:#7c3aed;font-size:14px;font-weight:700;">${data.amount} TK</td></tr>
                <tr style="border-bottom:1px solid #ddd6fe;"><td style="padding:10px 14px;color:#6d28d9;font-size:12px;font-weight:600;">Interest</td><td style="padding:10px 14px;color:#111827;font-size:12px;">${data.interestRate}% / year</td></tr>
                <tr><td style="padding:10px 14px;color:#6d28d9;font-size:12px;font-weight:600;">Due Date</td><td style="padding:10px 14px;color:#111827;font-size:12px;">${data.dueDate}</td></tr>
              </table>
            </div>
            <div style="background:#f9fafb;padding:16px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="color:#9ca3af;font-size:11px;margin:0;">© ${new Date().getFullYear()} ${APP_NAME}</p>
            </div>
          </div>`;
        break;
      }

      default:
        return NextResponse.json({ error: 'Unknown email type' }, { status: 400 });
    }

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });

    return NextResponse.json({ success: true, id: result.data?.id });
  } catch (error: any) {
    console.error('Email send error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
