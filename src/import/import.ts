import { db } from "../db/database";
import { importUser, importContent, importProfileChanges } from "./user";
import importConnections from "./connections";
import importMessages from "./messages";
import { importPostLikes, importSavedPosts, importComments } from "./interactions";
import { Setter } from "solid-js";

export interface ImportStep {
	name: string;
	progress?: number;
	statusText?: string;
}

interface ImportMetadata {
	timestamp: number;
	totalDuration: number;
	fileCount: number;
	totalFileSize: number;
	stepDurations: Record<string, number>;
}

const importFunctionList: [string, (files: File[], db: any, onStepProgress: (progress: number, statusText?: string) => void) => Promise<void>][] = [
		["Importing Messages", importMessages],
		["Importing Content", importContent],
		["Importing Connections", importConnections],
		["Importing User Data", importUser],
		["Importing Profile Changes", importProfileChanges],
		["Importing Post Likes", importPostLikes],
		["Importing Saved Posts", importSavedPosts],
		["Importing Comments", importComments],
	];

const createImportWrapper = (
	stepName: string,
	stepFunction: (files: File[], db: any, onProgress: (progress: number, statusText?: string) => void) => Promise<void>,
	updateSteps: (name: string, progress: number, statusText?: string) => void
) => {
	return async (files: File[], database: any): Promise<{ name: string; duration: number; }> => {
		const startTime = performance.now();
		
		// Initialize step
		updateSteps(stepName, 0, "Starting...");

		const onStepProgress = (progress: number, statusText?: string) => {
			updateSteps(stepName, progress, statusText);
		};

		await stepFunction(files, database, onStepProgress);
		const duration = performance.now() - startTime;

		return { name: stepName, duration };

	};
};

export const importData = async (files: File[], updateSteps: (name: string, progress: number, statusText?: string) => void, unzipped: boolean) => {
	const importStartTime = performance.now();

	await db.delete();
	await db.open();

	// Create wrapped functions for parallel execution
	const wrappedFunctions = importFunctionList.map(([stepName, stepFunction]) =>
		createImportWrapper(stepName, stepFunction, updateSteps)
	);

	const totalFileSize = files.reduce((sum, file) => sum + file.size, 0);
	const fileCount = files.length;

		
	const results = await Promise.all(
		wrappedFunctions.map(wrappedFn => wrappedFn(files, db))
	);
	const totalDuration = performance.now() - importStartTime;

	const metadata: ImportMetadata = {
		timestamp: Date.now(),
		totalDuration,
		fileCount,
		totalFileSize,
		stepDurations: {},
	};

	results.forEach(result => {
		metadata.stepDurations[result.name] = result.duration;
	});
	
	localStorage.setItem('import_metadata', JSON.stringify(metadata));
};