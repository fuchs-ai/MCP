/**
 * Benutzerdefinierte Prompt-Vorlagen-Tools für den Helium10 MCP-Server
 * 
 * Dieses Modul bietet Tools zur Verwaltung und Anwendung benutzerdefinierter Prompt-Vorlagen
 * für verschiedene Anwendungsfälle.
 */

import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../utils/logger';
import { generateText } from '../ml/llm';
import { FileSystemCache } from '../cache/file-cache';

// Cache für Template-Daten
const templateCache = new FileSystemCache('template-cache');

// Verzeichnis für Vorlagen
const TEMPLATES_DIR = path.join(process.cwd(), 'templates');

// Standardkategorien für Vorlagen
const DEFAULT_TEMPLATE_CATEGORIES = [
  { id: 'product', name: 'Produktbeschreibungen' },
  { id: 'email', name: 'E-Mail-Vorlagen' },
  { id: 'social', name: 'Social Media' },
  { id: 'advertising', name: 'Werbeanzeigen' },
  { id: 'keywords', name: 'Keyword-Analyse' },
  { id: 'custom', name: 'Benutzerdefiniert' }
];

// Template-Format
interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  template: string;
  variables: string[];
  author: string;
  createdAt: string;
  updatedAt: string;
  isSystem?: boolean;
}

// Stellt sicher, dass das Template-Verzeichnis existiert
function ensureTemplateDirectory() {
  if (!fs.existsSync(TEMPLATES_DIR)) {
    fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
  }
  
  // Stelle sicher, dass die Kategorien-Datei existiert
  const categoriesPath = path.join(TEMPLATES_DIR, 'categories.json');
  if (!fs.existsSync(categoriesPath)) {
    fs.writeFileSync(categoriesPath, JSON.stringify(DEFAULT_TEMPLATE_CATEGORIES, null, 2));
  }
}

/**
 * Erstellt eine neue Prompt-Vorlage
 * 
 * @param {string} name Name der Vorlage
 * @param {string} template Vorlagentext mit Variablen in der Form {{variable}}
 * @param {string} description Beschreibung der Vorlage
 * @param {string} category Kategorie der Vorlage
 * @param {string} author Autor der Vorlage
 * @returns {Promise<object>} Erstellungsergebnis
 */
