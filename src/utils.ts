import { unzip } from 'fflate';

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

export const extractZipToFiles = async (
	zipFile: File, 
	updateSteps: (name: string, progress: number, statusText?: string) => void
): Promise<File[]> => {

	updateSteps("Unzipping files", 0, "Starting ZIP extraction...");
	const arrayBuffer = await zipFile.arrayBuffer();
	const uint8Array = new Uint8Array(arrayBuffer);
	
	return new Promise((resolve, reject) => {
		unzip(uint8Array, (err, unzipped) => {
			if (err) {
				reject(err);
				return;
			}

			const files: File[] = [];
			const entries = Object.entries(unzipped);
			const totalEntries = entries.length;
			const batchSize = Math.max(1, Math.floor(totalEntries / 10)); // Create up to 10 update points

			// Create a separate function to process entries in batches
			const processEntries = (startIndex: number) => {
				const endIndex = Math.min(startIndex + batchSize, totalEntries);
				
				for (let i = startIndex; i < endIndex; i++) {
					const [relativePath, fileData] = entries[i];
					const blob = new Blob([fileData]);
					const file = new File([blob], relativePath, { type: 'application/octet-stream' });
					// Add webkitRelativePath to mimic folder upload behavior
					const normalizedPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
					Object.defineProperty(file, 'webkitRelativePath', {
						value: normalizedPath,
						writable: false
					});
					files.push(file);
				}
				
				// Update progress after processing this batch
				const progress = Math.round((endIndex / totalEntries) * 100);

				// Use setTimeout to break out of current execution stack,
				// allowing SolidJS to process the state update
				setTimeout(() => {
					updateSteps("Unzipping files", progress, `Extracting ${endIndex}/${totalEntries} files...`);
					
					// Continue processing if there are more entries
					if (endIndex < totalEntries) {
						setTimeout(() => processEntries(endIndex), 0);
					} else {
						// We're done
						setTimeout(() => {
							updateSteps("Unzipping files", 100, `Extracted ${totalEntries} files`);
							resolve(files);
						}, 0);
					}
				}, 0);
			};
			
			// Start processing from index 0
			processEntries(0);
		});
	});
};

// insta messages are encoded, like urls and stuff like that so we have to parse it like this
export const decodeU8String = (encodedText: string): string => {
	try {
		const decoder = new TextDecoder('utf-8');
		const bytes = new Uint8Array(encodedText.length);
		for (let i = 0; i < encodedText.length; i++) {
			bytes[i] = encodedText.charCodeAt(i);
		}
		return decoder.decode(bytes);
	} catch (error) {
		console.error("Decoding error:", error);
		return encodedText; // Fallback in case of errors
	}
}