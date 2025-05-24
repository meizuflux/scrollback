import { InstagramDatabase } from "../db/database";
import { User } from "../types/user";
import { decodeU8String, findFile, loadFile } from "../utils";

const importUser = async (files: File[], database: InstagramDatabase) => {
    const userFileData = await loadFile<any>(files, "/personal_information/personal_information.json");

    const basedInFile = await loadFile<any>(files, "/personal_information/information_about_you/profile_based_in.json");
    const locOfInterestFile = await loadFile<any>(files, "/personal_information/information_about_you/locations_of_interest.json");
    const videosWatchedFile = await loadFile<any>(files, "/ads_information/ads_and_topics/videos_watched.json");
    const notInterestedProfilesFile = await loadFile<any>(files, "/ads_information/ads_and_topics/profiles_you're_not_interested_in.json");
    const notInterestedPostsFile = await loadFile<any>(files, "/ads_information/ads_and_topics/posts_you're_not_interested_in.json");
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
        locationsOfInterest: locOfInterestFile.label_values
            .filter((label: any) => label.label === "Locations of interest")[0].vec
            .map((v: any) => (v.value)),
        videosWatched: videosWatchedFile.impressions_history_videos_watched?.length || 0,
        notInterestedProfiles: notInterestedProfilesFile.impressions_history_recs_hidden_authors?.length || 0,
        notInterestedPosts: notInterestedPostsFile.impressions_history_posts_not_interested?.length || 0,
        postsViewed: postsViewedFile.impressions_history_posts_seen?.length || 0,
        adsViewed: adsViewedFile.impressions_history_ads_seen?.length || 0
    };

    localStorage.setItem("user", JSON.stringify(user));

    const pfpPath = userFileData.profile_user[0].media_map_data["Profile Photo"]?.uri;
    if (pfpPath) {
        const pfp = findFile(files, pfpPath)!;

        const blob = new Blob([await pfp.arrayBuffer()], { type: 'image/jpeg' });
        const reader = new FileReader();
        await new Promise<void>((resolve) => {
            reader.onloadend = () => {
                localStorage.setItem("pfp", reader.result as string);
                resolve();
            }
            reader.readAsDataURL(blob);
        });
    }
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

const importContent = async (files: File[], database: InstagramDatabase) => {
    //const recentlyDeletedContentFile = await loadFile<any>(files, "/your_instagram_activity/media/recently_deleted_content.json"); // gonna skip this for now
    const postsFile: Post[] = await loadFile<any>(files, "/your_instagram_activity/media/posts_1.json");
    const archivedPostsFile = await loadFile<any>(files, "/your_instagram_activity/media/archived_posts.json");

    const processPosts = async (posts: Post[], archived: boolean = false) => {
        if (!posts || !Array.isArray(posts)) return; // Skip if file doesn't exist or isn't an array
        
        for (const post of posts) {
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
                    type: 'photo' as 'photo', // Assuming all media in posts are photos, adjust if needed (weird ts thing for this)
                    data: new Blob([await file.arrayBuffer()], { type: file.type || 'image/jpeg' })
                });
            }
            await database.media.bulkAdd(toStore);
        }
    };

    await processPosts(postsFile, false);
    await processPosts(archivedPostsFile.ig_archived_post_media, true);

    const storiesFile = await loadFile<any>(files, "/your_instagram_activity/media/stories.json");

    const stories = storiesFile.ig_stories.map((story: any) => ({
        uri: story.uri,
        creation_timestamp: story.creation_timestamp,
        title: decodeU8String(story.title || "Placeholder")
    }));

    for (const story of stories) {
        const file = findFile(files, story.uri);
        if (!file) {
            console.warn(`Story file not found for URI: ${story.uri}`);
            continue;
        }
        await database.media.add({
            uri: story.uri,
            creation_timestamp: story.creation_timestamp,
            type: 'photo', // TODO: handle video stories
            data: new Blob([await file.arrayBuffer()], { type: file.type || 'image/jpeg' })
        });
        await database.stories.add(story)
    }

}

const importProfileChanges = async (files: File[], database: InstagramDatabase) => {
    const profileChangesFile = await loadFile<any>(files, "/personal_information/personal_information/profile_changes.json");
    
    if (!profileChangesFile?.profile_profile_change) {
        return;
    }

    const profileChanges = profileChangesFile.profile_profile_change.map((change: any) => {
        const stringMapData = change.string_map_data;
        
        return {
            changed: stringMapData.Changed?.value || "",
            previousValue: decodeU8String(stringMapData["Previous Value"]?.value || ""),
            newValue: decodeU8String(stringMapData["New Value"]?.value || ""),
            timestamp: new Date(stringMapData["Change Date"]?.timestamp * 1000)
        };
    });

    await database.profileChanges.bulkAdd(profileChanges);
}

export {
    importUser,
    importContent,
    importProfileChanges
}