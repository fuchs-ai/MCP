import { getConfig } from './config.js';

// Definiere Log-Level Typen und ihre numerischen Werte
type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
const LOG_LEVELS: Record<LogLevel, number> = {
  'DEBUG': 0,
  'INFO': 1,
  'WARN': 2,
  'ERROR': 3
};

/**
 * Formatiert einen Zeitstempel für Log-Einträge
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Prüft, ob ein Log-Level basierend auf der aktuellen Konfiguration geloggt werden soll
 */
function shouldLog(level: LogLevel): boolean {
  const config = getConfig();
  return LOG_LEVELS[level] >= LOG_LEVELS[config.logLevel];
}

/**
 * Formatiert eine Log-Nachricht
 */
function formatLogMessage(level: LogLevel, message: string, context?: Record<string, any>): string {
  const timestamp = getTimestamp();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level}] ${message}${contextStr}`;
}

/**
 * Logger-Objekt mit Methoden für verschiedene Log-Level
 */
export const logger = {
  debug(message: string, context?: Record<string, any>): void {
    if (shouldLog('DEBUG')) {
      console.log(formatLogMessage('DEBUG', message, context));
    }
  },
  
  info(message: string, context?: Record<string, any>): void {
    if (shouldLog('INFO')) {
      console.log(formatLogMessage('INFO', message, context));
    }
  },
  
  warn(message: string, context?: Record<string, any>): void {
    if (shouldLog('WARN')) {
      console.warn(formatLogMessage('WARN', message, context));
    }
  },
  
  error(message: string, error?: Error, context?: Record<string, any>): void {
    if (shouldLog('ERROR')) {
      const errorContext = {
        ...(context || {}),
        ...(error ? {
          error: error.message,
          stack: error.stack
        } : {})
      };
      console.error(formatLogMessage('ERROR', message, errorContext));
    }
  }
};
