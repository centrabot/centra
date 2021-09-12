import { VoltareClient, VoltareCommand, CommandContext } from 'voltare'
import { User } from 'revolt.js/dist/maps/Users'
import { Collection } from 'mongodb'
import { stripIndents } from 'common-tags'
import { nanoid } from 'nanoid'
import parse from 'yargs-parser'

import { servers } from '../../util/database'
import { getUser } from '../../util/fetchUtils'
import { sendError, paginate } from '../../util/messageUtils'

export default class NotesCommand extends VoltareCommand {
    constructor(client: VoltareClient<any>) {
        super(client, {
            name: 'notes',
            description: 'View shared moderator notes on a member',
            category: 'Utility',
            aliases: [],
            metadata: {
                examples: ['{p}notes', '{p}notes [user]', '{p}notes [user] --page 2', '{p}notes [user] --add <note>', '{p}notes [user] --remove <note>'],
                extendedDescription: stripIndents`
                    Moderator notes is a shared collection of notes created on a user, that can only be read by moderators.
                    Notes act as a list of sorts. Each user has their own notes, and moderators can add or remove small notes to the user.
                `
            }
        })

        this.filePath = __filename
    }

    async run(ctx: CommandContext) {
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

            await ctx.reply(stripIndents`
            Note added to ${user.username}
            `)

            return
        }

        if (remove) {


            return
        }

        if (!note.notes.length) return sendError(ctx, 'This user has no notes')

        const pages = paginate(note.notes, 10)

        if (page < pages.length) return sendError(ctx, `Invalid page number. Valid range is: 1 - ${pages.length}`)

        let i = 0;

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

    onError(err: any, ctx: CommandContext) {
        const id = nanoid(13)
        
        console.error(err)

        return ctx.reply(stripIndents`
        An error occurred running this command
        If the error continues to occur, please report it using \`${ctx.prefix}report --id ${id}\`
        &nbsp;
        Error ID: \`${id}\`
        Error: \`${err.toString()}\`
        `)
    }
}