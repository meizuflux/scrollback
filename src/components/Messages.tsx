import { Component } from "solid-js";
import { StoredData } from "../types/user";

type MessagesProps = {
	data: StoredData;
};

const ConversationAnalysis: Component<{ messages: StoredData["messages"]; conversation: string }> = (props) => {
	const conversationMessages = props.messages.filter((msg) => msg.conversation === props.conversation);

	// Count messages and reels by sender
	const messageBySender = conversationMessages.reduce(
		(acc, msg) => {
			if (!acc[msg.sender_name]) {
				acc[msg.sender_name] = { messages: 0, reels: 0 };
			}
			acc[msg.sender_name].messages++;

			// Check if message contains a reel share
			if (msg.share?.link?.includes("/reel/")) {
				acc[msg.sender_name].reels++;
			}
			return acc;
		},
		{} as Record<string, { messages: number; reels: number }>,
	);

	// Count total reels in conversation
	const totalReels = Object.values(messageBySender).reduce((sum, counts) => sum + counts.reels, 0);

	return (
		<div class="bg-white rounded-lg shadow mb-4">
			<ul class="list-disc">
				<li>Total Reels Shared: {totalReels}</li>

				{Object.entries(messageBySender)
					.sort(([, a], [, b]) => b.messages - a.messages)
					.map(([sender, counts]) => (
						<li>
							{sender}: {counts.messages} messages ({counts.reels} reels)
						</li>
					))}
			</ul>
		</div>
	);
};

const MessageAnalysis: Component<MessagesProps> = (props) => {
	const data = props.data;

	const messages = data.messages;

	const conversationCounts = messages.reduce(
		(acc, msg) => {
			const conversation = msg.conversation;
			acc[conversation] = (acc[conversation] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>,
	);

	// TODO: add a toggle to filter between including and excluding reels
	return (
		<div>
			<div class="p-4 bg-white rounded-lg shadow mb-4">
				<h2 class="text-xl font-bold mb-3">Message Analysis</h2>
				<p>Total Messages: {messages.length}</p>
				<p>Messages Sent: {messages.filter((m) => m.sender_name === data.user.name).length}</p>
				<p>Messages Received: {messages.filter((m) => m.sender_name !== data.user.name).length}</p>
				<p>
					Messages Liked:{" "}
					{
						messages.filter((m) =>
							m.reactions?.some((r) => r.actor === data.user.name && r.reaction === "❤"),
						).length
					}
				</p>
				<p>
					Reels Sent:{" "}
					{
						messages.filter((m) => m.sender_name === data.user.name && m.share?.link?.includes("/reel/"))
							.length
					}
				</p>
				<p>
					Reels Received:{" "}
					{
						messages.filter((m) => m.sender_name !== data.user.name && m.share?.link?.includes("/reel/"))
							.length
					}
				</p>
				<h3 class="text-lg font-semibold mt-3 mb-2">Messages per Conversation:</h3>
				<ul class="list-disc ml-4">
					{Object.entries(conversationCounts)
						.sort(([, a], [, b]) => b - a)
						.map(([conversation, count]) => (
							<li>
								<details>
									<summary class="flex items-center cursor-pointer">
										{conversation}: {count} messages
									</summary>
									<div class="ml-2">
										<ConversationAnalysis messages={messages} conversation={conversation} />
									</div>
								</details>
							</li>
						))}
				</ul>
			</div>
		</div>
	);
};

export default MessageAnalysis;
