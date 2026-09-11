import { For, Show, type Component } from "solid-js";
import type { StoredUser } from "@/db/database";
import { ControlLabel, EmptyState, controlClass } from "@/components/analysis/AnalysisShared";
import type { PeopleFilter } from "@/components/analysis/analysisTypes";

interface PeopleTabProps {
	people: StoredUser[];
	filteredPeople: StoredUser[];
	peopleSearch: () => string;
	peopleRelationship: () => PeopleFilter;
	peopleFiltersActive: () => boolean;
	onPeopleSearch: (value: string) => void;
	onPeopleRelationship: (value: PeopleFilter) => void;
	onClearFilters: () => void;
}

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

const PeopleTab: Component<PeopleTabProps> = (props) => (
	<section class="space-y-5">
		<div>
			<p class="mb-3 bg-gradient-to-r from-[#FF6EC4] to-[#7873F5] bg-clip-text text-xs font-bold uppercase tracking-[0.16em] leading-4 text-transparent">
				Your connections
			</p>
			<div class="flex flex-col justify-between gap-3 md:flex-row md:items-end">
				<div>
					<h1 class="text-3xl font-semibold tracking-tight text-[#F2F2F2]">People</h1>
					<p class="mt-2 text-[#A3A3A3]">Accounts found in this data package.</p>
				</div>
				<div class="text-sm text-[#A3A3A3]">
					<span class="font-semibold text-[#F2F2F2]">{props.filteredPeople.length.toLocaleString()}</span>{" "}
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
						value={props.peopleSearch()}
						placeholder="Search by username"
						onInput={(event) => props.onPeopleSearch(event.currentTarget.value)}
					/>
				</ControlLabel>
				<ControlLabel label="Relationship">
					<select
						class={controlClass}
						value={props.peopleRelationship()}
						onChange={(event) => props.onPeopleRelationship(event.currentTarget.value as PeopleFilter)}
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
					disabled={!props.peopleFiltersActive()}
					onClick={props.onClearFilters}
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
					description="No username-based connection records were included in this data package."
				/>
			}
		>
			<Show
				when={props.filteredPeople.length > 0}
				fallback={
					<EmptyState
						title="No people match"
						description="Try a different username or relationship filter."
					/>
				}
			>
				<div class="overflow-hidden rounded-lg border border-[#303030] bg-[#181818]">
					<div class="divide-y divide-[#303030]">
						<For each={props.filteredPeople}>
							{(person) => (
								<div class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
									<div class="flex min-w-0 items-center gap-3">
										<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#404040] bg-[#303030] text-sm font-semibold text-[#F2F2F2]">
											{person.username.slice(0, 1).toUpperCase()}
										</div>
										<div class="min-w-0">
											<p class="truncate font-semibold text-[#F2F2F2]">@{person.username}</p>
											<p class="text-xs text-[#737373]">Instagram account</p>
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
);

export default PeopleTab;
