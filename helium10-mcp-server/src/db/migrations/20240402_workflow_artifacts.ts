/**
 * Migration: Hinzufügen von Workflow-Unterstützung zu Artefakt-Tabellen
 */
import { MigrationFn } from 'kysely';

export const up: MigrationFn = async (db) => {
  // Füge type-Spalte zur Artifacts-Tabelle hinzu
  await db.schema
    .alterTable('artifacts')
    .addColumn('type', 'varchar(20)', col => col.defaultTo('tool'))
    .execute();

  // Ändere tool_name-Spalte, um NULL zu erlauben
  await db.schema
    .alterTable('artifacts')
    .alterColumn('tool_name', col => col.setDataType('varchar(100)').setNullable(true))
    .execute();

  // Füge workflow_id-Spalte zur Artifacts-Tabelle hinzu
  await db.schema
    .alterTable('artifacts')
    .addColumn('workflow_id', 'varchar(100)')
    .execute();

  // Entferne nicht mehr benötigte Spalten
  await db.schema
    .alterTable('artifacts')
    .dropColumn('data_storage_enabled')
    .dropColumn('data_storage_db_table')
    .execute();

  // Umbenennen von data_storage_store_results zu store_results
  await db.schema
    .alterTable('artifacts')
    .renameColumn('data_storage_store_results', 'store_results')
    .execute();

  // Entferne obligatorische tool_name-Spalte aus tool_results
  await db.schema
    .alterTable('tool_results')
    .alterColumn('tool_name', col => col.setDataType('varchar(100)').setNullable(true))
    .execute();

  // Füge execution_time-Spalte zu tool_results hinzu
  await db.schema
    .alterTable('tool_results')
    .addColumn('execution_time', 'integer')
    .execute();
};

export const down: MigrationFn = async (db) => {
  // Entferne die Spalten in umgekehrter Reihenfolge
  await db.schema
    .alterTable('tool_results')
    .dropColumn('execution_time')
    .execute();

  await db.schema
    .alterTable('tool_results')
    .alterColumn('tool_name', col => col.setDataType('varchar(100)').setNotNull())
    .execute();

  // Umbenennen von store_results zurück zu data_storage_store_results
  await db.schema
    .alterTable('artifacts')
    .renameColumn('store_results', 'data_storage_store_results')
    .execute();

  // Füge die entfernten Spalten wieder hinzu
  await db.schema
    .alterTable('artifacts')
    .addColumn('data_storage_enabled', 'boolean', col => col.defaultTo(false))
    .addColumn('data_storage_db_table', 'varchar(100)')
    .execute();

  // Entferne die workflow_id-Spalte
  await db.schema
    .alterTable('artifacts')
    .dropColumn('workflow_id')
    .execute();

  // Setze tool_name auf NOT NULL zurück
  await db.schema
    .alterTable('artifacts')
    .alterColumn('tool_name', col => col.setDataType('varchar(100)').setNotNull())
    .execute();

  // Entferne die type-Spalte
  await db.schema
    .alterTable('artifacts')
    .dropColumn('type')
    .execute();
}; 