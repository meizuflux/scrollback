import { type Component, For, createMemo, createSignal, Show } from "solid-js";
import type { StoredData, StoredUser } from "@/db/database";

interface ConnectionsAnalysisProps {
	data: StoredData;
}

const formatDate = (date: Date | undefined) => {
	return date ? date.toLocaleDateString() : "Unknown";
};

const UserList: Component<{
	title: string;
	users: StoredUser[];
	showTimestamps?: boolean;
	timestampKey?: keyof StoredUser;
	emptyMessage?: string;
}> = (props) => {
	const [searchTerm, setSearchTerm] = createSignal("");
	const [showAll, setShowAll] = createSignal(false);

	const filteredUsers = createMemo(() => {
		const filtered = props.users.filter((user) => user.username.toLowerCase().includes(searchTerm().toLowerCase()));
		return showAll() ? filtered : filtered.slice(0, 10);
	});

	const totalFiltered = createMemo(
		() => props.users.filter((user) => user.username.toLowerCase().includes(searchTerm().toLowerCase())).length,
	);

	return (
		<div class="bg-gray-800 rounded-lg shadow p-6 mb-6 border border-gray-700">
			<div class="flex justify-between items-center mb-4">
				<h3 class="text-xl font-bold text-white">{props.title}</h3>
				<span class="bg-blue-600 text-blue-100 px-3 py-1 rounded-full text-sm font-medium">
					{props.users.length} users
				</span>
			</div>

			<Show
				when={props.users.length > 0}
				fallback={
					<div class="text-center py-8 text-gray-400">
						<div class="text-4xl mb-2">👤</div>
						<p>{props.emptyMessage || "No users in this category"}</p>
					</div>
				}
			>
				<div class="mb-4">
					<input
						type="text"
						placeholder="Search users..."
						value={searchTerm()}
						onInput={(e) => setSearchTerm(e.currentTarget.value)}
						class="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					/>
				</div>

				<div class="flex justify-between items-center mb-4">
					<p class="text-sm text-gray-300">
						Showing {filteredUsers().length} of {totalFiltered()} users
						{searchTerm() && ` matching "${searchTerm()}"`}
					</p>

					<Show when={totalFiltered() > 10}>
						<button
							onClick={() => setShowAll(!showAll())}
							class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
						>
							{showAll() ? "Show Top 10" : "Show All"}
						</button>
					</Show>
				</div>

				<div class="space-y-2 max-h-96 overflow-y-auto">
					<For each={filteredUsers()}>
						{(user) => (
							<div class="flex justify-between items-center p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors border border-gray-600">
								<div class="flex items-center">
									<div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
										{user.username.charAt(0).toUpperCase()}
									</div>
									<span class="font-medium text-white">@{user.username}</span>
								</div>
								<Show when={props.showTimestamps && props.timestampKey}>
									<span class="text-sm text-gray-400">
										{formatDate((user as any)[props.timestampKey!]?.timestamp)}
									</span>
								</Show>
							</div>
						)}
					</For>
				</div>

				<Show when={filteredUsers().length === 0 && searchTerm()}>
					<div class="text-center py-4 text-gray-400">
						<p>No users found matching "{searchTerm()}"</p>
						<button onClick={() => setSearchTerm("")} class="mt-2 text-blue-400 hover:text-blue-300">
							Clear search
						</button>
					</div>
				</Show>
			</Show>
		</div>
	);
};

const MetricCard: Component<{
	title: string;
	value: number;
	subtitle?: string;
	color: string;
	icon?: string;
}> = (props) => (
	<div class={`bg-${props.color}-900 border border-${props.color}-700 p-4 rounded-lg text-center`}>
		<Show when={props.icon}>
			<div class="text-2xl mb-2">{props.icon}</div>
		</Show>
		<div class={`text-3xl font-bold text-${props.color}-300`}>{props.value.toLocaleString()}</div>
		<div class={`text-${props.color}-200 font-medium`}>{props.title}</div>
		<Show when={props.subtitle}>
			<div class="text-sm text-gray-400 mt-1">{props.subtitle}</div>
		</Show>
	</div>
);

