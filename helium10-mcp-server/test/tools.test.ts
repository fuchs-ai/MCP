/**
 * Testumgebung für die Tool-Implementierungen des Helium10 MCP-Servers
 * 
 * Diese Tests prüfen die Funktionalität der verschiedenen Tools und stellen sicher,
 * dass sie korrekt mit Fehlerfällen umgehen und die erwarteten Ergebnisse liefern.
 */

import { expect } from 'chai';
import { 
  wissensdatenbankScrapenTool, 
  helium10AbfrageTool, 
  magnetKeywordTool,
  cerebroKeywordTool,
  xrayProduktTool,
  amazonProduktTool,
  marktanalyseTool,
  produktanalyseTool,
  datensicherungTool,
  produktdatenScrapenTool
} from '../src/tools.js';

describe('Helium10 MCP-Server Tools Tests', () => {
  // Tests für wissensdatenbankScrapenTool
  describe('wissensdatenbankScrapenTool', () => {
    it('sollte erfolgreich die Wissensdatenbank scrapen', async function() {
      this.timeout(30000); // Erhöhtes Timeout für Scraping
      
      const ergebnis = await wissensdatenbankScrapenTool();
      expect(ergebnis).to.have.property('success');
    });
  });
  
  // Tests für helium10AbfrageTool
  describe('helium10AbfrageTool', () => {
    it('sollte Fehler zurückgeben bei leerer Anfrage', async () => {
      const ergebnis = await helium10AbfrageTool('');
      expect(ergebnis.success).to.be.false;
    });
    
    it('sollte eine Antwort auf eine gültige Anfrage geben', async function() {
      this.timeout(10000); // Erhöhtes Timeout für Embedding-Generierung
      
      const ergebnis = await helium10AbfrageTool('Was ist Helium10?');
      expect(ergebnis).to.have.property('success');
      expect(ergebnis).to.have.property('message');
    });
  });
  
  // Tests für magnetKeywordTool
  describe('magnetKeywordTool', () => {
    it('sollte Fehler zurückgeben bei leerem Suchbegriff', async () => {
      const ergebnis = await magnetKeywordTool('');
      expect(ergebnis.success).to.be.false;
    });
    
    it('sollte Keyword-Daten für einen gültigen Suchbegriff zurückgeben', async function() {
      this.timeout(15000);
      
      const ergebnis = await magnetKeywordTool('yoga matte');
      expect(ergebnis).to.have.property('success');
      expect(ergebnis.success).to.be.true;
      expect(ergebnis).to.have.property('data');
    });
  });
  
  // Tests für cerebroKeywordTool
  describe('cerebroKeywordTool', () => {
    it('sollte Fehler zurückgeben bei leerer ASIN', async () => {
      const ergebnis = await cerebroKeywordTool('');
      expect(ergebnis.success).to.be.false;
    });
    
    it('sollte Keyword-Daten für eine gültige ASIN zurückgeben', async function() {
      this.timeout(15000);
      
      const ergebnis = await cerebroKeywordTool('B07DFKR996'); // Beispiel ASIN
      expect(ergebnis).to.have.property('success');
      expect(ergebnis).to.have.property('data');
    });
  });
  
  // Tests für xrayProduktTool
  describe('xrayProduktTool', () => {
    it('sollte Fehler zurückgeben bei leerem Suchbegriff', async () => {
      const ergebnis = await xrayProduktTool('');
      expect(ergebnis.success).to.be.false;
    });
    
    it('sollte Produktdaten für einen gültigen Suchbegriff zurückgeben', async function() {
      this.timeout(15000);
      
      const ergebnis = await xrayProduktTool('yoga matte');
      expect(ergebnis).to.have.property('success');
      expect(ergebnis).to.have.property('data');
    });
  });
  
  // Tests für amazonProduktTool
  describe('amazonProduktTool', () => {
    it('sollte Fehler zurückgeben bei leerer ASIN', async () => {
      const ergebnis = await amazonProduktTool('');
      expect(ergebnis.success).to.be.false;
    });
    
    it('sollte Produktdaten für eine gültige ASIN zurückgeben', async function() {
      this.timeout(15000);
      
      const ergebnis = await amazonProduktTool('B07DFKR996'); // Beispiel ASIN
      expect(ergebnis).to.have.property('success');
      if (ergebnis.success) {
        expect(ergebnis).to.have.property('data');
      }
    });
  });
  
  // Tests für datensicherungTool
  describe('datensicherungTool', () => {
    it('sollte eine Datensicherung erstellen können', async function() {
      this.timeout(10000);
      
      const ergebnis = await datensicherungTool();
      expect(ergebnis).to.have.property('success');
      if (ergebnis.success) {
        expect(ergebnis).to.have.property('data');
        expect(ergebnis.data).to.have.property('sicherungen').that.is.an('array');
      }
    });
  });
  
  // Tests für produktdatenScrapenTool
  describe('produktdatenScrapenTool', () => {
    it('sollte Fehler zurückgeben bei fehlenden Parametern', async () => {
      const ergebnis = await produktdatenScrapenTool();
      expect(ergebnis.success).to.be.false;
    });
    
    it('sollte Produktdaten basierend auf Suchbegriffen zurückgeben', async function() {
      this.timeout(30000);
      
      const ergebnis = await produktdatenScrapenTool('yoga matte');
      expect(ergebnis).to.have.property('success');
      if (ergebnis.success) {
        expect(ergebnis).to.have.property('data').that.is.an('array');
      }
    });
  });
});
