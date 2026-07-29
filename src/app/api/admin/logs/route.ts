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
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || '';
    const result = searchParams.get('result') || '';

    const where: Record<string, unknown> = {};
    if (search) {
      where.moduleSn = { contains: search };
    }
    if (result) {
      where.result = result;
    }

    const [logs, total] = await Promise.all([
      db.queryLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          module: {
            select: { moduleType: true, endMarketCountry: true, power: true }
          }
        }
      }),
      db.queryLog.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    console.error('List logs error:', error);
    return NextResponse.json({ success: false, msg: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ success: false, msg: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const before = searchParams.get('before');

    const where: Record<string, unknown> = {};
    if (before) {
      where.createdAt = { lt: new Date(before) };
    }

    const result = await db.queryLog.deleteMany({ where });

    return NextResponse.json({ success: true, deleted: result.count });
  } catch (error) {
    console.error('Delete logs error:', error);
    return NextResponse.json({ success: false, msg: 'Internal server error' }, { status: 500 });
  }
}