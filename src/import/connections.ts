import { InstagramDatabase } from "../db/database";
import { loadFile } from "../utils";
import { StoredUser, TimestampedValue } from "../types/user";

export default async (files: File[], database: InstagramDatabase) => {
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

	await database.users.bulkPut(Object.values(data));

	// this kind of shouldn't be here, but i have it here because it's updating users, so they have to be created first through the connections
	const storyLikesFile = await loadFile<any>(files, "/your_instagram_activity/story_interactions/story_likes.json");
    if (storyLikesFile?.story_activities_story_likes) {
        // Count story likes per user
        const storyLikeCounts: Record<string, number> = {};
        
        for (const storyLike of storyLikesFile.story_activities_story_likes) {
            const username = storyLike.title;
            if (username) {
                storyLikeCounts[username] = (storyLikeCounts[username] || 0) + 1;
            }
        }
        
        await database.transaction('rw', database.users, async () => {
            for (const [username, count] of Object.entries(storyLikeCounts)) {
                let user = await database.users.get(username);
                if (!user) {
                    user = { username };
                }
                
                // Update stories_liked count
                user.stories_liked = count;
                
                // Upsert the user record
                await database.users.put(user);
            }
        });
    }
};
