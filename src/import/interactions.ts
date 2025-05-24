import { InstagramDatabase } from "../db/database";
import { decodeU8String, loadFile } from "../utils";

const importPostLikes = async (files: File[], database: InstagramDatabase) => {
    const postLikesFile = await loadFile<any>(files, "/your_instagram_activity/likes/liked_posts.json");

    for (const postLike of postLikesFile.likes_media_likes) {
        const data = postLike.string_list_data[0];
        await database.likedPosts.add({
            media_owner: postLike.title,
            href: data.href,
            timestamp: data.timestamp,
        });
    }
}

const importComments = async (files: File[], database: InstagramDatabase) => {
    const commentsFile = await loadFile<any>(files, "/your_instagram_activity/comments/post_comments_1.json");

    for (const comment of commentsFile) {
        const data = comment.string_map_data;
        await database.comments.add({
            media_owner: data["Media Owner"].value,
            comment: decodeU8String(data["Comment"].value),
            timestamp: data["Time"].timestamp,
        })
    }
}

const importSavedPosts = async (files: File[], database: InstagramDatabase) => {
    const savedPostsFile = await loadFile<any>(files, "/your_instagram_activity/saved/saved_posts.json");

    for (const savedPost of savedPostsFile.saved_saved_media) {
        const data = savedPost.string_map_data["Saved on"];

        
        await database.savedPosts.add({
            media_owner: savedPost.title,
            href: data.href,
            timestamp: data.timestamp,
        });
    }
}

export default [
    importPostLikes,
    importSavedPosts,
    importComments,
]