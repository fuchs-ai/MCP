/**
 * Transformer-Modell für Produktkategorisierung
 * 
 * Dieses Modul ermöglicht das Training eines einfachen Transformer-Modells
 * zur Klassifizierung von Amazon-Produktkategorien basierend auf Titeln und Beschreibungen.
 */

import * as tf from '@tensorflow/tfjs-node';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';
import { FileSystemCache } from '../cache/file-cache';
import { workflowManager } from '../workflow/workflow-manager';

// Definiere die Modellkonfiguration
export interface ModelConfig {
  vocabularySize: number;
  embeddingDimension: number;
  numHeads: number;
  feedForwardDimension: number;
  numLayers: number;
  maxSequenceLength: number;
  numCategories: number;
  batchSize: number;
  epochs: number;
  learningRate: number;
}

// Standard-Konfiguration
export const DEFAULT_CONFIG: ModelConfig = {
  vocabularySize: 10000,
  embeddingDimension: 128,
  numHeads: 4,
  feedForwardDimension: 256,
  numLayers: 2,
  maxSequenceLength: 100,
  numCategories: 20,
  batchSize: 32,
  epochs: 10,
  learningRate: 0.001
};

// Cache für Trainingsdaten und Modelle
const modelCache = new FileSystemCache('transformer-models');

/**
 * Tokenisiert Text für die Verarbeitung durch das Transformer-Modell
 * 
 * @param {string} text Eingegebener Text
 * @param {Map<string, number>} vocabulary Wortschatz mit Wort->ID-Zuordnungen
 * @param {number} maxLength Maximale Sequenzlänge
 * @returns {number[]} Tokenisierte Sequenz
 */
export function tokenizeText(
  text: string, 
  vocabulary: Map<string, number>, 
  maxLength: number
): number[] {
  // Text normalisieren und tokenisieren
  const normalizedText = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  const words = normalizedText.split(' ');
  
  // Wandle Wörter in Token-IDs um
  const tokens = words.map(word => {
    if (vocabulary.has(word)) {
      return vocabulary.get(word);
    }
    // Unbekanntes Wort (OOV) - verwende Standard-Token 1
    return 1;
  });
  
  // Kürze oder pade auf die gewünschte Länge
  if (tokens.length > maxLength) {
    return tokens.slice(0, maxLength);
  } else {
    // Fülle mit Padding-Token 0 auf
    return [...tokens, ...Array(maxLength - tokens.length).fill(0)];
  }
}

/**
 * Bereitet Trainingsdaten für das Transformer-Modell vor
 * 
 * @param {object} params Parameter für die Datenaufbereitung
 * @returns {Promise<object>} Aufbereitete Daten und Metadaten
 */
