import { VoltareModule, VoltareClient, ClientEvent } from 'voltare'
import { Message } from 'revolt.js/dist/maps/Messages'
import { Collection } from 'mongodb'
import { stripIndents } from 'common-tags'
import { nanoid } from 'nanoid'
import urlRegex from 'url-regex'

import { isMod, isAdmin } from '../util/permissionUtils'
import { servers } from '../util/database'

import shortlinks from '../../assets/shortlinks.json'

export default class AutomodModule<t extends VoltareClient> extends VoltareModule<t> {
    constructor(client: t) {
        super(client, {
            name: 'automod',
            description: 'Handles auto moderation events and functionality'
        })

        this.filePath = __filename
    }

    load() {
        this.registerEvent('message', this.onMessage.bind(this), { after: ['commands'] })
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
        if (status.shortlinkBlocking.enabled) { this.handleShortlinkBlocking(event, message, server, punishments) }
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
