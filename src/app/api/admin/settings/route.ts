import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function verifyAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [id, username] = decoded.split(':');
    return db.adminUser.findUnique({ where: { id, username, isActive: true } });
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ success: false, msg: 'Unauthorized' }, { status: 401 });

  try {
    const settings = await db.siteSetting.findMany();
    const settingsMap: Record<string, string> = {};
    settings.forEach(s => { settingsMap[s.key] = s.value; });

    return NextResponse.json({ success: true, data: settingsMap });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json({ success: false, msg: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ success: false, msg: 'Unauthorized' }, { status: 401 });

  try {
    const { settings } = await request.json();

    for (const [key, value] of Object.entries(settings)) {
      await db.siteSetting.upsert({
        where: { key },
        create: { key, value: String(value) },
        update: { value: String(value) }
      });
    }

    return NextResponse.json({ success: true, msg: 'Settings updated' });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json({ success: false, msg: 'Internal server error' }, { status: 500 });
  }
}