import 'dotenv/config';
import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(3333),
  HOST: z.string().default('0.0.0.0'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  JWT_SECRET: z.string().min(32).default('development-only-change-this-jwt-secret-now'),
  ADMIN_EMAIL: z.string().email().default('m_vilalva@hotmail.com'),
  RESEND_API_KEY: z.string().optional(),
  NOTIFICATION_EMAIL_FROM: z.string().default('MEG Finanças <onboarding@resend.dev>'),
  EVOLUTION_API_URL: z.string().url().optional(),
  EVOLUTION_API_KEY: z.string().optional(),
  EVOLUTION_INSTANCE: z.string().optional(),
  WHATSAPP_RECIPIENT: z.string().optional(),
  NOTIFICATION_CRON_SECRET: z.string().min(24).optional()
});

const parsed = environmentSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid API environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const values = parsed.data;

if (values.NODE_ENV === 'production' && values.JWT_SECRET.includes('development-only')) {
  console.error('JWT_SECRET must be configured in production.');
  process.exit(1);
}

export const config = {
  nodeEnv: values.NODE_ENV,
  port: values.PORT,
  host: values.HOST,
  logLevel: values.LOG_LEVEL,
  jwtSecret: values.JWT_SECRET,
  adminEmail: values.ADMIN_EMAIL,
  resendApiKey: values.RESEND_API_KEY,
  notificationEmailFrom: values.NOTIFICATION_EMAIL_FROM,
  evolutionApiUrl: values.EVOLUTION_API_URL,
  evolutionApiKey: values.EVOLUTION_API_KEY,
  evolutionInstance: values.EVOLUTION_INSTANCE,
  whatsappRecipient: values.WHATSAPP_RECIPIENT,
  notificationCronSecret: values.NOTIFICATION_CRON_SECRET,
  corsOrigins: values.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  isProduction: values.NODE_ENV === 'production'
} as const;
