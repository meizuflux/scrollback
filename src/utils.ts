import { unzip } from 'fflate';

export const findFile = (files: File[], path: string): File | undefined => {
	return files.find((file) => file.webkitRelativePath.endsWith(path));
};

export const findFileInZip = (zipFiles: { [key: string]: Uint8Array }, path: string): Uint8Array | undefined => {
	const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
	return Object.entries(zipFiles).find(([filePath]) => filePath.endsWith(normalizedPath))?.[1];
};

export const loadFile = async <T>(files: File[], path: string): Promise<T | null> => {
	const file = findFile(files, path);
	if (!file) {
		return null;
	}

	return await file.text().then(JSON.parse);
};

export const loadFileFromZip = async <T>(zipFiles: { [key: string]: Uint8Array }, path: string): Promise<T | null> => {
	const file = findFileInZip(zipFiles, path);
	if (!file) {
		return null;
	}

	const decoder = new TextDecoder('utf-8');
	const content = decoder.decode(file);
	return JSON.parse(content);
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
