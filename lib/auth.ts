import { createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

const envSchema = z
  .object({
    PASSWORD_GATE_DISABLED: z.enum(['true', 'false']).optional().default('false'),
    APP_PASSWORD: z.string().min(8).optional(),
  })
  .superRefine((env, ctx) => {
    if (env.PASSWORD_GATE_DISABLED === 'true') return;
    if (!env.APP_PASSWORD) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['APP_PASSWORD'],
        message: 'APP_PASSWORD required',
      });
    }
  });

export interface AuthEnv {
  passwordGateDisabled: boolean;
  appPassword?: string;
}

export function loadAuthEnv(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): AuthEnv {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid auth env: ${issues}`);
  }
  return {
    passwordGateDisabled: parsed.data.PASSWORD_GATE_DISABLED === 'true',
    appPassword: parsed.data.APP_PASSWORD,
  };
}

function digest(s: string): Buffer {
  return createHash('sha256').update(s).digest();
}

export function safeCompare(a: string, b: string): boolean {
  return timingSafeEqual(digest(a), digest(b));
}
