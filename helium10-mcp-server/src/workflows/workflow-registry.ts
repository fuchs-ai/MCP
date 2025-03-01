/**
 * workflow-registry.ts
 * 
 * Registriert und verwaltet verfügbare Workflows für das MCP-System.
 */

import { logger } from '../utils/logger';

// Typ-Definitionen
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
}

export interface WorkflowStep {
  id: string;
  type: 'tool' | 'condition' | 'transformation';
  toolName?: string;
  parameters: Record<string, any>;
  inputMappings: Record<string, string>;
  outputMappings: Record<string, string>;
  condition?: string;
  transformation?: string;
}

// Map zum Speichern registrierter Workflows
const registeredWorkflows = new Map<string, WorkflowDefinition>();

/**
 * Registriert einen neuen Workflow im System
 */
export function registerWorkflow(workflow: WorkflowDefinition) {
  if (registeredWorkflows.has(workflow.id)) {
    logger.warn(`Workflow mit ID ${workflow.id} wurde bereits registriert und wird überschrieben`);
  }
  
  registeredWorkflows.set(workflow.id, workflow);
  logger.info(`Workflow '${workflow.name}' (${workflow.id}) wurde registriert`);
  
  return true;
}

/**
 * Gibt einen registrierten Workflow nach ID zurück
 */
export function getWorkflow(id: string): WorkflowDefinition | undefined {
  return registeredWorkflows.get(id);
}

/**
 * Gibt eine Liste aller registrierten Workflows zurück
 */
export function listWorkflows(): WorkflowDefinition[] {
  return Array.from(registeredWorkflows.values());
}

/**
 * Registriert alle Standard-Workflows beim Serverstart
 */
export async function registerWorkflows() {
  try {
    logger.info('Registriere Standard-Workflows');
    
    // Hier können Standard-Workflows aus Dateien oder der Datenbank geladen werden
    
    // Beispiel für einen Standard-Workflow
    const productResearchWorkflow: WorkflowDefinition = {
      id: 'product-research',
      name: 'Produkt-Recherche Workflow',
      description: 'Führt eine umfassende Produktrecherche durch, einschließlich Keyword-Analyse und Konkurrenzanalyse',
      steps: [
        {
          id: 'keyword-research',
          type: 'tool',
          toolName: 'keyword-research',
          parameters: {},
          inputMappings: {
            keyword: 'input.keyword',
            marketplace: 'input.marketplace'
          },
          outputMappings: {
            keywords: 'keywords'
          }
        },
        {
          id: 'competitor-analysis',
          type: 'tool',
          toolName: 'competitor-analysis',
          parameters: {},
          inputMappings: {
            keywords: 'keywords',
            marketplace: 'input.marketplace'
          },
          outputMappings: {
            competitors: 'competitors'
          }
        },
        {
          id: 'product-opportunity',
          type: 'tool',
          toolName: 'product-opportunity',
          parameters: {},
          inputMappings: {
            keywords: 'keywords',
            competitors: 'competitors',
            marketplace: 'input.marketplace'
          },
          outputMappings: {
            opportunity: 'output.opportunity',
            recommendations: 'output.recommendations'
          }
        }
      ],
      inputSchema: {
        type: 'object',
        required: ['keyword', 'marketplace'],
        properties: {
          keyword: {
            type: 'string',
            description: 'Das zu recherchierende Hauptkeyword'
          },
          marketplace: {
            type: 'string',
            description: 'Der Amazon-Marketplace (z.B. US, DE, UK)'
          }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          opportunity: {
            type: 'object',
            description: 'Bewertung der Marktchance'
          },
          recommendations: {
            type: 'array',
            description: 'Handlungsempfehlungen basierend auf der Recherche'
          }
        }
      }
    };
    
    // Registriere Beispiel-Workflow
    registerWorkflow(productResearchWorkflow);
    
    logger.info(`${registeredWorkflows.size} Workflows wurden erfolgreich registriert`);
  } catch (error) {
    logger.error(`Fehler bei der Registrierung von Workflows: ${error.message}`, error);
    throw new Error(`Fehler bei der Registrierung von Workflows: ${error.message}`);
  }
} 