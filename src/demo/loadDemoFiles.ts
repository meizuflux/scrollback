export const DEMO_DATA_PATH = "demo_data";
export const DEMO_MANIFEST_PATH = `${DEMO_DATA_PATH}/_demo_data_manifest.json`;
export const DEMO_FETCH_CONCURRENCY = 6;

export interface DemoManifest {
	files: string[];
}

export interface DemoLoadProgress {
	completed: number;
	total: number;
}

const isSafeRelativePath = (value: unknown): value is string => {
	if (typeof value !== "string" || value.length === 0 || value.startsWith("/") || value.includes("\\")) {
		return false;
	}
	const segments = value.split("/");
	return segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
};

export const validateDemoManifest = (value: unknown): DemoManifest => {
	if (!value || typeof value !== "object") throw new Error("The demo manifest is malformed.");
	const manifest = value as Partial<DemoManifest>;
	if (!Array.isArray(manifest.files) || manifest.files.length === 0 || !manifest.files.every(isSafeRelativePath)) {
		throw new Error("The demo manifest contains unsafe or invalid file paths.");
	}
	if (new Set(manifest.files).size !== manifest.files.length) {
		throw new Error("The demo manifest contains duplicate file paths.");
	}
	return {
		files: [...manifest.files],
	};
};

const getBaseUrl = (): string => {
	const env = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env;
	return env?.BASE_URL || "/";
};

export const buildDemoAssetUrl = (baseUrl: string, path: string): string => {
	const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
	const encodedPath = path
		.split("/")
		.map((segment) =>
			encodeURIComponent(segment).replace(
				/[!'()*]/g,
				(character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
			),
		)
		.join("/");
	return `${normalizedBase}${DEMO_DATA_PATH}/${encodedPath}`;
};

const setRelativePath = (file: File, path: string): File => {
	Object.defineProperty(file, "webkitRelativePath", {
		value: `/${path}`,
		writable: false,
		configurable: true,
	});
	return file;
};

export const loadDemoFiles = async (
	onProgress?: (progress: DemoLoadProgress) => void,
	signal?: AbortSignal,
	fetcher: typeof fetch = fetch,
	baseUrl = getBaseUrl(),
): Promise<File[]> => {
	const manifestResponse = await fetcher(buildDemoAssetUrl(baseUrl, "_demo_data_manifest.json"), { signal });
	if (!manifestResponse.ok) {
		throw new Error(`Could not load the demo manifest (HTTP ${manifestResponse.status}).`);
	}
	let manifestValue: unknown;
	try {
		manifestValue = await manifestResponse.json();
	} catch {
		throw new Error("The demo manifest is not valid JSON.");
	}
	const manifest = validateDemoManifest(manifestValue);
	const files = new Array<File>(manifest.files.length);
	const requestController = new AbortController();
	const abortFromCaller = () => requestController.abort();
	if (signal?.aborted) requestController.abort();
	else signal?.addEventListener("abort", abortFromCaller, { once: true });
	let nextIndex = 0;
	let completed = 0;
	let firstError: unknown;
	const worker = async () => {
		try {
			while (true) {
				if (requestController.signal.aborted) {
					throw new DOMException("The demo download was cancelled.", "AbortError");
				}
				const index = nextIndex++;
				if (index >= manifest.files.length) return;
				const path = manifest.files[index];
				const response = await fetcher(buildDemoAssetUrl(baseUrl, path), { signal: requestController.signal });
				if (!response.ok) throw new Error(`Could not load demo file ${path} (HTTP ${response.status}).`);
				const bytes = await response.arrayBuffer();
				const text = new TextDecoder().decode(bytes);
				try {
					JSON.parse(text);
				} catch {
					throw new Error(`Demo file ${path} is not valid JSON.`);
				}
				files[index] = setRelativePath(new File([bytes], path, { type: "application/json" }), path);
				completed += 1;
				onProgress?.({ completed, total: manifest.files.length });
			}
		} catch (error) {
			if (firstError === undefined) firstError = error;
			requestController.abort();
			throw error;
		}
	};

	const workerCount = Math.min(DEMO_FETCH_CONCURRENCY, manifest.files.length);
	const outcomes = await Promise.allSettled(Array.from({ length: workerCount }, () => worker()));
	signal?.removeEventListener("abort", abortFromCaller);
	const failure = outcomes.find((outcome): outcome is PromiseRejectedResult => outcome.status === "rejected");
	if (firstError !== undefined) throw firstError;
	if (failure) throw failure.reason;
	return files;
};
