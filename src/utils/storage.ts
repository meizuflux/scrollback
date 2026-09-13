import { createResource } from "solid-js";
import { db } from "@/db/database";
import { clearDemoMode } from "@/utils/demo";

export const [opfsSupported] = createResource(async () => {
	try {
		const dir = await navigator.storage.getDirectory();
		const fileHandle = await dir.getFileHandle("opfs_support.txt", {
			create: true,
		});
		const writer = await fileHandle.createWritable();

		await writer.write("");
		await writer.close();

		return true;
	} catch {
		return false;
	}
});

export const isDataLoaded = (): boolean => {
	return localStorage.getItem("loaded") === "true";
};

export const markDataLoaded = (): void => {
	localStorage.setItem("loaded", "true");
};

export const clearData = async (): Promise<void> => {
	for (const key of ["loaded", "analysis_cache", "conversation_stats_cache", "import_metadata"]) localStorage.removeItem(key);
	clearDemoMode();

	if (opfsSupported()) {
		try {
			const root = await navigator.storage.getDirectory();
			await root.removeEntry("media", { recursive: true });
		} catch (error) {
			// A missing media directory is already a cleared state.
			if (!(error instanceof DOMException && error.name === "NotFoundError")) throw error;
		}
	}

	await db.delete();
};
