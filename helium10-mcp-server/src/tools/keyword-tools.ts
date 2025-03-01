/**
 * Keyword-Analyse-Tools für MCP
 * 
 * Diese Datei enthält die MCP-Tools für die Keyword-Analyse basierend auf 
 * Helium10-API-Integrationen und Amazon-Produktdaten.
 */

import { magnetKeywordResearch } from '../apis/helium10-api';
import { searchProducts } from '../apis/amazon-api';
import { cerebroAsinResearch } from '../apis/helium10-api';
import { FileSystemCache } from '../cache/file-cache';

// Cache-Instanz für Tool-Ergebnisse
const cache = new FileSystemCache('keyword-tools-cache');

/**
 * MCP-Tool für umfassende Keyword-Recherche
 * Kombiniert Helium10 Magnet mit Amazon-Produktsuche
 * 
 * @param {string} keyword Das zu recherchierende Keyword
 * @param {string} marketplace Der Amazon-Marketplace (Standard: amazon.de)
 * @returns {Promise<object>} Strukturierte Keyword-Analyse
 */
export async function magnetKeywordResearchTool(keyword: string, marketplace = 'amazon.de'): Promise<object> {
  console.log(`Führe Magnet-Keyword-Recherche für "${keyword}" auf ${marketplace} durch...`);
  
  const cacheKey = `tool:magnet-research:${marketplace}:${keyword}`;
  
  // Versuche Cache zu nutzen
  const cachedResult = await cache.get(cacheKey);
  if (cachedResult) {
    console.log('Cache-Treffer für Keyword-Recherche-Tool:', keyword);
    return cachedResult;
  }
  
  try {
    // Keyword-Daten von Helium10 Magnet abrufen
    const magnetData = await magnetKeywordResearch(keyword, marketplace);
    
    // Top-Produkte für dieses Keyword auf Amazon suchen
    const productData = await searchProducts(keyword, marketplace);
    
    // Strukturierte Analyse erstellen
    const analysis = {
      keyword,
      marketplace,
      zeitpunkt: new Date().toISOString(),
      suchvolumen: magnetData.metadata?.estimatedSearchVolume || 0,
      keywordVarianten: magnetData.keywords?.map((kw: any) => ({
        keyword: kw.keyword,
        suchvolumen: kw.searchVolume,
        schwierigkeit: kw.difficulty,
        relevanz: kw.relevanceScore,
        geschätztesUmsatzpotenzial: (kw.searchVolume || 0) * 0.2 * 20 // Grobe Schätzung
      })) || [],
      topProdukte: productData.items?.map((product: any) => ({
        asin: product.asin,
        titel: product.title,
        preis: product.price,
        bewertung: product.rating,
        bildUrl: product.imageUrl
      })) || [],
      fazit: generateKeywordInsights(magnetData, productData),
      nächsteSchritte: generateNextSteps(magnetData, productData)
    };
    
    // Ergebnis cachen
    await cache.set(cacheKey, analysis, 24 * 60 * 60); // 24 Stunden
    
    return analysis;
  } catch (error) {
    console.error('Fehler bei Keyword-Recherche-Tool:', error);
    throw new Error(`Keyword-Recherche für "${keyword}" fehlgeschlagen: ${error.message}`);
  }
}

/**
 * MCP-Tool für ASIN-basierte Keyword-Extraktion
 * Nutzt Helium10 Cerebro für Reverse-ASIN-Lookups
 * 
 * @param {string} asin Die zu analysierende ASIN
 * @param {string} marketplace Der Amazon-Marketplace (Standard: amazon.de)
 * @returns {Promise<object>} Strukturierte Keyword-Analyse für die ASIN
 */
