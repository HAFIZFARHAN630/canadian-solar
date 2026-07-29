import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomBytes } from 'crypto';

// Simple SVG captcha generator
function generateCaptchaCode(length = 4): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateCaptchaSvg(code: string): string {
  const width = 140;
  const height = 40;
  const colors = ['#CE0412', '#1a1a1a', '#2563eb', '#16a34a', '#d97706'];
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`;
  svg += `<rect width="${width}" height="${height}" fill="#f3f4f6" rx="4"/>`;

  // Add noise lines
  for (let i = 0; i < 4; i++) {
    const x1 = Math.random() * width;
    const y1 = Math.random() * height;
    const x2 = Math.random() * width;
    const y2 = Math.random() * height;
    const color = colors[Math.floor(Math.random() * colors.length)];
    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1" opacity="0.4"/>`;
  }

  // Add noise dots
  for (let i = 0; i < 30; i++) {
    const cx = Math.random() * width;
    const cy = Math.random() * height;
    svg += `<circle cx="${cx}" cy="${cy}" r="1" fill="#999" opacity="0.5"/>`;
  }

  // Add text characters
  const startX = 12;
  const charWidth = (width - 24) / code.length;
  for (let i = 0; i < code.length; i++) {
    const x = startX + i * charWidth + charWidth / 2;
    const y = height / 2 + 6;
    const rotate = (Math.random() - 0.5) * 20;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const fontSize = 20 + Math.floor(Math.random() * 6);
    svg += `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="${color}" text-anchor="middle" transform="rotate(${rotate}, ${x}, ${y})">${code[i]}</text>`;
  }

  svg += '</svg>';
  return svg;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uuid = searchParams.get('uuid') || randomBytes(16).toString('hex');

    const code = generateCaptchaCode(4);
    const svg = generateCaptchaSvg(code);

    // Store captcha
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Clean up old captchas
    await db.captchaStore.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });

    await db.captchaStore.upsert({
      where: { uuid },
      create: { uuid, code, expiresAt },
      update: { code, expiresAt }
    });

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache, no-store',
        'X-Captcha-Uuid': uuid
      }
    });
  } catch (error) {
    console.error('Captcha generation error:', error);
    return NextResponse.json({ error: 'Failed to generate captcha' }, { status: 500 });
  }
}