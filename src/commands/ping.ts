import { VoltareClient, VoltareCommand, CommandContext } from 'voltare'
import { stripIndents } from 'common-tags'
import { decodeTime } from 'ulid'

export default class PingCommand extends VoltareCommand {
    constructor(client: VoltareClient<any>) {
        super(client, {
            name: 'ping',
            description: 'Checks the bot\'s ping and latency',
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