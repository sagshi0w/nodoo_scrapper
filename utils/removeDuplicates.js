// utils/removeDuplicates.js
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB_NAME;
const collectionName = process.env.MONGO_DB_COLLECTION_NAME;

console.log("uri=", uri);
console.log("dbName=", dbName);
console.log("collectionName=", collectionName);

async function removeDuplicateJobs() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        console.log("Connected to MongoDB");

        const db = client.db(dbName);
        const jobs = db.collection(collectionName);

        // Step 1: Find duplicates based on title + companyName
        // const duplicates = await jobs.aggregate([
        //     {
        //         $group: {
        //             _id: { title: "$title", company: "$company" },
        //             ids: { $push: "$_id" },
        //             count: { $sum: 1 }
        //         }
        //     },
        //     { $match: { count: { $gt: 1 } } }
        // ]).toArray();

        // const duplicates = await jobs.aggregate([
        //     { $match: { title: "Senior Engineer" } },
        //     {
        //         $group: {
        //             _id: "$title",
        //             ids: { $push: "$_id" },
        //             count: { $sum: 1 }
        //         }
        //     },
        //     { $match: { count: { $gt: 1 } } }
        // ]).toArray();

        const duplicates = await jobs.aggregate([
            {
                $project: {
                    normalizedTitle: {
                        $trim: {
                            input: { $toLower: "$title" }
                        }
                    }
                }
            },
            {
                $group: {
                    _id: "$normalizedTitle",
                    count: { $sum: 1 },
                    ids: { $push: "$_id" }
                }
            },
            { $match: { count: { $gt: 1 } } }
        ]).toArray();

        console.log(duplicates);


        if (duplicates.length === 0) {
            console.log("✅ No duplicates found");
            return;
        }

        console.log(`Found ${duplicates.length} duplicate groups`);

        // Step 2: Remove all except first in each duplicate group
        for (const dup of duplicates) {
            dup.ids.shift();
            //await jobs.deleteMany({ _id: { $in: dup.ids } });
        }

        console.log("✅ Duplicates removed successfully");
    } catch (err) {
        console.error("Error removing duplicates:", err);
    } finally {
        await client.close();
    }
}

removeDuplicateJobs();
