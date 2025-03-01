/**
 * Produkt-Analyse-Tools für MCP
 * 
 * Diese Datei enthält die MCP-Tools für die Produkt-Analyse basierend auf 
 * Helium10-API-Integrationen und Amazon-Produktdaten.
 */

import { xrayProductAnalysis, profitsSalesAnalysis } from '../apis/helium10-api';
import { getProductDetails, getBestsellers } from '../apis/amazon-api';
import { FileSystemCache } from '../cache/file-cache';

// Cache-Instanz für Tool-Ergebnisse
const cache = new FileSystemCache('product-tools-cache');

/**
 * MCP-Tool für Produkt-Analyse mit Helium10 Xray
 * 
 * @param {string} searchTerm Der Suchbegriff oder die ASIN
 * @param {string} marketplace Der Amazon-Marketplace (Standard: amazon.de)
 * @returns {Promise<object>} Strukturierte Produkt-Analyse
 */
export async function xrayProductAnalysisTool(searchTerm: string, marketplace = 'amazon.de'): Promise<object> {
  console.log(`Führe Xray-Produkt-Analyse für "${searchTerm}" auf ${marketplace} durch...`);
  
  const cacheKey = `tool:xray-analysis:${marketplace}:${searchTerm}`;
  
  // Versuche Cache zu nutzen
  const cachedResult = await cache.get(cacheKey);
  if (cachedResult) {
    console.log('Cache-Treffer für Xray-Analyse-Tool:', searchTerm);
    return cachedResult;
  }
  
  try {
    // Xray-Daten von Helium10 abrufen
    const xrayData = await xrayProductAnalysis(searchTerm, marketplace);
    
    // Strukturierte Analyse erstellen
    const analysis = {
      suchbegriff: searchTerm,
      marketplace,
      zeitpunkt: new Date().toISOString(),
      produktListe: xrayData.products?.map((product: any) => ({
        asin: product.asin,
        titel: product.title,
        marke: product.brand,
        preis: product.price,
        bewertung: product.rating,
        rezensionenAnzahl: product.reviewCount,
        geschätzteVerkäufe: product.estimatedSales,
        geschätzterUmsatz: product.estimatedRevenue,
        bsr: product.bsr,
        bilder: product.images
      })) || [],
      marktübersicht: {
        durchschnittspreis: calculateAveragePrice(xrayData.products),
        durchschnittlicheBewertung: calculateAverageRating(xrayData.products),
        gesamtgeschätzterUmsatz: calculateTotalRevenue(xrayData.products),
        marktgröße: estimateMarketSize(xrayData.products),
        verkaufsverteilung: calculateSalesDistribution(xrayData.products)
      },
      topVerkäufer: identifyTopSellers(xrayData.products),
      kaufoption: generatePurchasingStrategy(xrayData.products)
    };
    
    // Ergebnis cachen
    await cache.set(cacheKey, analysis, 12 * 60 * 60); // 12 Stunden
    
    return analysis;
  } catch (error) {
    console.error('Fehler bei Xray-Analyse-Tool:', error);
    throw new Error(`Xray-Analyse für "${searchTerm}" fehlgeschlagen: ${error.message}`);
  }
}

/**
 * MCP-Tool für detaillierte Einzelprodukt-Analyse
 * 
 * @param {string} asin Die zu analysierende ASIN
 * @param {string} marketplace Der Amazon-Marketplace (Standard: amazon.de)
 * @returns {Promise<object>} Detaillierte Produktanalyse
 */
export async function einzelproduktAnalyseTool(asin: string, marketplace = 'amazon.de'): Promise<object> {
  console.log(`Führe Einzelprodukt-Analyse für ASIN "${asin}" auf ${marketplace} durch...`);
  
  const cacheKey = `tool:einzelprodukt-analyse:${marketplace}:${asin}`;
  
  // Versuche Cache zu nutzen
  const cachedResult = await cache.get(cacheKey);
  if (cachedResult) {
    console.log('Cache-Treffer für Einzelprodukt-Analyse-Tool:', asin);
    return cachedResult;
  }
  
  try {
    // Amazon-Produktdetails abrufen
    const productDetails = await getProductDetails(asin, marketplace);
    
    // Xray-Analyse für das Produkt durchführen
    const xrayData = await xrayProductAnalysis(asin, marketplace);
    const productXrayData = xrayData.products?.find((p: any) => p.asin === asin) || {};
    
    // Strukturierte Analyse erstellen
    const analysis = {
      asin,
      marketplace,
      zeitpunkt: new Date().toISOString(),
      basisDaten: {
        titel: productDetails.title,
        beschreibung: productDetails.description,
        features: productDetails.features,
        preis: productDetails.price,
        bewertung: productDetails.rating,
        bilder: productDetails.images
      },
      verkaufsDaten: {
        geschätzteVerkäufe: productXrayData.estimatedSales || 0,
        geschätzterUmsatz: productXrayData.estimatedRevenue || 0,
        bsr: productXrayData.bsr || 0
      },
      spezifikationen: productDetails.specifications || {},
      produktanalyse: {
        stärken: identifyProductStrengths(productDetails, productXrayData),
        schwächen: identifyProductWeaknesses(productDetails, productXrayData),
        usps: extractProductUSPs(productDetails)
      },
      verbessungsVorschläge: generateProductImprovements(productDetails, productXrayData)
    };
    
    // Ergebnis cachen
    await cache.set(cacheKey, analysis, 24 * 60 * 60); // 24 Stunden
    
    return analysis;
  } catch (error) {
    console.error('Fehler bei Einzelprodukt-Analyse-Tool:', error);
    throw new Error(`Einzelprodukt-Analyse für "${asin}" fehlgeschlagen: ${error.message}`);
  }
}

