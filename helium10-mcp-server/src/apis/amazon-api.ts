/**
 * Amazon API Integration
 * 
 * Dieses Modul stellt Wrapper-Funktionen für die Amazon API bereit.
 * Im Offline-Modus werden Mock-Daten zurückgegeben.
 */

import { amazonMockData } from '../mocks/amazon-mock-data';
import { FileSystemCache } from '../cache/file-cache';
import { isOfflineMode, checkInternetConnection, withRetry } from '../utils/network';

// Cache-Instanz für Amazon-API-Anfragen
const cache = new FileSystemCache('amazon-cache');

/**
 * Führt eine Produktsuche auf Amazon durch
 * 
 * @param {string} query Der Suchbegriff
 * @param {string} marketplace Der Amazon-Marketplace (Standard: amazon.de)
 * @returns {Promise<any>} Die gefundenen Produkte
 */
export async function searchProducts(query: string, marketplace = 'amazon.de'): Promise<any> {
  const cacheKey = `product-search:${marketplace}:${query}`;
  
  // Versuche zuerst Cache zu nutzen
  const cachedData = await cache.get(cacheKey);
  if (cachedData) {
    console.log('Cache-Treffer für Amazon-Produktsuche:', query);
    return cachedData;
  }
  
  // Prüfe Offline-Status
  const offline = isOfflineMode() || !(await checkInternetConnection());
  
  if (offline) {
    // Im Offline-Modus: Mock-Daten verwenden
    console.log('Offline-Modus: Verwende Mock-Daten für Amazon-Produktsuche');
    const mockKey = query.toLowerCase();
    const result = amazonMockData.search[mockKey] || amazonMockData.search.default;
    
    // Speichere in Cache für zukünftige Nutzung
    await cache.set(cacheKey, result, 24 * 60 * 60); // 24 Stunden
    return result;
  }
  
  try {
    // Online-Modus: Echte API-Anfrage mit Retry-Logik
    const apiResult = await withRetry(async () => {
      // Implementierung der tatsächlichen API-Anfrage
      // Diese würde tatsächlichen Code für die Amazon API enthalten
      // Hier nur als Platzhalter
      const response = await fetch(`https://api.amazon.${marketplace.split('.')[1]}/v1/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.AMAZON_API_KEY}`
        },
        body: JSON.stringify({
          query,
          marketplace
        })
      });
      
      if (!response.ok) {
        throw new Error(`Amazon API-Fehler: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    });
    
    // Speichere in Cache
    await cache.set(cacheKey, apiResult, 6 * 60 * 60); // 6 Stunden
    return apiResult;
  } catch (error) {
    // Fallback auf Mock-Daten bei API-Fehlern
    console.warn('Fehler bei Amazon API-Anfrage, verwende Mock-Daten:', error.message);
    const mockKey = query.toLowerCase();
    const fallbackResult = amazonMockData.search[mockKey] || amazonMockData.search.default;
    await cache.set(cacheKey, fallbackResult, 24 * 60 * 60);
    return fallbackResult;
  }
}

/**
 * Ruft Produktdetails zu einer ASIN ab
 * 
 * @param {string} asin Die ASIN des Produkts
 * @param {string} marketplace Der Amazon-Marketplace (Standard: amazon.de)
 * @returns {Promise<any>} Die Produktdetails
 */
export async function getProductDetails(asin: string, marketplace = 'amazon.de'): Promise<any> {
  const cacheKey = `product-details:${marketplace}:${asin}`;
  
  // Versuche zuerst Cache zu nutzen
  const cachedData = await cache.get(cacheKey);
  if (cachedData) {
    console.log('Cache-Treffer für Amazon-Produktdetails:', asin);
    return cachedData;
  }
  
  // Prüfe Offline-Status
  const offline = isOfflineMode() || !(await checkInternetConnection());
  
  if (offline) {
    // Im Offline-Modus: Mock-Daten verwenden
    console.log('Offline-Modus: Verwende Mock-Daten für Amazon-Produktdetails');
    const result = amazonMockData.itemLookup[asin] || amazonMockData.itemLookup.default;
    
    // Speichere in Cache für zukünftige Nutzung
    await cache.set(cacheKey, result, 24 * 60 * 60); // 24 Stunden
    return result;
  }
  
  try {
    // Online-Modus: Echte API-Anfrage mit Retry-Logik
    const apiResult = await withRetry(async () => {
      // Implementierung der tatsächlichen API-Anfrage
      // Diese würde tatsächlichen Code für die Amazon API enthalten
      // Hier nur als Platzhalter
      const response = await fetch(`https://api.amazon.${marketplace.split('.')[1]}/v1/products/${asin}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.AMAZON_API_KEY}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Amazon API-Fehler: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    });
    
    // Speichere in Cache
    await cache.set(cacheKey, apiResult, 6 * 60 * 60); // 6 Stunden
    return apiResult;
  } catch (error) {
    // Fallback auf Mock-Daten bei API-Fehlern
    console.warn('Fehler bei Amazon API-Anfrage, verwende Mock-Daten:', error.message);
    const fallbackResult = amazonMockData.itemLookup[asin] || amazonMockData.itemLookup.default;
    await cache.set(cacheKey, fallbackResult, 24 * 60 * 60);
    return fallbackResult;
  }
}

/**
 * Ruft Bestseller-Informationen für eine Kategorie ab
 * 
 * @param {string} category Die Kategorie
 * @param {string} marketplace Der Amazon-Marketplace (Standard: amazon.de)
 * @returns {Promise<any>} Die Bestseller-Informationen
 */
export async function getBestsellers(category: string, marketplace = 'amazon.de'): Promise<any> {
  const cacheKey = `bestsellers:${marketplace}:${category}`;
  
  // Versuche zuerst Cache zu nutzen
  const cachedData = await cache.get(cacheKey);
  if (cachedData) {
    console.log('Cache-Treffer für Amazon-Bestseller:', category);
    return cachedData;
  }
  
  // Prüfe Offline-Status
  const offline = isOfflineMode() || !(await checkInternetConnection());
  
  if (offline) {
    // Im Offline-Modus: Mock-Daten verwenden
    console.log('Offline-Modus: Verwende Mock-Daten für Amazon-Bestseller');
    const result = amazonMockData.bestsellers[category] || [];
    
    // Speichere in Cache für zukünftige Nutzung
    await cache.set(cacheKey, result, 24 * 60 * 60); // 24 Stunden
    return result;
  }
  
  try {
    // Online-Modus: Echte API-Anfrage mit Retry-Logik
    const apiResult = await withRetry(async () => {
      // Implementierung der tatsächlichen API-Anfrage
      // Diese würde tatsächlichen Code für die Amazon API enthalten
      // Hier nur als Platzhalter
      const response = await fetch(`https://api.amazon.${marketplace.split('.')[1]}/v1/bestsellers/${category}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.AMAZON_API_KEY}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Amazon API-Fehler: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    });
    
    // Speichere in Cache
    await cache.set(cacheKey, apiResult, 6 * 60 * 60); // 6 Stunden
    return apiResult;
  } catch (error) {
    // Fallback auf Mock-Daten bei API-Fehlern
    console.warn('Fehler bei Amazon API-Anfrage, verwende Mock-Daten:', error.message);
    const fallbackResult = amazonMockData.bestsellers[category] || [];
    await cache.set(cacheKey, fallbackResult, 24 * 60 * 60);
    return fallbackResult;
  }
}

/**
 * Ruft alle verfügbaren Kategorien ab
 * 
 * @param {string} marketplace Der Amazon-Marketplace (Standard: amazon.de)
 * @returns {Promise<any>} Die verfügbaren Kategorien
 */
export async function getCategories(marketplace = 'amazon.de'): Promise<any> {
  const cacheKey = `categories:${marketplace}`;
  
  // Versuche zuerst Cache zu nutzen
  const cachedData = await cache.get(cacheKey);
  if (cachedData) {
    console.log('Cache-Treffer für Amazon-Kategorien');
    return cachedData;
  }
  
  // Prüfe Offline-Status
  const offline = isOfflineMode() || !(await checkInternetConnection());
  
  if (offline) {
    // Im Offline-Modus: Mock-Daten verwenden
    console.log('Offline-Modus: Verwende Mock-Daten für Amazon-Kategorien');
    const result = amazonMockData.categories.default;
    
    // Speichere in Cache für zukünftige Nutzung
    await cache.set(cacheKey, result, 7 * 24 * 60 * 60); // 7 Tage
    return result;
  }
  
  try {
    // Online-Modus: Echte API-Anfrage mit Retry-Logik
    const apiResult = await withRetry(async () => {
      // Implementierung der tatsächlichen API-Anfrage
      // Diese würde tatsächlichen Code für die Amazon API enthalten
      // Hier nur als Platzhalter
      const response = await fetch(`https://api.amazon.${marketplace.split('.')[1]}/v1/categories`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.AMAZON_API_KEY}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Amazon API-Fehler: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    });
    
    // Speichere in Cache
    await cache.set(cacheKey, apiResult, 7 * 24 * 60 * 60); // 7 Tage
    return apiResult;
  } catch (error) {
    // Fallback auf Mock-Daten bei API-Fehlern
    console.warn('Fehler bei Amazon API-Anfrage, verwende Mock-Daten:', error.message);
    const fallbackResult = amazonMockData.categories.default;
    await cache.set(cacheKey, fallbackResult, 7 * 24 * 60 * 60);
    return fallbackResult;
  }
}
