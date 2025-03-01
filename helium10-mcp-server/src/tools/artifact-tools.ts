/**
 * Tool-Artefakte für Claude.ai Desktop-Integration
 * 
 * Dieses Modul ermöglicht die Erstellung von Artefakten, die einzelne
 * Tool-Aufrufe in der Claude.ai Desktop-Version ermöglichen.
 */
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { FileSystemCache } from '../cache/file-cache';
import { artifacts, toolResults } from '../db/models/artifacts';
import { 
  validateParameters, 
  prepareParameters, 
  generateApprovalToken, 
  verifyApprovalToken 
} from '../security/artifact-security';
import * as crypto from 'crypto-js';
import { getToolByName } from './tool-registry';
import { WorkflowManager, workflowManager } from '../utils/workflow';
import {
  createArtifact,
  getArtifactById,
  isArtifactValid,
  incrementArtifactUsage,
  deleteArtifact,
  listArtifactsForUser,
  createApprovalToken as dbCreateApprovalToken,
  validateAndUseApprovalToken,
  storeToolResult,
  getToolResults,
  cleanupArtifactData
} from '../db/artifacts';

// Artefakt-Cache
const artifactCache = new FileSystemCache('artifacts');

// Umgebungsvariablen
const TOKEN_SECRET = process.env.ARTIFACT_TOKEN_SECRET || 'default-secret-key-change-me';
const DEFAULT_EXPIRY_DAYS = parseInt(process.env.ARTIFACT_DEFAULT_EXPIRY_DAYS || '30', 10);
const RESULTS_RETENTION_DAYS = parseInt(process.env.ARTIFACT_RESULTS_RETENTION_DAYS || '90', 10);

/**
 * Erstellt ein neues Tool-Artefakt für Claude.ai Desktop
 * 
 * @param name Name des Artefakts
 * @param description Beschreibung des Artefakts
 * @param toolName Name des aufzurufenden Tools
 * @param allowedParameters Erlaubte Parameter und deren Wertebereiche
 * @param options Zusätzliche Optionen für das Artefakt
 * @returns Erstelltes Artefakt mit URL zur Verwendung in Claude.ai Desktop
 */
export async function createToolArtifactTool(
  name: string,
  description: string,
  toolName: string,
  allowedParameters: Record<string, any>,
  options: {
    requiredApproval?: boolean;
    userId?: string;
    expiresAfterDays?: number;
    maxUsage?: number;
    enableDataStorage?: boolean;
    dbTable?: string;
    storeResults?: boolean;
  } = {}
): Promise<{
  success: boolean;
  message?: string;
  artifact?: {
    id: string;
    name: string;
    description: string;
    toolName: string;
    url: string;
    requiredApproval: boolean;
    expiresAt?: string;
    maxUsage?: number;
  }
}> {
  try {
    logger.info(`Erstelle Tool-Artefakt: ${name} (Tool: ${toolName})`);
    
    // Prüfen, ob das Tool existiert
    const tool = getToolByName(toolName);
    if (!tool) {
      logger.error(`Tool '${toolName}' nicht gefunden`);
      return {
        success: false,
        message: `Tool '${toolName}' nicht gefunden`
      };
    }
    
    // Standardwerte für Optionen
    const requiredApproval = options.requiredApproval ?? false;
    const userId = options.userId ?? null;
    const expiresAfterDays = options.expiresAfterDays ?? DEFAULT_EXPIRY_DAYS;
    const maxUsage = options.maxUsage ?? null;
    const enableDataStorage = options.enableDataStorage ?? false;
    const dbTable = options.dbTable ?? null;
    const storeResults = options.storeResults ?? true;
    
    // Artefakt erstellen
    const artifact = await createArtifact(
      name,
      description,
      toolName,
      allowedParameters,
      requiredApproval,
      userId,
      expiresAfterDays,
      maxUsage,
      enableDataStorage,
      dbTable,
      storeResults
    );
    
    // URL für das Artefakt generieren
    const url = `claude://artifacts/tool/${artifact.id}`;
    
    logger.info(`Tool-Artefakt erstellt: ${artifact.id}`);
    
    return {
      success: true,
      artifact: {
        id: artifact.id,
        name: artifact.name,
        description: artifact.description || '',
        toolName: artifact.tool_name,
        url,
        requiredApproval: artifact.required_approval,
        expiresAt: artifact.expires_at ? artifact.expires_at.toISOString() : undefined,
        maxUsage: artifact.max_usage
      }
    };
  } catch (error) {
    logger.error(`Fehler beim Erstellen des Tool-Artefakts: ${error}`);
    return {
      success: false,
      message: `Fehler beim Erstellen des Tool-Artefakts: ${error}`
    };
  }
}

