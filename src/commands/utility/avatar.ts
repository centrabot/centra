import { VoltareClient, VoltareCommand, CommandContext } from 'voltare'
import { stripIndents } from 'common-tags'
import parse from 'yargs-parser'

import { getUser } from '../../util/fetchUtils'
import { sendError } from '../../util/messageUtils'

let validSizes = [128, 256, 512, 1024, 2048]

export default class AvatarCommand extends VoltareCommand {
    constructor(client: VoltareClient<any>) {
        super(client, {
            name: 'avatar',
            description: 'View a member\'s avatar',
            category: 'Utility',
            aliases: ['pfp'],
            metadata: {
                examples: ['{p}avatar', '{p}avatar [user]', '{p}avatar [user] --size 512'],
                extendedDescription: stripIndents`
                    Provides the avatar URL of the provided user/bot, or yourself if no user is provided.
                    User can be a direct mention or a user ID.
                    Provide the --size or -s flag to set the size to 128, 256, 512, 1024 or 2048.
                `
            }
        })

        this.filePath = __filename
    }

    async run(ctx: CommandContext) {
        const params = parse(ctx.args)
        const size = (params.size || params.s || 256)

        if (!validSizes.some(i => Number(size) === i)) return sendError(ctx, stripIndents`
        Invalid size. Size must be one of the following: ${validSizes.join(', ')}
        See \`${ctx.prefix}help avatar\` for more information
        `)
        
        if (!params._.length) return ctx.author.generateAvatarURL({ size })

        const user = await getUser(ctx.client.bot, params._[0])
        if (!user) return sendError(ctx, 'Failed to fetch user')

        await ctx.reply(user.generateAvatarURL({ size }))

        return
    }
}