import { VoltareClient } from 'voltare'
import dotenv from 'dotenv'
import path from 'path'

import EventsModule from './modules/Events'
import LoggingModule from './modules/Logging'

import * as database from './util/database'

dotenv.config()

const client = new VoltareClient({
    login: {
        type: 'bot',
        token: process.env.TOKEN!
    },
    prefix: process.env.PREFIX,
    mentionPrefix: true,
    elevated: process.env.ELEVATED
})

client.loadModules(EventsModule)
client.loadModules(LoggingModule)

//client.logRevoltEvents()
client.logToConsole('info')

client.commands.registerFromFolder(path.join('./dist/src/commands'))
client.commands.registerDefaults(['eval'])

client.connect()
database.connect()