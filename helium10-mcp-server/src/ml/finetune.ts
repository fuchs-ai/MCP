/**
 * Feintuning-Funktionen für das DeepSeek-R1-Distill-Llama-8B-Modell
 * 
 * Dieses Modul ermöglicht das Feintuning des LLM-Modells auf spezifische E-Commerce-Daten.
 */

import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { logger } from '../utils/logger';
import { LLMConfig, DEFAULT_LLM_CONFIG } from './llm';
import { FileSystemCache } from '../cache/file-cache';

// Cache für Feintuning-Daten und -Modelle
const finetuneCache = new FileSystemCache('finetune-cache');

// Feintuning-Konfiguration
export interface FinetuneConfig extends LLMConfig {
  trainingEpochs: number;
  batchSize: number;
  learningRate: number;
  weightDecay: number;
  warmupSteps: number;
  useLoRA: boolean;
  loraRank: number;
  loraAlpha: number;
  quantizeTo8bit: boolean;
  gradientAccumulationSteps: number;
  saveTotalLimit: number;
  validationSplit: number;
  seedValue: number;
}

// Standard-Feintuning-Konfiguration
export const DEFAULT_FINETUNE_CONFIG: FinetuneConfig = {
  ...DEFAULT_LLM_CONFIG,
  trainingEpochs: 3,
  batchSize: 4,
  learningRate: 2e-5,
  weightDecay: 0.01,
  warmupSteps: 50,
  useLoRA: true,  // Parameter-effizientes Feintuning
  loraRank: 8,
  loraAlpha: 16,
  quantizeTo8bit: true,
  gradientAccumulationSteps: 4,
  saveTotalLimit: 2,
  validationSplit: 0.1,
  seedValue: 42
};

// Datenformat für Trainingsdatensätze
export interface TrainingDataset {
  name: string;
  category: string;
  description: string;
  examples: Array<{
    input: string;
    output: string;
  }>;
  createdAt: string;
}

/**
 * Bereitet Trainingsdaten für das Feintuning vor
 * 
 * @param dataset Trainingsdatensatz
 * @param config Feintuning-Konfiguration
 * @returns Pfad zum aufbereiteten Datensatz
 */
export async function prepareTrainingData(
  dataset: TrainingDataset,
  config: Partial<FinetuneConfig> = {}
): Promise<string> {
  const mergedConfig = { ...DEFAULT_FINETUNE_CONFIG, ...config };
  logger.info(`Bereite Trainingsdaten für Datensatz "${dataset.name}" vor...`);
  
  try {
    // Erstelle Datensatz-Verzeichnis, falls es nicht existiert
    const datasetsDir = path.join(mergedConfig.modelsDir, 'datasets');
    if (!fs.existsSync(datasetsDir)) {
      fs.mkdirSync(datasetsDir, { recursive: true });
    }
    
    // Erstelle JSON-Datendatei im JSONL-Format für Feintuning
    const datasetPath = path.join(datasetsDir, `${dataset.name.replace(/\s+/g, '_')}.jsonl`);
    
    const formattedExamples = dataset.examples.map(example => {
      // Formatiere die Daten im korrekten Chatformat für das Modell
      const formattedData = {
        messages: [
          { role: "system", content: "Du bist ein Experte für die Erstellung optimierter Amazon-Produktbeschreibungen in der Kategorie " + dataset.category + "." },
          { role: "user", content: example.input },
          { role: "assistant", content: example.output }
        ]
      };
      return JSON.stringify(formattedData);
    });
    
    // Schreibe die Daten im JSONL-Format
    fs.writeFileSync(datasetPath, formattedExamples.join('\n'));
    
    logger.info(`Trainingsdatensatz mit ${dataset.examples.length} Beispielen erstellt: ${datasetPath}`);
    
    // Erstelle Validierungsdatensatz, wenn erforderlich
    if (mergedConfig.validationSplit > 0 && dataset.examples.length > 10) {
      const validationSize = Math.max(2, Math.floor(dataset.examples.length * mergedConfig.validationSplit));
      const validationPath = path.join(datasetsDir, `${dataset.name.replace(/\s+/g, '_')}_validation.jsonl`);
      
      // Nehme zufällige Beispiele für die Validierung
      const shuffled = [...formattedExamples];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      
      const validationExamples = shuffled.slice(0, validationSize);
      fs.writeFileSync(validationPath, validationExamples.join('\n'));
      
      logger.info(`Validierungsdatensatz mit ${validationSize} Beispielen erstellt: ${validationPath}`);
    }
    
    return datasetPath;
  } catch (error) {
    logger.error('Fehler bei der Vorbereitung der Trainingsdaten', error);
    throw new Error(`Fehler bei der Vorbereitung der Trainingsdaten: ${error.message}`);
  }
}

