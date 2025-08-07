import os
import sys
from typing import Optional
import traceback
import logging
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from azure.ai.projects import AIProjectClient
from azure.ai.agents.models import McpTool
from azure.identity import DefaultAzureCredential
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Setup logging for Azure App Service
# Azure App Service requires specific configuration to show proper log levels

# Create a custom handler that writes to stderr for errors and stdout for info
class AzureLogHandler(logging.StreamHandler):
    def emit(self, record):
        if record.levelno >= logging.ERROR:
            self.stream = sys.stderr
        else:
            self.stream = sys.stdout
        super().emit(record)


# Configure logging with the custom handler - only use root logger to avoid duplicates
root_logger = logging.getLogger()
root_logger.setLevel(logging.INFO)

# Clear any existing handlers to avoid duplicates
root_logger.handlers.clear()

# Add our custom handler only to the root logger
handler = AzureLogHandler()
handler.setFormatter(logging.Formatter('%(levelname)s: %(message)s'))
root_logger.addHandler(handler)

# Get the logger for this module
logger = logging.getLogger(__name__)

# Completely disable Azure SDK logging
logging.getLogger('azure').setLevel(logging.CRITICAL)
logging.getLogger('urllib3').setLevel(logging.CRITICAL)


# Initialize FastAPI
app = FastAPI(
    title="MCP Agent Studio",
    description="A simple web interface for chatting with agents that use any MCP server",
    version="1.0.0"
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Templates
templates = Jinja2Templates(directory="templates")

# Azure AI configuration
PROJECT_ENDPOINT = os.getenv('AZURE_AI_PROJECT_ENDPOINT')
PROJECT_NAME = os.getenv('AZURE_AI_PROJECT_NAME')
MODEL_DEPLOYMENT = os.getenv('MODEL_DEPLOYMENT', 'gpt-4o')

# Models
class ChatRequest(BaseModel):
    message: str
    mcp_server_url: str
    instructions: Optional[str] = (
        "You are a helpful agent that can use MCP tools when needed "
        "when chatting with users."
    )

class ChatResponse(BaseModel):
    response: str
    agent_id: Optional[str] = None
    thread_id: Optional[str] = None

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """Serve the single chat page"""
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "ai_configured": bool(PROJECT_ENDPOINT)}

@app.post("/api/chat", response_model=ChatResponse)
async def chat_with_mcp_agent(chat_request: ChatRequest):
    """Chat with an agent using the provided MCP server"""
    
    # Validate Azure AI configuration
    if not PROJECT_ENDPOINT or not MODEL_DEPLOYMENT:
        raise HTTPException(
            status_code=503,
            detail="Azure AI not configured. Please set AZURE_AI_PROJECT_ENDPOINT and MODEL_DEPLOYMENT environment variables."
        )
    
    try:
        logger.info(f"💬 Chat message: '{chat_request.message[:50]}...'")
        logger.info(f"🔧 MCP Server: {chat_request.mcp_server_url}")
        
        # Use a fixed, valid server label
        server_label = "mcpserver"
        
        # Create Azure AI client
        agents_client = AIProjectClient(
            endpoint=PROJECT_ENDPOINT,
            credential=DefaultAzureCredential()
        ).agents
        
        # Initialize MCP tool with user-provided server
        mcp_tool = McpTool(
            server_label=server_label,
            server_url=chat_request.mcp_server_url,
        )
        
        with agents_client:
            # Create agent with MCP tool
            agent = agents_client.create_agent(
                model=MODEL_DEPLOYMENT,
                name="mcp-chat-agent",
                instructions=chat_request.instructions,
                tools=mcp_tool.definitions,
            )
            logger.info(f"Created agent, ID: {agent.id}")
            
            # Create thread for communication
            thread = agents_client.threads.create()
            logger.info(f"Created thread, ID: {thread.id}")
            
            # Create message on the thread
            message = agents_client.messages.create(
                thread_id=thread.id,
                role="user",
                content=chat_request.message,
            )
            logger.info(f"Created message, ID: {message.id}")
            
            # Set MCP tool approval mode to never require approval
            mcp_tool.set_approval_mode("never")
            
            # Create and process agent run with MCP tools
            run = agents_client.runs.create_and_process(
                thread_id=thread.id,
                agent_id=agent.id,
                tool_resources=mcp_tool.resources
            )
            logger.info(f"Created run, ID: {run.id}, Status: {run.status}")
            
            # Check run status
            if run.status == "failed":
                logger.error(f"Run failed: {getattr(run, 'last_error', 'Unknown error')}")
                return ChatResponse(
                    response=f"Sorry, the agent run failed: {getattr(run, 'last_error', 'Unknown error')}",
                    agent_id=agent.id,
                    thread_id=thread.id
                )
            
            # Get the conversation messages
            messages = agents_client.messages.list(thread_id=thread.id)
            
            # Extract the assistant's response
            assistant_response = "No response generated"
            for msg in messages:
                if msg.role == "assistant" and msg.text_messages:
                    assistant_response = msg.text_messages[-1].text.value
                    break
            
            logger.info(f"🤖 Assistant response: '{assistant_response[:50]}...'")
            
            # Clean up - delete the agent
            agents_client.delete_agent(agent.id)
            logger.info("Deleted agent")
            
            return ChatResponse(
                response=assistant_response,
                agent_id=agent.id,
                thread_id=thread.id
            )
            
    except Exception as e:
        logger.error(f"Error in chat_with_mcp_agent: {e}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Chat error: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    
    print("🚀 Starting MCP Agent Studio...")
    print("🔗 Chat Interface: http://localhost:8000")
    print("❤️ Health Check: http://localhost:8000/health")
    print("-" * 50)
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
        access_log=False  # Reduce access log verbosity
    )
