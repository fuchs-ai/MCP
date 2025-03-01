/**
 * Lokaler Cache-Mechanismus für den Helium10 MCP-Server
 * 
 * Diese Komponente stellt eine vollständig lokale Caching-Schicht bereit, die verschiedene
 * Datentypen zwischenspeichern kann, um Netzwerkanfragen zu reduzieren und die Leistung zu verbessern.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { logger } from './logger.js';

interface CacheEintrag<T> {
  zeitstempel: number;
  ablaufdatum: number;
  wert: T;
}

interface CacheKonfiguration {
  aktiviert: boolean;
  lebensdauerSekunden: number;
  maximaleGroesseBytes: number;
}

/**
 * Lokaler Cache mit konfigurierbarer Lebensdauer und Größenbegrenzung
 */
export class LokalerCache {
  private basisPfad: string;
  private konfiguration: CacheKonfiguration;
  
  /**
   * Erstellt eine neue Cache-Instanz
   * 
   * @param name - Identifikator für den Cache (bestimmt den Verzeichnisnamen)
   * @param konfiguration - Optionale Konfigurationsparameter für den Cache
   */
  constructor(name: string, konfiguration?: Partial<CacheKonfiguration>) {
    this.basisPfad = path.join(process.cwd(), 'cache', name);
    
    this.konfiguration = {
      aktiviert: true,
      lebensdauerSekunden: 3600, // 1 Stunde
      maximaleGroesseBytes: 100 * 1024 * 1024, // 100 MB
      ...konfiguration
    };
    
    fs.mkdirSync(this.basisPfad, { recursive: true });
    this.initialisieren();
  }
  
