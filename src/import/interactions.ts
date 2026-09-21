import type { InstagramDatabase } from "@/db/database";
import { decodeU8String, loadFile } from "@/utils/media";
import type { ProgFn } from "./import";

// Instagram interaction files (likes, saves, story likes) currently use a
// label_values structure, e.g.
// {
//   "timestamp": 1788990318,
//   "media": [],
//   "label_values": [
//     { "label": "URL", "value": "https://..." },
//     { "label": "Caption", "value": "..." },
//     { "dict": [...], "title": "Owner" }
//   ],
//   "fbid": "..."
// }
// but older exports used string_list_data / string_map_data instead.

export const getLabelValue = (item: any, label: string): string =>
	item.label_values?.find((entry: any) => entry.label === label)?.value ?? "";

export const getOwnerUsername = (item: any): string => {
	const ownerEntry = item.label_values?.find((entry: any) => entry.title === "Owner");
	for (const owner of ownerEntry?.dict ?? []) {
		const username = owner.dict?.find((entry: any) => entry.label === "Username")?.value;
		if (username) return username;
	}
	return getLabelValue(item, "Username");
};

interface ParsedInteraction {
	media_owner: string;
	href: string;
	timestamp: Date;
}

const parseInteractionItem = (item: any): ParsedInteraction | null => {
	const data = item.string_list_data?.[0] ?? item.string_map_data?.["Saved on"];
	const href = getLabelValue(item, "URL") || data?.href || "";
	const mediaOwner = getOwnerUsername(item) || item.title || "";
	const timestamp = item.timestamp ?? data?.timestamp;
	if ((!href && !mediaOwner) || timestamp == null) return null;
	return {
		media_owner: mediaOwner,
		href,
		timestamp: new Date(timestamp * 1000),
	};
};

const processInteractionFile = async (
	filePath: string,
	dataKey: string,
	dbTable: any, // Dexie Table instance
	files: File[],
	onProgress: ProgFn,
	itemType?: string, // e.g. "liked post", "comment"
	transformFn?: (item: any) => any,
) => {
	onProgress(0, `Loading ${itemType}s file: ${filePath}`);
	const fileContent = await loadFile<any>(files, filePath);

	if (!fileContent) {
		onProgress(100, `No ${itemType}s file found: ${filePath}.`);
		return;
	}

	// Some exports nest entries under dataKey, others are a bare array at the root
	const rawItems = fileContent?.[dataKey];
	const items = Array.isArray(rawItems) ? rawItems : Array.isArray(fileContent) ? fileContent : [];
	if (items.length === 0) {
		onProgress(100, `No ${itemType}s found in ${filePath}.`);
		return;
	}
	onProgress(30, `Found ${items.length} ${itemType}s. Processing...`);

	const itemsToSave = [];
	for (let i = 0; i < items.length; i++) {
		const item = items[i];

		const transformedItem = transformFn ? transformFn(item) : item;
		if (transformedItem) itemsToSave.push(transformedItem);
	}

	onProgress(80, `Saving ${itemsToSave.length} ${itemType}s to database...`);
	if (itemsToSave.length > 0) {
		await dbTable.bulkAdd(itemsToSave);
	}
	onProgress(100, `${itemType}s import finished. Found ${itemsToSave.length} ${itemType}s.`);
};

export const importPostLikes = async (files: File[], database: InstagramDatabase, onProgress: ProgFn) => {
	await processInteractionFile(
		"/your_instagram_activity/likes/liked_posts.json",
		"likes_media_likes",
		database.likedPosts,
		files,
		onProgress,
		"liked post",
		parseInteractionItem,
	);
};

export const importSavedPosts = async (files: File[], database: InstagramDatabase, onProgress: ProgFn) => {
	await processInteractionFile(
		"/your_instagram_activity/saved/saved_posts.json",
		"saved_saved_media",
		database.savedPosts,
		files,
		onProgress,
		"saved post",
		parseInteractionItem,
	);
};

export const importComments = async (files: File[], database: InstagramDatabase, onProgress: ProgFn) => {
	// Comments file is an array at the root, not nested under a key
	onProgress(0, "Loading comments file: /your_instagram_activity/comments/post_comments_1.json");
	const commentsFile = await loadFile<any[]>(files, "/your_instagram_activity/comments/post_comments_1.json");

	if (!commentsFile || !Array.isArray(commentsFile) || commentsFile.length === 0) {
		onProgress(100, "No comments found.");
		return;
	}
	onProgress(30, `Found ${commentsFile.length} comments. Processing...`);
	const commentsToSave = [];
	for (let i = 0; i < commentsFile.length; i++) {
		const comment = commentsFile[i];

		const data = comment.string_map_data;
		if (!data) continue;
		commentsToSave.push({
			media_owner: data["Media Owner"]?.value,
			comment: decodeU8String(data["Comment"]?.value),
			timestamp: new Date(data["Time"]?.timestamp * 1000),
		});
	}

	onProgress(80, `Saving ${commentsToSave.length} comments to database...`);
	if (commentsToSave.length > 0) {
		await database.comments.bulkAdd(commentsToSave);
	}
	onProgress(100, "Comments import finished.");
};
