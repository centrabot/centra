import { VoltareClient, CommandContext } from 'voltare'
import { GeneralCommand } from '../util/abstracts'
import { stripIndents } from 'common-tags'
import { decodeTime } from 'ulid'

export default class PingCommand extends GeneralCommand {
    constructor(client: VoltareClient<any>) {
        super(client, {
            name: 'ping',
            description: `Checks ${process.env.BOT_NAME}\'s ping and latency`,
            category: 'General',
            metadata: {
                examples: ['{p}ping']
            }
        })

        this.filePath = __filename
    }

    async run(ctx: CommandContext) {
        const m = await ctx.reply('Ping?')

        const diff = Math.round(decodeTime(m._id) - decodeTime(ctx.message._id))

        await m.edit({
            content: stripIndents`
            Roundtrip: ${diff}ms
            `
        })

        return
    }
}