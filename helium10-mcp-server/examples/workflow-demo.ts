/**
 * Workflow-Demo für Helium10 MCP-Server
 * 
 * Dieses Beispiel demonstriert die Verwendung der sequentiellen MCP-Workflow-Tools
 * für Amazon-Produktrecherche und -Analyse im Online- und Offline-Modus.
 * 
 * Neue Features demonstriert:
 * - Parallele Ausführung von Workflow-Schritten
 * - Retry-Mechanismen für fehleranfällige Operationen
 * - Bedingte Ausführung basierend auf Daten oder Kontext
 * - Dynamische Workflows mit zur Laufzeit bestimmten Schritten
 */

import { 
  vollständigeProduktrechercheTool,
  konkurrenzanalyseTool, 
  listingOptimierungTool 
} from '../src/tools/workflow-tools';
import { workflowManager, createWorkflowManager } from '../src/utils/workflow';
import { setOfflineMode } from '../src/utils/network';
import * as fs from 'fs';
import * as path from 'path';

// Verzeichnis für Ergebnisse
const outputDir = path.join(__dirname, 'results');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Speichert ein Ergebnis als JSON-Datei
 * 
 * @param {string} filename Dateiname
 * @param {any} data Zu speichernde Daten
 */
function saveResult(filename: string, data: any): void {
  const filePath = path.join(outputDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`Ergebnis gespeichert in: ${filePath}`);
}

/**
 * Führt eine vollständige Produktrecherche durch
 * 
 * @param {string} keyword Zu recherchierendes Keyword
 * @param {string} marketplace Amazon-Marketplace
 * @param {boolean} offlineMode Offline-Modus aktivieren
 */
async function runProductResearch(keyword: string, marketplace = 'amazon.de', offlineMode = false): Promise<void> {
  console.log(`\n--- Starte Produkt-Recherche für "${keyword}" (${offlineMode ? 'Offline' : 'Online'}-Modus) ---\n`);
  
  // Offline-Modus einstellen
  setOfflineMode(offlineMode);
  
  try {
    // Führe vollständige Produktrecherche aus
    console.log(`Führe vollständige Produktrecherche aus...`);
    const startTime = Date.now();
    const result = await vollständigeProduktrechercheTool(keyword, marketplace);
    const duration = Date.now() - startTime;
    
    console.log(`Recherche abgeschlossen in ${duration / 1000} Sekunden.`);
    console.log(`Gefundene Keywords: ${result.keywordAnalyse.keywords.length}`);
    console.log(`Marktübersicht: ${result.marktübersicht.marktGröße.bewertung} Markt`);
    
    // Speichere Ergebnis
    const filename = `produkt-recherche-${keyword.replace(/\s+/g, '-')}-${offlineMode ? 'offline' : 'online'}.json`;
    saveResult(filename, result);
  } catch (error) {
    console.error(`Fehler bei der Produktrecherche:`, error);
  }
}

/**
 * Führt eine Konkurrenzanalyse durch
 * 
 * @param {string[]} asins Liste von ASINs
 * @param {string} marketplace Amazon-Marketplace
 * @param {boolean} offlineMode Offline-Modus aktivieren
 */
async function runCompetitionAnalysis(asins: string[], marketplace = 'amazon.de', offlineMode = false): Promise<void> {
  console.log(`\n--- Starte Konkurrenzanalyse für ${asins.length} ASINs (${offlineMode ? 'Offline' : 'Online'}-Modus) ---\n`);
  
  // Offline-Modus einstellen
  setOfflineMode(offlineMode);
  
  try {
    // Führe Konkurrenzanalyse aus
    console.log(`Führe Konkurrenzanalyse aus...`);
    const startTime = Date.now();
    const result = await konkurrenzanalyseTool(asins, marketplace);
    const duration = Date.now() - startTime;
    
    console.log(`Analyse abgeschlossen in ${duration / 1000} Sekunden.`);
    console.log(`Analysierte Produkte: ${result.individualAnalysen.length}`);
    console.log(`Strategieempfehlungen: ${result.handlungsempfehlungen.strategieempfehlungen.length}`);
    
    // Speichere Ergebnis
    const filename = `konkurrenz-analyse-${asins.length}-asins-${offlineMode ? 'offline' : 'online'}.json`;
    saveResult(filename, result);
  } catch (error) {
    console.error(`Fehler bei der Konkurrenzanalyse:`, error);
  }
}

