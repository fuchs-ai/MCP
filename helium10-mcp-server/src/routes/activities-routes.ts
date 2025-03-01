/**
 * activities-routes.ts
 * 
 * Definiert Express-Routen für Aktivitätsprotokollierung.
 * Stellt Endpunkte zur Verfügung, um Aktivitäten im System zu protokollieren und abzurufen.
 */

import express from 'express';
import { logger } from '../utils/logger';

// Router erstellen
const router = express.Router();

// In-Memory-Speicher für Aktivitäten (später durch Datenbankzugriff ersetzen)
const recentActivities: Array<{
  id: string;
  timestamp: Date;
  description: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  actionType: string;
}> = [];

// Generiert eine zufällige ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Initialisiert einige Beispielaktivitäten
 */
function initSampleActivities() {
  if (recentActivities.length === 0) {
    const now = new Date();
    
    recentActivities.push(
      {
        id: generateId(),
        timestamp: new Date(now.getTime() - 5 * 60000), // 5 Minuten früher
        description: 'Server gestartet',
        actionType: 'system'
      },
      {
        id: generateId(),
        timestamp: new Date(now.getTime() - 4 * 60000), // 4 Minuten früher
        description: 'Tool "Text-Analyse" registriert',
        entityType: 'tool',
        entityId: 'text-analysis',
        actionType: 'create'
      },
      {
        id: generateId(),
        timestamp: new Date(now.getTime() - 3 * 60000), // 3 Minuten früher
        description: 'Workflow "Datenverarbeitung" registriert',
        entityType: 'workflow',
        entityId: 'data-processing',
        actionType: 'create'
      },
      {
        id: generateId(),
        timestamp: new Date(now.getTime() - 2 * 60000), // 2 Minuten früher
        description: 'Workflow "Datenverarbeitung" ausgeführt',
        entityType: 'workflow',
        entityId: 'data-processing',
        actionType: 'execute'
      },
      {
        id: generateId(),
        timestamp: new Date(now.getTime() - 1 * 60000), // 1 Minute früher
        description: 'Einstellungen aktualisiert',
        actionType: 'update'
      }
    );
  }
}

// Beispielaktivitäten initialisieren
initSampleActivities();

/**
 * GET /activities
 * Ruft die letzten Aktivitäten ab
 */
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    
    // Aktivitäten nach Zeitstempel sortieren (neueste zuerst)
    const sortedActivities = [...recentActivities].sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
    
    // Pagination anwenden
    const paginatedActivities = sortedActivities.slice(offset, offset + limit);
    
    res.json({
      success: true,
      activities: paginatedActivities,
      total: recentActivities.length,
      limit,
      offset
    });
  } catch (error) {
    logger.error(`Fehler beim Abrufen der Aktivitäten: ${error.message}`, error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Aktivitäten',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /activities
 * Erstellt eine neue Aktivität
 */
router.post('/', async (req, res) => {
  try {
    const { description, userId, entityType, entityId, actionType } = req.body;
    
    if (!description) {
      return res.status(400).json({
        success: false,
        message: 'Beschreibung ist erforderlich'
      });
    }
    
    if (!actionType) {
      return res.status(400).json({
        success: false,
        message: 'Aktionstyp ist erforderlich'
      });
    }
    
    // Neue Aktivität erstellen
    const activity = {
      id: generateId(),
      timestamp: new Date(),
      description,
      userId,
      entityType,
      entityId,
      actionType
    };
    
    // Zur Liste hinzufügen
    recentActivities.push(activity);
    
    // Nur die letzten 1000 Aktivitäten behalten
    if (recentActivities.length > 1000) {
      recentActivities.shift(); // Ältesten Eintrag entfernen
    }
    
    res.status(201).json({
      success: true,
      activity
    });
  } catch (error) {
    logger.error(`Fehler beim Erstellen der Aktivität: ${error.message}`, error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Aktivität',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /activities/:id
 * Ruft eine bestimmte Aktivität anhand ihrer ID ab
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const activity = recentActivities.find(a => a.id === id);
    
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: `Aktivität mit ID "${id}" nicht gefunden`
      });
    }
    
    res.json({
      success: true,
      activity
    });
  } catch (error) {
    logger.error(`Fehler beim Abrufen der Aktivität: ${error.message}`, error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Aktivität',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Exportiere den Router
export default router; 