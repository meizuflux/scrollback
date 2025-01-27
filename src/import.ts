interface User {
    string_list_data: [{
        href: string;
        value: string;
        timestamp: number;
    }];
}

// TODO: adjust for timezone
export interface StoredUser {
    username: string;
    blocked?: boolean; // you blocked them
    blocked_timestamp?: Date;
    close_friends?: boolean; // on close friends list
    close_friends_timestamp?: Date;
    requested_to_follow_you?: boolean; // they requested to follow you
    requested_to_follow_timestamp?: Date;
    follower?: boolean; // they follow you
    follower_timestamp?: Date;
    following?: boolean; // you follow them
    following_timestamp?: Date;
    hidden_story_from?: boolean; // you hide them from seeing your story
    hidden_story_from_timestamp?: Date;
    pending_follow_request?: boolean; // ie, you requested to follow them and they haven't yet accepted
    pending_follow_request_timestamp?: Date;
    recently_unfollowed?: boolean; // you recently unfollowed them
    recently_unfollowed_timestamp?: Date;
}

export async function handleConnections(files: FileList, status: HTMLLabelElement) {
    status.textContent = 'Status: Processing connections...';

    const fileData = [
        {
            "name": "blocked_profiles.json",
            "columm": "blocked",
            "stored_at": "relationships_blocked_users"
        },
        {
            "name": "close_friends.json",
            "column": "close_friends",
            "stored_at": "relationships_close_friends"
        },
        {
            "name": "follow_requests_you_ve_received.json",
            "column": "requested_to_follow_you",
            "stored_at": "relationships_follow_requests_received"
        },
        {
            "name": "followers_1.json", // the data for this isn't "relationships_following" but instead it's just an array of users
            "column": "follower",
        },
        {
            "name": "following.json",
            "column": "following",
            "stored_at": "relationships_following",
        },
        {
            "name": "hide_story_from.json",
            "column": "hidden_story_from",
            "stored_at": "relationships_hide_stories_from"
        },
        {
            "name" : "pending_follow_requests.json",
            "column": "pending_follow_request",
            "stored_at": "relationships_follow_requests_sent"
        },
        {
            "name": "recently_unfollowed_profiles.json",
            "column": "recently_unfollowed",
            "stored_at": "relationships_unfollowed_users"
        }
    ];

    
    const data: { [key: string]: StoredUser } = {};

    const filesArray = Array.from(files);
    for (const file of fileData) {
        status.textContent = `Status: Processing ${file.name}...`;

        const filename = "/connections/followers_and_following/" + file.name
        const json_file = filesArray.find(file => file.webkitRelativePath.endsWith(filename));

        if (!json_file) {
            console.error(`File ${file.name} not found`);
            continue;
        }

        //console.log(file.name)

        let json_file_data = await json_file.text().then(JSON.parse);

        if (file.stored_at) {
            json_file_data = json_file_data[file.stored_at];
        }

        // TODO: does not properly handle when a user is blocked
        json_file_data.forEach((user: User) => {
            let user_data = user.string_list_data[0];

            if (!user_data.value) {
                // blocked_profiles has a different format for each and every thing
                user_data.value = user_data.href.split('/').pop() || '';
            }

            let userData = data[user_data.value] || {
                username: user_data.value,
                blocked: false,
                blocked_timestamp: undefined,
                close_friends: false,
                close_friends_timestamp: undefined,
                requested_to_follow_you: false,
                requested_to_follow_timestamp: undefined,
                follower: false,
                follower_timestamp: undefined,
                following: false,
                following_timestamp: undefined,
                hidden_story_from: false,
                hidden_story_from_timestamp: undefined,
                pending_follow_request: false,
                pending_follow_request_timestamp: undefined,
                recently_unfollowed: false,
                recently_unfollowed_timestamp: undefined
            }

            // typescript magic idk
            if (file.column && file.column in userData) {
                (userData as any)[file.column] = true;
                (userData as any)[`${file.column}_timestamp`] = new Date(user_data.timestamp * 1000); // idk why it has to be * 1000 but it just works
            }

            data[userData.username] = userData;

        });
    }

    status.textContent = 'Status: Storing data...';

    const request = indexedDB.open('instagram-data');

    request.onupgradeneeded = (_event) => {
        const db = request.result;
        db.createObjectStore('users', { keyPath: 'username' });
    };

    request.onsuccess = (_event) => {
        const db = request.result;
        const transaction = db.transaction('users', 'readwrite');
        const store = transaction.objectStore('users');
        
        Object.values(data).forEach(user => {
            store.put(user);
        });

        status.textContent = 'Status: Connections processed';
    };

    request.onerror = (_event) => {
        console.error('Database error:', request.error);
    };
}