import { VoltareClient, CommandContext } from 'voltare'
import { GeneralCommand } from '../util/abstracts'
import { stripIndents } from 'common-tags'

export default class SupportCommand extends GeneralCommand {
    constructor(client: VoltareClient<any>) {
        super(client, {
            name: 'support',
            description: 'Join the support server',
            category: 'General',
            metadata: {
                examples: ['{p}support']
            }
        })

        this.filePath = __filename
    }

    async run(ctx: CommandContext) {
        await ctx.reply(stripIndents`
        [Join the support server](${process.env.SUPPORT_URL})
        `)

        return
    }
}