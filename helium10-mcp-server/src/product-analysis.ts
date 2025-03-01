/**
 * Amazon-Produktanalyse-Komponente für Helium10 MCP Server
 * 
 * Dieses Modul bietet Funktionen zur Analyse von Amazon-Produkten
 * und zur Generierung von Berichten und Empfehlungen.
 */

import { getProductByAsin } from './amazon-api.js';
import { xrayProductResearch, magnetKeywordResearch, cerebroKeywordResearch } from './helium10-api.js';
import { setupDatabase, addOrUpdateProduct } from './db.js';
import { logger } from './logger.js';

interface CompetitorAnalysis {
  competitorCount: number;
  averageRating: number;
  averageReviews: number;
  averagePrice: number;
  estimatedRevenue: number;
  topCompetitors: Array<{
    asin: string;
    title: string;
    price: number;
    rating: number;
    reviews: number;
    revenue?: number;
  }>;
}

interface KeywordAnalysis {
  totalKeywords: number;
  highVolumeKeywords: Array<{
    keyword: string;
    searchVolume: number;
    competition: number;
  }>;
  lowCompetitionKeywords: Array<{
    keyword: string;
    searchVolume: number;
    competition: number;
  }>;
  recommendedKeywords: Array<{
    keyword: string;
    searchVolume: number;
    competition: number;
    rating: number; // 1-10 basierend auf einem Algorithmus
  }>;
}

interface PricingAnalysis {
  marketMinimum: number;
  marketMaximum: number;
  marketAverage: number;
  optimalPriceRange: {
    min: number;
    max: number;
  };
  pricingRecommendation: number;
}

interface MarketOpportunityScore {
  overall: number; // 1-100
  competition: number; // 1-100
  demand: number; // 1-100
  profitPotential: number; // 1-100
  entryBarrier: number; // 1-100
  reviewDifficulty: number; // 1-100
}

interface ProductAnalysisReport {
  asin?: string;
  keyword?: string;
  competitors: CompetitorAnalysis;
  keywords: KeywordAnalysis;
  pricing: PricingAnalysis;
  opportunityScore: MarketOpportunityScore;
  recommendations: string[];
}

/**
 * Führt eine umfassende Produktanalyse für einen Suchbegriff durch
 * 
 * @param keyword Suchbegriff für die Analyse
 * @param marketplace Amazon Marketplace (z.B. amazon.de)
 */
