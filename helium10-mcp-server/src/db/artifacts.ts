/**
 * artifacts.ts
 * 
 * Datenbank-Schnittstelle für die Verwaltung von Artefakten.
 * Stellt Funktionen für das Erstellen, Abfragen und Verwalten von Tool- und Workflow-Artefakten bereit.
 */

import { v4 as uuidv4 } from 'uuid';
import knex from './database';
import { logger } from '../utils/logger';

/**
 * Artefakt-Typen
 */
export type ArtifactType = 'tool' | 'workflow';

/**
 * Status eines Artefakts
 */
export type ArtifactStatus = 'active' | 'expired' | 'maxed' | 'disabled';

/**
 * Artefakt-Struktur in der Datenbank
 */
export interface Artifact {
  id: string;
  name: string;
  description: string;
  type: ArtifactType;
  toolName?: string;
  workflowId?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  userId?: string;
  requiredApproval: boolean;
  maxUsage: number;
  currentUsage: number;
  allowedParameters: Record<string, any>;
  status: ArtifactStatus;
  url: string;
  storeResults: boolean;
}

/**
 * Struktur für die Erstellung eines Artefakts
 */
export interface CreateArtifactParams {
  name: string;
  description: string;
  type: ArtifactType;
  toolName?: string;
  workflowId?: string;
  userId?: string;
  requiredApproval?: boolean;
  expiresAfterDays?: number;
  maxUsage?: number;
  allowedParameters?: Record<string, any>;
  storeResults?: boolean;
}

/**
 * Struktur einer Artefakt-Ausführung
 */
export interface ArtifactExecution {
  id: string;
  artifactId: string;
  executedAt: string;
  parameters: Record<string, any>;
  result?: any;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';
  approved?: boolean;
  approvalToken?: string;
  approvedBy?: string;
  approvedAt?: string;
  error?: string;
  executionTime?: number;
}

/**
 * Erstellt ein neues Tool-Artefakt
 * @param params Parameter für die Artefakterstellung
 * @returns Das erstellte Artefakt
 */
export async function createToolArtifact(params: CreateArtifactParams): Promise<Artifact> {
  try {
    const now = new Date().toISOString();
    const artifactId = `art_${uuidv4().replace(/-/g, '')}`;
    
    // Berechne das Ablaufdatum, falls angegeben
    let expiresAt = null;
    if (params.expiresAfterDays && params.expiresAfterDays > 0) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + params.expiresAfterDays);
      expiresAt = expDate.toISOString();
    }
    
    // Erstelle die Artefakt-URL
    const url = `claude://artifacts/tool/${artifactId}`;
    
    // Erstelle das Artefakt-Objekt
    const artifact: Partial<Artifact> = {
      id: artifactId,
      name: params.name,
      description: params.description,
      type: 'tool',
      toolName: params.toolName,
      createdAt: now,
      updatedAt: now,
      expiresAt: expiresAt,
      userId: params.userId,
      requiredApproval: params.requiredApproval !== undefined ? params.requiredApproval : true,
      maxUsage: params.maxUsage !== undefined ? params.maxUsage : 0,
      currentUsage: 0,
      allowedParameters: params.allowedParameters || {},
      status: 'active',
      url: url,
      storeResults: params.storeResults !== undefined ? params.storeResults : true
    };
    
    // Speichere das Artefakt in der Datenbank
    await knex('artifacts').insert(artifact);
    
    logger.info(`Tool-Artefakt erstellt: ${artifactId}`);
    
    return artifact as Artifact;
  } catch (error) {
    logger.error(`Fehler beim Erstellen eines Tool-Artefakts: ${error.message}`, error);
    throw new Error(`Fehler beim Erstellen eines Tool-Artefakts: ${error.message}`);
  }
}

/**
 * Erstellt ein neues Workflow-Artefakt
 * @param params Parameter für die Artefakterstellung
 * @returns Das erstellte Artefakt
 */
