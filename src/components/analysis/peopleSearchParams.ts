import { useSearchParams } from "@solidjs/router";
import { createEffect } from "solid-js";
import { isPeopleFilter, isPeopleSort, type PeopleFilter, type PeopleSort } from "@/components/analysis/analysisTypes";

interface PeopleSearchParams {
	[key: string]: string | string[] | undefined;
	q?: string;
	relationship?: string;
	sort?: string;
}

const getParam = (value: string | string[] | undefined) => (typeof value === "string" ? value : "");

/**
 * Current People screen view, owned by the query string.
 *
 * - `q` filters by username, `relationship` filters by connection, `sort`
 *   controls ordering. Defaults are omitted from the URL.
 * - Typing search replaces the current history entry so Back does not have to
 *   step through every keystroke. Explicit filter/sort changes push entries.
 * - Invalid values fall back to their defaults and are canonicalized away via
 *   replacement navigation (so a stale/copied URL self-heals).
 */
export const usePeopleSearchParams = () => {
	const [searchParams, setSearchParams] = useSearchParams<PeopleSearchParams>();

	const search = () => getParam(searchParams.q);
	const relationship = (): PeopleFilter => {
		const value = getParam(searchParams.relationship);
		return isPeopleFilter(value) ? value : "all";
	};
	const sort = (): PeopleSort => {
		const value = getParam(searchParams.sort);
		return isPeopleSort(value) ? value : "username-asc";
	};
	const filtersActive = () => search().trim().length > 0 || relationship() !== "all" || sort() !== "username-asc";

	createEffect(() => {
		const rawRelationship = searchParams.relationship;
		if (rawRelationship !== undefined && !isPeopleFilter(getParam(rawRelationship))) {
			setSearchParams({ relationship: null }, { replace: true });
			return;
		}
		const rawSort = searchParams.sort;
		if (rawSort !== undefined && !isPeopleSort(getParam(rawSort))) {
			setSearchParams({ sort: null }, { replace: true });
		}
	});

	const setSearch = (value: string) => setSearchParams({ q: value || null }, { replace: true });
	const setRelationship = (value: PeopleFilter) => setSearchParams({ relationship: value === "all" ? null : value });
	const setSort = (value: PeopleSort) => setSearchParams({ sort: value === "username-asc" ? null : value });
	const clearFilters = () => setSearchParams({ q: null, relationship: null, sort: null });

	return { search, relationship, sort, filtersActive, setSearch, setRelationship, setSort, clearFilters };
};
