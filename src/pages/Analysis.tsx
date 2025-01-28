import { Component, createResource, createSignal, Show } from "solid-js";
import { StoredData, User } from "../types/user";
import { openDB } from "idb";

import MessageAnalysis from "../components/Messages";
import UsersAnalysis from "../components/Users";

interface Props {
    pfp: string;
    user: User
}


const loadData = async (): Promise<StoredData> => {
    const db = await openDB("instagram-data", 1)

    const data: StoredData = {
        user: JSON.parse(localStorage.getItem("user")!),
        users: await db.getAll("users"),
        conversations: await db.getAll("conversations"),
        messages: await db.getAll("messages"),
    }

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
            <h1 class="text-3xl font-bold mb-4">Analysis</h1>
            <button 
                class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded" 
                onClick={clearData}
            >
                Clear Data
            </button>
            <Show when={!data.loading} fallback={<p>Loading...</p>}>
                <MessageAnalysis data={data()!} />
                <UsersAnalysis data={data()!} />
            </Show>

        </div>
    )
}

export default Analysis;