import { db } from "../db/database";
import importUsers from "./users";
import importMessages from "./messages";

export const importData = async (files: File[], onProgress?: (progress: number, step: string) => void) => {
	// Clear existing data
	await db.delete();
	await db.open();

	const importers = [
		{ 
			name: "Processing users...", 
			fn: (progressCallback: (progress: number, step: string) => void) => importUsers(files, db, progressCallback),
			weight: 0.3 // 30% of total progress
		},
		{ 
			name: "Processing messages...", 
			fn: (progressCallback: (progress: number, step: string) => void) => importMessages(files, db, progressCallback),
			weight: 0.7 // 70% of total progress
		},
	];

	// Track progress for each importer
	const progressTrackers = importers.map(() => ({ progress: 0, step: "" }));
	
	const updateOverallProgress = () => {
		const totalProgress = progressTrackers.reduce((sum, tracker, index) => {
			return sum + (tracker.progress / 100) * importers[index].weight * 100;
		}, 0);
		
		// Show combined status of both importers
		const activeSteps = progressTrackers
			.map((tracker, index) => tracker.progress > 0 && tracker.progress < 100 ? tracker.step : null)
			.filter(Boolean);
		
		const completedSteps = progressTrackers
			.map((tracker, index) => tracker.progress === 100 ? importers[index].name.replace('...', '') : null)
			.filter(Boolean);
		
		let statusMessage = "Processing...";
		if (activeSteps.length > 0) {
			statusMessage = activeSteps.join(" | ");
		} else if (completedSteps.length > 0) {
			statusMessage = `Completed: ${completedSteps.join(", ")}`;
		}
		
		onProgress?.(totalProgress, statusMessage);
	};

	// Run importers in parallel
	await Promise.all(
		importers.map(async (importer, index) => {
			const progressCallback = (progress: number, step: string) => {
				progressTrackers[index] = { progress, step };
				updateOverallProgress();
			};

			progressCallback(0, importer.name);
			await importer.fn(progressCallback);
		})
	);

	onProgress?.(100, "Import complete!");

	/* TODO: save misc stats to local storage
        - number of saved posts
        - number of stories
        - profile based in

    could potentially gather all the timestamps from everything and display it as a graph to determine activity over time / when most active based on number of events?
    probably interactable, filterable graph preferably

    lots of information missing on the data request zip
    */
};
