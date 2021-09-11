import { VoltareClient, VoltareCommand, CommandContext } from 'voltare'
import { Collection } from 'mongodb'
import { stripIndents } from 'common-tags'

import { servers } from '../../util/database'
import { sendError } from '../../util/messageUtils'

const validOptions = ['list', 'add', 'remove']

export default class MuteroleCommand extends VoltareCommand {
    constructor(client: VoltareClient<any>) {
        super(client, {
            name: 'muterole',
            description: 'Create or set a role to be used for muted users',
            category: 'Config',
            metadata: {
                examples: ['{p}muterole create <name>', '{p}muterole set <role>', '{p}muterole view'],
                extendedDescription: stripIndents`
                The muterole command lets you create or set a role that will be used to mute users.
                Either creating a role (\`{p}muterole create <name>\`) or setting an existing role (\`{p}muterole set <role>\`) will overwrite it's permissions for every channel in the server to deny sending permissions.
                Once a role has been created or set, the bot will ensure any new channels are updated with the permission overwrites to ensure muting works there.
                If for some reason the mute role fails in a channel, run \`{p}muterole update\` to ensure all channels are properly updated.`
                `
            }
        })

        this.filePath = __filename
    }

    async run(ctx: CommandContext) {

    }
}