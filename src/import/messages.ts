// there's other fields but idrc about them ngl
// also some messages of things that happen are just messages, like changing the theme
interface Message {
    sender_name: string
    timestamp_ms: number
    content?: string
    share?: {
        link: string,
        share_text?: string,
        original_content_owner?: string
    },
    photos?: {
        uri: string,
        creation_timestamp: number,
    },
    videos?: {
        uri: string,
        creation_timestamp: number,
    },
    reactions?: {
        reaction: string;
        actor: string; // person who reacted,
        timestamp: number;
    }[],
}

export interface StoredMessage extends Message {
    conversation: string;
    id: number;
}


interface MessageFile {
    participants: { name: string }[],
    messages: Message[],
    title: string,
    image?: {
        uri: string,
        creation_timestamp: number,
    }
}

function decodeU8String(encodedText: string): string {
    // Split by \u and convert each escape sequence
    const parts = encodedText.split('\\u').map((part, index) => {
        if (index === 0) return part;
        const codePoint = parseInt(part.substring(0, 4), 16);
        return String.fromCharCode(codePoint) + part.substring(4);
    }).join('');

    // Decode as UTF-8
    const decoder = new TextDecoder('utf-8');
    const utf8Array = new Uint8Array(parts.split('').map(char => char.charCodeAt(0)));
    return decoder.decode(utf8Array);
}

export async function importMessages(files: FileList, status: HTMLLabelElement) {
    status.textContent = 'Status: Processing messages...';

    const messageFiles = Array.from(files).filter(file => file.name.endsWith('message_1.json'));

    const messagesFilesData: MessageFile[] = [];

    for (const file of messageFiles) {
        messagesFilesData.push(await file.text().then(JSON.parse));
    }

    const request = indexedDB.open('db', 1);

    request.onsuccess = (_event) => {
        const db = request.result;
        const transaction = db.transaction('messages', 'readwrite');
        const store = transaction.objectStore('messages');
        
        let _id = 0;
        for (const messageFile of messagesFilesData) {
            for (const message of messageFile.messages) {
                // not sure why, but one of my conversations had a lot of this
                if (message.content == "Liked a message") {
                    continue
                }

                const storedMessage: StoredMessage = {
                    ...message,
                    conversation: decodeU8String(messageFile.title),
                    id: _id++
                };
                store.put(storedMessage);
            }
        }

        status.textContent = 'Status: Messages processed';
    };

    request.onerror = (_event) => {
        console.error('Database error:', request.error);
    };

    

    status.textContent = 'Status: Messages imported';
}