import { setupDatabase, KnowledgeBaseEntry, getKnowledgeBaseEntries } from './db.js';
import { HfInference } from '@huggingface/inference';
import { getConfig } from './config.js';
import { logger } from './logger.js';
import { LokalerCache } from './cache.js';
import fs from 'fs';
import path from 'path';

/**
 * Schnittstelle für Suchergebnisse aus der Wissensdatenbank
 */
interface Suchergebnis {
  titel: string;
  inhalt: string;
  ähnlichkeit: number;
  quelle: string;
  url?: string;
  zeitstempel?: number;
}

const MODELL_NAME = "sentence-transformers/all-MiniLM-L6-v2";

// Erstelle eine Singleton-Instanz des Embeddings-Cache
const embeddingsCache = new LokalerCache('embeddings', {
  aktiviert: true,
  lebensdauerSekunden: 604800, // 7 Tage
  maximaleGroesseBytes: 500 * 1024 * 1024 // 500 MB
});

let hfInference: HfInference | null = null;

/**
 * Initialisiert die Hugging Face Inference mit dem API-Key aus der Konfiguration
 * 
 * @returns HfInference-Instanz für Embedding-Generierung
 */
function getHfInference(): HfInference {
  if (!hfInference) {
    const config = getConfig();
    hfInference = new HfInference(config.huggingfaceApiKey);
    logger.debug('Hugging Face Inference initialisiert', { model: MODELL_NAME });
  }
  return hfInference;
}

/**
 * Vektoroperationen für RAG-Funktionalität
 */
export class Vektoroperationen {
  /**
   * Berechnet die Kosinus-Ähnlichkeit zwischen zwei Vektoren
   */
  static cosinusÄhnlichkeit(vektorA: number[], vektorB: number[]): number {
    if (vektorA.length !== vektorB.length) {
      const minDimension = Math.min(vektorA.length, vektorB.length);
      vektorA = vektorA.slice(0, minDimension);
      vektorB = vektorB.slice(0, minDimension);
    }
    
    const skalarprodukt = vektorA.reduce((summe, wert, i) => summe + wert * vektorB[i], 0);
    const magnitudeA = Math.sqrt(vektorA.reduce((summe, wert) => summe + wert * wert, 0));
    const magnitudeB = Math.sqrt(vektorB.reduce((summe, wert) => summe + wert * wert, 0));
    
    return magnitudeA === 0 || magnitudeB === 0 ? 0 : skalarprodukt / (magnitudeA * magnitudeB);
  }

  /**
   * Generiert ein Fallback-Embedding für den Fall, dass die API nicht verfügbar ist
   * 
   * Implementiert ein einfaches Bag-of-Words-Modell für Ähnlichkeitsvergleiche
   */
  static fallbackEmbeddingGenerieren(text: string): number[] {
    // Tokenisierung und Häufigkeitsanalyse
    const wörter = text.toLowerCase().split(/\W+/).filter(wort => wort.length > 2);
    const wortHäufigkeit: Record<string, number> = {};
    
    wörter.forEach(wort => {
      wortHäufigkeit[wort] = (wortHäufigkeit[wort] || 0) + 1;
    });
    
    // Einfache Term-Frequency-Vektoren
    const einzigartigeWörter = Object.keys(wortHäufigkeit);
    const embedding = einzigartigeWörter.map(wort => wortHäufigkeit[wort] / wörter.length);
    
    return embedding;
  }
}

/**
 * Generiert Embeddings für einen Text mit lokalem Caching
 * 
 * @param text - Der Text, für den ein Embedding generiert werden soll
 * @returns Promise mit dem Embedding als Zahlenvektorarray
 */
async function getEmbedding(text: string): Promise<number[]> {
  // Cache-Schlüssel generieren (MD5-Hash wäre effizienter, aber für die Lesbarkeit hier vereinfacht)
  const cacheSchlüssel = `embedding_${Buffer.from(text.slice(0, 100)).toString('base64')}`;
  
  // Prüfen, ob Embedding bereits im Cache existiert
  const gecachtesEmbedding = embeddingsCache.abrufen<number[]>(cacheSchlüssel);
  if (gecachtesEmbedding) {
    logger.debug('Embedding aus lokalem Cache geladen');
    return gecachtesEmbedding;
  }
  
  try {
    const hf = getHfInference();
    logger.debug('Erstelle Embedding für Text', { textLength: text.length });
    
    const response = await hf.featureExtraction({
      model: MODELL_NAME,
      inputs: text,
    });
    
    const embedding = Array.isArray(response) ? response : [response];
    logger.debug('Embedding erstellt', { dimensions: embedding.length });
    
    // Im Cache speichern
    embeddingsCache.setzen(cacheSchlüssel, embedding);
    
    return embedding;
  } catch (error) {
    logger.warn('Fehler bei der Erstellung des Embeddings, lokalen Fallback verwenden', 
                error instanceof Error ? error.message : String(error));
    
    // Lokalen Fallback für Embeddings verwenden
    const fallbackEmbedding = Vektoroperationen.fallbackEmbeddingGenerieren(text);
    embeddingsCache.setzen(cacheSchlüssel, fallbackEmbedding);
    
    return fallbackEmbedding;
  }
}

