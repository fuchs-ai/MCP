# Offline-Entwicklung des Helium10 MCP-Servers

Diese Dokumentation beschreibt, wie der Helium10 MCP-Server vollständig offline entwickelt und getestet werden kann, ohne Abhängigkeiten von externen Diensten oder Netzwerkverbindungen.

## Offline-Entwicklungsstrategie

Der Helium10 MCP-Server unterstützt einen vollständigen Offline-Modus durch:

1. **Lokale Paket-Caches** für npm-Abhängigkeiten
2. **Mock-Daten** für Helium10 und Amazon APIs
3. **In-Memory-Datenbanken** für die lokale Entwicklung
4. **Lokale Versionskontrolle** ohne Remote-Repository-Abhängigkeit

## NPM-Pakete lokal cachen

### Pakete für Offline-Nutzung vorabladen

Führen Sie folgenden Befehl aus, während Sie online sind, um Pakete lokal zu cachen:

```bash
# Pakete im globalen Cache speichern
npm ci

# Prüfen, ob alle Abhängigkeiten lokal verfügbar sind
npm ls --parseable
```

### Offline-NPM-Konfiguration

Die `.npmrc`-Datei ist bereits für Offline-Entwicklung konfiguriert:

```
prefer-offline=true
offline-strategy=dynamic
```

Sie können den Offline-Modus erzwingen mit:

```bash
npm config set offline true
npm config set prefer-offline true
```

## Mock-Daten für APIs

### API-Mock-Struktur

Die Mock-Daten sind in separaten Modulen unter `src/mocks/` organisiert:

- `helium10-mock-data.ts` - Mock-Daten für alle Helium10 API-Funktionen
- `amazon-mock-data.ts` - Mock-Daten für Amazon-Produkte und -Kategorien

### Integration in API-Module

Um Mock-Daten in den API-Modulen zu verwenden, modifizieren Sie die entsprechenden Funktionen:

```typescript
// In src/apis/helium10-api.ts
import { mockData } from '../mocks/helium10-mock-data';

export async function magnetKeywordResearch(keyword: string, marketplace = 'amazon.de') {
  // Offline-Modus-Erkennung
  const isOffline = process.env.OFFLINE_MODE === 'true' || !await checkInternetConnection();
  
  if (isOffline) {
    console.log('Offline-Modus: Verwende Mock-Daten für Helium10 Magnet');
    // Spezifische Antwort für bekannte Keywords oder Standard-Antwort
    return mockData.magnet[keyword.toLowerCase()] || mockData.magnet.default;
  }
  
  try {
    // Echte API-Anfrage hier...
    const response = await fetchFromHelium10Api('magnet', { keyword, marketplace });
    return response;
  } catch (error) {
    // Bei Netzwerkfehlern auf Mock-Daten zurückfallen
    console.warn('Fehler bei Helium10 API-Anfrage, verwende Mock-Daten:', error.message);
    return mockData.magnet[keyword.toLowerCase()] || mockData.magnet.default;
  }
}
```

### Internetverbindung prüfen

Implementieren Sie eine Hilfsfunktion zur Erkennung des Offline-Status:

```typescript
// In src/utils/network.ts
export async function checkInternetConnection(): Promise<boolean> {
  try {
    // Versuche eine einfache HEAD-Anfrage an einen zuverlässigen Dienst
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('https://www.google.com', {
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}
```

## In-Memory-Datenbanken

### Temporäre Datenspeicherung

Für Entwicklung ohne Datenbankverbindung verwenden Sie eine In-Memory-Datenbank:

