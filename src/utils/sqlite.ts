import { db, StoredMediaMetadata, StoredMessage } from "@/db/database";
import { Media } from "@/types/message";

export interface TableOption {
	name: string;
	label: string;
	description: string;
	enabled: boolean;
}

interface TableDefinition {
	name: string;
	label: string;
	description: string;
	defaultEnabled: boolean;
	schema: string;
	indexes?: string[];
	fetchData: () => Promise<any[]>;
	insertData: (db: any, data: any[], mediaMetadataMap?: Map<string, any>) => void;
}

const TABLE_DEFINITIONS: Record<string, TableDefinition> = {
	main_user: {
		name: "main_user",
		label: "Main User",
		description: "Your account information",
		defaultEnabled: true,
		schema: `CREATE TABLE main_user (
			username TEXT PRIMARY KEY,
			name TEXT,
			email TEXT,
			bio TEXT,
			gender TEXT,
			private_account BOOLEAN,
			date_of_birth DATE,
			based_in TEXT,
			locations_of_interest TEXT,
			videos_watched INTEGER,
			not_interested_profiles INTEGER,
			not_interested_posts INTEGER,
			posts_viewed INTEGER,
			ads_viewed INTEGER
		)`,
		indexes: [],
		fetchData: () => db.mainUser.toArray(),
		insertData: (sqliteDb: any, data: any[]) => {
			const insert = sqliteDb.prepare(`
				INSERT INTO main_user (
					username, name, email, bio, gender, private_account, date_of_birth,
					based_in, locations_of_interest, videos_watched, not_interested_profiles,
					not_interested_posts, posts_viewed, ads_viewed
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`);

			for (const user of data) {
				insert.run([
					user.username,
					user.name,
					user.email,
					user.bio,
					user.gender,
					user.privateAccount ? 1 : 0,
					safeISOString(user.dateOfBirth),
					user.basedIn,
					JSON.stringify(user.locationsOfInterest || []),
					user.videosWatched || 0,
					user.notInterestedProfiles || 0,
					user.notInterestedPosts || 0,
					user.postsViewed || 0,
					user.adsViewed || 0
				]);
			}
			insert.free();
		}
	},

	users: {
		name: "users",
		label: "Users",
		description: "All users and their relationship data",
		defaultEnabled: true,
		schema: `CREATE TABLE users (
			username TEXT PRIMARY KEY,
			is_blocked BOOLEAN,
			blocked_timestamp TIMESTAMP,
			is_close_friend BOOLEAN,
			close_friend_timestamp TIMESTAMP,
			requested_to_follow_you BOOLEAN,
			requested_to_follow_you_timestamp TIMESTAMP,
			is_follower BOOLEAN,
			follower_timestamp TIMESTAMP,
			is_following BOOLEAN,
			following_timestamp TIMESTAMP,
			hidden_story_from BOOLEAN,
			hidden_story_from_timestamp TIMESTAMP,
			pending_follow_request BOOLEAN,
			pending_follow_request_timestamp TIMESTAMP,
			recently_unfollowed BOOLEAN,
			recently_unfollowed_timestamp TIMESTAMP,
			stories_liked INTEGER
		)`,
		indexes: [
			"CREATE INDEX idx_users_following ON users(is_following)",
			"CREATE INDEX idx_users_follower ON users(is_follower)"
		],
		fetchData: () => db.users.toArray(),
		insertData: (sqliteDb: any, data: any[]) => {
			const insert = sqliteDb.prepare(`
				INSERT INTO users (
					username, is_blocked, blocked_timestamp, is_close_friend, close_friend_timestamp,
					requested_to_follow_you, requested_to_follow_you_timestamp, is_follower, follower_timestamp,
					is_following, following_timestamp, hidden_story_from, hidden_story_from_timestamp,
					pending_follow_request, pending_follow_request_timestamp, recently_unfollowed, recently_unfollowed_timestamp,
					stories_liked
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`);

			for (const user of data) {
				insert.run([
					user.username,
					user.blocked?.value ? 1 : 0,
					safeISOString(user.blocked?.timestamp),
					user.close_friends?.value ? 1 : 0,
					safeISOString(user.close_friends?.timestamp),
					user.requested_to_follow_you?.value ? 1 : 0,
					safeISOString(user.requested_to_follow_you?.timestamp),
					user.follower?.value ? 1 : 0,
					safeISOString(user.follower?.timestamp),
					user.following?.value ? 1 : 0,
					safeISOString(user.following?.timestamp),
					user.hidden_story_from?.value ? 1 : 0,
					safeISOString(user.hidden_story_from?.timestamp),
					user.pending_follow_request?.value ? 1 : 0,
					safeISOString(user.pending_follow_request?.timestamp),
					user.recently_unfollowed?.value ? 1 : 0,
					safeISOString(user.recently_unfollowed?.timestamp),
					user.stories_liked || 0
				]);
			}
			insert.free();
		}
	},

	conversations: {
		name: "conversations",
		label: "Conversations",
		description: "Conversation metadata",
		defaultEnabled: true,
		schema: `CREATE TABLE conversations (
			title TEXT PRIMARY KEY,
			participants TEXT,
			is_group BOOLEAN
		)`,
		indexes: [],
		fetchData: () => db.conversations.toArray(),
		insertData: (sqliteDb: any, data: any[]) => {
			const insert = sqliteDb.prepare(`
				INSERT INTO conversations (title, participants, is_group)
				VALUES (?, ?, ?)
			`);

			for (const conversation of data) {
				insert.run([
					conversation.title,
					JSON.stringify(conversation.participants),
					conversation.is_group ? 1 : 0
				]);
			}
			insert.free();
		}
	},

	messages: {
		name: "messages",
		label: "Messages",
		description: "All messages with content and media",
		defaultEnabled: true,
		schema: `CREATE TABLE messages (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			conversation_title TEXT,
			sender_name TEXT,
			timestamp TIMESTAMP,
			content TEXT,
			is_system_message BOOLEAN,
			media_files TEXT,
			reactions TEXT,
			share_link TEXT,
			share_text TEXT,
			FOREIGN KEY (conversation_title) REFERENCES conversations(title)
		)`,
		indexes: [
			"CREATE INDEX idx_messages_conversation ON messages(conversation_title)",
			"CREATE INDEX idx_messages_timestamp ON messages(timestamp)",
			"CREATE INDEX idx_messages_sender ON messages(sender_name)"
		],
		fetchData: () => db.messages.toArray(),
		insertData: (sqliteDb: any, data: any[], mediaMetadataMap?: Map<string, any>) => {
			const insert = sqliteDb.prepare(`
				INSERT INTO messages (
					conversation_title, sender_name, timestamp, content, is_system_message,
					media_files, reactions, share_link, share_text
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
			`);

			for (const message of data) {
				const mediaFileNames = mediaMetadataMap ? processMediaFileNames(message, mediaMetadataMap) : [];
				insert.run([
					message.conversation,
					message.sender_name,
					safeISOString(message.timestamp),
					message.content || null,
					message.isSystemMessage ? 1 : 0,
					mediaFileNames.length > 0 ? JSON.stringify(mediaFileNames) : null,
					message.reactions ? JSON.stringify(message.reactions) : null,
					message.share?.link || null,
					null // share_text placeholder
				]);
			}
			insert.free();
		}
	},

	media_metadata: {
		name: "media_metadata",
		label: "Media Metadata",
		description: "Photo, video, and audio file information",
		defaultEnabled: true,
		schema: `CREATE TABLE media_metadata (
			uri TEXT PRIMARY KEY,
			timestamp TIMESTAMP,
			type TEXT CHECK(type IN ('photo', 'video', 'audio')),
			file_name TEXT
		)`,
		indexes: [
			"CREATE INDEX idx_media_type ON media_metadata(type)"
		],
		fetchData: () => db.media_metadata.toArray(),
		insertData: (sqliteDb: any, data: any[]) => {
			const insert = sqliteDb.prepare(`
				INSERT INTO media_metadata (uri, timestamp, type, file_name)
				VALUES (?, ?, ?, ?)
			`);

			for (const media of data) {
				insert.run([
					media.uri,
					safeISOString(media.timestamp),
					media.type,
					media.fileName || null
				]);
			}
			insert.free();
		}
	},

	posts: {
		name: "posts",
		label: "Posts",
		description: "Your posts and archived content",
		defaultEnabled: true,
		schema: `CREATE TABLE posts (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			title TEXT,
			timestamp TIMESTAMP,
			media_uris TEXT,
			archived BOOLEAN
		)`,
		indexes: [],
		fetchData: () => db.posts.toArray(),
		insertData: (sqliteDb: any, data: any[]) => {
			const insert = sqliteDb.prepare(`
				INSERT INTO posts (title, timestamp, media_uris, archived)
				VALUES (?, ?, ?, ?)
			`);

			for (const post of data) {
				insert.run([
					post.title,
					safeISOString(post.timestamp),
					JSON.stringify(post.media || []),
					post.archived ? 1 : 0
				]);
			}
			insert.free();
		}
	},

	stories: {
		name: "stories",
		label: "Stories",
		description: "Your story content",
		defaultEnabled: true,
		schema: `CREATE TABLE stories (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			title TEXT,
			timestamp TIMESTAMP,
			uri TEXT
		)`,
		indexes: [],
		fetchData: () => db.stories.toArray(),
		insertData: (sqliteDb: any, data: any[]) => {
			const insert = sqliteDb.prepare(`
				INSERT INTO stories (title, timestamp, uri)
				VALUES (?, ?, ?)
			`);

			for (const story of data) {
				insert.run([
					story.title,
					safeISOString(story.timestamp),
					story.uri
				]);
			}
			insert.free();
		}
	},

	comments: {
		name: "comments",
		label: "Comments",
		description: "Comments you've made",
		defaultEnabled: true,
		schema: `CREATE TABLE comments (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			media_owner TEXT,
			comment TEXT,
			timestamp TIMESTAMP
		)`,
		indexes: [],
		fetchData: () => db.comments.toArray(),
		insertData: (sqliteDb: any, data: any[]) => {
			const insert = sqliteDb.prepare(`
				INSERT INTO comments (media_owner, comment, timestamp)
				VALUES (?, ?, ?)
			`);

			for (const comment of data) {
				insert.run([
					comment.media_owner,
					comment.comment,
					safeISOString(comment.timestamp)
				]);
			}
			insert.free();
		}
	},

	liked_posts: {
		name: "liked_posts",
		label: "Liked Posts",
		description: "Posts you've liked",
		defaultEnabled: true,
		schema: `CREATE TABLE liked_posts (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			media_owner TEXT,
			href TEXT,
			timestamp TIMESTAMP
		)`,
		indexes: [],
		fetchData: () => db.likedPosts.toArray(),
		insertData: (sqliteDb: any, data: any[]) => {
			const insert = sqliteDb.prepare(`
				INSERT INTO liked_posts (media_owner, href, timestamp)
				VALUES (?, ?, ?)
			`);

			for (const liked of data) {
				insert.run([
					liked.media_owner,
					liked.href,
					safeISOString(liked.timestamp)
				]);
			}
			insert.free();
		}
	},

	saved_posts: {
		name: "saved_posts",
		label: "Saved Posts",
		description: "Posts you've saved",
		defaultEnabled: true,
		schema: `CREATE TABLE saved_posts (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			media_owner TEXT,
			href TEXT,
			timestamp TIMESTAMP
		)`,
		indexes: [],
		fetchData: () => db.savedPosts.toArray(),
		insertData: (sqliteDb: any, data: any[]) => {
			const insert = sqliteDb.prepare(`
				INSERT INTO saved_posts (media_owner, href, timestamp)
				VALUES (?, ?, ?)
			`);

			for (const saved of data) {
				insert.run([
					saved.media_owner,
					saved.href,
					safeISOString(saved.timestamp)
				]);
			}
			insert.free();
		}
	},

	profile_changes: {
		name: "profile_changes",
		label: "Profile Changes",
		description: "History of profile modifications",
		defaultEnabled: true,
		schema: `CREATE TABLE profile_changes (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			changed TEXT,
			previous_value TEXT,
			new_value TEXT,
			timestamp TIMESTAMP
		)`,
		indexes: [],
		fetchData: () => db.profileChanges.toArray(),
		insertData: (sqliteDb: any, data: any[]) => {
			const insert = sqliteDb.prepare(`
				INSERT INTO profile_changes (changed, previous_value, new_value, timestamp)
				VALUES (?, ?, ?, ?)
			`);

			for (const change of data) {
				insert.run([
					change.changed,
					change.previousValue,
					change.newValue,
					safeISOString(change.timestamp)
				]);
			}
			insert.free();
		}
	}
};

