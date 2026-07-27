/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Response JSON schema for structured review generation
const reviewResponseSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    symbol: { type: Type.STRING },
    category: { type: Type.STRING },
    overallScore: { type: Type.INTEGER, description: "Overall rating score out of 100" },
    grade: { type: Type.STRING, description: "Letter grade: AAA (90-100), AA (80-89), A (70-79), BBB (60-69), BB (50-59), B (40-49), C (30-39), D (below 30)" },
    verdict: { type: Type.STRING, description: "A high-impact, professional 1-2 sentence final rating verdict." },
    scores: {
      type: Type.OBJECT,
      properties: {
        utility: { type: Type.INTEGER, description: "Utility score from 1 to 10" },
        tokenomics: { type: Type.INTEGER, description: "Tokenomics score from 1 to 10" },
        security: { type: Type.INTEGER, description: "Security/Audit score from 1 to 10" },
        team: { type: Type.INTEGER, description: "Team & backer track record score from 1 to 10" },
        community: { type: Type.INTEGER, description: "Social engagement & community strength score from 1 to 10" }
      },
      required: ["utility", "tokenomics", "security", "team", "community"]
    },
    summary: { 
      type: Type.STRING, 
      description: "A comprehensive, objective markdown report analyzing the project's technology, ecosystem, and future risks. Always divide with markdown subheadings: ### Core Thesis, ### Market & Utility Analysis, ### Tokenomics & Security, ### Conclusion. Do not wrap inside extra ``` markdown backticks." 
    },
    pros: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Exactly 3 distinct real-world strengths or positive technical points."
    },
    cons: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Exactly 3 distinct vulnerabilities, centralizations, inflation risks, or regulatory concerns."
    },
    riskLevel: { 
      type: Type.STRING, 
      description: "Calculated risk level: Low, Medium, High, or Critical" 
    }
  },
  required: ["name", "symbol", "category", "overallScore", "grade", "verdict", "scores", "summary", "pros", "cons", "riskLevel"]
};

function isQuotaOrDemandError(error: any): boolean {
  const errMsg = String(error?.message || error || "").toLowerCase();
  return (
    errMsg.includes("quota") ||
    errMsg.includes("429") ||
    errMsg.includes("resource_exhausted") ||
    errMsg.includes("503") ||
    errMsg.includes("unavailable") ||
    errMsg.includes("high demand")
  );
}

