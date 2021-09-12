import { VoltareClient, CommandContext } from 'voltare'
import { GeneralCommand } from '../../util/abstracts'
import { Collection } from 'mongodb'
import { stripIndents } from 'common-tags'
import { format } from 'date-fns'
import parse from 'yargs-parser'

import { servers } from '../../util/database'
import { sendError } from '../../util/messageUtils'
import { getUser } from '../../util/fetchUtils'
import { isMod } from '../../util/permissionUtils'

const validOptions = ['<name>', 'list', 'info', 'create', 'edit', 'delete']

export default class AutoreplyCommand extends GeneralCommand {
    constructor(client: VoltareClient<any>) {
        super(client, {
            name: 'autoreply',
            description: 'View or manage auto responses and their keyboards',
            category: 'Utility',
            aliases: ['autoresponse', 'ar'],
            metadata: {
                examples: ['{p}autoreply list', '{p}autoreply info <name>', '{p}autoreply create <name> --content <content> --keywords [1,2,...]', '{p}autoreply edit <name> --content [content] --keywords [1,2,...]', '{p}autoreply delete <name>'],
                extendedDescription: stripIndents`
                    Auto responses are snippets of text or content, just like tags, however instead of being manually triggered, they are triggered by set keywords in a message.
                `
            }
        })

        this.filePath = __filename
    }

    async run(ctx: CommandContext) {
        const userIsMod = await isMod(ctx.server!, ctx.author._id)
        if (!userIsMod) return sendError(ctx, 'Only moderators can use this command')
        
        const params = parse(ctx.args)
        const mention = (params.mention || params.m || null)

        if (!ctx.args.length) return stripIndents`
        No option provided. Option must be one of the following: ${validOptions.join(', ')}
        See \`${ctx.prefix}help autoreply\` for more information
        `
        
        const option = ctx.args[0].toLowerCase()

        const server = await (servers as Collection).findOne({ id: ctx.server!._id })
        const autoreplies = server!.autoreplies

        if (option === 'list') {

        }

        if (option === 'info') {

        }

        if (option === 'create') {

        }

        if (option === 'edit') {

        }

        if (option === 'delete') {

        }
    }
}