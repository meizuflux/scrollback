import Dexie, { Table } from 'dexie';
import { StoredUser } from '../types/user';
import { Conversation, StoredMessage } from '../types/message';

export interface StoredMedia {
    uri: string; // Primary key
    creation_timestamp: number;
    type: 'photo' | 'video';
    data: Blob;
}

export class InstagramDatabase extends Dexie {
    users!: Table<StoredUser>;
    messages!: Table<StoredMessage>;
    conversations!: Table<Conversation>;
    media!: Table<StoredMedia>;

    constructor() {
        super('instagram-data');

        this.version(1).stores({
            users: 'username',
            messages: '++id, conversation, sender_name, timestamp_ms, *content',
            conversations: 'title, *participants',
            media: 'uri, type, creation_timestamp'
        });
    }
}

export const db = new InstagramDatabase();
