import { VoltareClient, VoltareCommand, CommandContext } from 'voltare'
import { Collection } from 'mongodb'
import { stripIndents } from 'common-tags'

import { servers } from '../../util/database'
import { sendError } from '../../util/messageUtils'

const validOptions = ['list', 'add', 'remove']

export default class ModrolesCommand extends VoltareCommand {
    constructor(client: VoltareClient<any>) {
        super(client, {
            name: 'modroles',
            description: 'Configure the roles that are considered moderators',
            category: 'Config',
            metadata: {
                examples: ['{p}modroles list', '{p}modroles add <role>', '{p}modroles remove <role | all>'],
                extendedDescription: stripIndents`
                The modroles command lets you add, view and remove the roles in the server that are considered moderator roles.
                Any user that has one of the roles listed is considered a moderator, and can use the moderator-only commands.
                Use \`{p}modroles add <role>\` to add a role, \`{p}modroles list\` to view all roles, and \`{p}modroles remove <role | all>\` to remove a specific role or all roles.
                \`<role>\` can be the name of a role in the server (case sensitive) or a role ID.
                `
            }
        });

        this.filePath = __filename
    }

    async run(ctx: CommandContext) {
        if (!ctx.args.length) return stripIndents`
        No option provided. Option must be one of the following: ${validOptions.join(', ')}
        See \`${ctx.prefix}help modroles\` for more information
        `

        const option = ctx.args[0].toLowerCase()

        if (!validOptions.some(i =>  i.toLowerCase() === option)) return stripIndents`
        Invalid option. Option must be one of the following: ${validOptions.join(', ')}
        See \`${ctx.prefix}help modroles\` for more information
        `

        const server = await (servers as Collection).findOne({ id: ctx.server!._id })
        const obj = await ctx.client.bot.servers.fetch(ctx.server!._id)
        const serverRoles = Object.entries(obj.roles as any).map(i => {
            const data: any = i[1]
            data._id = i[0]
            return data
        })

        if (option === 'list') {
            const roles = serverRoles.filter(role => server!.modRoles.includes(role._id))
            
            await ctx.reply(!roles.length ? `No moderator roles have been added\nUse \`${ctx.prefix}modroles add <role>\` to add one` : `${roles.length} moderator role${roles.length > 1 ? 's' : ''}: ${roles.map(role => `$\\color{${role.colour}}\\textsf{${role.name}}$`).join(', ')}`)

            return
        }

        if (option === 'add') {
            ctx.args.shift()

            const role = serverRoles.find(role => role.name === ctx.args.join(' ')) || serverRoles.find(role => role._id === ctx.args[0])
            if (!role) return sendError(ctx, 'No role with that name or ID exists')

            server!.modRoles.push(role._id)

            await (servers as Collection).updateOne({ id: ctx.server!._id }, { $set: {
                modRoles: server!.modRoles
            } })

            await ctx.reply(stripIndents`
            ${role.name} has been added as a moderator role. Any users with this role can now access and use moderator commands.
            To revoke access, use \`${ctx.prefix}modroles remove ${role.name}\` to remove the role
            `)

            return
        }

        if (option === 'remove') {
            ctx.args.shift()

            const role = serverRoles.find(role => role.name === ctx.args.join(' ')) || serverRoles.find(role => role._id === ctx.args[0])
            if (!role) return sendError(ctx, 'No role with that name or ID exists')
            
            const modRole = server!.modRoles.find(i => i === role._id)
            if (!modRole) return sendError(ctx, 'The specified role is not set as a moderator role in this server')

            const index = server!.modRoles.findIndex(i => i === role._id)
            if (index === -1) return sendError(ctx, 'Failed to fetch moderator role index')

            server!.modRoles.splice(index, 1)

            await (servers as Collection).updateOne({ id: ctx.server!._id }, { $set: {
                modRoles: server!.modRoles
            } })

            await ctx.reply(`${role.name} has been removed and is no longer a moderator role. Access to moderator commands for this role has been revoked.`)

            return
        }
    }
}