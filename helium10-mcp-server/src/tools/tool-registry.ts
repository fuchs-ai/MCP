import { Express } from 'express';
import { logger } from '../utils/logger';
import { scrapeKnowledgeBaseTool, scrapeProductDataTool } from './scraping-tools';
import { askHelium10Tool } from './knowledge-tools';
import { magnetKeywordResearchTool } from './magnet-tools';
import { createBackupTool } from './backup-tools';
import { vollständigeProduktrechercheTool, konkurrenzanalyseTool, listingOptimierungTool } from './integrated-tools';
import { 
  collectProductTrainingDataTool, 
  trainProductCategoryModelTool, 
  classifyProductCategoryTool,
  completeMLWorkflowTool
} from './ml-tools';
import {
  initializeLLMEnvironmentTool,
  generateLLMTextTool,
  generateLLMChatResponseTool,
  analyzeLLMProductTool,
  generateProductDescriptionTool
} from './llm-tools';
import {
  createProductDatasetTool,
  finetuneLLMModelTool,
  generateWithFinetunedModelTool,
  generateProductDescriptionWithFinetunedModelTool,
  listFinetunedModelsTool,
  completeFineTuningWorkflowTool
} from './finetune-tools';
import {
  translateTextTool,
  generateMultilingualTextTool,
  generateMultilingualProductDescriptionTool,
  createPromptTemplateTool,
  translatePromptTemplateTool,
  listPromptTemplatesTool,
  listSupportedLanguagesTool,
  translateProductForMarketplacesTool
} from './multilingual-tools';
import {
  createTemplatePromptTool,
  updateTemplatePromptTool,
  deleteTemplatePromptTool,
  listTemplatePromptsTool,
  getTemplatePromptTool,
  generateWithTemplatePromptTool,
  createTemplateCategoryTool,
  verifyTemplatePromptTool,
  abTestTemplatePromptsTool
} from './template-tools';
import {
  createToolArtifactTool,
  executeToolArtifactTool,
  approveToolExecutionTool,
  getToolResultsTool,
  listArtifactsTool,
  cleanupArtifactDataTool,
  createWorkflowArtifactTool,
  executeWorkflowArtifactTool
} from './artifact-tools';
import {
  createABTestTool,
  executeABTestTool,
  getABTestResultsTool,
  analyzeABTestResultsTool,
  listABTestsTool,
  updateABTestTool,
  deleteABTestTool,
  completeABTestWorkflowTool
} from './ab-testing-tools';

const registeredTools = new Map();
const toolDescriptions = new Map();

/**
 * Registriert alle verfügbaren Tools beim Express-Server
 */
