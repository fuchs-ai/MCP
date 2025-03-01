/**
 * Tests für ML-Tools und Transformer-Modelle
 * 
 * Diese Tests überprüfen die Funktionalität der Machine Learning-Tools und
 * der Transformer-Implementierung im Helium10 MCP-Server.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as tf from '@tensorflow/tfjs-node';

// Importe der zu testenden Komponenten
import { 
  prepareTrainingData, 
  trainTransformerModel,
  evaluateModelPerformance,
  exportTrainedModel,
  predictCategory,
  createTransformerModel,
  tokenizeText,
  ModelConfig,
  DEFAULT_CONFIG 
} from '../ml/transformer';

// Helfer-Funktionen und Mocks
const TEST_DIR = path.join(process.cwd(), 'test_temp');
const MODEL_DIR = path.join(TEST_DIR, 'models');

// Stelle sicher, dass das Testverzeichnis existiert
beforeAll(() => {
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }
  if (!fs.existsSync(MODEL_DIR)) {
    fs.mkdirSync(MODEL_DIR, { recursive: true });
  }
  
  // Mock von Logging-Funktionen
  vi.mock('../utils/logger', () => ({
    logger: {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }
  }));
});

// Bereinigung nach Tests
afterAll(() => {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

// Erstelle Beispiel-Trainingsdaten
function createMockProductData() {
  return [
    {
      asin: 'B001EXAMPLE1',
      title: 'Bluetooth Kopfhörer mit Noise Cancelling',
      description: 'Kabellose Kopfhörer mit aktiver Geräuschunterdrückung und 30 Stunden Akkulaufzeit',
      category: 'Elektronik',
      bulletPoints: ['Bluetooth 5.0', 'ANC Technologie', '30h Akkulaufzeit']
    },
    {
      asin: 'B002EXAMPLE2',
      title: 'Smartphone Halterung fürs Auto',
      description: 'Universal Handyhalterung für die Lüftung mit Schnellverschluss',
      category: 'Auto-Zubehör',
      bulletPoints: ['Universal', 'Einfache Montage', 'Stabile Halterung']
    },
    {
      asin: 'B003EXAMPLE3',
      title: 'Smartwatch mit Herzfrequenzmessung',
      description: 'Wasserdichte Fitnessuhr mit GPS, Herzfrequenzmessung und Schlaftracking',
      category: 'Elektronik',
      bulletPoints: ['GPS', 'Herzfrequenzmessung', 'Wasserdicht']
    },
    {
      asin: 'B004EXAMPLE4',
      title: 'Yoga-Matte rutschfest',
      description: 'Umweltfreundliche Gymnastikmatte aus TPE-Material, rutschfest und gelenkschonend',
      category: 'Sport',
      bulletPoints: ['Rutschfest', 'Umweltfreundlich', 'Gelenkschonend']
    },
    {
      asin: 'B005EXAMPLE5',
      title: 'Kochbuch für vegetarische Rezepte',
      description: 'Über 100 leckere vegetarische Rezepte für jeden Tag',
      category: 'Bücher',
      bulletPoints: ['100+ Rezepte', 'Vegetarisch', 'Einfache Zubereitung']
    }
  ];
}

// Testgruppen
describe('Transformer-Textverarbeitung', () => {
  it('tokenizeText sollte Text korrekt tokenisieren', () => {
    // Erstelle ein Testvokabular
    const vocabulary = new Map<string, number>([
      ['<pad>', 0],
      ['<unk>', 1],
      ['bluetooth', 2],
      ['kopfhörer', 3],
      ['mit', 4],
      ['noise', 5],
      ['cancelling', 6]
    ]);
    
    const text = 'Bluetooth Kopfhörer mit Noise Cancelling';
    const maxLength = 10;
    
    const tokens = tokenizeText(text, vocabulary, maxLength);
    
    // Erwartungen
    expect(tokens).toBeInstanceOf(Array);
    expect(tokens.length).toBe(maxLength);
    expect(tokens[0]).toBe(2); // bluetooth
    expect(tokens[1]).toBe(3); // kopfhörer
    expect(tokens[2]).toBe(4); // mit
    expect(tokens[3]).toBe(5); // noise
    expect(tokens[4]).toBe(6); // cancelling
    expect(tokens[5]).toBe(0); // padding
  });
  
  it('tokenizeText sollte unbekannte Wörter mit <unk>-Token behandeln', () => {
    const vocabulary = new Map<string, number>([
      ['<pad>', 0],
      ['<unk>', 1],
      ['bluetooth', 2]
    ]);
    
    const text = 'Bluetooth Gerät unbekannt';
    const maxLength = 5;
    
    const tokens = tokenizeText(text, vocabulary, maxLength);
    
    expect(tokens[0]).toBe(2); // bluetooth
    expect(tokens[1]).toBe(1); // <unk> für "Gerät"
    expect(tokens[2]).toBe(1); // <unk> für "unbekannt"
  });
  
  it('tokenizeText sollte längere Texte auf maxLength beschneiden', () => {
    const vocabulary = new Map<string, number>([
      ['<pad>', 0],
      ['<unk>', 1],
      ['wort1', 2],
      ['wort2', 3],
      ['wort3', 4],
      ['wort4', 5],
      ['wort5', 6]
    ]);
    
    const text = 'Wort1 Wort2 Wort3 Wort4 Wort5';
    const maxLength = 3;
    
    const tokens = tokenizeText(text, vocabulary, maxLength);
    
    expect(tokens.length).toBe(maxLength);
    expect(tokens[0]).toBe(2);
    expect(tokens[1]).toBe(3);
    expect(tokens[2]).toBe(4);
    // Wort4 und Wort5 sollten abgeschnitten sein
  });
});

describe('Datenaufbereitung für Transformer-Training', () => {
  it('prepareTrainingData sollte Trainingsdaten korrekt aufbereiten', async () => {
    const mockProductData = createMockProductData();
    
    const result = await prepareTrainingData({
      productData: mockProductData,
      modelConfig: {
        vocabularySize: 100,
        embeddingDimension: 32,
        maxSequenceLength: 20,
        batchSize: 2
      }
    });
    
    // Prüfe die Struktur der aufbereiteten Daten
    expect(result).toHaveProperty('config');
    expect(result).toHaveProperty('vocabulary');
    expect(result).toHaveProperty('categories');
    expect(result).toHaveProperty('categoryMap');
    expect(result).toHaveProperty('datasets');
    expect(result).toHaveProperty('metadata');
    
    // Prüfe die Konfiguration
    expect(result.config.vocabularySize).toBe(100);
    expect(result.config.embeddingDimension).toBe(32);
    expect(result.config.maxSequenceLength).toBe(20);
    expect(result.config.batchSize).toBe(2);
    
    // Prüfe Kategorien
    expect(result.categories).toContain('Elektronik');
    expect(result.categories).toContain('Auto-Zubehör');
    expect(result.categories).toContain('Sport');
    expect(result.categories).toContain('Bücher');
    
    // Prüfe Trainingsdaten
    expect(result.datasets.train.x).toBeInstanceOf(tf.Tensor);
    expect(result.datasets.train.y).toBeInstanceOf(tf.Tensor);
    expect(result.datasets.validation.x).toBeInstanceOf(tf.Tensor);
    expect(result.datasets.validation.y).toBeInstanceOf(tf.Tensor);
    
    // Prüfe Metadaten
    expect(result.metadata.totalSamples).toBe(mockProductData.length);
  });
});

describe('Transformer-Modellarchitektur', () => {
  it('createTransformerModel sollte ein gültiges TensorFlow.js-Modell erstellen', () => {
    const config: ModelConfig = {
      ...DEFAULT_CONFIG,
      numCategories: 4,
      vocabularySize: 100,
      embeddingDimension: 32,
      numHeads: 2,
      feedForwardDimension: 64,
      numLayers: 1,
      maxSequenceLength: 20,
      batchSize: 2,
      epochs: 2,
      learningRate: 0.001
    };
    
    const model = createTransformerModel(config);
    
    // Prüfe, ob ein gültiges TensorFlow.js-Modell erstellt wurde
    expect(model).toBeInstanceOf(tf.LayersModel);
    expect(model.inputs.length).toBe(1);
    expect(model.outputs.length).toBe(1);
    
    // Prüfe das Input-Shape
    expect(model.inputs[0].shape).toEqual([null, config.maxSequenceLength]);
    
    // Prüfe das Output-Shape (sollte die Anzahl der Kategorien sein)
    expect(model.outputs[0].shape).toEqual([null, config.numCategories]);
    
    // Prüfe, ob das Modell kompiliert wurde
    expect(model.optimizer).toBeDefined();
  });
  
  it('sollte eine End-to-End-Inferenz durchführen können', async () => {
    // Erstelle ein minimales Modell für den Test
    const config: ModelConfig = {
      ...DEFAULT_CONFIG,
      numCategories: 2,
      vocabularySize: 10,
      embeddingDimension: 16,
      numHeads: 1,
      feedForwardDimension: 32,
      numLayers: 1,
      maxSequenceLength: 5,
      batchSize: 1,
      epochs: 1,
      learningRate: 0.001
    };
    
    const model = createTransformerModel(config);
    
    // Erstelle einen minimalen Datensatz für 2 Kategorien
    const xData = tf.tensor2d([
      [1, 2, 3, 0, 0],  // Kategorie 0
      [4, 5, 6, 0, 0]   // Kategorie 1
    ]);
    
    const yData = tf.oneHot(tf.tensor1d([0, 1], 'int32'), 2);
    
    // Führe ein minimales Training durch
    await model.fit(xData, yData, { epochs: 1, batchSize: 1 });
    
    // Führe eine Vorhersage durch
    const prediction = model.predict(tf.tensor2d([[1, 2, 3, 0, 0]])) as tf.Tensor;
    const predData = await prediction.data();
    
    // Prüfe, ob eine gültige Vorhersage generiert wurde
    expect(predData.length).toBe(2); // Sollte 2 Wahrscheinlichkeiten haben (für 2 Kategorien)
    expect(predData[0]).toBeGreaterThanOrEqual(0);
    expect(predData[0]).toBeLessThanOrEqual(1);
    expect(predData[1]).toBeGreaterThanOrEqual(0);
    expect(predData[1]).toBeLessThanOrEqual(1);
    expect(predData[0] + predData[1]).toBeCloseTo(1, 5); // Sollte sich zu 1 addieren (Softmax)
    
    // Bereinigen
    model.dispose();
    xData.dispose();
    yData.dispose();
    prediction.dispose();
  });
});

// Zusätzliche Tests können für trainTransformerModel, evaluateModelPerformance, 
// exportTrainedModel und predictCategory implementiert werden 