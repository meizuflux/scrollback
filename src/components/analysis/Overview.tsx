import { Component, Show, For } from "solid-js";
import { CachedAnalysis } from "@/types/analysis";

interface StatCardProps {
	title: string;
	value: number | string;
	icon: string;
	color?: string;
}

const StatCard: Component<StatCardProps> = (props) => {
	return (
		<div class="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-gray-400 text-sm font-medium">{props.title}</p>
					<p class="text-2xl font-bold text-white mt-1">{props.value}</p>
				</div>
				<div class={`text-3xl ${props.color || "text-blue-400"}`}>
					{props.icon}
				</div>
			</div>
		</div>
	);
};

const Overview: Component<{ analysis: CachedAnalysis }> = (props) => {
	const formatNumber = (num: number | undefined) => {
		if (num === undefined) return "—";
		return num.toLocaleString();
	};

	return (
		<div class="space-y-8">
			<div class="text-center mb-8">
				<h1 class="text-4xl font-bold text-white mb-4">Your Instagram Analysis</h1>
				<p class="text-gray-300 text-lg">Complete overview of your Instagram activity</p>
			</div>
			{/* Messages Section */}
			<div class="mb-8">
				<h2 class="text-2xl font-bold text-white mb-6 flex items-center">
					<span class="mr-3">💬</span>
					Messages
				</h2>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
					<StatCard
						title="Total Messages"
						value={formatNumber(props.analysis.messageCount)}
						icon="📨"
						color="text-blue-400"
					/>
					<StatCard
						title="Messages Sent"
						value={formatNumber(props.analysis.messagesSent)}
						icon="📤"
						color="text-green-400"
					/>
					<StatCard
						title="Messages Received"
						value={formatNumber(props.analysis.messagesReceived)}
						icon="📥"
						color="text-purple-400"
					/>
					<StatCard
						title="System Messages"
						value={formatNumber(props.analysis.systemMessages)}
						icon="🔧"
						color="text-gray-400"
					/>
				</div>
			</div>

			{/* Conversations Section */}
			<div class="mb-8">
				<h2 class="text-2xl font-bold text-white mb-6 flex items-center">
					<span class="mr-3">👥</span>
					Conversations
				</h2>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div class="space-y-6 flex flex-col h-full">
						<StatCard
							title="Total Conversations"
							value={formatNumber(props.analysis.conversationCount)}
							icon="💭"
							color="text-indigo-400"
						/>
						<StatCard
							title="Group Chats"
							value={formatNumber(props.analysis.groupCount)}
							icon="👥"
							color="text-emerald-400"
						/>
					</div>
					<div class="bg-gray-800 rounded-lg p-6 border border-gray-700 h-full">
						<h3 class="text-lg font-semibold text-white mb-4">Top 3 Conversations</h3>
						<Show when={props.analysis.topThreeConversations}>
							<div class="space-y-3">
								<For each={props.analysis.topThreeConversations}>
									{(conversation, index) => (
										<div class="flex justify-between items-center p-3 bg-gray-700 rounded">
											<div class="flex items-center">
												<span class="text-gray-400 mr-3">#{index() + 1}</span>
												<span class="text-white font-medium truncate">{conversation.title}</span>
											</div>
											<span class="text-blue-400 font-bold">{formatNumber(conversation.count)}</span>
										</div>
									)}
								</For>
							</div>
						</Show>
					</div>
				</div>
			</div>

			{/* Social Interactions Section */}
			<div class="mb-8">
				<h2 class="text-2xl font-bold text-white mb-6 flex items-center">
					<span class="mr-3">🤝</span>
					Social Activity
				</h2>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
					<StatCard
						title="Followers"
						value={formatNumber(props.analysis.followers)}
						icon="👥"
						color="text-pink-400"
					/>
					<StatCard
						title="Following"
						value={formatNumber(props.analysis.following)}
						icon="➡️"
						color="text-cyan-400"
					/>
					<StatCard
						title="Reactions Sent"
						value={formatNumber(props.analysis.reactionsSent)}
						icon="❤️"
						color="text-red-400"
					/>
					<StatCard
						title="Reactions Received"
						value={formatNumber(props.analysis.reactionsReceived)}
						icon="💕"
						color="text-rose-400"
					/>
				</div>
			</div>

			{/* Content Section */}
			<div class="mb-8">
				<h2 class="text-2xl font-bold text-white mb-6 flex items-center">
					<span class="mr-3">📸</span>
					Content
				</h2>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
					<StatCard
						title="Posts Created"
						value={formatNumber(props.analysis.postCount)}
						icon="📷"
						color="text-orange-400"
					/>
					<StatCard
						title="Stories Created"
						value={formatNumber(props.analysis.storyCount)}
						icon="📱"
						color="text-yellow-400"
					/>
					<StatCard
						title="Reels Sent"
						value={formatNumber(props.analysis.reelsSent)}
						icon="🎬"
						color="text-purple-400"
					/>
					<StatCard
						title="Reels Received"
						value={formatNumber(props.analysis.reelsReceived)}
						icon="🎥"
						color="text-indigo-400"
					/>
				</div>
			</div>

			{/* Favorites Section */}
			<div class="mb-8">
				<h2 class="text-2xl font-bold text-white mb-6 flex items-center">
					<span class="mr-3">⭐</span>
					Favorites
				</h2>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-gray-400 text-sm font-medium">Favorite Word</p>
								<p class="text-2xl font-bold text-white mt-1">
									{props.analysis.favoriteWord || "—"}
								</p>
							</div>
							<div class="text-3xl text-green-400">💬</div>
						</div>
					</div>
					<div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-gray-400 text-sm font-medium">Favorite Emoji</p>
								<p class="text-2xl font-bold text-white mt-1">
									{props.analysis.favoriteEmoji || "—"}
								</p>
							</div>
							<div class="text-3xl text-yellow-400">😊</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Overview;
