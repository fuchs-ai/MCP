/**
 * Mock-Daten für die Helium10 API
 * 
 * Diese Daten werden verwendet, wenn keine Verbindung zur Helium10 API besteht
 * oder wenn Tests im Offline-Modus durchgeführt werden.
 */

export const mockData = {
  /**
   * Mock-Daten für Helium10 Magnet Keyword-Recherche
   */
  magnet: {
    // Standard-Antwort für unbekannte Keywords
    default: {
      keywords: [
        { keyword: 'beispiel-keyword-1', searchVolume: 1000, difficulty: 35, relevanceScore: 900 },
        { keyword: 'beispiel-keyword-2', searchVolume: 750, difficulty: 25, relevanceScore: 850 },
        { keyword: 'beispiel-keyword-3', searchVolume: 500, difficulty: 15, relevanceScore: 800 }
      ],
      totalResults: 3,
      metadata: {
        marketplace: 'amazon.de',
        searchDate: new Date().toISOString(),
        estimatedSearchVolume: 2250
      }
    },
    
    // Spezifische Antworten für häufig gesuchte Keywords
    'smartphone': {
      keywords: [
        { keyword: 'smartphone', searchVolume: 95000, difficulty: 85, relevanceScore: 950 },
        { keyword: 'smartphone hülle', searchVolume: 42000, difficulty: 60, relevanceScore: 900 },
        { keyword: 'smartphone zubehör', searchVolume: 28000, difficulty: 55, relevanceScore: 850 },
        { keyword: 'smartphone halterung', searchVolume: 19000, difficulty: 40, relevanceScore: 800 },
        { keyword: 'smartphone tasche', searchVolume: 15000, difficulty: 35, relevanceScore: 780 }
      ],
      totalResults: 5,
      metadata: {
        marketplace: 'amazon.de',
        searchDate: new Date().toISOString(),
        estimatedSearchVolume: 199000
      }
    },
    
    'kopfhörer': {
      keywords: [
        { keyword: 'kopfhörer', searchVolume: 78000, difficulty: 80, relevanceScore: 950 },
        { keyword: 'bluetooth kopfhörer', searchVolume: 54000, difficulty: 75, relevanceScore: 930 },
        { keyword: 'kabellose kopfhörer', searchVolume: 36000, difficulty: 70, relevanceScore: 900 },
        { keyword: 'kopfhörer kinder', searchVolume: 18000, difficulty: 45, relevanceScore: 800 },
        { keyword: 'noise cancelling kopfhörer', searchVolume: 16000, difficulty: 50, relevanceScore: 850 }
      ],
      totalResults: 5,
      metadata: {
        marketplace: 'amazon.de',
        searchDate: new Date().toISOString(),
        estimatedSearchVolume: 202000
      }
    }
  },
  
  /**
   * Mock-Daten für Helium10 Cerebro ASIN-basierte Keyword-Recherche
   */
  cerebro: {
    // Standard-Antwort für unbekannte ASINs
    default: {
      keywords: [
        { keyword: 'beispiel-asin-keyword-1', searchVolume: 800, rank: 8, relevanceScore: 870 },
        { keyword: 'beispiel-asin-keyword-2', searchVolume: 600, rank: 12, relevanceScore: 820 },
        { keyword: 'beispiel-asin-keyword-3', searchVolume: 400, rank: 15, relevanceScore: 780 }
      ],
      totalResults: 3,
      metadata: {
        marketplace: 'amazon.de',
        searchDate: new Date().toISOString(),
        associatedAsin: 'B0XXXXXXXX'
      }
    },
    
    // Spezifische Antworten für häufig gesuchte ASINs
    'B07V2BMBXG': { // Beispiel-ASIN für Samsung Galaxy S20
      keywords: [
        { keyword: 'samsung galaxy s20', searchVolume: 32000, rank: 1, relevanceScore: 950 },
        { keyword: 'smartphone samsung', searchVolume: 28000, rank: 3, relevanceScore: 920 },
        { keyword: 'galaxy s20 hülle', searchVolume: 19000, rank: 2, relevanceScore: 900 },
        { keyword: 's20 zubehör', searchVolume: 11000, rank: 5, relevanceScore: 850 },
        { keyword: 'samsung handy', searchVolume: 9500, rank: 7, relevanceScore: 830 }
      ],
      totalResults: 5,
      metadata: {
        marketplace: 'amazon.de',
        searchDate: new Date().toISOString(),
        associatedAsin: 'B07V2BMBXG'
      }
    }
  },
  
  /**
   * Mock-Daten für Helium10 Xray Produktanalyse
   */
  xray: {
    // Standard-Antwort für unbekannte Suchanfragen
    default: {
      products: [
        {
          asin: 'B0EXAMPLE1',
          title: 'Beispiel Produkt 1',
          brand: 'Beispiel Marke',
          price: 29.99,
          rating: 4.2,
          reviewCount: 250,
          estimatedSales: 1200,
          estimatedRevenue: 35988,
          bsr: 2500,
          images: ['https://example.com/image1.jpg']
        },
        {
          asin: 'B0EXAMPLE2',
          title: 'Beispiel Produkt 2',
          brand: 'Andere Marke',
          price: 19.99,
          rating: 4.0,
          reviewCount: 180,
          estimatedSales: 950,
          estimatedRevenue: 18990.50,
          bsr: 3200,
          images: ['https://example.com/image2.jpg']
        }
      ],
      totalResults: 2,
      metadata: {
        marketplace: 'amazon.de',
        searchDate: new Date().toISOString(),
        searchTerm: 'beispiel-suche'
      }
    },
    
    // Spezifische Antworten für häufige Suchbegriffe
    'smartphone': {
      products: [
        {
          asin: 'B07V2BMBXG',
          title: 'Samsung Galaxy S20 Smartphone (128 GB, 6,2 Zoll) cosmic gray',
          brand: 'Samsung',
          price: 599.99,
          rating: 4.7,
          reviewCount: 3250,
          estimatedSales: 4800,
          estimatedRevenue: 2879952,
          bsr: 120,
          images: ['https://example.com/s20.jpg']
        },
        {
          asin: 'B08L5TNJHH',
          title: 'Apple iPhone 12 (128 GB) schwarz',
          brand: 'Apple',
          price: 799.99,
          rating: 4.8,
          reviewCount: 5280,
          estimatedSales: 6200,
          estimatedRevenue: 4959938,
          bsr: 85,
          images: ['https://example.com/iphone12.jpg']
        }
      ],
      totalResults: 2,
      metadata: {
        marketplace: 'amazon.de',
        searchDate: new Date().toISOString(),
        searchTerm: 'smartphone'
      }
    }
  },
  
  /**
   * Mock-Daten für Helium10 Profits für Verkaufsanalyse
   */
  profits: {
    default: {
      dailySales: [
        { date: '2025-02-25', units: 35, revenue: 1049.65, profit: 419.86 },
        { date: '2025-02-26', units: 42, revenue: 1259.58, profit: 503.83 },
        { date: '2025-02-27', units: 38, revenue: 1139.62, profit: 455.85 }
      ],
      monthlyTotals: {
        units: 980,
        revenue: 29400.20,
        profit: 11760.08,
        profitMargin: 40
      },
      topProducts: [
        { asin: 'B0EXAMPLE1', units: 320, revenue: 9598.40, profit: 3839.36 },
        { asin: 'B0EXAMPLE2', units: 285, revenue: 5696.15, profit: 2278.46 }
      ]
    }
  }
};

