import { VoltareCommand, CommandContext } from 'voltare'
import { stripIndents } from 'common-tags'
import { nanoid } from 'nanoid'

export abstract class GeneralCommand extends VoltareCommand {
    async onError(err: any, ctx: CommandContext) {
        const id = nanoid(13)
        
        if (process.env.NODE_ENV === 'dev') console.error(err)

        const errorChannel = await ctx.client.bot.channels.fetch(process.env.ERROR_CHANNEL_ID!)
        if (errorChannel) await errorChannel.sendMessage(stripIndents`
        > ### $\\color{#CE3C3C}\\textsf{Error}$
        > **ID:** ${id}
        > &nbsp;
        > **Server:** ${ctx.server!.name}
        > **Channel:** ${ctx.channel.name}
        > **Author:** ${ctx.author.username}
        > &nbsp;
        > **Error:**
        > \`\`\`
        > ${err.stack.split('\n').join('\n> ')}
        > \`\`\`
        `)

        return ctx.reply(stripIndents`
        ### $\\color{#CE3C3C}\\textsf{An error occurred running this command}$
        If the error continues to occur, please report it using \`${ctx.prefix}report ${id}\`
        &nbsp;
        Error ID: \`${id}\`
        Error: \`${err.toString()}\`
        `)
    }
}