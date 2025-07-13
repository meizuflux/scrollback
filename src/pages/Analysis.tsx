import { type Component, createResource, createSignal, Show, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import Layout from "@/components/Layout";
import { SetStoreFunction } from "solid-js/store";
import { db } from "@/db/database";

import { isDataLoaded, clearData } from "@/utils/storage";
import { createStore } from "solid-js/store";
import { CachedAnalysis } from "@/types/analysis";
import Overview from "@/components/analysis/Overview";

/* hopeful stats to display:
- overview:
	- numMessages
	- numSystemMessages
	- numMessagesSent
	- NumMessagesReceived
	- numConversations
	- followers
	- following
	- reels sent
	- reels received
	- favorite word
	- favorite emoji
	- num posts
	- num stories
	- posts saved,
	- stories liked
- conversations:
	- numConversations
	- conversations[]: (own page that's opened up, but some of these should be filterable)
		- isGroupChat
		- favoriteWord
		- favoriteEmoji
		- totalMessages
		- totalReelssent
		- media{
			- numphotos
			- numvideos
			- numaudio
			- }
		- reactions{
			- emoji, count}
		- sort by totalmessages, most recently active, most reels sent/received, is groupchat
		- expanded view:
			- view all messages (metadata on like 3 dots or wtv)
			- view all media
			- words sent
			- words per message
			- reactions and emojis per user
			- longest message
			- most used emoji
			- most used word
			- words per message
			- timeline from first message to last message
			- most active time of day
			- most active day of week
			- num system messages
			- Consecutive Msg Max Streak: 5
			- Avg Consecutive Msgs: 1.6
			- ranking of reactions usage

- media:
	- numPosts
	- numReels
	- numStories
	- numSavedPosts
	- numSavedReels
	- numSavedStories
	- viewing of posts and stories
- import stats:
	- time taken per thing
	- files processed
	- zip file size
	- isZip
	- isDemo
	- isOpfs
	- indexedDb size etc
	- time of import
	- probably more stats on errors / features (more robust)
- users / connections:
	- numUsers
	- all users browsing, simple filtering based on the user stored thing, like blocked, etc
	- search on everything
	- key stats of each, numerically
- interactions:
	- numLikes
	- numComments
	- savedPosts
	- stored likes
- graphs
	- file size?
	- activity based on timestamps (filter what data is included)
- user:
	- insta settings, about, etc
	- profile changes,etc
*/

const ClearButton: Component = () => {
	const navigate = useNavigate();
	const [isClearing, setIsClearing] = createSignal(false);

	const handleClear = async () => {
		setIsClearing(true);
		await clearData();
		navigate("/", { replace: true });
	};

	return (
		<button
			class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
			onClick={handleClear}
			disabled={isClearing()}
		>
			{isClearing() ? (
				<div class="flex items-center">
					<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white-500 mr-2"></div>
					Clearing...
				</div>
			) : (
				"Clear Data"
			)}
		</button>
	);
};

const createAnalysis = async (analysis: CachedAnalysis, setter: SetStoreFunction<CachedAnalysis>) => {
    const cached = localStorage.getItem("analysis_cache")
    if (cached) {
        const vals = JSON.parse(cached)
        Object.entries(vals).forEach(([key, value]) => {
            // @ts-ignore
            setter(key as keyof CachedAnalysis, value);
        });
        if (!vals.partial) {
            return
        }
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
    const messageCount = await db.messages.count();
    setter("messageCount", messageCount);



    setter("partial", false)
    localStorage.setItem("analysis_cache", JSON.stringify(analysis))
};

const Analysis: Component = () => {
	const navigate = useNavigate();
    const [analysis, setAnalysis] = createStore<Partial<CachedAnalysis>>({});

	onMount(async () => {
		if (!isDataLoaded()) {
			navigate("/", { replace: true });
		}

		await createAnalysis(analysis, setAnalysis);
	});

	return (
		<Layout>
			<div class="container mx-auto p-4">
				<div class="flex justify-between items-center mb-6">
					<div class="flex gap-2">
						<button
							class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
							onClick={() => navigate("/export")}
						>
							Export
						</button>
						<ClearButton />
						<button
							class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors"
							onClick={async () => {
    							localStorage.removeItem("analysis_cache")
                                setAnalysis(Object.keys(analysis) as Array<keyof typeof analysis>, undefined);
    							await createAnalysis(analysis, setAnalysis);
							}}
						>
						Clear Analysis
						</button>
					</div>
				</div>

				<Overview analysis={analysis} />
			</div>
		</Layout>
	);
};

export default Analysis;
