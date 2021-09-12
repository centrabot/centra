import { VoltareClient, CommandContext } from 'voltare'
import { GeneralCommand } from '../../util/abstracts'
import { Collection } from 'mongodb'
import { stripIndents } from 'common-tags'
import { format } from 'date-fns'
import parse from 'yargs-parser'

import { servers } from '../../util/database'
import { getUser } from '../../util/fetchUtils'
import { sendError, paginate } from '../../util/messageUtils'
import { isMod } from '../../util/permissionUtils'

const validSorting = ['newest', 'oldest']

export default class PunishmentsCommand extends GeneralCommand {
    constructor(client: VoltareClient<any>) {
        super(client, {
            name: 'punishments',
            description: 'View a member\'s punishment history for the server',
            category: 'Moderation',
            aliases: ['history'],
            metadata: {
                examples: ['{p}punishments', '{p}punishments [user]', '{p}punishments [user] --page 2', '{p}punishments [user] --sort oldest'],
                extendedDescription: stripIndents`
                View the punishment history for yourself or another member in the server.
                Punishment history is paginated with 10 entries per page. Use --page or -p to change the page number.
                You can also choose the sorting method by using --sort or -s, which defaults to newest punishments first.
                Use the punishment IDs found here to update the reasons or pardon warnings.
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
        const sorting = (params.sort || params.s || 'newest')

        const server = await (servers as Collection).findOne({ id: ctx.server!._id })
        const punishments = server!.punishments

        if (!validSorting.some(i => i === sorting)) return sendError(ctx, `Invalid sorting type. Must be one of the following: ${validSorting.join(', ')}`)
        
        if (!params._.length) {
            let history = punishments.filter(i => i.userID === ctx.author._id)
            if (!history.length) return sendError(ctx, 'You do not have any punishments in this server')

            if (sorting === 'newest') history = history.sort((a, b) => b.date - a.date)
            if (sorting === 'oldest') history = history.sort((a, b) => a.date - b.date)

            const pages = paginate(history, 10)

            if (page < pages.length) return sendError(ctx, `Invalid page number. Valid range is: 1 - ${pages.length}`)

            const content = await Promise.all(pages[page - 1].map(async punishment => {
                const moderator = await ctx.client.bot.users.fetch(punishment.moderatorID)
                return `> | \`${punishment.id}\` | ${format(punishment.createdAt, 'yyyy-MM-dd h:mm aa')} | ${punishment.type} | ${moderator.username || '*Unavailable*'} | ${punishment.reason || '*No reason set*'} | ${punishment.duration || 'n/a'} | ${punishment.status || 'n/a'} |`
            }))

            await ctx.reply(stripIndents`
            ### Punishments for ${ctx.author.username} in ${ctx.server!.name}
            Showing page ${page} of ${pages.length} (${history.length} punishment${history.length > 1 ? 's' : ''} total)
            Showing ${sorting} punishments first
            &nbsp;
            > | ID | Date | Type | Moderator | Reason | Duration | Status
            > |---|---|---|---|---|---|---|
            ${content.join('\n')}
            &nbsp;
            To change pages, provide \`--page <page>\` or \`-p <p>\`
            To change sorting, provide \`--sort <newest | oldest>\` or \`-s <newest | oldest>\`
            `)

            return
        }

        const user = await getUser(ctx.client.bot, params._[0])
        if (!user) return sendError(ctx, `Failed to fetch user`)
        if (user.bot) return sendError(ctx, 'Bots do not have punishment history')

        let history = punishments.filter(i => i.userID === user._id)
        if (!history.length) return sendError(ctx, `${user.username} does not have any punishments in this server`)

        if (sorting === 'newest') history = history.sort((a, b) => b.date - a.date)
        if (sorting === 'oldest') history = history.sort((a, b) => a.date - b.date)

        const pages = paginate(history, 10)

        if (page < pages.length) return sendError(ctx, `Invalid page number. Valid range is: 1 - ${pages.length}`)

        const content = await Promise.all(pages[page - 1].map(async punishment => {
            const moderator = await ctx.client.bot.users.fetch(punishment.moderatorID)
            return `> | \`${punishment.id}\` | ${format(punishment.createdAt, 'yyyy-MM-dd h:mm aa')} | ${punishment.type} | ${moderator.username || '*Unavailable*'} | ${punishment.reason || '*No reason set*'} | ${punishment.duration || 'n/a'} | ${punishment.status || 'n/a'} |`
        }))

        await ctx.reply(stripIndents`
        ### Punishments for ${user.username} in ${ctx.server!.name}
        Showing page ${page} of ${pages.length} (${history.length} punishment${history.length > 1 ? 's' : ''} total)
        Showing ${sorting} punishments first
        &nbsp;
        > | ID | Date | Type | Moderator | Reason | Duration | Status
        > |---|---|---|---|---|---|---|
        ${content.join('\n')}
        &nbsp;
        To change pages, provide \`-p <page>\` or \`--page <p>\`
        To change sorting, provide \`--sort <newest | oldest>\` or \`-s <newest | oldest>\`
        `)

        return
    }
}