import { db } from "../db/database";
import importUsers from "./users";
import importMessages from "./messages";

export const importData = async (files: File[], onProgress?: (progress: number, step: string) => void) => {
	// Clear existing data
	await db.delete();
	await db.open();

	const importers = [
		{ name: "Processing users...", fn: () => importUsers(files, db) },
		{ name: "Processing messages...", fn: () => importMessages(files, db) },
	];

	for (let i = 0; i < importers.length; i++) {
		const importer = importers[i];
		onProgress?.((i / importers.length) * 100, importer.name);
		await importer.fn();
	}

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
