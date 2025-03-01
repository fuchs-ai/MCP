# System Patterns

**Architecture:** The project follows a distributed architecture based on the Model Context Protocol (MCP). MCP servers expose functionality as tools and resources, which can be accessed by MCP clients.

**Key Technical Decisions:**

*   Using MCP as the communication protocol between clients and servers.
*   Implementing MCP servers using Node.js and TypeScript.
*   Using `create-mcp-server` for bootstrapping new MCP servers.
*   Leveraging existing MCP server implementations as templates.

**Design Patterns:**

*   **Microservices:** Each MCP server acts as a microservice, providing specific functionality.
*   **Command Pattern:** MCP tools represent commands that can be executed on the server.
*   **Resource-Oriented Architecture:** MCP resources represent data that can be accessed by clients.

**Component Relationships:**

*   MCP Clients (e.g., VS Code extensions, Claude Desktop) interact with MCP Servers.
*   MCP Servers expose tools and resources.
*   MCP Servers may interact with external services (e.g., GitHub API, Supabase API).