/**
 * Führt ein Tool über ein Artefakt aus
 * 
 * @param artifactId ID des Artefakts
 * @param parameters Parameter für den Tool-Aufruf
 * @param approvalToken Genehmigungstoken (falls Genehmigung erforderlich)
 * @returns Ergebnis des Tool-Aufrufs
 */
export async function executeToolArtifactTool(
  artifactId: string,
  parameters: Record<string, any>,
  approvalToken?: string
): Promise<{
  success: boolean;
  requiresApproval?: boolean;
  message?: string;
  result?: any;
  executionTime?: number;
  usageCount?: number;
  remainingUsage?: number | null;
}> {
  try {
    logger.info(`Führe Tool-Artefakt aus: ${artifactId}`);
    
    // Prüfen, ob das Artefakt gültig ist
    const validationResult = await isArtifactValid(artifactId);
    if (!validationResult.valid) {
      logger.error(`Artefakt ${artifactId} ist ungültig: ${validationResult.reason}`);
      return {
        success: false,
        message: validationResult.reason
      };
    }
    
    const artifact = validationResult.artifact!;
    
    // Parameter validieren
    const allowedParameters = JSON.parse(artifact.allowed_parameters);
    const validation = validateParameters(parameters, allowedParameters);
    
    if (!validation.valid) {
      logger.error(`Ungültige Parameter für Artefakt ${artifactId}: ${validation.errors.join(', ')}`);
      return {
        success: false,
        message: `Ungültige Parameter: ${validation.errors.join(', ')}`
      };
    }
    
    // Standardwerte anwenden
    const finalParameters = applyDefaultParameters(parameters, allowedParameters);
    
    // Prüfen, ob eine Genehmigung erforderlich ist
    if (artifact.required_approval) {
      // Wenn kein Token angegeben wurde, Genehmigung anfordern
      if (!approvalToken) {
        logger.info(`Artefakt ${artifactId} erfordert Genehmigung`);
        return {
          success: false,
          requiresApproval: true,
          message: 'Dieses Tool erfordert eine Genehmigung'
        };
      }
      
      // Token validieren
      const tokenValidation = await validateAndUseApprovalToken(approvalToken, artifactId);
      if (!tokenValidation.valid) {
        logger.error(`Ungültiges Genehmigungstoken für Artefakt ${artifactId}: ${tokenValidation.reason}`);
        return {
          success: false,
          message: tokenValidation.reason
        };
      }
      
      // Parameter aus dem Token verwenden, falls vorhanden
      if (tokenValidation.parameters) {
        // Parameter aus dem Token mit den übergebenen Parametern zusammenführen
        // Dabei haben die übergebenen Parameter Vorrang
        for (const [key, value] of Object.entries(tokenValidation.parameters)) {
          if (finalParameters[key] === undefined) {
            finalParameters[key] = value;
          }
        }
      }
    }
    
    // Tool abrufen
    const tool = getToolByName(artifact.tool_name);
    if (!tool) {
      logger.error(`Tool '${artifact.tool_name}' nicht gefunden`);
      return {
        success: false,
        message: `Tool '${artifact.tool_name}' nicht gefunden`
      };
    }
    
    // Tool ausführen und Zeit messen
    const startTime = Date.now();
    const result = await tool.func(...Object.values(finalParameters));
    const executionTime = Date.now() - startTime;
    
    // Nutzungszähler erhöhen
    const usageCount = await incrementArtifactUsage(artifactId);
    
    // Ergebnis speichern, wenn aktiviert
    if (artifact.data_storage_enabled && artifact.data_storage_store_results) {
      await storeToolResult(
        artifactId,
        artifact.tool_name,
        finalParameters,
        result,
        null // userId könnte hier übergeben werden
      );
    }
    
    // Verbleibende Nutzungen berechnen
    const remainingUsage = artifact.max_usage !== null
      ? Math.max(0, artifact.max_usage - usageCount)
      : null;
    
    logger.info(`Tool-Artefakt ${artifactId} erfolgreich ausgeführt (${executionTime}ms)`);
    
    return {
      success: true,
      result,
      executionTime,
      usageCount,
      remainingUsage
    };
  } catch (error) {
    logger.error(`Fehler bei der Ausführung des Tool-Artefakts ${artifactId}: ${error}`);
    return {
      success: false,
      message: `Fehler bei der Ausführung: ${error}`
    };
  }
}

