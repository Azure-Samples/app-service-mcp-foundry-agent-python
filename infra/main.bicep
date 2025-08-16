targetScope = 'resourceGroup'

@description('Name of the environment')
param environmentName string

@description('Primary location for all resources')
param location string = resourceGroup().location

// Generate unique resource token
var resourceToken = uniqueString(subscription().id, resourceGroup().id, location, environmentName)

// Define resource prefix
var resourcePrefix = 'mcpchat'

// App Service Plan name
var appServicePlanName = 'az-${resourcePrefix}-plan-${resourceToken}'

// App Service name
var appServiceName = 'az-${resourcePrefix}-app-${resourceToken}'

// Azure AI Foundry resource name
var aiFoundryResourceName = 'az-${resourcePrefix}-foundry-${resourceToken}'

// Azure AI Foundry project name
var aiFoundryProjectName = 'az-${resourcePrefix}-project-${resourceToken}'

// Note: Using system-assigned managed identity (no separate identity resource needed)

// Create App Service Plan (P0V3 Linux)
resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appServicePlanName
  location: location
  tags: {
    'azd-env-name': environmentName
  }
  sku: {
    name: 'P0v3'
    tier: 'Premium0V3'
    size: 'P0v3'
    family: 'Pv3'
    capacity: 1
  }
  properties: {
    reserved: true // Linux App Service Plan
  }
  kind: 'linux'
}

// Create Azure AI Foundry resource
resource aiFoundryResource 'Microsoft.CognitiveServices/accounts@2025-04-01-preview' = {
  name: aiFoundryResourceName
  location: location
  tags: {
    'azd-env-name': environmentName
  }
  kind: 'AIServices'
  sku: {
    name: 'S0'
  }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    // Required to work in AI Foundry
    allowProjectManagement: true
    customSubDomainName: aiFoundryResourceName
    publicNetworkAccess: 'Enabled'
    disableLocalAuth: false
  }
}

// Create Azure AI Foundry project
resource aiFoundryProject 'Microsoft.CognitiveServices/accounts/projects@2025-04-01-preview' = {
  parent: aiFoundryResource
  name: aiFoundryProjectName
  location: location
  tags: {
    'azd-env-name': environmentName
  }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    displayName: aiFoundryProjectName
  }
}

// Create GPT-4o deployment on the AI Foundry resource
resource gpt4oDeployment 'Microsoft.CognitiveServices/accounts/deployments@2024-06-01-preview' = {
  parent: aiFoundryResource
  name: 'gpt-4o'
  sku: {
    name: 'GlobalStandard'
    capacity: 50
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-4o'
      version: '2024-11-20'
    }
    versionUpgradeOption: 'OnceCurrentVersionExpired'
    raiPolicyName: 'Microsoft.DefaultV2'
  }
}

// Create App Service
resource appService 'Microsoft.Web/sites@2023-12-01' = {
  name: appServiceName
  location: location
  tags: {
    'azd-env-name': environmentName
    'azd-service-name': 'mcp-chat-app'
  }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    reserved: true
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'PYTHON|3.11'
      alwaysOn: true
      ftpsState: 'FtpsOnly'
      appCommandLine: 'python -m uvicorn main:app --host 0.0.0.0 --port 8000'
      appSettings: [
        {
          name: 'WEBSITES_PORT'
          value: '8000'
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
        {
          name: 'ENABLE_ORYX_BUILD'
          value: 'true'
        }
        {
          name: 'PYTHONPATH'
          value: '/home/site/wwwroot'
        }
        {
          name: 'AZURE_AI_PROJECT_ENDPOINT'
          value: 'https://${aiFoundryResource.properties.customSubDomainName}.services.ai.azure.com/api/projects/${aiFoundryProject.name}'
        }
        {
          name: 'AZURE_AI_PROJECT_NAME'
          value: aiFoundryProject.name
        }
        {
          name: 'MODEL_DEPLOYMENT'
          value: gpt4oDeployment.name
        }
      ]
      cors: {
        allowedOrigins: ['*']
        supportCredentials: false
      }
      healthCheckPath: '/health'
    }
  }
}

// Grant System-Assigned Managed Identity Azure AI Project Manager role on AI Foundry resource
resource appServiceAIProjectManagerRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(subscription().id, appService.id, aiFoundryResource.id, 'Azure AI Project Manager')
  scope: aiFoundryResource
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'eadc314b-1a2d-4efa-be10-5d325db5065e') // Azure AI Project Manager
    principalId: appService.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Grant System-Assigned Managed Identity Cognitive Services OpenAI User role on AI Foundry resource
resource appServiceOpenAIUserRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(subscription().id, appService.id, aiFoundryResource.id, 'Cognitive Services OpenAI User')
  scope: aiFoundryResource
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd') // Cognitive Services OpenAI User
    principalId: appService.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Grant System-Assigned Managed Identity Azure AI Developer role on the project
resource appServiceAIDeveloperRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(subscription().id, appService.id, aiFoundryProject.id, 'Azure AI Developer')
  scope: aiFoundryProject
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '64702f94-c441-49e6-a78b-ef80e0188fee') // Azure AI Developer
    principalId: appService.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Outputs
output RESOURCE_GROUP_ID string = resourceGroup().id
output AZURE_LOCATION string = location
output AZURE_TENANT_ID string = tenant().tenantId
output AZURE_RESOURCE_GROUP string = resourceGroup().name
output SERVICE_WEB_NAME string = appService.name
output SERVICE_WEB_URI string = 'https://${appService.properties.defaultHostName}'
output SERVICE_MCP_CHAT_APP_IDENTITY_PRINCIPAL_ID string = appService.identity.principalId
output AZURE_OPENAI_ENDPOINT string = aiFoundryResource.properties.endpoint
output AZURE_OPENAI_NAME string = aiFoundryResource.name
output AZURE_AI_PROJECT_ENDPOINT string = 'https://${aiFoundryResource.properties.customSubDomainName}.services.ai.azure.com/api/projects/${aiFoundryProject.name}'
output AZURE_AI_FOUNDRY_RESOURCE_NAME string = aiFoundryResource.name
output AZURE_AI_PROJECT_NAME string = aiFoundryProject.name
output AZURE_OPENAI_DEPLOYMENT_NAME string = gpt4oDeployment.name
output MODEL_DEPLOYMENT string = gpt4oDeployment.name
