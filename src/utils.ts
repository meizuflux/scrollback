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

export const extractZipToFiles = async (zipFile: File): Promise<File[]> => {
	const arrayBuffer = await zipFile.arrayBuffer();
	const uint8Array = new Uint8Array(arrayBuffer);
	
	return new Promise((resolve, reject) => {
		unzip(uint8Array, (err, unzipped) => {
			if (err) {
				reject(err);
				return;
			}

			const files: File[] = [];

			for (const [relativePath, fileData] of Object.entries(unzipped)) {
				const blob = new Blob([fileData]);
				const file = new File([blob], relativePath, { type: 'application/octet-stream' });
				// Add webkitRelativePath to mimic folder upload behavior
				// Ensure the path starts with a slash to match expected format
				const normalizedPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
				Object.defineProperty(file, 'webkitRelativePath', {
					value: normalizedPath,
					writable: false
				});
				files.push(file);
			}

			resolve(files);
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
