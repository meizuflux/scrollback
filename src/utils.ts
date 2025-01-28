export const findFile = (files: File[], path: string): File | undefined => {
	return files.find((file) => file.webkitRelativePath.endsWith(path));
};

export const loadFile = async <T>(files: File[], path: string): Promise<T> => {
	const file = findFile(files, path);
	if (!file) {
		throw new Error(`File not found: ${path}`);
	}

	return await file.text().then(JSON.parse);
};
