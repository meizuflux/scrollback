import { opendir, lstat } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import type { Diagnostic } from "./inventory.ts";
export interface DiscoveredFile {
	path: string;
	absolutePath: string;
	size: number;
}
export interface Discovery {
	files: DiscoveredFile[];
	excludedNonJsonFiles: number;
}
export async function discover(
	root: string,
	excludedOutput: string | undefined,
	diagnostics: Diagnostic[],
): Promise<Discovery> {
	const files: DiscoveredFile[] = [];
	let excludedNonJsonFiles = 0;
	const excluded = excludedOutput ? resolve(excludedOutput) : undefined;
	async function visit(directory: string): Promise<void> {
		for await (const entry of await opendir(directory)) {
			const absolutePath = resolve(directory, entry.name);
			if (excluded && absolutePath === excluded) {
				diagnostics.push({
					code: "OUTPUT_EXCLUDED",
					severity: "warning",
					message: "Output directory was excluded from the scan.",
				});
				continue;
			}
			const stat = await lstat(absolutePath),
				path = relative(root, absolutePath).split(sep).join("/");
			if (stat.isSymbolicLink())
				diagnostics.push({
					code: "SYMLINK_SKIPPED",
					severity: "warning",
					message: `Skipped symbolic link: ${path}`,
				});
			else if (stat.isDirectory()) await visit(absolutePath);
			else if (stat.isFile()) {
				if (entry.name.toLowerCase().endsWith(".json")) files.push({ path, absolutePath, size: stat.size });
				else excludedNonJsonFiles++;
			}
		}
	}
	await visit(root);
	return { files: files.sort((a, b) => a.path.localeCompare(b.path)), excludedNonJsonFiles };
}