/**
 * Führt das Feintuning des LLM-Modells durch
 * 
 * @param datasetPath Pfad zum Trainingsdatensatz
 * @param outputModelName Name des feingetuned Modells
 * @param config Feintuning-Konfiguration
 * @returns Informationen zum feingetuned Modell
 */
export async function finetuneLLMModel(
  datasetPath: string,
  outputModelName: string,
  config: Partial<FinetuneConfig> = {}
): Promise<object> {
  const mergedConfig = { ...DEFAULT_FINETUNE_CONFIG, ...config };
  logger.info(`Starte Feintuning des Modells mit Datensatz ${datasetPath}...`);
  
  try {
    // Erstelle Ausgabeverzeichnis für das Modell
    const outputModelDir = path.join(mergedConfig.modelsDir, outputModelName);
    if (!fs.existsSync(outputModelDir)) {
      fs.mkdirSync(outputModelDir, { recursive: true });
    }
    
    // Erstelle temporäre Python-Datei für das Feintuning
    const tempScriptPath = path.join(mergedConfig.modelsDir, 'finetune_script.py');
    
    // Validierungsdatensatz bestimmen
    const validationPath = datasetPath.replace('.jsonl', '_validation.jsonl');
    const hasValidation = fs.existsSync(validationPath);
    
    const pythonScript = `
import os
import sys
import torch
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
    Trainer,
    DataCollatorForLanguageModeling,
    BitsAndBytesConfig
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from datasets import load_dataset
import transformers

# Setze Umgebungsvariablen für Stabilität
os.environ["TOKENIZERS_PARALLELISM"] = "false"

# Konfiguration
base_model = "${mergedConfig.modelName}"
dataset_path = "${datasetPath}"
validation_path = "${validationPath}"
has_validation = ${hasValidation}
output_dir = "${outputModelDir}"
num_train_epochs = ${mergedConfig.trainingEpochs}
learning_rate = ${mergedConfig.learningRate}
weight_decay = ${mergedConfig.weightDecay}
warmup_steps = ${mergedConfig.warmupSteps}
batch_size = ${mergedConfig.batchSize}
gradient_accumulation_steps = ${mergedConfig.gradientAccumulationSteps}
seed = ${mergedConfig.seedValue}
use_lora = ${mergedConfig.useLoRA}
lora_rank = ${mergedConfig.loraRank}
lora_alpha = ${mergedConfig.loraAlpha}
quantize = ${mergedConfig.quantizeTo8bit}

print(f"Feintuning von {base_model} mit Datensatz {dataset_path}")
print(f"Ausgabe-Verzeichnis: {output_dir}")

# Lade Datensatz
if has_validation:
    print(f"Verwende separaten Validierungsdatensatz: {validation_path}")
    train_dataset = load_dataset("json", data_files=dataset_path, split="train")
    eval_dataset = load_dataset("json", data_files=validation_path, split="train")
else:
    dataset = load_dataset("json", data_files=dataset_path)
    # Teile Datensatz in Training und Validierung auf
    splits = dataset["train"].train_test_split(test_size=0.1, seed=seed)
    train_dataset = splits["train"]
    eval_dataset = splits["test"]

print(f"Trainingsdatensatzgröße: {len(train_dataset)}")
print(f"Validierungsdatensatzgröße: {len(eval_dataset)}")

# Quantisierung konfigurieren
compute_dtype = torch.float16
if quantize:
    print("Verwende 8-Bit-Quantisierung")
    quantization_config = BitsAndBytesConfig(
        load_in_8bit=True,
        llm_int8_threshold=6.0,
        llm_int8_has_fp16_weight=False
    )
else:
    quantization_config = None

# Tokenizer laden
tokenizer = AutoTokenizer.from_pretrained(base_model)
tokenizer.pad_token = tokenizer.eos_token

# Modell laden
model = AutoModelForCausalLM.from_pretrained(
    base_model,
    quantization_config=quantization_config,
    device_map="auto",
    torch_dtype=compute_dtype
)

# PEFT/LoRA Konfiguration
if use_lora:
    print(f"Verwende LoRA mit Rang {lora_rank}, Alpha {lora_alpha}")
    if quantize:
        model = prepare_model_for_kbit_training(model)
    
    lora_config = LoraConfig(
        r=lora_rank,
        lora_alpha=lora_alpha,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM"
    )
    
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

# Trainingsfunktion, die Beispiele in das richtige Format konvertiert
def formatting_func(examples):
    texts = []
    for i in range(len(examples["messages"])):
        texts.append(tokenizer.apply_chat_template(examples["messages"][i], tokenize=False))
    return {"text": texts}

# Formatiere Datensätze
train_dataset = train_dataset.map(formatting_func, batched=True)
eval_dataset = eval_dataset.map(formatting_func, batched=True)

# Training Arguments
training_args = TrainingArguments(
    output_dir=output_dir,
    num_train_epochs=num_train_epochs,
    per_device_train_batch_size=batch_size,
    per_device_eval_batch_size=batch_size,
    gradient_accumulation_steps=gradient_accumulation_steps,
    evaluation_strategy="epoch",
    save_strategy="epoch",
    learning_rate=learning_rate,
    weight_decay=weight_decay,
    warmup_steps=warmup_steps,
    save_total_limit=2,
    logging_steps=10,
    logging_dir=f"{output_dir}/logs",
    report_to="none",
    push_to_hub=False,
    fp16=True,
    seed=seed
)

# Daten-Collator für das Training
data_collator = DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False)

# Trainer initialisieren
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
    data_collator=data_collator
)

# Modell trainieren
print("Starte Training...")
trainer.train()

# Modell und Tokenizer speichern
print(f"Speichere feingetuntes Modell in {output_dir}")
model.save_pretrained(output_dir)
tokenizer.save_pretrained(output_dir)

# Abschlussstatistiken in Datei schreiben
with open(f"{output_dir}/training_stats.txt", "w") as f:
    f.write(f"Basismodell: {base_model}\\n")
    f.write(f"Trainingsdatensatz: {dataset_path}\\n")
    f.write(f"Trainingsdatensatzgröße: {len(train_dataset)}\\n")
    f.write(f"Validierungsdatensatzgröße: {len(eval_dataset)}\\n")
    f.write(f"Trainierte Epochen: {num_train_epochs}\\n")
    f.write(f"Batch-Größe: {batch_size}\\n")
    f.write(f"Learning Rate: {learning_rate}\\n")
    
    # Wenn Validierungsergebnisse verfügbar sind
    if hasattr(trainer, "state"):
        if hasattr(trainer.state, "log_history") and trainer.state.log_history:
            last_eval = None
            for entry in trainer.state.log_history:
                if "eval_loss" in entry:
                    last_eval = entry
            
            if last_eval:
                f.write(f"Finale Validierungs-Loss: {last_eval['eval_loss']}\\n")

print("Feintuning abgeschlossen!")
`;

    fs.writeFileSync(tempScriptPath, pythonScript);
    
    // Führe Python-Skript aus
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn(mergedConfig.pythonPath, [tempScriptPath]);
      
      let output = '';
      let errorOutput = '';
      
      pythonProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        logger.debug(`Feintuning-Fortschritt: ${chunk.trim()}`);
      });
      
      pythonProcess.stderr.on('data', (data) => {
        const chunk = data.toString();
        errorOutput += chunk;
        logger.warn(`Feintuning-Warnungen: ${chunk.trim()}`);
      });
      
      pythonProcess.on('close', async (code) => {
        // Lösche temporäres Skript
        try {
          fs.unlinkSync(tempScriptPath);
        } catch (e) {
          logger.warn(`Konnte temporäre Datei nicht löschen: ${e.message}`);
        }
        
        if (code !== 0) {
          logger.error(`Feintuning fehlgeschlagen mit Code ${code}: ${errorOutput}`);
          reject(new Error(`Feintuning fehlgeschlagen: ${errorOutput}`));
          return;
        }
        
        // Lese Trainingsstatistiken
        let trainingStats = {};
        try {
          const statsPath = path.join(outputModelDir, 'training_stats.txt');
          if (fs.existsSync(statsPath)) {
            const statsContent = fs.readFileSync(statsPath, 'utf8');
            trainingStats = statsContent.split('\n').reduce((acc, line) => {
              const parts = line.split(': ');
              if (parts.length === 2) {
                acc[parts[0].trim()] = parts[1].trim();
              }
              return acc;
            }, {});
          }
        } catch (error) {
          logger.warn(`Konnte Trainingsstatistiken nicht lesen: ${error.message}`);
        }
        
        const result = {
          modelName: outputModelName,
          modelPath: outputModelDir,
          baseModel: mergedConfig.modelName,
          trainingDataset: datasetPath,
          completedAt: new Date().toISOString(),
          trainingStats,
          parameters: {
            epochs: mergedConfig.trainingEpochs,
            batchSize: mergedConfig.batchSize,
            learningRate: mergedConfig.learningRate,
            useLoRA: mergedConfig.useLoRA,
            loraRank: mergedConfig.useLoRA ? mergedConfig.loraRank : null
          }
        };
        
        // Speichere eine Zusammenfassung im Cache für spätere Referenz
        await finetuneCache.set(`finetuned_model:${outputModelName}`, result, 365 * 24 * 60 * 60); // 1 Jahr
        
        resolve(result);
      });
    });
  } catch (error) {
    logger.error('Fehler beim Feintuning des Modells', error);
    throw new Error(`Fehler beim Feintuning des Modells: ${error.message}`);
  }
}

