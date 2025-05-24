// there's other fields but idrc about them ngl

import { InstagramDatabase } from "../db/database";
import { MessageFile, StoredMessage } from "../types/user";

// also some messages of things that happen are just messages, like changing the theme

function decodeU8String(encodedText: string): string {
	// Split by \u and convert each escape sequence
	const parts = encodedText
		.split("\\u")
		.map((part, index) => {
			if (index === 0) return part;
			const codePoint = parseInt(part.substring(0, 4), 16);
			return String.fromCharCode(codePoint) + part.substring(4);
		})
		.join("");

	// Decode as UTF-8
	const decoder = new TextDecoder("utf-8");
	const utf8Array = new Uint8Array(parts.split("").map((char) => char.charCodeAt(0)));
	return decoder.decode(utf8Array);
}

export default async (files: File[], database: InstagramDatabase) => {
	const conversations: any[] = [];
	const messages: StoredMessage[] = [];

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
					}

					const storedMessage: StoredMessage = {
						...message,
						conversation,
					};

					batchMessages.push(storedMessage);
				}

				const conversationData = {
					title: conversation,
					participants: json_file.participants.map((participant) => participant.name),
					is_group: json_file.participants.length > 2,
				};

				return { messages: batchMessages, conversation: conversationData };
			})
		);

		// Collect results from batch
		for (const result of batchResults) {
			messages.push(...result.messages);
			conversations.push(result.conversation);
		}
	}

	// Use bulk operations for better performance
	await Promise.all([
		database.messages.bulkAdd(messages),
		database.conversations.bulkPut(conversations)
	]);
};
