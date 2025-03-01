# Claude.ai Desktop Integration

Diese Dokumentation beschreibt die Integration des Helium10 MCP-Servers mit der Claude.ai Desktop-Anwendung über Tool-Artefakte.

## Übersicht

Die Integration ermöglicht es, Claude.ai Desktop mit den leistungsstarken Tools des MCP-Servers zu verbinden. Nutzer können spezifische Tools als "Artefakte" verpacken, die dann direkt aus der Claude.ai Desktop-Anwendung aufgerufen werden können.

Diese Implementierung bietet eine sichere und kontrollierte Möglichkeit für Claude-Nutzer, auf MCP-Tools zuzugreifen, ohne den MCP-Server direkt verwenden zu müssen.

## Funktionsweise

1. **Erstellung von Tool-Artefakten**: Entwickler oder Administratoren erstellen Tool-Artefakte über die MCP-Benutzeroberfläche oder API.
2. **Verteilung von Artefakt-URLs**: Die generierten `claude://`-URLs werden an Claude-Nutzer weitergegeben.
3. **Aufrufen durch Claude**: Wenn die URL in Claude verwendet wird, öffnet sich der MCP-Client und zeigt einen Genehmigungsdialog an.
4. **Tool-Ausführung**: Nach der Genehmigung wird das Tool mit den angegebenen Parametern ausgeführt, und die Ergebnisse werden zurück an Claude gesendet.

## Sicherheitskonzept

Die Implementierung umfasst mehrere Sicherheitsebenen:

### Zugriffskontrolle

- **URL-basierte Authentifizierung**: Jede Artefakt-URL enthält eine einzigartige ID, die nur für ein bestimmtes Tool und eine bestimmte Konfiguration gilt.
- **Genehmigungsworkflow**: Optional kann für jede Ausführung eine Benutzergenehmigung erforderlich sein.
- **Zeitbeschränkung**: Artefakte können mit einem Ablaufdatum versehen werden.
- **Nutzungslimit**: Die Anzahl der Ausführungen kann begrenzt werden.

### Parametersicherheit

- **Validierung**: Parameter werden streng gegen die definierten Schemas validiert.
- **Eingeschränkte Parameter**: Nur vorher definierte Parameter sind zulässig.
- **Wertebereichsprüfung**: Für Enum-Parameter werden nur erlaubte Werte akzeptiert.

### Datensicherheit

- **Protokollierung**: Alle Ausführungen werden protokolliert.
- **Ergebnisspeicherung**: Ergebnisse können optional in der Datenbank gespeichert werden.
- **Benutzeridentifikation**: Jede Ausführung ist einem Benutzer zugeordnet.

## API-Referenz

### Tool-Artefakt erstellen

```typescript
interface CreateArtifactOptions {
  requiredApproval?: boolean;      // Erfordert Genehmigung für jede Ausführung
  userId?: string;                 // Benutzer-ID des Erstellers
  expiresAfterDays?: number;       // Ablaufdatum in Tagen (0 = unbegrenzt)
  maxUsage?: number;               // Maximale Anzahl der Ausführungen (0 = unbegrenzt)
  enableDataStorage?: boolean;     // Speichert Ergebnisse in der Datenbank
  dbTable?: string;                // Benutzerdefinierte Tabelle für Ergebnisse
  storeResults?: boolean;          // Speichert Ergebnisse in der Standardtabelle
}

async function createToolArtifactTool(
  name: string,                    // Name des Artefakts
  description: string,             // Beschreibung des Artefakts
  toolName: string,                // Name des aufzurufenden Tools
  allowedParameters: object,       // Erlaubte Parameter und deren Wertebereiche
  options?: CreateArtifactOptions  // Zusätzliche Optionen
): Promise<{
  success: boolean;
  message?: string;
  artifact?: {
    id: string;
    name: string;
    description: string;
    toolName: string;
    url: string;
    requiredApproval: boolean;
    expiresAt?: string;
    maxUsage?: number;
  }
}>
```