/**
 * Ruft gespeicherte Tool-Ergebnisse aus der Datenbank ab
 * 
 * @param artifactId ID des Artefakts
 * @param limit Maximale Anzahl der Ergebnisse
 * @returns Liste der gespeicherten Ergebnisse
 */
export async function getToolResultsTool(
  artifactId: string,
  limit: number = 10
): Promise<{
  success: boolean;
  message?: string;
  artifact?: {
    id: string;
    name: string;
    tool_name: string;
  };
  resultCount?: number;
  results?: Array<{
    parameters: Record<string, any>;
    result: any;
    executedAt: string;
    userId: string | null;
  }>;
}> {
  try {
    logger.info(`Rufe Ergebnisse für Artefakt ${artifactId} ab (Limit: ${limit})`);
    
    // Prüfen, ob das Artefakt existiert
    const artifact = await getArtifactById(artifactId);
    if (!artifact) {
      logger.error(`Artefakt ${artifactId} nicht gefunden`);
      return {
        success: false,
        message: 'Artefakt nicht gefunden'
      };
    }
    
    // Prüfen, ob Ergebnisspeicherung aktiviert ist
    if (!artifact.data_storage_enabled || !artifact.data_storage_store_results) {
      logger.error(`Ergebnisspeicherung für Artefakt ${artifactId} nicht aktiviert`);
      return {
        success: false,
        message: 'Ergebnisspeicherung für dieses Artefakt nicht aktiviert'
      };
    }
    
    // Ergebnisse abrufen
    const toolResults = await getToolResults(artifactId, limit);
    
    // Ergebnisse formatieren
    const formattedResults = toolResults.map(result => ({
      parameters: JSON.parse(result.parameters),
      result: JSON.parse(result.result),
      executedAt: result.executed_at.toISOString(),
      userId: result.user_id
    }));
    
    logger.info(`${formattedResults.length} Ergebnisse für Artefakt ${artifactId} abgerufen`);
    
    return {
      success: true,
      artifact: {
        id: artifact.id,
        name: artifact.name,
        tool_name: artifact.tool_name
      },
      resultCount: formattedResults.length,
      results: formattedResults
    };
  } catch (error) {
    logger.error(`Fehler beim Abrufen der Ergebnisse für Artefakt ${artifactId}: ${error}`);
    return {
      success: false,
      message: `Fehler beim Abrufen der Ergebnisse: ${error}`
    };
  }
}

/**
 * Generiert ein Genehmigungstoken für einen Artefakt-Tool-Aufruf
 * 
 * @param artifactId ID des Artefakts
 * @param userId ID des genehmigenden Benutzers
 * @param parameters Parameter für den Tool-Aufruf
 * @returns Genehmigungstoken
 */
export async function approveToolExecutionTool(
  artifactId: string,
  userId: string,
  parameters: Record<string, any>
): Promise<{
  success: boolean;
  message?: string;
  token?: string;
  expiresIn?: number;
}> {
  try {
    logger.info(`Generiere Genehmigungstoken für Artefakt ${artifactId}`);
    
    // Prüfen, ob das Artefakt gültig ist
    const validationResult = await isArtifactValid(artifactId);
    if (!validationResult.valid) {
      logger.error(`Artefakt ${artifactId} ist ungültig: ${validationResult.reason}`);
      return {
        success: false,
        message: validationResult.reason
      };
    }
    
    const artifact = validationResult.artifact!;
    
    // Parameter validieren
    const allowedParameters = JSON.parse(artifact.allowed_parameters);
    const validation = validateParameters(parameters, allowedParameters);
    
    if (!validation.valid) {
      logger.error(`Ungültige Parameter für Artefakt ${artifactId}: ${validation.errors.join(', ')}`);
      return {
        success: false,
        message: `Ungültige Parameter: ${validation.errors.join(', ')}`
      };
    }
    
    // Standardwerte anwenden
    const finalParameters = applyDefaultParameters(parameters, allowedParameters);
    
    // Token erstellen (gültig für 1 Stunde)
    const expiresInMinutes = 60;
    const approval = await dbCreateApprovalToken(
      artifactId,
      finalParameters,
      userId,
      expiresInMinutes
    );
    
    logger.info(`Genehmigungstoken für Artefakt ${artifactId} erstellt: ${approval.token}`);
    
    return {
      success: true,
      token: approval.token,
      expiresIn: expiresInMinutes * 60 // in Sekunden
    };
  } catch (error) {
    logger.error(`Fehler beim Generieren des Genehmigungstokens für Artefakt ${artifactId}: ${error}`);
    return {
      success: false,
      message: `Fehler beim Generieren des Genehmigungstokens: ${error}`
    };
  }
}

