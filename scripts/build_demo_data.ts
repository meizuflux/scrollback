import { execFileSync } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { exponentialDistributor, faker } from "@faker-js/faker";

// everything we need to configure should be right here
const TOTAL_PEOPLE = faker.number.int({ min: 60, max: 100 });
const FOLLOWERS = faker.number.int({ min: TOTAL_PEOPLE - 10, max: TOTAL_PEOPLE });
const FOLLOWING = faker.number.int({ min: TOTAL_PEOPLE - 10, max: TOTAL_PEOPLE });
const MESSAGED_PEOPLE = ~~(TOTAL_PEOPLE * .25);

const GROUPS = [
    { name: "Weekend Plans", count: faker.number.int({ min: 2, max: 10 }) },
    { name: "Book Club", count: faker.number.int({ min: 2, max: 10 }) },
    { name: "Best Friends", count: faker.number.int({ min: 2, max: 10 }) },
    { name: "Game Night", count: faker.number.int({ min: 2, max: 10 }) },
    { name: "Summer Trip Planning", count: faker.number.int({ min: 2, max: 10 }) },
]

// custom distributor here because most messages are going to not have that many chats
const DIRECT_MESSAGE_VARS = { min: 2, max: 1000, distributor: exponentialDistributor({ bias: -100 }) }
const GROUP_MESSAGE_VARS = { min: 2, max: 1000, distributor: exponentialDistributor({ bias: -100 }) };

const DEMO_END_MS = Date.now();
const DEMO_START_MS = DEMO_END_MS - 365 * 24 * 60 * 60 * 1000;
const DEMO_START_SECONDS = Math.floor(DEMO_START_MS / 1000);

type Person = {
	name: string;
	username: string;
};

type StringListItem = {
	href: string;
	value: string;
	timestamp: number;
};

type RawReaction = {
	reaction: string;
	actor: string;
};

type RawMessage = {
	sender_name: string;
	timestamp_ms: number;
	content?: string;
	reactions?: RawReaction[];
	share?: { link: string };
};

type RawConversation = {
	participants: Array<{ name: string }>;
	messages: RawMessage[];
	title: string;
	is_still_participant: boolean;
	thread_path: string;
};

const OUTPUT_DIRECTORY = "public/demo_data";
const generatedFilePaths = new Set<string>();

const encodeInstagramString = (value: string): string => {
	const bytes = new TextEncoder().encode(value);
	return String.fromCharCode(...bytes);
};

/*
const slugify = (value: string): string =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, ""); */

const asSeconds = (date: Date): number => Math.floor(date.getTime() / 1000);

const getCurrentGitCommit = (): string => {
	try {
		const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], {
			cwd: process.cwd(),
			encoding: "utf8",
		}).trim();
		return sourceCommit;
	} catch {
		return "unknown";
	}
};

const writeJson = async (relativePath: string, value: unknown): Promise<void> => {
	generatedFilePaths.add(relativePath);
	const absolutePath = resolve(OUTPUT_DIRECTORY, relativePath);
	await mkdir(dirname(absolutePath), { recursive: true });
	await writeFile(absolutePath, `${JSON.stringify(value, null, 4)}\n`, "utf8");
};

const capitalize = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};

const buildUsername = (name: string): string => {
    const templates = [
        () => `${faker.word.adjective()}_${faker.animal.type()}${faker.number.int({ min: 1, max: 99 })}`,
        () => `${faker.helpers.slugify(name).replace(/-/g, "").slice(0, 18)}${faker.number.int({ min: 0, max: 9 })}`,
        () => `${capitalize(faker.word.noun())}_${capitalize(faker.animal.type())}${faker.number.int({ min: 1000, max: 9999 })}`,
        () => `${capitalize(faker.color.human())}_${capitalize(faker.animal.type())}`
    ]

    return faker.helpers.slugify(faker.helpers.arrayElement(templates)()).replace("-", "_").toLowerCase();
}


