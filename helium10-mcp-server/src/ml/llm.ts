/**
 * LLM-Integration für Helium10 MCP-Server
 * 
 * Dieses Modul integriert das DeepSeek-R1-Distill-Llama-8B Modell
 * für fortschrittliche Textgenerierung und -analyse.
 */

import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../utils/logger';
import { FileSystemCache } from '../cache/file-cache';
import { spawn } from 'child_process';

// LLM-Cache
const llmCache = new FileSystemCache('llm-cache');

// Konfiguration für die LLM-Integration
export interface LLMConfig {
  modelName: string;
  maxLength: number;
  temperature: number;
  topP: number;
  useCache: boolean;
  pythonPath: string;
  modelsDir: string;
}

// Standard-Konfiguration
export const DEFAULT_LLM_CONFIG: LLMConfig = {
  modelName: 'unsloth/DeepSeek-R1-Distill-Llama-8B',
  maxLength: 100,
  temperature: 0.7,
  topP: 0.9,
  useCache: true,
  pythonPath: process.env.PYTHON_PATH || 'python3',
  modelsDir: path.join(process.cwd(), 'models', 'llm')
};

/**
 * Überprüft, ob die Python-Umgebung korrekt eingerichtet ist
 * und installiert bei Bedarf fehlende Abhängigkeiten
 */
export async function setupLLMEnvironment(config: Partial<LLMConfig> = {}): Promise<boolean> {
  const mergedConfig = { ...DEFAULT_LLM_CONFIG, ...config };
  logger.info('Überprüfe LLM-Umgebung...');
  
  try {
    // Stelle sicher, dass das models-Verzeichnis existiert
    if (!fs.existsSync(mergedConfig.modelsDir)) {
      fs.mkdirSync(mergedConfig.modelsDir, { recursive: true });
      logger.info(`Modellverzeichnis erstellt: ${mergedConfig.modelsDir}`);
    }
    
    // Überprüfe Python-Version und installierte Pakete
    return new Promise((resolve, reject) => {
      const process = spawn(mergedConfig.pythonPath, [
        '-c',
        'import sys; import pkg_resources; ' +
        'required = ["transformers", "torch", "accelerate", "sentencepiece", "protobuf", "einops"]; ' +
        'installed = {pkg.key for pkg in pkg_resources.working_set}; ' +
        'missing = set(required) - installed; ' +
        'if missing: print("missing:" + ",".join(missing)); ' +
        'else: print("all_installed"); ' +
        'print(f"python_version:{sys.version}")'
      ]);
      
      let output = '';
      
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.on('close', (code) => {
        if (code !== 0) {
          logger.error(`Python-Überprüfung fehlgeschlagen mit Code ${code}`);
          reject(new Error(`Python-Überprüfung fehlgeschlagen mit Code ${code}`));
          return;
        }
        
        logger.debug(`Python-Umgebung Prüfergebnis: ${output}`);
        
        if (output.includes('missing:')) {
          const missingPackages = output.split('missing:')[1].split('\n')[0].split(',');
          logger.warn(`Fehlende Python-Pakete: ${missingPackages.join(', ')}`);
          
          // Installiere fehlende Pakete
          const installProcess = spawn(mergedConfig.pythonPath, [
            '-m', 'pip', 'install', ...missingPackages
          ]);
          
          installProcess.on('close', (installCode) => {
            if (installCode === 0) {
              logger.info('Fehlende Pakete erfolgreich installiert');
              resolve(true);
            } else {
              logger.error('Fehler bei der Installation der Pakete');
              reject(new Error('Fehler bei der Installation der Pakete'));
            }
          });
        } else {
          logger.info('Alle erforderlichen Python-Pakete sind installiert');
          resolve(true);
        }
      });
    });
  } catch (error) {
    logger.error('Fehler bei der Überprüfung der LLM-Umgebung', error);
    return false;
  }
}

/**
 * Führt eine Textgenerierung mit dem LLM-Modell durch
 * 
 * @param prompt Der Eingabetext für das Modell
 * @param config Optionale Konfiguration für das Modell
 * @returns Das Generierungsergebnis
 */
