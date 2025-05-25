import { InstagramDatabase } from "../db/database";
import { User } from "../types/user";
import { decodeU8String, findFile, loadFile } from "../utils";

const importUser = async (files: File[], database: InstagramDatabase, onProgress?: (progress: number, statusText?: string) => void) => {
    onProgress?.(0, "Loading user files...");
    const userFileData = await loadFile<any>(files, "/personal_information/personal_information.json");
    onProgress?.(10, "Loaded personal_information.json");

    const basedInFile = await loadFile<any>(files, "/personal_information/information_about_you/profile_based_in.json");
    onProgress?.(20, "Loaded profile_based_in.json");
    const locOfInterestFile = await loadFile<any>(files, "/personal_information/information_about_you/locations_of_interest.json");
    onProgress?.(30, "Loaded locations_of_interest.json");
    
    const videosWatchedFile = await loadFile<any>(files, "/ads_information/ads_and_topics/videos_watched.json");
    onProgress?.(40, "Loaded videos_watched.json");
    const notInterestedProfilesFile = await loadFile<any>(files, "/ads_information/ads_and_topics/profiles_you're_not_interested_in.json");
    onProgress?.(45, "Loaded profiles_you're_not_interested_in.json");
    const notInterestedPostsFile = await loadFile<any>(files, "/ads_information/ads_and_topics/posts_you're_not_interested_in.json");
    onProgress?.(50, "Loaded posts_you're_not_interested_in.json");
    const postsViewedFile = await loadFile<any>(files, "/ads_information/ads_and_topics/posts_viewed.json");
    onProgress?.(55, "Loaded posts_viewed.json");
    const adsViewedFile = await loadFile<any>(files, "/ads_information/ads_and_topics/ads_viewed.json");
    onProgress?.(60, "All user-related files loaded.");

    const user: User = {
        username: userFileData.profile_user[0].string_map_data.Username?.value,
        name: userFileData.profile_user[0].string_map_data.Name?.value,
        email: userFileData.profile_user[0].string_map_data.Email?.value,
        bio: userFileData.profile_user[0].string_map_data.Bio?.value,
        gender: userFileData.profile_user[0].string_map_data.Gender?.value,
        privateAccount: new Boolean(userFileData.profile_user[0].string_map_data["Private Account"]?.value),
        dateOfBirth: new Date(userFileData.profile_user[0].string_map_data["Date of birth"]?.value),
        basedIn: basedInFile?.inferred_data_primary_location[0].string_map_data["City Name"]?.value || null,
        locationsOfInterest: locOfInterestFile?.label_values
            ?.filter((label: any) => label.label === "Locations of interest")[0]?.vec
            ?.map((v: any) => (v.value)) || [],
        videosWatched: videosWatchedFile?.impressions_history_videos_watched?.length || 0,
        notInterestedProfiles: notInterestedProfilesFile?.impressions_history_recs_hidden_authors?.length || 0,
        notInterestedPosts: notInterestedPostsFile?.impressions_history_posts_not_interested?.length || 0,
        postsViewed: postsViewedFile?.impressions_history_posts_seen?.length || 0,
        adsViewed: adsViewedFile?.impressions_history_ads_seen?.length || 0
    };
    onProgress?.(70, "User data processed.");

    await database.mainUser.put(user);
    onProgress?.(80, "User data saved to database.");

    const pfpPath = userFileData.profile_user[0].media_map_data["Profile Photo"]?.uri;
    if (pfpPath) {
        const pfp = findFile(files, pfpPath)!;
        if (pfp) {
            await database.media.add({
                uri: pfpPath,
                creation_timestamp: Date.now(),
                type: 'photo',
                data: new Blob([await pfp.arrayBuffer()], { type: pfp.type || 'image/jpeg' })
            });
            onProgress?.(90, "Profile photo saved.");
        }
    }
    onProgress?.(100, "User import finished.");
}

interface Image {
    uri: string,
    creation_timestamp: number
}

interface Post {
    title: string,
    creation_timestamp: number,
    media: Image[],
}

