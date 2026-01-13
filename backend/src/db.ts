import { MongoClient, Db } from 'mongodb';
import { config } from './config.js';

let client: MongoClient | null = null;
let db: Db | null = null;

export const getDb = async (): Promise<Db> => {
	if (db) return db;
	client = new MongoClient(config.mongoUri);
	await client.connect();
	db = client.db(config.mongoDb);
	return db;
};

export const closeDb = async () => {
	if (client) {
		await client.close();
		client = null;
		db = null;
	}
};
