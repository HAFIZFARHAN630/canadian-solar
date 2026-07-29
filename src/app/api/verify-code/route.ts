import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { moduleSn, verifyCode } = body;

    if (!moduleSn) {
      return NextResponse.json({ success: false, code: '40000', msg: 'Serial number is required' });
    }

    const foundModule = await db.solarModule.findUnique({
      where: { moduleSn, isActive: true }
    });

    if (!foundModule) {
      return NextResponse.json({ success: false, code: '40004', msg: 'Module not found' });
    }

    // If verifyCode is empty, just log the access (bypass for non-Pakistan)
    if (!verifyCode) {
      return NextResponse.json({ success: true, code: '00000', msg: 'OK' });
    }

    // Check anti-counterfeiting code
    if (foundModule.verifyCode && foundModule.verifyCode === verifyCode) {
      return NextResponse.json({ success: true, code: '00000', msg: 'Verification successful' });
    }

    return NextResponse.json({ success: false, code: '40001', msg: 'Anti-counterfeiting code error' });
  } catch (error) {
    console.error('Verify code error:', error);
    return NextResponse.json({ success: false, code: '50000', msg: 'Internal server error' }, { status: 500 });
  }
}