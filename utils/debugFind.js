// utils/debugFind.js
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB_NAME;
const collectionName = process.env.MONGO_DB_COLLECTION_NAME;

const [, , idArg, titleArg] = process.argv;

async function main() {
	const client = new MongoClient(uri);
	await client.connect();
	console.log("Connected", { dbName, collectionName });
	const col = client.db(dbName).collection(collectionName);

	if (idArg) {
		console.log("-- Lookup by _id --", idArg);
		try {
			const byObjId = await col.findOne({ _id: new ObjectId(idArg) });
			console.log("_id as ObjectId:", summarize(byObjId));
		} catch (e) {
			console.log("_id as ObjectId: error", e.message);
		}
		const byStrId = await col.findOne({ _id: idArg });
		console.log("_id as string:", summarize(byStrId));
	}

	if (titleArg) {
		console.log("-- Lookup by title --", titleArg);
		const exact = await col.findOne({ title: titleArg });
		console.log("title exact:", summarize(exact));
		const ci = await col.findOne({ title: { $regex: `^${escapeRegex(titleArg)}$`, $options: "i" } });
		console.log("title ci:", summarize(ci));
		const contains = await col.find({ title: { $regex: escapeRegex(titleArg), $options: "i" } }).limit(10).toArray();
		console.log("title contains count:", contains.length);
		contains.forEach((d, i) => console.log(`#${i + 1}:`, d.title, "@", d.company || d.companyName));
	}

	// Sample: show any docs for company like Softtech
	const soft = await col.find({ $or: [
		{ company: { $regex: "softtech", $options: "i" } },
		{ companyName: { $regex: "softtech", $options: "i" } }
	]}).project({ title: 1, company: 1, companyName: 1 }).limit(10).toArray();
	console.log("softtech matches:", soft.map(d => `${d.title} @ ${d.company || d.companyName}`));

	// Deep scan across all DBs/collections if not found
	if (!soft.length && !idArg && !titleArg) {
		console.log("No args provided; skipping deep scan.");
		await client.close();
		return;
	}

	console.log("Starting deep scan across all databases and collections...");
	const admin = client.db().admin();
	const dbs = await admin.listDatabases();
	for (const dbInfo of dbs.databases) {
		const d = client.db(dbInfo.name);
		let colls = [];
		try { colls = await d.listCollections().toArray(); } catch { continue; }
		for (const cInfo of colls) {
			const c = d.collection(cInfo.name);
			let found = null;
			// Try by id
			if (idArg) {
				try { found = await c.findOne({ _id: new ObjectId(idArg) }); } catch {}
				if (!found) found = await c.findOne({ _id: idArg });
			}
			// Try by title
			if (!found && titleArg) {
				found = await c.findOne({ title: { $regex: titleArg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } });
			}
			if (found) {
				console.log("FOUND in:", dbInfo.name, cInfo.name, summarize(found));
				await client.close();
				return;
			}
		}
	}
	console.log("Deep scan completed: no matches found with given inputs.")

	await client.close();
}

function escapeRegex(str) {
	return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function summarize(doc) {
	if (!doc) return null;
	return { _id: doc._id, title: doc.title, company: doc.company, companyName: doc.companyName };
}

main().catch(e => {
	console.error(e);
	process.exit(1);
});


