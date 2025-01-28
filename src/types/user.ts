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

export interface Message {
    sender_name: string
    timestamp_ms: number
    content?: string
    share?: {
        link: string,
        share_text?: string,
        original_content_owner?: string
    },
    photos?: {
        uri: string,
        creation_timestamp: number,
    },
    videos?: {
        uri: string,
        creation_timestamp: number,
    },
    reactions?: {
        reaction: string;
        actor: string; // person who reacted,
        timestamp: number;
    }[],
}

export interface StoredMessage extends Message {
    conversation: string;
}


export interface MessageFile {
    participants: { name: string }[],
    messages: Message[],
    title: string,
    image?: {
        uri: string,
        creation_timestamp: number,
    }
}

export interface StoredConversation {
    title: string,
    participants: string[],
    is_group: boolean
}

export interface StoredData {
    user: User,
    users: StoredUser[],
    messages: StoredMessage[],
    conversations: StoredConversation[]
}