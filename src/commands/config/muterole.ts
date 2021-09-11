import { VoltareClient, VoltareCommand, CommandContext } from 'voltare'
import { Collection } from 'mongodb'
import { stripIndents } from 'common-tags'

import { servers } from '../../util/database'
import { sendError } from '../../util/messageUtils'

export default class MuteroleCommand extends VoltareCommand {
    constructor(client: VoltareClient<any>) {
        super(client, {
            name: 'muterole',
            description: 'Create or set a role to be used for muted users',
            category: 'Config',
            metadata: {
                examples: ['{p}muterole create <name>', '{p}muterole set <role>', '{p}muterole view'],
                extendedDescription: stripIndents`
                The modroles command lets you add, view and remove the roles in the server that are considered moderator roles.
                Any user that has one of the roles listed is considered a moderator, and can use the moderator-only commands.
                Use \`{p}modroles add <role>\` to add a role, \`{p}modroles list\` to view all roles, and \`{p}modroles remove <role | all>\` to remove a specific role or all roles.
                \`<role>\` can be the name of a role in the server (case sensitive) or a role ID.
                `
            }
        })

        this.filePath = __filename
    }

    async run(ctx: CommandContext) {

    }
}