```typescript
// In src/db/in-memory-db.ts
export class InMemoryDatabase {
  private static instance: InMemoryDatabase;
  private data: Map<string, any>;
  
  private constructor() {
    this.data = new Map();
  }
  
  static getInstance(): InMemoryDatabase {
    if (!InMemoryDatabase.instance) {
      InMemoryDatabase.instance = new InMemoryDatabase();
    }
    return InMemoryDatabase.instance;
  }
  
  set(key: string, value: any): void {
    this.data.set(key, value);
  }
  
  get(key: string): any {
    return this.data.get(key);
  }
  
  delete(key: string): boolean {
    return this.data.delete(key);
  }
  
  clear(): void {
    this.data.clear();
  }
  
  // Simulierte Sammlung für dokumentenbasierte Abfragen
  collection(name: string) {
    if (!this.data.has(name)) {
      this.data.set(name, []);
    }
    
    const collection = this.data.get(name);
    
    return {
      find: (query = {}) => {
        return collection.filter(doc => {
          return Object.entries(query).every(([key, value]) => doc[key] === value);
        });
      },
      findOne: (query = {}) => {
        return collection.find(doc => {
          return Object.entries(query).every(([key, value]) => doc[key] === value);
        });
      },
      insert: (doc) => {
        const newDoc = { _id: Date.now().toString(), ...doc };
        collection.push(newDoc);
        return newDoc;
      },
      update: (query, update) => {
        const docs = collection.filter(doc => {
          return Object.entries(query).every(([key, value]) => doc[key] === value);
        });
        
        for (const doc of docs) {
          Object.assign(doc, update);
        }
        
        return { modified: docs.length };
      },
      remove: (query) => {
        const initialLength = collection.length;
        const newCollection = collection.filter(doc => {
          return !Object.entries(query).every(([key, value]) => doc[key] === value);
        });
        
        this.data.set(name, newCollection);
        return { deleted: initialLength - newCollection.length };
      }
    };
  }
}
```

### Integration in Datenbanklogik

```typescript
// In src/db/db.ts
import { InMemoryDatabase } from './in-memory-db';

export async function getDatabase() {
  const isOffline = process.env.OFFLINE_MODE === 'true';
  
  if (isOffline) {
    return {
      collection: (name) => InMemoryDatabase.getInstance().collection(name)
    };
  }
  
  // Echte Datenbankverbindung hier...
}
```

## Lokale Dateisystem-Caches

### Caching-Mechanismus implementieren

```typescript
// In src/cache/file-cache.ts
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export class FileSystemCache {
  private cacheDir: string;
  
  constructor(directoryName = '.cache') {
    this.cacheDir = path.join(process.cwd(), directoryName);
    
    // Stelle sicher, dass das Cache-Verzeichnis existiert
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }
  
  private getCacheFilePath(key: string): string {
    // Erstelle einen sicheren Dateinamen aus dem Schlüssel
    const hash = crypto
      .createHash('md5')
      .update(key)
      .digest('hex');
      
    return path.join(this.cacheDir, `${hash}.json`);
  }
  
  async get<T>(key: string): Promise<T | null> {
    const filePath = this.getCacheFilePath(key);
    
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }
      
      const data = fs.readFileSync(filePath, 'utf8');
      const { value, expires } = JSON.parse(data);
      
      // Prüfe, ob der Cache abgelaufen ist
      if (expires && expires < Date.now()) {
        fs.unlinkSync(filePath);
        return null;
      }
      
      return value as T;
    } catch (error) {
      console.warn(`Fehler beim Lesen aus Cache: ${error.message}`);
      return null;
    }
  }
  
  async set<T>(key: string, value: T, ttlSeconds = 3600): Promise<void> {
    const filePath = this.getCacheFilePath(key);
    const expires = ttlSeconds > 0 ? Date.now() + (ttlSeconds * 1000) : null;
    
    try {
      const data = JSON.stringify({ value, expires });
      fs.writeFileSync(filePath, data, 'utf8');
    } catch (error) {
      console.warn(`Fehler beim Schreiben in Cache: ${error.message}`);
    }
  }
  
  async delete(key: string): Promise<boolean> {
    const filePath = this.getCacheFilePath(key);
    
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return true;
    } catch (error) {
      console.warn(`Fehler beim Löschen aus Cache: ${error.message}`);
      return false;
    }
  }
  
  async clear(): Promise<void> {
    try {
      const files = fs.readdirSync(this.cacheDir);
      
      for (const file of files) {
        fs.unlinkSync(path.join(this.cacheDir, file));
      }
    } catch (error) {
      console.warn(`Fehler beim Leeren des Caches: ${error.message}`);
    }
  }
}
```

