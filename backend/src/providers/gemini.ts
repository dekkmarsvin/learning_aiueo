import { GoogleGenAI } from '@google/genai';
import { LLMProvider, ChatMessage, GenerateOptions } from './types.js';

type GeminiConfig = {
	apiKey: string;
	model: string;
};

export const createGeminiProvider = ({ apiKey, model }: GeminiConfig): LLMProvider => {
	const client = new GoogleGenAI({ apiKey });

	return {
		async generate(messages: ChatMessage[], options?: GenerateOptions) {
			if (!apiKey) {
				throw new Error('GEMINI_API_KEY is required when provider=gemini');
			}

			const systemMessage = messages.find((m) => m.role === 'system');
			// Filter out system message to get conversation history
			// The new SDK handles system instructions separately in config if needed,
			// or we can pass it as part of the config.

			// For `generateContent`, we can construct the prompt with history.
			// However, `chat` is better for conversation.
			// But the new SDK's `chats.create` or just passing contents list usually works?
			// Let's use `models.generateContent` with a list of contents if we don't need a persistent session object here,
			// or use the chat helper if we want to maintain history logic exactly as before.
			// The previous implementation used `startChat`. 
			// Let's adapt to new SDK: `client.chats.create` or simply `generateContent` with a list of messages.

			// Docs example for chat:
			// const chat = client.chats.create({ model: ... });
			// await chat.sendMessage(...)

			// But since our `generate` function is stateless (receives full history),
			// we might just want to use `generateContent` with the full history as `contents`.
			// OR reconstruct the chat object each time.

			// Let's map messages to the format expected by `contents`.
			// The SDK expects `Content` objects.

			const contents = messages
				.filter(m => m.role !== 'system')
				.map(m => ({
					role: m.role === 'assistant' ? 'model' : 'user',
					parts: [{ text: m.content }]
				}));

			const config: any = {
				temperature: 0.4
			};

			if (systemMessage) {
				config.systemInstruction = {
					parts: [{ text: systemMessage.content }]
				};
			}

			const tools: any[] = [];
			if (options?.tools?.googleSearch) {
				tools.push({ googleSearch: {} });
			}
			if (options?.tools?.urlContext && options.tools.urlContext.length > 0) {
				// According to docs/cookbook, urlContext is a tool.
				// However, usually URLs are passed in the prompt or as a tool configuration.
				// Checking `url-context.md.txt`:
				// tools = [{ url_context: {} }] (Python)
				// tools: [{ urlContext: {} }] (JS)
				// And the URLs are in the content. "Compare... at url1 and url2"
				// Wait, the documentation says:
				// "Combine info from several source URLs... Point to a GitHub repo..."
				// And the example puts URLs IN THE PROMPT text.
				// BUT the tool needs to be enabled.
				// Is there a way to pass URLs explicitly as context not in the text?
				// "The URL Context tool... uses a two-step retrieval process... When you provide a URL, the tool first attempts to fetch..."
				// It seems it extracts URLs from the prompt text?
				// Let's check `urlCheck` usage again.
				// `contents="Compare ... at {url1} and {url2}"`
				// So if we have `options.tools.urlContext`, we might need to append these URLs to the prompt?
				// Or does the tool allow a separate list?
				// The `url-context.md.txt` doesn't show a separate list in `tool_config`, just `tools = [{urlContext: {}}]` and URLs in `contents`.
				// So if the user passes `urlContext: ["..."]` in options, we should probably append them to the last user message or system prompt?
				// "Provide specific URLs... The model will only retrieve content from the URLs you provide"

				// Let's append them to the last user message for now, to ensure they are "in the prompt".
				tools.push({ urlContext: {} });
			}

			// If urlContext is provided, we need to append standard instruction so the model knows what to do?
			// Or just appending the URLs is enough?
			// "Give me three day events schedule based on CURRENT_URL..."
			// If the user provides `urlContext` in options, we can assume they want the model to use it.
			// We should modify the last message to include these URLs if they aren't already there?
			// Or just trust the caller? The caller (frontend) might just send `urlContext` list and expects us to handle it.
			// Let's append: "\n\nContext URLs:\n<url1>\n<url2>"

			if (tools.length > 0) {
				config.tools = tools;
			}

			// Clone contents to avoid mutating specific reference if any (though we created it above)
			const finalContents = [...contents];

			if (options?.tools?.urlContext && options.tools.urlContext.length > 0) {
				const lastMsg = finalContents[finalContents.length - 1];
				if (lastMsg && lastMsg.role === 'user') {
					// Start of content modification
					const urlsText = `\n\n[Context URLs]:\n${options.tools.urlContext.join('\n')}`;
					lastMsg.parts[0].text += urlsText;
				}
			}

			const response = await client.models.generateContent({
				model: model,
				config: config,
				contents: finalContents
			});

			const text = response.text || '';

			// We can also extract metadata if needed, but invalidating the current interface which only returns content.
			// For now, just return text.
			// TODO: Log or handle groundingMetadata / urlContextMetadata

			return { content: text };
		}
	};
};
