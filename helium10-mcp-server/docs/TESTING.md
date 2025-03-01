# Testmethodik für Helium10 MCP-Server Workflows

Dieses Dokument beschreibt die Test-Methodiken für das sequentielle Workflow-System des Helium10 MCP-Servers.

## Automatisierte Tests

### Einheits- und Integrationstests

Automatisierte Tests befinden sich im Verzeichnis `test/` und können wie folgt ausgeführt werden:

```bash
# Alle Tests ausführen
npm test

# Spezifische Workflow-Tests ausführen
npm test -- -t "WorkflowManager"

# Tests mit Abdeckungsanalyse
npm run test:coverage
```

### Testabdeckung

Die folgenden Bereiche werden durch automatisierte Tests abgedeckt:

#### Workflow-Manager (`test/workflow.test.ts`)
- Sequentielle Ausführung von Workflow-Schritten
- Fehlerbehandlung bei nicht registrierten Workflows/Schritten
- Zugriff auf Zwischenergebnisse während der Ausführung
- Kontextübergabe zwischen Workflow-Schritten
- Unabhängige Ausführung mehrerer Workflows
- Protokollierung von Workflow-Ausführungen

#### Workflow-Tools (`test/workflow-tools.test.ts`)
- Integration der Einzeltools in Workflow-Sequenzen
- Cache-Verhalten der Workflow-Tools
- Fehlerbehandlung und Fehlerweiterleitung
- Offline-Modus-Kompatibilität

## Manuelle Tests

### Offline-Modus-Tests

Für umfassende Tests im Offline-Modus kann das Beispiel in `examples/workflow-demo.ts` verwendet werden:

```bash
# Build erstellen
npm run build

# Demo im Offline-Modus ausführen (Standard)
node build/examples/workflow-demo.js

# Offline-Modus explizit aktivieren
OFFLINE_MODE=true node build/examples/workflow-demo.js
```

### Workflow-Validierungsschritte

1. **Setup-Validierung**
   - Prüfen, ob alle erforderlichen Tools für den Workflow registriert sind
   - Sicherstellen, dass die Workflow-Schritte in der richtigen Reihenfolge definiert sind

2. **Datenfluss-Validierung**
   - Überprüfen, ob die Daten korrekt zwischen den Workflow-Schritten übergeben werden
   - Sicherstellen, dass der Kontext in allen Schritten verfügbar ist

3. **Ergebnis-Validierung**
   - Überprüfen der finalen Ergebnisstruktur aus dem Workflow
   - Sicherstellen, dass alle erwarteten Felder vorhanden sind

4. **Cache-Validierung**
   - Überprüfen, ob Workflow-Ergebnisse korrekt gecacht werden
   - Zweite Ausführung mit identischen Parametern sollte Cache-Treffer erzeugen

5. **Fehlerbehandlungs-Validierung**
   - Absichtlich Fehler in einzelnen Workflow-Schritten verursachen
   - Überprüfen, ob Fehler korrekt protokolliert und weitergeleitet werden

## Leistungstests

### Testparameter für Leistungsmessung

- **Ausführungszeit**: Dauer der gesamten Workflow-Ausführung
- **Speichernutzung**: Maximaler Speicherverbrauch während der Ausführung
- **Cache-Effizienz**: Vergleich von Cache-Treffern und Cache-Fehlern

### Methodik für Leistungstests

```bash
# Leistungstests starten
npm run benchmark
```

Der Leistungstest führt verschiedene Workflows mit steigender Komplexität aus und misst:

- Zeit für die erste Ausführung (ohne Cache)
- Zeit für nachfolgende Ausführungen (mit Cache)
- Speichernutzung während der Ausführung

## Fehlerbehebung bei Tests

### Häufige Testprobleme

1. **Fehlerhafte Offline-Daten**
   - Lösung: Offline-Modus-Daten unter `src/mocks` überprüfen und ggf. aktualisieren

2. **Fehlende Tools in Workflows**
   - Lösung: Sicherstellen, dass alle in Workflows verwendeten Tools registriert sind

3. **Timing-Probleme bei parallelen Tests**
   - Lösung: Test mit dem Flag `--runInBand` ausführen, um sequentielle Ausführung zu erzwingen

4. **Cache-Inkonsistenzen**
   - Lösung: Cache-Verzeichnis löschen mit `npm run clean:cache`

## Testdaten

Für Tests werden die folgenden Datenquellen verwendet:

- **Mock-Daten** im Verzeichnis `src/mocks` für Offline-Tests
- **Test-Fixtures** im Verzeichnis `test/fixtures` für spezifische Testfälle
- **In-Memory-Testdaten** in den Tests selbst für Einheitstests

## Kontinuierliche Integration

Die Workflow-Tests werden in der CI-Pipeline automatisch bei jedem Push und Pull-Request ausgeführt:

```yaml
# Auszug aus der CI-Konfiguration
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Run workflow tests
        run: npm test -- -t "Workflow"
``` 