/**
 * MCP-Tool für Verkaufsanalyse
 * Kombiniert Helium10 Profits-Daten mit Amazon-Bestseller-Informationen
 * 
 * @param {string} category Die Produktkategorie (optional)
 * @param {string} marketplace Der Amazon-Marketplace (Standard: amazon.de)
 * @returns {Promise<object>} Strukturierte Verkaufsanalyse
 */
export async function verkaufsanalyseTool(category = '', marketplace = 'amazon.de'): Promise<object> {
  console.log(`Führe Verkaufsanalyse ${category ? `für Kategorie "${category}"` : ''} auf ${marketplace} durch...`);
  
  const cacheKey = `tool:verkaufsanalyse:${marketplace}:${category || 'all'}`;
  
  // Versuche Cache zu nutzen
  const cachedResult = await cache.get(cacheKey);
  if (cachedResult) {
    console.log('Cache-Treffer für Verkaufsanalyse-Tool:', category || 'Allgemein');
    return cachedResult;
  }
  
  try {
    // Profits-Daten von Helium10 abrufen
    const profitsData = await profitsSalesAnalysis();
    
    // Bestseller-Daten von Amazon abrufen (falls eine Kategorie angegeben ist)
    let bestsellers = [];
    
    if (category) {
      bestsellers = await getBestsellers(category, marketplace);
    }
    
    // Strukturierte Analyse erstellen
    const analysis = {
      category: category || 'Allgemein',
      marketplace,
      zeitpunkt: new Date().toISOString(),
      täglicheVerkäufe: profitsData.dailySales || [],
      monatlicheSummen: profitsData.monthlyTotals || {},
      topProdukte: profitsData.topProducts || [],
      bestseller: bestsellers.map((item: any) => ({
        asin: item.asin,
        rang: item.rank,
        titel: item.title
      })),
      verkaufsTrends: analyzesSalesTrends(profitsData.dailySales),
      umsatzPrognose: forecastRevenue(profitsData.dailySales),
      produktPerformanceAnalyse: analyzeProductPerformance(profitsData.topProducts)
    };
    
    // Ergebnis cachen
    await cache.set(cacheKey, analysis, 12 * 60 * 60); // 12 Stunden
    
    return analysis;
  } catch (error) {
    console.error('Fehler bei Verkaufsanalyse-Tool:', error);
    throw new Error(`Verkaufsanalyse fehlgeschlagen: ${error.message}`);
  }
}

/**
 * MCP-Tool für kombinierte Markt- und Produkt-Analyse
 * 
 * @param {string} keyword Das zu analysierende Keyword oder die Kategorie
 * @param {string} marketplace Der Amazon-Marketplace (Standard: amazon.de)
 * @returns {Promise<object>} Umfassende Marktanalyse
 */
export async function marktanalyseTool(keyword: string, marketplace = 'amazon.de'): Promise<object> {
  console.log(`Führe Marktanalyse für "${keyword}" auf ${marketplace} durch...`);
  
  const cacheKey = `tool:marktanalyse:${marketplace}:${keyword}`;
  
  // Versuche Cache zu nutzen
  const cachedResult = await cache.get(cacheKey);
  if (cachedResult) {
    console.log('Cache-Treffer für Marktanalyse-Tool:', keyword);
    return cachedResult;
  }
  
  try {
    // Xray-Produkt-Analyse durchführen
    const xrayAnalysis = await xrayProductAnalysisTool(keyword, marketplace);
    
    // Verkaufsanalyse durchführen
    const salesAnalysis = await verkaufsanalyseTool('', marketplace);
    
    // Strukturierte Analyse erstellen
    const analysis = {
      keyword,
      marketplace,
      zeitpunkt: new Date().toISOString(),
      marktGröße: {
        geschätzterGesamtumsatz: xrayAnalysis.marktübersicht.gesamtgeschätzterUmsatz,
        anzahlVerkäufer: xrayAnalysis.produktListe.length,
        preisspanne: calculatePriceRange(xrayAnalysis.produktListe),
        durchschnittspreis: xrayAnalysis.marktübersicht.durchschnittspreis
      },
      wettbewerbsanalyse: {
        marktführer: xrayAnalysis.topVerkäufer,
        marktkonzentration: calculateMarketConcentration(xrayAnalysis.produktListe),
        eintrittsbarrieren: assessEntryBarriers(xrayAnalysis.produktListe)
      },
      verkaufsTrends: salesAnalysis.verkaufsTrends,
      umsatzPrognose: salesAnalysis.umsatzPrognose,
      marktChancen: identifyMarketOpportunities(xrayAnalysis.produktListe, salesAnalysis.verkaufsTrends),
      marktRisiken: identifyMarketRisks(xrayAnalysis.produktListe),
      empfehlungen: generateMarketRecommendations(xrayAnalysis, salesAnalysis)
    };
    
    // Ergebnis cachen
    await cache.set(cacheKey, analysis, 6 * 60 * 60); // 6 Stunden
    
    return analysis;
  } catch (error) {
    console.error('Fehler bei Marktanalyse-Tool:', error);
    throw new Error(`Marktanalyse für "${keyword}" fehlgeschlagen: ${error.message}`);
  }
}

