/**
 * Integrierte Workflow-Tools für MCP
 * 
 * Diese Datei enthält hochrangige MCP-Tools, die verschiedene Einzeltools
 * sequentiell kombinieren, um komplexe Analyse-Workflows durchzuführen.
 */

import { WorkflowManager, workflowManager } from '../utils/workflow';
import { magnetKeywordResearchTool, cerebroAsinResearchTool, tiefenanalyseKeywordTool } from './keyword-tools';
import { xrayProductAnalysisTool, einzelproduktAnalyseTool, verkaufsanalyseTool, marktanalyseTool } from './product-tools';
import { FileSystemCache } from '../cache/file-cache';

// Cache-Instanz für Workflow-Ergebnisse
const cache = new FileSystemCache('workflow-tools-cache');

// Registriere die Tools als Workflow-Schritte
workflowManager
  // Keyword-Tools
  .registerStep('keywordRecherche', magnetKeywordResearchTool)
  .registerStep('cerebroAnalyse', cerebroAsinResearchTool)
  .registerStep('tiefenanalyse', tiefenanalyseKeywordTool)
  
  // Produkt-Tools
  .registerStep('produktAnalyse', xrayProductAnalysisTool)
  .registerStep('einzelproduktAnalyse', einzelproduktAnalyseTool)
  .registerStep('verkaufsanalyse', verkaufsanalyseTool)
  .registerStep('marktAnalyse', marktanalyseTool);

/**
 * MCP-Tool für vollständige Amazon-Produktrecherche
 * Führt einen sequentiellen Workflow mit mehreren Tools aus
 * 
 * @param {string} keyword Das zu analysierende Keyword
 * @param {string} marketplace Der Amazon-Marketplace (Standard: amazon.de)
 * @returns {Promise<object>} Umfassende Analyse-Ergebnisse
 */
export async function vollständigeProduktrechercheTool(keyword: string, marketplace = 'amazon.de'): Promise<object> {
  console.log(`Führe vollständige Produktrecherche für "${keyword}" auf ${marketplace} durch...`);
  
  const cacheKey = `tool:vollständige-produktrecherche:${marketplace}:${keyword}`;
  
  // Versuche Cache zu nutzen
  const cachedResult = await cache.get(cacheKey);
  if (cachedResult) {
    console.log('Cache-Treffer für vollständige Produktrecherche:', keyword);
    return cachedResult;
  }
  
  try {
    // Führe den produktRecherche-Workflow mit unseren Tools aus
    const result = await workflowManager.executeWorkflow('produktRecherche', { 
      keyword, 
      marketplace 
    }, {
      analyseTiefe: 'vollständig',
      cacheResults: true
    });
    
    // Strukturiere das Ergebnis für bessere Benutzbarkeit
    const analysis = {
      keyword,
      marketplace,
      zeitpunkt: new Date().toISOString(),
      keywordAnalyse: result.keywordRecherche,
      marktübersicht: result.marktAnalyse,
      empfehlungen: result.verbesserungsVorschläge,
      workflow: {
        ausgeführteSchritte: workflowManager.getResults(),
        dauer: Date.now() - Date.parse(result.startTime || new Date().toISOString())
      }
    };
    
    // Ergebnis cachen
    await cache.set(cacheKey, analysis, 4 * 60 * 60); // 4 Stunden
    
    return analysis;
  } catch (error) {
    console.error('Fehler bei vollständiger Produktrecherche:', error);
    throw new Error(`Vollständige Produktrecherche für "${keyword}" fehlgeschlagen: ${error.message}`);
  }
}

/**
 * MCP-Tool für ASIN-basierte Konkurrenzanalyse
 * Analysiert mehrere ASINs im Vergleich
 * 
 * @param {string[]} asins Liste von zu analysierenden ASINs
 * @param {string} marketplace Der Amazon-Marketplace (Standard: amazon.de)
 * @returns {Promise<object>} Vergleichende Konkurrenzanalyse
 */
