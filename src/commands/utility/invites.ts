import { VoltareClient, CommandContext } from 'voltare'
import { GeneralCommand } from '../../util/abstracts'
import { stripIndents } from 'common-tags'
import parse from 'yargs-parser'

import { sendError, paginate } from '../../util/messageUtils'

export default class InvitesCommand extends GeneralCommand {
    constructor(client: VoltareClient<any>) {
        super(client, {
            name: 'invites',
            description: 'View server invites',
            category: 'Utility',
            aliases: ['invs'],
            metadata: {
                examples: ['{p}invites']
            }
        })

        this.filePath = __filename
    }

    async run(ctx: CommandContext) {
        const params = parse(ctx.args)
        const page = (params.page || params.p || 1)

        const server = ctx.server!
        const invites = await server.fetchInvites()

        const pages = paginate(invites, 10)

        if (page < pages.length) return sendError(ctx, `Invalid page number. Valid range is: 1 - ${pages.length}`)

        const content = await Promise.all(pages[page - 1].map(async invite => {
            const user = await ctx.client.bot.users.fetch(invite.creator)

            return `> | \`${invite._id}\` | ${user.username} | <#${invite.channel}> |`
        }))

        await ctx.reply(stripIndents`
        ### Invites for ${server.name}
        Showing page ${page} of ${pages.length} (${invites.length} invite${invites.length > 1 ? 's' : ''} total)
        &nbsp;
        > | Code | Creator | Channel |
        > |---|---|---|
        ${content.join('\n')}
        &nbsp;
        To change pages, provide \`--page <page>\` or \`-p <p>\`
        `)

        return
    }
}