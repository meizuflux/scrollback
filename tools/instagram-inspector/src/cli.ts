import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { basename, resolve, relative, sep } from "node:path";
import { constants } from "node:fs";
import { AnalysisLimitError, jsonType, merge, observe } from "./analyze.ts";
import { discover } from "./discover.ts";
import { categoryName, matchFamily } from "./families.ts";
import { compactInventory } from "./compact.ts";
import {
	FORMAT_VERSION,
	SCANNER_VERSION,
	type Category,
	type Diagnostic,
	type Family,
	type FileInventory,
	type Inventory,
} from "./inventory.ts";
import { renderReport } from "./report.ts";
const defaults = { maxFileBytes: 25 * 1024 * 1024, maxDepth: 80, maxNodes: 200_000 };
function parse(args: string[]) {
	const positional: string[] = [],
		options = { ...defaults, overwrite: false, out: undefined as string | undefined };
	for (let i = 0; i < args.length; i++) {
		const a = args[i];
		if (!a.startsWith("--")) positional.push(a);
		else if (a === "--overwrite") options.overwrite = true;
		else if (["--out", "--max-file-bytes", "--max-depth", "--max-nodes"].includes(a)) {
			const value = args[++i];
			if (!value) throw Error("Missing option value");
			if (a === "--out") options.out = value;
			else
				options[
					a.slice(2).replace(/-([a-z])/g, (_, x) => x.toUpperCase()) as
						| "maxFileBytes"
						| "maxDepth"
						| "maxNodes"
				] = Number(value);
		} else throw Error(`Unknown option: ${a}`);
	}
	if (positional.length !== 1) throw Error("Provide one extracted-export directory.");
	return { root: resolve(positional[0]), options };
}
const exists = async (path: string) => {
	try {
		await access(path, constants.F_OK);
		return true;
	} catch {
		return false;
	}
};
async function main() {
	let parsed;
	try {
		parsed = parse(process.argv.slice(2));
	} catch (error) {
		console.error(
			`Usage: bun run instagram:scan <extracted-export> [--out <directory>] [--overwrite]\n${error instanceof Error ? error.message : ""}`,
		);
		process.exit(1);
		return;
	}
	const { root, options } = parsed;
	if (!(await exists(root))) {
		console.error(`Input directory does not exist: ${root}`);
		process.exit(1);
		return;
	}
	const output = resolve(options.out ?? `scan-reports/${basename(root)}`);
	if ((await exists(output)) && !options.overwrite) {
		console.error(`Output already exists: ${output}\nUse --overwrite to replace its report files.`);
		process.exit(1);
		return;
	}
	const diagnostics: Diagnostic[] = [];
	const discovery = await discover(root, output.startsWith(root + sep) ? output : undefined, diagnostics);
	const files: FileInventory[] = [];
	console.log(
		`Scanning ${discovery.files.length} JSON files (${discovery.excludedNonJsonFiles} non-JSON files excluded)…`,
	);
	for (let i = 0; i < discovery.files.length; i++) {
		const source = discovery.files[i],
			id = `file:${String(i + 1).padStart(6, "0")}`,
			match = matchFamily(source.path),
			file: FileInventory = {
				id,
				path: source.path,
				size: source.size,
				categoryId: match.categoryId,
				familyId: match.id,
				status: "skipped",
				part: match.part,
			};
		if (source.size > options.maxFileBytes)
			diagnostics.push({
				code: "FILE_TOO_LARGE",
				severity: "warning",
				fileId: id,
				message: `JSON analysis skipped because the file exceeds the configured size limit (${options.maxFileBytes} bytes).`,
			});
		else
			try {
				const value = JSON.parse(await readFile(source.absolutePath, "utf8"));
				file.rootType = jsonType(value);
				file.observation = observe(value, options);
				file.status = "analyzed";
			} catch (error) {
				const code =
					error instanceof AnalysisLimitError
						? error.code
						: error instanceof SyntaxError
							? "JSON_PARSE_FAILED"
							: "READ_FAILED";
				file.status = code === "JSON_PARSE_FAILED" || code === "READ_FAILED" ? "failed" : "skipped";
				diagnostics.push({
					code,
					severity: "error",
					fileId: id,
					message:
						code === "JSON_PARSE_FAILED"
							? "JSON could not be parsed."
							: code === "READ_FAILED"
								? "JSON file could not be read."
								: `JSON analysis stopped at the configured ${code === "DEPTH_LIMIT" ? "nesting-depth" : "structural-node"} limit.`,
				});
			}
		files.push(file);
	}
	const families = new Map<string, Family>();
	for (const file of files) {
		const match = matchFamily(file.path);
		let family = families.get(match.id);
		if (!family) {
			family = {
				id: match.id,
				name: match.name,
				pathContext: match.pathContext,
				registered: match.registered,
				rule: match.rule,
				categoryId: match.categoryId,
				memberIds: [],
				totalBytes: 0,
				directories: [],
				parts: [],
				rootTypes: {},
				variations: [],
				contributingFileCount: 0,
			};
			families.set(match.id, family);
		}
		family.memberIds.push(file.id);
		family.totalBytes += file.size;
		if (!family.directories.includes(match.pathContext)) family.directories.push(match.pathContext);
		if (file.part !== undefined) family.parts.push(file.part);
		if (file.rootType) family.rootTypes[file.rootType] = (family.rootTypes[file.rootType] ?? 0) + 1;
	}
	for (const family of families.values()) {
		const observed = family.memberIds
			.map((id) => files.find((f) => f.id === id)?.observation)
			.filter((x): x is NonNullable<typeof x> => Boolean(x));
		family.contributingFileCount = observed.length;
		if (observed.length) {
			family.aggregate = merge(observed);
			if (Object.keys(family.rootTypes).length > 1) family.variations.push("Multiple JSON root types observed");
			let mixed = 0;
			const visit = (node: NonNullable<typeof family.aggregate>) => {
				if (Object.keys(node.types).length > 1) mixed++;
				node.children.forEach(visit);
			};
			visit(family.aggregate);
			if (mixed) family.variations.push(`${mixed} field${mixed === 1 ? "" : "s"} with multiple observed types`);
		}
	}
	const categories: Category[] = (Object.keys(categoryName) as Array<keyof typeof categoryName>)
		.map((id) => {
			const fs = [...families.values()].filter((f) => f.categoryId === id);
			return {
				id,
				name: categoryName[id],
				familyIds: fs.map((f) => f.id),
				fileCount: fs.reduce((n, f) => n + f.memberIds.length, 0),
				issueCount: fs.reduce(
					(n, f) =>
						n + f.memberIds.filter((fid) => files.find((x) => x.id === fid)?.status !== "analyzed").length,
					0,
				),
			};
		})
		.filter((c) => c.fileCount);
	const incomplete = diagnostics.some((d) => d.code !== "SYMLINK_SKIPPED" && d.code !== "OUTPUT_EXCLUDED");
	const inventory: Inventory = {
		formatVersion: FORMAT_VERSION,
		scannerVersion: SCANNER_VERSION,
		scan: {
			timestamp: new Date().toISOString(),
			sourceName: basename(root),
			options: { maxFileBytes: options.maxFileBytes, maxDepth: options.maxDepth, maxNodes: options.maxNodes },
			complete: !incomplete,
			scope: "json-only",
			excludedNonJsonFiles: discovery.excludedNonJsonFiles,
			limitations: [
				"JSON parsing holds one individual JSON file in memory.",
				"Raw values and source absolute paths are omitted.",
				"Observed presence does not mean required.",
			],
		},
		summary: {
			totalFiles: files.length,
			totalBytes: files.reduce((n, f) => n + f.size, 0),
			analyzedJson: files.filter((f) => f.status === "analyzed").length,
			failedJson: files.filter((f) => f.status === "failed").length,
			skippedJson: files.filter((f) => f.status === "skipped").length,
		},
		files,
		categories,
		families: [...families.values()].sort(
			(a, b) => a.name.localeCompare(b.name) || a.pathContext.localeCompare(b.pathContext),
		),
		diagnostics,
	};
	await mkdir(output, { recursive: true });
	const compact = compactInventory(inventory);
	await writeFile(resolve(output, "inventory.json"), `${JSON.stringify(compact, null, 2)}\n`);
	await writeFile(resolve(output, "report.html"), renderReport(compact));
	console.log(
		`Wrote ${relative(process.cwd(), output) || output}/inventory.json and report.html (${inventory.scan.complete ? "complete" : "incomplete"} scan).`,
	);
	process.exitCode = inventory.scan.complete ? 0 : 2;
}
main();