export async function createWorkflowArtifact(params: CreateArtifactParams): Promise<Artifact> {
  try {
    if (!params.workflowId) {
      throw new Error('workflowId ist erforderlich für ein Workflow-Artefakt');
    }
    
    const now = new Date().toISOString();
    const artifactId = `art_${uuidv4().replace(/-/g, '')}`;
    
    // Berechne das Ablaufdatum, falls angegeben
    let expiresAt = null;
    if (params.expiresAfterDays && params.expiresAfterDays > 0) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + params.expiresAfterDays);
      expiresAt = expDate.toISOString();
    }
    
    // Erstelle die Artefakt-URL
    const url = `claude://artifacts/workflow/${artifactId}`;
    
    // Erstelle das Artefakt-Objekt
    const artifact: Partial<Artifact> = {
      id: artifactId,
      name: params.name,
      description: params.description,
      type: 'workflow',
      workflowId: params.workflowId,
      createdAt: now,
      updatedAt: now,
      expiresAt: expiresAt,
      userId: params.userId,
      requiredApproval: params.requiredApproval !== undefined ? params.requiredApproval : true,
      maxUsage: params.maxUsage !== undefined ? params.maxUsage : 0,
      currentUsage: 0,
      allowedParameters: params.allowedParameters || {},
      status: 'active',
      url: url,
      storeResults: params.storeResults !== undefined ? params.storeResults : true
    };
    
    // Speichere das Artefakt in der Datenbank
    await knex('artifacts').insert(artifact);
    
    logger.info(`Workflow-Artefakt erstellt: ${artifactId}`);
    
    return artifact as Artifact;
  } catch (error) {
    logger.error(`Fehler beim Erstellen eines Workflow-Artefakts: ${error.message}`, error);
    throw new Error(`Fehler beim Erstellen eines Workflow-Artefakts: ${error.message}`);
  }
}

/**
 * Ruft ein Artefakt anhand seiner ID ab
 * @param artifactId ID des Artefakts
 * @returns Das Artefakt oder null, falls nicht gefunden
 */
export async function getArtifactById(artifactId: string): Promise<Artifact | null> {
  try {
    const artifact = await knex('artifacts')
      .where('id', artifactId)
      .first();
    
    return artifact || null;
  } catch (error) {
    logger.error(`Fehler beim Abrufen des Artefakts mit ID ${artifactId}: ${error.message}`, error);
    throw new Error(`Fehler beim Abrufen des Artefakts: ${error.message}`);
  }
}

/**
 * Prüft, ob ein Artefakt ausgeführt werden kann
 * @param artifactId ID des Artefakts
 * @returns Prüfergebnis mit Status und ggf. Fehlermeldung
 */
export async function canExecuteArtifact(artifactId: string): Promise<{ canExecute: boolean; message?: string; }> {
  try {
    const artifact = await getArtifactById(artifactId);
    
    if (!artifact) {
      return { canExecute: false, message: 'Artefakt nicht gefunden' };
    }
    
    // Prüfe auf abgelaufene Artefakte
    if (artifact.expiresAt && new Date(artifact.expiresAt) < new Date()) {
      // Aktualisiere den Status des Artefakts
      await knex('artifacts')
        .where('id', artifactId)
        .update({
          status: 'expired',
          updatedAt: new Date().toISOString()
        });
      
      return { canExecute: false, message: 'Artefakt ist abgelaufen' };
    }
    
    // Prüfe auf Nutzungslimits
    if (artifact.maxUsage > 0 && artifact.currentUsage >= artifact.maxUsage) {
      // Aktualisiere den Status des Artefakts
      await knex('artifacts')
        .where('id', artifactId)
        .update({
          status: 'maxed',
          updatedAt: new Date().toISOString()
        });
      
      return { canExecute: false, message: 'Maximale Nutzung erreicht' };
    }
    
    // Prüfe auf deaktivierte Artefakte
    if (artifact.status === 'disabled') {
      return { canExecute: false, message: 'Artefakt ist deaktiviert' };
    }
    
    return { canExecute: true };
  } catch (error) {
    logger.error(`Fehler beim Prüfen der Ausführbarkeit des Artefakts ${artifactId}: ${error.message}`, error);
    throw new Error(`Fehler beim Prüfen der Ausführbarkeit: ${error.message}`);
  }
}

