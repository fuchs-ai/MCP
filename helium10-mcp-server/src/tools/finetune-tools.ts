/**
 * Feintuning-Tools für den Helium10 MCP-Server
 * 
 * Dieses Modul bietet MCP-Tools für das Feintuning des DeepSeek-Modells auf spezifische E-Commerce-Daten.
 */

import {
  createProductDataset,
  prepareTrainingData,
  finetuneLLMModel,
  generateWithFinetunedModel,
  listFinetunedModels,
  TrainingDataset,
  FinetuneConfig,
  DEFAULT_FINETUNE_CONFIG
} from '../ml/finetune';
import { logger } from '../utils/logger';

/**
 * Erstellt ein Trainingsdatensatz aus Amazon-Produkten in einer bestimmten Kategorie
 * 
 * @param {string} category Die Produktkategorie
 * @param {string} datasetName Name des zu erstellenden Datasets
 * @param {number} sampleSize Anzahl der zu sammelnden Produkte
 * @param {string} marketplace Amazon Marketplace
 * @returns {Promise<object>} Informationen zum erstellten Dataset
 */
export async function createProductDatasetTool(
  category: string,
  datasetName: string,
  sampleSize: number = 100,
  marketplace: string = 'amazon.de'
): Promise<object> {
  logger.info(`Erstelle Produktdatensatz für Kategorie ${category}...`);
  
  try {
    const dataset = await createProductDataset(
      category,
      datasetName,
      sampleSize,
      marketplace
    );
    
    return {
      success: true,
      datasetName: dataset.name,
      category: dataset.category,
      exampleCount: dataset.examples.length,
      createdAt: dataset.createdAt,
      marketplace
    };
  } catch (error) {
    logger.error('Fehler beim Erstellen des Produktdatensatzes', error);
    throw new Error(`Fehler beim Erstellen des Produktdatensatzes: ${error.message}`);
  }
}

/**
 * Führt das Feintuning eines LLM-Modells mit einem vorhandenen Datensatz durch
 * 
 * @param {string} datasetName Name des zu verwendenden Datasets
 * @param {string} outputModelName Name des feingetuned Modells
 * @param {Partial<FinetuneConfig>} config Optionale Feintuning-Konfiguration
 * @returns {Promise<object>} Informationen zum Feintuning-Prozess und -Ergebnis
 */
export async function finetuneLLMModelTool(
  datasetName: string,
  outputModelName: string,
  config: Partial<FinetuneConfig> = {}
): Promise<object> {
  logger.info(`Starte Feintuning mit Datensatz ${datasetName}...`);
  
  try {
    // Importiere Cache dynamisch
    const { FileSystemCache } = await import('../cache/file-cache');
    const finetuneCache = new FileSystemCache('finetune-cache');
    
    // Suche das Dataset im Cache
    const dataset = await finetuneCache.get(`dataset:${datasetName}`);
    
    if (!dataset) {
      throw new Error(`Datensatz ${datasetName} nicht gefunden. Bitte erstellen Sie zuerst einen Datensatz.`);
    }
    
    // Bereite Trainingsdaten vor
    const datasetPath = await prepareTrainingData(dataset, config);
    
    // Führe Feintuning durch
    const finetuningResult = await finetuneLLMModel(datasetPath, outputModelName, config);
    
    return {
      success: true,
      modelName: outputModelName,
      baseDataset: datasetName,
      ...finetuningResult
    };
  } catch (error) {
    logger.error('Fehler beim Feintuning des LLM-Modells', error);
    throw new Error(`Fehler beim Feintuning des LLM-Modells: ${error.message}`);
  }
}

/**
 * Generiert Text mit einem feingetuned Modell
 * 
 * @param {string} prompt Der Eingabetext
 * @param {string} modelName Name des feingetuned Modells
 * @param {object} config Optionale Konfiguration
 * @returns {Promise<object>} Generierungsergebnis
 */
