import { type Accessor, createContext, useContext } from "solid-js";
import type { ConversationRow } from "@/components/analysis/analysisTypes";
import type { StoredUser } from "@/db/database";
import type { CachedAnalysis } from "@/types/analysis";
import type { User } from "@/types/user";

export interface AnalysisData {
	analysis: CachedAnalysis;
	user: Accessor<User | null>;
	people: Accessor<StoredUser[]>;
	conversations: Accessor<ConversationRow[]>;
	loading: Accessor<boolean>;
}

export const AnalysisDataContext = createContext<AnalysisData>();

export const useAnalysisData = (): AnalysisData => {
	const context = useContext(AnalysisDataContext);
	if (!context) {
		throw new Error("useAnalysisData must be used within the Analysis layout");
	}
	return context;
};
