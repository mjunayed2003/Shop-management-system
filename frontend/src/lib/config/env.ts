/**
 * Client and Server Environment Configuration
 */
export const ENV = {
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'Shop POS - দোকান ব্যবস্থাপনা',
  DEFAULT_LOCALE: (process.env.NEXT_PUBLIC_DEFAULT_LOCALE || 'bn') as 'bn' | 'en',
  ENABLE_BFF_PROXY: process.env.NEXT_PUBLIC_ENABLE_BFF_PROXY !== 'false',
  IS_PROD: process.env.NODE_ENV === 'production',
} as const;
