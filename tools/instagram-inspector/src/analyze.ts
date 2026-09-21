import type {
	JsonType,
	LabelGroup,
	ObservationNode,
	PrimitiveValue,
	ValueFrequency,
	ValueSummary,
} from "./inventory.ts";

export class AnalysisLimitError extends Error {
	constructor(public code: "DEPTH_LIMIT" | "NODE_LIMIT") {
		super(code);
	}
}
export const jsonType = (value: unknown): JsonType =>
	value === null ? "null" : Array.isArray(value) ? "array" : (typeof value as JsonType);
type Limits = { maxDepth: number; maxNodes: number; valueDistinctCap?: number };
const primitive = (value: unknown): value is PrimitiveValue =>
	value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
const valueKey = (type: ValueFrequency["type"], value: PrimitiveValue) => type + ":" + JSON.stringify(value);
function singleValue(value: PrimitiveValue): ValueSummary {
	const type = jsonType(value) as ValueFrequency["type"];
	return {
		occurrenceCount: 1,
		distinctCount: 1,
		distinctCountExact: true,
		emptyStringCount: value === "" ? 1 : 0,
		values: [{ type, value, count: 1 }],
	};
}

export function observe(value: unknown, limits: Limits): ObservationNode {
	let nodes = 0;
	const cap = limits.valueDistinctCap ?? 200;
	const walk = (input: unknown, path: ObservationNode["path"], depth: number): ObservationNode => {
		if (++nodes > limits.maxNodes) throw new AnalysisLimitError("NODE_LIMIT");
		if (depth > limits.maxDepth) throw new AnalysisLimitError("DEPTH_LIMIT");
		const type = jsonType(input),
			array = type === "array" ? (input as unknown[]) : undefined;
		const node: ObservationNode = {
			path,
			types: { [type]: 1 },
			occurrences: 1,
			objectCount: type === "object" ? 1 : 0,
			nullCount: type === "null" ? 1 : 0,
			emptyObjectCount: type === "object" && Object.keys(input as object).length === 0 ? 1 : 0,
			arrayCount: type === "array" ? 1 : 0,
			emptyArrayCount: array?.length === 0 ? 1 : 0,
			itemCount: array?.length ?? 0,
			minArrayLength: array?.length,
			maxArrayLength: array?.length,
			arrayLengths: array
				? {
						arrayCount: 1,
						min: array.length,
						max: array.length,
						distribution: [{ length: array.length, count: 1 }],
						distributionExact: true,
					}
				: undefined,
			children: [],
		};
		if (primitive(input)) node.values = singleValue(input);
		if (type === "object") {
			const entries = Object.entries(input as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
			node.children = entries.map(([key, child]) => {
				const result = walk(child, [...path, { kind: "key", value: key }], depth + 1);
				result.presentInParents = 1;
				result.parentObjectCount = 1;
				return result;
			});
		} else if (type === "array" && array!.length) {
			const itemNodes = array!.map((item) => walk(item, [...path, { kind: "item" }], depth + 1));
			node.children = [merge(itemNodes, cap)];
			const groups = new Map<
				string,
				{ discriminator: LabelGroup["discriminator"]; value?: PrimitiveValue; nodes: ObservationNode[] }
			>();
			for (let index = 0; index < array!.length; index++) {
				const item = array![index],
					record =
						item !== null && typeof item === "object" && !Array.isArray(item)
							? (item as Record<string, unknown>)
							: undefined;
				const discriminator =
					record && primitive(record.label)
						? "label"
						: record && primitive(record.title)
							? "title"
							: "unclassified";
				const groupValue: PrimitiveValue | undefined =
					discriminator === "unclassified" ? undefined : (record![discriminator] as PrimitiveValue);
				const key =
					discriminator === "unclassified"
						? discriminator
						: discriminator + ":" + valueKey(jsonType(groupValue) as ValueFrequency["type"], groupValue!);
				const group = groups.get(key) ?? { discriminator, value: groupValue, nodes: [] as ObservationNode[] };
				group.nodes.push(itemNodes[index]);
				groups.set(key, group);
			}
			if (groups.size > 1 || !groups.has("unclassified"))
				node.labelGroups = [...groups.values()].map((group) => ({
					discriminator: group.discriminator,
					value: group.value,
					count: group.nodes.length,
					observation: merge(group.nodes, cap),
				}));
		}
		return node;
	};
	return walk(value, [], 0);
}

function mergeValues(nodes: ObservationNode[], cap: number): ValueSummary | undefined {
	const summaries = nodes.map((node) => node.values).filter((value): value is ValueSummary => Boolean(value));
	if (!summaries.length) return undefined;
	const values = new Map<string, ValueFrequency>();
	let occurrenceCount = 0,
		emptyStringCount = 0,
		capped = false;
	for (const summary of summaries) {
		occurrenceCount += summary.occurrenceCount;
		emptyStringCount += summary.emptyStringCount;
		if (!summary.distinctCountExact) capped = true;
		for (const item of summary.values) {
			const key = valueKey(item.type, item.value),
				existing = values.get(key);
			if (existing) existing.count += item.count;
			else if (values.size < cap) values.set(key, { ...item });
			else capped = true;
		}
	}
	return {
		occurrenceCount,
		distinctCount: values.size,
		distinctCountExact: !capped,
		emptyStringCount,
		values: [...values.values()].sort(
			(a, b) => b.count - a.count || valueKey(a.type, a.value).localeCompare(valueKey(b.type, b.value)),
		),
	};
}

function mergeArrayLengths(nodes: ObservationNode[], cap: number) {
	const summaries = nodes
		.map((node) => node.arrayLengths)
		.filter((summary): summary is NonNullable<typeof summary> => Boolean(summary));
	if (!summaries.length) return undefined;
	const distribution = new Map<number, number>();
	let arrayCount = 0,
		min = Number.POSITIVE_INFINITY,
		max = 0,
		exact = true;
	for (const summary of summaries) {
		arrayCount += summary.arrayCount;
		min = Math.min(min, summary.min);
		max = Math.max(max, summary.max);
		if (!summary.distributionExact) exact = false;
		for (const item of summary.distribution) {
			if (distribution.has(item.length) || distribution.size < cap)
				distribution.set(item.length, (distribution.get(item.length) ?? 0) + item.count);
			else exact = false;
		}
	}
	return {
		arrayCount,
		min,
		max,
		distribution: [...distribution]
			.map(([length, count]) => ({ length, count }))
			.sort((a, b) => a.length - b.length),
		distributionExact: exact,
	};
}

export function merge(nodes: ObservationNode[], cap = 200): ObservationNode {
	const first = nodes[0],
		output: ObservationNode = {
			path: first.path,
			types: {},
			occurrences: 0,
			objectCount: 0,
			nullCount: 0,
			emptyObjectCount: 0,
			arrayCount: 0,
			emptyArrayCount: 0,
			itemCount: 0,
			children: [],
		};
	for (const node of nodes) {
		output.occurrences += node.occurrences;
		output.objectCount += node.objectCount;
		output.nullCount += node.nullCount;
		output.emptyObjectCount += node.emptyObjectCount;
		output.arrayCount += node.arrayCount;
		output.emptyArrayCount += node.emptyArrayCount;
		output.itemCount += node.itemCount;
		output.minArrayLength =
			output.minArrayLength === undefined
				? node.minArrayLength
				: node.minArrayLength === undefined
					? output.minArrayLength
					: Math.min(output.minArrayLength, node.minArrayLength);
		output.maxArrayLength = Math.max(output.maxArrayLength ?? 0, node.maxArrayLength ?? 0);
		if (node.presentInParents !== undefined)
			output.presentInParents = (output.presentInParents ?? 0) + node.presentInParents;
		if (node.parentObjectCount !== undefined)
			output.parentObjectCount = (output.parentObjectCount ?? 0) + node.parentObjectCount;
		for (const [type, count] of Object.entries(node.types) as Array<[JsonType, number]>)
			output.types[type] = (output.types[type] ?? 0) + count;
	}
	output.values = mergeValues(nodes, cap);
	output.arrayLengths = mergeArrayLengths(nodes, 64);
	const children = new Map<string, ObservationNode[]>(),
		groups = new Map<string, LabelGroup[]>();
	for (const node of nodes) {
		for (const child of node.children) {
			const key = JSON.stringify(child.path.slice(-1)),
				list = children.get(key) ?? [];
			list.push(child);
			children.set(key, list);
		}
		for (const group of node.labelGroups ?? []) {
			const key =
				group.discriminator === "unclassified"
					? "unclassified"
					: group.discriminator +
						":" +
						valueKey(jsonType(group.value) as ValueFrequency["type"], group.value!);
			const list = groups.get(key) ?? [];
			list.push(group);
			groups.set(key, list);
		}
	}
	output.children = [...children.values()]
		.map((list) => merge(list, cap))
		.sort((a, b) => JSON.stringify(a.path.at(-1)).localeCompare(JSON.stringify(b.path.at(-1))));
	output.labelGroups = [...groups.values()].map((list) => ({
		discriminator: list[0].discriminator,
		value: list[0].value,
		count: list.reduce((sum, group) => sum + group.count, 0),
		observation: merge(
			list.map((group) => group.observation),
			cap,
		),
	}));
	if (!output.labelGroups.length) delete output.labelGroups;
	if (output.objectCount)
		for (const child of output.children.filter((child) => child.path.at(-1)?.kind === "key")) {
			child.presentInParents = child.occurrences;
			child.parentObjectCount = output.objectCount;
		}
	return output;
}
