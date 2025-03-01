# Entwicklungsanleitung für den Helium10 MCP-Server

Diese Anleitung beschreibt den vollständigen Entwicklungsprozess für den Helium10 MCP-Server, mit besonderem Fokus auf lokale Entwicklung und Tests.

## Entwicklungsumgebung einrichten

### Voraussetzungen

- Node.js (Version 18 oder höher)
- npm oder pnpm
- Git
- TypeScript-Kenntnisse
- Grundlegende Kenntnisse zu Model Context Protocol (MCP)

### Initiale Einrichtung

1. **Repository klonen und Abhängigkeiten installieren**:
   ```bash
   git clone <repository-url> helium10-mcp-server
   cd helium10-mcp-server
   npm install
   ```

2. **Umgebungsvariablen konfigurieren**:
   ```bash
   cp .env.example .env
   # Bearbeiten Sie die .env-Datei und fügen Sie Ihre Geheimnisse hinzu
   ```

3. **Build erstellen**:
   ```bash
   npm run build
   ```

## Lokale Entwicklung

### Entwicklungszyklus

1. **TypeScript im Watch-Modus kompilieren**:
   ```bash
   npm run watch
   ```

2. **Server im Debug-Modus starten**:
   ```bash
   npm run dev
   ```

3. **Mit MCP-Inspector testen**:
   ```bash
   npm run inspector
   ```

### Modulare Struktur

Der Helium10 MCP-Server verwendet eine modulare Architektur:

- **API-Module**: `amazon-api.ts`, `helium10-api.ts`
- **Datenverarbeitung**: `db.ts`, `cache.ts`
- **Analyse**: `product-analysis.ts`, `rag.ts`
- **Dienstprogramme**: `backup.ts`, `logger.ts`, `debug.ts`
- **MCP-Schnittstelle**: `tools.ts`, `index.ts`

Jedes Modul sollte unabhängig testbar sein und eine klare Verantwortlichkeit haben.

### Lokales Testen

Alle Tests werden lokal mit Vitest durchgeführt:

1. **Alle Tests ausführen**:
   ```bash
   npm test
   ```

2. **Tests im Watch-Modus ausführen**:
   ```bash
   npm run test:watch
   ```

3. **Tests für ein bestimmtes Modul ausführen**:
   ```bash
   npm test -- src/cache.test.ts
   ```

### Mocking für Tests

Für Integrationstests werden externe Abhängigkeiten (Helium10 API, Amazon API) gemockt:

```typescript
// Beispiel für das Mocken der Helium10-API
vi.mock('../src/helium10-api.ts', () => ({
  magnetKeywordResearch: vi.fn().mockResolvedValue({
    // Mock-Daten hier
  })
}));
```

## Erweiterte Funktionen implementieren

### Neue Tools hinzufügen

Um ein neues MCP-Tool hinzuzufügen:

1. Implementieren Sie die Tool-Logik in `tools.ts`:
   ```typescript
   async function meinNeuesTool(parameter1: string, parameter2?: string): Promise<any> {
     // Tool-Implementierung
   }
   ```

2. Exportieren Sie das Tool in beiden Formaten (deutsch und englisch):
   ```typescript
   // Deutsche Exports
   export { meinNeuesTool };
   
   // Englische Exports für MCP-Kompatibilität
   export { meinNeuesTool as myNewTool };
   ```

3. Registrieren Sie das Tool in `index.ts` als MCP-Tool:
   ```typescript
   {
     name: "mein_neues_tool",
     description: "Beschreibung des neuen Tools",
     inputSchema: {
       type: "object",
       properties: {
         parameter1: {
           type: "string",
           description: "Beschreibung für Parameter 1"
         },
         parameter2: {
           type: "string",
           description: "Beschreibung für Parameter 2"
         }
       },
       required: ["parameter1"]
     }
   }
   ```

4. Implementieren Sie den Handler im Tool-Switch-Case:
   ```typescript
   case "mein_neues_tool": {
     const parameter1 = String(request.params.arguments?.parameter1 || "");
     const parameter2 = String(request.params.arguments?.parameter2 || "");
     
     if (!parameter1) {
       throw new Error("Parameter 1 ist erforderlich");
     }
     
     const result = await myNewTool(parameter1, parameter2 || undefined);
     
     return {
       content: [{
         type: "text",
         text: result.success 
           ? `Operation erfolgreich: ${JSON.stringify(result.data, null, 2)}` 
           : result.message
       }]
     };
   }
   ```

### Caching-Mechanismen nutzen

Nutzen Sie die `LokalerCache`-Klasse, um API-Anfragen zu optimieren:

```typescript
const cacheSchlüssel = `mein_prefix_${parameter1}_${parameter2}`;
const gecachteDaten = meinCache.abrufen(cacheSchlüssel);

if (gecachteDaten) {
  return gecachteDaten;
}

// Daten abrufen und berechnen
const ergebnis = await berechneDaten();

// Im Cache speichern
meinCache.setzen(cacheSchlüssel, ergebnis, 3600); // 1 Stunde cachen

return ergebnis;
```

