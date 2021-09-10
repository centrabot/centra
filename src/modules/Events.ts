import { VoltareModule, VoltareClient, ClientEvent } from 'voltare'
import { Message } from 'revolt.js/dist/maps/Messages'
import { Collection } from 'mongodb'

import { servers } from '../util/database'

export default class EventsModule<t extends VoltareClient> extends VoltareModule<t> {
    constructor(client: t) {
        super(client, {
            name: 'events',
            description: 'Handles status setting, creation and deletion of server configuration'
        })

        this.filePath = __filename
    }

    load() {
        this.registerEvent('ready', this.onReady.bind(this))

        this.registerEvent('message', this.onMessage.bind(this), { after: ['commands'] })

        this.registerEvent('packet', (packet: any, data: any) => {
            if (data.type === 'ServerMemberJoin' && data.user === this.client.bot.user?._id) this.onCreate(data)
            if (data.type === 'ServerMemberLeave' && data.user === this.client.bot.user?._id) this.onDelete(data)
        })
    }

    unload() {
        this.unregisterAllEvents()
    }

    private async onReady(event: ClientEvent) {
        console.info('Ready')
        
        await this.client.bot.users.edit({
            status: {
                text: `${process.env.PREFIX}help or @${process.env.BOT_NAME} help`
            },
            profile: {
                content: `Centra is a powerful moderation & utility bot for Revolt servers.\n[Invite ${process.env.BOT_NAME} to your server](${process.env.INVITE_URL}) | [Join the support server](${process.env.SUPPORT_URL})`
            }
        })
    }

    private async onMessage(event: ClientEvent, message: Message) {
        const server = await (servers as Collection).findOne({ id: message.channel!.server_id })

        if (server) {
            event.set('prefix', server.prefix || '?')
            event.set('mentionPrefix', server.useMentionPrefix || true)
            event.set('skipConfigPrefix', true)
        }
    }
    
    private async onCreate(event: any) {
        await (servers as Collection).insertOne({
            id: event.id,
            tags: [],
            punishments: [],
            modRoles: [],
            adminRoles: [],
            prefix: '?',
            useMentionPrefix: true,
            membersCanUseTags: false,
        })
    }

    private async onDelete(event: any) {
        await (servers as Collection).deleteOne({ id: event.id })
    }
}
