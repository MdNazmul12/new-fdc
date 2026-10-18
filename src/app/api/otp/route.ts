import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

export const dynamic = 'force-dynamic';

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST: Generate and store OTP, then send email
export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

    // Check if user exists with this email
    const client = await clientPromise;
    const db = client.db();
    const usersCol = db.collection('users');
    const user = await usersCol.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return NextResponse.json({ error: 'No account found with this email address.' }, { status: 404 });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Invalidate old OTPs for this email
    const otpCol = db.collection('otp_tokens');
    await otpCol.updateMany(
      { email: email.toLowerCase().trim(), used: false },
      { $set: { used: true } }
    );

    // Store new OTP
    await otpCol.insertOne({
      id: `otp-${Date.now()}`,
      email: email.toLowerCase().trim(),
      otp,
      expiresAt,
      used: false,
      createdAt: new Date().toISOString(),
    });

    // Send email via our email API
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const emailRes = await fetch(`${appUrl}/api/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'otp',
        to: email,
        data: { otp, userName: user.name || email },
      }),
    });

    const emailResult = await emailRes.json();
    if (!emailResult.success) {
      console.warn('OTP email send failed:', emailResult.error);
    }

    return NextResponse.json({ success: true, message: 'OTP sent to your email address.' });
  } catch (error: any) {
    console.error('OTP generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Verify OTP
export async function PUT(request: Request) {
  try {
    const { email, otp } = await request.json();
    if (!email || !otp) return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });

    const client = await clientPromise;
    const db = client.db();
    const otpCol = db.collection('otp_tokens');

    const record = await otpCol.findOne({
      email: email.toLowerCase().trim(),
      otp,
      used: false,
    });

    if (!record) {
      return NextResponse.json({ error: 'Invalid OTP. Please check and try again.' }, { status: 400 });
    }

    if (new Date() > new Date(record.expiresAt)) {
      return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 });
    }

    // Mark OTP as used
    await otpCol.updateOne({ _id: record._id }, { $set: { used: true } });

    return NextResponse.json({ success: true, message: 'OTP verified successfully.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Reset password after OTP verification
export async function PATCH(request: Request) {
  try {
    const { email, newPassword } = await request.json();
    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Email and new password are required' }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const usersCol = db.collection('users');

    const result = await usersCol.updateOne(
      { email: email.toLowerCase().trim() },
      { $set: { password: newPassword, updatedAt: new Date().toISOString() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Password reset successfully.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
