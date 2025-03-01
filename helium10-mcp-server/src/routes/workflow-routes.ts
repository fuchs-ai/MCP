/**
 * workflow-routes.ts
 * 
 * Definiert Express-Routen für die Workflow-Verwaltung.
 * Ermöglicht das Erstellen, Lesen, Aktualisieren, Löschen und Ausführen von Workflows.
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

// Router erstellen
const router = express.Router();

// Workflow-Schritt-Typ
interface WorkflowStep {
  id: string;
  name: string;
  description?: string;
  toolId: string;
  params?: Record<string, any>;
  condition?: {
    type: 'always' | 'on_success' | 'on_failure' | 'expression';
    expression?: string;
  };
  retryConfig?: {
    maxRetries: number;
    delay: number;
  };
}

// Workflow-Typ
interface Workflow {
  id: string;
  name: string;
  description?: string;
  version: string;
  enabled: boolean;
  steps: WorkflowStep[];
  errorHandling?: {
    onError: 'stop' | 'continue' | 'retry';
    maxRetries?: number;
    retryDelay?: number;
  };
  trigger?: {
    type: 'manual' | 'scheduled' | 'event';
    schedule?: string; // cron-format
    eventType?: string;
  };
  inputSchema?: any;
  outputSchema?: any;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  executionCount: number;
  lastExecuted?: Date;
  averageExecutionTime?: number;
  tags?: string[];
}

// In-Memory-Speicher für Workflows (später durch Datenbankzugriff ersetzen)
let workflows: Workflow[] = [];

/**
 * Validiert ein Workflow-Objekt
 */