export async function cerebroAsinResearchTool(asin: string, marketplace = 'amazon.de'): Promise<object> {
  console.log(`Führe Cerebro-ASIN-Recherche für "${asin}" auf ${marketplace} durch...`);
  
  const cacheKey = `tool:cerebro-research:${marketplace}:${asin}`;
  
  // Versuche Cache zu nutzen
  const cachedResult = await cache.get(cacheKey);
  if (cachedResult) {
    console.log('Cache-Treffer für ASIN-Recherche-Tool:', asin);
    return cachedResult;
  }
  
  try {
    // ASIN-Daten von Helium10 Cerebro abrufen
    const cerebroData = await cerebroAsinResearch(asin, marketplace);
    
    // Strukturierte Analyse erstellen
    const analysis = {
      asin,
      marketplace,
      zeitpunkt: new Date().toISOString(),
      keywords: cerebroData.keywords?.map((kw: any) => ({
        keyword: kw.keyword,
        suchvolumen: kw.searchVolume,
        ranking: kw.rank,
        relevanz: kw.relevanceScore
      })) || [],
      fazit: generateAsinInsights(cerebroData),
      optimierungsVorschläge: generateAsinOptimizationSuggestions(cerebroData)
    };
    
    // Ergebnis cachen
    await cache.set(cacheKey, analysis, 24 * 60 * 60); // 24 Stunden
    
    return analysis;
  } catch (error) {
    console.error('Fehler bei ASIN-Recherche-Tool:', error);
    throw new Error(`ASIN-Recherche für "${asin}" fehlgeschlagen: ${error.message}`);
  }
}

/**
 * MCP-Tool für kombinierte Keyword-und-ASIN-Analyse
 * Führt Keyword-Recherche durch und analysiert dann die Top-ASINs
 * 
 * @param {string} keyword Das zu recherchierende Keyword
 * @param {string} marketplace Der Amazon-Marketplace (Standard: amazon.de)
 * @returns {Promise<object>} Tiefgehende kombinierte Analyse
 */
export async function tiefenanalyseKeywordTool(keyword: string, marketplace = 'amazon.de'): Promise<object> {
  console.log(`Führe Tiefenanalyse für "${keyword}" auf ${marketplace} durch...`);
  
  const cacheKey = `tool:tiefenanalyse:${marketplace}:${keyword}`;
  
  // Versuche Cache zu nutzen
  const cachedResult = await cache.get(cacheKey);
  if (cachedResult) {
    console.log('Cache-Treffer für Tiefenanalyse-Tool:', keyword);
    return cachedResult;
  }
  
  try {
    // Schritt 1: Keyword-Recherche durchführen
    const keywordAnalysis = await magnetKeywordResearchTool(keyword, marketplace);
    
    // Schritt 2: Top-ASINs extrahieren
    const topAsins = keywordAnalysis.topProdukte?.slice(0, 3).map((p: any) => p.asin) || [];
    
    // Schritt 3: ASIN-Analysen für jeden Top-ASIN durchführen
    const asinAnalyses = await Promise.all(
      topAsins.map(async (asin: string) => {
        return {
          asin,
          analyse: await cerebroAsinResearchTool(asin, marketplace)
        };
      })
    );
    
    // Schritt 4: Gemeinsame Keywords zwischen den Top-Produkten finden
    const commonKeywords = findCommonKeywords(asinAnalyses);
    
    // Schritt 5: Tiefenanalyse zusammenstellen
    const tiefenanalyse = {
      keyword,
      marketplace,
      zeitpunkt: new Date().toISOString(),
      keywordAnalyse: keywordAnalysis,
      asinAnalysen: asinAnalyses,
      gemeinsameKeywords: commonKeywords,
      wettbewerbsanalyse: generateCompetitionAnalysis(asinAnalyses),
      strategieEmpfehlungen: generateStrategyRecommendations(keywordAnalysis, asinAnalyses)
    };
    
    // Ergebnis cachen
    await cache.set(cacheKey, tiefenanalyse, 12 * 60 * 60); // 12 Stunden
    
    return tiefenanalyse;
  } catch (error) {
    console.error('Fehler bei Tiefenanalyse-Tool:', error);
    throw new Error(`Tiefenanalyse für "${keyword}" fehlgeschlagen: ${error.message}`);
  }
}

/**
 * Generiert Erkenntnisse aus Keyword-Daten
 * 
 * @param {any} magnetData Helium10 Magnet-Daten
 * @param {any} productData Amazon-Produktdaten
 * @returns {string} Generierte Erkenntnisse
 */