export async function konkurrenzanalyseTool(asins: string[], marketplace = 'amazon.de'): Promise<object> {
  console.log(`Führe Konkurrenzanalyse für ${asins.length} ASINs auf ${marketplace} durch...`);
  
  const cacheKey = `tool:konkurrenzanalyse:${marketplace}:${asins.join('-')}`;
  
  // Versuche Cache zu nutzen
  const cachedResult = await cache.get(cacheKey);
  if (cachedResult) {
    console.log('Cache-Treffer für Konkurrenzanalyse:', asins.join(', '));
    return cachedResult;
  }
  
  try {
    // Analysiere jede ASIN einzeln
    const asinAnalyses = await Promise.all(
      asins.map(asin => einzelproduktAnalyseTool(asin, marketplace))
    );
    
    // Führe Cerebro-Analyse für jede ASIN durch
    const cerebroAnalyses = await Promise.all(
      asins.map(asin => cerebroAsinResearchTool(asin, marketplace))
    );
    
    // Strukturiere das Ergebnis für einen umfassenden Vergleich
    const analysis = {
      asins,
      marketplace,
      zeitpunkt: new Date().toISOString(),
      individualAnalysen: asins.map((asin, index) => ({
        asin,
        produktInfos: asinAnalyses[index],
        keywordInfos: cerebroAnalyses[index]
      })),
      vergleich: {
        preisspanne: berechnePreisspanne(asinAnalyses),
        bewertungsvergleich: vergleicheBewertungen(asinAnalyses),
        gemeinsameKeywords: findeGemeinsameKeywords(cerebroAnalyses),
        unterschiedePositionierung: analysierePositionierungsunterschiede(asinAnalyses, cerebroAnalyses),
        stärkenUndSchwächen: identifiziereStärkenUndSchwächen(asinAnalyses)
      },
      handlungsempfehlungen: erzeugeKonkurrenzstrategien(asinAnalyses, cerebroAnalyses)
    };
    
    // Ergebnis cachen
    await cache.set(cacheKey, analysis, 6 * 60 * 60); // 6 Stunden
    
    return analysis;
  } catch (error) {
    console.error('Fehler bei Konkurrenzanalyse:', error);
    throw new Error(`Konkurrenzanalyse für ASINs fehlgeschlagen: ${error.message}`);
  }
}

/**
 * MCP-Tool für Listing-Optimierung
 * Generiert optimierte Listing-Elemente basierend auf Keyword- und Marktdaten
 * 
 * @param {string} asin Die zu optimierende ASIN
 * @param {string} hauptKeyword Das Haupt-Keyword für das Listing
 * @param {string} marketplace Der Amazon-Marketplace (Standard: amazon.de)
 * @returns {Promise<object>} Optimierungsvorschläge für das Listing
 */
export async function listingOptimierungTool(asin: string, hauptKeyword: string, marketplace = 'amazon.de'): Promise<object> {
  console.log(`Führe Listing-Optimierung für ASIN "${asin}" mit Haupt-Keyword "${hauptKeyword}" auf ${marketplace} durch...`);
  
  const cacheKey = `tool:listing-optimierung:${marketplace}:${asin}:${hauptKeyword}`;
  
  // Versuche Cache zu nutzen
  const cachedResult = await cache.get(cacheKey);
  if (cachedResult) {
    console.log('Cache-Treffer für Listing-Optimierung:', asin);
    return cachedResult;
  }
  
  try {
    // Führe den listingOptimierung-Workflow aus
    const result = await workflowManager.executeWorkflow('listingOptimierung', {
      asin,
      hauptKeyword,
      marketplace
    });
    
    // Strukturiere das Ergebnis
    const optimierung = {
      asin,
      hauptKeyword,
      marketplace,
      zeitpunkt: new Date().toISOString(),
      keywordRecherche: result.keywordRecherche,
      konkurrenzAnalyse: result.konkurrenzAnalyse,
      optimierteElemente: {
        titel: result.titleOptimierung,
        bullets: result.bulletOptimierung,
        beschreibung: result.beschreibungsOptimierung
      },
      keywordAbdeckung: analysiereKeywordAbdeckung(
        result.keywordRecherche,
        result.titleOptimierung,
        result.bulletOptimierung,
        result.beschreibungsOptimierung
      ),
      empfehlungen: erzeugeListingEmpfehlungen(result)
    };
    
    // Ergebnis cachen
    await cache.set(cacheKey, optimierung, 24 * 60 * 60); // 24 Stunden
    
    return optimierung;
  } catch (error) {
    console.error('Fehler bei Listing-Optimierung:', error);
    throw new Error(`Listing-Optimierung für ASIN "${asin}" fehlgeschlagen: ${error.message}`);
  }
}

