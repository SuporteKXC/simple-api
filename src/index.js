
const AWSXRay = require('aws-xray-sdk');
AWSXRay.captureHTTPsGlobal(require('http'));


const { Client } = AWSXRay.capturePostgres(require('pg'))
const express = require('express');
const axios = require('axios');

(async () => {
    const app = express()

    app.use(AWSXRay.express.openSegment('simple-api'));

    app.use(express.json());

    const port = process.env.API_PORT || 3000
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

    app.post('/process', async (req, res) => {
        const delay = req.body.delay
        const response = { 'message': "Processado!", 'request_id': i, 'delay': delay }

        console.log('Processando...')

        AWSXRay.captureAsyncFunc('process-data', function (subsegment) {
            setTimeout(() => {

                console.log('Processado!')

                subsegment.close();
                res.send(response)

            }, delay ? 1000 : 200)
        });
    })

    app.post('/time', async (req, res) => {
        const delay = req.body.delay
        const response = { 'message': "Request Executado!", 'request_id': i, 'delay': delay }

        const apiRes = await axios({
            url: 'http://worldtimeapi.org/api/timezone/America/Sao_Paulo',
            method: 'GET'
        })

        response.time = apiRes.data

        AWSXRay.captureAsyncFunc('process-api-result', function (subsegment) {

            setTimeout(() => {
                console.log('Processado!')

                subsegment.close();

                res.send(response)

            }, delay ? 1000 : 200)

        });

    })

    app.get('/connect', async (req, res) => {
        try {
            const client = new Client({
                host: process.env.DB_HOST,
                port: process.env.DB_PORT || 5432,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
            })
            await client.connect()

            const result = await client.query('SELECT version()')

            // Retrieve the most recently created subsegment
            const subs = AWSXRay.getSegment().subsegments;

            if (subs && subs.length > 0) {
                var sqlSub = subs[subs.length - 1];
                sqlSub.sql.sanitized_query = queryString;
            }

            const version = result.rows[0].version

            await client.end()

            const response = { 'message': "Conectado ao banco", 'version': version, 'request_id': i }
            console.log(response)
            res.send(response)
        } catch (e) {
            const error = { 'message': 'Erro ao se conectar ao banco', 'request_id': i }
            console.log(error)
            console.log(e)

            res.status(500);
            res.send(error)
        }
    })

    app.use(AWSXRay.express.closeSegment());
})()
