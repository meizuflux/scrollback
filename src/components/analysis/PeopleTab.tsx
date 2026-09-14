import { type Component, createMemo, For, Show } from "solid-js";
import { ControlLabel, controlClass, EmptyState, InfoTooltip } from "@/components/analysis/AnalysisShared";
import type { PeopleFilter, PeopleSort } from "@/components/analysis/analysisTypes";
import type { StoredUser } from "@/db/database";

interface PeopleTabProps {
	people: StoredUser[];
	filteredPeople: StoredUser[];
	peopleSearch: () => string;
	peopleRelationship: () => PeopleFilter;
	peopleSort: () => PeopleSort;
	peopleTableOpen: () => boolean;
	peopleFiltersActive: () => boolean;
	onPeopleSearch: (value: string) => void;
	onPeopleRelationship: (value: PeopleFilter) => void;
	onPeopleSort: (value: PeopleSort) => void;
	onPeopleTableToggle: () => void;
	onClearFilters: () => void;
}

interface StatCardProps {
	title: string;
	value: number;
	description?: string;
}

const StatCard: Component<StatCardProps> = (props) => (
	<div class="rounded-lg border border-gray-700 bg-gray-900 p-5">
		<p class="text-sm font-medium leading-5 text-gray-400">
			{props.title}
			{props.description && <InfoTooltip label={props.title} description={props.description} />}
		</p>
		<p class="mt-2 text-2xl font-semibold tracking-tight text-gray-100">{props.value.toLocaleString()}</p>
	</div>
);

const statusValue = (value: boolean | undefined) => (value ? "Yes" : "—");
const storiesLikedValue = (value: number | undefined) => (value === undefined ? "—" : value.toLocaleString());

