/**
 * protocol-handler.ts
 * 
 * Dieser Modul verarbeitet das claude:// Protokoll zur Integration mit Claude.ai Desktop.
 * Es ermöglicht die Verarbeitung von Anfragen, die über das benutzerdefinierte Protokoll empfangen werden.
 */

/**
 * Struktur eines Claude Protokoll-Parameters
 */
export interface ClaudeProtocolParameter {
  name: string;
  value: string | number | boolean | object;
}

/**
 * Struktur einer geparsten Claude Protokoll-URL
 */
export interface ParsedClaudeProtocolUrl {
  type: 'tool' | 'workflow' | 'approval' | 'unknown';
  id?: string;
  action?: string;
  parameters: Record<string, any>;
  rawUrl: string;
}

/**
 * Parst eine claude:// URL und extrahiert die darin enthaltenen Informationen
 * @param url Die claude:// URL
 * @returns Geparste Informationen aus der URL
 */
export function parseClaudeProtocolUrl(url: string): ParsedClaudeProtocolUrl {
  try {
    if (!url.startsWith('claude://')) {
      throw new Error('Ungültige Claude-Protokoll-URL: URL muss mit claude:// beginnen');
    }

    // Erstelle ein Standardergebnis
    const result: ParsedClaudeProtocolUrl = {
      type: 'unknown',
      parameters: {},
      rawUrl: url
    };

    // Entferne 'claude://' vom Anfang
    const path = url.substring(9);
    
    // Teile den Pfad in Basis-URL und Query-Parameter
    const [basePath, queryString] = path.split('?');
    const pathParts = basePath.split('/').filter(Boolean);
    
    // Extrahiere den Typ und die ID
    if (pathParts.length >= 2) {
      const [category, entityType] = pathParts;
      
      if (category === 'artifacts' || category === 'artifact') {
        if (entityType === 'tool') {
          result.type = 'tool';
        } else if (entityType === 'workflow') {
          result.type = 'workflow';
        }
        
        // Extrahiere die ID, falls vorhanden
        if (pathParts.length >= 3) {
          result.id = pathParts[2];
        }
        
        // Extrahiere die Aktion, falls vorhanden
        if (pathParts.length >= 4) {
          result.action = pathParts[3];
        }
      } else if (category === 'approve' || category === 'approval') {
        result.type = 'approval';
        result.id = entityType; // Die ID ist in diesem Fall der zweite Teil
        
        // Extrahiere den Token, falls vorhanden
        if (pathParts.length >= 3) {
          result.parameters.token = pathParts[2];
        }
      }
    }
    
    // Parse query parameters
    if (queryString) {
      const params = new URLSearchParams(queryString);
      
      // Konvertiere Parameter in passende Typen
      params.forEach((value, key) => {
        // Versuche, JSON-Daten zu parsen, falls möglich
        try {
          // Prüfe, ob der Wert ein JSON-Objekt oder Array ist
          if ((value.startsWith('{') && value.endsWith('}')) || 
              (value.startsWith('[') && value.endsWith(']'))) {
            result.parameters[key] = JSON.parse(value);
          } 
          // Prüfe auf boolesche Werte
          else if (value.toLowerCase() === 'true') {
            result.parameters[key] = true;
          } else if (value.toLowerCase() === 'false') {
            result.parameters[key] = false;
          } 
          // Prüfe auf numerische Werte
          else if (!isNaN(Number(value)) && value.trim() !== '') {
            result.parameters[key] = Number(value);
          } 
          // Verwende den Wert als Zeichenfolge
          else {
            result.parameters[key] = value;
          }
        } catch (e) {
          // Bei Fehlern beim Parsen den Wert als Zeichenfolge verwenden
          result.parameters[key] = value;
        }
      });
    }
    
    return result;
  } catch (error) {
    console.error('Fehler beim Parsen der Claude-Protokoll-URL:', error);
    return {
      type: 'unknown',
      parameters: {},
      rawUrl: url
    };
  }
}

/**
 * Erstellt eine claude:// URL für ein Tool-Artefakt
 * @param artifactId ID des Tool-Artefakts
 * @param parameters Parameter für das Tool
 * @returns Vollständige claude:// URL
 */