function generateKeywordInsights(magnetData: any, productData: any): string {
  const keywordCount = magnetData.keywords?.length || 0;
  const avgDifficulty = magnetData.keywords?.reduce((sum: number, kw: any) => sum + (kw.difficulty || 0), 0) / keywordCount || 0;
  const searchVolume = magnetData.metadata?.estimatedSearchVolume || 0;
  const productCount = productData.items?.length || 0;
  
  let insights = `Keyword "${magnetData.keywords?.[0]?.keyword || 'unbekannt'}" `;
  
  if (searchVolume > 10000) {
    insights += `hat ein hohes Suchvolumen (${searchVolume}) `;
  } else if (searchVolume > 3000) {
    insights += `hat ein mittleres Suchvolumen (${searchVolume}) `;
  } else {
    insights += `hat ein niedriges Suchvolumen (${searchVolume}) `;
  }
  
  if (avgDifficulty > 70) {
    insights += `mit hoher Schwierigkeit (${avgDifficulty.toFixed(1)}). `;
  } else if (avgDifficulty > 40) {
    insights += `mit mittlerer Schwierigkeit (${avgDifficulty.toFixed(1)}). `;
  } else {
    insights += `mit niedriger Schwierigkeit (${avgDifficulty.toFixed(1)}). `;
  }
  
  insights += `Es wurden ${keywordCount} verwandte Keywords und ${productCount} relevante Produkte gefunden.`;
  
  return insights;
}

/**
 * Generiert nächste Schritte basierend auf Keyword-Daten
 * 
 * @param {any} magnetData Helium10 Magnet-Daten
 * @param {any} productData Amazon-Produktdaten
 * @returns {string[]} Liste von nächsten Schritten
 */
function generateNextSteps(magnetData: any, productData: any): string[] {
  const avgDifficulty = magnetData.keywords?.reduce((sum: number, kw: any) => sum + (kw.difficulty || 0), 0) / 
                        (magnetData.keywords?.length || 1) || 0;
  const searchVolume = magnetData.metadata?.estimatedSearchVolume || 0;
  
  const steps = [];
  
  if (searchVolume > 5000) {
    steps.push("Führen Sie eine ASIN-Analyse der Top-Konkurrenten durch");
  }
  
  if (avgDifficulty > 60) {
    steps.push("Fokussieren Sie sich auf Long-Tail-Keywords mit geringerer Schwierigkeit");
  } else {
    steps.push("Nutzen Sie diese Keywords für Ihr Listing und PPC-Kampagnen");
  }
  
  steps.push("Analysieren Sie die Top-Produkte auf gemeinsame Merkmale");
  steps.push("Führen Sie eine tiefergehende Marktanalyse mit Helium10 Xray durch");
  
  return steps;
}

/**
 * Generiert Erkenntnisse aus ASIN-Daten
 * 
 * @param {any} cerebroData Helium10 Cerebro-Daten
 * @returns {string} Generierte Erkenntnisse
 */
function generateAsinInsights(cerebroData: any): string {
  const keywordCount = cerebroData.keywords?.length || 0;
  const topKeywords = cerebroData.keywords?.slice(0, 3) || [];
  const avgSearchVolume = cerebroData.keywords?.reduce((sum: number, kw: any) => sum + (kw.searchVolume || 0), 0) / keywordCount || 0;
  
  let insights = `Die ASIN "${cerebroData.metadata?.associatedAsin || 'unbekannt'}" `;
  
  if (keywordCount > 50) {
    insights += `rankt für viele Keywords (${keywordCount}). `;
  } else if (keywordCount > 20) {
    insights += `rankt für eine moderate Anzahl von Keywords (${keywordCount}). `;
  } else {
    insights += `rankt für wenige Keywords (${keywordCount}). `;
  }
  
  insights += `Die Top-Keywords nach Suchvolumen sind `;
  
  if (topKeywords.length > 0) {
    insights += topKeywords.map((kw: any) => `"${kw.keyword}" (${kw.searchVolume})`).join(', ');
  } else {
    insights += "nicht verfügbar";
  }
  
  insights += `. Das durchschnittliche Suchvolumen beträgt ${avgSearchVolume.toFixed(1)}.`;
  
  return insights;
}

