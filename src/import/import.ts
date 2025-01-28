import { IDBPDatabase, openDB } from "idb"
import importUsers from "./users"
import importMessages from "./messages"

const createDatabase = async (): Promise<IDBPDatabase<unknown>> => {
    const db = await openDB("instagram-data", 1, {
        upgrade(db) {
            db.createObjectStore("users", { keyPath: "username" })
            db.createObjectStore("messages", { autoIncrement: true })
            db.createObjectStore("conversations", { keyPath: "title"})
            console.log("Database created")
        }
    })


    return db
}

export const importData = async (files: File[]) => {
    const db = await createDatabase()

    const importers = [
        importUsers(files, db),
        importMessages(files, db)
    ]

    await Promise.all(importers)

    console.log("Import complete")
}