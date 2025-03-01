/**
 * Konfigurationsmodul für den Helium10 MCP-Server
 * 
 * Dieses Modul lädt Konfigurationseinstellungen aus verschiedenen Quellen in der folgenden Prioritätsreihenfolge:
 * 1. Umgebungsvariablen (.env-Datei)
 * 2. Lokale Konfigurationsdatei (config.local.ts, wenn vorhanden)
 * 3. Standard-Konfigurationswerte
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

// Lade .env-Datei
dotenv.config();

// Prüfe, ob eine lokale Konfigurationsdatei existiert
let localConfig: Record<string, any> = {};
const localConfigPath = path.join(process.cwd(), 'src', 'config.local.ts');

if (fs.existsSync(localConfigPath)) {
  try {
    // Dynamischer Import der lokalen Konfigurationsdatei, falls vorhanden
    import('./config.local.js')
      .then(module => {
        localConfig = module.localConfig || {};
        console.log('Lokale Konfiguration geladen');
      })
      .catch(err => {
        console.warn('Fehler beim Laden der lokalen Konfiguration:', err.message);
      });
  } catch (error) {
    console.warn('Fehler beim Laden der lokalen Konfiguration:', (error as Error).message);
  }
}

// Funktion zum sicheren Abrufen von Umgebungsvariablen oder Fallback-Werten
function getConfig<T>(key: string, defaultValue: T, transform?: (value: string) => T): T {
  const envValue = process.env[key];
  
  if (envValue !== undefined) {
    return transform ? transform(envValue) : (envValue as unknown as T);
  }
  
  if (localConfig[key] !== undefined) {
    return localConfig[key] as T;
  }
  
  return defaultValue;
}

// Generiere einen zufälligen Schlüssel, falls keiner existiert
function generateRandomKey(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

// Basis-Verzeichnispfade
const rootDir = process.cwd();
const dataDir = path.join(rootDir, 'data');
const cacheDir = path.join(rootDir, 'cache');
const modelsDir = path.join(rootDir, 'models');

// Stelle sicher, dass erforderliche Verzeichnisse existieren
for (const dir of [dataDir, cacheDir, modelsDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Helium10 API Konfiguration
const helium10ApiConfig = {
  apiKey: process.env.HELIUM10_API_KEY || '',
  apiSecret: process.env.HELIUM10_API_SECRET || '',
  baseUrl: process.env.HELIUM10_API_URL || 'https://api.helium10.com/v1',
  timeout: parseInt(process.env.API_TIMEOUT || '30000', 10),
  defaultCacheTTL: parseInt(process.env.DEFAULT_CACHE_TTL || '86400', 10) // 24h in Sekunden
};

// Amazon API Konfiguration
const amazonApiConfig = {
  apiKey: process.env.AMAZON_API_KEY || '',
  apiSecret: process.env.AMAZON_API_SECRET || '',
  associateTag: process.env.AMAZON_ASSOCIATE_TAG || '',
  baseUrl: process.env.AMAZON_API_URL || 'https://webservices.amazon.com/paapi5',
  timeout: parseInt(process.env.API_TIMEOUT || '30000', 10),
  defaultCacheTTL: parseInt(process.env.DEFAULT_CACHE_TTL || '86400', 10) // 24h in Sekunden
};

// Datenbank-Konfiguration
const dbConfig = {
  path: process.env.DB_PATH || path.join(dataDir, 'helium10-mcp.sqlite'),
  backupDir: process.env.DB_BACKUP_DIR || path.join(dataDir, 'backups')
};

// ML-Konfiguration
const mlConfig = {
  // Modelltraining
  transformerTraining: {
    enabled: process.env.ENABLE_TRANSFORMER_TRAINING === 'true',
    maxSampleSize: parseInt(process.env.MAX_TRAINING_SAMPLE_SIZE || '1000', 10),
    defaultEpochs: parseInt(process.env.DEFAULT_TRAINING_EPOCHS || '10', 10),
    maxEpochs: parseInt(process.env.MAX_TRAINING_EPOCHS || '50', 10),
    defaultModelConfig: {
      vocabularySize: 10000,
      embeddingDimension: 128,
      numHeads: 4,
      feedForwardDimension: 256,
      numLayers: 2,
      maxSequenceLength: 100,
      batchSize: 32,
      learningRate: 0.001
    }
  },
  // Modellvorhersage
  modelPrediction: {
    modelsDir: modelsDir,
    useLatestModelByDefault: true
  },
  // Cache-Konfiguration für ML-Tools
  cache: {
    mlToolsCacheTTL: parseInt(process.env.ML_TOOLS_CACHE_TTL || '604800', 10), // 7 Tage
    modelCacheTTL: parseInt(process.env.MODEL_CACHE_TTL || '31536000', 10) // 1 Jahr
  }
};

// Server-Konfiguration
const serverConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || 'localhost',
  environment: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  version: process.env.npm_package_version || '1.0.0'
};

// Funktionen zur Datensammlung bei Serverstart
const startupScraping = {
  scrapeOnStartup: process.env.SCRAPE_ON_STARTUP === 'true',
  magnetKeywordsOnStartup: process.env.MAGNET_KEYWORDS_ON_STARTUP === 'true',
  magnetSeedKeywords: process.env.MAGNET_SEED_KEYWORDS 
    ? process.env.MAGNET_SEED_KEYWORDS.split(',').map(k => k.trim())
    : ['amazon bestseller', 'top products'],
  scrapeKnowledgeBaseOnStartup: process.env.SCRAPE_KB_ON_STARTUP === 'true'
};

// Workflow-Konfiguration
const workflowConfig = {
  maxRetries: parseInt(process.env.WORKFLOW_MAX_RETRIES || '3', 10),
  retryDelay: parseInt(process.env.WORKFLOW_RETRY_DELAY || '1000', 10), // Millisekunden
  maxConcurrentSteps: parseInt(process.env.WORKFLOW_MAX_CONCURRENT_STEPS || '5', 10)
};

// Offline-Modus-Konfiguration
const offlineMode = {
  offlineMode: process.env.OFFLINE_MODE === 'true',
  useMockData: process.env.USE_MOCK_DATA === 'true',
  mockDataDir: process.env.MOCK_DATA_DIR || path.join(dataDir, 'mock')
};

// RAG-Konfiguration
const ragConfig = {
  defaultModel: process.env.RAG_DEFAULT_MODEL || 'local',
  knowledgeBasePath: process.env.KNOWLEDGE_BASE_PATH || path.join(dataDir, 'knowledge'),
  huggingFaceApiKey: process.env.HUGGINGFACE_API_KEY || '',
  embeddingModel: process.env.EMBEDDING_MODEL || 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2',
  maxChunkSize: parseInt(process.env.MAX_CHUNK_SIZE || '512', 10),
  chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || '50', 10)
};

// Gesamtkonfiguration exportieren
export const config = {
  ...serverConfig,
  ...offlineMode,
  rootDir,
  dataDir,
  cacheDir,
  modelsDir,
  helium10Api: helium10ApiConfig,
  amazonApi: amazonApiConfig,
  db: dbConfig,
  workflow: workflowConfig,
  rag: ragConfig,
  ml: mlConfig,
  ...startupScraping
};

// Exportiere die Konfiguration als Standard-Export
export default config;
