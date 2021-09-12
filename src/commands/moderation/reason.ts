import { VoltareClient, CommandContext } from 'voltare'
import { GeneralCommand } from '../../util/abstracts'
import { Collection } from 'mongodb'
import { stripIndents } from 'common-tags'
import { nanoid } from 'nanoid'
import parse from 'yargs-parser'

import { servers } from '../../util/database'
import { sendError } from '../../util/messageUtils'
import { isMod } from '../../util/permissionUtils'

export default class ReasonCommand extends GeneralCommand {
    constructor(client: VoltareClient<any>) {
        super(client, {
            name: 'reason',
            description: 'Update a previous punishment\'s reason',
            category: 'Moderation',
            metadata: {
                examples: ['{p}reason <id> --reason <reason>']
            }
        })

        this.filePath = __filename
    }

    async run(ctx: CommandContext) {
        const userIsMod = await isMod(ctx.server!, ctx.author._id)
        if (!userIsMod) return sendError(ctx, 'Only moderators can use this command')
        
        const params = parse(ctx.args)
        const reason = (params.reason || params.r || null)

        if (!params._.length) return sendError(ctx, `No punishment ID provided`)

        const server = await (servers as Collection).findOne({ id: ctx.server!._id })
        const punishments = server!.punishments

        const punishment = punishments.find(i => i.id === params._[0])
        if (!punishment) return sendError(ctx, 'No punishment with that ID exists')

        const user = await ctx.client.bot.users.fetch(punishment.userID)
        if (!user) return sendError(ctx, 'Failed to fetch user accociated with punishment')

        if (!reason) return sendError(ctx, 'A new reason is required to update a punishment\'s reason')

        const index = punishments.findIndex(i => i.id === params._[0])
        if (index === -1) return sendError(ctx, 'Failed to find punishment index')

        punishments[index].reason = reason

        await (servers as Collection).updateOne({ id: ctx.server!._id }, { $set: {
            punishments
        } })

        await ctx.reply(stripIndents`
        Reason for punishment with ID \`${punishment.id}\` updated:
        > ${reason}
        `)

        const modLogs = (server!.modLogsChannel || server!.modlogschannel || null)
        if (!modLogs) return
        else {
            // todo: find previous message and update reason
        }
    }
}