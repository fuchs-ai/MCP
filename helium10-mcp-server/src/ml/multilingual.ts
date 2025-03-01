/**
 * Mehrsprachige Unterstützung für LLM-Funktionen
 * 
 * Dieses Modul bietet Funktionen für die mehrsprachige Nutzung des DeepSeek-R1-Distill-Llama-8B-Modells
 * und Übersetzungshilfen für die internationale Nutzung.
 */

import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { logger } from '../utils/logger';
import { LLMConfig, DEFAULT_LLM_CONFIG, generateText, generateChatResponse } from './llm';
import { FileSystemCache } from '../cache/file-cache';

// Cache für Übersetzungen und mehrsprachige Prompts
const multilingualCache = new FileSystemCache('multilingual-cache');

// Unterstützte Sprachen
export const SUPPORTED_LANGUAGES = [
  { code: 'de', name: 'Deutsch', nativeName: 'Deutsch' },
  { code: 'en', name: 'Englisch', nativeName: 'English' },
  { code: 'fr', name: 'Französisch', nativeName: 'Français' },
  { code: 'es', name: 'Spanisch', nativeName: 'Español' },
  { code: 'it', name: 'Italienisch', nativeName: 'Italiano' },
  { code: 'nl', name: 'Niederländisch', nativeName: 'Nederlands' },
  { code: 'pl', name: 'Polnisch', nativeName: 'Polski' },
  { code: 'sv', name: 'Schwedisch', nativeName: 'Svenska' }
];

// Amazon-Marktplätze und Hauptsprachen
export const MARKETPLACE_LANGUAGES = {
  'amazon.de': 'de',
  'amazon.com': 'en',
  'amazon.co.uk': 'en',
  'amazon.fr': 'fr',
  'amazon.es': 'es',
  'amazon.it': 'it',
  'amazon.nl': 'nl',
  'amazon.pl': 'pl',
  'amazon.se': 'sv'
};

/**
 * Übersetzt einen Text in eine andere Sprache mithilfe des LLM-Modells
 * 
 * @param text Zu übersetzender Text
 * @param targetLanguage Zielsprache (Code oder Name)
 * @param sourceLanguage Quellsprache (wird automatisch erkannt, wenn nicht angegeben)
 * @param config Optionale LLM-Konfiguration
 * @returns Übersetzter Text
 */
export async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage: string = '',
  config: Partial<LLMConfig> = {}
): Promise<string> {
  logger.info(`Übersetze Text nach ${targetLanguage}...`);
  
  try {
    // Normalisiere Sprachcodes
    const targetLang = normalizeLanguageCode(targetLanguage);
    const sourceLang = sourceLanguage ? normalizeLanguageCode(sourceLanguage) : '';
    
    // Prüfe, ob die Übersetzung bereits im Cache vorhanden ist
    const cacheKey = `translation:${text.substring(0, 100)}:${sourceLang || 'auto'}:${targetLang}`;
    const cachedTranslation = await multilingualCache.get(cacheKey);
    
    if (cachedTranslation) {
      logger.debug('Übersetzung aus Cache zurückgegeben');
      return cachedTranslation;
    }
    
    // Erstelle Prompt für die Übersetzung
    let prompt: string;
    if (sourceLang) {
      prompt = `Übersetze den folgenden Text von ${getLanguageName(sourceLang)} nach ${getLanguageName(targetLang)}:\n\n${text}`;
    } else {
      prompt = `Übersetze den folgenden Text nach ${getLanguageName(targetLang)}:\n\n${text}`;
    }
    
    // Führe Übersetzung mit dem LLM-Modell durch
    const translation = await generateText(prompt, {
      ...config,
      temperature: 0.2,  // Niedrigere Temperatur für genauere Übersetzungen
      maxLength: Math.max(500, text.length * 1.5)  // Ausreichend Platz für die Übersetzung
    });
    
    // Bereinige die Übersetzung
    let cleanedTranslation = translation.trim();
    
    // Entferne mögliche Hinzufügungen des Modells
    const commonPrefixes = [
      'Hier ist die Übersetzung:', 
      'Übersetzung:', 
      'Übersetzt:', 
      'Here is the translation:',
      'Translation:'
    ];
    
    for (const prefix of commonPrefixes) {
      if (cleanedTranslation.startsWith(prefix)) {
        cleanedTranslation = cleanedTranslation.substring(prefix.length).trim();
      }
    }
    
    // Speichere die Übersetzung im Cache (1 Woche)
    await multilingualCache.set(cacheKey, cleanedTranslation, 7 * 24 * 60 * 60);
    
    return cleanedTranslation;
  } catch (error) {
    logger.error('Fehler bei der Übersetzung', error);
    throw new Error(`Fehler bei der Übersetzung: ${error.message}`);
  }
}