/**
 * Berechnet die Preisspanne aus den Produktanalysen
 * 
 * @param {any[]} asinAnalyses Produktanalysen
 * @returns {object} Preisspanne und -statistiken
 */
function berechnePreisspanne(asinAnalyses: any[]): object {
  const preise = asinAnalyses.map(analyse => {
    return analyse.basisDaten?.preis || 0;
  }).filter(preis => preis > 0);
  
  if (preise.length === 0) {
    return {
      minimum: 0,
      maximum: 0,
      durchschnitt: 0,
      median: 0
    };
  }
  
  const sortiertePreise = [...preise].sort((a, b) => a - b);
  const minimum = sortiertePreise[0];
  const maximum = sortiertePreise[sortiertePreise.length - 1];
  const summe = sortiertePreise.reduce((sum, preis) => sum + preis, 0);
  const durchschnitt = summe / sortiertePreise.length;
  
  // Berechne Median
  const mitte = Math.floor(sortiertePreise.length / 2);
  const median = sortiertePreise.length % 2 === 0
    ? (sortiertePreise[mitte - 1] + sortiertePreise[mitte]) / 2
    : sortiertePreise[mitte];
  
  return {
    minimum,
    maximum,
    durchschnitt,
    median,
    preisUnterschied: maximum - minimum,
    preisunterschiedProzent: minimum > 0 ? ((maximum - minimum) / minimum) * 100 : 0
  };
}

/**
 * Vergleicht die Bewertungen der Produkte
 * 
 * @param {any[]} asinAnalyses Produktanalysen
 * @returns {object} Bewertungsvergleich
 */
function vergleicheBewertungen(asinAnalyses: any[]): object {
  const bewertungen = asinAnalyses.map(analyse => ({
    asin: analyse.asin,
    bewertung: analyse.basisDaten?.bewertung || 0,
    anzahlBewertungen: analyse.basisDaten?.rezensionenAnzahl || 0
  }));
  
  // Sortiere nach Bewertung (absteigend)
  const nachBewertungSortiert = [...bewertungen]
    .sort((a, b) => b.bewertung - a.bewertung);
  
  // Sortiere nach Anzahl Bewertungen (absteigend)
  const nachAnzahlSortiert = [...bewertungen]
    .sort((a, b) => b.anzahlBewertungen - a.anzahlBewertungen);
  
  // Berechne Durchschnittsbewertung
  const gesamtBewertung = bewertungen.reduce((sum, item) => sum + item.bewertung, 0);
  const durchschnittsBewertung = bewertungen.length > 0 ? gesamtBewertung / bewertungen.length : 0;
  
  return {
    besteBewertung: nachBewertungSortiert[0] || null,
    meisteBewertungen: nachAnzahlSortiert[0] || null,
    durchschnittsBewertung,
    alleProdukte: bewertungen
  };
}

/**
 * Findet gemeinsame Keywords aus Cerebro-Analysen
 * 
 * @param {any[]} cerebroAnalyses Cerebro-Analysen
 * @returns {any[]} Gemeinsame Keywords
 */
