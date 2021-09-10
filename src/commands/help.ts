import { VoltareClient, VoltareCommand, CommandContext } from 'voltare'
import { stripIndents } from 'common-tags'

import { sendError } from '../util/messageUtils'

export default class HelpCommand extends VoltareCommand {
    constructor(client: VoltareClient<any>) {
        super(client, {
            name: 'help',
            description: 'View a list of commands, or view detailed command information',
            category: 'General',
            metadata: {
                examples: ['{p}help', '{p}help [command]']
            }
        });

        this.filePath = __filename
    }

    async run(ctx: CommandContext) {
        if (!ctx.args.length) {
            const categories: any[] = []

            ctx.client.commands.commands.map(command => {
                if (!categories.find(category => category.name === command.category)) categories.push({
                    name: command.category,
                    commands: []
                })
    
                categories.find(category => category.name === command.category).commands.push({
                    name: command.name,
                    description: command.description
                })
            })
    
            await ctx.reply(stripIndents`
            Showing ${ctx.client.commands.commands.size} commands
            For detailed information, run \`${ctx.prefix}help [command name]\`
            [Invite ${process.env.BOT_NAME} to your server](${process.env.INVITE_URL}) | [Join the support server](${process.env.SUPPORT_URL})
            &nbsp;
            ${categories.map(category => stripIndents`
                ### ${category.name}
                ${category.commands.map(command => stripIndents`
                    **${command.name}**: ${command.description}
                `).join('\n')}
            `).join('\n&nbsp;\n')}
            `)

            return
        }

        const command = ctx.client.commands.commands.find(command => command.name === ctx.args[0].toLowerCase() || command.aliases.some(arg => arg === ctx.args[0].toLowerCase()))
        if (!command) return sendError(ctx, `No command found with that name or alias`)

        await ctx.reply(stripIndents`
        ### ${command.name}
        ${command.metadata.extendedDescription || command.description}
        &nbsp;
        **Aliases:** ${command.aliases.join(', ') || 'No aliases'}
        **Permission Level:** n/a
        &nbsp;
        **Examples:** ${command.metadata.examples.map(example => `\n\`${example}\``).join('') || 'No examples'}
        `.replace(/{p}/g, ctx.prefix))

        return
    }
}