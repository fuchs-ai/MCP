import axios from 'axios';
import * as cheerio from 'cheerio';
import { setupDatabase, addKnowledgeBaseEntry } from './db.js';
import { getEmbedding } from './rag.js';
import { getConfig } from './config.js';
import { logger } from './logger.js';
import { setTimeout } from 'timers/promises';

// Helium10 Wissensquellen
const BLOG_URL = 'https://www.helium10.com/blog/';
const DOCS_URL = 'https://kb.helium10.com/hc/en-us';
const ACADEMY_URL = 'https://academy.helium10.com/';
const CHANGELOG_URL = 'https://www.helium10.com/changelog/';
const TOOL_GUIDES_URL = 'https://kb.helium10.com/hc/en-us/categories/360003585732-Tools';

interface Article {
  title: string;
  content: string;
  url: string;
}

async function extractArticles(html: string, source: string, baseUrl: string): Promise<Article[]> {
  const $ = cheerio.load(html);
  const articles: Article[] = [];

  if (source === 'blog') {
    // Extract blog articles
    $('.post-card').each((_, element) => {
      const title = $(element).find('.post-card-title').text().trim();
      const content = $(element).find('.post-card-excerpt').text().trim();
      const url = baseUrl + $(element).find('a').attr('href');
      
      if (title && content) {
        articles.push({ title, content, url });
      }
    });
  } else if (source === 'docs') {
    // Extract documentation articles
    $('.article-list-item').each((_, element) => {
      const title = $(element).find('h3').text().trim();
      const content = $(element).find('.article-body').text().trim();
      const url = baseUrl + $(element).find('a').attr('href');
      
      if (title && content) {
        articles.push({ title, content, url });
      }
    });
  }

  return articles;
}

/**
 * Erweiterte Artikel-Extraktion mit Paginierung und Unterkategorien
 */
async function extractArticlesWithPagination(
  startUrl: string,
  source: string,
  maxPages = 5,
  maxDepth = 2
): Promise<Article[]> {
  const config = getConfig();
  const allArticles: Article[] = [];
  const visitedUrls = new Set<string>();
  const urlsToVisit: Array<{ url: string; depth: number }> = [{ url: startUrl, depth: 0 }];
  
  logger.info(`Starte erweitertes Scraping für ${source} beginnend mit ${startUrl}`);
  
  let pageCount = 0;
  
  while (urlsToVisit.length > 0 && pageCount < maxPages) {
    const { url, depth } = urlsToVisit.shift()!;
    
    if (visitedUrls.has(url) || depth > maxDepth) {
      continue;
    }
    
    visitedUrls.add(url);
    pageCount++;
    
    try {
      logger.debug(`Scrape URL: ${url} (Tiefe: ${depth})`);
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      // Respektiere Rate-Limits
      await setTimeout(1000); 
      
      const $ = cheerio.load(response.data);
      
      // Artikel von der aktuellen Seite extrahieren
      const articles = await extractArticles($, source, url);
      allArticles.push(...articles);
      
      // Nur wenn wir nicht die maximale Tiefe erreicht haben, suchen wir nach weiteren Links
      if (depth < maxDepth) {
        // Suche nach Kategorielinks
        if (source === 'docs') {
          $('.category-list-item a, .section-list-item a, .article-list-item a').each((_, element) => {
            const href = $(element).attr('href');
            if (href && !visitedUrls.has(href)) {
              const fullUrl = href.startsWith('http') ? href : new URL(href, url).toString();
              urlsToVisit.push({ url: fullUrl, depth: depth + 1 });
            }
          });
        } else if (source === 'blog') {
          $('.post-card a, .pagination a, .category a').each((_, element) => {
            const href = $(element).attr('href');
            if (href && !visitedUrls.has(href)) {
              const fullUrl = href.startsWith('http') ? href : new URL(href, url).toString();
              urlsToVisit.push({ url: fullUrl, depth: depth + 1 });
            }
          });
        } else if (source === 'academy') {
          $('.course-card a, .pagination a, .category a').each((_, element) => {
            const href = $(element).attr('href');
            if (href && !visitedUrls.has(href)) {
              const fullUrl = href.startsWith('http') ? href : new URL(href, url).toString();
              urlsToVisit.push({ url: fullUrl, depth: depth + 1 });
            }
          });
        } else if (source === 'changelog') {
          $('.changelog-item a, .pagination a').each((_, element) => {
            const href = $(element).attr('href');
            if (href && !visitedUrls.has(href)) {
              const fullUrl = href.startsWith('http') ? href : new URL(href, url).toString();
              urlsToVisit.push({ url: fullUrl, depth: depth + 1 });
            }
          });
        }
      }
      
      logger.debug(`Gefundene Artikel auf ${url}: ${articles.length}`);
      
    } catch (error) {
      logger.warn(`Fehler beim Scrapen von ${url}`, error as Error);
    }
  }
  
  logger.info(`Scraping für ${source} abgeschlossen. Insgesamt gefunden: ${allArticles.length} Artikel`);
  return allArticles;
}

