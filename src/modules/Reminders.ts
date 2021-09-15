import { VoltareModule, VoltareClient, ClientEvent } from 'voltare'
import { Collection } from 'mongodb'
import { stripIndents } from 'common-tags'
import ms from 'ms'

import { reminders } from '../util/database'

export default class RemindersModule<t extends VoltareClient> extends VoltareModule<t> {
    constructor(client: t) {
        super(client, {
            name: 'reminders',
            description: 'Handles checking and completing reminders'
        })

        this.filePath = __filename
    }

    load() {
        this.registerEvent('ready', this.onReady.bind(this))
    }

    unload() {
        this.unregisterAllEvents()
    }

    private async onReady(event: ClientEvent) {
        setInterval(async () => {
            const rems = await (reminders as Collection).find({}).toArray()

            this.handleReminders(rems)
        }, (Number(process.env.REMINDER_CHECK_INTERVAL_SECONDS) * 1000))
    }

    private async handleReminders(rems: any[]) {
        await Promise.all(rems.map(async reminder => {
            const setAt = new Date(reminder.createdAt)
            const duration = Number(reminder.duration)

            const endDate = Number(setAt.getTime() + duration)

            if (new Date().getTime() >= endDate) this.sendReminder(reminder).then(async () => await (reminders as Collection).deleteOne({ id: reminder.id }))
        }))
    }

    private async sendReminder(reminder: any) {
        const channel = await this.client.bot.channels.fetch(reminder.channelID)
        if (!channel) return

        await channel.sendMessage(stripIndents`
        <@${reminder.userID}>: You asked me ${ms(reminder.duration, { long: true })} ago to remind you:
        ${reminder.content}
        `)

        return
    }
}
