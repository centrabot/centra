import { VoltareClient, CommandContext } from 'voltare'
import { GeneralCommand } from '../../util/abstracts'
import { User } from 'revolt.js/dist/maps/Users'
import { stripIndents } from 'common-tags'
import { format } from 'date-fns'
import { decodeTime } from 'ulid'

import { getUser } from '../../util/fetchUtils'
import { sendError } from '../../util/messageUtils'

export default class UserinfoCommand extends GeneralCommand {
    constructor(client: VoltareClient<any>) {
        super(client, {
            name: 'userinfo',
            description: 'View user information',
            category: 'Utility',
            aliases: ['user', 'uinfo', 'ui'],
            metadata: {
                examples: ['{p}userinfo', '{p}userinfo [user]']
            }
        })

        this.filePath = __filename
    }

    async run(ctx: CommandContext) {
        let user: User

        if (!ctx.args.length) user = ctx.author
        else user = await getUser(ctx.client.bot, ctx.args[0]) as User
        if (!user) return sendError(ctx, 'Failed to fetch user')

        const member = await ctx.server!.fetchMember(user._id)
        const profile = await user.fetchProfile()
        const mutuals = await user.fetchMutual()

        const obj = await ctx.client.bot.servers.fetch(ctx.server!._id)
        const serverRoles = Object.entries(obj.roles as any).map(i => {
            const data: any = i[1]
            data._id = i[0]
            return data
        })
        
        const userRoles = serverRoles.filter(role => member.roles!.includes(role._id))
        const mutualServers = await Promise.all(mutuals.servers.map(async id => {
            const server = await ctx.client.bot.servers.fetch(id)

            return server
        }))

        const creationDate = decodeTime(user._id)

        let botOwner;
        if (user.bot) botOwner = await ctx.client.bot.users.fetch(user.bot.owner)

        await ctx.reply(stripIndents`
        > ### ${user.username}
        > **Presence:**
        > - Status: ${user.status!.presence || '*Unknown*'}
        > - Custom Status: ${user.status!.text || 'No custom status set'}
        > **Bio:** [Click here to view](/@${user._id})
        > **Joined Revolt at:** ${format(creationDate, 'yyyy-MM-dd h:mm aa')}
        > **Server Identity:**
        > - Nickname: ${member.nickname || 'No nickname'}
        > - Server Avatar: ${member.avatar || 'No server avatar'}
        > **Bot:** ${user.bot ? `\n> - Owner: ${botOwner.username}` : 'No'}
        > **Roles:** ${userRoles.map(role => `$\\color{${role.colour}}\\textsf{${role.name}}$`).join(', ') || 'No roles'}
        > **Badges:** ${user.badges}
        > **Flags:** ${user.flags || 'No flags'}
        > **Mutual Servers with bot:** ${mutualServers.map(server => `[${server.name}](/server/${server._id})`).join(', ')}
        > **Avatar:** ${user.avatar ? `[Link](${user.generateAvatarURL({ size: 256 })})` : 'No avatar'}
        > **Default Avatar:** [Link](${user.defaultAvatarURL})
        > **Background:** ${profile.background ? `[Link](https://autumn.revolt.chat/backgrounds/${profile.background._id})` : 'No background'}
        `)

        return
    }
}