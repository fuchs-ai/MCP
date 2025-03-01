/**
 * LLM-Tools für den Helium10 MCP-Server
 * 
 * Dieses Modul bietet MCP-Tools für das DeepSeek-R1-Distill-Llama-8B Modell.
 */

import {
  setupLLMEnvironment,
  generateText,
  generateChatResponse,
  LLMConfig,
  DEFAULT_LLM_CONFIG
} from '../ml/llm';
import { FileSystemCache } from '../cache/file-cache';
import { logger } from '../utils/logger';

// Cache-Instanz für LLM-Tools
const llmToolsCache = new FileSystemCache('llm-tools-cache');

/**
 * Initialisiert die LLM-Umgebung und installiert fehlende Abhängigkeiten
 * 
 * @returns {Promise<object>} Initialisierungsstatus
 */
export async function initializeLLMEnvironmentTool(): Promise<object> {
  logger.info('Initialisiere LLM-Umgebung...');
  
  try {
    const isSetup = await setupLLMEnvironment();
    
    return {
      success: isSetup,
      timestamp: new Date().toISOString(),
      message: isSetup 
        ? 'LLM-Umgebung erfolgreich initialisiert' 
        : 'Fehler bei der Initialisierung der LLM-Umgebung'
    };
  } catch (error) {
    logger.error('Fehler bei der Initialisierung der LLM-Umgebung', error);
    throw new Error(`Fehler bei der Initialisierung der LLM-Umgebung: ${error.message}`);
  }
}

/**
 * Generiert Text mit dem DeepSeek-R1-Distill-Llama-8B-Modell
 * 
 * @param {string} prompt Der Eingabetext
 * @param {Partial<LLMConfig>} config Optionale Konfiguration
 * @returns {Promise<object>} Generierungsergebnis
 */
