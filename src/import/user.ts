import { InstagramDatabase, StoredMediaMetadata, StoredPost, StoredStory } from "../db/database";
import { User } from "../types/user";
import { decodeU8String, findFile, loadFile, processMediaFilesToOPFS, saveMediaFile } from "../utils";
import { ProgFn } from "./import";

const importUser = async (files: File[], database: InstagramDatabase, onProgress: ProgFn) => {
	// TODO: use exact files names for a slight speed up + parallelize this

	onProgress(0, "Loading user files...");
	const userFileData = await loadFile<any>(files, "/personal_information/personal_information.json");

	const basedInFile = await loadFile<any>(files, "/personal_information/information_about_you/profile_based_in.json");
	const locOfInterestFile = await loadFile<any>(
		files,
		"/personal_information/information_about_you/locations_of_interest.json",
	);

	const videosWatchedFile = await loadFile<any>(files, "/ads_information/ads_and_topics/videos_watched.json");
	const notInterestedProfilesFile = await loadFile<any>(
		files,
		"/ads_information/ads_and_topics/profiles_you're_not_interested_in.json",
	);
	const notInterestedPostsFile = await loadFile<any>(
		files,
		"/ads_information/ads_and_topics/posts_you're_not_interested_in.json",
	);
	const postsViewedFile = await loadFile<any>(files, "/ads_information/ads_and_topics/posts_viewed.json");
	const adsViewedFile = await loadFile<any>(files, "/ads_information/ads_and_topics/ads_viewed.json");

	const user: User = {
		username: userFileData.profile_user[0].string_map_data.Username?.value,
		name: userFileData.profile_user[0].string_map_data.Name?.value,
		email: userFileData.profile_user[0].string_map_data.Email?.value,
		bio: userFileData.profile_user[0].string_map_data.Bio?.value,
		gender: userFileData.profile_user[0].string_map_data.Gender?.value,
		privateAccount: new Boolean(userFileData.profile_user[0].string_map_data["Private Account"]?.value),
		dateOfBirth: new Date(userFileData.profile_user[0].string_map_data["Date of birth"]?.value),
		basedIn: basedInFile?.inferred_data_primary_location[0].string_map_data["City Name"]?.value || null,
		locationsOfInterest:
			locOfInterestFile?.label_values
				?.filter((label: any) => label.label === "Locations of interest")[0]
				?.vec?.map((v: any) => v.value) || [],
		videosWatched: videosWatchedFile?.impressions_history_videos_watched?.length || 0,
		notInterestedProfiles: notInterestedProfilesFile?.impressions_history_recs_hidden_authors?.length || 0,
		notInterestedPosts: notInterestedPostsFile?.impressions_history_posts_not_interested?.length || 0,
		postsViewed: postsViewedFile?.impressions_history_posts_seen?.length || 0,
		adsViewed: adsViewedFile?.impressions_history_ads_seen?.length || 0,
	};
	onProgress(80, "Saving user data");

	await database.mainUser.put(user);

	onProgress(90, "Checking for profile photo");
	const pfpPath = userFileData.profile_user[0].media_map_data["Profile Photo"]?.uri;
	if (pfpPath) {
		const pfp = findFile(files, pfpPath)!;
		if (pfp) {
			const blob = new Blob([await pfp.arrayBuffer()], { type: pfp.type || "image/jpeg" });
			const opfsFileName = await saveMediaFile({
				uri: pfpPath,
				timestamp: new Date(Date.now()),
				type: "photo",
				data: blob,
			});

			await database.media_metadata.add({
				uri: pfpPath,
				timestamp: new Date(Date.now()),
				type: "photo",
				opfsFileName,
			});
		}
	}
	onProgress(100, "User import finished.");
};

interface Image {
	uri: string;
	creation_timestamp: number;
}

interface Post {
	title: string;
	creation_timestamp: number;
	media: Image[];
}

