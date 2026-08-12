import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

const DEPARTMENTS = [
  { name: 'Pharm-D', code: 'PHARM', description: 'Doctor of Pharmacy' },
  { name: 'BS Nursing', code: 'NURSING', description: 'Bachelor of Science in Nursing' },
  { name: 'DPT', code: 'DPT', description: 'Doctor of Physical Therapy' },
  { name: 'BS Psychology', code: 'PSYCH', description: 'Bachelor of Science in Psychology' },
  { name: 'BS English', code: 'ENGLISH', description: 'Bachelor of Science in English' },
  { name: 'BS IT', code: 'BSIT', description: 'Bachelor of Science in Information Technology' },
  { name: 'BS (Editable)', code: 'BSGEN', description: 'Bachelor of Science (general program)' },
  { name: 'LHW', code: 'LHW', description: 'Lady Health Worker Program' },
  { name: 'Department 9', code: 'DEPT9', description: 'Configure from Admin Panel' },
  { name: 'Department 10', code: 'DEPT10', description: 'Configure from Admin Panel' },
  { name: 'Department 11', code: 'DEPT11', description: 'Configure from Admin Panel' },
];

const SESSIONS = [
  { label: '2020 - 2024', startYear: 2020, endYear: 2024 },
  { label: '2024 - 2028', startYear: 2024, endYear: 2028 },
  { label: '2028 - 2032', startYear: 2028, endYear: 2032 },
  { label: '2032 - 2036', startYear: 2032, endYear: 2036 },
  { label: '2036 - 2040', startYear: 2036, endYear: 2040 },
];

const DEFAULT_SEMESTERS = 10;

function randomPassword(): string {
  return crypto.randomBytes(8).toString('base64url');
}

async function main(): Promise<void> {
  console.log('Seeding University Portal database...');

  // Departments
  for (let i = 0; i < DEPARTMENTS.length; i++) {
    const d = DEPARTMENTS[i];
    await prisma.department.upsert({
      where: { code: d.code },
      update: { name: d.name, description: d.description },
      create: { name: d.name, code: d.code, description: d.description, sortOrder: i },
    });
  }
  console.log(`[seed] ${DEPARTMENTS.length} departments ready`);

  // Sessions
  for (const s of SESSIONS) {
    await prisma.session.upsert({
      where: { label: s.label },
      update: { startYear: s.startYear, endYear: s.endYear },
      create: s,
    });
  }
  console.log(`[seed] ${SESSIONS.length} sessions ready`);

  // Semesters 1..N for every department
  const departments = await prisma.department.findMany();
  for (const dep of departments) {
    for (let n = 1; n <= DEFAULT_SEMESTERS; n++) {
      await prisma.semester.upsert({
        where: { departmentId_number: { departmentId: dep.id, number: n } },
        update: {},
        create: { name: `Semester ${n}`, number: n, departmentId: dep.id },
      });
    }
  }
  console.log(`[seed] semesters ready for ${departments.length} departments`);

  // Assessment configs (editable marking structures)
  const defaults = [
    { assessmentType: 'MID_TERM', label: 'Mid Term', defaultTotal: 40, allowedTotals: [40, 50, 60, 80, 100] },
    { assessmentType: 'FINAL_TERM', label: 'Final Term', defaultTotal: 60, allowedTotals: [50, 60, 100, 200, 500] },
  ];
  for (const cfg of defaults) {
    const existing = await prisma.assessmentConfig.findFirst({ where: { assessmentType: cfg.assessmentType } });
    if (!existing) {
      await prisma.assessmentConfig.create({
        data: { ...cfg, allowedTotals: JSON.stringify(cfg.allowedTotals) },
      });
    }
  }
  console.log('[seed] assessment configs ready');

  // Demo accounts
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || randomPassword();
  const teacherPassword = process.env.SEED_TEACHER_PASSWORD || randomPassword();

  const adminHash = await bcrypt.hash(adminPassword, 10);
  const teacherHash = await bcrypt.hash(teacherPassword, 10);

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash: adminHash, role: 'ADMIN', isActive: true },
    create: {
      username: 'admin',
      fullName: 'System Administrator',
      role: 'ADMIN',
      passwordHash: adminHash,
    },
  });

  await prisma.user.upsert({
    where: { username: 'teacher' },
    update: { passwordHash: teacherHash, role: 'TEACHER', isActive: true },
    create: {
      username: 'teacher',
      fullName: 'Demo Teacher',
      role: 'TEACHER',
      passwordHash: teacherHash,
    },
  });

  console.log('\n============================================================');
  console.log('  SEED ACCOUNTS  (passwords are generated, not stored in code)');
  console.log('============================================================');
  console.log('  ADMIN LOGIN   ->  username: admin');
  console.log(`                    password: ${adminPassword}`);
  console.log('  TEACHER LOGIN ->  username: teacher');
  console.log(`                    password: ${teacherPassword}`);
  console.log('============================================================');
  console.log('  IMPORTANT: These credentials are printed once. Change the  ');
  console.log('  admin password after login via Profile, or re-run the seed.');
  console.log('  Set SEED_ADMIN_PASSWORD / SEED_TEACHER_PASSWORD in server/.env');
  console.log('  to fix demo passwords for repeat seeding.');
  console.log('============================================================\n');
}

main()
  .catch((e) => {
    console.error('[seed] failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
