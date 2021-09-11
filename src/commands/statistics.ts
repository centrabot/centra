import { VoltareClient, VoltareCommand, CommandContext } from 'voltare'
import { stripIndents } from 'common-tags'
import { LIBRARY_VERSION } from 'revolt.js'

import { dependencies } from '../../package.json' 

export default class StatisticsCommand extends VoltareCommand {
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
        await ctx.reply(stripIndents`

        ### ${process.env.BOT_NAME}
        Created by [@ThatTonybo](/@${process.env.ELEVATED})
        &nbsp;
        **Servers:** ${ctx.client.bot.servers.size}
        **Cached Users:** ${ctx.client.bot.users.size}
        &nbsp;
        **Made with:**
        - [revolt.js](https://github.com/revoltchat/revolt.js) (${LIBRARY_VERSION})
        - [Voltare](https://github.com/Dexare/Voltare) (${dependencies['voltare']})
        - [mongodb](https://github.com/mongodb/node-mongodb-native) (${dependencies['mongodb']})
        `)

        return
    }
}