export function createToolArtifactUrl(artifactId: string, parameters: Record<string, any> = {}): string {
  let url = `claude://artifacts/tool/${artifactId}`;
  
  // Füge Parameter als Query-String hinzu
  const queryParams = new URLSearchParams();
  
  for (const [key, value] of Object.entries(parameters)) {
    if (value !== undefined && value !== null) {
      if (typeof value === 'object') {
        queryParams.append(key, JSON.stringify(value));
      } else {
        queryParams.append(key, String(value));
      }
    }
  }
  
  const queryString = queryParams.toString();
  if (queryString) {
    url += `?${queryString}`;
  }
  
  return url;
}

/**
 * Erstellt eine claude:// URL für ein Workflow-Artefakt
 * @param artifactId ID des Workflow-Artefakts
 * @param parameters Parameter für den Workflow
 * @returns Vollständige claude:// URL
 */
export function createWorkflowArtifactUrl(artifactId: string, parameters: Record<string, any> = {}): string {
  let url = `claude://artifacts/workflow/${artifactId}`;
  
  // Füge Parameter als Query-String hinzu
  const queryParams = new URLSearchParams();
  
  for (const [key, value] of Object.entries(parameters)) {
    if (value !== undefined && value !== null) {
      if (typeof value === 'object') {
        queryParams.append(key, JSON.stringify(value));
      } else {
        queryParams.append(key, String(value));
      }
    }
  }
  
  const queryString = queryParams.toString();
  if (queryString) {
    url += `?${queryString}`;
  }
  
  return url;
}

/**
 * Erstellt eine claude:// URL für die Genehmigung einer Artefakt-Ausführung
 * @param executionId ID der Ausführung
 * @param approvalToken Token für die Genehmigung
 * @returns Vollständige claude:// URL
 */
export function createApprovalUrl(executionId: string, approvalToken: string): string {
  return `claude://approve/${executionId}/${approvalToken}`;
}

/**
 * Verarbeitet einen Claude Protokoll-Handler-Aufruf
 * @param url Die empfangene claude:// URL
 * @returns Promise mit dem Ergebnis der Verarbeitung
 */
export async function handleClaudeProtocolUrl(url: string): Promise<any> {
  try {
    const parsedUrl = parseClaudeProtocolUrl(url);
    
    switch (parsedUrl.type) {
      case 'tool':
        // Hier würde die Logik zur Ausführung eines Tool-Artefakts stehen
        // In einer realen Anwendung würde man die API aufrufen
        console.log('Tool-Artefakt ausführen:', parsedUrl.id, parsedUrl.parameters);
        return {
          success: true,
          message: `Tool-Artefakt ${parsedUrl.id} wird ausgeführt`,
          artifactId: parsedUrl.id,
          parameters: parsedUrl.parameters
        };
        
      case 'workflow':
        // Hier würde die Logik zur Ausführung eines Workflow-Artefakts stehen
        console.log('Workflow-Artefakt ausführen:', parsedUrl.id, parsedUrl.parameters);
        return {
          success: true,
          message: `Workflow-Artefakt ${parsedUrl.id} wird ausgeführt`,
          artifactId: parsedUrl.id,
          parameters: parsedUrl.parameters
        };
        
      case 'approval':
        // Hier würde die Logik zur Genehmigung einer Artefakt-Ausführung stehen
        console.log('Artefakt-Ausführung genehmigen:', parsedUrl.id, parsedUrl.parameters.token);
        return {
          success: true,
          message: `Ausführung ${parsedUrl.id} wird genehmigt`,
          executionId: parsedUrl.id,
          approvalToken: parsedUrl.parameters.token
        };
        
      default:
        throw new Error(`Unbekannter URL-Typ: ${parsedUrl.type}`);
    }
  } catch (error) {
    console.error('Fehler bei der Verarbeitung der Claude-Protokoll-URL:', error);
    return {
      success: false,
      message: `Fehler bei der Verarbeitung: ${error.message}`,
      error
    };
  }
}

/**
 * Registriert einen globalen Protokoll-Handler für claude:// URLs, falls im Browser unterstützt
 */
export function registerClaudeProtocolHandler(): void {
  try {
    // Diese Funktion wird nur im Browser-Kontext ausgeführt
    if (typeof window !== 'undefined' && window.navigator && window.navigator.registerProtocolHandler) {
      window.navigator.registerProtocolHandler(
        'claude',
        `${window.location.origin}/protocol-handler?url=%s`,
        'Claude.ai Desktop Integration'
      );
      console.log('Claude-Protokoll-Handler registriert');
    } else {
      console.log('Register Protocol Handler wird von diesem Browser nicht unterstützt');
    }
  } catch (error) {
    console.error('Fehler beim Registrieren des Claude-Protokoll-Handlers:', error);
  }
} 