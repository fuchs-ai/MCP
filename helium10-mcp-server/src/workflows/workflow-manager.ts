import { logger } from '../utils/logger';
import { getToolByName } from '../tools/tool-registry';
import { WorkflowDefinition, WorkflowStep as RegistryWorkflowStep } from './workflow-registry';

/**
 * Schnittstelle für einen Workflow-Schritt
 */
export interface WorkflowStep {
  name: string;
  tool: Function;
  inputMapping?: Record<string, string | Function>;
  outputMapping?: Record<string, string | Function>;
  condition?: (results: Record<string, any>) => boolean;
}

/**
 * Schnittstelle für einen Workflow
 */
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  createdAt: Date;
  userId?: string;
}

/**
 * Ergebnis einer Workflow-Ausführung
 */
export interface WorkflowResult {
  workflowId: string;
  success: boolean;
  stepResults: Record<string, any>;
  finalResult: any;
  executionTime: number;
  error?: string;
}

/**
 * Workflow-Manager-Klasse
 * Verwaltet Workflows und deren Ausführung
 */
export class WorkflowManager {
  private workflows: Map<string, Workflow> = new Map();
  private steps: Map<string, Function> = new Map();

  /**
   * Registriert einen Workflow-Schritt
   */
  public registerStep(name: string, toolFunction: Function): WorkflowManager {
    if (this.steps.has(name)) {
      logger.warn(`Schritt ${name} wurde bereits registriert und wird überschrieben.`);
    }

    this.steps.set(name, toolFunction);
    logger.debug(`Workflow-Schritt registriert: ${name}`);
    return this;
  }

  /**
   * Registriert einen Workflow
   */
  public registerWorkflow(
    id: string,
    stepNames: string[],
    options: {
      name?: string;
      description?: string;
      userId?: string;
    } = {}
  ): Workflow {
    if (this.workflows.has(id)) {
      throw new Error(`Workflow mit ID ${id} existiert bereits.`);
    }

    // Workflow-Schritte erstellen
    const steps: WorkflowStep[] = [];
    for (const stepName of stepNames) {
      const tool = this.steps.get(stepName);
      if (!tool) {
        throw new Error(`Workflow-Schritt ${stepName} ist nicht registriert.`);
      }

      steps.push({
        name: stepName,
        tool
      });
    }

    // Workflow erstellen
    const workflow: Workflow = {
      id,
      name: options.name || id,
      description: options.description,
      steps,
      createdAt: new Date(),
      userId: options.userId
    };

    this.workflows.set(id, workflow);
    logger.info(`Workflow registriert: ${id} mit ${steps.length} Schritten`);
    return workflow;
  }

  /**
   * Registriert einen dynamischen Workflow mit bedingten Verzweigungen
   */
  public registerDynamicWorkflow(
    id: string,
    config: {
      initialStep: string;
      steps: Record<string, {
        tool: string | Function;
        nextStepSelector?: (result: any) => string | null;
        inputMapping?: Record<string, string | Function>;
        outputMapping?: Record<string, string | Function>;
        condition?: (results: Record<string, any>) => boolean;
      }>;
      name?: string;
      description?: string;
      userId?: string;
    }
  ): Workflow {
    if (this.workflows.has(id)) {
      throw new Error(`Workflow mit ID ${id} existiert bereits.`);
    }

    // Workflow-Schritte erstellen
    const steps: WorkflowStep[] = [];
    
    // Füge den initialen Schritt hinzu
    const initialStepConfig = config.steps[config.initialStep];
    if (!initialStepConfig) {
      throw new Error(`Initialer Schritt ${config.initialStep} ist nicht definiert.`);
    }

    // Füge alle Schritte hinzu
    for (const [stepName, stepConfig] of Object.entries(config.steps)) {
      // Tool-Funktion abrufen
      let tool: Function;
      if (typeof stepConfig.tool === 'function') {
        tool = stepConfig.tool;
      } else if (typeof stepConfig.tool === 'string') {
        const toolFunction = this.steps.get(stepConfig.tool) || getToolByName(stepConfig.tool);
        if (!toolFunction) {
          throw new Error(`Tool ${stepConfig.tool} für Schritt ${stepName} ist nicht registriert.`);
        }
        tool = toolFunction;
      } else {
        throw new Error(`Ungültiges Tool für Schritt ${stepName}.`);
      }

      steps.push({
        name: stepName,
        tool,
        inputMapping: stepConfig.inputMapping,
        outputMapping: stepConfig.outputMapping,
        condition: stepConfig.condition
      });
    }

    // Workflow erstellen
    const workflow: Workflow = {
      id,
      name: config.name || id,
      description: config.description,
      steps,
      createdAt: new Date(),
      userId: config.userId
    };

    // Metadaten für dynamische Pfade speichern
    (workflow as any).dynamic = true;
    (workflow as any).initialStep = config.initialStep;
    (workflow as any).stepConfigs = config.steps;

    this.workflows.set(id, workflow);
    logger.info(`Dynamischer Workflow registriert: ${id} mit ${steps.length} möglichen Schritten`);
    return workflow;
  }

