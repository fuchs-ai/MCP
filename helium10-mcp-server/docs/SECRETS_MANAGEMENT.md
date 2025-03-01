# Geheimnisverwaltung für den Helium10 MCP-Server

Diese Dokumentation beschreibt die Geheimnisverwaltungsstrategie für den Helium10 MCP-Server. Der Server verwendet verschiedene sensible Informationen wie API-Schlüssel, Token und Verschlüsselungsschlüssel, die sicher verwaltet werden müssen.

## Geheimnisverwaltungsstrategie

Der Helium10 MCP-Server verwendet einen mehrschichtigen Ansatz zur Verwaltung von Geheimnissen:

1. **Umgebungsvariablen**: Primäre Methode zur Speicherung sensibler Daten
2. **Lokale Konfigurationsdateien**: Alternative für Entwicklungsumgebungen
3. **Automatische Generierung**: Für nicht-kritische Geheimnisse wie Verschlüsselungsschlüssel

## .env-Datei

Die `.env`-Datei enthält die sensiblen Konfigurationsparameter und wird **niemals** in das Repository eingecheckt. Diese Datei wird lokal erstellt und verwaltet.

### Wichtig: Sicherheitshinweise

- Die `.env`-Datei ist in der `.gitignore` aufgeführt und wird nicht mit dem Repository synchronisiert
- Für neue Entwickler existiert eine `.env.example`-Datei als Vorlage
- API-Schlüssel und Token sollten regelmäßig rotiert werden
- In Produktionsumgebungen sollten Geheimnisse über einen spezialisierten Geheimnisverwaltungsdienst oder Container-Umgebungsvariablen verwaltet werden

## Geheimnis-Arten und deren Verwendung

### GitHub-Token

```
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

Dieses Token wird für die GitHub-API-Interaktionen genutzt, wie z.B. zur Erstellung privater Repositories oder zum Pushen von Code.

**Berechtigungen**: Das Token benötigt mindestens folgende Scopes:
- `repo` (für private Repository-Operationen)
- `read:user` (für Zugriff auf Benutzerinformationen)

### Helium10 API-Schlüssel

```
HELIUM10_API_KEY=your_api_key
HELIUM10_API_SECRET=your_api_secret
```

Diese Schlüssel werden für die Authentifizierung bei der Helium10 API verwendet.

### Amazon API-Konfiguration

```
AMAZON_ACCESS_KEY=your_access_key
AMAZON_SECRET_KEY=your_secret_key
AMAZON_ASSOCIATE_TAG=your_associate_tag
```

Diese Schlüssel werden für die Kommunikation mit der Amazon Product Advertising API verwendet.

### Verschlüsselungsschlüssel

```
ENCRYPTION_KEY=random_generated_key
```

Dieser Schlüssel wird für die Verschlüsselung sensibler Daten verwendet, die lokal gespeichert werden. Wenn nicht angegeben, wird ein zufälliger Schlüssel generiert und verwendet.

## Implementierung im Code

Der Zugriff auf Geheimnisse erfolgt über das Konfigurationsmodul:

```typescript
import { config } from './config';

// Verwendung der Geheimnisse
const apiKey = config.helium10.apiKey;
const apiSecret = config.helium10.apiSecret;
```

Das Konfigurationsmodul lädt die Geheimnisse in der folgenden Prioritätsreihenfolge:

1. Umgebungsvariablen aus der `.env`-Datei
2. Lokale Konfigurationsdatei (`config.local.ts`)
3. Standard-Fallback-Werte (für Entwicklung und Tests)

## Initialisierung neuer Entwicklungsumgebungen

Für neue Entwicklungsumgebungen:

1. Kopieren Sie `.env.example` nach `.env`
2. Füllen Sie die erforderlichen Geheimnisse aus
3. Stellen Sie sicher, dass `.env` in `.gitignore` aufgeführt ist
4. Führen Sie Tests durch, um die korrekte Konfiguration zu überprüfen

## Automatische Geheimnisrotation

Der Helium10 MCP-Server unterstützt keine automatische Rotation von Geheimnissen. Es wird empfohlen, einen Prozess für die regelmäßige manuelle Rotation von Geheimnissen zu etablieren:

1. Erstellen Sie neue API-Schlüssel bei den jeweiligen Diensten
2. Aktualisieren Sie die `.env`-Datei mit den neuen Schlüsseln
3. Verifizieren Sie die Funktionalität mit den neuen Schlüsseln
4. Deaktivieren Sie die alten Schlüssel

## Sicherheitshinweise

- Verwenden Sie starke, eindeutige Schlüssel und Passwörter
- Teilen Sie keine Geheimnisse über unsichere Kanäle
- Überprüfen Sie regelmäßig auf unbeabsichtigte Offenlegung von Geheimnissen im Code
- Verwenden Sie `git-secrets` oder ähnliche Tools, um zu verhindern, dass Geheimnisse versehentlich eingecheckt werden