/**
 * Generiert Optimierungsvorschläge basierend auf ASIN-Daten
 * 
 * @param {any} cerebroData Helium10 Cerebro-Daten
 * @returns {string[]} Liste von Optimierungsvorschlägen
 */
function generateAsinOptimizationSuggestions(cerebroData: any): string[] {
  const highVolumeKeywords = cerebroData.keywords?.filter((kw: any) => (kw.searchVolume || 0) > 1000) || [];
  const lowRankKeywords = cerebroData.keywords?.filter((kw: any) => (kw.rank || 999) > 10) || [];
  
  const suggestions = [];
  
  if (highVolumeKeywords.length > 0) {
    suggestions.push(`Optimieren Sie für Keywords mit hohem Suchvolumen: ${
      highVolumeKeywords.slice(0, 3).map((kw: any) => `"${kw.keyword}"`).join(', ')
    }`);
  }
  
  if (lowRankKeywords.length > 0) {
    suggestions.push(`Verbessern Sie das Ranking für: ${
      lowRankKeywords.slice(0, 3).map((kw: any) => `"${kw.keyword}" (aktueller Rang: ${kw.rank})`).join(', ')
    }`);
  }
  
  suggestions.push("Überprüfen Sie, ob alle relevanten Keywords in Ihrem Listing enthalten sind");
  suggestions.push("Erwägen Sie PPC-Kampagnen für die Top-Keywords");
  
  return suggestions;
}

/**
 * Findet gemeinsame Keywords zwischen mehreren ASIN-Analysen
 * 
 * @param {any[]} asinAnalyses Liste von ASIN-Analysen
 * @returns {any[]} Liste gemeinsamer Keywords
 */
function findCommonKeywords(asinAnalyses: any[]): any[] {
  if (asinAnalyses.length === 0) return [];
  
  // Keywords aus dem ersten ASIN extrahieren
  const firstAsinKeywords = new Map();
  asinAnalyses[0].analyse.keywords?.forEach((kw: any) => {
    firstAsinKeywords.set(kw.keyword.toLowerCase(), {
      keyword: kw.keyword,
      frequency: 1,
      gesamtSuchvolumen: kw.suchvolumen || 0,
      durchschnittlichesRanking: kw.ranking || 0
    });
  });
  
  // Keywords in anderen ASINs suchen
  for (let i = 1; i < asinAnalyses.length; i++) {
    const asinAnalysis = asinAnalyses[i];
    
    asinAnalysis.analyse.keywords?.forEach((kw: any) => {
      const keyword = kw.keyword.toLowerCase();
      
      if (firstAsinKeywords.has(keyword)) {
        const existingData = firstAsinKeywords.get(keyword);
        existingData.frequency += 1;
        existingData.gesamtSuchvolumen += (kw.suchvolumen || 0);
        existingData.durchschnittlichesRanking += (kw.ranking || 0);
      }
    });
  }
  
  // Nur Keywords behalten, die in allen ASINs vorkommen
  const commonKeywords = Array.from(firstAsinKeywords.values())
    .filter(data => data.frequency === asinAnalyses.length)
    .map(data => ({
      ...data,
      durchschnittlichesRanking: data.durchschnittlichesRanking / data.frequency,
      durchschnittlichesSuchvolumen: data.gesamtSuchvolumen / data.frequency
    }))
    .sort((a, b) => b.durchschnittlichesSuchvolumen - a.durchschnittlichesSuchvolumen);
  
  return commonKeywords;
}

/**
 * Generiert Wettbewerbsanalyse basierend auf ASIN-Analysen
 * 
 * @param {any[]} asinAnalyses Liste von ASIN-Analysen
 * @returns {object} Wettbewerbsanalyse
 */
