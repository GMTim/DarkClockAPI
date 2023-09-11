import dotenv from "dotenv"
import ClockData from "./data/ClockData.js"
import express from "express"
import cors from "cors"

dotenv.config()
const PORT = process.env.PORT
const app = express()
const clients = []
app.use(cors())
app.use(express.json())
app.use((req, res, next) => {
    if (req.method == "POST" && req.originalUrl == "/data") {
        let auth = req.get("X-Auth-Header")
        if (auth != process.env.PASSWORD) {
            return res.status(401).send('Unauthorized!')
        }
    }
    next()
})
app.use(async (req, res, next) => {
    const db = new ClockData()
    await db.checkForTables()
    await db.close()
    next()
})
app.use(async (req, res, next) => {
    if (req.url.endsWith("data")) { return next(); }
    const key = req.params.key
    if (req.method == "GET") {
        const db = new ClockData()
        let sites = await db.getSites()
        await db.close()
        if (sites.filter(s => req.url.endsWith(s.id)).length == 0) {
            return res.status(400).send('Missing Key')
        }
    }
    next()
})

app.get("/data", async (req, res) => {
    const db = new ClockData()
    const sites = await db.getSites()
    res.json(sites)
    await db.close()
})
app.get("/data/:key", async (req, res) => {
    const key = req.params.key
    const db = new ClockData()
    let data = await db.get(key)
    res.json(data)
    await db.close()
})
app.post("/data", async (req, res) => {
    /** @type {import("./data/ClockData.js").SiteClocks} */
    let data = req.body
    if (!data.id) { res.statusCode = 400; return res }
    const db = new ClockData()
    await db.insert(data)
    await db.close()
    for (const client of clients) { client.write(`data: ${JSON.stringify(data)}\n\n`) }
    res.send("")
})
app.get("/events/:key", async (req, res) => {
    const key = req.params.key
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()
    clients.push(res)
    const db = new ClockData()
    let data = await db.get(key)
    res.write(`data: ${JSON.stringify(data)}\n\n`)
    await db.close()
    req.on('close', () => {
        clients.splice(clients.indexOf(res), 1)
    })
})
app.get("/check", (req, res) => { res.send(1) })

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})