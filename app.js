// app.mjs
import dotenv from 'dotenv';
dotenv.config(); // Load environment variables first
import sequelize from './database.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const moduleDir = path.dirname(__filename);

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

// Signup route with file upload
app.post('/signup', async (req, res) => {
  console.log(req.body);

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ where: { email: req.body.email } });
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists.' });
    }

    // Check if a file was attached
    if (!req.body.file) {
      return res.status(400).json({ error: 'No file attached.' });
    }

    // Create the user
    const user = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      dob: req.body.dob,
      address: req.body.address,
      encryptionKey: crypto.randomBytes(32).toString('hex'), // Generate encryption key
      fileName: crypto.randomBytes(8).toString('hex'),
      isdoctor: false
    });
    

    // Encrypt and save the uploaded file
    const encryptionKey = user.encryptionKey;
    const fileName = user.fileName;

    // Encrypt the file using AES
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), Buffer.alloc(16, 0));
    const encryptedData = Buffer.concat([cipher.update(Buffer.from(req.body.file.split(',')[1], 'base64')), cipher.final()]);

    // Save encrypted file
    const encryptedFilePath = path.join(moduleDir,'uploads',`${fileName}.enc`);
    fs.writeFileSync(encryptedFilePath, encryptedData);

    res.status(201).json({ message: 'User registered successfully with encrypted file!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred during signup.' });
  }
});

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

app.get('/download', async (req, res) => {
    try {
        const userid = parseInt(req.query.userid);
        if (!userid) return res.status(400).send('UID required');
        
        const user = await User.findOne({ where: { id: userid } })
       
        
        const encryptedFilePath = path.join(moduleDir, 'uploads', `${user.fileName}.enc`);
        console.log(encryptedFilePath)
        if (!fs.existsSync(encryptedFilePath)) return res.status(404).send('File not found');
        
        // Assuming user authentication middleware provides req.user
        const decipher = crypto.createDecipheriv(
            'aes-256-cbc',
            Buffer.from(user.encryptionKey, 'hex'),
            Buffer.alloc(16, 0) // Same IV as encryption
        );
        
        const encryptedData = fs.readFileSync(encryptedFilePath);
        const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);

        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(decrypted);
    } catch (error) {
        console.error('Decryption error:', error);
        res.status(500).send(error.message.includes('bad decrypt') ? 'Invalid decryption key' : 'Server error');
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