export async function generateLLMTextTool(
  prompt: string,
  config: Partial<LLMConfig> = {}
): Promise<object> {
  logger.info(`Generiere Text mit LLM: ${prompt.substring(0, 50)}...`);
  
  try {
    const generatedText = await generateText(prompt, config);
    
    return {
      prompt,
      generatedText,
      modelInfo: {
        name: config.modelName || DEFAULT_LLM_CONFIG.modelName,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    logger.error('Fehler bei der LLM-Textgenerierung', error);
    throw new Error(`Fehler bei der LLM-Textgenerierung: ${error.message}`);
  }
}

/**
 * Generiert Antworten im Chat-Format mit dem DeepSeek-R1-Distill-Llama-8B-Modell
 * 
 * @param {Array<{role: string, content: string}>} messages Die Chat-Nachrichten
 * @param {Partial<LLMConfig>} config Optionale Konfiguration
 * @returns {Promise<object>} Chat-Antwort
 */
export async function generateLLMChatResponseTool(
  messages: Array<{role: string, content: string}>,
  config: Partial<LLMConfig> = {}
): Promise<object> {
  logger.info(`Generiere Chat-Antwort mit LLM: ${messages.length} Nachrichten`);
  
  try {
    const response = await generateChatResponse(messages, config);
    
    return {
      messages,
      response,
      modelInfo: {
        name: config.modelName || DEFAULT_LLM_CONFIG.modelName,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    logger.error('Fehler bei der LLM-Chat-Generierung', error);
    throw new Error(`Fehler bei der LLM-Chat-Generierung: ${error.message}`);
  }
}

/**
 * Analysiert Amazon-Produkte mit dem LLM-Modell
 * 
 * @param {string} asin ASIN des zu analysierenden Produkts
 * @param {string} marketplace Amazon Marketplace (Standard: amazon.de)
 * @param {string} analysisType Art der Analyse (basic, competitive, sentiment)
 * @returns {Promise<object>} Analyseergebnis
 */
export async function analyzeLLMProductTool(
  asin: string,
  marketplace: string = 'amazon.de',
  analysisType: string = 'basic'
): Promise<object> {
  logger.info(`Analysiere Produkt ${asin} mit LLM-Modell`);
  
  // Prüfe Cache
  const cacheKey = `llm-product-analysis:${asin}:${marketplace}:${analysisType}`;
  const cachedResult = await llmToolsCache.get(cacheKey);
  
  if (cachedResult) {
    logger.info('Verwende zwischengespeicherte Produktanalyse');
    return cachedResult;
  }
  
  try {
    // Importiere benötigte Funktionen dynamisch, um Zirkelbezüge zu vermeiden
    const { getProductDetails } = await import('../apis/amazon-api');
    
    // Hole Produktdetails
    const productDetails = await getProductDetails(asin, marketplace);
    
    // Bereite Prompt-Kontext basierend auf Analysetyp vor
    let prompt = '';
    
    switch (analysisType) {
      case 'competitive':
        prompt = `
Führe eine detaillierte Wettbewerbsanalyse für folgendes Amazon-Produkt durch:

Titel: ${productDetails.title}
ASIN: ${asin}
Kategorie: ${productDetails.category || 'Nicht angegeben'}
Preis: ${productDetails.price || 'Nicht angegeben'}
Bewertung: ${productDetails.rating || 'Nicht angegeben'} (${productDetails.reviews || 0} Rezensionen)

Beschreibung:
${productDetails.description || 'Keine Beschreibung verfügbar.'}

Verkaufsargumente:
${(productDetails.bulletPoints || []).join('\n')}

Analysiere die folgenden Aspekte:
1. Marktposition und Wettbewerbsvorteile
2. Preispositionierung im Vergleich zum Markt
3. Verbesserungspotenziale bei Produktbeschreibung und Verkaufsargumenten
4. USPs (Unique Selling Points)
5. Potenzielle Zielgruppen

Gib eine ausführliche, aber präzise Analyse.
        `;
        break;
        
      case 'sentiment':
        prompt = `
Analysiere die Stimmung und Kundenwahrnehmung für folgendes Amazon-Produkt:

Titel: ${productDetails.title}
ASIN: ${asin}
Kategorie: ${productDetails.category || 'Nicht angegeben'}
Bewertung: ${productDetails.rating || 'Nicht angegeben'} (${productDetails.reviews || 0} Rezensionen)

Beschreibung:
${productDetails.description || 'Keine Beschreibung verfügbar.'}

Verkaufsargumente:
${(productDetails.bulletPoints || []).join('\n')}

Gib eine detaillierte Analyse der wahrscheinlichen Kundenwahrnehmung basierend auf:
1. Tonalität und Überzeugungskraft der Produktbeschreibung
2. Schlüsselwörter, die positive oder negative Emotionen auslösen könnten
3. Vertrauenswürdigkeit und Glaubwürdigkeit der Darstellung
4. Wahrscheinliche emotionale Reaktion der Zielgruppe
        `;
        break;
        
      default: // 'basic'
        prompt = `
Analysiere folgendes Amazon-Produkt und gib eine kurze Zusammenfassung:

Titel: ${productDetails.title}
ASIN: ${asin}
Kategorie: ${productDetails.category || 'Nicht angegeben'}
Preis: ${productDetails.price || 'Nicht angegeben'}
Bewertung: ${productDetails.rating || 'Nicht angegeben'} (${productDetails.reviews || 0} Rezensionen)

Beschreibung:
${productDetails.description || 'Keine Beschreibung verfügbar.'}

Verkaufsargumente:
${(productDetails.bulletPoints || []).join('\n')}

Bitte fasse die wichtigsten Merkmale, Vorteile und potenziellen Nachteile zusammen.
        `;
    }
    
    // Generiere Analyse mit LLM
    const analysis = await generateText(prompt, {
      maxLength: 500,
      temperature: 0.3,
      topP: 0.8
    });
    
    const result = {
      asin,
      marketplace,
      analysisType,
      productTitle: productDetails.title,
      analysis,
      timestamp: new Date().toISOString(),
      modelInfo: {
        name: DEFAULT_LLM_CONFIG.modelName
      }
    };
    
    // Cache das Ergebnis
    await llmToolsCache.set(cacheKey, result, 7 * 24 * 60 * 60); // 7 Tage
    
    return result;
  } catch (error) {
    logger.error('Fehler bei der LLM-Produktanalyse', error);
    throw new Error(`Fehler bei der LLM-Produktanalyse: ${error.message}`);
  }
}

/**
 * Generiert optimierte Produktbeschreibungen mit dem LLM-Modell
 * 
 * @param {string} asin ASIN des zu optimierenden Produkts (optional)
 * @param {object} productInfo Produktinformationen (falls kein ASIN angegeben)
 * @param {string} targetAudience Zielgruppe für die Optimierung
 * @param {string} optimizationGoal Ziel der Optimierung (conversion, seo, branding)
 * @returns {Promise<object>} Optimierungsergebnis
 */
export async function generateProductDescriptionTool(
  asin: string = '',
  productInfo: any = {},
  targetAudience: string = 'Allgemein',
  optimizationGoal: string = 'conversion'
): Promise<object> {
  logger.info(`Generiere optimierte Produktbeschreibung für ${asin || 'neues Produkt'}`);
  
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

Fokussiere auf Schlüsselwörter, die für Suchmaschinen und Amazon-Algorithmus relevant sind, während du eine überzeugende Beschreibung lieferst.
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

Fokussiere auf Storytelling, emotionale Verbindung und Markenwerte, um die Markenidentität zu stärken.
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

Fokussiere auf Nutzen, Problemlösung und Kundenbedürfnisse, um die Konversionsrate zu erhöhen.
        `;
    }
    
    // Generiere optimierte Beschreibung mit LLM
    const generatedContent = await generateText(prompt, {
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
      timestamp: new Date().toISOString(),
      modelInfo: {
        name: DEFAULT_LLM_CONFIG.modelName
      }
    };
  } catch (error) {
    logger.error('Fehler bei der Generierung der Produktbeschreibung', error);
    throw new Error(`Fehler bei der Generierung der Produktbeschreibung: ${error.message}`);
  }
} 