import { Message, MESSAGE_TYPE, type MessageType } from "@/types/message";
import { decodeU8String } from "./media";

const exactSystemMessages = new Set([
	"You missed an audio call",
	"started an audio call",
	"ended the call",
	"joined the video chat",
	"left the video chat",
	"Say hi to your new connection",
	"You created the group",
	"Liked a message",
]);

const patternRegex = new RegExp(
	[
		"^Reacted .* to your message\\s*$",
		"changed the theme to",
		"changed the group photo",
		"set their own nickname to",
		"added .* to the group\\.?$",
		"removed .* from the group\\.?$",
	].join("|"),
);

export const checkSystemMessage = (content: string) => exactSystemMessages.has(content) || patternRegex.test(content);

export interface CategorizedMessage {
	type: MessageType;
	content: string | undefined;
}

export function categorizeMessage(message: Message): CategorizedMessage {
	let isShare = !!message.share;
	const isReel = !!(message.share?.link && message.share.link.includes("/reel/"));
	const isPost = !!(message.share?.link && message.share.link.includes("/p/"));

	const hasPhotos = !!(message.photos && message.photos.length > 0);
	const hasVideos = !!(message.videos && message.videos.length > 0);
	const hasAudio = !!(message.audio_files && message.audio_files.length > 0);
	const isMedia = hasPhotos || hasVideos || hasAudio;

	let content = message.content ? decodeU8String(message.content) : undefined;

	// Count "sent an attachment" as an unknown share
	if (content && /sent an attachment\.$/.test(content)) {
		isShare = true;
	}

	if (isShare || isReel || isPost) {
		content = undefined;
	}

	const isSystemMessage = content ? checkSystemMessage(content) : false;

	let type: MessageType = MESSAGE_TYPE.Text;
	if (isSystemMessage) type = MESSAGE_TYPE.System;
	else if (isReel) type = MESSAGE_TYPE.Reel;
	else if (isPost) type = MESSAGE_TYPE.Post;
	else if (isShare) type = MESSAGE_TYPE.Share;
	else if (isMedia) type = MESSAGE_TYPE.Media;

	return {
		type,
		content,
	};
}
