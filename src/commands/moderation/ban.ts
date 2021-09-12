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

export default class BanCommand extends GeneralCommand {
    constructor(client: VoltareClient<any>) {
        super(client, {
            name: 'ban',
            description: 'Ban a member',
            category: 'Moderation',
            metadata: {
                examples: ['{p}ban <user> --ban <reason>']
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
        if (user._id === ctx.author._id) return sendError(ctx, 'You cannot ban yourself')

        if (!reason) return sendError(ctx, 'A reason is required to ban a member')

        const member = await ctx.server!.fetchMember(user._id)
        if (!member) return sendError(ctx, 'Failed to fetch member')

        const server = await (servers as Collection).findOne({ id: ctx.server!._id })
        const punishments = server!.punishments

        try {
            await ctx.server!.banUser(user._id, { reason })
        } catch(err) {
            return sendError(ctx, stripIndents`
            Failed to ban member. This could be due to one of the following reasons:
            - The member you tried to ban was the owner
            - The bot does not have the required permission to ban members
            `)
        }

        const id = nanoid(10)

        if (!user.bot) {
            punishments.push({
                id,
                userID: user._id,
                moderatorID: ctx.author._id,
                type: 'ban',
                createdAt: new Date(),
                reason
            })
    
            await (servers as Collection).updateOne({ id: ctx.server!._id }, { $set: {
                punishments
            } })
        }

        await ctx.reply(stripIndents`
        Banned ${user.username}:
        > ${reason}
        `)

        const modLogs = (server!.modLogsChannel || server!.modlogschannel || null)
        if (!modLogs) return
        else {
            const modLogsChannel = await ctx.client.bot.channels.fetch(modLogs)
            if (!modLogsChannel) return

            await modLogsChannel.sendMessage(stripIndents`
            > \`${id}\` - $\\color{#CE3C3C}\\textsf{User banned}$
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