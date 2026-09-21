import { type Component, createMemo } from "solid-js";
import { useAnalysisData } from "@/components/analysis/analysisData";
import type { PeopleSort } from "@/components/analysis/analysisTypes";
import PeopleTab from "@/components/analysis/PeopleTab";
import { usePeopleSearchParams } from "@/components/analysis/peopleSearchParams";
import type { StoredUser } from "@/db/database";

const compareUsernames = (a: StoredUser, b: StoredUser) =>
	a.username.localeCompare(b.username, undefined, { sensitivity: "base" });

const sortPeople = (people: StoredUser[], sort: PeopleSort) => {
	switch (sort) {
		case "username-desc":
			return [...people].sort((a, b) => compareUsernames(a, b) * -1);
		case "followers":
			return [...people].sort(
				(a, b) =>
					Number(b.follower?.value === true) - Number(a.follower?.value === true) || compareUsernames(a, b),
			);
		case "following":
			return [...people].sort(
				(a, b) =>
					Number(b.following?.value === true) - Number(a.following?.value === true) || compareUsernames(a, b),
			);
		case "close-friends":
			return [...people].sort(
				(a, b) =>
					Number(b.close_friends?.value === true) - Number(a.close_friends?.value === true) ||
					compareUsernames(a, b),
			);
		case "blocked":
			return [...people].sort(
				(a, b) =>
					Number(b.blocked?.value === true) - Number(a.blocked?.value === true) || compareUsernames(a, b),
			);
		default:
			return [...people].sort(compareUsernames);
	}
};

const PeoplePage: Component = () => {
	const { people } = useAnalysisData();
	const { search, relationship, sort, filtersActive, setSearch, setRelationship, setSort, clearFilters } =
		usePeopleSearchParams();

	const filteredPeople = createMemo(() => {
		const query = search().trim().toLocaleLowerCase();
		const currentRelationship = relationship();
		const currentSort = sort();

		const matches = people().filter((person) => {
			const username = person.username.toLocaleLowerCase();
			if (query && !username.includes(query)) return false;
			switch (currentRelationship) {
				case "followers":
					return person.follower?.value === true;
				case "following":
					return person.following?.value === true;
				case "mutuals":
					return person.follower?.value === true && person.following?.value === true;
				case "close-friends":
					return person.close_friends?.value === true;
				case "blocked":
					return person.blocked?.value === true;
				case "requested":
					return person.requested_to_follow_you?.value === true;
				case "hidden-story":
					return person.hidden_story_from?.value === true;
				case "pending-request":
					return person.pending_follow_request?.value === true;
				case "recently-unfollowed":
					return person.recently_unfollowed?.value === true;
				default:
					return true;
			}
		});

		return sortPeople(matches, currentSort);
	});

	return (
		<PeopleTab
			people={people()}
			filteredPeople={filteredPeople()}
			peopleSearch={search}
			peopleRelationship={relationship}
			peopleSort={sort}
			peopleFiltersActive={filtersActive}
			onPeopleSearch={setSearch}
			onPeopleRelationship={setRelationship}
			onPeopleSort={setSort}
			onClearFilters={clearFilters}
		/>
	);
};

export default PeoplePage;