function generateCompetitionAnalysis(asinAnalyses: any[]): object {
  const asins = asinAnalyses.map(a => a.asin);
  const totalKeywordsPerAsin = asinAnalyses.map(a => a.analyse.keywords?.length || 0);
  const avgKeywordsPerAsin = totalKeywordsPerAsin.reduce((sum, count) => sum + count, 0) / asins.length;
  
  return {
    analysierteASINs: asins,
    anzahlKeywordsProASIN: totalKeywordsPerAsin,
    durchschnittlicheKeywordAnzahl: avgKeywordsPerAsin,
    keywordÜberschneidung: calculateKeywordOverlap(asinAnalyses),
    stärken: identifyCompetitionStrengths(asinAnalyses),
    schwächen: identifyCompetitionWeaknesses(asinAnalyses)
  };
}

/**
 * Berechnet die Keyword-Überschneidung zwischen ASINs
 * 
 * @param {any[]} asinAnalyses Liste von ASIN-Analysen
 * @returns {number} Prozentuale Überschneidung
 */
function calculateKeywordOverlap(asinAnalyses: any[]): number {
  if (asinAnalyses.length <= 1) return 0;
  
  const keywordSets = asinAnalyses.map(a => {
    const keywords = new Set();
    a.analyse.keywords?.forEach((kw: any) => keywords.add(kw.keyword.toLowerCase()));
    return keywords;
  });
  
  // Anzahl der gemeinsamen Keywords
  let commonCount = 0;
  
  // Für jedes Keyword im ersten Set prüfen, ob es in allen anderen Sets vorkommt
  keywordSets[0].forEach(keyword => {
    let isCommon = true;
    
    for (let i = 1; i < keywordSets.length; i++) {
      if (!keywordSets[i].has(keyword)) {
        isCommon = false;
        break;
      }
    }
    
    if (isCommon) commonCount++;
  });
  
  // Prozentuale Überschneidung berechnen
  return (commonCount / keywordSets[0].size) * 100;
}

/**
 * Identifiziert Stärken der Wettbewerber
 * 
 * @param {any[]} asinAnalyses Liste von ASIN-Analysen
 * @returns {string[]} Liste von Stärken
 */
function identifyCompetitionStrengths(asinAnalyses: any[]): string[] {
  const strengths = [];
  
  // Prüfen, ob es viele gemeinsame Keywords gibt
  const overlap = calculateKeywordOverlap(asinAnalyses);
  
  if (overlap > 50) {
    strengths.push(`Hohe Keyword-Überschneidung (${overlap.toFixed(1)}%): Wettbewerber nutzen ähnliche Keywords`);
  }
  
  // Prüfen, ob Wettbewerber für hochvolumige Keywords ranken
  const highVolumeKeywords = new Set();
  asinAnalyses.forEach(a => {
    a.analyse.keywords?.forEach((kw: any) => {
      if ((kw.suchvolumen || 0) > 5000) {
        highVolumeKeywords.add(kw.keyword);
      }
    });
  });
  
  if (highVolumeKeywords.size > 0) {
    strengths.push(`Wettbewerber ranken für ${highVolumeKeywords.size} hochvolumige Keywords`);
  }
  
  return strengths;
}

/**
 * Identifiziert Schwächen der Wettbewerber
 * 
 * @param {any[]} asinAnalyses Liste von ASIN-Analysen
 * @returns {string[]} Liste von Schwächen
 */
