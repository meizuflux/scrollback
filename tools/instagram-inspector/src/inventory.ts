export const FORMAT_VERSION = 5;
export const SCANNER_VERSION = "0.5.0";
export type JsonType = "object" | "array" | "string" | "number" | "boolean" | "null";
export type ScanStatus = "analyzed" | "failed" | "skipped";
export type CategoryId =
	| "messages"
	| "connections"
	| "content"
	| "interactions"
	| "personal-information"
	| "ads"
	| "tool-metadata"
	| "other";
export interface Diagnostic {
	code:
		| "SYMLINK_SKIPPED"
		| "JSON_PARSE_FAILED"
		| "FILE_TOO_LARGE"
		| "DEPTH_LIMIT"
		| "NODE_LIMIT"
		| "READ_FAILED"
		| "OUTPUT_EXCLUDED"
		| "AMBIGUOUS_ROOT";
	severity: "warning" | "error";
	fileId?: string;
	message: string;
}
export type PrimitiveValue = string | number | boolean | null;
export interface ValueFrequency {
	type: "string" | "number" | "boolean" | "null";
	value: PrimitiveValue;
	count: number;
}
export interface ValueSummary {
	occurrenceCount: number;
	distinctCount: number;
	distinctCountExact: boolean;
	emptyStringCount: number;
	values: ValueFrequency[];
}
export interface ArrayLengthSummary {
	arrayCount: number;
	min: number;
	max: number;
	distribution: Array<{ length: number; count: number }>;
	distributionExact: boolean;
}
export interface LabelGroup {
	discriminator: "label" | "title" | "unclassified";
	value?: PrimitiveValue;
	count: number;
	observation: ObservationNode;
}
export interface LabelGroupSummary {
	count: number;
	discriminators: Array<"label" | "title">;
}
export interface ObservationNode {
	path: Array<{ kind: "key"; value: string } | { kind: "item" }>;
	types: Partial<Record<JsonType, number>>;
	occurrences: number;
	objectCount: number;
	nullCount: number;
	emptyObjectCount: number;
	arrayCount: number;
	emptyArrayCount: number;
	itemCount: number;
	minArrayLength?: number;
	maxArrayLength?: number;
	arrayLengths?: ArrayLengthSummary;
	presentInParents?: number;
	parentObjectCount?: number;
	values?: ValueSummary;
	labelGroups?: LabelGroup[];
	labelGroupSummary?: LabelGroupSummary;
	children: ObservationNode[];
}
export interface FileInventory {
	id: string;
	path: string;
	size: number;
	categoryId: CategoryId;
	familyId: string;
	status: ScanStatus;
	rootType?: JsonType;
	observation?: ObservationNode;
	part?: number;
}
export interface Category {
	id: CategoryId;
	name: string;
	familyIds: string[];
	fileCount: number;
	issueCount: number;
}
export interface Family {
	id: string;
	name: string;
	pathContext: string;
	registered: boolean;
	rule: string;
	categoryId: CategoryId;
	memberIds: string[];
	totalBytes: number;
	directories: string[];
	parts: number[];
	rootTypes: Partial<Record<JsonType, number>>;
	variations: string[];
	aggregate?: ObservationNode;
	contributingFileCount: number;
}
export interface Inventory {
	formatVersion: number;
	scannerVersion: string;
	scan: {
		timestamp: string;
		sourceName: string;
		options: { maxFileBytes: number; maxDepth: number; maxNodes: number; valueDistinctCap?: number };
		complete: boolean;
		scope: "json-only";
		excludedNonJsonFiles: number;
		limitations: string[];
	};
	summary: { totalFiles: number; totalBytes: number; analyzedJson: number; failedJson: number; skippedJson: number };
	files: FileInventory[];
	categories: Category[];
	families: Family[];
	diagnostics: Diagnostic[];
}
export const pathText = (path: ObservationNode["path"]): string =>
	path
		.map((s) =>
			s.kind === "item" ? "[]" : /^[A-Za-z_$][\w$]*$/.test(s.value) ? s.value : `[${JSON.stringify(s.value)}]`,
		)
		.join(".")
		.replace(".[]", "[]") || "(root)";
