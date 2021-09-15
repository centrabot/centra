import { VoltareModule, VoltareClient, ClientEvent } from 'voltare'
import { Message } from 'revolt.js/dist/maps/Messages'
import { ClientboundNotification } from 'revolt.js/dist/websocket/notifications'
import { Collection } from 'mongodb'
import { stripIndents } from 'common-tags'
import { nanoid } from 'nanoid'
import decancer from 'decancer'
import urlRegex from 'url-regex'
import unicodeEmojiRegex from 'emoji-regex/RGI_Emoji'

import { isMod, isAdmin } from '../util/permissionUtils'
import { servers } from '../util/database'

import shortlinks from '../../assets/shortlinks.json'

export const automodModules = {
    wordFilter: { key: 'wordFilter', description: 'Deletes messages that contain configured blacklisted words', options: ['words'] },
    messageSpamFilter: { key: 'messageSpamFilter', description: 'Keeps track of how many messages a user sends within a configured time, and deletes any messages sent within the configured time that are over a configured limit', options: ['timeLimit (in seconds)', 'messageLimit'] },
    emojiSpamFilter: { key: 'emojiSpamFilter', description: 'Deletes messages with an emoji count higher than a configured limit', options: ['emojiLimit'] },
    antiHoisting: { key: 'antiHoisting', description: 'Renames users that have a character at the start of their username/nickname to hoist themselves to the top of the list', options: [] },
    nameNormalization: { key: 'nameNormalization', description: 'Renames users that have unmentionable or unreadable characters in their username/nickname', options: [] },
    inviteBlocking: { key: 'inviteBlocking', description: 'Deletes messages that contain a Revolt server invite link', options: [] },
    shortlinkBlocking: { key: 'shortlinkBlocking', description: 'Deletes messages that contain shortlinks (such as bit.ly) or commonly known scam links', options: [] }
}

/* Source: https://github.com/IonicaBizau/regex-emoji/blob/master/lib/index.js */
export const chatEmojiRegex = /:([a-z0-9_\+\-]+):/g

export default class AutomodModule<t extends VoltareClient> extends VoltareModule<t> {
    constructor(client: t) {
        super(client, {
            name: 'automod',
            description: 'Handles auto moderation events and functionality'
        })

        this.filePath = __filename
    }

    load() {
        // register events with broken direct binding
        this.registerEvent('packet', (event: ClientEvent, data: ClientboundNotification) => {
            if (data.type === 'ServerMemberJoin') this.onServerMemberJoin(event, data as any)
            if (data.type === 'ServerMemberUpdate') this.onServerMemberUpdate(event, data as any)
        })

        this.registerEvent('message', this.onMessage.bind(this), { after: ['commands'] })
        
        //this.registerEvent('serverMemberJoin', this.onServerMemberJoin.bind(this)) - direct binding broken
        //this.registerEvent('serverMemberUpdate', this.onServerMemberUpdate.bind(this)) - direct binding broken
    }

    unload() {
        this.unregisterAllEvents()
    }

    async checkIfEnabled(serverID: string, autoModType?: string): Promise<boolean | any> {
        const server = await (servers as Collection).findOne({ id: serverID })
        if (!server) return false

        if (!autoModType) return server.autoMod

        if (!server.autoMod[autoModType]) return false
        if (!server.autoMod[autoModType].enabled) return false

        return true
    }

    // return -> continue
    // event.skip('commands') -> stop here, don't process commands
    private async onMessage(event: ClientEvent, message: Message) {
        if (message.author_id === process.env.BOT_USER_ID) return

        const userIsMod = await isMod(message.channel!.server!, message.author_id)
        const userIsAdmin = await isAdmin(message.channel!.server!, message.author_id)
        //if (userIsMod || userIsAdmin) return

        const server = await (servers as Collection).findOne({ id: message.channel!.server_id! })
        const punishments = server!.punishments

        const status = await this.checkIfEnabled(message.channel!.server_id!)

        if (status.wordFilter.enabled) { this.handleWordFilter(event, message, server, punishments, status.wordFilter) }
        if (status.emojiSpamFilter.enabled) { this.handleEmojiSpamFilter(event, message, server, punishments, status.emojiSpamFilter) }
        if (status.shortlinkBlocking.enabled) { this.handleShortlinkBlocking(event, message, server, punishments) }
    }

