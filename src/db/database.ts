import Dexie, { Table } from 'dexie';
import { StoredUser, StoredMessage, Conversation } from '../types/user';

export class InstagramDatabase extends Dexie {
    users!: Table<StoredUser>;
    messages!: Table<StoredMessage>;
    conversations!: Table<Conversation>;

    constructor() {
        super('instagram-data');
        
        this.version(1).stores({
            users: 'username, blocked, close_friends, follower, following, *blocked_timestamp, *close_friends_timestamp, *follower_timestamp, *following_timestamp',
            messages: '++id, conversation, sender_name, timestamp_ms, *content',
            conversations: 'title, is_group, *participants'
        });
    }
}

export const db = new InstagramDatabase();