/**
 * Berechnet den Durchschnittspreis aus den Produktdaten
 * 
 * @param {any[]} products Liste von Produkten
 * @returns {number} Durchschnittspreis
 */
function calculateAveragePrice(products: any[]): number {
  if (!products || products.length === 0) return 0;
  
  const totalPrice = products.reduce((sum, product) => sum + (product.price || 0), 0);
  return totalPrice / products.length;
}

/**
 * Berechnet die durchschnittliche Bewertung aus den Produktdaten
 * 
 * @param {any[]} products Liste von Produkten
 * @returns {number} Durchschnittliche Bewertung
 */
function calculateAverageRating(products: any[]): number {
  if (!products || products.length === 0) return 0;
  
  const totalRating = products.reduce((sum, product) => sum + (product.rating || 0), 0);
  return totalRating / products.length;
}

/**
 * Berechnet den Gesamtumsatz aus den Produktdaten
 * 
 * @param {any[]} products Liste von Produkten
 * @returns {number} Gesamtumsatz
 */
function calculateTotalRevenue(products: any[]): number {
  if (!products || products.length === 0) return 0;
  
  return products.reduce((sum, product) => sum + (product.estimatedRevenue || 0), 0);
}

/**
 * Schätzt die Marktgröße basierend auf Produktdaten
 * 
 * @param {any[]} products Liste von Produkten
 * @returns {object} Marktgröße-Informationen
 */
function estimateMarketSize(products: any[]): object {
  if (!products || products.length === 0) {
    return {
      geschätzterJahresumsatz: 0,
      produktAnzahl: 0,
      bewertung: 'Keine Daten verfügbar'
    };
  }
  
  const monthlyRevenue = products.reduce((sum, product) => sum + (product.estimatedRevenue || 0), 0);
  const yearlyRevenue = monthlyRevenue * 12;
  
  let bewertung = 'Klein';
  if (yearlyRevenue > 1000000) {
    bewertung = 'Groß';
  } else if (yearlyRevenue > 250000) {
    bewertung = 'Mittel';
  }
  
  return {
    geschätzterJahresumsatz: yearlyRevenue,
    produktAnzahl: products.length,
    bewertung
  };
}

/**
 * Berechnet die Verkaufsverteilung aus den Produktdaten
 * 
 * @param {any[]} products Liste von Produkten
 * @returns {object} Verkaufsverteilung
 */
function calculateSalesDistribution(products: any[]): object {
  if (!products || products.length === 0) {
    return { konzentrationsgrad: 0, topSellerAnteil: 0 };
  }
  
  // Sortiere Produkte nach geschätzten Verkäufen
  const sortedProducts = [...products].sort((a, b) => (b.estimatedSales || 0) - (a.estimatedSales || 0));
  
  // Berechne Gesamtverkäufe
  const totalSales = products.reduce((sum, product) => sum + (product.estimatedSales || 0), 0);
  
  // Berechne Anteil der Top 20% Seller
  const top20PercentCount = Math.max(1, Math.ceil(products.length * 0.2));
  const top20PercentSales = sortedProducts
    .slice(0, top20PercentCount)
    .reduce((sum, product) => sum + (product.estimatedSales || 0), 0);
  
  const top20PercentShare = totalSales > 0 ? (top20PercentSales / totalSales) * 100 : 0;
  
  // Berechne Herfindahl-Hirschman-Index (HHI) für Marktkonzentration
  const hhi = products.reduce((sum, product) => {
    const marketShare = totalSales > 0 ? ((product.estimatedSales || 0) / totalSales) * 100 : 0;
    return sum + (marketShare * marketShare);
  }, 0);
  
  return {
    konzentrationsgrad: hhi,
    konzentrationsBewertung: getConcentrationRating(hhi),
    topSellerAnteil: top20PercentShare,
    verteilungsBewertung: getDistributionRating(top20PercentShare)
  };
}

