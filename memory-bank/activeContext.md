# Active Context

**Current Focus:** Implementing the Helium10 MCP server with RAG, scraping, and SQLite3 storage.

**Recent Changes:**

*   Created `helium10-mcp-server` project using `@modelcontextprotocol/create-server`.
*   Initialized `package.json` and `tsconfig.json`.
*   Installed core dependencies: `@modelcontextprotocol/sdk`, axios, cheerio, sqlite3, langchain, `@langchain/openai`, `@lancedb/lancedb`, `@langchain/community`.
*   Created `db.ts` module with database setup and schema definition.
*   Created `scraping.ts` module with placeholder scraping functions.
*   Created `rag.ts` module with placeholder RAG function.
*   Attempted to integrate LanceDB and HuggingFaceInferenceEmbeddings, but encountered import errors.
*   Created `tools.ts` module.
*   Registered `scrape_knowledge_base` tool in `index.ts`.

**Next Steps:**

*   Resolve import errors for LanceDB and HuggingFaceInferenceEmbeddings in `rag.ts`.
*   Implement the scraping logic in `scrapeKnowledgeBase` function.
*   Implement the RAG logic in `queryKnowledgeBase` function.
*   Implement the MCP tool handlers in `tools.ts`.
*   Connect the tool handlers to the Scraping and RAG modules.
*   Implement the main server logic in `index.ts`.
*   Implement basic tests for tools and modules.
*   Add documentation for each tool (description, inputs, outputs).
*   Update README for the server.

**Active Decisions and Considerations:**

*   Using a layered architecture for the Helium10 MCP server.
*   Using SQLite3 for data storage.
*   Using Langchain.js for RAG functionality.
*   Using HuggingFace Inference API for embeddings.
*   Need to determine the correct import paths for LanceDB and HuggingFaceInferenceEmbeddings.
*   Need to obtain a Hugging Face API key from the user.
*   Need to determine the best way to handle the LLM integration for answer refinement/generation.
*   Need to determine the specific Helium10 blog sections or help documentation areas to scrape for the RAG knowledge base.
*   Need to determine the specific data points to scrape for product data (e.g., price, reviews, keywords, sales rank, etc.).
