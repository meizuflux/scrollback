import { InstagramDatabase } from "../db/database";
import { StoredMedia } from "../types/data";
import { Conversation, MessageFile, StoredMessage } from "../types/message";
import { findFile } from "../utils";

// insta messages are encoded, like urls and stuff like that so we have to parse it like this
function decodeU8String(encodedText: string): string {
    try {
        const decoder = new TextDecoder('utf-8');
        const bytes = new Uint8Array(encodedText.length);
        for (let i = 0; i < encodedText.length; i++) {
            bytes[i] = encodedText.charCodeAt(i);
        }
        return decoder.decode(bytes);
    } catch (error) {
        console.error("Decoding error:", error);
        return encodedText; // Fallback in case of errors
    }
}

export default async (files: File[], database: InstagramDatabase) => {
	const conversations: Conversation[] = [];
	const messages: StoredMessage[] = [];
	const mediaFiles: StoredMedia[] = [];

	const messageFiles = files.filter((file) => file.name.endsWith("message_1.json"));
	

	// Process files in batches for better memory management
	const BATCH_SIZE = 10;
	for (let batchStart = 0; batchStart < messageFiles.length; batchStart += BATCH_SIZE) {
		const batch = messageFiles.slice(batchStart, batchStart + BATCH_SIZE);
				
		// Process batch in parallel
		const batchResults = await Promise.all(
			batch.map(async (file) => {
				const json_file = (await file.text().then(JSON.parse)) as MessageFile;
				const conversation = decodeU8String(json_file.title);
				const batchMessages: StoredMessage[] = [];
				const batchMedia: StoredMedia[] = [];

				for (const message of json_file.messages) {
					// Check if message has any meaningful content
					const hasContent =
						message.content ||
						message.share ||
						message.photos ||
						message.videos ||
						(message.reactions?.length ?? 0) > 0 ||
						message.sender_name;

					// Skip messages that only contain metadata fields
					const onlyMetadataFields = Object.keys(message).every((key) =>
						["is_unsent_image_by_messenger_kid_parent", "is_geoblocked_for_viewer"].includes(key)
					);


					if (onlyMetadataFields || !hasContent) {
						continue;
					}

					if (message.content) {
						message.content = decodeU8String(message.content);
					}

					// TODO: figure out why this happens with some conversations and also check what else to filter out
					if (
						(message.content?.startsWith("Reacted ") && message.content?.endsWith(" to your message")) ||
						message.content === "Liked a message" ||
						message.content?.includes(" changed the theme to ")
					) {
						continue;
					}

					if (message.reactions) {
						for (const reaction of message.reactions) {
							reaction.reaction = decodeU8String(reaction.reaction);
						}
					}

					if (message.sender_name) {
						message.sender_name = decodeU8String(message.sender_name);
					} else {
						continue
					}

					// Process photos - store media files and keep original structure
					if (message.photos?.length) {
						for (const photo of message.photos) {
							const mediaFile = findFile(files, photo.uri);
							if (mediaFile) {
								const mediaData: StoredMedia = {
									uri: photo.uri,
									creation_timestamp: photo.creation_timestamp,
									type: 'photo',
									data: new Blob([await mediaFile.arrayBuffer()], { type: mediaFile.type || 'image/jpeg' })
								};
								batchMedia.push(mediaData);
							}
						}
					}

					// Process videos - store media files and keep original structure
					if (message.videos?.length) {
						for (const video of message.videos) {
							const mediaFile = findFile(files, video.uri);
							if (mediaFile) {
								const mediaData: StoredMedia = {
									uri: video.uri,
									creation_timestamp: video.creation_timestamp,
									type: 'video',
									data: new Blob([await mediaFile.arrayBuffer()], { type: mediaFile.type || 'video/mp4' })
								};
								batchMedia.push(mediaData);
							}
						}
					}

					// unused fields:
					// @ts-ignore
					delete message.is_geoblocked_for_viewer
					// @ts-ignore
					delete message.is_unsent_image_by_messenger_kid_parent

					// conversation is like the foreign key for a message
					const storedMessage: StoredMessage = {
						...message,
						conversation,
					};

					batchMessages.push(storedMessage);
				}

				const conversationData: Conversation = {
					title: conversation,
					participants: json_file.participants.map((participant) => participant.name),
					is_group: json_file.participants.length > 2,
				};

				return { messages: batchMessages, conversation: conversationData, media: batchMedia };
			})
		);

		// Collect results from batch
		for (const result of batchResults) {
			messages.push(...result.messages);
			conversations.push(result.conversation);
			mediaFiles.push(...result.media);
		}
	}

	
	// Save media files using URI as key
	
	// Use bulk operations for better performance
	await Promise.all([
		database.media.bulkPut(mediaFiles),
		database.messages.bulkAdd(messages),
		database.conversations.bulkPut(conversations)
	]);
};