export async function prepareTrainingData(params: {
  productData: any[];
  modelConfig?: Partial<ModelConfig>;
}): Promise<any> {
  logger.info('Bereite Trainingsdaten vor...');
  
  // Konfiguration mit den Standardwerten zusammenführen
  const config = { ...DEFAULT_CONFIG, ...params.modelConfig };
  
  // Extrahiere Kategorien aus den Daten
  const categories = Array.from(
    new Set(params.productData.map(product => product.category))
  ).sort();
  
  // Erstelle Kategorie-zu-ID-Mapping
  const categoryMap = new Map<string, number>();
  categories.forEach((category, index) => {
    categoryMap.set(category, index);
  });
  
  // Aktualisiere die Anzahl der Kategorien in der Konfiguration
  config.numCategories = Math.min(categories.length, config.numCategories);
  
  // Erstelle Vokabular aus Produkt-Titeln und Beschreibungen
  const allTexts = params.productData.map(product => 
    `${product.title} ${product.description} ${(product.bulletPoints || []).join(' ')}`
  );
  
  const wordFrequency = new Map<string, number>();
  
  // Zähle Wörter
  allTexts.forEach(text => {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ');
    
    words.forEach(word => {
      if (word.length > 1) { // Ignoriere einzelne Zeichen
        const count = wordFrequency.get(word) || 0;
        wordFrequency.set(word, count + 1);
      }
    });
  });
  
  // Sortiere nach Häufigkeit und erstelle Vokabular
  const sortedVocabulary = Array.from(wordFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, config.vocabularySize - 2)
    .map(entry => entry[0]);
  
  // Erstelle Mapping (Reserviere 0 für Padding, 1 für unbekannte Wörter)
  const vocabulary = new Map<string, number>();
  vocabulary.set('<pad>', 0);
  vocabulary.set('<unk>', 1);
  
  sortedVocabulary.forEach((word, index) => {
    vocabulary.set(word, index + 2);
  });
  
  // Bereite Trainings- und Validierungsdaten vor
  const datasets = {
    train: {
      x: [] as number[][],
      y: [] as number[]
    },
    validation: {
      x: [] as number[][],
      y: [] as number[]
    }
  };
  
  // Mische die Daten
  const shuffledData = [...params.productData].sort(() => Math.random() - 0.5);
  
  // Teile in Trainings- und Validierungsdaten auf (80/20)
  const splitIndex = Math.floor(shuffledData.length * 0.8);
  const trainingData = shuffledData.slice(0, splitIndex);
  const validationData = shuffledData.slice(splitIndex);
  
  // Verarbeite Trainingsdaten
  trainingData.forEach(product => {
    const text = `${product.title} ${product.description}`;
    const tokens = tokenizeText(text, vocabulary, config.maxSequenceLength);
    const categoryId = categoryMap.get(product.category) || 0;
    
    // Nur hinzufügen, wenn die Kategorie im Bereich liegt
    if (categoryId < config.numCategories) {
      datasets.train.x.push(tokens);
      datasets.train.y.push(categoryId);
    }
  });
  
  // Verarbeite Validierungsdaten
  validationData.forEach(product => {
    const text = `${product.title} ${product.description}`;
    const tokens = tokenizeText(text, vocabulary, config.maxSequenceLength);
    const categoryId = categoryMap.get(product.category) || 0;
    
    // Nur hinzufügen, wenn die Kategorie im Bereich liegt
    if (categoryId < config.numCategories) {
      datasets.validation.x.push(tokens);
      datasets.validation.y.push(categoryId);
    }
  });
  
  logger.info(`Datenaufbereitung abgeschlossen: ${datasets.train.x.length} Trainingsbeispiele, ${datasets.validation.x.length} Validierungsbeispiele`);
  
  return {
    config,
    vocabulary: Array.from(vocabulary.entries()),
    categories,
    categoryMap: Array.from(categoryMap.entries()),
    datasets: {
      train: {
        x: tf.tensor2d(datasets.train.x),
        y: tf.oneHot(tf.tensor1d(datasets.train.y, 'int32'), config.numCategories)
      },
      validation: {
        x: tf.tensor2d(datasets.validation.x),
        y: tf.oneHot(tf.tensor1d(datasets.validation.y, 'int32'), config.numCategories)
      }
    },
    metadata: {
      totalSamples: params.productData.length,
      trainingSamples: datasets.train.x.length,
      validationSamples: datasets.validation.x.length,
      vocabularySize: vocabulary.size,
      categoriesCount: categories.length
    }
  };
}

/**
 * Erstellt ein Transformer-Modell für Textklassifizierung
 * 
 * @param {ModelConfig} config Modellkonfiguration
 * @returns {tf.LayersModel} Das erstellte Modell
 */
export function createTransformerModel(config: ModelConfig): tf.LayersModel {
  // Definiere Eingabe mit fester Länge
  const input = tf.input({shape: [config.maxSequenceLength], dtype: 'int32', name: 'input'});
  
  // Embedding-Layer
  let x = tf.layers.embedding({
    inputDim: config.vocabularySize,
    outputDim: config.embeddingDimension,
    inputLength: config.maxSequenceLength,
    maskZero: true,
    name: 'embedding'
  }).apply(input) as tf.SymbolicTensor;
  
  // Positions-Encoding
  const positionEncoding = createPositionalEncoding(config.maxSequenceLength, config.embeddingDimension);
  x = tf.layers.add().apply([x, positionEncoding]) as tf.SymbolicTensor;
  
  // Transformer-Blöcke
  for (let i = 0; i < config.numLayers; i++) {
    // Multi-Head Attention
    const attention = tf.layers.multiHeadAttention({
      numHeads: config.numHeads,
      keyDim: Math.floor(config.embeddingDimension / config.numHeads),
      name: `mha_${i}`
    }).apply(x, {
      value: x,
      key: x,
      query: x
    }) as tf.SymbolicTensor;
    
    // Residual + Normalisierung nach Attention
    const addAtt = tf.layers.add().apply([x, attention]) as tf.SymbolicTensor;
    const normAtt = tf.layers.layerNormalization({
      name: `norm1_${i}`
    }).apply(addAtt) as tf.SymbolicTensor;
    
    // Feed-Forward Netzwerk
    const ffn1 = tf.layers.dense({
      units: config.feedForwardDimension,
      activation: 'relu',
      name: `ffn1_${i}`
    }).apply(normAtt) as tf.SymbolicTensor;
    
    const ffn2 = tf.layers.dense({
      units: config.embeddingDimension,
      name: `ffn2_${i}`
    }).apply(ffn1) as tf.SymbolicTensor;
    
    // Residual + Normalisierung nach FFN
    const addFFN = tf.layers.add().apply([normAtt, ffn2]) as tf.SymbolicTensor;
    x = tf.layers.layerNormalization({
      name: `norm2_${i}`
    }).apply(addFFN) as tf.SymbolicTensor;
  }
  
  // Global Average Pooling über die Sequenzlänge
  x = tf.layers.globalAveragePooling1d({name: 'pooling'}).apply(x) as tf.SymbolicTensor;
  
  // Dropout für Regularisierung
  x = tf.layers.dropout({rate: 0.1, name: 'dropout'}).apply(x) as tf.SymbolicTensor;
  
  // Ausgabe-Layer
  const output = tf.layers.dense({
    units: config.numCategories,
    activation: 'softmax',
    name: 'output'
  }).apply(x) as tf.SymbolicTensor;
  
  // Erstelle und kompiliere das Modell
  const model = tf.model({inputs: input, outputs: output});
  
  model.compile({
    optimizer: tf.train.adam(config.learningRate),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  });
  
  return model;
}