/**
 * Generiert mehrsprachigen Text basierend auf einem Template und Zielsprache
 * 
 * @param templateName Name des Prompt-Templates
 * @param variables Variablen für das Template
 * @param targetLanguage Zielsprache für die Generierung
 * @param config Optionale LLM-Konfiguration
 * @returns Generierter Text in der Zielsprache
 */
export async function generateMultilingualText(
  templateName: string,
  variables: object,
  targetLanguage: string,
  config: Partial<LLMConfig> = {}
): Promise<string> {
  logger.info(`Generiere mehrsprachigen Text mit Template "${templateName}" in ${targetLanguage}...`);
  
  try {
    const targetLang = normalizeLanguageCode(targetLanguage);
    
    // Lade Template
    const template = await loadPromptTemplate(templateName, targetLang);
    if (!template) {
      throw new Error(`Prompt-Template "${templateName}" nicht gefunden`);
    }
    
    // Fülle Template mit Variablen
    const filledTemplate = fillTemplateVariables(template, variables);
    
    // Generiere Text mit dem LLM-Modell
    return await generateText(filledTemplate, config);
  } catch (error) {
    logger.error('Fehler bei der mehrsprachigen Textgenerierung', error);
    throw new Error(`Fehler bei der mehrsprachigen Textgenerierung: ${error.message}`);
  }
}

/**
 * Generiert eine mehrsprachige Produktbeschreibung basierend auf der Zielsprache und dem Marktplatz
 * 
 * @param productInfo Produktinformationen
 * @param targetLanguage Zielsprache für die Beschreibung
 * @param marketplace Amazon-Marktplatz (z.B. amazon.de)
 * @param optimizationGoal Optimierungsziel (conversion, seo, branding)
 * @param config Optionale LLM-Konfiguration
 * @returns Generierte Produktbeschreibung in der Zielsprache
 */
