/**
 * stats-routes.ts
 * 
 * Definiert Express-Routen für Systemstatistiken.
 * Stellt Endpunkte für Systemstatistiken und Leistungsmetriken bereit.
 */

import express from 'express';
import { logger } from '../utils/logger';
import os from 'os';

// Router erstellen
const router = express.Router();

// Server-Startzeit für Uptime-Berechnung
const SERVER_START_TIME = Date.now();

/**
 * Formatiert die Uptime in Tage, Stunden, Minuten und Sekunden
 */
function formatUptime(uptimeMs: number): string {
  const seconds = Math.floor(uptimeMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const remainingHours = hours % 24;
  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;

  return `${days}d ${remainingHours}h ${remainingMinutes}m ${remainingSeconds}s`;
}

/**
 * Formatiert Byte-Größen in lesbare Einheiten
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * GET /stats/system
 * Liefert Systemstatistiken über den Server und die Umgebung
 */
router.get('/system', async (req, res) => {
  try {
    // Aktuelle Uptime berechnen
    const uptime = Date.now() - SERVER_START_TIME;
    
    // CPU-Informationen
    const cpus = os.cpus();
    const cpuCount = cpus.length;
    const cpuModel = cpus[0]?.model || 'Unbekannt';
    
    // Speicher-Informationen
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = (usedMemory / totalMemory * 100).toFixed(1);
    
    // Prozess-Speichernutzung
    const processMemory = process.memoryUsage();
    
    // Statistiken erstellen
    const stats = {
      timestamp: new Date().toISOString(),
      server: {
        running: true,
        version: process.env.npm_package_version || '1.0.0',
        uptime: uptime,
        uptimeFormatted: formatUptime(uptime),
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        cpuModel: cpuModel,
        cpuCount: cpuCount,
        totalMemory: formatBytes(totalMemory),
        freeMemory: formatBytes(freeMemory),
        memoryUsagePercent: memoryUsagePercent
      },
      process: {
        pid: process.pid,
        cpuUsage: process.cpuUsage(),
        memoryUsage: processMemory,
        memoryUsageFormatted: {
          rss: formatBytes(processMemory.rss),
          heapTotal: formatBytes(processMemory.heapTotal),
          heapUsed: formatBytes(processMemory.heapUsed),
          external: formatBytes(processMemory.external)
        },
        uptime: process.uptime()
      }
    };
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error(`Fehler beim Abrufen der Systemstatistiken: ${error.message}`, error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Systemstatistiken',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /stats/artifacts
 * Liefert statistische Informationen über Artefakte
 */
router.get('/artifacts', async (req, res) => {
  try {
    // Hier würden wir normalerweise Statistiken aus der Datenbank laden
    // Beispieldaten
    const stats = {
      total: 0,
      byType: {
        tool: 0,
        workflow: 0
      },
      byStatus: {
        active: 0,
        inactive: 0
      },
      mostUsed: []
    };
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error(`Fehler beim Abrufen der Artefakt-Statistiken: ${error.message}`, error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Artefakt-Statistiken',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /stats/workflows
 * Liefert statistische Informationen über Workflows
 */
router.get('/workflows', async (req, res) => {
  try {
    // Hier würden wir normalerweise Statistiken aus der Datenbank laden
    // Beispieldaten
    const stats = {
      total: 0,
      byStatus: {
        active: 0,
        inactive: 0
      },
      mostExecuted: [],
      recentExecutions: []
    };
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error(`Fehler beim Abrufen der Workflow-Statistiken: ${error.message}`, error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Workflow-Statistiken',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Exportiere den Router
export default router; 