/**
 * Bewertet den Konzentrationsgrad basierend auf dem HHI
 * 
 * @param {number} hhi Herfindahl-Hirschman-Index
 * @returns {string} Bewertung
 */
function getConcentrationRating(hhi: number): string {
  if (hhi < 1500) return 'Wettbewerbsintensiv';
  if (hhi < 2500) return 'Mäßig konzentriert';
  return 'Hoch konzentriert';
}

/**
 * Bewertet die Verteilung basierend auf dem Top-Seller-Anteil
 * 
 * @param {number} topSellerShare Anteil der Top-Seller
 * @returns {string} Bewertung
 */
function getDistributionRating(topSellerShare: number): string {
  if (topSellerShare < 50) return 'Gleichmäßig';
  if (topSellerShare < 80) return 'Mäßig ungleichmäßig';
  return 'Stark ungleichmäßig';
}

/**
 * Identifiziert die Top-Verkäufer aus den Produktdaten
 * 
 * @param {any[]} products Liste von Produkten
 * @returns {any[]} Top-Verkäufer
 */
function identifyTopSellers(products: any[]): any[] {
  if (!products || products.length === 0) return [];
  
  // Sortiere Produkte nach geschätzten Verkäufen
  return [...products]
    .sort((a, b) => (b.estimatedSales || 0) - (a.estimatedSales || 0))
    .slice(0, 3)
    .map(product => ({
      asin: product.asin,
      titel: product.title,
      marke: product.brand,
      geschätzteVerkäufe: product.estimatedSales,
      geschätzterUmsatz: product.estimatedRevenue,
      bewertung: product.rating,
      rezensionenAnzahl: product.reviewCount
    }));
}

/**
 * Generiert eine Kaufstrategie basierend auf den Produktdaten
 * 
 * @param {any[]} products Liste von Produkten
 * @returns {object} Kaufstrategie
 */
function generatePurchasingStrategy(products: any[]): object {
  if (!products || products.length === 0) {
    return {
      empfehlung: 'Keine Daten verfügbar',
      preisstrategie: '',
      differenzierungsmöglichkeiten: []
    };
  }
  
  // Berechne Durchschnittspreis
  const avgPrice = calculateAveragePrice(products);
  
  // Berechne durchschnittliche Bewertung
  const avgRating = calculateAverageRating(products);
  
  // Prüfe Marktkonzentration
  const totalSales = products.reduce((sum, product) => sum + (product.estimatedSales || 0), 0);
  const topProduct = [...products].sort((a, b) => (b.estimatedSales || 0) - (a.estimatedSales || 0))[0];
  const topProductShare = topProduct ? ((topProduct.estimatedSales || 0) / totalSales) * 100 : 0;
  
  let empfehlung = '';
  let preisstrategie = '';
  const differenzierungsmöglichkeiten = [];
  
  if (avgRating < 4.0) {
    empfehlung = 'Markt mit Verbesserungspotenzial';
    preisstrategie = 'Premium-Strategie mit deutlichen Qualitätsverbesserungen';
    differenzierungsmöglichkeiten.push('Höhere Produktqualität', 'Besserer Kundenservice');
  } else if (topProductShare > 40) {
    empfehlung = 'Konzentrierter Markt mit dominantem Anbieter';
    preisstrategie = 'Nischenstrategie mit Spezialisierung';
    differenzierungsmöglichkeiten.push('Spezialisierung auf Unterkategorie', 'Zielgruppe mit spezifischen Bedürfnissen');
  } else {
    empfehlung = 'Wettbewerbsintensiver Markt mit verschiedenen Anbietern';
    preisstrategie = 'Wettbewerbsfähige Preisgestaltung';
    differenzierungsmöglichkeiten.push('Innovative Features', 'Verbesserte Produktpräsentation');
  }
  
  return {
    empfehlung,
    preisstrategie,
    empfohlenerPreisbereich: {
      minimum: Math.round(avgPrice * 0.9),
      maximum: Math.round(avgPrice * 1.1)
    },
    differenzierungsmöglichkeiten
  };
}

/**
 * Identifiziert die Stärken des Produkts
 * 
 * @param {any} productDetails Produktdetails
 * @param {any} xrayData Xray-Daten
 * @returns {string[]} Liste von Stärken
 */
function identifyProductStrengths(productDetails: any, xrayData: any): string[] {
  const strengths = [];
  
  if ((productDetails.rating || 0) >= 4.5) {
    strengths.push(`Hohe Bewertung: ${productDetails.rating} Sterne`);
  }
  
  if ((productDetails.features || []).length >= 5) {
    strengths.push('Umfangreiche Produktfeatures');
  }
  
  if ((xrayData.estimatedSales || 0) > 1000) {
    strengths.push(`Hohe Verkaufszahlen: ca. ${xrayData.estimatedSales} pro Monat`);
  }
  
  if ((productDetails.images || []).length >= 5) {
    strengths.push('Umfassende visuelle Produktpräsentation');
  }
  
  return strengths;
}

