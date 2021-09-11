import { VoltareClient, VoltareCommand, CommandContext } from 'voltare'
import { Collection } from 'mongodb'
import { stripIndents } from 'common-tags'
import { nanoid } from 'nanoid'
import parse from 'yargs-parser'

import { servers } from '../../util/database'
import { sendError } from '../../util/messageUtils'

export default class PardonCommand extends VoltareCommand {
    constructor(client: VoltareClient<any>) {
        super(client, {
            name: 'pardon',
            description: 'Pardon a prior warning given to a member',
            category: 'Moderation',
            metadata: {
                examples: ['{p}pardon <id> --reason <reason>']
            }
        })

        this.filePath = __filename
    }

    async run(ctx: CommandContext) {
        const params = parse(ctx.args)
        const reason = (params.reason || params.r || null)

        if (!params._.length) return sendError(ctx, `No warning ID provided`)

        const server = await (servers as Collection).findOne({ id: ctx.server!._id })
        const punishments = server!.punishments

        const warning = punishments.find(i => i.id === params._[0])
        if (!warning) return sendError(ctx, 'No warning with that ID exists')

        const user = await ctx.client.bot.users.fetch(warning.userID)
        if (!user) return sendError(ctx, 'Failed to fetch user accociated with warning')

        if (!reason) return sendError(ctx, 'A reason is required to pardon a warning')

        const index = punishments.findIndex(i => i.id === params._[0])
        if (index === -1) return sendError(ctx, 'Failed to find warning index')

        const id = nanoid(10)

        punishments.push({
            id,
            userID: warning.userID,
            moderatorID: ctx.author._id,
            type: 'pardon',
            createdAt: new Date(),
            reason
        })

        punishments[index].status = `pardoned (${id})`

        await (servers as Collection).updateOne({ id: ctx.server!._id }, { $set: {
            punishments
        } })

        await ctx.reply(stripIndents`
        Warning with ID \`${warning.id}\` for ${user.username} pardoned:
        > ${reason}
        `)

        const modLogs = (server!.modLogsChannel || server!.modlogschannel || null)
        if (!modLogs) return
        else {
            const modLogsChannel = await ctx.client.bot.channels.fetch(modLogs)
            if (!modLogsChannel) return

            await modLogsChannel.sendMessage(stripIndents`
            > \`${id}\` - $\\color{#1D6CBF}\\textsf{Warning pardoned}$
            > **User:** ${user.username}
            > **Moderator:** ${ctx.author.username}
            > **Original warning:** ${warning.reason}
            > &nbsp;
            > **Reason:**
            > ${reason}
            `)

            return
        }
    }
}