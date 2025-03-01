import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { getConfig } from './config.js';
import { logger } from './logger.js';

export interface KnowledgeBaseEntry {
  id: number;
  source: string;
  title: string;
  content: string;
  url?: string;
  embedding?: string;
}

export interface Product {
  id: number;
  asin: string;
  title?: string;
  price?: number;
  reviews_count?: number;
  rating?: number;
  url?: string;
}

async function setupDatabase() {
  const config = getConfig();
  logger.info(`Initialisiere Datenbank unter ${config.dbPath}`);
  
  const db = await open({
    filename: config.dbPath,
    driver: sqlite3.Database
  });

  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_base (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        url TEXT,
        embedding TEXT
      );
    `);
    logger.debug('Wissensdatenbank-Tabelle geprüft');

    await db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asin TEXT NOT NULL UNIQUE,
        title TEXT,
        price REAL,
        reviews_count INTEGER,
        rating REAL,
        url TEXT
      );
    `);
    logger.debug('Produkte-Tabelle geprüft');

    return db;
  } catch (error) {
    logger.error('Fehler bei der Datenbankinitialisierung', error as Error);
    throw error;
  }
}

async function addKnowledgeBaseEntry(
  db: Database,
  source: string,
  title: string,
  content: string,
  url?: string,
  embedding?: number[]
) {
  try {
    const result = await db.run(
      `INSERT INTO knowledge_base (source, title, content, url, embedding)
       VALUES (?, ?, ?, ?, ?)`,
      [source, title, content, url, embedding ? JSON.stringify(embedding) : null]
    );
    logger.debug(`Wissensdatenbank-Eintrag hinzugefügt: "${title}"`, { source, id: result.lastID });
    return result.lastID;
  } catch (error) {
    logger.error(`Fehler beim Hinzufügen des Wissensdatenbank-Eintrags: "${title}"`, error as Error);
    throw error;
  }
}

async function getProductByAsin(db: Database, asin: string): Promise<Product | undefined> {
  try {
    const product = await db.get('SELECT * FROM products WHERE asin = ?', [asin]);
    logger.debug(`Produkt mit ASIN ${asin} abgefragt`, { 
      gefunden: !!product 
    });
    return product;
  } catch (error) {
    logger.error(`Fehler beim Abrufen des Produkts mit ASIN ${asin}`, error as Error);
    throw error;
  }
}

async function addOrUpdateProduct(
  db: Database,
  asin: string,
  title?: string,
  price?: number,
  reviews_count?: number,
  rating?: number,
  url?: string
) {
  try {
    const existingProduct = await getProductByAsin(db, asin);

    if (existingProduct) {
      await db.run(
        `UPDATE products
         SET title = ?, price = ?, reviews_count = ?, rating = ?, url = ?
         WHERE asin = ?`,
        [title, price, reviews_count, rating, url, asin]
      );
      logger.debug(`Produkt mit ASIN ${asin} aktualisiert`);
    } else {
      const result = await db.run(
        `INSERT INTO products (asin, title, price, reviews_count, rating, url)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [asin, title, price, reviews_count, rating, url]
      );
      logger.debug(`Neues Produkt mit ASIN ${asin} hinzugefügt`, { id: result.lastID });
    }
  } catch (error) {
    logger.error(`Fehler beim Hinzufügen/Aktualisieren des Produkts mit ASIN ${asin}`, error as Error);
    throw error;
  }
}

async function getKnowledgeBaseEntries(
  db: Database,
  limit?: number
): Promise<KnowledgeBaseEntry[]> {
  try {
    const sql = `SELECT * FROM knowledge_base WHERE embedding IS NOT NULL${
      limit ? ' LIMIT ?' : ''
    }`;
    const entries = limit ? await db.all(sql, [limit]) : await db.all(sql);
    logger.debug(`${entries.length} Wissensdatenbank-Einträge abgerufen`, { limit });
    return entries;
  } catch (error) {
    logger.error('Fehler beim Abrufen der Wissensdatenbank-Einträge', error as Error);
    throw error;
  }
}

export {
  setupDatabase,
  addKnowledgeBaseEntry,
  getProductByAsin,
  addOrUpdateProduct,
  getKnowledgeBaseEntries
};
