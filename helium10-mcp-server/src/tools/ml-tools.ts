/**
 * ML-Tools für den Helium10 MCP-Server
 * 
 * Dieses Modul bietet MCP-Tools für Machine Learning und Transformer-Modelltraining.
 */

import * as tf from '@tensorflow/tfjs-node';
import { 
  prepareTrainingData, 
  trainTransformerModel, 
  evaluateModelPerformance,
  exportTrainedModel,
  predictCategory,
  registerTransformerWorkflow
} from '../ml/transformer';
import { FileSystemCache } from '../cache/file-cache';
import { logger } from '../utils/logger';
import { getProductDetails } from '../apis/amazon-api';
import { xrayProductAnalysis } from '../apis/helium10-api';
import * as fs from 'fs';
import * as path from 'path';

// Cache-Instanz für ML-Tools
const mlCache = new FileSystemCache('ml-tools-cache');

// Registriere den Transformer-Workflow
registerTransformerWorkflow();

/**
 * Sammelt Trainingsdaten für das Transformer-Modell aus Amazon-Produkten
 * 
 * @param {string} searchTerm Suchbegriff für Produkte
 * @param {number} sampleSize Anzahl der zu sammelnden Produkte
 * @param {string} marketplace Amazon Marketplace (Standard: amazon.de)
 * @returns {Promise<object>} Gesammelte Trainingsdaten
 */
