import { Component, createResource, createSignal, Show } from "solid-js";
import { User } from "../types/user";
import { openDB } from "idb";

interface Props {
    pfp: string;
    user: User
}

interface AppData {
    users: any;
    conversations: any,
    messages: any
}

const loadData = async (): Promise<AppData> => {
    const data: AppData = {
        users: [],
        conversations: [],
        messages: []
    }

    const db = await openDB("instagram-data", 1)
    data.users = await db.getAll("users")
    data.conversations = await db.getAll("conversations")
    data.messages = await db.getAll("messages")


    return data
}


const Analysis: Component<Props> = (props) => {
    const [data] = createResource(loadData)
    

    const clearData = () => {
        localStorage.clear()
        indexedDB.deleteDatabase("instagram-data");
        window.location.reload()
    }

    return (
        <div>
            <button 
                class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded" 
                onClick={clearData}
            >
                Clear Data
            </button>
            <h1>Analysis</h1>
            {// <img src={props.pfp} alt="Profile Picture" /> 
        }
            <Show when={!data.loading} fallback={<p>Loading...</p>}>
                <p>loaded</p>
                <p>Messages: {data()!.messages!.length ?? 0}</p>
            </Show>

        </div>
    )
}

export default Analysis;