### Fehlerbehandlung und Logging

Verwenden Sie das Logger-Modul für konsistentes Logging:

```typescript
import { logger } from './logger';

try {
  logger.info('Operation wird gestartet', { parameter });
  // Operation durchführen
  logger.debug('Zwischenergebnis', { zwischenergebnis });
  // Operation abschließen
  logger.info('Operation erfolgreich abgeschlossen');
} catch (error) {
  logger.error('Fehler bei der Operation', error as Error);
  throw error;
}
```

## Kontinuierliche Verbesserung

### Leistungsoptimierung

1. **Profilieren Sie die Anwendung**:
   ```bash
   NODE_OPTIONS="--inspect" npm run dev
   # Öffnen Sie chrome://inspect in Chrome
   ```

2. **Identifizieren Sie Engpässe**:
   - API-Anfragen (Verwenden Sie Caching)
   - Speichernutzung (Überwachen Sie mit `process.memoryUsage()`)
   - CPU-Auslastung (Profilen Sie mit dem Node.js-Profiler)

3. **Optimieren Sie kritische Pfade**:
   - Parallelisieren Sie unabhängige Operationen mit `Promise.all()`
   - Verwenden Sie Streams für große Dateien
   - Minimieren Sie synchrone Operationen

### Codequalität sicherstellen

1. **Linting durchführen**:
   ```bash
   npm run lint
   # Oder mit automatischer Korrektur
   npm run lint:fix
   ```

2. **Konsistente Dokumentation**:
   - JSDoc für alle öffentlichen Funktionen und Klassen
   - Wiederholte Updates der Markdown-Dokumentation
   - Beispiele für komplexe Operationen

3. **Regelmäßige Refaktorierung**:
   - Identifizieren Sie sich wiederholende Codemuster
   - Extrahieren Sie gemeinsame Funktionalität in Hilfsfunktionen
   - Halten Sie Module klein und fokussiert

## Veröffentlichung und Verteilung

### Paketierung

1. **Neuen Release vorbereiten**:
   ```bash
   # Version erhöhen
   npm version patch # oder minor oder major
   
   # Build für Produktion erstellen
   npm run build
   ```

2. **Lokales Testen des Pakets**:
   ```bash
   # Führen Sie den Build aus
   node build/index.js
   
   # Oder über npm link für globale Installation
   npm link
   helium10-mcp-server
   ```

### Verteilung

1. **Lokale Verteilung via Git**:
   ```bash
   # Erstellen Sie einen Tag für die Version
   git tag v1.0.0
   git push origin v1.0.0
   
   # Oder verwenden Sie Release-Branches
   git checkout -b release/1.0.0
   git push origin release/1.0.0
   ```

2. **Dokumentierte Installation**:
   ```
   # Im README.md
   ## Installation
   
   ```bash
   git clone <repository-url> helium10-mcp-server
   cd helium10-mcp-server
   npm install
   npm run build
   ```
   ```

## Fehlerbehebung

### Bekannte Probleme und Lösungen

1. **Helium10 API-Ratelimits**:
   - Problem: Zu viele Anfragen in kurzer Zeit können zu API-Limits führen
   - Lösung: Implementieren Sie exponentielles Backoff und Retry-Logik

2. **Cache-Invalidierung**:
   - Problem: Veraltete Cache-Daten können zu ungenauen Ergebnissen führen
   - Lösung: Implementieren Sie TTL-basiertes Caching und manuelle Invalidierungsmethoden

3. **Speicherlecks**:
   - Problem: Lange laufende Prozesse können Speicher akkumulieren
   - Lösung: Verwenden Sie WeakMap/WeakSet für Referenzen und überwachen Sie die Speichernutzung

### Debugging-Strategien

1. **Logging-Levels anpassen**:
   ```bash
   LOG_LEVEL=debug npm run dev
   ```

2. **Memory-Snapshots erstellen**:
   ```javascript
   // In debug.ts
   export function createMemorySnapshot(): void {
     const memoryUsage = process.memoryUsage();
     logger.debug('Memory Snapshot', {
       rss: memoryUsage.rss / 1024 / 1024 + 'MB',
       heapTotal: memoryUsage.heapTotal / 1024 / 1024 + 'MB',
       heapUsed: memoryUsage.heapUsed / 1024 / 1024 + 'MB',
       external: memoryUsage.external / 1024 / 1024 + 'MB'
     });
   }
   ```

3. **Request-Response-Aufzeichnung**:
   - Implementieren Sie einen Debug-Modus, der alle API-Anfragen und -Antworten aufzeichnet
   - Nutzen Sie Mock-Daten für reproduzierbare Tests

## Abschluss

Diese Entwicklungsanleitung bietet einen umfassenden Überblick über die lokale Entwicklung des Helium10 MCP-Servers. Durch Beachtung dieser Richtlinien können Sie effizient zur Verbesserung und Erweiterung des Systems beitragen.
