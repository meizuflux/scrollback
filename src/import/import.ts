import { db } from "../db/database";
import { importUser, importContent, importProfileChanges } from "./user";
import importConnections from "./connections";
import importMessages from "./messages";
import interactionImporters from "./interactions";

export const importData = async (files: File[]) => {
	// Clear existing data
	await db.delete();
	await db.open();

	const importers = [
		importUser,
		importContent,
		importProfileChanges,
		...interactionImporters,
		importConnections,
		importMessages,
	];

	// Run importers in parallel
	await Promise.all(
		importers.map(async (importer, _) => {
			await importer(files, db);
		})
	);

	/* TODO: 
		- multiple progress bars for each import since they happen in parallel?
		- perf stats for each import, and overall indexeddb size, metadata like time of import, etc
	
	save misc stats to local storage
        - number of saved posts
        - number of stories
        - profile based in

    could potentially gather all the timestamps from everything and display it as a graph to determine activity over time / when most active based on number of events?
    probably interactable, filterable graph preferably

    lots of information missing on the data request zip
    */
};
