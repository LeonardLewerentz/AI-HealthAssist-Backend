// app.mjs
import dotenv from 'dotenv';
dotenv.config(); // Load environment variables first
import sequelize from './database.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt';


import  createUserModel  from './models/User.js';
import  createSubmissionModel from './models/Submission.js'

import express from 'express';
import cors from 'cors';
import multer from 'multer'; // Import multer

import { getSummary } from './bedrock_tmp.js'; // Your existing summarization function
import { transcribeAudio } from './transcriptionService.js'; // Our new transcription function

const app = express();
const port = process.env.PORT || 3000; // Use port from .env or default to 3000

console.log(process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD)

// Configure AWS SDK globally based on environment variables

// Configure Multer for file uploads (store in memory temporarily)
const upload = multer({
  storage: multer.memoryStorage(), // Use memory storage for direct buffer access
  limits: {
    fileSize: 10 * 1024 * 1024, // Limit file size to 10MB
  },
});

// Middleware
app.use(express.json()); // To parse JSON request bodies
app.use(cors()); // Enable CORS for all origins (restrict in production)
// Middleware for token verification
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).send('Token required');

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).send('Invalid or expired token');
    req.user = user;
    next();
  });
};


let User = createUserModel(sequelize)
let Submission = createSubmissionModel(sequelize)

app.post('/login', async (req, res) => {
  // 1. Validate credentials
  const user = await User.findOne({ where: {email: req.body.email} });
  if (!user) return res.sendStatus(401);

  // 2. Verify password (use bcrypt in real implementation)
  const valid = await bcrypt.compare(req.body.password, user.password);
  if (!valid) return res.sendStatus(401);

  // 3. Generate JWT (fixed syntax)
  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  const isDoctor = user.isdoctor;

  res.json({ token, isDoctor });  // Send response
});

app.post('/signup', async (req, res) => {
  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ where: { email: req.body.email } });
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists.' });
    }

    const user = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      dob: req.body.dob,
      address: req.body.address,
      isdoctor: false
    });
    
    res.status(201);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while creating the user.' });
  }
});

app.post('/submitform', authenticateToken, async (req, res) => {
  const user = await User.findOne({where: {id: req.user.userId}})
  const submission = await Submission.create({"patientName":user.name, "patientDob":user.dob, "patientAddress":user.address, "aiSummary": req.body.aiSummary})
  console.log(Submission.findOne({where: {id: submission.id}}));
  res.status(200).send('Form submitted successfully!');
})

app.get('/listsubmissions', authenticateToken, async (req, res) => {
  const user = await User.findOne({where: {id: req.user.userId}})
  if (user.isdoctor) {
    const result = await Submission.findAll()
    res.status(200).json(result)
  } else {
    res.status(403)
  }
})

// Root endpoint
app.get('/', (req, res) => {
  res.send('Backend API is running!');
});

// Your existing /summarize endpoint
app.post('/summarize', authenticateToken, async (req, res) => {
  const { text, modelId, region } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Request body must contain a "text" string.' });
  }
  if (!modelId || typeof modelId !== 'string') {
    return res.status(400).json({ error: 'Request body must contain a "modelId" string.' });
  }

  try {
    const summary = await getSummary(text, "anthropic.claude-3-haiku-20240307-v1:0", "ap-southeast-2"); // Use region from request or default
    res.json({ summary });
  } catch (error) {
    console.error('Error in /summarize endpoint:', error);
    res.status(500).json({ error: `Failed to generate summary: ${error.message}` });
  }
});

// NEW: Transcribe Audio Endpoint
app.post('/transcribe', upload.single('audio'), authenticateToken, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file uploaded.' });
  }

  // req.file.buffer contains the audio data
  const audioBuffer = req.file.buffer;
  const originalFileName = req.file.originalname;
  const mimetype = req.file.mimetype;

  console.log(`Received audio file: ${originalFileName}, MIME type: ${mimetype}`);

  try {
    const transcribedText = await transcribeAudio(audioBuffer, originalFileName, mimetype);
    res.json({ transcript: transcribedText });
  } catch (error) {
    console.error('Error in /transcribe endpoint:', error);
    res.status(500).json({ error: `Transcription failed: ${error.message}` });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
  console.log('Endpoints: POST /summarize, POST /transcribe');
});