const importContent = async (files: File[], database: InstagramDatabase, onProgress: ProgFn) => {
	onProgress(0, "Loading content files...");

	const postsFile: Post[] = await loadFile<any>(files, "/your_instagram_activity/media/posts_1.json");
	const archivedPostsFile = await loadFile<any>(files, "/your_instagram_activity/media/archived_posts.json");
	const storiesFile = await loadFile<any>(files, "/your_instagram_activity/media/stories.json");

	const totalRegularPosts = postsFile?.length || 0;
	const totalArchivedPosts = archivedPostsFile?.ig_archived_post_media?.length || 0;
	const totalStories = storiesFile?.ig_stories?.length || 0;
	const totalItems = totalRegularPosts + totalArchivedPosts + totalStories;

	if (totalItems === 0) {
		onProgress(100, "No content items found.");
		return;
	}

	let processedItems = 0;

	let mediaToStore: Array<{ uri: string; timestamp: Date; type: "photo" | "video"; data: File }> = [];
	let postsToStore: StoredPost[] = [];

	onProgress(15, `Found ${totalItems} items. Processing...`);
	const processPosts = async (posts: Post[], archived: boolean = false) => {
		if (!posts || !Array.isArray(posts)) return;

		const postType = archived ? "archived post" : "post";
		for (let i = 0; i < posts.length; i++) {
			const post = posts[i];
			processedItems++;
			const currentProgress = 15 + (processedItems / totalItems) * 55; // Content processing: 15-70%

			onProgress(Math.min(70, currentProgress), `Processing ${postType} ${i + 1}/${posts.length}`);

			const imageFiles: Image[] = post.media.map((media: any) => ({
				uri: media.uri,
				creation_timestamp: media.creation_timestamp,
			}));

			postsToStore.push({
				title: decodeU8String(post.title),
				timestamp: new Date(post.creation_timestamp * 1000),
				media: imageFiles.map((imageFile) => imageFile.uri),
				archived,
			});

			for (const imageFile of imageFiles) {
				const file = findFile(files, imageFile.uri);
				if (!file) {
					console.warn(`File not found for URI: ${imageFile.uri}`);
					continue;
				}
				mediaToStore.push({
					uri: imageFile.uri,
					timestamp: new Date(imageFile.creation_timestamp * 1000),
					type: "photo" as "photo",
					data: file,
				});
			}
		}
	};

	if (postsFile) await processPosts(postsFile, false);
	if (archivedPostsFile?.ig_archived_post_media) await processPosts(archivedPostsFile.ig_archived_post_media, true);

	const stories =
		storiesFile?.ig_stories?.map((story: any) => ({
			uri: story.uri,
			timestamp: new Date(story.creation_timestamp * 1000),
			title: decodeU8String(story.title || "Placeholder"),
		})) || [];

	let allStories: StoredStory[] = [];

	for (let i = 0; i < stories.length; i++) {
		const story = stories[i];
		processedItems++;
		const currentProgress = 15 + (processedItems / totalItems) * 55; // Content processing: 15-70%

		onProgress(Math.min(70, currentProgress), `Processing story ${i + 1}/${stories.length}`);

		const file = findFile(files, story.uri);
		if (!file) {
			console.warn(`Story file not found for URI: ${story.uri}`);
			continue;
		}
		const isVideo = story.uri.toLowerCase().includes('.mp4');
		mediaToStore.push({
			uri: story.uri,
			timestamp: story.timestamp,
			type: isVideo ? "video" : "photo",
			data: file,
		});
		allStories.push(story);
	}

	onProgress(70, "Processing media files...");
	const processedMediaFiles = await processMediaFilesToOPFS(mediaToStore);

	await database.transaction("rw", [database.media_metadata, database.posts, database.stories], async () => {
		onProgress(85, `Saving ${processedMediaFiles.length} media files...`);
		await database.media_metadata.bulkAdd(processedMediaFiles);

		onProgress(90, `Saving ${postsToStore.length} posts...`);
		await database.posts.bulkAdd(postsToStore);

		onProgress(95, `Saving ${allStories.length} stories...`);
		await database.stories.bulkAdd(allStories);
	});

	onProgress(100, "Content import finished.");
};

const importProfileChanges = async (files: File[], database: InstagramDatabase, onProgress: ProgFn) => {
	onProgress(0, "Loading profile changes file...");
	const profileChangesFile = await loadFile<any>(
		files,
		"/personal_information/personal_information/profile_changes.json",
	);

	if (!profileChangesFile?.profile_profile_change || profileChangesFile.profile_profile_change.length === 0) {
		onProgress(100, "No profile changes found.");
		return;
	}
	onProgress(30, `Found ${profileChangesFile.profile_profile_change.length} profile changes. Processing...`);

	const changes = profileChangesFile.profile_profile_change;
	const profileChanges = changes.map((change: any, index: number) => {
		const stringMapData = change.string_map_data;
		return {
			changed: stringMapData.Changed?.value || "",
			previousValue: decodeU8String(stringMapData["Previous Value"]?.value || ""),
			newValue: decodeU8String(stringMapData["New Value"]?.value || ""),
			timestamp: new Date(stringMapData["Change Date"]?.timestamp * 1000),
		};
	});
	onProgress(70, "All profile changes processed, saving to database...");

	await database.profileChanges.bulkAdd(profileChanges);

	onProgress(100, "Profile changes import finished.");
};

export { importUser, importContent, importProfileChanges };
