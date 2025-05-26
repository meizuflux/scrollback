import { InstagramDatabase } from "../db/database";
import { decodeU8String, loadFile } from "../utils";
import { ProgFn } from "./import";

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

	const items = fileContent?.[dataKey];
	if (!items || !Array.isArray(items) || items.length === 0) {
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
		(item: any) => {
			const data = item.string_list_data?.[0];
			if (!data) return null;
			return {
				media_owner: item.title,
				href: data.href,
				timestamp: new Date(data.timestamp * 1000),
			};
		},
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
		(item: any) => {
			const data = item.string_map_data?.["Saved on"];
			if (!data) return null;
			return {
				media_owner: item.title,
				href: data.href,
				timestamp: new Date(data.timestamp * 1000),
			};
		},
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


