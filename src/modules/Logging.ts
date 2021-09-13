import { VoltareModule, VoltareClient, ClientEvent } from 'voltare'
import { Message } from 'revolt.js/dist/maps/Messages'
import { Channel } from 'revolt.js/dist/maps/Channels'
import { ClientboundNotification } from 'revolt.js/dist/websocket/notifications'
import { Collection } from 'mongodb'
import { stripIndents } from 'common-tags'

import { servers } from '../util/database'

const messageCache = new Map
const channelCache = new Map
const memberCache = new Map
const roleCache = new Map

export const channelTypes = {
    TextChannel: 'Text',
    VoiceChannel: 'Voice'
}

export const serverEvents = [
    'messageUpdate',
    'messageDelete',
    'channelCreate',
    'channelUpdate',
    'channelDelete',
    'serverMemberJoin',
    'serverMemberUpdate',
    'serverMemberLeave'
]

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

        // register events with broken direct binding
        this.registerEvent('packet', (event: ClientEvent, data: ClientboundNotification) => {
            if (data.type === 'MessageDelete') this.onMessageDelete(event, data as any)

            if (data.type === 'ChannelCreate') this.onChannelCreate(event, data as any)
            if (data.type === 'ChannelUpdate') this.onChannelUpdate(event, data as any)

            if (data.type === 'ServerMemberJoin') this.onServerMemberJoin(event, data as any)
            if (data.type === 'ServerMemberUpdate') this.onServerMemberUpdate(event, data as any)
            if (data.type === 'ServerMemberLeave') this.onServerMemberLeave(event, data as any)
        })

        this.registerEvent('messageUpdate', this.onMessageUpdate.bind(this))
        //this.registerEvent('messageDelete', this.onMessageDelete.bind(this)) - direct binding broken

        //this.registerEvent('channelCreate', this.onChannelCreate.bind(this)) - direct binding broken
        //this.registerEvent('channelUpdate', this.onChannelUpdate.bind(this)) - direct binding broken
        this.registerEvent('channelDelete', this.onChannelDelete.bind(this))

        //serverUpdate - incomplete
        this.registerEvent('serverUpdate', this.onServerUpdate.bind(this))

        //serverRoleUpdate - incomplete
        //serverRoleDelete - incomplete

        //this.registerEvent('serverMemberJoin', this.onServerMemberJoin.bind(this)) - direct binding broken
        //this.registerEvent('serverMemberUpdate', this.onServerMemberUpdate.bind(this)) - direct binding broken
        //this.registerEvent('serverMemberLeave', this.onServerMemberLeave.bind(this)) - direct binding broken
    }

    unload() {
        this.unregisterAllEvents()
    }

    async checkIfEnabled(serverID: string, eventName: string): Promise<boolean> {
        const server = await (servers as Collection).findOne({ id: serverID })
        if (!server) return false

        if (!server.loggingEnabled) return false
        if (!server.loggingEventsEnabled.find(i => i.toLowerCase() === eventName.toLowerCase())) return false

        return true
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
        await Promise.all(Object.values(this.client.bot.servers).map(async server => {
            server.channels.forEach(channel => {
                channelCache.set(channel!._id, {
                    server: channel!.server_id,
                    name: channel!.name,
                    type: channel!.channel_type,
                    description: channel!.description,
                    icon: channel!.icon
                })
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
        const enabled = await this.checkIfEnabled(message.channel!.server_id!, 'messageUpdate')
        if (!enabled) return

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

    private async onMessageDelete(event: ClientEvent, message: any) {
        const deleted = messageCache.get(message.id)
        if (!deleted) return

        const enabled = await this.checkIfEnabled(deleted.server, 'messageDelete')
        if (!enabled) return

        const logChannel = await this.getLogChannel(deleted.server)        
        if (!logChannel) return

        const author = await this.client.bot.users.fetch(deleted.author)

        let i = 0;

        await logChannel.sendMessage(stripIndents`
        > #### Message deleted
        > **Author:** ${author.username || '*Unknown*'}
        > **Channel:** <#${deleted.channel}>
        > **Content:**
        > \`\`\`\n> ${(deleted.content as string).split('\n').join('\n> ')}\n>\`\`\`
        > **Attachments:** ${(deleted.attachments || []).length ? deleted.attachments.map(attachment => {
            i++
            return `[Attachment #${i}](https://autumn.revolt.chat/attachments/${attachment._id}/${attachment.filename})`
        }).join(', ') : 'No attachments'}
        `)

        messageCache.delete(message.id)
    }

    private async onChannelCreate(event: ClientEvent, channel: Partial<Channel>) {
        const enabled = await this.checkIfEnabled(channel!.server! as any as string, 'channelCreate')
        if (!enabled) return

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

        const enabled = await this.checkIfEnabled(oldChannel.server, 'channelUpdate')
        if (!enabled) return

        const logChannel = await this.getLogChannel(oldChannel.server)        
        if (!logChannel) return
        
        const differences = Object.entries(channel.data).map(i => {
            if (i[0] === 'icon') return { key: i[0], old: `[Link](https://autumn.revolt.chat/icons/${oldChannel.icon._id})`, new: `[Link](https://autumn.revolt.chat/icons/${(i[1] as any)._id})` }
            return { key: i[0], old: oldChannel[i[0] as string], new: i[1] }
        })

        if (differences.some(difference => difference.key === 'default_permissions')) return
        if (differences.some(difference => difference.key === 'role_permissions')) return

        await logChannel.sendMessage(stripIndents`
        > #### Channel updated
        > **Updated values:**
        ${differences.map(difference => `> - ${difference.key}: ${difference.old || 'none'} -> ${difference.new || 'none'}`).join('\n')}
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

        const enabled = await this.checkIfEnabled(channel!.server_id!, 'channelDelete')
        if (!enabled) return

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

    private async onServerUpdate(event: ClientEvent, data: any) {

    }

    private async onServerMemberJoin(event: ClientEvent, data: any) {
        const enabled = await this.checkIfEnabled(data.id, 'serverMemberLeave')
        if (!enabled) return

        const logChannel = await this.getLogChannel(data.id)        
        if (!logChannel) return

        const user = await this.client.bot.users.fetch(data.user)
        if (!user) return

        await logChannel.sendMessage(stripIndents`
        > #### User joined
        > **User:** ${user.username}
        `)
    }

    private async onServerMemberUpdate(event: ClientEvent, data: any) {
        const enabled = await this.checkIfEnabled(data.id.server, 'serverMemberLeave')
        if (!enabled) return

        const logChannel = await this.getLogChannel(data.id.server)        
        if (!logChannel) return

        const user = await this.client.bot.users.fetch(data.id.user)
        if (!user) return

        const oldUser = this.client.bot.members.get(data.id.user) || undefined

        if (data['clear']) {
            await logChannel.sendMessage(stripIndents`
            > #### User updated
            > **User:** ${user.username}
            > **Updated values:** 
            > - ${data.clear} removed
            `)

            return
        }

        const differences = Object.entries(data.data).map(i => {
            if (i[0] === 'avatar') return { key: i[0], old: oldUser! ? `[Link](https://autumn.revolt.chat/avatars/${oldUser![i[0] as string]._id}/${oldUser![i[0] as string].filename})` : null, new: `[Link](https://autumn.revolt.chat/avatars/${(i[1] as any)._id}/${(i[1] as any).filename})` }
            return { key: i[0], old: oldUser![i[0] as string] || null, new: i[1] }
        })

        await logChannel.sendMessage(stripIndents`
            > #### User updated
            > **User:** ${user.username}
            > **Updated values:** 
            ${differences.map(difference => `> - ${difference.key}: ${difference.old || 'none'} -> ${difference.new || 'none'}`).join('\n')}
            `)
    }

    private async onServerMemberLeave(event: ClientEvent, data: any) {
        const enabled = await this.checkIfEnabled(data.id, 'serverMemberLeave')
        if (!enabled) return

        const logChannel = await this.getLogChannel(data.id)        
        if (!logChannel) return

        const user = await this.client.bot.users.fetch(data.user)
        if (!user) return

        await logChannel.sendMessage(stripIndents`
        > #### User left
        > **User:** ${user.username}
        `)
    }
}
