import { VoltareClient, VoltareCommand, CommandContext } from 'voltare'
import { Collection } from 'mongodb'
import { stripIndents } from 'common-tags'

import { servers } from '../../util/database'
import { sendError } from '../../util/messageUtils'

const validOptions = ['list', 'add', 'remove']

export default class AdminrolesCommand extends VoltareCommand {
    constructor(client: VoltareClient<any>) {
        super(client, {
            name: 'adminroles',
            description: 'Configure the roles that are considered admins',
            category: 'Config',
            metadata: {
                examples: ['{p}adminroles list', '{p}adminroles add <role>', '{p}adminroles remove <role | all>'],
                extendedDescription: stripIndents`
                The adminroles command lets you add, view and remove the roles in the server that are considered admin roles.
                Any user that has one of the roles listed is considered an admin, and can use both the moderator-only commands as well as admin-only commands.
                Use \`{p}adminroles add <role>\` to add a role, \`{p}adminroles list\` to view all roles, and \`{p}adminroles remove <role | all>\` to remove a specific role or all roles.
                \`<role>\` can be the name of a role in the server (case sensitive) or a role ID.
                `
            }
        });

        this.filePath = __filename
    }

    async run(ctx: CommandContext) {
        if (!ctx.args.length) return stripIndents`
        No option provided. Option must be one of the following: ${validOptions.join(', ')}
        See \`${ctx.prefix}help adminroles\` for more information
        `

        const option = ctx.args[0].toLowerCase()

        if (!validOptions.some(i =>  i.toLowerCase() === option)) return stripIndents`
        Invalid option. Option must be one of the following: ${validOptions.join(', ')}
        See \`${ctx.prefix}help adminroles\` for more information
        `

        const server = await (servers as Collection).findOne({ id: ctx.server!._id })
        const obj = await ctx.client.bot.servers.fetch(ctx.server!._id)
        const serverRoles = Object.entries(obj.roles as any).map(i => {
            const data: any = i[1]
            data._id = i[0]
            return data
        })

        if (option === 'list') {
            const roles = serverRoles.filter(role => server!.adminRoles.includes(role._id))
            
            await ctx.reply(!roles.length ? `No admin roles have been added\nUse \`${ctx.prefix}adminroles add <role>\` to add one` : `${roles.length} admin role${roles.length > 1 ? 's' : ''}: ${roles.map(role => `$\\color{${role.colour}}\\textsf{${role.name}}$`).join(', ')}`)

            return
        }

        if (option === 'add') {
            ctx.args.shift()

            const role = serverRoles.find(role => role.name === ctx.args.join(' ')) || serverRoles.find(role => role._id === ctx.args[0])
            if (!role) return sendError(ctx, 'No role with that name or ID exists')

            server!.adminRoles.push(role._id)

            await (servers as Collection).updateOne({ id: ctx.server!._id }, { $set: {
                adminRoles: server!.adminRoles
            } })

            await ctx.reply(stripIndents`
            ${role.name} has been added as an admin role. Any users with this role can now access and use moderator and admin commands.
            To revoke access, use \`${ctx.prefix}adminroles remove ${role.name}\` to remove the role
            `)

            return
        }

        if (option === 'remove') {
            ctx.args.shift()

            const role = serverRoles.find(role => role.name === ctx.args.join(' ')) || serverRoles.find(role => role._id === ctx.args[0])
            if (!role) return sendError(ctx, 'No role with that name or ID exists')
            
            const adminRole = server!.adminRoles.find(i => i === role._id)
            if (!adminRole) return sendError(ctx, 'The specified role is not set as an admin role in this server')

            const index = server!.adminRoles.findIndex(i => i === role._id)
            if (index === -1) return sendError(ctx, 'Failed to fetch admin role index')

            server!.adminRoles.splice(index, 1)

            await (servers as Collection).updateOne({ id: ctx.server!._id }, { $set: {
                adminRoles: server!.adminRoles
            } })

            await ctx.reply(`${role.name} has been removed and is no longer an admin role. Access to moderator and admin commands for this role has been revoked.`)

            return
        }
    }
}