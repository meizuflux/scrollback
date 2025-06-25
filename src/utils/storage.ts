import { createResource } from "solid-js";
import { db } from "@/db/database";

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

export const isDataLoaded = () => {
    return localStorage.getItem("loaded") === "true";
};

export const clearData = async (): Promise<void> => {
    localStorage.clear();

    if (opfsSupported()) {
        // @ts-ignore: https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system#deleting_a_file_or_folder
        await (await navigator.storage.getDirectory())?.remove({ recursive: true });
    }

    await db.delete();
};