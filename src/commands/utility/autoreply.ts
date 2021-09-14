import { VoltareClient, CommandContext } from 'voltare'
import { GeneralCommand } from '../../util/abstracts'
import { Collection } from 'mongodb'
import { stripIndents } from 'common-tags'
import { format } from 'date-fns'
import parse from 'yargs-parser'

import { servers } from '../../util/database'
import { sendError } from '../../util/messageUtils'
import { isMod } from '../../util/permissionUtils'

const validOptions = ['<name>', 'list', 'info', 'create', 'edit', 'delete']

export default class AutoreplyCommand extends GeneralCommand {
    constructor(client: VoltareClient<any>) {
        super(client, {
            name: 'autoreply',
            description: 'View or manage auto responses and their keyboards',
            category: 'Utility',
            aliases: ['autoresponse', 'ar'],
            metadata: {
                examples: ['{p}autoreply list', '{p}autoreply info <name>', '{p}autoreply create <name> --content <content> --keywords "keyword 1, keyword 2, ..."', '{p}autoreply edit <name> --content [content] --addkeyword <keyword> --removekeyword <keyword>', '{p}autoreply delete <name>'],
                extendedDescription: stripIndents`
                    Auto responses are snippets of text or content, just like tags, however instead of being manually triggered, they are triggered by set keywords in a message.
                    Use \`{p}autoreply create <name> <content> --keywords "keyword 1, keyword 2, ..."\` to create an auto response, and \`{p}autoreply delete <name>\` to delete an auto response.
                    Use \`{p}autoreply edit <name>\` to edit an auto response, with one of the following to edit the content, or add/remove keywords: \`--content [content]\` \`--addkeyword <keyword>\` \`--removekeyword <keyword>\`
                    Use \`{p}autoreply list\` to view all auto responses, and \`{p}autoreply info <name>\` to view information on a specific auto response.
                `
            }
        })

        this.filePath = __filename
    }

