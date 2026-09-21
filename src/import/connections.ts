import type { InstagramDatabase, StoredUser } from "@/db/database";
import { CachedAnalysis } from "@/types/analysis";
import { loadFile } from "@/utils/media";
import type { ProgFn } from "./import";
import { getLabelValue, getOwnerUsername } from "./interactions";

enum ConnectionFormat {
	LabelValues,
	StringListData,
	WrappedStringListData,
}

const usernameFromStoryUrl = (href: string): string => {
	const match = /\/stories\/([^/]+)\//.exec(href);
	return match?.[1] ?? "";
};

// sometimes we have stuff like blocked_profiles.json
/*
[
	{
		{
            "timestamp": 1770786643,
            "media": [

            ],
            "label_values": [
            {
                "label": "URL",
                "value": "<occassional profile url>?"
            },
            {
                "label": "Name",
                "value": "<blocked person's display name>"
            },
            {
                "label": "Username",
                "value": "<blocked person's username>" <-- we need this
            }
            ],
            "fbid": "<user idk idk>"
        },
	}
]
*/

// then we have: hide story from json
/*
{
  "timestamp": 1786634923,
  "media": [

  ],
  "label_values": [
    {
      "label": "URL",
      "value": ""
    },
    {
      "label": "Name",
      "value": "<displ name>"
    },
    {
      "label": "Username",
      "value": "<username>"
    }
  ],
  "fbid": "<userid idk>"
}
*/

// and then also: following.json
/*
{
  "relationships_following": [
    {
      "title": "<their username>",
      "string_list_data": [
        {
          "href": "https://www.instagram.com/_u/<username>",
          "timestamp": 1788976563
        }
      ]
    },
    {
      "title": "<their username>",
      "string_list_data": [
        {
          "href": "https://www.instagram.com/_u/<their username>",
          "timestamp": 1788917325
        }
      ]
    },
*/

export default async (files: File[], database: InstagramDatabase, onProgress: ProgFn, analysis: CachedAnalysis) => {
	const fileData = [
		{ name: "blocked_profiles.json", column: "blocked", format: ConnectionFormat.LabelValues },
		{ name: "close_friends.json", column: "close_friends", format: ConnectionFormat.LabelValues },
		{
			name: "follow_requests_you've_received.json",
			column: "requested_to_follow_you",
			format: ConnectionFormat.LabelValues,
		},
		{ name: "followers_1.json", column: "follower", format: ConnectionFormat.StringListData },
		{
			name: "following.json",
			column: "following",
			format: ConnectionFormat.WrappedStringListData,
			stored_at: "relationships_following",
		},
		{ name: "hide_story_from.json", column: "hidden_story_from", format: ConnectionFormat.LabelValues },
		{
			name: "pending_follow_requests.json",
			column: "pending_follow_request",
			format: ConnectionFormat.WrappedStringListData,
			stored_at: "relationships_follow_requests_sent",
		},
		{
			name: "recently_unfollowed_profiles.json",
			column: "recently_unfollowed",
			format: ConnectionFormat.WrappedStringListData,
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
			if (fileInfo.format === ConnectionFormat.WrappedStringListData && fileInfo.stored_at) {
				json_file_data = json_file_data[fileInfo.stored_at] ?? json_file_data;
			}

			if (!Array.isArray(json_file_data)) {
				json_file_data = json_file_data ? [json_file_data] : [];
			}
			if (json_file_data.length > 0) {
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

			const userData =
				fileInfo.format === ConnectionFormat.LabelValues
					? (user.label_values?.find((item: any) => item.label === "Username") ?? user.string_list_data?.[0])
					: user.string_list_data?.[0];
			const username = userData?.value || userData?.href?.split("/").filter(Boolean).pop() || "";
			if (!username) continue;

			const storedUser = data[username] || { username };
			if (fileInfo.column) {
				const timestamp = user.timestamp ?? userData.timestamp;
				(storedUser as any)[fileInfo.column] = {
					value: true,
					...(timestamp !== undefined && { timestamp: new Date(timestamp * 1000) }),
				};
			}
			data[username] = storedUser;
		}
	}

	onProgress(70, "Processing story likes...");

	const storyLikesFile = await loadFile<any>(files, "/your_instagram_activity/story_interactions/story_likes.json");
	// Current exports store story likes as a bare array, older ones nested it under story_activities_story_likes
	const storyLikes = Array.isArray(storyLikesFile) ? storyLikesFile : storyLikesFile?.story_activities_story_likes;
	if (storyLikes?.length) {
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
			const username =
				getOwnerUsername(storyLike) || storyLike.title || usernameFromStoryUrl(getLabelValue(storyLike, "URL"));
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

	analysis.followers = Object.values(data).filter((user) => user.follower?.value).length;
	analysis.following = Object.values(data).filter((user) => user.following?.value).length;

	onProgress(100, "Connections import finished.");
};