const PeopleTab: Component<PeopleTabProps> = (props) => {
	const peopleForTable = createMemo(() => {
		const people = [...props.filteredPeople];
		const sort = props.peopleSort();

		return people.sort((a, b) => {
			if (sort === "username-desc") {
				return b.username.localeCompare(a.username, undefined, { sensitivity: "base" });
			}
			if (sort === "followers") {
				return (
					Number(b.follower?.value === true) - Number(a.follower?.value === true) ||
					a.username.localeCompare(b.username)
				);
			}
			if (sort === "following") {
				return (
					Number(b.following?.value === true) - Number(a.following?.value === true) ||
					a.username.localeCompare(b.username)
				);
			}
			if (sort === "close-friends") {
				return (
					Number(b.close_friends?.value === true) - Number(a.close_friends?.value === true) ||
					a.username.localeCompare(b.username)
				);
			}
			if (sort === "blocked") {
				return (
					Number(b.blocked?.value === true) - Number(a.blocked?.value === true) ||
					a.username.localeCompare(b.username)
				);
			}
			return a.username.localeCompare(b.username, undefined, { sensitivity: "base" });
		});
	});

	const followers = () => props.people.filter((person) => person.follower?.value === true).length;
	const following = () => props.people.filter((person) => person.following?.value === true).length;
	const blocked = () => props.people.filter((person) => person.blocked?.value === true).length;
	const notFollowingBack = () =>
		props.people.filter((person) => person.following?.value === true && person.follower?.value !== true).length;
	const notFollowedBack = () =>
		props.people.filter((person) => person.follower?.value === true && person.following?.value !== true).length;
	const closeFriends = () => props.people.filter((person) => person.close_friends?.value === true).length;

	return (
		<section class="space-y-7">
			<div>
				<div class="flex flex-col justify-between gap-3 md:flex-row md:items-end">
					<div>
						<h1 class="text-3xl font-semibold tracking-tight text-gray-100">People</h1>
						<p class="mt-2 text-gray-400">Other Instagram accounts found in this data package.</p>
					</div>
					<div class="text-sm text-gray-400">
						<span class="font-semibold text-gray-100">{props.filteredPeople.length.toLocaleString()}</span>{" "}
						results
					</div>
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
				<section class="space-y-4" aria-labelledby="people-overview-heading">
					<div class="flex items-center gap-4">
						<h2 id="people-overview-heading" class="text-xl font-semibold tracking-tight text-gray-100">
							At a Glance
						</h2>
						<div class="h-px flex-1 bg-gray-700" />
					</div>
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<StatCard
							title="Followers"
							value={followers()}
							description="This may be different than Instagram’s count because deactivated or otherwise unavailable accounts may not appear in the data."
						/>
						<StatCard
							title="Following"
							value={following()}
							description="This may be different than Instagram’s count because deactivated or otherwise unavailable accounts may not appear in the data."
						/>
						<StatCard title="Accounts blocked" value={blocked()} />
						<StatCard title="People not following you back" value={notFollowingBack()} />
						<StatCard title="People you don't follow back" value={notFollowedBack()} />
						<StatCard title="Close friends" value={closeFriends()} />
					</div>
				</section>

				<div>
					<button
						type="button"
						class="group flex w-full items-center gap-3 rounded-lg px-1 py-2 text-left text-lg font-semibold text-gray-100 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
						aria-expanded={props.peopleTableOpen()}
						aria-controls="people-table-panel"
						onClick={props.onPeopleTableToggle}
					>
						<span>View Table</span>
						<span
							aria-hidden="true"
							class={`text-gray-400 transition-transform ${props.peopleTableOpen() ? "rotate-90" : ""}`}
						>
							▶
						</span>
					</button>

					<Show when={props.peopleTableOpen()}>
						<div id="people-table-panel" class="mt-2 space-y-5">
							<div class="rounded-lg border border-gray-700 bg-gray-900 p-4">
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
											onChange={(event) =>
												props.onPeopleRelationship(event.currentTarget.value as PeopleFilter)
											}
										>
											<option value="all">All people</option>
											<option value="followers">Followers</option>
											<option value="following">Following</option>
											<option value="mutuals">Mutuals</option>
											<option value="close-friends">Close friends</option>
											<option value="blocked">Blocked</option>
											<option value="requested">Requested to follow you</option>
											<option value="hidden-story">Hidden story from</option>
											<option value="pending-request">Pending follow request</option>
											<option value="recently-unfollowed">Recently unfollowed</option>
										</select>
									</ControlLabel>
									<button
										type="button"
										class="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-600 bg-transparent px-4 py-2.5 text-sm font-semibold leading-5 text-gray-100 transition-colors hover:border-gray-500 hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple disabled:cursor-not-allowed disabled:opacity-50"
										disabled={!props.peopleFiltersActive()}
										onClick={props.onClearFilters}
									>
										Clear filters
									</button>
								</div>
							</div>

							<div class="rounded-lg border border-gray-700 bg-gray-900 p-4">
								<ControlLabel label="Sorting options">
									<select
										class={controlClass}
										value={props.peopleSort()}
										onChange={(event) =>
											props.onPeopleSort(event.currentTarget.value as PeopleSort)
										}
									>
										<option value="username-asc">Username (A–Z)</option>
										<option value="username-desc">Username (Z–A)</option>
										<option value="followers">Followers first</option>
										<option value="following">Following first</option>
										<option value="close-friends">Close friends first</option>
										<option value="blocked">Blocked first</option>
									</select>
								</ControlLabel>
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
								<div class="overflow-hidden rounded-lg border border-gray-700 bg-gray-900">
									<div class="overflow-x-auto">
										<table class="w-full min-w-[1320px] text-left">
											<thead class="border-b border-gray-700 bg-gray-900">
												<tr class="text-xs font-semibold uppercase tracking-wider text-gray-500">
													<th scope="col" class="px-5 py-3">
														Username
													</th>
													<th scope="col" class="px-5 py-3">
														Follows you
													</th>
													<th scope="col" class="px-5 py-3">
														Following
													</th>
													<th scope="col" class="px-5 py-3">
														Close friend
													</th>
													<th scope="col" class="px-5 py-3">
														Blocked
													</th>
													<th scope="col" class="px-5 py-3">
														Requested
													</th>
													<th scope="col" class="px-5 py-3">
														Hidden story
													</th>
													<th scope="col" class="px-5 py-3">
														Pending request
													</th>
													<th scope="col" class="px-5 py-3">
														Recently unfollowed
													</th>
													<th scope="col" class="px-5 py-3">
														Stories liked
													</th>
												</tr>
											</thead>
											<tbody class="divide-y divide-gray-700">
												<For each={peopleForTable()}>
													{(person) => (
														<tr class="text-sm text-gray-400 transition-colors hover:bg-gray-800">
															<th
																scope="row"
																class="px-5 py-4 font-semibold text-gray-100"
															>
																<div class="flex items-center gap-3">
																	<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-600 bg-gray-700 text-xs font-semibold text-gray-100">
																		{person.username.slice(0, 1).toUpperCase()}
																	</div>
																	<span>@{person.username}</span>
																</div>
															</th>
															<td class="px-5 py-4">
																{statusValue(person.follower?.value)}
															</td>
															<td class="px-5 py-4">
																{statusValue(person.following?.value)}
															</td>
															<td class="px-5 py-4">
																{statusValue(person.close_friends?.value)}
															</td>
															<td class="px-5 py-4">
																{statusValue(person.blocked?.value)}
															</td>
															<td class="px-5 py-4">
																{statusValue(person.requested_to_follow_you?.value)}
															</td>
															<td class="px-5 py-4">
																{statusValue(person.hidden_story_from?.value)}
															</td>
															<td class="px-5 py-4">
																{statusValue(person.pending_follow_request?.value)}
															</td>
															<td class="px-5 py-4">
																{statusValue(person.recently_unfollowed?.value)}
															</td>
															<td class="px-5 py-4">
																{storiesLikedValue(person.stories_liked)}
															</td>
														</tr>
													)}
												</For>
											</tbody>
										</table>
									</div>
								</div>
							</Show>
						</div>
					</Show>
				</div>
			</Show>
		</section>
	);
};

export default PeopleTab;
