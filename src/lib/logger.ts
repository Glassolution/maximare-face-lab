
const IS_DEBUG = import.meta.env.VITE_DEBUG_MODE === 'true';

export const logger = {
  log: (tag: string, message: string, ...args: any[]) => {
    if (IS_DEBUG) {
      console.log(`%c${tag}`, 'color: #3b82f6; font-weight: bold;', message, ...args);
    }
  },
  error: (tag: string, message: string, error?: any) => {
    if (IS_DEBUG) {
      console.error(`%c${tag}`, 'color: #ef4444; font-weight: bold;', message, error);
    }
  },
  warn: (tag: string, message: string, ...args: any[]) => {
    if (IS_DEBUG) {
      console.warn(`%c${tag}`, 'color: #f59e0b; font-weight: bold;', message, ...args);
    }
  }
};