export async function analyzeKeyword(keyword: string, marketplace = 'amazon.de'): Promise<ProductAnalysisReport> {
  try {
    logger.info(`Starte Keyword-Analyse für "${keyword}" auf ${marketplace}`);
    
    // 1. Produktdaten mit X-Ray abrufen
    const productData = await xrayProductResearch(keyword, marketplace);
    
    if (productData.length === 0) {
      throw new Error(`Keine Produkte für "${keyword}" gefunden`);
    }
    
    // 2. Keyworddaten mit Magnet abrufen
    const keywordData = await magnetKeywordResearch(keyword, marketplace);
    
    // 3. Produkte in der Datenbank speichern
    const db = await setupDatabase();
    for (const product of productData.slice(0, 10)) { // Top 10 Produkte speichern
      await addOrUpdateProduct(
        db,
        product.asin,
        product.title,
        product.price,
        product.reviews,
        product.rating,
        `https://www.${marketplace}/dp/${product.asin}`
      );
    }
    
    // 4. Wettbewerberanalyse erstellen
    const competitorAnalysis: CompetitorAnalysis = {
      competitorCount: productData.length,
      averageRating: calculateAverage(productData.map(p => p.rating)),
      averageReviews: calculateAverage(productData.map(p => p.reviews)),
      averagePrice: calculateAverage(productData.map(p => p.price)),
      estimatedRevenue: calculateSum(productData.map(p => p.revenue)),
      topCompetitors: productData.slice(0, 5).map(p => ({
        asin: p.asin,
        title: p.title,
        price: p.price,
        rating: p.rating,
        reviews: p.reviews,
        revenue: p.revenue
      }))
    };
    
    // 5. Keyword-Analyse erstellen
    const keywordAnalysis: KeywordAnalysis = {
      totalKeywords: keywordData.length,
      highVolumeKeywords: keywordData
        .filter(k => k.searchVolume > 1000)
        .sort((a, b) => b.searchVolume - a.searchVolume)
        .slice(0, 5)
        .map(k => ({
          keyword: k.keyword,
          searchVolume: k.searchVolume,
          competition: k.competition
        })),
      lowCompetitionKeywords: keywordData
        .filter(k => k.competition < 0.5 && k.searchVolume > 300)
        .sort((a, b) => a.competition - b.competition)
        .slice(0, 5)
        .map(k => ({
          keyword: k.keyword,
          searchVolume: k.searchVolume,
          competition: k.competition
        })),
      recommendedKeywords: keywordData
        .map(k => ({
          keyword: k.keyword,
          searchVolume: k.searchVolume,
          competition: k.competition,
          rating: calculateKeywordRating(k.searchVolume, k.competition)
        }))
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 5)
    };
    
    // 6. Preisanalyse erstellen
    const prices = productData.map(p => p.price).filter(p => p > 0);
    const pricingAnalysis: PricingAnalysis = {
      marketMinimum: Math.min(...prices),
      marketMaximum: Math.max(...prices),
      marketAverage: calculateAverage(prices),
      optimalPriceRange: calculateOptimalPriceRange(prices),
      pricingRecommendation: calculateRecommendedPrice(prices)
    };
    
    // 7. Marktchancen-Score berechnen
    const opportunityScore: MarketOpportunityScore = {
      overall: calculateOverallOpportunityScore(competitorAnalysis, keywordAnalysis, pricingAnalysis),
      competition: calculateCompetitionScore(competitorAnalysis),
      demand: calculateDemandScore(keywordAnalysis),
      profitPotential: calculateProfitPotentialScore(pricingAnalysis, competitorAnalysis),
      entryBarrier: calculateEntryBarrierScore(competitorAnalysis, keywordAnalysis),
      reviewDifficulty: calculateReviewDifficultyScore(competitorAnalysis)
    };
    
    // 8. Empfehlungen generieren
    const recommendations = generateRecommendations(
      keyword,
      competitorAnalysis,
      keywordAnalysis,
      pricingAnalysis,
      opportunityScore
    );
    
    logger.info(`Keyword-Analyse für "${keyword}" abgeschlossen`);
    
    return {
      keyword,
      competitors: competitorAnalysis,
      keywords: keywordAnalysis,
      pricing: pricingAnalysis,
      opportunityScore,
      recommendations
    };
    
  } catch (error) {
    logger.error(`Fehler bei der Keyword-Analyse für "${keyword}"`, error as Error);
    throw error;
  }
}

/**
 * Führt eine umfassende Produktanalyse für eine ASIN durch
 * 
 * @param asin ASIN für die Analyse
 * @param marketplace Amazon Marketplace (z.B. amazon.de)
 */
