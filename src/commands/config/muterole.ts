import { VoltareClient, CommandContext } from 'voltare'
import { GeneralCommand } from '../../util/abstracts'
import { ChannelPermission } from 'revolt.js'
import { Collection } from 'mongodb'
import { stripIndents } from 'common-tags'

import { servers } from '../../util/database'
import { sendError } from '../../util/messageUtils'
import { isAdmin } from '../../util/permissionUtils'

const validOptions = ['create', 'set', 'update']

export default class MuteroleCommand extends GeneralCommand {
    constructor(client: VoltareClient<any>) {
        super(client, {
            name: 'muterole',
            description: 'Create or set a role to be used for muted users',
            category: 'Config',
            metadata: {
                examples: ['{p}muterole', '{p}muterole create <name>', '{p}muterole set <role>'],
                extendedDescription: stripIndents`
                The muterole command lets you create or set a role that will be used to mute users.
                Either creating a role (\`{p}muterole create <name>\`) or setting an existing role (\`{p}muterole set <role>\`) will overwrite it's permissions for every channel in the server to deny sending permissions.
                Once a role has been created or set, the bot will ensure any new channels are updated with the permission overwrites to ensure muting works there.
                If for some reason the mute role fails in a channel, run \`{p}muterole update\` to ensure all channels are properly updated.
                `
            }
        })

        this.filePath = __filename
    }

    async run(ctx: CommandContext) {
        const userIsAdmin = await isAdmin(ctx.server!, ctx.author._id)
        if (!userIsAdmin) return sendError(ctx, 'Only admins can use this command')
        
        const server = await (servers as Collection).findOne({ id: ctx.server!._id })

        if (!ctx.args.length) {
            await ctx.reply(server!.muteRole ? `Server mute role: ${server!.muteRole}` : `This server has no mute role. Use \`${ctx.prefix}muterole create <name>\` to create one, or \`${ctx.prefix}muterole set <role>\` to set an existing role.`)

            return
        }

        const option = ctx.args[0].toLowerCase()

        if (!validOptions.some(i =>  i.toLowerCase() === option)) return stripIndents`
        Invalid option. Option must be one of the following: ${validOptions.join(', ')}
        See \`${ctx.prefix}help muterole\` for more information
        `

        if (option === 'create') {
            ctx.args.shift()

            if (server!.muteRole) return sendError(ctx, 'A mute role for this server already exists')

            const name = ctx.args.join(' ')
            if (!name) return sendError(ctx, 'No role name provided')

            let role

            try {
                role = await ctx.server!.createRole(name)
            } catch(err) {
                return sendError(ctx, stripIndents`
                Failed to create muted role. This could be due to one of the following reasons:
                - Another role with the provided name already exists
                - The bot does not have the required permission to create roles
                `)
            }

            const m = await ctx.reply(stripIndents`
            Muted role created. Setting up permission overwrites, this may take a moment...
            `)

            try {
                await Promise.all(ctx.server!.channels.map(async channel => {
                    await channel!.setPermissions(role.id, (ChannelPermission.View | ChannelPermission.InviteOthers))
                }))
            } catch(err) {
                return sendError(ctx, stripIndents`
                Failed to set up permission overwrites. This could be due to one of the following reasons:
                - The bot does not have the required permission to modify channel permissions
                `)
            }

            await (servers as Collection).updateOne({ id: ctx.server!._id }, { $set: {
                muteRole: role.id
            } })

            await m.edit({
                content: stripIndents`
                Muted role has been set up successfully. You can now use \`${ctx.prefix}mute\` to mute users.
                `
            })

            return
        }

        if (option === 'set') {}

        if (option === 'update') {}
    }
}