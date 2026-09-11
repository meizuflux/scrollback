import type { Component } from "solid-js";
import Overview from "@/components/analysis/Overview";
import type { CachedAnalysis } from "@/types/analysis";

const HighlightsTab: Component<{ analysis: CachedAnalysis }> = (props) => <Overview analysis={props.analysis} />;

export default HighlightsTab;