const importContent = async (files: File[], database: InstagramDatabase, onProgress?: (progress: number, statusText?: string) => void) => {
    onProgress?.(0, "Loading content files...");
    const postsFile: Post[] = await loadFile<any>(files, "/your_instagram_activity/media/posts_1.json");
    onProgress?.(5, "Loaded posts_1.json");
    const archivedPostsFile = await loadFile<any>(files, "/your_instagram_activity/media/archived_posts.json");
    onProgress?.(10, "Loaded archived_posts.json");
    const storiesFile = await loadFile<any>(files, "/your_instagram_activity/media/stories.json");
    onProgress?.(15, "Loaded stories.json. Calculating totals...");
    
    const totalRegularPosts = postsFile?.length || 0;
    const totalArchivedPosts = archivedPostsFile?.ig_archived_post_media?.length || 0;
    const totalStories = storiesFile?.ig_stories?.length || 0;
    const totalItems = totalRegularPosts + totalArchivedPosts + totalStories;
    
    if (totalItems === 0) {
        onProgress?.(100, "No content items found.");
        return;
    }
    
    let processedItems = 0;

    const processPosts = async (posts: Post[], archived: boolean = false) => {
        if (!posts || !Array.isArray(posts)) return;
        
        const postType = archived ? "archived post" : "post";
        for (let i = 0; i < posts.length; i++) {
            const post = posts[i];
            processedItems++;
            const currentProgress = 15 + (processedItems / totalItems) * 70; // Content processing: 15-85%
            
            if (i % Math.max(1, Math.floor(posts.length / 10)) === 0 || i === posts.length - 1) { // Update ~10 times per post type
                onProgress?.(Math.min(85, currentProgress), `Processing ${postType} ${i + 1}/${posts.length}`);
            }

            const imageFiles: Image[] = post.media.map((media: any) => ({
                uri: media.uri,
                creation_timestamp: media.creation_timestamp,
            }));
            
            await database.posts.add({
                title: decodeU8String(post.title),
                creation_timestamp: post.creation_timestamp,
                media: imageFiles.map(imageFile => (imageFile.uri)),
                archived,
            });

            let toStore = []
            for (const imageFile of imageFiles) {
                const file = findFile(files, imageFile.uri);
                if (!file) {
                    console.warn(`File not found for URI: ${imageFile.uri}`);
                    continue;
                }
                toStore.push({
                    uri: imageFile.uri,
                    creation_timestamp: imageFile.creation_timestamp,
                    type: 'photo' as 'photo',
                    data: new Blob([await file.arrayBuffer()], { type: file.type || 'image/jpeg' })
                });
            }
            if (toStore.length > 0) await database.media.bulkAdd(toStore);
        }
    };

    if (postsFile) await processPosts(postsFile, false);
    if (archivedPostsFile?.ig_archived_post_media) await processPosts(archivedPostsFile.ig_archived_post_media, true);

    const stories = storiesFile?.ig_stories?.map((story: any) => ({
        uri: story.uri,
        creation_timestamp: story.creation_timestamp,
        title: decodeU8String(story.title || "Placeholder")
    })) || [];

    for (let i = 0; i < stories.length; i++) {
        const story = stories[i];
        processedItems++;
        const currentProgress = 15 + (processedItems / totalItems) * 70; // Content processing: 15-85%
        
        if (i % Math.max(1, Math.floor(stories.length / 10)) === 0 || i === stories.length - 1) { // Update ~10 times for stories
            onProgress?.(Math.min(85, currentProgress), `Processing story ${i + 1}/${stories.length}`);
        }

        const file = findFile(files, story.uri);
        if (!file) {
            console.warn(`Story file not found for URI: ${story.uri}`);
            continue;
        }
        await database.media.add({
            uri: story.uri,
            creation_timestamp: story.creation_timestamp,
            type: 'photo',
            data: new Blob([await file.arrayBuffer()], { type: file.type || 'image/jpeg' })
        });
        await database.stories.add(story);
    }
    onProgress?.(95, "Saving content to database...");
    onProgress?.(100, "Content import finished.");
}

const importProfileChanges = async (files: File[], database: InstagramDatabase, onProgress?: (progress: number, statusText?: string) => void) => {
    onProgress?.(0, "Loading profile changes file...");
    const profileChangesFile = await loadFile<any>(files, "/personal_information/personal_information/profile_changes.json");
    
    if (!profileChangesFile?.profile_profile_change || profileChangesFile.profile_profile_change.length === 0) {
        onProgress?.(100, "No profile changes found.");
        return;
    }
    onProgress?.(30, `Found ${profileChangesFile.profile_profile_change.length} profile changes.`);

    const changes = profileChangesFile.profile_profile_change;
    const profileChanges = changes.map((change: any, index: number) => {
        if (index % Math.max(1, Math.floor(changes.length / 5)) === 0) { // Update ~5 times
             onProgress?.(30 + (index / changes.length) * 40, `Processing change ${index + 1}/${changes.length}`);
        }
        const stringMapData = change.string_map_data;
        return {
            changed: stringMapData.Changed?.value || "",
            previousValue: decodeU8String(stringMapData["Previous Value"]?.value || ""),
            newValue: decodeU8String(stringMapData["New Value"]?.value || ""),
            timestamp: new Date(stringMapData["Change Date"]?.timestamp * 1000)
        };
    });
    onProgress?.(70, "All profile changes processed.");

    await database.profileChanges.bulkAdd(profileChanges);
    onProgress?.(90, "Saving profile changes to database...");
    onProgress?.(100, "Profile changes import finished.");
}

export {
    importUser,
    importContent,
    importProfileChanges
}