export async function createTemplatePromptTool(
  name: string,
  template: string,
  description: string,
  category: string = 'custom',
  author: string = 'Helium10 MCP'
): Promise<object> {
  logger.info(`Erstelle Prompt-Vorlage "${name}"...`);
  
  try {
    ensureTemplateDirectory();
    
    // Extrahiere Variablen aus der Vorlage
    const variables = extractTemplateVariables(template);
    
    // Generiere eindeutige ID
    const id = `template_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // Erstelle Template-Objekt
    const templateObj: PromptTemplate = {
      id,
      name,
      description,
      category,
      template,
      variables,
      author,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Speichere Vorlage in Datei
    const templatePath = path.join(TEMPLATES_DIR, `${id}.json`);
    fs.writeFileSync(templatePath, JSON.stringify(templateObj, null, 2));
    
    // Aktualisiere Cache
    await templateCache.set(`template:${id}`, templateObj, 30 * 24 * 60 * 60); // 30 Tage
    
    return {
      success: true,
      template: {
        id,
        name,
        description,
        category,
        variables,
        author,
        createdAt: templateObj.createdAt
      }
    };
  } catch (error) {
    logger.error('Fehler beim Erstellen der Prompt-Vorlage', error);
    throw new Error(`Fehler beim Erstellen der Prompt-Vorlage: ${error.message}`);
  }
}

/**
 * Aktualisiert eine bestehende Prompt-Vorlage
 * 
 * @param {string} id ID der zu aktualisierenden Vorlage
 * @param {object} updates Zu aktualisierende Felder (name, template, description, category)
 * @returns {Promise<object>} Aktualisierungsergebnis
 */
export async function updateTemplatePromptTool(
  id: string,
  updates: Partial<{
    name: string;
    template: string;
    description: string;
    category: string;
  }>
): Promise<object> {
  logger.info(`Aktualisiere Prompt-Vorlage "${id}"...`);
  
  try {
    // Lade bestehende Vorlage
    const templateObj = await loadTemplate(id);
    
    if (!templateObj) {
      throw new Error(`Vorlage mit ID ${id} nicht gefunden`);
    }
    
    // Prüfe, ob es sich um eine Systemvorlage handelt
    if (templateObj.isSystem) {
      throw new Error('Systemvorlagen können nicht bearbeitet werden');
    }
    
    // Aktualisiere Felder
    const updatedTemplate = {
      ...templateObj,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    // Wenn die Vorlage aktualisiert wurde, extrahiere Variablen neu
    if (updates.template) {
      updatedTemplate.variables = extractTemplateVariables(updates.template);
    }
    
    // Speichere aktualisierte Vorlage
    const templatePath = path.join(TEMPLATES_DIR, `${id}.json`);
    fs.writeFileSync(templatePath, JSON.stringify(updatedTemplate, null, 2));
    
    // Aktualisiere Cache
    await templateCache.set(`template:${id}`, updatedTemplate, 30 * 24 * 60 * 60);
    
    return {
      success: true,
      template: {
        id,
        name: updatedTemplate.name,
        description: updatedTemplate.description,
        category: updatedTemplate.category,
        variables: updatedTemplate.variables,
        updatedAt: updatedTemplate.updatedAt
      }
    };
  } catch (error) {
    logger.error('Fehler beim Aktualisieren der Prompt-Vorlage', error);
    throw new Error(`Fehler beim Aktualisieren der Prompt-Vorlage: ${error.message}`);
  }
}

/**
 * Löscht eine Prompt-Vorlage
 * 
 * @param {string} id ID der zu löschenden Vorlage
 * @returns {Promise<object>} Löschergebnis
 */
export async function deleteTemplatePromptTool(id: string): Promise<object> {
  logger.info(`Lösche Prompt-Vorlage "${id}"...`);
  
  try {
    // Lade bestehende Vorlage
    const templateObj = await loadTemplate(id);
    
    if (!templateObj) {
      throw new Error(`Vorlage mit ID ${id} nicht gefunden`);
    }
    
    // Prüfe, ob es sich um eine Systemvorlage handelt
    if (templateObj.isSystem) {
      throw new Error('Systemvorlagen können nicht gelöscht werden');
    }
    
    // Lösche Vorlage
    const templatePath = path.join(TEMPLATES_DIR, `${id}.json`);
    fs.unlinkSync(templatePath);
    
    // Lösche aus Cache
    await templateCache.delete(`template:${id}`);
    
    return {
      success: true,
      deletedTemplateId: id,
      templateName: templateObj.name
    };
  } catch (error) {
    logger.error('Fehler beim Löschen der Prompt-Vorlage', error);
    throw new Error(`Fehler beim Löschen der Prompt-Vorlage: ${error.message}`);
  }
}

/**
 * Listet alle verfügbaren Prompt-Vorlagen auf
 * 
 * @param {string} category Optional: Kategorie zum Filtern
 * @returns {Promise<object>} Liste der Vorlagen
 */
export async function listTemplatePromptsTool(category?: string): Promise<object> {
  logger.info('Liste verfügbare Prompt-Vorlagen auf...');
  
  try {
    ensureTemplateDirectory();
    
    const templates = await loadAllTemplates();
    
    // Filtere nach Kategorie, falls angegeben
    const filteredTemplates = category
      ? templates.filter(template => template.category === category)
      : templates;
    
    // Lade Kategorien
    const categories = await loadCategories();
    
    return {
      success: true,
      templateCount: filteredTemplates.length,
      templates: filteredTemplates.map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        variables: template.variables,
        author: template.author,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
        isSystem: template.isSystem || false
      })),
      categories
    };
  } catch (error) {
    logger.error('Fehler beim Auflisten der Prompt-Vorlagen', error);
    throw new Error(`Fehler beim Auflisten der Prompt-Vorlagen: ${error.message}`);
  }
}

/**
 * Ruft eine spezifische Prompt-Vorlage ab
 * 
 * @param {string} id ID der abzurufenden Vorlage
 * @returns {Promise<object>} Vorlageninformationen
 */
export async function getTemplatePromptTool(id: string): Promise<object> {
  logger.info(`Rufe Prompt-Vorlage "${id}" ab...`);
  
  try {
    const template = await loadTemplate(id);
    
    if (!template) {
      throw new Error(`Vorlage mit ID ${id} nicht gefunden`);
    }
    
    return {
      success: true,
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        template: template.template,
        variables: template.variables,
        author: template.author,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
        isSystem: template.isSystem || false
      }
    };
  } catch (error) {
    logger.error('Fehler beim Abrufen der Prompt-Vorlage', error);
    throw new Error(`Fehler beim Abrufen der Prompt-Vorlage: ${error.message}`);
  }
}

/**
 * Generiert Text mit einer benutzerdefinierten Prompt-Vorlage
 * 
 * @param {string} templateId ID der zu verwendenden Vorlage
 * @param {object} variables Variablen für die Vorlage
 * @param {object} generationOptions Optionale Generierungsoptionen (Temperatur, max. Länge)
 * @returns {Promise<object>} Generierungsergebnis
 */
export async function generateWithTemplatePromptTool(
  templateId: string,
  variables: Record<string, string | number>,
  generationOptions: {
    temperature?: number;
    maxLength?: number;
  } = {}
): Promise<object> {
  logger.info(`Generiere Text mit Vorlage "${templateId}"...`);
  
  try {
    // Lade Vorlage
    const template = await loadTemplate(templateId);
    
    if (!template) {
      throw new Error(`Vorlage mit ID ${templateId} nicht gefunden`);
    }
    
    // Prüfe, ob alle erforderlichen Variablen angegeben wurden
    const missingVariables = template.variables.filter(variable => 
      !(variable in variables) && !template.template.includes(`{{${variable}:optional}}`)
    );
    
    if (missingVariables.length > 0) {
      throw new Error(`Fehlende Variablen: ${missingVariables.join(', ')}`);
    }
    
    // Fülle Vorlage mit Variablen
    let filledTemplate = template.template;
    
    for (const [key, value] of Object.entries(variables)) {
      // Ersetze die reguläre Variable und optionale Variablen
      filledTemplate = filledTemplate
        .replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value))
        .replace(new RegExp(`\\{\\{${key}:optional\\}\\}`, 'g'), String(value));
    }
    
    // Entferne ungesetzte optionale Variablen
    filledTemplate = filledTemplate.replace(/\{\{[^}]+:optional\}\}/g, '');
    
    // Generiere Text
    const generatedText = await generateText(filledTemplate, {
      temperature: generationOptions.temperature || 0.7,
      maxLength: generationOptions.maxLength || 500
    });
    
    return {
      success: true,
      templateId,
      templateName: template.name,
      providedVariables: variables,
      generatedText,
      generationOptions,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Fehler bei der Textgenerierung mit Vorlage', error);
    throw new Error(`Fehler bei der Textgenerierung mit Vorlage: ${error.message}`);
  }
}

/**
 * Erstellt eine neue Vorlagenkategorie
 * 
 * @param {string} id ID der neuen Kategorie
 * @param {string} name Name der Kategorie
 * @returns {Promise<object>} Erstellungsergebnis
 */
export async function createTemplateCategoryTool(
  id: string,
  name: string
): Promise<object> {
  logger.info(`Erstelle Vorlagenkategorie "${name}" (${id})...`);
  
  try {
    ensureTemplateDirectory();
    
    // Lade bestehende Kategorien
    const categories = await loadCategories();
    
    // Prüfe, ob ID bereits existiert
    if (categories.some(category => category.id === id)) {
      throw new Error(`Kategorie mit ID ${id} existiert bereits`);
    }
    
    // Füge neue Kategorie hinzu
    categories.push({ id, name });
    
    // Speichere aktualisierte Kategorien
    const categoriesPath = path.join(TEMPLATES_DIR, 'categories.json');
    fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 2));
    
    return {
      success: true,
      category: { id, name },
      totalCategories: categories.length
    };
  } catch (error) {
    logger.error('Fehler beim Erstellen der Vorlagenkategorie', error);
    throw new Error(`Fehler beim Erstellen der Vorlagenkategorie: ${error.message}`);
  }
}

/**
 * Verifiziert eine Vorlage und listet alle Variablen auf
 * 
 * @param {string} template Vorlagentext
 * @returns {Promise<object>} Verifizierungsergebnis
 */
export async function verifyTemplatePromptTool(template: string): Promise<object> {
  logger.info('Verifiziere Prompt-Vorlage...');
  
  try {
    // Extrahiere Variablen
    const variables = extractTemplateVariables(template);
    
    // Extrahiere optionale Variablen
    const optionalVariablesMatch = template.match(/\{\{([^}]+):optional\}\}/g) || [];
    const optionalVariables = optionalVariablesMatch.map(match => {
      return match.slice(2, -10); // Entferne {{ und :optional}}
    });
    
    // Extrahiere reguläre Variablen
    const requiredVariables = variables.filter(v => !optionalVariables.includes(v));
    
    return {
      success: true,
      isValid: true,
      variableCount: variables.length,
      requiredVariables,
      optionalVariables,
      exampleUsage: {
        templateId: 'example_template_id',
        variables: requiredVariables.reduce((acc, variable) => {
          acc[variable] = `[Wert für ${variable}]`;
          return acc;
        }, {})
      }
    };
  } catch (error) {
    logger.error('Fehler beim Verifizieren der Prompt-Vorlage', error);
    throw new Error(`Fehler beim Verifizieren der Prompt-Vorlage: ${error.message}`);
  }
}

/**
 * Führt A/B-Tests für verschiedene Varianten einer Prompt-Vorlage durch
 * 
 * @param {string} baseTemplate Basis-Vorlagentext
 * @param {object} variables Gemeinsame Variablen für alle Varianten
 * @param {object[]} variants Array von Varianten-Objekten (name, variationDescription, overrideVariables)
 * @returns {Promise<object>} A/B-Testergebnisse
 */
export async function abTestTemplatePromptsTool(
  baseTemplate: string,
  variables: Record<string, string | number>,
  variants: Array<{
    name: string;
    variationDescription: string;
    overrideVariables?: Record<string, string | number>;
  }>
): Promise<object> {
  logger.info(`Führe A/B-Test mit ${variants.length} Varianten durch...`);
  
  try {
    const results = [];
    
    for (const variant of variants) {
      // Kombiniere Standard- und Überschreibungsvariablen
      const combinedVariables = {
        ...variables,
        ...(variant.overrideVariables || {})
      };
      
      // Fülle Vorlage mit Variablen
      let filledTemplate = baseTemplate;
      
      for (const [key, value] of Object.entries(combinedVariables)) {
        // Ersetze die reguläre Variable und optionale Variablen
        filledTemplate = filledTemplate
          .replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value))
          .replace(new RegExp(`\\{\\{${key}:optional\\}\\}`, 'g'), String(value));
      }
      
      // Entferne ungesetzte optionale Variablen
      filledTemplate = filledTemplate.replace(/\{\{[^}]+:optional\}\}/g, '');
      
      // Generiere Text
      const generatedText = await generateText(filledTemplate, {
        temperature: 0.7,
        maxLength: 500
      });
      
      results.push({
        variantName: variant.name,
        variationDescription: variant.variationDescription,
        variables: combinedVariables,
        generatedText,
        timestamp: new Date().toISOString()
      });
    }
    
    return {
      success: true,
      baseTemplateLength: baseTemplate.length,
      variantCount: variants.length,
      results,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Fehler beim A/B-Testen der Prompt-Vorlagen', error);
    throw new Error(`Fehler beim A/B-Testen der Prompt-Vorlagen: ${error.message}`);
  }
}

// Hilfsfunktionen

/**
 * Lädt eine Template-Datei
 */
async function loadTemplate(id: string): Promise<PromptTemplate | null> {
  // Versuche zuerst aus dem Cache zu laden
  const cachedTemplate = await templateCache.get(`template:${id}`);
  if (cachedTemplate) {
    return cachedTemplate;
  }
  
  // Versuche aus Datei zu laden
  const templatePath = path.join(TEMPLATES_DIR, `${id}.json`);
  if (fs.existsSync(templatePath)) {
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    const template = JSON.parse(templateContent);
    
    // Speichere im Cache für schnelleren Zugriff
    await templateCache.set(`template:${id}`, template, 30 * 24 * 60 * 60);
    
    return template;
  }
  
  return null;
}

/**
 * Lädt alle Template-Dateien
 */
async function loadAllTemplates(): Promise<PromptTemplate[]> {
  ensureTemplateDirectory();
  
  const templates: PromptTemplate[] = [];
  
  const files = fs.readdirSync(TEMPLATES_DIR);
  
  for (const file of files) {
    if (file === 'categories.json') continue;
    
    if (file.endsWith('.json')) {
      const filePath = path.join(TEMPLATES_DIR, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      try {
        const template = JSON.parse(content);
        templates.push(template);
      } catch (error) {
        logger.warn(`Konnte Template-Datei nicht parsen: ${file}`, error);
      }
    }
  }
  
  return templates;
}

/**
 * Lädt die Kategorien-Datei
 */
async function loadCategories(): Promise<{ id: string, name: string }[]> {
  ensureTemplateDirectory();
  
  const categoriesPath = path.join(TEMPLATES_DIR, 'categories.json');
  const categoriesContent = fs.readFileSync(categoriesPath, 'utf8');
  
  return JSON.parse(categoriesContent);
}

/**
 * Extrahiert Variablen aus einem Template-String
 */
function extractTemplateVariables(template: string): string[] {
  // Reguläre Variablen ({{variable}})
  const regularMatches = template.match(/\{\{([^:}]+)\}\}/g) || [];
  const regularVariables = regularMatches.map(match => match.slice(2, -2));
  
  // Optionale Variablen ({{variable:optional}})
  const optionalMatches = template.match(/\{\{([^:}]+):optional\}\}/g) || [];
  const optionalVariables = optionalMatches.map(match => match.slice(2, -10));
  
  // Kombiniere und entferne Duplikate
  const allVariables = [...regularVariables, ...optionalVariables];
  return [...new Set(allVariables)];
} 