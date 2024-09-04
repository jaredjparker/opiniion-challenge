const { MongoClient } = require('mongodb');
const express = require('express');
require('dotenv').config();
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

const uri = process.env.DATABASE_URL || 'mongodb://localhost:27017';
const dbName = 'opiniiontestdb';

const client = new MongoClient(uri);

async function main() {
    try {
        await client.connect();

        const db = client.db(dbName);
        const customerLogs = db.collection("customerLogs");
        const locations = db.collection("locations");

        app.get('/', (req, res) => {
            res.send('Opiniion Test');
        });

        app.get('/locations', cors(), async (req, res) => {
            const allLocations = await locations.find().project({ _id: 0, createdDate: 0 }).toArray();
            res.json(allLocations);
        });

        app.post('/opiniionTest', async (req, res) => {
            const reqLocationId = req.body.locationId;
            const reqStartDate = req.body.startDate;
            const reqEndDate = req.body.endDate;
            const logs = await customerLogs.aggregate([
                {
                    $lookup: {
                        from: "customers",
                        localField: "customerId",
                        foreignField: "customerId",
                        pipeline: [{ $project: { _id: 0, locationId: 1, firstName: 1, lastName: 1 }}],
                        as: "customer"
                    }
                },
                {
                    $project: { _id: 0 }
                },
                {
                    $unwind: "$customer"
                },
                {
                    $match: {
                        "customer.locationId": reqLocationId,
                        "date": {
                            $gte: new Date(reqStartDate),
                            $lt: new Date(reqEndDate)
                        }
                    }
                },
                {
                    $group: {
                        _id: "$customerId",
                        logs: { 
                            $push: {
                                customerId: "$customerId",
                                type: "$type",
                                text: "$text",
                                date: "$date",
                                customer: {
                                    locationId: "$customer.locationId",
                                    firstName: "$customer.firstName",
                                    lastName: "$customer.lastName"
                                }
                            } 
                        }
                    }
                }
            ]).toArray();
            res.json(logs);
        });

        app.listen(port, () => {
            console.log(`Server is running at http://localhost:${port}`);
        });

    } catch (err) {
        console.error(err);
    }
}

main().catch(console.error);
