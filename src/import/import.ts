import { db } from "../db/database";
import { importUser, importContent, importProfileChanges } from "./user";
import importConnections from "./connections";
import importMessages from "./messages";
import { importPostLikes, importSavedPosts, importComments } from "./interactions";
import { Setter } from "solid-js";

interface ImportStep {
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

const createImportWrapper = (
	stepName: string,
	stepFunction: (files: File[], db: any, onProgress: (progress: number, statusText?: string) => void) => Promise<void>,
	stepIndex: number,
	setImportSteps: Setter<ImportStep[]>
) => {
	return async (files: File[], database: any): Promise<{ name: string; duration: number; }> => {
		const startTime = performance.now();
		
		// Initialize step
		setImportSteps((steps) => {
			const updatedSteps = [...steps];
			updatedSteps[stepIndex] = {
				name: stepName,
				progress: 0,
				statusText: "Starting...",
			};
			return updatedSteps;
		});

		const onStepProgress = (progress: number, statusText?: string) => {
			setImportSteps((steps) => {
				const updatedSteps = [...steps];
				updatedSteps[stepIndex] = {
					...updatedSteps[stepIndex],
					progress: progress,
					statusText: statusText || updatedSteps[stepIndex].statusText,
				};
				return updatedSteps;
			});
		};

		await stepFunction(files, database, onStepProgress);
		const duration = performance.now() - startTime;

		return { name: stepName, duration };

	};
};

export const importData = async (files: File[], setImportSteps: Setter<ImportStep[]>) => {
	const importStartTime = performance.now();

	await db.delete();
	await db.open();

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

	// Create wrapped functions for parallel execution
	const wrappedFunctions = importFunctionList.map(([stepName, stepFunction], index) =>
		createImportWrapper(stepName, stepFunction, index, setImportSteps)
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
