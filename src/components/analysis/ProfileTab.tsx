import {
	type Accessor,
	type Component,
	For,
	Show,
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
	onMount,
} from "solid-js";
import { db, type StoredPost, type StoredUser } from "@/db/database";
import { createMediaURL } from "@/utils/media";
import type { ContentCounts, EngagementCounts } from "@/components/analysis/analysisData";
import type { ProfileChange, User } from "@/types/user";
import { Button, InfoTooltip, PageHeading, Panel } from "@/components/ui";
import { ActionPanel, SummaryPanel } from "@/components/analysis/Metrics";

interface ProfileTabProps {
	user: User | null;
	people: () => StoredUser[];
	profileChanges: () => ProfileChange[];
	posts: () => StoredPost[];
	contentCounts: () => ContentCounts;
	engagementCounts: () => EngagementCounts;
}

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

	const sizeClass = () => (props.size === "small" ? "h-12 w-12 text-base" : "h-24 w-24 text-3xl sm:h-28 sm:w-28");

	return (
		<Show
			when={photoUrl()}
			fallback={
				<div
					class={`flex shrink-0 items-center justify-center rounded-full border border-purple-line bg-raised font-semibold text-gray-100 ${sizeClass()}`}
				>
					{initialsFor(props.user)}
				</div>
			}
		>
			<img
				src={photoUrl()!}
				alt="Profile"
				class={`shrink-0 rounded-full border border-purple-line object-cover ${sizeClass()}`}
			/>
		</Show>
	);
};

const formatDate = (date: Date | undefined): string =>
	!date || Number.isNaN(date.getTime())
		? "Not provided"
		: date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

const formatHistoryDate = (date: Date | undefined): string =>
	!date || Number.isNaN(date.getTime())
		? "Date unavailable"
		: date.toLocaleDateString(undefined, { month: "short", year: "numeric" });

const basedInText = (user: User | null): string => {
	const location = user?.basedIn;
	if (!location) return "Not included in this export";
	const parts = [location.city, location.region, location.country].filter((part) => Boolean(part));
	return parts.length > 0 ? parts.join(", ") : "Not included in this export";
};

const locationListText = (user: User | null): string =>
	user?.locationsOfInterest?.length ? user.locationsOfInterest.join(", ") : "Not included in this export";

/** Activity counts use undefined when the export file was absent. */
const activityCountText = (value: number | undefined): string =>
	value === undefined ? "Not included in this export" : value.toLocaleString();

const DetailRow: Component<{ label: string; value: string }> = (props) => (
	<div class="flex items-baseline justify-between gap-4 py-3">
		<dt class="shrink-0 text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">{props.label}</dt>
		<dd class="min-w-0 break-words text-right text-sm text-gray-300">{props.value}</dd>
	</div>
);

