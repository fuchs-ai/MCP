/**
 * multilingual-listing-workflow.ts
 * 
 * Beispiel-Workflow für die Erstellung mehrsprachiger Produktlistings
 * Dieser Workflow analysiert ein bestehendes Produkt und erstellt optimierte Listings in mehreren Sprachen.
 */

import { WorkflowStep, Workflow } from '../workflow-manager';

/**
 * Mehrsprachiger Listing-Workflow - Erstellt optimierte Produktlistings in mehreren Sprachen
 * 
 * Der Workflow besteht aus folgenden Schritten:
 * 1. Produkt-Analyse: Analysiert das bestehende Produkt und extrahiert alle relevanten Informationen
 * 2. Keyword-Recherche: Ermittelt optimale Keywords für das Produkt in der Hauptsprache
 * 3. Generierung der Produktbeschreibung: Erstellt eine optimierte Produktbeschreibung in der Hauptsprache
 * 4. Übersetzung der Inhalte: Übersetzt die optimierten Inhalte in die gewünschten Zielsprachen
 * 5. Kulturelle Anpassung: Passt die Inhalte an kulturelle Besonderheiten der Zielmärkte an
 * 
 * @example
 * // Workflow registrieren
 * registerWorkflow('multilingual_listing', multilingualListingWorkflow);
 * 
 * // Workflow ausführen
 * const result = await executeWorkflow('multilingual_listing', {
 *   asin: 'B08R2KLM7S',
 *   marketplace: 'amazon.de',
 *   sourceLanguage: 'de',
 *   targetLanguages: ['en', 'fr', 'es', 'it'],
 *   contentLength: 'medium'
 * });
 */
