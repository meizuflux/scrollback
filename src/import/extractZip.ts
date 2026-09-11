import { AsyncUnzipInflate, Unzip } from "fflate";
import { getFileType } from "@/utils/media";

export const extractZipToFiles = async (
	zipFile: File,
	updateSteps: (name: string, progress: number, statusText?: string) => void,
	signal?: AbortSignal,
): Promise<File[]> => {
	updateSteps("Unzipping files", 0, "Reading ZIP file...");

	return new Promise<File[]>((resolve, reject) => {
		const extractedFiles: File[] = [];

		let totalFiles = 0;
		let filesProcessed = 0;
		let discoveryComplete = false;

		const checkCompletion = () => {
			if (signal?.aborted) {
				reject(new DOMException("The import was cancelled.", "AbortError"));
				return;
			}
			if (discoveryComplete && filesProcessed === totalFiles) {
				updateSteps("Unzipping files", 100, "All files extracted successfully.");
				resolve(extractedFiles);
			}
		};

		const mainUnzipper = new Unzip((stream) => {
			const filePath = stream.name;

			if (filePath.endsWith("/")) return;

			const chunks: Uint8Array[] = [];
			let totalSize = 0;

			totalFiles++;
			stream.ondata = (err, chunk, final) => {
				if (signal?.aborted) return;
				if (err) {
					reject(err);
					return;
				}
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

					const newFile = new File([completeFileBuffer], filePath, {
						type: getFileType(filePath),
					});
					Object.defineProperty(newFile, "webkitRelativePath", {
						value: filePath.startsWith("/") ? filePath : `/${filePath}`,
						writable: false,
					});
					extractedFiles.push(newFile);
					filesProcessed++;

					checkCompletion();
				}
			};

			stream.start();
		});

		mainUnzipper.register(AsyncUnzipInflate);

		const reader = zipFile.stream().getReader();
		const processStream = async () => {
			try {
				while (true) {
					if (signal?.aborted) {
						await reader.cancel();
						throw new DOMException("The import was cancelled.", "AbortError");
					}
					const { done, value } = await reader.read();
					if (done) {
						mainUnzipper.push(new Uint8Array(0), true);
						discoveryComplete = true;
						checkCompletion();
						break;
					}
					mainUnzipper.push(value);
				}
			} catch (err) {
				reject(err);
			}
		};
		processStream();
	});
};