/**
 * Listet verfügbare Artefakte für einen Benutzer auf
 * 
 * @param userId ID des Benutzers
 * @param includeExpired Ob abgelaufene Artefakte eingeschlossen werden sollen
 * @returns Liste der verfügbaren Artefakte
 */
export async function listArtifactsTool(
  userId: string,
  includeExpired: boolean = false
): Promise<{
  success: boolean;
  message?: string;
  count?: number;
  artifacts?: Array<{
    id: string;
    name: string;
    description: string;
    toolName: string;
    url: string;
    requiredApproval: boolean;
    createdAt: string;
    expiresAt?: string;
    usageCount: number;
    maxUsage?: number;
    isExpired?: boolean;
    hasReachedMaxUsage?: boolean;
  }>;
}> {
  try {
    logger.info(`Liste Artefakte für Benutzer ${userId} auf (includeExpired: ${includeExpired})`);
    
    // Artefakte abrufen
    const artifacts = await listArtifactsForUser(userId, includeExpired);
    
    // Aktuelle Zeit für Ablaufprüfung
    const now = new Date();
    
    // Artefakte formatieren
    const formattedArtifacts = artifacts.map(artifact => {
      const isExpired = artifact.expires_at ? artifact.expires_at < now : false;
      const hasReachedMaxUsage = artifact.max_usage !== null && artifact.usage_count >= artifact.max_usage;
      
      return {
        id: artifact.id,
        name: artifact.name,
        description: artifact.description || '',
        toolName: artifact.tool_name,
        url: `claude://artifacts/tool/${artifact.id}`,
        requiredApproval: artifact.required_approval,
        createdAt: artifact.created_at.toISOString(),
        expiresAt: artifact.expires_at ? artifact.expires_at.toISOString() : undefined,
        usageCount: artifact.usage_count,
        maxUsage: artifact.max_usage,
        isExpired,
        hasReachedMaxUsage
      };
    });
    
    logger.info(`${formattedArtifacts.length} Artefakte für Benutzer ${userId} gefunden`);
    
    return {
      success: true,
      count: formattedArtifacts.length,
      artifacts: formattedArtifacts
    };
  } catch (error) {
    logger.error(`Fehler beim Auflisten der Artefakte für Benutzer ${userId}: ${error}`);
    return {
      success: false,
      message: `Fehler beim Auflisten der Artefakte: ${error}`
    };
  }
}

/**
 * Bereinigt alte Artefakt-Daten
 */
export async function cleanupArtifactDataTool(
  retentionDays: number = RESULTS_RETENTION_DAYS
): Promise<{
  success: boolean;
  message?: string;
  deletedResults?: number;
  deletedApprovals?: number;
}> {
  try {
    logger.info(`Bereinige Artefakt-Daten (Aufbewahrungsdauer: ${retentionDays} Tage)`);
    
    const result = await cleanupArtifactData(retentionDays);
    
    logger.info(`Bereinigung abgeschlossen: ${result.deletedResults} Ergebnisse, ${result.deletedApprovals} Tokens gelöscht`);
    
    return {
      success: true,
      deletedResults: result.deletedResults,
      deletedApprovals: result.deletedApprovals
    };
  } catch (error) {
    logger.error(`Fehler bei der Bereinigung der Artefakt-Daten: ${error}`);
    return {
      success: false,
      message: `Fehler bei der Bereinigung der Artefakt-Daten: ${error}`
    };
  }
}

/**
 * Validiert Parameter gegen ein Schema
 */
