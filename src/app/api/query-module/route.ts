import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, moduleSn, queryTime, uuid } = body;

    if (!moduleSn || !code || !uuid) {
      return NextResponse.json({ code: 1, msg: 'Missing required fields' });
    }

    // Verify captcha
    const captcha = await db.captchaStore.findUnique({ where: { uuid } });
    if (!captcha) {
      return NextResponse.json({ code: 1, msg: 'Verification code expired' });
    }

    if (captcha.code.toUpperCase() !== code.toUpperCase()) {
      return NextResponse.json({ code: 1, msg: 'Verification code error' });
    }

    if (new Date() > captcha.expiresAt) {
      await db.captchaStore.delete({ where: { uuid } });
      return NextResponse.json({ code: 1, msg: 'Verification code expired' });
    }

    // Clean up used captcha
    await db.captchaStore.delete({ where: { uuid } });

    // Find module
    const foundModule = await db.solarModule.findUnique({
      where: { moduleSn, isActive: true }
    });

    if (!foundModule) {
      return NextResponse.json({ code: 2, msg: 'Module not found', data: null });
    }

    // Get or create query log count
    const existingLogs = await db.queryLog.count({
      where: { moduleSn }
    });
    const queryNumber = existingLogs + 1;

    // Log the query
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const ua = request.headers.get('user-agent') || 'unknown';

    await db.queryLog.create({
      data: {
        moduleSn,
        queryNumber,
        ipAddress: ip,
        userAgent: ua,
        result: 'success',
        moduleId: foundModule.id
      }
    });

    return NextResponse.json({
      code: 0,
      data: {
        moduleSn: foundModule.moduleSn,
        moduleType: foundModule.moduleType,
        power: foundModule.power,
        moduleGrade: foundModule.moduleGrade,
        endMarketCountry: foundModule.endMarketCountry,
        customerDesc: foundModule.customerDesc || '',
        productionDate: foundModule.productionDate || '',
        actualMovementDate: foundModule.actualMovementDate || '',
        queryTime: queryTime || new Date().toISOString(),
        queryNumber
      }
    });
  } catch (error) {
    console.error('Query module error:', error);
    return NextResponse.json({ code: 1, msg: 'Internal server error' }, { status: 500 });
  }
}