  /**
   * Ruft einen Workflow anhand seiner ID ab
   */
  public getWorkflow(id: string): Workflow | null {
    return this.workflows.get(id) || null;
  }

  /**
   * Führt einen Workflow aus
   */
  public async executeWorkflow(
    workflowId: string,
    parameters: Record<string, any>
  ): Promise<WorkflowResult> {
    const startTime = Date.now();
    
    try {
      const workflow = this.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error(`Workflow ${workflowId} nicht gefunden.`);
      }

      logger.info(`Führe Workflow aus: ${workflowId}`);
      logger.debug(`Workflow-Parameter: ${JSON.stringify(parameters)}`);

      // Ergebnisse der einzelnen Schritte
      const stepResults: Record<string, any> = {};
      
      // Parameter für die aktuelle Ausführung
      let currentParams = { ...parameters };

      // Ausführung dynamischer Workflows
      if ((workflow as any).dynamic) {
        let currentStep = (workflow as any).initialStep;
        const stepConfigs = (workflow as any).stepConfigs;
        
        while (currentStep) {
          const stepConfig = stepConfigs[currentStep];
          if (!stepConfig) {
            throw new Error(`Schritt ${currentStep} nicht gefunden in dynamischem Workflow.`);
          }
          
          // Tool-Funktion abrufen
          let tool: Function;
          if (typeof stepConfig.tool === 'function') {
            tool = stepConfig.tool;
          } else {
            tool = this.steps.get(stepConfig.tool) || getToolByName(stepConfig.tool);
          }
          
          // Parameter für diesen Schritt vorbereiten
          let stepParams = { ...currentParams };
          if (stepConfig.inputMapping) {
            stepParams = this.mapParameters(stepParams, stepConfig.inputMapping, stepResults);
          }
          
          // Prüfen, ob die Bedingung erfüllt ist
          if (stepConfig.condition && !stepConfig.condition(stepResults)) {
            logger.debug(`Schritt ${currentStep} übersprungen (Bedingung nicht erfüllt).`);
            currentStep = stepConfig.nextStepSelector ? stepConfig.nextStepSelector(null) : null;
            continue;
          }
          
          // Schritt ausführen
          logger.debug(`Führe Schritt aus: ${currentStep}`);
          const result = await tool(stepParams);
          
          // Ergebnis speichern
          stepResults[currentStep] = result;
          
          // Parameter für den nächsten Schritt aktualisieren
          if (stepConfig.outputMapping) {
            currentParams = this.mapParameters(currentParams, stepConfig.outputMapping, { [currentStep]: result });
          } else {
            // Standardmäßig alle Ergebnisse in die Parameter übernehmen
            currentParams = { ...currentParams, ...result };
          }
          
          // Nächsten Schritt bestimmen
          currentStep = stepConfig.nextStepSelector ? stepConfig.nextStepSelector(result) : null;
        }
      } 
      // Ausführung statischer Workflows
      else {
        // Workflow-Schritte sequentiell ausführen
        for (const step of workflow.steps) {
          // Parameter für diesen Schritt vorbereiten
          let stepParams = { ...currentParams };
          if (step.inputMapping) {
            stepParams = this.mapParameters(stepParams, step.inputMapping, stepResults);
          }
          
          // Prüfen, ob die Bedingung erfüllt ist
          if (step.condition && !step.condition(stepResults)) {
            logger.debug(`Schritt ${step.name} übersprungen (Bedingung nicht erfüllt).`);
            continue;
          }
          
          // Schritt ausführen
          logger.debug(`Führe Schritt aus: ${step.name}`);
          const result = await step.tool(stepParams);
          
          // Ergebnis speichern
          stepResults[step.name] = result;
          
          // Parameter für den nächsten Schritt aktualisieren
          if (step.outputMapping) {
            currentParams = this.mapParameters(currentParams, step.outputMapping, { [step.name]: result });
          } else {
            // Standardmäßig alle Ergebnisse in die Parameter übernehmen
            currentParams = { ...currentParams, ...result };
          }
        }
      }

      // Letztes Ergebnis als finales Ergebnis verwenden
      const finalResult = currentParams;
      
      const executionTime = Date.now() - startTime;
      logger.info(`Workflow ${workflowId} erfolgreich ausgeführt (${executionTime}ms).`);
      
      return {
        workflowId,
        success: true,
        stepResults,
        finalResult,
        executionTime
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error(`Fehler bei der Ausführung des Workflows ${workflowId}: ${error}`);
      
      return {
        workflowId,
        success: false,
        stepResults: {},
        finalResult: null,
        executionTime,
        error: error.message
      };
    }
  }

