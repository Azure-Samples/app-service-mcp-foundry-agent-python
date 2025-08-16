# Supercharge Your App Service Applications with AI Foundry Agents Connected to Model Context Protocol (MCP) servers

*Discover how to easily integrate intelligent agents into existing applications using Azure AI Foundry and Model Context Protocol (MCP) servers—all hosted on Azure App Service*

## Introduction

The integration of AI into web applications has reached a new milestone with the introduction of [Model Context Protocol (MCP) support in Azure AI Foundry Agent Service](https://learn.microsoft.com/azure/ai-foundry/agents/how-to/tools/model-context-protocol). This powerful new feature allows developers to extend the capabilities of their Azure AI Foundry agents by connecting them to tools hosted on remote MCP servers—and the best part? Both your applications and MCP servers can be hosted seamlessly on Azure App Service. No custom code is required to get your agents hooked up to these MCP servers either, it's built right into this new functionality.

In this blog post, we'll explore how this new functionality works, demonstrate a practical implementation, and show you how to get started with your own MCP-enabled applications on App Service.

## What is Model Context Protocol (MCP)?

The [Model Context Protocol](https://modelcontextprotocol.io/) is an open standard that defines how applications provide tools and contextual data to large language models (LLMs). Think of it as a standardized bridge that allows AI agents to interact with external systems, APIs, and data sources.

Key benefits of MCP include:
- **Standardized Integration**: A consistent way to connect AI agents with external tools
- **Flexible Tool Discovery**: Dynamic discovery of available tools and capabilities  
- **Scalable Architecture**: Easily share tools across multiple agents and applications
- **Simple Implementation**: Less complex than traditional API integration approaches

## Introducing Our MCP-Enabled App Service Solution

We've built a comprehensive solution that demonstrates how to leverage MCP with Azure AI Foundry agents on App Service. Our implementation includes:

### 1. MCP Agent Client Application
**Repository**: [Azure-Samples/app-service-mcp-foundry-agent-python](https://github.com/Azure-Samples/app-service-mcp-foundry-agent-python)

This is a FastAPI web application that allows you to:
- Create and manage Azure AI Foundry agents
- Connect agents to remote MCP servers
- Chat with agents through a web interface
- Deploy easily to Azure App Service using Azure Developer CLI (azd)

The application serves as both a demonstration and a starting point for your own MCP-enabled applications. It can be used to connect to any publicly accessible MCP server so it's a great way to get started with the new MCP server connected agents feature in Azure AI Foundry. No custom code required. All you need is a publicly accessible MCP server and you can get started immediately.

### 2. Example MCP Server - To-do List MCP Server
**Repository**: [Azure-Samples/app-service-python-todo-mcp](https://github.com/Azure-Samples/app-service-python-todo-mcp/tree/main)

This is a complete MCP server implementation that provides to-do list management capabilities. The server exposes MCP tools that allow agents to:
- Create, read, update, and delete to-do items
- List to-dos with filtering and sorting options
- Manage to-do categories and priorities
- Perform bulk operations on to-do items

This example demonstrates how easy it is to take an existing application (a to-do list) and add AI agent capabilities through MCP integration. The agent requires no custom code, and the to-do list app required no changes to support the agent integration. Use this app as a starting point to experiment with the MCP server connected agents feature in Azure AI Foundry.

## Getting Started

Ready to try this yourself? Here's how to get started:

### Prerequisites
- Azure subscription
- Azure Developer CLI (azd) installed
- Python 3.11+ (for local development)

### Quick Deployment

1. **Clone the main application repository**:
   ```bash
   git clone https://github.com/Azure-Samples/app-service-mcp-foundry-agent-python.git
   cd app-service-mcp-foundry-agent-python
   ```

2. **Deploy to Azure using azd**:
   ```bash
   azd auth login
   azd up
   ```
   
   > **Note**: Since MCP support in Azure AI Foundry is currently in preview, you must deploy to one of the supported regions. Check the [How it works](https://learn.microsoft.com/azure/ai-foundry/agents/how-to/tools/model-context-protocol#how-it-works) section of the documentation for the current list of supported regions. The `azd up` command will prompt you to select a region during deployment.

3. **Deploy the example MCP server** (in a separate terminal):
   ```bash
   git clone https://github.com/Azure-Samples/app-service-python-todo-mcp.git
   cd app-service-python-todo-mcp
   azd up
   ```

That's it! Both applications will be deployed to Azure App Service with all the necessary Azure AI Foundry resources configured automatically. You will end up with two separate App Services, one for the chat app and one for the to-do list app. Open both of these apps side by side to see the magic in real time.

### Using the Application

*[Screenshot Placeholder: Main application interface showing the chat interface and MCP server connection options]*

Once deployed, you can:

1. **Connect to your MCP server**: Enter the URL of your deployed to-do MCP server into the chat app. For the provided to-do app, the URL is given at the top of the site. You can alternatively use any publicly accessible MCP server here and start chatting with an agent that will connect to it.
2. **Start chatting**: Ask the agent to manage your to-dos using natural language.
3. **See the magic**: Watch as the agent uses MCP tools to perform to-do operations.

*[Screenshot Placeholder: Example conversation showing natural language to-do management]*

## MCP vs. OpenAPI: Multiple options to get your apps connected to AI agents

Previously, we explained how to connect Azure AI Foundry agents to web applications using [OpenAPI-defined tools](https://learn.microsoft.com/azure/ai-foundry/agents/how-to/tools/openapi-spec) from the AI Foundry Service. This method relies on an OpenAPI specification and is an excellent way to add agents to existing apps without any code changes. For legacy applications where updating to support MCP server capabilities isn't feasible, OpenAPI integration offers a straightforward path to modern AI experiences. If you don't have an OpenAPI specification, you can even use GitHub Copilot to generate one for your app. For more details and a practical example with App Service, see [this tutorial](https://learn.microsoft.com/azure/app-service/invoke-openapi-web-app-from-azure-ai-agent-service).

## Expanding the Possibilities

The to-do list example is just the beginning. With this pattern, you can easily add AI capabilities to any existing application:

- **E-commerce sites**: Let agents help customers find products, manage orders, and track shipments
- **CRM systems**: Enable natural language customer data queries and updates
- **Content management**: Allow AI-powered content creation and organization
- **Financial applications**: Provide intelligent expense tracking and reporting

The key insight is that you don't need to rebuild your application from scratch. Instead, you create an MCP server that exposes your existing functionality, then connect AI agents to it.

## What's Next?

This new MCP integration in Azure AI Foundry represents a significant step forward in making AI more accessible to developers. We've shown you how to:

- Deploy MCP-enabled applications to Azure App Service
- Connect Azure AI Foundry agents to remote MCP servers
- Build practical, real-world AI integrations with minimal effort

The combination of Azure AI Foundry's powerful agent capabilities with the simplicity of MCP and the reliability of App Service creates endless possibilities for enhancing your applications with AI.

## Get Started Today

Ready to build your own MCP-enabled application? Here are your next steps:

1. **Explore the repositories**:
   - [Main MCP Agent App](https://github.com/Azure-Samples/app-service-mcp-foundry-agent-python)
   - [To-do MCP Server Example](https://github.com/Azure-Samples/app-service-python-todo-mcp/tree/main)

2. **Follow the deployment guide** in the repositories to get started

3. **Experiment with your own MCP tools** by modifying the to-do example

4. **Share your creations** with the community!

The future of AI-enabled applications is here, and it's easier to implement than ever before. With Azure App Service, Azure AI Foundry, and MCP, you have everything you need to transform your applications into intelligent, conversational experiences.

---

*This blog post is part of a series on integrating AI capabilities into Azure applications. For more Azure App Service and AI integration content, visit the [Azure App Service documentation](https://learn.microsoft.com/azure/app-service/overview-ai-integration).*