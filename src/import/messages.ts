import { InstagramDatabase, StoredMessage, StoredMedia } from "../db/database";
import { MessageFile } from "../types/message";
import { decodeU8String, findFile, processMediaFiles } from "../utils";
import { ProgFn } from "./import";

export default async (files: File[], database: InstagramDatabase, onProgress: ProgFn) => {
	onProgress(0, "Finding message files...");

	const messageFiles = files.filter((file) => file.name.endsWith("message_1.json"));
	
	if (messageFiles.length === 0) {
		onProgress(100, "No message files found.");
		return;
	}

	onProgress(10, "Processing conversations...");

	// precompiled regex
	// TODO: find more messages that can be skipped (like nicknames? idk)
	const reactionRegex = /^(Reacted .* to your message|Liked a message)$|changed the theme to/;

	const conversations: any[] = [];
	const allMessages: StoredMessage[] = [];
	let allMediaFiles: Array<{ uri: string; timestamp: Date; type: "photo" | "video"; data: File }> = [];

	await Promise.all(
		messageFiles.map(async (file, fileIndex) => {
			let text: string;
			try {
				text = await file.text();
			} catch (error) {
				console.warn(`Failed to read file ${file.name}:`, error);
				return;
			}

			let json_file: MessageFile;
			try {
				json_file = JSON.parse(text) as MessageFile;
			} catch (error) {
				console.warn(`Failed to parse JSON for ${file.name}:`, error);
				return;
			}
			
			// Optimize string decoding - do it once per conversation
			const conversationTitle = decodeU8String(json_file.title);
			const participants = json_file.participants.map((p) => decodeU8String(p.name));

			const conversation = {
				title: conversationTitle,
				participants,
				is_group: participants.length > 2,
			};

			const senderNameCache = new Map<string, string>();

			for (const message of json_file.messages) {
				let sender_name = senderNameCache.get(message.sender_name!);
				if (!sender_name) {
					sender_name = decodeU8String(message.sender_name!);
					senderNameCache.set(message.sender_name!, sender_name);
				}

				let content: string | undefined;
				if (message.content) {
					content = decodeU8String(message.content);
					if (reactionRegex.test(content)) {
						continue;
					}
				}

				let reactions;
				if (message.reactions?.length) {
					reactions = message.reactions.map(reaction => ({
						...reaction,
						reaction: decodeU8String(reaction.reaction)
					}));
				}

				// defer storing and processing until the very end
				if (message.photos?.length || message.videos?.length) {
					const mediaItems = [...(message.photos || []), ...(message.videos || [])];
					for (const media of mediaItems) {
						const mediaFile = findFile(files, media.uri);
						if (mediaFile) {
							allMediaFiles.push({
								uri: media.uri,
								timestamp: new Date(media.creation_timestamp * 1000),
								type: message.photos?.includes(media) ? "photo" : "video", // TODO: handle audio
								data: mediaFile,
							});
						}
					}
				}

				allMessages.push({
					conversation: conversationTitle,
					sender_name,
					timestamp: new Date(message.timestamp_ms),
					content,
					reactions,
					share: message.share,
					photos: message.photos,
					videos: message.videos,
				});
			}

			conversations.push(conversation);

			// Update progress
			if (fileIndex % 10 === 0) {
				const progress = 10 + Math.round((fileIndex / messageFiles.length) * 50);
				onProgress(progress, `Processed ${fileIndex + 1}/${messageFiles.length} conversations`);
			}
		})
	);

	onProgress(65, "Processing media files...");
	
	// we've deferred media processing until now, because the blob turning into buffer is expensive
	let processedMediaFiles: StoredMedia[] = [];
	if (allMediaFiles.length > 0) {
		processedMediaFiles = await processMediaFiles(allMediaFiles);
	}
	

	onProgress(75, "Saving all data...");

	await database.transaction('rw', [database.conversations, database.messages, database.media], async () => {
		onProgress(80, `Saving ${conversations.length} conversations...`);
		await database.conversations.bulkPut(conversations);
		
		onProgress(85, `Saving ${allMessages.length} messages...`);
		await database.messages.bulkAdd(allMessages);
		
		if (processedMediaFiles.length > 0) {
			onProgress(90, `Saving ${processedMediaFiles.length} media files...`);
			await database.media.bulkPut(processedMediaFiles); // TODO: store in OPFS
		}
	});
	
	onProgress(100, `Imported ${allMessages.length} messages and ${conversations.length} conversations.`);
};
