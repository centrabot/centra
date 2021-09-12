import { VoltareClient, CommandContext } from 'voltare'
import { GeneralCommand } from '../../util/abstracts'
import { User } from 'revolt.js/dist/maps/Users'
import { Collection } from 'mongodb'
import { stripIndents } from 'common-tags'
import parse from 'yargs-parser'

import { servers } from '../../util/database'
import { getUser } from '../../util/fetchUtils'
import { sendError, paginate } from '../../util/messageUtils'
import { isMod } from '../../util/permissionUtils'

export default class NotesCommand extends GeneralCommand {
    constructor(client: VoltareClient<any>) {
        super(client, {
            name: 'notes',
            description: 'View shared moderator notes on a member',
            category: 'Utility',
            aliases: [],
            metadata: {
                examples: ['{p}notes', '{p}notes [user]', '{p}notes [user] --page 2', '{p}notes [user] --add <note>', '{p}notes [user] --remove <number>'],
                extendedDescription: stripIndents`
                    Moderator notes is a shared collection of notes created on a user, that can only be read by moderators.
                    Notes act as a list of sorts. Each user has their own notes, and moderators can add or remove small notes to the user.
                    Use \`{p}notes [user] --add <note>\` to add a note, and \`{p}notes [user] --remove <number | all>\` to remove a specific note or all notes.
                    You can view or manage your own notes by not providing a user.
                `
            }
        })

        this.filePath = __filename
    }

    async run(ctx: CommandContext) {
        const userIsMod = await isMod(ctx.server!, ctx.author._id)
        if (!userIsMod) return sendError(ctx, 'Only moderators can use this command')

        const params = parse(ctx.args)
        const page = (params.page || params.p || 1)
        const add = (params.add || params.a || null)
        const remove = (params.remove || params.rem || params.r || null)

        let user: User

        if (!params._.length) user = ctx.author;
        else user = await getUser(ctx.client.bot, params._[0]) as User
        if (!user) return sendError(ctx, 'Failed to fetch user')

        const server = await (servers as Collection).findOne({ id: ctx.server!._id })

        let note = server!.notes.find(note => note.user === user._id)

        if (!note) {
            note = {
                user: user._id,
                notes: []
            }

            server!.notes.push(note)

            await (servers as Collection).updateOne({ id: ctx.server!._id }, { $set: {
                notes: server!.notes
            } })
        }

        if (add) {
            note.notes.push({
                content: add,
                createdBy: ctx.author._id
            })

            const index = server!.notes.findIndex(i => i.user === user._id)
            if (index === -1) return sendError(ctx, 'Failed to find note index')
            server!.notes[index] = note

            await (servers as Collection).updateOne({ id: ctx.server!._id }, { $set: {
                notes: server!.notes
            } })

            await ctx.reply(stripIndents`
            Note added to ${user.username}
            `)

            return
        }

        if (remove) {
            if (remove === 'all') {
                note.notes = []

                const index = server!.notes.findIndex(i => i.user === user._id)
                if (index === -1) return sendError(ctx, 'Failed to find note index')
                server!.notes[index] = note

                await (servers as Collection).updateOne({ id: ctx.server!._id }, { $set: {
                    notes: server!.notes
                } })
    
                await ctx.reply(stripIndents`
                All notes removed from ${user.username}
                `)
    
                return
            }

            if (isNaN(remove)) return sendError(ctx, `Invalid note number provided. Provide a note\'s # number from \`${ctx.prefix}notes [user]\` to remove it.`)
            if (!note.notes[Number(remove - 1)]) return sendError(ctx, `Invalid note number provided. Provide a note\'s # number from \`${ctx.prefix}notes [user]\` to remove it.`)

            note.notes.splice(Number(remove - 1), 1)
            
            const index = server!.notes.findIndex(i => i.user === user._id)
            if (index === -1) return sendError(ctx, 'Failed to find note index')
            server!.notes[index] = note

            await (servers as Collection).updateOne({ id: ctx.server!._id }, { $set: {
                notes: server!.notes
            } })

            await ctx.reply(stripIndents`
            Note #${remove} removed from ${user.username}
            `)

            return
        }

        if (!note.notes.length) return sendError(ctx, 'This user has no notes')

        const pages = paginate(note.notes, 10)

        if (page < 1 || page > pages.length) return sendError(ctx, `Invalid page number. Valid range is: 1 - ${pages.length}`)

        let i = 0;
        if (page > 1) {
            let num = 10 * Number(page - 1)
            i += num
        }

        const content = await Promise.all(pages[page - 1].map(async n => {
            const user = await ctx.client.bot.users.fetch(n.createdBy)

            i++

            return `> | ${i} | ${user.username} | ${n.content} |`
        }))

        await ctx.reply(stripIndents`
        ### Notes for ${user.username} in ${ctx.server!.name}
        Showing page ${page} of ${pages.length} (${note.notes.length} note${note.notes.length > 1 ? 's' : ''} total)
        &nbsp;
        > | # | Moderator | Note |
        > |---|---|---|
        ${content.join('\n')}
        &nbsp;
        To change pages, provide \`--page <page>\` or \`-p <p>\`
        `)

        return
    }
}