export async function generateText(
  prompt: string,
  config: Partial<LLMConfig> = {}
): Promise<string> {
  const mergedConfig = { ...DEFAULT_LLM_CONFIG, ...config };
  
  // Prüfe Cache, wenn aktiviert
  if (mergedConfig.useCache) {
    const cacheKey = `llm:${mergedConfig.modelName}:${mergedConfig.temperature}:${mergedConfig.maxLength}:${prompt}`;
    const cachedResult = await llmCache.get(cacheKey);
    
    if (cachedResult) {
      logger.debug('Verwende zwischengespeichertes LLM-Ergebnis');
      return cachedResult;
    }
  }
  
  try {
    logger.info(`Generiere Text mit ${mergedConfig.modelName}...`);
    
    // Erstelle temporäre Python-Datei für die Ausführung
    const tempScriptPath = path.join(mergedConfig.modelsDir, 'temp_llm_script.py');
    const pythonScript = `
import sys
from transformers import pipeline

prompt = """${prompt.replace(/"/g, '\\"')}"""

pipe = pipeline("text-generation", model="${mergedConfig.modelName}")
result = pipe(prompt, max_length=${mergedConfig.maxLength}, do_sample=True, temperature=${mergedConfig.temperature}, top_p=${mergedConfig.topP})

print(result[0]['generated_text'])
`;

    fs.writeFileSync(tempScriptPath, pythonScript);
    
    // Führe Python-Skript aus
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn(mergedConfig.pythonPath, [tempScriptPath]);
      
      let result = '';
      let errorOutput = '';
      
      pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      pythonProcess.on('close', async (code) => {
        // Lösche temporäres Skript
        try {
          fs.unlinkSync(tempScriptPath);
        } catch (e) {
          logger.warn(`Konnte temporäre Datei nicht löschen: ${e.message}`);
        }
        
        if (code !== 0) {
          logger.error(`LLM-Prozess fehlgeschlagen mit Code ${code}: ${errorOutput}`);
          reject(new Error(`LLM-Prozess fehlgeschlagen: ${errorOutput}`));
          return;
        }
        
        // Speichere im Cache, wenn aktiviert
        if (mergedConfig.useCache) {
          const cacheKey = `llm:${mergedConfig.modelName}:${mergedConfig.temperature}:${mergedConfig.maxLength}:${prompt}`;
          await llmCache.set(cacheKey, result, 24 * 60 * 60); // 24 Stunden
        }
        
        resolve(result.trim());
      });
    });
  } catch (error) {
    logger.error('Fehler bei der Textgenerierung', error);
    throw new Error(`Fehler bei der Textgenerierung: ${error.message}`);
  }
}

/**
 * Generiert Antworten im Chat-Format mit dem LLM-Modell
 * 
 * @param messages Die Chat-Nachrichten im Format [{role: 'user', content: 'Nachricht'}]
 * @param config Optionale Konfiguration für das Modell
 * @returns Die generierte Antwort
 */
export async function generateChatResponse(
  messages: Array<{role: string, content: string}>,
  config: Partial<LLMConfig> = {}
): Promise<string> {
  const mergedConfig = { ...DEFAULT_LLM_CONFIG, ...config };
  
  // Einfache Serialisierung der Nachrichten für den Cache-Schlüssel
  const messagesString = JSON.stringify(messages);
  
  // Prüfe Cache, wenn aktiviert
  if (mergedConfig.useCache) {
    const cacheKey = `llm-chat:${mergedConfig.modelName}:${mergedConfig.temperature}:${mergedConfig.maxLength}:${messagesString}`;
    const cachedResult = await llmCache.get(cacheKey);
    
    if (cachedResult) {
      logger.debug('Verwende zwischengespeichertes Chat-Ergebnis');
      return cachedResult;
    }
  }
  
  try {
    logger.info(`Generiere Chat-Antwort mit ${mergedConfig.modelName}...`);
    
    // Erstelle temporäre Python-Datei für die Ausführung
    const tempScriptPath = path.join(mergedConfig.modelsDir, 'temp_llm_chat.py');
    const pythonScript = `
import sys
import json
from transformers import pipeline

messages = ${JSON.stringify(messages)}

pipe = pipeline("text-generation", model="${mergedConfig.modelName}")
result = pipe(messages, max_length=${mergedConfig.maxLength}, do_sample=True, temperature=${mergedConfig.temperature}, top_p=${mergedConfig.topP})

print(result[0]['generated_text'])
`;

    fs.writeFileSync(tempScriptPath, pythonScript);
    
    // Führe Python-Skript aus
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn(mergedConfig.pythonPath, [tempScriptPath]);
      
      let result = '';
      let errorOutput = '';
      
      pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      pythonProcess.on('close', async (code) => {
        // Lösche temporäres Skript
        try {
          fs.unlinkSync(tempScriptPath);
        } catch (e) {
          logger.warn(`Konnte temporäre Datei nicht löschen: ${e.message}`);
        }
        
        if (code !== 0) {
          logger.error(`LLM-Chat-Prozess fehlgeschlagen mit Code ${code}: ${errorOutput}`);
          reject(new Error(`LLM-Chat-Prozess fehlgeschlagen: ${errorOutput}`));
          return;
        }
        
        // Extrahiere nur die Antwort (ohne die ursprüngliche Benutzerfrage)
        let response = result.trim();
        
        // Speichere im Cache, wenn aktiviert
        if (mergedConfig.useCache) {
          const cacheKey = `llm-chat:${mergedConfig.modelName}:${mergedConfig.temperature}:${mergedConfig.maxLength}:${messagesString}`;
          await llmCache.set(cacheKey, response, 24 * 60 * 60); // 24 Stunden
        }
        
        resolve(response);
      });
    });
  } catch (error) {
    logger.error('Fehler bei der Chat-Generierung', error);
    throw new Error(`Fehler bei der Chat-Generierung: ${error.message}`);
  }
} 