function validateParameters(
  parameters: Record<string, any>,
  allowedParameters: Record<string, any>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Prüfen, ob alle erforderlichen Parameter vorhanden sind
  for (const [key, schema] of Object.entries(allowedParameters)) {
    if (schema.required && (parameters[key] === undefined || parameters[key] === null)) {
      errors.push(`Parameter '${key}' ist erforderlich`);
    }
  }
  
  // Prüfen, ob alle Parameter im Schema definiert sind
  for (const key of Object.keys(parameters)) {
    if (!allowedParameters[key]) {
      errors.push(`Parameter '${key}' ist nicht erlaubt`);
    }
  }
  
  // Prüfen, ob die Parameter den richtigen Typ haben und gültige Werte enthalten
  for (const [key, value] of Object.entries(parameters)) {
    const schema = allowedParameters[key];
    if (!schema) continue;
    
    // Typprüfung
    if (schema.type === 'string' && typeof value !== 'string') {
      errors.push(`Parameter '${key}' muss ein String sein`);
    } else if (schema.type === 'number' && typeof value !== 'number') {
      errors.push(`Parameter '${key}' muss eine Zahl sein`);
    } else if (schema.type === 'boolean' && typeof value !== 'boolean') {
      errors.push(`Parameter '${key}' muss ein Boolean sein`);
    } else if (schema.type === 'array' && !Array.isArray(value)) {
      errors.push(`Parameter '${key}' muss ein Array sein`);
    } else if (schema.type === 'object' && (typeof value !== 'object' || Array.isArray(value) || value === null)) {
      errors.push(`Parameter '${key}' muss ein Objekt sein`);
    }
    
    // Enum-Prüfung
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`Parameter '${key}' muss einer der folgenden Werte sein: ${schema.enum.join(', ')}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Füllt fehlende Parameter mit Standardwerten auf
 */
function applyDefaultParameters(
  parameters: Record<string, any>,
  allowedParameters: Record<string, any>
): Record<string, any> {
  const result = { ...parameters };
  
  for (const [key, schema] of Object.entries(allowedParameters)) {
    if (result[key] === undefined && schema.default !== undefined) {
      result[key] = schema.default;
    }
  }
  
  return result;
}

/**
 * Erstellt ein neues Workflow-Artefakt für Claude.ai Desktop
 * 
 * @param name Name des Artefakts
 * @param description Beschreibung des Artefakts
 * @param workflowId ID des auszuführenden Workflows
 * @param allowedParameters Erlaubte Parameter und deren Wertebereiche
 * @param options Zusätzliche Optionen für das Artefakt
 * @returns Erstelltes Artefakt mit URL zur Verwendung in Claude.ai Desktop
 */
export async function createWorkflowArtifactTool(
  name: string,
  description: string,
  workflowId: string,
  allowedParameters: Record<string, any>,
  options: {
    requiredApproval?: boolean;
    userId?: string;
    expiresAfterDays?: number;
    maxUsage?: number;
    enableDataStorage?: boolean;
    dbTable?: string;
    storeResults?: boolean;
  } = {}
): Promise<{
  success: boolean;
  message?: string;
  artifact?: {
    id: string;
    name: string;
    description: string;
    workflowId: string;
    url: string;
    requiredApproval: boolean;
    expiresAt?: string;
    maxUsage?: number;
  }
}> {
  try {
    logger.info(`Erstelle Workflow-Artefakt: ${name} für Workflow: ${workflowId}`);
    
    // Überprüfen, ob der Workflow existiert
    const availableWorkflows = workflowManager.getAvailableWorkflows();
    if (!availableWorkflows.includes(workflowId)) {
      logger.error(`Workflow nicht gefunden: ${workflowId}`);
      return {
        success: false,
        message: `Workflow nicht gefunden: ${workflowId}`
      };
    }
    
    // Artefakt-ID generieren
    const artifactId = uuidv4();
    
    // Ablaufdatum berechnen
    const expiresAfterDays = options.expiresAfterDays ?? DEFAULT_EXPIRY_DAYS;
    const expiresAt = expiresAfterDays > 0 
      ? new Date(Date.now() + expiresAfterDays * 24 * 60 * 60 * 1000).toISOString()
      : undefined;
    
    // Artefakt erstellen
    const artifact = await createArtifact({
      id: artifactId,
      name,
      description,
      type: 'workflow',
      tool_name: null,
      workflow_id: workflowId,
      allowed_parameters: allowedParameters,
      required_approval: options.requiredApproval ?? true,
      user_id: options.userId,
      expires_at: expiresAt,
      max_usage: options.maxUsage,
      store_results: options.storeResults ?? true,
      created_at: new Date().toISOString(),
      usage_count: 0
    });
    
    // Claude.ai Desktop URL generieren
    const url = `claude://artifact/${artifactId}`;
    
    return {
      success: true,
      artifact: {
        id: artifactId,
        name,
        description,
        workflowId,
        url,
        requiredApproval: options.requiredApproval ?? true,
        expiresAt,
        maxUsage: options.maxUsage
      }
    };
  } catch (error) {
    logger.error(`Fehler beim Erstellen des Workflow-Artefakts: ${error}`);
    return {
      success: false,
      message: `Fehler beim Erstellen des Workflow-Artefakts: ${error.message}`
    };
  }
}