const buildPeople = (): { account: Person; people: Person[] } => {
    // we can't use faker.person.fullName since for some reason it includes prefixes like "mr" or "ms"
    const accountName = faker.person.firstName() + " " + faker.person.lastName();
	const account: Person = {
		name: accountName,
		username: `demo_${buildUsername(accountName)}`,
	};

	const people: Person[] = [];
	const usernames = new Set([account.username]);

	while (people.length < TOTAL_PEOPLE) {
        let name = faker.person.firstName();

        // TODO: have this be a global var up top
        if (faker.number.float() > .7) {
            name += " " + faker.person.lastName();
        }

		const username = buildUsername(name);
		if (usernames.has(username)) continue;

		usernames.add(username);
		people.push({ name, username });
	}

	return { account, people };
};

const samplePeople = (people: Person[], count: number): Person[] => faker.helpers.shuffle(people).slice(0, count);

const connectionEntry = (person: Person) => {
	const timestamp =
		DEMO_START_SECONDS + faker.number.int({ min: 0, max: Math.floor((DEMO_END_MS - DEMO_START_MS) / 1_000) });
	const stringListData: StringListItem = {
		href: "",
		value: person.username,
		timestamp,
	};

	return {
		title: person.username,
		string_list_data: [stringListData],
	};
};

const connectionList = (people: Person[], count: number) =>
	samplePeople(people, count).map((person) => connectionEntry(person));

const buildRelationshipFiles = (people: Person[], followers: Person[], following: Person[]) => {
	const followerUsernames = new Set(followers.map((person) => person.username));
	const followingUsernames = new Set(following.map((person) => person.username));
	const notFollowers = people.filter((person) => !followerUsernames.has(person.username));
	const notFollowing = people.filter((person) => !followingUsernames.has(person.username));

	return {
		blocked: connectionList(people, faker.number.int({ min: 2, max: 6 })),
		closeFriends: connectionList(following, faker.number.int({ min: 5, max: 12 })),
		followRequestsReceived: connectionList(notFollowers, faker.number.int({ min: 2, max: 6 })),
		hiddenStoryFrom: connectionList(followers, faker.number.int({ min: 4, max: 9 })),
		pendingFollowRequests: connectionList(notFollowing, faker.number.int({ min: 2, max: 6 })),
		recentlyUnfollowed: connectionList(people, faker.number.int({ min: 4, max: 10 })),
	};
};

const messageText = (recipient: Person): string => {
	const templates = [
		() => `Hey ${recipient.name.split(" ")[0]}, ${faker.lorem.sentence({ min: 4, max: 9 })}`,
		() => `That sounds good — ${faker.lorem.words({ min: 3, max: 7 })}.`,
		() => `I saved that for later ${faker.helpers.arrayElement(["✨", "👍", "😄", "🙌"])}.`,
		() => `${faker.lorem.sentence({ min: 5, max: 11 })}`,
	];

	return faker.helpers.arrayElement(templates)();
};

