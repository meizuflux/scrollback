import { IDBPDatabase, openDB } from "idb"
import importUsers from "./users"
import importMessages from "./messages"

const createDatabase = async (): Promise<IDBPDatabase<unknown>> => {
    const db = await openDB("instagram-data", 1, {
        upgrade(db) {
            db.createObjectStore("users", { keyPath: "username" })
            db.createObjectStore("messages", { autoIncrement: true })
            db.createObjectStore("conversations", { keyPath: "title"})
        }
    })


    return db
}

export const importData = async (files: File[]) => {
    const db = await createDatabase()

    const importers = [
        importUsers(files, db),
        importMessages(files, db),
        /* 
        importStoryLikes(files, db),
        importPostLikes(files, db),
        importLikedComments(files, db),
        importComments(files, db),
        importYourTopics(files, db),
        importLocationsOfInterest(files, db),
        importProfileChanges(files, db)
        */
    ]

    /* TODO: save misc stats to local storage
        - number of saved posts
        - number of stories
        - profile based in

    could potentially gather all the timestamps from everything and display it as a graph to determine activity over time / when most active based on number of events?
    probably interactable, filterable graph preferably

    lots of information missing on the data request zip
    */

    await Promise.all(importers)
}