### Cache in API-Anfragen verwenden

```typescript
// In src/apis/amazon-api.ts
import { FileSystemCache } from '../cache/file-cache';
import { amazonMockData } from '../mocks/amazon-mock-data';

const cache = new FileSystemCache('amazon-cache');

export async function searchProducts(keyword: string, marketplace = 'amazon.de') {
  const isOffline = process.env.OFFLINE_MODE === 'true';
  const cacheKey = `product-search:${marketplace}:${keyword}`;
  
  // Versuche zuerst, aus dem Cache zu lesen
  const cachedData = await cache.get(cacheKey);
  if (cachedData) {
    return cachedData;
  }
  
  if (isOffline) {
    console.log('Offline-Modus: Verwende Mock-Daten für Amazon-Produktsuche');
    const data = amazonMockData.productSearch[keyword.toLowerCase()] || 
                 amazonMockData.productSearch.default;
                 
    // Cache die Daten für Offline-Wiederverwendung
    await cache.set(cacheKey, data, 24 * 60 * 60); // 24 Stunden
    return data;
  }
  
  try {
    // Echte API-Anfrage hier...
    const result = await fetchFromAmazonApi('search', { keyword, marketplace });
    
    // Cache die Ergebnisse
    await cache.set(cacheKey, result, 6 * 60 * 60); // 6 Stunden
    return result;
  } catch (error) {
    console.warn('Fehler bei Amazon API-Anfrage, verwende Mock-Daten:', error.message);
    const data = amazonMockData.productSearch[keyword.toLowerCase()] || 
                 amazonMockData.productSearch.default;
                 
    await cache.set(cacheKey, data, 24 * 60 * 60); // 24 Stunden
    return data;
  }
}
```

## Offline-Tests

### Vollständig Offline testen

Um sicherzustellen, dass Tests ohne Netzwerkverbindung funktionieren:

```typescript
// In test/offline-mode.test.ts
import { vi, describe, beforeAll, afterAll, it, expect } from 'vitest';
import { magnetKeywordResearch } from '../src/apis/helium10-api';
import { searchProducts } from '../src/apis/amazon-api';

describe('Offline-Modus', () => {
  beforeAll(() => {
    // Aktiviere den Offline-Modus für Tests
    process.env.OFFLINE_MODE = 'true';
    
    // Mock für Netzwerkverbindungsprüfung, damit sie immer false zurückgibt
    vi.mock('../src/utils/network', () => ({
      checkInternetConnection: vi.fn().mockResolvedValue(false)
    }));
  });
  
  afterAll(() => {
    process.env.OFFLINE_MODE = 'false';
    vi.resetAllMocks();
  });
  
  it('sollte Mock-Daten für Helium10 Magnet verwenden', async () => {
    const result = await magnetKeywordResearch('smartphone');
    
    expect(result).toBeDefined();
    expect(result.keywords).toBeInstanceOf(Array);
    expect(result.keywords.length).toBeGreaterThan(0);
    // Prüfe, ob die Daten den erwarteten Mock-Daten entsprechen
    expect(result.keywords[0].keyword).toBe('smartphone');
  });
  
  it('sollte Mock-Daten für Amazon-Produktsuche verwenden', async () => {
    const result = await searchProducts('smartphone');
    
    expect(result).toBeDefined();
    expect(result.products).toBeInstanceOf(Array);
    expect(result.products.length).toBeGreaterThan(0);
    // Prüfe, ob die Daten den erwarteten Mock-Daten entsprechen
    expect(result.products[0].asin).toBe('B07V2BMBXG');
  });
});
```

### Netzwerkaktivität während Tests deaktivieren

```typescript
// In vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    environmentOptions: {
      // Deaktiviere alle echten Netzwerkanfragen während der Tests
      isolate: true
    }
  }
});

// In test/setup.ts
import { beforeAll } from 'vitest';

beforeAll(() => {
  // Optional: Aktiviere Offline-Modus nur für bestimmte Test-Suites
  if (process.env.TEST_OFFLINE === 'true') {
    process.env.OFFLINE_MODE = 'true';
  }
});
```

