import { type Component, onMount, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { createStore, type SetStoreFunction } from "solid-js/store";
import Layout from "@/components/Layout";
import AnalysisTabs, { type ConversationRow } from "@/components/analysis/AnalysisTabs";
import { db, type StoredUser } from "@/db/database";
import { isDataLoaded, clearData } from "@/utils/storage";
import { isDemoMode } from "@/utils/demo";
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
		<button
			type="button"
			class="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg border border-red-700 bg-transparent px-4 py-2.5 text-sm font-semibold leading-5 text-red-200 transition-colors hover:border-red-200 hover:bg-red-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-200 disabled:cursor-not-allowed disabled:opacity-50"
			onClick={handleClear}
			disabled={isClearing()}
		>
			{isClearing() ? "Clearing…" : "Clear data"}
		</button>
	);
};

const createAnalysis = async (analysis: CachedAnalysis, setter: SetStoreFunction<CachedAnalysis>) => {
	const cached = localStorage.getItem("analysis_cache");
	if (cached) {
		const values = JSON.parse(cached) as CachedAnalysis;
		for (const [key, value] of Object.entries(values)) {
			setter(key as keyof CachedAnalysis, value as never);
		}
		if (!values.partial) return;
	}

	setter("partial", false);
	localStorage.setItem("analysis_cache", JSON.stringify(analysis));
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

const Analysis: Component = () => {
	const navigate = useNavigate();
	const [analysis, setAnalysis] = createStore<CachedAnalysis>({});
	const [user, setUser] = createSignal<User | null>(null);
	const [people, setPeople] = createSignal<StoredUser[]>([]);
	const [conversations, setConversations] = createSignal<ConversationRow[]>([]);
	const [loading, setLoading] = createSignal(true);

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
			<div class="container mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
				<div class="relative mb-8 flex flex-col items-center gap-4 sm:min-h-10 sm:justify-center">
					<div class="flex items-center gap-3">
						<img src={logo} alt="Scrollback Logo" class="h-8 w-8" />
						<h1 class="bg-gradient-to-r from-pink to-purple bg-clip-text font-sans text-2xl font-bold tracking-tight text-transparent drop-shadow-[0_0_24px_rgba(255,110,196,0.22)]">
							Scrollback
						</h1>
					</div>
					<div class="flex flex-wrap justify-center gap-2 sm:absolute sm:right-0 sm:top-1/2 sm:-translate-y-1/2">
						<button
							type="button"
							class="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg border border-gray-600 bg-transparent px-4 py-2.5 text-sm font-semibold leading-5 text-gray-100 transition-colors hover:border-purple hover:bg-purple/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
							onClick={() => navigate("/export")}
						>
							Export
						</button>
						<ClearButton />
					</div>
				</div>

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