/**
 * Verbesserte Artikel-Extraktion mit CheerioAPI
 */
async function extractArticles($: cheerio.CheerioAPI, source: string, baseUrl: string): Promise<Article[]> {
  const articles: Article[] = [];

  if (source === 'blog') {
    // Extract blog articles
    $('.post-card').each((_, element) => {
      const title = $(element).find('.post-card-title').text().trim();
      const content = $(element).find('.post-card-excerpt').text().trim();
      let url = $(element).find('a').attr('href');
      
      if (url && !url.startsWith('http')) {
        url = new URL(url, baseUrl).toString();
      }
      
      if (title && content && url) {
        articles.push({ title, content, url });
      }
    });
    
    // Einzelner Blogartikel
    const articleTitle = $('.post-full-title').text().trim();
    const articleContent = $('.post-content').text().trim();
    
    if (articleTitle && articleContent) {
      articles.push({ 
        title: articleTitle, 
        content: articleContent, 
        url: baseUrl 
      });
    }
  } else if (source === 'docs') {
    // Extract documentation articles
    $('.article-list-item').each((_, element) => {
      const title = $(element).find('h3').text().trim();
      let content = $(element).find('.article-body').text().trim();
      let url = $(element).find('a').attr('href');
      
      if (url && !url.startsWith('http')) {
        url = new URL(url, baseUrl).toString();
      }
      
      if (title && url) {
        articles.push({ 
          title, 
          content: content || 'Keine Beschreibung verfügbar', 
          url 
        });
      }
    });
    
    // Einzelne Dokumentationsseite
    const docTitle = $('.article-title').text().trim();
    const docContent = $('.article-body').text().trim();
    
    if (docTitle && docContent) {
      articles.push({ 
        title: docTitle, 
        content: docContent, 
        url: baseUrl 
      });
    }
  } else if (source === 'academy') {
    // Extract academy articles
    $('.course-card').each((_, element) => {
      const title = $(element).find('.course-title').text().trim();
      const content = $(element).find('.course-description').text().trim();
      let url = $(element).find('a').attr('href');
      
      if (url && !url.startsWith('http')) {
        url = new URL(url, baseUrl).toString();
      }
      
      if (title && url) {
        articles.push({ 
          title, 
          content: content || 'Keine Beschreibung verfügbar', 
          url 
        });
      }
    });
  } else if (source === 'changelog') {
    // Extract changelog entries
    $('.changelog-item').each((_, element) => {
      const title = $(element).find('.changelog-title').text().trim();
      const date = $(element).find('.changelog-date').text().trim();
      const content = $(element).find('.changelog-description').text().trim();
      
      if (title && content) {
        articles.push({ 
          title: `${title} (${date})`, 
          content, 
          url: baseUrl 
        });
      }
    });
  }

  return articles;
}

