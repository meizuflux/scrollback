import { Component, For } from "solid-js";
import { StoredData, StoredUser } from "../types/user";

interface ConnectionsAnalysisProps {
	data: StoredData;
}

const ConnectionsAnalysis: Component<ConnectionsAnalysisProps> = (props) => {
	const users = props.data.users;

	const followers = users.filter((u) => u.follower);
	const following = users.filter((u) => u.following);
	const closeFriends = users.filter((u) => u.close_friends);
	const receivedFollowRequests = users.filter((u) => u.requested_to_follow_you);
	const hiddenStory = users.filter((u) => u.hidden_story_from);
	const pendingFollowRequests = users.filter((u) => u.pending_follow_request);
	const recentlyUnfollowed = users.filter((u) => u.recently_unfollowed);

	const followerUsernames = new Set(followers.map((u) => u.username));
	const followingUsernames = new Set(following.map((u) => u.username));

	const notFollowingBack = followers.filter((u) => !followingUsernames.has(u.username));
	const notFollowingYouBack = following.filter((u) => !followerUsernames.has(u.username));

	const createSection = (title: string, users2: StoredUser[]) => (
		<div class="mb-6">
			<h3 class="text-lg font-semibold mb-2">
				{title} ({users2.length})
			</h3>
			<ul class="list-disc pl-6">
				<For each={users2}>{(user) => <li>{user.username}</li>}</For>
			</ul>
		</div>
	);

	return (
		<div class="p-4">
			{createSection("Followers you don't follow back", notFollowingBack)}

			{createSection("People you follow who don't follow you back", notFollowingYouBack)}

			{/* createSection(
                "Blocked Users",
                blockedUsers
            ) */}

			{createSection("Close Friends", closeFriends)}

			{createSection("Follow Requests", receivedFollowRequests)}

			{createSection("Hidden Stories From", hiddenStory)}

			{createSection("Pending Follow Requests", pendingFollowRequests)}

			{createSection("Recently Unfollowed", recentlyUnfollowed)}
		</div>
	);
};

export default ConnectionsAnalysis;