const Chevron: Component<{ open: boolean }> = (props) => (
	<svg
		class={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-150 ${props.open ? "rotate-180" : ""}`}
		viewBox="0 0 20 20"
		fill="none"
		stroke="currentColor"
		stroke-width="1.75"
		aria-hidden="true"
	>
		<path d="m5 7.5 5 5 5-5" stroke-linecap="round" stroke-linejoin="round" />
	</svg>
);

const SectionHeading: Component<{ children: string }> = (props) => (
	<h2 class="text-sm font-semibold tracking-tight text-gray-100">{props.children}</h2>
);

/** Column count for the posts grid, following Tailwind’s breakpoints. */
const useColumnCount = (): Accessor<number> => {
	const [columns, setColumns] = createSignal(3);

	onMount(() => {
		const breakpoints = [
			[1024, 6],
			[768, 5],
			[640, 4],
		] as const;
		const queries = breakpoints.map(([width]) => window.matchMedia(`(min-width: ${width}px)`));
		const update = () => {
			const index = queries.findIndex((query) => query.matches);
			setColumns(index === -1 ? 3 : breakpoints[index][1]);
		};
		for (const query of queries) query.addEventListener("change", update);
		update();
		onCleanup(() => {
			for (const query of queries) query.removeEventListener("change", update);
		});
	});

	return columns;
};

const Stat: Component<{ label: string; value: number }> = (props) => (
	<div class="flex items-baseline gap-1.5">
		<span class="font-mono text-lg font-semibold leading-7 text-gray-100">{props.value.toLocaleString()}</span>
		<span class="text-xs font-medium uppercase tracking-wide text-gray-500">{props.label}</span>
	</div>
);

const PROFILE_CHANGES_PREVIEW_COUNT = 5;

const ProfileChangeRow: Component<{ change: ProfileChange }> = (props) => (
	<li class="flex flex-col gap-1 rounded-lg border border-edge bg-surface px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4">
		<span class="shrink-0 font-mono text-xs uppercase tracking-wider text-gray-500">
			{formatHistoryDate(props.change.timestamp)}
		</span>
		<span class="shrink-0 text-xs font-semibold uppercase tracking-[0.08em] text-gray-400">
			{props.change.changed || "Profile"}
		</span>
		<span class="flex min-w-0 items-center gap-2 text-sm">
			<span class="truncate text-gray-500 line-through">{props.change.previousValue || "—"}</span>
			<span class="text-gray-600">→</span>
			<span class="truncate text-gray-100">{props.change.newValue || "—"}</span>
		</span>
	</li>
);

const PostThumb: Component<{ post: StoredPost }> = (props) => {
	const [imageUrl, setImageUrl] = createSignal<string | null>(null);

	createEffect(() => {
		let active = true;
		let objectUrl: string | null = null;
		const mediaUri = props.post.media[0];

		if (!mediaUri) {
			setImageUrl(null);
			onCleanup(() => {
				active = false;
			});
			return;
		}

		void (async () => {
			const metadata = await db.media_metadata.get(mediaUri);
			if (!metadata) return;
			objectUrl = await createMediaURL(metadata);
			if (active) {
				setImageUrl(objectUrl);
			} else if (objectUrl) {
				URL.revokeObjectURL(objectUrl);
			}
		})();

		onCleanup(() => {
			active = false;
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		});
	});

	return (
		<Show
			when={imageUrl()}
			fallback={
				<div
					class="flex aspect-square w-full items-center justify-center rounded-md border border-edge bg-surface text-gray-600"
					title={props.post.title}
				>
					<svg
						class="h-6 w-6"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A1.5 1.5 0 0 0 21.75 19.5V4.5A1.5 1.5 0 0 0 20.25 3H3.75A1.5 1.5 0 0 0 2.25 4.5v15A1.5 1.5 0 0 0 3.75 21Zm9.75-10.5a2.25 2.25 0 1 0 0-.007"
						/>
					</svg>
				</div>
			}
		>
			<img
				src={imageUrl()!}
				alt={props.post.title || "Post"}
				loading="lazy"
				class="aspect-square w-full rounded-md border border-edge object-cover"
			/>
		</Show>
	);
};

const ProfileTab: Component<ProfileTabProps> = (props) => {
	const relationshipTooltip =
		"This may be different than Instagram’s count because deactivated or otherwise unavailable accounts may not appear in the data.";
	const [showActivity, setShowActivity] = createSignal(false);
	const [showAllPosts, setShowAllPosts] = createSignal(false);
	const columns = useColumnCount();

	const posts = createMemo(() =>
		props
			.posts()
			.filter((post) => !post.archived)
			.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
	);
	const visiblePosts = () => (showAllPosts() ? posts() : posts().slice(0, columns() * 3));

	const profileChanges = createMemo(() =>
		[...props.profileChanges()].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
	);

	const networkCounts = createMemo(() => {
		const counts = {
			followers: 0,
			following: 0,
			mutuals: 0,
			closeFriends: 0,
			blocked: 0,
			requested: 0,
			hiddenStory: 0,
			recentlyUnfollowed: 0,
		};
		for (const person of props.people()) {
			if (person.follower?.value === true) counts.followers += 1;
			if (person.following?.value === true) counts.following += 1;
			if (person.follower?.value === true && person.following?.value === true) counts.mutuals += 1;
			if (person.close_friends?.value === true) counts.closeFriends += 1;
			if (person.blocked?.value === true) counts.blocked += 1;
			if (person.requested_to_follow_you?.value === true) counts.requested += 1;
			if (person.hidden_story_from?.value === true) counts.hiddenStory += 1;
			if (person.recently_unfollowed?.value === true) counts.recentlyUnfollowed += 1;
		}
		return counts;
	});

	const relationshipLink = (relationship: string) => `/analysis/people?relationship=${relationship}`;

	return (
		<section class="space-y-5">
			<PageHeading
				title="Profile"
				description="Your account details and what this data package records about you."
			/>

			{/* Account */}
			<Panel variant="raised" class="p-6 sm:p-8">
				<div class="flex flex-col gap-5 sm:flex-row sm:items-start">
					<ProfileAvatar user={props.user} />
					<div class="flex min-w-0 flex-1 flex-col justify-between gap-x-8 sm:flex-row">
						<div class="min-w-0">
							<div class="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
								<h2 class="font-sans text-2xl font-semibold tracking-tight text-gray-100">
									{props.user?.name || "Unavailable"}
								</h2>
								<Show when={props.user}>
									<span
										class={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5 ${
											props.user?.privateAccount
												? "border-red-line bg-red-fill text-red-soft"
												: "border-edge-strong text-gray-400"
										}`}
									>
										{props.user?.privateAccount ? "Private account" : "Public account"}
									</span>
								</Show>
							</div>
							<Show when={props.user?.username}>
								<p class="mt-1 text-gray-400">@{props.user?.username}</p>
							</Show>
							<Show when={props.user?.bio}>
								<p class="mt-2 max-w-xl whitespace-pre-wrap font-space-grotesk text-sm leading-6 text-gray-300">
									{props.user?.bio}
								</p>
							</Show>
						</div>
						<div class="flex shrink-0 flex-wrap items-baseline justify-end gap-x-6 gap-y-1.5 sm:flex-col sm:items-end">
							<Stat label="Posts" value={props.contentCounts().posts} />
							<Stat label="Followers" value={networkCounts().followers} />
							<Stat label="Following" value={networkCounts().following} />
						</div>
					</div>
				</div>

				<div class="mt-7 mb-6 h-px w-full border-0 bg-edge" aria-hidden="true" />

				<dl class="divide-y divide-edge">
					<DetailRow label="Based in" value={basedInText(props.user)} />
					<DetailRow label="Email" value={props.user?.email || "Not provided"} />
					<DetailRow label="Date of birth" value={formatDate(props.user?.dateOfBirth)} />
					<DetailRow label="Gender" value={props.user?.gender || "Not provided"} />
				</dl>
			</Panel>

			{/* Posts */}
			<Panel class="p-5 sm:p-6">
				<div class="flex items-center gap-2">
					<SectionHeading>Posts</SectionHeading>
					<InfoTooltip
						label="Posts"
						description="Your non-archived posts, most recent first, previewing the first image in each post."
					/>
				</div>
				<Show
					when={posts().length > 0}
					fallback={<p class="mt-5 text-sm text-gray-500">No posts were included in this export.</p>}
				>
					<div class="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6">
						<For each={visiblePosts()}>{(post) => <PostThumb post={post} />}</For>
					</div>
					<Show when={posts().length > columns() * 3}>
						<Button
							variant="secondary"
							class="mt-4 w-full"
							onClick={() => setShowAllPosts((value) => !value)}
						>
							{showAllPosts()
								? "Show fewer posts"
								: `Show ${posts().length - visiblePosts().length} more posts`}
						</Button>
					</Show>
				</Show>
			</Panel>

			{/* Network */}
			<div class="space-y-5">
				<div class="flex items-center gap-2">
					<SectionHeading>Network</SectionHeading>
					<InfoTooltip
						label="Network"
						description="Connection counts from the people found in this data package. Some relationships (like mutuals) are derived from combining follower and following lists."
					/>
				</div>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<ActionPanel
						label="Followers"
						value={networkCounts().followers}
						description={relationshipTooltip}
						accent="blue"
						actionLabel="View people"
						href={relationshipLink("followers")}
					/>
					<ActionPanel
						label="Following"
						value={networkCounts().following}
						description={relationshipTooltip}
						accent="pink"
						actionLabel="View people"
						href={relationshipLink("following")}
					/>
					<ActionPanel
						label="Mutuals"
						value={networkCounts().mutuals}
						description={relationshipTooltip}
						accent="purple"
						actionLabel="View people"
						href={relationshipLink("mutuals")}
					/>
					<ActionPanel
						label="Close friends"
						value={networkCounts().closeFriends}
						description={relationshipTooltip}
						accent="neutral"
						actionLabel="View people"
						href={relationshipLink("close-friends")}
					/>
				</div>
				<SummaryPanel
					title="Other relationships"
					items={[
						{ label: "Accounts blocked", value: networkCounts().blocked, quiet: true },
						{ label: "Follow requests", value: networkCounts().requested },
						{ label: "Hidden story from", value: networkCounts().hiddenStory },
						{ label: "Recently unfollowed", value: networkCounts().recentlyUnfollowed },
					]}
				/>
			</div>

			{/* Profile history */}
			<Panel class="p-5 sm:p-6">
				<div class="flex items-center gap-2">
					<SectionHeading>Profile history</SectionHeading>
					<InfoTooltip
						label="Profile history"
						description="Chronological changes to your profile details, showing the value before and after each change."
					/>
				</div>
				<Show
					when={props.profileChanges().length > 0}
					fallback={
						<p class="mt-5 text-sm text-gray-500">No profile changes were included in this export.</p>
					}
				>
					<ol class="mt-5 space-y-2">
						<For each={profileChanges().slice(0, PROFILE_CHANGES_PREVIEW_COUNT)}>
							{(change) => <ProfileChangeRow change={change} />}
						</For>
					</ol>
					<Show when={profileChanges().length > PROFILE_CHANGES_PREVIEW_COUNT}>
						<details class="group mt-3">
							<summary class="flex w-full cursor-pointer list-none items-center justify-between rounded-lg border border-edge bg-surface px-4 py-3 text-sm text-gray-400 transition hover:text-gray-200 [&::-webkit-details-marker]:hidden">
								<span class="transition-colors">
									<span class="group-open:hidden">
										Show {profileChanges().length - PROFILE_CHANGES_PREVIEW_COUNT} earlier change
										{profileChanges().length - PROFILE_CHANGES_PREVIEW_COUNT === 1 ? "" : "s"}
									</span>
									<span class="hidden group-open:inline">Hide earlier changes</span>
								</span>
								<svg
									class="h-4 w-4 transition-transform group-open:rotate-180"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									aria-hidden="true"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="m19.5 8.25-7.5 7.5-7.5-7.5"
									/>
								</svg>
							</summary>
							<div class="mt-3 ml-1 border-l-2 border-edge pl-3 sm:ml-3 sm:pl-4">
								<ol class="space-y-2">
									<For each={profileChanges().slice(PROFILE_CHANGES_PREVIEW_COUNT)}>
										{(change) => <ProfileChangeRow change={change} />}
									</For>
								</ol>
							</div>
						</details>
					</Show>
				</Show>
			</Panel>

			{/* Content and engagement */}
			<div class="grid gap-5 lg:grid-cols-2">
				<SummaryPanel
					title="Your Instagram footprint"
					description="Content stored in this data package."
					items={[
						{ label: "Posts", value: props.contentCounts().posts, accent: "pink" },
						{ label: "Archived posts", value: props.contentCounts().archived, quiet: true },
						{ label: "Stories", value: props.contentCounts().stories, accent: "purple" },
					]}
				/>
				<SummaryPanel
					title="Engagement"
					description="Interactions recorded with other accounts."
					items={[
						{ label: "Likes", value: props.engagementCounts().likedPosts, accent: "pink" },
						{ label: "Saves", value: props.engagementCounts().savedPosts, accent: "blue" },
						{ label: "Comments", value: props.engagementCounts().comments, accent: "purple" },
						{ label: "Story likes", value: props.engagementCounts().storyLikes, quiet: true },
					]}
				/>
			</div>

			{/* Export activity record */}
			<Panel class="p-5 sm:p-6">
				<button
					type="button"
					class="flex w-full items-center justify-between gap-4 text-left"
					aria-expanded={showActivity()}
					onClick={() => setShowActivity((value) => !value)}
				>
					<span class="flex items-center gap-2">
						<SectionHeading>Export activity record</SectionHeading>
						<InfoTooltip
							label="Export activity record"
							description="Counts of browsing and advertising signals recorded in this data package."
						/>
					</span>
					<Chevron open={showActivity()} />
				</button>
				<Show when={showActivity()}>
					<dl class="mt-4 divide-y divide-edge border-t border-edge pt-4">
						<DetailRow label="Based in" value={basedInText(props.user)} />
						<DetailRow label="Locations of interest" value={locationListText(props.user)} />
						<DetailRow label="Videos watched" value={activityCountText(props.user?.videosWatched)} />
						<DetailRow label="Posts viewed" value={activityCountText(props.user?.postsViewed)} />
						<DetailRow label="Ads viewed" value={activityCountText(props.user?.adsViewed)} />
						<DetailRow
							label="Profiles not interested in"
							value={activityCountText(props.user?.notInterestedProfiles)}
						/>
						<DetailRow
							label="Posts not interested in"
							value={activityCountText(props.user?.notInterestedPosts)}
						/>
					</dl>
				</Show>
			</Panel>
		</section>
	);
};

export default ProfileTab;
