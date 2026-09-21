import { A, useLocation, useNavigate } from "@solidjs/router";
import { type Component, createSignal, For, onMount, type ParentProps, Show } from "solid-js";
import { createStore, type SetStoreFunction } from "solid-js/store";
import logo from "@/assets/logo.svg";
import { AnalysisDataContext, type ContentCounts, type EngagementCounts } from "@/components/analysis/analysisData";
import type { ConversationRow } from "@/components/analysis/analysisTypes";
import Layout from "@/components/Layout";
import { Button, LoadingState, NavigationLink } from "@/components/ui";
import { db, type StoredPost, type StoredUser } from "@/db/database";
import type { CachedAnalysis } from "@/types/analysis";
import type { ProfileChange, User } from "@/types/user";
import { readAnalysisCache, writeAnalysisCache } from "@/utils/analysisCache";
import { clearData, isDataLoaded } from "@/utils/storage";

const NAV_ITEMS: ReadonlyArray<{ href: string; label: string; end?: boolean }> = [
	{ href: "/analysis", label: "Highlights", end: true },
	{ href: "/analysis/people", label: "People" },
	{ href: "/analysis/conversations", label: "Conversations" },
	{ href: "/analysis/profile", label: "Profile" },
];

const ClearButton: Component = () => {
	const navigate = useNavigate();
	const [isClearing, setIsClearing] = createSignal(false);

	const handleClear = async () => {
		setIsClearing(true);
		try {
			await clearData();
			navigate("/", { replace: true });
		} finally {
			setIsClearing(false);
		}
	};

	return (
		<Button variant="danger" onClick={handleClear} disabled={isClearing()}>
			<Show when={isClearing()} fallback="Clear data">
				Clearing…
			</Show>
		</Button>
	);
};

const createAnalysis = async (analysis: CachedAnalysis, setter: SetStoreFunction<CachedAnalysis>) => {
	const cached = readAnalysisCache();
	if (Object.keys(cached.analysis).length > 0) {
		for (const [key, value] of Object.entries(cached.analysis)) {
			setter(key as keyof CachedAnalysis, value as never);
		}
		if (!cached.partial) return;
	}

	setter("partial", false);
	writeAnalysisCache(analysis);
};

const loadDataPackage = async () => {
	const [user, people, conversations, messages, profileChanges, posts, stories, likedPosts, savedPosts, comments] =
		await Promise.all([
			db.mainUser.toCollection().first(),
			db.users.toArray(),
			db.conversations.toArray(),
			db.messages.toArray(),
			db.profileChanges.orderBy("timestamp").reverse().toArray(),
			db.posts.toArray(),
			db.stories.toArray(),
			db.likedPosts.count(),
			db.savedPosts.count(),
			db.comments.count(),
		]);

	const messageCounts = new Map<string, number>();
	const lastActivities = new Map<string, Date>();
	for (const message of messages) {
		messageCounts.set(message.conversation, (messageCounts.get(message.conversation) || 0) + 1);
		const timestamp = message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp);
		const previous = lastActivities.get(message.conversation);
		if (!Number.isNaN(timestamp.getTime()) && (!previous || timestamp > previous)) {
			lastActivities.set(message.conversation, timestamp);
		}
	}

	const conversationRows: ConversationRow[] = conversations.map((conversation) => ({
		title: conversation.title,
		participants: conversation.participants,
		is_group: conversation.is_group,
		messageCount: messageCounts.get(conversation.title) || 0,
		lastActivity: lastActivities.get(conversation.title),
	}));

	const contentCounts: ContentCounts = {
		posts: posts.filter((post) => !post.archived).length,
		archived: posts.filter((post) => post.archived).length,
		stories: stories.length,
	};
	const engagementCounts: EngagementCounts = {
		likedPosts,
		savedPosts,
		comments,
		storyLikes: people.reduce((sum, person) => sum + (person.stories_liked || 0), 0),
	};

	return {
		user: user || null,
		people,
		conversationRows,
		profileChanges,
		posts,
		contentCounts,
		engagementCounts,
	};
};

