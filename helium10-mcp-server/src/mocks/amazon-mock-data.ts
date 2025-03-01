/**
 * Mock-Daten für die Amazon API
 * 
 * Diese Daten werden verwendet, wenn keine Verbindung zur Amazon API besteht
 * oder wenn Tests im Offline-Modus durchgeführt werden.
 */

export const amazonMockData = {
  /**
   * Mock-Daten für Amazon-Produktsuche
   */
  productSearch: {
    // Standard-Antwort für unbekannte Suchanfragen
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
    },
    
    // Spezifische Antworten für häufige Suchbegriffe
    'smartphone': {
      products: [
        {
          asin: 'B07V2BMBXG',
          title: 'Samsung Galaxy S20 Smartphone (128 GB, 6,2 Zoll) cosmic gray',
          price: 599.99,
          currency: 'EUR',
          availability: 'In Stock',
          imageUrl: 'https://example.com/samsung-s20.jpg',
          detailPageUrl: 'https://amazon.de/dp/B07V2BMBXG'
        },
        {
          asin: 'B08L5TNJHH',
          title: 'Apple iPhone 12 (128 GB) schwarz',
          price: 799.99,
          currency: 'EUR',
          availability: 'In Stock',
          imageUrl: 'https://example.com/iphone12.jpg',
          detailPageUrl: 'https://amazon.de/dp/B08L5TNJHH'
        },
        {
          asin: 'B08H93ZRK9',
          title: 'Xiaomi Redmi Note 9 Pro Smartphone (64GB, 6GB RAM) grau',
          price: 249.99,
          currency: 'EUR',
          availability: 'In Stock',
          imageUrl: 'https://example.com/redmi-note9.jpg',
          detailPageUrl: 'https://amazon.de/dp/B08H93ZRK9'
        }
      ],
      totalResults: 3
    },
    
    'kopfhörer': {
      products: [
        {
          asin: 'B07YVYZ8T9',
          title: 'Sony WH-1000XM4 Bluetooth Noise Cancelling Kopfhörer schwarz',
          price: 299.99,
          currency: 'EUR',
          availability: 'In Stock',
          imageUrl: 'https://example.com/sony-wh1000xm4.jpg',
          detailPageUrl: 'https://amazon.de/dp/B07YVYZ8T9'
        },
        {
          asin: 'B0863FR3S9',
          title: 'JBL Tune 510BT – Kabellose On-Ear Kopfhörer schwarz',
          price: 49.99,
          currency: 'EUR',
          availability: 'In Stock',
          imageUrl: 'https://example.com/jbl-tune510bt.jpg',
          detailPageUrl: 'https://amazon.de/dp/B0863FR3S9'
        }
      ],
      totalResults: 2
    }
  },
  
  /**
   * Mock-Daten für Amazon-Produkt-Details
   */
  productDetails: {
    // Standard-Antwort für unbekannte ASINs
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
    },
    
    // Spezifische Antworten für häufig abgefragte ASINs
    'B07V2BMBXG': {
      asin: 'B07V2BMBXG',
      title: 'Samsung Galaxy S20 Smartphone (128 GB, 6,2 Zoll) cosmic gray',
      description: 'Das Samsung Galaxy S20 setzt neue Maßstäbe für Smartphones. Mit seinem 6,2-Zoll Infinity-O Display, dem leistungsstarken 4000mAh Akku und der beeindruckenden Triple-Kamera...',
      features: [
        '6,2-Zoll Infinity-O Display mit 120Hz Bildwiederholrate',
        '128 GB interner Speicher, erweiterbar per microSD',
        'Triple-Kamera mit 64MP Hauptkamera',
        '4000mAh Akku mit Schnellladefunktion',
        'Android 10 mit Samsung One UI'
      ],
      price: 599.99,
      currency: 'EUR',
      images: [
        'https://example.com/samsung-s20-main.jpg',
        'https://example.com/samsung-s20-alt1.jpg',
        'https://example.com/samsung-s20-alt2.jpg'
      ],
      specifications: {
        'Marke': 'Samsung',
        'Modell': 'Galaxy S20',
        'Speicher': '128 GB',
        'RAM': '8 GB',
        'Displaygröße': '6,2 Zoll',
        'Kameraauflösung': '64 MP',
        'Akku': '4000mAh',
        'Betriebssystem': 'Android 10'
      }
    },
    
    'B07YVYZ8T9': {
      asin: 'B07YVYZ8T9',
      title: 'Sony WH-1000XM4 Bluetooth Noise Cancelling Kopfhörer schwarz',
      description: 'Die Sony WH-1000XM4 Kopfhörer bieten branchenführende Noise-Cancelling-Technologie, hervorragende Klangqualität und intelligente Funktionen für ein beispielloses Hörerlebnis...',
      features: [
        'Branchenführendes Noise Cancelling mit Dual Noise Sensor-Technologie',
        'Bis zu 30 Stunden Akkulaufzeit mit Schnellladefunktion',
        'Speak-to-Chat pausiert automatisch die Wiedergabe, wenn Sie sprechen',
        'Multipoint-Verbindung für gleichzeitige Verbindung mit 2 Bluetooth-Geräten',
        'HD-Klangqualität mit LDAC-Unterstützung'
      ],
      price: 299.99,
      currency: 'EUR',
      images: [
        'https://example.com/sony-wh1000xm4-main.jpg',
        'https://example.com/sony-wh1000xm4-alt1.jpg',
        'https://example.com/sony-wh1000xm4-alt2.jpg'
      ],
      specifications: {
        'Marke': 'Sony',
        'Modell': 'WH-1000XM4',
        'Typ': 'Over-Ear',
        'Konnektivität': 'Bluetooth 5.0',
        'Akkulaufzeit': 'Bis zu 30 Stunden',
        'Gewicht': '254g',
        'Farbe': 'Schwarz'
      }
    }
  },
  
  /**
   * Mock-Daten für Amazon-Kategorien
   */
  categories: {
    default: [
      { id: 'elektronik', name: 'Elektronik & Foto', count: 250000 },
      { id: 'haushalt', name: 'Küche, Haushalt & Wohnen', count: 180000 },
      { id: 'sport', name: 'Sport & Freizeit', count: 120000 },
      { id: 'baumarkt', name: 'Baumarkt', count: 100000 },
      { id: 'drogerie', name: 'Drogerie & Körperpflege', count: 95000 }
    ]
  },
  
  /**
   * Mock-Daten für Amazon-Bestseller
   */
  bestsellers: {
    'elektronik': [
      { asin: 'B07YVYZ8T9', rank: 1, title: 'Sony WH-1000XM4 Bluetooth Noise Cancelling Kopfhörer schwarz' },
      { asin: 'B07V2BMBXG', rank: 2, title: 'Samsung Galaxy S20 Smartphone (128 GB, 6,2 Zoll) cosmic gray' },
      { asin: 'B08L5TNJHH', rank: 3, title: 'Apple iPhone 12 (128 GB) schwarz' }
    ],
    'haushalt': [
      { asin: 'B07G3YNW3J', rank: 1, title: 'Philips Airfryer XL Essential' },
      { asin: 'B084KTGC63', rank: 2, title: 'iRobot Roomba 692 Saugroboter' },
      { asin: 'B08BHPGBLZ', rank: 3, title: 'WMF Profi Plus Schneebesen Set 3-teilig' }
    ]
  }
};