function identifyCompetitionWeaknesses(asinAnalyses: any[]): string[] {
  const weaknesses = [];
  
  // Prüfen, ob es wenige gemeinsame Keywords gibt
  const overlap = calculateKeywordOverlap(asinAnalyses);
  
  if (overlap < 20) {
    weaknesses.push(`Geringe Keyword-Überschneidung (${overlap.toFixed(1)}%): Wettbewerber haben unterschiedliche Keyword-Strategien`);
  }
  
  // Prüfen, ob es Keywords gibt, für die nur ein Wettbewerber rankt
  const uniqueKeywordsPerAsin = asinAnalyses.map(a => {
    const uniqueKeywords = [];
    const thisAsinKeywords = new Set(a.analyse.keywords?.map((kw: any) => kw.keyword.toLowerCase()));
    
    // Prüfen, ob das Keyword in anderen ASINs vorkommt
    thisAsinKeywords.forEach(keyword => {
      let isUnique = true;
      
      for (const otherA of asinAnalyses) {
        if (otherA.asin === a.asin) continue;
        
        const otherKeywords = new Set(otherA.analyse.keywords?.map((kw: any) => kw.keyword.toLowerCase()));
        
        if (otherKeywords.has(keyword)) {
          isUnique = false;
          break;
        }
      }
      
      if (isUnique) uniqueKeywords.push(keyword);
    });
    
    return {
      asin: a.asin,
      uniqueKeywords
    };
  });
  
  const asinsWithUniqueKeywords = uniqueKeywordsPerAsin.filter(a => a.uniqueKeywords.length > 0);
  
  if (asinsWithUniqueKeywords.length > 0) {
    weaknesses.push(`${asinsWithUniqueKeywords.length} von ${asinAnalyses.length} Wettbewerbern haben einzigartige Keywords`);
  }
  
  return weaknesses;
}

/**
 * Generiert Strategieempfehlungen basierend auf der Analyse
 * 
 * @param {any} keywordAnalysis Keyword-Analyse
 * @param {any[]} asinAnalyses ASIN-Analysen
 * @returns {string[]} Liste von Strategieempfehlungen
 */
function generateStrategyRecommendations(keywordAnalysis: any, asinAnalyses: any[]): string[] {
  const recommendations = [];
  
  // Gemeinsame Keywords prüfen
  const commonKeywords = findCommonKeywords(asinAnalyses);
  
  if (commonKeywords.length > 0) {
    recommendations.push(`Nutzen Sie die gemeinsamen Keywords: ${
      commonKeywords.slice(0, 3).map((kw: any) => `"${kw.keyword}"`).join(', ')
    }`);
  }
  
  // Alleinstellungsmerkmale suchen
  const uniqueKeywordsPerAsin = identifyUniqueKeywords(asinAnalyses);
  
  if (uniqueKeywordsPerAsin.some(a => a.uniqueKeywords.length > 0)) {
    recommendations.push("Analysieren Sie die einzigartigen Keywords der Wettbewerber für Nischenideen");
  }
  
  // Suchvolumen berücksichtigen
  const avgDifficulty = keywordAnalysis.keywordVarianten?.reduce((sum: number, kw: any) => sum + (kw.schwierigkeit || 0), 0) / 
                         (keywordAnalysis.keywordVarianten?.length || 1) || 0;
  
  if (avgDifficulty > 60) {
    recommendations.push("Der Markt ist wettbewerbsintensiv - fokussieren Sie sich auf spezifische Nischen oder Produktverbesserungen");
  } else {
    recommendations.push("Der Markt bietet Einstiegsmöglichkeiten - setzen Sie auf Qualität und wettbewerbsfähige Preise");
  }
  
  return recommendations;
}

/**
 * Identifiziert einzigartige Keywords pro ASIN
 * 
 * @param {any[]} asinAnalyses Liste von ASIN-Analysen
 * @returns {any[]} Liste von ASINs mit einzigartigen Keywords
 */
function identifyUniqueKeywords(asinAnalyses: any[]): any[] {
  return asinAnalyses.map(a => {
    const uniqueKeywords = [];
    const thisAsinKeywords = new Set(a.analyse.keywords?.map((kw: any) => kw.keyword.toLowerCase()));
    
    // Prüfen, ob das Keyword in anderen ASINs vorkommt
    thisAsinKeywords.forEach(keyword => {
      let isUnique = true;
      
      for (const otherA of asinAnalyses) {
        if (otherA.asin === a.asin) continue;
        
        const otherKeywords = new Set(otherA.analyse.keywords?.map((kw: any) => kw.keyword.toLowerCase()));
        
        if (otherKeywords.has(keyword)) {
          isUnique = false;
          break;
        }
      }
      
      if (isUnique) uniqueKeywords.push(keyword);
    });
    
    return {
      asin: a.asin,
      uniqueKeywords
    };
  });
}
