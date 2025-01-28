// there's other fields but idrc about them ngl

import { IDBPDatabase } from "idb";

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

// TODO: test that this works
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

export default async (files: File[], db: IDBPDatabase) => {
    console.log("Importing messages...");

    const data: any = {
        "conversations": [],
        "messages": []
    }

    const messageFiles = files.filter(file => file.name.endsWith('message_1.json'));
    const messagesFilesData: MessageFile[] = [];

    for (const file of messageFiles) {
        messagesFilesData.push(await file.text().then(JSON.parse));
    }

    for (const file of messageFiles) {
        const json_file = await file.text().then(JSON.parse) as MessageFile;

        const conversation = json_file.title;



        // store the messages
        {
            for (const message of json_file.messages) {
                const storedMessage: StoredMessage = {
                    ...message,
                    conversation,
                }

                data["messages"].push(storedMessage);
            }
        }

        // store the conversation in the conversations store
        {
            const conversationData = {
                title: conversation,
                participants: json_file.participants.map(participant => participant.name),
                is_group: json_file.participants.length > 2,
            }

            data["conversations"].push(conversationData);
        }
    }
    // hack to get around some timing issues I don't fully understand
    const tx = db.transaction(["messages", "conversations"], "readwrite");

    const messagesStore = tx.objectStore("messages");
    const conversationsStore = tx.objectStore("conversations");

    const promises = []
    for (const message of data["messages"]) {
        promises.push(messagesStore.put(message));
    }
    for (const conversation of data["conversations"]) {
        promises.push(conversationsStore.put(conversation));
    }

    await Promise.all(promises);

    await tx.done

    console.debug("Messages imported")
}