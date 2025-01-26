interface User {
    string_list_data: [{
        href: string;
        value: string;
        timestamp: number;
    }];
}

interface FollowingFile {
    relationships_following: Array<User>;
}


export async function handleConnections(files: FileList, status: HTMLLabelElement) {
    status.textContent = 'Status: Processing connections...';

    const filesArray = Array.from(files);
    const followersFile = filesArray.find(file => file.webkitRelativePath.endsWith('/connections/followers_and_following/followers_1.json'));
    const followingFile = filesArray.find(file => file.webkitRelativePath.endsWith('/connections/followers_and_following/following.json'));

    if (!followersFile || !followingFile) {
        console.error('Required files not found');
        return;
    }

    const followersData: Array<User> = await followersFile.text().then(JSON.parse);
    const followingData: FollowingFile = await followingFile.text().then(JSON.parse);

    const request = indexedDB.open('ConnectionsDB', 1);

    request.onupgradeneeded = (_event) => {
        const db = request.result;
        db.createObjectStore('followers', { keyPath: 'id' });
        db.createObjectStore('following', { keyPath: 'id' });
    };

    request.onsuccess = (_event) => {
        const db = request.result;

        status.textContent = 'Status: Processing followers...';

        const followersTransaction = db.transaction('followers', 'readwrite');
        const followersStore = followersTransaction.objectStore('followers');
        followersData.forEach(follower => {
            let data = follower.string_list_data[0];

            followersStore.add({
                id: data.value,
                timestamp: data.timestamp,
            })
        });

        status.textContent = 'Status: Processing following...';

        const followingTransaction = db.transaction('following', 'readwrite');
        const followingStore = followingTransaction.objectStore('following');
        followingData.relationships_following.forEach(follower => {
            let data = follower.string_list_data[0];

            followingStore.add({
                id: data.value,
                timestamp: data.timestamp,
            })
        });

        status.textContent = 'Status: Connections processed';
    };

    request.onerror = (_event) => {
        console.error('Database error:');
    };
}