function findeGemeinsameKeywords(cerebroAnalyses: any[]): any[] {
  if (!cerebroAnalyses || cerebroAnalyses.length === 0) {
    return [];
  }
  
  // Extrahiere Keywords aus jeder Analyse
  const keywordSets = cerebroAnalyses.map(analyse => {
    const keywords = analyse.keywords || [];
    return new Set(keywords.map((kw: any) => kw.keyword.toLowerCase()));
  });
  
  // Finde Schnittmenge
  let gemeinsameKeywords = [...keywordSets[0]];
  
  for (let i = 1; i < keywordSets.length; i++) {
    gemeinsameKeywords = gemeinsameKeywords.filter(keyword => 
      keywordSets[i].has(keyword)
    );
  }
  
  // Erstelle detaillierte Informationen zu den gemeinsamen Keywords
  return gemeinsameKeywords.map(keyword => {
    const keywordDetails = cerebroAnalyses.map(analyse => {
      const keywordInfo = analyse.keywords.find(
        (kw: any) => kw.keyword.toLowerCase() === keyword
      );
      
      return {
        asin: analyse.asin,
        position: keywordInfo?.position || 0,
        suchvolumen: keywordInfo?.searchVolume || 0,
        relevanz: keywordInfo?.relevanceScore || 0
      };
    });
    
    // Durchschnittliche Position und Suchvolumen
    const durchschnittsPosition = keywordDetails.reduce(
      (sum, detail) => sum + detail.position, 0
    ) / keywordDetails.length;
    
    const suchvolumen = keywordDetails[0]?.suchvolumen || 0;
    
    return {
      keyword,
      suchvolumen,
      durchschnittsPosition,
      detailsProAsin: keywordDetails
    };
  }).sort((a, b) => b.suchvolumen - a.suchvolumen);
}

/**
 * Analysiert Unterschiede in der Positionierung
 * 
 * @param {any[]} asinAnalyses Produkt-Analysen
 * @param {any[]} cerebroAnalyses Cerebro-Analysen
 * @returns {object} Positionierungsunterschiede
 */
function analysierePositionierungsunterschiede(asinAnalyses: any[], cerebroAnalyses: any[]): object {
  // Extrahiere Features und USPs aus Produktanalysen
  const positionierungen = asinAnalyses.map((analyse, index) => {
    const features = analyse.basisDaten?.features || [];
    const usps = analyse.produktanalyse?.usps || [];
    
    return {
      asin: analyse.asin,
      features,
      usps,
      keywords: cerebroAnalyses[index]?.keywords || []
    };
  });
  
  // Identifiziere einzigartige Positionierungsmerkmale
  const uniquePositioningMap = new Map();
  
  positionierungen.forEach(pos => {
    // Analysiere Features
    pos.features.forEach((feature: string) => {
      if (!uniquePositioningMap.has(feature)) {
        uniquePositioningMap.set(feature, []);
      }
      uniquePositioningMap.get(feature).push(pos.asin);
    });
    
    // Analysiere USPs
    pos.usps.forEach((usp: string) => {
      if (!uniquePositioningMap.has(usp)) {
        uniquePositioningMap.set(usp, []);
      }
      uniquePositioningMap.get(usp).push(pos.asin);
    });
  });
  
  // Filtere nach einzigartigen und gemeinsamen Merkmalen
  const einzigartigeMerkmale = [];
  const geteiltePositionierung = [];
  
  uniquePositioningMap.forEach((asins, merkmal) => {
    if (asins.length === 1) {
      einzigartigeMerkmale.push({
        merkmal,
        asin: asins[0]
      });
    } else {
      geteiltePositionierung.push({
        merkmal,
        asins
      });
    }
  });
  
  return {
    einzigartigeMerkmale,
    geteiltePositionierung,
    positionierungsDetails: positionierungen.map(pos => ({
      asin: pos.asin,
      anzahlFeatures: pos.features.length,
      anzahlUSPs: pos.usps.length,
      topKeywords: pos.keywords
        .slice(0, 5)
        .map((kw: any) => kw.keyword)
    }))
  };
}

/**
 * Identifiziert Stärken und Schwächen der Produkte
 * 
 * @param {any[]} asinAnalyses Produkt-Analysen
 * @returns {object} Stärken und Schwächen
 */
function identifiziereStärkenUndSchwächen(asinAnalyses: any[]): object {
  return asinAnalyses.map(analyse => {
    return {
      asin: analyse.asin,
      titel: analyse.basisDaten?.titel || '',
      stärken: analyse.produktanalyse?.stärken || [],
      schwächen: analyse.produktanalyse?.schwächen || []
    };
  });
}

/**
 * Erzeugt Konkurrenzstrategien basierend auf den Analysen
 * 
 * @param {any[]} asinAnalyses Produkt-Analysen
 * @param {any[]} cerebroAnalyses Cerebro-Analysen
 * @returns {object} Strategieempfehlungen
 */
