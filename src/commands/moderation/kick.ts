import { VoltareClient, VoltareCommand, CommandContext } from 'voltare'
import { Collection } from 'mongodb'
import { stripIndents } from 'common-tags'
import { nanoid } from 'nanoid'
import parse from 'yargs-parser'

import { servers } from '../../util/database'
import { getUser } from '../../util/fetchUtils'
import { sendError } from '../../util/messageUtils'

export default class KickCommand extends VoltareCommand {
    constructor(client: VoltareClient<any>) {
        super(client, {
            name: 'kick',
            description: 'Kick a member',
            category: 'Moderation',
            metadata: {
                examples: ['{p}kick <user> --reason <reason>']
            }
        })

        this.filePath = __filename
    }

    async run(ctx: CommandContext) {
        const params = parse(ctx.args)
        const reason = (params.reason || params.r || null)

        if (!params._.length) return sendError(ctx, `No user provided`)

        const user = await getUser(ctx.client.bot, params._[0])
        if (!user) return sendError(ctx, `Failed to fetch user`)
        if (user._id === ctx.author._id) return sendError(ctx, 'You cannot kick yourself')

        if (!reason) return sendError(ctx, 'A reason is required to kick a member')

        const member = await ctx.server!.fetchMember(user._id)
        if (!member) return sendError(ctx, 'Failed to fetch member')

        const server = await (servers as Collection).findOne({ id: ctx.server!._id })
        const punishments = server!.punishments

        try {
            await member.kick()
        } catch(err) {
            return sendError(ctx, stripIndents`
            Failed to kick member. This could be due to one of the following reasons:
            - The member you tried to kick was the owner
            - The bot does not have the required permission to kick members
            `)
        }

        const id = nanoid(10)

        if (!user.bot) {
            punishments.push({
                id,
                userID: user._id,
                moderatorID: ctx.author._id,
                type: 'kick',
                createdAt: new Date(),
                reason
            })
    
            await (servers as Collection).updateOne({ id: ctx.server!._id }, { $set: {
                punishments
            } })
        }

        await ctx.reply(stripIndents`
        Kicked ${user.username}:
        > ${reason}
        `)

        const modLogs = (server!.modLogsChannel || server!.modlogschannel || null)
        if (!modLogs) return
        else {
            const modLogsChannel = await ctx.client.bot.channels.fetch(modLogs)
            if (!modLogsChannel) return

            await modLogsChannel.sendMessage(stripIndents`
            > \`${id}\` - $\\color{#F39F00}\\textsf{User kicked}$
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