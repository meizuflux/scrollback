import { InstagramDatabase } from "../db/database";
import { decodeU8String, loadFile } from "../utils";

const processInteractionFile = async (
	filePath: string,
	dataKey: string,
	dbTable: any, // Dexie Table instance
	files: File[],
	onProgress?: (progress: number, statusText?: string) => void,
	itemType?: string, // e.g. "liked post", "comment"
	transformFn?: (item: any) => any,
) => {
	onProgress?.(0, `Loading ${itemType}s file: ${filePath}`);
	const fileContent = await loadFile<any>(files, filePath);
	onProgress?.(20, `File ${filePath} loaded.`);

	const items = fileContent?.[dataKey];
	if (!items || !Array.isArray(items) || items.length === 0) {
		onProgress?.(100, `No ${itemType}s found in ${filePath}.`);
		return;
	}
	onProgress?.(30, `Found ${items.length} ${itemType}s.`);

	const itemsToSave = [];
	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		const currentProgress = 30 + Math.round((i / items.length) * 50); // Processing: 30-80%
		if (i % Math.max(1, Math.floor(items.length / 10)) === 0 || i === items.length - 1) {
			// Update ~10 times
			onProgress?.(currentProgress, `Processing ${itemType} ${i + 1}/${items.length}`);
		}
		const transformedItem = transformFn ? transformFn(item) : item;
		if (transformedItem) itemsToSave.push(transformedItem);
	}

	onProgress?.(80, `Saving ${itemsToSave.length} ${itemType}s to database...`);
	if (itemsToSave.length > 0) {
		await dbTable.bulkAdd(itemsToSave);
	}
	onProgress?.(100, `${itemType}s import finished.`);
};

export const importPostLikes = async (
	files: File[],
	database: InstagramDatabase,
	onProgress?: (progress: number, statusText?: string) => void,
) => {
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

export const importComments = async (
	files: File[],
	database: InstagramDatabase,
	onProgress?: (progress: number, statusText?: string) => void,
) => {
	// Comments file is an array at the root, not nested under a key
	onProgress?.(0, "Loading comments file: /your_instagram_activity/comments/post_comments_1.json");
	const commentsFile = await loadFile<any[]>(files, "/your_instagram_activity/comments/post_comments_1.json");
	onProgress?.(20, "Comments file loaded.");

	if (!commentsFile || !Array.isArray(commentsFile) || commentsFile.length === 0) {
		onProgress?.(100, "No comments found.");
		return;
	}

	const commentsToSave = [];
	for (let i = 0; i < commentsFile.length; i++) {
		const comment = commentsFile[i];
		const currentProgress = 30 + Math.round((i / commentsFile.length) * 50); // Processing: 30-80%
		if (i % Math.max(1, Math.floor(commentsFile.length / 10)) === 0 || i === commentsFile.length - 1) {
			// Update ~10 times
			onProgress?.(currentProgress, `Processing comment ${i + 1}/${commentsFile.length}`);
		}
		const data = comment.string_map_data;
		if (!data) continue;
		commentsToSave.push({
			media_owner: data["Media Owner"]?.value,
			comment: decodeU8String(data["Comment"]?.value),
			timestamp: new Date(data["Time"]?.timestamp * 1000),
		});
	}

	onProgress?.(80, `Saving ${commentsToSave.length} comments to database...`);
	if (commentsToSave.length > 0) {
		await database.comments.bulkAdd(commentsToSave);
	}
	onProgress?.(95, "Comments saved.");
	onProgress?.(100, "Comments import finished.");
};

export const importSavedPosts = async (
	files: File[],
	database: InstagramDatabase,
	onProgress?: (progress: number, statusText?: string) => void,
) => {
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
