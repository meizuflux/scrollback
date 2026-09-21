import type { CategoryId } from "./inventory.ts";
export interface FamilyMatch {
	id: string;
	name: string;
	pathContext: string;
	rule: string;
	categoryId: CategoryId;
	registered: boolean;
	part?: number;
}
const pretty = (value: string) => value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const exactCategories: Readonly<Record<string, CategoryId>> = {
	"_demo_data_manifest.json": "tool-metadata",
};

const categoryPrefixes: ReadonlyArray<readonly [prefix: string, category: CategoryId]> = [
	["your_instagram_activity/messages/", "messages"],
	["connections/", "connections"],
	["your_instagram_activity/media/", "content"],
	["your_instagram_activity/", "interactions"],
	["personal_information/", "personal-information"],
	["ads_information/", "ads"],
];

function categoryForPath(path: string): CategoryId {
	const exact = exactCategories[path];
	if (exact) return exact;
	return categoryPrefixes.find(([prefix]) => path.startsWith(prefix))?.[1] ?? "other";
}
const rules: Array<[RegExp, string, string, string, CategoryId]> = [
	[
		/^connections\/followers_and_following\/followers_(\d+)\.json$/,
		"followers",
		"Followers",
		"followers_{n}.json",
		"connections",
	],
	[
		/^connections\/followers_and_following\/(following|blocked_profiles|close_friends|pending_follow_requests|follow_requests_you've_received|recent_follow_requests|recently_unfollowed|recently_unfollowed_profiles|removed_suggestions|hide_story_from)\.json$/,
		"connections-$1",
		"",
		"Known connections path",
		"connections",
	],
	[
		/^your_instagram_activity\/messages\/inbox\/[^/]+\/message_(\d+)\.json$/,
		"inbox-messages",
		"Inbox messages",
		"messages/inbox/{thread}/message_{n}.json",
		"messages",
	],
	[
		/^your_instagram_activity\/messages\/message_requests\/[^/]+\/message_(\d+)\.json$/,
		"message-request-messages",
		"Message requests",
		"messages/message_requests/{thread}/message_{n}.json",
		"messages",
	],
	[
		/^your_instagram_activity\/media\/(posts|archived_posts)(?:_(\d+))?\.json$/,
		"media-$1",
		"",
		"Known media numbered path",
		"content",
	],
	[/^your_instagram_activity\/media\/stories\.json$/, "stories", "Stories", "Exact known stories path", "content"],
	[
		/^your_instagram_activity\/media\/(other_content|profile_photos|reposts)\.json$/,
		"media-$1",
		"",
		"Known media path",
		"content",
	],
	[
		/^your_instagram_activity\/comments\/post_comments_(\d+)\.json$/,
		"post-comments",
		"Post comments",
		"comments/post_comments_{n}.json",
		"interactions",
	],
	[
		/^your_instagram_activity\/(likes\/liked_posts|saved\/saved_posts|story_interactions\/story_likes|ai\/interest_categories|comments\/reels_comments|gifts\/your_stars_transfers|instants\/your_instants|likes\/liked_comments|monetization\/eligibility|other_activity\/surveys|other_activity\/your_information_download_requests|saved\/saved_collections|saved\/saved_music|shopping\/checkout_payment_information|story_interactions\/emoji_sliders|story_interactions\/emoji_story_reactions|story_interactions\/polls|story_interactions\/questions|story_interactions\/stories_viewed)\.json$/,
		"activity-$1",
		"",
		"Known interaction path",
		"interactions",
	],
	[
		/^personal_information\/personal_information(\/profile_changes)?\.json$/,
		"personal-$1",
		"",
		"Known personal-information path",
		"personal-information",
	],
	[
		/^personal_information\/information_about_you\/(.+)\.json$/,
		"personal-detail-$1",
		"",
		"Known personal-information detail path",
		"personal-information",
	],
	[
		/^personal_information\/(device_information\/device_camera_effects_support|personal_information\/(instagram_friend_map|instagram_profile_information|note_and_repost_interactions|personal_information))\.json$/,
		"personal-detail-$1",
		"",
		"Known personal-information path",
		"personal-information",
	],
	[/^ads_information\/(.+)\.json$/, "ads-$1", "", "Known ads/activity path", "ads"],
	[
		/^apps_and_websites_off_of_instagram\/apps_and_websites\/(your_activity_off_meta_technologies_settings|your_activity_off_meta_technologies)\.json$/,
		"apps-and-websites-$1",
		"",
		"Known apps and websites path",
		"other",
	],
	[
		/^logged_information\/(link_history\/your_link_history_settings|past_instagram_insights\/(audience_insights|content_interactions|live_videos|profiles_reached)|recent_searches\/(profile_searches|recent_searches|word_or_phrase_searches))\.json$/,
		"logged-information-$1",
		"",
		"Known logged-information path",
		"other",
	],
	[
		/^preferences\/(settings\/(consents|filtered_keywords_for_posts|notification_preferences)|your_topics\/your_ads_see_more\/see_less_topics)\.json$/,
		"preferences-$1",
		"",
		"Known preferences path",
		"other",
	],
	[
		/^security_and_login_information\/login_and_profile_creation\/(last_known_location|login_activity|profile_activity|profile_privacy_changes|profile_status_changes|signup_details)\.json$/,
		"security-$1",
		"",
		"Known security and login path",
		"other",
	],
];
export function matchFamily(path: string): FamilyMatch {
	for (const [pattern, baseId, fixedName, rule, categoryId] of rules) {
		const hit = path.match(pattern);
		if (hit) {
			const value = hit[1] || baseId;
			return {
				id: `${categoryId}:${baseId.replace("$1", value)}`,
				name: fixedName || pretty(value.split("/").at(-1)!),
				pathContext: path.slice(0, path.lastIndexOf("/")) || "(root)",
				rule,
				categoryId,
				registered: true,
				part: /^\d+$/.test(hit.at(-1) ?? "") ? Number(hit.at(-1)) : undefined,
			};
		}
	}
	const parent = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "",
		filename = path
			.split("/")
			.at(-1)!
			.replace(/\.json$/i, ""),
		numbered = filename.match(/^(.*)_(\d+)$/),
		stem = numbered?.[1] ?? filename;
	return {
		id: `${categoryForPath(path)}:${parent}/${stem}`,
		name: pretty(stem),
		pathContext: parent || "(root)",
		rule: numbered ? "Unregistered numeric suffix within this directory" : "Unregistered exact path",
		categoryId: categoryForPath(path),
		registered: false,
		part: numbered ? Number(numbered[2]) : undefined,
	};
}
export const categoryName: Record<CategoryId, string> = {
	messages: "Messages",
	connections: "Connections",
	content: "Content",
	interactions: "Interactions",
	"personal-information": "Personal information",
	ads: "Ads and activity",
	"tool-metadata": "Tool metadata",
	other: "Other archive sections",
};