/**
 * Erweitert Suchergebnisse mit zusätzlichen Informationen und verbessert die Relevanz
 * 
 * @param suchergebnisse - Die Rohergebnisse aus der Datenbankabfrage
 * @param abfrage - Die ursprüngliche Benutzerabfrage
 * @returns Angereicherte und sortierte Suchergebnisse
 */
function suchergebnisseAnreichern(
  suchergebnisse: Suchergebnis[], 
  abfrage: string
): Suchergebnis[] {
  // Abfragewörter für Hervorhebung und Relevanzsteigerung
  const abfrageWörter = abfrage.toLowerCase()
    .split(/\W+/)
    .filter(wort => wort.length > 3); // Nur längere Wörter berücksichtigen
  
  // Anreichern der Suchergebnisse
  const angereicherteSuchergebnisse = suchergebnisse.map(ergebnis => {
    // Textkontext-basierte Relevanzbewertung
    let kontextRelevanz = 0;
    
    // Prüfen, ob wichtige Abfragewörter im Titel vorkommen (höhere Gewichtung)
    abfrageWörter.forEach(wort => {
      if (ergebnis.titel.toLowerCase().includes(wort)) {
        kontextRelevanz += 0.1; // Bonus für Titelübereinstimmung
      }
    });
    
    // Prüfen, wie viele Abfragewörter im Inhalt vorkommen
    const inhaltNiedrig = ergebnis.inhalt.toLowerCase();
    const wortTreffer = abfrageWörter.filter(wort => inhaltNiedrig.includes(wort)).length;
    kontextRelevanz += (wortTreffer / abfrageWörter.length) * 0.2; // Bis zu 0.2 Bonus für Inhaltsübereinstimmung
    
    // Aktualität berücksichtigen, falls Zeitstempel vorhanden
    let aktualitätsBonus = 0;
    if (ergebnis.zeitstempel) {
      const jetzt = Date.now();
      const alterInTagen = (jetzt - ergebnis.zeitstempel) / (1000 * 60 * 60 * 24);
      
      // Neuere Dokumente erhalten einen Bonus (max. 0.1 für Dokumente jünger als 30 Tage)
      aktualitätsBonus = Math.max(0, 0.1 - (alterInTagen / 300));
    }
    
    // Kombinierte Ähnlichkeit berechnen
    const kombinierteÄhnlichkeit = ergebnis.ähnlichkeit + kontextRelevanz + aktualitätsBonus;
    
    return {
      ...ergebnis,
      ähnlichkeit: Math.min(1.0, kombinierteÄhnlichkeit) // Auf 1.0 begrenzen
    };
  });
  
  // Sortieren nach kombinierter Ähnlichkeit
  return angereicherteSuchergebnisse.sort((a, b) => b.ähnlichkeit - a.ähnlichkeit);
}

/**
 * Führt eine Abfrage an die Wissensdatenbank durch und findet relevante Inhalte
 * 
 * @param abfrage - Die Benutzerabfrage an die Wissensdatenbank
 * @returns Promise mit formatierter Textantwort aus der Wissensdatenbank
 */