### Workflow-Artefakt erstellen

```typescript
async function createWorkflowArtifactTool(
  name: string,                    // Name des Artefakts
  description: string,             // Beschreibung des Artefakts
  workflowId: string,              // ID des auszuführenden Workflows
  allowedParameters: object,       // Erlaubte Parameter und deren Wertebereiche
  options?: CreateArtifactOptions  // Zusätzliche Optionen
): Promise<{
  success: boolean;
  message?: string;
  artifact?: {
    id: string;
    name: string;
    description: string;
    workflowId: string;
    url: string;
    requiredApproval: boolean;
    expiresAt?: string;
    maxUsage?: number;
  }
}>
```

### Tool-Artefakt ausführen

```typescript
async function executeToolArtifactTool(
  artifactId: string,              // ID des Artefakts
  parameters: object,              // Parameter für den Tool-Aufruf
  approvalToken?: string           // Genehmigungstoken (falls erforderlich)
): Promise<{
  success: boolean;
  requiresApproval?: boolean;
  message?: string;
  result?: any;
  executionTime?: number;
  usageCount?: number;
  remainingUsage?: number | null;
}>
```

### Workflow-Artefakt ausführen

```typescript
async function executeWorkflowArtifactTool(
  artifactId: string,              // ID des Artefakts
  parameters: object,              // Parameter für den Workflow
  approvalToken?: string           // Genehmigungstoken (falls erforderlich)
): Promise<{
  success: boolean;
  requiresApproval?: boolean;
  message?: string;
  result?: any;
  executionTime?: number;
  usageCount?: number;
  remainingUsage?: number | null;
}>
```

### Tool-Ausführung genehmigen

```typescript
/**
 * Generiert ein Genehmigungstoken für einen Tool-Artefakt-Aufruf
 */
async function approveToolExecutionTool(
  artifactId: string,                          // ID des Artefakts
  userId: string,                              // ID des genehmigenden Benutzers
  parameters: Record<string, any>              // Parameter für die Ausführung
): Promise<{
  success: boolean;
  token?: string;                              // Genehmigungstoken
  expiresIn?: number;                          // Ablauf des Tokens in Sekunden
}>
```

### Tool-Ergebnisse abrufen

```typescript
/**
 * Ruft gespeicherte Ergebnisse von Tool-Artefakt-Ausführungen ab
 */
async function getToolResultsTool(
  artifactId: string,                          // ID des Artefakts
  limit?: number                               // Maximale Anzahl der Ergebnisse
): Promise<{
  success: boolean;
  artifact?: {
    id: string;                                // ID des Artefakts
    name: string;                              // Name des Artefakts
    tool_name: string;                         // Name des Tools
  };
  resultCount?: number;                        // Anzahl der Ergebnisse
  results?: Array<{
    parameters: Record<string, any>;           // Parameter der Ausführung
    result: any;                               // Ergebnis der Ausführung
    executedAt: string;                        // Zeitpunkt der Ausführung
    userId: string;                            // ID des ausführenden Benutzers
  }>;
}>
```

### Artefakte auflisten

```typescript
/**
 * Listet verfügbare Artefakte für einen Benutzer auf
 */
async function listArtifactsTool(
  userId: string,                              // ID des Benutzers
  includeExpired?: boolean                     // Auch abgelaufene Artefakte anzeigen
): Promise<{
  success: boolean;
  count?: number;                              // Anzahl der Artefakte
  artifacts?: Array<{
    id: string;                                // ID des Artefakts
    name: string;                              // Name des Artefakts
    description: string;                       // Beschreibung des Artefakts
    toolName: string;                          // Name des Tools
    url: string;                               // claude://-URL
    requiredApproval: boolean;                 // Erfordert Genehmigung
    createdAt: string;                         // Erstellungsdatum
    expiresAt?: string;                        // Ablaufdatum
    usageCount: number;                        // Aktuelle Nutzungszahl
    maxUsage?: number;                         // Maximale Nutzungen
    isExpired?: boolean;                       // Ist abgelaufen
    hasReachedMaxUsage?: boolean;              // Hat maximale Nutzungen erreicht
  }>;
}>
```

