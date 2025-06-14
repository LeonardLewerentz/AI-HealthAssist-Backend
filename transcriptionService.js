// transcriptionService.mjs

// Import specific clients and commands from AWS SDK v3
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import {
  TranscribeClient,
  StartTranscriptionJobCommand,
  GetTranscriptionJobCommand,
} from '@aws-sdk/client-transcribe';

import { URL } from 'url'; // Node.js built-in for URL parsing
import path from 'path';

// AWS SDK v3 clients are initialized directly with config.
// The credentials and region are typically picked up from environment variables
// or a shared config file if not explicitly provided here.
// However, it's good practice to ensure they are available for clarity.
const s3Client = new S3Client({
  region: process.env.AWS_REGION, // Ensure this env var is set in your .env
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID, // Ensure this env var is set
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, // Ensure this env var is set
  },
});

const transcribeClient = new TranscribeClient({
  region: process.env.AWS_REGION, // Ensure this env var is set
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function transcribeAudio(fileBuffer, originalFileName, mimetype) {
  const fileExtension = path.extname(originalFileName);
  // Ensure the S3 key uses a compatible extension for AWS Transcribe (.wav, .m4a, .mp3 etc.)
  // If the client sends .caf, you might need an intermediate conversion or ensure Transcribe supports it.
  // For robustness, using .m4a as a common output format for recordings.
  const s3Key = `audio/${Date.now()}_${path.basename(originalFileName, fileExtension)}.m4a`;
  const bucketName = process.env.S3_BUCKET_NAME;

  if (!bucketName) {
    throw new Error('S3_BUCKET_NAME environment variable not set.');
  }
  if (!process.env.AWS_REGION) {
    throw new Error('AWS_REGION environment variable not set.');
  }
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS credentials environment variables not set.');
  }

  try {
    // 1. Upload audio to S3
    const putObjectParams = {
      Bucket: bucketName,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: mimetype,
    };
    const putObjectCommand = new PutObjectCommand(putObjectParams);

    console.log(`Uploading ${originalFileName} to S3...`);
    await s3Client.send(putObjectCommand); // Use .send() method
    console.log(`Uploaded to S3: s3://${bucketName}/${s3Key}`);

    const audioFileUri = `s3://${bucketName}/${s3Key}`;
    // Generate a unique job name to avoid conflicts if jobs run concurrently
    const jobName = `transcription-job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // 2. Start AWS Transcribe job
    const startJobParams = {
      TranscriptionJobName: jobName,
      LanguageCode: 'en-US', // IMPORTANT: Adjust as needed (e.g., 'es-ES', 'fr-FR')
      // MediaFormat must match the actual format of the uploaded file (e.g., 'wav', 'mp3', 'mp4' for .m4a)
      MediaFormat: 'mp4', // Assuming .m4a implies 'mp4' media format for Transcribe
      Media: {
        MediaFileUri: audioFileUri,
      },
      OutputBucketName: bucketName, // Transcribe will put results here
      Settings: {
        // Optional: Enable automatic punctuation, etc.
        // ShowSpeakerLabels: true,
        // MaxSpeakerLabels: 2,
        // Example for a custom vocabulary filter (ensure it exists in your AWS account)
        // VocabularyFilterMethod: 'mask',
        // VocabularyFilterName: 'YourCustomProfanityFilter',
      },
    };
    const startJobCommand = new StartTranscriptionJobCommand(startJobParams);

    console.log(`Starting Transcribe job: ${jobName}`);
    await transcribeClient.send(startJobCommand); // Use .send() method

    // 3. Poll for Transcribe job completion
    let jobStatus = '';
    let transcriptResultUri = '';
    console.log('Polling for transcription job status...');
    while (jobStatus !== 'COMPLETED' && jobStatus !== 'FAILED') {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Poll every 3 seconds
      const getJobParams = { TranscriptionJobName: jobName };
      const getJobCommand = new GetTranscriptionJobCommand(getJobParams);
      const data = await transcribeClient.send(getJobCommand); // Use .send() method

      jobStatus = data.TranscriptionJob.TranscriptionJobStatus; // Correct property name in v3
      console.log(`Job Status for ${jobName}: ${jobStatus}`);

      if (jobStatus === 'COMPLETED') {
        transcriptResultUri = data.TranscriptionJob.Transcript.TranscriptFileUri;
      } else if (jobStatus === 'FAILED') {
        console.error('Transcription job failed:', data.TranscriptionJob.FailureReason);
        throw new Error(`Transcription job failed: ${data.TranscriptionJob.FailureReason}`);
      }
    }

    // 4. Retrieve and send transcript
    // The URL object (native to Node.js) helps parse the S3 URI
    const resultUrl = new URL(transcriptResultUri);
    // Pathname starts with '/', substring(1) removes it
    const resultS3Key = resultUrl.pathname.substring(1);

    const getObjectParams = { Bucket: bucketName, Key: resultS3Key };
    const getObjectCommand = new GetObjectCommand(getObjectParams);
    const resultResponse = await s3Client.send(getObjectCommand);

    // Read the stream into a string
    const resultBody = await new Promise((resolve, reject) => {
      const chunks = [];
      resultResponse.Body.on('data', chunk => chunks.push(chunk));
      resultResponse.Body.once('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      resultResponse.Body.once('error', reject);
    });

    const transcript = JSON.parse(resultBody);
    const transcribedText = transcript.results.transcripts[0].transcript;

    // Optional: Clean up S3 audio file and result file if no longer needed
    // You might want to keep them for debugging or audit purposes.
    // await s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: s3Key }));
    // await s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: resultS3Key }));
    // console.log('Cleaned up S3 files.');

    return transcribedText;
  } catch (error) {
    console.error('Error in transcribeAudio service (AWS SDK v3):', error);
    throw error;
  }
}


