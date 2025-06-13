import { db } from "@/db/database";
import { importUser, importContent, importProfileChanges } from "./user";
import importConnections from "./connections";
import importMessages from "./messages";
import { importPostLikes, importSavedPosts, importComments } from "./interactions";

export interface ImportStep {
	name: string;
	progress: number;
	statusText?: string;
}

interface ImportMetadata {
	timestamp: number;
	totalDuration: number;
	fileCount: number;
	totalFileSize: number;
	stepDurations: { [stepName: string]: number };
}

export type ProgFn = (progress: number, statusText?: string) => void;

const importSteps = [
	{ name: "Importing Messages", fn: importMessages },
	{ name: "Importing Content", fn: importContent },
	{ name: "Importing Connections", fn: importConnections },
	{ name: "Importing User Data", fn: importUser },
	{ name: "Importing Profile Changes", fn: importProfileChanges },
	{ name: "Importing Post Likes", fn: importPostLikes },
	{ name: "Importing Saved Posts", fn: importSavedPosts },
	{ name: "Importing Comments", fn: importComments },
];

export const importData = async (
	files: File[],
	updateSteps: (name: string, progress: number, statusText?: string) => void,
	unzipDuration?: number,
) => {
	const importStartTime = performance.now();

	await db.delete();
	await db.open();

	const totalFileSize = files.reduce((sum, file) => sum + file.size, 0);
	const fileCount = files.length;
	const stepDurations: { [stepName: string]: number } = {};
	if (unzipDuration) {
		stepDurations["Unzipping"] = unzipDuration;
	}

	await Promise.all(
		importSteps.map(async ({ name, fn }) => {
			const stepStartTime = performance.now();
			await fn(files, db, (progress, statusText?) => updateSteps(name, progress, statusText));
			stepDurations[name] = performance.now() - stepStartTime;
		}),
	);

	const totalDuration = performance.now() - importStartTime;
	const metadata: ImportMetadata = {
		timestamp: Date.now(),
		totalDuration,
		fileCount,
		totalFileSize,
		stepDurations,
	};

	localStorage.setItem("import_metadata", JSON.stringify(metadata));
};
