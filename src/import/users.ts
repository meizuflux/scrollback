import { IDBPDatabase } from "idb";
import { loadFile } from "../utils";
import { StoredUser } from "../types/user";

export default async (files: File[], db: IDBPDatabase) => {
	const fileData = [
		{
			name: "blocked_profiles.json",
			columm: "blocked",
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

	for (const file of fileData) {
		const filename = "/connections/followers_and_following/" + file.name;
		let json_file_data = await loadFile<any>(files, filename);
		if (file.stored_at) {
			json_file_data = json_file_data[file.stored_at];
		}

		for (const user of json_file_data) {
			let user_data = user.string_list_data[0];

			if (!user_data.value) {
				// blocked_profiles has a different format for each and every thing
				user_data.value = user_data.href.split("/").pop() || "";
			}

			let userData = data[user_data.value] || {
				username: user_data.value,
				blocked: false,
				blocked_timestamp: undefined,
				close_friends: false,
				close_friends_timestamp: undefined,
				requested_to_follow_you: false,
				requested_to_follow_timestamp: undefined,
				follower: false,
				follower_timestamp: undefined,
				following: false,
				following_timestamp: undefined,
				hidden_story_from: false,
				hidden_story_from_timestamp: undefined,
				pending_follow_request: false,
				pending_follow_request_timestamp: undefined,
				recently_unfollowed: false,
				recently_unfollowed_timestamp: undefined,
			};

			// typescript magic idk
			if (file.column && file.column in userData) {
				(userData as any)[file.column] = true;
				(userData as any)[`${file.column}_timestamp`] = new Date(user_data.timestamp * 1000); // idk why it has to be * 1000 but it just works
			}

			data[userData.username] = userData;
		}
	}

	const tx = db.transaction("users", "readwrite");
	const store = tx.objectStore("users");

	const promises = Object.values(data).map((user) => store.put(user));
	await Promise.all(promises);

	await tx.done;
};
