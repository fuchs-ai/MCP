# Helium10 MCP-Server Beispiele

Dieses Verzeichnis enthält Beispielskripte, die zeigen, wie man die MCP-Tools des Helium10-Servers in eigenen Anwendungen und Skripten einsetzen kann.

## Workflow-Demo

Die Datei `workflow-demo.ts` demonstriert die Verwendung der sequentiellen MCP-Workflow-Tools für Amazon-Produktrecherche und -Analyse.

### Ausführung

So können Sie die Demo ausführen:

```bash
# Aus dem Hauptverzeichnis
npm run build
node build/examples/workflow-demo.js

# Oder direkt mit ts-node
npx ts-node examples/workflow-demo.ts
```

### Features der Demo

1. **Produktrecherche-Workflow**
   - Zeigt die Verwendung des `vollständigeProduktrechercheTool`
   - Kombiniert Keyword-Recherche, Marktanalyse und Empfehlungen
   - Speichert Ergebnisse im `examples/results`-Verzeichnis

2. **Konkurrenzanalyse-Workflow**
   - Demonstriert parallele Analyse mehrerer ASINs mit `konkurrenzanalyseTool`
   - Vergleicht Produkte und generiert Strategieempfehlungen
   - Zeigt Preisspannen, gemeinsame Keywords und Positionierungsunterschiede

3. **Listing-Optimierung-Workflow**
   - Veranschaulicht das `listingOptimierungTool` für ASIN-basierte Optimierungen
   - Erstellt optimierte Titel, Bullet Points und Beschreibungen
   - Analysiert die Keyword-Abdeckung und generiert Verbesserungsvorschläge

Alle Demos können sowohl im Offline- als auch im Online-Modus ausgeführt werden.

### Offline-Modus

Die Demo verwendet standardmäßig den Offline-Modus, um Abhängigkeiten von externen APIs zu vermeiden. Im Offline-Modus werden Mock-Daten aus den entsprechenden Dateien im `src/mocks`-Verzeichnis verwendet.

Um die Demo im Online-Modus auszuführen, ändern Sie den letzten Parameter der entsprechenden Funktionsaufrufe von `true` auf `false`:

```typescript
// Von
await runProductResearch('smartphone halterung', 'amazon.de', true);

// Zu
await runProductResearch('smartphone halterung', 'amazon.de', false);
```

## Weitere Beispiele

### Individuelle Tool-Nutzung (individual-tools.ts)

Zeigt, wie man die MCP-Tools direkt ohne Workflow-System verwenden kann.

### Offline-Modus-Demo (offline-mode.ts)

Demonstriert die Funktionsweise des Offline-Modus mit Mock-Daten und Caching.

### Cache-System-Demo (cache-system.ts)

Zeigt die Verwendung des FileSystemCache für die lokale Speicherung von API-Antworten.

## Eigene Beispiele erstellen

Sie können eigene Beispiele nach folgendem Muster erstellen:

1. Erstellen Sie eine neue TypeScript-Datei im `examples`-Verzeichnis
2. Importieren Sie die benötigten Tools und Utilities aus dem `src`-Verzeichnis
3. Implementieren Sie Ihre Logik und führen Sie die gewünschten MCP-Tools aus
4. Kompilieren Sie das Projekt mit `npm run build`
5. Führen Sie Ihr Beispiel mit `node build/examples/ihr-beispiel.js` aus 