export async function analyzeAsin(asin: string, marketplace = 'amazon.de'): Promise<ProductAnalysisReport> {
  try {
    logger.info(`Starte ASIN-Analyse für "${asin}" auf ${marketplace}`);
    
    // 1. Produktdaten abrufen
    const productData = await getProductByAsin(asin, marketplace);
    
    if (!productData) {
      throw new Error(`Keine Daten für ASIN "${asin}" gefunden`);
    }
    
    // 2. Keyworddaten mit Cerebro abrufen
    const keywordData = await cerebroKeywordResearch(asin, marketplace);
    
    // 3. Ähnliche Produkte finden (vereinfacht)
    const similarProducts = await xrayProductResearch(productData.title.split(' ').slice(0, 3).join(' '), marketplace);
    
    // 4. Produkt in der Datenbank speichern
    const db = await setupDatabase();
    await addOrUpdateProduct(
      db,
      asin,
      productData.title,
      productData.price,
      productData.reviewsCount,
      productData.rating,
      `https://www.${marketplace}/dp/${asin}`
    );
    
    // Analysen ähnlich wie bei Keyword-Analyse durchführen
    // (gekürzt für Übersichtlichkeit)
    
    // Beispielhafte Rückgabewerte
    return {
      asin,
      competitors: {
        competitorCount: similarProducts.length,
        averageRating: calculateAverage(similarProducts.map(p => p.rating)),
        averageReviews: calculateAverage(similarProducts.map(p => p.reviews)),
        averagePrice: calculateAverage(similarProducts.map(p => p.price)),
        estimatedRevenue: calculateSum(similarProducts.map(p => p.revenue)),
        topCompetitors: similarProducts.slice(0, 5).map(p => ({
          asin: p.asin,
          title: p.title,
          price: p.price,
          rating: p.rating,
          reviews: p.reviews,
          revenue: p.revenue
        }))
      },
      keywords: {
        totalKeywords: keywordData.length,
        highVolumeKeywords: keywordData
          .filter(k => k.searchVolume > 1000)
          .sort((a, b) => b.searchVolume - a.searchVolume)
          .slice(0, 5)
          .map(k => ({
            keyword: k.keyword,
            searchVolume: k.searchVolume,
            competition: k.competition
          })),
        lowCompetitionKeywords: keywordData
          .filter(k => k.competition < 0.5 && k.searchVolume > 300)
          .sort((a, b) => a.competition - b.competition)
          .slice(0, 5)
          .map(k => ({
            keyword: k.keyword,
            searchVolume: k.searchVolume,
            competition: k.competition
          })),
        recommendedKeywords: keywordData
          .map(k => ({
            keyword: k.keyword,
            searchVolume: k.searchVolume,
            competition: k.competition,
            rating: calculateKeywordRating(k.searchVolume, k.competition)
          }))
          .sort((a, b) => b.rating - a.rating)
          .slice(0, 5)
      },
      pricing: {
        marketMinimum: Math.min(...similarProducts.map(p => p.price)),
        marketMaximum: Math.max(...similarProducts.map(p => p.price)),
        marketAverage: calculateAverage(similarProducts.map(p => p.price)),
        optimalPriceRange: {
          min: productData.price * 0.85,
          max: productData.price * 1.15
        },
        pricingRecommendation: productData.price * 1.05 // Beispielhafte Berechnung
      },
      opportunityScore: {
        overall: 75, // Beispielwert
        competition: 68,
        demand: 82,
        profitPotential: 77,
        entryBarrier: 65,
        reviewDifficulty: 58
      },
      recommendations: [
        `Fokussiere dich auf die Hauptkeywords: ${keywordData.slice(0, 3).map(k => k.keyword).join(', ')}`,
        'Optimiere dein Listing für verbesserte Conversion-Rate',
        'Setze deinen Preis im optimalen Preisbereich an'
      ]
    };
    
  } catch (error) {
    logger.error(`Fehler bei der ASIN-Analyse für "${asin}"`, error as Error);
    throw error;
  }
}

/* Hilfsfunktionen für Berechnungen */

function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function calculateSum(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0);
}

function calculateKeywordRating(searchVolume: number, competition: number): number {
  // Ein einfacher Algorithmus zur Bewertung von Keywords
  // Hohe Nachfrage und niedrige Konkurrenz erhalten die höchste Bewertung
  const volumeScore = Math.min(searchVolume / 1000, 10);
  const competitionScore = 10 - (competition * 10);
  return (volumeScore * 0.6) + (competitionScore * 0.4);
}

function calculateOptimalPriceRange(prices: number[]): { min: number; max: number } {
  if (prices.length === 0) {
    return { min: 0, max: 0 };
  }
  
  // Vereinfachte Berechnung: 20% unter bis 20% über dem Durchschnitt
  const avg = calculateAverage(prices);
  return {
    min: avg * 0.8,
    max: avg * 1.2
  };
}

function calculateRecommendedPrice(prices: number[]): number {
  if (prices.length === 0) return 0;
  
  // Vereinfachte Berechnung: Durchschnitt + 5% für bessere Marge
  return calculateAverage(prices) * 1.05;
}

function calculateOverallOpportunityScore(
  competitors: CompetitorAnalysis,
  keywords: KeywordAnalysis,
  pricing: PricingAnalysis
): number {
  // Vereinfachte Berechnung eines Gesamtscores
  const competitionScore = calculateCompetitionScore(competitors);
  const demandScore = calculateDemandScore(keywords);
  const profitScore = calculateProfitPotentialScore(pricing, competitors);
  const entryBarrierScore = calculateEntryBarrierScore(competitors, keywords);
  const reviewScore = calculateReviewDifficultyScore(competitors);
  
  // Gewichtete Summe
  return (
    competitionScore * 0.25 +
    demandScore * 0.25 +
    profitScore * 0.20 +
    entryBarrierScore * 0.15 +
    reviewScore * 0.15
  );
}