export async function generateWithFinetunedModelTool(
  prompt: string,
  modelName: string,
  config: object = {}
): Promise<object> {
  logger.info(`Generiere Text mit feingetuntem Modell ${modelName}...`);
  
  try {
    const generatedText = await generateWithFinetunedModel(prompt, modelName, config);
    
    return {
      prompt,
      generatedText,
      modelName,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Fehler bei der Textgenerierung mit feingetuntem Modell', error);
    throw new Error(`Fehler bei der Textgenerierung: ${error.message}`);
  }
}

/**
 * Generiert eine optimierte Produktbeschreibung mit einem feingetuned Modell
 * 
 * @param {string} asin ASIN des zu optimierenden Produkts (optional)
 * @param {object} productInfo Produktinformationen (falls kein ASIN angegeben)
 * @param {string} modelName Name des feingetuned Modells
 * @param {string} targetAudience Zielgruppe für die Optimierung
 * @param {string} optimizationGoal Ziel der Optimierung (conversion, seo, branding)
 * @returns {Promise<object>} Optimierungsergebnis
 */
export async function generateProductDescriptionWithFinetunedModelTool(
  asin: string = '',
  productInfo: any = {},
  modelName: string,
  targetAudience: string = 'Allgemein',
  optimizationGoal: string = 'conversion'
): Promise<object> {
  logger.info(`Generiere optimierte Produktbeschreibung mit Modell ${modelName}...`);
  
  try {
    let productDetails: any = {};
    
    // Falls ASIN angegeben, hole Produktdetails
    if (asin) {
      const { getProductDetails } = await import('../apis/amazon-api');
      productDetails = await getProductDetails(asin);
    } else {
      // Verwende bereitgestellte Produktinformationen
      productDetails = productInfo;
    }
    
    // Überprüfe, ob ausreichend Informationen vorhanden sind
    if (!productDetails.title && !productInfo.title) {
      throw new Error('Keine Produktinformationen angegeben. Bitte ASIN oder Produktdetails angeben.');
    }
    
    // Kombiniere alle verfügbaren Informationen
    const combinedInfo = {
      title: productDetails.title || productInfo.title || '',
      description: productDetails.description || productInfo.description || '',
      bulletPoints: productDetails.bulletPoints || productInfo.bulletPoints || [],
      category: productDetails.category || productInfo.category || '',
      price: productDetails.price || productInfo.price || '',
      features: productInfo.features || []
    };
    
    // Wähle Prompt basierend auf Optimierungsziel
    let prompt = '';
    let optimizationDescription = '';
    
    switch (optimizationGoal) {
      case 'seo':
        optimizationDescription = 'SEO-optimierte Produktbeschreibung mit relevanten Keywords';
        prompt = `
Erstelle eine SEO-optimierte Produktbeschreibung für folgendes Amazon-Produkt, die für die Zielgruppe "${targetAudience}" geeignet ist:

Titel: ${combinedInfo.title}
Kategorie: ${combinedInfo.category}
Preis: ${combinedInfo.price}

Aktuelle Beschreibung:
${combinedInfo.description}

Aktuelle Verkaufsargumente:
${combinedInfo.bulletPoints.join('\n')}

Zusätzliche Merkmale:
${combinedInfo.features.join('\n')}

Erstelle:
1. Eine optimierte, SEO-freundliche Produktbeschreibung (250-300 Wörter) mit relevanten Keywords
2. 5-7 prägnante, keyword-reiche Verkaufsargumente (Bullet Points)
        `;
        break;
        
      case 'branding':
        optimizationDescription = 'Markenstärkende Produktbeschreibung mit emotionaler Bindung';
        prompt = `
Erstelle eine markenstärkende Produktbeschreibung für folgendes Produkt, die für die Zielgruppe "${targetAudience}" geeignet ist:

Titel: ${combinedInfo.title}
Kategorie: ${combinedInfo.category}
Preis: ${combinedInfo.price}

Aktuelle Beschreibung:
${combinedInfo.description}

Aktuelle Verkaufsargumente:
${combinedInfo.bulletPoints.join('\n')}

Zusätzliche Merkmale:
${combinedInfo.features.join('\n')}

Erstelle:
1. Eine emotionale, markenstärkende Produktbeschreibung (250-300 Wörter)
2. 5-7 überzeugende, markenfokussierte Verkaufsargumente (Bullet Points)
        `;
        break;
        
      default: // 'conversion'
        optimizationDescription = 'Conversion-optimierte Produktbeschreibung für höhere Verkaufsraten';
        prompt = `
Erstelle eine conversion-optimierte Produktbeschreibung für folgendes Produkt, die für die Zielgruppe "${targetAudience}" geeignet ist:

Titel: ${combinedInfo.title}
Kategorie: ${combinedInfo.category}
Preis: ${combinedInfo.price}

Aktuelle Beschreibung:
${combinedInfo.description}

Aktuelle Verkaufsargumente:
${combinedInfo.bulletPoints.join('\n')}

Zusätzliche Merkmale:
${combinedInfo.features.join('\n')}

Erstelle:
1. Eine überzeugende, verkaufsorientierte Produktbeschreibung (250-300 Wörter)
2. 5-7 prägnante, verkaufsfördernde Verkaufsargumente (Bullet Points)
        `;
    }
    
    // Generiere optimierte Beschreibung mit feingetuntem Modell
    const generatedContent = await generateWithFinetunedModel(prompt, modelName, {
      maxLength: 1000,
      temperature: 0.7,
      topP: 0.9
    });
    
    // Extrahiere Beschreibung und Bullet Points aus generiertem Text
    const sections = generatedContent.split('\n\n');
    let description = '';
    let bulletPoints: string[] = [];
    
    // Einfache Heuristik zur Unterscheidung von Beschreibung und Bullets
    let inBulletSection = false;
    
    for (const section of sections) {
      if (section.trim().startsWith('Verkaufsargumente:') || 
          section.trim().startsWith('Bullet Points:')) {
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
          description += section + '\n\n';
        }
      }
    }
    
    return {
      title: combinedInfo.title,
      originalDescription: combinedInfo.description,
      optimizedDescription: description.trim(),
      originalBulletPoints: combinedInfo.bulletPoints,
      optimizedBulletPoints: bulletPoints,
      targetAudience,
      optimizationGoal,
      optimizationDescription,
      modelName,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Fehler bei der Generierung der Produktbeschreibung mit feingetuntem Modell', error);
    throw new Error(`Fehler bei der Generierung der Produktbeschreibung: ${error.message}`);
  }
}

/**
 * Listet alle verfügbaren feingetuned Modelle auf
 * 
 * @returns {Promise<object>} Liste der verfügbaren feingetuned Modelle
 */
export async function listFinetunedModelsTool(): Promise<object> {
  logger.info('Liste verfügbare feingetuned Modelle auf...');
  
  try {
    const models = await listFinetunedModels();
    
    return {
      success: true,
      modelCount: models.length,
      models,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Fehler beim Auflisten der feingetuned Modelle', error);
    throw new Error(`Fehler beim Auflisten der feingetuned Modelle: ${error.message}`);
  }
}

/**
 * Führt ein komplettes Feintuning-Workflow durch: 
 * Datensatzerstellung, Feintuning und Beispielgenerierung
 * 
 * @param {string} category Die Produktkategorie für das Feintuning
 * @param {string} modelName Name des zu erstellenden Modells
 * @param {number} sampleSize Anzahl der zu sammelnden Produkte
 * @param {string} marketplace Amazon Marketplace
 * @param {Partial<FinetuneConfig>} config Optionale Feintuning-Konfiguration
 * @returns {Promise<object>} Workflow-Ergebnis
 */
export async function completeFineTuningWorkflowTool(
  category: string,
  modelName: string,
  sampleSize: number = 100,
  marketplace: string = 'amazon.de',
  config: Partial<FinetuneConfig> = {}
): Promise<object> {
  logger.info(`Starte kompletten Feintuning-Workflow für Kategorie ${category}...`);
  
  try {
    // Schritt 1: Datensatz erstellen
    logger.info('Schritt 1/3: Datensatz erstellen...');
    const datasetName = `${category.replace(/\s+/g, '_')}_${Date.now()}`;
    const dataset = await createProductDataset(
      category,
      datasetName,
      sampleSize,
      marketplace
    );
    
    // Schritt 2: Feintuning durchführen
    logger.info('Schritt 2/3: Feintuning durchführen...');
    const datasetPath = await prepareTrainingData(dataset, config);
    const finetuningResult = await finetuneLLMModel(datasetPath, modelName, config);
    
    // Schritt 3: Beispiel generieren
    logger.info('Schritt 3/3: Beispiel generieren...');
    const testPrompt = `Erstelle eine optimierte Produktbeschreibung für ein neues Premium-Produkt in der Kategorie ${category}.`;
    const exampleText = await generateWithFinetunedModel(testPrompt, modelName, {
      maxLength: 500,
      temperature: 0.7
    });
    
    return {
      success: true,
      workflow: {
        category,
        modelName,
        sampleSize,
        marketplace,
        completedAt: new Date().toISOString(),
      },
      dataset: {
        name: dataset.name,
        exampleCount: dataset.examples.length
      },
      finetuning: finetuningResult,
      exampleGeneration: {
        prompt: testPrompt,
        generatedText: exampleText
      }
    };
  } catch (error) {
    logger.error('Fehler beim Feintuning-Workflow', error);
    throw new Error(`Fehler beim Feintuning-Workflow: ${error.message}`);
  }
} 