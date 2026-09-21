import type { ObservationNode, PrimitiveValue } from "./inventory.ts";

export type Annotation =
	| { kind: "array"; text: string; detail: string }
	| { kind: "constant"; text: string }
	| { kind: "presence"; text: string }
	| { kind: "types"; text: string };

const valueText = (value: PrimitiveValue) => (value === null ? "null" : JSON.stringify(value));
const itemText = (count: number) => count + " item" + (count === 1 ? "" : "s");

export function annotationsFor(node: ObservationNode): Annotation[] {
	const annotations: Annotation[] = [];
	if (node.arrayLengths) {
		const { arrayCount, min, max, distribution, distributionExact } = node.arrayLengths;
		const only = distribution.length === 1 ? distribution[0] : undefined;
		if (only?.length === 0)
			annotations.push({ kind: "array", text: "always empty", detail: "Element type unknown." });
		else if (only && arrayCount > 1)
			annotations.push({
				kind: "array",
				text: "exactly " + itemText(only.length),
				detail: arrayCount + " observed arrays.",
			});
		else if (only)
			annotations.push({
				kind: "array",
				text: itemText(only.length) + " in the single observed array",
				detail: "Limited evidence.",
			});
		else if (distributionExact) {
			const dominant = [...distribution].sort((a, b) => b.count - a.count)[0];
			if (arrayCount >= 2 && dominant.count / arrayCount >= 0.95)
				annotations.push({
					kind: "array",
					text: "usually " + itemText(dominant.length),
					detail: dominant.count + " / " + arrayCount + " observed arrays.",
				});
			else
				annotations.push({
					kind: "array",
					text: min + "–" + max + " items",
					detail: arrayCount + " observed arrays.",
				});
		} else
			annotations.push({
				kind: "array",
				text: min + "–" + max + " items",
				detail: "Length distribution coverage is incomplete.",
			});
	}
	if (
		node.values?.distinctCountExact &&
		node.values.values.length === 1 &&
		node.values.values[0].count === node.values.occurrenceCount
	)
		annotations.push({ kind: "constant", text: "always " + valueText(node.values.values[0].value) });
	if (
		node.parentObjectCount &&
		node.presentInParents !== undefined &&
		node.presentInParents !== node.parentObjectCount
	)
		annotations.push({
			kind: "presence",
			text: node.presentInParents + " / " + node.parentObjectCount + " objects",
		});
	if (Object.keys(node.types).length > 1) annotations.push({ kind: "types", text: "multiple observed types" });
	return annotations;
}
