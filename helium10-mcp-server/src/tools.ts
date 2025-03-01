/**
 * Helium10 MCP-Server - Tool-Implementierungen
 * 
 * Diese Datei enthält die Implementierungen der MCP-Tools für den Helium10 MCP-Server.
 * Sie dient als Schnittstelle zwischen den MCP-Anfragen und den internen Modulen.
 */

import { scrapeKnowledgeBase, scrapeProductData } from './scraping.js';
import { queryKnowledgeBase } from './rag.js';
import { logger } from './logger.js';
import { magnetKeywordResearch, cerebroKeywordResearch, xrayProductResearch } from './helium10-api.js';
import { getProductByAsin } from './amazon-api.js';
import { analyzeKeyword, analyzeAsin } from './product-analysis.js';
import { datenbanksicherungErstellen, sicherungenAuflisten, regelmäßigeSicherungenPlanen } from './backup.js';
import { LokalerCache } from './cache.js';

// Tool-Caches für Leistungsoptimierung
const keywordCache = new LokalerCache('keyword-tools', {
  aktiviert: true,
  lebensdauerSekunden: 3600, // 1 Stunde
  maximaleGroesseBytes: 50 * 1024 * 1024 // 50 MB
});

const produktCache = new LokalerCache('produkt-tools', {
  aktiviert: true,
  lebensdauerSekunden: 1800, // 30 Minuten
  maximaleGroesseBytes: 50 * 1024 * 1024 // 50 MB
});

/**
 * Tool zum Scrapen der Helium 10 Wissensdatenbank
 * 
 * Dieses Tool aktualisiert die lokale Wissensdatenbank mit Inhalten von Helium10-Quellen
 * wie Blog, Dokumentation, Academy und Changelog.
 */
async function wissensdatenbankScrapenTool() {
  logger.info('Starte Scraping der Wissensdatenbank');
  
  // Vorhandene Backups erstellen für Datensicherheit
  await datenbanksicherungErstellen().catch(error => {
    logger.warn('Fehler bei Erstellung der Sicherung vor dem Scraping', error);
  });
  
  // Scraping durchführen
  const ergebnis = await scrapeKnowledgeBase();
  
  // Regelmäßige Sicherungen planen, falls noch nicht erfolgt
  regelmäßigeSicherungenPlanen(24); // Einmal täglich
  
  return ergebnis;
}

/**
 * Tool zur Beantwortung von Fragen zur Helium 10-Plattform mithilfe der Wissensdatenbank
 * 
 * Dieses Tool nutzt die lokale RAG-Funktionalität, um Benutzeranfragen über
 * Helium10 mit relevanten Inhalten aus der Wissensdatenbank zu beantworten.
 * 
 * @param abfrage Die Benutzeranfrage an die Wissensdatenbank
 */
async function helium10AbfrageTool(abfrage: string) {
  if (!abfrage) {
    logger.warn('Leere Anfrage an RAG-Tool');
    return {
      success: false,
      message: "Eine Frage ist erforderlich"
    };
  }

  // Cache-Schlüssel für häufige Anfragen
  const cacheSchlüssel = `abfrage_${Buffer.from(abfrage.slice(0, 100)).toString('base64')}`;
  
  // Prüfe auf gecachte Antwort
  const gecachteAntwort = keywordCache.abrufen<{
    success: boolean;
    message: string;
  }>(cacheSchlüssel);
  
  if (gecachteAntwort) {
    logger.debug('Antwort aus Cache verwendet', { abfrage: abfrage.substring(0, 50) });
    return gecachteAntwort;
  }

  try {
    logger.info('RAG-Anfrage', { abfrage });
    const relevanterInhalt = await queryKnowledgeBase(abfrage);
    
    const antwort = {
      success: true,
      message: relevanterInhalt
    };
    
    // Cache Antwort für zukünftige ähnliche Anfragen
    keywordCache.setzen(cacheSchlüssel, antwort);
    
    return antwort;
  } catch (error) {
    logger.error('Fehler bei der Wissensabfrage', error as Error);
    
    const fehlerAntwort = {
      success: false,
      message: `Fehler bei der Wissensabfrage: ${error instanceof Error ? error.message : String(error)}`
    };
    
    return fehlerAntwort;
  }
}

