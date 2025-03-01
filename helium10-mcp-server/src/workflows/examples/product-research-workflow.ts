/**
 * product-research-workflow.ts
 * 
 * Beispiel-Workflow für die vollständige Produktrecherche
 * Dieser Workflow führt eine mehrstufige Analyse eines Produkts oder Produktnische durch.
 */

import { WorkflowStep, Workflow } from '../workflow-manager';

/**
 * Produktrecherche-Workflow - Führt eine vollständige Produktrecherche durch
 * 
 * Der Workflow besteht aus folgenden Schritten:
 * 1. Keyword-Recherche: Ermittelt relevante Keywords und deren Suchvolumen
 * 2. Produkt-Analyse Top 5: Analysiert die Top 5 Produkte für das Hauptkeyword
 * 3. Wettbewerbsanalyse: Führt eine vollständige Wettbewerbsanalyse durch
 * 4. Marktpotenzial-Bewertung: Bewertet das Marktpotenzial basierend auf den Analyseergebnissen
 * 5. Produktempfehlungen: Generiert spezifische Empfehlungen für die Produktentwicklung
 * 
 * @example
 * // Workflow registrieren
 * registerWorkflow('product_research', productResearchWorkflow);
 * 
 * // Workflow ausführen
 * const result = await executeWorkflow('product_research', {
 *   keyword: 'bluetooth kopfhörer',
 *   marketplace: 'amazon.de',
 *   includeBSR: true,
 *   includeReviews: true
 * });
 */
export const productResearchWorkflow: Workflow = {
  id: 'product_research',
  name: 'Vollständige Produktrecherche',
  description: 'Führt eine vollständige Produktrecherche durch, inklusive Keyword-Analyse und Wettbewerbsvergleich',
  version: '1.0.0',
  parameters: {
    keyword: {
      type: 'string',
      description: 'Hauptkeyword für die Produktrecherche',
      required: true
    },
    marketplace: {
      type: 'string',
      enum: ['amazon.de', 'amazon.com', 'amazon.co.uk'],
      default: 'amazon.de',
      description: 'Amazon Marketplace'
    },
    includeBSR: {
      type: 'boolean',
      default: true,
      description: 'Bestseller-Rang (BSR) mit einbeziehen'
    },
    includeReviews: {
      type: 'boolean',
      default: true,
      description: 'Bewertungsdaten mit einbeziehen'
    }
  },
  steps: [
    // Schritt 1: Keyword-Recherche
    {
      id: 'step_1',
      name: 'Keyword-Recherche',
      description: 'Ermittelt relevante Keywords und deren Suchvolumen',
      toolName: 'magnet_keyword_research',
      parameters: {
        keyword: 'input.keyword',
        marketplace: 'input.marketplace',
        limit: 50
      }
    },
    
    // Schritt 2: Produkt-Analyse Top 5
    {
      id: 'step_2',
      name: 'Produkt-Analyse Top 5',
      description: 'Analysiert die Top 5 Produkte für das Hauptkeyword',
      toolName: 'analyze_product',
      parameters: {
        asin: 'context.step_1.topProducts[0].asin',
        marketplace: 'input.marketplace',
        analysisDepth: 'detailed'
      },
      condition: 'context.step_1.topProducts && context.step_1.topProducts.length > 0'
    },
    
    // Schritt 3: Wettbewerbsanalyse
    {
      id: 'step_3',
      name: 'Wettbewerbsanalyse',
      description: 'Führt eine vollständige Wettbewerbsanalyse durch',
      toolName: 'complete_product_research',
      parameters: {
        keyword: 'input.keyword',
        marketplace: 'input.marketplace',
        includeBSR: 'input.includeBSR',
        includeReviews: 'input.includeReviews'
      }
    },
    
    // Schritt 4: Marktpotenzial-Bewertung
    {
      id: 'step_4',
      name: 'Marktpotenzial-Bewertung',
      description: 'Bewertet das Marktpotenzial basierend auf den Analyseergebnissen',
      toolName: 'market_potential_analysis',
      parameters: {
        keywordData: 'context.step_1',
        competitorData: 'context.step_3',
        marketplace: 'input.marketplace'
      }
    },
    
    // Schritt 5: Produktempfehlungen (bedingt ausgeführt)
    {
      id: 'step_5',
      name: 'Produktempfehlungen',
      description: 'Generiert spezifische Empfehlungen für die Produktentwicklung',
      toolName: 'generate_product_recommendations',
      parameters: {
        marketPotential: 'context.step_4',
        keywordData: 'context.step_1',
        competitorData: 'context.step_3',
        detailed: true
      },
      condition: 'context.step_4.marketScore >= 7'
    }
  ],
  errorHandling: {
    // Bei Fehler in Schritt 1 (Keyword-Recherche) den Workflow abbrechen
    'step_1': {
      action: 'abort',
      message: 'Keyword-Recherche fehlgeschlagen. Bitte überprüfen Sie das angegebene Keyword und den Marketplace.'
    },
    // Bei Fehler in Schritt 2 (Produkt-Analyse) mit Standardwerten fortfahren
    'step_2': {
      action: 'continue',
      fallbackValue: {
        productDetails: {
          title: 'Beispielprodukt',
          price: 0,
          rating: 0,
          reviewCount: 0
        }
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
      summary: {
        keyword: results.inputs.keyword,
        marketplace: results.inputs.marketplace,
        marketPotential: results.step_4?.marketScore || 0,
        recommendedAction: results.step_4?.marketScore >= 7 ? 'Verfolgen' : 'Überdenken'
      },
      keywordAnalysis: {
        mainKeyword: results.inputs.keyword,
        searchVolume: results.step_1?.searchVolume || 0,
        relatedKeywords: results.step_1?.relatedKeywords || [],
        topKeywords: results.step_1?.topKeywords || []
      },
      competitorAnalysis: {
        numberOfCompetitors: results.step_3?.competitorCount || 0,
        averagePrice: results.step_3?.averagePrice || 0,
        averageRating: results.step_3?.averageRating || 0,
        topCompetitor: results.step_3?.topCompetitor || null
      },
      recommendations: results.step_5 || {
        message: 'Keine Empfehlungen verfügbar, da das Marktpotenzial zu gering ist.'
      }
    };

    return finalResults;
  }
};

/**
 * Export des Workflows zur Registrierung
 */
export default productResearchWorkflow; 