const ConnectionsAnalysis: Component<ConnectionsAnalysisProps> = (props) => {
	const users = props.data.users;

	const stats = createMemo(() => {
		const followers = users.filter((u) => u.follower?.value);
		const following = users.filter((u) => u.following?.value);
		const closeFriends = users.filter((u) => u.close_friends?.value);
		const blocked = users.filter((u) => u.blocked?.value);
		const receivedFollowRequests = users.filter((u) => u.requested_to_follow_you?.value);
		const hiddenStory = users.filter((u) => u.hidden_story_from?.value);
		const pendingFollowRequests = users.filter((u) => u.pending_follow_request?.value);
		const recentlyUnfollowed = users.filter((u) => u.recently_unfollowed?.value);

		const followerUsernames = new Set(followers.map((u) => u.username));
		const followingUsernames = new Set(following.map((u) => u.username));

		const notFollowingBack = followers.filter((u) => !followingUsernames.has(u.username));
		const notFollowingYouBack = following.filter((u) => !followerUsernames.has(u.username));
		const mutualFollows = following.filter((u) => followerUsernames.has(u.username));

		const followRatio = followers.length > 0 ? (following.length / followers.length).toFixed(2) : "0";

		return {
			followers,
			following,
			closeFriends,
			blocked,
			receivedFollowRequests,
			hiddenStory,
			pendingFollowRequests,
			recentlyUnfollowed,
			notFollowingBack,
			notFollowingYouBack,
			mutualFollows,
			followRatio: parseFloat(followRatio),
			totalConnections: users.length,
		};
	});

	const recentActivity = createMemo(() => {
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		return {
			recentFollowers: stats().followers.filter(
				(u) => u.follower?.timestamp && u.follower.timestamp > thirtyDaysAgo,
			),
			recentFollowing: stats().following.filter(
				(u) => u.following?.timestamp && u.following.timestamp > thirtyDaysAgo,
			),
			recentUnfollowed: stats().recentlyUnfollowed.filter(
				(u) => u.recently_unfollowed?.timestamp && u.recently_unfollowed.timestamp > thirtyDaysAgo,
			),
		};
	});

	return (
		<div class="space-y-6">
			{/* Overview Stats */}
			<div class="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
				<h2 class="text-2xl font-bold mb-6 text-white">Connection Overview</h2>

				<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
					<MetricCard title="Followers" value={stats().followers.length} color="blue" icon="👥" />
					<MetricCard title="Following" value={stats().following.length} color="green" icon="➕" />
					<MetricCard title="Mutual Follows" value={stats().mutualFollows.length} color="purple" icon="🤝" />
					<MetricCard title="Close Friends" value={stats().closeFriends.length} color="pink" icon="💕" />
				</div>

				<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
					<MetricCard
						title="Follow Ratio"
						value={stats().followRatio}
						subtitle="Following/Followers"
						color="orange"
					/>
					<MetricCard
						title="Not Following Back"
						value={stats().notFollowingBack.length}
						subtitle="They follow you"
						color="red"
					/>
					<MetricCard
						title="Don't Follow Back"
						value={stats().notFollowingYouBack.length}
						subtitle="You follow them"
						color="yellow"
					/>
					<MetricCard
						title="Pending Requests"
						value={stats().pendingFollowRequests.length}
						color="gray"
						icon="⏳"
					/>
				</div>
			</div>

			{/* Recent Activity */}
			<div class="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
				<h3 class="text-xl font-bold mb-4 text-white">Recent Activity (Last 30 Days)</h3>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div class="bg-green-900 border border-green-700 p-4 rounded-lg text-center">
						<div class="text-2xl font-bold text-green-300">{recentActivity().recentFollowers.length}</div>
						<div class="text-green-200 font-medium">New Followers</div>
					</div>
					<div class="bg-blue-900 border border-blue-700 p-4 rounded-lg text-center">
						<div class="text-2xl font-bold text-blue-300">{recentActivity().recentFollowing.length}</div>
						<div class="text-blue-200 font-medium">Started Following</div>
					</div>
					<div class="bg-red-900 border border-red-700 p-4 rounded-lg text-center">
						<div class="text-2xl font-bold text-red-300">{recentActivity().recentUnfollowed.length}</div>
						<div class="text-red-200 font-medium">Recently Unfollowed</div>
					</div>
				</div>
			</div>

			{/* Detailed Lists */}
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<UserList
					title="Followers Not Following Back"
					users={stats().notFollowingBack}
					showTimestamps={true}
					timestampKey="follower"
					emptyMessage="All your followers follow you back! 🎉"
				/>

				<UserList
					title="Following But Not Following Back"
					users={stats().notFollowingYouBack}
					showTimestamps={true}
					timestampKey="following"
					emptyMessage="Everyone you follow follows you back! 🎉"
				/>

				<UserList
					title="Close Friends"
					users={stats().closeFriends}
					showTimestamps={true}
					timestampKey="close_friends"
					emptyMessage="No close friends added yet"
				/>

				<UserList
					title="Pending Follow Requests"
					users={stats().pendingFollowRequests}
					showTimestamps={true}
					timestampKey="pending_follow_request"
					emptyMessage="No pending requests"
				/>

				<UserList
					title="Hidden From Stories"
					users={stats().hiddenStory}
					showTimestamps={true}
					timestampKey="hidden_story_from"
					emptyMessage="Not hiding stories from anyone"
				/>

				<UserList
					title="Recently Unfollowed"
					users={stats().recentlyUnfollowed}
					showTimestamps={true}
					timestampKey="recently_unfollowed"
					emptyMessage="Haven't unfollowed anyone recently"
				/>

				<UserList
					title="Received Follow Requests"
					users={stats().receivedFollowRequests}
					showTimestamps={true}
					timestampKey="requested_to_follow_you"
					emptyMessage="No follow requests received"
				/>

				<Show when={stats().blocked.length > 0}>
					<UserList
						title="Blocked Users"
						users={stats().blocked}
						showTimestamps={true}
						timestampKey="blocked"
						emptyMessage="No blocked users"
					/>
				</Show>
			</div>
		</div>
	);
};

export default ConnectionsAnalysis;
