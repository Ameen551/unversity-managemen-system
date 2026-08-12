import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== '' ? value : fallback;
}

export const env = {
  port: parseInt(optional('PORT', '5000'), 10),
  clientOrigin: optional('CLIENT_ORIGIN', 'http://localhost:5173'),
  databaseUrl: required('DATABASE_URL'),
  jwtAccessSecret: required('JWT_ACCESS_SECRET'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET'),
  jwtAccessExpires: optional('JWT_ACCESS_EXPIRES', '15m'),
  jwtRefreshExpires: optional('JWT_REFRESH_EXPIRES', '7d'),
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD,
  seedTeacherPassword: process.env.SEED_TEACHER_PASSWORD,
  uploadDir: optional('UPLOAD_DIR', 'uploads'),
};

export const ROLES = {
  ADMIN: 'ADMIN',
  HOD: 'HOD',
  TEACHER: 'TEACHER',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export function isAdminRole(role: string): boolean {
  return role === ROLES.ADMIN || role === ROLES.HOD;
}

export const ASSESSMENT_TYPES = {
  MID_TERM: 'MID_TERM',
  FINAL_TERM: 'FINAL_TERM',
} as const;

export const ATTENDANCE_STATUS = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  LEAVE: 'LEAVE',
} as const;