function erzeugeKonkurrenzstrategien(asinAnalyses: any[], cerebroAnalyses: any[]): object {
  // Finde das beste Produkt basierend auf Bewertungen
  const bewertungsVergleich = vergleicheBewertungen(asinAnalyses);
  const bestesBewertetes = bewertungsVergleich.besteBewertung;
  
  // Finde Produkte mit den meisten Verkäufen
  const sortedByVerkäufe = [...asinAnalyses].sort((a, b) => {
    const verkäufeA = a.verkaufsDaten?.geschätzteVerkäufe || 0;
    const verkäufeB = b.verkaufsDaten?.geschätzteVerkäufe || 0;
    return verkäufeB - verkäufeA;
  });
  
  const bestsellerProdukt = sortedByVerkäufe[0];
  
  // Finde gemeinsame Keywords
  const gemeinsameKeywords = findeGemeinsameKeywords(cerebroAnalyses);
  
  // Generiere Strategien
  const strategien = [
    {
      name: 'Differenzierungsstrategie',
      beschreibung: 'Heben Sie sich von der Konkurrenz ab, indem Sie einzigartige Merkmale betonen',
      details: 'Fokussieren Sie auf Funktionen oder Vorteile, die bei der Konkurrenz fehlen',
      empfohleneAktionen: [
        'Identifizieren Sie Lücken in Konkurrenzprodukten',
        'Entwickeln Sie einzigartige Verkaufsargumente (USPs)',
        'Betonen Sie diese in Titel und Bullet Points'
      ]
    },
    {
      name: 'Preispositionierungsstrategie',
      beschreibung: `Basierend auf der Preisspanne von ${berechnePreisspanne(asinAnalyses).minimum}€ bis ${berechnePreisspanne(asinAnalyses).maximum}€`,
      details: 'Positionieren Sie Ihr Produkt strategisch im Preissegment',
      empfohleneAktionen: [
        berechnePreisspanne(asinAnalyses).durchschnitt > 50 ? 
          'Premium-Positionierung mit höherer Qualität' : 
          'Wettbewerbsfähige Preisgestaltung im mittleren Segment',
        'Bieten Sie Mehrwert durch Bundles oder Zusatzleistungen',
        'Verwenden Sie psychologische Preisgestaltung'
      ]
    },
    {
      name: 'Keyword-Optimierungsstrategie',
      beschreibung: `Fokussieren Sie auf ${gemeinsameKeywords.length} gemeinsame Keywords mit hohem Suchvolumen`,
      details: 'Optimieren Sie Ihr Listing für relevante Keywords mit hohem Suchvolumen',
      empfohleneAktionen: gemeinsameKeywords.slice(0, 3).map(kw => 
        `Optimieren Sie für "${kw.keyword}" (${kw.suchvolumen} Suchen/Monat)`
      )
    }
  ];
  
  // Füge spezifische Strategien hinzu basierend auf der Marktposition
  if (bestesBewertetes) {
    strategien.push({
      name: 'Qualitätsverbesserungsstrategie',
      beschreibung: `Erreichen Sie Bewertungen wie das Top-Produkt (${bestesBewertetes.bewertung} Sterne)`,
      details: 'Verbessern Sie die Produktqualität und den Kundenservice',
      empfohleneAktionen: [
        'Analysieren Sie negative Bewertungen der Konkurrenz',
        'Beheben Sie häufige Probleme in Ihrem Produkt',
        'Bieten Sie hervorragenden Kundenservice'
      ]
    });
  }
  
  if (bestsellerProdukt) {
    strategien.push({
      name: 'Bestseller-Analyse-Strategie',
      beschreibung: `Lernen Sie vom Bestseller (${bestsellerProdukt.verkaufsDaten?.geschätzteVerkäufe || 0} Verkäufe/Monat)`,
      details: 'Analysieren Sie, was den Bestseller erfolgreich macht',
      empfohleneAktionen: [
        'Untersuchen Sie die Produkteigenschaften des Bestsellers',
        'Identifizieren Sie die wichtigsten Verkaufsargumente',
        'Verbessern Sie diese Aspekte in Ihrem eigenen Produkt'
      ]
    });
  }
  
  return {
    marktposition: {
      bestbewertet: bestesBewertetes,
      bestseller: bestsellerProdukt ? {
        asin: bestsellerProdukt.asin,
        verkäufe: bestsellerProdukt.verkaufsDaten?.geschätzteVerkäufe || 0
      } : null
    },
    strategieempfehlungen: strategien
  };
}