export async function registerTools(app: Express): Promise<void> {
  logger.info('Registriere MCP-Tools...');

  // Hilfsfunktion zum Registrieren eines Tools
  const registerTool = (name: string, handler: Function, description: string) => {
    if (app.locals.tools === undefined) {
      app.locals.tools = {};
    }
    
    app.locals.tools[name] = handler;
    registeredTools.set(name, handler);
    toolDescriptions.set(name, description);
    
    logger.debug(`Tool registriert: ${name}`);
  };
  
  // Scraping-Tools
  registerTool('scrape_product_data', scrapeProductDataTool, 'Extrahiert Produktdaten von einer Amazon-Produktseite');
  registerTool('scrape_knowledge_base', scrapeKnowledgeBaseTool, 'Erfasst Wissen aus externen Quellen');
  
  // Knowledge-Tools
  registerTool('ask_helium10', askHelium10Tool, 'Stellt eine Frage an die Helium10-Wissensdatenbank');
  
  // Integration-Tools
  registerTool('complete_product_research', vollständigeProduktrechercheTool, 'Führt eine vollständige Produktrecherche mit Magnet und X-Ray durch');
  registerTool('competitor_analysis', konkurrenzanalyseTool, 'Führt eine umfassende Konkurrenzanalyse für mehrere ASINs durch');
  registerTool('listing_optimization', listingOptimierungTool, 'Optimiert ein Amazon-Listing basierend auf Schlüsselwort und Konkurrenzanalyse');
  
  // Keyword-Tools
  registerTool('magnet_keyword_research', magnetKeywordResearchTool, 'Führt eine Keyword-Recherche mit Helium10 Magnet durch');

  // Backup-Tools
  registerTool('create_backup', createBackupTool, 'Erstellt ein Backup der MCP-Daten');
  
  // ML-Tools
  registerTool('collect_product_training_data', collectProductTrainingDataTool, 'Sammelt Trainingsdaten für die Produktkategorisierung');
  registerTool('train_product_category_model', trainProductCategoryModelTool, 'Trainiert ein Modell zur Produktkategorisierung');
  registerTool('classify_product_category', classifyProductCategoryTool, 'Klassifiziert die Kategorie eines Produkts');
  registerTool('complete_ml_workflow', completeMLWorkflowTool, 'Führt den kompletten ML-Workflow aus: Datensammlung, Training, Klassifikation');
  
  // LLM-Tools
  registerTool('initialize_llm_environment', initializeLLMEnvironmentTool, 'Initialisiert die LLM-Umgebung');
  registerTool('generate_text', generateLLMTextTool, 'Generiert Text mit dem lokalen LLM-Modell');
  registerTool('generate_chat_response', generateLLMChatResponseTool, 'Generiert eine Chat-Antwort mit dem lokalen LLM-Modell');
  registerTool('analyze_product', analyzeLLMProductTool, 'Analysiert ein Produkt mit dem lokalen LLM-Modell');
  registerTool('generate_product_description', generateProductDescriptionTool, 'Generiert eine Produktbeschreibung mit dem lokalen LLM-Modell');
  
  // Fine-Tuning-Tools
  registerTool('create_product_dataset', createProductDatasetTool, 'Erstellt einen Datensatz aus Produktdaten für das Fine-Tuning');
  registerTool('finetune_llm_model', finetuneLLMModelTool, 'Fine-tuned ein LLM-Modell mit einem Produktdatensatz');
  registerTool('generate_with_finetuned_model', generateWithFinetunedModelTool, 'Generiert Text mit einem fine-getuned Modell');
  registerTool('generate_product_description_with_finetuned_model', generateProductDescriptionWithFinetunedModelTool, 'Generiert eine Produktbeschreibung mit einem fine-getuned Modell');
  registerTool('list_finetuned_models', listFinetunedModelsTool, 'Listet alle verfügbaren fine-getuned Modelle auf');
  registerTool('complete_fine_tuning_workflow', completeFineTuningWorkflowTool, 'Führt den kompletten Fine-Tuning-Workflow aus');
  
  // Multilingual-Tools
  registerTool('translate_text', translateTextTool, 'Übersetzt Text in eine andere Sprache');
  registerTool('generate_multilingual_text', generateMultilingualTextTool, 'Generiert Text in mehreren Sprachen');
  registerTool('generate_multilingual_product_description', generateMultilingualProductDescriptionTool, 'Generiert eine Produktbeschreibung in mehreren Sprachen');
  registerTool('create_prompt_template', createPromptTemplateTool, 'Erstellt eine Prompt-Vorlage für die Mehrsprachigkeit');
  registerTool('translate_prompt_template', translatePromptTemplateTool, 'Übersetzt eine Prompt-Vorlage in mehrere Sprachen');
  registerTool('list_prompt_templates', listPromptTemplatesTool, 'Listet alle verfügbaren Prompt-Vorlagen auf');
  registerTool('list_supported_languages', listSupportedLanguagesTool, 'Listet alle unterstützten Sprachen auf');
  registerTool('translate_product_for_marketplaces', translateProductForMarketplacesTool, 'Übersetzt Produktinformationen für verschiedene Marktplätze');
  
  // Template-Tools
  registerTool('create_template_prompt', createTemplatePromptTool, 'Erstellt eine Vorlagenvorlage');
  registerTool('update_template_prompt', updateTemplatePromptTool, 'Aktualisiert eine vorhandene Vorlagenvorlage');
  registerTool('delete_template_prompt', deleteTemplatePromptTool, 'Löscht eine Vorlagenvorlage');
  registerTool('list_template_prompts', listTemplatePromptsTool, 'Listet alle verfügbaren Vorlagenvorlagen auf');
  registerTool('get_template_prompt', getTemplatePromptTool, 'Ruft eine bestimmte Vorlagenvorlage ab');
  registerTool('generate_with_template', generateWithTemplatePromptTool, 'Generiert Text mit einer Vorlagenvorlage');
  registerTool('create_template_category', createTemplateCategoryTool, 'Erstellt eine neue Kategorie für Vorlagenvorlagen');
  registerTool('verify_template_prompt', verifyTemplatePromptTool, 'Überprüft die Gültigkeit einer Vorlagenvorlage');
  registerTool('ab_test_template_prompts', abTestTemplatePromptsTool, 'Führt einen A/B-Test für Vorlagenvorlagen durch');
  
  // A/B-Testing-Tools
  registerTool('create_ab_test', createABTestTool, 'Erstellt einen neuen A/B-Test');
  registerTool('execute_ab_test', executeABTestTool, 'Führt einen A/B-Test aus');
  registerTool('get_ab_test_results', getABTestResultsTool, 'Ruft die Ergebnisse eines A/B-Tests ab');
  registerTool('analyze_ab_test_results', analyzeABTestResultsTool, 'Analysiert die Ergebnisse eines A/B-Tests');
  registerTool('list_ab_tests', listABTestsTool, 'Listet alle verfügbaren A/B-Tests auf');
  registerTool('update_ab_test', updateABTestTool, 'Aktualisiert einen vorhandenen A/B-Test');
  registerTool('delete_ab_test', deleteABTestTool, 'Löscht einen A/B-Test');
  registerTool('complete_ab_test_workflow', completeABTestWorkflowTool, 'Führt den kompletten A/B-Test-Workflow aus');
  
  // Artefakt-Tools
  registerTool('create_tool_artifact', createToolArtifactTool, 'Erstellt ein Artefakt für ein Tool');
  registerTool('execute_tool_artifact', executeToolArtifactTool, 'Führt ein Tool-Artefakt aus');
  registerTool('approve_tool_execution', approveToolExecutionTool, 'Genehmigt die Ausführung eines Tool-Artefakts');
  registerTool('get_tool_results', getToolResultsTool, 'Ruft die Ergebnisse eines Tool-Artefakts ab');
  registerTool('list_artifacts', listArtifactsTool, 'Listet alle verfügbaren Artefakte auf');
  registerTool('cleanup_artifact_data', cleanupArtifactDataTool, 'Bereinigt alte Artefakt-Daten');
  
  // Neue Workflow-Artefakt-Tools
  registerTool('create_workflow_artifact', createWorkflowArtifactTool, 'Erstellt ein Artefakt für einen kompletten Workflow');
  registerTool('execute_workflow_artifact', executeWorkflowArtifactTool, 'Führt ein Workflow-Artefakt aus');
  
  logger.info(`${registeredTools.size} MCP-Tools registriert.`);

  // Zum Asynchronitätskompatibilität: Gib ein resolved Promise zurück
  return Promise.resolve();
}

/**
 * Ruft ein registriertes Tool anhand des Namens ab
 */
export function getToolByName(name: string): Function | null {
  return registeredTools.get(name) || null;
}

/**
 * Ruft die Beschreibung eines Tools anhand des Namens ab
 */
export function getToolDescription(name: string): string | null {
  return toolDescriptions.get(name) || null;
}

/**
 * Ruft eine Liste aller registrierten Tools ab
 */
export function getRegisteredTools(): string[] {
  return Array.from(registeredTools.keys());
}

/**
 * Ruft eine Liste aller registrierten Tools mit Beschreibungen ab
 */
export function getRegisteredToolsWithDescriptions(): Array<{ name: string; description: string }> {
  return Array.from(registeredTools.keys()).map(name => ({
    name,
    description: toolDescriptions.get(name) || ''
  }));
}