  /**
   * Weist Parameter nach einem Mappingschema zu
   */
  private mapParameters(
    currentParams: Record<string, any>,
    mapping: Record<string, string | Function>,
    results: Record<string, any>
  ): Record<string, any> {
    const mappedParams = { ...currentParams };
    
    for (const [targetKey, sourceMapping] of Object.entries(mapping)) {
      if (typeof sourceMapping === 'function') {
        // Funktionsmapping
        mappedParams[targetKey] = sourceMapping(currentParams, results);
      } else if (typeof sourceMapping === 'string') {
        // String-Mapping (Format: "stepName.key")
        const [stepName, key] = sourceMapping.split('.');
        if (stepName && key && results[stepName] && results[stepName][key] !== undefined) {
          mappedParams[targetKey] = results[stepName][key];
        }
      }
    }
    
    return mappedParams;
  }

  /**
   * Löscht einen Workflow
   */
  public deleteWorkflow(id: string): boolean {
    return this.workflows.delete(id);
  }

  /**
   * Listet alle registrierten Workflows auf
   */
  public listWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }
}

// Singleton-Instanz des Workflow-Managers
export const workflowManager = new WorkflowManager();

// Exportiere Hauptfunktionen für einfacheren Zugriff
export const registerWorkflowStep = workflowManager.registerStep.bind(workflowManager);
export const registerWorkflow = workflowManager.registerWorkflow.bind(workflowManager);
export const executeWorkflow = workflowManager.executeWorkflow.bind(workflowManager);
export const getWorkflow = workflowManager.getWorkflow.bind(workflowManager);
export const listWorkflows = workflowManager.listWorkflows.bind(workflowManager);

/**
 * Führt einen Workflow aus dem Workflow-Registry aus.
 * Diese Funktion wird von den API-Routen verwendet.
 */
