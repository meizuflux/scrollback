import { Component, createMemo, createSignal, For, Show } from "solid-js";
import { StoredData, StoredMessage } from "../types/user";

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

const formatDate = (timestamp: number) => {
	return new Date(timestamp).toLocaleDateString();
};

const getMessageTimeRange = (messages: StoredMessage[]) => {
	const timestamps = messages
		.map((m) => m.timestamp_ms)
		.filter(Boolean)
		.sort((a, b) => a! - b!);

	if (timestamps.length === 0) return null;

	return {
		first: new Date(timestamps[0]!),
		last: new Date(timestamps[timestamps.length - 1]!),
		span: Math.ceil(
			(timestamps[timestamps.length - 1]! - timestamps[0]!) / (1000 * 60 * 60 * 24),
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
		<div class="bg-gray-50 rounded-lg p-4 mt-2">
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
				<div class="bg-white p-3 rounded shadow text-center">
					<div class="text-2xl font-bold text-blue-600">{totalStats().total}</div>
					<div class="text-sm text-gray-600">Total Messages</div>
				</div>
				<div class="bg-white p-3 rounded shadow text-center">
					<div class="text-2xl font-bold text-green-600">{totalStats().reels}</div>
					<div class="text-sm text-gray-600">Reels Shared</div>
				</div>
				<div class="bg-white p-3 rounded shadow text-center">
					<div class="text-2xl font-bold text-purple-600">{totalStats().photos}</div>
					<div class="text-sm text-gray-600">Photos</div>
				</div>
				<div class="bg-white p-3 rounded shadow text-center">
					<div class="text-2xl font-bold text-red-600">{totalStats().reactions}</div>
					<div class="text-sm text-gray-600">Reactions</div>
				</div>
			</div>

			<Show when={timeRange()}>
				<div class="bg-white p-3 rounded shadow mb-4">
					<h4 class="font-semibold mb-2">Timeline</h4>
					<p class="text-sm text-gray-600">
						From {formatDate(timeRange()!.first.getTime())} to{" "}
						{formatDate(timeRange()!.last.getTime())}
						<span class="ml-2">({timeRange()!.span} days)</span>
					</p>
				</div>
			</Show>

			<div class="bg-white rounded shadow">
				<h4 class="font-semibold p-3 border-b">Activity by Sender</h4>
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead class="bg-gray-50">
							<tr>
								<th class="px-3 py-2 text-left">Sender</th>
								<th class="px-3 py-2 text-center">Messages</th>
								<th class="px-3 py-2 text-center">Reels</th>
								<th class="px-3 py-2 text-center">Photos</th>
								<th class="px-3 py-2 text-center">Videos</th>
								<th class="px-3 py-2 text-center">Reactions</th>
							</tr>
						</thead>
						<tbody>
							<For each={senderStats()}>
								{(sender) => (
									<tr class="border-b">
										<td class="px-3 py-2 font-medium">{sender.name}</td>
										<td class="px-3 py-2 text-center">{sender.messages}</td>
										<td class="px-3 py-2 text-center">{sender.reels}</td>
										<td class="px-3 py-2 text-center">{sender.photos}</td>
										<td class="px-3 py-2 text-center">{sender.videos}</td>
										<td class="px-3 py-2 text-center">{sender.reactions}</td>
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
					const lastMessageA = Math.max(...props.messages
						.filter(m => m.conversation === nameA)
						.map(m => m.timestamp_ms || 0));
					const lastMessageB = Math.max(...props.messages
						.filter(m => m.conversation === nameB)
						.map(m => m.timestamp_ms || 0));
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

	const totalFiltered = createMemo(() => 
		props.conversations.filter(([name, count]) => {
			const matchesSearch = name.toLowerCase().includes(searchTerm().toLowerCase());
			const meetsMinMessages = count >= minMessages();
			return matchesSearch && meetsMinMessages;
		}).length
	);

	return (
		<div class="bg-white rounded-lg shadow p-6">
			<h3 class="text-xl font-bold mb-4">All Conversations</h3>
			
			{/* Search and Filters */}
			<div class="space-y-4 mb-6">
				<div class="flex flex-col sm:flex-row gap-4">
					<div class="flex-1">
						<label class="block text-sm font-medium text-gray-700 mb-1">Search Conversations</label>
						<input
							type="text"
							placeholder="Search by name..."
							value={searchTerm()}
							onInput={(e) => setSearchTerm(e.currentTarget.value)}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>
					
					<div class="sm:w-48">
						<label class="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
						<select
							value={sortBy()}
							onChange={(e) => setSortBy(e.currentTarget.value as any)}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						>
							<option value="messages">Message Count</option>
							<option value="name">Name (A-Z)</option>
							<option value="recent">Most Recent</option>
						</select>
					</div>
					
					<div class="sm:w-48">
						<label class="block text-sm font-medium text-gray-700 mb-1">Min Messages</label>
						<input
							type="number"
							min="0"
							value={minMessages()}
							onInput={(e) => setMinMessages(parseInt(e.currentTarget.value) || 0)}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>
				</div>

				<div class="flex justify-between items-center">
					<p class="text-sm text-gray-600">
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
							<div class="border rounded-lg">
								<div 
									class="p-4 cursor-pointer hover:bg-gray-50 flex justify-between items-center"
									onClick={() => toggleConversation(conversation)}
								>
									<div class="flex-1">
										<span class="font-medium">{conversation}</span>
										<div class="text-sm text-gray-500 mt-1">
											<Show when={props.messages.find(m => m.conversation === conversation)?.timestamp_ms}>
												Last active: {formatDate(Math.max(...props.messages
													.filter(m => m.conversation === conversation)
													.map(m => m.timestamp_ms || 0)))}
											</Show>
										</div>
									</div>
									
									<div class="flex items-center gap-2">
										<span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
											{count.toLocaleString()} messages
										</span>
										<svg 
											class={`w-5 h-5 text-gray-400 transition-transform ${isExpanded() ? 'rotate-180' : ''}`}
											fill="none" 
											stroke="currentColor" 
											viewBox="0 0 24 24"
										>
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
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
					<div class="text-center py-8 text-gray-500">
						<p>No conversations found matching your criteria.</p>
						<Show when={searchTerm() || minMessages() > 0}>
							<button
								onClick={() => {
									setSearchTerm("");
									setMinMessages(0);
								}}
								class="mt-2 text-blue-600 hover:text-blue-800"
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
		return messages.reduce((acc, msg) => {
			const conversation = msg.conversation;
			acc[conversation] = (acc[conversation] || 0) + 1;
			return acc;
		}, {} as Record<string, number>);
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
			reactionsGiven: messages.filter((m) =>
				m.reactions?.some((r) => r.actor === data.user.name),
			).length,
			reactionsReceived: messages.filter((m) => m.sender_name === data.user.name && m.reactions?.length)
				.length,
		};
	});

	const topConversations = createMemo(() => {
		return Object.entries(conversationCounts())
			.sort(([, a], [, b]) => b - a)
			.slice(0, 5);
	});

	const allConversations = createMemo(() => {
		return Object.entries(conversationCounts())
			.sort(([, a], [, b]) => b - a);
	});

	return (
		<div class="space-y-6">
			<div class="bg-white rounded-lg shadow p-6">
				<h2 class="text-2xl font-bold mb-6">Message Analysis</h2>

				<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
					<div class="bg-blue-50 p-4 rounded-lg text-center">
						<div class="text-3xl font-bold text-blue-600">
							{userStats().total.toLocaleString()}
						</div>
						<div class="text-blue-800 font-medium">Total Messages</div>
					</div>
					<div class="bg-green-50 p-4 rounded-lg text-center">
						<div class="text-3xl font-bold text-green-600">
							{userStats().sent.toLocaleString()}
						</div>
						<div class="text-green-800 font-medium">Messages Sent</div>
					</div>
					<div class="bg-purple-50 p-4 rounded-lg text-center">
						<div class="text-3xl font-bold text-purple-600">
							{userStats().received.toLocaleString()}
						</div>
						<div class="text-purple-800 font-medium">Messages Received</div>
					</div>
					<div class="bg-orange-50 p-4 rounded-lg text-center">
						<div class="text-3xl font-bold text-orange-600">
							{Object.keys(conversationCounts()).length}
						</div>
						<div class="text-orange-800 font-medium">Conversations</div>
					</div>
				</div>

				<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
					<div class="bg-white border p-3 rounded text-center">
						<div class="text-xl font-bold text-gray-800">{userStats().reelsSent}</div>
						<div class="text-sm text-gray-600">Reels Sent</div>
					</div>
					<div class="bg-white border p-3 rounded text-center">
						<div class="text-xl font-bold text-gray-800">{userStats().reelsReceived}</div>
						<div class="text-sm text-gray-600">Reels Received</div>
					</div>
					<div class="bg-white border p-3 rounded text-center">
						<div class="text-xl font-bold text-gray-800">{userStats().photosSent}</div>
						<div class="text-sm text-gray-600">Photos Sent</div>
					</div>
					<div class="bg-white border p-3 rounded text-center">
						<div class="text-xl font-bold text-gray-800">{userStats().reactionsGiven}</div>
						<div class="text-sm text-gray-600">Reactions Given</div>
					</div>
				</div>
			</div>

			<div class="bg-white rounded-lg shadow p-6">
				<h3 class="text-xl font-bold mb-4">Top 5 Conversations</h3>
				<div class="space-y-2">
					<For each={topConversations()}>
						{([conversation, count]) => (
							<details class="border rounded-lg">
								<summary class="p-4 cursor-pointer hover:bg-gray-50 flex justify-between items-center">
									<span class="font-medium">{conversation}</span>
									<span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
										{count.toLocaleString()} messages
									</span>
								</summary>
								<ConversationAnalysis messages={messages} conversation={conversation} />
							</details>
						)}
					</For>
				</div>
			</div>

			<ConversationBrowser 
				conversations={allConversations()} 
				messages={messages}
				userStats={userStats()}
			/>
		</div>
	);
};

export default MessageAnalysis;
