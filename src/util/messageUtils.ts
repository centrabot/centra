import { CommandContext } from 'voltare'
import { Client } from 'revolt.js'
import { Message } from 'revolt.js/dist/maps/Messages'

export const sendError = async (ctx: CommandContext | Message, str: string) => {
    await ctx.reply(str)
    return
}

/**
 * Paginate an array
 * @param arr The array to paginate
 * @param size How many items per page
 * @returns An array containing an array per page
 */
export const paginate = (arr: any[], size: number): any[][] => arr.reduce((acc, val, i) => {
    let idx = Math.floor(i / size)
    let page = acc[idx] || (acc[idx] = [])

    page.push(val)

    return acc
}, [])

/**
 * Add padding to the left or right of a string to reach a set length
 * @param len The max length of the string
 * @param str The string to pad
 * @param padLeft Whether to append the padding to the left (true) or right (false)
 * @returns 
 */
export const pad = (str: string, len: number, padLeft: boolean = false): string => {
    if (!str) return ''

    const pad = ' '.repeat(len)

    if (padLeft) return (pad + str).slice(-pad.length)
    return (str + pad).substring(0, pad.length)
}

/**
* Create a message collector that resolves when a message that passes the filter is sent
* @param filter A function that returns true if the message passes any filters specified
* @param timeLimit Optionally provide a time limit (in milliseconds) that a message must arrive by. Rejects if no message arrives in the specified time.
* @returns Promise<Message>
*/
export const messageCollector = async (client: Client, filter, timeLimit?: number): Promise<Message> => {
   return new Promise((resolve, reject) => {
       let timeout
       let listener: any = client.on('message', async message => {
           const match = filter(message)
           if (!match) return
   
           listener = undefined
           clearTimeout(timeout)

           return resolve(message)
       })

       if (timeLimit) timeout = setTimeout(() => {
           listener = undefined
           reject('No message arrived within time limit')
       }, timeLimit)
   })
}