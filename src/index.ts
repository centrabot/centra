import { VoltareClient } from 'voltare'
import dotenv from 'dotenv'
import path from 'path'

import EventsModule from './modules/Events'
import LoggingModule from './modules/Logging'
import AutomodModule from './modules/Automod'
import AutoreplyModule from './modules/Autoreply'
import RemindersModule from './modules/Reminders'

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
client.loadModules(AutomodModule)
client.loadModules(AutoreplyModule)
client.loadModules(RemindersModule)

//client.logRevoltEvents()
client.logToConsole('info')

client.commands.registerFromFolder(path.join('./dist/src/commands'))
client.commands.registerDefaults(['eval'])

client.connect()
database.connect()