/**
 * Identifiziert die Schwächen des Produkts
 * 
 * @param {any} productDetails Produktdetails
 * @param {any} xrayData Xray-Daten
 * @returns {string[]} Liste von Schwächen
 */
function identifyProductWeaknesses(productDetails: any, xrayData: any): string[] {
  const weaknesses = [];
  
  if ((productDetails.rating || 0) < 4.0) {
    weaknesses.push(`Niedrige Bewertung: ${productDetails.rating} Sterne`);
  }
  
  if ((productDetails.features || []).length < 3) {
    weaknesses.push('Wenige Produktfeatures');
  }
  
  if ((xrayData.estimatedSales || 0) < 100) {
    weaknesses.push(`Niedrige Verkaufszahlen: ca. ${xrayData.estimatedSales} pro Monat`);
  }
  
  if ((productDetails.images || []).length < 3) {
    weaknesses.push('Begrenzte visuelle Produktpräsentation');
  }
  
  return weaknesses;
}

/**
 * Extrahiert USPs aus den Produktdetails
 * 
 * @param {any} productDetails Produktdetails
 * @returns {string[]} Liste von USPs
 */
function extractProductUSPs(productDetails: any): string[] {
  const features = productDetails.features || [];
  const description = productDetails.description || '';
  
  // Extrahiere Schlüsselwörter, die auf USPs hindeuten
  const uspKeywords = ['einzigartig', 'exklusiv', 'patent', 'innovativ', 'neu', 'führend', 'beste', 'premium'];
  
  const usps = [];
  
  // Suche in Features
  for (const feature of features) {
    for (const keyword of uspKeywords) {
      if (feature.toLowerCase().includes(keyword)) {
        usps.push(feature);
        break;
      }
    }
  }
  
  // Suche in Beschreibung (begrenzt auf 3 USPs)
  if (usps.length < 3) {
    const sentences = description.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      if (usps.length >= 3) break;
      
      for (const keyword of uspKeywords) {
        if (sentence.toLowerCase().includes(keyword) && !usps.includes(sentence.trim())) {
          usps.push(sentence.trim());
          break;
        }
      }
    }
  }
  
  return usps;
}

/**
 * Generiert Verbesserungsvorschläge für das Produkt
 * 
 * @param {any} productDetails Produktdetails
 * @param {any} xrayData Xray-Daten
 * @returns {string[]} Liste von Verbesserungsvorschlägen
 */
function generateProductImprovements(productDetails: any, xrayData: any): string[] {
  const improvements = [];
  
  if ((productDetails.rating || 0) < 4.5) {
    improvements.push('Produktqualität verbessern basierend auf Kundenfeedback');
  }
  
  if ((productDetails.features || []).length < 5) {
    improvements.push('Mehr Produktfeatures hinzufügen und diese hervorheben');
  }
  
  if ((productDetails.images || []).length < 5) {
    improvements.push('Mehr Produktbilder hinzufügen, inkl. Anwendungsbeispiele und Größenvergleiche');
  }
  
  if (!productDetails.description || productDetails.description.length < 500) {
    improvements.push('Ausführlichere Produktbeschreibung mit Hervorhebung der Vorteile');
  }
  
  improvements.push('Kundenrezensionen analysieren und häufige Kritikpunkte adressieren');
  
  return improvements;
}

/**
 * Analysiert Verkaufstrends aus täglichen Verkaufsdaten
 * 
 * @param {any[]} dailySales Tägliche Verkaufsdaten
 * @returns {object} Verkaufstrend-Analyse
 */
function analyzesSalesTrends(dailySales: any[]): object {
  if (!dailySales || dailySales.length === 0) {
    return {
      trend: 'Keine Daten verfügbar',
      wachstumsrate: 0,
      stabilität: 'Unbekannt'
    };
  }
  
  // Berechne Wachstumsrate
  const firstDaySales = dailySales[0].units || 0;
  const lastDaySales = dailySales[dailySales.length - 1].units || 0;
  const growthRate = firstDaySales > 0 ? 
    ((lastDaySales - firstDaySales) / firstDaySales) * 100 : 0;
  
  // Berechne durchschnittliche tägliche Änderung
  let totalChange = 0;
  for (let i = 1; i < dailySales.length; i++) {
    const prevSales = dailySales[i - 1].units || 0;
    const currentSales = dailySales[i].units || 0;
    totalChange += prevSales > 0 ? 
      Math.abs((currentSales - prevSales) / prevSales) * 100 : 0;
  }
  const avgDailyChange = totalChange / (dailySales.length - 1);
  
  // Bestimme Trend und Stabilität
  let trend = 'Stabil';
  if (growthRate > 5) {
    trend = 'Wachsend';
  } else if (growthRate < -5) {
    trend = 'Rückläufig';
  }
  
  let stability = 'Stabil';
  if (avgDailyChange > 15) {
    stability = 'Volatil';
  } else if (avgDailyChange > 7) {
    stability = 'Leicht schwankend';
  }
  
  return {
    trend,
    wachstumsrate: growthRate.toFixed(2),
    stabilität: stability,
    durchschnittlicheTäglicheÄnderung: avgDailyChange.toFixed(2),
    verkaufsDaten: dailySales.map(day => ({
      datum: day.date,
      einheiten: day.units,
      umsatz: day.revenue
    }))
  };
}

