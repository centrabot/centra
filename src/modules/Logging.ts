import { VoltareModule, VoltareClient, ClientEvent } from 'voltare'
import { Message } from 'revolt.js/dist/maps/Messages'
import { Channel } from 'revolt.js/dist/maps/Channels'
import { ClientboundNotification } from 'revolt.js/dist/websocket/notifications'
import { Collection } from 'mongodb'
import { stripIndents } from 'common-tags'

import { servers } from '../util/database'

const messageCache = new Map
const channelCache = new Map
const roleCache = new Map

const channelTypes = {
    TextChannel: 'Text',
    VoiceChannel: 'Voice'
}

export default class LoggingModule<t extends VoltareClient> extends VoltareModule<t> {
    constructor(client: t) {
        super(client, {
            name: 'logging',
            description: 'Handles logging for servers'
        })

        this.filePath = __filename
    }

    load() {
        this.registerEvent('ready', this.onReady.bind(this))
        this.registerEvent('message', this.onMessage.bind(this))

        // register broken events
        this.registerEvent('packet', (event: ClientEvent, data: ClientboundNotification) => {
            if (data.type === 'ChannelCreate') this.onChannelCreate(event, data as any)
            if (data.type === 'ChannelUpdate') this.onChannelUpdate(event, data as any)
        })

        this.registerEvent('messageUpdate', this.onMessageUpdate.bind(this))
        this.registerEvent('messageDelete', this.onMessageDelete.bind(this))

        //this.registerEvent('channelCreate', this.onChannelCreate.bind(this)) - broken
        //this.registerEvent('channelUpdate', this.onChannelUpdate.bind(this)) - broken
        this.registerEvent('channelDelete', this.onChannelDelete.bind(this))

        //serverUpdate - incomplete

        //serverRoleUpdate - incomplete
        //serverRoleDelete - incomplete

        //serverMemberJoin - incomplete
        //serverMemberUpdate - incomplete
        //serverMemberLeave - incomplete
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
        this.client.bot.servers.forEach(server => server.channels.forEach(channel => {
            channelCache.set(channel!._id, {
                server: channel!.server_id,
                name: channel!.name,
                type: channel!.channel_type,
                description: channel!.description,
                icon: channel!.icon
            })
        }))
    }

    private async onMessage(event: ClientEvent, message: Message) {
        messageCache.set(message._id, {
            server: message.channel!.server_id,
            channel: message.channel_id,
            author: message.author_id,
            content: message.content,
            attachments: message.attachments
        }) 
    }

    private async onMessageUpdate(event: ClientEvent, message: Message) {
        const logChannel = await this.getLogChannel(message.channel!.server_id!)        
        if (!logChannel) return

        const oldMessage = messageCache.get(message._id)
        if (!oldMessage) return

        if (oldMessage.content === message.content) return

        await logChannel.sendMessage(stripIndents`
        > #### Message updated
        > **Author:** ${message.author!.username || '*Unknown*'}
        > **Channel:** <#${message.channel_id}>
        > **Old:**
        > \`\`\`\n> ${oldMessage.content.split('\n').join('\n> ')}\n>\`\`\`
        > **New:**
        > \`\`\`\n> ${(message.content as string).split('\n').join('\n> ')}\n>\`\`\`
        `)

        messageCache.get(message._id).content = message.content
    }

    private async onMessageDelete(event: ClientEvent, messageID: string) {
        const message = messageCache.get(messageID)
        if (!message) return

        const logChannel = await this.getLogChannel(message.server)        
        if (!logChannel) return

        const author = await this.client.bot.users.fetch(message.author)

        let i = 0;

        await logChannel.sendMessage(stripIndents`
        > #### Message deleted
        > **Author:** ${author.username || '*Unknown*'}
        > **Channel:** <#${message.channel}>
        > **Content:**
        > \`\`\`\n> ${(message.content as string).split('\n').join('\n> ')}\n>\`\`\`
        > **Attachments:** ${message.attachments.length ? message.attachments.map(attachment => {
            i++
            return `[Attachment #${i}](https://autumn.revolt.chat/attachments/${attachment._id}/${attachment.filename})`
        }).join(', ') : 'No attachments'}
        `)

        messageCache.delete(messageID)
    }

    private async onChannelCreate(event: ClientEvent, channel: Partial<Channel>) {
        const logChannel = await this.getLogChannel(channel!.server! as any as string)        
        if (!logChannel) return

        await logChannel.sendMessage(stripIndents`
        > #### Channel created
        > **Name:** ${channel.name}
        > **Type:** ${channelTypes[channel.channel_type || ''] || '*Unknown*'}
        `)

        channelCache.set(channel._id, {
            server: channel.server_id,
            name: channel.name,
            type: channel.channel_type,
            description: channel.description,
            icon: channel.icon
        })
    }

    private async onChannelUpdate(event: ClientEvent, channel: any) {
        const oldChannel = channelCache.get(channel.id)
        if (!oldChannel) return 

        const logChannel = await this.getLogChannel(oldChannel.server)        
        if (!logChannel) return
        
        const differences = Object.entries(channel.data).map(i => {
            return { key: i[0], old: oldChannel[i[1] as string], new: i[1] }
        })

        await logChannel.sendMessage(stripIndents`
        > #### Channel updated
        > **Updated values:**
        ${differences.map(difference => `> - ${difference.key}: \`${difference.old || 'none'}\` -> \`${difference.new || 'none'}\``).join('\n')}
        `)

        differences.forEach(difference => {
            const newObj = oldChannel
            newObj[difference.key] = difference.new
            channelCache.set(channel.id, newObj)
        })
    }

    private async onChannelDelete(event: ClientEvent, channelID: string) {
        const channel = this.client.bot.channels.get(channelID)
        if (!channel) return

        const logChannel = await this.getLogChannel(channel!.server_id!)        
        if (!logChannel) return

        await logChannel.sendMessage(stripIndents`
        > #### Channel deleted
        > **Name:** ${channel.name}
        > **Type:** ${channelTypes[channel.channel_type] || '*Unknown*'}
        > **Description:** ${channel.description || 'No description'}
        > **Icon:** ${channel.icon ? `[Link](https://autumn.revolt.chat/icons/${channel.icon._id})` : 'No icon'}
        `)
    }
}