/**
 * Führt eine Listing-Optimierung durch
 * 
 * @param {string} asin ASIN des zu optimierenden Produkts
 * @param {string} keyword Haupt-Keyword
 * @param {string} marketplace Amazon-Marketplace
 * @param {boolean} offlineMode Offline-Modus aktivieren
 */
async function runListingOptimization(asin: string, keyword: string, marketplace = 'amazon.de', offlineMode = false): Promise<void> {
  console.log(`\n--- Starte Listing-Optimierung für ASIN ${asin} (${offlineMode ? 'Offline' : 'Online'}-Modus) ---\n`);
  
  // Offline-Modus einstellen
  setOfflineMode(offlineMode);
  
  try {
    // Führe Listing-Optimierung aus
    console.log(`Führe Listing-Optimierung aus...`);
    const startTime = Date.now();
    const result = await listingOptimierungTool(asin, keyword, marketplace);
    const duration = Date.now() - startTime;
    
    console.log(`Optimierung abgeschlossen in ${duration / 1000} Sekunden.`);
    console.log(`Keyword-Abdeckung: ${result.keywordAbdeckung.abdeckung.toFixed(1)}%`);
    console.log(`Empfehlungen: ${result.empfehlungen.length}`);
    
    // Speichere Ergebnis
    const filename = `listing-optimierung-${asin}-${offlineMode ? 'offline' : 'online'}.json`;
    saveResult(filename, result);
  } catch (error) {
    console.error(`Fehler bei der Listing-Optimierung:`, error);
  }
}

/**
 * Zeigt verfügbare Workflows an
 */
function showAvailableWorkflows(): void {
  console.log(`\n--- Verfügbare Workflows ---\n`);
  
  const workflows = workflowManager.getAvailableWorkflows();
  
  console.log(`Registrierte Workflows: ${workflows.length}`);
  workflows.forEach(workflow => {
    console.log(`- ${workflow}`);
  });
  
  console.log('\n');
}

/**
 * Demonstriert die parallele Ausführung von Workflow-Schritten
 */
async function runParallelWorkflowDemo(): Promise<void> {
  console.log('\n--- Starte Parallele Workflow-Demo ---\n');
  
  // Erstelle einen separaten Workflow-Manager für die Demo
  const demoManager = createWorkflowManager(manager => {
    // Registriere Workflow-Schritte
    manager
      .registerStep('step1', async (data) => {
        console.log('Führe Schritt 1 aus...');
        await new Promise(resolve => setTimeout(resolve, 500));
        return { ...data, step1Result: 'Ergebnis von Schritt 1' };
      })
      .registerStep('step2', async (data) => {
        console.log('Führe Schritt 2 aus...');
        await new Promise(resolve => setTimeout(resolve, 300));
        return { ...data, step2Result: 'Ergebnis von Schritt 2' };
      })
      .registerStep('step3', async (data) => {
        console.log('Führe Schritt 3 aus...');
        await new Promise(resolve => setTimeout(resolve, 700));
        return { ...data, step3Result: 'Ergebnis von Schritt 3' };
      })
      .registerStep('combineResults', async (data, context) => {
        console.log('Kombiniere Ergebnisse...');
        const allResults = context.previousResults;
        return {
          kombiniert: {
            vonSchritt1: allResults.step1?.step1Result || 'Nicht verfügbar',
            vonSchritt2: allResults.step2?.step2Result || 'Nicht verfügbar',
            vonSchritt3: allResults.step3?.step3Result || 'Nicht verfügbar',
            vonParallelGruppe: allResults.parallelSteps || 'Nicht verfügbar'
          }
        };
      });
    
    // Registriere eine Gruppe von Schritten, die parallel ausgeführt werden sollen
    manager.registerParallelGroup('parallelSteps', ['step1', 'step2', 'step3']);
    
    // Registriere einen Workflow mit parallel und sequentiell ausgeführten Schritten
    manager.registerWorkflow('parallelDemo', ['parallelSteps', 'combineResults']);
  });
  
  try {
    console.log('Führe parallelen Workflow aus...');
    const startTime = Date.now();
    
    // Führe den Workflow aus
    const result = await demoManager.executeWorkflow('parallelDemo', { startData: 'Anfangsdaten' });
    
    const duration = Date.now() - startTime;
    console.log(`Paralleler Workflow abgeschlossen in ${duration}ms`);
    console.log('Ergebnis:', JSON.stringify(result, null, 2));
    
    // Speichere Ergebnis
    saveResult('parallel-workflow-demo.json', result);
  } catch (error) {
    console.error('Fehler bei der parallelen Workflow-Demo:', error);
  }
}

