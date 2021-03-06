import { VoltareClient, CommandContext } from 'voltare'
import { GeneralCommand } from '../../util/abstracts'
import { Collection } from 'mongodb'
import { stripIndents } from 'common-tags'
import { nanoid } from 'nanoid'
import parse from 'yargs-parser'

import { servers } from '../../util/database'
import { getUser } from '../../util/fetchUtils'
import { sendError } from '../../util/messageUtils'
import { isMod } from '../../util/permissionUtils'

export default class WarnCommand extends GeneralCommand {
    constructor(client: VoltareClient<any>) {
        super(client, {
            name: 'warn',
            description: 'Issue a warning to a member',
            category: 'Moderation',
            metadata: {
                examples: ['{p}warn <user> --reason <reason>']
            }
        })

        this.filePath = __filename
    }

    async run(ctx: CommandContext) {
        const userIsMod = await isMod(ctx.server!, ctx.author._id)
        if (!userIsMod) return sendError(ctx, 'Only moderators can use this command')
        
        const params = parse(ctx.args)
        const reason = (params.reason || params.r || null)

        if (!params._.length) return sendError(ctx, `No user provided`)

        const user = await getUser(ctx.client.bot, params._[0])
        if (!user) return sendError(ctx, `Failed to fetch user`)
        if (user._id === ctx.author._id) return sendError(ctx, 'You cannot issue a warning to yourself')
        if (user.bot) return sendError(ctx, 'You cannot issue a warning to a bot')

        if (!reason) return sendError(ctx, `A reason is required to issue a warning`)

        const server = await (servers as Collection).findOne({ id: ctx.server!._id })
        const punishments = server!.punishments

        const id = nanoid(10)

        punishments.push({
            id,
            userID: user._id,
            moderatorID: ctx.author._id,
            type: 'warning',
            createdAt: new Date(),
            reason
        })

        await (servers as Collection).updateOne({ id: ctx.server!._id }, { $set: {
            punishments
        } })

        await ctx.reply(stripIndents`
        Warning with ID \`${id}\` issued to ${user.username}:
        > ${reason}
        `)

        const modLogs = (server!.modLogsChannel || server!.modlogschannel || null)
        if (!modLogs) return
        else {
            const modLogsChannel = await ctx.client.bot.channels.fetch(modLogs)
            if (!modLogsChannel) return

            await modLogsChannel.sendMessage(stripIndents`
            > \`${id}\` - $\\color{#F39F00}\\textsf{Warning issued}$
            > **User:** ${user.username}
            > **Moderator:** ${ctx.author.username}
            > &nbsp;
            > **Reason:**
            > ${reason}
            `)

            return
        }
    }
}