/**
 * Prognostiziert zukünftige Umsätze basierend auf Verkaufsdaten
 * 
 * @param {any[]} dailySales Tägliche Verkaufsdaten
 * @returns {object} Umsatzprognose
 */
function forecastRevenue(dailySales: any[]): object {
  if (!dailySales || dailySales.length < 7) {
    return {
      nächsteWoche: 0,
      nächsterMonat: 0,
      prognoseGenauigkeit: 'Niedrig (Nicht genügend Daten)'
    };
  }
  
  // Berechne durchschnittlichen täglichen Umsatz der letzten 7 Tage
  const last7Days = dailySales.slice(-7);
  const avgDailyRevenue = last7Days.reduce((sum, day) => sum + (day.revenue || 0), 0) / 7;
  
  // Berechne Wachstumsrate
  const firstWeekRevenue = dailySales.slice(0, 7).reduce((sum, day) => sum + (day.revenue || 0), 0);
  const lastWeekRevenue = last7Days.reduce((sum, day) => sum + (day.revenue || 0), 0);
  const weeklyGrowthRate = firstWeekRevenue > 0 ? 
    ((lastWeekRevenue - firstWeekRevenue) / firstWeekRevenue) + 1 : 1;
  
  // Prognose für nächste Woche und nächsten Monat
  const nextWeekRevenue = avgDailyRevenue * 7 * weeklyGrowthRate;
  const nextMonthRevenue = avgDailyRevenue * 30 * Math.pow(weeklyGrowthRate, 4);
  
  // Bestimme Prognosegenauigkeit
  let accuracy = 'Moderat';
  if (dailySales.length < 14) {
    accuracy = 'Niedrig (Begrenzte Daten)';
  } else if (Math.abs(weeklyGrowthRate - 1) > 0.2) {
    accuracy = 'Niedrig (Hohe Volatilität)';
  } else if (dailySales.length > 30) {
    accuracy = 'Hoch (Umfangreiche Daten)';
  }
  
  return {
    nächsteWoche: Math.round(nextWeekRevenue),
    nächsterMonat: Math.round(nextMonthRevenue),
    prognoseGenauigkeit: accuracy
  };
}

/**
 * Analysiert die Produktperformance aus den Top-Produktdaten
 * 
 * @param {any[]} topProducts Top-Produkte
 * @returns {object} Produktperformance-Analyse
 */
function analyzeProductPerformance(topProducts: any[]): object {
  if (!topProducts || topProducts.length === 0) {
    return {
      topPerformer: [],
      unterdurchschnittlich: [],
      optimierungsPotential: []
    };
  }
  
  // Berechne Durchschnittsgewinn pro Produkt
  const totalProfit = topProducts.reduce((sum, product) => sum + (product.profit || 0), 0);
  const avgProfit = totalProfit / topProducts.length;
  
  // Filtere Top-Performer und unterdurchschnittliche Produkte
  const topPerformers = topProducts
    .filter(product => (product.profit || 0) > avgProfit * 1.2)
    .map(product => ({
      asin: product.asin,
      umsatz: product.revenue,
      gewinn: product.profit,
      profitMargin: ((product.profit || 0) / (product.revenue || 1)) * 100
    }));
  
  const underperformers = topProducts
    .filter(product => (product.profit || 0) < avgProfit * 0.8)
    .map(product => ({
      asin: product.asin,
      umsatz: product.revenue,
      gewinn: product.profit,
      profitMargin: ((product.profit || 0) / (product.revenue || 1)) * 100
    }));
  
  // Identifiziere Produkte mit Optimierungspotential
  const optimizationPotential = underperformers.map(product => ({
    asin: product.asin,
    aktuelleMargin: product.profitMargin,
    potentielleMargin: avgProfit / (product.umsatz || 1) * 100,
    potentiellerMehrgewinn: (avgProfit - product.gewinn) * 12 // Jährlicher Mehrgewinn
  }));
  
  return {
    topPerformer: topPerformers,
    unterdurchschnittlich: underperformers,
    optimierungsPotential: optimizationPotential
  };
}

/**
 * Berechnet die Preisspanne aus den Produktdaten
 * 
 * @param {any[]} products Liste von Produkten
 * @returns {object} Preisspanne
 */
