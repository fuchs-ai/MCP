/**
 * Demonstration der ML-Tools im Helium10 MCP-Server
 * 
 * Dieses Beispiel zeigt die Nutzung des Transformer-Modells für die Klassifizierung
 * von Amazon-Produkten in Kategorien.
 */

import { 
  collectProductTrainingDataTool, 
  trainProductCategoryModelTool, 
  classifyProductCategoryTool, 
  completeMLWorkflowTool
} from '../src/tools/ml-tools';
import { logger } from '../src/utils/logger';
import * as fs from 'fs';
import * as path from 'path';

// Konfiguration
const OUTPUT_DIR = path.join(__dirname, 'ml-results');
const SAMPLE_SIZE = 50; // Anzahl der zu sammelnden Produkte (kleinere Größe für die Demo)
const SEARCH_TERM = 'bluetooth kopfhörer';
const TEST_TEXTS = [
  'Bluetooth Kopfhörer mit aktiver Geräuschunterdrückung',
  'Gaming Laptop mit RTX 3080 und 32GB RAM',
  'Yoga-Matte rutschfest mit Tragegurt',
  'Kochbuch für vegetarische Rezepte'
];

// Stelle sicher, dass das Ausgabeverzeichnis existiert
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Speichert Daten als JSON-Datei
 */
function saveToJson(data: any, filename: string): void {
  const filePath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  logger.info(`Daten gespeichert in: ${filePath}`);
}

/**
 * Demonstriert die Sammlung von Trainingsdaten
 */
async function demoDataCollection() {
  logger.info('=== Demo: Sammlung von Trainingsdaten ===');
  
  try {
    logger.info(`Sammle Trainingsdaten für "${SEARCH_TERM}" (${SAMPLE_SIZE} Produkte)...`);
    const startTime = Date.now();
    
    const trainingData = await collectProductTrainingDataTool(
      SEARCH_TERM, 
      SAMPLE_SIZE
    );
    
    const duration = (Date.now() - startTime) / 1000;
    logger.info(`Datensammlung abgeschlossen in ${duration.toFixed(2)}s`);
    logger.info(`Gesammelte Produkte: ${trainingData.productCount}`);
    
    // Speichere Ergebnisse
    saveToJson(trainingData, 'training-data.json');
    
    return trainingData;
  } catch (error) {
    logger.error('Fehler bei der Datensammlung:', error);
    throw error;
  }
}

/**
 * Demonstriert das Training eines Transformer-Modells
 */
async function demoModelTraining(trainingData: any) {
  logger.info('=== Demo: Training des Transformer-Modells ===');
  
  try {
    logger.info('Starte Training des Modells...');
    const startTime = Date.now();
    
    // Konfiguriere ein kleineres Modell für schnelleres Training
    const modelConfig = {
      vocabularySize: 5000,
      embeddingDimension: 64,
      numHeads: 2,
      feedForwardDimension: 128,
      numLayers: 1,
      maxSequenceLength: 50,
      batchSize: 16,
      epochs: 5,
      learningRate: 0.001
    };
    
    const trainingResult = await trainProductCategoryModelTool(
      trainingData,
      modelConfig
    );
    
    const duration = (Date.now() - startTime) / 1000;
    logger.info(`Training abgeschlossen in ${duration.toFixed(2)}s`);
    logger.info(`Modell gespeichert in: ${trainingResult.modelPath}`);
    logger.info(`Trainingsmetriken: Genauigkeit = ${(trainingResult.trainingMetrics.accuracy * 100).toFixed(2)}%`);
    
    // Speichere Ergebnisse
    saveToJson({
      modelName: trainingResult.modelName,
      modelPath: trainingResult.modelPath,
      metrics: trainingResult.trainingMetrics,
      categories: trainingResult.categories,
      trainingSamples: trainingResult.trainingSamples
    }, 'training-results.json');
    
    return trainingResult;
  } catch (error) {
    logger.error('Fehler beim Training des Modells:', error);
    throw error;
  }
}

/**
 * Demonstriert die Klassifizierung von Produkttexten
 */
async function demoClassification(trainingResult: any) {
  logger.info('=== Demo: Produktklassifizierung ===');
  
  try {
    const results = [];
    
    for (const testText of TEST_TEXTS) {
      logger.info(`Klassifiziere: "${testText}"...`);
      
      const classificationResult = await classifyProductCategoryTool(
        testText,
        trainingResult.modelPath
      );
      
      logger.info(`Kategorie: ${classificationResult.prediction.topCategory}`);
      logger.info(`Konfidenz: ${(classificationResult.prediction.confidence * 100).toFixed(2)}%`);
      
      results.push({
        text: testText,
        category: classificationResult.prediction.topCategory,
        confidence: classificationResult.prediction.confidence,
        alternatives: classificationResult.prediction.alternativeCategories || []
      });
    }
    
    // Speichere Ergebnisse
    saveToJson(results, 'classification-results.json');
    
    return results;
  } catch (error) {
    logger.error('Fehler bei der Klassifizierung:', error);
    throw error;
  }
}

/**
 * Demonstriert den kompletten ML-Workflow
 */
async function demoCompleteWorkflow() {
  logger.info('=== Demo: Kompletter ML-Workflow ===');
  
  try {
    logger.info(`Starte kompletten ML-Workflow für "${SEARCH_TERM}"...`);
    const startTime = Date.now();
    
    const result = await completeMLWorkflowTool(
      SEARCH_TERM,
      SAMPLE_SIZE,
      TEST_TEXTS[0] // Verwende den ersten Testtext für die Klassifizierung
    );
    
    const duration = (Date.now() - startTime) / 1000;
    logger.info(`Workflow abgeschlossen in ${duration.toFixed(2)}s`);
    
    // Speichere Ergebnisse
    saveToJson(result, 'complete-workflow-results.json');
    
    return result;
  } catch (error) {
    logger.error('Fehler im kompletten ML-Workflow:', error);
    throw error;
  }
}

/**
 * Hauptfunktion, die die verschiedenen Demo-Szenarien ausführt
 */
async function main() {
  logger.info('*** ML-Tools Demo ***');
  logger.info('Ausgabeverzeichnis:', OUTPUT_DIR);
  
  try {
    // Ansatz 1: Schrittweise Ausführung der Tools
    const trainingData = await demoDataCollection();
    const trainingResult = await demoModelTraining(trainingData);
    await demoClassification(trainingResult);
    
    // Ansatz 2: Kompletter Workflow in einem Schritt
    await demoCompleteWorkflow();
    
    logger.info('Demo erfolgreich abgeschlossen!');
  } catch (error) {
    logger.error('Fehler bei der Ausführung der Demo:', error);
    process.exit(1);
  }
}

// Starte die Demo
main().catch(error => {
  logger.error('Unbehandelter Fehler:', error);
  process.exit(1);
}); 