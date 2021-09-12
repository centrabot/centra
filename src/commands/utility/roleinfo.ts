import { VoltareClient, CommandContext } from 'voltare'
import { GeneralCommand } from '../../util/abstracts'
import { stripIndents } from 'common-tags'
import { format } from 'date-fns'
import { decodeTime } from 'ulid'

import { getUser } from '../../util/fetchUtils'
import { sendError } from '../../util/messageUtils'

export default class RoleinfoCommand extends GeneralCommand {
    constructor(client: VoltareClient<any>) {
        super(client, {
            name: 'roleinfo',
            description: 'View role information',
            category: 'Utility',
            aliases: ['role', 'rinfo', 'ri'],
            metadata: {
                examples: ['{p}roleinfo <role>']
            }
        })

        this.filePath = __filename
    }

    async run(ctx: CommandContext) {
        if (!ctx.args.length) return sendError(ctx, 'No role provided')

        const server = await ctx.client.bot.servers.fetch(ctx.server!._id)
        const serverRoles = Object.entries(server.roles as any).map(i => {
            const data: any = i[1]
            data._id = i[0]
            return data
        })

        const role = serverRoles.find(i => i.name === ctx.args.join(' ')) || serverRoles.find(i => i._id === ctx.args[0])
        if (!role) return sendError(ctx, 'No role with that name or ID exists in this server')

        const members = await server.fetchMembers()
        const membersWithRole = members.members.filter(member => {
            return (member.roles! || []).includes(role._id)
        })

        await ctx.reply(stripIndents`
        > ### $\\color{${role.colour}}\\textsf{${role.name}}$
        > **Color:** ${role.colour}
        > **Hoisted:** ${role.hoisted ? 'Yes' : 'No'}
        > **Position:** ${role.rank}
        > **Permissions:** ${role.permissions}
        > **Users with role:** ${membersWithRole.length}
        `)

        return
    }
}