import { createBot, createProvider, createFlow, addKeyword, EVENTS } from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'


const PORT = process.env.PORT ?? 3008


const welcomeFlow = addKeyword(EVENTS.WELCOME)
    .addAnswer(`🙌  Hola, te comunicas con el *Chatbot* automático de Redetek, estoy para colaborarte con el proceso de pago de tus servicios.`)
    .addAnswer(`Si deseas realizar un pago de manera física, escribe *fisico* para obtener información sobre cómo realizar tus pagos en nuestros puntos físicos.`)
    .addAnswer(`Si necesitas la dirección de nuestras oficinas, escribe *oficinas*.`)
    .addAnswer(`Si deseas realizar un pago de manera virtual, escribe *virtual* para comenzar con tu proceso de pago en línea.`)
    .addAnswer(`Si necesitas la dirección de nuestras oficinas, escribe *oficinas*.`)
    

const fisicoFlow = addKeyword(['Físico', 'físico', 'Fisico', 'fisico'])
    .addAnswer('De manera presencial manejamos *pagos en efectivo* con horario en nuestras oficinas de 08:00 am a 05:00 pm de lunes a sábado. No aplica festivos ni domingos.')


const oficinasFlow = addKeyword(['Oficinas', 'oficinas'])
    .addAnswer(`Estas son nuestras oficinas en *Bogotá*:`)
    .addAnswer(`San fernando Cra 58# 73-12 `)
    .addAnswer(`La Estrada Cll 66 #69p 39 `)
    .addAnswer(`Boyacá Real Cll 69a # 74a 21 `)
    .addAnswer(`Fraguita  Cra 24 #7 - 49sur`)
    .addAnswer(`Y esta es nuestra oficina en *Calarcá*:`)
    .addAnswer(`San fernando Cra 58# 73-12 `)

const virtualFlow = addKeyword(['Virtual', 'virtual'])
    .addAnswer(`Para realizar tu pago de manera *virtual*, vamos a generarte un link de cobro via *PSE*. Este link se habvilita desde el momento en que lo solicites hasta las 04:00 PM del mismo dia.`)
    .addAnswer(`Una vez realices el pago, debes enviar por este medio el comprobante del pago.`)
    .addAnswer(`🙏 En un momento uno de nuestros asesores te enviará el link de cobro para que realices el pago. No envíes mensajes hasta recibir una respuesta.`)


const soporteFlow = addKeyword(['Soporte', 'soporte'])
    .addAnswer(`Para soporte técnico debes comunicarte a la siguiente línea telefónica para *Bogotá*: 6013080010 y para *Calarcá*: 6063080012. Allí tu solicitud será validada en un lapso no mayor a 24 horas hábiles laboradas.`)

const main = async () => {
    const adapterFlow = createFlow([welcomeFlow, soporteFlow, oficinasFlow, fisicoFlow, virtualFlow])

    const adapterProvider = createProvider(Provider)
    const adapterDB = new Database()

    const { handleCtx, httpServer } = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

    adapterProvider.server.post(
        '/v1/messages',
        handleCtx(async (bot, req, res) => {
            const { number, message, urlMedia } = req.body
            await bot.sendMessage(number, message, { media: urlMedia ?? null })
            return res.end('sended')
        })
    )

    adapterProvider.server.post(
        '/v1/register',
        handleCtx(async (bot, req, res) => {
            const { number, name } = req.body
            await bot.dispatch('REGISTER_FLOW', { from: number, name })
            return res.end('trigger')
        })
    )

    adapterProvider.server.post(
        '/v1/samples',
        handleCtx(async (bot, req, res) => {
            const { number, name } = req.body
            await bot.dispatch('SAMPLES', { from: number, name })
            return res.end('trigger')
        })
    )

    adapterProvider.server.post(
        '/v1/blacklist',
        handleCtx(async (bot, req, res) => {
            const { number, intent } = req.body
            if (intent === 'remove') bot.blacklist.remove(number)
            if (intent === 'add') bot.blacklist.add(number)

            res.writeHead(200, { 'Content-Type': 'application/json' })
            return res.end(JSON.stringify({ status: 'ok', number, intent }))
        })
    )

    httpServer(+PORT)
}

main()
