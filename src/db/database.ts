import Dexie, { Table } from "dexie";
import { Conversation, Media, Reaction, Share } from "../types/message";
import { ProfileChange, User } from "../types/user";

export interface StoredData {
	user: User;
	users: StoredUser[];
	messages: StoredMessage[];
	conversations: Conversation[];
}

export interface StoredMedia {
	uri: string;
	timestamp: Date;
	type: "photo" | "video";
	data: Blob;
}

interface StoredPost {
	id?: number;
	title: string;
	timestamp: Date;
	media: string[]; // Array of media URIs
	archived?: boolean;
}

export interface StoredMessage {
	conversation: string;
	sender_name: string;
	timestamp: Date;
	content?: string;
	reactions?: Reaction[];
	share?: Share;
	photos?: Media[];
	videos?: Media[];
}

interface StoredStory {
	title: string;
	timestamp: Date;
	uri: string;
}

interface StoredComment {
	media_owner: string;
	comment: string;
	timestamp: Date;
}

interface StoredLikedPost {
	media_owner: string;
	href: string;
	timestamp: Date;
}

interface StoredSavedPost {
	media_owner: string;
	href: string;
	timestamp: Date;
}

export interface TimestampedValue<T = boolean> {
	value: T;
	timestamp?: Date;
}

// TODO: adjust for timezone
export interface StoredUser {
	username: string;
	blocked?: TimestampedValue; // you blocked them
	close_friends?: TimestampedValue; // on close friends list
	requested_to_follow_you?: TimestampedValue; // they requested to follow you
	follower?: TimestampedValue; // they follow you
	following?: TimestampedValue; // you follow them
	hidden_story_from?: TimestampedValue; // you hide them from seeing your story
	pending_follow_request?: TimestampedValue; // ie, you requested to follow them and they haven't yet accepted
	recently_unfollowed?: TimestampedValue; // you recently unfollowed them
	stories_liked?: number; // number of stories you liked from this user
}

export class InstagramDatabase extends Dexie {
	users!: Table<StoredUser>;
	mainUser!: Table<User>;
	messages!: Table<StoredMessage>;
	conversations!: Table<Conversation>;
	media!: Table<StoredMedia>;
	posts!: Table<StoredPost>;
	stories!: Table<StoredStory>;
	comments!: Table<StoredComment>;
	likedPosts!: Table<StoredLikedPost>;
	savedPosts!: Table<StoredSavedPost>;
	profileChanges!: Table<ProfileChange>;

	constructor() {
		super("instagram-data");

		this.version(1).stores({
			users: "username, stories_liked",
			mainUser: "username",
			messages: "++id, conversation, sender_name, timestamp, *content",
			conversations: "title, *participants",
			media: "uri, type, timestamp",
			posts: "++id, title, timestamp, archived",
			stories: "++id, title, timestamp",
			comments: "++id, media_owner, comment, timestamp",
			likedPosts: "++id, media_owner, href, timestamp",
			savedPosts: "++id, media_owner, href, timestamp",
			profileChanges: "++id, changed, timestamp",
		});
	}
}

export const db = new InstagramDatabase();