/**
 * Mock-Daten für die Amazon API
 */
export const amazonMockData = {
  /**
   * Mock-Daten für Amazon-Produktsuche
   */
  productSearch: {
    default: {
      products: [
        {
          asin: 'B0EXAMPLE1',
          title: 'Amazon Beispiel Produkt 1',
          price: 29.99,
          currency: 'EUR',
          availability: 'In Stock',
          imageUrl: 'https://example.com/amazon-product1.jpg',
          detailPageUrl: 'https://amazon.de/dp/B0EXAMPLE1'
        },
        {
          asin: 'B0EXAMPLE2',
          title: 'Amazon Beispiel Produkt 2',
          price: 19.99,
          currency: 'EUR',
          availability: 'In Stock',
          imageUrl: 'https://example.com/amazon-product2.jpg',
          detailPageUrl: 'https://amazon.de/dp/B0EXAMPLE2'
        }
      ],
      totalResults: 2
    }
  },
  
  /**
   * Mock-Daten für Amazon-Produkt-Details
   */
  productDetails: {
    'B0EXAMPLE1': {
      asin: 'B0EXAMPLE1',
      title: 'Amazon Beispiel Produkt 1 - Detaillierte Beschreibung',
      description: 'Dies ist ein ausführlicher Beispieltext für die Produktbeschreibung...',
      features: [
        'Beispiel Feature 1',
        'Beispiel Feature 2',
        'Beispiel Feature 3'
      ],
      price: 29.99,
      currency: 'EUR',
      images: [
        'https://example.com/amazon-product1-main.jpg',
        'https://example.com/amazon-product1-alt1.jpg',
        'https://example.com/amazon-product1-alt2.jpg'
      ],
      specifications: {
        'Marke': 'Beispiel Marke',
        'Modell': 'XYZ-123',
        'Gewicht': '250g',
        'Größe': '10 x 5 x 2 cm'
      }
    }
  }
};
