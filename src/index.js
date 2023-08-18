
const express = require('express');
const axios = require('axios');

(async () => {
    const app = express()

    app.use(express.json());

    const port = process.env.API_PORT || 80

    let i = 0

    app.listen(port, () => {
        console.log(`API iniciada. Escutando PORT ${port}`)
    })

    app.use((req, res, next) => {
        i++;
        next();
    })

    app.get('/', async (req, res) => {
        const response = { 'message': "API OK!", 'request_id': i }
        console.log(response)
        res.send(response)
    })

    app.post('/time', async (req, res) => {
        const delay = req.body.delay
        const response = { 'message': "Request Executado!", 'request_id': i, 'delay': delay }

        try {
            const apiRes = await axios({
                url: 'http://worldtimeapi.org/api/timezone/America/Sao_Paulo',
                method: 'GET'
            })
            response.time = apiRes.data

        } catch (e) {
            response.error = e
        }
    })

})()
