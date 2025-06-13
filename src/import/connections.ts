import { InstagramDatabase, StoredUser } from "@/db/database";
import { loadFile } from "@/utils";
import { ProgFn } from "./import";

export default async (files: File[], database: InstagramDatabase, onProgress: ProgFn) => {
	const fileData = [
		{ name: "blocked_profiles.json", column: "blocked", stored_at: "relationships_blocked_users" },
		{ name: "close_friends.json", column: "close_friends", stored_at: "relationships_close_friends" },
		{
			name: "follow_requests_you've_received.json",
			column: "requested_to_follow_you",
			stored_at: "relationships_follow_requests_received",
		},
		{ name: "followers_1.json", column: "follower" },
		{ name: "following.json", column: "following", stored_at: "relationships_following" },
		{ name: "hide_story_from.json", column: "hidden_story_from", stored_at: "relationships_hide_stories_from" },
		{
			name: "pending_follow_requests.json",
			column: "pending_follow_request",
			stored_at: "relationships_follow_requests_sent",
		},
		{
			name: "recently_unfollowed_profiles.json",
			column: "recently_unfollowed",
			stored_at: "relationships_unfollowed_users",
		},
	];

	const data: { [key: string]: StoredUser } = {};

	onProgress(0, "Loading connection files...");
	let totalUsersToProcess = 0;
	const loadedFilesData: any[] = [];

	for (let i = 0; i < fileData.length; i++) {
		const fileInfo = fileData[i];

		const filename = "/connections/followers_and_following/" + fileInfo.name;
		let json_file_data = await loadFile<any>(files, filename);

		if (json_file_data) {
			if (fileInfo.stored_at) {
				json_file_data = json_file_data[fileInfo.stored_at];
			}
			if (Array.isArray(json_file_data)) {
				totalUsersToProcess += json_file_data.length;
				loadedFilesData.push({ data: json_file_data, info: fileInfo });
			}
		}
	}
	onProgress(15, `Found ${totalUsersToProcess} total connection entries.`);
	if (totalUsersToProcess === 0 && loadedFilesData.length === 0) {
		onProgress(100, "No connection data found.");
		return;
	}

	let processedUsersCount = 0;
	for (const loadedFile of loadedFilesData) {
		const { data: json_file_data, info: fileInfo } = loadedFile;
		for (let userIndex = 0; userIndex < json_file_data.length; userIndex++) {
			const user = json_file_data[userIndex];
			processedUsersCount++;
			const currentProgress = 15 + Math.round((processedUsersCount / Math.max(1, totalUsersToProcess)) * 55); // Processing connections: 15-70%

			if (
				processedUsersCount % Math.max(1, Math.floor(totalUsersToProcess / 20)) === 0 ||
				processedUsersCount === totalUsersToProcess
			) {
				// Update ~20 times
				onProgress(
					Math.min(70, currentProgress),
					`Processing ${fileInfo.column} ${userIndex + 1}/${json_file_data.length}`,
				);
			}

			let user_data = user.string_list_data?.[0];
			if (!user_data) continue;
			if (!user_data.value) user_data.value = user_data.href?.split("/").pop() || "";
			if (!user_data.value) continue;

			let userData = data[user_data.value] || { username: user_data.value };
			if (fileInfo.column) {
				(userData as any)[fileInfo.column] = { value: true, timestamp: new Date(user_data.timestamp * 1000) };
			}
			data[user_data.value] = userData;
		}
	}

	onProgress(70, "Processing story likes...");

	const storyLikesFile = await loadFile<any>(files, "/your_instagram_activity/story_interactions/story_likes.json");
	if (storyLikesFile?.story_activities_story_likes) {
		const storyLikes = storyLikesFile.story_activities_story_likes;
		const storyLikeCounts: Record<string, number> = {};

		for (let i = 0; i < storyLikes.length; i++) {
			const storyLike = storyLikes[i];
			if (i % Math.max(1, Math.floor(storyLikes.length / 5)) === 0) {
				// Update ~5 times
				onProgress(
					70 + Math.round((i / storyLikes.length) * 15),
					`Counting story likes ${i + 1}/${storyLikes.length}`,
				);
			}
			const username = storyLike.title;
			if (username) storyLikeCounts[username] = (storyLikeCounts[username] || 0) + 1;
		}

		// Add story likes to existing data or create new entries
		for (const [username, count] of Object.entries(storyLikeCounts)) {
			if (!data[username]) {
				data[username] = { username };
			}
			data[username].stories_liked = count;
		}
	}

	onProgress(85, "Saving all user data to database...");
	await database.users.bulkPut(Object.values(data));

	onProgress(100, "Connections import finished.");
};