export async function collectProductTrainingDataTool(
  searchTerm: string, 
  sampleSize: number = 100, 
  marketplace: string = 'amazon.de'
): Promise<object> {
  logger.info(`Sammle Trainingsdaten für "${searchTerm}" mit ${sampleSize} Produkten`);
  
  // Prüfe Cache
  const cacheKey = `training-data:${marketplace}:${searchTerm}:${sampleSize}`;
  const cachedData = await mlCache.get(cacheKey);
  if (cachedData) {
    logger.info('Verwende zwischengespeicherte Trainingsdaten');
    return cachedData;
  }
  
  try {
    // Suche Produkte mit Helium10 X-Ray
    logger.info('Suche Produkte mit Helium10 X-Ray...');
    const searchResults = await xrayProductAnalysis(searchTerm, marketplace);
    
    // Beschränke auf angeforderte Stichprobengröße
    const selectedProducts = searchResults.results.slice(0, sampleSize);
    logger.info(`${selectedProducts.length} Produkte ausgewählt für Datensammlung`);
    
    // Hole detaillierte Produktdaten
    const productData = [];
    for (let i = 0; i < selectedProducts.length; i++) {
      const product = selectedProducts[i];
      logger.info(`Sammle Daten für Produkt ${i+1}/${selectedProducts.length}: ${product.asin}`);
      
      try {
        // Hole detaillierte Produktdaten von Amazon
        const details = await getProductDetails(product.asin, marketplace);
        
        productData.push({
          asin: product.asin,
          title: details.title || product.title,
          description: details.description || '',
          bulletPoints: details.bulletPoints || [],
          category: details.category || product.category || 'Unbekannt',
          price: details.price || product.price,
          rating: details.rating || product.rating,
          reviews: details.reviews || product.reviews
        });
      } catch (error) {
        logger.warn(`Fehler beim Abrufen von Daten für ${product.asin}: ${error.message}`);
      }
      
      // Kurze Pause, um API-Limits zu vermeiden
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const result = {
      searchTerm,
      marketplace,
      collectedAt: new Date().toISOString(),
      productCount: productData.length,
      productData
    };
    
    // Speichere im Cache
    await mlCache.set(cacheKey, result, 7 * 24 * 60 * 60); // 7 Tage
    
    return result;
  } catch (error) {
    logger.error('Fehler beim Sammeln von Trainingsdaten', error);
    throw new Error(`Fehler beim Sammeln von Trainingsdaten: ${error.message}`);
  }
}

/**
 * Startet das Training eines Transformer-Modells für Produktkategorien
 * 
 * @param {object} trainingData Trainingsdaten (aus collectProductTrainingDataTool)
 * @param {object} modelConfig Optionale Konfiguration für das Modell
 * @returns {Promise<object>} Trainingsergebnisse
 */
export async function trainProductCategoryModelTool(
  trainingData: any,
  modelConfig: any = {}
): Promise<object> {
  logger.info('Starte Training des Produktkategorie-Modells');
  
  try {
    // Bereite Daten für das Training vor
    const preparedData = await prepareTrainingData({
      productData: trainingData.productData,
      modelConfig
    });
    
    // Trainiere das Modell
    const trainedModel = await trainTransformerModel(preparedData);
    
    // Evaluiere das Modell
    const evaluatedModel = await evaluateModelPerformance(trainedModel);
    
    // Exportiere das Modell
    const exportedModel = await exportTrainedModel(evaluatedModel);
    
    // Ergebnisse zusammenfassen
    const result = {
      modelName: exportedModel.modelName,
      modelPath: exportedModel.modelPath,
      trainingMetrics: {
        accuracy: evaluatedModel.evaluation.valAccuracy,
        loss: evaluatedModel.evaluation.valLoss
      },
      categories: evaluatedModel.categories.length,
      trainingSamples: trainingData.productData.length,
      exportTimestamp: exportedModel.exportTimestamp
    };
    
    // Speichere Zusammenfassung im Cache
    await mlCache.set(`model-training:${exportedModel.modelName}`, result, 30 * 24 * 60 * 60);
    
    return result;
  } catch (error) {
    logger.error('Fehler beim Training des Modells', error);
    throw new Error(`Fehler beim Training des Modells: ${error.message}`);
  }
}

/**
 * Klassifiziert einen Produkttext in eine Kategorie mit dem trainierten Modell
 * 
 * @param {string} productText Produkttitel oder -beschreibung
 * @param {string} modelPath Pfad zum trainierten Modell (optional, verwendet neuestes Modell)
 * @returns {Promise<object>} Klassifikationsergebnisse
 */
export async function classifyProductCategoryTool(
  productText: string,
  modelPath?: string
): Promise<object> {
  logger.info('Klassifiziere Produkttext in Kategorie');
  
  try {
    // Verwende übergebenen Modellpfad oder hole neuestes Modell aus Cache
    let modelToUse = modelPath;
    
    if (!modelToUse) {
      const latestModel = await mlCache.get('latest_model');
      if (latestModel && latestModel.modelPath) {
        modelToUse = latestModel.modelPath;
        logger.info(`Verwende neuestes Modell: ${path.basename(modelToUse)}`);
      } else {
        throw new Error('Kein trainiertes Modell gefunden');
      }
    }
    
    // Führe Klassifikation durch
    const prediction = await predictCategory(modelToUse, productText);
    
    return {
      inputText: productText.length > 100 ? `${productText.slice(0, 100)}...` : productText,
      prediction: {
        topCategory: prediction.topCategory,
        confidence: prediction.probability,
        alternativeCategories: prediction.allCategories.slice(1, 4)
      },
      modelInfo: {
        modelPath: modelToUse,
        modelName: path.basename(modelToUse)
      }
    };
  } catch (error) {
    logger.error('Fehler bei der Produktklassifikation', error);
    throw new Error(`Fehler bei der Produktklassifikation: ${error.message}`);
  }
}

/**
 * Führt den kompletten ML-Workflow aus: Datensammlung, Training und Klassifikation
 * 
 * @param {string} searchTerm Suchbegriff für Trainingsdaten
 * @param {number} sampleSize Anzahl der zu sammelnden Produkte
 * @param {string} testText Testtext für die Klassifikation nach dem Training
 * @returns {Promise<object>} Ergebnisse des gesamten Workflows
 */
export async function completeMLWorkflowTool(
  searchTerm: string,
  sampleSize: number = 100,
  testText?: string
): Promise<object> {
  logger.info(`Starte kompletten ML-Workflow für "${searchTerm}"`);
  
  try {
    // 1. Daten sammeln
    logger.info('Schritt 1: Sammle Trainingsdaten...');
    const trainingData = await collectProductTrainingDataTool(searchTerm, sampleSize);
    
    // 2. Modell trainieren
    logger.info('Schritt 2: Trainiere Modell...');
    const trainingResult = await trainProductCategoryModelTool(trainingData);
    
    // 3. Wenn Testtext angegeben, führe Klassifikation durch
    let classificationResult = null;
    if (testText) {
      logger.info('Schritt 3: Klassifiziere Testtext...');
      classificationResult = await classifyProductCategoryTool(testText, trainingResult.modelPath);
    }
    
    // Ergebnisse zusammenfassen
    return {
      workflow: {
        searchTerm,
        sampleSize,
        completedAt: new Date().toISOString()
      },
      dataCollection: {
        productCount: trainingData.productCount,
        categories: Array.from(new Set(trainingData.productData.map((p: any) => p.category))).length
      },
      modelTraining: trainingResult,
      classification: classificationResult
    };
  } catch (error) {
    logger.error('Fehler im ML-Workflow', error);
    throw new Error(`Fehler im ML-Workflow: ${error.message}`);
  }
} 