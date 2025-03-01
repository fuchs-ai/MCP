/**
 * A/B-Testing-Tools für LLM-generierte Inhalte
 * 
 * Dieses Modul bietet Tools zum Vergleichen verschiedener LLM-generierter Inhalte
 * und zum Messen der Effektivität zur Optimierung.
 */

import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../utils/logger';
import { generateText, LLMConfig, DEFAULT_LLM_CONFIG } from '../ml/llm';
import { FileSystemCache } from '../cache/file-cache';
import { generateWithFinetunedModel } from '../ml/finetune';

// Cache für Testergebnisse
const abTestCache = new FileSystemCache('ab-test-cache');

// AB-Test-Typen
export enum ABTestType {
  PRODUCT_DESCRIPTION = 'product_description',
  BULLET_POINTS = 'bullet_points',
  TITLE = 'title',
  PROMPT_COMPARISON = 'prompt_comparison',
  PARAMETER_COMPARISON = 'parameter_comparison',
  MODEL_COMPARISON = 'model_comparison'
}

// AB-Test-Status
export enum ABTestStatus {
  DRAFT = 'draft',
  RUNNING = 'running',
  COMPLETED = 'completed',
  ANALYZED = 'analyzed'
}

// AB-Test-Konfiguration
interface ABTestConfig {
  id: string;
  name: string;
  description: string;
  type: ABTestType;
  status: ABTestStatus;
  variants: Array<{
    id: string;
    name: string;
    description: string;
    prompt?: string;
    parameters?: Partial<LLMConfig>;
    modelName?: string;
    content?: string;
    metrics?: {
      impressions?: number;
      clicks?: number;
      conversions?: number;
      ctr?: number;
      conversionRate?: number;
    };
  }>;
  targetAudience?: string;
  marketplaces?: string[];
  productCategory?: string;
  productAsin?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  winningVariantId?: string;
}

// Verzeichnis für AB-Tests
const ABTESTS_DIR = path.join(process.cwd(), 'abtests');

// Stellt sicher, dass das AB-Test-Verzeichnis existiert
function ensureABTestDirectory() {
  if (!fs.existsSync(ABTESTS_DIR)) {
    fs.mkdirSync(ABTESTS_DIR, { recursive: true });
  }
}

/**
 * Erstellt einen neuen A/B-Test
 * 
 * @param {string} name Name des Tests
 * @param {string} description Beschreibung des Tests
 * @param {ABTestType} type Typ des Tests
 * @param {object[]} variants Testvarianten
 * @param {object} options Zusätzliche Testoptionen
 * @returns {Promise<object>} Erstellungsergebnis
 */