function calculatePriceRange(products: any[]): object {
  if (!products || products.length === 0) {
    return { minimum: 0, maximum: 0, spanne: 0 };
  }
  
  const prices = products.map(product => product.preis || 0).filter(price => price > 0);
  
  if (prices.length === 0) {
    return { minimum: 0, maximum: 0, spanne: 0 };
  }
  
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  
  return {
    minimum: minPrice,
    maximum: maxPrice,
    spanne: maxPrice - minPrice
  };
}

/**
 * Berechnet die Marktkonzentration basierend auf Produktdaten
 * 
 * @param {any[]} products Liste von Produkten
 * @returns {object} Marktkonzentration
 */
function calculateMarketConcentration(products: any[]): object {
  if (!products || products.length === 0) {
    return {
      hhi: 0,
      bewertung: 'Keine Daten verfügbar',
      top3MarktAnteil: 0
    };
  }
  
  // Berechne Gesamtverkäufe
  const totalSales = products.reduce((sum, product) => sum + (product.geschätzteVerkäufe || 0), 0);
  
  if (totalSales === 0) {
    return {
      hhi: 0,
      bewertung: 'Keine Verkaufsdaten verfügbar',
      top3MarktAnteil: 0
    };
  }
  
  // Berechne Herfindahl-Hirschman-Index (HHI)
  const hhi = products.reduce((sum, product) => {
    const marketShare = ((product.geschätzteVerkäufe || 0) / totalSales) * 100;
    return sum + (marketShare * marketShare);
  }, 0);
  
  // Berechne Marktanteil der Top 3 Verkäufer
  const sortedProducts = [...products].sort((a, b) => (b.geschätzteVerkäufe || 0) - (a.geschätzteVerkäufe || 0));
  const top3Sales = sortedProducts.slice(0, 3).reduce((sum, product) => sum + (product.geschätzteVerkäufe || 0), 0);
  const top3MarketShare = (top3Sales / totalSales) * 100;
  
  // Bewerte Marktkonzentration
  let rating = 'Wettbewerbsintensiv';
  if (hhi > 2500) {
    rating = 'Hoch konzentriert';
  } else if (hhi > 1500) {
    rating = 'Mäßig konzentriert';
  }
  
  return {
    hhi: Math.round(hhi),
    bewertung: rating,
    top3MarktAnteil: Math.round(top3MarketShare)
  };
}

/**
 * Bewertet Eintrittsbarrieren basierend auf Produktdaten
 * 
 * @param {any[]} products Liste von Produkten
 * @returns {object} Eintrittsbarrieren-Bewertung
 */
function assessEntryBarriers(products: any[]): object {
  if (!products || products.length === 0) {
    return {
      niveau: 'Unbekannt',
      faktoren: []
    };
  }
  
  const avgPrice = calculateAveragePrice(products);
  const priceRange = calculatePriceRange(products);
  const avgReviews = products.reduce((sum, product) => sum + (product.rezensionenAnzahl || 0), 0) / products.length;
  
  // Faktoren für Eintrittsbarrieren
  const factors = [];
  
  // Preisbarriere
  if (avgPrice > 100) {
    factors.push('Hohe Produktkosten');
  }
  
  // Rezensionsbarriere
  if (avgReviews > 1000) {
    factors.push('Etablierte Produkte mit vielen Rezensionen');
  }
  
  // Markensättigung
  const uniqueBrands = new Set(products.map(product => product.marke).filter(Boolean)).size;
  const brandSaturation = uniqueBrands / products.length;
  
  if (brandSaturation < 0.3) {
    factors.push('Wenige dominierende Marken');
  }
  
  // Bewerte Eintrittsbarrieren
  let level = 'Niedrig';
  if (factors.length >= 2) {
    level = 'Hoch';
  } else if (factors.length === 1) {
    level = 'Mittel';
  }
  
  // Zusätzliche Standard-Faktoren
  factors.push('Initiale Produktentwicklung und Sourcing');
  
  if (level === 'Niedrig' && factors.length < 2) {
    factors.push('Geringe Differenzierung zwischen bestehenden Produkten');
  }
  
  return {
    niveau: level,
    faktoren: factors
  };
}

/**
 * Identifiziert Marktchancen basierend auf Produktdaten und Verkaufstrends
 * 
 * @param {any[]} products Liste von Produkten
 * @param {any} salesTrends Verkaufstrends
 * @returns {string[]} Liste von Marktchancen
 */
