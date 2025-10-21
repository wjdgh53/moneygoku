/**
 * Environment Variable Validation with Zod
 *
 * This file validates all required environment variables on application startup.
 * If any required variable is missing or invalid, the app will fail fast with a clear error.
 */

import { z } from 'zod';

/**
 * Environment variable schema
 */
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Alpha Vantage API
  ALPHA_VANTAGE_API_KEY: z.string().min(1, 'ALPHA_VANTAGE_API_KEY is required').optional(),
  ALPHA_VANTAGE_KEY: z.string().min(1, 'ALPHA_VANTAGE_KEY is required').optional(),

  // Alpaca Trading API (Paper Trading)
  ALPACA_API_KEY: z.string().min(1, 'ALPACA_API_KEY is required'),
  ALPACA_SECRET_KEY: z.string().min(1, 'ALPACA_SECRET_KEY is required'),
  ALPACA_BASE_URL: z.string().url('ALPACA_BASE_URL must be a valid URL'),

  // OpenAI API
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  OPENAI_MODEL: z.string().min(1, 'OPENAI_MODEL is required').default('gpt-4o-mini'),

  // FMP (Financial Modeling Prep)
  FMP_API_KEY: z.string().min(1, 'FMP_API_KEY is required'),

  // Next.js (Public)
  NEXT_PUBLIC_APP_NAME: z.string().default('StockHero Clone'),
  NEXT_PUBLIC_APP_VERSION: z.string().default('1.0.0'),

  // Optional: NextAuth
  NEXTAUTH_SECRET: z.string().optional(),
  NEXTAUTH_URL: z.string().url().optional(),

  // Optional: LangSmith Tracing
  LANGSMITH_TRACING: z.string().optional(),
  LANGSMITH_ENDPOINT: z.string().url().optional(),
  LANGSMITH_API_KEY: z.string().optional(),
  LANGSMITH_PROJECT: z.string().optional(),

  // Optional: Other APIs
  TAVILY_API_KEY: z.string().optional(),
  HUGGINGFACE_API_KEY: z.string().optional(),

  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

/**
 * Validate and parse environment variables
 */
function validateEnv() {
  try {
    // Handle Alpha Vantage key (can be either ALPHA_VANTAGE_API_KEY or ALPHA_VANTAGE_KEY)
    const alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY || process.env.ALPHA_VANTAGE_KEY;

    const parsed = envSchema.parse({
      ...process.env,
      ALPHA_VANTAGE_KEY: alphaVantageKey,
    });

    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
        .join('\n');

      throw new Error(
        `❌ Environment variable validation failed:\n\n${missingVars}\n\n` +
        `Please check your .env.local file and ensure all required variables are set.\n` +
        `See .env.sample for reference.`
      );
    }
    throw error;
  }
}

/**
 * Validated environment variables (typed)
 */
export const env = validateEnv();

/**
 * Type-safe environment variables
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Helper: Check if running in production
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Helper: Check if running in development
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Helper: Check if running in test mode
 */
export const isTest = env.NODE_ENV === 'test';

/**
 * Helper: Get Alpha Vantage API key (handles both naming conventions)
 */
export const getAlphaVantageKey = () => {
  return process.env.ALPHA_VANTAGE_API_KEY || process.env.ALPHA_VANTAGE_KEY || '';
};
