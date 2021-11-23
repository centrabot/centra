import { VoltareClient, CommandContext } from 'voltare'
import { GeneralCommand } from '../../util/abstracts'
import { Collection } from 'mongodb'
import { stripIndents } from 'common-tags'
import { nanoid } from 'nanoid'
import { format } from 'date-fns'
import parse from 'yargs-parser'
import ms from 'ms'

import { reminders } from '../../util/database'
import { sendError, paginate } from '../../util/messageUtils'

const validOptions = ['set', 'list', 'cancel']

export default class ReminderCommand extends GeneralCommand {
    constructor(client: VoltareClient<any>) {
        super(client, {
            name: 'reminder',
            description: 'Set or manage personal reminders',
            category: 'Utility',
            aliases: ['reminders', 'rem'],
            metadata: {
                examples: ['{p}reminder set <content> --in <time>', '{p}reminder list', '{p}reminder cancel <reminder>'],
                extendedDescription: stripIndents`
                Reminders are a way to set timed messages, to remind you of a variety of tasks or other content.
                Use \`{p}reminder set <content> --in <time>\` to create a reminder, \`{p}reminder list\` to view all your set reminders, and \`{p}reminder cancel <reminder>\` to cancel a set reminder.
                Due to bots being unable to directly message users right now, reminders are per-server, and will be sent in the server. This may change.
                `
            }
        })

        this.filePath = __filename
    }

    async run(ctx: CommandContext) {
        const params = parse(ctx.args)
        const time = (params.in || params.i || null)
        const page = (params.page || params.p || 1)

        if (!ctx.args.length) return stripIndents`
        No option provided. Option must be one of the following: ${validOptions.join(', ')}
        `

        const option = ctx.args[0].toLowerCase()

        if (!validOptions.some(i =>  i.toLowerCase() === option)) return stripIndents`
        Invalid option. Option must be one of the following: ${validOptions.join(', ')}
        `

        if (option === 'list') {
            const rems = await (reminders as Collection).find({ userID: ctx.author._id }).toArray()

            if (!rems.length) return sendError(ctx, `You have no reminders set. Use \`${ctx.prefix}reminder set <content> --in <time>\` to set a reminder.`)

            const pages = paginate(rems, 10)

            if (page < pages.length) return sendError(ctx, `Invalid page number. Valid range is: 1 - ${pages.length}`)
    
            const content = await Promise.all(pages[page - 1].map(async reminder => {
                const setAt = format(reminder.createdAt, 'yyyy-MM-dd h:mm aa')
                const timeLeft = Number(Number(reminder.createdAt.getTime() + reminder.duration) - new Date().getTime())

                return `> | \`${reminder.id}\` | <#${reminder.channelID}> | ${reminder.content} | ${ms(reminder.duration, { long: true })} | ${setAt} | ${ms(timeLeft, { long: true })} |`
            }))

            await ctx.reply(stripIndents`
            ### Reminders for ${ctx.author.username} in ${ctx.server!.name}
            Showing page ${page} of ${pages.length} (${rems.length} reminder${rems.length > 1 ? 's' : ''} total)
            &nbsp;
            > | ID | Channel | Content | Duration | Set at | Time left |
            > |---|---|---|---|---|---|
            ${content.join('\n')}
            &nbsp;
            To change pages, provide \`--page <page>\` or \`-p <p>\`
            `)

            return
        }

        if (option === 'set') {
            ctx.args.shift()
            params._.shift()

            const content = params._.join(' ')
            if (!content) return sendError(ctx, 'Reminder content is required')

            if (!time) return sendError(ctx, 'Reminder duration is required')

            const duration = ms(time) as any
            if (!duration || isNaN(duration)) return sendError(ctx, 'Failed to parse reminder duration into time value')

            const id = nanoid()

            await (reminders as Collection).insertOne({
                id,
                userID: ctx.author._id,
                serverID: ctx.server!._id,
                channelID: ctx.channel._id,
                createdAt: new Date(),
                duration,
                content
            })

            await ctx.reply(stripIndents`
            Reminder set for ${ms(duration, { long: true })} away:
            ${content}
            `)

            return
        }

        if (option === 'cancel') {
            ctx.args.shift()

            const id = ctx.args[0]
            if (!id) return sendError(ctx, 'No reminder ID provided')

            const reminder = await (reminders as Collection).findOne({ id })
            if (!reminder) return sendError(ctx, 'No reminder with that ID exists')

            await (reminders as Collection).deleteOne({ id })

            await ctx.reply(stripIndents`
            Cancelled reminder with ID \`${id}\`
            `)

            return
        }

        return
    }
}