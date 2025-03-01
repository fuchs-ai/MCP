/**
 * tool-routes.ts
 * 
 * Definiert Express-Routen für die Tool-Verwaltung.
 * Ermöglicht das Registrieren, Auflisten, Ausführen und Deregistrieren von Tools.
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

// Router erstellen
const router = express.Router();

// In-Memory-Speicher für Tools (später durch Datenbankzugriff ersetzen)
let tools: Array<{
  id: string;
  name: string;
  description?: string;
  version: string;
  category?: string;
  author?: string;
  repository?: string;
  parameters?: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    description?: string;
    required: boolean;
    default?: any;
    options?: string[];
  }>;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  executionCount: number;
  lastExecuted?: Date;
  tags?: string[];
  capabilities?: string[];
}> = [];

/**
 * Validiert ein Tool-Objekt
 */
function validateTool(tool: any, isUpdate = false): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  
  // Prüfe, ob das Tool-Objekt vorhanden ist
  if (!tool) {
    return {
      isValid: false,
      errors: { 'general': 'Keine Tool-Daten angegeben' }
    };
  }
  
  // Validiere Name
  if (!isUpdate || tool.name !== undefined) {
    if (!tool.name) {
      errors.name = 'Name ist erforderlich';
    } else if (typeof tool.name !== 'string') {
      errors.name = 'Name muss ein String sein';
    } else if (tool.name.length < 3) {
      errors.name = 'Name muss mindestens 3 Zeichen lang sein';
    } else if (tool.name.length > 100) {
      errors.name = 'Name darf maximal 100 Zeichen lang sein';
    }
  }
  
  // Validiere Version
  if (!isUpdate || tool.version !== undefined) {
    if (!tool.version) {
      errors.version = 'Version ist erforderlich';
    } else if (typeof tool.version !== 'string') {
      errors.version = 'Version muss ein String sein';
    } else if (!/^\d+\.\d+\.\d+$/.test(tool.version)) {
      errors.version = 'Version muss im Format x.y.z sein';
    }
  }
  
  // Validiere Beschreibung (optional)
  if (tool.description !== undefined && tool.description !== null) {
    if (typeof tool.description !== 'string') {
      errors.description = 'Beschreibung muss ein String sein';
    }
  }
  
  // Validiere Kategorie (optional)
  if (tool.category !== undefined && tool.category !== null) {
    if (typeof tool.category !== 'string') {
      errors.category = 'Kategorie muss ein String sein';
    }
  }
  
  // Validiere Parameter (optional)
  if (tool.parameters !== undefined && tool.parameters !== null) {
    if (!Array.isArray(tool.parameters)) {
      errors.parameters = 'Parameter müssen ein Array sein';
    } else {
      for (let i = 0; i < tool.parameters.length; i++) {
        const param = tool.parameters[i];
        
        if (!param.name) {
          errors[`parameters[${i}].name`] = 'Parameter-Name ist erforderlich';
        }
        
        if (!param.type) {
          errors[`parameters[${i}].type`] = 'Parameter-Typ ist erforderlich';
        } else if (!['string', 'number', 'boolean', 'array', 'object'].includes(param.type)) {
          errors[`parameters[${i}].type`] = 'Parameter-Typ muss einer der folgenden sein: string, number, boolean, array, object';
        }
        
        if (param.required === undefined) {
          errors[`parameters[${i}].required`] = 'Parameter-Erforderlichkeit muss angegeben werden';
        } else if (typeof param.required !== 'boolean') {
          errors[`parameters[${i}].required`] = 'Parameter-Erforderlichkeit muss ein Boolean sein';
        }
      }
    }
  }
  
  // Validiere enabled (nur für Updates, da standardmäßig true)
  if (isUpdate && tool.enabled !== undefined) {
    if (typeof tool.enabled !== 'boolean') {
      errors.enabled = 'Aktiviert-Status muss ein Boolean sein';
    }
  }
  
  // Validiere Tags (optional)
  if (tool.tags !== undefined && tool.tags !== null) {
    if (!Array.isArray(tool.tags)) {
      errors.tags = 'Tags müssen ein Array sein';
    } else {
      for (const tag of tool.tags) {
        if (typeof tag !== 'string') {
          errors.tags = 'Alle Tags müssen Strings sein';
          break;
        }
      }
    }
  }
  
  // Validiere Capabilities (optional)
  if (tool.capabilities !== undefined && tool.capabilities !== null) {
    if (!Array.isArray(tool.capabilities)) {
      errors.capabilities = 'Capabilities müssen ein Array sein';
    } else {
      for (const capability of tool.capabilities) {
        if (typeof capability !== 'string') {
          errors.capabilities = 'Alle Capabilities müssen Strings sein';
          break;
        }
      }
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// Initialisiert einige Beispiel-Tools
function initSampleTools() {
  if (tools.length === 0) {
    tools = [
      {
        id: uuidv4(),
        name: 'Text-Analyse',
        description: 'Analysiert Text mit natürlicher Sprachverarbeitung',
        version: '1.0.0',
        category: 'Textverarbeitung',
        author: 'Helium10',
        parameters: [
          {
            name: 'text',
            type: 'string',
            description: 'Der zu analysierende Text',
            required: true
          },
          {
            name: 'language',
            type: 'string',
            description: 'Die Sprache des Textes (ISO-Code)',
            required: false,
            default: 'de',
            options: ['de', 'en', 'fr', 'es']
          },
          {
            name: 'depth',
            type: 'string',
            description: 'Tiefe der Analyse',
            required: false,
            default: 'standard',
            options: ['basic', 'standard', 'detailed']
          }
        ],
        enabled: true,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 Tage alt
        updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 Tage alt
        executionCount: 245,
        lastExecuted: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 Tage alt
        tags: ['nlp', 'text', 'analyse'],
        capabilities: ['sentiment', 'entities', 'keywords']
      },
      {
        id: uuidv4(),
        name: 'Bild-Analyse',
        description: 'Analysiert Bilder mit Computer Vision',
        version: '1.2.1',
        category: 'Bildverarbeitung',
        author: 'Helium10',
        parameters: [
          {
            name: 'imageUrl',
            type: 'string',
            description: 'URL des zu analysierenden Bildes',
            required: true
          },
          {
            name: 'features',
            type: 'array',
            description: 'Zu erkennende Features',
            required: false,
            default: ['objects'],
            options: ['objects', 'faces', 'labels', 'text', 'colors']
          }
        ],
        enabled: true,
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25 Tage alt
        updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 Tage alt
        executionCount: 132,
        lastExecuted: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 Tage alt
        tags: ['vision', 'bild', 'analyse'],
        capabilities: ['object-detection', 'face-detection', 'ocr']
      },
      {
        id: uuidv4(),
        name: 'E-Mail-Sender',
        description: 'Sendet E-Mails über SMTP',
        version: '2.0.0',
        category: 'Kommunikation',
        author: 'Helium10',
        parameters: [
          {
            name: 'to',
            type: 'string',
            description: 'Empfänger-E-Mail',
            required: true
          },
          {
            name: 'subject',
            type: 'string',
            description: 'Betreff der E-Mail',
            required: true
          },
          {
            name: 'body',
            type: 'string',
            description: 'Inhalt der E-Mail',
            required: true
          },
          {
            name: 'isHtml',
            type: 'boolean',
            description: 'Ob der Inhalt HTML ist',
            required: false,
            default: false
          }
        ],
        enabled: false, // Deaktiviert
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 Tage alt
        updatedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 Tage alt
        executionCount: 523,
        lastExecuted: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), // 21 Tage alt
        tags: ['email', 'kommunikation', 'smtp'],
        capabilities: ['email-sending']
      }
    ];
  }
}

// Beispiel-Tools initialisieren
initSampleTools();

/**
 * GET /tools
 * Ruft alle verfügbaren Tools ab
 */
router.get('/', async (req, res) => {
  try {
    // Filter-Parameter aus der Query extrahieren
    const { category, enabled, search, tags } = req.query;
    
    // Tools filtern
    let filteredTools = [...tools];
    
    if (category) {
      filteredTools = filteredTools.filter(t => t.category === category);
    }
    
    if (enabled !== undefined) {
      const isEnabled = enabled === 'true';
      filteredTools = filteredTools.filter(t => t.enabled === isEnabled);
    }
    
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      filteredTools = filteredTools.filter(t => 
        t.name.toLowerCase().includes(searchTerm) || 
        (t.description && t.description.toLowerCase().includes(searchTerm)));
    }
    
    if (tags) {
      const tagList = (tags as string).split(',');
      filteredTools = filteredTools.filter(t => 
        t.tags && tagList.some(tag => t.tags.includes(tag))
      );
    }
    
    // Sortieren nach Name (Standard)
    filteredTools.sort((a, b) => a.name.localeCompare(b.name));
    
    res.json({
      success: true,
      tools: filteredTools
    });
  } catch (error) {
    logger.error(`Fehler beim Abrufen der Tools: ${error.message}`, error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Tools',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /tools/:id
 * Ruft Details zu einem bestimmten Tool ab
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const tool = tools.find(t => t.id === id);
    
    if (!tool) {
      return res.status(404).json({
        success: false,
        message: `Tool mit ID "${id}" nicht gefunden`
      });
    }
    
    res.json({
      success: true,
      tool
    });
  } catch (error) {
    logger.error(`Fehler beim Abrufen des Tools: ${error.message}`, error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Tools',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /tools
 * Registriert ein neues Tool
 */
router.post('/', async (req, res) => {
  try {
    const toolData = req.body;
    
    // Validiere die Eingabedaten
    const { isValid, errors } = validateTool(toolData);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Tool-Daten',
        errors
      });
    }
    
    // Prüfe, ob ein Tool mit diesem Namen bereits existiert
    const existingTool = tools.find(t => t.name === toolData.name);
    
    if (existingTool) {
      return res.status(409).json({
        success: false,
        message: `Ein Tool mit dem Namen "${toolData.name}" existiert bereits`
      });
    }
    
    // ID und Metadaten hinzufügen
    const newTool = {
      ...toolData,
      id: uuidv4(),
      enabled: toolData.enabled !== false, // Standardmäßig aktiviert
      createdAt: new Date(),
      updatedAt: new Date(),
      executionCount: 0
    };
    
    // Zum Tool-Array hinzufügen
    tools.push(newTool);
    
    // Aktivität protokollieren
    try {
      await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `Tool "${newTool.name}" (v${newTool.version}) registriert`,
          entityType: 'tool',
          entityId: newTool.id,
          actionType: 'create'
        })
      });
    } catch (activityError) {
      logger.warn(`Fehler beim Protokollieren der Aktivität: ${activityError.message}`);
    }
    
    res.status(201).json({
      success: true,
      tool: newTool
    });
  } catch (error) {
    logger.error(`Fehler beim Registrieren des Tools: ${error.message}`, error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Registrieren des Tools',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /tools/:id
 * Aktualisiert ein vorhandenes Tool
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Prüfe, ob das Tool existiert
    const toolIndex = tools.findIndex(t => t.id === id);
    
    if (toolIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `Tool mit ID "${id}" nicht gefunden`
      });
    }
    
    // Validiere die Eingabedaten
    const { isValid, errors } = validateTool(updateData, true);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Tool-Daten',
        errors
      });
    }
    
    // Wenn der Name geändert wird, prüfe auf Duplikate
    if (updateData.name && updateData.name !== tools[toolIndex].name) {
      const existingTool = tools.find(t => t.name === updateData.name && t.id !== id);
      
      if (existingTool) {
        return res.status(409).json({
          success: false,
          message: `Ein Tool mit dem Namen "${updateData.name}" existiert bereits`
        });
      }
    }
    
    // Aktualisiere das Tool
    const updatedTool = {
      ...tools[toolIndex],
      ...updateData,
      id: id, // ID kann nicht geändert werden
      updatedAt: new Date()
    };
    
    tools[toolIndex] = updatedTool;
    
    // Aktivität protokollieren
    try {
      await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `Tool "${updatedTool.name}" (v${updatedTool.version}) aktualisiert`,
          entityType: 'tool',
          entityId: id,
          actionType: 'update'
        })
      });
    } catch (activityError) {
      logger.warn(`Fehler beim Protokollieren der Aktivität: ${activityError.message}`);
    }
    
    res.json({
      success: true,
      tool: updatedTool
    });
  } catch (error) {
    logger.error(`Fehler beim Aktualisieren des Tools: ${error.message}`, error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Tools',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PATCH /tools/:id/enable
 * Aktiviert oder deaktiviert ein Tool
 */
router.patch('/:id/enable', async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    
    // Prüfe, ob das Tool existiert
    const toolIndex = tools.findIndex(t => t.id === id);
    
    if (toolIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `Tool mit ID "${id}" nicht gefunden`
      });
    }
    
    // Validiere den enabled-Status
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Enabled-Status muss ein Boolean sein'
      });
    }
    
    // Aktualisiere den Status
    tools[toolIndex].enabled = enabled;
    tools[toolIndex].updatedAt = new Date();
    
    // Aktivität protokollieren
    try {
      await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `Tool "${tools[toolIndex].name}" ${enabled ? 'aktiviert' : 'deaktiviert'}`,
          entityType: 'tool',
          entityId: id,
          actionType: 'update'
        })
      });
    } catch (activityError) {
      logger.warn(`Fehler beim Protokollieren der Aktivität: ${activityError.message}`);
    }
    
    res.json({
      success: true,
      tool: tools[toolIndex]
    });
  } catch (error) {
    logger.error(`Fehler beim Ändern des Tool-Status: ${error.message}`, error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Ändern des Tool-Status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /tools/:id
 * Deregistriert ein Tool
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prüfe, ob das Tool existiert
    const toolIndex = tools.findIndex(t => t.id === id);
    
    if (toolIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `Tool mit ID "${id}" nicht gefunden`
      });
    }
    
    // Tool-Daten speichern bevor sie gelöscht werden
    const toolName = tools[toolIndex].name;
    const toolVersion = tools[toolIndex].version;
    
    // Tool löschen
    tools.splice(toolIndex, 1);
    
    // Aktivität protokollieren
    try {
      await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `Tool "${toolName}" (v${toolVersion}) deregistriert`,
          entityType: 'tool',
          entityId: id,
          actionType: 'delete'
        })
      });
    } catch (activityError) {
      logger.warn(`Fehler beim Protokollieren der Aktivität: ${activityError.message}`);
    }
    
    res.json({
      success: true,
      message: 'Tool erfolgreich deregistriert'
    });
  } catch (error) {
    logger.error(`Fehler beim Deregistrieren des Tools: ${error.message}`, error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Deregistrieren des Tools',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /tools/:id/execute
 * Führt ein spezifisches Tool aus
 */
router.post('/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const params = req.body;
    
    // Prüfe, ob das Tool existiert
    const toolIndex = tools.findIndex(t => t.id === id);
    
    if (toolIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `Tool mit ID "${id}" nicht gefunden`
      });
    }
    
    const tool = tools[toolIndex];
    
    // Prüfe, ob das Tool aktiviert ist
    if (!tool.enabled) {
      return res.status(400).json({
        success: false,
        message: 'Dieses Tool ist deaktiviert und kann nicht ausgeführt werden'
      });
    }
    
    // Validiere die Parameter
    if (tool.parameters && tool.parameters.length > 0) {
      const missingRequiredParams = tool.parameters
        .filter(p => p.required && (params[p.name] === undefined || params[p.name] === null))
        .map(p => p.name);
      
      if (missingRequiredParams.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Fehlende erforderliche Parameter: ${missingRequiredParams.join(', ')}`
        });
      }
      
      // Typ-Validierung (vereinfacht)
      for (const param of tool.parameters) {
        if (params[param.name] !== undefined && params[param.name] !== null) {
          const value = params[param.name];
          
          if (param.type === 'string' && typeof value !== 'string') {
            return res.status(400).json({
              success: false,
              message: `Parameter "${param.name}" muss ein String sein`
            });
          } else if (param.type === 'number' && typeof value !== 'number') {
            return res.status(400).json({
              success: false,
              message: `Parameter "${param.name}" muss eine Zahl sein`
            });
          } else if (param.type === 'boolean' && typeof value !== 'boolean') {
            return res.status(400).json({
              success: false,
              message: `Parameter "${param.name}" muss ein Boolean sein`
            });
          } else if (param.type === 'array' && !Array.isArray(value)) {
            return res.status(400).json({
              success: false,
              message: `Parameter "${param.name}" muss ein Array sein`
            });
          } else if (param.type === 'object' && (typeof value !== 'object' || Array.isArray(value))) {
            return res.status(400).json({
              success: false,
              message: `Parameter "${param.name}" muss ein Objekt sein`
            });
          }
          
          // Wenn options angegeben sind, prüfe, ob der Wert erlaubt ist
          if (param.options && !param.options.includes(value)) {
            return res.status(400).json({
              success: false,
              message: `Ungültiger Wert für Parameter "${param.name}". Erlaubte Werte: ${param.options.join(', ')}`
            });
          }
        }
      }
    }
    
    // Hier würde die eigentliche Tool-Ausführung stattfinden
    // Für diese Demo simulieren wir eine erfolgreiche Ausführung
    
    // Aktualisiere Tool-Statistiken
    tool.executionCount += 1;
    tool.lastExecuted = new Date();
    tools[toolIndex] = tool;
    
    // Aktivität protokollieren
    try {
      await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `Tool "${tool.name}" ausgeführt`,
          entityType: 'tool',
          entityId: id,
          actionType: 'execute'
        })
      });
    } catch (activityError) {
      logger.warn(`Fehler beim Protokollieren der Aktivität: ${activityError.message}`);
    }
    
    // Simuliere eine Verzögerung
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Gib eine simulierte Antwort zurück
    res.json({
      success: true,
      result: {
        message: `Tool "${tool.name}" erfolgreich ausgeführt`,
        executionId: uuidv4(),
        executionTime: 500, // Millisekunden
        timestamp: new Date(),
        output: {
          summary: 'Beispiel-Ausgabe für Tool-Ausführung',
          details: `Dies ist eine simulierte Antwort für ${tool.name}`
        }
      }
    });
  } catch (error) {
    logger.error(`Fehler bei der Tool-Ausführung: ${error.message}`, error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Tool-Ausführung',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /tools/categories
 * Ruft alle verfügbaren Tool-Kategorien ab
 */
router.get('/categories', async (req, res) => {
  try {
    // Extrahiere unique Kategorien
    const categories = [...new Set(tools.map(t => t.category).filter(Boolean))];
    
    res.json({
      success: true,
      categories
    });
  } catch (error) {
    logger.error(`Fehler beim Abrufen der Tool-Kategorien: ${error.message}`, error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Tool-Kategorien',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /tools/capabilities
 * Ruft alle verfügbaren Tool-Capabilities ab
 */
router.get('/capabilities', async (req, res) => {
  try {
    // Extrahiere unique Capabilities (flache Liste)
    const allCapabilities = tools
      .map(t => t.capabilities || [])
      .reduce((acc, val) => acc.concat(val), []);
    
    const capabilities = [...new Set(allCapabilities)];
    
    res.json({
      success: true,
      capabilities
    });
  } catch (error) {
    logger.error(`Fehler beim Abrufen der Tool-Capabilities: ${error.message}`, error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Tool-Capabilities',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Exportiere den Router
export default router; 