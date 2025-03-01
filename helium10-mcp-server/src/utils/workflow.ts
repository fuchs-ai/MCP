/**
 * Workflow-Management für MCP-Tools
 * 
 * Dieses Modul implementiert ein System zur sequentiellen Ausführung von MCP-Tools
 * und bietet Unterstützung für Workflows, die aus mehreren Tools bestehen und deren
 * Ergebnisse aufeinander aufbauen.
 */

import { FileSystemCache } from '../cache/file-cache';
import { isOfflineMode } from './network';
import * as fs from 'fs';
import * as path from 'path';

// Cache für Workflow-Ergebnisse
const workflowCache = new FileSystemCache('workflow-cache');

// Protokoll-Verzeichnis für Workflow-Ausführungen
const WORKFLOW_LOG_DIR = path.join(process.cwd(), 'logs', 'workflows');

/**
 * @typedef {Function} WorkflowStep
 * @param {any} input Die Eingabedaten für den Schritt
 * @param {any} context Der Workflow-Kontext
 * @returns {Promise<any>} Das Ergebnis des Schritts
 */

/**
 * Konfiguration für Wiederholungsversuche bei Fehlern
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  backoffFactor: number;
  retryableErrors?: Array<string | RegExp>;
}

/**
 * Bedingungsfunktion für die bedingte Ausführung von Workflow-Schritten
 */
export type ConditionFunction = (data: any, context: any) => boolean | Promise<boolean>;

/**
 * Standard-Konfiguration für Wiederholungsversuche
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // 1 Sekunde
  backoffFactor: 2,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'EPIPE',
    'EHOSTUNREACH',
    'NETWORK_ERROR',
    'RATE_LIMIT_EXCEEDED',
    'API_TIMEOUT',
    /^5\d\d$/, // 5xx HTTP-Fehler
    /timeout/i,
    /network error/i
  ]
};

/**
 * Workflow-Manager-Klasse für die sequentielle Ausführung von MCP-Tool-Ketten
 */
export class WorkflowManager {
  private steps: Map<string, Function>;
  private workflows: Map<string, string[]>;
  private parallelGroups: Map<string, string[]>;
  private retryConfigs: Map<string, RetryConfig>;
  private stepConditions: Map<string, ConditionFunction>;
  private dynamicWorkflows: Map<string, (data: any, context: any) => string[]>;
  private currentWorkflow: string | null = null;
  private results: Map<string, any> = new Map();
  
  /**
   * Erstellt eine neue WorkflowManager-Instanz
   */
  constructor() {
    this.steps = new Map();
    this.workflows = new Map();
    this.parallelGroups = new Map();
    this.retryConfigs = new Map();
    this.stepConditions = new Map();
    this.dynamicWorkflows = new Map();
    
    // Stelle sicher, dass das Log-Verzeichnis existiert
    if (!fs.existsSync(WORKFLOW_LOG_DIR)) {
      fs.mkdirSync(WORKFLOW_LOG_DIR, { recursive: true });
    }
    
    // Standard-Workflows registrieren
    this.registerDefaultWorkflows();
  }
  
  /**
   * Registriert einen einzelnen Workflow-Schritt
   * 
   * @param {string} stepId Eindeutige ID für den Schritt
   * @param {Function} stepFunction Die auszuführende Funktion
   * @returns {WorkflowManager} Die WorkflowManager-Instanz für Method Chaining
   */
  registerStep(stepId: string, stepFunction: Function): WorkflowManager {
    this.steps.set(stepId, stepFunction);
    return this;
  }
  
  /**
   * Registriert einen vollständigen Workflow
   * 
   * @param {string} workflowId Eindeutige ID für den Workflow
   * @param {string[]} stepIds Array von Schritt-IDs in der Ausführungsreihenfolge
   * @returns {WorkflowManager} Die WorkflowManager-Instanz für Method Chaining
   */
  registerWorkflow(workflowId: string, stepIds: string[]): WorkflowManager {
    this.workflows.set(workflowId, stepIds);
    return this;
  }
  
