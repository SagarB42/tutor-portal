import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    OPENAI_API_KEY: z.string().min(1).optional(),
    // Resend (transactional email).
    // Until a custom domain is verified `EMAIL_FROM_FALLBACK` is used as the
    // From address. Resend's sandbox `onboarding@resend.dev` only delivers to
    // the email the Resend account was created with, which is fine for dev.
    RESEND_API_KEY: z.string().min(1).optional(),
    EMAIL_FROM_FALLBACK: z.string().min(1).default("onboarding@resend.dev"),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM_FALLBACK: process.env.EMAIL_FROM_FALLBACK,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});