/**
 * Analysiert die Keyword-Abdeckung in optimierten Listing-Elementen
 * 
 * @param {any} keywordRecherche Ergebnisse der Keyword-Recherche
 * @param {any} titel Optimierter Titel
 * @param {any} bullets Optimierte Bullet Points
 * @param {any} beschreibung Optimierte Beschreibung
 * @returns {object} Keyword-Abdeckungsanalyse
 */
function analysiereKeywordAbdeckung(keywordRecherche: any, titel: any, bullets: any, beschreibung: any): object {
  // Extrahiere Keywords aus der Recherche
  const keywords = (keywordRecherche?.keywords || []).map((kw: any) => kw.keyword.toLowerCase());
  
  if (keywords.length === 0) {
    return {
      abdeckung: 0,
      abgedeckteKeywords: [],
      fehlendeKeywords: []
    };
  }
  
  // Kombiniere alle Listing-Elemente
  const titelText = titel?.text || '';
  const bulletsText = (bullets?.bullets || []).join(' ');
  const beschreibungText = beschreibung?.text || '';
  
  const gesamterText = `${titelText} ${bulletsText} ${beschreibungText}`.toLowerCase();
  
  // Prüfe, welche Keywords abgedeckt sind
  const abgedeckteKeywords = [];
  const fehlendeKeywords = [];
  
  for (const keyword of keywords) {
    if (gesamterText.includes(keyword)) {
      abgedeckteKeywords.push(keyword);
    } else {
      fehlendeKeywords.push(keyword);
    }
  }
  
  return {
    abdeckung: (abgedeckteKeywords.length / keywords.length) * 100,
    abgedeckteKeywords,
    fehlendeKeywords
  };
}

/**
 * Erzeugt Listing-Empfehlungen basierend auf den Optimierungen
 * 
 * @param {any} optimierungsergebnisse Ergebnisse der Listing-Optimierung
 * @returns {string[]} Empfehlungen für das Listing
 */
function erzeugeListingEmpfehlungen(optimierungsergebnisse: any): string[] {
  const empfehlungen = [];
  
  // Titel-Empfehlungen
  if (optimierungsergebnisse.titleOptimierung?.länge > 150) {
    empfehlungen.push('Kürzen Sie den Titel auf maximal 150 Zeichen für bessere Lesbarkeit');
  }
  
  if (optimierungsergebnisse.titleOptimierung?.keywordDichte < 70) {
    empfehlungen.push('Erhöhen Sie die Keyword-Dichte im Titel durch Einbau weiterer relevanter Keywords');
  }
  
  // Bullet-Empfehlungen
  const bullets = optimierungsergebnisse.bulletOptimierung?.bullets || [];
  if (bullets.length < 5) {
    empfehlungen.push('Nutzen Sie alle 5 verfügbaren Bullet Points für Ihr Listing');
  }
  
  if (bullets.some((bullet: string) => bullet.length > 255)) {
    empfehlungen.push('Kürzen Sie zu lange Bullet Points auf maximal 255 Zeichen');
  }
  
  // Beschreibungs-Empfehlungen
  if ((optimierungsergebnisse.beschreibungsOptimierung?.html || '').length < 1000) {
    empfehlungen.push('Erweitern Sie die Produktbeschreibung auf mindestens 1000 Zeichen für mehr Inhalt');
  }
  
  if (!(optimierungsergebnisse.beschreibungsOptimierung?.html || '').includes('<b>') && 
      !(optimierungsergebnisse.beschreibungsOptimierung?.html || '').includes('<strong>')) {
    empfehlungen.push('Verwenden Sie HTML-Formatierung in der Beschreibung, um wichtige Punkte hervorzuheben');
  }
  
  // Allgemeine Empfehlungen
  empfehlungen.push('Aktualisieren Sie Ihre Listing-Elemente regelmäßig basierend auf Keyword-Trends');
  empfehlungen.push('Testen Sie verschiedene Versionen des Titels, um die Klickrate zu optimieren');
  
  return empfehlungen;
} 