/**
 * Demonstriert Retry-Mechanismen für fehleranfällige Operationen
 */
async function runRetryDemo(): Promise<void> {
  console.log('\n--- Starte Retry-Mechanismus-Demo ---\n');
  
  // Erstelle einen separaten Workflow-Manager für die Demo
  const demoManager = createWorkflowManager(manager => {
    // Registriere einen Schritt, der zunächst fehlschlägt und dann erfolgreich ist
    let versuche = 0;
    
    manager.registerStep('unstableStep', async (data) => {
      versuche++;
      console.log(`Ausführung von unstableStep, Versuch ${versuche}...`);
      
      if (versuche <= 2) {
        // Simuliere einen Netzwerkfehler bei den ersten beiden Versuchen
        throw new Error('NETWORK_ERROR: Verbindung unterbrochen');
      }
      
      return { ...data, unstableResult: `Erfolgreich nach ${versuche} Versuchen` };
    });
    
    // Konfiguriere Retry-Einstellungen für den instabilen Schritt
    manager.configureRetry('unstableStep', {
      maxRetries: 3,
      initialDelay: 500,
      backoffFactor: 1.5
    });
    
    // Registriere einen Workflow mit dem instabilen Schritt
    manager.registerWorkflow('retryDemo', ['unstableStep']);
  });
  
  try {
    console.log('Führe Retry-Demo aus...');
    const startTime = Date.now();
    
    // Führe den Workflow aus
    const result = await demoManager.executeWorkflow('retryDemo', { startData: 'Anfangsdaten' });
    
    const duration = Date.now() - startTime;
    console.log(`Retry-Demo abgeschlossen in ${duration}ms`);
    console.log('Ergebnis:', JSON.stringify(result, null, 2));
    
    // Speichere Ergebnis
    saveResult('retry-workflow-demo.json', result);
  } catch (error) {
    console.error('Fehler bei der Retry-Demo:', error);
  }
}

/**
 * Demonstriert bedingte Ausführung von Workflow-Schritten
 */
