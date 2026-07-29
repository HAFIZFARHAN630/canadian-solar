import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashSync, compareSync } from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, msg: 'Username and password are required' });
    }

    const admin = await db.adminUser.findUnique({ where: { username } });

    if (!admin || !admin.isActive) {
      return NextResponse.json({ success: false, msg: 'Invalid credentials' });
    }

    if (!compareSync(password, admin.password)) {
      return NextResponse.json({ success: false, msg: 'Invalid credentials' });
    }

    // Create a simple token (in production, use JWT)
    const token = Buffer.from(`${admin.id}:${admin.username}:${Date.now()}`).toString('base64');

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, msg: 'Internal server error' }, { status: 500 });
  }
}

// Verify token middleware helper
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, msg: 'No token provided' });
    }

    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [id, username] = decoded.split(':');

    const admin = await db.adminUser.findUnique({ where: { id, username } });
    if (!admin || !admin.isActive) {
      return NextResponse.json({ success: false, msg: 'Invalid token' });
    }

    return NextResponse.json({
      success: true,
      user: { id: admin.id, username: admin.username, name: admin.name, role: admin.role }
    });
  } catch {
    return NextResponse.json({ success: false, msg: 'Invalid token' });
  }
}