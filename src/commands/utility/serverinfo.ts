import { VoltareClient, VoltareCommand, CommandContext } from 'voltare'
import { Channel } from 'revolt.js/dist/maps/Channels'
import { stripIndents } from 'common-tags'
import { format } from 'date-fns'
import { decodeTime } from 'ulid'

export default class ServerinfoCommand extends VoltareCommand {
    constructor(client: VoltareClient<any>) {
        super(client, {
            name: 'serverinfo',
            description: 'View server information',
            category: 'Utility',
            aliases: ['server', 'sinfo', 'si'],
            metadata: {
                examples: ['{p}serverinfo']
            }
        })

        this.filePath = __filename
    }

    async run(ctx: CommandContext) {
        const server = ctx.server!

        const owner = await ctx.client.bot.users.fetch(server.owner)
        const creationDate = decodeTime(server._id)
        const members = await server.fetchMembers()
        const userCount = members.users.filter(user => !user.bot)
        const botCount = members.users.filter(user => user.bot)

        let sysJoin: string | Channel = server.system_messages!.user_joined!,
            sysLeave: string | Channel = server.system_messages!.user_left!,
            sysKick: string | Channel = server.system_messages!.user_kicked!,
            sysBan: string | Channel = server.system_messages!.user_banned!

        if (sysJoin) sysJoin = await ctx.client.bot.channels.fetch(sysJoin)
        if (sysLeave) sysLeave = await ctx.client.bot.channels.fetch(sysLeave)
        if (sysKick) sysKick = await ctx.client.bot.channels.fetch(sysKick)
        if (sysBan) sysBan = await ctx.client.bot.channels.fetch(sysBan)

        await ctx.reply(stripIndents`
        > ### ${server.name}
        > **Description:** ${server.description || 'No description'}
        > **Owner:** ${owner.username || '*Unable to fetch owner'}
        > **Created at:** ${format(creationDate, 'yyyy-MM-dd h:mm aa')}
        > **Members:**
        > - Users: ${userCount.length}
        > - Bots: ${botCount.length === 0 ? 'None' : botCount.length}
        > **Roles:** ${Object.keys(server.roles!).length}
        > **Categories:** ${Object.keys(server.categories!).length}
        > **Channels:** ${Object.keys(server.channels!).length}
        > **Server Messages:**
        > - User join: ${sysJoin ? `Enabled, <#${(sysJoin as Channel)._id}>` : 'Disabled'}
        > - User leave: ${sysLeave ? `Enabled, <#${(sysLeave as Channel)._id}>` : 'Disabled'}
        > - User kick: ${sysKick ? `Enabled, <#${(sysKick as Channel)._id}>` : 'Disabled'}
        > - User ban: ${sysBan ? `Enabled, <#${(sysBan as Channel)._id}>` : 'Disabled'}
        > **Icon:** ${server.icon ? `[Server icon](${server.generateIconURL({ size: 256 })})` : 'No icon'}
        > **Banner:** ${server.banner ? `[Server banner](https://autumn.revolt.chat/banners/${server.banner._id}?width=480)` : 'No banner'}
        `)

        return
    }
}