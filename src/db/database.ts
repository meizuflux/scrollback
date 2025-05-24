import Dexie, { Table } from 'dexie';
import { StoredUser } from '../types/user';
import { Conversation, StoredMessage } from '../types/message';
import { StoredMedia } from '../types/data';

interface StoredPost {
    id?: number;
    title: string;
    creation_timestamp: number;
    media: string[]; // Array of media URIs
    archived?: boolean;
}

interface StoredStory {
    title: string;
    creation_timestamp: number;
    uri: string;
}

export class InstagramDatabase extends Dexie {
    users!: Table<StoredUser>;
    messages!: Table<StoredMessage>;
    conversations!: Table<Conversation>;
    media!: Table<StoredMedia>;
    posts!: Table<StoredPost>;
    stories!: Table<StoredStory>;

    constructor() {
        super('instagram-data');

        this.version(1).stores({
            users: 'username, stories_liked',
            messages: '++id, conversation, sender_name, timestamp_ms, *content',
            conversations: 'title, *participants',
            media: 'uri, type, creation_timestamp',
            posts: "++id, title, creation_timestamp, archived",
            stories: "++id, title, creation_timestamp"
        });
    }
}

export const db = new InstagramDatabase();