    // Name normalization
    private async onServerMemberJoin(event: ClientEvent, data: any) {
        const server = await this.client.bot.servers.fetch(data.id)
        if (!server) return

        const enabled = await this.checkIfEnabled(server._id, 'nameNormalization')
        if (!enabled) return
        
        const user = await this.client.bot.users.fetch(data.user)
        if (!user) return

        const member = await server.fetchMember(data.user)
        if (!member) return

        const normalized = decancer(user.username)
        if (user.username.toLowerCase() === normalized) return

        try {
            await member.update({
                nickname: normalized
            })

            console.log('normalized')
        } catch(err) {
            console.error(err)
        }
    }

    // Name normalization
    private async onServerMemberUpdate(event: ClientEvent, data: any) {
        const server = await this.client.bot.servers.fetch(data.id.server)
        if (!server) return

        const enabled = await this.checkIfEnabled(server._id, 'nameNormalization')
        if (!enabled) return
        
        const user = await this.client.bot.users.fetch(data.id.user)
        if (!user) return

        const member = await server.fetchMember(data.id.user)
        if (!member) return

        if (data.data['nickname']) {
            const normalized = decancer(data.data.nickname)
            if (data.data.nickname.toLowerCase() === normalized) return
    
            try {
                await member.update({
                    nickname: normalized
                })
    
                console.log('normalized')
            } catch(err) {
                console.error(err)
            }
        }

        if (data['clear'] && data.clear === 'Nickname') {
            const normalized = decancer(user.username)
            if (user.username.toLowerCase() === normalized) return
    
            try {
                await member.update({
                    nickname: normalized
                })
    
                console.log('normalized')
            } catch(err) {
                console.error(err)
            }
        }
    }

    private async handleWordFilter(event: ClientEvent, message: Message, server: any, punishments: any, config: any) {
        if (!config.words.length) return

        if (new RegExp(config.words.join('|')).test(message.content as string)) {
            await message.delete()

            await message.channel!.sendMessage(stripIndents`
            <@${message.author_id}>: Your message contained words blacklisted on this server's word filter. Warning issued.
            `)

            // Issue warning:
            const id = nanoid(10)
            const reason = `Message contained blacklisted words`

            punishments.push({
                id,
                userID: message.author_id,
                moderatorID: process.env.BOT_USER_ID,
                type: 'warning',
                createdAt: new Date(),
                reason: `[AUTOMOD] ${reason}`
            })
    
            await (servers as Collection).updateOne({ id: message.channel!.server_id! }, { $set: {
                punishments
            } })

            // Log:
            const modLogs = (server!.modLogsChannel || server!.modlogschannel || null)
            if (!modLogs) event.skip('commands')
            else {
                const modLogsChannel = await this.client.bot.channels.fetch(modLogs)
                if (!modLogsChannel) event.skip('commands')
    
                await modLogsChannel.sendMessage(stripIndents`
                > \`${id}\` - $\\color{#F39F00}\\textsf{Warning issued}$
                > $\\color{#F39F00}\\textsf{Auto Moderation Triggered - Word Filter}$
                > **User:** ${message.author!.username}
                > **Moderator:** ${process.env.BOT_NAME}
                > &nbsp;
                > **Reason:**
                > ${reason}
                `)
    
                event.skip('commands')
            }
        }
    }