const AnalysisLayout: Component<ParentProps> = (props) => {
	const navigate = useNavigate();
	const location = useLocation();
	const [analysis, setAnalysis] = createStore<CachedAnalysis>({});
	const [user, setUser] = createSignal<User | null>(null);
	const [people, setPeople] = createSignal<StoredUser[]>([]);
	const [conversations, setConversations] = createSignal<ConversationRow[]>([]);
	const [profileChanges, setProfileChanges] = createSignal<ProfileChange[]>([]);
	const [posts, setPosts] = createSignal<StoredPost[]>([]);
	const [contentCounts, setContentCounts] = createSignal<ContentCounts>({ posts: 0, archived: 0, stories: 0 });
	const [engagementCounts, setEngagementCounts] = createSignal<EngagementCounts>({
		likedPosts: 0,
		savedPosts: 0,
		comments: 0,
		storyLikes: 0,
	});
	const [loading, setLoading] = createSignal(true);

	onMount(async () => {
		if (!isDataLoaded()) {
			sessionStorage.setItem("analysis_destination", `${location.pathname}${location.search}`);
			navigate("/", { replace: true });
			return;
		}

		try {
			const [dataPackage] = await Promise.all([loadDataPackage(), createAnalysis(analysis, setAnalysis)]);
			setUser(dataPackage.user);
			setPeople(dataPackage.people);
			setConversations(dataPackage.conversationRows);
			setProfileChanges(dataPackage.profileChanges);
			setPosts(dataPackage.posts);
			setContentCounts(dataPackage.contentCounts);
			setEngagementCounts(dataPackage.engagementCounts);
		} catch (error) {
			console.error("Failed to load analysis data package:", error);
		} finally {
			setLoading(false);
		}
	});

	return (
		<AnalysisDataContext.Provider
			value={{
				analysis,
				user,
				people,
				conversations,
				profileChanges,
				posts,
				contentCounts,
				engagementCounts,
				loading,
			}}
		>
			<Layout>
				<div class="container mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8">
					<header class="mb-5 flex flex-col border-b border-edge pb-4 sm:mb-7">
						<div class="flex flex-col items-center gap-3 sm:grid sm:grid-cols-3 sm:items-center sm:gap-4">
							<div class="flex items-center justify-center gap-2.5 sm:col-start-1 sm:justify-self-start">
								<img src={logo} alt="Scrollback Logo" class="h-8 w-8" />
								<span class="font-sans text-xl font-bold tracking-tight text-gray-100">Scrollback</span>
							</div>

							<nav
								aria-label="Analysis sections"
								class="mx-auto flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-xl border border-edge bg-surface p-[3px] sm:col-start-2 sm:justify-self-center"
							>
								<For each={NAV_ITEMS}>
									{(item) => (
										<A
											href={item.href}
											end={item.end}
											class="flex cursor-pointer items-center justify-center whitespace-nowrap rounded-[0.625rem] px-3.5 py-1.5 text-[0.8125rem] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
											activeClass="bg-purple font-semibold text-purple-fill hover:bg-purple hover:text-purple-fill"
											inactiveClass="text-gray-400 hover:bg-white/5 hover:text-gray-200"
										>
											{item.label}
										</A>
									)}
								</For>
							</nav>

							<div class="flex items-center justify-center gap-2 sm:col-start-3 sm:justify-self-end">
								<NavigationLink href="/export">Export</NavigationLink>
								<ClearButton />
							</div>
						</div>
					</header>

					<Show when={!loading()} fallback={<LoadingState label="Loading your data package…" />}>
						{props.children}
					</Show>
				</div>
			</Layout>
		</AnalysisDataContext.Provider>
	);
};

export default AnalysisLayout;
