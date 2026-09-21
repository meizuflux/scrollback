import { type Accessor, createContext, useContext } from "solid-js";
import type { ConversationRow } from "@/components/analysis/analysisTypes";
import type { StoredPost, StoredUser } from "@/db/database";
import type { CachedAnalysis } from "@/types/analysis";
import type { ProfileChange, User } from "@/types/user";

export interface ContentCounts {
	posts: number;
	archived: number;
	stories: number;
}

export interface EngagementCounts {
	likedPosts: number;
	savedPosts: number;
	comments: number;
	storyLikes: number;
}

export interface AnalysisData {
	analysis: CachedAnalysis;
	user: Accessor<User | null>;
	people: Accessor<StoredUser[]>;
	conversations: Accessor<ConversationRow[]>;
	profileChanges: Accessor<ProfileChange[]>;
	posts: Accessor<StoredPost[]>;
	contentCounts: Accessor<ContentCounts>;
	engagementCounts: Accessor<EngagementCounts>;
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