/**
 * Erstellt ein Dataset aus Amazon-Produkten für das Feintuning
 * 
 * @param category Produktkategorie
 * @param datasetName Name des zu erstellenden Datasets
 * @param sampleSize Anzahl der zu sammelnden Produkte
 * @param marketplace Amazon Marketplace
 * @returns Informationen zum erstellten Dataset
 */
export async function createProductDataset(
  category: string,
  datasetName: string,
  sampleSize: number = 100,
  marketplace: string = 'amazon.de'
): Promise<TrainingDataset> {
  logger.info(`Erstelle Trainingsdatensatz für Kategorie "${category}" mit ${sampleSize} Produkten`);
  
  try {
    // Importiere Amazon API dynamisch, um Zirkelbezüge zu vermeiden
    const { searchProductsByCategory } = await import('../apis/amazon-api');
    
    // Suche Produkte in der angegebenen Kategorie
    const products = await searchProductsByCategory(category, sampleSize, marketplace);
    
    if (!products || products.length === 0) {
      throw new Error(`Keine Produkte in der Kategorie "${category}" gefunden`);
    }
    
    logger.info(`${products.length} Produkte gefunden für das Dataset`);
    
    // Erstelle Trainingsbeispiele aus den Produkten
    const examples = [];
    
    for (const product of products) {
      if (product.title && product.description && product.bulletPoints && product.bulletPoints.length > 0) {
        // Erstelle Input-Prompt (was das Modell sehen wird)
        const input = `Erstelle eine hochwertige Produktbeschreibung und überzeugene Bulletpoints für folgendes Amazon-Produkt:
Titel: ${product.title}
Kategorie: ${category}
Marktplatz: ${marketplace}

Stil: Überzeugend und verkaufsfördernd
Keywords: ${category}, ${product.title.split(' ').slice(0, 3).join(', ')}`;

        // Erstelle Output (was das Modell generieren soll)
        const output = `Hier ist eine optimierte Produktbeschreibung:

${product.description}

Bullet Points:
${product.bulletPoints.join('\n')}`;

        examples.push({ input, output });
      }
    }
    
    // Erstelle und gib das Dataset zurück
    const dataset: TrainingDataset = {
      name: datasetName,
      category,
      description: `Trainingsdatensatz für Amazon-Produkte in der Kategorie ${category} auf ${marketplace}`,
      examples,
      createdAt: new Date().toISOString()
    };
    
    // Speichere das Dataset im Cache
    await finetuneCache.set(`dataset:${datasetName}`, dataset, 365 * 24 * 60 * 60); // 1 Jahr
    
    logger.info(`Trainingsdatensatz "${datasetName}" mit ${examples.length} Beispielen erstellt`);
    
    return dataset;
  } catch (error) {
    logger.error('Fehler beim Erstellen des Trainingsdatensatzes', error);
    throw new Error(`Fehler beim Erstellen des Trainingsdatensatzes: ${error.message}`);
  }
}