async function runConditionalWorkflowDemo(): Promise<void> {
  console.log('\n--- Starte Bedingte Ausführung Demo ---\n');
  
  // Erstelle einen separaten Workflow-Manager für die Demo
  const demoManager = createWorkflowManager(manager => {
    // Registriere Schritte für die bedingte Ausführung
    manager
      .registerStep('initialStep', async (data) => {
        console.log('Führe initialen Schritt aus...');
        return { 
          ...data, 
          value: Math.random() * 100, // Zufällige Zahl zwischen 0 und 100
          timestamp: new Date().toISOString()
        };
      })
      .registerStep('highValueProcess', async (data) => {
        console.log('Führe High-Value-Prozess aus...');
        return { 
          ...data, 
          processResult: 'Hoher Wert verarbeitet', 
          processType: 'premium'
        };
      })
      .registerStep('lowValueProcess', async (data) => {
        console.log('Führe Low-Value-Prozess aus...');
        return { 
          ...data, 
          processResult: 'Niedriger Wert verarbeitet', 
          processType: 'standard'
        };
      })
      .registerStep('finalStep', async (data) => {
        console.log('Führe finalen Schritt aus...');
        return { 
          ...data, 
          finalResult: `Abgeschlossen mit ${data.processType} Verarbeitung`,
          completed: true
        };
      });
    
    // Setze Bedingungen für die Ausführung der Schritte
    manager
      .setStepCondition('highValueProcess', (data) => {
        const isHighValue = data.value > 50;
        console.log(`Prüfe High-Value-Bedingung: ${data.value} > 50 = ${isHighValue}`);
        return isHighValue;
      })
      .setStepCondition('lowValueProcess', (data) => {
        const isLowValue = data.value <= 50;
        console.log(`Prüfe Low-Value-Bedingung: ${data.value} <= 50 = ${isLowValue}`);
        return isLowValue;
      });
    
    // Registriere einen Workflow mit bedingter Ausführung
    manager.registerWorkflow('conditionalDemo', [
      'initialStep',
      'highValueProcess',
      'lowValueProcess',
      'finalStep'
    ]);
    
    // Registriere einen dynamischen Workflow
    manager.registerDynamicWorkflow('dynamicDemo', (data, context) => {
      // Bestimme die Schritte basierend auf Eingabedaten
      const steps = ['initialStep'];
      
      if (data.processType === 'full') {
        console.log('Dynamischer Workflow: Füge alle Schritte hinzu');
        steps.push('highValueProcess', 'lowValueProcess');
      } else if (data.preferredProcess === 'high') {
        console.log('Dynamischer Workflow: Füge nur High-Value-Prozess hinzu');
        steps.push('highValueProcess');
      } else {
        console.log('Dynamischer Workflow: Füge nur Low-Value-Prozess hinzu');
        steps.push('lowValueProcess');
      }
      
      steps.push('finalStep');
      return steps;
    });
  });
  
  try {
    // Führe den bedingten Workflow mehrmals aus, um verschiedene Pfade zu zeigen
    for (let i = 0; i < 2; i++) {
      console.log(`\nBedingte Ausführung Durchlauf ${i+1}...`);
      const startTime = Date.now();
      
      // Führe den Workflow aus
      const result = await demoManager.executeWorkflow('conditionalDemo', { run: i+1 });
      
      const duration = Date.now() - startTime;
      console.log(`Bedingte Ausführung ${i+1} abgeschlossen in ${duration}ms`);
      console.log(`Prozesstyp: ${result.processType}`);
      
      // Speichere Ergebnis
      saveResult(`conditional-workflow-demo-${i+1}.json`, result);
    }
    
    // Führe den dynamischen Workflow aus
    console.log('\nFühre dynamischen Workflow aus...');
    const dynamicResult = await demoManager.executeWorkflow('dynamicDemo', { 
      processType: 'partial', 
      preferredProcess: 'high'
    });
    
    console.log('Dynamischer Workflow abgeschlossen');
    console.log(`Prozesstyp: ${dynamicResult.processType}`);
    
    // Speichere Ergebnis
    saveResult('dynamic-workflow-demo.json', dynamicResult);
  } catch (error) {
    console.error('Fehler bei der bedingten Workflow-Demo:', error);
  }
}

/**
 * Hauptfunktion zum Ausführen der Demos
 */
async function main(): Promise<void> {
  console.log('=== Helium10 MCP-Server Workflow-Demo ===\n');
  
  // Zeige verfügbare Workflows
  showAvailableWorkflows();
  
  // Demo 1: Produktrecherche im Offline-Modus
  await runProductResearch('smartphone halterung', 'amazon.de', true);
  
  // Demo 2: Konkurrenzanalyse im Offline-Modus
  await runCompetitionAnalysis(['B09XYZ123', 'B08ABC456', 'B07DEF789'], 'amazon.de', true);
  
  // Demo 3: Listing-Optimierung im Offline-Modus
  await runListingOptimization('B09XYZ123', 'smartphone halterung auto', 'amazon.de', true);
  
  // Neue Demos für erweiterte Workflow-Funktionen
  await runParallelWorkflowDemo();
  await runRetryDemo();
  await runConditionalWorkflowDemo();
  
  console.log('\n=== Workflow-Demo abgeschlossen ===');
}

// Führe Demo aus
main().catch(error => {
  console.error('Fehler bei der Ausführung der Demo:', error);
  process.exit(1);
}); 