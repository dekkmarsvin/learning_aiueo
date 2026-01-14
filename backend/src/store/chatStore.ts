import { ObjectId } from 'mongodb';
import { getDb } from '../db.js';
import type { ChatMessage } from '../providers/types.js';

export type StoredAssistant = {
	reply: string;
	analysis: string;
	suggestions: { text: string; reading: string }[];
	grammarNotes: string[];
};

export interface ChatStore {
	createSession(): Promise<string>;
	isValidSession(id: string): Promise<boolean>;
	getMessages(sessionId: string): Promise<ChatMessage[]>;
	addUserMessage(sessionId: string, content: string): Promise<void>;
	addAssistantMessage(sessionId: string, data: StoredAssistant): Promise<void>;
	getCachedTranslation(text: string, targetLang: string): Promise<string | null>;
	setCachedTranslation(text: string, targetLang: string, translation: string): Promise<void>;
	getCachedTopicPrompt(topic: string, context: string): Promise<string | null>;
	setCachedTopicPrompt(topic: string, context: string, prompt: string): Promise<void>;
}

export class MongoChatStore implements ChatStore {
	async createSession(): Promise<string> {
		const db = await getDb();
		const sessions = db.collection('sessions');
		const result = await sessions.insertOne({ createdAt: new Date() });
		return result.insertedId.toHexString();
	}

	async isValidSession(id: string) {
		return ObjectId.isValid(id);
	}

	async getMessages(sessionId: string): Promise<ChatMessage[]> {
		const db = await getDb();
		const messages = db.collection('messages');
		const sessionObjectId = new ObjectId(sessionId);
		const history = await messages
			.find({ sessionId: sessionObjectId })
			.sort({ createdAt: -1 })
			.limit(20)
			.toArray();

		return history.reverse().map((item) => ({
			role: item.role,
			content: item.content
		}));
	}

	async addUserMessage(sessionId: string, content: string) {
		const db = await getDb();
		const messages = db.collection('messages');
		const sessionObjectId = new ObjectId(sessionId);
		await messages.insertOne({
			sessionId: sessionObjectId,
			role: 'user',
			content,
			createdAt: new Date()
		});
	}

	async addAssistantMessage(sessionId: string, data: StoredAssistant) {
		const db = await getDb();
		const messages = db.collection('messages');
		const sessionObjectId = new ObjectId(sessionId);
		await messages.insertOne({
			sessionId: sessionObjectId,
			role: 'assistant',
			content: data.reply,
			analysis: data.analysis,
			suggestions: data.suggestions,
			grammarNotes: data.grammarNotes,
			createdAt: new Date()
		});
	}

	async getCachedTranslation(text: string, targetLang: string): Promise<string | null> {
		const db = await getDb();
		const translations = db.collection('translations');
		const result = await translations.findOne({ text, targetLang });
		return result ? (result.translation as string) : null;
	}

	async setCachedTranslation(text: string, targetLang: string, translation: string) {
		const db = await getDb();
		const translations = db.collection('translations');
		await translations.updateOne(
			{ text, targetLang },
			{ $set: { translation, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
			{ upsert: true }
		);
	}

	async getCachedTopicPrompt(topic: string, context: string): Promise<string | null> {
		const db = await getDb();
		const topicPrompts = db.collection('topic_prompts');
		const result = await topicPrompts.findOne({ topic, context });
		return result ? (result.prompt as string) : null;
	}

	async setCachedTopicPrompt(topic: string, context: string, prompt: string) {
		const db = await getDb();
		const topicPrompts = db.collection('topic_prompts');
		await topicPrompts.updateOne(
			{ topic, context },
			{ $set: { prompt, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
			{ upsert: true }
		);
	}
}

export class MemoryChatStore implements ChatStore {
	private sessions = new Map<string, { messages: ChatMessage[] }>();

	async createSession(): Promise<string> {
		const id = Math.random().toString(36).slice(2);
		this.sessions.set(id, { messages: [] });
		return id;
	}

	async isValidSession(id: string) {
		return this.sessions.has(id);
	}

	async getMessages(sessionId: string): Promise<ChatMessage[]> {
		const session = this.sessions.get(sessionId);
		return session?.messages ?? [];
	}

	async addUserMessage(sessionId: string, content: string) {
		const session = this.sessions.get(sessionId);
		if (!session) return;
		session.messages.push({ role: 'user', content });
	}

	async addAssistantMessage(sessionId: string, data: StoredAssistant) {
		const session = this.sessions.get(sessionId);
		if (!session) return;
		session.messages.push({ role: 'assistant', content: data.reply });
	}

	async getCachedTranslation(text: string, targetLang: string): Promise<string | null> {
		return null;
	}

	async setCachedTranslation(text: string, targetLang: string, translation: string) {
		// No-op for memory store
	}

	async getCachedTopicPrompt(topic: string, context: string): Promise<string | null> {
		return null;
	}

	async setCachedTopicPrompt(topic: string, context: string, prompt: string) {
		// No-op for memory store
	}
}
