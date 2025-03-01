/**
 * Migration: Artefakt-Tabellen für Claude.ai Desktop Integration
 */
import { MigrationFn } from 'kysely';

export const up: MigrationFn = async (db) => {
  // Artefakttabelle
  await db.schema
    .createTable('artifacts')
    .addColumn('id', 'varchar(36)', col => col.primaryKey())
    .addColumn('name', 'varchar(255)', col => col.notNull())
    .addColumn('description', 'text')
    .addColumn('tool_name', 'varchar(100)', col => col.notNull())
    .addColumn('allowed_parameters', 'text')
    .addColumn('required_approval', 'boolean', col => col.defaultTo(true))
    .addColumn('user_id', 'varchar(100)', col => col.notNull())
    .addColumn('created_at', 'timestamp', col => col.notNull())
    .addColumn('expires_at', 'timestamp')
    .addColumn('usage_count', 'integer', col => col.defaultTo(0))
    .addColumn('max_usage', 'integer')
    .addColumn('data_storage_enabled', 'boolean', col => col.defaultTo(false))
    .addColumn('data_storage_db_table', 'varchar(100)')
    .addColumn('data_storage_store_results', 'boolean', col => col.defaultTo(true))
    .execute();

  // Tabelle für Tool-Ergebnisse
  await db.schema
    .createTable('tool_results')
    .addColumn('id', 'serial', col => col.primaryKey())
    .addColumn('artifact_id', 'varchar(36)', col => col.notNull())
    .addColumn('tool_name', 'varchar(100)', col => col.notNull())
    .addColumn('parameters', 'text')
    .addColumn('result', 'text')
    .addColumn('executed_at', 'timestamp', col => col.notNull())
    .addColumn('user_id', 'varchar(100)', col => col.notNull())
    .addForeignKeyConstraint(
      'fk_tool_results_artifact_id',
      ['artifact_id'],
      'artifacts',
      ['id']
    )
    .execute();

  // Tabelle für Genehmigungen
  await db.schema
    .createTable('approvals')
    .addColumn('id', 'serial', col => col.primaryKey())
    .addColumn('artifact_id', 'varchar(36)', col => col.notNull())
    .addColumn('token', 'varchar(100)', col => col.notNull())
    .addColumn('parameters', 'text')
    .addColumn('user_id', 'varchar(100)', col => col.notNull())
    .addColumn('created_at', 'timestamp', col => col.notNull())
    .addColumn('expires_at', 'timestamp')
    .addColumn('used', 'boolean', col => col.defaultTo(false))
    .addForeignKeyConstraint(
      'fk_approvals_artifact_id',
      ['artifact_id'],
      'artifacts',
      ['id']
    )
    .execute();

  // Indizes für schnelle Abfragen
  await db.schema
    .createIndex('idx_artifact_id')
    .on('tool_results')
    .column('artifact_id')
    .execute();

  await db.schema
    .createIndex('idx_approval_token')
    .on('approvals')
    .column('token')
    .execute();

  await db.schema
    .createIndex('idx_approval_artifact')
    .on('approvals')
    .column('artifact_id')
    .execute();
};

export const down: MigrationFn = async (db) => {
  await db.schema.dropTable('approvals').execute();
  await db.schema.dropTable('tool_results').execute();
  await db.schema.dropTable('artifacts').execute();
}; 