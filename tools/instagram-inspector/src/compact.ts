import type { Inventory, ObservationNode, ValueSummary } from "./inventory.ts";

const maximumStoredLabelGroups = 12;

function compactValues(summary: ValueSummary | undefined): ValueSummary | undefined {
	if (!summary) return undefined;
	const isObservedConstant =
		summary.distinctCountExact &&
		summary.values.length === 1 &&
		summary.values[0].count === summary.occurrenceCount;
	return { ...summary, values: isObservedConstant ? summary.values : [] };
}

export function compactObservation(node: ObservationNode): ObservationNode {
	const groups = node.labelGroups;
	const compact: ObservationNode = {
		...node,
		children: node.children.map(compactObservation),
		values: compactValues(node.values),
	};
	if (!compact.values) delete compact.values;
	if (!groups) return compact;

	if (groups.length > maximumStoredLabelGroups) {
		compact.labelGroupSummary = {
			count: groups.length,
			discriminators: [
				...new Set(
					groups.flatMap((group) => (group.discriminator === "unclassified" ? [] : [group.discriminator])),
				),
			],
		};
		delete compact.labelGroups;
		return compact;
	}

	compact.labelGroups = groups.map((group) => ({ ...group, observation: compactObservation(group.observation) }));
	return compact;
}

export function compactInventory(inventory: Inventory): Inventory {
	return {
		...inventory,
		files: inventory.files.map(({ observation: _observation, ...file }) => file),
		families: inventory.families.map((family) => ({
			...family,
			aggregate: family.aggregate ? compactObservation(family.aggregate) : undefined,
		})),
	};
}
