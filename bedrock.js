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

  let prompt;
  let requestBody;
  let responseParser; // Function to parse the specific model's response

  switch (modelId) {
    case "anthropic.claude-v2":
    case "anthropic.claude-v2:1": // Claude V2.1
    case "anthropic.claude-instant-v1": // Claude Instant
      prompt = `Human: Summarize the following text:\n\n<text>${text}</text>\n\nAssistant:`;
      requestBody = JSON.stringify({
        prompt: prompt,
        max_tokens_to_sample: 500, // Adjust as needed for summary length
        temperature: 0.3, // Lower for more deterministic summaries
        top_p: 0.9,
      });
      responseParser = (rawBody) => {
        const jsonBody = JSON.parse(rawBody);
        return jsonBody.completion.trim();
      };
      break;

    case "ai21.j2-mid":
    case "ai21.j2-ultra":
      prompt = `Summarize the following text:\n\n${text}\n\nSummary:`;
      requestBody = JSON.stringify({
        prompt: prompt,
        maxTokens: 300, // Adjust as needed
        temperature: 0.3,
        topP: 0.9,
        // You can add more parameters like 'stopSequences' if the model supports it
      });
      responseParser = (rawBody) => {
        const jsonBody = JSON.parse(rawBody);
        // AI21 typically returns an array of completions
        return jsonBody.completions[0]?.data.text.trim();
      };
      break;

    // Add more cases for other models (e.g., Amazon Titan, Cohere)
    // Each model has its own prompt format and response structure.
    case "amazon.titan-text-express-v1":
    case "amazon.titan-text-lite-v1":
        prompt = `Summarize the following text:\n\n${text}\n\nSummary:`;
        requestBody = JSON.stringify({
            inputText: prompt,
            textGenerationConfig: {
                maxTokenCount: 300,
                temperature: 0.3,
                topP: 0.9,
            }
        });
        responseParser = (rawBody) => {
            const jsonBody = JSON.parse(rawBody);
            return jsonBody.results[0]?.outputText.trim();
        };
        break;

    default:
      throw new Error(`Unsupported model ID: ${modelId}`);
  }

  const command = new InvokeModelCommand({
    body: requestBody,
    contentType: "application/json",
    accept: "application/json",
    modelId: modelId,
  });

  try {
    const response = await client.send(command);
    const decoder = new TextDecoder("utf-8");
    const rawBody = decoder.decode(response.body);

    const summary = responseParser(rawBody);

    if (!summary) {
        throw new Error("Failed to parse summary from model response.");
    }

    return summary;
  } catch (error) {
    console.error(`Error invoking Bedrock model ${modelId}:`, error);
    throw new Error(`Failed to generate summary: ${error.message}`);
  }
}

export {getSummary}
