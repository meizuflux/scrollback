import { expect, test } from "bun:test";
import { merge, observe } from "../src/analyze.ts";
import { compactObservation } from "../src/compact.ts";
import { matchFamily } from "../src/families.ts";
import { renderReport } from "../src/report.ts";

test("observes null, missing properties, nested arrays, and punctuation keys", () => {
	const tree = observe([{ "a.b": null, rows: [{ x: 1 }, {}] }, { rows: [] }], { maxDepth: 20, maxNodes: 100 });
	const rootItems = tree.children[0];
	const aggregate = merge([rootItems]);
	const dotted = aggregate.children.find(
		(node) => node.path.at(-1)?.kind === "key" && node.path.at(-1).value === "a.b",
	);
	expect(dotted?.nullCount).toBe(1);
	expect(dotted?.parentObjectCount).toBe(2);
	const rows = aggregate.children.find(
		(node) => node.path.at(-1)?.kind === "key" && node.path.at(-1).value === "rows",
	);
	expect(rows?.emptyArrayCount).toBe(1);
});

test("groups only registered message paths and safely embeds hostile keys", () => {
	expect(matchFamily("your_instagram_activity/messages/inbox/friends/message_2.json").id).toBe(
		"messages:inbox-messages",
	);
	expect(matchFamily("elsewhere/message_2.json").id).not.toBe("messages:inbox-messages");
	expect(matchFamily("your_instagram_activity/messages/message_requests/new_friend/message_1.json").name).toBe(
		"Message requests",
	);
	expect(matchFamily("connections/followers_and_following/recent_follow_requests.json").registered).toBe(true);
	expect(matchFamily("your_instagram_activity/media/profile_photos.json").registered).toBe(true);
	expect(matchFamily("your_instagram_activity/story_interactions/polls.json").registered).toBe(true);
	expect(
		matchFamily("security_and_login_information/login_and_profile_creation/login_activity.json").registered,
	).toBe(true);
	const report = renderReport({} as never);
	expect(report).toContain('id="inventory"');
	expect(report).not.toContain("</script><script>alert(1)");
	expect(report).toContain("Labelled entries");
	expect(report).toContain("groups omitted");
});

test("retains typed repeated values and derives label groups", () => {
	const tree = observe(
		{
			entries: [
				{ label: "Caption", value: "one" },
				{ label: "Caption", value: "two" },
				{ title: "Hashtags", dict: [] },
			],
		},
		{ maxDepth: 20, maxNodes: 100, valueDistinctCap: 2 },
	);
	const entries = tree.children.find(
		(node) => node.path.at(-1)?.kind === "key" && node.path.at(-1).value === "entries",
	);
	expect(
		entries?.labelGroups?.find((group) => group.discriminator === "label" && group.value === "Caption")?.count,
	).toBe(2);
	const labels = entries?.children[0].children.find(
		(node) => node.path.at(-1)?.kind === "key" && node.path.at(-1).value === "label",
	);
	expect(labels?.values?.values.find((value) => value.value === "Caption")?.count).toBe(2);
});

test("unions distinct values and preserves array-length evidence", () => {
	const tree = observe([{ title: "" }, { title: "" }, { title: "" }], {
		maxDepth: 20,
		maxNodes: 100,
	});
	const item = tree.children[0];
	const merged = merge([item, item]);
	const title = merged.children.find(
		(node) => node.path.at(-1)?.kind === "key" && node.path.at(-1).value === "title",
	);
	expect(title?.values?.distinctCount).toBe(1);
	expect(title?.values?.values[0]?.count).toBe(6);
	expect(tree.arrayLengths?.distribution).toEqual([{ length: 3, count: 1 }]);
});

test("compacts high-cardinality label groups and candidate values", () => {
	const tree = observe(
		Array.from({ length: 13 }, (_, index) => ({
			title: `account-${index}`,
			href: `https://example.test/${index}`,
		})),
		{ maxDepth: 20, maxNodes: 1_000, valueDistinctCap: 20 },
	);
	const compact = compactObservation(tree);
	expect(compact.labelGroups).toBeUndefined();
	expect(compact.labelGroupSummary?.count).toBe(13);
	const href = compact.children[0].children.find(
		(node) => node.path.at(-1)?.kind === "key" && node.path.at(-1).value === "href",
	);
	expect(href?.values?.values).toEqual([]);
});