export const getDefaultTables = (): TableOption[] => {
	return Object.values(TABLE_DEFINITIONS)
		.map(table => ({
			name: table.name,
			label: table.label,
			description: table.description,
			enabled: table.defaultEnabled
		}));
};

export const safeISOString = (date: Date | null | undefined): string | null => {
	if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
		return null;
	}
	return date.toISOString();
};

export const generateSchemaFromDb = (enabledTables: string[]): string => {
	try {
		const sections: string[] = [];

		// Add tables
		const tableSchemas = enabledTables
			.map(tableName => TABLE_DEFINITIONS[tableName]?.schema)
			.filter(schema => schema !== undefined)
			.map(schema => {
				// Clean up indentation for better formatting
				return schema.trim()
					.replace(/\s+/g, ' ') // Replace multiple spaces with single space
					.replace(/\(\s+/g, '(\n    ') // Fix opening parenthesis
					.replace(/,\s+/g, ',\n    ') // Add line breaks after commas
					.replace(/\s+\)/g, '\n)'); // Fix closing parenthesis
			});

		sections.push(...tableSchemas.map(schema => schema + ';'));
		sections.unshift(tableSchemas.length > 0 ? "-- Tables" : "-- No tables selected");
		sections.push("");

		const allIndexes = enabledTables
			.flatMap(tableName => TABLE_DEFINITIONS[tableName]?.indexes || [])
			.filter(index => index !== undefined);

		if (allIndexes.length > 0) {
			sections.push("-- Indexes");
			sections.push(...allIndexes.map(index => index + ';'));
		}

		return sections.join('\n');
	} catch (error) {
		console.error("Error generating schema:", error);
		return "-- Error generating schema";
	}
};