const buildMessages = (
	account: Person,
	participants: Person[],
	messageCount: number,
	threadIndex: number,
): RawMessage[] => {
	const messages: RawMessage[] = [];
	const otherParticipants = participants.filter((participant) => participant.username !== account.username);
	const accountMessageShare = faker.number.int({ min: 35, max: 55 });
	const threadDuration = Math.max(1, DEMO_END_MS - DEMO_START_MS - threadIndex * 86_400 * 5);
	const threadStart = DEMO_START_MS + threadIndex * 86_400 * 5;

	for (let index = 0; index < messageCount; index++) {
		const sender =
			index === 0 || faker.number.int({ min: 1, max: 100 }) <= accountMessageShare
				? account
				: (otherParticipants[faker.number.int({ min: 0, max: otherParticipants.length - 1 })] ?? account);
		const receiver = participants.find((participant) => participant.username !== sender.username) ?? account;
		const timestamp =
			threadStart +
			Math.floor((index / Math.max(1, messageCount - 1)) * threadDuration) +
			faker.number.int({ min: 0, max: Math.min(6 * 60 * 1_000, Math.floor(threadDuration / 100)) });
		const message: RawMessage = {
			// The current importer identifies the account by profile Name for message statistics.
			sender_name: encodeInstagramString(sender.name),
			timestamp_ms: timestamp,
		};

		const messageKind = faker.number.int({ min: 1, max: 100 });
		if (messageKind <= 7) {
			message.share = {
				link: `https://www.instagram.com/${faker.helpers.arrayElement(["reel", "p"])}/demo-${threadIndex}-${index}/`,
			};
		} else if (messageKind <= 10) {
			message.content = encodeInstagramString("sent an attachment.");
		} else {
			message.content = encodeInstagramString(messageText(receiver));
		}

		const reactionCount = index === 0 ? 1 : faker.number.int({ min: 0, max: 2 });
		if (reactionCount > 0) {
			message.reactions = Array.from({ length: reactionCount }, (_, reactionIndex) => {
				const actor =
					reactionIndex === 0 && index % 10 === 0
						? account.name
						: (otherParticipants[faker.number.int({ min: 0, max: otherParticipants.length - 1 })]?.name ??
							account.name);
				return {
					reaction: encodeInstagramString(faker.helpers.arrayElement(["❤️", "😂", "🔥", "👏"])),
					actor,
				};
			});
		}

		messages.push(message);
	}

	return messages;
};

const buildConversation = (
	account: Person,
	participants: Person[],
	title: string,
	threadIndex: number,
	isGroup: boolean,
): RawConversation => {
	const allParticipants = [account, ...participants];
	const messageCount = isGroup
		? faker.number.int(GROUP_MESSAGE_VARS)
		: faker.number.int(DIRECT_MESSAGE_VARS);

    const messages = buildMessages(account, allParticipants, messageCount, threadIndex);

	if (isGroup) {
		messages.unshift({
			sender_name: encodeInstagramString(account.name),
			timestamp_ms: DEMO_START_MS + threadIndex * 86_400 * 5,
			content: encodeInstagramString("You created the group"),
		});
	}

	return {
		participants: allParticipants.map((participant) => ({ name: encodeInstagramString(participant.name) })),
		messages,
		title: encodeInstagramString(title),
		is_still_participant: true,
		thread_path: `inbox/${faker.helpers.slugify(title)}`,
	};
};

const buildProfile = (account: Person) => ({
	profile_user: [
		{
			string_map_data: {
				Username: { value: account.username },
				Name: { value: account.name },
				Email: { value: `${account.username}@example.com` },
				Bio: { value: "Collecting small moments and good conversations." },
				Gender: { value: "Prefer not to say" },
				"Private Account": { value: "false" },
				"Date of birth": { value: "1995-04-18" },
			},
		},
	],
});

