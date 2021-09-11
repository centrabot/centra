import { VoltareModule, VoltareClient, ClientEvent } from 'voltare'
import { ClientboundNotification } from 'revolt.js/dist/websocket/notifications'
import { Message } from 'revolt.js/dist/maps/Messages'
import { Collection } from 'mongodb'
import { stripIndents } from 'common-tags'

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

        this.registerEvent('packet', (event: ClientEvent, data: ClientboundNotification) => {
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
            muteRole: null,
            prefix: '?',
            useMentionPrefix: true,
            membersCanUseTags: false,
            serverLogsChannel: null,
            modLogsChannel: null
        })

        const channel = await this.client.bot.channels.fetch(process.env.LOG_CHANNEL_ID!)
        if (!channel) return

        const server = await this.client.bot.servers.fetch(event.id)
        if (!server) return

        const owner = await this.client.bot.users.fetch(server.owner)
        const members = await server.fetchMembers()
        const userCount = members.users.filter(user => !user.bot)
        const botCount = members.users.filter(user => user.bot)

        await channel.sendMessage(stripIndents`
        > ### $\\color{#23E586}\\textsf{Added to server:}$ ${server.name}
        > #### Server count: ${this.client.bot.servers.size}
        > &nbsp;
        > **Owner:** ${owner.username || '*Unable to fetch owner*'}
        > **Members:**
        > - Users: ${userCount.length}
        > - Bots: ${botCount.length === 0 ? 'None' : botCount.length}
        > &nbsp;
        > ##### Server ID: ${server._id}
        `)
    }

    private async onDelete(event: any) {
        await (servers as Collection).deleteOne({ id: event.id })

        const channel = await this.client.bot.channels.fetch(process.env.LOG_CHANNEL_ID!)
        if (!channel) return

        const messages = await channel.search({
            query: `Server ID: ${event.id}`
        })
        if (!messages.length) return
        
        const message = messages[0]
        if (!message) return
        const name = (message.content as any).match(/\$\\color{#23E586}\\textsf{Added to server:}\$ (.+)/)[1]

        await channel.sendMessage(stripIndents`
        > ### $\\color{#CE3C3C}\\textsf{Removed from server:}$ ${name}
        > #### Server count: ${this.client.bot.servers.size}
        > &nbsp;
        > ##### Server ID: ${event.id}
        `)
    }
}
