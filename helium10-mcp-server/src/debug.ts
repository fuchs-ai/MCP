/**
 * Debug-Umgebung für lokale Entwicklung und Tests
 * 
 * Diese Komponente ermöglicht es, die verschiedenen Funktionen des Helium10 MCP-Servers
 * lokal zu testen und zu debuggen, ohne die MCP-Schnittstelle verwenden zu müssen.
 */

import { LokalerCache } from './cache.js';
import { getConfig, updateConfig } from './config.js';
import { setupDatabase } from './db.js';
import { scrapeKnowledgeBase, scrapeProductData } from './scraping.js';
import { queryKnowledgeBase, Vektoroperationen } from './rag.js';
import { logger } from './logger.js';
import { datenbanksicherungErstellen, sicherungenAuflisten } from './backup.js';
import fs from 'fs';
import path from 'path';

/**
 * Lokale Debug-Umgebung zur Überprüfung der MCP-Funktionen
 */
async function debugUmgebungStarten() {
  logger.info('Starte lokale Debug-Umgebung');
  
  // Konfiguration anpassen
  updateConfig({
    logLevel: 'DEBUG',
    maxScrapingDepth: 2,
    maxConcurrentRequests: 2,
    dbPath: './helium10-debug.db'
  });
  
  // Datenbankverbindung herstellen
  const db = await setupDatabase();
  
  const debugAktion = process.argv[2];
  
  switch (debugAktion) {
    case 'wissensdatenbank-scrapen':
      console.log('Starte Test für Wissensdatenbank-Scraping...');
      const scrapingErgebnis = await scrapeKnowledgeBase();
      console.log('Scraping-Ergebnis:', scrapingErgebnis);
      break;
      
    case 'wissensdatenbank-abfragen':
      console.log('Starte Test für Wissensdatenbank-Abfrage...');
      const abfrage = process.argv[3] || 'Was ist Helium10?';
      console.log(`Anfrage: "${abfrage}"`);
      const ergebnis = await queryKnowledgeBase(abfrage);
      console.log('\nAbfrageergebnisse:');
      console.log(ergebnis);
      break;
      
    case 'produkte-scrapen':
      console.log('Starte Test für Produktdaten-Scraping...');
      const suchbegriffe = process.argv[3] || 'yoga matte';
      console.log(`Suchbegriffe: "${suchbegriffe}"`);
      const produktErgebnisse = await scrapeProductData(suchbegriffe);
      console.log('\nGefundene Produkte:');
      console.log(JSON.stringify(produktErgebnisse, null, 2));
      break;
      
    case 'cache-test':
      console.log('Starte Test für lokalen Cache...');
      const cache = new LokalerCache('debug-test');
      
      // Cache-Test-Wert setzen
      const testSchlüssel = 'test-schlüssel-' + Date.now();
      const testWert = { 
        name: 'Test-Wert', 
        zeitstempel: Date.now(),
        daten: Array(10).fill(0).map((_, i) => ({ id: i, wert: `Element ${i}` }))
      };
      
      cache.setzen(testSchlüssel, testWert);
      console.log('Cache-Wert gesetzt');
      
      // Cache-Wert abrufen
      const abgerufenerWert = cache.abrufen(testSchlüssel);
      console.log('Abgerufener Wert:', abgerufenerWert);
      
      // Cache-Größentest
      console.log('Teste Cache-Größenbeschränkung...');
      for (let i = 0; i < 50; i++) {
        const großerWert = { daten: Array(1000).fill('X').join('') };
        cache.setzen(`großer-schlüssel-${i}`, großerWert);
      }
      
      const cacheStatistik = cache.statistikAbrufen();
      console.log('Cache-Statistik:', cacheStatistik);
      break;
      
    case 'embedding-test':
      console.log('Starte Test für Embeddings...');
      const testText = process.argv[3] || 'Helium10 ist eine Software für Amazon-Seller, die verschiedene Tools für Produktrecherche, Keyword-Recherche und Verkaufsanalyse bietet.';
      
      console.log(`Test-Text: "${testText.substring(0, 50)}..."`);
      
      // Lokales Fallback-Embedding testen
      console.log('\nErzeuge Fallback-Embedding:');
      const fallbackEmbedding = Vektoroperationen.fallbackEmbeddingGenerieren(testText);
      console.log(`Dimensionen: ${fallbackEmbedding.length}`);
      console.log(`Erste 5 Werte: ${fallbackEmbedding.slice(0, 5).join(', ')}`);
      
      // Ähnlichkeitstest
      const testText2 = 'Helium10 bietet Tools für Amazon-Verkäufer, um Produkte zu recherchieren und Keywords zu finden.';
      const fallbackEmbedding2 = Vektoroperationen.fallbackEmbeddingGenerieren(testText2);
      
      const ähnlichkeit = Vektoroperationen.cosinusÄhnlichkeit(fallbackEmbedding, fallbackEmbedding2);
      console.log(`\nÄhnlichkeit zwischen ähnlichen Texten: ${ähnlichkeit.toFixed(4)}`);
      
      // Unähnlicher Text
      const unähnlicherText = 'Die Hauptstadt von Frankreich ist Paris. Es ist eine schöne Stadt mit vielen Sehenswürdigkeiten.';
      const unähnlichesEmbedding = Vektoroperationen.fallbackEmbeddingGenerieren(unähnlicherText);
      
      const unähnlichkeit = Vektoroperationen.cosinusÄhnlichkeit(fallbackEmbedding, unähnlichesEmbedding);
      console.log(`Ähnlichkeit zwischen unähnlichen Texten: ${unähnlichkeit.toFixed(4)}`);
      break;
      
    case 'sicherung-erstellen':
      console.log('Starte Datenbanksicherung...');
      const sicherungErfolg = await datenbanksicherungErstellen();
      console.log(`Sicherung ${sicherungErfolg ? 'erfolgreich' : 'fehlgeschlagen'}`);
      
      const vorhandeneSicherungen = sicherungenAuflisten();
      console.log('\nVorhandene Sicherungen:');
      vorhandeneSicherungen.forEach(s => {
        console.log(`- ${s.dateiname} (${(s.größe / 1024).toFixed(2)} KB, ${s.datum.toLocaleString()})`);
      });
      break;
      
    case 'leistung-messen':
      console.log('Starte Leistungsmessung...');
      
      // Measure DB performance
      console.time('Datenbankverbindung');
      await setupDatabase();
      console.timeEnd('Datenbankverbindung');
      
      // Measure embedding generation
      console.time('Fallback-Embedding');
      const testTextLang = fs.readFileSync(path.join(process.cwd(), 'README.md'), 'utf-8');
      Vektoroperationen.fallbackEmbeddingGenerieren(testTextLang);
      console.timeEnd('Fallback-Embedding');
      
      // Measure cache performance
      console.time('Cache-Operationen');
      const leistungsCache = new LokalerCache('leistungstest');
      for (let i = 0; i < 1000; i++) {
        leistungsCache.setzen(`schlüssel-${i}`, { wert: i });
      }
      for (let i = 0; i < 1000; i++) {
        leistungsCache.abrufen(`schlüssel-${i % 100}`);
      }
      console.timeEnd('Cache-Operationen');
      break;
      
    default:
      console.log('Verfügbare Debug-Aktionen:');
      console.log('  wissensdatenbank-scrapen - Wissensdatenbank scrapen');
      console.log('  wissensdatenbank-abfragen [Abfrage] - Wissensdatenbank abfragen');
      console.log('  produkte-scrapen [Suchbegriffe] - Produktdaten scrapen');
      console.log('  cache-test - Lokalen Cache testen');
      console.log('  embedding-test [Text] - Embeddings und Ähnlichkeitsberechnungen testen');
      console.log('  sicherung-erstellen - Datenbanksicherung erstellen und auflisten');
      console.log('  leistung-messen - Leistungsmessungen durchführen');
  }
  
  logger.info('Debug-Umgebung beendet');
}

