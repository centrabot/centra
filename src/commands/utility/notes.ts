import { VoltareClient, VoltareCommand, CommandContext } from 'voltare'
import { stripIndents } from 'common-tags'

import { getUser } from '../../util/fetchUtils'
import { sendError } from '../../util/messageUtils'

let validSizes = [128, 256, 512, 1024, 2048]

export default class NotesCommand extends VoltareCommand {
    constructor(client: VoltareClient<any>) {
        super(client, {
            name: 'notes',
            description: 'View shared moderator notes on a member',
            category: 'Utility',
            aliases: [],
            metadata: {
                examples: ['{p}notes <user>', '{p}notes <user> --add <note>', '{p}notes <user> --remove <note>'],
                extendedDescription: stripIndents`
                    Moderator notes is a shared collection of notes created on a user, that can only be read by moderators.
                    Notes act as a list of sorts. Each user has their own notes, and moderators can add or remove small notes to the user.
                `
            }
        })

        this.filePath = __filename
    }

    async run(ctx: CommandContext) {
        
    }
}