export const createTableStatements = (enabledTables: string[]): string[] => {
	return enabledTables
		.map(tableName => TABLE_DEFINITIONS[tableName]?.schema)
		.filter(schema => schema !== undefined);
};

export const createIndexStatements = (enabledTables: string[]): string[] => {
	const statements: string[] = [];

	for (const tableName of enabledTables) {
		const table = TABLE_DEFINITIONS[tableName];
		if (table?.indexes) {
			statements.push(...table.indexes);
		}
	}

	return statements;
};

export const fetchAllData = async (enabledTables: string[]) => {
	const data: Record<string, any[]> = {};

	for (const tableName of enabledTables) {
		const table = TABLE_DEFINITIONS[tableName];
		if (table) {
			try {
				data[tableName] = await table.fetchData();
			} catch (error) {
				console.error(`Error fetching data for table ${tableName}:`, error);
				data[tableName] = [];
			}
		}
	}

	// Return in the expected format for backward compatibility
	return {
		mainUsers: data.main_user || [],
		users: data.users || [],
		messages: data.messages || [],
		mediaMetadata: data.media_metadata || [],
		conversations: data.conversations || [],
		posts: data.posts || [],
		stories: data.stories || [],
		comments: data.comments || [],
		likedPosts: data.liked_posts || [],
		savedPosts: data.saved_posts || [],
		profileChanges: data.profile_changes || [],
		virtualFiles: data.virtual_files || []
	};
};

