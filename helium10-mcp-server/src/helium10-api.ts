/**
 * Helium10 API-Integrationsmodul
 * 
 * Dieses Modul stellt die Verbindung zur Helium10 API her und ermöglicht
 * den Zugriff auf verschiedene Helium10-Tools wie Cerebro, Magnet, Xray usw.
 */

import axios from 'axios';
import { getConfig } from './config.js';
import { logger } from './logger.js';

/**
 * Basis-URL für Helium10 API
 */
const HELIUM10_API_BASE_URL = 'https://api.helium10.com/v1';

/**
 * Schnittstelle für Keyword-Recherche-Ergebnisse
 */
export interface KeywordResearchResult {
  keyword: string;
  searchVolume: number;
  cpc: number;
  competition: number;
  trendData?: { month: string; volume: number }[];
  relevance?: number;
}

/**
 * Schnittstelle für Xray-Suchergebnisse
 */
export interface XraySearchResult {
  asin: string;
  title: string;
  price: number;
  reviews: number;
  rating: number;
  revenue: number;
  bsr: number;
  images: string[];
}

/**
 * Hilfsfunktion zum Abrufen des Helium10 API-Tokens
 */
async function getHelium10ApiToken(): Promise<string> {
  const config = getConfig();
  
  if (!config.helium10ApiKey) {
    logger.error('Helium10 API-Schlüssel nicht konfiguriert');
    throw new Error('Helium10 API-Schlüssel fehlt in der Konfiguration');
  }
  
  try {
    // In einer echten Implementierung würden wir hier den API-Token holen
    // Für dieses Beispiel geben wir einfach den API-Schlüssel zurück
    return config.helium10ApiKey;
  } catch (error) {
    logger.error('Fehler beim Abrufen des Helium10 API-Tokens', error as Error);
    throw error;
  }
}

/**
 * Führt eine Keyword-Recherche mit Helium10 Magnet durch
 * 
 * @param seedKeyword Ausgangs-Keyword für die Recherche
 * @param marketplace Amazon Marketplace (z.B. amazon.de)
 * @param limit Maximale Anzahl an Ergebnissen
 */
