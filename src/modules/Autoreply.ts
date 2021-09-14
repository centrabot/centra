import { VoltareModule, VoltareClient, ClientEvent } from 'voltare'
import { Message } from 'revolt.js/dist/maps/Messages'
import { Collection } from 'mongodb'

import { servers } from '../util/database'
import { sendError } from '../util/messageUtils'

export default class AutoreplyModule<t extends VoltareClient> extends VoltareModule<t> {
    constructor(client: t) {
        super(client, {
            name: 'autoreply',
            description: 'Handles auto response triggering'
        })

        this.filePath = __filename
    }

    load() {
        this.registerEvent('message', this.onMessage.bind(this), { after: ['commands'] })
    }

    unload() {
        this.unregisterAllEvents()
    }

    private async onMessage(event: ClientEvent, message: Message) {
        if (message.author_id === process.env.BOT_USER_ID) return

        const server = await (servers as Collection).findOne({ id: message.channel!.server_id! })
        const autoreplies = server!.autoreplies

        await Promise.all(autoreplies.forEach(async ar => {
            if (new RegExp(ar.keywords.join('|')).test(message.content as string)) {
                await message.channel!.sendMessage(ar.content)

                const index = autoreplies.findIndex(i => i.name === ar.name)
                if (index === -1) return sendError(message, 'Failed to update auto response triggers')
        
                if (ar.triggers === 0) autoreplies[index].triggers = 1
                else autoreplies[index].triggers++
        
                await (servers as Collection).updateOne({ id: message.channel!.server_id! }, { $set: {
                    autoreplies
                } })
        
                return
            }
        }))
    }
}