const buildActivityFiles = (account: Person, people: Person[]) => {
	const now = asSeconds(new Date(DEMO_END_MS));
	const viewed = (count: number, label: string) =>
		Array.from({ length: count }, (_, index) => ({
			title: label,
			timestamp: now - index * 3_600,
		}));

	const posts = Array.from({ length: 8 }, (_, index) => ({
		title: account.username,
		creation_timestamp: DEMO_START_SECONDS + index * 2_592_000,
		media: [],
	}));

	const archivedPosts = Array.from({ length: 2 }, (_, index) => ({
		title: account.username,
		creation_timestamp: DEMO_START_SECONDS - (index + 1) * 2_592_000,
		media: [],
	}));

	return {
		profileBasedIn: {
			label_values: [
				{
					label: "Profile based in",
					dict: [
						{ label: "City", value: faker.location.city() },
						{ label: "Region", value: faker.location.state() },
						{ label: "Country", value: faker.location.country() },
					],
				},
			],
		},
		locationsOfInterest: {
			label_values: [
				{
					label: "Locations of interest",
					vec: Array.from({ length: 3 }, () => ({ value: faker.location.city() })),
				},
			],
		},
		videosWatched: { impressions_history_videos_watched: viewed(18, "demo-video") },
		notInterestedProfiles: { impressions_history_recs_hidden_authors: viewed(3, "demo-profile") },
		notInterestedPosts: { impressions_history_posts_not_interested: viewed(4, "demo-post") },
		postsViewed: { impressions_history_posts_seen: viewed(42, "demo-post") },
		adsViewed: { impressions_history_ads_seen: viewed(12, "demo-ad") },
		posts,
		archivedPosts,
		stories: { ig_stories: [] },
		storyLikes: {
			story_activities_story_likes: samplePeople(people, faker.number.int({ min: 4, max: 10 })).map(
				(person, index) => ({
					title: person.username,
					string_list_data: [{ timestamp: now - index * 86_400 }],
				}),
			),
		},
	};
};

const buildInteractions = (people: Person[]) => {
	const interactionTime = DEMO_START_SECONDS + 90 * 86_400;
	const likedPeople = samplePeople(people, faker.number.int({ min: 8, max: 16 }));
	const savedPeople = samplePeople(people, faker.number.int({ min: 5, max: 12 }));
	const commentedPeople = samplePeople(people, faker.number.int({ min: 5, max: 12 }));

	return {
		likedPosts: {
			likes_media_likes: likedPeople.map((person, index) => ({
				title: person.username,
				string_list_data: [
					{
						href: `https://www.instagram.com/p/demo-like-${index}/`,
						timestamp: interactionTime + index * 1_800,
					},
				],
			})),
		},
		savedPosts: {
			saved_saved_media: savedPeople.map((person, index) => ({
				title: person.username,
				string_map_data: {
					"Saved on": {
						href: `https://www.instagram.com/p/demo-saved-${index}/`,
						timestamp: interactionTime + index * 3_600,
						value: "Saved on",
					},
				},
			})),
		},
		comments: commentedPeople.map((person, index) => ({
			string_map_data: {
				"Media Owner": { value: person.username },
				Comment: { value: encodeInstagramString(faker.lorem.sentence({ min: 4, max: 10 })) },
				Time: { timestamp: interactionTime + index * 7_200 },
			},
		})),
	};
};

const buildProfileChanges = (account: Person) => ({
	profile_profile_change: [
		{
			string_map_data: {
				Changed: { value: "Bio" },
				"Previous Value": { value: "Finding the good stuff." },
				"New Value": { value: "Collecting small moments and good conversations." },
				"Change Date": { timestamp: DEMO_START_SECONDS + 30 * 86_400 },
			},
		},
		{
			string_map_data: {
				Changed: { value: "Username" },
				"Previous Value": { value: `old_${account.username}` },
				"New Value": { value: account.username },
				"Change Date": { timestamp: DEMO_START_SECONDS + 60 * 86_400 },
			},
		},
	],
});

