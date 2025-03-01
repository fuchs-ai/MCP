/**
 * artifact-routes.ts
 * 
 * Definiert Express-Routen für Artefakte.
 * Ermöglicht das Erstellen, Lesen, Aktualisieren und Löschen von Tool- und Workflow-Artefakten.
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

// Router erstellen
const router = express.Router();

// In-Memory-Speicher für Artefakte (später durch Datenbankzugriff ersetzen)
let artifacts: Array<{
  id: string;
  name: string;
  type: 'tool' | 'workflow';
  description?: string;
  status: 'active' | 'inactive';
  configuration: any;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
  currentUsage: number;
  maxUsage?: number;
  tags?: string[];
}> = [];

/**
 * Validiert ein Artefakt-Objekt
 */
function validateArtifact(artifact: any, isUpdate = false): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  
  // Prüfe, ob das Artefakt-Objekt vorhanden ist
  if (!artifact) {
    return {
      isValid: false,
      errors: { 'general': 'Keine Artefakt-Daten angegeben' }
    };
  }
  
  // Validiere Name
  if (!isUpdate || artifact.name !== undefined) {
    if (!artifact.name) {
      errors.name = 'Name ist erforderlich';
    } else if (typeof artifact.name !== 'string') {
      errors.name = 'Name muss ein String sein';
    } else if (artifact.name.length < 3) {
      errors.name = 'Name muss mindestens 3 Zeichen lang sein';
    } else if (artifact.name.length > 100) {
      errors.name = 'Name darf maximal 100 Zeichen lang sein';
    }
  }
  
  // Validiere Typ
  if (!isUpdate || artifact.type !== undefined) {
    if (!artifact.type) {
      errors.type = 'Typ ist erforderlich';
    } else if (artifact.type !== 'tool' && artifact.type !== 'workflow') {
      errors.type = 'Typ muss entweder "tool" oder "workflow" sein';
    }
  }
  
  // Validiere Status
  if (!isUpdate || artifact.status !== undefined) {
    if (!artifact.status) {
      errors.status = 'Status ist erforderlich';
    } else if (artifact.status !== 'active' && artifact.status !== 'inactive') {
      errors.status = 'Status muss entweder "active" oder "inactive" sein';
    }
  }
  
  // Validiere Konfiguration
  if (!isUpdate || artifact.configuration !== undefined) {
    if (!artifact.configuration) {
      errors.configuration = 'Konfiguration ist erforderlich';
    } else if (typeof artifact.configuration !== 'object') {
      errors.configuration = 'Konfiguration muss ein Objekt sein';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// Initialisiert einige Beispiel-Artefakte
function initSampleArtifacts() {
  if (artifacts.length === 0) {
    artifacts = [
      {
        id: uuidv4(),
        name: 'Text-Analyse',
        type: 'tool',
        description: 'Ein Tool zur Analyse von Texten mittels NLP',
        status: 'active',
        configuration: {
          apiKey: 'sample-api-key',
          model: 'gpt-3.5-turbo',
          options: {
            temperature: 0.7,
            maxTokens: 1000
          }
        },
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 Tage alt
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 Tage alt
        currentUsage: 28,
        maxUsage: 100,
        tags: ['nlp', 'analyse', 'text']
      },
      {
        id: uuidv4(),
        name: 'Daten-Extraktion',
        type: 'tool',
        description: 'Tool zum Extrahieren strukturierter Daten aus Dokumenten',
        status: 'active',
        configuration: {
          parser: 'advanced',
          formats: ['pdf', 'docx', 'html'],
          options: {
            ocr: true,
            tableDetection: true
          }
        },
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 Tage alt
        updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 Tage alt
        currentUsage: 15,
        maxUsage: 50,
        tags: ['extraktion', 'dokumente', 'parser']
      },
      {
        id: uuidv4(),
        name: 'Datenverarbeitung',
        type: 'workflow',
        description: 'Workflow zur Verarbeitung von extrahierten Daten',
        status: 'active',
        configuration: {
          steps: [
            {
              name: 'Extraktion',
              toolId: 'data-extraction',
              params: { format: 'pdf' }
            },
            {
              name: 'Transformation',
              toolId: 'data-transform',
              params: { output: 'json' }
            },
            {
              name: 'Analyse',
              toolId: 'text-analysis',
              params: { depth: 'detailed' }
            }
          ],
          errorHandling: {
            onError: 'stop',
            retryCount: 3
          }
        },
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 Tage alt
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 Tag alt
        currentUsage: 7,
        tags: ['workflow', 'daten', 'verarbeitung']
      },
      {
        id: uuidv4(),
        name: 'E-Mail-Benachrichtigung',
        type: 'tool',
        description: 'Tool zum Versenden von E-Mail-Benachrichtigungen',
        status: 'inactive',
        configuration: {
          smtpServer: 'smtp.example.com',
          port: 587,
          secure: true,
          templates: {
            welcome: {
              subject: 'Willkommen bei Helium10',
              body: 'Vielen Dank für die Anmeldung...'
            },
            alert: {
              subject: 'Wichtige Benachrichtigung',
              body: 'Es gibt eine wichtige Aktualisierung...'
            }
          }
        },
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 Tage alt
        updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 Tage alt
        currentUsage: 0,
        maxUsage: 200,
        tags: ['email', 'benachrichtigung']
      }
    ];
  }
}

// Beispiel-Artefakte initialisieren
initSampleArtifacts();

/**
 * GET /artifacts
 * Ruft alle Artefakte ab, mit optionalen Filtern
 */
router.get('/', async (req, res) => {
  try {
    // Filter-Parameter aus der Query extrahieren
    const { type, status, tag, search } = req.query;
    
    // Sortierungs-Parameter
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string)?.toLowerCase() === 'asc' ? 'asc' : 'desc';
    
    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    // Artefakte filtern
    let filteredArtifacts = [...artifacts];
    
    if (type) {
      filteredArtifacts = filteredArtifacts.filter(a => a.type === type);
    }
    
    if (status) {
      filteredArtifacts = filteredArtifacts.filter(a => a.status === status);
    }
    
    if (tag) {
      filteredArtifacts = filteredArtifacts.filter(a => a.tags?.includes(tag as string));
    }
    
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      filteredArtifacts = filteredArtifacts.filter(a => 
        a.name.toLowerCase().includes(searchTerm) || 
        a.description?.toLowerCase().includes(searchTerm));
    }
    
    // Artefakte sortieren
    filteredArtifacts.sort((a, b) => {
      if (sortBy === 'name') {
        return sortOrder === 'asc' 
          ? a.name.localeCompare(b.name) 
          : b.name.localeCompare(a.name);
      } else if (sortBy === 'type') {
        return sortOrder === 'asc' 
          ? a.type.localeCompare(b.type) 
          : b.type.localeCompare(a.type);
      } else if (sortBy === 'currentUsage') {
        return sortOrder === 'asc' 
          ? a.currentUsage - b.currentUsage 
          : b.currentUsage - a.currentUsage;
      } else {
        // Standard: nach Erstellungsdatum sortieren
        return sortOrder === 'asc' 
          ? a.createdAt.getTime() - b.createdAt.getTime() 
          : b.createdAt.getTime() - a.createdAt.getTime();
      }
    });
    
    // Pagination anwenden
    const paginatedArtifacts = filteredArtifacts.slice(offset, offset + limit);
    
    // Artefakte zurückgeben
    res.json({
      success: true,
      artifacts: paginatedArtifacts,
      total: filteredArtifacts.length,
      page,
      limit,
      totalPages: Math.ceil(filteredArtifacts.length / limit)
    });
  } catch (error) {
    logger.error(`Fehler beim Abrufen der Artefakte: ${error.message}`, error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Artefakte',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /artifacts/:id
 * Ruft ein bestimmtes Artefakt anhand seiner ID ab
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const artifact = artifacts.find(a => a.id === id);
    
    if (!artifact) {
      return res.status(404).json({
        success: false,
        message: `Artefakt mit ID "${id}" nicht gefunden`
      });
    }
    
    res.json({
      success: true,
      artifact
    });
  } catch (error) {
    logger.error(`Fehler beim Abrufen des Artefakts: ${error.message}`, error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Artefakts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /artifacts
 * Erstellt ein neues Artefakt
 */
router.post('/', async (req, res) => {
  try {
    const artifactData = req.body;
    
    // Validiere die Eingabedaten
    const { isValid, errors } = validateArtifact(artifactData);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Artefakt-Daten',
        errors
      });
    }
    
    // ID und Zeitstempel hinzufügen
    const newArtifact = {
      ...artifactData,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
      currentUsage: 0
    };
    
    // Zum Artefakt-Array hinzufügen
    artifacts.push(newArtifact);
    
    // Aktivität protokollieren
    try {
      await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `Artefakt "${newArtifact.name}" (${newArtifact.type}) erstellt`,
          entityType: 'artifact',
          entityId: newArtifact.id,
          actionType: 'create'
        })
      });
    } catch (activityError) {
      logger.warn(`Fehler beim Protokollieren der Aktivität: ${activityError.message}`);
    }
    
    res.status(201).json({
      success: true,
      artifact: newArtifact
    });
  } catch (error) {
    logger.error(`Fehler beim Erstellen des Artefakts: ${error.message}`, error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Artefakts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /artifacts/:id
 * Aktualisiert ein bestehendes Artefakt
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Prüfe, ob das Artefakt existiert
    const artifactIndex = artifacts.findIndex(a => a.id === id);
    
    if (artifactIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `Artefakt mit ID "${id}" nicht gefunden`
      });
    }
    
    // Validiere die Eingabedaten (ohne ID-Validierung)
    const { isValid, errors } = validateArtifact(updateData, true);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Artefakt-Daten',
        errors
      });
    }
    
    // Aktualisiere das Artefakt
    const updatedArtifact = {
      ...artifacts[artifactIndex],
      ...updateData,
      id: id, // ID kann nicht geändert werden
      updatedAt: new Date()
    };
    
    artifacts[artifactIndex] = updatedArtifact;
    
    // Aktivität protokollieren
    try {
      await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `Artefakt "${updatedArtifact.name}" (${updatedArtifact.type}) aktualisiert`,
          entityType: 'artifact',
          entityId: id,
          actionType: 'update'
        })
      });
    } catch (activityError) {
      logger.warn(`Fehler beim Protokollieren der Aktivität: ${activityError.message}`);
    }
    
    res.json({
      success: true,
      artifact: updatedArtifact
    });
  } catch (error) {
    logger.error(`Fehler beim Aktualisieren des Artefakts: ${error.message}`, error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Artefakts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PATCH /artifacts/:id/status
 * Aktualisiert den Status eines Artefakts
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Prüfe, ob das Artefakt existiert
    const artifactIndex = artifacts.findIndex(a => a.id === id);
    
    if (artifactIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `Artefakt mit ID "${id}" nicht gefunden`
      });
    }
    
    // Validiere den Status
    if (status !== 'active' && status !== 'inactive') {
      return res.status(400).json({
        success: false,
        message: 'Ungültiger Status. Erlaubte Werte: "active", "inactive"'
      });
    }
    
    // Aktualisiere den Status
    artifacts[artifactIndex].status = status;
    artifacts[artifactIndex].updatedAt = new Date();
    
    // Aktivität protokollieren
    try {
      await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `Artefakt "${artifacts[artifactIndex].name}" (${artifacts[artifactIndex].type}) Status geändert zu "${status}"`,
          entityType: 'artifact',
          entityId: id,
          actionType: 'update'
        })
      });
    } catch (activityError) {
      logger.warn(`Fehler beim Protokollieren der Aktivität: ${activityError.message}`);
    }
    
    res.json({
      success: true,
      artifact: artifacts[artifactIndex]
    });
  } catch (error) {
    logger.error(`Fehler beim Aktualisieren des Artefakt-Status: ${error.message}`, error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Artefakt-Status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /artifacts/:id
 * Löscht ein Artefakt
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prüfe, ob das Artefakt existiert
    const artifactIndex = artifacts.findIndex(a => a.id === id);
    
    if (artifactIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `Artefakt mit ID "${id}" nicht gefunden`
      });
    }
    
    // Artefaktdaten speichern bevor sie gelöscht werden
    const artifactName = artifacts[artifactIndex].name;
    const artifactType = artifacts[artifactIndex].type;
    
    // Artefakt löschen
    artifacts.splice(artifactIndex, 1);
    
    // Aktivität protokollieren
    try {
      await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `Artefakt "${artifactName}" (${artifactType}) gelöscht`,
          entityType: 'artifact',
          entityId: id,
          actionType: 'delete'
        })
      });
    } catch (activityError) {
      logger.warn(`Fehler beim Protokollieren der Aktivität: ${activityError.message}`);
    }
    
    res.json({
      success: true,
      message: 'Artefakt erfolgreich gelöscht'
    });
  } catch (error) {
    logger.error(`Fehler beim Löschen des Artefakts: ${error.message}`, error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Artefakts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /artifacts/:id/executions
 * Ruft die Ausführungen für ein bestimmtes Artefakt ab
 */
router.get('/:id/executions', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prüfe, ob das Artefakt existiert
    const artifact = artifacts.find(a => a.id === id);
    
    if (!artifact) {
      return res.status(404).json({
        success: false,
        message: `Artefakt mit ID "${id}" nicht gefunden`
      });
    }
    
    // Hier würden normalerweise die Ausführungen aus der Datenbank abgerufen werden
    // Für diese Demo senden wir leere Beispieldaten zurück
    res.json({
      success: true,
      executions: [],
      total: 0
    });
  } catch (error) {
    logger.error(`Fehler beim Abrufen der Artefakt-Ausführungen: ${error.message}`, error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Artefakt-Ausführungen',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /artifacts/:id/execute
 * Führt ein Artefakt aus
 */
router.post('/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const executionParams = req.body;
    
    // Prüfe, ob das Artefakt existiert
    const artifactIndex = artifacts.findIndex(a => a.id === id);
    
    if (artifactIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `Artefakt mit ID "${id}" nicht gefunden`
      });
    }
    
    const artifact = artifacts[artifactIndex];
    
    // Prüfe, ob das Artefakt aktiv ist
    if (artifact.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Artefakt ist nicht aktiv'
      });
    }
    
    // Prüfe, ob das Nutzungslimit erreicht ist
    if (artifact.maxUsage !== undefined && artifact.currentUsage >= artifact.maxUsage) {
      return res.status(400).json({
        success: false,
        message: 'Nutzungslimit für dieses Artefakt erreicht'
      });
    }
    
    // Inkrementiere die Nutzungszahl
    artifact.currentUsage += 1;
    artifacts[artifactIndex] = artifact;
    
    // Hier würde die eigentliche Ausführung stattfinden
    // Für diese Demo simulieren wir eine erfolgreiche Ausführung
    
    // Aktivität protokollieren
    try {
      await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `Artefakt "${artifact.name}" (${artifact.type}) ausgeführt`,
          entityType: 'artifact',
          entityId: id,
          actionType: 'execute'
        })
      });
    } catch (activityError) {
      logger.warn(`Fehler beim Protokollieren der Aktivität: ${activityError.message}`);
    }
    
    // Simuliere eine Verzögerung für asynchrone Verarbeitung
    await new Promise(resolve => setTimeout(resolve, 500));
    
    res.json({
      success: true,
      execution: {
        id: uuidv4(),
        artifactId: id,
        status: 'success',
        startTime: new Date(),
        endTime: new Date(),
        executionTime: 500, // Millisekunden
        params: executionParams,
        result: {
          message: 'Artefakt erfolgreich ausgeführt'
        }
      }
    });
  } catch (error) {
    logger.error(`Fehler bei der Artefakt-Ausführung: ${error.message}`, error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Artefakt-Ausführung',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Exportiere den Router
export default router; 