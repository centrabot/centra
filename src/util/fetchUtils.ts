import { Client } from 'revolt.js'
import { Server } from 'revolt.js/dist/maps/Servers'
import { Channel } from 'revolt.js/dist/maps/Channels'
import { User } from 'revolt.js/dist/maps/Users'

export const parseUserMention = (str: string) => {
    if (str.startsWith('<@') && str.endsWith('>')) {
        str = str.slice(2, -1)
        
        return str
    }

    return undefined
}

export const parseChannelMention = (str: string) => {
    if (str.startsWith('<#') && str.endsWith('>')) {
        str = str.slice(2, -1)
        
        return str
    }

    return undefined   
}

export const getUser = async (client: Client, str: string): Promise<User | undefined> => {
    try {
        let user = await client.users.fetch(parseUserMention(str) || str)

        return user || undefined
    } catch(err) {
        return undefined
    }
}

export const getChannel = async (server: Server, str: string): Promise<Channel | undefined> => {
    try {
        let channel = server.channels.find(channel => channel!.name === str) || server.channels.find(channel => channel!._id === (parseChannelMention(str) || str))

        return channel || undefined
    } catch(err) {
        return undefined
    }
}