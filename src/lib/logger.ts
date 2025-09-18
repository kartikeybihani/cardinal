// Logger utility for both local development and Vercel production
export function log(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  if (data) {
    console.log(logMessage, data);
  } else {
    console.log(logMessage);
  }
}

export function logError(message: string, error?: any) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ERROR: ${message}`;
  
  if (error) {
    console.error(logMessage, error);
  } else {
    console.error(logMessage);
  }
}

// For Vercel, also try to use their logging if available
export function logVercel(message: string, data?: any) {
  // This will work in Vercel's serverless environment
  log(message, data);
  
  // Try to use Vercel's logging if available
  if (typeof process !== 'undefined' && process.env.VERCEL) {
    // In Vercel, console.log goes to their logs
    console.log(`[VERCEL] ${message}`, data || '');
  }
}