export async function generateMultilingualProductDescription(
  productInfo: any,
  targetLanguage: string,
  marketplace: string = 'amazon.de',
  optimizationGoal: string = 'conversion',
  config: Partial<LLMConfig> = {}
): Promise<object> {
  logger.info(`Generiere mehrsprachige Produktbeschreibung in ${targetLanguage} für ${marketplace}...`);
  
  try {
    const targetLang = normalizeLanguageCode(targetLanguage);
    
    // Bestimme die Marktplatzsprache
    const marketplaceLang = MARKETPLACE_LANGUAGES[marketplace] || 'en';
    
    // Erstelle einen marktplatzspezifischen Prompt
    let templateName: string;
    
    switch (optimizationGoal) {
      case 'seo':
        templateName = 'product_description_seo';
        break;
      case 'branding':
        templateName = 'product_description_branding';
        break;
      default: // 'conversion'
        templateName = 'product_description_conversion';
        break;
    }
    
    // Generiere die Beschreibung in der Zielsprache
    const description = await generateMultilingualText(
      templateName,
      {
        title: productInfo.title || '',
        category: productInfo.category || '',
        description: productInfo.description || '',
        bulletPoints: (productInfo.bulletPoints || []).join('\n'),
        features: (productInfo.features || []).join('\n'),
        marketplace: marketplace,
        targetMarket: getMarketByMarketplace(marketplace)
      },
      targetLang,
      {
        ...config,
        maxLength: 1000,
        temperature: 0.7
      }
    );
    
    // Extrahiere Beschreibung und Bullet Points aus generiertem Text
    const sections = description.split('\n\n');
    let mainDescription = '';
    let bulletPoints: string[] = [];
    
    // Einfache Heuristik zur Unterscheidung von Beschreibung und Bullets
    let inBulletSection = false;
    
    for (const section of sections) {
      if (section.trim().startsWith('Bullet Points:') || 
          section.trim().startsWith('Verkaufsargumente:') ||
          section.trim().startsWith('Points clés:') ||
          section.trim().startsWith('Puntos clave:')) {
        inBulletSection = true;
        continue;
      }
      
      if (inBulletSection) {
        // Sammle Bullet Points
        const lines = section.split('\n');
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine && (
              trimmedLine.startsWith('- ') || 
              trimmedLine.startsWith('• ') || 
              trimmedLine.match(/^\d+\./)
            )) {
            bulletPoints.push(trimmedLine);
          }
        }
      } else {
        // Sammle Beschreibungstext
        if (section.trim()) {
          mainDescription += section + '\n\n';
        }
      }
    }
    
    return {
      title: productInfo.title,
      description: mainDescription.trim(),
      bulletPoints,
      language: targetLang,
      marketplace,
      optimizationGoal,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Fehler bei der Generierung der mehrsprachigen Produktbeschreibung', error);
    throw new Error(`Fehler bei der Generierung der mehrsprachigen Produktbeschreibung: ${error.message}`);
  }
}

/**
 * Erstellt ein neues Prompt-Template für mehrsprachige Generierung
 * 
 * @param templateName Name des Templates
 * @param template Template-Text mit Variablen in der Form {{variable}}
 * @param language Sprache des Templates
 * @param description Beschreibung des Templates
 * @returns Status der Template-Erstellung
 */
export async function createPromptTemplate(
  templateName: string,
  template: string,
  language: string = 'de',
  description: string = ''
): Promise<object> {
  logger.info(`Erstelle Prompt-Template "${templateName}" in ${language}...`);
  
  try {
    const templateDir = path.join(process.cwd(), 'prompts');
    if (!fs.existsSync(templateDir)) {
      fs.mkdirSync(templateDir, { recursive: true });
    }
    
    const langCode = normalizeLanguageCode(language);
    
    // Erstelle Template-Objekt
    const templateObject = {
      name: templateName,
      language: langCode,
      description: description || `Prompt-Template für ${templateName}`,
      template,
      variables: extractTemplateVariables(template),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Speichere Template in Datei
    const templatePath = path.join(templateDir, `${templateName}.${langCode}.json`);
    fs.writeFileSync(templatePath, JSON.stringify(templateObject, null, 2));
    
    // Speichere auch im Cache für schnelleren Zugriff
    await multilingualCache.set(`template:${templateName}:${langCode}`, templateObject, 30 * 24 * 60 * 60); // 30 Tage
    
    // Aktualisiere Template-Verzeichnis
    await updateTemplateRegistry();
    
    return {
      success: true,
      templateName,
      language: langCode,
      path: templatePath,
      variables: templateObject.variables
    };
  } catch (error) {
    logger.error('Fehler beim Erstellen des Prompt-Templates', error);
    throw new Error(`Fehler beim Erstellen des Prompt-Templates: ${error.message}`);
  }
}

/**
 * Übersetzt ein vorhandenes Prompt-Template in eine andere Sprache
 * 
 * @param templateName Name des Templates
 * @param sourceLanguage Quellsprache
 * @param targetLanguage Zielsprache
 * @param config Optionale LLM-Konfiguration
 * @returns Status der Template-Übersetzung
 */
export async function translatePromptTemplate(
  templateName: string,
  sourceLanguage: string,
  targetLanguage: string,
  config: Partial<LLMConfig> = {}
): Promise<object> {
  logger.info(`Übersetze Prompt-Template "${templateName}" von ${sourceLanguage} nach ${targetLanguage}...`);
  
  try {
    const sourceLang = normalizeLanguageCode(sourceLanguage);
    const targetLang = normalizeLanguageCode(targetLanguage);
    
    // Lade Quell-Template
    const sourceTemplate = await loadPromptTemplate(templateName, sourceLang);
    if (!sourceTemplate) {
      throw new Error(`Quell-Template "${templateName}" in ${sourceLang} nicht gefunden`);
    }
    
    // Extrahiere Variablen und deren Positionen
    const varPositions = [];
    const templateWithVarPlaceholders = sourceTemplate.template.replace(/\{\{([^}]+)\}\}/g, (match, variable, offset) => {
      varPositions.push({ variable, start: offset, end: offset + match.length });
      return `__VAR_${variable}__`;
    });
    
    // Übersetze den Template-Text, aber behalte die Variablen
    const translatedText = await translateText(
      templateWithVarPlaceholders,
      targetLang,
      sourceLang,
      {
        ...config,
        temperature: 0.2
      }
    );
    
    // Ersetze die Platzhalter wieder durch die ursprünglichen Variablen
    const finalTemplate = translatedText.replace(/__VAR_([^_]+)__/g, (match, variable) => {
      return `{{${variable}}}`;
    });
    
    // Erstelle übersetztes Template
    return await createPromptTemplate(
      templateName,
      finalTemplate,
      targetLang,
      sourceTemplate.description ? await translateText(sourceTemplate.description, targetLang, sourceLang) : ''
    );
  } catch (error) {
    logger.error('Fehler beim Übersetzen des Prompt-Templates', error);
    throw new Error(`Fehler beim Übersetzen des Prompt-Templates: ${error.message}`);
  }
}