## REST-API-Endpoints

Die folgenden REST-API-Endpoints stehen zur Verfügung:

### `POST /api/artifacts/create`

Erstellt ein neues Tool-Artefakt.

**Authentifizierung erforderlich**: Ja

### `POST /api/artifacts/execute/:artifactId`

Führt ein Tool-Artefakt aus.

**Authentifizierung erforderlich**: Nein (ermöglicht Zugriff aus Claude)

### `POST /api/artifacts/approve/:artifactId`

Generiert ein Genehmigungstoken für einen Tool-Artefakt-Aufruf.

**Authentifizierung erforderlich**: Ja

### `GET /api/artifacts/results/:artifactId`

Ruft Ergebnisse von Tool-Artefakt-Ausführungen ab.

**Authentifizierung erforderlich**: Ja

### `GET /api/artifacts/list`

Listet Artefakte für den aktuellen Benutzer auf.

**Authentifizierung erforderlich**: Ja

### `GET /api/artifacts/:artifactId`

Ruft Details eines Artefakts ab.

**Authentifizierung erforderlich**: Ja

### `DELETE /api/artifacts/:artifactId`

Löscht ein Artefakt.

**Authentifizierung erforderlich**: Ja

## Datenbanktabellen

Die Integration verwendet drei Tabellen:

### `artifacts`

Speichert Informationen über Tool-Artefakte.

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | VARCHAR(36) | Primärschlüssel |
| name | VARCHAR(255) | Name des Artefakts |
| description | TEXT | Beschreibung des Artefakts |
| tool_name | VARCHAR(100) | Name des Tools |
| allowed_parameters | TEXT | JSON-String der erlaubten Parameter |
| required_approval | BOOLEAN | Erfordert Genehmigung |
| user_id | VARCHAR(100) | ID des erstellenden Benutzers |
| created_at | TIMESTAMP | Erstellungsdatum |
| expires_at | TIMESTAMP | Ablaufdatum (optional) |
| usage_count | INTEGER | Anzahl der Ausführungen |
| max_usage | INTEGER | Maximale Anzahl der Ausführungen (optional) |
| data_storage_enabled | BOOLEAN | Datenspeicherung aktiviert |
| data_storage_db_table | VARCHAR(100) | Benutzerdefinierte Tabelle (optional) |
| data_storage_store_results | BOOLEAN | Ergebnisse speichern |

### `tool_results`

Speichert Ergebnisse von Tool-Ausführungen.

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | SERIAL | Primärschlüssel |
| artifact_id | VARCHAR(36) | Fremdschlüssel zu artifacts.id |
| tool_name | VARCHAR(100) | Name des ausgeführten Tools |
| parameters | TEXT | JSON-String der verwendeten Parameter |
| result | TEXT | JSON-String des Ergebnisses |
| executed_at | TIMESTAMP | Zeitpunkt der Ausführung |
| user_id | VARCHAR(100) | ID des ausführenden Benutzers |

### `approvals`

Speichert Genehmigungstokens.

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | SERIAL | Primärschlüssel |
| artifact_id | VARCHAR(36) | Fremdschlüssel zu artifacts.id |
| token | VARCHAR(100) | Genehmigungstoken |
| parameters | TEXT | JSON-String der Parameter |
| user_id | VARCHAR(100) | ID des genehmigenden Benutzers |
| created_at | TIMESTAMP | Erstellungsdatum |
| expires_at | TIMESTAMP | Ablaufdatum (optional) |
| used | BOOLEAN | Token wurde verwendet |

## Beispiele

### Beispiel 1: Produktanalyse-Artefakt erstellen