function identifyMarketOpportunities(products: any[], salesTrends: any): string[] {
  if (!products || products.length === 0) {
    return ['Keine Daten verfügbar'];
  }
  
  const opportunities = [];
  
  // Prüfe Wachstumstrend
  if (salesTrends && salesTrends.trend === 'Wachsend') {
    opportunities.push('Wachsender Markt mit steigender Nachfrage');
  }
  
  // Prüfe Preisspanne
  const priceRange = calculatePriceRange(products);
  if (priceRange.spanne > priceRange.minimum) {
    opportunities.push(`Breite Preisspanne bietet Möglichkeiten für verschiedene Preisstrategien (${priceRange.minimum}€ - ${priceRange.maximum}€)`);
  }
  
  // Prüfe Bewertungslücken
  const lowRatingProducts = products.filter(product => (product.bewertung || 0) < 4.0);
  if (lowRatingProducts.length > 0) {
    opportunities.push('Qualitätslücken bei bestehenden Produkten bieten Verbesserungspotential');
  }
  
  // Prüfe Markenvielfalt
  const uniqueBrands = new Set(products.map(product => product.marke).filter(Boolean)).size;
  if (uniqueBrands < products.length * 0.5) {
    opportunities.push('Raum für neue Marken im Markt');
  }
  
  // Standardchancen hinzufügen, falls noch wenige identifiziert wurden
  if (opportunities.length < 2) {
    opportunities.push('Optimierung von Produktpräsentation und Marketingstrategien');
  }
  
  return opportunities;
}

/**
 * Identifiziert Marktrisiken basierend auf Produktdaten
 * 
 * @param {any[]} products Liste von Produkten
 * @returns {string[]} Liste von Marktrisiken
 */
function identifyMarketRisks(products: any[]): string[] {
  if (!products || products.length === 0) {
    return ['Keine Daten verfügbar'];
  }
  
  const risks = [];
  
  // Prüfe Wettbewerbsintensität
  if (products.length > 20) {
    risks.push('Hohe Anzahl von Wettbewerbern');
  }
  
  // Prüfe dominante Marktführer
  const marketConcentration = calculateMarketConcentration(products);
  if (marketConcentration.bewertung === 'Hoch konzentriert') {
    risks.push(`Markt wird von wenigen Anbietern dominiert (Top 3 Marktanteil: ${marketConcentration.top3MarktAnteil}%)`);
  }
  
  // Prüfe Preisdruck
  const avgPrice = calculateAveragePrice(products);
  const lowPriceProducts = products.filter(product => (product.preis || 0) < avgPrice * 0.8);
  if (lowPriceProducts.length > products.length * 0.3) {
    risks.push('Preisdruck durch günstige Anbieter');
  }
  
  // Standardrisiken hinzufügen, falls noch wenige identifiziert wurden
  if (risks.length < 2) {
    risks.push('Allgemeine Marktschwankungen und saisonale Veränderungen');
    risks.push('Mögliche Änderungen der Amazon-Richtlinien und -Algorithmen');
  }
  
  return risks;
}

/**
 * Generiert Marktempfehlungen basierend auf Analysen
 * 
 * @param {any} xrayAnalysis Xray-Analyse
 * @param {any} salesAnalysis Verkaufsanalyse
 * @returns {string[]} Liste von Empfehlungen
 */
function generateMarketRecommendations(xrayAnalysis: any, salesAnalysis: any): string[] {
  const recommendations = [];
  
  // Empfehlungen basierend auf Marktgröße
  const marketSize = xrayAnalysis.marktübersicht?.marktgröße;
  if (marketSize && marketSize.bewertung === 'Groß') {
    recommendations.push('Großer Markt: Fokus auf Differenzierung und klare Positionierung');
  } else if (marketSize && marketSize.bewertung === 'Mittel') {
    recommendations.push('Mittelgroßer Markt: Balance zwischen Differenzierung und wettbewerbsfähigen Preisen');
  } else if (marketSize && marketSize.bewertung === 'Klein') {
    recommendations.push('Kleiner Markt: Spezialisierung auf Nische mit spezifischen Kundenbedürfnissen');
  }
  
  // Empfehlungen basierend auf Verkaufstrends
  if (salesAnalysis.verkaufsTrends && salesAnalysis.verkaufsTrends.trend === 'Wachsend') {
    recommendations.push('Wachsender Markt: Früher Einstieg für langfristigen Erfolg');
  } else if (salesAnalysis.verkaufsTrends && salesAnalysis.verkaufsTrends.trend === 'Stabil') {
    recommendations.push('Stabiler Markt: Fokus auf Qualität und Kundenzufriedenheit');
  } else if (salesAnalysis.verkaufsTrends && salesAnalysis.verkaufsTrends.trend === 'Rückläufig') {
    recommendations.push('Rückläufiger Markt: Nur mit klarem Alleinstellungsmerkmal einsteigen');
  }
  
  // Empfehlungen basierend auf Kaufstrategie
  if (xrayAnalysis.kaufoption && xrayAnalysis.kaufoption.empfehlung) {
    recommendations.push(`Marktstrategie: ${xrayAnalysis.kaufoption.empfehlung}`);
  }
  
  // Standardempfehlungen hinzufügen, falls noch wenige identifiziert wurden
  if (recommendations.length < 3) {
    recommendations.push('Regelmäßige Analyse von Wettbewerbern und Markttrends');
    recommendations.push('Investition in hochwertige Produktbilder und optimierte Produktbeschreibungen');
  }
  
  return recommendations;
}
