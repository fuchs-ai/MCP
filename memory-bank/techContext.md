# Tech Context

**Technologies Used:**

*   **Node.js:** Runtime environment for MCP servers.
*   **TypeScript:** Primary language for MCP server development.
*   **@modelcontextprotocol/sdk:** SDK for building MCP servers.
*   **@modelcontextprotocol/create-server:** Tool for bootstrapping new MCP servers.
*   **npm:** Package manager for Node.js dependencies.
*   **fs, fs/promises, path:** Node.js modules for file system operations (used in `filesystem-extended`).

**Development Setup:**

*   VS Code with extensions:
    *   saoudrizwan.claude-dev
    *   rooveterinaryinc.roo-cline
*   Node.js and npm installed.
*   MCP servers configured in VS Code extension settings and Claude Desktop settings.

**Technical Constraints:**

*   MCP servers must be implemented using Node.js and TypeScript.
*   MCP servers must adhere to the Model Context Protocol specification.
*   File system access is limited to allowed directories.

**Dependencies:**

*   Dependencies are managed using npm and listed in `package.json` for each MCP server.
*   Core dependency: `@modelcontextprotocol/sdk`
