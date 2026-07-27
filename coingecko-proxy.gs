/**
 * ============================================================================
 * COINGECKO LIVE API PROXY & MCP (MODEL CONTEXT PROTOCOL) SERVER
 * ============================================================================
 * 
 * Live Deployed Web App Endpoint:
 * https://script.google.com/macros/s/AKfycbyE6MqLewGEK4aq-fCD1tbQpO-IWetUk7-uuTYZDD_3XUvUuxRnWaPZQBZE3H_ui32y5g/exec
 * 
 * Description:
 * A production-grade Google Apps Script Web App that acts as a secure proxy and 
 * MCP (Model Context Protocol) Server for AI Agents (Antigravity, Claude, Gemini,
 * Cursor, Custom LLMs) and Web Applications to access live CoinGecko crypto data.
 * ============================================================================
 */

// Deployed GAS Proxy Endpoint URL
var DEPLOYED_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyE6MqLewGEK4aq-fCD1tbQpO-IWetUk7-uuTYZDD_3XUvUuxRnWaPZQBZE3H_ui32y5g/exec";

// Default CoinGecko Demo API Key provided by user
var DEFAULT_API_KEY = "CG-LpjEoHkniUiPJGDezkNrz9gq";

/**
 * Helper to retrieve the active CoinGecko API key
 */
function getApiKey() {
  try {
    var userKey = PropertiesService.getScriptProperties().getProperty("COINGECKO_API_KEY");
    if (userKey && userKey.trim() !== "") {
      return userKey.trim();
    }
  } catch (e) {
    // Ignore property lookup error
  }
  return DEFAULT_API_KEY;
}

/**
 * Perform authenticated request to CoinGecko API
 */
function callCoinGeckoApi(endpoint, queryParams) {
  var apiKey = getApiKey();
  var baseUrl = "https://api.coingecko.com/api/v3" + endpoint;
  
  var params = queryParams || {};
  
  // Build query string
  var queryArray = [];
  for (var key in params) {
    if (params.hasOwnProperty(key) && params[key] !== undefined && params[key] !== null) {
      queryArray.push(encodeURIComponent(key) + "=" + encodeURIComponent(params[key]));
    }
  }
  
  var url = baseUrl + (queryArray.length > 0 ? "?" + queryArray.join("&") : "");
  
  var options = {
    method: "get",
    headers: {
      "Accept": "application/json",
      "x-cg-demo-api-key": apiKey
    },
    muteHttpExceptions: true
  };
  
  try {
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();
    
    if (responseCode >= 200 && responseCode < 300) {
      return JSON.parse(responseText);
    } else {
      return {
        error: true,
        statusCode: responseCode,
        message: "CoinGecko API returned HTTP " + responseCode,
        details: responseText
      };
    }
  } catch (err) {
    return {
      error: true,
      message: err.toString()
    };
  }
}

/**
 * Handle HTTP GET Requests (REST API & MCP Inspection)
 */
function doGet(e) {
  var params = (e && e.parameter) ? e.parameter : {};
  var action = params.action || "";
  
  var result = {};
  
  if (action === "markets" || params.ids) {
    var ids = params.ids || "bitcoin,ethereum,solana,chainlink,render-token,arbitrum,sui,hyperliquid";
    var vsCurrency = params.vs_currency || "usd";
    result = callCoinGeckoApi("/coins/markets", {
      vs_currency: vsCurrency,
      ids: ids,
      order: "market_cap_desc",
      per_page: 250,
      page: 1,
      sparkline: false,
      price_change_percentage: "24h"
    });
  } else if (action === "search" || params.query) {
    var query = params.query || "";
    result = callCoinGeckoApi("/search", { query: query });
  } else if (action === "trending") {
    result = callCoinGeckoApi("/search/trending", {});
  } else if (action === "coin" || params.coin_id) {
    var coinId = params.coin_id || params.id || "solana";
    result = callCoinGeckoApi("/coins/" + encodeURIComponent(coinId), {
      localization: false,
      tickers: false,
      community_data: false,
      developer_data: false
    });
  } else if (action === "mcp" || params.mcp) {
    result = getMcpManifest();
  } else {
    // Default Status & MCP Server Greeting
    result = {
      status: "online",
      server: "CoinGecko Live API MCP Proxy",
      version: "1.0.0",
      apiKeyConfigured: getApiKey() ? "Yes (x-cg-demo-api-key)" : "No",
      mcpEndpoints: {
        jsonRpcPost: "Send MCP JSON-RPC 2.0 payloads via POST to this Web App URL",
        getActions: [
          "?action=markets&ids=solana,ethereum",
          "?action=search&query=render",
          "?action=trending",
          "?action=coin&id=solana",
          "?action=mcp"
        ]
      },
      availableMcpTools: [
        "get_crypto_markets",
        "search_crypto_coins",
        "get_trending_crypto",
        "get_coin_details"
      ]
    };
  }
  
  return createJsonResponse(result);
}