```javascript
const productAnalysisArtifact = await mcp.tools.create_tool_artifact(
  "Amazon Produktanalyse",
  "Führt eine detaillierte Analyse eines Amazon-Produkts durch",
  "analyze_llm_product",
  {
    asin: { type: "string", required: true },
    marketplace: { 
      type: "string", 
      enum: ["amazon.de", "amazon.com", "amazon.co.uk"],
      default: "amazon.de" 
    },
    analysisType: { 
      type: "string", 
      enum: ["basic", "competitive", "sentiment"],
      default: "competitive" 
    }
  },
  {
    requiredApproval: true,
    expiresAfterDays: 30,
    maxUsage: 100,
    enableDataStorage: true
  }
);

console.log(`Artefakt erstellt: ${productAnalysisArtifact.artifact.url}`);
// claude://artifacts/tool/550e8400-e29b-41d4-a716-446655440000
```

### Beispiel 2: Multilinguale Produktbeschreibung generieren

```javascript
const descriptionGeneratorArtifact = await mcp.tools.create_tool_artifact(
  "Produktbeschreibung Generator",
  "Generiert optimierte Produktbeschreibungen in mehreren Sprachen",
  "generate_multilingual_product_description",
  {
    productName: { type: "string", required: true },
    features: { type: "array", required: true },
    targetLanguages: { 
      type: "array", 
      default: ["de", "en", "fr", "es", "it"] 
    },
    tone: { 
      type: "string", 
      enum: ["professional", "casual", "enthusiastic", "technical"],
      default: "professional"
    },
    length: { 
      type: "string", 
      enum: ["short", "medium", "long"],
      default: "medium"
    }
  },
  {
    requiredApproval: true,
    maxUsage: 50
  }
);

console.log(`Artefakt erstellt: ${descriptionGeneratorArtifact.artifact.url}`);
```

## Einrichtung und Verwendung

### Für Entwickler

1. **Datenbankmigrationen ausführen**:
   ```bash
   npm run migrate
   ```

2. **Protokollhandler in der Desktop-App aktivieren**:
   ```javascript
   // In der main.ts der Electron-App
   import { initProtocolHandler, setupIpcHandlers } from './electron/protocolHandler';
   
   app.whenReady().then(() => {
     const mainWindow = createWindow();
     initProtocolHandler(mainWindow);
     setupIpcHandlers(ipcMain);
   });
   ```

3. **Artefakt-Tools registrieren**:
   ```javascript
   // Bereits in der tool-registry.ts implementiert
   registerTool('create_tool_artifact', createToolArtifactTool, '...');
   // usw.
   ```

### Für Benutzer

1. **Im MCP-Portal einloggen**
2. **Navigieren zu "Artefakte" > "Neues Artefakt"**
3. **Tool auswählen und konfigurieren**
4. **Erzeugte URL in Claude.ai Desktop verwenden**

## Fehlerbehebung

### Häufige Probleme

- **URL wird nicht geöffnet**: Überprüfen Sie, ob die Desktop-App als Handler für `claude://` registriert ist.
- **Genehmigungsdialog erscheint nicht**: Stellen Sie sicher, dass die App im Vordergrund ist.
- **Tool-Ausführung schlägt fehl**: Überprüfen Sie die Protokolle und die Parameterwerte.

### Debugging

- **Protokolle anzeigen**:
  ```bash
  npm run logs
  ```

- **Artefakt-Details prüfen**:
  ```javascript
  const details = await mcp.tools.get_artifact_details("ARTIFACT_ID");
  console.log(details);
  ```

## Zukünftige Erweiterungen

- **Bidirektionale Kommunikation**: Direkter Datenaustausch zwischen Claude und MCP-Tools
- **Erweiterte Berechtigungen**: Feinere Kontrolle über Tool-Zugriff
- **Workflow-Integration**: Verkettung mehrerer Tools in einem Artefakt
- **UI-Formulare**: Dynamische Formulargenerierung für Tool-Parameter

## Workflow-Artefakte

Workflow-Artefakte erweitern das Artefakt-System, indem sie die Ausführung kompletter Workflows ermöglichen. Ein Workflow ist eine vordefinierte Sequenz von Tools, die nacheinander ausgeführt werden, wobei die Ergebnisse jedes Schritts an den nächsten weitergegeben werden.

