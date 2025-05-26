import { InstagramDatabase, StoredMessage, StoredMedia } from "../db/database";
import { Conversation, MessageFile } from "../types/message";
import { decodeU8String, findFile } from "../utils";
import { ProgFn } from "./import";

export default async (files: File[], database: InstagramDatabase, onProgress: ProgFn) => {
	const conversations: Conversation[] = [];
	const messages: StoredMessage[] = [];
	const mediaFiles: StoredMedia[] = [];

	onProgress(0, "Finding message files...");
	const messageFiles = files.filter((file) => file.name.endsWith("message_1.json"));

	if (messageFiles.length === 0) {
		onProgress(100, "No message files found.");
		return;
	}

	let totalMessages = 0;
	const parsedMessageFiles: { file: File; json: MessageFile }[] = [];

	for (let i = 0; i < messageFiles.length; i++) {
		const file = messageFiles[i];

		const progress = 5 + Math.round(((i + 1) / messageFiles.length) * 10); // Reading files: 5-15%
		onProgress(progress, `Reading ${file.name} (${i + 1}/${messageFiles.length})`);

		const json_file = (await file.text().then(JSON.parse)) as MessageFile;
		parsedMessageFiles.push({ file, json: json_file });
		totalMessages += json_file.messages.length;
	}

	let processedMessages = 0;

	for (let fileIndex = 0; fileIndex < parsedMessageFiles.length; fileIndex++) {
		const { json: json_file } = parsedMessageFiles[fileIndex];
		const conversationTitle = decodeU8String(json_file.title);

		for (let msgIndex = 0; msgIndex < json_file.messages.length; msgIndex++) {
			const message = json_file.messages[msgIndex];
			processedMessages++;

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
							uri: photo.uri,
							timestamp: new Date(photo.creation_timestamp * 1000),
							type: "photo",
							data: new Blob([await mediaFile.arrayBuffer()], { type: mediaFile.type || "image/jpeg" }),
						});
					}
				}
			}

			if (message.videos?.length) {
				for (const video of message.videos) {
					const mediaFile = findFile(files, video.uri);
					if (mediaFile) {
						mediaFiles.push({
							uri: video.uri,
							timestamp: new Date(video.creation_timestamp * 1000),
							type: "video",
							data: new Blob([await mediaFile.arrayBuffer()], { type: mediaFile.type || "video/mp4" }),
						});
					}
				}
			}

			const toStore: StoredMessage = {
				conversation: conversationTitle,
				sender_name: message.sender_name,
				timestamp: new Date(message.timestamp_ms),
				content: message.content,
				reactions: message.reactions,
				share: message.share,
				photos: message.photos,
				videos: message.videos,
			};
			messages.push(toStore);
		}

		conversations.push({
			title: conversationTitle,
			participants: json_file.participants.map((p) => decodeU8String(p.name)),
			is_group: json_file.participants.length > 2,
		});

		const progress = 15 + Math.round((processedMessages / totalMessages) * 65); // Processing messages: 15-80%
		onProgress(progress, `Processed ${processedMessages}/${totalMessages} messages from ${json_file.title}`);
	}

	onProgress(80, `Saving conversations, messages, and media files...`);

	let progress = 80;
	await Promise.all([
		database.conversations.bulkPut(conversations)
			.then(() => onProgress((progress += 5), `Saved ${conversations.length} conversations...`)),
		database.media.bulkPut(mediaFiles)
			.then(() => onProgress((progress += 5), `Saved ${mediaFiles.length} media items...`)),
		database.messages.bulkAdd(messages)
			.then(() => onProgress((progress += 5), `Saved ${messages.length} messages...`)),
	]);

	onProgress(100, `Imported ${messages.length} messages and ${conversations.length} conversations.`);
};