    async run(ctx: CommandContext) {
        const userIsMod = await isMod(ctx.server!, ctx.author._id)
        if (!userIsMod) return sendError(ctx, 'Only moderators can use this command')
        
        const params = parse(ctx.args)
        const nameParam = (params.name || params.k || null)
        const contentParam = (params.content || params.c || null)
        const keywordsParam = (params.keywords || params.k || '').split(',').map(tag => tag.trim()).filter(i => i !== '')
        const addKeywordsParam = (params.addkeywords || params.ak || '').split(',').map(tag => tag.trim()).filter(i => i !== '')
        const removeKeywordsParam = (params.removekeywords || params.rk || '').split(',').map(tag => tag.trim()).filter(i => i !== '')

        if (!ctx.args.length) return stripIndents`
        No option provided. Option must be one of the following: ${validOptions.join(', ')}
        See \`${ctx.prefix}help autoreply\` for more information
        `
        
        const option = ctx.args[0].toLowerCase()

        const server = await (servers as Collection).findOne({ id: ctx.server!._id })
        const autoreplies = server!.autoreplies

        if (option === 'list') {
            await ctx.reply(!autoreplies.length ? `No auto responses have been created\nUse \`${ctx.prefix}autoreply create <name> <content> --keywords "keyword 1, keyword 2, ..."\` to create one` : `${autoreplies.length} auto response${autoreplies.length > 1 ? 's' : ''}: ${autoreplies.map(ar => ar.name).join(', ')}`)
            
            return
        }

        if (option === 'info') {
            ctx.args.shift()

            const name = (ctx.args[0] || '').toLowerCase()
            if (!name) return sendError(ctx, 'No auto response name provided')
            
            const ar = autoreplies.find(i => i.name.toLowerCase() === name)
            if (!ar) return sendError(ctx, 'No auto response with that name exists')

            await ctx.reply(stripIndents`
            ### ${ar.name}
            Keywords: ${ar.keywords.join(', ')}
            Creator: ${ar.createdBy}
            Date created: ${format(ar.createdAt, 'yyyy-MM-dd h:mm aa')}${ar.editedAt ? `\nLast edited by: ${ar.editedBy}\nLast edited at: ${format(ar.editedAt, 'yyyy-MM-dd h:mm aa')}` : ''}
            Triggers: ${ar.triggers}
            `)

            return
        }

        if (option === 'create') {
            ctx.args.shift()

            const name = (ctx.args[0] || '').toLowerCase()
            if (!name) return sendError(ctx, 'No auto response name provided')
            if (autoreplies.some(tag => tag.name.toLowerCase() === name)) return sendError(ctx, 'An auto response with that name already exists')

            const content = contentParam
            if (!content || content === '') return sendError(ctx, 'No auto response content provided')

            if (!keywordsParam.length) return sendError(ctx, 'No auto response keywords provided')

            const isUsed = keywordsParam.find(keyword => autoreplies.find(ar => ar.keywords.includes(keyword)))
            if (isUsed) return sendError(ctx, `The keyword \`${isUsed}\` is already in use by another auto response`)

            autoreplies.push({
                name,
                content,
                keywords: keywordsParam,
                createdBy: ctx.author._id,
                createdAt: new Date(),
                editedBy: null,
                editedAt: null,
                triggers: 0
            })

            await (servers as Collection).updateOne({ id: ctx.server!._id }, { $set: {
                autoreplies
            } })

            await ctx.reply(`Auto response \`${name}\` created`)

            return
        }

        if (option === 'edit') {
            ctx.args.shift()

            const name = (ctx.args[0] || '').toLowerCase()
            if (!name) return sendError(ctx, 'No auto response name provided')
            
            const ar = autoreplies.find(i => i.name.toLowerCase() === name)
            if (!ar) return sendError(ctx, 'No auto response with that name exists')

            const index = autoreplies.findIndex(i => i.name === name)
            if (index === -1) return sendError(ctx, 'Failed to find auto response index')

            const atLeastOne = (nameParam !== '' || contentParam !== '' || addKeywordsParam.length > 0 || removeKeywordsParam.length > 0)
            if (!atLeastOne) return sendError(ctx, stripIndents`
            At least one or more of the following options must be provided to edit the auto response:
            - \`--name <name>\`
            - \`--content <content>\`
            - \`--addkeywords "keyword 1, keyword 2, ..."\`
            - \`--removekeywords "keyword 1, keyword 2, ..."\`
            `)

            let changed: any[] = []

            if (nameParam) {
                const newName = nameParam.toLowerCase()

                const existing = autoreplies.find(i => i.name.toLowerCase() === newName)
                if (existing) return sendError(ctx, 'An auto response with that name already exists')
                
                changed.push({ key: 'name', old: ar.name, new: newName })

                ar.name = newName
            }

            if (contentParam) {
                changed.push({ key: 'name', old: ar.content, new: contentParam })

                ar.content = contentParam
            }

            if (addKeywordsParam.length > 0) {
                const isUsed = addKeywordsParam.find(keyword => autoreplies.find(ar => ar.keywords.includes(keyword)))
                if (isUsed) return sendError(ctx, `The keyword \`${isUsed}\` is already in use by another auto response`)

                const isUsedAR = addKeywordsParam.find(keyword => autoreplies.find(ar => ar.keywords.includes(keyword)))
                if (isUsedAR) return sendError(ctx, `The keyword \`${isUsedAR}\` already exists on the auto response`)

                const added = await Promise.all(addKeywordsParam.map(async keyword => {
                    ar.keywords.push(keyword)

                    return keyword
                }))

                changed.push({ key: 'addedKeywords', value: added })
            }

            if (removeKeywordsParam.length > 0) {
                const exists = removeKeywordsParam.some(keyword => ar.keywords.includes(keyword))
                if (!exists) return sendError(ctx, `One or more provided keywords to remove do not exist on the auto response`)

                if (!ar.keywords) ar.keywords = ar.keywords

                const removed = await Promise.all(removeKeywordsParam.map(async keyword => {
                    const keywordIndex = ar.keywords.findIndex(i => i === keyword)
                    if (keywordIndex === -1) return sendError(ctx, `Failed to find keyword index of \`${keyword}\``)
        
                    ar.keywords.splice(keywordIndex, 1)

                    return keyword
                }))

                changed.push({ key: 'removedKeywords', value: removed })
            }

            autoreplies[index] = ar

            await (servers as Collection).updateOne({ id: ctx.server!._id }, { $set: {
                autoreplies
            } })

            await ctx.reply(stripIndents`
            The following values of the auto response have been edited:
            ${changed.map(i => `- ${i.key}: ${i.value ? i.value.join(', ') : `\`${i.old}\` -> \`${i.new}\``}`).join('\n')}
            `)
        }

        if (option === 'delete') {
            ctx.args.shift()

            const name = (ctx.args[0] || '').toLowerCase()
            if (!name) return sendError(ctx, 'No auto response name provided')
            
            const ar = autoreplies.find(i => i.name.toLowerCase() === name)
            if (!ar) return sendError(ctx, 'No auto response with that name exists')

            const index = autoreplies.findIndex(i => i.name === name)
            if (index === -1) return sendError(ctx, 'Failed to find auto response index')

            autoreplies.splice(index, 1)

            await (servers as Collection).updateOne({ id: ctx.server!._id }, { $set: {
                autoreplies
            } })

            await ctx.reply(`Auto response \`${name}\` deleted`)

            return
        }
    }
}