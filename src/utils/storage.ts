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

export const getStoredValue = (key: string): string | null => {
	return localStorage.getItem(key);
};

export const setStoredValue = (key: string, value: string): void => {
	localStorage.setItem(key, value);
};

export const removeStoredValue = (key: string): void => {
	localStorage.removeItem(key);
};

export const clearData = async (): Promise<void> => {
	for (const key of ["loaded", "analysis_cache", "import_metadata"]) localStorage.removeItem(key);
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