function getFriendlyErrorMessage(error: any): string {
  let errMsg = "";
  if (typeof error === "string") {
    errMsg = error;
  } else if (error && error.message) {
    errMsg = error.message;
  } else {
    errMsg = JSON.stringify(error);
  }

  const lowerMsg = errMsg.toLowerCase();
  
  if (lowerMsg.includes("quota") || lowerMsg.includes("429") || lowerMsg.includes("resource_exhausted")) {
    return "Your Gemini API Key has exceeded its free tier rate limits. Google AI Studio allows a limited number of requests per minute on free tier. Please wait 1-2 minutes before retrying, or enable billing on your key to increase limits.";
  }
  
  if (lowerMsg.includes("503") || lowerMsg.includes("unavailable") || lowerMsg.includes("high demand")) {
    return "Google's Gemini model servers are currently experiencing extremely high traffic. Please retry in a few seconds, as these spikes are usually transient.";
  }

  if (lowerMsg.includes("api key") || lowerMsg.includes("api_key") || lowerMsg.includes("invalid key") || lowerMsg.includes("not found") || lowerMsg.includes("403")) {
    return "The Gemini API key is missing, invalid, or restricts access to this model. Please check your API key settings in Google AI Studio.";
  }

  try {
    const parsed = JSON.parse(errMsg);
    if (parsed.error && parsed.error.message) {
      return getFriendlyErrorMessage(parsed.error.message);
    }
  } catch (e) {
    // ignore
  }

  return errMsg;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Disable X-Powered-By to prevent server information/software versions disclosure
  app.disable("x-powered-by");

  // Custom Security Headers Middleware addressing Barrion security scan findings
  app.use((req, res, next) => {
    // 1. Mask Server Information disclosure header (e.g. GSE or Node.js versions)
    res.setHeader("Server", "CryptoReviewLab-Shield");
    res.removeHeader("X-Powered-By");

    // 2. Content Security Policy (CSP) config: prevents XSS, data injections, and DOM vulnerabilities
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https: wss:",
      "frame-src 'self' https:",
      "frame-ancestors 'self' https://*.cryptoreviewlab.com https://cryptoreviewlab.com https://*.cryptoacademy.online https://cryptoacademy.online https://*.crypto-academy.online https://crypto-academy.online https://*.academy.online https://academy.online https://*.blogspot.com https://*.google.com https://*.ai.studio",
      "require-trusted-types-for 'script'",
      "trusted-types default appPolicy",
      "upgrade-insecure-requests"
    ];
    res.setHeader("Content-Security-Policy", cspDirectives.join("; "));

    // 3. Frame Security Policy (Clickjacking defense)
    res.setHeader("X-Frame-Options", "SAMEORIGIN");

    // 4. Strict-Transport-Security (HSTS) - forces HTTPS connections for 2 years
    res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");

    // 5. Permissions Policy: restricts camera, microphone, geolocation, and payment APIs
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), display-capture=(), autoplay=()");

    // 6. Deprecated X-XSS-Protection header setting (disabled per modern W3C & Barrion recommendation in favor of CSP)
    res.setHeader("X-XSS-Protection", "0");

    // 7. Mitigate MIME type sniffing vulnerabilities
    res.setHeader("X-Content-Type-Options", "nosniff");

    // 8. Referrer-Policy and Cross-Origin Isolation Headers
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

    next();
  });

  app.use(express.json());

  // API endpoint: Generate standard, objective evaluations
  app.post("/api/review/generate", async (req, res) => {
    try {
      const { name, symbol, category, focusArea } = req.body;
      if (!name || !symbol) {
        return res.status(400).json({ error: "Project name and token ticker symbol are required." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
        return res.status(400).json({ 
          error: "Gemini API key is missing. Please add your GEMINI_API_KEY in the Secrets panel in AI Studio's settings." 
        });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `Perform an objective, highly professional crypto evaluation and rating report for the project "${name}" (symbol: ${symbol}) categorized under "${category || 'General Web3 Token'}"."
${focusArea ? `Analyze with specialized consideration on: "${focusArea}".` : ''}

In your analysis, be highly analytical, neutral, and cautious. Focus on token distribution concentration, smart contract audited status, multisig dependencies, inflation sinks, real utility value, and team credibility.

Your entire response must match the specified JSON schema exactly.`;

      let response;
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            systemInstruction: "You are the chief research analyst at Crypto Review Lab. You provide cold, hard, fact-based cryptographic and economic reviews. You write with supreme clarity, using professional terminology, avoiding all market-hype words like 'to the moon', 'revolutionary', 'game changer', or 'groundbreaking'. Highlight real potential failure points.",
            responseMimeType: "application/json",
            responseSchema: reviewResponseSchema,
            temperature: 0.5
          }
        });
      } catch (firstError: any) {
        if (isQuotaOrDemandError(firstError)) {
          console.warn("Primary model 'gemini-3.5-flash' rate limited or unavailable. Retrying with 'gemini-3.1-flash-lite' fallback...");
          try {
            response = await ai.models.generateContent({
              model: "gemini-3.1-flash-lite",
              contents: prompt,
              config: {
                systemInstruction: "You are the chief research analyst at Crypto Review Lab. You provide cold, hard, fact-based cryptographic and economic reviews. You write with supreme clarity, using professional terminology, avoiding all market-hype words like 'to the moon', 'revolutionary', 'game changer', or 'groundbreaking'. Highlight real potential failure points.",
                responseMimeType: "application/json",
                responseSchema: reviewResponseSchema,
                temperature: 0.5
              }
            });
          } catch (secondError: any) {
            throw new Error(getFriendlyErrorMessage(secondError));
          }
        } else {
          throw new Error(getFriendlyErrorMessage(firstError));
        }
      }

      const textResult = response.text;
      if (!textResult) {
        throw new Error("No response content generated by the AI model.");
      }

      const parsedReview = JSON.parse(textResult.trim());
      res.json(parsedReview);
    } catch (error: any) {
      console.error("Crypto Review generation failed:", error);
      res.status(500).json({ error: getFriendlyErrorMessage(error) });
    }
  });

  // API endpoint: Cyber Audit Chat
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message content is required." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
        return res.status(400).json({ 
          error: "Gemini API key is missing. Please configure your GEMINI_API_KEY in the Secrets panel in AI Studio's settings." 
        });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Construct cumulative context to simulate history in chats
      let formattedPrompt = "";
      if (history && history.length > 0) {
        formattedPrompt += "Relevant conversation history:\n";
        history.forEach((msg: any) => {
          const actor = msg.role === 'user' ? 'User' : 'Lab Auditor';
          formattedPrompt += `${actor}: ${msg.content}\n`;
        });
        formattedPrompt += `\nNew User inquiry: ${message}\nLab Auditor:`;
      } else {
        formattedPrompt = message;
      }

      let response;
      try {
        const chat = ai.chats.create({
          model: "gemini-3.5-flash",
          config: {
            systemInstruction: "You are 'Lab Auditor', a seasoned Web3 Security Lead and Smart Contract Auditor for Crypto Review Lab. Your job is to answer user questions regarding crypto safety, technical concepts, rug-pull indicators, flash-loan vulnerabilities, and project risks. Your tone is dry, highly analytical, objective, and blunt. You prefer bullet points for technical explanations. Give warning markers whenever severe vulnerabilities are mentioned.",
          }
        });
        response = await chat.sendMessage({ message: formattedPrompt });
      } catch (firstError: any) {
        if (isQuotaOrDemandError(firstError)) {
          console.warn("Primary model 'gemini-3.5-flash' rate limited or unavailable for chat. Retrying with 'gemini-3.1-flash-lite' fallback...");
          try {
            const chatFallback = ai.chats.create({
              model: "gemini-3.1-flash-lite",
              config: {
                systemInstruction: "You are 'Lab Auditor', a seasoned Web3 Security Lead and Smart Contract Auditor for Crypto Review Lab. Your job is to answer user questions regarding crypto safety, technical concepts, rug-pull indicators, flash-loan vulnerabilities, and project risks. Your tone is dry, highly analytical, objective, and blunt. You prefer bullet points for technical explanations. Give warning markers whenever severe vulnerabilities are mentioned.",
              }
            });
            response = await chatFallback.sendMessage({ message: formattedPrompt });
          } catch (secondError: any) {
            throw new Error(getFriendlyErrorMessage(secondError));
          }
        } else {
          throw new Error(getFriendlyErrorMessage(firstError));
        }
      }

      res.json({ content: response.text });
    } catch (error: any) {
      console.error("Lab Auditor Chat error:", error);
      res.status(500).json({ error: getFriendlyErrorMessage(error) });
    }
  });

  // API endpoint: Download blogger theme XML or TXT file
  app.get("/api/download-theme", (req, res) => {
    try {
      const format = req.query.format === "txt" ? "txt" : "xml";
      const filePath = path.join(process.cwd(), "blogger-theme.xml");
      
      if (!fs.existsSync(filePath)) {
        return res.status(440).json({ error: "Blogger theme file is being generated." });
      }

      if (format === "txt") {
        res.setHeader("Content-Disposition", "attachment; filename=blogger-theme.txt");
        res.setHeader("Content-Type", "text/plain");
      } else {
        res.setHeader("Content-Disposition", "attachment; filename=blogger-theme.xml");
        res.setHeader("Content-Type", "application/xml");
      }
      res.sendFile(filePath);
    } catch (error: any) {
      console.error("Theme download failed:", error);
      res.status(500).json({ error: "Failed to download the theme file." });
    }
  });

  // API endpoint: Download standalone chatbot widget code
  app.get("/api/download-widget", (req, res) => {
    try {
      const filePath = path.join(process.cwd(), "blogger-chatbot-widget.txt");
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Widget file not found." });
      }
      res.setHeader("Content-Disposition", "attachment; filename=blogger-chatbot-widget.txt");
      res.setHeader("Content-Type", "text/plain");
      res.sendFile(filePath);
    } catch (error: any) {
      console.error("Widget download failed:", error);
      res.status(500).json({ error: "Failed to download the widget file." });
    }
  });

  // API endpoint: Get widget content for direct copying
  app.get("/api/widget-content", (req, res) => {
    try {
      const filePath = path.join(process.cwd(), "blogger-chatbot-widget.txt");
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Widget content not found." });
      }
      const content = fs.readFileSync(filePath, "utf-8");
      res.json({ content });
    } catch (error: any) {
      console.error("Failed to read widget content:", error);
      res.status(500).json({ error: "Failed to load the widget content." });
    }
  });

  // API endpoint: Get theme content for direct copying
  app.get("/api/theme-content", (req, res) => {
    try {
      const filePath = path.join(process.cwd(), "blogger-theme.xml");
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Theme content not found." });
      }
      const content = fs.readFileSync(filePath, "utf-8");
      res.json({ content });
    } catch (error: any) {
      console.error("Failed to read theme content:", error);
      res.status(500).json({ error: "Failed to load the theme content." });
    }
  });

  const COINGECKO_KEY = process.env.COINGECKO_API_KEY || "CG-LpjEoHkniUiPJGDezkNrz9gq";
  const COINGECKO_GAS_URL = "https://script.google.com/macros/s/AKfycbyE6MqLewGEK4aq-fCD1tbQpO-IWetUk7-uuTYZDD_3XUvUuxRnWaPZQBZE3H_ui32y5g/exec";

  // API endpoint: CoinGecko Proxy for Markets
  app.get("/api/coingecko/markets", async (req, res) => {
    try {
      const ids = (req.query.ids as string) || "solana,ethereum,bitcoin,chainlink,render-token,arbitrum,sui,hyperliquid";
      const vsCurrency = (req.query.vs_currency as string) || "usd";
      const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${encodeURIComponent(vsCurrency)}&ids=${encodeURIComponent(ids)}&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=24h`;
      
      let response = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "x-cg-demo-api-key": COINGECKO_KEY
        }
      });

      // Fallback to Google Apps Script proxy if direct API errors
      if (!response.ok) {
        console.warn(`Direct CoinGecko API HTTP ${response.status}. Trying GAS Web App Proxy...`);
        const gasUrl = `${COINGECKO_GAS_URL}?action=markets&ids=${encodeURIComponent(ids)}&vs_currency=${encodeURIComponent(vsCurrency)}`;
        response = await fetch(gasUrl);
      }

      if (!response.ok) {
        return res.status(response.status).json({ error: `CoinGecko API error HTTP ${response.status}` });
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("CoinGecko markets proxy error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch markets from CoinGecko proxy" });
    }
  });

  // API endpoint: CoinGecko Proxy for Search
  app.get("/api/coingecko/search", async (req, res) => {
    try {
      const query = (req.query.query as string) || "";
      if (!query) return res.json({ coins: [] });
      const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`;
      
      let response = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "x-cg-demo-api-key": COINGECKO_KEY
        }
      });

      if (!response.ok) {
        const gasUrl = `${COINGECKO_GAS_URL}?action=search&query=${encodeURIComponent(query)}`;
        response = await fetch(gasUrl);
      }

      if (!response.ok) {
        return res.status(response.status).json({ error: `CoinGecko API error HTTP ${response.status}` });
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("CoinGecko search proxy error:", error);
      res.status(500).json({ error: error.message || "Failed to search CoinGecko" });
    }
  });

  // API endpoint: CoinGecko Proxy for Trending
  app.get("/api/coingecko/trending", async (req, res) => {
    try {
      const url = `https://api.coingecko.com/api/v3/search/trending`;
      let response = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "x-cg-demo-api-key": COINGECKO_KEY
        }
      });

      if (!response.ok) {
        const gasUrl = `${COINGECKO_GAS_URL}?action=trending`;
        response = await fetch(gasUrl);
      }

      if (!response.ok) {
        return res.status(response.status).json({ error: `CoinGecko API error HTTP ${response.status}` });
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("CoinGecko trending proxy error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch trending from CoinGecko" });
    }
  });

  // API endpoint: CoinGecko Proxy for Coin Details
  app.get("/api/coingecko/coin/:id", async (req, res) => {
    try {
      const coinId = req.params.id;
      const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coinId)}?localization=false&tickers=false&community_data=false&developer_data=false`;
      let response = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "x-cg-demo-api-key": COINGECKO_KEY
        }
      });

      if (!response.ok) {
        const gasUrl = `${COINGECKO_GAS_URL}?action=coin&id=${encodeURIComponent(coinId)}`;
        response = await fetch(gasUrl);
      }

      if (!response.ok) {
        return res.status(response.status).json({ error: `CoinGecko API error HTTP ${response.status}` });
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("CoinGecko coin detail proxy error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch coin details from CoinGecko" });
    }
  });

  // API endpoint: Get coingecko-proxy.gs content for direct viewing or downloading
  app.get("/api/coingecko-proxy-content", (req, res) => {
    try {
      const filePath = path.join(process.cwd(), "coingecko-proxy.gs");
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "coingecko-proxy.gs file not found." });
      }
      const content = fs.readFileSync(filePath, "utf-8");
      res.json({ content });
    } catch (error: any) {
      console.error("Failed to read coingecko-proxy.gs:", error);
      res.status(500).json({ error: "Failed to load coingecko-proxy.gs file." });
    }
  });

  app.get("/api/download-coingecko-proxy", (req, res) => {
    try {
      const filePath = path.join(process.cwd(), "coingecko-proxy.gs");
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "coingecko-proxy.gs file not found." });
      }
      res.setHeader("Content-Disposition", "attachment; filename=coingecko-proxy.gs");
      res.setHeader("Content-Type", "text/plain");
      res.sendFile(filePath);
    } catch (error: any) {
      console.error("Failed to download coingecko-proxy.gs:", error);
      res.status(500).json({ error: "Failed to download coingecko-proxy.gs file." });
    }
  });

  // Vite Dev Server middleware integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Crypto Review Lab Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
