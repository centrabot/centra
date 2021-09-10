import { Client } from 'revolt.js'

export const parseMention = (str: string) => {
    if (str.startsWith('<@') && str.endsWith('>')) {
        str = str.slice(2, -1)
        
        return str
    }

    return undefined
}

export const getUser = async (client: Client, str: string) => {
    try {
        let user = await client.users.fetch(parseMention(str) || str)

        return user || undefined
    } catch(err) {
        return undefined
    }
}