/**
 * Erstellt einen Ausführungseintrag für ein Artefakt
 * @param artifactId ID des Artefakts
 * @param params Parameter für die Ausführung
 * @returns Die erstellte Ausführung
 */
export async function createArtifactExecution(
  artifactId: string,
  params: Record<string, any>
): Promise<ArtifactExecution> {
  try {
    const artifact = await getArtifactById(artifactId);
    
    if (!artifact) {
      throw new Error('Artefakt nicht gefunden');
    }
    
    const now = new Date().toISOString();
    const executionId = `exec_${uuidv4().replace(/-/g, '')}`;
    
    // Erstelle einen Genehmigungstoken, falls erforderlich
    let approvalToken = null;
    if (artifact.requiredApproval) {
      approvalToken = `tok_${uuidv4().replace(/-/g, '')}`;
    }
    
    // Erstelle den Ausführungseintrag
    const execution: ArtifactExecution = {
      id: executionId,
      artifactId,
      executedAt: now,
      parameters: params,
      status: artifact.requiredApproval ? 'pending' : 'completed',
      approvalToken,
    };
    
    // Speichere die Ausführung in der Datenbank
    await knex('artifact_executions').insert(execution);
    
    // Erhöhe den Nutzungszähler des Artefakts
    await knex('artifacts')
      .where('id', artifactId)
      .increment('currentUsage', 1)
      .update({
        updatedAt: now
      });
    
    logger.info(`Ausführung erstellt für Artefakt ${artifactId}: ${executionId}`);
    
    return execution;
  } catch (error) {
    logger.error(`Fehler beim Erstellen einer Ausführung für Artefakt ${artifactId}: ${error.message}`, error);
    throw new Error(`Fehler beim Erstellen einer Ausführung: ${error.message}`);
  }
}

/**
 * Genehmigt eine Artefakt-Ausführung
 * @param executionId ID der Ausführung
 * @param approvalToken Genehmigungstoken
 * @param approvedBy Benutzer, der die Genehmigung durchführt
 * @returns Die aktualisierte Ausführung
 */
export async function approveArtifactExecution(
  executionId: string,
  approvalToken: string,
  approvedBy?: string
): Promise<ArtifactExecution> {
  try {
    // Suche die Ausführung in der Datenbank
    const execution = await knex('artifact_executions')
      .where('id', executionId)
      .first();
    
    if (!execution) {
      throw new Error('Ausführung nicht gefunden');
    }
    
    if (execution.status !== 'pending') {
      throw new Error('Ausführung ist nicht im Status "pending"');
    }
    
    if (execution.approvalToken !== approvalToken) {
      throw new Error('Ungültiger Genehmigungstoken');
    }
    
    const now = new Date().toISOString();
    
    // Aktualisiere die Ausführung
    const updatedExecution = {
      ...execution,
      status: 'approved',
      approved: true,
      approvedBy,
      approvedAt: now
    };
    
    // Speichere die Aktualisierung in der Datenbank
    await knex('artifact_executions')
      .where('id', executionId)
      .update({
        status: 'approved',
        approved: true,
        approvedBy,
        approvedAt: now
      });
    
    logger.info(`Ausführung genehmigt: ${executionId}`);
    
    return updatedExecution;
  } catch (error) {
    logger.error(`Fehler beim Genehmigen der Ausführung ${executionId}: ${error.message}`, error);
    throw new Error(`Fehler beim Genehmigen der Ausführung: ${error.message}`);
  }
}

/**
 * Speichert das Ergebnis einer Artefakt-Ausführung
 * @param executionId ID der Ausführung
 * @param result Ausführungsergebnis
 * @param status Status der Ausführung
 * @param error Fehler, falls aufgetreten
 * @param executionTime Ausführungszeit in Sekunden
 * @returns Die aktualisierte Ausführung
 */