/**
 * Generiere Text mit einem feingetuned Modell
 * 
 * @param prompt Der Eingabetext für das Modell
 * @param modelName Name des feingetuned Modells
 * @param config Optionale Konfiguration
 * @returns Das Generierungsergebnis
 */
export async function generateWithFinetunedModel(
  prompt: string,
  modelName: string,
  config: Partial<LLMConfig> = {}
): Promise<string> {
  const mergedConfig = { ...DEFAULT_LLM_CONFIG, ...config };
  logger.info(`Generiere Text mit feingetuntem Modell ${modelName}...`);
  
  const modelDir = path.join(mergedConfig.modelsDir, modelName);
  if (!fs.existsSync(modelDir)) {
    throw new Error(`Feingetuntes Modell ${modelName} wurde nicht gefunden`);
  }
  
  try {
    // Erstelle temporäre Python-Datei für die Ausführung
    const tempScriptPath = path.join(mergedConfig.modelsDir, 'finetune_generate.py');
    const pythonScript = `
import sys
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline

model_path = "${modelDir}"
prompt = """${prompt.replace(/"/g, '\\"')}"""

tokenizer = AutoTokenizer.from_pretrained(model_path)
tokenizer.pad_token = tokenizer.eos_token

# Einzelne Nachricht für Chat-Modell formatieren
messages = [{"role": "user", "content": prompt}]
prompt_formatted = tokenizer.apply_chat_template(messages, tokenize=False)

# Lade Modell und erstelle Pipeline
pipe = pipeline(
    "text-generation",
    model=model_path,
    tokenizer=tokenizer,
    device_map="auto"
)

# Generiere Text
result = pipe(
    prompt_formatted,
    max_length=${mergedConfig.maxLength},
    do_sample=True,
    temperature=${mergedConfig.temperature},
    top_p=${mergedConfig.topP},
    pad_token_id=tokenizer.eos_token_id
)

# Extrahiere nur die generierte Antwort
response = result[0]['generated_text']
if "<|assistant|>" in response:
    # Trenne den Assistententeil von der Eingabe
    assistant_part = response.split("<|assistant|>")[1]
    # Entferne eventuelles End-of-Turn-Token
    if "<|endoftext|>" in assistant_part:
        assistant_part = assistant_part.split("<|endoftext|>")[0]
    print(assistant_part.strip())
else:
    print(response)
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
          logger.error(`Textgenerierung mit feingetuntem Modell fehlgeschlagen mit Code ${code}: ${errorOutput}`);
          reject(new Error(`Textgenerierung fehlgeschlagen: ${errorOutput}`));
          return;
        }
        
        resolve(result.trim());
      });
    });
  } catch (error) {
    logger.error('Fehler bei der Textgenerierung mit feingetuntem Modell', error);
    throw new Error(`Fehler bei der Textgenerierung: ${error.message}`);
  }
}

/**
 * Listet alle verfügbaren feingetuned Modelle auf
 * 
 * @param config Optionale Konfiguration
 * @returns Liste der feingetuned Modelle
 */
export async function listFinetunedModels(
  config: Partial<LLMConfig> = {}
): Promise<object[]> {
  const mergedConfig = { ...DEFAULT_LLM_CONFIG, ...config };
  logger.info('Liste verfügbare feingetuned Modelle auf...');
  
  try {
    const modelsDir = mergedConfig.modelsDir;
    
    if (!fs.existsSync(modelsDir)) {
      return [];
    }
    
    // Suche nach Unterverzeichnissen, die Modelle enthalten
    const potentialModels = fs.readdirSync(modelsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    const models = [];
    
    for (const modelName of potentialModels) {
      const modelPath = path.join(modelsDir, modelName);
      
      // Prüfe, ob es sich um ein Hugging Face-Modell handelt
      if (fs.existsSync(path.join(modelPath, 'config.json'))) {
        // Versuche, Modellinfo aus dem Cache abzurufen
        const cachedInfo = await finetuneCache.get(`finetuned_model:${modelName}`);
        
        if (cachedInfo) {
          models.push(cachedInfo);
        } else {
          // Basierend auf dem Vorhandensein von Dateien ein minimales Modellinfo erstellen
          models.push({
            modelName,
            modelPath,
            baseModel: 'unknown',
            completedAt: fs.statSync(modelPath).mtime.toISOString()
          });
        }
      }
    }
    
    return models;
  } catch (error) {
    logger.error('Fehler beim Auflisten der feingetuned Modelle', error);
    throw new Error(`Fehler beim Auflisten der feingetuned Modelle: ${error.message}`);
  }
} 