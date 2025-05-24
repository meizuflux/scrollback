export interface User {
	username: string;
	name: string;
	email: string;
	bio: string;
	gender: string;
	privateAccount: Boolean;
	dateOfBirth: Date;
}

// TODO: adjust for timezone
export interface StoredUser {
	username: string;
	blocked?: boolean; // you blocked them
	blocked_timestamp?: Date;
	close_friends?: boolean; // on close friends list
	close_friends_timestamp?: Date;
	requested_to_follow_you?: boolean; // they requested to follow you
	requested_to_follow_timestamp?: Date;
	follower?: boolean; // they follow you
	follower_timestamp?: Date;
	following?: boolean; // you follow them
	following_timestamp?: Date;
	hidden_story_from?: boolean; // you hide them from seeing your story
	hidden_story_from_timestamp?: Date;
	pending_follow_request?: boolean; // ie, you requested to follow them and they haven't yet accepted
	pending_follow_request_timestamp?: Date;
	recently_unfollowed?: boolean; // you recently unfollowed them
	recently_unfollowed_timestamp?: Date;
}

export interface Participant {
	name: string;
}

export interface Reaction {
	reaction: string;
	actor: string;
}

export interface Share {
	link?: string;
	share_text?: string;
}

export interface Photo {
	uri: string;
	creation_timestamp: number;
}

export interface Video {
	uri: string;
	creation_timestamp: number;
}

export interface Message {
	sender_name?: string;
	timestamp_ms?: number;
	content?: string;
	reactions?: Reaction[];
	share?: Share;
	photos?: Photo[];
	videos?: Video[];
	is_unsent?: boolean;
	type?: string;
}

export interface StoredMessage extends Message {
	conversation: string;
}

export interface MessageFile {
	participants: Participant[];
	messages: Message[];
	title: string;
	is_still_participant: boolean;
	thread_path: string;
}

export interface Conversation {
	title: string;
	participants: string[];
	is_group: boolean;
}

export interface StoredData {
	user: User;
	users: StoredUser[];
	messages: StoredMessage[];
	conversations: Conversation[];
}