export async function saveArtifactExecutionResult(
  executionId: string,
  result: any,
  status: 'completed' | 'failed',
  error?: string,
  executionTime?: number
): Promise<ArtifactExecution> {
  try {
    // Suche die Ausführung in der Datenbank
    const execution = await knex('artifact_executions')
      .where('id', executionId)
      .first();
    
    if (!execution) {
      throw new Error('Ausführung nicht gefunden');
    }
    
    // Aktualisiere die Ausführung
    const updatedExecution = {
      ...execution,
      result,
      status,
      error,
      executionTime
    };
    
    // Speichere die Aktualisierung in der Datenbank
    await knex('artifact_executions')
      .where('id', executionId)
      .update({
        result,
        status,
        error,
        executionTime
      });
    
    logger.info(`Ergebnis für Ausführung ${executionId} gespeichert`);
    
    return updatedExecution;
  } catch (error) {
    logger.error(`Fehler beim Speichern des Ergebnisses für Ausführung ${executionId}: ${error.message}`, error);
    throw new Error(`Fehler beim Speichern des Ergebnisses: ${error.message}`);
  }
}

/**
 * Ruft Artefakte basierend auf Filtern ab
 * @param options Filteroptionen
 * @returns Liste von Artefakten und Gesamtanzahl
 */
export async function listArtifacts(options: {
  page?: number;
  pageSize?: number;
  type?: ArtifactType;
  status?: ArtifactStatus;
  query?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
} = {}): Promise<{ artifacts: Artifact[]; total: number; }> {
  try {
    const page = options.page || 1;
    const pageSize = options.pageSize || 10;
    const offset = (page - 1) * pageSize;
    
    // Erstelle die Abfrage
    let query = knex('artifacts');
    
    // Wende Filter an
    if (options.type) {
      query = query.where('type', options.type);
    }
    
    if (options.status) {
      query = query.where('status', options.status);
    }
    
    if (options.userId) {
      query = query.where('userId', options.userId);
    }
    
    if (options.query) {
      query = query.where(function() {
        this.where('name', 'like', `%${options.query}%`)
          .orWhere('description', 'like', `%${options.query}%`)
          .orWhere('id', 'like', `%${options.query}%`)
          .orWhere('toolName', 'like', `%${options.query}%`);
      });
    }
    
    if (options.startDate && options.endDate) {
      query = query.whereBetween('createdAt', [options.startDate, options.endDate]);
    } else if (options.startDate) {
      query = query.where('createdAt', '>=', options.startDate);
    } else if (options.endDate) {
      query = query.where('createdAt', '<=', options.endDate);
    }
    
    // Zähle die Gesamtanzahl der passenden Datensätze
    const countQuery = query.clone();
    const { count } = await countQuery.count('id as count').first();
    const total = count;
    
    // Führe die paginierte Abfrage aus
    const artifacts = await query
      .orderBy('createdAt', 'desc')
      .limit(pageSize)
      .offset(offset);
    
    return {
      artifacts,
      total
    };
  } catch (error) {
    logger.error(`Fehler beim Abrufen der Artefakte: ${error.message}`, error);
    throw new Error(`Fehler beim Abrufen der Artefakte: ${error.message}`);
  }
}

/**
 * Ruft die Ausführungen eines Artefakts ab
 * @param artifactId ID des Artefakts
 * @param options Paginierungsoptionen
 * @returns Liste von Ausführungen und Gesamtanzahl
 */