async function scrapeKnowledgeBase() {
  try {
    const db = await setupDatabase();
    const config = getConfig();
    let totalArticles = 0;

    logger.info('Starte Wissensdatenbank-Scraping');

    // Scrape blog with pagination
    logger.info('Scrape Helium10 Blog');
    const blogArticles = await extractArticlesWithPagination(
      BLOG_URL,
      'blog',
      config.maxScrapingDepth,
      2
    );
    
    // Store blog articles with embeddings
    for (const article of blogArticles) {
      try {
        const embedding = await getEmbedding(article.title + '\n\n' + article.content);
        await addKnowledgeBaseEntry(
          db,
          'blog',
          article.title,
          article.content,
          article.url,
          embedding
        );
        totalArticles++;
        logger.debug(`Artikel gespeichert: ${article.title}`);
      } catch (error) {
        logger.warn(`Fehler beim Speichern des Blog-Artikels: ${article.title}`, error as Error);
      }
    }

    // Scrape docs with pagination
    logger.info('Scrape Helium10 Dokumentation');
    const docsArticles = await extractArticlesWithPagination(
      DOCS_URL, 
      'docs',
      config.maxScrapingDepth,
      2
    );
    
    // Store docs articles with embeddings
    for (const article of docsArticles) {
      try {
        const embedding = await getEmbedding(article.title + '\n\n' + article.content);
        await addKnowledgeBaseEntry(
          db,
          'docs',
          article.title,
          article.content,
          article.url,
          embedding
        );
        totalArticles++;
        logger.debug(`Dokumentation gespeichert: ${article.title}`);
      } catch (error) {
        logger.warn(`Fehler beim Speichern der Dokumentation: ${article.title}`, error as Error);
      }
    }
    
    // Scrape tool guides
    logger.info('Scrape Helium10 Tool-Anleitungen');
    const toolGuidesArticles = await extractArticlesWithPagination(
      TOOL_GUIDES_URL,
      'docs',
      config.maxScrapingDepth,
      2
    );
    
    // Store tool guides with embeddings
    for (const article of toolGuidesArticles) {
      try {
        const embedding = await getEmbedding(article.title + '\n\n' + article.content);
        await addKnowledgeBaseEntry(
          db,
          'tool_guides',
          article.title,
          article.content,
          article.url,
          embedding
        );
        totalArticles++;
        logger.debug(`Tool-Anleitung gespeichert: ${article.title}`);
      } catch (error) {
        logger.warn(`Fehler beim Speichern der Tool-Anleitung: ${article.title}`, error as Error);
      }
    }
    
    // Scrape changelog
    logger.info('Scrape Helium10 Changelog');
    const changelogArticles = await extractArticlesWithPagination(
      CHANGELOG_URL,
      'changelog',
      config.maxScrapingDepth,
      1
    );
    
    // Store changelog entries with embeddings
    for (const article of changelogArticles) {
      try {
        const embedding = await getEmbedding(article.title + '\n\n' + article.content);
        await addKnowledgeBaseEntry(
          db,
          'changelog',
          article.title,
          article.content,
          article.url,
          embedding
        );
        totalArticles++;
        logger.debug(`Changelog-Eintrag gespeichert: ${article.title}`);
      } catch (error) {
        logger.warn(`Fehler beim Speichern des Changelog-Eintrags: ${article.title}`, error as Error);
      }
    }

    return {
      success: true,
      message: `Knowledge base scraping completed. Added ${totalArticles} articles.`
    };

  } catch (error) {
    console.error('Error scraping knowledge base:', error);
    return { 
      success: false,
      message: `Error scraping knowledge base: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

async function scrapeProductData(productKeywords?: string, productURLs?: string[]) {
    // Placeholder for scraping logic
    console.log('Scraping product data...');
    return { products: [] };
}

export { scrapeKnowledgeBase, scrapeProductData };