export async function createABTestTool(
  name: string,
  description: string,
  type: ABTestType,
  variants: Array<{
    name: string;
    description: string;
    prompt?: string;
    parameters?: Partial<LLMConfig>;
    modelName?: string;
  }>,
  options: {
    targetAudience?: string;
    marketplaces?: string[];
    productCategory?: string;
    productAsin?: string;
  } = {}
): Promise<object> {
  logger.info(`Erstelle A/B-Test "${name}" vom Typ ${type}...`);
  
  try {
    ensureABTestDirectory();
    
    // Validiere Varianten basierend auf dem Typ
    if (variants.length < 2) {
      throw new Error('Ein A/B-Test benötigt mindestens zwei Varianten');
    }
    
    // Generiere eindeutige ID
    const id = `abtest_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // Bereite Varianten mit IDs vor
    const variantsWithIds = variants.map((variant, index) => ({
      id: `variant_${index + 1}`,
      name: variant.name,
      description: variant.description,
      prompt: variant.prompt,
      parameters: variant.parameters,
      modelName: variant.modelName,
      metrics: {}
    }));
    
    // Erstelle AB-Test-Objekt
    const abTest: ABTestConfig = {
      id,
      name,
      description,
      type,
      status: ABTestStatus.DRAFT,
      variants: variantsWithIds,
      ...options,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Speichere AB-Test in Datei
    const abTestPath = path.join(ABTESTS_DIR, `${id}.json`);
    fs.writeFileSync(abTestPath, JSON.stringify(abTest, null, 2));
    
    // Aktualisiere Cache
    await abTestCache.set(`abtest:${id}`, abTest, 365 * 24 * 60 * 60); // 1 Jahr
    
    return {
      success: true,
      abtest: {
        id,
        name,
        description,
        type,
        status: ABTestStatus.DRAFT,
        variantCount: variantsWithIds.length,
        createdAt: abTest.createdAt
      }
    };
  } catch (error) {
    logger.error('Fehler beim Erstellen des A/B-Tests', error);
    throw new Error(`Fehler beim Erstellen des A/B-Tests: ${error.message}`);
  }
}

/**
 * Startet einen A/B-Test mit der Generierung aller Varianten
 * 
 * @param {string} id ID des zu startenden Tests
 * @param {object} productInfo Optionale Produktinformationen (falls benötigt)
 * @returns {Promise<object>} Startergebnis mit generierten Inhalten
 */
export async function runABTestTool(
  id: string,
  productInfo?: any
): Promise<object> {
  logger.info(`Starte A/B-Test "${id}"...`);
  
  try {
    // Lade AB-Test
    const abTest = await loadABTest(id);
    
    if (!abTest) {
      throw new Error(`A/B-Test mit ID ${id} nicht gefunden`);
    }
    
    // Prüfe, ob der Test bereits läuft oder abgeschlossen ist
    if (abTest.status !== ABTestStatus.DRAFT) {
      throw new Error(`A/B-Test ist bereits ${abTest.status}`);
    }
    
    // Aktualisiere Status
    abTest.status = ABTestStatus.RUNNING;
    abTest.updatedAt = new Date().toISOString();
    
    // Generiere Inhalte für jede Variante
    for (const variant of abTest.variants) {
      logger.info(`Generiere Inhalt für Variante "${variant.name}"...`);
      
      let generatedContent: string;
      
      // Generierungsmethode basierend auf den Parametern wählen
      if (variant.modelName && variant.modelName !== DEFAULT_LLM_CONFIG.modelName) {
        // Verwende feingetuntes Modell
        generatedContent = await generateWithFinetunedModel(
          variant.prompt,
          variant.modelName,
          variant.parameters
        );
      } else {
        // Verwende Standardmodell
        generatedContent = await generateText(
          variant.prompt,
          variant.parameters
        );
      }
      
      // Speichere generierten Inhalt
      variant.content = generatedContent;
    }
    
    // Speichere aktualisiertes AB-Test-Objekt
    await saveABTest(abTest);
    
    return {
      success: true,
      abtest: {
        id: abTest.id,
        name: abTest.name,
        status: abTest.status,
        type: abTest.type,
        variants: abTest.variants.map(v => ({
          id: v.id,
          name: v.name,
          content: v.content
        })),
        updatedAt: abTest.updatedAt
      }
    };
  } catch (error) {
    logger.error('Fehler beim Starten des A/B-Tests', error);
    throw new Error(`Fehler beim Starten des A/B-Tests: ${error.message}`);
  }
}

/**
 * Aktualisiert die Metriken einer Testvariante
 * 
 * @param {string} testId ID des Tests
 * @param {string} variantId ID der Variante
 * @param {object} metrics Zu aktualisierende Metriken
 * @returns {Promise<object>} Aktualisierungsergebnis
 */
export async function updateABTestMetricsTool(
  testId: string,
  variantId: string,
  metrics: {
    impressions?: number;
    clicks?: number;
    conversions?: number;
  }
): Promise<object> {
  logger.info(`Aktualisiere Metriken für Variante ${variantId} in Test ${testId}...`);
  
  try {
    // Lade AB-Test
    const abTest = await loadABTest(testId);
    
    if (!abTest) {
      throw new Error(`A/B-Test mit ID ${testId} nicht gefunden`);
    }
    
    // Finde Variante
    const variant = abTest.variants.find(v => v.id === variantId);
    
    if (!variant) {
      throw new Error(`Variante mit ID ${variantId} im Test ${testId} nicht gefunden`);
    }
    
    // Initialisiere Metriken, falls nicht vorhanden
    if (!variant.metrics) {
      variant.metrics = {};
    }
    
    // Aktualisiere Metriken
    const updatedMetrics = {
      ...variant.metrics,
      ...metrics
    };
    
    // Berechne abgeleitete Metriken
    if (updatedMetrics.impressions > 0) {
      if (updatedMetrics.clicks !== undefined) {
        updatedMetrics.ctr = updatedMetrics.clicks / updatedMetrics.impressions;
      }
      
      if (updatedMetrics.conversions !== undefined) {
        updatedMetrics.conversionRate = updatedMetrics.conversions / updatedMetrics.impressions;
      }
    }
    
    variant.metrics = updatedMetrics;
    
    // Aktualisiere Test
    abTest.updatedAt = new Date().toISOString();
    
    // Speichere aktualisiertes AB-Test-Objekt
    await saveABTest(abTest);
    
    return {
      success: true,
      testId,
      variantId,
      updatedMetrics: variant.metrics
    };
  } catch (error) {
    logger.error('Fehler beim Aktualisieren der A/B-Test-Metriken', error);
    throw new Error(`Fehler beim Aktualisieren der A/B-Test-Metriken: ${error.message}`);
  }
}

/**
 * Schließt einen A/B-Test ab und analysiert die Ergebnisse
 * 
 * @param {string} id ID des abzuschließenden Tests
 * @returns {Promise<object>} Analyseergebnis
 */
export async function completeABTestTool(id: string): Promise<object> {
  logger.info(`Schließe A/B-Test "${id}" ab...`);
  
  try {
    // Lade AB-Test
    const abTest = await loadABTest(id);
    
    if (!abTest) {
      throw new Error(`A/B-Test mit ID ${id} nicht gefunden`);
    }
    
    // Prüfe, ob der Test bereits abgeschlossen ist
    if (abTest.status === ABTestStatus.ANALYZED) {
      throw new Error('A/B-Test ist bereits abgeschlossen und analysiert');
    }
    
    // Aktualisiere Status
    abTest.status = ABTestStatus.COMPLETED;
    abTest.completedAt = new Date().toISOString();
    abTest.updatedAt = new Date().toISOString();
    
    // Analysiere Ergebnisse, um die beste Variante zu bestimmen
    let bestVariantId: string = null;
    let bestMetricValue = -1;
    
    // Je nach Testtyp verschiedene Metriken für die Bestimmung des Gewinners verwenden
    const metricToCompare = getMetricByTestType(abTest.type);
    
    // Finde Variante mit der besten Metrik
    for (const variant of abTest.variants) {
      if (variant.metrics && variant.metrics[metricToCompare] !== undefined) {
        if (variant.metrics[metricToCompare] > bestMetricValue) {
          bestMetricValue = variant.metrics[metricToCompare];
          bestVariantId = variant.id;
        }
      }
    }
    
    // Setze Gewinnervariante
    abTest.winningVariantId = bestVariantId;
    
    // Markiere als analysiert
    abTest.status = ABTestStatus.ANALYZED;
    
    // Speichere aktualisiertes AB-Test-Objekt
    await saveABTest(abTest);
    
    // Bestimme Gewinnerdetails
    const winnerDetails = bestVariantId 
      ? abTest.variants.find(v => v.id === bestVariantId)
      : null;
    
    return {
      success: true,
      abtest: {
        id: abTest.id,
        name: abTest.name,
        status: abTest.status,
        completedAt: abTest.completedAt,
        winningVariant: winnerDetails 
          ? {
              id: winnerDetails.id,
              name: winnerDetails.name,
              content: winnerDetails.content,
              metrics: winnerDetails.metrics
            }
          : null,
        metricUsed: metricToCompare,
        allVariants: abTest.variants.map(v => ({
          id: v.id,
          name: v.name,
          metrics: v.metrics
        }))
      }
    };
  } catch (error) {
    logger.error('Fehler beim Abschließen des A/B-Tests', error);
    throw new Error(`Fehler beim Abschließen des A/B-Tests: ${error.message}`);
  }
}

/**
 * Listet alle A/B-Tests auf
 * 
 * @param {ABTestStatus} status Optional: Status zum Filtern
 * @param {ABTestType} type Optional: Typ zum Filtern
 * @returns {Promise<object>} Liste der A/B-Tests
 */
export async function listABTestsTool(
  status?: ABTestStatus,
  type?: ABTestType
): Promise<object> {
  logger.info('Liste A/B-Tests auf...');
  
  try {
    ensureABTestDirectory();
    
    const abtests = await loadAllABTests();
    
    // Filtere nach Status und Typ, falls angegeben
    const filteredTests = abtests.filter(test => {
      if (status && test.status !== status) {
        return false;
      }
      
      if (type && test.type !== type) {
        return false;
      }
      
      return true;
    });
    
    return {
      success: true,
      testCount: filteredTests.length,
      tests: filteredTests.map(test => ({
        id: test.id,
        name: test.name,
        description: test.description,
        type: test.type,
        status: test.status,
        variantCount: test.variants.length,
        createdAt: test.createdAt,
        updatedAt: test.updatedAt,
        completedAt: test.completedAt,
        winningVariantId: test.winningVariantId
      }))
    };
  } catch (error) {
    logger.error('Fehler beim Auflisten der A/B-Tests', error);
    throw new Error(`Fehler beim Auflisten der A/B-Tests: ${error.message}`);
  }
}

/**
 * Ruft die Details eines A/B-Tests ab
 * 
 * @param {string} id ID des abzurufenden Tests
 * @returns {Promise<object>} Testdetails
 */
export async function getABTestDetailsTool(id: string): Promise<object> {
  logger.info(`Rufe Details für A/B-Test "${id}" ab...`);
  
  try {
    // Lade AB-Test
    const abTest = await loadABTest(id);
    
    if (!abTest) {
      throw new Error(`A/B-Test mit ID ${id} nicht gefunden`);
    }
    
    // Bestimme Gewinnerdetails
    const winnerDetails = abTest.winningVariantId 
      ? abTest.variants.find(v => v.id === abTest.winningVariantId)
      : null;
    
    return {
      success: true,
      abtest: {
        id: abTest.id,
        name: abTest.name,
        description: abTest.description,
        type: abTest.type,
        status: abTest.status,
        targetAudience: abTest.targetAudience,
        marketplaces: abTest.marketplaces,
        productCategory: abTest.productCategory,
        productAsin: abTest.productAsin,
        createdAt: abTest.createdAt,
        updatedAt: abTest.updatedAt,
        completedAt: abTest.completedAt,
        variants: abTest.variants.map(v => ({
          id: v.id,
          name: v.name,
          description: v.description,
          content: v.content,
          metrics: v.metrics
        })),
        winningVariant: winnerDetails
          ? {
              id: winnerDetails.id,
              name: winnerDetails.name,
              description: winnerDetails.description,
              content: winnerDetails.content,
              metrics: winnerDetails.metrics
            }
          : null
      }
    };
  } catch (error) {
    logger.error('Fehler beim Abrufen der A/B-Test-Details', error);
    throw new Error(`Fehler beim Abrufen der A/B-Test-Details: ${error.message}`);
  }
}

// Hilfsfunktionen

/**
 * Lädt einen AB-Test aus Datei oder Cache
 */
async function loadABTest(id: string): Promise<ABTestConfig | null> {
  // Versuche zuerst aus dem Cache zu laden
  const cachedABTest = await abTestCache.get(`abtest:${id}`);
  if (cachedABTest) {
    return cachedABTest;
  }
  
  // Versuche aus Datei zu laden
  const abTestPath = path.join(ABTESTS_DIR, `${id}.json`);
  if (fs.existsSync(abTestPath)) {
    const abTestContent = fs.readFileSync(abTestPath, 'utf8');
    const abTest = JSON.parse(abTestContent);
    
    // Speichere im Cache für schnelleren Zugriff
    await abTestCache.set(`abtest:${id}`, abTest, 365 * 24 * 60 * 60);
    
    return abTest;
  }
  
  return null;
}

/**
 * Speichert einen AB-Test in Datei und Cache
 */
async function saveABTest(abTest: ABTestConfig): Promise<void> {
  ensureABTestDirectory();
  
  // Speichere in Datei
  const abTestPath = path.join(ABTESTS_DIR, `${abTest.id}.json`);
  fs.writeFileSync(abTestPath, JSON.stringify(abTest, null, 2));
  
  // Speichere im Cache
  await abTestCache.set(`abtest:${abTest.id}`, abTest, 365 * 24 * 60 * 60);
}

/**
 * Lädt alle AB-Tests
 */
async function loadAllABTests(): Promise<ABTestConfig[]> {
  ensureABTestDirectory();
  
  const abtests: ABTestConfig[] = [];
  
  const files = fs.readdirSync(ABTESTS_DIR);
  
  for (const file of files) {
    if (file.endsWith('.json')) {
      const filePath = path.join(ABTESTS_DIR, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      try {
        const abtest = JSON.parse(content);
        abtests.push(abtest);
      } catch (error) {
        logger.warn(`Konnte AB-Test-Datei nicht parsen: ${file}`, error);
      }
    }
  }
  
  return abtests;
}

/**
 * Gibt die relevante Metrik basierend auf dem Testtyp zurück
 */
function getMetricByTestType(type: ABTestType): string {
  switch (type) {
    case ABTestType.TITLE:
      return 'ctr';  // Click-Through-Rate für Titel
    case ABTestType.PRODUCT_DESCRIPTION:
    case ABTestType.BULLET_POINTS:
      return 'conversionRate';  // Conversion-Rate für Produktbeschreibungen
    default:
      return 'conversionRate';  // Standardwert
  }
} 