export const multilingualListingWorkflow: Workflow = {
  id: 'multilingual_listing',
  name: 'Mehrsprachiges Listing',
  description: 'Analysiert ein Produkt und erstellt optimierte Listings in mehreren Sprachen',
  version: '1.0.0',
  parameters: {
    asin: {
      type: 'string',
      description: 'ASIN des zu internationalisierenden Produkts',
      required: true
    },
    marketplace: {
      type: 'string',
      enum: ['amazon.de', 'amazon.com', 'amazon.co.uk'],
      default: 'amazon.de',
      description: 'Amazon Marketplace'
    },
    sourceLanguage: {
      type: 'string',
      enum: ['de', 'en', 'fr', 'es', 'it'],
      default: 'de',
      description: 'Quellsprache für die Inhaltserstellung'
    },
    targetLanguages: {
      type: 'array',
      description: 'Zielsprachen für die Übersetzung',
      required: true
    },
    contentLength: {
      type: 'string',
      enum: ['short', 'medium', 'long'],
      default: 'medium',
      description: 'Länge der generierten Inhalte'
    },
    enhanceContent: {
      type: 'boolean',
      default: true,
      description: 'Inhalte gegenüber dem Original verbessern'
    }
  },
  steps: [
    // Schritt 1: Produkt-Analyse
    {
      id: 'step_1',
      name: 'Produkt-Analyse',
      description: 'Analysiert das bestehende Produkt und extrahiert alle relevanten Informationen',
      toolName: 'analyze_product',
      parameters: {
        asin: 'input.asin',
        marketplace: 'input.marketplace',
        analysisDepth: 'comprehensive'
      }
    },
    
    // Schritt 2: Keyword-Recherche
    {
      id: 'step_2',
      name: 'Keyword-Recherche',
      description: 'Ermittelt optimale Keywords für das Produkt in der Hauptsprache',
      toolName: 'magnet_keyword_research',
      parameters: {
        keyword: 'context.step_1.productTitle',
        marketplace: 'input.marketplace',
        limit: 30
      }
    },
    
    // Schritt 3: Generierung der Produktbeschreibung
    {
      id: 'step_3',
      name: 'Generierung der Produktbeschreibung',
      description: 'Erstellt eine optimierte Produktbeschreibung in der Hauptsprache',
      toolName: 'generate_product_description',
      parameters: {
        productName: 'context.step_1.productTitle',
        keywords: 'context.step_2.topKeywords',
        features: 'context.step_1.productFeatures',
        language: 'input.sourceLanguage',
        length: 'input.contentLength',
        enhance: 'input.enhanceContent'
      }
    },
    
    // Schritt 4: Übersetzung der Inhalte
    {
      id: 'step_4',
      name: 'Übersetzung der Inhalte',
      description: 'Übersetzt die optimierten Inhalte in die gewünschten Zielsprachen',
      toolName: 'translate_text',
      parameters: {
        text: 'context.step_3.generatedContent',
        sourceLanguage: 'input.sourceLanguage',
        targetLanguages: 'input.targetLanguages',
        preserveFormatting: true
      }
    },
    
    // Schritt 5: Kulturelle Anpassung (optional)
    {
      id: 'step_5',
      name: 'Kulturelle Anpassung',
      description: 'Passt die Inhalte an kulturelle Besonderheiten der Zielmärkte an',
      toolName: 'culturally_adapt_content',
      parameters: {
        content: 'context.step_4',
        sourceLanguage: 'input.sourceLanguage',
        targetCultures: 'input.targetLanguages',
        productCategory: 'context.step_1.productCategory'
      },
      condition: 'input.targetLanguages.length > 0'
    }
  ],
  errorHandling: {
    // Bei Fehler in Schritt 1 (Produkt-Analyse) den Workflow abbrechen
    'step_1': {
      action: 'abort',
      message: 'Produkt-Analyse fehlgeschlagen. Bitte überprüfen Sie die ASIN und den Marketplace.'
    },
    // Bei Fehler in Schritt 4 (Übersetzung) mit maschinenübersetzten Inhalten fortfahren
    'step_4': {
      action: 'continue',
      fallbackAction: async (context, inputs) => {
        // Simulierte Fallback-Funktion, die eine einfachere Übersetzungsmethode verwendet
        return {
          translations: inputs.targetLanguages.reduce((acc, lang) => {
            acc[lang] = `[Maschinelle Übersetzung für ${lang}] ${context.step_3.generatedContent}`;
            return acc;
          }, {})
        };
      }
    },
    // Standardverhalten für alle anderen Schritte
    'default': {
      action: 'retry',
      maxRetries: 2,
      retryDelay: 1000 // ms
    }
  },
  postProcess: (results) => {
    // Ergebnisse konsolidieren und aufbereiten
    const finalResults = {
      sourceContent: {
        language: results.inputs.sourceLanguage,
        title: results.step_3?.title || results.step_1?.productTitle || '',
        bulletPoints: results.step_3?.bulletPoints || [],
        description: results.step_3?.description || ''
      },
      translations: {}
    };
    
    // Füge Übersetzungen hinzu
    if (results.step_4 && results.step_4.translations) {
      Object.keys(results.step_4.translations).forEach(langCode => {
        finalResults.translations[langCode] = {
          language: langCode,
          title: results.step_4.translations[langCode].title || '',
          bulletPoints: results.step_4.translations[langCode].bulletPoints || [],
          description: results.step_4.translations[langCode].description || ''
        };
        
        // Füge kulturelle Anpassungen hinzu, falls vorhanden
        if (results.step_5 && results.step_5.adaptations && results.step_5.adaptations[langCode]) {
          finalResults.translations[langCode].culturalAdaptations = results.step_5.adaptations[langCode];
        }
      });
    }
    
    // Füge Metadaten hinzu
    finalResults.metadata = {
      asin: results.inputs.asin,
      marketplace: results.inputs.marketplace,
      keywords: results.step_2?.topKeywords || [],
      translatedLanguages: Object.keys(finalResults.translations)
    };
    
    return finalResults;
  }
};

/**
 * Export des Workflows zur Registrierung
 */
export default multilingualListingWorkflow; 