interface _CachedAnalysis {
    partial: boolean; // if analysis is complete or not
    // Overview stats
    messageCount: number;
    systemMessages: number;
    messagesSent: number;
    messagesReceived: number;
    conversationCount: number;
    groupCount: number;
    followers: number;
    following: number;
    reelsSent: number;
    reelsReceived: number;
    favoriteWord: string;
    favoriteEmoji: string;
    postCount: number;
    storyCount: number;
    postsSaved: number;
    reactionsSent: number;
    reactionsReceived: number;
    topThreeConversations: { title: string, count: number }[];
}


export type CachedAnalysis = Partial<_CachedAnalysis>;
