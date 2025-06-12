import { InstagramDatabase, StoredMessage, StoredMediaMetadata } from "../db/database";
import { MessageFile } from "../types/message";
import { decodeU8String, findFile, processMediaFilesBatched } from "../utils";
import { ProgFn } from "./import";

export default async (files: File[], database: InstagramDatabase, onProgress: ProgFn) => {
	// TODO: perf timing to figure out the correct progress percentages (for everything, tbh)
	onProgress(0, "Finding message files...");

	// messages can actually be numbered, starts messages_1.json, but then goes to messages_2.json, etc
	const messageFiles = files.filter(file => file.name.endsWith(".json") && file.name.lastIndexOf("/message_") !== -1)

	if (messageFiles.length === 0) {
		onProgress(100, "No message files found.");
		return;
	}

	onProgress(10, "Processing conversations...");

	// TODO: find all of these
	const exactSystemMessages = new Set([
		'You missed an audio call',
		'started an audio call',
		'ended the call',
		'joined the video chat',
		'left the video chat',
		'Say hi to your new connection',
		'You created the group',
		'Liked a message'
	]);

	const patternRegex = new RegExp([
		'^Reacted .* to your message$',
		'changed the theme to',
		'changed the group photo',
		'set their own nickname to',
		'You sent an attachment\\.',
		'added .* to the group',
		'removed .* from the group',
	].join('|'));

	const checkSystemMessage = (content: string) =>
		exactSystemMessages.has(content) || patternRegex.test(content);

	const conversations: any[] = [];
	const allMessages: StoredMessage[] = [];
	let allMediaFiles: StoredMediaMetadata[] = [];

	// Pre-allocate arrays
	conversations.length = messageFiles.length;
	let conversationIndex = 0;

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

			const conversationTitle = decodeU8String(json_file.title);
			const participants = json_file.participants.map((p) => decodeU8String(p.name));

			const conversation = {
				title: conversationTitle,
				participants,
				is_group: participants.length > 2,
			};

			const senderNameCache = new Map<string, string>();

			const conversationMessages: StoredMessage[] = new Array(json_file.messages.length);
			const conversationMediaFiles: StoredMediaMetadata[] = [];

			for (let i = 0; i < json_file.messages.length; i++) {
				const message = json_file.messages[i];

				let sender_name = senderNameCache.get(message.sender_name!);
				if (!sender_name) {
					sender_name = decodeU8String(message.sender_name!);
					senderNameCache.set(message.sender_name!, sender_name);
				}

				let content: string | undefined;
				let isSystemMessage = false;
				if (message.content) {
					content = decodeU8String(message.content);
					isSystemMessage = checkSystemMessage(content);
				}

				let reactions;
				if (message.reactions?.length) {
					reactions = message.reactions.map((reaction) => ({
						...reaction,
						reaction: decodeU8String(reaction.reaction),
					}));
				}

				// defer storing and processing until the very end
				if (message.photos?.length || message.videos?.length || message.audio_files?.length) {
					const mediaItems = [
						...(message.photos || []).map((media) => ({ ...media, type: "photo" as const })),
						...(message.videos || []).map((media) => ({ ...media, type: "video" as const })),
						...(message.audio_files || []).map((media) => ({ ...media, type: "audio" as const })),
					];
					for (const media of mediaItems) {
						const mediaFile = findFile(files, media.uri);
						if (mediaFile) {
							conversationMediaFiles.push({
								uri: media.uri,
								timestamp: new Date(media.creation_timestamp * 1000),
								type: media.type,
								data: mediaFile,
							});
						}
					}
				}

				conversationMessages[i] = {
					conversation: conversationTitle,
					sender_name,
					timestamp: new Date(message.timestamp_ms),
					content,
					reactions,
					share: message.share,
					photos: message.photos,
					videos: message.videos,
					audio: message.audio_files,
					isSystemMessage,
				};
			}

			conversations[conversationIndex++] = conversation;
			allMessages.push(...conversationMessages);
			allMediaFiles.push(...conversationMediaFiles);

			if (fileIndex % 50 === 0) {
				const progress = 10 + Math.round((fileIndex / messageFiles.length) * 50);
				onProgress(progress, `Processed ${fileIndex + 1}/${messageFiles.length} conversations`);
			}
		}),
	);

	// Trim conversations array to actual size
	conversations.length = conversationIndex;

	onProgress(65, "Processing media files...");

	let processedMediaFiles: StoredMediaMetadata[] = [];
	if (allMediaFiles.length > 0) {
		processedMediaFiles = await processMediaFilesBatched(allMediaFiles);
	}

	await database.transaction("rw", [database.conversations, database.messages, database.media_metadata], async () => {
		// indexedb is sequential so this is basically the fastest way to do it
		onProgress(70, `Saving ${conversations.length} conversations...`);
		await database.conversations.bulkPut(conversations);

		if (processedMediaFiles.length > 0) {
			onProgress(75, `Saving ${processedMediaFiles.length} media files metadata...`);
			await database.media_metadata.bulkPut(processedMediaFiles);
		}

		onProgress(80, `Saving ${allMessages.length} messages...`);
		await database.messages.bulkAdd(allMessages);


	});

	onProgress(100, `Imported ${allMessages.length} messages and ${conversations.length} conversations.`);
};