  /**
   * Registriert eine Gruppe von Schritten, die parallel ausgeführt werden können
   * 
   * @param {string} groupId Eindeutige ID für die Parallelgruppe
   * @param {string[]} stepIds Array von Schritt-IDs, die parallel ausgeführt werden sollen
   * @returns {WorkflowManager} Die WorkflowManager-Instanz für Method Chaining
   */
  registerParallelGroup(groupId: string, stepIds: string[]): WorkflowManager {
    // Prüfe, ob alle Schritte registriert sind
    for (const stepId of stepIds) {
      if (!this.steps.has(stepId)) {
        throw new Error(`Kann Parallelgruppe nicht registrieren: Schritt ${stepId} ist nicht registriert`);
      }
    }
    
    this.parallelGroups.set(groupId, stepIds);
    return this;
  }
  
  /**
   * Konfiguriert Wiederholungsversuche für einen bestimmten Schritt
   * 
   * @param {string} stepId ID des zu konfigurierenden Schritts
   * @param {RetryConfig} config Konfiguration für Wiederholungsversuche
   * @returns {WorkflowManager} Die WorkflowManager-Instanz für Method Chaining
   */
  configureRetry(stepId: string, config: Partial<RetryConfig>): WorkflowManager {
    if (!this.steps.has(stepId)) {
      throw new Error(`Kann Retry-Konfiguration nicht setzen: Schritt ${stepId} ist nicht registriert`);
    }
    
    // Kombiniere Standard-Konfiguration mit benutzerdefinierten Einstellungen
    this.retryConfigs.set(stepId, {
      ...DEFAULT_RETRY_CONFIG,
      ...config
    });
    
    return this;
  }
  
  /**
   * Prüft, ob ein Fehler wiederholbar ist basierend auf der Retry-Konfiguration
   * 
   * @param {Error} error Der aufgetretene Fehler
   * @param {RetryConfig} config Die Retry-Konfiguration
   * @returns {boolean} True, wenn der Fehler wiederholbar ist
   */
  private isRetryableError(error: Error, config: RetryConfig): boolean {
    if (!config.retryableErrors || config.retryableErrors.length === 0) {
      return true; // Alle Fehler sind standardmäßig wiederholbar
    }
    
    return config.retryableErrors.some(pattern => {
      if (typeof pattern === 'string') {
        return error.message.includes(pattern) || (error as any).code === pattern;
      } else {
        return pattern.test(error.message);
      }
    });
  }
  
