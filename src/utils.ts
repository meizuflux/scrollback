import JSZip from 'jszip';

export const findFile = (files: File[], path: string): File | undefined => {
	return files.find((file) => file.webkitRelativePath.endsWith(path));
};

export const findFileInZip = (zipFiles: { [key: string]: JSZip.JSZipObject }, path: string): JSZip.JSZipObject | undefined => {
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

export const loadFileFromZip = async <T>(zipFiles: { [key: string]: JSZip.JSZipObject }, path: string): Promise<T | null> => {
	const file = findFileInZip(zipFiles, path);
	if (!file) {
		return null;
	}

	const content = await file.async('text');
	return JSON.parse(content);
};

export const extractZipToFiles = async (zipFile: File): Promise<File[]> => {
	const zip = await JSZip.loadAsync(zipFile);
	const files: File[] = [];

	for (const [relativePath, zipObject] of Object.entries(zip.files)) {
		if (!zipObject.dir) {
			const blob = await zipObject.async('blob');
			const file = new File([blob], relativePath, { type: blob.type });
			// Add webkitRelativePath to mimic folder upload behavior
			// Ensure the path starts with a slash to match expected format
			const normalizedPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
			Object.defineProperty(file, 'webkitRelativePath', {
				value: normalizedPath,
				writable: false
			});
			files.push(file);
		}
	}

	return files;
};
