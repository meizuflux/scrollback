export async function showAnalysis() {
    document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
        <div class="container mx-auto p-4" id="app2">
            <h1 class="text-3xl font-bold mb-4">Analysis</h1>
            <label class="text-lg font-semibold" id="analysis-status">Analysis loading...</label>
        </div>
    `

    const analysis = document.createElement('div');


    let analysisResult = document.createElement('p')
    analysisResult.textContent = 'testing'
    analysis.appendChild(analysisResult);




    document.getElementById('app2')!.appendChild(analysis);
    document.getElementById('analysis-status')!.remove();

    interface User {
        id: string;
        timestamp: number;
    }

    async function queryConnections() {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open("ConnectionsDB");
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });

        const getAll = (storeName: string) => new Promise<User[]>((resolve, reject) => {
            const transaction = db.transaction(storeName, "readonly");
            const store = transaction.objectStore(storeName);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result as User[]);
            req.onerror = () => reject(req.error);
        });

        const [followers, following] = await Promise.all([
            getAll("followers"),
            getAll("following"),
        ]);

        const followersNotFollowing = followers.filter(f => !following.find(g => g.id === f.id));
        const followingNotFollowers = following.filter(f => !followers.find(g => g.id === f.id));

        return { followers, following, followersNotFollowing, followingNotFollowers };
    }

    const { followers, following, followersNotFollowing, followingNotFollowers } = await queryConnections();

    const statsDiv = document.createElement('div');
    statsDiv.innerHTML = `
        <div class="grid grid-cols-2 gap-4 mt-4">
            <div class="p-4 bg-gray-100 rounded">
                <h3 class="font-bold">Followers: ${followers.length}</h3>
            </div>
            <div class="p-4 bg-gray-100 rounded">
                <h3 class="font-bold">Following: ${following.length}</h3>
            </div>
        </div>
        <div class="grid grid-cols-2 gap-4 mt-4">
            <div class="p-4 bg-gray-100 rounded">
                <h3 class="font-bold">Followers not Following (${followersNotFollowing.length})</h3>
                <ul class="mt-2 max-h-60 overflow-auto">
                    ${followersNotFollowing.map(f => `<li>${f.id}</li>`).join('')}
                </ul>
            </div>
            <div class="p-4 bg-gray-100 rounded">
                <h3 class="font-bold">Following not Followers (${followingNotFollowers.length})</h3>
                <ul class="mt-2 max-h-60 overflow-auto">
                    ${followingNotFollowers.map(f => `<li>${f.id}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;
    document.getElementById('app2')!.appendChild(statsDiv);
}