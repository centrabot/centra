import { VoltareClient, VoltareCommand, CommandContext } from 'voltare'
import { Collection } from 'mongodb'
import { stripIndents } from 'common-tags'

import { servers } from '../../util/database'
import { getChannel } from '../../util/fetchUtils'
import { sendError } from '../../util/messageUtils'

const validOptions = ['view', 'set', 'reset']
const validResetOptions = ['<key>', 'all']

const defaultConfig = {
    prefix: '?',
    useMentionPrefix: true,
    membersCanUseTags: false,
    serverLogsChannel: null,
    modLogsChannel: null
}

const configDetails = {
    prefix: { key: 'prefix', type: 'string', description: 'The prefix to use in the server' },
    useMentionPrefix: { key: 'useMentionPrefix', type: 'boolean', description: 'Whether to allow mentioning the bot to be used as a prefix' },
    membersCanUseTags: { key: 'membersCanUseTags', type: 'string', description: 'Whether to allow members (non-moderators) to use and send tags' },
    serverLogsChannel: { key: 'serverLogsChannel', type: 'channel', description: 'The channel where server logs (such as joins, leaves, edits) are sent/logged to' },
    modLogsChannel: { key: 'modLogsChannel', type: 'channel', description: 'The channel where mod logs (such as kicks, bans, mutes, warnings) are sent/logged to' }
}

export default class ConfigCommand extends VoltareCommand {
    constructor(client: VoltareClient<any>) {
        super(client, {
            name: 'config',
            description: 'Configure server settings. Temporary until the web dasboard arrives.',
            category: 'Config',
            metadata: {
                examples: ['{p}config set <key> <val>', '{p}config view', '{p}config [key]', '{p}config reset <key | all>'],
                extendedDescription: stripIndents`
                The config command lets you view and configure your server's settings. **It is temporary until Revolt releases OAuth2, and the web dashboard comes out.**
                Use \`{p}config view\` to view the entire config, or \`{p}config view <key>\` to view a specific config value.
                Use \`{p}config set <key> <val>\` to set a config value, and \`\{p}config reset <key | all>\` to reset all or a specific config value. 
                `
            }
        })

        this.filePath = __filename
    }

    async run(ctx: CommandContext) {            try {
        if (!ctx.args.length) return stripIndents`
        No option provided. Option must be one of the following: ${validOptions.join(', ')}
        See \`${ctx.prefix}help config\` for more information
        `

        const option = ctx.args[0].toLowerCase()

        if (!validOptions.some(i =>  i.toLowerCase() === option)) return stripIndents`
        Invalid option. Option must be one of the following: ${validOptions.join(', ')}
        See \`${ctx.prefix}help config\` for more information
        `

        const server = await (servers as Collection).findOne({ id: ctx.server!._id })

        if (option === 'view') {
            ctx.args.shift()

            if (!ctx.args.length) {
                await ctx.reply(stripIndents`
                ### Config for ${ctx.server!.name}
                Use \`${ctx.prefix}config view <key>\` to view a specific config value
                Use \`${ctx.prefix}config set <key> <val>\` to change a specific config value
                &nbsp;
                ${Object.values(configDetails).map(value => `\`${value.key}\`: ${value.description}`).join('\n')}
                `)

                return
            }

            const option = ctx.args[0].toLowerCase()
            const value = Object.values(configDetails).find(value => value.key.toLowerCase() === option)
            if (!value) return sendError(ctx, 'No config value with that key found')

            const val = server![value.key]

            let display, defaultDisplay
            if (value.type === 'string') display = `\`${val}\``, defaultDisplay = `\`${defaultConfig[value.key]}\``
            if (value.type === 'boolean') display = val ? '✔️' : '❌', defaultDisplay = defaultConfig[value.key] ? '✔️' : '❌'
            if (value.type === 'channel') display = val ? `<#${val}>` : '`none`', defaultDisplay = defaultConfig[value.key] ? `<#${defaultConfig[value.key]}>` : '`none`'

            ctx.reply(stripIndents`
            ### ${value.key}
            ${value.description}
            &nbsp;
            **Type:** ${value.type}
            **Default Value:** ${defaultDisplay}
            **Current Value:** ${display}
            &nbsp;
            To set: \`${ctx.prefix}config set ${value.key} <val>\`
            To reset: \`${ctx.prefix}config reset ${value.key}\`
            `)
        }

        if (option === 'set') {
            ctx.args.shift()

            const key = ctx.args[0].toLowerCase()
            const value = Object.values(configDetails).find(value => value.key.toLowerCase() === key)
            if (!value) return sendError(ctx, 'No config value with that key found')

            ctx.args.shift()

            const newVal = ctx.args.join(' ')
            if (!newVal) return sendError(ctx, 'No new value provided')

            const curVal = server![value.key]
            const details = Object.values(configDetails).find(i => i.key === value.key)
            if (!details) return sendError(ctx, 'Failed to fetch config details')

            let set

            if (details.type === 'string') {
                if (newVal === curVal) return sendError(ctx, 'The new config value is the same as the current config value')
                set = newVal
            }

            if (details.type === 'boolean') {
                if (['yes', 'y', 'true'].some(i => i === newVal.toLowerCase())) set = true
                if (['no', 'n', 'false'].some(i => i === newVal.toLowerCase())) set = false
                if (set === curVal) return sendError(ctx, 'The new config value is the same as the current config value')
            }

            if (details.type === 'channel') {
                if (newVal.toLowerCase() === 'none') set = null
                const channel = await getChannel(ctx.server!, newVal)
                if (!channel) return sendError(ctx, 'The specified channel does not exist in this server')
                set = channel._id
            }

            let obj = {}
            obj[key] = set

            await (servers as Collection).updateOne({ id: ctx.server!._id }, { $set: obj })

            let display
            if (details.type === 'string') display = `\`${set}\``
            if (details.type === 'boolean') display = set ? '✔️' : '❌'
            if (details.type === 'channel') display = set ? `<#${set}>` : '`none`'

            await ctx.reply(stripIndents`
            Set \`${key}\` to ${display}
            `)

            return
        }

        if (option === 'reset') {
            ctx.args.shift()

            if (!ctx.args.length) return stripIndents`
            No reset option provided. Reset option must be one of the following: ${validResetOptions.join(', ')}
            See \`${ctx.prefix}help config\` for more information
            `
    
            const resetOption = ctx.args[0].toLowerCase()


            if (resetOption === 'all') {
                await (servers as Collection).updateOne({ id: ctx.server!._id }, { $set: defaultConfig })

                await ctx.reply(stripIndents`
                Reset all server config values to their defaults
                `)

                return
            }

            const key = ctx.args[0].toLowerCase()
            const value = Object.values(configDetails).find(value => value.key.toLowerCase() === key)
            if (!value) return sendError(ctx, 'No config value with that key found')

            const newVal = defaultConfig[key]

            let obj = {}
            obj[key] = newVal

            await (servers as Collection).updateOne({ id: ctx.server!._id }, { $set: obj })

            await ctx.reply(stripIndents`
            Reset \`${key}\` to its default
            `)

            return
        }

    } catch(err) { console.error(err) }
    }
}