  /**
   * Führt eine Funktion mit automatischen Wiederholungsversuchen aus
   * 
   * @param {Function} fn Die auszuführende Funktion
   * @param {RetryConfig} config Konfiguration für Wiederholungsversuche
   * @param {string} stepId ID des Schritts (für Protokollierung)
   * @returns {Promise<any>} Das Ergebnis der Funktion
   */
  private async executeWithRetry(fn: Function, config: RetryConfig, stepId: string, args: any[]): Promise<any> {
    let lastError: Error;
    let delay = config.initialDelay;
    
    for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;
        
        if (attempt > config.maxRetries || !this.isRetryableError(error, config)) {
          throw error;
        }
        
        console.log(`Wiederholungsversuch ${attempt}/${config.maxRetries} für Schritt ${stepId} nach Fehler: ${error.message}`);
        
        // Warte vor dem nächsten Versuch
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Erhöhe den Delay für den nächsten Versuch (exponentieller Backoff)
        delay *= config.backoffFactor;
      }
    }
    
    // Sollte nicht erreicht werden, aber zur Sicherheit
    throw lastError!;
  }
  
  /**
   * Definiert eine Bedingung für die Ausführung eines Schritts
   * 
   * @param {string} stepId ID des Schritts
   * @param {ConditionFunction} conditionFn Funktion, die bestimmt, ob der Schritt ausgeführt wird
   * @returns {WorkflowManager} Die WorkflowManager-Instanz für Method Chaining
   */
  setStepCondition(stepId: string, conditionFn: ConditionFunction): WorkflowManager {
    if (!this.steps.has(stepId)) {
      throw new Error(`Kann Bedingung nicht setzen: Schritt ${stepId} ist nicht registriert`);
    }
    
    this.stepConditions.set(stepId, conditionFn);
    return this;
  }
  
  /**
   * Registriert einen dynamischen Workflow, dessen Schritte zur Laufzeit bestimmt werden
   * 
   * @param {string} workflowId Eindeutige ID für den Workflow
   * @param {Function} stepResolver Funktion, die die Schritte zur Laufzeit bestimmt
   * @returns {WorkflowManager} Die WorkflowManager-Instanz für Method Chaining
   */
  registerDynamicWorkflow(
    workflowId: string, 
    stepResolver: (data: any, context: any) => string[]
  ): WorkflowManager {
    this.dynamicWorkflows.set(workflowId, stepResolver);
    return this;
  }
  
  /**
   * Führt einen vollständigen Workflow aus
   * 
   * @param {string} workflowId ID des auszuführenden Workflows
   * @param {any} initialData Anfangsdaten für den Workflow
   * @param {any} context Zusätzlicher Kontext für den Workflow
   * @returns {Promise<any>} Das Ergebnis des letzten Schritts
   */
  async executeWorkflow(workflowId: string, initialData: any, context: any = {}): Promise<any> {
    const startTime = Date.now();
    this.currentWorkflow = workflowId;
    this.results.clear();
    
    // Workflow-Schritte abrufen
    let stepIds: string[] = [];
    
    // Prüfe, ob es sich um einen dynamischen Workflow handelt
    if (this.dynamicWorkflows.has(workflowId)) {
      const stepResolver = this.dynamicWorkflows.get(workflowId)!;
      stepIds = stepResolver(initialData, context);
      console.log(`Dynamischer Workflow ${workflowId} aufgelöst mit ${stepIds.length} Schritten`);
    } else {
      stepIds = this.workflows.get(workflowId) || [];
    }
    
    if (stepIds.length === 0) {
      throw new Error(`Workflow nicht gefunden oder keine Schritte definiert: ${workflowId}`);
    }
    
    // Cache-Schlüssel für den Workflow
    const cacheKey = `workflow:${workflowId}:${JSON.stringify(initialData)}`;
    
    // Im Offline-Modus: Versuche gespeicherte Workflow-Ergebnisse zu verwenden
    if (isOfflineMode()) {
      const cachedResult = await workflowCache.get(cacheKey);
      if (cachedResult) {
        console.log(`Workflow-Cache-Treffer für ${workflowId}`);
        return cachedResult;
      }
    }
    
    // Protokoll für diese Ausführung initialisieren
    const executionId = `${workflowId}-${Date.now()}`;
    const logPath = path.join(WORKFLOW_LOG_DIR, `${executionId}.json`);
    const executionLog: any = {
      id: executionId,
      workflow: workflowId,
      startTime: new Date().toISOString(),
      steps: [],
      initialData,
      context,
      finalResult: null,
      status: 'running',
      skippedSteps: []
    };
    
    try {
      // Workflow-Schritte sequentiell ausführen
      let currentData = initialData;
      this.results.set('initial', initialData);
      
      for (const stepId of stepIds) {
        // Prüfe, ob es sich um eine Parallelgruppe handelt
        if (this.parallelGroups.has(stepId)) {
          const parallelStepIds = this.parallelGroups.get(stepId)!;
          console.log(`Führe Parallelgruppe mit ${parallelStepIds.length} Schritten aus: ${stepId}`);
          
          const parallelStartTime = Date.now();
          
          try {
            // Führe alle Schritte in der Gruppe parallel aus
            const stepPromises = parallelStepIds.map(async (parallelStepId) => {
              const stepFunction = this.steps.get(parallelStepId);
              if (!stepFunction) {
                throw new Error(`Workflow-Schritt nicht gefunden: ${parallelStepId}`);
              }
              
              const parallelStepStartTime = Date.now();
              console.log(`Ausführung von parallelem Schritt: ${parallelStepId}`);
              
              try {
                // Schritt ausführen mit aktuellem Datenstand und Workflow-Kontext
                const stepResult = await stepFunction(currentData, {
                  ...context,
                  workflowId,
                  stepId: parallelStepId,
                  parallelGroup: stepId,
                  previousResults: this.getResults()
                });
                
                // Ergebnis für zukünftige Schritte speichern
                this.results.set(parallelStepId, stepResult);
                
                // Schritt zum Protokoll hinzufügen
                executionLog.steps.push({
                  id: parallelStepId,
                  parallelGroup: stepId,
                  startTime: new Date(parallelStepStartTime).toISOString(),
                  endTime: new Date().toISOString(),
                  duration: Date.now() - parallelStepStartTime,
                  status: 'success'
                });
                
                return { stepId: parallelStepId, result: stepResult };
              } catch (error) {
                // Fehler im Schritt protokollieren
                executionLog.steps.push({
                  id: parallelStepId,
                  parallelGroup: stepId,
                  startTime: new Date(parallelStepStartTime).toISOString(),
                  endTime: new Date().toISOString(),
                  duration: Date.now() - parallelStepStartTime,
                  status: 'error',
                  error: {
                    message: error.message,
                    stack: error.stack
                  }
                });
                
                throw error;
              }
            });
            
            // Warte auf alle parallelen Schritte
            const parallelResults = await Promise.all(stepPromises);
            
            // Kombiniere die Ergebnisse der parallelen Schritte
            const combinedResult = parallelResults.reduce((combined, { stepId, result }) => {
              return { ...combined, [stepId]: result };
            }, {});
            
            // Speichere das kombinierte Ergebnis
            this.results.set(stepId, combinedResult);
            
            // Aktualisiere die Daten für den nächsten Schritt
            currentData = { ...currentData, parallelResults: combinedResult };
            
            // Füge die Parallelgruppe zum Protokoll hinzu
            executionLog.steps.push({
              id: stepId,
              type: 'parallelGroup',
              childSteps: parallelStepIds,
              startTime: new Date(parallelStartTime).toISOString(),
              endTime: new Date().toISOString(),
              duration: Date.now() - parallelStartTime,
              status: 'success'
            });
          } catch (error) {
            // Fehler in der Parallelgruppe protokollieren
            executionLog.steps.push({
              id: stepId,
              type: 'parallelGroup',
              childSteps: parallelStepIds,
              startTime: new Date(parallelStartTime).toISOString(),
              endTime: new Date().toISOString(),
              duration: Date.now() - parallelStartTime,
              status: 'error',
              error: {
                message: error.message,
                stack: error.stack
              }
            });
            
            throw error;
          }
        } else {
          // Standardfall: Führe einen einzelnen Schritt sequentiell aus
          const stepFunction = this.steps.get(stepId);
          if (!stepFunction) {
            throw new Error(`Workflow-Schritt nicht gefunden: ${stepId}`);
          }
          
          // Prüfe, ob eine Bedingung für diesen Schritt existiert
          if (this.stepConditions.has(stepId)) {
            const conditionFn = this.stepConditions.get(stepId)!;
            const shouldExecute = await conditionFn(currentData, {
              ...context,
              workflowId,
              stepId,
              previousResults: this.getResults()
            });
            
            if (!shouldExecute) {
              console.log(`Überspringe Schritt ${stepId}: Bedingung nicht erfüllt`);
              
              // Füge den übersprungenen Schritt zum Protokoll hinzu
              executionLog.skippedSteps.push({
                id: stepId,
                reason: 'condition_not_met',
                timestamp: new Date().toISOString()
              });
              
              // Gehe zum nächsten Schritt
              continue;
            }
          }
          
          const stepStartTime = Date.now();
          console.log(`Ausführung von Workflow-Schritt: ${stepId}`);
          
          try {
            // Schritt ausführen mit aktuellem Datenstand und Workflow-Kontext
            const stepContext = {
              ...context,
              workflowId,
              stepId,
              previousResults: this.getResults()
            };
            
            // Prüfe, ob für diesen Schritt eine Retry-Konfiguration vorhanden ist
            const retryConfig = this.retryConfigs.get(stepId) || DEFAULT_RETRY_CONFIG;
            
            // Führe den Schritt mit Retry-Mechanismus aus
            const stepResult = await this.executeWithRetry(
              stepFunction,
              retryConfig,
              stepId,
              [currentData, stepContext]
            );
            
            // Ergebnis für zukünftige Schritte speichern
            this.results.set(stepId, stepResult);
            
            // Daten für den nächsten Schritt aktualisieren
            currentData = stepResult;
            
            // Schritt zum Protokoll hinzufügen
            executionLog.steps.push({
              id: stepId,
              startTime: new Date(stepStartTime).toISOString(),
              endTime: new Date().toISOString(),
              duration: Date.now() - stepStartTime,
              status: 'success'
            });
          } catch (error) {
            // Fehler im Schritt protokollieren
            executionLog.steps.push({
              id: stepId,
              startTime: new Date(stepStartTime).toISOString(),
              endTime: new Date().toISOString(),
              duration: Date.now() - stepStartTime,
              status: 'error',
              error: {
                message: error.message,
                stack: error.stack
              }
            });
            
            // Fehler weiterleiten
            throw error;
          }
        }
      }
      
      // Workflow-Ergebnis in Cache speichern
      await workflowCache.set(cacheKey, currentData, 6 * 60 * 60); // 6 Stunden
      
      // Protokoll abschließen
      executionLog.finalResult = currentData;
      executionLog.status = 'success';
      executionLog.endTime = new Date().toISOString();
      executionLog.duration = Date.now() - startTime;
      
      // Protokoll speichern
      fs.writeFileSync(logPath, JSON.stringify(executionLog, null, 2));
      
      return currentData;
    } catch (error) {
      // Fehler im Workflow protokollieren
      executionLog.status = 'error';
      executionLog.endTime = new Date().toISOString();
      executionLog.duration = Date.now() - startTime;
      executionLog.error = {
        message: error.message,
        stack: error.stack
      };
      
      // Protokoll speichern
      fs.writeFileSync(logPath, JSON.stringify(executionLog, null, 2));
      
      throw error;
    } finally {
      this.currentWorkflow = null;
    }
  }
  
  /**
   * Gibt alle bisher gesammelten Ergebnisse des aktuellen Workflows zurück
   * 
   * @returns {Record<string, any>} Die Ergebnisse aller bisherigen Schritte
   */
  getResults(): Record<string, any> {
    const results: Record<string, any> = {};
    this.results.forEach((value, key) => {
      results[key] = value;
    });
    return results;
  }
  
  /**
   * Gibt die verfügbaren Workflows zurück
   * 
   * @returns {string[]} Liste der verfügbaren Workflow-IDs
   */
  getAvailableWorkflows(): string[] {
    return Array.from(this.workflows.keys());
  }
  
  /**
   * Registriert die Standard-Workflows für die Helium10-Integration
   * 
   * @private
   */
  private registerDefaultWorkflows(): void {
    // Workflow für Produkt-Recherche
    this.registerWorkflow('produktRecherche', [
      'keywordRecherche', 
      'produktSuche',
      'marktAnalyse',
      'verbesserungsVorschläge'
    ]);
    
    // Workflow für Keyword-Analyse
    this.registerWorkflow('keywordAnalyse', [
      'magnetRecherche',
      'konkurrenzAnalyse',
      'cerebroAnalyse',
      'keywordStrategie'
    ]);
    
    // Workflow für Verkaufsanalyse
    this.registerWorkflow('verkaufsAnalyse', [
      'verkaufsDaten',
      'produktPerformance',
      'umsatzPrognose',
      'optimierungsVorschläge'
    ]);
    
    // Workflow für Listing-Optimierung
    this.registerWorkflow('listingOptimierung', [
      'keywordRecherche',
      'konkurrenzAnalyse',
      'titleOptimierung',
      'bulletOptimierung',
      'beschreibungsOptimierung'
    ]);
  }
}

