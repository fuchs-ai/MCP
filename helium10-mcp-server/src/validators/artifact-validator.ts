/**
 * artifact-validator.ts
 * 
 * Stellt Funktionen zur Validierung von Artefakt-Daten bereit.
 * Prüft, ob die obligatorischen Felder vorhanden sind und die Datentypen korrekt sind.
 */

interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Validiert ein Artefakt-Objekt
 * @param artifact Das zu validierende Artefakt-Objekt
 * @param isUpdate Gibt an, ob es sich um ein Update handelt (dann sind einige Felder optional)
 * @returns Ein Objekt mit dem Validierungsergebnis und etwaigen Fehlern
 */
export function validateArtifact(artifact: any, isUpdate = false): ValidationResult {
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
  
  // Validiere Beschreibung (optional)
  if (artifact.description !== undefined && artifact.description !== null) {
    if (typeof artifact.description !== 'string') {
      errors.description = 'Beschreibung muss ein String sein';
    } else if (artifact.description.length > 500) {
      errors.description = 'Beschreibung darf maximal 500 Zeichen lang sein';
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
  
  // Validiere maxUsage (optional)
  if (artifact.maxUsage !== undefined && artifact.maxUsage !== null) {
    if (typeof artifact.maxUsage !== 'number') {
      errors.maxUsage = 'Maximale Nutzung muss eine Zahl sein';
    } else if (artifact.maxUsage < 0) {
      errors.maxUsage = 'Maximale Nutzung darf nicht negativ sein';
    }
  }
  
  // Validiere Tags (optional)
  if (artifact.tags !== undefined && artifact.tags !== null) {
    if (!Array.isArray(artifact.tags)) {
      errors.tags = 'Tags müssen ein Array sein';
    } else {
      for (const tag of artifact.tags) {
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

/**
 * Validiert die Filter-Parameter für Artefakt-Abfragen
 * @param filters Die zu validierenden Filter-Parameter
 * @returns Ein Objekt mit dem Validierungsergebnis und etwaigen Fehlern
 */
export function validateArtifactFilters(filters: any): ValidationResult {
  const errors: Record<string, string> = {};
  
  // Validiere Typ-Filter
  if (filters.type !== undefined && filters.type !== null) {
    if (filters.type !== 'tool' && filters.type !== 'workflow') {
      errors.type = 'Typ muss entweder "tool" oder "workflow" sein';
    }
  }
  
  // Validiere Status-Filter
  if (filters.status !== undefined && filters.status !== null) {
    if (filters.status !== 'active' && filters.status !== 'inactive') {
      errors.status = 'Status muss entweder "active" oder "inactive" sein';
    }
  }
  
  // Validiere Tag-Filter
  if (filters.tag !== undefined && filters.tag !== null) {
    if (typeof filters.tag !== 'string') {
      errors.tag = 'Tag muss ein String sein';
    }
  }
  
  // Validiere Suchbegriff
  if (filters.search !== undefined && filters.search !== null) {
    if (typeof filters.search !== 'string') {
      errors.search = 'Suchbegriff muss ein String sein';
    }
  }
  
  // Validiere Sortierung
  if (filters.sortBy !== undefined && filters.sortBy !== null) {
    const validSortFields = ['name', 'type', 'status', 'createdAt', 'updatedAt', 'currentUsage'];
    if (!validSortFields.includes(filters.sortBy)) {
      errors.sortBy = `Sortierfeld muss eines der folgenden sein: ${validSortFields.join(', ')}`;
    }
  }
  
  // Validiere Sortierreihenfolge
  if (filters.sortOrder !== undefined && filters.sortOrder !== null) {
    if (filters.sortOrder !== 'asc' && filters.sortOrder !== 'desc') {
      errors.sortOrder = 'Sortierreihenfolge muss entweder "asc" oder "desc" sein';
    }
  }
  
  // Validiere Seitenzahl
  if (filters.page !== undefined && filters.page !== null) {
    const page = parseInt(filters.page);
    if (isNaN(page) || page < 1) {
      errors.page = 'Seitenzahl muss eine positive Ganzzahl sein';
    }
  }
  
  // Validiere Limit
  if (filters.limit !== undefined && filters.limit !== null) {
    const limit = parseInt(filters.limit);
    if (isNaN(limit) || limit < 1 || limit > 100) {
      errors.limit = 'Limit muss eine positive Ganzzahl zwischen 1 und 100 sein';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
} 