export async function executeRegistryWorkflow(
  workflow: WorkflowDefinition,
  parameters: Record<string, any>
): Promise<Record<string, any>> {
  try {
    logger.info(`Führe Workflow aus: ${workflow.id} (${workflow.name})`);
    logger.debug(`Workflow-Parameter: ${JSON.stringify(parameters)}`);
    
    // Ergebnisse der einzelnen Schritte
    const stepResults: Record<string, any> = {};
    
    // Parameter für die aktuelle Ausführung
    let currentParams = { ...parameters };
    
    // Workflow-Kontext für die Zwischenergebnisse
    const context = {
      input: parameters
    };
    
    // Workflow-Schritte sequentiell ausführen
    for (const step of workflow.steps) {
      logger.debug(`Führe Schritt aus: ${step.id} (Typ: ${step.type})`);
      
      // Überspringe den Schritt, wenn die Bedingung nicht erfüllt ist
      if (step.condition) {
        // Einfache Evaluierung der Bedingung
        const conditionMet = eval(`with (context) { ${step.condition} }`);
        if (!conditionMet) {
          logger.debug(`Schritt ${step.id} übersprungen (Bedingung nicht erfüllt).`);
          continue;
        }
      }
      
      // Tool-Schritt ausführen
      if (step.type === 'tool') {
        if (!step.toolName) {
          throw new Error(`Kein Tool-Name für Schritt ${step.id} angegeben.`);
        }
        
        // Tool abrufen
        const tool = getToolByName(step.toolName);
        if (!tool) {
          throw new Error(`Tool ${step.toolName} nicht gefunden.`);
        }
        
        // Parameter für diesen Schritt vorbereiten
        const stepParams = {};
        for (const [paramName, mapping] of Object.entries(step.inputMappings)) {
          // Evaluiere den Mapping-Pfad, um den Wert aus dem Kontext zu holen
          stepParams[paramName] = eval(`with (context) { ${mapping} }`);
        }
        
        // Parameter mit festen Werten aus dem Step überschreiben
        Object.assign(stepParams, step.parameters);
        
        // Schritt ausführen
        logger.debug(`Führe Tool aus: ${step.toolName} mit Parametern:`, stepParams);
        const result = await tool(stepParams);
        
        // Ergebnis speichern
        stepResults[step.id] = result;
        
        // Ergebnisse in den Kontext übernehmen
        for (const [outputName, mapping] of Object.entries(step.outputMappings)) {
          // Evaluiere den Mapping-Pfad, um den Wert in den Kontext zu schreiben
          const path = mapping.split('.');
          let current = context;
          for (let i = 0; i < path.length - 1; i++) {
            if (!current[path[i]]) {
              current[path[i]] = {};
            }
            current = current[path[i]];
          }
          current[path[path.length - 1]] = result[outputName];
        }
      }
      // Transformation-Schritt ausführen
      else if (step.type === 'transformation') {
        if (!step.transformation) {
          throw new Error(`Keine Transformation für Schritt ${step.id} angegeben.`);
        }
        
        // Führe die Transformation aus
        const transformationResult = eval(`with (context) { ${step.transformation} }`);
        
        // Ergebnis speichern
        stepResults[step.id] = transformationResult;
        
        // Ergebnisse in den Kontext übernehmen
        for (const [outputName, mapping] of Object.entries(step.outputMappings)) {
          // Evaluiere den Mapping-Pfad, um den Wert in den Kontext zu schreiben
          const path = mapping.split('.');
          let current = context;
          for (let i = 0; i < path.length - 1; i++) {
            if (!current[path[i]]) {
              current[path[i]] = {};
            }
            current = current[path[i]];
          }
          current[path[path.length - 1]] = transformationResult[outputName];
        }
      }
    }
    
    logger.info(`Workflow ${workflow.id} erfolgreich ausgeführt.`);
    
    // Rückgabe des Ergebnisses
    return {
      success: true,
      workflowId: workflow.id,
      results: context.output || stepResults
    };
  } catch (error) {
    logger.error(`Fehler bei der Ausführung des Workflows ${workflow.id}: ${error.message}`);
    
    return {
      success: false,
      workflowId: workflow.id,
      error: error.message
    };
  }
} 