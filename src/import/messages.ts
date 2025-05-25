import { InstagramDatabase } from "../db/database";
import { StoredMedia } from "../types/data";
import { Conversation, MessageFile, StoredMessage } from "../types/message";
import { decodeU8String, findFile } from "../utils";

export default async (files: File[], database: InstagramDatabase, onProgress?: (progress: number, statusText?: string) => void) => {
	const conversations: Conversation[] = [];
	const messages: StoredMessage[] = [];
	const mediaFiles: StoredMedia[] = [];

	onProgress?.(0, "Filtering message files...");
	const messageFiles = files.filter((file) => file.name.endsWith("message_1.json"));
	
	if (messageFiles.length === 0) {
		onProgress?.(100, "No message files found.");
		return;
	}
	onProgress?.(5, `Found ${messageFiles.length} message files. Calculating total messages...`);
	
	let totalMessages = 0;
	const parsedMessageFiles: { file: File, json: MessageFile }[] = [];

	for (let i = 0; i < messageFiles.length; i++) {
		const file = messageFiles[i];
		const progress = 5 + Math.round(((i + 1) / messageFiles.length) * 10); // Reading files: 5-15%
		onProgress?.(progress, `Reading ${file.name} (${i + 1}/${messageFiles.length})`);
		const json_file = (await file.text().then(JSON.parse)) as MessageFile;
		parsedMessageFiles.push({ file, json: json_file });
		totalMessages += json_file.messages.length;
	}
	
	onProgress?.(15, `Total ${totalMessages} messages to process across ${messageFiles.length} files.`);
    if (totalMessages === 0) {
        onProgress?.(100, "No messages to process.");
        return;
    }
	
	let processedMessages = 0;
	
	for (let fileIndex = 0; fileIndex < parsedMessageFiles.length; fileIndex++) {
		const { json: json_file } = parsedMessageFiles[fileIndex];
		const conversationTitle = decodeU8String(json_file.title);

		for (let msgIndex = 0; msgIndex < json_file.messages.length; msgIndex++) {
			const message = json_file.messages[msgIndex];
			processedMessages++;
			const currentProgress = 15 + Math.round((processedMessages / totalMessages) * 65); // Processing messages: 15-80%
			
            if (processedMessages % Math.max(1, Math.floor(totalMessages / 50)) === 0 || processedMessages === totalMessages) { // Update ~50 times
			    onProgress?.(Math.min(80, currentProgress), `Processing message ${processedMessages}/${totalMessages} in "${conversationTitle}"`);
            }

			message.sender_name = decodeU8String(message.sender_name!);
			if (message.content) {
				message.content = decodeU8String(message.content!);
			}

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

			if (message.photos?.length) {
				for (const photo of message.photos) {
					const mediaFile = findFile(files, photo.uri);
					if (mediaFile) {
						mediaFiles.push({
							uri: photo.uri, creation_timestamp: photo.creation_timestamp, type: 'photo',
							data: new Blob([await mediaFile.arrayBuffer()], { type: mediaFile.type || 'image/jpeg' })
						});
					}
				}
			}

			if (message.videos?.length) {
				for (const video of message.videos) {
					const mediaFile = findFile(files, video.uri);
					if (mediaFile) {
						mediaFiles.push({
							uri: video.uri, creation_timestamp: video.creation_timestamp, type: 'video',
							data: new Blob([await mediaFile.arrayBuffer()], { type: mediaFile.type || 'video/mp4' })
						});
					}
				}
			}
			// @ts-ignore
			delete message.is_geoblocked_for_viewer;
			// @ts-ignore
			delete message.is_unsent_image_by_messenger_kid_parent;

			messages.push({ ...message, conversation: conversationTitle });
		}

		conversations.push({
			title: conversationTitle,
			participants: json_file.participants.map((p) => decodeU8String(p.name)), // Ensure participant names are decoded
			is_group: json_file.participants.length > 2,
		});
	}

	onProgress?.(80, `Saving ${messages.length} messages, ${conversations.length} conversations, and ${mediaFiles.length} media items...`);
	
	await Promise.all([
		mediaFiles.length > 0 ? database.media.bulkPut(mediaFiles) : Promise.resolve(),
		messages.length > 0 ? database.messages.bulkAdd(messages) : Promise.resolve(),
		conversations.length > 0 ? database.conversations.bulkPut(conversations) : Promise.resolve()
	]);
	onProgress?.(95, "All message data saved to database.");
	onProgress?.(100, `Imported ${messages.length} messages and ${conversations.length} conversations.`);
};