/**
 * Erzeugt Positions-Encodings für den Transformer
 * 
 * @param {number} maxLength Maximale Sequenzlänge
 * @param {number} dim Embedding-Dimension
 * @returns {tf.Tensor} Positions-Encodings
 */
function createPositionalEncoding(maxLength: number, dim: number): tf.Tensor {
  const positionalEncoding = new Array(maxLength).fill(0).map((_, pos) => {
    return new Array(dim).fill(0).map((_, i) => {
      const angle = pos / Math.pow(10000, (2 * Math.floor(i / 2)) / dim);
      return i % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
    });
  });
  
  return tf.tensor(positionalEncoding);
}

/**
 * Trainiert das Transformer-Modell
 * 
 * @param {object} preparedData Vorbereitete Trainingsdaten
 * @returns {Promise<object>} Trainingsergebnisse
 */
export async function trainTransformerModel(preparedData: any): Promise<any> {
  logger.info('Starte Training des Transformer-Modells...');
  
  const { config, datasets } = preparedData;
  
  // Erstelle das Modell
  const model = createTransformerModel(config);
  
  // Konfiguriere Callbacks
  const callbacks = [
    {
      onEpochEnd: (epoch: number, logs: any) => {
        logger.info(`Epoch ${epoch + 1}/${config.epochs}: loss = ${logs.loss.toFixed(4)}, accuracy = ${logs.acc.toFixed(4)}, val_loss = ${logs.val_loss.toFixed(4)}, val_accuracy = ${logs.val_acc.toFixed(4)}`);
      }
    }
  ];
  
  // Trainiere das Modell
  const history = await model.fit(datasets.train.x, datasets.train.y, {
    epochs: config.epochs,
    batchSize: config.batchSize,
    validationData: [datasets.validation.x, datasets.validation.y],
    callbacks,
    shuffle: true
  });
  
  logger.info('Modelltraining abgeschlossen');
  
  // Gib alle notwendigen Daten zurück
  return {
    model,
    config,
    vocabulary: preparedData.vocabulary,
    categories: preparedData.categories,
    categoryMap: preparedData.categoryMap,
    history: history.history,
    metadata: preparedData.metadata
  };
}

/**
 * Evaluiert die Leistung des trainierten Modells
 * 
 * @param {object} trainedModel Ergebnisse des Trainings
 * @returns {Promise<object>} Evaluationsergebnisse
 */
