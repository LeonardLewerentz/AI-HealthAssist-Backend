import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

/**
 * Generates a summary of the input text using AWS Bedrock.
 *
 * @param {string} text - The input text to summarize.
 * @param {string} modelId - The ID of the Bedrock model to use (e.g., 'anthropic.claude-v2', 'ai21.j2-mid').
 * @param {string} region - The AWS region where Bedrock is deployed (e.g., 'us-east-1').
 * @returns {Promise<string>} A promise that resolves with the generated summary.
 * @throws {Error} If the Bedrock API call fails or the response is invalid.
 */
async function getSummary(text, modelId, region = "us-east-1") {
  const client = new BedrockRuntimeClient({ region });

  const messages = [
    {
      role: "user",
      content: [
        { type: "text", text: `Summarize the following text of medical conditions, and give possible causes of the symptoms:\n\n${text}` }
      ],
    },
  ];
  const requestBody = JSON.stringify({
    anthropic_version: "bedrock-2023-05-31", // Crucial for Bedrock Messages API
    messages: messages,
    max_tokens: 1000, // Use 'max_tokens' for Messages API (was 'max_tokens_to_sample')
    temperature: 0.3, // Lower for more deterministic summaries
    top_p: 0.9,
    // top_k: 250, // Optional: uncomment if you want to use top_k
  });

  const command = new InvokeModelCommand({
    body: requestBody,
    contentType: "application/json",
    accept: "application/json",
    modelId: "anthropic.claude-3-haiku-20240307-v1:0",
  });

  try {
    const response = await client.send(command);
    const decoder = new TextDecoder("utf-8");
    const rawBody = decoder.decode(response.body);

    const jsonBody = JSON.parse(rawBody);
    let summary = "";
    if (jsonBody.content && Array.isArray(jsonBody.content)) {
      for (const block of jsonBody.content) {
        if (block.type === "text" && block.text) {
          summary += block.text;
        }
      }
    }

    if (!summary.trim()) { // Check if summary is empty after trimming whitespace
      throw new Error("Failed to parse summary from model response or summary is empty.");
    }

    console.log("Generated Summary:", summary); // Log the summary for debugging
    return summary.trim(); // Return trimmed summary
  } catch (error) {
    console.error(`Error invoking Bedrock model:`, error);
    // Include the original error message for better debugging
    throw new Error(`Failed to generate summary: ${error.message}`);





  }
}

export {getSummary}
