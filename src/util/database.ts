import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'
let db, servers

dotenv.config()

const mongo = new MongoClient(process.env.MONGO_URL!)

export const connect = async () => {
    await mongo.connect()
    db = mongo.db(process.env.MONGO_DB!)

    servers = db.collection('servers')
}

export { db, servers }