import { Server } from 'revolt.js/dist/maps/Servers'
import { Collection } from 'mongodb'

import { servers } from './database'

export const isMod = async (server: Server, userID: string) => {
    const config = await (servers as Collection).findOne({ id: server._id })
    if (!config!.modRoles.length) throw new Error('No moderator roles configured')

    const member = await server.fetchMember(userID)
    if (!member) throw new Error('Unable to fetch member for permissions check')

    if (config!.modRoles.some(role => (member.roles || []).includes(role))) return true
    
    return false
}

export const isAdmin = async (server: Server, userID: string) => {
    const config = await (servers as Collection).findOne({ id: server._id })
    if (!config!.adminRoles.length) throw new Error('No admin roles configured')

    const member = await server.fetchMember(userID)
    if (!member) throw new Error('Unable to fetch member for permissions check')

    if (config!.adminRoles.some(role => (member.roles || []).includes(role))) return true
    
    return false
}