export async function evaluateModelPerformance(trainedModel: any): Promise<any> {
  logger.info('Evaluiere Modellleistung...');
  
  const { model, datasets } = trainedModel;
  
  // Evaluiere auf dem Validierungsdatensatz
  const evalResult = await model.evaluate(
    datasets.validation.x,
    datasets.validation.y
  ) as tf.Scalar[];
  
  const valLoss = evalResult[0].dataSync()[0];
  const valAccuracy = evalResult[1].dataSync()[0];
  
  logger.info(`Evaluation: Verlust = ${valLoss.toFixed(4)}, Genauigkeit = ${valAccuracy.toFixed(4)}`);
  
  // Berechne Konfusionsmatrix und weitere Metriken auf Validierungsdaten
  const predictions = model.predict(datasets.validation.x) as tf.Tensor;
  const predictionArray = await predictions.argMax(1).array() as number[];
  const trueLabels = await datasets.validation.y.argMax(1).array() as number[];
  
  // Erstelle Konfusionsmatrix
  const numCategories = trainedModel.config.numCategories;
  const confusionMatrix = Array(numCategories).fill(0).map(() => Array(numCategories).fill(0));
  
  for (let i = 0; i < predictionArray.length; i++) {
    confusionMatrix[trueLabels[i]][predictionArray[i]] += 1;
  }
  
  // Berechne Präzision, Recall und F1-Score für jede Kategorie
  const metrics = [];
  
  for (let i = 0; i < numCategories; i++) {
    const truePositives = confusionMatrix[i][i];
    const falsePositives = confusionMatrix.reduce((sum, row, index) => sum + (index !== i ? row[i] : 0), 0);
    const falseNegatives = confusionMatrix[i].reduce((sum, val, index) => sum + (index !== i ? val : 0), 0);
    
    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    const f1 = 2 * (precision * recall) / (precision + recall) || 0;
    
    metrics.push({
      category: trainedModel.categories[i],
      precision,
      recall,
      f1
    });
  }
  
  // Berechne durchschnittliche Metriken
  const avgPrecision = metrics.reduce((sum, m) => sum + m.precision, 0) / metrics.length;
  const avgRecall = metrics.reduce((sum, m) => sum + m.recall, 0) / metrics.length;
  const avgF1 = metrics.reduce((sum, m) => sum + m.f1, 0) / metrics.length;
  
  logger.info(`Durchschnittliche Metriken: Präzision = ${avgPrecision.toFixed(4)}, Recall = ${avgRecall.toFixed(4)}, F1 = ${avgF1.toFixed(4)}`);
  
  // Füge Evaluationsergebnisse zum Trainingsmodell hinzu
  return {
    ...trainedModel,
    evaluation: {
      valLoss,
      valAccuracy,
      confusionMatrix,
      categoryMetrics: metrics,
      avgPrecision,
      avgRecall,
      avgF1
    }
  };
}

/**
 * Exportiert das trainierte Modell und seine Metadaten
 * 
 * @param {object} evaluatedModel Ergebnisse der Modellevaluation
 * @returns {Promise<object>} Export-Ergebnisse
 */
export async function exportTrainedModel(evaluatedModel: any): Promise<any> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const modelName = `product-classifier-${timestamp}`;
  const exportDir = path.join(process.cwd(), 'models', modelName);
  
  logger.info(`Exportiere Modell nach ${exportDir}...`);
  
  // Erstelle Modellverzeichnis
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }
  
  // Speichere das Modell
  await evaluatedModel.model.save(`file://${exportDir}`);
  
  // Speichere Metadaten
  const metadata = {
    modelName,
    exportTimestamp: timestamp,
    config: evaluatedModel.config,
    vocabulary: evaluatedModel.vocabulary,
    categories: evaluatedModel.categories,
    categoryMap: evaluatedModel.categoryMap,
    trainingMetadata: evaluatedModel.metadata,
    evaluationResults: {
      valLoss: evaluatedModel.evaluation.valLoss,
      valAccuracy: evaluatedModel.evaluation.valAccuracy,
      avgPrecision: evaluatedModel.evaluation.avgPrecision,
      avgRecall: evaluatedModel.evaluation.avgRecall,
      avgF1: evaluatedModel.evaluation.avgF1
    }
  };
  
  fs.writeFileSync(
    path.join(exportDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );
  
  // Aktualisiere Cache mit dem neuesten Modell
  await modelCache.set('latest_model', {
    modelPath: exportDir,
    modelName,
    exportTimestamp: timestamp
  }, 365 * 24 * 60 * 60); // 1 Jahr TTL
  
  logger.info(`Modell wurde erfolgreich nach ${exportDir} exportiert`);
  
  return {
    ...evaluatedModel,
    modelName,
    modelPath: exportDir,
    exportTimestamp: timestamp
  };
}

/**
 * Sagt die Kategorie für einen Produkttext vorher
 * 
 * @param {string} modelPath Pfad zum trainierten Modell
 * @param {string} text Zu klassifizierender Text
 * @returns {Promise<object>} Vorhersageergebnis
 */
