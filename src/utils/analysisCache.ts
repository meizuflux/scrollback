import type { CachedAnalysis } from "@/types/analysis";

type RawAnalysis = Record<string, unknown>;

/** Legacy cache keys renamed by later importers, mapped to their current canonical name. */
const LEGACY_KEY_ALIASES: Record<string, keyof CachedAnalysis> = {
	topThreeConversations: "topConversations",
};

export interface AnalysisCacheEntry {
	analysis: CachedAnalysis;
	partial: boolean;
}

export const normalizeAnalysis = (values: RawAnalysis): CachedAnalysis => {
	const analysis: RawAnalysis = {};

	for (const [key, value] of Object.entries(values)) {
		if (key === "partial") continue;
		const canonical = LEGACY_KEY_ALIASES[key];
		if (canonical) {
			if (!(canonical in analysis)) analysis[canonical] = value;
		} else {
			analysis[key] = value;
		}
	}

	return analysis as CachedAnalysis;
};

export const readAnalysisCache = (): AnalysisCacheEntry => {
	const raw = localStorage.getItem("analysis_cache");
	if (!raw) return { analysis: {}, partial: false };

	let values: RawAnalysis;
	try {
		values = JSON.parse(raw) as RawAnalysis;
	} catch {
		return { analysis: {}, partial: false };
	}

	return { analysis: normalizeAnalysis(values), partial: values.partial === true };
};

export const writeAnalysisCache = (analysis: CachedAnalysis): void => {
	localStorage.setItem("analysis_cache", JSON.stringify(analysis));
};
