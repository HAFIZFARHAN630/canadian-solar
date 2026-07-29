import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

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
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalModules,
      activeModules,
      totalQueries,
      todayQueries,
      weekQueries,
      monthQueries,
      failedQueries,
      countryStats,
      recentQueries,
      dailyQueryTrend,
      topModules
    ] = await Promise.all([
      db.solarModule.count({ where: { isActive: true } }),
      db.solarModule.count({ where: { isActive: true } }),
      db.queryLog.count(),
      db.queryLog.count({ where: { createdAt: { gte: startOfDay } } }),
      db.queryLog.count({ where: { createdAt: { gte: startOfWeek } } }),
      db.queryLog.count({ where: { createdAt: { gte: startOfMonth } } }),
      db.queryLog.count({ where: { result: 'failed' } }),

      db.queryLog.groupBy({
        by: ['moduleSn'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
        where: { module: { isNot: null } }
      }),

      db.queryLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { module: { select: { moduleType: true, endMarketCountry: true } } }
      }),

      // Daily query trend for last 7 days
      db.$queryRaw<Array<{ date: string; count: number }>>`
        SELECT DATE(createdAt) as date, COUNT(*) as count
        FROM QueryLog
        WHERE createdAt >= datetime('now', '-7 days')
        GROUP BY DATE(createdAt)
        ORDER BY date ASC
      `,

      db.queryLog.groupBy({
        by: ['moduleSn'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
        where: { module: { isNot: null } }
      })
    ]);

    // Country distribution
    const countries = await db.solarModule.groupBy({
      by: ['endMarketCountry'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      where: { isActive: true }
    });

    // Power distribution
    const powerDist = await db.solarModule.groupBy({
      by: ['moduleGrade'],
      _count: { id: true },
      where: { isActive: true }
    });

    return NextResponse.json({
      success: true,
      data: {
        totalModules,
        activeModules,
        totalQueries,
        todayQueries,
        weekQueries,
        monthQueries,
        failedQueries,
        successRate: totalQueries > 0 ? (((totalQueries - failedQueries) / totalQueries) * 100).toFixed(1) : '100.0',
        countryStats: countries,
        gradeDistribution: powerDist,
        recentQueries,
        dailyQueryTrend,
        topQueriedModules: topModules
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ success: false, msg: 'Internal server error' }, { status: 500 });
  }
}