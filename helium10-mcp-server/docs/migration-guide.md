# Migrations-Anleitung: Claude.ai Desktop Integration

Diese Anleitung beschreibt die notwendigen Schritte, um die Claude.ai Desktop Integration in eine bestehende MCP-Server-Installation zu integrieren.

## Voraussetzungen

- MCP-Server (Version 2.5.0 oder höher)
- PostgreSQL-Datenbank
- Node.js 16.x oder höher
- Zugriff auf die Datenbank mit Administratorrechten

## 1. Datenbank-Migrationen

Um die neuen Tabellen für die Claude.ai Integration zu erstellen, müssen Datenbank-Migrationen ausgeführt werden.

### Neue Migration erstellen

1. Erstellen Sie eine neue Migrationsdatei im Verzeichnis `migrations`:

```bash
npm run create-migration -- add_artifact_tables
```

2. Bearbeiten Sie die erzeugte Migrationsdatei und fügen Sie den folgenden Inhalt ein:

```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
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
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('approvals');
  await knex.schema.dropTableIfExists('tool_results');
  await knex.schema.dropTableIfExists('artifacts');
}
```

### Migration ausführen

Führen Sie die Migration aus, um die Tabellen zu erstellen:

```bash
npm run migrate
```

## 2. Neue Module installieren

Die Integration benötigt einige zusätzliche NPM-Module. Installieren Sie diese mit:

```bash
npm install --save uuid crypto-js json-schema-validator electron-protocol-registry
npm install --save-dev @types/uuid @types/crypto-js
```

## 3. Neue Dateien hinzufügen

Folgende Dateien müssen erstellt werden:

1. `src/db/artifacts.ts` - Datenbankzugriff für Artefakte
2. `src/tools/artifact-tools.ts` - Tool-Funktionen für Artefakte
3. `src/api/artifact-api.ts` - API-Endpunkte für Artefakte
4. `src/electron/protocolHandler.ts` - Protokollhandler für claude://-URLs
5. `src/ui/components/ArtifactComponents.tsx` - UI-Komponenten
6. `src/ui/hooks/useToast.tsx` - Toast-Hook für Benachrichtigungen

## 4. Aktualisieren bestehender Dateien

### `src/tools/tool-registry.ts`

Fügen Sie Importe und Registrierungen für die Artefakt-Tools hinzu:

```typescript
import {
  createToolArtifactTool,
  executeToolArtifactTool,
  getToolResultsTool,
  approveToolExecutionTool,
  listArtifactsTool
} from './artifact-tools';

// Artefakt-Tools registrieren
registerTool('create_tool_artifact', createToolArtifactTool, 'Erstellt ein neues Tool-Artefakt für Claude.ai Desktop');
registerTool('execute_tool_artifact', executeToolArtifactTool, 'Führt ein Tool-Artefakt aus');
registerTool('get_tool_results', getToolResultsTool, 'Ruft Ergebnisse von Tool-Artefakt-Ausführungen ab');
registerTool('approve_tool_execution', approveToolExecutionTool, 'Generiert ein Genehmigungstoken für einen Tool-Artefakt-Aufruf');
registerTool('list_artifacts', listArtifactsTool, 'Listet verfügbare Artefakte für einen Benutzer auf');
```

### `src/api/index.ts`

Fügen Sie Importe und Registrierungen für die Artefakt-API-Routen hinzu:

```typescript
import artifactRoutes from './artifact-api';

// Weitere Router hier registrieren
router.use('/artifacts', artifactRoutes);
```

### `src/ui/App.tsx`

Fügen Sie die neue Route für den Artefakt-Manager hinzu:

```typescript
import { ArtifactManager } from './components/ArtifactComponents';
import { ToastProvider } from './hooks/useToast';

function App() {
  return (
    <ToastProvider>
      <Router>
        <Routes>
          {/* Bestehende Routen */}
          <Route path="/artifacts" element={<ArtifactManager />} />
        </Routes>
      </Router>
    </ToastProvider>
  );
}
```

### `src/electron/main.ts` (oder entsprechende Hauptdatei der Electron-App)

Fügen Sie die Initialisierung des Protokollhandlers hinzu:

```typescript
import { initProtocolHandler, setupIpcHandlers } from './protocolHandler';

app.whenReady().then(() => {
  const mainWindow = createWindow();
  initProtocolHandler(mainWindow);
  setupIpcHandlers(ipcMain);
});
```

## 5. Umgebungsvariablen

Aktualisieren Sie Ihre `.env`-Datei mit folgenden Variablen:

```
# Claude.ai Integration
ARTIFACT_TOKEN_SECRET=IhrGeheimesTokenHier
ARTIFACT_DEFAULT_EXPIRY_DAYS=30
ARTIFACT_RESULTS_RETENTION_DAYS=90
```

Generieren Sie einen sicheren zufälligen String für `ARTIFACT_TOKEN_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 6. Dokumentation

Stellen Sie sicher, dass die neue Dokumentation zugänglich ist:

1. Kopieren Sie die Datei `docs/claude-integration.md` in Ihr Dokumentationsverzeichnis
2. Fügen Sie einen Link zur Claude.ai-Integration in Ihre Hauptdokumentation ein

## 7. Tests

Führen Sie die Tests aus, um sicherzustellen, dass alles korrekt funktioniert:

```bash
npm test
```

## 8. Überprüfungen nach der Migration

Nachdem Sie alle Schritte abgeschlossen haben, überprüfen Sie Folgendes:

1. **Datenbank**: Stellen Sie sicher, dass die neuen Tabellen erstellt wurden
   ```bash
   npx knex seed:run --specific=check_tables.js
   ```

2. **Tool-Registry**: Überprüfen Sie, ob die neuen Tools registriert sind
   ```bash
   curl http://localhost:3000/api/tools/list
   ```

3. **API-Endpoints**: Testen Sie, ob die API-Endpoints verfügbar sind
   ```bash
   curl http://localhost:3000/api/artifacts/list
   ```

4. **Protokollhandler**: Testen Sie, ob der `claude://`-Protokollhandler funktioniert
   ```bash
   open claude://test
   ```

## 9. Fehlerbehebung

### Problem: Tabellen wurden nicht erstellt

Überprüfen Sie den Migrationslog und führen Sie die Migration manuell aus:

```bash
npx knex migrate:status
npx knex migrate:up 20230515123456_add_artifact_tables.js
```

### Problem: Tool-Registry findet die neuen Tools nicht

Überprüfen Sie, ob die Module korrekt importiert wurden und starten Sie den Server neu:

```bash
npm run build
npm start
```

### Problem: API-Routes werden nicht gefunden

Überprüfen Sie die API-Router-Konfiguration und die Logs auf Fehler beim Starten.

## 10. Aktualisierung der Benutzeroberfläche

Um die Navigation zu aktualisieren, bearbeiten Sie die Datei `src/ui/components/Navigation.tsx`:

```typescript
// Fügen Sie diesen Eintrag zum Navigationsmenü hinzu
<Nav.Link as={Link} to="/artifacts">Artefakte</Nav.Link>
```

## 11. Zusammenfassung

Nach Abschluss dieser Migration sollte Ihre MCP-Server-Installation nun vollständig mit der Claude.ai Desktop-Integration kompatibel sein. Benutzer können Tool-Artefakte erstellen, verwalten und ausführen lassen, die direkt aus der Claude.ai Desktop-Anwendung aufgerufen werden können.

Bei Fragen oder Problemen wenden Sie sich bitte an das Support-Team oder erstellen Sie ein Issue im GitHub-Repository des Projekts. 