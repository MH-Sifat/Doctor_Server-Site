const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 3000;
const app = express()

// midleware
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@practice.ltifab8.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        const database = client.db('DoctorsPortal');
        const appointmentCollection = database.collection('appointmentOptions');

        app.get('/appointmentoptions', async (req, res) => {
            const query = {};
            const result = await appointmentCollection.find(query).toArray();
            res.send(result)
        })
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('Hello Doctor Portal!!!')
})

app.listen(port, () => {
    console.log(`Our Server is Runniung on port ${port}`)
})