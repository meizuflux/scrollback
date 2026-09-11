import { For, Show, createEffect, createMemo, createSignal, onCleanup, type Component } from "solid-js";
import type { CachedAnalysis } from "@/types/analysis";
import type { StoredUser } from "@/db/database";
import type { User } from "@/types/user";
import { createMediaURL } from "@/utils/media";
import { db } from "@/db/database";
import Overview from "@/components/analysis/Overview";

export type TabId = "highlights" | "people" | "conversations" | "profile";
export type PeopleFilter = "all" | "followers" | "following" | "mutuals" | "blocked";
export type ConversationTypeFilter = "all" | "direct" | "group";

export interface ConversationRow {
	title: string;
	participants: string[];
	is_group: boolean;
	messageCount: number;
	lastActivity?: Date;
}

interface AnalysisTabsProps {
	analysis: CachedAnalysis;
	user: User | null;
	people: StoredUser[];
	conversations: ConversationRow[];
	loading: boolean;
}

const tabItems: Array<{ id: TabId; label: string }> = [
	{ id: "highlights", label: "Highlights" },
	{ id: "people", label: "People" },
	{ id: "conversations", label: "Conversations" },
	{ id: "profile", label: "Profile" },
];

const mutedValue = (value: number | undefined) => (value === undefined ? "Unavailable" : value.toLocaleString());

const formatDate = (date: Date | undefined) => {
	if (!date || Number.isNaN(date.getTime())) return "Unavailable";
	return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const relationshipBadges = (person: StoredUser) => {
	const badges: Array<{ label: string; className: string }> = [];
	const badgeClass =
		"inline-flex items-center rounded-full border border-[#404040] bg-[#202020] px-2.5 py-1 text-xs font-semibold leading-4 text-[#C7C7C7]";
	if (person.blocked?.value) badges.push({ label: "Blocked", className: badgeClass });
	if (person.follower?.value) {
		badges.push({ label: "Follows you", className: badgeClass });
	}
	if (person.following?.value) {
		badges.push({ label: "Following", className: badgeClass });
	}
	if (person.close_friends?.value) {
		badges.push({ label: "Close friend", className: badgeClass });
	}
	return badges;
};

const initialsFor = (user: User | null) => {
	const value = user?.name || user?.username || "S";
	return value
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase())
		.join("");
};

const ProfileAvatar: Component<{ user: User | null; size?: "large" | "small" }> = (props) => {
	const [photoUrl, setPhotoUrl] = createSignal<string | null>(null);

	createEffect(() => {
		let active = true;
		let objectUrl: string | null = null;
		const photoUri = props.user?.profilePhotoUri;

		if (!photoUri) {
			setPhotoUrl(null);
			onCleanup(() => {
				active = false;
			});
			return;
		}

		void (async () => {
			const metadata = await db.media_metadata.get(photoUri);
			if (!metadata) return;
			objectUrl = await createMediaURL(metadata);
			if (active) {
				setPhotoUrl(objectUrl);
			} else if (objectUrl) {
				URL.revokeObjectURL(objectUrl);
			}
		})();

		onCleanup(() => {
			active = false;
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		});
	});

	const sizeClass = () => (props.size === "small" ? "h-12 w-12 text-base" : "h-28 w-28 text-3xl");

	return (
		<Show
			when={photoUrl()}
			fallback={
				<div
					class={`flex shrink-0 items-center justify-center rounded-full border border-[#4A4A4A] bg-[#303030] font-semibold text-[#F2F2F2] ${sizeClass()}`}
				>
					{initialsFor(props.user)}
				</div>
			}
		>
			<img
				src={photoUrl()!}
				alt="Profile"
				class={`shrink-0 rounded-full border border-[#303030] object-cover ${sizeClass()}`}
			/>
		</Show>
	);
};

const EmptyState: Component<{ title: string; description: string }> = (props) => (
	<div class="rounded-lg border border-[#303030] bg-[#181818] px-6 py-12 text-center">
		<p class="text-lg font-semibold text-[#F2F2F2]">{props.title}</p>
		<p class="mx-auto mt-2 max-w-md text-sm text-[#A3A3A3]">{props.description}</p>
	</div>
);

const ControlLabel: Component<{ label: string; children: any }> = (props) => (
	<label class="flex min-w-0 flex-col gap-2 text-sm font-medium text-[#A3A3A3]">
		<span>{props.label}</span>
		{props.children}
	</label>
);

const controlClass =
	"w-full min-h-10 rounded-lg border border-[#303030] bg-[#141414] px-3 py-2.5 text-sm leading-5 text-[#F2F2F2] outline-none placeholder:text-[#737373] transition-colors hover:border-[#4A4A4A] focus:border-[#7873F5] focus:bg-[#181818] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7873F5]";

