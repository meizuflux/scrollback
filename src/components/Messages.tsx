import { Component, createMemo, createSignal, For, Show } from "solid-js";
import { StoredData, StoredMessage } from "@/db/database";

type MessagesProps = {
	data: StoredData;
};

interface ConversationStats {
	messages: number;
	reels: number;
	photos: number;
	videos: number;
	reactions: number;
	avgResponseTime?: number;
	firstMessage?: Date;
	lastMessage?: Date;
}

interface SenderStats extends ConversationStats {
	name: string;
}

const formatDate = (date: Date | number) => {
	if (typeof date === "number") {
		return new Date(date).toLocaleDateString();
	}
	return date.toLocaleDateString();
};

const getMessageTimeRange = (messages: StoredMessage[]) => {
	const timestamps = messages
		.map((m) => m.timestamp)
		.filter(Boolean)
		.sort((a, b) => a!.getTime() - b!.getTime());

	if (timestamps.length === 0) return null;

	return {
		first: timestamps[0]!,
		last: timestamps[timestamps.length - 1]!,
		span: Math.ceil(
			(timestamps[timestamps.length - 1]!.getTime() - timestamps[0]!.getTime()) / (1000 * 60 * 60 * 24),
		),
	};
};

const ConversationAnalysis: Component<{ messages: StoredData["messages"]; conversation: string }> = (props) => {
	const conversationMessages = createMemo(() =>
		props.messages.filter((msg) => msg.conversation === props.conversation),
	);

	const timeRange = createMemo(() => getMessageTimeRange(conversationMessages()));

	const senderStats = createMemo(() => {
		const stats: Record<string, SenderStats> = {};

		conversationMessages().forEach((msg) => {
			if (!msg.sender_name) return;

			if (!stats[msg.sender_name]) {
				stats[msg.sender_name] = {
					name: msg.sender_name,
					messages: 0,
					reels: 0,
					photos: 0,
					videos: 0,
					reactions: 0,
				};
			}

			const senderStat = stats[msg.sender_name];
			senderStat.messages++;

			if (msg.share?.link?.includes("/reel/")) {
				senderStat.reels++;
			}

			if (msg.photos?.length) {
				senderStat.photos += msg.photos.length;
			}

			if (msg.videos?.length) {
				senderStat.videos += msg.videos.length;
			}

			if (msg.reactions?.length) {
				senderStat.reactions += msg.reactions.length;
			}
		});

		return Object.values(stats).sort((a, b) => b.messages - a.messages);
	});

	const totalStats = createMemo(() => {
		const messages = conversationMessages();
		return {
			total: messages.length,
			reels: messages.filter((m) => m.share?.link?.includes("/reel/")).length,
			photos: messages.reduce((sum, m) => sum + (m.photos?.length || 0), 0),
			videos: messages.reduce((sum, m) => sum + (m.videos?.length || 0), 0),
			reactions: messages.reduce((sum, m) => sum + (m.reactions?.length || 0), 0),
			withContent: messages.filter((m) => m.content?.trim()).length,
		};
	});

	return (
		<div class="bg-gray-800 rounded-lg p-4 mt-2 border border-gray-700">
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
				<div class="bg-gray-700 p-3 rounded shadow text-center border border-gray-600">
					<div class="text-2xl font-bold text-blue-400">{totalStats().total}</div>
					<div class="text-sm text-gray-300">Total Messages</div>
				</div>
				<div class="bg-gray-700 p-3 rounded shadow text-center border border-gray-600">
					<div class="text-2xl font-bold text-green-400">{totalStats().reels}</div>
					<div class="text-sm text-gray-300">Reels Shared</div>
				</div>
				<div class="bg-gray-700 p-3 rounded shadow text-center border border-gray-600">
					<div class="text-2xl font-bold text-purple-400">{totalStats().photos}</div>
					<div class="text-sm text-gray-300">Photos</div>
				</div>
				<div class="bg-gray-700 p-3 rounded shadow text-center border border-gray-600">
					<div class="text-2xl font-bold text-red-400">{totalStats().reactions}</div>
					<div class="text-sm text-gray-300">Reactions</div>
				</div>
			</div>

			<Show when={timeRange()}>
				<div class="bg-gray-700 p-3 rounded shadow mb-4 border border-gray-600">
					<h4 class="font-semibold mb-2 text-white">Timeline</h4>
					<p class="text-sm text-gray-300">
						From {formatDate(timeRange()!.first.getTime())} to {formatDate(timeRange()!.last.getTime())}
						<span class="ml-2">({timeRange()!.span} days)</span>
					</p>
				</div>
			</Show>

			<div class="bg-gray-700 rounded shadow border border-gray-600">
				<h4 class="font-semibold p-3 border-b border-gray-600 text-white">Activity by Sender</h4>
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead class="bg-gray-600">
							<tr>
								<th class="px-3 py-2 text-left text-gray-200">Sender</th>
								<th class="px-3 py-2 text-center text-gray-200">Messages</th>
								<th class="px-3 py-2 text-center text-gray-200">Reels</th>
								<th class="px-3 py-2 text-center text-gray-200">Photos</th>
								<th class="px-3 py-2 text-center text-gray-200">Videos</th>
								<th class="px-3 py-2 text-center text-gray-200">Reactions</th>
							</tr>
						</thead>
						<tbody>
							<For each={senderStats()}>
								{(sender) => (
									<tr class="border-b border-gray-600">
										<td class="px-3 py-2 font-medium text-white">{sender.name}</td>
										<td class="px-3 py-2 text-center text-gray-300">{sender.messages}</td>
										<td class="px-3 py-2 text-center text-gray-300">{sender.reels}</td>
										<td class="px-3 py-2 text-center text-gray-300">{sender.photos}</td>
										<td class="px-3 py-2 text-center text-gray-300">{sender.videos}</td>
										<td class="px-3 py-2 text-center text-gray-300">{sender.reactions}</td>
									</tr>
								)}
							</For>
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
};

const ConversationBrowser: Component<{
	conversations: Array<[string, number]>;
	messages: StoredMessage[];
	userStats: any;
}> = (props) => {
	const [searchTerm, setSearchTerm] = createSignal("");
	const [sortBy, setSortBy] = createSignal<"messages" | "name" | "recent">("messages");
	const [minMessages, setMinMessages] = createSignal(0);
	const [showAll, setShowAll] = createSignal(false);
	const [expandedConversations, setExpandedConversations] = createSignal(new Set<string>());

	const filteredAndSortedConversations = createMemo(() => {
		let filtered = props.conversations.filter(([name, count]) => {
			const matchesSearch = name.toLowerCase().includes(searchTerm().toLowerCase());
			const meetsMinMessages = count >= minMessages();
			return matchesSearch && meetsMinMessages;
		});

		// Sort based on selected criteria
		filtered.sort(([nameA, countA], [nameB, countB]) => {
			switch (sortBy()) {
				case "name":
					return nameA.localeCompare(nameB);
				case "recent":
					// Get most recent message for each conversation
					const lastMessageA = Math.max(
						...props.messages
							.filter((m) => m.conversation === nameA)
							.map((m) => m.timestamp?.getTime() || 0),
					);
					const lastMessageB = Math.max(
						...props.messages
							.filter((m) => m.conversation === nameB)
							.map((m) => m.timestamp?.getTime() || 0),
					);
					return lastMessageB - lastMessageA;
				case "messages":
				default:
					return countB - countA;
			}
		});

		return showAll() ? filtered : filtered.slice(0, 10);
	});

	const toggleConversation = (conversation: string) => {
		const expanded = new Set(expandedConversations());
		if (expanded.has(conversation)) {
			expanded.delete(conversation);
		} else {
			expanded.add(conversation);
		}
		setExpandedConversations(expanded);
	};

	const totalFiltered = createMemo(
		() =>
			props.conversations.filter(([name, count]) => {
				const matchesSearch = name.toLowerCase().includes(searchTerm().toLowerCase());
				const meetsMinMessages = count >= minMessages();
				return matchesSearch && meetsMinMessages;
			}).length,
	);

	return (
		<div class="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
			<h3 class="text-xl font-bold mb-4 text-white">All Conversations</h3>

			{/* Search and Filters */}
			<div class="space-y-4 mb-6">
				<div class="flex flex-col sm:flex-row gap-4">
					<div class="flex-1">
						<label class="block text-sm font-medium text-gray-300 mb-1">Search Conversations</label>
						<input
							type="text"
							placeholder="Search by name..."
							value={searchTerm()}
							onInput={(e) => setSearchTerm(e.currentTarget.value)}
							class="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>

					<div class="sm:w-48">
						<label class="block text-sm font-medium text-gray-300 mb-1">Sort By</label>
						<select
							value={sortBy()}
							onChange={(e) => setSortBy(e.currentTarget.value as any)}
							class="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						>
							<option value="messages">Message Count</option>
							<option value="name">Name (A-Z)</option>
							<option value="recent">Most Recent</option>
						</select>
					</div>

					<div class="sm:w-48">
						<label class="block text-sm font-medium text-gray-300 mb-1">Min Messages</label>
						<input
							type="number"
							min="0"
							value={minMessages()}
							onInput={(e) => setMinMessages(parseInt(e.currentTarget.value) || 0)}
							class="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>
				</div>

				<div class="flex justify-between items-center">
					<p class="text-sm text-gray-300">
						Showing {filteredAndSortedConversations().length} of {totalFiltered()} conversations
						{searchTerm() && ` matching "${searchTerm()}"`}
					</p>

					<Show when={totalFiltered() > 10}>
						<button
							onClick={() => setShowAll(!showAll())}
							class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
						>
							{showAll() ? "Show Top 10" : "Show All"}
						</button>
					</Show>
				</div>
			</div>

			{/* Conversations List */}
			<div class="space-y-2">
				<For each={filteredAndSortedConversations()}>
					{([conversation, count]) => {
						const isExpanded = () => expandedConversations().has(conversation);

						return (
							<div class="border border-gray-600 rounded-lg bg-gray-700">
								<div
									class="p-4 cursor-pointer hover:bg-gray-600 flex justify-between items-center"
									onClick={() => toggleConversation(conversation)}
								>
									<div class="flex-1">
										<span class="font-medium text-white">{conversation}</span>
										<div class="text-sm text-gray-400 mt-1">
											<Show
												when={
													props.messages.find((m) => m.conversation === conversation)
														?.timestamp
												}
											>
												Last active:{" "}
												{formatDate(
													Math.max(
														...props.messages
															.filter((m) => m.conversation === conversation)
															.map((m) => m.timestamp?.getTime() || 0),
													),
												)}
											</Show>
										</div>
									</div>

									<div class="flex items-center gap-2">
										<span class="bg-blue-600 text-blue-100 px-3 py-1 rounded-full text-sm font-medium">
											{count.toLocaleString()} messages
										</span>
										<svg
											class={`w-5 h-5 text-gray-400 transition-transform ${isExpanded() ? "rotate-180" : ""}`}
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M19 9l-7 7-7-7"
											/>
										</svg>
									</div>
								</div>

								<Show when={isExpanded()}>
									<ConversationAnalysis messages={props.messages} conversation={conversation} />
								</Show>
							</div>
						);
					}}
				</For>

				<Show when={filteredAndSortedConversations().length === 0}>
					<div class="text-center py-8 text-gray-400">
						<p>No conversations found matching your criteria.</p>
						<Show when={searchTerm() || minMessages() > 0}>
							<button
								onClick={() => {
									setSearchTerm("");
									setMinMessages(0);
								}}
								class="mt-2 text-blue-400 hover:text-blue-300"
							>
								Clear filters
							</button>
						</Show>
					</div>
				</Show>
			</div>
		</div>
	);
};

const MessageAnalysis: Component<MessagesProps> = (props) => {
	const data = props.data;
	const messages = data.messages;

	const conversationCounts = createMemo(() => {
		return messages.reduce(
			(acc, msg) => {
				const conversation = msg.conversation;
				acc[conversation] = (acc[conversation] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>,
		);
	});

	const userStats = createMemo(() => {
		const sent = messages.filter((m) => m.sender_name === data.user.name);
		const received = messages.filter((m) => m.sender_name !== data.user.name);

		return {
			total: messages.length,
			sent: sent.length,
			received: received.length,
			reelsSent: sent.filter((m) => m.share?.link?.includes("/reel/")).length,
			reelsReceived: received.filter((m) => m.share?.link?.includes("/reel/")).length,
			photosSent: sent.reduce((sum, m) => sum + (m.photos?.length || 0), 0),
			photosReceived: received.reduce((sum, m) => sum + (m.photos?.length || 0), 0),
			reactionsGiven: messages.filter((m) => m.reactions?.some((r) => r.actor === data.user.name)).length,
			reactionsReceived: messages.filter((m) => m.sender_name === data.user.name && m.reactions?.length).length,
		};
	});

	const topConversations = createMemo(() => {
		return Object.entries(conversationCounts())
			.sort(([, a], [, b]) => b - a)
			.slice(0, 5);
	});

	const allConversations = createMemo(() => {
		return Object.entries(conversationCounts()).sort(([, a], [, b]) => b - a);
	});

	return (
		<div class="space-y-6">
			<div class="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
				<h2 class="text-2xl font-bold mb-6 text-white">Message Analysis</h2>

				<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
					<div class="bg-blue-900 p-4 rounded-lg text-center border border-blue-700">
						<div class="text-3xl font-bold text-blue-300">{userStats().total.toLocaleString()}</div>
						<div class="text-blue-200 font-medium">Total Messages</div>
					</div>
					<div class="bg-green-900 p-4 rounded-lg text-center border border-green-700">
						<div class="text-3xl font-bold text-green-300">{userStats().sent.toLocaleString()}</div>
						<div class="text-green-200 font-medium">Messages Sent</div>
					</div>
					<div class="bg-purple-900 p-4 rounded-lg text-center border border-purple-700">
						<div class="text-3xl font-bold text-purple-300">{userStats().received.toLocaleString()}</div>
						<div class="text-purple-200 font-medium">Messages Received</div>
					</div>
					<div class="bg-orange-900 p-4 rounded-lg text-center border border-orange-700">
						<div class="text-3xl font-bold text-orange-300">{Object.keys(conversationCounts()).length}</div>
						<div class="text-orange-200 font-medium">Conversations</div>
					</div>
				</div>

				<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
					<div class="bg-gray-700 border border-gray-600 p-3 rounded text-center">
						<div class="text-xl font-bold text-gray-200">{userStats().reelsSent}</div>
						<div class="text-sm text-gray-400">Reels Sent</div>
					</div>
					<div class="bg-gray-700 border border-gray-600 p-3 rounded text-center">
						<div class="text-xl font-bold text-gray-200">{userStats().reelsReceived}</div>
						<div class="text-sm text-gray-400">Reels Received</div>
					</div>
					<div class="bg-gray-700 border border-gray-600 p-3 rounded text-center">
						<div class="text-xl font-bold text-gray-200">{userStats().photosSent}</div>
						<div class="text-sm text-gray-400">Photos Sent</div>
					</div>
					<div class="bg-gray-700 border border-gray-600 p-3 rounded text-center">
						<div class="text-xl font-bold text-gray-200">{userStats().reactionsGiven}</div>
						<div class="text-sm text-gray-400">Reactions Given</div>
					</div>
				</div>
			</div>

			<div class="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
				<h3 class="text-xl font-bold mb-4 text-white">Top 5 Conversations</h3>
				<div class="space-y-2">
					<For each={topConversations()}>
						{([conversation, count]) => (
							<details class="border border-gray-600 rounded-lg bg-gray-700">
								<summary class="p-4 cursor-pointer hover:bg-gray-600 flex justify-between items-center">
									<span class="font-medium text-white">{conversation}</span>
									<span class="bg-blue-600 text-blue-100 px-3 py-1 rounded-full text-sm font-medium">
										{count.toLocaleString()} messages
									</span>
								</summary>
								<ConversationAnalysis messages={messages} conversation={conversation} />
							</details>
						)}
					</For>
				</div>
			</div>

			<ConversationBrowser conversations={allConversations()} messages={messages} userStats={userStats()} />
		</div>
	);
};

export default MessageAnalysis;