  /**
   * Initialisiert den Cache und entfernt abgelaufene Einträge
   */
  private initialisieren(): void {
    if (!this.konfiguration.aktiviert) return;
    
    try {
      this.abgelaufeneEinträgeEntfernen();
      this.maximaleGrößeErzwingen();
      
      logger.debug(`Cache initialisiert: ${this.basisPfad}`);
    } catch (error) {
      logger.warn(`Fehler bei Cache-Initialisierung: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Erzeugt einen konsistenten Hash-Schlüssel für den Cache-Eintrag
   */
  private schlüsselGenerieren(schlüssel: string): string {
    return crypto.createHash('md5').update(schlüssel).digest('hex');
  }
  
  /**
   * Speichert einen Wert im Cache
   * 
   * @param schlüssel - Der Identifikationsschlüssel für den Cache-Eintrag
   * @param wert - Der zu speichernde Wert (beliebiger Typ)
   */
  setzen<T>(schlüssel: string, wert: T): void {
    if (!this.konfiguration.aktiviert) return;
    
    const gehashterSchlüssel = this.schlüsselGenerieren(schlüssel);
    const dateipfad = path.join(this.basisPfad, `${gehashterSchlüssel}.json`);
    
    try {
      const cacheEintrag: CacheEintrag<T> = {
        zeitstempel: Date.now(),
        ablaufdatum: Date.now() + (this.konfiguration.lebensdauerSekunden * 1000),
        wert
      };
      
      fs.writeFileSync(dateipfad, JSON.stringify(cacheEintrag), 'utf-8');
      logger.debug(`Cache-Eintrag gespeichert: ${schlüssel.substring(0, 30)}...`);
    } catch (error) {
      logger.warn(`Fehler beim Speichern des Cache-Eintrags: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Liest einen Wert aus dem Cache
   * 
   * @param schlüssel - Der Identifikationsschlüssel für den Cache-Eintrag
   * @returns Den gespeicherten Wert oder null, wenn nicht gefunden oder abgelaufen
   */
  abrufen<T>(schlüssel: string): T | null {
    if (!this.konfiguration.aktiviert) return null;
    
    const gehashterSchlüssel = this.schlüsselGenerieren(schlüssel);
    const dateipfad = path.join(this.basisPfad, `${gehashterSchlüssel}.json`);
    
    try {
      if (fs.existsSync(dateipfad)) {
        const inhalt = fs.readFileSync(dateipfad, 'utf-8');
        const eintrag = JSON.parse(inhalt) as CacheEintrag<T>;
        
        // Prüfen, ob der Eintrag abgelaufen ist
        if (eintrag.ablaufdatum && eintrag.ablaufdatum > Date.now()) {
          logger.debug(`Cache-Treffer: ${schlüssel.substring(0, 30)}...`);
          return eintrag.wert;
        } else {
          // Abgelaufenen Eintrag entfernen
          fs.unlinkSync(dateipfad);
          logger.debug(`Abgelaufener Cache-Eintrag entfernt: ${schlüssel.substring(0, 30)}...`);
        }
      }
    } catch (error) {
      logger.warn(`Fehler beim Lesen des Cache-Eintrags: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    return null;
  }
  
  /**
   * Entfernt abgelaufene Cache-Einträge
   */
  private abgelaufeneEinträgeEntfernen(): void {
    try {
      const jetzt = Date.now();
      const dateien = fs.readdirSync(this.basisPfad);
      
      for (const datei of dateien) {
        if (!datei.endsWith('.json')) continue;
        
        const dateipfad = path.join(this.basisPfad, datei);
        const inhalt = fs.readFileSync(dateipfad, 'utf-8');
        const eintrag = JSON.parse(inhalt);
        
        if (eintrag.ablaufdatum && eintrag.ablaufdatum < jetzt) {
          fs.unlinkSync(dateipfad);
          logger.debug(`Abgelaufener Cache-Eintrag entfernt: ${datei}`);
        }
      }
    } catch (error) {
      logger.warn(`Fehler beim Bereinigen abgelaufener Cache-Einträge: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Stellt sicher, dass der Cache die maximale Größe nicht überschreitet
   */
  private maximaleGrößeErzwingen(): void {
    try {
      const dateien = fs.readdirSync(this.basisPfad)
        .filter(datei => datei.endsWith('.json'))
        .map(datei => {
          const dateipfad = path.join(this.basisPfad, datei);
          const stats = fs.statSync(dateipfad);
          
          return {
            pfad: dateipfad,
            größe: stats.size,
            zugriffzeit: stats.atime.getTime()
          };
        })
        .sort((a, b) => a.zugriffzeit - b.zugriffzeit); // Älteste zuerst
      
      let gesamtgröße = dateien.reduce((summe, datei) => summe + datei.größe, 0);
      
      // Entfernen der ältesten Einträge, wenn Cache zu groß ist
      while (gesamtgröße > this.konfiguration.maximaleGroesseBytes && dateien.length > 0) {
        const ältesteDatei = dateien.shift();
        if (ältesteDatei) {
          fs.unlinkSync(ältesteDatei.pfad);
          gesamtgröße -= ältesteDatei.größe;
          logger.debug(`Cache-Eintrag entfernt aufgrund von Größenbeschränkung: ${path.basename(ältesteDatei.pfad)}`);
        }
      }
    } catch (error) {
      logger.warn(`Fehler bei der Durchsetzung der Cache-Größenbeschränkung: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Leert den gesamten Cache
   */
  leeren(): void {
    try {
      const dateien = fs.readdirSync(this.basisPfad);
      
      for (const datei of dateien) {
        if (!datei.endsWith('.json')) continue;
        fs.unlinkSync(path.join(this.basisPfad, datei));
      }
      
      logger.info(`Cache geleert: ${this.basisPfad}`);
    } catch (error) {
      logger.warn(`Fehler beim Leeren des Cache: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Gibt Statistiken zum aktuellen Cache-Zustand zurück
   */
  statistikAbrufen(): { anzahlEinträge: number; gesamtgröße: number; durchschnittsalter: number } {
    try {
      const dateien = fs.readdirSync(this.basisPfad)
        .filter(datei => datei.endsWith('.json'))
        .map(datei => {
          const dateipfad = path.join(this.basisPfad, datei);
          const stats = fs.statSync(dateipfad);
          const inhalt = fs.readFileSync(dateipfad, 'utf-8');
          const eintrag = JSON.parse(inhalt) as CacheEintrag<unknown>;
          
          return {
            größe: stats.size,
            alter: Date.now() - eintrag.zeitstempel
          };
        });
      
      const gesamtgröße = dateien.reduce((summe, datei) => summe + datei.größe, 0);
      const durchschnittsalter = dateien.length > 0 
        ? dateien.reduce((summe, datei) => summe + datei.alter, 0) / dateien.length 
        : 0;
      
      return {
        anzahlEinträge: dateien.length,
        gesamtgröße,
        durchschnittsalter
      };
    } catch (error) {
      logger.warn(`Fehler beim Abrufen der Cache-Statistiken: ${error instanceof Error ? error.message : String(error)}`);
      return {
        anzahlEinträge: 0,
        gesamtgröße: 0,
        durchschnittsalter: 0
      };
    }
  }
}
