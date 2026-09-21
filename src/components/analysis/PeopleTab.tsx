import { type Component, createMemo, For, Show } from "solid-js";
import { Button, EmptyState, Field, PageHeading, Panel, Select, TextInput } from "@/components/ui";
import { PairedMetric, SummaryPanel } from "@/components/analysis/Metrics";
import {
	PEOPLE_FILTER_OPTIONS,
	PEOPLE_SORT_OPTIONS,
	type PeopleFilter,
	type PeopleSort,
} from "@/components/analysis/analysisTypes";
import type { StoredUser } from "@/db/database";

interface PeopleTabProps {
	people: StoredUser[];
	filteredPeople: StoredUser[];
	peopleSearch: () => string;
	peopleRelationship: () => PeopleFilter;
	peopleSort: () => PeopleSort;
	peopleFiltersActive: () => boolean;
	onPeopleSearch: (value: string) => void;
	onPeopleRelationship: (value: PeopleFilter) => void;
	onPeopleSort: (value: PeopleSort) => void;
	onClearFilters: () => void;
}

const statusValue = (value: boolean | undefined) => (value ? "Yes" : "—");
const storiesLikedValue = (value: number | undefined) => (value === undefined ? "—" : value.toLocaleString());

const relationshipTooltip =
	"This may be different than Instagram’s count because deactivated or otherwise unavailable accounts may not appear in the data.";

const reportColumns = [
	{ key: "follows you", label: "Follows you" },
	{ key: "following", label: "Following" },
	{ key: "close friend", label: "Close friend" },
	{ key: "blocked", label: "Blocked" },
	{ key: "requested", label: "Requested" },
	{ key: "hidden story", label: "Hidden story" },
	{ key: "pending request", label: "Pending request" },
	{ key: "recently unfollowed", label: "Recently unfollowed" },
	{ key: "stories liked", label: "Stories liked" },
] as const;