    private async handleEmojiSpamFilter(event: ClientEvent, message: Message, server: any, punishments: any, config: any) {
        if (!config.emojiLimit || isNaN(config.emojiLimit)) return

        const unicodeMatches = (message.content as string).match(unicodeEmojiRegex()) || []
        const chatMatches = (message.content as string).match(chatEmojiRegex) || []

        const totalMatches = Number(unicodeMatches!.length + chatMatches!.length)

        if (totalMatches >= config.emojiLimit) {
            await message.delete()

            await message.channel!.sendMessage(stripIndents`
            <@${message.author_id}>: Your message exceeded the emoji limit of ${config.emojiLimit} emoji${config.emojiLimit > 1 ? 's' : ''}. Warning issued.
            `)

            // Issue warning:
            const id = nanoid(10)
            const reason = `Message exceeded limit of ${config.emojiLimit} emoji${config.emojiLimit > 1 ? 's' : ''} (contained ${totalMatches} emoji${totalMatches > 1 ? 's' : ''})`

            punishments.push({
                id,
                userID: message.author_id,
                moderatorID: process.env.BOT_USER_ID,
                type: 'warning',
                createdAt: new Date(),
                reason: `[AUTOMOD] ${reason}`
            })
    
            await (servers as Collection).updateOne({ id: message.channel!.server_id! }, { $set: {
                punishments
            } })

            // Log:
            const modLogs = (server!.modLogsChannel || server!.modlogschannel || null)
            if (!modLogs) event.skip('commands')
            else {
                const modLogsChannel = await this.client.bot.channels.fetch(modLogs)
                if (!modLogsChannel) event.skip('commands')
    
                await modLogsChannel.sendMessage(stripIndents`
                > \`${id}\` - $\\color{#F39F00}\\textsf{Warning issued}$
                > $\\color{#F39F00}\\textsf{Auto Moderation Triggered - Emoji Spam Filter}$
                > **User:** ${message.author!.username}
                > **Moderator:** ${process.env.BOT_NAME}
                > &nbsp;
                > **Reason:**
                > ${reason}
                `)
    
                event.skip('commands')
            }
        }
    }

    private async handleShortlinkBlocking(event: ClientEvent, message: Message, server: any, punishments: any) {
        const links: string[] | null = (message.content as string).match(urlRegex());
        if (!links || !links.length) return

        await Promise.all(links.map(async link => {
            if (shortlinks.some(i => new RegExp(i.toLowerCase()).test(link.toLowerCase()))) {
                await message.delete()

                await message.channel!.sendMessage(stripIndents`
                <@${message.author_id}>: Your message contained a shortlink or blacklisted URL. Warning issued.
                `)
    
                // Issue warning:
                const id = nanoid(10)
                const reason = `Message contained shortlink or blacklisted URL`

                punishments.push({
                    id,
                    userID: message.author_id,
                    moderatorID: process.env.BOT_USER_ID,
                    type: 'warning',
                    createdAt: new Date(),
                    reason: `[AUTOMOD] ${reason}`
                })
        
                await (servers as Collection).updateOne({ id: message.channel!.server_id! }, { $set: {
                    punishments
                } })

                // Log:
                const modLogs = (server!.modLogsChannel || server!.modlogschannel || null)
                if (!modLogs) event.skip('commands')
                else {
                    const modLogsChannel = await this.client.bot.channels.fetch(modLogs)
                    if (!modLogsChannel) event.skip('commands')
        
                    await modLogsChannel.sendMessage(stripIndents`
                    > \`${id}\` - $\\color{#F39F00}\\textsf{Warning issued}$
                    > $\\color{#F39F00}\\textsf{Auto Moderation Triggered - Shortlink Blocking}$
                    > **User:** ${message.author!.username}
                    > **Moderator:** ${process.env.BOT_NAME}
                    > &nbsp;
                    > **Reason:**
                    > ${reason}
                    `)
        
                    event.skip('commands')
                }
            }

            return
        }))

        return
    }
}