## Offline-Modus aktivieren

### Umgebungsvariablen setzen

```bash
# Offline-Modus aktivieren
export OFFLINE_MODE=true

# Server starten
npm start
```

### Konfigurationsdatei

Alternativ können Sie eine dauerhafte Konfiguration in `.env` setzen:

```
# .env
OFFLINE_MODE=true
CACHE_TTL=86400  # 24 Stunden in Sekunden
MOCK_DATA_PATH=./src/mocks
```

### Grafisches Offline-Modus-Toggle

Fügen Sie ein Offline-Modus-Toggle zur Webanwendung hinzu:

```typescript
// In src/ui/components/OfflineToggle.tsx
import React, { useState, useEffect } from 'react';

export const OfflineToggle: React.FC = () => {
  const [isOffline, setIsOffline] = useState(false);
  
  useEffect(() => {
    // Lade den aktuellen Status
    const checkStatus = async () => {
      const response = await fetch('/api/status');
      const { offline } = await response.json();
      setIsOffline(offline);
    };
    
    checkStatus();
  }, []);
  
  const toggleOfflineMode = async () => {
    const newState = !isOffline;
    
    // Sende den neuen Status an den Server
    await fetch('/api/offline-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offline: newState })
    });
    
    setIsOffline(newState);
  };
  
  return (
    <div className="offline-toggle">
      <label>
        <input
          type="checkbox"
          checked={isOffline}
          onChange={toggleOfflineMode}
        />
        {isOffline ? 'Offline-Modus aktiv' : 'Online-Modus aktiv'}
      </label>
    </div>
  );
};
```

## Fehlerbehebung im Offline-Modus

### Häufige Probleme und Lösungen

1. **Problem**: NPM-Pakete können nicht installiert werden
   **Lösung**: Verwenden Sie `npm ci` statt `npm install`, wenn Sie bereits einen gültigen Lock-File haben

2. **Problem**: Mock-Daten sind veraltet oder unvollständig
   **Lösung**: Aktualisieren Sie die Mock-Daten basierend auf den neuesten API-Antworten:
   ```bash
   npm run update-mocks
   ```

3. **Problem**: Cache-Verzeichnis ist korrupt
   **Lösung**: Löschen Sie das Cache-Verzeichnis und erstellen Sie es neu:
   ```bash
   rm -rf .cache
   mkdir .cache
   ```

### Logs und Debugging

Aktivieren Sie erweiterte Logs für Offline-Diagnose:

```bash
DEBUG=helium10:*,amazon:*,network:* npm start
```

## Offline-Entwicklungsbeste Praktiken

1. **Aktualisieren Sie Mock-Daten regelmäßig**, um echte API-Antwortformate zu reflektieren
2. **Modularisieren Sie die Code-Basis**, um Netzwerkabhängigkeiten zu isolieren
3. **Verwenden Sie Dependency Injection**, um Mock-Implementierungen einfach auszutauschen
4. **Testen Sie sowohl Online- als auch Offline-Modi** für umfassende Abdeckung
5. **Dokumentieren Sie offline-spezifisches Verhalten** in JSDocs und Readmes

## Fazit

Mit diesen Implementierungen können Sie den Helium10 MCP-Server vollständig offline entwickeln und testen. Dies ermöglicht produktiveres Arbeiten in netzwerklosen Umgebungen, schnellere Tests und erhöhte Zuverlässigkeit bei intermittierenden Netzwerkproblemen.

## Sequentielle Workflow-Verarbeitung im Offline-Modus

Der Helium10 MCP-Server bietet ein robustes System für die sequentielle Verarbeitung von MCP-Tools, das auch im Offline-Modus vollständig funktioniert:

### Workflow-Manager

Die Kernfunktionalität wird über den WorkflowManager implementiert, der sich in `src/utils/workflow.ts` befindet:

