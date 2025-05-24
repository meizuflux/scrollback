import { Conversation, StoredMessage } from "./message";
import { StoredUser, User } from "./user";

export interface StoredData {
	user: User;
	users: StoredUser[];
	messages: StoredMessage[];
	conversations: Conversation[];
}

export interface StoredMedia {
	uri: string;
	creation_timestamp: number;
	type: 'photo' | 'video';
	data: Blob;
}