/**
 * Führt ein Workflow-Artefakt aus
 * 
 * @param artifactId ID des Artefakts
 * @param parameters Parameter für die Workflow-Ausführung
 * @param approvalToken Genehmigungstoken (falls erforderlich)
 * @returns Ergebnis der Workflow-Ausführung
 */
export async function executeWorkflowArtifactTool(
  artifactId: string,
  parameters: Record<string, any>,
  approvalToken?: string
): Promise<{
  success: boolean;
  requiresApproval?: boolean;
  message?: string;
  result?: any;
  executionTime?: number;
  usageCount?: number;
  remainingUsage?: number | null;
}> {
  try {
    logger.info(`Führe Workflow-Artefakt aus: ${artifactId}`);
    const startTime = Date.now();
    
    // Artefakt aus der Datenbank abrufen
    const artifact = await getArtifactById(artifactId);
    if (!artifact) {
      return {
        success: false,
        message: `Artefakt nicht gefunden: ${artifactId}`
      };
    }
    
    // Überprüfen, ob es sich um ein Workflow-Artefakt handelt
    if (artifact.type !== 'workflow' || !artifact.workflow_id) {
      return {
        success: false,
        message: `Ungültiger Artefakttyp. Erwartet: workflow, Erhalten: ${artifact.type}`
      };
    }
    
    // Überprüfe, ob das Artefakt gültig ist (nicht abgelaufen, Nutzungslimit nicht erreicht)
    const validationResult = await isArtifactValid(artifactId);
    if (!validationResult.valid) {
      return {
        success: false,
        message: validationResult.message
      };
    }
    
    // Überprüfe, ob Genehmigung erforderlich ist
    if (artifact.required_approval) {
      // Wenn kein Token bereitgestellt wurde, Genehmigung anfordern
      if (!approvalToken) {
        return {
          success: false,
          requiresApproval: true,
          message: 'Genehmigung erforderlich für die Ausführung dieses Artefakts'
        };
      }
      
      // Token überprüfen
      const tokenValidation = await validateAndUseApprovalToken(artifactId, approvalToken);
      if (!tokenValidation.valid) {
        return {
          success: false,
          message: `Ungültiges oder abgelaufenes Genehmigungstoken: ${tokenValidation.message}`
        };
      }
    }
    
    // Parameter validieren
    const paramValidation = validateParameters(parameters, artifact.allowed_parameters);
    if (!paramValidation.valid) {
      return {
        success: false,
        message: `Ungültige Parameter: ${paramValidation.errors.join(', ')}`
      };
    }
    
    // Workflow-ID abrufen
    const workflowId = artifact.workflow_id;
    
    // Prüfen, ob der Workflow existiert
    const availableWorkflows = workflowManager.getAvailableWorkflows();
    if (!availableWorkflows.includes(workflowId)) {
      return {
        success: false,
        message: `Workflow nicht gefunden: ${workflowId}`
      };
    }
    
    // Workflow ausführen
    logger.info(`Führe Workflow aus: ${workflowId} mit Parametern:`, parameters);
    const result = await workflowManager.executeWorkflow(workflowId, parameters);
    
    // Nutzungszähler erhöhen
    const usageResult = await incrementArtifactUsage(artifactId);
    
    // Ausführungszeit berechnen
    const executionTime = Date.now() - startTime;
    
    // Ergebnis speichern, wenn aktiviert
    if (artifact.store_results) {
      await storeToolResult({
        artifact_id: artifactId,
        parameters,
        result,
        executed_at: new Date().toISOString(),
        execution_time: executionTime,
        user_id: null  // TODO: Benutzer-ID hinzufügen, wenn verfügbar
      });
    }
    
    return {
      success: true,
      result,
      executionTime,
      usageCount: usageResult.usageCount,
      remainingUsage: usageResult.remainingUsage
    };
  } catch (error) {
    logger.error(`Fehler bei der Ausführung des Workflow-Artefakts: ${error}`);
    return {
      success: false,
      message: `Fehler bei der Ausführung des Workflow-Artefakts: ${error.message}`
    };
  }
} 