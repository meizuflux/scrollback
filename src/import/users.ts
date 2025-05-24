import { InstagramDatabase } from "../db/database";
import { loadFile } from "../utils";
import { StoredUser, TimestampedValue } from "../types/user";

export default async (files: File[], database: InstagramDatabase, onProgress?: (progress: number, step: string) => void) => {
	const fileData = [
		{
			name: "blocked_profiles.json",
			column: "blocked",
			stored_at: "relationships_blocked_users",
		},
		{
			name: "close_friends.json",
			column: "close_friends",
			stored_at: "relationships_close_friends",
		},
		{
			name: "follow_requests_you've_received.json",
			column: "requested_to_follow_you",
			stored_at: "relationships_follow_requests_received",
		},
		{
			name: "followers_1.json", // the data for this isn't "relationships_following" but instead it's just an array of users
			column: "follower",
		},
		{
			name: "following.json",
			column: "following",
			stored_at: "relationships_following",
		},
		{
			name: "hide_story_from.json",
			column: "hidden_story_from",
			stored_at: "relationships_hide_stories_from",
		},
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

	for (let i = 0; i < fileData.length; i++) {
		const file = fileData[i];
		const progress = (i / fileData.length) * 80; // Use 80% for processing, 20% for saving
		onProgress?.(progress, `Processing ${file.name}...`);
		
		const filename = "/connections/followers_and_following/" + file.name;
		let json_file_data = await loadFile<any>(files, filename);
		
		// Skip if file doesn't exist or has no data
		if (!json_file_data) {
			continue;
		}
		
		if (file.stored_at) {
			json_file_data = json_file_data[file.stored_at];
		}

		// Skip if no data after extracting stored_at property
		if (!json_file_data || !Array.isArray(json_file_data)) {
			continue;
		}

		for (const user of json_file_data) {
			let user_data = user.string_list_data?.[0];
			
			// Skip if user data is malformed
			if (!user_data) {
				continue;
			}

			if (!user_data.value) {
				// blocked_profiles has a different format for each and every thing
				user_data.value = user_data.href?.split("/").pop() || "";
			}

			// Skip if we still don't have a username
			if (!user_data.value) {
				continue;
			}

			let userData = data[user_data.value] || {
				username: user_data.value,
			};

			// Set the timestamped value for the current column
			if (file.column) {
				const timestampedValue: TimestampedValue = {
					value: true,
					timestamp: new Date(user_data.timestamp * 1000)
				};
				(userData as any)[file.column] = timestampedValue;
			}

			data[userData.username] = userData;
		}
	}

	onProgress?.(80, "Saving user data...");
	await database.users.bulkPut(Object.values(data));
	onProgress?.(100, "Users processed successfully");
};
