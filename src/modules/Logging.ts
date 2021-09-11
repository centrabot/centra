import { VoltareModule, VoltareClient, ClientEvent } from 'voltare'
import { Message } from 'revolt.js/dist/maps/Messages'
import { Channel } from 'revolt.js/dist/maps/Channels'
import { Collection } from 'mongodb'
import { stripIndents } from 'common-tags'

import { servers } from '../util/database'

const messageCache = new Map
const channelCache = new Map
const roleCache = new Map

export default class LoggingModule<t extends VoltareClient> extends VoltareModule<t> {
    constructor(client: t) {
        super(client, {
            name: 'logging',
            description: 'Handles logging for servers'
        })

        this.filePath = __filename
    }

    load() {
        this.registerEvent('message', this.onMessage.bind(this))

        this.registerEvent('messageUpdate', this.onMessageUpdate.bind(this))
        this.registerEvent('messageDelete', this.onMessageDelete.bind(this))

        //channelCreate
        //channelUpdate
        this.registerEvent('channelDelete', this.onChannelDelete.bind(this))

        //serverUpdate

        //serverRoleUpdate
        //serverRoleDelete

        //serverMemberJoin
        //serverMemberUpdate
        //serverMemberLeave
    }

    unload() {
        this.unregisterAllEvents()
    }

    async getLogChannel(serverID: string): Promise<Channel | undefined> {
        const server = await (servers as Collection).findOne({ id: serverID })
        if (!server) return

        const logChannel = server.serverLogsChannel || !server.serverlogschannel
        if (!logChannel) return

        const channel = await this.client.bot.channels.fetch(logChannel)
        if (!channel) return

        return channel
    }

    private async onReady(event: ClientEvent) {
        this.client.bot.servers.forEach(server => server.channels.forEach(channel => channelCache.set(channel?._id, server._id)))
    }

    private async onMessage(event: ClientEvent, message: Message) {
        messageCache.set(message._id, message.channel!.server_id) 
    }

    private async onMessageUpdate(event: ClientEvent, message: Message) {
        const channel = await this.getLogChannel(message.channel!.server_id!)
        if (!channel) return

        console.log(message.content)
    }

    private async onMessageDelete(event: ClientEvent, messageID: string) {
    }

    private async onChannelDelete(event: ClientEvent, channelID: string) {
    }
}
