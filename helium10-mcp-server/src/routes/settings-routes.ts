/**
 * settings-routes.ts
 * 
 * Definiert Express-Routen für die Verwaltung von Systemeinstellungen.
 * Stellt Endpunkte zum Abrufen und Aktualisieren von Einstellungen bereit.
 */

import express from 'express';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs';

// Router erstellen
const router = express.Router();

// Standardeinstellungen
const defaultSettings = {
  system: {
    logLevel: 'info',
    maxConcurrentJobs: 5,
    enableMetrics: true
  },
  database: {
    backupEnabled: true,
    backupInterval: 24, // Stunden
    maxBackups: 7
  },
  api: {
    rateLimit: 100, // Anfragen pro Minute
    timeout: 30000 // 30 Sekunden
  },
  security: {
    requireApprovalByDefault: true,
    defaultArtifactExpiration: 30 // Tage
  }
};

// Pfad zur Einstellungsdatei
const settingsFilePath = path.join(process.cwd(), 'data', 'settings.json');

/**
 * Lädt die aktuellen Einstellungen
 */
async function loadSettings() {
  try {
    // Erstelle Datenverzeichnis, falls es nicht existiert
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Prüfe, ob die Einstellungsdatei existiert
    if (!fs.existsSync(settingsFilePath)) {
      // Erstelle Standardeinstellungen
      await fs.promises.writeFile(
        settingsFilePath, 
        JSON.stringify(defaultSettings, null, 2),
        'utf-8'
      );
      return defaultSettings;
    }
    
    // Lade Einstellungen aus Datei
    const settingsData = await fs.promises.readFile(settingsFilePath, 'utf-8');
    return JSON.parse(settingsData);
  } catch (error) {
    logger.error(`Fehler beim Laden der Einstellungen: ${error.message}`, error);
    return defaultSettings;
  }
}

/**
 * Speichert die Einstellungen
 */
async function saveSettings(settings) {
  try {
    await fs.promises.writeFile(
      settingsFilePath, 
      JSON.stringify(settings, null, 2),
      'utf-8'
    );
    return true;
  } catch (error) {
    logger.error(`Fehler beim Speichern der Einstellungen: ${error.message}`, error);
    return false;
  }
}

/**
 * GET /settings
 * Ruft alle Systemeinstellungen ab
 */
router.get('/', async (req, res) => {
  try {
    const settings = await loadSettings();
    
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    logger.error(`Fehler beim Abrufen der Einstellungen: ${error.message}`, error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Einstellungen',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /settings
 * Aktualisiert Systemeinstellungen
 */
router.put('/', async (req, res) => {
  try {
    const newSettings = req.body;
    
    if (!newSettings) {
      return res.status(400).json({
        success: false,
        message: 'Keine Einstellungen angegeben'
      });
    }
    
    // Lade aktuelle Einstellungen
    const currentSettings = await loadSettings();
    
    // Aktualisiere Einstellungen (flaches Merge)
    const updatedSettings = {
      ...currentSettings,
      ...newSettings
    };
    
    // Speichere aktualisierte Einstellungen
    const saved = await saveSettings(updatedSettings);
    
    if (!saved) {
      return res.status(500).json({
        success: false,
        message: 'Fehler beim Speichern der Einstellungen'
      });
    }
    
    res.json({
      success: true,
      settings: updatedSettings
    });
  } catch (error) {
    logger.error(`Fehler beim Aktualisieren der Einstellungen: ${error.message}`, error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Einstellungen',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /settings/reset
 * Setzt Einstellungen auf Standardwerte zurück
 */
router.get('/reset', async (req, res) => {
  try {
    // Speichere Standardeinstellungen
    const saved = await saveSettings(defaultSettings);
    
    if (!saved) {
      return res.status(500).json({
        success: false,
        message: 'Fehler beim Zurücksetzen der Einstellungen'
      });
    }
    
    res.json({
      success: true,
      settings: defaultSettings,
      message: 'Einstellungen wurden auf Standardwerte zurückgesetzt'
    });
  } catch (error) {
    logger.error(`Fehler beim Zurücksetzen der Einstellungen: ${error.message}`, error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Zurücksetzen der Einstellungen',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Exportiere den Router
export default router; 