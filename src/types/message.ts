export interface Participant {
	name: string;
}

export interface Reaction {
	reaction: string;
	actor: string;
}

export interface Share {
	link?: string;
}

export interface Media {
	uri: string; // path to the photo file, we can probably store this? we probably want to store metadata about what type of data the user decided to export
	creation_timestamp: number;
}

export interface Message {
	sender_name: string;
	timestamp_ms: number;
	content?: string;
	reactions?: Reaction[];
	share?: Share;
	photos?: Media[];
	videos?: Media[];
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