import { type StoredMediaMetadata, type StoredVirtualFile, db } from "@/db/database";
import { opfsSupported } from "@/utils/storage";

export const findFile = (files: File[], path: string): File | undefined => {
	return files.find((file) => file.webkitRelativePath.endsWith(path));
};

export const loadFile = async <T>(files: File[], path: string): Promise<T | null> => {
	const file = findFile(files, path);
	if (!file) {
		return null;
	}

	return await file.text().then(JSON.parse);
};

export function getFileType(filename: string): string {
	const ext = filename.split(".").pop()!.toLowerCase();
	const mimeTypes: Record<string, string> = {
		txt: "text/plain",
		html: "text/html",
		css: "text/css",
		js: "application/javascript",
		json: "application/json",
		xml: "application/xml",
		pdf: "application/pdf",
		jpg: "image/jpeg",
		jpeg: "image/jpeg",
		png: "image/png",
		gif: "image/gif",
		svg: "image/svg+xml",
		zip: "application/zip",
		doc: "application/msword",
		docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		mp3: "audio/mpeg",
		wav: "audio/wav",
		ogg: "audio/ogg",
		m4a: "audio/mp4",
		aac: "audio/aac",
		flac: "audio/flac",
		mp4: "video/mp4",
		avi: "video/avi",
		mov: "video/quicktime",
		webm: "video/webm",
	};
	return mimeTypes[ext] || "application/octet-stream";
}

// insta messages are encoded, like urls and stuff like that so we have to parse it like this
export const decodeU8String = (encodedText: string): string => {
	try {
		const decoder = new TextDecoder("utf-8");
		const bytes = new Uint8Array(encodedText.length);
		for (let i = 0; i < encodedText.length; i++) {
			bytes[i] = encodedText.charCodeAt(i);
		}
		return decoder.decode(bytes);
	} catch (error) {
		console.error("Decoding error:", error);
		return encodedText; // Fallback in case of errors
	}
};

export const processMediaFilesBatched = async (
	mediaFiles: StoredMediaMetadata[],
	updateProgress?: (progress: number, statusText?: string) => void,
): Promise<StoredMediaMetadata[]> => {
	const isOPFS = opfsSupported();

	const batchSize = isOPFS ? 150 : 50; // Smaller batches for IndexedDB
	const results: StoredMediaMetadata[] = [];

	let mediaDir: FileSystemDirectoryHandle | undefined;
	if (isOPFS) {
		const opfs = await navigator.storage.getDirectory();
		mediaDir = await opfs.getDirectoryHandle("media", { create: true });
	}

	for (let i = 0; i < mediaFiles.length; i += batchSize) {
		const batch = mediaFiles.slice(i, i + batchSize);

		if (updateProgress) {
			const progress = (i / mediaFiles.length) * 100;
			updateProgress(progress, `Processing batch ${Math.floor(i / batchSize) + 1}...`);
		}

		if (isOPFS) {
			// OPFS batch processing
			const batchResults = await Promise.all(
				batch.map(async (media) => {
					const opfsFileName = await saveMediaFile(mediaDir!, media);
					return {
						uri: media.uri,
						timestamp: media.timestamp,
						type: media.type,
						fileName: opfsFileName,
					};
				}),
			);
			results.push(...batchResults);
		} else {
			// indexeddb
			const virtualFiles: StoredVirtualFile[] = [];
			const processedMedia: StoredMediaMetadata[] = [];

			for (const media of batch) {
				if (!media.data || !(media.data instanceof File)) {
					continue;
				}

				const flatFileName = media.uri
					.replace(/^\/+/, "")
					.replace(/\//g, "_")
					.replace(/[<>:"|?*]/g, "_");

				const blob = new Blob([await media.data.arrayBuffer()], {
					type: media.data.type,
				});

				virtualFiles.push({
					fileName: flatFileName,
					blob,
					timestamp: media.timestamp,
					size: blob.size,
				});

				processedMedia.push({
					uri: media.uri,
					timestamp: media.timestamp,
					type: media.type,
					fileName: flatFileName,
				});
			}

			// Bulk insert virtual files
			if (virtualFiles.length > 0) {
				await db.virtualFS.bulkPut(virtualFiles);
			}
			results.push(...processedMedia);
		}
	}

	if (updateProgress) {
		updateProgress(100, "Media processing complete");
	}

	return results;
};

// "your_instagram_activity/messages/inbox/{conversation_name}_{user_id}/photos/{unique_id}.{file_extension}"

export const saveMediaFile = async (
	mediaDir: FileSystemDirectoryHandle,
	media: StoredMediaMetadata,
): Promise<string> => {
	if (!media.data || !(media.data instanceof File)) {
		throw new Error(`No file data provided for media file: ${media.uri}`);
	}

	// Flatten the URI into a single filename
	const flatFileName = media.uri
		.replace(/^\/+/, "") // Remove leading slashes
		.replace(/\//g, "_") // Replace slashes with underscores
		.replace(/[<>:"|?*]/g, "_"); // Replace invalid filesystem chars

	const fileHandle = await mediaDir.getFileHandle(flatFileName, {
		create: true,
	});
	const writer = await fileHandle.createWritable();

	// Stream file directly without loading into memory
	const stream = media.data.stream();
	await stream.pipeTo(writer);

	return flatFileName;
};

export const getSavedMediaFile = async (fileName: string): Promise<File | null> => {
	if (opfsSupported()) {
		try {
			const opfs = await navigator.storage.getDirectory();
			const mediaDir = await opfs.getDirectoryHandle("media", {
				create: false,
			});
			const fileHandle = await mediaDir.getFileHandle(fileName, {
				create: false,
			});
			return await fileHandle.getFile();
		} catch (error) {
			console.warn(`File ${fileName} not found in OPFS:`, error);
			return null;
		}
	} else {
		try {
			const virtualFile = await db.virtualFS.get(fileName);
			if (virtualFile) {
				return new File([virtualFile.blob], fileName, {
					type: virtualFile.blob.type,
					lastModified: virtualFile.timestamp.getTime(),
				});
			}
			return null;
		} catch (error) {
			console.warn(`File ${fileName} not found in IndexedDB:`, error);
			return null;
		}
	}
};

export const getMediaFileFromMetadata = async (media: StoredMediaMetadata): Promise<File | null> => {
	if (!media.fileName) {
		console.warn("No storage filename found for media:", media.uri);
		return null;
	}

	return await getSavedMediaFile(media.fileName);
};

export const createMediaURL = async (media: StoredMediaMetadata): Promise<string | null> => {
	const file = await getMediaFileFromMetadata(media);
	if (!file) {
		return null;
	}

	return URL.createObjectURL(file);
};