export async function predictCategory(modelPath: string, text: string): Promise<any> {
  logger.info(`Klassifiziere Text mit Modell aus ${modelPath}...`);
  
  try {
    // Lade Modell
    const model = await tf.loadLayersModel(`file://${modelPath}/model.json`);
    
    // Lade Metadaten
    const metadataPath = path.join(modelPath, 'metadata.json');
    if (!fs.existsSync(metadataPath)) {
      throw new Error(`Metadaten nicht gefunden in ${metadataPath}`);
    }
    
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    const { vocabulary, categories, config } = metadata;
    
    // Konvertiere Vokabular zurück in Map
    const vocabMap = new Map<string, number>(vocabulary);
    
    // Tokenisiere den Eingabetext
    const tokenized = tokenizeText(text, vocabMap, config.maxSequenceLength);
    
    // Mache Vorhersage
    const inputTensor = tf.tensor2d([tokenized]);
    const prediction = model.predict(inputTensor) as tf.Tensor;
    const probabilities = await prediction.data();
    
    // Sortiere Kategorien nach Wahrscheinlichkeit
    const categoryProbabilities = Array.from(probabilities)
      .map((prob, idx) => ({
        category: categories[idx],
        probability: prob
      }))
      .sort((a, b) => b.probability - a.probability);
    
    // Gib die Vorhersage zurück
    const result = {
      inputText: text,
      topCategory: categoryProbabilities[0].category,
      probability: categoryProbabilities[0].probability,
      allCategories: categoryProbabilities
    };
    
    logger.info(`Klassifikation abgeschlossen. Top-Kategorie: ${result.topCategory} (${(result.probability * 100).toFixed(2)}%)`);
    
    // Bereinige Tensoren
    tf.dispose([inputTensor, prediction]);
    
    return result;
  } catch (error) {
    logger.error('Fehler bei der Klassifikation', error);
    throw new Error(`Klassifikationsfehler: ${error.message}`);
  }
}

// Workflow-Integration
/**
 * Registriert den Transformer-Workflow
 */
export function registerTransformerWorkflow() {
  logger.info('Registriere Transformer-Modell-Training-Workflow');
  
  // Registriere Schritte für den Workflow
  workflowManager.registerStep('collectTrainingData', async (context) => {
    logger.info('Sammle Trainingsdaten für Transformer-Modell...');
    const { searchTerm, sampleSize, marketplace } = context.data;
    
    // Hier würde man die tatsächliche Datensammlung durchführen
    // In diesem Beispiel simulieren wir das Ergebnis
    return {
      message: `Trainingsdaten für '${searchTerm}' gesammelt`,
      productCount: sampleSize,
      marketplace
    };
  });
  
  workflowManager.registerStep('prepareModelData', async (context) => {
    logger.info('Bereite Daten für das Modelltraining vor...');
    const { trainingData, modelConfig } = context.data;
    
    // Hier würde die tatsächliche Datenaufbereitung stattfinden
    return {
      message: 'Daten für das Training vorbereitet',
      datasetSize: trainingData.productCount,
      config: modelConfig || DEFAULT_CONFIG
    };
  });
  
  workflowManager.registerStep('trainModel', async (context) => {
    logger.info('Trainiere Transformer-Modell...');
    const { preparedData } = context.data;
    
    // Hier würde das tatsächliche Training stattfinden
    return {
      message: 'Modell erfolgreich trainiert',
      accuracy: 0.92, // Beispielwert
      trainingTime: '5m 23s'
    };
  });
  
  workflowManager.registerStep('evaluateModel', async (context) => {
    logger.info('Evaluiere trainiertes Modell...');
    const { trainedModel } = context.data;
    
    // Hier würde die tatsächliche Evaluation stattfinden
    return {
      message: 'Modell erfolgreich evaluiert',
      metrics: {
        accuracy: 0.89, // Beispielwert
        f1Score: 0.87
      }
    };
  });
  
  workflowManager.registerStep('exportModel', async (context) => {
    logger.info('Exportiere trainiertes Modell...');
    const { evaluatedModel } = context.data;
    
    // Hier würde der tatsächliche Export stattfinden
    return {
      message: 'Modell erfolgreich exportiert',
      modelPath: '/path/to/exported/model',
      exportTimestamp: new Date().toISOString()
    };
  });
  
  // Registriere den Workflow
  workflowManager.registerWorkflow('transformerTraining', [
    'collectTrainingData',
    'prepareModelData',
    'trainModel',
    'evaluateModel',
    'exportModel'
  ]);
  
  logger.info('Transformer-Workflow erfolgreich registriert');
} 