export const processMediaFileNames = (message: StoredMessage, mediaMetadataMap: Map<string, StoredMediaMetadata>): string[] => {
	const mediaFileNames: string[] = [];

	const processMediaArray = (mediaArray?: Media[]) => {
		if (mediaArray) {
			for (const mediaItem of mediaArray) {
				const metadata = mediaMetadataMap.get(mediaItem.uri);
				if (metadata?.fileName) {
					mediaFileNames.push(metadata.fileName);
				} else {
					const uriParts = mediaItem.uri.split('/');
					mediaFileNames.push(uriParts[uriParts.length - 1]);
				}
			}
		}
	};

	processMediaArray(message.photos);
	processMediaArray(message.videos);
	processMediaArray(message.audio);

	return mediaFileNames;
};

// Helper functions for getting specific table information
export const getTableDefinition = (tableName: string): TableDefinition | undefined => {
	return TABLE_DEFINITIONS[tableName];
};

export const getAllTableNames = (): string[] => {
	return Object.keys(TABLE_DEFINITIONS);
};

export const getEnabledTableDefinitions = (enabledTables: string[]): TableDefinition[] => {
	return enabledTables
		.map(name => TABLE_DEFINITIONS[name])
		.filter(def => def !== undefined);
};

// Helper function to insert data for enabled tables
export const insertTableData = async (
	sqliteDb: any,
	enabledTables: string[],
	data: any,
	mediaMetadataMap?: Map<string, any>,
	onProgress?: (tableName: string, progress: number) => void
) => {
	const tableCount = enabledTables.length;
	let currentTable = 0;

	for (const tableName of enabledTables) {
		const table = TABLE_DEFINITIONS[tableName];
		if (table) {
			onProgress?.(table.label, Math.round((currentTable / tableCount) * 100));

			// Get the data for this table
			const tableData = getTableDataFromFetchResult(data, tableName);

			// Only insert if there's data to insert
			if (tableData.length > 0) {
				table.insertData(sqliteDb, tableData, mediaMetadataMap);
			}

			currentTable++;
			// Small delay to allow UI updates
			await new Promise(resolve => setTimeout(resolve, 0));
		}
	}
};

// Helper to extract table data from the fetch result
const getTableDataFromFetchResult = (data: any, tableName: string): any[] => {
	const mappings: Record<string, string> = {
		'main_user': 'mainUsers',
		'users': 'users',
		'conversations': 'conversations',
		'messages': 'messages',
		'media_metadata': 'mediaMetadata',
		'posts': 'posts',
		'stories': 'stories',
		'comments': 'comments',
		'liked_posts': 'likedPosts',
		'saved_posts': 'savedPosts',
		'profile_changes': 'profileChanges',
		'virtual_files': 'virtualFiles'
	};

	const dataKey = mappings[tableName];
	return dataKey ? (data[dataKey] || []) : [];
};
