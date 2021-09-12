import { VoltareClient, CommandContext } from 'voltare'
import { GeneralCommand } from '../util/abstracts'
import { stripIndents } from 'common-tags'
import { sendError } from '../util/messageUtils'

export default class ReportCommand extends GeneralCommand {
    constructor(client: VoltareClient<any>) {
        super(client, {
            name: 'report',
            description: `Report a bug or issue with ${process.env.BOT_NAME}`,
            category: 'General',
            metadata: {
                examples: ['{p}report <content>']
            }
        })

        this.filePath = __filename
    }

    async run(ctx: CommandContext) {
        if (!ctx.args.length) return sendError(ctx, 'No report content provided')

        const channel = await ctx.client.bot.channels.fetch(process.env.BUG_REPORT_CHANNEL_ID!)
        if (!channel) return sendError(ctx, 'Failed to fetch report channel')

        await channel.sendMessage(stripIndents`
        > ### Report
        > **Server:** ${ctx.server!.name}
        > **Author:** ${ctx.author.username}
        > &nbsp;
        > **Report:**
        > ${ctx.args.join(' ').split('\n').join('\n> ')}
        `)

        await ctx.reply(stripIndents`
        Your report has been sent successfully
        If you would like to provide more information or keep to date on changes, [join the support server](${process.env.SUPPORT_URL})
        `)

        return
    }
}