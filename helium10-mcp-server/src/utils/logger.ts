/**
 * logger.ts
 * 
 * Konfiguriert und initialisiert den Winston-Logger für die Anwendung.
 * Bietet zentralisiertes Logging für alle Komponenten.
 */

import winston from 'winston';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Lade Umgebungsvariablen
dotenv.config();

// Konfigurationsvariablen
const logLevel = process.env.LOG_LEVEL || 'info';
const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');

// Stelle sicher, dass das Log-Verzeichnis existiert
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Definiere Farben für Konsolenausgabe
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Füge Farben zu Winston hinzu
winston.addColors(colors);

// Erstelle ein benutzerdefiniertes Format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    
    // Füge Stack-Trace für Fehler hinzu
    const stack = meta.stack ? `\n${meta.stack}` : '';
    
    // Formatiere zusätzliche Metadaten
    const metaStr = Object.keys(meta).length && !meta.stack
      ? `\n${JSON.stringify(meta, null, 2)}`
      : '';
    
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${stack}${metaStr}`;
  })
);

// Erstelle einen Konsolen-Formatter mit Farben
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  format
);

// Erstelle den Winston-Logger
export const logger = winston.createLogger({
  level: logLevel,
  levels: winston.config.npm.levels,
  format,
  transports: [
    // Datei für alle Logs
    new winston.transports.File({
      filename: path.join(logDir, 'mcp.log'),
      maxsize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 5,
      tailable: true,
    }),
    
    // Separate Datei für Fehler
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 5,
      tailable: true,
    }),
    
    // Konsolenausgabe
    new winston.transports.Console({
      format: consoleFormat,
      stderrLevels: ['error'],
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logDir, 'exceptions.log'),
      maxsize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 5,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logDir, 'rejections.log'),
      maxsize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 5,
    }),
  ],
  exitOnError: false,
});

/**
 * Stream für Express-Logging-Middleware
 */
export const logStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Exportiere den Logger
export default logger; 