/**
 * Listet alle verfügbaren Prompt-Templates auf
 * 
 * @returns Liste der verfügbaren Templates
 */
export async function listPromptTemplates(): Promise<object[]> {
  logger.info('Liste verfügbare Prompt-Templates auf...');
  
  try {
    const templateDir = path.join(process.cwd(), 'prompts');
    if (!fs.existsSync(templateDir)) {
      return [];
    }
    
    // Lade Template-Registry
    const registry = await loadTemplateRegistry();
    return registry;
  } catch (error) {
    logger.error('Fehler beim Auflisten der Prompt-Templates', error);
    throw new Error(`Fehler beim Auflisten der Prompt-Templates: ${error.message}`);
  }
}

// Hilfsfunktionen

/**
 * Lädt ein Prompt-Template aus Datei oder Cache
 */
async function loadPromptTemplate(templateName: string, language: string): Promise<any> {
  const langCode = normalizeLanguageCode(language);
  
  // Versuche zuerst aus dem Cache zu laden
  const cachedTemplate = await multilingualCache.get(`template:${templateName}:${langCode}`);
  if (cachedTemplate) {
    return cachedTemplate;
  }
  
  // Versuche aus Datei zu laden
  const templatePath = path.join(process.cwd(), 'prompts', `${templateName}.${langCode}.json`);
  if (fs.existsSync(templatePath)) {
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    const template = JSON.parse(templateContent);
    
    // Speichere im Cache für schnelleren Zugriff
    await multilingualCache.set(`template:${templateName}:${langCode}`, template, 30 * 24 * 60 * 60); // 30 Tage
    
    return template;
  }
  
  // Wenn Template in angegebener Sprache nicht gefunden wurde, versuche Englisch oder Deutsch
  if (langCode !== 'en' && langCode !== 'de') {
    // Versuche zuerst Englisch, dann Deutsch
    const englishTemplate = await loadPromptTemplate(templateName, 'en');
    if (englishTemplate) return englishTemplate;
    
    const germanTemplate = await loadPromptTemplate(templateName, 'de');
    if (germanTemplate) return germanTemplate;
  } else if (langCode === 'en') {
    // Versuche Deutsch
    const germanTemplate = await loadPromptTemplate(templateName, 'de');
    if (germanTemplate) return germanTemplate;
  } else if (langCode === 'de') {
    // Versuche Englisch
    const englishTemplate = await loadPromptTemplate(templateName, 'en');
    if (englishTemplate) return englishTemplate;
  }
  
  return null;
}