const AnalysisTabs: Component<AnalysisTabsProps> = (props) => {
	const [activeTab, setActiveTab] = createSignal<TabId>("highlights");
	const [peopleSearch, setPeopleSearch] = createSignal("");
	const [peopleRelationship, setPeopleRelationship] = createSignal<PeopleFilter>("all");
	const [conversationSearch, setConversationSearch] = createSignal("");
	const [conversationType, setConversationType] = createSignal<ConversationTypeFilter>("all");
	const [minimumMessages, setMinimumMessages] = createSignal("");

	const filteredPeople = createMemo(() => {
		const query = peopleSearch().trim().toLocaleLowerCase();
		const relationship = peopleRelationship();

		return props.people
			.filter((person) => {
				const username = person.username.toLocaleLowerCase();
				if (query && !username.includes(query)) return false;
				switch (relationship) {
					case "followers":
						return person.follower?.value === true;
					case "following":
						return person.following?.value === true;
					case "mutuals":
						return person.follower?.value === true && person.following?.value === true;
					case "blocked":
						return person.blocked?.value === true;
					default:
						return true;
				}
			})
			.sort((a, b) => a.username.localeCompare(b.username, undefined, { sensitivity: "base" }));
	});

	const filteredConversations = createMemo(() => {
		const query = conversationSearch().trim().toLocaleLowerCase();
		const minimum = Math.max(0, Number.parseInt(minimumMessages(), 10) || 0);
		const type = conversationType();

		return props.conversations
			.filter((conversation) => {
				if (query) {
					const searchable = [conversation.title, ...conversation.participants].join(" ").toLocaleLowerCase();
					if (!searchable.includes(query)) return false;
				}
				if (type === "group" && !conversation.is_group) return false;
				if (type === "direct" && conversation.is_group) return false;
				return conversation.messageCount >= minimum;
			})
			.sort((a, b) => {
				const countDifference = b.messageCount - a.messageCount;
				return countDifference || a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
			});
	});

	const peopleFiltersActive = () => peopleSearch().trim().length > 0 || peopleRelationship() !== "all";
	const conversationFiltersActive = () =>
		conversationSearch().trim().length > 0 || conversationType() !== "all" || minimumMessages().trim().length > 0;

	const clearPeopleFilters = () => {
		setPeopleSearch("");
		setPeopleRelationship("all");
	};

	const clearConversationFilters = () => {
		setConversationSearch("");
		setConversationType("all");
		setMinimumMessages("");
	};

	const openPeopleFilter = (filter: PeopleFilter) => {
		setPeopleRelationship(filter);
		setActiveTab("people");
	};

	return (
		<div class="space-y-7">
			<div class="rounded-lg border border-[#303030] bg-[#181818] p-1">
				<nav class="grid grid-cols-2 gap-2 md:grid-cols-4" aria-label="Analysis sections">
					<For each={tabItems}>
						{(tab) => (
							<button
								type="button"
								class={`flex items-center justify-center rounded-lg border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${
									activeTab() === tab.id
										? "border-[#7873F5] bg-[#303030] text-[#F2F2F2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7873F5]"
										: "border-transparent text-[#A3A3A3] hover:bg-[#202020] hover:text-[#F2F2F2]"
								}`}
								aria-current={activeTab() === tab.id ? "page" : undefined}
								onClick={() => setActiveTab(tab.id)}
							>
								{tab.label}
							</button>
						)}
					</For>
				</nav>
			</div>

			<Show
				when={!props.loading}
				fallback={
					<div class="rounded-lg border border-[#303030] bg-[#181818] p-12 text-center text-[#A3A3A3]">
						Loading your imported snapshot…
					</div>
				}
			>
				<Show when={activeTab() === "highlights"}>
					<Overview analysis={props.analysis} />
				</Show>

				<Show when={activeTab() === "people"}>
					<section class="space-y-5">
						<div>
							<p class="mb-3 bg-gradient-to-r from-[#FF6EC4] to-[#7873F5] bg-clip-text text-xs font-bold uppercase tracking-[0.16em] leading-4 text-transparent">
								Your connections
							</p>
							<div class="flex flex-col justify-between gap-3 md:flex-row md:items-end">
								<div>
									<h1 class="text-3xl font-semibold tracking-tight text-[#F2F2F2]">People</h1>
									<p class="mt-2 text-[#A3A3A3]">Accounts identified by username in this export.</p>
								</div>
								<div class="text-sm text-[#A3A3A3]">
									<span class="font-semibold text-[#F2F2F2]">
										{filteredPeople().length.toLocaleString()}
									</span>{" "}
									results
								</div>
							</div>
						</div>

						<div class="rounded-lg border border-[#303030] bg-[#181818] p-4">
							<div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
								<ControlLabel label="Search usernames">
									<input
										class={controlClass}
										type="search"
										value={peopleSearch()}
										placeholder="Search by username"
										onInput={(event) => setPeopleSearch(event.currentTarget.value)}
									/>
								</ControlLabel>
								<ControlLabel label="Relationship">
									<select
										class={controlClass}
										value={peopleRelationship()}
										onChange={(event) =>
											setPeopleRelationship(event.currentTarget.value as PeopleFilter)
										}
									>
										<option value="all">All people</option>
										<option value="followers">Followers</option>
										<option value="following">Following</option>
										<option value="mutuals">Mutuals</option>
										<option value="blocked">Blocked</option>
									</select>
								</ControlLabel>
								<button
									type="button"
									class="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#404040] bg-transparent px-4 py-2.5 text-sm font-semibold leading-5 text-[#F2F2F2] transition-colors hover:border-[#606060] hover:bg-[#202020] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7873F5] disabled:cursor-not-allowed disabled:opacity-50"
									disabled={!peopleFiltersActive()}
									onClick={clearPeopleFilters}
								>
									Clear filters
								</button>
							</div>
						</div>

						<Show
							when={props.people.length > 0}
							fallback={
								<EmptyState
									title="People data unavailable"
									description="No username-based connection records were included in this imported snapshot."
								/>
							}
						>
							<Show
								when={filteredPeople().length > 0}
								fallback={
									<EmptyState
										title="No people match"
										description="Try a different username or relationship filter."
									/>
								}
							>
								<div class="overflow-hidden rounded-lg border border-[#303030] bg-[#181818]">
									<div class="divide-y divide-[#303030]">
										<For each={filteredPeople()}>
											{(person) => (
												<div class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
													<div class="flex min-w-0 items-center gap-3">
														<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#404040] bg-[#303030] text-sm font-semibold text-[#F2F2F2]">
															{person.username.slice(0, 1).toUpperCase()}
														</div>
														<div class="min-w-0">
															<p class="truncate font-semibold text-[#F2F2F2]">
																@{person.username}
															</p>
															<p class="text-xs text-[#737373]">Username account</p>
														</div>
													</div>
													<div class="flex flex-wrap gap-2">
														<For each={relationshipBadges(person)}>
															{(badge) => (
																<span
																	class={`rounded-full border px-2.5 py-1 text-xs font-medium ${badge.className}`}
																>
																	{badge.label}
																</span>
															)}
														</For>
													</div>
												</div>
											)}
										</For>
									</div>
								</div>
							</Show>
						</Show>
					</section>
				</Show>

				<Show when={activeTab() === "conversations"}>
					<section class="space-y-5">
						<div>
							<p class="mb-3 bg-gradient-to-r from-[#FF6EC4] to-[#7873F5] bg-clip-text text-xs font-bold uppercase tracking-[0.16em] leading-4 text-transparent">
								Message history
							</p>
							<div class="flex flex-col justify-between gap-3 md:flex-row md:items-end">
								<div>
									<h1 class="text-3xl font-semibold tracking-tight text-[#F2F2F2]">Conversations</h1>
									<p class="mt-2 text-[#A3A3A3]">A snapshot of where your messages were exchanged.</p>
								</div>
								<div class="text-sm text-[#A3A3A3]">
									<span class="font-semibold text-[#F2F2F2]">
										{filteredConversations().length.toLocaleString()}
									</span>{" "}
									results
								</div>
							</div>
						</div>

						<div class="rounded-lg border border-[#303030] bg-[#181818] p-4">
							<div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px_180px_auto] md:items-end">
								<ControlLabel label="Search conversations">
									<input
										class={controlClass}
										type="search"
										value={conversationSearch()}
										placeholder="Search title or participant"
										onInput={(event) => setConversationSearch(event.currentTarget.value)}
									/>
								</ControlLabel>
								<ControlLabel label="Type">
									<select
										class={controlClass}
										value={conversationType()}
										onChange={(event) =>
											setConversationType(event.currentTarget.value as ConversationTypeFilter)
										}
									>
										<option value="all">All types</option>
										<option value="direct">Direct</option>
										<option value="group">Group</option>
									</select>
								</ControlLabel>
								<ControlLabel label="Minimum messages">
									<input
										class={controlClass}
										type="number"
										min="0"
										step="1"
										value={minimumMessages()}
										placeholder="0"
										onInput={(event) => setMinimumMessages(event.currentTarget.value)}
									/>
								</ControlLabel>
								<button
									type="button"
									class="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#404040] bg-transparent px-4 py-2.5 text-sm font-semibold leading-5 text-[#F2F2F2] transition-colors hover:border-[#606060] hover:bg-[#202020] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7873F5] disabled:cursor-not-allowed disabled:opacity-50"
									disabled={!conversationFiltersActive()}
									onClick={clearConversationFilters}
								>
									Clear filters
								</button>
							</div>
						</div>

						<Show
							when={props.conversations.length > 0}
							fallback={
								<EmptyState
									title="Conversation data unavailable"
									description="No message conversations were included in this imported snapshot."
								/>
							}
						>
							<Show
								when={filteredConversations().length > 0}
								fallback={
									<EmptyState
										title="No conversations match"
										description="Try a different search, type, or minimum message count."
									/>
								}
							>
								<div class="overflow-hidden rounded-lg border border-[#303030] bg-[#181818]">
									<div class="hidden grid-cols-[minmax(0,1fr)_120px_140px_130px] gap-4 border-b border-[#303030] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#737373] sm:grid">
										<span>Conversation</span>
										<span>Type</span>
										<span>Messages</span>
										<span>Last activity</span>
									</div>
									<div class="divide-y divide-[#303030]">
										<For each={filteredConversations()}>
											{(conversation) => (
												<div class="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_120px_140px_130px] sm:items-center sm:gap-4">
													<div class="min-w-0">
														<p class="truncate font-semibold text-[#F2F2F2]">
															{conversation.title || "Untitled conversation"}
														</p>
														<p class="mt-1 truncate text-xs text-[#737373]">
															{conversation.participants.length > 0
																? conversation.participants.join(", ")
																: "Participants unavailable"}
														</p>
													</div>
													<span class="text-sm text-[#A3A3A3]">
														<span class="mr-1 text-[#737373] sm:hidden">Type ·</span>
														{conversation.is_group ? "Group" : "Direct"}
													</span>
													<span class="text-sm font-semibold text-[#7873F5]">
														<span class="mr-1 text-[#737373] sm:hidden">Messages ·</span>
														{conversation.messageCount.toLocaleString()}
													</span>
													<span class="text-sm text-[#A3A3A3]">
														<span class="mr-1 text-[#737373] sm:hidden">Active ·</span>
														{formatDate(conversation.lastActivity)}
													</span>
												</div>
											)}
										</For>
									</div>
								</div>
							</Show>
						</Show>
					</section>
				</Show>

				<Show when={activeTab() === "profile"}>
					<section class="space-y-5">
						<div>
							<p class="mb-3 bg-gradient-to-r from-[#FF6EC4] to-[#7873F5] bg-clip-text text-xs font-bold uppercase tracking-[0.16em] leading-4 text-transparent">
								Your account
							</p>
							<h1 class="text-3xl font-semibold tracking-tight text-[#F2F2F2]">Profile</h1>
							<p class="mt-2 text-[#A3A3A3]">
								Identity and connection counts from this imported snapshot.
							</p>
						</div>

						<div class="overflow-hidden rounded-lg border border-[#303030] bg-[#181818]">
							<div class="h-24 bg-[#202020]" />
							<div class="px-6 pb-7 sm:px-9">
								<div class="-mt-14 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
									<div class="flex flex-col gap-4 sm:flex-row sm:items-end">
										<ProfileAvatar user={props.user} />
										<div>
											<h2 class="text-2xl font-semibold text-[#F2F2F2]">
												{props.user?.name || "Unavailable"}
											</h2>
											<p class="mt-1 text-[#A3A3A3]">
												{props.user?.username
													? `@${props.user.username}`
													: "Username unavailable"}
											</p>
										</div>
									</div>
								</div>

								<div class="mt-8 grid gap-3 sm:grid-cols-2">
									<button
										type="button"
										class="w-full rounded-lg border border-[#303030] bg-[#181818] p-4 text-left transition-colors hover:border-[#7873F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7873F5]"
										onClick={() => openPeopleFilter("followers")}
									>
										<span class="block text-2xl font-semibold text-[#F2F2F2]">
											{mutedValue(props.analysis.followers)}
										</span>
										<span class="mt-1 block text-sm text-[#A3A3A3]">
											Followers <span class="text-[#7873F5]">→</span>
										</span>
									</button>
									<button
										type="button"
										class="w-full rounded-lg border border-[#303030] bg-[#181818] p-4 text-left transition-colors hover:border-[#7873F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7873F5]"
										onClick={() => openPeopleFilter("following")}
									>
										<span class="block text-2xl font-semibold text-[#F2F2F2]">
											{mutedValue(props.analysis.following)}
										</span>
										<span class="mt-1 block text-sm text-[#A3A3A3]">
											Following <span class="text-[#7873F5]">→</span>
										</span>
									</button>
								</div>
							</div>
						</div>
					</section>
				</Show>
			</Show>
		</div>
	);
};

export default AnalysisTabs;
