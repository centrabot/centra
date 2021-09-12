import { VoltareClient, CommandContext } from 'voltare'
import { GeneralCommand } from '../../util/abstracts'
import { ChannelPermission } from 'revolt.js'
import { Collection } from 'mongodb'
import { stripIndents } from 'common-tags'

import { servers } from '../../util/database'
import { sendError } from '../../util/messageUtils'
import { isAdmin } from '../../util/permissionUtils'

import { serverEvents } from '../../modules/Logging'

const validOptions = ['info', 'enable', 'disable']

export default class LoggingCommand extends GeneralCommand {
    constructor(client: VoltareClient<any>) {
        super(client, {
            name: 'logging',
            description: 'Enable, disable and manage server event logging',
            category: 'Config',
            metadata: {
                examples: ['{p}logging info', '{p}muterole enable', '{p}muterole disable'],
                extendedDescription: stripIndents`
                The logging command lets you enable, disable and manage server event logging.
                Use \`{p}logging enable\` to enable logging, \`{p}logging disable\` to disable logging, and \`{p}logging info\` to view what's enabled.
                Each server event can be enabled or disabled individually
                `
            }
        })

        this.filePath = __filename
    }

    async run(ctx: CommandContext) {
        const userIsAdmin = await isAdmin(ctx.server!, ctx.author._id)
        if (!userIsAdmin) return sendError(ctx, 'Only admins can use this command')
        
        const server = await (servers as Collection).findOne({ id: ctx.server!._id })

        if (!ctx.args.length) return stripIndents`
        No option provided. Option must be one of the following: ${validOptions.join(', ')}
        See \`${ctx.prefix}help logging\` for more information
        `

        const option = ctx.args[0].toLowerCase()

        if (!validOptions.some(i =>  i.toLowerCase() === option)) return stripIndents`
        Invalid option. Option must be one of the following: ${validOptions.join(', ')}
        See \`${ctx.prefix}help logging\` for more information
        `

        if (option === 'info') {
            await ctx.reply(stripIndents`
            ### Logging config for ${ctx.server!.name}
            **Status:** ${server!.loggingEnabled ? '$\\color{#00CC00}\\textsf{Enabled}$' : '$\\color{#CE3C3C}\\textsf{Disabled}$'}
            &nbsp;
            #### Server events:
            ${serverEvents.map(event => `- ${event}: ${server!.loggingEventsEnabled.includes(event) ? '$\\color{#00CC00}\\textsf{Enabled}$' : '$\\color{#CE3C3C}\\textsf{Disabled}$'}`).join('\n')}
            `)

            return
        }

        if (option === 'enable') {
            ctx.args.shift()

            if (ctx.args.length) {
                const name = ctx.args[0].toLowerCase()

                const event = serverEvents.find(i => i.toLowerCase() === name)
                if (!event) return sendError(ctx, 'No server event with that name exists')

                if (server!.loggingEventsEnabled.includes(event)) return sendError(ctx, `${event} is already enabled`)

                server!.loggingEventsEnabled.push(event)

                await (servers as Collection).updateOne({ id: ctx.server!._id }, { $set: {
                    loggingEventsEnabled: server!.loggingEventsEnabled
                } })
    
                await ctx.reply(stripIndents`
                ${event} has been enabled
                `)

                return
            }

            if (server!.loggingEnabled) return sendError(ctx, 'Logging is already enabled')

            await (servers as Collection).updateOne({ id: ctx.server!._id }, { $set: {
                loggingEnabled: true
            } })

            await ctx.reply(stripIndents`
            Logging has been enabled
            `)

            return
        }

        if (option === 'disable') {
            ctx.args.shift()

            if (ctx.args.length) {
                const name = ctx.args[0].toLowerCase()

                const event = serverEvents.find(i => i.toLowerCase() === name)
                if (!event) return sendError(ctx, 'No server event with that name exists')

                if (!server!.loggingEventsEnabled.includes(event)) return sendError(ctx, `${event} is already disabled`)

                const index = server!.loggingEventsEnabled.findIndex(i => i === event)
                if (!index) return sendError(ctx, 'Failed to fetch event index')

                server!.loggingEventsEnabled.splice(index, 1)

                await (servers as Collection).updateOne({ id: ctx.server!._id }, { $set: {
                    loggingEventsEnabled: server!.loggingEventsEnabled
                } })
    
                await ctx.reply(stripIndents`
                ${event} has been disabled
                `)

                return   
            }

            if (!server!.loggingEnabled) return sendError(ctx, 'Logging is already disabled')

            await (servers as Collection).updateOne({ id: ctx.server!._id }, { $set: {
                loggingEnabled: false
            } })

            await ctx.reply(stripIndents`
            Logging has been disabled
            `)

            return
        }
    }
}