/**
 * Lädt die Template-Registry, die alle verfügbaren Templates enthält
 */
async function loadTemplateRegistry(): Promise<any[]> {
  const registryPath = path.join(process.cwd(), 'prompts', 'registry.json');
  
  if (fs.existsSync(registryPath)) {
    const registryContent = fs.readFileSync(registryPath, 'utf8');
    return JSON.parse(registryContent);
  }
  
  return [];
}

/**
 * Aktualisiert die Template-Registry basierend auf verfügbaren Template-Dateien
 */
async function updateTemplateRegistry(): Promise<void> {
  const templateDir = path.join(process.cwd(), 'prompts');
  
  if (!fs.existsSync(templateDir)) {
    fs.mkdirSync(templateDir, { recursive: true });
  }
  
  // Suche nach allen Template-Dateien
  const files = fs.readdirSync(templateDir);
  const templates = [];
  
  for (const file of files) {
    if (file === 'registry.json') continue;
    
    if (file.endsWith('.json')) {
      const filePath = path.join(templateDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      try {
        const template = JSON.parse(content);
        templates.push({
          name: template.name,
          language: template.language,
          description: template.description,
          variables: template.variables,
          path: filePath,
          updatedAt: template.updatedAt || new Date().toISOString()
        });
      } catch (error) {
        logger.warn(`Konnte Template-Datei nicht parsen: ${file}`, error);
      }
    }
  }
  
  // Speichere Registry
  const registryPath = path.join(templateDir, 'registry.json');
  fs.writeFileSync(registryPath, JSON.stringify(templates, null, 2));
}

/**
 * Extrahiert Variablen aus einem Template-String
 */
function extractTemplateVariables(template: string): string[] {
  const matches = template.match(/\{\{([^}]+)\}\}/g) || [];
  const variables = matches.map(match => match.slice(2, -2));
  
  // Entferne Duplikate
  return [...new Set(variables)];
}

/**
 * Füllt Template-Variablen mit Werten
 */
function fillTemplateVariables(template: any, variables: object): string {
  let filledTemplate = template.template;
  
  for (const [key, value] of Object.entries(variables)) {
    filledTemplate = filledTemplate.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
  }
  
  return filledTemplate;
}

/**
 * Normalisiert einen Sprachcode
 */
function normalizeLanguageCode(language: string): string {
  // Wenn es sich um einen zweistelligen Code handelt, gib ihn zurück
  if (/^[a-z]{2}$/.test(language)) {
    return language.toLowerCase();
  }
  
  // Wenn es sich um einen längeren Code handelt, nimm nur die ersten beiden Zeichen
  if (/^[a-z]{2}-[A-Z]{2}$/.test(language)) {
    return language.substring(0, 2).toLowerCase();
  }
  
  // Versuche, den Namen zu erkennen
  const languageEntry = SUPPORTED_LANGUAGES.find(
    lang => lang.name.toLowerCase() === language.toLowerCase() || 
            lang.nativeName.toLowerCase() === language.toLowerCase()
  );
  
  if (languageEntry) {
    return languageEntry.code;
  }
  
  // Fallback auf Deutsch
  return 'de';
}

/**
 * Gibt den Sprachnamen für einen Code zurück
 */
function getLanguageName(langCode: string): string {
  const language = SUPPORTED_LANGUAGES.find(lang => lang.code === langCode);
  return language ? language.name : langCode;
}

/**
 * Bestimmt den Markt (Land) basierend auf dem Marketplace
 */
function getMarketByMarketplace(marketplace: string): string {
  const marketplaceMap = {
    'amazon.de': 'Deutschland',
    'amazon.com': 'USA',
    'amazon.co.uk': 'Großbritannien',
    'amazon.fr': 'Frankreich',
    'amazon.es': 'Spanien',
    'amazon.it': 'Italien',
    'amazon.nl': 'Niederlande',
    'amazon.pl': 'Polen',
    'amazon.se': 'Schweden'
  };
  
  return marketplaceMap[marketplace] || 'Deutschland';
} 