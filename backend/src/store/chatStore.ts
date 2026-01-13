import { ObjectId } from 'mongodb';
import { getDb } from '../db.js';
import type { ChatMessage } from '../providers/types.js';

export type StoredAssistant = {
	reply: string;
	analysis: string;
	suggestions: string[];
	grammarNotes: string[];
};

export interface ChatStore {
	createSession(): Promise<string>;
	isValidSession(id: string): Promise<boolean>;
	getMessages(sessionId: string): Promise<ChatMessage[]>;
	addUserMessage(sessionId: string, content: string): Promise<void>;
	addAssistantMessage(sessionId: string, data: StoredAssistant): Promise<void>;
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
			.sort({ createdAt: 1 })
			.limit(10)
			.toArray();

		return history.map((item) => ({
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
}
