import type { Component } from "solid-js";
import { useAnalysisData } from "@/components/analysis/analysisData";
import Overview from "@/components/analysis/Overview";

const HighlightsPage: Component = () => {
	const { analysis } = useAnalysisData();
	return <Overview analysis={analysis} />;
};

export default HighlightsPage;