/**
 * Handle HTTP POST Requests (Model Context Protocol - JSON-RPC 2.0 Endpoint for AI Agents)
 */
function doPost(e) {
  var responseData = {};
  
  try {
    var postData = "";
    if (e && e.postData && e.postData.contents) {
      postData = e.postData.contents;
    }
    
    var jsonRpc = JSON.parse(postData || "{}");
    var method = jsonRpc.method || "";
    var id = jsonRpc.id !== undefined ? jsonRpc.id : 1;
    var params = jsonRpc.params || {};
    
    if (method === "initialize") {
      responseData = {
        jsonrpc: "2.0",
        id: id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: "coingecko-mcp-server",
            version: "1.0.0"
          }
        }
      };
    } else if (method === "tools/list") {
      responseData = {
        jsonrpc: "2.0",
        id: id,
        result: {
          tools: getMcpToolsList()
        }
      };
    } else if (method === "tools/call") {
      var toolName = params.name || "";
      var args = params.arguments || {};
      
      var toolResult = executeMcpTool(toolName, args);
      
      responseData = {
        jsonrpc: "2.0",
        id: id,
        result: {
          content: [
            {
              type: "text",
              text: typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult, null, 2)
            }
          ]
        }
      };
    } else {
      responseData = {
        jsonrpc: "2.0",
        id: id,
        error: {
          code: -32601,
          message: "Method not found: " + method
        }
      };
    }
  } catch (err) {
    responseData = {
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32603,
        message: "Internal Error: " + err.toString()
      }
    };
  }
  
  return createJsonResponse(responseData);
}

/**
 * Execute an MCP Tool by name with arguments
 */
function executeMcpTool(toolName, args) {
  if (toolName === "get_crypto_markets") {
    var ids = args.ids || "solana,ethereum,bitcoin,chainlink";
    return callCoinGeckoApi("/coins/markets", {
      vs_currency: "usd",
      ids: ids,
      order: "market_cap_desc",
      sparkline: false
    });
  } else if (toolName === "search_crypto_coins") {
    var query = args.query || "";
    return callCoinGeckoApi("/search", { query: query });
  } else if (toolName === "get_trending_crypto") {
    return callCoinGeckoApi("/search/trending", {});
  } else if (toolName === "get_coin_details") {
    var coinId = args.coin_id || "solana";
    return callCoinGeckoApi("/coins/" + encodeURIComponent(coinId), {
      localization: false,
      tickers: false,
      community_data: false,
      developer_data: false
    });
  } else {
    return { error: true, message: "Unknown tool: " + toolName };
  }
}

/**
 * Return list of MCP Tools supported by this server
 */
function getMcpToolsList() {
  return [
    {
      name: "get_crypto_markets",
      description: "Fetch live prices, market caps, 24h changes, and ranks for a list of CoinGecko coin IDs.",
      inputSchema: {
        type: "object",
        properties: {
          ids: {
            type: "string",
            description: "Comma-separated list of CoinGecko coin IDs (e.g., 'solana,ethereum,bitcoin,chainlink')"
          }
        },
        required: ["ids"]
      }
    },
    {
      name: "search_crypto_coins",
      description: "Search CoinGecko for coins, tokens, and projects by name or symbol.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search term or token symbol (e.g., 'render', 'SOL', 'arbitrum')"
          }
        },
        required: ["query"]
      }
    },
    {
      name: "get_trending_crypto",
      description: "Get the top trending cryptocurrency searches on CoinGecko in real-time.",
      inputSchema: {
        type: "object",
        properties: {}
      }
    },
    {
      name: "get_coin_details",
      description: "Fetch detailed technical specs, category, live market metrics, and description for a cryptocurrency.",
      inputSchema: {
        type: "object",
        properties: {
          coin_id: {
            type: "string",
            description: "The CoinGecko ID of the coin (e.g., 'solana', 'hyperliquid')"
          }
        },
        required: ["coin_id"]
      }
    }
  ];
}

/**
 * Manifest object for MCP introspection
 */
function getMcpManifest() {
  return {
    mcpVersion: "1.0.0",
    serverName: "CoinGecko Live Crypto Proxy MCP",
    description: "Proxy and MCP server connecting AI agents to real-time CoinGecko market metrics",
    tools: getMcpToolsList()
  };
}

/**
 * Helper to wrap response as JSON with CORS headers
 */
function createJsonResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data, null, 2));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