/**
 * Führt automatisierte Basistests für alle Kernkomponenten durch
 */
async function automatisierteSelbsttests() {
  const ergebnisse: Record<string, { erfolg: boolean; dauer: number; nachricht: string }> = {};
  
  console.log('Führe automatisierte Selbsttests durch...');
  
  try {
    // Datenbank-Test
    const dbStartzeit = Date.now();
    try {
      await setupDatabase();
      ergebnisse['datenbank'] = { 
        erfolg: true, 
        dauer: Date.now() - dbStartzeit,
        nachricht: 'Datenbankverbindung erfolgreich hergestellt' 
      };
    } catch (error) {
      ergebnisse['datenbank'] = { 
        erfolg: false, 
        dauer: Date.now() - dbStartzeit,
        nachricht: `Fehler: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
    
    // Cache-Test
    const cacheStartzeit = Date.now();
    try {
      const testCache = new LokalerCache('test');
      testCache.setzen('test', { test: true });
      const wert = testCache.abrufen('test');
      ergebnisse['cache'] = { 
        erfolg: wert !== null, 
        dauer: Date.now() - cacheStartzeit,
        nachricht: wert !== null ? 'Cache funktioniert korrekt' : 'Cache-Abruf fehlgeschlagen' 
      };
    } catch (error) {
      ergebnisse['cache'] = { 
        erfolg: false, 
        dauer: Date.now() - cacheStartzeit,
        nachricht: `Fehler: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
    
    // Embedding-Test
    const embeddingStartzeit = Date.now();
    try {
      const embedding = Vektoroperationen.fallbackEmbeddingGenerieren('Test');
      ergebnisse['embedding'] = { 
        erfolg: embedding.length > 0, 
        dauer: Date.now() - embeddingStartzeit,
        nachricht: `Embedding erzeugt mit ${embedding.length} Dimensionen` 
      };
    } catch (error) {
      ergebnisse['embedding'] = { 
        erfolg: false, 
        dauer: Date.now() - embeddingStartzeit,
        nachricht: `Fehler: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
    
    // Ergebnisse ausgeben
    console.log('\nTestergebnisse:');
    Object.entries(ergebnisse).forEach(([name, ergebnis]) => {
      const statusSymbol = ergebnis.erfolg ? '✓' : '✗';
      console.log(`${statusSymbol} ${name}: ${ergebnis.nachricht} (${ergebnis.dauer}ms)`);
    });
    
    // Gesamtergebnis
    const alleErfolgreich = Object.values(ergebnisse).every(ergebnis => ergebnis.erfolg);
    console.log(`\nGesamtergebnis: ${alleErfolgreich ? 'BESTANDEN' : 'FEHLGESCHLAGEN'}`);
    
    return alleErfolgreich;
  } catch (error) {
    console.error('Fehler bei automatisierten Selbsttests:', error);
    return false;
  }
}

// Starte Debug-Umgebung, wenn direkt aufgerufen
if (require.main === module) {
  const selbsttestModus = process.argv.includes('--selbsttest');
  
  if (selbsttestModus) {
    automatisierteSelbsttests()
      .then(erfolg => {
        process.exit(erfolg ? 0 : 1);
      })
      .catch(error => {
        console.error('Fehler bei Selbsttests:', error);
        process.exit(1);
      });
  } else {
    debugUmgebungStarten()
      .then(() => {
        console.log('Debug abgeschlossen.');
        process.exit(0);
      })
      .catch(error => {
        console.error('Fehler bei Debug-Umgebung:', error);
        process.exit(1);
      });
  }
}

export { debugUmgebungStarten, automatisierteSelbsttests };
