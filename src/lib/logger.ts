/**
 * Development Logger
 * Only logs in development mode. Production builds will not include these logs.
 */

const isDev = import.meta.env.DEV;

export const logger = {
  /**
   * Log AI request/response details (only in development)
   */
  ai: (functionName: string, data: {
    prompt?: string;
    systemPrompt?: string;
    userPrompt?: string;
    request?: unknown;
    response?: unknown;
    error?: unknown;
  }) => {
    if (!isDev) return;

    console.group(`🤖 [${functionName}]`);

    if (data.systemPrompt) {
      console.log('📝 System Prompt:');
      console.log(data.systemPrompt);
    }

    if (data.userPrompt) {
      console.log('💬 User Prompt:', data.userPrompt);
    }

    if (data.request) {
      console.log('📤 Request:', data.request);
    }

    if (data.response) {
      console.log('📥 Response:', data.response);
    }

    if (data.error) {
      console.error('❌ Error:', data.error);
    }

    console.groupEnd();
  },

  /**
   * Debug log (only in development)
   */
  debug: (message: string, ...args: unknown[]) => {
    if (!isDev) return;
    console.log(`🔍 ${message}`, ...args);
  },

  /**
   * Info log (only in development)
   */
  info: (message: string, ...args: unknown[]) => {
    if (!isDev) return;
    console.info(`ℹ️ ${message}`, ...args);
  },

  /**
   * Error log (always logs - even in production)
   */
  error: (message: string, error?: unknown) => {
    console.error(`❌ ${message}`, error);
  },
};
