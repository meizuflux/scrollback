// there's other fields but idrc about them ngl

import { IDBPDatabase } from "idb";
import { MessageFile, StoredMessage } from "../types/user";

// also some messages of things that happen are just messages, like changing the theme


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

        const conversation = decodeU8String(json_file.title);



        
        // TODO: figure out a way to store this directly in the DB without it causing a timing issue
        // current hack is to laod it all into memory and then store it all at once, should be another way around this
        for (const message of json_file.messages) {
            if (message.content) {
                message.content = decodeU8String(message.content);
            }

            // TODO: figure out why this happens with some conversations and also check what else to filter out
            if ((message.content?.startsWith("Reacted ") && message.content?.endsWith(" to your message")) || message.content === "Liked a message" || message.content?.includes(" changed the theme to ")) {
                continue
            }

            if (message.reactions) {
                for (const reaction of message.reactions) {
                    reaction.reaction = decodeU8String(reaction.reaction);
                }
            }
            message.sender_name = decodeU8String(message.sender_name);

            const storedMessage: StoredMessage = {
                ...message,
                conversation,
            }

            data["messages"].push(storedMessage);
        }


        const conversationData = {
            title: conversation,
            participants: json_file.participants.map(participant => participant.name),
            is_group: json_file.participants.length > 2,
        }

        data["conversations"].push(conversationData);
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
}