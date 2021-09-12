import { VoltareClient, CommandContext } from 'voltare'
import { GeneralCommand } from '../util/abstracts'
import { stripIndents } from 'common-tags'
import { sendError } from '../util/messageUtils'

export default class FeedbackCommand extends GeneralCommand {
    constructor(client: VoltareClient<any>) {
        super(client, {
            name: 'feedback',
            description: `Send feedback`,
            category: 'General',
            metadata: {
                examples: ['{p}feedback <content>']
            }
        })

        this.filePath = __filename
    }

    async run(ctx: CommandContext) {
        if (!ctx.args.length) return sendError(ctx, 'No feedback content provided')

        const channel = await ctx.client.bot.channels.fetch(process.env.FEEDBACK_CHANNEL_ID!)
        if (!channel) return sendError(ctx, 'Failed to fetch feedback channel')

        await channel.sendMessage(stripIndents`
        > ### Feedback
        > **Server:** ${ctx.server!.name}
        > **Author:** ${ctx.author.username}
        > &nbsp;
        > **Feedback:**
        > ${ctx.args.join(' ').split('\n').join('\n> ')}
        `)

        await ctx.reply(stripIndents`
        Your feedback has been sent successfully
        If you would like to provide more information or keep to date on changes, [join the support server](${process.env.SUPPORT_URL})
        `)

        return
    }
}