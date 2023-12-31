const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SK)
const port = process.env.PORT || 3000;
const app = express()

// midleware
app.use(cors());
app.use(express.json());
app.use(fileUpload());


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
        const bookingCollection = database.collection('booking');
        const usersCollection = database.collection('Users');
        const doctorsCollection = database.collection('Doctors');
        const paymentCollection = database.collection('payments');


        app.get('/appointmentoptions', async (req, res) => {
            const date = req.query.date;
            const query = {};
            const options = await appointmentCollection.find(query).toArray();
            const bookingQuery = { appointmentDate: date };
            const alreadyBooked = await bookingCollection.find(bookingQuery).toArray();

            options.forEach(option => {
                const optionBooked = alreadyBooked.filter(book => book.treatment === option.name);

                const bookedSlots = optionBooked.map(book => book.slot)

                const remainingSlots = option.slots.filter(slot => !bookedSlots.includes(slot));
                option.slots = remainingSlots;
            })
            res.send(options)
        })

        // get specific option from database collection
        app.get('/appointmentSpecialty', async (req, res) => {
            const query = {};
            const result = await appointmentCollection.find(query).project({ name: 1 }).toArray();
            res.send(result);

        })



        app.get('/bookings', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const bookings = await bookingCollection.find(query).toArray();
            res.send(bookings)
        });


        app.post('/booking', async (req, res) => {
            const booking = req.body;
            const query = {
                appointmentDate: booking.appointmentDate,
                email: booking.email,
                treatment: booking.treatment
            }
            const alreadyBooked = await bookingCollection.find(query).toArray();
            if (alreadyBooked.length) {
                const message = `You already have an appointment booked on ${booking.appointmentDate}`;
                return res.send({ acknowledged: false, message })
            }
            const result = await bookingCollection.insertOne(booking);
            res.send(result)
        })

        app.get('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const booking = await bookingCollection.findOne(query);
            res.send(booking)
        })

        // user related 
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result)
        })

        app.get('/users', async (req, res) => {
            const query = {};
            const users = await usersCollection.find(query).toArray();
            res.send(users)
        })

        // admin by click
        app.put('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        })

        app.delete('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result)
        })

        // admin check by email

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' })

        })

        // doctors added image hosting in imagebb 
        // app.post('/doctors', async (req, res) => {
        //     const doctor = req.body;
        //     const result = await doctorsCollection.insertOne(doctor);
        //     res.send(result)

        // })


        // doctors added image hosting in server 
        app.post('/doctors', async (req, res) => {
            const name = req.body.name;
            const email = req.body.email;
            const specialty = req.body.specialty;

            const image = req.files.image;
            const imageData = image.data;
            const enCodeImage = imageData.toString('base64');
            const imageBuffer = Buffer.from(enCodeImage, 'base64');

            const doctor = {
                name,
                email,
                specialty,
                image: imageBuffer
            }

            const result = await doctorsCollection.insertOne(doctor);
            res.send(result)
        })

        app.get('/doctors', async (req, res) => {
            const query = {};
            const doctors = await doctorsCollection.find(query).toArray();
            res.send(doctors)
        })

        app.delete('/doctors/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await doctorsCollection.deleteOne(filter);
            res.send(result)

        })

        // temporary for price add
        // app.get('/price', async (req, res) => {
        //     const filter = {};
        //     const option = { upsert: true }
        //     const updateDoc = {
        //         $set: {
        //             price: 2000
        //         }
        //     }
        //     const result = await appointmentCollection.updateMany(filter, updateDoc, option)
        //     res.send(result)
        // })


        // payment method add
        app.post("/create-payment-intent", async (req, res) => {
            const booking = req.body;
            const price = booking.price;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                "payment_method_types": [
                    "card"
                ],
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        })

        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentCollection.insertOne(payment);
            const id = payment.bookingId;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updatedResult = await bookingCollection.updateOne(filter,updatedDoc);
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