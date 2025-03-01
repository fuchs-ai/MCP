import { Knex } from 'knex';

/**
 * Migrationsdatei zur Erstellung der Tabellen für die Claude.ai Integration
 * Diese Migration erstellt drei Tabellen:
 * - artifacts: Speichert Informationen über Tool-Artefakte
 * - tool_results: Speichert Ergebnisse von Tool-Ausführungen
 * - approvals: Speichert Genehmigungstokens
 */
export async function up(knex: Knex): Promise<void> {
  // Prüfen, ob die Tabellen bereits existieren
  const artifactsExists = await knex.schema.hasTable('artifacts');
  const resultsExists = await knex.schema.hasTable('tool_results');
  const approvalsExists = await knex.schema.hasTable('approvals');

  if (!artifactsExists) {
    // Artefakte-Tabelle erstellen
    await knex.schema.createTable('artifacts', (table) => {
      table.string('id', 36).primary();
      table.string('name', 255).notNullable();
      table.text('description');
      table.string('tool_name', 100).notNullable();
      table.text('allowed_parameters').notNullable();
      table.boolean('required_approval').defaultTo(false);
      table.string('user_id', 100);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('expires_at').nullable();
      table.integer('usage_count').defaultTo(0);
      table.integer('max_usage').nullable();
      table.boolean('data_storage_enabled').defaultTo(false);
      table.string('data_storage_db_table', 100).nullable();
      table.boolean('data_storage_store_results').defaultTo(false);
      
      // Indizes für schnellere Abfragen
      table.index(['user_id']);
      table.index(['tool_name']);
      table.index(['expires_at']);
    });

    console.log('Tabelle "artifacts" erstellt');
  } else {
    console.log('Tabelle "artifacts" existiert bereits');
  }

  if (!resultsExists) {
    // Ergebnistabelle erstellen
    await knex.schema.createTable('tool_results', (table) => {
      table.increments('id').primary();
      table.string('artifact_id', 36).notNullable();
      table.string('tool_name', 100).notNullable();
      table.text('parameters').notNullable();
      table.text('result').notNullable();
      table.timestamp('executed_at').defaultTo(knex.fn.now());
      table.string('user_id', 100);
      
      // Fremdschlüssel
      table.foreign('artifact_id').references('id').inTable('artifacts').onDelete('CASCADE');
      
      // Indizes für schnellere Abfragen
      table.index(['artifact_id']);
      table.index(['executed_at']);
    });

    console.log('Tabelle "tool_results" erstellt');
  } else {
    console.log('Tabelle "tool_results" existiert bereits');
  }

  if (!approvalsExists) {
    // Genehmigungstabelle erstellen
    await knex.schema.createTable('approvals', (table) => {
      table.increments('id').primary();
      table.string('artifact_id', 36).notNullable();
      table.string('token', 100).notNullable().unique();
      table.text('parameters').notNullable();
      table.string('user_id', 100);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('expires_at').nullable();
      table.boolean('used').defaultTo(false);
      
      // Fremdschlüssel
      table.foreign('artifact_id').references('id').inTable('artifacts').onDelete('CASCADE');
      
      // Indizes für schnellere Abfragen
      table.index(['token']);
      table.index(['artifact_id']);
      table.index(['expires_at']);
    });

    console.log('Tabelle "approvals" erstellt');
  } else {
    console.log('Tabelle "approvals" existiert bereits');
  }

  // Jede Woche abgelaufene und veraltete Daten bereinigen (optional)
  try {
    await knex.raw(`
      CREATE OR REPLACE FUNCTION cleanup_artifact_data()
      RETURNS void AS $$
      DECLARE
        retention_days INTEGER;
      BEGIN
        -- Standardwert, falls Umgebungsvariable nicht gesetzt ist
        retention_days := COALESCE(current_setting('app.artifact_results_retention_days', true)::integer, 90);
        
        -- Lösche alte Ergebnisse
        DELETE FROM tool_results 
        WHERE executed_at < NOW() - (retention_days || ' days')::interval;
        
        -- Lösche abgelaufene und benutzte Genehmigungstokens
        DELETE FROM approvals 
        WHERE (expires_at IS NOT NULL AND expires_at < NOW()) OR used = true;
        
        -- Setze usage_count bei abgelaufenen Artefakten auf max_usage
        UPDATE artifacts 
        SET usage_count = max_usage 
        WHERE expires_at IS NOT NULL 
          AND expires_at < NOW() 
          AND max_usage IS NOT NULL 
          AND usage_count < max_usage;
      END;
      $$ LANGUAGE plpgsql;
      
      -- Erstelle oder aktualisiere Job für wöchentliche Bereinigung
      DO $$
      BEGIN
        -- Lösche den Job, falls er bereits existiert
        PERFORM pg_catalog.pg_drop_replication_slot('artifact_cleanup_job')
        WHERE EXISTS (
          SELECT 1 FROM pg_catalog.pg_replication_slots 
          WHERE slot_name = 'artifact_cleanup_job'
        );
      EXCEPTION
        WHEN undefined_object THEN
          -- Ignoriere Fehler, wenn der Job nicht existiert
      END;
      $$;
      
      -- Versuche, den Job zu planen, wenn pg_cron verfügbar ist
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
          -- Wöchentlich laufen lassen, am Sonntag um 3 Uhr morgens
          PERFORM cron.schedule('artifact_cleanup_job', '0 3 * * 0', 'SELECT cleanup_artifact_data()');
        END IF;
      EXCEPTION
        WHEN undefined_function THEN
          -- pg_cron ist nicht installiert, wir ignorieren das
      END;
      $$;
    `);
    console.log('Bereinigungsfunktion erstellt (wenn pg_cron verfügbar ist)');
  } catch (error) {
    // Die Erstellung der Bereinigungsfunktion ist optional und schlägt fehl,
    // wenn pg_cron nicht verfügbar ist oder keine ausreichenden Berechtigungen vorhanden sind
    console.log('Bereinigungsfunktion konnte nicht erstellt werden: ', error);
  }
}

export async function down(knex: Knex): Promise<void> {
  // Prüfen, ob die Tabellen existieren
  const approvalsExists = await knex.schema.hasTable('approvals');
  const resultsExists = await knex.schema.hasTable('tool_results');
  const artifactsExists = await knex.schema.hasTable('artifacts');

  // Bereinigungsfunktion entfernen
  try {
    await knex.raw(`
      -- Lösche den Job, falls er existiert
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
          PERFORM cron.unschedule('artifact_cleanup_job');
        END IF;
      EXCEPTION
        WHEN undefined_function THEN
          -- pg_cron ist nicht installiert, wir ignorieren das
      END;
      $$;
      
      -- Lösche die Funktion
      DROP FUNCTION IF EXISTS cleanup_artifact_data();
    `);
    console.log('Bereinigungsfunktion entfernt');
  } catch (error) {
    console.log('Bereinigungsfunktion konnte nicht entfernt werden: ', error);
  }

  // Tabellen in umgekehrter Reihenfolge entfernen (wegen Fremdschlüsseln)
  if (approvalsExists) {
    await knex.schema.dropTable('approvals');
    console.log('Tabelle "approvals" entfernt');
  }

  if (resultsExists) {
    await knex.schema.dropTable('tool_results');
    console.log('Tabelle "tool_results" entfernt');
  }

  if (artifactsExists) {
    await knex.schema.dropTable('artifacts');
    console.log('Tabelle "artifacts" entfernt');
  }
} 