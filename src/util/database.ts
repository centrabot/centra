import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'
let db, servers, reminders

dotenv.config()

const mongo = new MongoClient(process.env.MONGO_URL!)

export const connect = async () => {
    await mongo.connect()
    db = mongo.db(process.env.MONGO_DB!)

    servers = db.collection('servers')
    reminders = db.collection('reminders')
}

export { db, servers, reminders }