const PeopleTab: Component<PeopleTabProps> = (props) => {
	const summaryCounts = createMemo(() => {
		let followers = 0;
		let following = 0;
		let blocked = 0;
		let notFollowingBack = 0;
		let notFollowedBack = 0;
		let closeFriends = 0;
		for (const person of props.people) {
			if (person.follower?.value === true) followers += 1;
			if (person.following?.value === true) following += 1;
			if (person.blocked?.value === true) blocked += 1;
			if (person.following?.value === true && person.follower?.value !== true) notFollowingBack += 1;
			if (person.follower?.value === true && person.following?.value !== true) notFollowedBack += 1;
			if (person.close_friends?.value === true) closeFriends += 1;
		}
		return { followers, following, blocked, notFollowingBack, notFollowedBack, closeFriends };
	});

	const reportValue = (person: StoredUser, key: (typeof reportColumns)[number]["key"]) => {
		switch (key) {
			case "follows you":
				return statusValue(person.follower?.value);
			case "following":
				return statusValue(person.following?.value);
			case "close friend":
				return statusValue(person.close_friends?.value);
			case "blocked":
				return statusValue(person.blocked?.value);
			case "requested":
				return statusValue(person.requested_to_follow_you?.value);
			case "hidden story":
				return statusValue(person.hidden_story_from?.value);
			case "pending request":
				return statusValue(person.pending_follow_request?.value);
			case "recently unfollowed":
				return statusValue(person.recently_unfollowed?.value);
			case "stories liked":
				return storiesLikedValue(person.stories_liked);
		}
	};

	return (
		<section class="space-y-5">
			<PageHeading
				title="People"
				description="Other Instagram accounts found in this data package."
				trailing={
					<div class="flex items-baseline gap-1.5 text-sm text-gray-400">
						<span class="font-mono text-sm font-medium text-gray-100">
							{props.filteredPeople.length.toLocaleString()}
						</span>
						results
					</div>
				}
			/>

			<Show
				when={props.people.length > 0}
				fallback={
					<EmptyState
						title="People data unavailable"
						description="No username-based connection records were included in this data package."
					/>
				}
			>
				<div class="space-y-5">
					<PairedMetric
						title="Connections"
						size="lg"
						left={{
							label: "Followers",
							value: summaryCounts().followers,
							accent: "blue",
							tooltip: relationshipTooltip,
						}}
						right={{
							label: "Following",
							value: summaryCounts().following,
							accent: "pink",
							tooltip: relationshipTooltip,
						}}
					/>

					<SummaryPanel
						strip
						title="Other relationships"
						items={[
							{ label: "Accounts blocked", value: summaryCounts().blocked, quiet: true },
							{ label: "Not following you back", value: summaryCounts().notFollowingBack },
							{ label: "You don't follow back", value: summaryCounts().notFollowedBack },
							{ label: "Close friends", value: summaryCounts().closeFriends, accent: "purple" },
						]}
					/>
				</div>

				<div class="mt-4 space-y-5">
					<div class="border-b border-edge pb-5">
						<div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
							<Field label="Search usernames">
								<TextInput
									type="search"
									value={props.peopleSearch()}
									placeholder="Search by username"
									onInput={(event) => props.onPeopleSearch(event.currentTarget.value)}
								/>
							</Field>
							<Field label="Relationship">
								<Select
									value={props.peopleRelationship()}
									onChange={(event) =>
										props.onPeopleRelationship(event.currentTarget.value as PeopleFilter)
									}
								>
									<For each={PEOPLE_FILTER_OPTIONS}>
										{(option) => <option value={option.value}>{option.label}</option>}
									</For>
								</Select>
							</Field>
							<Button
								variant="secondary"
								disabled={!props.peopleFiltersActive()}
								onClick={props.onClearFilters}
							>
								Clear filters
							</Button>
						</div>

						<div class="mt-4 md:max-w-xs">
							<Field label="Sorting options">
								<Select
									value={props.peopleSort()}
									onChange={(event) => props.onPeopleSort(event.currentTarget.value as PeopleSort)}
								>
									<For each={PEOPLE_SORT_OPTIONS}>
										{(option) => <option value={option.value}>{option.label}</option>}
									</For>
								</Select>
							</Field>
						</div>
					</div>

					<Show
						when={props.filteredPeople.length > 0}
						fallback={
							<EmptyState
								title="No people match"
								description="Try a different username or relationship filter."
							/>
						}
					>
						<Panel class="overflow-hidden">
							<div class="overflow-x-auto">
								<table class="min-w-[1320px] w-full text-left">
									<thead class="border-b border-edge bg-surface">
										<tr class="text-xs font-semibold uppercase tracking-wider text-gray-400">
											<th scope="col" class="px-5 py-3">
												Username
											</th>
											<For each={reportColumns}>
												{(column) => (
													<th scope="col" class="px-5 py-3">
														{column.label}
													</th>
												)}
											</For>
										</tr>
									</thead>
									<tbody class="divide-y divide-edge">
										<For each={props.filteredPeople}>
											{(person) => (
												<tr class="text-sm text-gray-400 transition-colors hover:bg-white/5">
													<th scope="row" class="px-5 py-4 font-semibold text-gray-100">
														<div class="flex items-center gap-3">
															<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-edge-strong bg-raised text-xs font-semibold text-gray-100">
																{person.username.slice(0, 1).toUpperCase()}
															</div>
															<span class="font-mono text-sm text-gray-100">
																@{person.username}
															</span>
														</div>
													</th>
													<For each={reportColumns}>
														{(column) => (
															<td class="px-5 py-4">{reportValue(person, column.key)}</td>
														)}
													</For>
												</tr>
											)}
										</For>
									</tbody>
								</table>
							</div>
						</Panel>
					</Show>
				</div>
			</Show>
		</section>
	);
};

export default PeopleTab;
