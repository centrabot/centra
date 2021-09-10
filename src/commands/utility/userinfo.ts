import { VoltareClient, VoltareCommand, CommandContext } from 'voltare'
import { stripIndents } from 'common-tags'
import { format } from 'date-fns'
import { decodeTime } from 'ulid'

import { getUser } from '../../util/userUtils'
import { sendError } from '../../util/messageUtils'

export default class UserinfoCommand extends VoltareCommand {
    constructor(client: VoltareClient<any>) {
        super(client, {
            name: 'userinfo',
            description: 'View user information',
            category: 'Utility',
            aliases: ['user', 'uinfo', 'ui'],
            metadata: {
                examples: ['{p}userinfo', '{p}userinfo [user]']
            }
        })

        this.filePath = __filename
    }

    async run(ctx: CommandContext) {
        let user

        if (!ctx.args.length) user = ctx.author
        else user = await getUser(ctx.client.bot, ctx.args[0])
        if (!user) return sendError(ctx, 'Failed to fetch user')

        await ctx.reply(stripIndents``)

        return
    }
}