import express from 'express';
import cors from 'cors'; // Import cors for handling cross-origin requests
import { getSummary } from './bedrock.js'; // Import your getSummary function

const app = express();
const port = 3000; // You can change this port if needed

// Middleware
app.use(express.json()); // To parse JSON request bodies
app.use(cors()); // Enable CORS for all origins, you might want to restrict this in production

// Root endpoint (optional, just for testing if the server is running)
app.get('/', (req, res) => {
  res.send('Bedrock Summary API is running!');
});

/**
 * API Endpoint to generate a summary using AWS Bedrock.
 *
 * Method: POST
 * URL: /summarize
 * Request Body (JSON):
 * {
 *   "text": "The long text to be summarized...",
 *   "modelId": "anthropic.claude-v2", // or "ai21.j2-mid", "amazon.titan-text-express-v1", etc.
 *   "region": "us-east-1" // Optional, will default to "us-east-1" in getSummary
 * }
 *
 * Response (JSON):
 * {
 *   "summary": "This is the generated summary."
 * }
 *
 * Error Response (JSON):
 * {
 *   "error": "Error message..."
 * }
 */
app.post('/summarize', async (req, res) => {
  const { text, modelId, region } = req.body;

  // Basic validation
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Request body must contain a "text" string.' });
  }
  if (!modelId || typeof modelId !== 'string') {
    return res.status(400).json({ error: 'Request body must contain a "modelId" string.' });
  }

  try {
    // Call your getSummary function
    const summary = await getSummary(text, modelId, region); // Pass region if provided, otherwise it uses default

    res.json({ summary });
  } catch (error) {
    console.error('Error in /summarize endpoint:', error);
    // Return a 500 status code with a descriptive error message
    res.status(500).json({ error: `Failed to generate summary: ${error.message}` });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Bedrock Summary API listening at http://localhost:${port}`);
  console.log('Endpoint: POST /summarize');
});



