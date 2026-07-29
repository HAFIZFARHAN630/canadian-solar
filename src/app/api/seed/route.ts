import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashSync } from 'bcryptjs';

export async function POST() {
  try {
    // Seed admin user (password: admin123)
    await db.adminUser.upsert({
      where: { username: 'admin' },
      create: {
        username: 'admin',
        password: hashSync('admin123', 10),
        name: 'System Administrator',
        role: 'superadmin'
      },
      update: {}
    });

    // Seed sample solar modules
    const sampleModules = [
      { moduleSn: 'CSI-HL72V-560-20260101AB', moduleType: 'HiKu7', power: '560', moduleGrade: 'A', endMarketCountry: 'Pakistan', customerDesc: 'SolarTech Pakistan Pvt Ltd', productionDate: '20260315', actualMovementDate: '20260401', verifyCode: 'AC-2026-PK' },
      { moduleSn: 'CSI-HL72V-545-20260102CD', moduleType: 'HiKu7', power: '545', moduleGrade: 'A', endMarketCountry: 'Germany', customerDesc: null, productionDate: '20260210', actualMovementDate: '20260228', verifyCode: null },
      { moduleSn: 'CSI-HL72V-550-20260103EF', moduleType: 'HiKu7', power: '550', moduleGrade: 'A+', endMarketCountry: 'United States', customerDesc: null, productionDate: '20260420', actualMovementDate: '20260510', verifyCode: null },
      { moduleSn: 'CSI-HL66V-420-20260104GH', moduleType: 'HiKu6', power: '420', moduleGrade: 'A', endMarketCountry: 'Pakistan', customerDesc: 'Green Energy Solutions', productionDate: '20260501', actualMovementDate: '20260515', verifyCode: 'BD-2026-PK' },
      { moduleSn: 'CSI-HL72V-565-20260105IJ', moduleType: 'HiKu7', power: '565', moduleGrade: 'A+', endMarketCountry: 'Australia', customerDesc: null, productionDate: '20260301', actualMovementDate: '20260320', verifyCode: null },
      { moduleSn: 'CSI-HL66V-415-20260106KL', moduleType: 'HiKu6', power: '415', moduleGrade: 'B', endMarketCountry: 'India', customerDesc: null, productionDate: '20260115', actualMovementDate: '20260201', verifyCode: null },
      { moduleSn: 'CSI-HL72V-555-20260107MN', moduleType: 'HiKu7', power: '555', moduleGrade: 'A', endMarketCountry: 'Japan', customerDesc: null, productionDate: '20260410', actualMovementDate: '20260425', verifyCode: null },
      { moduleSn: 'CSI-HL72V-540-20260108OP', moduleType: 'HiKu7', power: '540', moduleGrade: 'A', endMarketCountry: 'Brazil', customerDesc: null, productionDate: '20260220', actualMovementDate: '20260315', verifyCode: null },
      { moduleSn: 'CSI-HL66V-425-20260109QR', moduleType: 'HiKu6', power: '425', moduleGrade: 'A+', endMarketCountry: 'Pakistan', customerDesc: 'Bright Solar Systems', productionDate: '20260510', actualMovementDate: '20260525', verifyCode: 'CE-2026-PK' },
      { moduleSn: 'CSI-HL72V-570-20260110ST', moduleType: 'HiKu7', power: '570', moduleGrade: 'A+', endMarketCountry: 'Netherlands', customerDesc: null, productionDate: '20260325', actualMovementDate: '20260410', verifyCode: null },
      { moduleSn: 'CSI-HL72V-535-20260111UV', moduleType: 'HiKu7', power: '535', moduleGrade: 'B', endMarketCountry: 'Canada', customerDesc: null, productionDate: '20260120', actualMovementDate: '20260205', verifyCode: null },
      { moduleSn: 'CSI-HL66V-430-20260112WX', moduleType: 'HiKu6', power: '430', moduleGrade: 'A', endMarketCountry: 'South Africa', customerDesc: null, productionDate: '20260405', actualMovementDate: '20260420', verifyCode: null },
    ];

    for (const m of sampleModules) {
      await db.solarModule.upsert({
        where: { moduleSn: m.moduleSn },
        create: m,
        update: m
      });
    }

    // Seed some query logs
    const countries = ['Pakistan', 'Germany', 'United States', 'Australia', 'India'];
    const sns = sampleModules.map(m => m.moduleSn);
    for (let i = 0; i < 25; i++) {
      const sn = sns[Math.floor(Math.random() * sns.length)];
      const daysAgo = Math.floor(Math.random() * 7);
      const date = new Date(Date.now() - daysAgo * 86400000 - Math.random() * 86400000);
      await db.queryLog.create({
        data: {
          moduleSn: sn,
          queryNumber: Math.floor(Math.random() * 5) + 1,
          ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          userAgent: 'Mozilla/5.0',
          result: Math.random() > 0.1 ? 'success' : 'failed',
          moduleId: (await db.solarModule.findUnique({ where: { moduleSn: sn } }))?.id
        }
      });
    }

    // Seed default settings
    const defaultSettings = [
      { key: 'site_title', value: 'Module Authenticity Verification' },
      { key: 'company_name', value: 'Canadian Solar' },
      { key: 'max_query_per_day', value: '100' },
      { key: 'captcha_enabled', value: 'true' },
      { key: 'anti_counterfeit_enabled', value: 'true' },
      { key: 'footer_text', value: 'Copyright © Canadian Solar. All rights reserved' },
    ];

    for (const s of defaultSettings) {
      await db.siteSetting.upsert({
        where: { key: s.key },
        create: s,
        update: {}
      });
    }

    return NextResponse.json({ success: true, msg: 'Database seeded successfully' });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ success: false, msg: 'Seed failed' }, { status: 500 });
  }
}