function validateWorkflow(workflow: any, isUpdate = false): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  
  // Prüfe, ob das Workflow-Objekt vorhanden ist
  if (!workflow) {
    return {
      isValid: false,
      errors: { 'general': 'Keine Workflow-Daten angegeben' }
    };
  }
  
  // Validiere Name
  if (!isUpdate || workflow.name !== undefined) {
    if (!workflow.name) {
      errors.name = 'Name ist erforderlich';
    } else if (typeof workflow.name !== 'string') {
      errors.name = 'Name muss ein String sein';
    } else if (workflow.name.length < 3) {
      errors.name = 'Name muss mindestens 3 Zeichen lang sein';
    } else if (workflow.name.length > 100) {
      errors.name = 'Name darf maximal 100 Zeichen lang sein';
    }
  }
  
  // Validiere Version
  if (!isUpdate || workflow.version !== undefined) {
    if (!workflow.version) {
      errors.version = 'Version ist erforderlich';
    } else if (typeof workflow.version !== 'string') {
      errors.version = 'Version muss ein String sein';
    } else if (!/^\d+\.\d+\.\d+$/.test(workflow.version)) {
      errors.version = 'Version muss im Format x.y.z sein';
    }
  }
  
  // Validiere Beschreibung (optional)
  if (workflow.description !== undefined && workflow.description !== null) {
    if (typeof workflow.description !== 'string') {
      errors.description = 'Beschreibung muss ein String sein';
    }
  }
  
  // Validiere enabled (nur für Updates, da standardmäßig true)
  if (isUpdate && workflow.enabled !== undefined) {
    if (typeof workflow.enabled !== 'boolean') {
      errors.enabled = 'Aktiviert-Status muss ein Boolean sein';
    }
  }
  
  // Validiere Schritte
  if (!isUpdate || workflow.steps !== undefined) {
    if (!workflow.steps) {
      errors.steps = 'Schritte sind erforderlich';
    } else if (!Array.isArray(workflow.steps)) {
      errors.steps = 'Schritte müssen ein Array sein';
    } else if (workflow.steps.length === 0) {
      errors.steps = 'Workflow muss mindestens einen Schritt enthalten';
    } else {
      // Validiere jeden Schritt
      workflow.steps.forEach((step: any, index: number) => {
        const stepPrefix = `steps[${index}]`;
        
        if (!step.name) {
          errors[`${stepPrefix}.name`] = 'Schrittname ist erforderlich';
        }
        
        if (!step.toolId) {
          errors[`${stepPrefix}.toolId`] = 'Tool-ID ist erforderlich';
        }
        
        if (step.condition && step.condition.type === 'expression' && !step.condition.expression) {
          errors[`${stepPrefix}.condition.expression`] = 'Expression ist erforderlich, wenn der Bedingungstyp "expression" ist';
        }
        
        if (step.retryConfig) {
          if (typeof step.retryConfig.maxRetries !== 'number' || step.retryConfig.maxRetries < 0) {
            errors[`${stepPrefix}.retryConfig.maxRetries`] = 'Maximale Anzahl von Wiederholungen muss eine nicht-negative Zahl sein';
          }
          
          if (typeof step.retryConfig.delay !== 'number' || step.retryConfig.delay < 0) {
            errors[`${stepPrefix}.retryConfig.delay`] = 'Verzögerung muss eine nicht-negative Zahl sein';
          }
        }
      });
    }
  }
  
  // Validiere errorHandling (optional)
  if (workflow.errorHandling !== undefined && workflow.errorHandling !== null) {
    if (typeof workflow.errorHandling !== 'object') {
      errors.errorHandling = 'Fehlerbehandlung muss ein Objekt sein';
    } else {
      if (!['stop', 'continue', 'retry'].includes(workflow.errorHandling.onError)) {
        errors['errorHandling.onError'] = 'Fehlerbehandlungstyp muss einer der folgenden sein: stop, continue, retry';
      }
      
      if (workflow.errorHandling.onError === 'retry') {
        if (workflow.errorHandling.maxRetries === undefined) {
          errors['errorHandling.maxRetries'] = 'Maximale Anzahl von Wiederholungen ist erforderlich, wenn der Fehlerbehandlungstyp "retry" ist';
        } else if (typeof workflow.errorHandling.maxRetries !== 'number' || workflow.errorHandling.maxRetries < 0) {
          errors['errorHandling.maxRetries'] = 'Maximale Anzahl von Wiederholungen muss eine nicht-negative Zahl sein';
        }
        
        if (workflow.errorHandling.retryDelay === undefined) {
          errors['errorHandling.retryDelay'] = 'Verzögerung ist erforderlich, wenn der Fehlerbehandlungstyp "retry" ist';
        } else if (typeof workflow.errorHandling.retryDelay !== 'number' || workflow.errorHandling.retryDelay < 0) {
          errors['errorHandling.retryDelay'] = 'Verzögerung muss eine nicht-negative Zahl sein';
        }
      }
    }
  }
  
  // Validiere Trigger (optional)
  if (workflow.trigger !== undefined && workflow.trigger !== null) {
    if (typeof workflow.trigger !== 'object') {
      errors.trigger = 'Trigger muss ein Objekt sein';
    } else {
      if (!['manual', 'scheduled', 'event'].includes(workflow.trigger.type)) {
        errors['trigger.type'] = 'Triggertyp muss einer der folgenden sein: manual, scheduled, event';
      }
      
      if (workflow.trigger.type === 'scheduled' && !workflow.trigger.schedule) {
        errors['trigger.schedule'] = 'Zeitplan ist erforderlich, wenn der Triggertyp "scheduled" ist';
      }
      
      if (workflow.trigger.type === 'event' && !workflow.trigger.eventType) {
        errors['trigger.eventType'] = 'Ereignistyp ist erforderlich, wenn der Triggertyp "event" ist';
      }
    }
  }
  
  // Validiere Tags (optional)
  if (workflow.tags !== undefined && workflow.tags !== null) {
    if (!Array.isArray(workflow.tags)) {
      errors.tags = 'Tags müssen ein Array sein';
    } else {
      for (const tag of workflow.tags) {
        if (typeof tag !== 'string') {
          errors.tags = 'Alle Tags müssen Strings sein';
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

// Initialisiert einige Beispiel-Workflows
function initSampleWorkflows() {
  if (workflows.length === 0) {
    workflows = [
      {
        id: uuidv4(),
        name: 'Textanalyse und Benachrichtigung',
        description: 'Analysiert einen Text und sendet Benachrichtigungen bei bestimmten Ergebnissen',
        version: '1.0.0',
        enabled: true,
        steps: [
          {
            id: uuidv4(),
            name: 'Text analysieren',
            description: 'Analysiert den Eingabetext auf Stimmung und Entitäten',
            toolId: 'text-analyse',
            params: {
              language: 'de',
              depth: 'detailed'
            }
          },
          {
            id: uuidv4(),
            name: 'Entscheidung treffen',
            description: 'Entscheidet basierend auf der Stimmung, ob eine Benachrichtigung gesendet wird',
            toolId: 'condition-evaluator',
            params: {
              condition: "$.steps['text-analysieren'].result.sentiment.score < 0.3"
            },
            condition: {
              type: 'always'
            }
          },
          {
            id: uuidv4(),
            name: 'E-Mail senden',
            description: 'Sendet eine E-Mail bei negativer Stimmung',
            toolId: 'email-sender',
            params: {
              to: 'admin@example.com',
              subject: 'Negative Stimmung erkannt',
              body: "Ein Text mit negativer Stimmung wurde erkannt: {{$.input.text}}"
            },
            condition: {
              type: 'expression',
              expression: "$.steps['entscheidung-treffen'].result.conditionMet === true"
            }
          }
        ],
        errorHandling: {
          onError: 'stop'
        },
        trigger: {
          type: 'manual'
        },
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Der zu analysierende Text'
            }
          },
          required: ['text']
        },
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 Tage alt
        updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 Tage alt
        executionCount: 42,
        lastExecuted: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 Tage alt
        averageExecutionTime: 1250,
        tags: ['text', 'analyse', 'benachrichtigung']
      },
      {
        id: uuidv4(),
        name: 'Daten-Extraktions-Pipeline',
        description: 'Extrahiert Daten aus verschiedenen Quellen und bereitet sie für die Analyse vor',
        version: '2.1.0',
        enabled: true,
        steps: [
          {
            id: uuidv4(),
            name: 'Daten abrufen',
            description: 'Ruft Daten von einer API ab',
            toolId: 'api-fetcher',
            params: {
              url: 'https://api.example.com/data',
              method: 'GET',
              headers: {
                'Authorization': 'Bearer {{$.env.API_KEY}}'
              }
            }
          },
          {
            id: uuidv4(),
            name: 'Daten transformieren',
            description: 'Transformiert die abgerufenen Daten in ein einheitliches Format',
            toolId: 'data-transformer',
            params: {
              transformationRules: {
                mapping: {
                  id: '$.id',
                  name: '$.properties.name',
                  value: '$.properties.metrics.value',
                  timestamp: '$.created_at'
                }
              }
            },
            condition: {
              type: 'on_success'
            }
          },
          {
            id: uuidv4(),
            name: 'Daten speichern',
            description: 'Speichert die transformierten Daten in einer Datenbank',
            toolId: 'database-writer',
            params: {
              tableName: 'transformed_data',
              data: '{{$.steps["daten-transformieren"].result.data}}'
            },
            condition: {
              type: 'on_success'
            },
            retryConfig: {
              maxRetries: 3,
              delay: 1000
            }
          }
        ],
        errorHandling: {
          onError: 'retry',
          maxRetries: 2,
          retryDelay: 5000
        },
        trigger: {
          type: 'scheduled',
          schedule: '0 0 * * *' // Täglich um Mitternacht
        },
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 Tage alt
        updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 Tage alt
        executionCount: 28,
        lastExecuted: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 Tag alt
        averageExecutionTime: 3500,
        tags: ['daten', 'extraktion', 'transformation']
      },
      {
        id: uuidv4(),
        name: 'Bild-Verarbeitungs-Workflow',
        description: 'Verarbeitet Bilder und extrahiert Metadaten',
        version: '1.2.1',
        enabled: false, // Deaktiviert
        steps: [
          {
            id: uuidv4(),
            name: 'Bild analysieren',
            description: 'Analysiert ein Bild mit Computer Vision',
            toolId: 'bild-analyse',
            params: {
              features: ['objects', 'colors', 'text']
            }
          },
          {
            id: uuidv4(),
            name: 'Metadaten extrahieren',
            description: 'Extrahiert EXIF-Metadaten aus dem Bild',
            toolId: 'exif-extractor',
            condition: {
              type: 'always'
            }
          },
          {
            id: uuidv4(),
            name: 'Bericht erstellen',
            description: 'Erstellt einen Bericht aus den extrahierten Daten',
            toolId: 'report-generator',
            params: {
              format: 'pdf',
              template: 'image-analysis-report'
            },
            condition: {
              type: 'on_success'
            }
          }
        ],
        errorHandling: {
          onError: 'continue'
        },
        trigger: {
          type: 'event',
          eventType: 'new-image-uploaded'
        },
        inputSchema: {
          type: 'object',
          properties: {
            imageUrl: {
              type: 'string',
              description: 'URL des zu analysierenden Bildes'
            }
          },
          required: ['imageUrl']
        },
        createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 Tage alt
        updatedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 Tage alt
        executionCount: 135,
        lastExecuted: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25 Tage alt (da deaktiviert)
        averageExecutionTime: 2800,
        tags: ['bild', 'analyse', 'vision']
      }
    ];
  }
}

// Beispiel-Workflows initialisieren
initSampleWorkflows();

/**
 * GET /workflows
 * Ruft alle Workflows ab
 */
router.get('/', async (req, res) => {
  try {
    // Filter-Parameter aus der Query extrahieren
    const { enabled, search, tags } = req.query;
    
    // Workflows filtern
    let filteredWorkflows = [...workflows];
    
    if (enabled !== undefined) {
      const isEnabled = enabled === 'true';
      filteredWorkflows = filteredWorkflows.filter(w => w.enabled === isEnabled);
    }
    
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      filteredWorkflows = filteredWorkflows.filter(w => 
        w.name.toLowerCase().includes(searchTerm) || 
        (w.description && w.description.toLowerCase().includes(searchTerm)));
    }
    
    if (tags) {
      const tagList = (tags as string).split(',');
      filteredWorkflows = filteredWorkflows.filter(w => 
        w.tags && tagList.some(tag => w.tags.includes(tag))
      );
    }
    
    // Sortieren nach Name (Standard)
    filteredWorkflows.sort((a, b) => a.name.localeCompare(b.name));
    
    res.json({
      success: true,
      workflows: filteredWorkflows
    });
  } catch (error) {
    logger.error(`Fehler beim Abrufen der Workflows: ${error.message}`, error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Workflows',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /workflows/:id
 * Ruft Details zu einem bestimmten Workflow ab
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const workflow = workflows.find(w => w.id === id);
    
    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: `Workflow mit ID "${id}" nicht gefunden`
      });
    }
    
    res.json({
      success: true,
      workflow
    });
  } catch (error) {
    logger.error(`Fehler beim Abrufen des Workflows: ${error.message}`, error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Workflows',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /workflows
 * Erstellt einen neuen Workflow
 */
router.post('/', async (req, res) => {
  try {
    const workflowData = req.body;
    
    // Validiere die Eingabedaten
    const { isValid, errors } = validateWorkflow(workflowData);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Workflow-Daten',
        errors
      });
    }
    
    // Prüfe, ob ein Workflow mit diesem Namen bereits existiert
    const existingWorkflow = workflows.find(w => w.name === workflowData.name);
    
    if (existingWorkflow) {
      return res.status(409).json({
        success: false,
        message: `Ein Workflow mit dem Namen "${workflowData.name}" existiert bereits`
      });
    }
    
    // Generiere IDs für Schritte, falls nicht vorhanden
    const steps = workflowData.steps.map(step => ({
      ...step,
      id: step.id || uuidv4()
    }));
    
    // ID und Metadaten hinzufügen
    const newWorkflow: Workflow = {
      ...workflowData,
      steps,
      id: uuidv4(),
      enabled: workflowData.enabled !== false, // Standardmäßig aktiviert
      createdAt: new Date(),
      updatedAt: new Date(),
      executionCount: 0
    };
    
    // Zum Workflow-Array hinzufügen
    workflows.push(newWorkflow);
    
    // Aktivität protokollieren
    try {
      await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `Workflow "${newWorkflow.name}" (v${newWorkflow.version}) erstellt`,
          entityType: 'workflow',
          entityId: newWorkflow.id,
          actionType: 'create'
        })
      });
    } catch (activityError) {
      logger.warn(`Fehler beim Protokollieren der Aktivität: ${activityError.message}`);
    }
    
    res.status(201).json({
      success: true,
      workflow: newWorkflow
    });
  } catch (error) {
    logger.error(`Fehler beim Erstellen des Workflows: ${error.message}`, error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Workflows',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /workflows/:id
 * Aktualisiert einen vorhandenen Workflow
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Prüfe, ob der Workflow existiert
    const workflowIndex = workflows.findIndex(w => w.id === id);
    
    if (workflowIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `Workflow mit ID "${id}" nicht gefunden`
      });
    }
    
    // Validiere die Eingabedaten
    const { isValid, errors } = validateWorkflow(updateData, true);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Workflow-Daten',
        errors
      });
    }
    
    // Wenn der Name geändert wird, prüfe auf Duplikate
    if (updateData.name && updateData.name !== workflows[workflowIndex].name) {
      const existingWorkflow = workflows.find(w => w.name === updateData.name && w.id !== id);
      
      if (existingWorkflow) {
        return res.status(409).json({
          success: false,
          message: `Ein Workflow mit dem Namen "${updateData.name}" existiert bereits`
        });
      }
    }
    
    // Generiere IDs für neue Schritte, falls vorhanden
    if (updateData.steps) {
      updateData.steps = updateData.steps.map(step => ({
        ...step,
        id: step.id || uuidv4()
      }));
    }
    
    // Aktualisiere den Workflow
    const updatedWorkflow = {
      ...workflows[workflowIndex],
      ...updateData,
      id: id, // ID kann nicht geändert werden
      updatedAt: new Date()
    };
    
    workflows[workflowIndex] = updatedWorkflow;
    
    // Aktivität protokollieren
    try {
      await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `Workflow "${updatedWorkflow.name}" (v${updatedWorkflow.version}) aktualisiert`,
          entityType: 'workflow',
          entityId: id,
          actionType: 'update'
        })
      });
    } catch (activityError) {
      logger.warn(`Fehler beim Protokollieren der Aktivität: ${activityError.message}`);
    }
    
    res.json({
      success: true,
      workflow: updatedWorkflow
    });
  } catch (error) {
    logger.error(`Fehler beim Aktualisieren des Workflows: ${error.message}`, error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Workflows',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PATCH /workflows/:id/enable
 * Aktiviert oder deaktiviert einen Workflow
 */
router.patch('/:id/enable', async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    
    // Prüfe, ob der Workflow existiert
    const workflowIndex = workflows.findIndex(w => w.id === id);
    
    if (workflowIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `Workflow mit ID "${id}" nicht gefunden`
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
    workflows[workflowIndex].enabled = enabled;
    workflows[workflowIndex].updatedAt = new Date();
    
    // Aktivität protokollieren
    try {
      await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `Workflow "${workflows[workflowIndex].name}" ${enabled ? 'aktiviert' : 'deaktiviert'}`,
          entityType: 'workflow',
          entityId: id,
          actionType: 'update'
        })
      });
    } catch (activityError) {
      logger.warn(`Fehler beim Protokollieren der Aktivität: ${activityError.message}`);
    }
    
    res.json({
      success: true,
      workflow: workflows[workflowIndex]
    });
  } catch (error) {
    logger.error(`Fehler beim Ändern des Workflow-Status: ${error.message}`, error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Ändern des Workflow-Status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /workflows/:id
 * Löscht einen Workflow
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prüfe, ob der Workflow existiert
    const workflowIndex = workflows.findIndex(w => w.id === id);
    
    if (workflowIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `Workflow mit ID "${id}" nicht gefunden`
      });
    }
    
    // Workflow-Daten speichern bevor sie gelöscht werden
    const workflowName = workflows[workflowIndex].name;
    const workflowVersion = workflows[workflowIndex].version;
    
    // Workflow löschen
    workflows.splice(workflowIndex, 1);
    
    // Aktivität protokollieren
    try {
      await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `Workflow "${workflowName}" (v${workflowVersion}) gelöscht`,
          entityType: 'workflow',
          entityId: id,
          actionType: 'delete'
        })
      });
    } catch (activityError) {
      logger.warn(`Fehler beim Protokollieren der Aktivität: ${activityError.message}`);
    }
    
    res.json({
      success: true,
      message: 'Workflow erfolgreich gelöscht'
    });
  } catch (error) {
    logger.error(`Fehler beim Löschen des Workflows: ${error.message}`, error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Workflows',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /workflows/:id/execute
 * Führt einen Workflow aus
 */
router.post('/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const inputData = req.body;
    
    // Prüfe, ob der Workflow existiert
    const workflowIndex = workflows.findIndex(w => w.id === id);
    
    if (workflowIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `Workflow mit ID "${id}" nicht gefunden`
      });
    }
    
    const workflow = workflows[workflowIndex];
    
    // Prüfe, ob der Workflow aktiviert ist
    if (!workflow.enabled) {
      return res.status(400).json({
        success: false,
        message: 'Dieser Workflow ist deaktiviert und kann nicht ausgeführt werden'
      });
    }
    
    // Validiere die Eingabedaten gegen das Schema, falls vorhanden
    if (workflow.inputSchema) {
      // Hier würde normalerweise die Schema-Validierung stattfinden
      // Für diese Demo überspringen wir diesen Schritt
    }
    
    // Starte die Ausführung und Zeitmessung
    const startTime = Date.now();
    
    // Hier würde die eigentliche Workflow-Ausführung stattfinden
    // Für diese Demo simulieren wir eine erfolgreiche Ausführung
    
    // Simuliere eine Verzögerung
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Beende die Zeitmessung
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    // Aktualisiere Workflow-Statistiken
    workflow.executionCount += 1;
    workflow.lastExecuted = new Date();
    
    // Aktualisiere die durchschnittliche Ausführungszeit
    if (workflow.averageExecutionTime) {
      workflow.averageExecutionTime = Math.round(
        (workflow.averageExecutionTime * (workflow.executionCount - 1) + executionTime) / workflow.executionCount
      );
    } else {
      workflow.averageExecutionTime = executionTime;
    }
    
    workflows[workflowIndex] = workflow;
    
    // Generiere eine Ausführungs-ID
    const executionId = uuidv4();
    
    // Aktivität protokollieren
    try {
      await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `Workflow "${workflow.name}" ausgeführt`,
          entityType: 'workflow',
          entityId: id,
          actionType: 'execute'
        })
      });
    } catch (activityError) {
      logger.warn(`Fehler beim Protokollieren der Aktivität: ${activityError.message}`);
    }
    
    // Gib eine simulierte Antwort zurück
    res.json({
      success: true,
      execution: {
        id: executionId,
        workflowId: id,
        status: 'completed',
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        executionTime,
        input: inputData,
        output: {
          message: `Workflow "${workflow.name}" erfolgreich ausgeführt`,
          steps: workflow.steps.map(step => ({
            id: step.id,
            name: step.name,
            status: 'success',
            startTime: new Date(startTime + Math.floor(Math.random() * 500)),
            endTime: new Date(startTime + 500 + Math.floor(Math.random() * 500)),
            output: {
              result: `Simulierte Ausgabe für Schritt "${step.name}"`
            }
          }))
        }
      }
    });
  } catch (error) {
    logger.error(`Fehler bei der Workflow-Ausführung: ${error.message}`, error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Workflow-Ausführung',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /workflows/:id/executions
 * Ruft alle Ausführungen eines Workflows ab
 */
router.get('/:id/executions', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prüfe, ob der Workflow existiert
    const workflow = workflows.find(w => w.id === id);
    
    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: `Workflow mit ID "${id}" nicht gefunden`
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
    logger.error(`Fehler beim Abrufen der Workflow-Ausführungen: ${error.message}`, error);
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Workflow-Ausführungen',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Exportiere den Router
export default router; 