### Vorteile von Workflow-Artefakten

1. **Komplexe Analysen**: Führen Sie mehrere Tools in einer vordefinierten Reihenfolge aus, um komplexe Analysen durchzuführen.
2. **Konsistente Ergebnisse**: Stellen Sie sicher, dass alle erforderlichen Schritte in der richtigen Reihenfolge ausgeführt werden.
3. **Vereinfachte Nutzung**: Benutzer müssen nur einen einzigen Aufruf tätigen, anstatt mehrere Tools manuell zu verketten.
4. **Optimierte Leistung**: Workflows können Zwischenergebnisse im Cache speichern und Berechnungen wiederverwenden.

### Erstellen eines Workflow-Artefakts

Um ein Workflow-Artefakt zu erstellen, müssen Sie zunächst einen Workflow im Workflow-Manager registrieren:

```typescript
// Workflow-Schritte registrieren
workflowManager
  .registerStep('keywordRecherche', magnetKeywordResearchTool)
  .registerStep('produktAnalyse', xrayProductAnalysisTool)
  .registerStep('konkurrenzAnalyse', cerebroAsinResearchTool);

// Workflow registrieren
workflowManager.registerWorkflow('produktRecherche', [
  'keywordRecherche',
  'produktAnalyse',
  'konkurrenzAnalyse'
]);
```

Anschließend können Sie ein Artefakt für diesen Workflow erstellen:

```typescript
const result = await createWorkflowArtifactTool(
  'Produktrecherche-Workflow',
  'Führt eine vollständige Produktrecherche mit Keyword-Analyse, Produktanalyse und Konkurrenzanalyse durch',
  'produktRecherche',
  {
    keyword: {
      type: 'string',
      description: 'Das zu analysierende Keyword',
      required: true
    },
    marketplace: {
      type: 'string',
      description: 'Der Amazon-Marketplace',
      default: 'amazon.de',
      enum: ['amazon.de', 'amazon.com', 'amazon.co.uk', 'amazon.fr', 'amazon.it', 'amazon.es']
    }
  },
  {
    requiredApproval: true,
    expiresAfterDays: 90,
    maxUsage: 100,
    storeResults: true
  }
);

console.log(`Workflow-Artefakt erstellt: ${result.artifact.url}`);
```

### Ausführen eines Workflow-Artefakts

Workflow-Artefakte werden ähnlich wie Tool-Artefakte ausgeführt:

```typescript
const result = await executeWorkflowArtifactTool(
  'workflow-artifact-id',
  {
    keyword: 'bluetooth kopfhörer',
    marketplace: 'amazon.de'
  }
);

console.log('Workflow-Ergebnis:', result.result);
```

Wenn das Artefakt eine Genehmigung erfordert, müssen Sie zuerst ein Genehmigungstoken generieren:

```typescript
const approval = await approveToolExecutionTool(
  'workflow-artifact-id',
  'user-123',
  {
    keyword: 'bluetooth kopfhörer',
    marketplace: 'amazon.de'
  }
);

const result = await executeWorkflowArtifactTool(
  'workflow-artifact-id',
  {
    keyword: 'bluetooth kopfhörer',
    marketplace: 'amazon.de'
  },
  approval.token
);
```

### Beispiel: Vollständige Produktrecherche als Workflow-Artefakt

Ein typisches Beispiel für ein Workflow-Artefakt ist eine vollständige Produktrecherche:

1. **Keyword-Recherche**: Findet relevante Keywords und deren Suchvolumen
2. **Produktanalyse**: Analysiert die Top-Produkte für das Keyword
3. **Konkurrenzanalyse**: Untersucht die Konkurrenten und deren Strategien
4. **Marktanalyse**: Fasst die Marktchancen und -risiken zusammen

Durch die Kombination dieser Schritte in einem Workflow-Artefakt kann Claude eine umfassende Analyse mit einem einzigen Aufruf durchführen. 