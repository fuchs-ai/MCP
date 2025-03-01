/**
 * Netzwerk-Hilfsfunktionen für den Helium10 MCP-Server
 * 
 * Diese Utilities bieten Funktionen zur Netzwerkprüfung, Anfragen-Handling und Offline-Modus-Verwaltung.
 */

/**
 * Prüft, ob eine Internetverbindung verfügbar ist
 * 
 * @returns {Promise<boolean>} True, wenn eine Internetverbindung verfügbar ist, sonst False
 */
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
    console.warn(`Internetverbindung nicht verfügbar: ${error.message}`);
    return false;
  }
}

/**
 * Prüft, ob der Offline-Modus aktiv ist
 * 
 * @returns {boolean} True, wenn der Offline-Modus aktiv ist
 */
export function isOfflineMode(): boolean {
  return process.env.OFFLINE_MODE === 'true';
}

/**
 * Setzt den Offline-Modus
 * 
 * @param {boolean} enabled True, um den Offline-Modus zu aktivieren
 */
export function setOfflineMode(enabled: boolean): void {
  process.env.OFFLINE_MODE = enabled ? 'true' : 'false';
  console.log(`Offline-Modus ${enabled ? 'aktiviert' : 'deaktiviert'}`);
}

/**
 * Führt eine Funktion mit Retry-Logik aus
 * 
 * @param {Function} fn Die auszuführende Funktion
 * @param {number} maxRetries Maximale Anzahl an Wiederholungen
 * @param {number} initialDelay Anfängliche Verzögerung in ms
 * @returns {Promise<any>} Das Ergebnis der Funktion
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  let delay = initialDelay;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        console.warn(`Anfrage fehlgeschlagen (Versuch ${attempt + 1}/${maxRetries + 1}), wiederhole in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        // Exponentielles Backoff mit Jitter
        delay = delay * 2 * (0.8 + Math.random() * 0.4);
      }
    }
  }
  
  throw lastError;
}

/**
 * Führt einen Healthcheck für eine API durch
 * 
 * @param {string} apiUrl Die zu prüfende API-URL
 * @param {object} options Optionen für den Healthcheck
 * @returns {Promise<boolean>} True, wenn die API verfügbar ist
 */
export async function checkApiHealth(
  apiUrl: string,
  options: {
    timeout?: number;
    method?: string;
    headers?: Record<string, string>;
  } = {}
): Promise<boolean> {
  const { 
    timeout = 5000,
    method = 'HEAD',
    headers = {} 
  } = options;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(apiUrl, {
      method,
      headers,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.warn(`API ${apiUrl} nicht verfügbar: ${error.message}`);
    return false;
  }
}

/**
 * Erstellt einen API-Status-Bericht für mehrere Endpunkte
 * 
 * @param {Record<string, string>} endpoints Map von API-Namen zu URLs
 * @returns {Promise<Record<string, boolean>>} Status für jeden Endpunkt
 */
export async function getApiStatusReport(
  endpoints: Record<string, string>
): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};
  
  const checks = Object.entries(endpoints).map(async ([name, url]) => {
    results[name] = await checkApiHealth(url);
  });
  
  await Promise.all(checks);
  return results;
}

/**
 * Umfassende Netzwerkdiagnose
 * 
 * @returns {Promise<object>} Diagnose-Ergebnis
 */
export async function runNetworkDiagnostics(): Promise<{
  internetAvailable: boolean;
  offlineMode: boolean;
  apis: Record<string, boolean>;
  dnsResolution: boolean;
  latency: Record<string, number | null>;
}> {
  const internetAvailable = await checkInternetConnection();
  const offlineMode = isOfflineMode();
  
  // Standard-APIs prüfen
  const apis = await getApiStatusReport({
    helium10: 'https://api.helium10.com/health',
    amazon: 'https://webservices.amazon.de',
    google: 'https://www.google.com'
  });
  
  // DNS-Auflösung prüfen
  let dnsResolution = false;
  try {
    // NodeJS dns Modul verwenden, wenn verfügbar
    if (typeof require !== 'undefined') {
      const dns = require('dns');
      await new Promise<void>((resolve, reject) => {
        dns.lookup('google.com', (err: Error) => {
          if (err) reject(err);
          else resolve();
        });
      });
      dnsResolution = true;
    } else {
      // Fallback für Browser-Umgebung
      const response = await fetch('https://www.google.com', { method: 'HEAD' });
      dnsResolution = response.ok;
    }
  } catch (error) {
    console.warn(`DNS-Auflösung fehlgeschlagen: ${error.message}`);
  }
  
  // Latenz messen
  const latency: Record<string, number | null> = {};
  for (const [name, url] of Object.entries({
    helium10: 'https://api.helium10.com/health',
    amazon: 'https://webservices.amazon.de',
    google: 'https://www.google.com'
  })) {
    try {
      const startTime = Date.now();
      await fetch(url, { method: 'HEAD' });
      latency[name] = Date.now() - startTime;
    } catch (error) {
      latency[name] = null;
    }
  }
  
  return {
    internetAvailable,
    offlineMode,
    apis,
    dnsResolution,
    latency
  };
}
