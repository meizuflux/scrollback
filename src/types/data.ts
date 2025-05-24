import { Conversation, StoredMessage } from "./message";
import { StoredUser, User } from "./user";

export interface StoredData {
	user: User;
	users: StoredUser[];
	messages: StoredMessage[];
	conversations: Conversation[];
}