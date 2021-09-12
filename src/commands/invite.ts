import { VoltareClient, CommandContext } from 'voltare'
import { GeneralCommand } from '../util/abstracts'
import { stripIndents } from 'common-tags'

export default class InviteCommand extends GeneralCommand {
    constructor(client: VoltareClient<any>) {
        super(client, {
            name: 'invite',
            description: `Invite ${process.env.BOT_NAME} to your server`,
            category: 'General',
            metadata: {
                examples: ['{p}invite']
            }
        })

        this.filePath = __filename
    }

    async run(ctx: CommandContext) {
        await ctx.reply(stripIndents`
        [Invite ${process.env.BOT_NAME} to your server](${process.env.INVITE_URL})
        `)

        return
    }
}