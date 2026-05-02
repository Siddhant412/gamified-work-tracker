import { z } from 'zod';

const publicEnvSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.string().url().optional().or(z.literal('')),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20).optional().or(z.literal('')),
  EXPO_PUBLIC_APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  EXPO_PUBLIC_FORCE_DEMO_MODE: z.enum(['1', 'true']).optional().or(z.literal('')),
});

const parsed = publicEnvSchema.safeParse({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
  EXPO_PUBLIC_FORCE_DEMO_MODE: process.env.EXPO_PUBLIC_FORCE_DEMO_MODE,
});

if (!parsed.success) {
  throw new Error(`Invalid public environment: ${parsed.error.message}`);
}

export const env = {
  supabaseUrl: parsed.data.EXPO_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: parsed.data.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  appEnv: parsed.data.EXPO_PUBLIC_APP_ENV,
  forceDemoMode: parsed.data.EXPO_PUBLIC_FORCE_DEMO_MODE === '1' || parsed.data.EXPO_PUBLIC_FORCE_DEMO_MODE === 'true',
};

export const isSupabaseConfigured = Boolean(!env.forceDemoMode && env.supabaseUrl && env.supabaseAnonKey);