```typescript
import { WorkflowManager, workflowManager } from '../utils/workflow';

// Verwendung des globalen Workflow-Managers
const result = await workflowManager.executeWorkflow('produktRecherche', {
  keyword: 'gaming laptop',
  marketplace: 'amazon.de'
});

// Oder Erstellung eines eigenen Workflow-Managers
const myWorkflowManager = new WorkflowManager();
myWorkflowManager.registerStep('meinSchritt', meineFunktion);
myWorkflowManager.registerWorkflow('meinWorkflow', ['meinSchritt']);
```

### Workflow-Cache

Alle Workflow-Ergebnisse werden automatisch im Dateisystem zwischengespeichert, sodass Workflows im Offline-Modus nicht neu berechnet werden müssen:

```typescript
const workflowCache = new FileSystemCache('workflow-cache');

// Im Workflow-Manager integriert:
if (isOfflineMode()) {
  const cachedResult = await workflowCache.get(cacheKey);
  if (cachedResult) {
    console.log(`Workflow-Cache-Treffer für ${workflowId}`);
    return cachedResult;
  }
}
```

### Integrierte Workflow-Tools

Die Datei `src/tools/workflow-tools.ts` enthält hochrangige MCP-Tools, die mehrere Einzeltools sequentiell kombinieren:

```typescript
import { vollständigeProduktrechercheTool, konkurrenzanalyseTool, listingOptimierungTool } from './tools/workflow-tools';

// Benutzung:
const ergebnis = await vollständigeProduktrechercheTool('smartphone zubehör', 'amazon.de');
```

### Vorteile sequentieller Workflows

1. **Wiederverwendbarkeit**: Einmal definierte Workflow-Schritte können in verschiedenen Workflows eingesetzt werden.
2. **Fehlerbehandlung**: Fehler in einem Schritt werden protokolliert und der Workflow wird sauber beendet.
3. **Cache-Nutzung**: Bereits berechnete Workflows können im Offline-Modus sofort wiederverwendet werden.
4. **Protokollierung**: Alle Workflow-Ausführungen werden automatisch im `logs/workflows`-Verzeichnis protokolliert.

### Beispiel: Definition eines neuen Workflows

```typescript
// Schritte registrieren
workflowManager
  .registerStep('keywordAnalyse', magnetKeywordResearchTool)
  .registerStep('produktSuche', xrayProductAnalysisTool)
  .registerStep('konkurrenzenVergleich', (data, context) => {
    // Hier kann benutzerdefinierte Logik implementiert werden
    // mit Zugriff auf die Ergebnisse vorheriger Schritte
    const keywordErgebnis = context.previousResults.keywordAnalyse;
    const produktErgebnis = context.previousResults.produktSuche;
    
    return {
      konkurrenzLevel: berechneLevelFunktion(keywordErgebnis, produktErgebnis),
      empfehlungen: generiereEmpfehlungen(keywordErgebnis, produktErgebnis)
    };
  });

// Workflow registrieren
workflowManager.registerWorkflow('marktanalyse', [
  'keywordAnalyse',
  'produktSuche',
  'konkurrenzenVergleich'
]);

// Workflow ausführen
const ergebnis = await workflowManager.executeWorkflow('marktanalyse', {
  suchbegriff: 'bluetooth kopfhörer'
});
```

### Offline-Vorlagen für Workflows

Für die Offline-Entwicklung sind im System bereits mehrere Standard-Workflows vorkonfiguriert:

1. **produktRecherche**: Führt Keyword-Recherche, Produktsuche, Marktanalyse und Verbesserungsvorschläge sequentiell aus.
2. **keywordAnalyse**: Kombiniert Magnet-Recherche, Konkurrenzanalyse und Cerebro-Analyse.
3. **verkaufsAnalyse**: Analysiert Verkaufsdaten, Produktperformance und erstellt Umsatzprognosen.
4. **listingOptimierung**: Optimiert Produktlistings mit Titel, Bullet Points und Beschreibungen.

Diese Workflows funktionieren auch ohne Internetverbindung vollständig mit Mock-Daten.
