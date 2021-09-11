import { VoltareModule, VoltareClient, ClientEvent } from 'voltare'
import { Message } from 'revolt.js/dist/maps/Messages'
import { Channel } from 'revolt.js/dist/maps/Channels'
import { Collection } from 'mongodb'
import { stripIndents } from 'common-tags'

import { servers } from '../util/database'

export default class LoggingModule<t extends VoltareClient> extends VoltareModule<t> {
    constructor(client: t) {
        super(client, {
            name: 'logging',
            description: 'Handles logging for servers'
        })

        this.filePath = __filename
    }

    load() {
        this.registerEvent('messageUpdate', this.onMessageUpdate.bind(this))
        this.registerEvent('messageUpdate', this.onMessageDelete.bind(this))

        this.registerEvent('channelDelete', this.onChannelDelete.bind(this))
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

    private async onMessageUpdate(event: ClientEvent, message: Message) {
        //const channel = await this.getLogChannel()
    }

    private async onMessageDelete(event: ClientEvent, messageID: string) {
    }

    private async onChannelDelete(event: ClientEvent, channelID: string) {
    }
}
