import { MongoClient } from "mongodb";

const uri = process.env.MONGO_URI
const dbName = process.env.MONGO_DB_NAME
const collectionName = process.env.MONGO_DB_COLLECTION_NAME
const client = new MongoClient(uri);

async function removeDuplicateJobs() {
    try {
        await client.connect();
        const db = client.db(dbName);
        const jobs = db.collection(collectionName);

        const duplicates = await jobs.aggregate([
            {
                $group: {
                    _id: { jobId: "$jobId" },
                    ids: { $push: "$_id" },
                    count: { $sum: 1 }
                }
            },
            { $match: { count: { $gt: 1 } } }
        ]).toArray();

        for (const doc of duplicates) {
            doc.ids.shift();
            await jobs.deleteMany({ _id: { $in: doc.ids } });
        }

        console.log(`Removed duplicates from ${duplicates.length} groups`);
    } finally {
        await client.close();
    }
}

removeDuplicateJobs();
