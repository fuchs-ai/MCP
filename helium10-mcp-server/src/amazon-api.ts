/**
 * Amazon API-Integrationsmodul für Helium10 MCP Server
 * 
 * Dieses Modul stellt die Verbindung zu Amazon APIs her und ermöglicht
 * die Abfrage von Produktdaten, Keyword-Rankings und Verkaufsinformationen.
 */

import axios from 'axios';
import { getConfig } from './config.js';
import { logger } from './logger.js';
import { Database } from 'sqlite';
import { addOrUpdateProduct } from './db.js';

/**
 * Struktur für Amazon Produktdaten
 */
export interface AmazonProduct {
  asin: string;
  title: string;
  price: number;
  currency: string;
  rating: number;
  reviewsCount: number;
  images: string[];
  description: string;
  features: string[];
  categories: string[];
  bsr: { 
    category: string; 
    rank: number; 
  }[];
}

/**
 * Ruft Produktdaten von Amazon basierend auf ASIN ab
 * 
 * @param asin Amazon Standard Identification Number
 * @param marketplace Amazon Marketplace (z.B. amazon.de)
 */
export async function getProductByAsin(asin: string, marketplace = 'amazon.de'): Promise<AmazonProduct | null> {
  const config = getConfig();
  const url = `https://api.rainforestapi.com/request?api_key=${config.rainforestApiKey}&type=product&amazon_domain=${marketplace}&asin=${asin}`;
  
  try {
    logger.info(`Rufe ASIN ${asin} von ${marketplace} ab`);
    const response = await axios.get(url);
    
    if (response.status !== 200 || !response.data.product) {
      logger.warn(`Keine Daten für ASIN ${asin} gefunden`, { status: response.status });
      return null;
    }
    
    const product = response.data.product;
    
    return {
      asin: product.asin,
      title: product.title || '',
      price: parseFloat(product.price?.value || '0'),
      currency: product.price?.currency || 'EUR',
      rating: parseFloat(product.rating || '0'),
      reviewsCount: parseInt(product.ratings_total || '0'),
      images: product.images?.map((img: any) => img.link) || [],
      description: product.description || '',
      features: product.features || [],
      categories: product.categories?.map((cat: any) => cat.name) || [],
      bsr: product.bestsellers_rank?.map((rank: any) => ({
        category: rank.category,
        rank: parseInt(rank.rank)
      })) || []
    };
    
  } catch (error) {
    logger.error(`Fehler beim Abrufen von ASIN ${asin}`, error as Error);
    return null;
  }
}

/**
 * Speichert Produktdaten in der Datenbank
 */
export async function storeAmazonProduct(db: Database, product: AmazonProduct): Promise<boolean> {
  try {
    logger.debug(`Speichere Produkt ${product.asin} in Datenbank`);
    
    await addOrUpdateProduct(
      db,
      product.asin,
      product.title,
      product.price,
      product.reviewsCount,
      product.rating,
      `https://www.amazon.de/dp/${product.asin}`
    );
    
    logger.info(`Produkt ${product.asin} erfolgreich gespeichert`);
    return true;
  } catch (error) {
    logger.error(`Fehler beim Speichern von Produkt ${product.asin}`, error as Error);
    return false;
  }
}

/**
 * Ruft Keyword-Rankings für ein Produkt ab
 */
export async function getKeywordRankings(asin: string, marketplace = 'amazon.de'): Promise<any> {
  // Implementierungsbeispiel für spätere Verwendung
  logger.info(`Rufe Keyword-Rankings für ASIN ${asin} von ${marketplace} ab`);
  return { asin, rankings: [] };
}

/**
 * Ruft Verkaufsdaten für ein Produkt ab
 */
export async function getSalesData(asin: string, marketplace = 'amazon.de'): Promise<any> {
  // Implementierungsbeispiel für spätere Verwendung
  logger.info(`Rufe Verkaufsdaten für ASIN ${asin} von ${marketplace} ab`);
  return { asin, sales: [] };
}
