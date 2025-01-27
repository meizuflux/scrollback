import { StoredUser } from "./import.ts";

export async function showAnalysis() {
    document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
        <div class="container mx-auto p-4" id="app2">
            <h1 class="text-3xl font-bold mb-4">Analysis</h1>
            <label class="text-lg font-semibold" id="analysis-status">Analysis loading...</label>
        </div>
    `

    const analysis = document.createElement('div');

    document.getElementById('app2')!.appendChild(analysis);
    document.getElementById('analysis-status')!.remove();
    
    

    const request = indexedDB.open('instagram-data', 1);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
    const users: StoredUser[] = await new Promise((resolve, reject) => {
        const transaction = db.transaction(['users'], 'readonly');
        const objectStore = transaction.objectStore('users');
        const request = objectStore.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

    const followers = users.filter(u => u.follower);
    const following = users.filter(u => u.following);
    const closeFriends = users.filter(u => u.close_friends);
    const receivedFollowRequests = users.filter(u => u.requested_to_follow_you);
    const hiddenStory = users.filter(u => u.hidden_story_from);
    const pendingFollowRequests = users.filter(u => u.pending_follow_request);
    const recentlyUnfollowed = users.filter(u => u.recently_unfollowed);

    const followerUsernames = new Set(followers.map(u => u.username));
    const followingUsernames = new Set(following.map(u => u.username));

    const notFollowingBack = followers.filter(u => !followingUsernames.has(u.username));
    const notFollowingYouBack = following.filter(u => !followerUsernames.has(u.username));

    analysis.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div class="p-4 bg-white rounded-lg shadow">
                <h2 class="text-xl font-bold mb-3">Overview</h2>
                <p>You have ${followers.length} followers and follow ${following.length} people</p>
            </div>

            <div class="p-4 bg-white rounded-lg shadow">
                <h2 class="text-xl font-bold mb-3">Not Following Back (${notFollowingYouBack.length})</h2>
                <ul class="list-disc ml-4 max-h-48 overflow-y-auto">
                    ${notFollowingYouBack.map(u => `<li>${u.username}</li>`).join('')}
                </ul>
            </div>

            <div class="p-4 bg-white rounded-lg shadow">
                <h2 class="text-xl font-bold mb-3">Not Following (${notFollowingBack.length})</h2>
                <ul class="list-disc ml-4 max-h-48 overflow-y-auto">
                    ${notFollowingBack.map(u => `<li>${u.username}</li>`).join('')}
                </ul>
            </div>

            <div class="p-4 bg-white rounded-lg shadow">
                <h2 class="text-xl font-bold mb-3">Close Friends (${closeFriends.length})</h2>
                <ul class="list-disc ml-4 max-h-48 overflow-y-auto">
                    ${closeFriends.map(u => `<li>${u.username}</li>`).join('')}
                </ul>
            </div>

            <div class="p-4 bg-white rounded-lg shadow">
                <h2 class="text-xl font-bold mb-3">Follow Requests (${receivedFollowRequests.length})</h2>
                <ul class="list-disc ml-4 max-h-48 overflow-y-auto">
                    ${receivedFollowRequests.map(u => `<li>${u.username}</li>`).join('')}
                </ul>
            </div>

            <div class="p-4 bg-white rounded-lg shadow">
                <h2 class="text-xl font-bold mb-3">Hidden Story (${hiddenStory.length})</h2>
                <ul class="list-disc ml-4 max-h-48 overflow-y-auto">
                    ${hiddenStory.map(u => `<li>${u.username}</li>`).join('')}
                </ul>
            </div>

            <div class="p-4 bg-white rounded-lg shadow">
                <h2 class="text-xl font-bold mb-3">Pending Requests (${pendingFollowRequests.length})</h2>
                <ul class="list-disc ml-4 max-h-48 overflow-y-auto">
                    ${pendingFollowRequests.map(u => `<li>${u.username}</li>`).join('')}
                </ul>
            </div>

            <div class="p-4 bg-white rounded-lg shadow">
                <h2 class="text-xl font-bold mb-3">Recently Unfollowed (${recentlyUnfollowed.length})</h2>
                <ul class="list-disc ml-4 max-h-48 overflow-y-auto">
                    ${recentlyUnfollowed.map(u => `<li>${u.username}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;
}