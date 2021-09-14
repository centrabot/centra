import { VoltareClient, CommandContext } from 'voltare'
import { GeneralCommand } from '../../util/abstracts'
import { Collection } from 'mongodb'
import { stripIndents } from 'common-tags'
import parse from 'yargs-parser'

import { servers } from '../../util/database'
import { sendError } from '../../util/messageUtils'
import { isAdmin } from '../../util/permissionUtils'

const validOptions = ['info', 'enable', 'disable', 'configure']
const validWordFilterOptions = ['list', 'add', 'remove']
const validMessageSpamFilter = ['timelimit', 'messagelimit']
const validEmojiSpamFilter = ['emojilimit']

import automodModules from '../../modules/Automod'

export default class AutomodCommand extends GeneralCommand {
    constructor(client: VoltareClient<any>) {
        super(client, {
            name: 'automod',
            description: 'Enable, disable and manage auto moderation modules',
            category: 'Config',
            metadata: {
                examples: ['{p}automod info', '{p}automod enable <module>', '{p}automod disable <module>', '{p}automod configure <module> <list | set | add | remove>'],
                extendedDescription: stripIndents`
                The automod command lets you enable, disable and manage auto moderation modules.
                Each auto moderation module has it's own function, such as the anti-hoisting module, which dehoists usernames.
                Some modules also have configuration, such as the word filter module. 
                Use \`{p}automod enable <module>\` to enable a module, \`{p}automod disable <module>\` to disable a module, and \`{p}automod info\` to view what's enabled.
                Use \`{p}automod info <module>\` to view the description of a specific module, and if it has any additional configuration requirements.
                `
            }
        })

        this.filePath = __filename
    }

    async run(ctx: CommandContext) {
        const userIsAdmin = await isAdmin(ctx.server!, ctx.author._id)
        if (!userIsAdmin) return sendError(ctx, 'Only admins can use this command')

        const params = parse(ctx.args)
        
        const server = await (servers as Collection).findOne({ id: ctx.server!._id })

        if (!ctx.args.length) return stripIndents`
        No option provided. Option must be one of the following: ${validOptions.join(', ')}
        See \`${ctx.prefix}help automod\` for more information
        `

        const option = ctx.args[0].toLowerCase()

        if (!validOptions.some(i =>  i.toLowerCase() === option)) return stripIndents`
        Invalid option. Option must be one of the following: ${validOptions.join(', ')}
        See \`${ctx.prefix}help automod\` for more information
        `

        if (option === 'info') {
            ctx.args.shift()

            if (!ctx.args.length) {
                await ctx.reply(stripIndents`
                ### Auto moderation config for ${ctx.server!.name}
                ${Object.values(automodModules).map(module => `- ${module.key}: ${server!.autoMod[module.key].enabled ? '$\\color{#00CC00}\\textsf{Enabled}$' : '$\\color{#CE3C3C}\\textsf{Disabled}$'}`).join('\n')}
                `)

                return
            }

            const name = ctx.args[0].toLowerCase()

            const module = Object.values(automodModules).find(i => i.key.toLowerCase() === name)
            if (!module) return sendError(ctx, 'No module with that name exists')

            await ctx.reply(stripIndents`
            ### ${module.key}
            **Status:** ${server!.autoMod[module.key].enabled ? '$\\color{#00CC00}\\textsf{Enabled}$' : '$\\color{#CE3C3C}\\textsf{Disabled}$'}
            **Description:** ${module.description}
            ${module.options.length ? `&nbsp;\n**Options:**\n${module.options.map(opt => `- ${opt}: ${server!.autoMod[module.key][opt.split(' ')[0]]}`).join('\n')}\n&nbsp;\nUse \`${ctx.prefix}automod configure ${module} --<option>\` to configure an option` : ''}
            `)

            return
        }

        if (option === 'enable') {
            ctx.args.shift()

            const name = ctx.args[0].toLowerCase()

            const module = Object.values(automodModules).find(i => i.key.toLowerCase() === name)
            if (!module) return sendError(ctx, 'No module with that name exists')

            if (server!.autoMod[module.key].enabled) return sendError(ctx, `${module.key} is already enabled`)

            server!.autoMod[module.key].enabled = true

            await (servers as Collection).updateOne({ id: ctx.server!._id }, { $set: {
                autoMod: server!.autoMod
            } })

            await ctx.reply(stripIndents`
            ${module.key} has been enabled
            `)

            return
        }

        if (option === 'disable') {
            ctx.args.shift()

            const name = ctx.args[0].toLowerCase()

            const module = Object.values(automodModules).find(i => i.key.toLowerCase() === name)
            if (!module) return sendError(ctx, 'No module with that name exists')

            if (!server!.autoMod[module.key].enabled) return sendError(ctx, `${module.key} is already disabled`)

            server!.autoMod[module.key].enabled = false

            await (servers as Collection).updateOne({ id: ctx.server!._id }, { $set: {
                autoMod: server!.autoMod
            } })

            await ctx.reply(stripIndents`
            ${module.key} has been disabled
            `)

            return
        }

        if (option === 'configure') {
            ctx.args.shift()

            if (!ctx.args.length) return sendError(ctx, 'No module name provided')

            const name = ctx.args[0].toLowerCase()

            const module = Object.values(automodModules).find(i => i.key.toLowerCase() === name)
            if (!module) return sendError(ctx, 'No module with that name exists')

            if (!module.options.length) return sendError(ctx, `${module.key} does not have any configurable options`)

            if (module.key === 'wordFilter') {
                ctx.args.shift()

                if (!ctx.args.length) return sendError(ctx, `No option provided. Option must be one of the following: ${validWordFilterOptions.join(', ')}`)

                const func = ctx.args[0].toLowerCase()

                if (!validWordFilterOptions.some(i =>  i.toLowerCase() === func)) return sendError(ctx, `Invalid option. Option must be one of the following: ${validWordFilterOptions.join(', ')}`)

                if (func === 'list') {
                    const words = server!.autoMod.wordFilter.words

                    if (!words.length) return sendError(ctx, 'No words have been set')

                    await ctx.reply(stripIndents`
                    ${words.length} word${words.length > 1 ? 's' : ''}:
                    ${words.join(', ')}
                    `)

                    return
                }

                if (func === 'add') {
                    const words = (params.words || '').split(',').map(tag => tag.trim()).filter(i => i !== '')
                    if (!words.length) return sendError(ctx, stripIndents`
                    No words provided to add to the word filter.
                    Valid words format: \`--words "word one, word two, word 3, ..."\`
                    `)

                    let stop

                    words.forEach(word => {
                        const index = (server!.autoMod.wordFilter.words).findIndex(i => i === word)

                        if (server!.autoMod.wordFilter.words.some(i => i === word)) {
                            stop = index
                            return
                        }
                    })

                    if (stop) return sendError(ctx, `Word #${stop + 1} already exists in the word filter list`)

                    server!.autoMod.wordFilter.words = [...words, ...server!.autoMod.wordFilter.words]

                    await (servers as Collection).updateOne({ id: ctx.server!._id }, { $set: {
                        autoMod: server!.autoMod
                    } })

                    await ctx.reply(stripIndents`
                    The following words have been added to the word filter list:
                    ${words.join(', ')}
                    `)

                    return
                }

