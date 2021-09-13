import { VoltareClient, CommandContext } from 'voltare'
import { GeneralCommand } from '../../util/abstracts'
import { Collection } from 'mongodb'
import { stripIndents } from 'common-tags'
import { format } from 'date-fns'
import parse from 'yargs-parser'

import { servers } from '../../util/database'
import { sendError } from '../../util/messageUtils'
import { getUser } from '../../util/fetchUtils'
import { isMod } from '../../util/permissionUtils'

const validOptions = ['<name>', 'list', 'info', 'create', 'edit', 'delete']

export default class TagCommand extends GeneralCommand {
    constructor(client: VoltareClient<any>) {
        super(client, {
            name: 'tag',
            description: 'View or manage server tags',
            category: 'Utility',
            aliases: ['tags'],
            metadata: {
                examples: ['{p}tag <name>', '{p}tag <name> --mention <user>', '{p}tag list', '{p}tag info <name>', '{p}tag create <name> <content>', '{p}tag edit <name> <content>', '{p}tag delete <name>'],
                extendedDescription: stripIndents`
                    Tags allow server moderators to save large messages or snippets of content (such as frequently asked questions) into easy to remember names, that can be sent anywhere when needed.
                    Create a tag using \`{p}tag create <name> <content>\` and use it later by using \`{p}tag <name>\`. All moderators can create, edit and delete tags. Tag usage can be restricted to moderators only or to also allow users.
                    When sending a tag, use the \`--mention <user>\` option to make the tag mention a user to get their attention.
                `
            }
        })

        this.filePath = __filename
    }

    async run(ctx: CommandContext) {
        const userIsMod = await isMod(ctx.server!, ctx.author._id)

        const params = parse(ctx.args)
        const mention = (params.mention || params.m || null)

        if (!ctx.args.length) return stripIndents`
        No option provided. Option must be one of the following: ${validOptions.join(', ')}
        See \`${ctx.prefix}help tags\` for more information
        `
        
        const option = ctx.args[0].toLowerCase()

        const server = await (servers as Collection).findOne({ id: ctx.server!._id })
        const tags = server!.tags

        if (option === 'list') {
            if (!userIsMod) return sendError(ctx, 'Only moderators can use this command')

            await ctx.reply(!tags.length ? `No tags have been created\nUse \`${ctx.prefix}tag create <name> <content>\` to create one` : `${tags.length} tag${tags.length > 1 ? 's' : ''}: ${tags.map(tag => tag.name).join(', ')}`)
            
            return
        }

        if (option === 'info') {
            if (!server!.membersCanUseTags && !userIsMod) return sendError(ctx, 'Only moderators can use tags')

            ctx.args.shift()

            const name = (ctx.args[0] || '').toLowerCase()
            if (!name) return sendError(ctx, 'No tag name provided')
            
            const tag = tags.find(i => i.name.toLowerCase() === name)
            if (!tag) return sendError(ctx, 'No tag with that name exists')

            await ctx.reply(stripIndents`
            ### ${tag.name}
            Creator: ${tag.createdBy}
            Date created: ${format(tag.createdAt, 'yyyy-MM-dd h:mm aa')}${tag.editedAt ? `\nLast edited by: ${tag.editedBy}\nLast edited at: ${format(tag.editedAt, 'yyyy-MM-dd h:mm aa')}` : ''}
            Uses: ${tag.uses}
            `)

            return
        }

        if (option === 'create') {
            if (!userIsMod) return sendError(ctx, 'Only moderators can use this command')

            ctx.args.shift()

            const name = (ctx.args[0] || '').toLowerCase()
            if (!name) return sendError(ctx, 'No tag name provided')
            if (tags.some(tag => tag.name.toLowerCase() === name)) return sendError(ctx, 'A tag with that name already exists')

            ctx.args.shift()

            const content = ctx.args.join(' ')
            if (!content) return sendError(ctx, 'No tag content provided')

            tags.push({
                name,
                content,
                createdBy: ctx.author._id,
                createdAt: new Date(),
                editedBy: null,
                editedAt: null,
                uses: 0
            })

            await (servers as Collection).updateOne({ id: ctx.server!._id }, { $set: {
                tags
            } })

            await ctx.reply(`Tag \`${name}\` created`)

            return
        }

        if (option === 'edit') {
            if (!userIsMod) return sendError(ctx, 'Only moderators can use this command')

            ctx.args.shift()

            const name = (ctx.args[0] || '').toLowerCase()
            if (!name) return sendError(ctx, 'No tag name provided')
            
            const tag = tags.find(i => i.name.toLowerCase() === name)
            if (!tag) return sendError(ctx, 'No tag with that name exists')

            ctx.args.shift()

            const content = ctx.args.join(' ')
            if (!content) return sendError(ctx, 'No new tag content provided')

            const index = tags.findIndex(i => i.name === name)
            if (index === -1) return sendError(ctx, 'Failed to find tag index')

            tags[index].content = content
            tags[index].editedBy = ctx.author._id
            tags[index].editedAt = new Date()

            await (servers as Collection).updateOne({ id: ctx.server!._id }, { $set: {
                tags
            } })

            await ctx.reply(`Tag \`${name}\` edited`)

            return
        }

        if (option === 'delete') {
            if (!userIsMod) return sendError(ctx, 'Only moderators can use this command')

            ctx.args.shift()
            
            const name = (ctx.args[0] || '').toLowerCase()
            if (!name) return sendError(ctx, 'No tag name provided')
            
            const tag = tags.find(i => i.name.toLowerCase() === name)
            if (!tag) return sendError(ctx, 'No tag with that name exists')

            const index = tags.findIndex(i => i.name === name)
            if (index === -1) return sendError(ctx, 'Failed to find tag index')

            tags.splice(index, 1)

            await (servers as Collection).updateOne({ id: ctx.server!._id }, { $set: {
                tags
            } })

            await ctx.reply(`Tag \`${name}\` deleted`)

            return
        }

        if (!server!.membersCanUseTags && !userIsMod) return sendError(ctx, 'Only moderators can use tags')
        
        const tag = tags.find(i => i.name.toLowerCase() === option)
        if (!tag) return sendError(ctx, 'No tag with that name exists')

        let user = await getUser(ctx.client.bot, mention)

        await ctx.send(`${user ? `<@${user._id}>\n` : ''}${tag.content}`)

        const index = tags.findIndex(i => i.name === option)
        if (index === -1) return sendError(ctx, 'Failed to update tag uses')

        if (tag.uses === 0) tags[index].uses = 1
        else tags[index].uses++

        await (servers as Collection).updateOne({ id: ctx.server!._id }, { $set: {
            tags
        } })

        return
    }
}