/**
 * Mehrsprachige Tools für den Helium10 MCP-Server
 * 
 * Dieses Modul bietet MCP-Tools für die mehrsprachige Nutzung des DeepSeek-Modells.
 */

import {
  translateText,
  generateMultilingualText,
  generateMultilingualProductDescription,
  createPromptTemplate,
  translatePromptTemplate,
  listPromptTemplates,
  SUPPORTED_LANGUAGES,
  MARKETPLACE_LANGUAGES
} from '../ml/multilingual';
import { logger } from '../utils/logger';

/**
 * Übersetzt einen Text in eine andere Sprache
 * 
 * @param {string} text Zu übersetzender Text
 * @param {string} targetLanguage Zielsprache
 * @param {string} sourceLanguage Quellsprache (optional)
 * @returns {Promise<object>} Übersetzungsergebnis
 */
export async function translateTextTool(
  text: string,
  targetLanguage: string,
  sourceLanguage: string = ''
): Promise<object> {
  logger.info(`Übersetze Text nach ${targetLanguage}...`);
  
  try {
    const translatedText = await translateText(text, targetLanguage, sourceLanguage);
    
    return {
      originalText: text,
      translatedText,
      targetLanguage,
      sourceLanguage: sourceLanguage || 'auto',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Fehler bei der Textübersetzung', error);
    throw new Error(`Fehler bei der Textübersetzung: ${error.message}`);
  }
}

/**
 * Generiert Text basierend auf einem Template und Zielsprache
 * 
 * @param {string} templateName Name des Prompt-Templates
 * @param {object} variables Variablen für das Template
 * @param {string} targetLanguage Zielsprache
 * @returns {Promise<object>} Generierungsergebnis
 */
export async function generateMultilingualTextTool(
  templateName: string,
  variables: object,
  targetLanguage: string
): Promise<object> {
  logger.info(`Generiere mehrsprachigen Text mit Template "${templateName}" in ${targetLanguage}...`);
  
  try {
    const generatedText = await generateMultilingualText(
      templateName,
      variables,
      targetLanguage
    );
    
    return {
      templateName,
      generatedText,
      language: targetLanguage,
      variables,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Fehler bei der mehrsprachigen Textgenerierung', error);
    throw new Error(`Fehler bei der mehrsprachigen Textgenerierung: ${error.message}`);
  }
}

/**
 * Generiert eine mehrsprachige Produktbeschreibung für einen spezifischen Marktplatz
 * 
 * @param {string} asin ASIN des zu optimierenden Produkts (optional)
 * @param {object} productInfo Produktinformationen (falls kein ASIN angegeben)
 * @param {string} targetLanguage Zielsprache
 * @param {string} marketplace Amazon-Marktplatz
 * @param {string} optimizationGoal Optimierungsziel (conversion, seo, branding)
 * @returns {Promise<object>} Generierungsergebnis
 */
export async function generateMultilingualProductDescriptionTool(
  asin: string = '',
  productInfo: any = {},
  targetLanguage: string,
  marketplace: string = 'amazon.de',
  optimizationGoal: string = 'conversion'
): Promise<object> {
  logger.info(`Generiere mehrsprachige Produktbeschreibung in ${targetLanguage} für ${marketplace}...`);
  
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
    
    // Generiere die mehrsprachige Produktbeschreibung
    const result = await generateMultilingualProductDescription(
      combinedInfo,
      targetLanguage,
      marketplace,
      optimizationGoal
    );
    
    return {
      ...result,
      asin: asin || null,
      originalTitle: combinedInfo.title,
      originalDescription: combinedInfo.description,
      originalBulletPoints: combinedInfo.bulletPoints
    };
  } catch (error) {
    logger.error('Fehler bei der Generierung der mehrsprachigen Produktbeschreibung', error);
    throw new Error(`Fehler bei der Generierung der mehrsprachigen Produktbeschreibung: ${error.message}`);
  }
}

/**
 * Erstellt ein neues Prompt-Template
 * 
 * @param {string} templateName Name des Templates
 * @param {string} template Template-Text mit Variablen in der Form {{variable}}
 * @param {string} language Sprache des Templates
 * @param {string} description Beschreibung des Templates
 * @returns {Promise<object>} Erstellungsergebnis
 */
export async function createPromptTemplateTool(
  templateName: string,
  template: string,
  language: string = 'de',
  description: string = ''
): Promise<object> {
  logger.info(`Erstelle Prompt-Template "${templateName}" in ${language}...`);
  
  try {
    const result = await createPromptTemplate(
      templateName,
      template,
      language,
      description
    );
    
    return {
      success: true,
      ...result
    };
  } catch (error) {
    logger.error('Fehler beim Erstellen des Prompt-Templates', error);
    throw new Error(`Fehler beim Erstellen des Prompt-Templates: ${error.message}`);
  }
}

/**
 * Übersetzt ein vorhandenes Prompt-Template in eine andere Sprache
 * 
 * @param {string} templateName Name des Templates
 * @param {string} sourceLanguage Quellsprache
 * @param {string} targetLanguage Zielsprache
 * @returns {Promise<object>} Übersetzungsergebnis
 */
export async function translatePromptTemplateTool(
  templateName: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<object> {
  logger.info(`Übersetze Prompt-Template "${templateName}" von ${sourceLanguage} nach ${targetLanguage}...`);
  
  try {
    const result = await translatePromptTemplate(
      templateName,
      sourceLanguage,
      targetLanguage
    );
    
    return {
      success: true,
      ...result
    };
  } catch (error) {
    logger.error('Fehler beim Übersetzen des Prompt-Templates', error);
    throw new Error(`Fehler beim Übersetzen des Prompt-Templates: ${error.message}`);
  }
}

/**
 * Listet alle verfügbaren Prompt-Templates auf
 * 
 * @returns {Promise<object>} Liste der Templates
 */
export async function listPromptTemplatesTool(): Promise<object> {
  logger.info('Liste verfügbare Prompt-Templates auf...');
  
  try {
    const templates = await listPromptTemplates();
    
    return {
      success: true,
      templateCount: templates.length,
      templates,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Fehler beim Auflisten der Prompt-Templates', error);
    throw new Error(`Fehler beim Auflisten der Prompt-Templates: ${error.message}`);
  }
}

/**
 * Listet alle unterstützten Sprachen auf
 * 
 * @returns {Promise<object>} Liste der unterstützten Sprachen
 */
export async function listSupportedLanguagesTool(): Promise<object> {
  logger.info('Liste unterstützte Sprachen auf...');
  
  try {
    return {
      success: true,
      languageCount: SUPPORTED_LANGUAGES.length,
      languages: SUPPORTED_LANGUAGES,
      marketplaceLanguages: MARKETPLACE_LANGUAGES,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Fehler beim Auflisten der unterstützten Sprachen', error);
    throw new Error(`Fehler beim Auflisten der unterstützten Sprachen: ${error.message}`);
  }
}

/**
 * Übersetzt eine Produktbeschreibung für mehrere Marktplätze
 * 
 * @param {string} asin ASIN des zu übersetzenden Produkts (optional)
 * @param {object} productInfo Produktinformationen (falls kein ASIN angegeben)
 * @param {string[]} targetMarketplaces Ziel-Marktplätze (z.B. amazon.de, amazon.fr)
 * @param {string} optimizationGoal Optimierungsziel (conversion, seo, branding)
 * @returns {Promise<object>} Übersetzungsergebnis für alle Marktplätze
 */
export async function translateProductForMarketplacesTool(
  asin: string = '',
  productInfo: any = {},
  targetMarketplaces: string[] = ['amazon.de', 'amazon.fr', 'amazon.co.uk', 'amazon.it', 'amazon.es'],
  optimizationGoal: string = 'conversion'
): Promise<object> {
  logger.info(`Übersetze Produkt für ${targetMarketplaces.length} Marktplätze...`);
  
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
    
    // Generiere für jeden Marktplatz eine Beschreibung
    const results = {};
    
    for (const marketplace of targetMarketplaces) {
      // Bestimme die Sprache für diesen Marktplatz
      const language = MARKETPLACE_LANGUAGES[marketplace] || 'en';
      
      logger.info(`Generiere Beschreibung für ${marketplace} (${language})...`);
      
      const result = await generateMultilingualProductDescription(
        combinedInfo,
        language,
        marketplace,
        optimizationGoal
      );
      
      results[marketplace] = result;
    }
    
    return {
      success: true,
      asin: asin || null,
      originalTitle: combinedInfo.title,
      originalLanguage: 'auto',  // Quellsprache automatisch erkennen
      marketplaceResults: results,
      marketplaceCount: Object.keys(results).length,
      optimizationGoal,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Fehler bei der Übersetzung für mehrere Marktplätze', error);
    throw new Error(`Fehler bei der Übersetzung für mehrere Marktplätze: ${error.message}`);
  }
} 