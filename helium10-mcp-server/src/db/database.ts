/**
 * database.ts
 * 
 * Konfiguriert und initialisiert die Datenbankverbindung mit Knex.
 * Verwaltet den Zugriff auf die SQLite-Datenbank.
 */

import knex from 'knex';
import path from 'path';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

// Lade Umgebungsvariablen
dotenv.config();

// Datenbank-Konfiguration
const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'mcp.db');

// Erstelle Knex-Instanz
const database = knex({
  client: 'sqlite3',
  connection: {
    filename: dbPath,
  },
  useNullAsDefault: true,
  debug: process.env.NODE_ENV === 'development',
  pool: {
    min: 2,
    max: 10,
    afterCreate: (conn: any, done: Function) => {
      // Aktiviere Foreign Keys in SQLite
      conn.run('PRAGMA foreign_keys = ON', done);
    },
  },
  log: {
    warn(message) {
      logger.warn(`Knex Warnung: ${message}`);
    },
    error(message) {
      logger.error(`Knex Fehler: ${message}`);
    },
    debug(message) {
      if (process.env.NODE_ENV === 'development') {
        logger.debug(`Knex Debug: ${message}`);
      }
    },
  },
});

/**
 * Initialisiert die Datenbank, wenn sie nicht existiert
 */
export async function initializeDatabase() {
  try {
    logger.info('Prüfe Datenbankverbindung...');
    
    // Prüfe, ob die Tabellen existieren
    const artifactsTableExists = await database.schema.hasTable('artifacts');
    const executionsTableExists = await database.schema.hasTable('artifact_executions');
    
    // Erstelle die Tabellen, wenn sie nicht existieren
    if (!artifactsTableExists) {
      logger.info('Erstelle Artifacts-Tabelle...');
      await database.schema.createTable('artifacts', (table) => {
        table.string('id').primary().notNullable();
        table.string('name').notNullable();
        table.text('description');
        table.string('type').notNullable().defaultTo('tool');
        table.string('toolName');
        table.string('workflowId');
        table.timestamp('createdAt').notNullable().defaultTo(database.fn.now());
        table.timestamp('updatedAt').notNullable().defaultTo(database.fn.now());
        table.timestamp('expiresAt');
        table.string('userId');
        table.boolean('requiredApproval').notNullable().defaultTo(true);
        table.integer('maxUsage').defaultTo(0);
        table.integer('currentUsage').notNullable().defaultTo(0);
        table.json('allowedParameters').notNullable();
        table.string('status').notNullable().defaultTo('active');
        table.string('url').notNullable();
        table.boolean('storeResults').notNullable().defaultTo(true);
        
        table.index(['type', 'status']);
        table.index(['userId']);
        table.index(['createdAt']);
      });
    }
    
    if (!executionsTableExists) {
      logger.info('Erstelle Artifact Executions-Tabelle...');
      await database.schema.createTable('artifact_executions', (table) => {
        table.string('id').primary().notNullable();
        table.string('artifactId').notNullable();
        table.timestamp('executedAt').notNullable().defaultTo(database.fn.now());
        table.json('parameters').notNullable();
        table.json('result');
        table.string('status').notNullable();
        table.boolean('approved');
        table.string('approvalToken');
        table.string('approvedBy');
        table.timestamp('approvedAt');
        table.text('error');
        table.float('executionTime');
        
        table.foreign('artifactId').references('id').inTable('artifacts').onDelete('CASCADE');
        table.index(['artifactId']);
        table.index(['executedAt']);
        table.index(['status']);
      });
    }
    
    logger.info('Datenbankinitialisierung abgeschlossen');
  } catch (error) {
    logger.error(`Fehler bei der Datenbankinitialisierung: ${error.message}`, error);
    throw new Error(`Fehler bei der Datenbankinitialisierung: ${error.message}`);
  }
}

// Exportiere die Datenbankverbindung
export default database; 