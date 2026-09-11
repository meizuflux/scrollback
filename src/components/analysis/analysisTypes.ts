import type { StoredUser } from "@/db/database";
import type { CachedAnalysis } from "@/types/analysis";
import type { User } from "@/types/user";

export type TabId = "highlights" | "people" | "conversations" | "profile";
export type PeopleFilter = "all" | "followers" | "following" | "mutuals" | "blocked";
export type ConversationTypeFilter = "all" | "direct" | "group";

export interface ConversationRow {
	title: string;
	participants: string[];
	is_group: boolean;
	messageCount: number;
	lastActivity?: Date;
}

export interface AnalysisTabsProps {
	analysis: CachedAnalysis;
	user: User | null;
	people: StoredUser[];
	conversations: ConversationRow[];
	loading: boolean;
}
