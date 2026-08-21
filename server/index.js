// server/index.js - Gemini Proxy (Netlify-ready)
const express = require("express");
const cors = require("cors");
const serverless = require("serverless-http");
const rateLimit = require("express-rate-limit");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// CORS - restrict to your frontend domain in production
const corsOptions = {
  origin: process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',') 
    : ['http://localhost:3000', 'http://localhost:5000'],
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
};
app.use(cors(corsOptions));

// Rate limiting - prevent abuse
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per IP
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

app.use(express.json({ limit: '10kb' })); // Limit body size

// Initialize Gemini
const genAI = process.env.GEMINI_API_KEY 
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

// Health check
app.get("/", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "Cadence Gemini Proxy",
    geminiConfigured: !!genAI 
  });
});

// Simple proxy endpoint - just forwards to Gemini
app.post("/api/chat", async (req, res) => {
  try {
    if (!genAI) {
      return res.status(500).json({ 
        error: "Gemini API not configured on server" 
      });
    }

    const { history, message, generationConfig } = req.body;

    // Validate input
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ 
        error: "Invalid message format" 
      });
    }

    // Forward to Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const chat = model.startChat({
      history: history || [],
      generationConfig: generationConfig || {
        maxOutputTokens: 1000,
        temperature: 0.7,
      }
    });

    const result = await chat.sendMessage(message);
    const response = result.response.text();

    res.json({ 
      success: true, 
      response 
    });

  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({ 
      error: "Failed to get AI response",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Local development server (optional - for testing locally)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Cadence Gemini Proxy running on port ${PORT}`);
    console.log(`📡 Gemini API: ${genAI ? 'Configured ✅' : 'Missing ❌'}`);
  });
}

// Export for Netlify Functions
module.exports.handler = serverless(app);