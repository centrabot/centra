import { VoltareClient, CommandContext } from 'voltare'
import { GeneralCommand } from '../util/abstracts'
import { stripIndents } from 'common-tags'
import { LIBRARY_VERSION } from 'revolt.js'

import { dependencies } from '../../package.json' 

export default class StatisticsCommand extends GeneralCommand {
    constructor(client: VoltareClient<any>) {
        super(client, {
            name: 'statistics',
            description: 'Bot information and statistics',
            category: 'General',
            aliases: ['stats', 'about', 'botinfo'],
            metadata: {
                examples: ['{p}statistics']
            }
        })

        this.filePath = __filename
    }

    async run(ctx: CommandContext) {
        const used = process.memoryUsage();

        await ctx.reply(stripIndents`
        [](a://a)
        ### ${process.env.BOT_NAME}
        Created by [@ThatTonybo](/@${process.env.ELEVATED})
        [Source code on GitHub](https://github.com/centrabot/centra)
        &nbsp;
        **Servers:** ${ctx.client.bot.servers.size}
        **Cached Users:** ${ctx.client.bot.users.size}
        &nbsp;
        **Memory Usage:**
        ${Object.entries(used).map(i => `- ${i[0]}: ${Math.round(i[1] / 1024 / 1024 * 100) / 100} MB`).join('\n')}
        &nbsp;
        **Made with:**
        - [revolt.js](https://github.com/revoltchat/revolt.js) (${LIBRARY_VERSION})
        - [Voltare](https://github.com/Dexare/Voltare) (${dependencies['voltare']})
        - [mongodb](https://github.com/mongodb/node-mongodb-native) (${dependencies['mongodb']})
        `)

        return
    }
}