const buildDemoData = async (): Promise<void> => {
	await rm(OUTPUT_DIRECTORY, { recursive: true, force: true });
	await mkdir(OUTPUT_DIRECTORY, { recursive: true });

	const { account, people } = buildPeople();
	const followers = samplePeople(people, FOLLOWERS);
	const following = samplePeople(people, FOLLOWING);
	const relationships = buildRelationshipFiles(people, followers, following);

	const messagedPeople = samplePeople(following, MESSAGED_PEOPLE);

	const activity = buildActivityFiles(account, people);
	const interactions = buildInteractions(people);
	const directConversations = messagedPeople.map((person, index) =>
		buildConversation(account, [person], person.name, index, false),
	);
	const groupConversations = GROUPS.map((title, index) => ({
		title: title.name,
		conversation: buildConversation(
			account,
			samplePeople(messagedPeople, title.count),
			title.name,
			messagedPeople.length + index,
			true,
		),
	}));
	const allConversations = [...directConversations, ...groupConversations.map(({ conversation }) => conversation)];
	const totalMessages = allConversations.reduce((total, conversation) => total + conversation.messages.length, 0);
	const gitCommit = getCurrentGitCommit();

	await Promise.all([
		writeJson("personal_information/personal_information.json", buildProfile(account)),
		writeJson("personal_information/information_about_you/profile_based_in.json", activity.profileBasedIn),
		writeJson(
			"personal_information/information_about_you/locations_of_interest.json",
			activity.locationsOfInterest,
		),
		writeJson("personal_information/personal_information/profile_changes.json", buildProfileChanges(account)),
		writeJson("ads_information/ads_and_topics/videos_watched.json", activity.videosWatched),
		writeJson(
			"ads_information/ads_and_topics/profiles_you're_not_interested_in.json",
			activity.notInterestedProfiles,
		),
		writeJson("ads_information/ads_and_topics/posts_you're_not_interested_in.json", activity.notInterestedPosts),
		writeJson("ads_information/ads_and_topics/posts_viewed.json", activity.postsViewed),
		writeJson("ads_information/ads_and_topics/ads_viewed.json", activity.adsViewed),
		writeJson("connections/followers_and_following/followers_1.json", followers.map(connectionEntry)),
		writeJson("connections/followers_and_following/following.json", {
			relationships_following: following.map(connectionEntry),
		}),
		writeJson("connections/followers_and_following/blocked_profiles.json", relationships.blocked),
		writeJson("connections/followers_and_following/close_friends.json", relationships.closeFriends),
		writeJson(
			"connections/followers_and_following/follow_requests_you've_received.json",
			relationships.followRequestsReceived,
		),
		writeJson("connections/followers_and_following/hide_story_from.json", relationships.hiddenStoryFrom),
		writeJson(
			"connections/followers_and_following/pending_follow_requests.json",
			relationships.pendingFollowRequests,
		),
		writeJson(
			"connections/followers_and_following/recently_unfollowed_profiles.json",
			relationships.recentlyUnfollowed,
		),
		writeJson("your_instagram_activity/media/posts_1.json", activity.posts),
		writeJson("your_instagram_activity/media/archived_posts.json", {
			ig_archived_post_media: activity.archivedPosts,
		}),
		writeJson("your_instagram_activity/media/stories.json", activity.stories),
		writeJson("your_instagram_activity/story_interactions/story_likes.json", activity.storyLikes),
		writeJson("your_instagram_activity/likes/liked_posts.json", interactions.likedPosts),
		writeJson("your_instagram_activity/saved/saved_posts.json", interactions.savedPosts),
		writeJson("your_instagram_activity/comments/post_comments_1.json", interactions.comments),
	]);

	await Promise.all([
		...directConversations.map((conversation, index) =>
			writeJson(
				`your_instagram_activity/messages/inbox/${messagedPeople[index].username}/message_1.json`,
				conversation,
			),
		),
		...groupConversations.map(({ title, conversation }) =>
			writeJson(`your_instagram_activity/messages/inbox/${faker.helpers.slugify(title).toLowerCase()}/message_1.json`, conversation),
		),
		writeJson("_demo_data_manifest.json", {
			_generated: true,
            generator: "scripts/build_demo_data.ts",
            sourceCommit: gitCommit,

            files: [...generatedFilePaths].sort(),
		}),
	]);

	console.log(`Generated demo data in ${OUTPUT_DIRECTORY}`);
	console.log(`Account: ${account.name} (@${account.username})`);
	console.log(`People: ${people.length} (${followers.length} followers, ${following.length} following)`);
	console.log(
		`Conversations: ${messagedPeople.length} direct + ${groupConversations.length} groups, ${totalMessages} messages`,
	);
};

await buildDemoData();