function calculateCompetitionScore(competitors: CompetitorAnalysis): number {
  // Niedrigere Wettbewerbszahl = höherer Score
  const countScore = Math.max(0, 100 - (competitors.competitorCount * 2));
  
  // Niedrigere Durchschnittsbewertung = höherer Score
  const ratingScore = Math.max(0, 100 - (competitors.averageRating * 20));
  
  return (countScore * 0.7) + (ratingScore * 0.3);
}

function calculateDemandScore(keywords: KeywordAnalysis): number {
  // Höheres Suchvolumen = höherer Score
  if (!keywords.highVolumeKeywords.length) return 40; // Durchschnittsscore ohne Daten
  
  const avgVolume = calculateAverage(
    keywords.highVolumeKeywords.map(k => k.searchVolume)
  );
  
  // Normalisieren auf 100-Punkte-Skala
  return Math.min(100, avgVolume / 100);
}

function calculateProfitPotentialScore(pricing: PricingAnalysis, competitors: CompetitorAnalysis): number {
  // Höherer Durchschnittspreis = höheres Gewinnpotenzial
  const priceScore = Math.min(100, (pricing.marketAverage / 10) * 20);
  
  // Höhere geschätzte Einnahmen = höheres Marktpotenzial
  const revenueScore = Math.min(100, (competitors.estimatedRevenue / 10000) * 10);
  
  return (priceScore * 0.7) + (revenueScore * 0.3);
}

function calculateEntryBarrierScore(competitors: CompetitorAnalysis, keywords: KeywordAnalysis): number {
  // Weniger Wettbewerber = niedrigere Eintrittsbarriere
  const competitorScore = Math.max(0, 100 - (competitors.competitorCount * 2));
  
  // Niedrigere Konkurrenz in Keywords = niedrigere Eintrittsbarriere
  const keywordCompetitionScore = keywords.lowCompetitionKeywords.length > 0
    ? calculateAverage(keywords.lowCompetitionKeywords.map(k => (1 - k.competition) * 100))
    : 50; // Durchschnittsscore ohne Daten
    
  return (competitorScore * 0.5) + (keywordCompetitionScore * 0.5);
}

function calculateReviewDifficultyScore(competitors: CompetitorAnalysis): number {
  // Weniger Durchschnittsbewertungen = leichter, sich zu differenzieren
  const reviewScore = Math.max(0, 100 - (Math.log(competitors.averageReviews + 1) * 10));
  
  return reviewScore;
}

function generateRecommendations(
  keyword: string,
  competitors: CompetitorAnalysis,
  keywords: KeywordAnalysis,
  pricing: PricingAnalysis,
  score: MarketOpportunityScore
): string[] {
  const recommendations: string[] = [];
  
  // Allgemeine Marktempfehlung
  if (score.overall >= 80) {
    recommendations.push(`Ausgezeichnete Marktchance für "${keyword}". Sofortiges Handeln empfohlen.`);
  } else if (score.overall >= 60) {
    recommendations.push(`Gute Marktchance für "${keyword}". Einstieg empfohlen.`);
  } else if (score.overall >= 40) {
    recommendations.push(`Moderate Marktchance für "${keyword}". Weitere Analyse empfohlen.`);
  } else {
    recommendations.push(`Herausfordernde Marktchance für "${keyword}". Alternative Produkte in Betracht ziehen.`);
  }
  
  // Keyword-Empfehlungen
  if (keywords.recommendedKeywords.length > 0) {
    recommendations.push(`Fokussiere dich auf diese Keywords: ${keywords.recommendedKeywords.slice(0, 3).map(k => k.keyword).join(', ')}`);
  }
  
  // Preisempfehlungen
  recommendations.push(`Optimaler Preisbereich: ${pricing.optimalPriceRange.min.toFixed(2)} - ${pricing.optimalPriceRange.max.toFixed(2)} €`);
  recommendations.push(`Empfohlener Preis: ${pricing.pricingRecommendation.toFixed(2)} €`);
  
  // Wettbewerbsempfehlungen
  if (competitors.averageRating > 4.0) {
    recommendations.push('Fokussiere auf herausragende Produktqualität, da die Wettbewerber hohe Bewertungen haben.');
  } else {
    recommendations.push('Nutze die Chance, dich durch bessere Qualität von den Wettbewerbern abzuheben.');
  }
  
  return recommendations;
}