/**
 * Einzelne Workflow-Instanz für den globalen Zugriff
 */
export const workflowManager = new WorkflowManager();

/**
 * Factory-Funktion zur Erstellung vorkonfigurierter Workflow-Manager
 * 
 * @param {Function} configurationCallback Callback zur Konfiguration des Managers
 * @returns {WorkflowManager} Der konfigurierte Workflow-Manager
 */
export function createWorkflowManager(configurationCallback: (manager: WorkflowManager) => void): WorkflowManager {
  const manager = new WorkflowManager();
  configurationCallback(manager);
  return manager;
}

/**
 * Führt einen importierten Workflow mit eigenen Schritten aus
 * 
 * @param {Object} workflowDefinition Die Workflow-Definition
 * @param {any} initialData Anfangsdaten für den Workflow
 * @returns {Promise<any>} Das Ergebnis des Workflows
 */
export async function executeImportedWorkflow(workflowDefinition: { 
  id: string;
  steps: Array<{
    id: string;
    function: Function;
  }>;
}, initialData: any): Promise<any> {
  const manager = new WorkflowManager();
  
  // Schritte registrieren
  for (const step of workflowDefinition.steps) {
    manager.registerStep(step.id, step.function);
  }
  
  // Workflow registrieren
  manager.registerWorkflow(
    workflowDefinition.id, 
    workflowDefinition.steps.map(step => step.id)
  );
  
  // Workflow ausführen
  return manager.executeWorkflow(workflowDefinition.id, initialData);
} 