async function wissensabfrageDurchführen(abfrage: string): Promise<string> {
  logger.info('Abfrage an Wissensdatenbank', { abfrage });
  
  try {
    const db = await setupDatabase();

    // 1. Abfrage-Embedding generieren
    const abfrageEmbedding = await getEmbedding(abfrage);

    // 2. Dokumente aus Datenbank abrufen
    const dokumente = await getKnowledgeBaseEntries(db);
    logger.debug('Dokumente aus Wissensdatenbank abgerufen', { anzahl: dokumente.length });

    if (dokumente.length === 0) {
      logger.warn('Keine Dokumente in der Wissensdatenbank gefunden');
      return "Es wurden keine relevanten Informationen in der Wissensdatenbank gefunden. Bitte führen Sie zuerst ein Scraping der Wissensdatenbank durch.";
    }

    // 3. Ähnlichste Dokumente finden
    const ergebnisse = dokumente
      .map((dok: KnowledgeBaseEntry): Suchergebnis => {
        try {
          const embedding = JSON.parse(dok.embedding || '[]');
          const ähnlichkeit = Vektoroperationen.cosinusÄhnlichkeit(abfrageEmbedding, embedding);
          
          return {
            titel: dok.title,
            inhalt: dok.content,
            quelle: dok.source,
            url: dok.url,
            ähnlichkeit,
            zeitstempel: dok.created_at ? new Date(dok.created_at).getTime() : undefined
          };
        } catch (error) {
          logger.warn(`Fehler bei der Ähnlichkeitsberechnung für Dokument ID ${dok.id}`, { 
            error: (error as Error).message 
          });
          return {
            titel: dok.title,
            inhalt: dok.content,
            quelle: dok.source,
            url: dok.url,
            ähnlichkeit: 0
          };
        }
      })
      .filter(ergebnis => !isNaN(ergebnis.ähnlichkeit) && ergebnis.ähnlichkeit > 0.15) // Filtern sehr geringer Ähnlichkeiten
      
    // Ergebnisse anreichern und sortieren
    const angereicherteErgebnisse = suchergebnisseAnreichern(ergebnisse, abfrage)
      .slice(0, 3); // Top 3 relevanteste Ergebnisse

    logger.info('Ergebnisse der Wissensdatenbank-Abfrage', { 
      abfrage, 
      ergebnisanzahl: angereicherteErgebnisse.length,
      besteÄhnlichkeit: angereicherteErgebnisse.length > 0 ? angereicherteErgebnisse[0].ähnlichkeit : 0
    });

    if (angereicherteErgebnisse.length === 0) {
      return "Es wurden keine relevanten Informationen zu Ihrer Abfrage gefunden.";
    }

    // 4. Antwort mit kontextuellem Bezug generieren
    return kontextbezogeneAntwortGenerieren(abfrage, angereicherteErgebnisse);
  } catch (error) {
    logger.error('Fehler bei der Abfrage der Wissensdatenbank', error as Error);
    throw error;
  }
}

/**
 * Generiert eine kontextbezogene Antwort basierend auf den Suchergebnissen
 * 
 * @param abfrage - Die ursprüngliche Benutzerabfrage
 * @param ergebnisse - Die aufbereiteten Suchergebnisse
 * @returns Formatierte Textantwort mit Quellenangaben
 */
function kontextbezogeneAntwortGenerieren(
  abfrage: string, 
  ergebnisse: Suchergebnis[]
): string {
  // Relevante Sätze aus den Dokumenten extrahieren
  const relevanteSätze = extrahiereRelevanteSätze(abfrage, ergebnisse);
  
  // Antwort aus den relevanten Sätzen zusammenstellen
  const antwortText = relevanteSätze.length > 0 
    ? relevanteSätze.join(' ') 
    : `Basierend auf der Helium10-Wissensdatenbank wurden relevante Inhalte zu "${abfrage}" gefunden.`;
  
  // Quellenangaben formatieren
  const quellenInfo = ergebnisse
    .map((r, index) => {
      const quelleInfo = r.url ? `[${index + 1}] ${r.quelle}: ${r.url}` : `[${index + 1}] ${r.quelle}`;
      return `${quelleInfo} (Relevanz: ${(r.ähnlichkeit * 100).toFixed(1)}%)`;
    })
    .join('\n');
  
  return `${antwortText}\n\nQuellen:\n${quellenInfo}`;
}

/**
 * Extrahiert relevante Sätze aus den Suchergebnissen basierend auf der Abfrage
 * 
 * @param abfrage - Die Benutzerabfrage
 * @param ergebnisse - Die Suchergebnisse
 * @returns Array mit relevanten Sätzen für die Antwort
 */
function extrahiereRelevanteSätze(abfrage: string, ergebnisse: Suchergebnis[]): string[] {
  // Schlüsselwörter aus der Abfrage extrahieren
  const abfrageWörter = abfrage.toLowerCase().split(/\W+/).filter(wort => wort.length > 3);
  const relevanteSätze: string[] = [];
  
  // Alle Inhalte zusammenführen
  const gesamtInhalt = ergebnisse.map(r => r.inhalt).join('\n\n');
  
  // Sätze extrahieren und bewerten
  const sätze = gesamtInhalt.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  sätze.forEach(satz => {
    const satzNiedrig = satz.toLowerCase();
    const übereinstimmungsPunkte = abfrageWörter.reduce((punkte, wort) => {
      return satzNiedrig.includes(wort) ? punkte + 1 : punkte;
    }, 0);
    
    if (übereinstimmungsPunkte > 0) {
      relevanteSätze.push(satz.trim());
    }
  });
  
  // Falls keine relevanten Sätze gefunden wurden, verwende die ersten Sätze der relevantesten Dokumente
  if (relevanteSätze.length === 0) {
    ergebnisse.forEach(r => {
      const ersteSätze = r.inhalt.split(/[.!?]+/).slice(0, 2).join('. ').trim();
      if (ersteSätze.length > 0) {
        relevanteSätze.push(ersteSätze);
      }
    });
  }
  
  return relevanteSätze;
}

// Exportiere Funktionalität unter deutschen Namen
export { 
  wissensabfrageDurchführen as queryKnowledgeBase, 
  getEmbedding,
  Vektoroperationen
};