export async function getArtifactExecutions(
  artifactId: string,
  options: {
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ executions: ArtifactExecution[]; total: number; }> {
  try {
    const limit = options.limit || 10;
    const offset = options.offset || 0;
    
    // Prüfe, ob das Artefakt existiert
    const artifact = await getArtifactById(artifactId);
    
    if (!artifact) {
      throw new Error('Artefakt nicht gefunden');
    }
    
    // Zähle die Gesamtanzahl der Ausführungen
    const { count } = await knex('artifact_executions')
      .where('artifactId', artifactId)
      .count('id as count')
      .first();
    
    // Rufe die Ausführungen ab
    const executions = await knex('artifact_executions')
      .where('artifactId', artifactId)
      .orderBy('executedAt', 'desc')
      .limit(limit)
      .offset(offset);
    
    return {
      executions,
      total: count
    };
  } catch (error) {
    logger.error(`Fehler beim Abrufen der Ausführungen für Artefakt ${artifactId}: ${error.message}`, error);
    throw new Error(`Fehler beim Abrufen der Ausführungen: ${error.message}`);
  }
}

/**
 * Löscht ein Artefakt
 * @param artifactId ID des Artefakts
 * @returns Ergebnis der Löschoperation
 */
export async function deleteArtifact(artifactId: string): Promise<boolean> {
  try {
    // Prüfe, ob das Artefakt existiert
    const artifact = await getArtifactById(artifactId);
    
    if (!artifact) {
      throw new Error('Artefakt nicht gefunden');
    }
    
    // Lösche die Ausführungen des Artefakts
    await knex('artifact_executions')
      .where('artifactId', artifactId)
      .delete();
    
    // Lösche das Artefakt
    await knex('artifacts')
      .where('id', artifactId)
      .delete();
    
    logger.info(`Artefakt gelöscht: ${artifactId}`);
    
    return true;
  } catch (error) {
    logger.error(`Fehler beim Löschen des Artefakts ${artifactId}: ${error.message}`, error);
    throw new Error(`Fehler beim Löschen des Artefakts: ${error.message}`);
  }
}

/**
 * Deaktiviert ein Artefakt (markiert es als 'disabled')
 * @param artifactId ID des Artefakts
 * @returns Das aktualisierte Artefakt
 */
export async function disableArtifact(artifactId: string): Promise<Artifact> {
  try {
    // Prüfe, ob das Artefakt existiert
    const artifact = await getArtifactById(artifactId);
    
    if (!artifact) {
      throw new Error('Artefakt nicht gefunden');
    }
    
    // Aktualisiere den Status des Artefakts
    await knex('artifacts')
      .where('id', artifactId)
      .update({
        status: 'disabled',
        updatedAt: new Date().toISOString()
      });
    
    logger.info(`Artefakt deaktiviert: ${artifactId}`);
    
    // Rufe das aktualisierte Artefakt ab
    const updatedArtifact = await getArtifactById(artifactId);
    
    return updatedArtifact;
  } catch (error) {
    logger.error(`Fehler beim Deaktivieren des Artefakts ${artifactId}: ${error.message}`, error);
    throw new Error(`Fehler beim Deaktivieren des Artefakts: ${error.message}`);
  }
}

/**
 * Aktualisiert die erlaubten Parameter eines Artefakts
 * @param artifactId ID des Artefakts
 * @param allowedParameters Neue erlaubte Parameter
 * @returns Das aktualisierte Artefakt
 */
export async function updateArtifactParameters(
  artifactId: string,
  allowedParameters: Record<string, any>
): Promise<Artifact> {
  try {
    // Prüfe, ob das Artefakt existiert
    const artifact = await getArtifactById(artifactId);
    
    if (!artifact) {
      throw new Error('Artefakt nicht gefunden');
    }
    
    // Aktualisiere die erlaubten Parameter
    await knex('artifacts')
      .where('id', artifactId)
      .update({
        allowedParameters,
        updatedAt: new Date().toISOString()
      });
    
    logger.info(`Parameter aktualisiert für Artefakt: ${artifactId}`);
    
    // Rufe das aktualisierte Artefakt ab
    const updatedArtifact = await getArtifactById(artifactId);
    
    return updatedArtifact;
  } catch (error) {
    logger.error(`Fehler beim Aktualisieren der Parameter für Artefakt ${artifactId}: ${error.message}`, error);
    throw new Error(`Fehler beim Aktualisieren der Parameter: ${error.message}`);
  }
} 