/**
 * Tool zur Helium10 Magnet Keyword-Recherche
 * 
 * Dieses Tool führt eine Keyword-Recherche mit Helium10 Magnet durch
 * und liefert ausführliche Daten zu Suchvolumen, Wettbewerb und Trends.
 * 
 * @param suchbegriff Der zu recherchierende Suchbegriff
 * @param marktplatz Der Amazon-Marktplatz (Standard: amazon.de)
 */
async function magnetKeywordTool(suchbegriff: string, marktplatz?: string) {
  if (!suchbegriff) {
    logger.warn('Leere Keyword-Anfrage an Magnet-Tool');
    return {
      success: false,
      message: "Ein Suchbegriff ist erforderlich"
    };
  }

  // Cache-Schlüssel für wiederholte Anfragen
  const effektiverMarktplatz = marktplatz || 'amazon.de';
  const cacheSchlüssel = `magnet_${effektiverMarktplatz}_${suchbegriff}`;
  
  // Prüfe auf gecachte Ergebnisse
  const gecachteErgebnisse = keywordCache.abrufen(cacheSchlüssel);
  if (gecachteErgebnisse) {
    logger.debug('Magnet-Ergebnisse aus Cache verwendet', { suchbegriff });
    return gecachteErgebnisse;
  }

  try {
    logger.info(`Magnet-Keyword-Recherche für '${suchbegriff}'`);
    const ergebnisse = await magnetKeywordResearch(suchbegriff, marktplatz);
    
    const antwort = {
      success: true,
      message: `Magnet-Keyword-Recherche abgeschlossen`,
      data: ergebnisse
    };
    
    // Ergebnisse cachen
    keywordCache.setzen(cacheSchlüssel, antwort);
    
    return antwort;
  } catch (error) {
    logger.error(`Fehler bei Magnet-Recherche für '${suchbegriff}'`, error as Error);
    return {
      success: false,
      message: `Fehler bei der Magnet-Keyword-Recherche: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Tool zur Helium10 Cerebro ASIN-basierten Keyword-Recherche
 * 
 * Dieses Tool führt eine ASIN-basierte Keyword-Recherche mit Helium10 Cerebro durch,
 * um Keywords zu finden, mit denen ein bestimmtes Produkt (ASIN) rankt.
 * 
 * @param asin Die zu analysierende Amazon ASIN
 * @param marktplatz Der Amazon-Marktplatz (Standard: amazon.de)
 */
async function cerebroKeywordTool(asin: string, marktplatz?: string) {
  if (!asin) {
    logger.warn('Leere ASIN-Anfrage an Cerebro-Tool');
    return {
      success: false,
      message: "Eine ASIN ist erforderlich"
    };
  }

  // Cache-Schlüssel für wiederholte Anfragen
  const effektiverMarktplatz = marktplatz || 'amazon.de';
  const cacheSchlüssel = `cerebro_${effektiverMarktplatz}_${asin}`;
  
  // Prüfe auf gecachte Ergebnisse
  const gecachteErgebnisse = keywordCache.abrufen(cacheSchlüssel);
  if (gecachteErgebnisse) {
    logger.debug('Cerebro-Ergebnisse aus Cache verwendet', { asin });
    return gecachteErgebnisse;
  }

  try {
    logger.info(`Cerebro-Keyword-Recherche für ASIN '${asin}'`);
    const ergebnisse = await cerebroKeywordResearch(asin, marktplatz);
    
    const antwort = {
      success: true,
      message: `Cerebro-Keyword-Recherche abgeschlossen`,
      data: ergebnisse
    };
    
    // Ergebnisse cachen
    keywordCache.setzen(cacheSchlüssel, antwort);
    
    return antwort;
  } catch (error) {
    logger.error(`Fehler bei Cerebro-Recherche für '${asin}'`, error as Error);
    return {
      success: false,
      message: `Fehler bei der Cerebro-Keyword-Recherche: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Tool zur Helium10 X-Ray Produktrecherche
 * 
 * Dieses Tool führt eine Produktrecherche mit Helium10 X-Ray durch und
 * liefert detaillierte Daten zu Produkten in den Amazon-Suchergebnissen.
 * 
 * @param suchbegriff Der zu recherchierende Suchbegriff
 * @param marktplatz Der Amazon-Marktplatz (Standard: amazon.de)
 */
async function xrayProduktTool(suchbegriff: string, marktplatz?: string) {
  if (!suchbegriff) {
    logger.warn('Leere Keyword-Anfrage an X-Ray-Tool');
    return {
      success: false,
      message: "Ein Suchbegriff ist erforderlich"
    };
  }

  // Cache-Schlüssel für wiederholte Anfragen
  const effektiverMarktplatz = marktplatz || 'amazon.de';
  const cacheSchlüssel = `xray_${effektiverMarktplatz}_${suchbegriff}`;
  
  // Prüfe auf gecachte Ergebnisse
  const gecachteErgebnisse = produktCache.abrufen(cacheSchlüssel);
  if (gecachteErgebnisse) {
    logger.debug('X-Ray-Ergebnisse aus Cache verwendet', { suchbegriff });
    return gecachteErgebnisse;
  }

  try {
    logger.info(`X-Ray-Produktrecherche für '${suchbegriff}'`);
    const ergebnisse = await xrayProductResearch(suchbegriff, marktplatz);
    
    const antwort = {
      success: true,
      message: `X-Ray-Produktrecherche abgeschlossen`,
      data: ergebnisse
    };
    
    // Ergebnisse cachen
    produktCache.setzen(cacheSchlüssel, antwort);
    
    return antwort;
  } catch (error) {
    logger.error(`Fehler bei X-Ray-Recherche für '${suchbegriff}'`, error as Error);
    return {
      success: false,
      message: `Fehler bei der X-Ray-Produktrecherche: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Tool zur Abfrage von Amazon-Produktdaten anhand einer ASIN
 * 
 * Dieses Tool ruft detaillierte Produktinformationen für eine bestimmte
 * Amazon ASIN ab und speichert sie lokal für spätere Verwendung.
 * 
 * @param asin Die abzufragende Amazon ASIN
 * @param marktplatz Der Amazon-Marktplatz (Standard: amazon.de)
 */
async function amazonProduktTool(asin: string, marktplatz?: string) {
  if (!asin) {
    logger.warn('Leere ASIN-Anfrage an Amazon-Produkt-Tool');
    return {
      success: false,
      message: "Eine ASIN ist erforderlich"
    };
  }

  // Cache-Schlüssel für wiederholte Anfragen
  const effektiverMarktplatz = marktplatz || 'amazon.de';
  const cacheSchlüssel = `amazon_produkt_${effektiverMarktplatz}_${asin}`;
  
  // Prüfe auf gecachte Ergebnisse
  const gecachtesProdukt = produktCache.abrufen(cacheSchlüssel);
  if (gecachtesProdukt) {
    logger.debug('Amazon-Produktdaten aus Cache verwendet', { asin });
    return gecachtesProdukt;
  }

  try {
    logger.info(`Amazon-Produktabfrage für ASIN '${asin}'`);
    const produkt = await getProductByAsin(asin, marktplatz);
    
    if (!produkt) {
      const fehlerAntwort = {
        success: false,
        message: `Kein Produkt für ASIN '${asin}' gefunden`
      };
      return fehlerAntwort;
    }
    
    const antwort = {
      success: true,
      message: `Amazon-Produktabfrage abgeschlossen`,
      data: produkt
    };
    
    // Ergebnisse cachen
    produktCache.setzen(cacheSchlüssel, antwort);
    
    return antwort;
  } catch (error) {
    logger.error(`Fehler bei Amazon-Produktabfrage für '${asin}'`, error as Error);
    return {
      success: false,
      message: `Fehler bei der Amazon-Produktabfrage: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Tool zur Durchführung einer umfassenden Keyword-Marktanalyse
 * 
 * Dieses Tool führt eine kombinierte Marktanalyse basierend auf einem
 * Suchbegriff durch und generiert Empfehlungen für die Produktentwicklung.
 * 
 * @param suchbegriff Der zu analysierende Suchbegriff
 * @param marktplatz Der Amazon-Marktplatz (Standard: amazon.de)
 */
async function marktanalyseTool(suchbegriff: string, marktplatz?: string) {
  if (!suchbegriff) {
    logger.warn('Leere Keyword-Anfrage an Marktanalyse-Tool');
    return {
      success: false,
      message: "Ein Suchbegriff ist erforderlich"
    };
  }

  // Cache-Schlüssel für wiederholte Anfragen
  const effektiverMarktplatz = marktplatz || 'amazon.de';
  const cacheSchlüssel = `marktanalyse_${effektiverMarktplatz}_${suchbegriff}`;
  
  // Prüfe auf gecachte Ergebnisse
  const gecachteAnalyse = produktCache.abrufen(cacheSchlüssel);
  if (gecachteAnalyse) {
    logger.debug('Marktanalyse aus Cache verwendet', { suchbegriff });
    return gecachteAnalyse;
  }

  try {
    logger.info(`Marktanalyse für Suchbegriff '${suchbegriff}'`);
    const analyse = await analyzeKeyword(suchbegriff, marktplatz);
    
    const antwort = {
      success: true,
      message: `Marktanalyse für '${suchbegriff}' abgeschlossen`,
      data: analyse
    };
    
    // Ergebnisse cachen
    produktCache.setzen(cacheSchlüssel, antwort);
    
    return antwort;
  } catch (error) {
    logger.error(`Fehler bei Marktanalyse für '${suchbegriff}'`, error as Error);
    return {
      success: false,
      message: `Fehler bei der Marktanalyse: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Tool zur Durchführung einer umfassenden ASIN-Produktanalyse
 * 
 * Dieses Tool führt eine detaillierte Analyse eines Amazon-Produkts
 * anhand seiner ASIN durch und generiert Optimierungsempfehlungen.
 * 
 * @param asin Die zu analysierende Amazon ASIN
 * @param marktplatz Der Amazon-Marktplatz (Standard: amazon.de)
 */
async function produktanalyseTool(asin: string, marktplatz?: string) {
  if (!asin) {
    logger.warn('Leere ASIN-Anfrage an Produktanalyse-Tool');
    return {
      success: false,
      message: "Eine ASIN ist erforderlich"
    };
  }

  // Cache-Schlüssel für wiederholte Anfragen
  const effektiverMarktplatz = marktplatz || 'amazon.de';
  const cacheSchlüssel = `produktanalyse_${effektiverMarktplatz}_${asin}`;
  
  // Prüfe auf gecachte Ergebnisse
  const gecachteAnalyse = produktCache.abrufen(cacheSchlüssel);
  if (gecachteAnalyse) {
    logger.debug('Produktanalyse aus Cache verwendet', { asin });
    return gecachteAnalyse;
  }

  try {
    logger.info(`Produktanalyse für ASIN '${asin}'`);
    const analyse = await analyzeAsin(asin, marktplatz);
    
    const antwort = {
      success: true,
      message: `Produktanalyse für ASIN '${asin}' abgeschlossen`,
      data: analyse
    };
    
    // Ergebnisse cachen
    produktCache.setzen(cacheSchlüssel, antwort);
    
    return antwort;
  } catch (error) {
    logger.error(`Fehler bei Produktanalyse für ASIN '${asin}'`, error as Error);
    return {
      success: false,
      message: `Fehler bei der Produktanalyse: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Tool zur Durchführung von Datensicherungen der lokalen Datenbank
 * 
 * Dieses Tool erstellt eine Sicherungskopie der lokalen Datenbank
 * und verwaltet die Aufbewahrung von Sicherungen.
 */
async function datensicherungTool() {
  try {
    logger.info('Starte manuelle Datensicherung');
    const erfolg = await datenbanksicherungErstellen();
    
    if (erfolg) {
      const sicherungen = sicherungenAuflisten();
      
      return {
        success: true,
        message: `Datensicherung erfolgreich erstellt`,
        data: {
          anzahlSicherungen: sicherungen.length,
          neuesteSicherung: sicherungen.length > 0 ? sicherungen[0].dateiname : null,
          sicherungen: sicherungen.map(s => ({
            dateiname: s.dateiname,
            größeMB: (s.größe / (1024 * 1024)).toFixed(2),
            datum: s.datum.toISOString()
          }))
        }
      };
    } else {
      return {
        success: false,
        message: 'Datensicherung konnte nicht erstellt werden'
      };
    }
  } catch (error) {
    logger.error('Fehler bei der Datensicherung', error as Error);
    return {
      success: false,
      message: `Fehler bei der Datensicherung: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Tool zum Scrapen von Produktdaten von Amazon
 * 
 * Dieses Tool extrahiert Produktdaten von Amazon basierend auf
 * Suchbegriffen oder spezifischen Produkt-URLs.
 * 
 * @param suchbegriffe Suchbegriffe für die Produktsuche
 * @param produktURLs Spezifische Produkt-URLs für das Scraping
 */
async function produktdatenScrapenTool(suchbegriffe?: string, produktURLs?: string[]) {
  try {
    if (!suchbegriffe && (!produktURLs || produktURLs.length === 0)) {
      logger.warn('Keine Suchbegriffe oder URLs für Produktdaten-Scraping angegeben');
      return {
        success: false,
        message: "Bitte geben Sie entweder Suchbegriffe oder spezifische Produkt-URLs an"
      };
    }
    
    logger.info('Starte Produktdaten-Scraping Tool', { 
      suchbegriffe, 
      urlAnzahl: produktURLs?.length 
    });
    
    const ergebnis = await scrapeProductData(suchbegriffe, produktURLs);
    return {
      success: ergebnis.success,
      message: ergebnis.message,
      data: ergebnis.products
    };
  } catch (error) {
    logger.error('Fehler beim Produktdaten-Scraping Tool', error as Error);
    return {
      success: false,
      message: `Fehler beim Produktdaten-Scraping: ${error instanceof Error ? error.message : String(error)}`,
      data: []
    };
  }
}

// Internationalisierte Exports für MCP-Kompatibilität
export {
  wissensdatenbankScrapenTool as scrapeKnowledgeBaseTool,
  helium10AbfrageTool as askHelium10RagTool,
  magnetKeywordTool,
  cerebroKeywordTool,
  xrayProduktTool as xrayProductTool,
  amazonProduktTool as getAmazonProductTool,
  marktanalyseTool as analyzeKeywordTool,
  produktanalyseTool as analyzeAsinTool,
  datensicherungTool as createBackupTool,
  produktdatenScrapenTool as scrapeProductDataTool
};

// Deutsche Exports für lokale Entwicklung
export {
  wissensdatenbankScrapenTool,
  helium10AbfrageTool,
  magnetKeywordTool,
  cerebroKeywordTool,
  xrayProduktTool,
  amazonProduktTool,
  marktanalyseTool,
  produktanalyseTool,
  datensicherungTool,
  produktdatenScrapenTool
};
