import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Helper to verify admin token
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

// GET - List all modules with pagination and search
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ success: false, msg: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const search = searchParams.get('search') || '';
    const country = searchParams.get('country') || '';

    const where: Record<string, unknown> = { isActive: true };
    if (search) {
      where.OR = [
        { moduleSn: { contains: search } },
        { moduleType: { contains: search } },
        { customerDesc: { contains: search } }
      ];
    }
    if (country) {
      where.endMarketCountry = country;
    }

    const [modules, total] = await Promise.all([
      db.solarModule.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      db.solarModule.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: modules,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    console.error('List modules error:', error);
    return NextResponse.json({ success: false, msg: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new module
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ success: false, msg: 'Unauthorized' }, { status: 401 });

  try {
    const data = await request.json();
    const { moduleSn, moduleType, power, moduleGrade, endMarketCountry, customerDesc, productionDate, actualMovementDate, verifyCode } = data;

    if (!moduleSn || !moduleType || !power || !moduleGrade || !endMarketCountry) {
      return NextResponse.json({ success: false, msg: 'Missing required fields' });
    }

    const existing = await db.solarModule.findUnique({ where: { moduleSn } });
    if (existing) {
      return NextResponse.json({ success: false, msg: 'Serial number already exists' });
    }

    const newModule = await db.solarModule.create({
      data: {
        moduleSn, moduleType, power, moduleGrade, endMarketCountry,
        customerDesc: customerDesc || null,
        productionDate: productionDate || null,
        actualMovementDate: actualMovementDate || null,
        verifyCode: verifyCode || null
      }
    });

    return NextResponse.json({ success: true, data: newModule });
  } catch (error) {
    console.error('Create module error:', error);
    return NextResponse.json({ success: false, msg: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update a module
export async function PUT(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ success: false, msg: 'Unauthorized' }, { status: 401 });

  try {
    const data = await request.json();
    const { id, ...updateData } = data;

    if (!id) {
      return NextResponse.json({ success: false, msg: 'Module ID is required' });
    }

    const updatedModule = await db.solarModule.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ success: true, data: updatedModule });
  } catch (error) {
    console.error('Update module error:', error);
    return NextResponse.json({ success: false, msg: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Soft delete a module
export async function DELETE(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ success: false, msg: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, msg: 'Module ID is required' });
    }

    await db.solarModule.update({
      where: { id },
      data: { isActive: false }
    });

    return NextResponse.json({ success: true, msg: 'Module deleted' });
  } catch (error) {
    console.error('Delete module error:', error);
    return NextResponse.json({ success: false, msg: 'Internal server error' }, { status: 500 });
  }
}