/**
 * Sicherheitsmaßnahmen für Artefakt-Tool-Integration
 */
import * as crypto from 'crypto';
import { logger } from '../utils/logger';
import { approvals } from '../db/models/artifacts';

// Konfiguration
const APPROVAL_TOKEN_EXPIRY = 5 * 60 * 1000; // 5 Minuten in Millisekunden

/**
 * Generiert ein Genehmigungstoken für einen Artefakt-Tool-Aufruf
 * 
 * @param artifactId ID des Artefakts
 * @param userId ID des genehmigenden Benutzers
 * @param parameters Parameter für den Tool-Aufruf
 * @returns Genehmigungstoken
 */
export async function generateApprovalToken(
  artifactId: string,
  userId: string,
  parameters: Record<string, any>
): Promise<string> {
  // Generiere zufälliges Token
  const token = crypto.randomBytes(32).toString('hex');
  
  // Setze Ablaufzeit
  const expiresAt = new Date();
  expiresAt.setTime(expiresAt.getTime() + APPROVAL_TOKEN_EXPIRY);
  
  // Speichere Token in Datenbank
  await approvals.create({
    artifact_id: artifactId,
    token,
    parameters,
    user_id: userId,
    created_at: new Date(),
    expires_at: expiresAt,
    used: false
  });
  
  logger.info(`Genehmigungstoken für Artefakt ${artifactId} generiert`);
  
  return token;
}

/**
 * Verifiziert ein Genehmigungstoken
 * 
 * @param artifactId ID des Artefakts
 * @param token Genehmigungstoken
 * @returns Wahrheitswert, ob Token gültig ist und die Parameter
 */
export async function verifyApprovalToken(
  artifactId: string,
  token: string
): Promise<{ valid: boolean; parameters?: Record<string, any> }> {
  try {
    // Suche Token in Datenbank
    const approval = await approvals.findValidToken(token, artifactId);
    
    if (!approval) {
      logger.warn(`Ungültiges Genehmigungstoken für Artefakt ${artifactId}`);
      return { valid: false };
    }
    
    // Markiere Token als verwendet
    await approvals.markAsUsed(token);
    
    logger.info(`Genehmigungstoken für Artefakt ${artifactId} verifiziert`);
    
    return { 
      valid: true,
      parameters: approval.parameters
    };
  } catch (error) {
    logger.error('Fehler bei der Token-Verifizierung', error);
    return { valid: false };
  }
}

/**
 * Validiert Parameter gegen zulässige Parameterdefinitionen
 * 
 * @param parameters Eingabeparameter
 * @param allowedParameters Erlaubte Parameterdefinitionen
 * @throws Error wenn Parameter ungültig sind
 */
export function validateParameters(
  parameters: Record<string, any>,
  allowedParameters: Record<string, any>
): void {
  // Prüfe, ob alle erforderlichen Parameter vorhanden sind
  for (const [key, paramDef] of Object.entries(allowedParameters)) {
    if (paramDef.required && (parameters[key] === undefined || parameters[key] === null)) {
      throw new Error(`Erforderlicher Parameter "${key}" fehlt`);
    }
  }
  
  // Prüfe, ob alle Parameter zulässig sind
  for (const [key, value] of Object.entries(parameters)) {
    const paramDef = allowedParameters[key];
    
    if (!paramDef) {
      throw new Error(`Unbekannter Parameter "${key}"`);
    }
    
    // Typprüfung
    const type = typeof value;
    const expectedType = paramDef.type;
    
    if (expectedType === 'array' && !Array.isArray(value)) {
      throw new Error(`Parameter "${key}" muss vom Typ Array sein`);
    } else if (expectedType !== 'array' && type !== expectedType) {
      throw new Error(`Parameter "${key}" muss vom Typ ${expectedType} sein, ist aber ${type}`);
    }
    
    // Enumeration prüfen
    if (paramDef.enum && !paramDef.enum.includes(value)) {
      throw new Error(`Parameter "${key}" muss einer der folgenden Werte sein: ${paramDef.enum.join(', ')}`);
    }
  }
}

/**
 * Bereitet Parameter für einen Tool-Aufruf vor
 * 
 * @param parameters Eingegebene Parameter
 * @param allowedParameters Erlaubte Parameterdefinitionen
 * @returns Aufbereitete Parameter mit Standardwerten
 */
export function prepareParameters(
  parameters: Record<string, any>,
  allowedParameters: Record<string, any>
): Record<string, any> {
  const result: Record<string, any> = { ...parameters };
  
  // Füge Standardwerte für fehlende Parameter hinzu
  for (const [key, paramDef] of Object.entries(allowedParameters)) {
    if (parameters[key] === undefined && 'default' in paramDef) {
      result[key] = paramDef.default;
    }
  }
  
  return result;
} 