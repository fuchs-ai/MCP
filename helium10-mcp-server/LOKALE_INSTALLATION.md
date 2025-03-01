# Lokale Installation des Helium10 MCP-Servers

Diese Anleitung führt Sie durch die lokale Installation und Konfiguration des Helium10 MCP-Servers, ohne Abhängigkeit von externen Diensten oder Remote-Repositories.

## Voraussetzungen

- Node.js (Version 18 oder höher)
- npm oder pnpm
- Git (für die lokale Versionskontrolle)
- Helium10-Account mit API-Zugang (für produktive Nutzung)

## Schritt 1: Lokales Projekt-Setup

### Verzeichnisstruktur erstellen

```bash
# Projektverzeichnis erstellen
mkdir -p ~/Projekte/helium10-mcp-server
cd ~/Projekte/helium10-mcp-server

# Git-Repository initialisieren
git init
git checkout -b main
```

### Projektdateien kopieren

Kopieren Sie die Projektdateien in Ihr lokales Verzeichnis. Sie können dies entweder manuell tun oder mit folgendem Befehl:

```bash
# Beispiel für das Kopieren, wenn Sie bereits Zugriff auf die Dateien haben
cp -r /pfad/zum/quellprojekt/* .
```

Stellen Sie sicher, dass die folgenden Schlüsseldateien und Verzeichnisse vorhanden sind:

```
helium10-mcp-server/
├── src/                   # Quellcode
├── test/                  # Testdateien
├── docs/                  # Dokumentation
├── .gitignore             # Git-Ignore-Konfiguration
├── package.json           # NPM-Paketdefinition
├── tsconfig.json          # TypeScript-Konfiguration
└── README.md              # Allgemeine Projektbeschreibung
```

## Schritt 2: Abhängigkeiten installieren

```bash
# NPM-Abhängigkeiten installieren
npm install
```

## Schritt 3: Umgebung konfigurieren

### Umgebungsvariablen einrichten

Erstellen Sie eine `.env`-Datei auf Basis der `.env.example`:

```bash
cp .env.example .env
```

Öffnen Sie die `.env`-Datei und passen Sie die Werte an:

```
# Helium10 API-Konfiguration
HELIUM10_API_KEY=Ihr_Helium10_API_Key
HELIUM10_API_SECRET=Ihr_Helium10_API_Secret

# Amazon API-Konfiguration (falls vorhanden)
AMAZON_ACCESS_KEY=Ihr_Amazon_Access_Key
AMAZON_SECRET_KEY=Ihr_Amazon_Secret_Key
AMAZON_ASSOCIATE_TAG=Ihr_Amazon_Associate_Tag

# Weitere Konfigurationen bei Bedarf anpassen
```

### Lokale Konfigurationsdatei

Für erweiterte Anpassungen können Sie eine lokale Konfigurationsdatei erstellen:

```bash
touch src/config.local.ts
```

Mit folgendem Inhalt:

```typescript
// src/config.local.ts
export const localConfig = {
  // Überschreiben Sie hier Standard-Konfigurationswerte
  helium10: {
    // API-Konfiguration
  },
  cache: {
    directory: './mein-cache-verzeichnis',
    maxAge: 12 * 60 * 60 * 1000 // 12 Stunden
  },
  // Weitere lokale Anpassungen
};
```

## Schritt 4: Projekt bauen

Kompilieren Sie das TypeScript-Projekt:

```bash
npm run build
```

## Schritt 5: Lokales Testen

### Tests ausführen

```bash
# Alle Tests ausführen
npm test

# Tests im Watch-Modus ausführen (für Entwicklung)
npm run test:watch
```

### MCP-Server lokal starten

```bash
# Server im Debug-Modus starten
npm run dev

# Oder Standardmodus
npm start
```

### MCP-Inspector verwenden

Der MCP-Inspector ermöglicht das Testen der MCP-Tools:

```bash
npm run inspector
```

## Schritt 6: Integration mit Claude

### Claude Desktop-Integration

1. Starten Sie den Helium10 MCP-Server:
   ```bash
   npm start
   ```

2. Öffnen Sie Claude Desktop
3. Navigieren Sie zu: `Einstellungen > Erweitert > MCP`
4. Klicken Sie auf `Hinzufügen` und geben Sie folgende Informationen ein:
   - Name: Helium10
   - Befehl: `node /absoluter/pfad/zu/helium10-mcp-server/build/index.js`
5. Klicken Sie auf `Speichern`
6. Wählen Sie den neuen MCP-Server aus der Dropdown-Liste aus

## Schritt 7: Lokale Entwicklung

### TypeScript im Watch-Modus

Für die kontinuierliche Entwicklung können Sie TypeScript im Watch-Modus laufen lassen:

```bash
npm run watch
```

In einem separaten Terminal können Sie dann den Server starten:

```bash
npm start
```

### Lokale Git-Commits

Regelmäßige Commits in Ihr lokales Git-Repository helfen, Änderungen zu verfolgen:

```bash
git add .
git commit -m "Beschreibung der Änderungen"
```

## Fehlerbehebung

### Gemeinsame Probleme

1. **Node.js-Version**
   - Problem: Inkompatible Node.js-Version
   - Lösung: Installieren Sie Node.js v18 oder höher (`nvm install 18`)

2. **Fehlende Abhängigkeiten**
   - Problem: Module können nicht gefunden werden
   - Lösung: Führen Sie `npm install` erneut aus

3. **TypeScript-Kompilierungsfehler**
   - Problem: Build schlägt fehl
   - Lösung: Beheben Sie die Typfehler basierend auf den Fehlermeldungen

4. **Environment-Variablen**
   - Problem: API-Schlüssel werden nicht erkannt
   - Lösung: Überprüfen Sie, ob die `.env`-Datei korrekt ist und ob `dotenv` korrekt importiert wird

### Logging aktivieren

Um ausführlichere Logs zu erhalten, starten Sie den Server im Debug-Modus:

```bash
LOG_LEVEL=debug npm start
```

## Offline-Nutzung

Der Helium10 MCP-Server kann auch ohne Internetverbindung verwendet werden, indem Sie Mock-Daten für die externen APIs verwenden:

1. Erstellen Sie eine lokale Mock-Datei (z.B. `src/mocks/helium10-mock-data.ts`)
2. Passen Sie die API-Module an, um die Mock-Daten zu verwenden, wenn keine Verbindung besteht

```typescript
// In helium10-api.ts
import { mockData } from './mocks/helium10-mock-data';

export async function magnetKeywordResearch(keyword: string, marketplace?: string) {
  try {
    // Versuche API-Anfrage
    const apiResult = await makeApiRequest();
    return apiResult;
  } catch (error) {
    // Bei Fehler: Mock-Daten verwenden
    console.log('Verwende Mock-Daten für', keyword);
    return mockData.magnet[keyword] || mockData.magnet.default;
  }
}
```

## Weitere Ressourcen

- [Entwicklungsanleitung](./docs/ENTWICKLUNGSANLEITUNG.md) - Detaillierte Anleitung für Entwickler
- [Geheimnisverwaltung](./docs/SECRETS_MANAGEMENT.md) - Informationen zur sicheren Verwaltung von Geheimnissen

Bei Fragen oder Problemen wenden Sie sich an Ihren lokalen Projektadministrator.
