/**
 * Integrationstests für den Helium10 MCP-Server
 * 
 * Diese Tests überprüfen die korrekte Funktionsweise des MCP-Servers
 * in einer integrierten Umgebung mit simulierten API-Antworten.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { MemoryClientTransport, MemoryServerTransport } from "@modelcontextprotocol/sdk/memory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Module mocken
vi.mock('../src/helium10-api.js', () => ({
  magnetKeywordResearch: vi.fn().mockResolvedValue({
    keywords: [
      { keyword: 'test-keyword-1', searchVolume: 1000, difficulty: 30 },
      { keyword: 'test-keyword-2', searchVolume: 500, difficulty: 20 }
    ],
    totalResults: 2
  }),
  cerebroKeywordResearch: vi.fn().mockResolvedValue({
    keywords: [
      { keyword: 'test-cerebro-1', searchVolume: 800, rank: 5 },
      { keyword: 'test-cerebro-2', searchVolume: 400, rank: 12 }
    ],
    totalResults: 2
  }),
  xrayProductResearch: vi.fn().mockResolvedValue({
    products: [
      { asin: 'B0TEST1234', price: 29.99, rating: 4.5, salesEstimate: 500 },
      { asin: 'B0TEST5678', price: 19.99, rating: 4.2, salesEstimate: 300 }
    ],
    totalResults: 2
  })
}));

vi.mock('../src/amazon-api.js', () => ({
  getProductByAsin: vi.fn().mockImplementation((asin) => Promise.resolve({
    asin,
    title: `Test Produkt für ${asin}`,
    price: 29.99,
    rating: 4.5,
    reviewCount: 100,
    mainCategory: 'Test Kategorie'
  }))
}));

vi.mock('../src/product-analysis.js', () => ({
  analyzeKeyword: vi.fn().mockResolvedValue({
    keyword: 'test-keyword',
    marketSize: 10000,
    competition: 'medium',
    opportunity: 7.5,
    recommendedAction: 'Empfohlen für weitere Analyse'
  }),
  analyzeAsin: vi.fn().mockResolvedValue({
    asin: 'B0TEST1234',
    productScore: 8.2,
    competitionLevel: 'hoch',
    improvementSuggestions: ['Bessere Bilder', 'Keyword-Optimierung'],
    profitPotential: 'medium'
  })
}));

vi.mock('../src/rag.js', () => ({
  queryKnowledgeBase: vi.fn().mockResolvedValue('Dies ist eine Testantwort aus der Wissensdatenbank.')
}));

vi.mock('../src/backup.js', () => ({
  datenbanksicherungErstellen: vi.fn().mockResolvedValue(true),
  sicherungenAuflisten: vi.fn().mockReturnValue([
    { dateiname: 'backup-20230101.zip', größe: 1024 * 1024, datum: new Date() }
  ]),
  regelmäßigeSicherungenPlanen: vi.fn()
}));

vi.mock('../src/scraping.js', () => ({
  scrapeKnowledgeBase: vi.fn().mockResolvedValue({ 
    success: true, 
    message: 'Wissensdatenbank erfolgreich aktualisiert',
    documentsAdded: 10 
  }),
  scrapeProductData: vi.fn().mockResolvedValue({
    success: true,
    message: 'Produktdaten erfolgreich extrahiert',
    products: [
      { title: 'Test Produkt 1', asin: 'B0TEST1111', price: 19.99 },
      { title: 'Test Produkt 2', asin: 'B0TEST2222', price: 29.99 }
    ]
  })
}));

// Server-Instanz importieren, aber Module mocken
let server: Server;
let client: Client;
let serverTransport: MemoryServerTransport;
let clientTransport: MemoryClientTransport;

// Vor allen Tests Server und Client einrichten
beforeAll(async () => {
  // MCP-Server-Code dynamisch importieren
  const serverModule = await import('../src/index.js');
  
  // Transport für Tests einrichten
  serverTransport = new MemoryServerTransport();
  clientTransport = new MemoryClientTransport(serverTransport);
  
  // Client initialisieren
  client = new Client();
  await client.connect(clientTransport);
});

// Nach allen Tests aufräumen
afterAll(async () => {
  await client.disconnect();
});

describe('Helium10 MCP-Server', () => {
  it('sollte verfügbare Tools auflisten', async () => {
    const response = await client.listTools();
    
    // Überprüfen, ob alle erwarteten Tools vorhanden sind
    const toolNames = response.tools.map(tool => tool.name);
    expect(toolNames).toContain('create_note');
    expect(toolNames).toContain('scrape_knowledge_base');
    expect(toolNames).toContain('ask_helium10');
    expect(toolNames).toContain('magnet_keyword_research');
    expect(toolNames).toContain('cerebro_keyword_research');
    expect(toolNames).toContain('xray_product_research');
    expect(toolNames).toContain('get_amazon_product');
    expect(toolNames).toContain('analyze_keyword');
    expect(toolNames).toContain('analyze_asin');
    expect(toolNames).toContain('create_backup');
    expect(toolNames).toContain('scrape_product_data');
  });
  
  it('sollte Keyword-Recherche mit Magnet durchführen', async () => {
    const response = await client.callTool('magnet_keyword_research', {
      keyword: 'test-keyword'
    });
    
    // Überprüfen, ob die Antwort erfolgreich ist
    expect(response.content).toHaveLength(1);
    expect(response.content[0].type).toBe('text');
    expect(response.content[0].text).toContain('Magnet Keyword-Recherche für "test-keyword" abgeschlossen');
  });
  
  it('sollte ASIN-basierte Keyword-Recherche mit Cerebro durchführen', async () => {
    const response = await client.callTool('cerebro_keyword_research', {
      asin: 'B0TEST1234'
    });
    
    // Überprüfen, ob die Antwort erfolgreich ist
    expect(response.content).toHaveLength(1);
    expect(response.content[0].type).toBe('text');
    expect(response.content[0].text).toContain('Cerebro Keyword-Recherche für ASIN "B0TEST1234" abgeschlossen');
  });
  
  it('sollte Amazon-Produktdaten abrufen', async () => {
    const response = await client.callTool('get_amazon_product', {
      asin: 'B0TEST1234'
    });
    
    // Überprüfen, ob die Antwort erfolgreich ist
    expect(response.content).toHaveLength(1);
    expect(response.content[0].type).toBe('text');
    expect(response.content[0].text).toContain('Amazon-Produktdaten für ASIN "B0TEST1234" abgerufen');
  });
  
  it('sollte eine Marktanalyse für ein Keyword durchführen', async () => {
    const response = await client.callTool('analyze_keyword', {
      keyword: 'test-keyword'
    });
    
    // Überprüfen, ob die Antwort erfolgreich ist
    expect(response.content).toHaveLength(1);
    expect(response.content[0].type).toBe('text');
    expect(response.content[0].text).toContain('Marktanalyse für "test-keyword" abgeschlossen');
  });
  
  it('sollte eine Produktanalyse für eine ASIN durchführen', async () => {
    const response = await client.callTool('analyze_asin', {
      asin: 'B0TEST1234'
    });
    
    // Überprüfen, ob die Antwort erfolgreich ist
    expect(response.content).toHaveLength(1);
    expect(response.content[0].type).toBe('text');
    expect(response.content[0].text).toContain('Produktanalyse für ASIN "B0TEST1234" abgeschlossen');
  });
  
  it('sollte Fragen an die Wissensdatenbank stellen', async () => {
    const response = await client.callTool('ask_helium10', {
      query: 'Wie funktioniert Helium10 Magnet?'
    });
    
    // Überprüfen, ob die Antwort erfolgreich ist
    expect(response.content).toHaveLength(1);
    expect(response.content[0].type).toBe('text');
    expect(response.content[0].text).toContain('Dies ist eine Testantwort aus der Wissensdatenbank');
  });
  
  it('sollte eine Datensicherung erstellen', async () => {
    const response = await client.callTool('create_backup', {});
    
    // Überprüfen, ob die Antwort erfolgreich ist
    expect(response.content).toHaveLength(1);
    expect(response.content[0].type).toBe('text');
    expect(response.content[0].text).toContain('Datensicherung erfolgreich erstellt');
  });
  
  it('sollte Produktdaten scrapen', async () => {
    const response = await client.callTool('scrape_product_data', {
      searchTerms: 'test-produkt'
    });
    
    // Überprüfen, ob die Antwort erfolgreich ist
    expect(response.content).toHaveLength(1);
    expect(response.content[0].type).toBe('text');
    expect(response.content[0].text).toContain('Produktdaten-Scraping abgeschlossen');
  });
});
