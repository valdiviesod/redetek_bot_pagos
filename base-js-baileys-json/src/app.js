import { createBot, createProvider, createFlow, addKeyword, EVENTS } from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { RateLimiter } = require('limiter');

const PORT = process.env.PORT ?? 3008

const welcomeFlow = addKeyword(['Hola', 'Buenas', 'Buenos', 'Buen', 'Saludos', 'Muy', 'Hello', 'Hi', 'Cordial', 'Saludo', 'Quiero', 'Puede', 'Pueden', 'Necesito', 'Por favor'])
    .addAnswer(`🙌  Hola, te comunicas con el *Chatbot* automático de Redetek, estoy para colaborarte con el proceso de pago de tus servicios.`)
    .addAnswer(`Si deseas realizar un pago de manera física, escribe *fisico* para obtener información sobre cómo realizar tus pagos en nuestros puntos físicos.`)
    .addAnswer(`Si necesitas la dirección de nuestras oficinas, escribe *oficinas*.`)
    .addAnswer(`Si deseas realizar un pago de manera virtual, escribe *virtual* para comenzar con tu proceso de pago en línea.`)
    .addAnswer(`Si necesitas realizar una *Reconexión del servicio* o soporte técnico en general, escribe *soporte* para obtener la línea de soporte técnico.`)
    .addAnswer(['Si necesitas información sobre planes o realizar la *cancelación* del servicio, comunícate vía Whatsapp a la línea:  3182530010'])

const fisicoFlow = addKeyword(['Físico', 'físico', 'Fisico', 'fisico'])
    .addAnswer('De manera presencial manejamos *pagos en efectivo* con horario en nuestras oficinas de 08:00 am a 05:00 pm de lunes a sábado. No aplica festivos ni domingos.')

const oficinasFlow = addKeyword(['Oficinas', 'oficinas'])
    .addAnswer(`Estas son nuestras oficinas en *Bogotá*:`)
    .addAnswer(`San fernando Cra 58# 73-12 `)
    .addAnswer(`La Estrada Cll 66 #69p 39 `)
    .addAnswer(`Boyacá Real Cll 69a # 74a 21 `)
    .addAnswer(`Fraguita  Cra 24 #7 - 49sur`)
    .addAnswer(`Y esta es nuestra oficina en *Calarcá*:`)
    .addAnswer(`Av colon # 26-33`)

const virtualFlow = addKeyword(['Virtual', 'virtual'])
    .addAnswer(`Para realizar tu pago de manera *virtual*, vamos a generarte un link de cobro via *PSE*. Este link se habilita desde el momento en que lo solicites hasta las 04:00 PM del mismo dia.`)
    .addAnswer(`Una vez realices el pago, debes enviar por este medio el comprobante del pago.`)
    .addAnswer(`🙏 En un momento uno de nuestros asesores te enviará el link de cobro para que realices el pago. No envíes mensajes hasta recibir una respuesta.`)

const soporteFlow = addKeyword(['Soporte', 'soporte'])
    .addAnswer(`Para soporte técnico debes comunicarte a la siguiente línea telefónica para *Bogotá*: 6013080010 y para *Calarcá*: 6063080012. Allí tu solicitud será validada en un lapso no mayor a 24 horas hábiles laboradas.`)

    const main = async () => {
        const adapterFlow = createFlow([welcomeFlow, soporteFlow, oficinasFlow, fisicoFlow, virtualFlow])
    
        const adapterProvider = createProvider(Provider, {
            experimentalStore: true,
            timeRelease: 300000, // 5 minutes in milliseconds
            markReadMessage: true,
            retryStrategy: {
                attempts: 3,
                delay: 5000
            }
        })
        const adapterDB = new Database()
    
        const { handleCtx, httpServer } = await createBot({
            flow: adapterFlow,
            provider: adapterProvider,
            database: adapterDB,
        })
    
        // Create a rate limiter that allows 5 requests per second
        const limiter = new RateLimiter({ tokensPerInterval: 5, interval: "second" });
    
        adapterProvider.server.post(
            '/v1/messages',
            handleCtx(async (bot, req, res) => {
                try {
                    await limiter.removeTokens(1);
                    const { number, message, urlMedia } = req.body
                    await bot.sendMessage(number, message, { media: urlMedia ?? null })
                        .catch(err => {
                            console.error(`Error sending message to ${number}:`, err);
                            throw err; // Re-throw to be caught by the outer catch
                        });
                    res.status(200).send('Message sent successfully')
                } catch (err) {
                    console.error(`Failed to process message for ${req.body.number}:`, err);
                    res.status(500).send('Message processing failed');
                }
            })
        )

    adapterProvider.server.post(
        '/v1/register',
        handleCtx(async (bot, req, res) => {
            try {
                await limiter.removeTokens(1);
                const { number, name } = req.body
                await bot.dispatch('REGISTER_FLOW', { from: number, name })
                res.status(200).send('Register flow triggered successfully')
            } catch (err) {
                console.error(`Failed to trigger register flow for ${number}:`, err);
                res.status(500).send('Flow trigger failed');
            }
        })
    )

    adapterProvider.server.post(
        '/v1/samples',
        handleCtx(async (bot, req, res) => {
            try {
                await limiter.removeTokens(1);
                const { number, name } = req.body
                await bot.dispatch('SAMPLES', { from: number, name })
                res.status(200).send('Samples flow triggered successfully')
            } catch (err) {
                console.error(`Failed to trigger samples flow for ${number}:`, err);
                res.status(500).send('Flow trigger failed');
            }
        })
    )

    adapterProvider.server.post(
        '/v1/blacklist',
        handleCtx(async (bot, req, res) => {
            try {
                await limiter.removeTokens(1);
                const { number, intent } = req.body
                if (intent === 'remove') bot.blacklist.remove(number)
                if (intent === 'add') bot.blacklist.add(number)
                res.status(200).json({ status: 'ok', number, intent })
            } catch (err) {
                console.error(`Failed to modify blacklist for ${number}:`, err);
                res.status(500).send('Blacklist modification failed');
            }
        })
    )
    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        // Aplicación específica: Decidir si terminar el proceso
        // process.exit(1);
    });

    httpServer(+PORT)
}

main().catch(err => {
    console.error('Failed to start the bot:', err);
    process.exit(1);
});