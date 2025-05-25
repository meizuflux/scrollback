import { db } from "../db/database";
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
}

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
	unzipped: boolean,
) => {
	const importStartTime = performance.now();

	await db.delete();
	await db.open();

	const totalFileSize = files.reduce((sum, file) => sum + file.size, 0);
	const fileCount = files.length;

	// Process all import steps in parallel
	await Promise.all(
		importSteps.map(({ name, fn }) =>
			fn(files, db, (progress, statusText) => updateSteps(name, progress, statusText)),
		),
	);

	const totalDuration = performance.now() - importStartTime;
	const metadata: ImportMetadata = {
		timestamp: Date.now(),
		totalDuration,
		fileCount,
		totalFileSize,
	};

	localStorage.setItem("import_metadata", JSON.stringify(metadata));
};
