import { type Component, Show, createMemo, createSignal, For, onMount } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { createStore, type SetStoreFunction } from "solid-js/store";
import Layout from "@/components/Layout";
import AnalysisTabs from "@/components/analysis/AnalysisTabs";
import { isTabId, TAB_ITEMS, type ConversationRow, type TabId } from "@/components/analysis/analysisTypes";
import { Button, NavigationLink } from "@/components/ui";
import { db, type StoredUser } from "@/db/database";
import { isDataLoaded, clearData } from "@/utils/storage";
import { readAnalysisCache, writeAnalysisCache } from "@/utils/analysisCache";
import type { CachedAnalysis } from "@/types/analysis";
import type { User } from "@/types/user";
import logo from "@/assets/logo.svg";

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
	const [user, people, conversations, messages] = await Promise.all([
		db.mainUser.toCollection().first(),
		db.users.toArray(),
		db.conversations.toArray(),
		db.messages.toArray(),
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

	return {
		user: user || null,
		people,
		conversationRows,
	};
};

interface AnalysisSearchParams {
	[key: string]: string | string[] | undefined;
	tab?: string;
}

const Analysis: Component = () => {
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams<AnalysisSearchParams>();
	const [analysis, setAnalysis] = createStore<CachedAnalysis>({});
	const [user, setUser] = createSignal<User | null>(null);
	const [people, setPeople] = createSignal<StoredUser[]>([]);
	const [conversations, setConversations] = createSignal<ConversationRow[]>([]);
	const [loading, setLoading] = createSignal(true);

	const activeTab = createMemo<TabId>(() => {
		const tab = searchParams.tab;
		return typeof tab === "string" && isTabId(tab) ? tab : "highlights";
	});

	const setActiveTab = (tab: TabId) => setSearchParams({ tab: tab === "highlights" ? null : tab }, { replace: true });

	onMount(async () => {
		if (!isDataLoaded()) {
			navigate("/", { replace: true });
			return;
		}

		try {
			const [dataPackage] = await Promise.all([loadDataPackage(), createAnalysis(analysis, setAnalysis)]);
			setUser(dataPackage.user);
			setPeople(dataPackage.people);
			setConversations(dataPackage.conversationRows);
		} catch (error) {
			console.error("Failed to load analysis data package:", error);
		} finally {
			setLoading(false);
		}
	});

	return (
		<Layout>
			<div class="container mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8">
				<header class="mb-5 flex flex-col gap-3 border-b border-edge pb-4 sm:mb-7">
					<div class="flex flex-col items-center gap-3 sm:grid sm:grid-cols-3 sm:items-center sm:gap-4">
						<div class="flex items-center gap-2.5 sm:col-start-2 sm:justify-self-center">
							<img src={logo} alt="Scrollback Logo" class="h-8 w-8" />
							<span class="font-sans text-xl font-bold tracking-tight text-gray-100">Scrollback</span>
						</div>
						<div class="flex items-center justify-center gap-2 sm:col-start-3 sm:justify-self-end">
							<NavigationLink href="/export">Export</NavigationLink>
							<ClearButton />
						</div>
					</div>

					<nav
						aria-label="Analysis sections"
						class="mx-auto flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-xl border border-edge bg-surface p-[3px]"
					>
						<For each={TAB_ITEMS}>
							{(tab) => (
								<button
									type="button"
									class={`flex cursor-pointer items-center justify-center whitespace-nowrap rounded-[0.625rem] px-3.5 py-1.5 text-[0.8125rem] font-medium text-gray-400 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple ${
										activeTab() === tab.id
											? "bg-purple font-semibold text-purple-fill hover:bg-purple hover:text-purple-fill"
											: "hover:bg-white/5 hover:text-gray-200"
									}`}
									aria-current={activeTab() === tab.id ? "page" : undefined}
									onClick={() => setActiveTab(tab.id)}
								>
									{tab.label}
								</button>
							)}
						</For>
					</nav>
				</header>

				<AnalysisTabs
					analysis={analysis}
					user={user()}
					people={people()}
					conversations={conversations()}
					loading={loading()}
				/>
			</div>
		</Layout>
	);
};

export default Analysis;