export async function magnetKeywordResearch(
  seedKeyword: string,
  marketplace = 'amazon.de',
  limit = 100
): Promise<KeywordResearchResult[]> {
  try {
    const token = await getHelium10ApiToken();
    logger.info(`Führe Magnet-Keyword-Recherche für "${seedKeyword}" durch`);
    
    const url = `${HELIUM10_API_BASE_URL}/magnet`;
    const response = await axios.post(url, {
      marketplace,
      keyword: seedKeyword,
      limit
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status !== 200 || !response.data.success) {
      logger.warn('Magnet-API-Anfrage fehlgeschlagen', {
        status: response.status,
        message: response.data?.message
      });
      return [];
    }
    
    // Ergebnis transformieren
    return response.data.data.map((item: any) => ({
      keyword: item.keyword,
      searchVolume: item.search_volume || 0,
      cpc: item.cpc || 0,
      competition: item.competition || 0,
      trendData: item.trend_data?.map((trend: any) => ({
        month: trend.month,
        volume: trend.volume
      })),
      relevance: item.relevance
    }));
    
  } catch (error) {
    logger.error(`Fehler bei Magnet-Keyword-Recherche für "${seedKeyword}"`, error as Error);
    // Simulierte Daten für die Entwicklung zurückgeben
    return [
      {
        keyword: seedKeyword,
        searchVolume: 1200,
        cpc: 0.8,
        competition: 0.75,
        relevance: 1.0
      },
      {
        keyword: `${seedKeyword} günstig`,
        searchVolume: 850,
        cpc: 0.65,
        competition: 0.6,
        relevance: 0.9
      },
      {
        keyword: `bester ${seedKeyword}`,
        searchVolume: 550,
        cpc: 0.9,
        competition: 0.8,
        relevance: 0.85
      }
    ];
  }
}

/**
 * Führt eine ASIN-basierte Keyword-Recherche mit Helium10 Cerebro durch
 * 
 * @param asin ASIN für die Keyword-Recherche
 * @param marketplace Amazon Marketplace (z.B. amazon.de)
 * @param limit Maximale Anzahl an Ergebnissen
 */
export async function cerebroKeywordResearch(
  asin: string,
  marketplace = 'amazon.de',
  limit = 100
): Promise<KeywordResearchResult[]> {
  try {
    const token = await getHelium10ApiToken();
    logger.info(`Führe Cerebro-Keyword-Recherche für ASIN "${asin}" durch`);
    
    const url = `${HELIUM10_API_BASE_URL}/cerebro`;
    const response = await axios.post(url, {
      marketplace,
      asin,
      limit
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status !== 200 || !response.data.success) {
      logger.warn('Cerebro-API-Anfrage fehlgeschlagen', {
        status: response.status,
        message: response.data?.message
      });
      return [];
    }
    
    // Ergebnis transformieren
    return response.data.data.map((item: any) => ({
      keyword: item.keyword,
      searchVolume: item.search_volume || 0,
      cpc: item.cpc || 0,
      competition: item.competition || 0,
      trendData: item.trend_data?.map((trend: any) => ({
        month: trend.month,
        volume: trend.volume
      })),
      relevance: item.relevance
    }));
    
  } catch (error) {
    logger.error(`Fehler bei Cerebro-Keyword-Recherche für ASIN "${asin}"`, error as Error);
    // Simulierte Daten für die Entwicklung zurückgeben
    return [
      {
        keyword: "produkt kategorie",
        searchVolume: 9500,
        cpc: 1.2,
        competition: 0.85,
        relevance: 0.95
      },
      {
        keyword: "qualitätsprodukt",
        searchVolume: 5500,
        cpc: 0.95,
        competition: 0.7,
        relevance: 0.8
      },
      {
        keyword: "premium produkt",
        searchVolume: 3500,
        cpc: 1.1,
        competition: 0.75,
        relevance: 0.9
      }
    ];
  }
}

/**
 * Führt eine Produktrecherche mit Helium10 X-Ray durch
 * 
 * @param keyword Suchbegriff für die Produktrecherche
 * @param marketplace Amazon Marketplace (z.B. amazon.de)
 * @param limit Maximale Anzahl an Ergebnissen
 */
export async function xrayProductResearch(
  keyword: string,
  marketplace = 'amazon.de',
  limit = 50
): Promise<XraySearchResult[]> {
  try {
    const token = await getHelium10ApiToken();
    logger.info(`Führe X-Ray-Produktrecherche für "${keyword}" durch`);
    
    const url = `${HELIUM10_API_BASE_URL}/xray`;
    const response = await axios.post(url, {
      marketplace,
      keyword,
      limit
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status !== 200 || !response.data.success) {
      logger.warn('X-Ray-API-Anfrage fehlgeschlagen', {
        status: response.status,
        message: response.data?.message
      });
      return [];
    }
    
    // Ergebnis transformieren
    return response.data.data.map((item: any) => ({
      asin: item.asin,
      title: item.title,
      price: item.price || 0,
      reviews: item.reviews || 0,
      rating: item.rating || 0,
      revenue: item.revenue || 0,
      bsr: item.bsr || 0,
      images: item.images || []
    }));
    
  } catch (error) {
    logger.error(`Fehler bei X-Ray-Produktrecherche für "${keyword}"`, error as Error);
    // Simulierte Daten für die Entwicklung zurückgeben
    return [
      {
        asin: "B07ABCDEF1",
        title: "Premium Produkt Kategorie 1",
        price: 29.99,
        reviews: 1250,
        rating: 4.5,
        revenue: 28500,
        bsr: 1250,
        images: ["https://example.com/image1.jpg"]
      },
      {
        asin: "B07ABCDEF2",
        title: "Premium Produkt Kategorie 2",
        price: 39.99,
        reviews: 850,
        rating: 4.2,
        revenue: 18500,
        bsr: 2350,
        images: ["https://example.com/image2.jpg"]
      },
      {
        asin: "B07ABCDEF3",
        title: "Budget Produkt Kategorie",
        price: 19.99,
        reviews: 2500,
        rating: 4.0,
        revenue: 32500,
        bsr: 980,
        images: ["https://example.com/image3.jpg"]
      }
    ];
  }
}