                if (func === 'remove') {
                    const words = (params.words || []).split(',').map(tag => tag.trim()).filter(i => i !== '')
                    if (!words.length) return sendError(ctx, 'No words provided to remove from the word filter')

                    let stop

                    words.forEach(word => {
                        const index = (server!.autoMod.wordFilter.words).findIndex(i => i === word)

                        if (!server!.autoMod.wordFilter.words.some(i => i === word)) {
                            stop = index
                            return
                        }

                        server!.autoMod.wordFilter.words.splice(index, 1)
                    })

                    if (stop) return sendError(ctx, `Word #${stop + 1} does not exist in the word filter list`)

                    await (servers as Collection).updateOne({ id: ctx.server!._id }, { $set: {
                        autoMod: server!.autoMod
                    } })

                    await ctx.reply(stripIndents`
                    The following words have been removed from the word filter list:
                    ${words.join(', ')}
                    `)

                    return
                }
            }

            if (module.key === 'messageSpamFilter') {}

            if (module.key === 'emojiSpamFilter') {
                ctx.args.shift()

                if (!ctx.args.length) return sendError(ctx, `No option provided. Option must be one of the following: ${validEmojiSpamFilter.join(', ')}`)

                const func = ctx.args[0].toLowerCase()

                if (!validEmojiSpamFilter.some(i =>  i.toLowerCase() === func)) return sendError(ctx, `Invalid option. Option must be one of the following: ${validEmojiSpamFilter.join(', ')}`)

                if (func === 'emojilimit') {
                    ctx.args.shift()

                    const num = Number(ctx.args[0] || '')
                    if (isNaN(num) || num <= 0) return sendError(ctx, `Invalid new limit provided. Limit mu st be a number of 1 or higher.`)
                    if (num === Number( server!.autoMod.emojiSpamFilter.emojiLimit)) return sendError(ctx, `The emoji limit is already set to ${num}`)

                    server!.autoMod.emojiSpamFilter.emojiLimit = num

                    await (servers as Collection).updateOne({ id: ctx.server!._id }, { $set: {
                        autoMod: server!.autoMod
                    } })

                    await ctx.reply(stripIndents`
                    The emoji limit for messages has been updated to ${num}
                    `)

                    return
                }
            }
        }
    }
}