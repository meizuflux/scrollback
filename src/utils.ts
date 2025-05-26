import { Unzip, AsyncUnzipInflate } from "fflate";
import { StoredMedia } from "./db/database";

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

function getFileType(filename: string): string {
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
		webm: "video/webm"
	};
	return mimeTypes[ext] || "application/octet-stream";
}

export const extractZipToFiles = async (
	zipFile: File,
	updateSteps: (name: string, progress: number, statusText?: string) => void,
): Promise<File[]> => {
	updateSteps("Unzipping files", 0, "Reading ZIP file...");
	const arrayBuffer = await zipFile.arrayBuffer();
	const zipData = new Uint8Array(arrayBuffer);

	return new Promise<File[]>((resolve, _) => {
		const extractedFiles: File[] = [];

		let totalFiles = 0;
		let filesProcessed = 0;
		let discoveryComplete = false;

		const checkCompletion = () => {
			if (discoveryComplete && filesProcessed === totalFiles) {
				updateSteps("Unzipping files", 100, "All files extracted successfully.");
				resolve(extractedFiles);
			}
		};

		const mainUnzipper = new Unzip((stream) => {
			// stream is FFlateUnzipFile
			const filePath = stream.name;

			if (filePath.endsWith("/")) {
				// Skip directories
				return;
			}

			const chunks: Uint8Array[] = [];
			let totalSize = 0;

			totalFiles++; // Increment total files count for each stream created
			stream.ondata = (err, chunk, final) => {
				/*if (err) {
                    console.error(`[extractZipToFiles] Error DURING DECOMPRESSION of file "${filePath}":`, err);
                    // Stop further file discoveries by this Unzip instance, as state might be corrupt.
                    mainUnzipper.onfile = () => {};
                    // Reject the entire operation on the first file processing error.
                    reject(new Error(`Error decompressing file "${filePath}": ${err.message || String(err)}`));
                    return;
                } */

				if (chunk) {
					chunks.push(chunk);
					totalSize += chunk.length;
				}

				if (final) {
					const completeFileBuffer = new Uint8Array(totalSize);
					let offset = 0;
					for (const bufferChunk of chunks) {
						completeFileBuffer.set(bufferChunk, offset);
						offset += bufferChunk.length;
					}

					const newFile = new File([completeFileBuffer], filePath, { type: getFileType(filePath) });
					Object.defineProperty(newFile, "webkitRelativePath", {
						value: filePath.startsWith("/") ? filePath : `/${filePath}`,
						writable: false,
					}); // this was miserable to rememebr to find
					extractedFiles.push(newFile);
					filesProcessed++;

					checkCompletion();
				}
			};

			stream.start();
		});

		mainUnzipper.register(AsyncUnzipInflate);

		mainUnzipper.push(zipData, true);
		discoveryComplete = true;

		checkCompletion(); // for when no files in zip
	});
};

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

export const requireDataLoaded = () => {
	return localStorage.getItem("loaded") === "true";
};

export const processMediaFiles = async <T extends StoredMedia>(
	mediaFiles: T[]
): Promise<StoredMedia[]> => {
	const mediaResults = await Promise.all(
		mediaFiles.map(async (media) => {
			if (media.data instanceof File) {
				try {
					const buffer = await media.data.arrayBuffer();
					let defaultType: string;
					switch (media.type) {
						case "photo":
							defaultType = "image/jpeg";
							break;
						case "video":
							defaultType = "video/mp4";
							break;
						case "audio":
							defaultType = "audio/mpeg";
							break;
						default:
							defaultType = "application/octet-stream";
					}
					
					return {
						uri: media.uri,
						timestamp: media.timestamp,
						type: media.type,
						data: new Blob([buffer], { 
							type: media.data.type || defaultType
						})
					};
				} catch (error) {
					console.error(`Failed to process media file ${media.uri}:`, error);
					return null;
				}
			}
			return null;
		})
	);
	return mediaResults.filter(media => media !== null);
};
