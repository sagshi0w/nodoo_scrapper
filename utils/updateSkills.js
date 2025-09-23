// utils/updateSkills.js
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import extractSkillsAndExperience from "./extractData.js";

dotenv.config();

let uri = process.env.MONGO_URI;
let dbName = process.env.MONGO_DB_NAME;
let collectionName = process.env.MONGO_DB_COLLECTION_NAME;

function getFlag(name) {
	const idx = process.argv.indexOf(name);
	if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
	return null;
}

async function updateJobSkills(titleInput, companyInput) {
	// Optional CLI overrides
	uri = getFlag("--uri") || uri;
	dbName = getFlag("--db") || dbName;
	collectionName = getFlag("--col") || collectionName;

	const runAll = process.argv.includes("--all");
	const filterTitleContains = getFlag("--title");
	const filterCompanyContains = getFlag("--company");
	if (!uri || !dbName || !collectionName) {
		console.error("Missing Mongo env vars. Ensure MONGO_URI, MONGO_DB_NAME, MONGO_DB_COLLECTION_NAME are set.");
		process.exit(1);
	}

	if (!runAll && !titleInput) {
		console.error("Usage: node utils/updateSkills.js \"<job title>\" [\"<company name>\"] | --all [--title <contains>] [--company <contains>]");
		process.exit(1);
	}

	const client = new MongoClient(uri);
	try {
		await client.connect();
		console.log("Connected to MongoDB");
		console.log(`DB: ${dbName}, Collection: ${collectionName}`);

		const db = client.db(dbName);
		const jobs = db.collection(collectionName);

		if (runAll) {
			const filter = {};
			if (filterTitleContains) {
				filter.title = { $regex: filterTitleContains, $options: "i" };
			}
			if (filterCompanyContains) {
				filter.$or = [
					...(filter.$or || []),
					{ company: { $regex: filterCompanyContains, $options: "i" } },
					{ companyName: { $regex: filterCompanyContains, $options: "i" } }
				];
			}

			let processed = 0, updated = 0, unchanged = 0;
			const cursor = jobs.find(filter, { projection: { description: 1, title: 1, company: 1 } });
			while (await cursor.hasNext()) {
				const job = await cursor.next();
				processed++;
				const enriched = extractSkillsAndExperience({
					...job,
					description: typeof job.description === "string" ? job.description : ""
				});
				const newSkills = Array.isArray(enriched.skills) ? enriched.skills : [];
				const shouldUpdate = !arraysEqualUnordered(job.skills || [], newSkills);
				if (shouldUpdate) {
					await jobs.updateOne({ _id: job._id }, { $set: { skills: newSkills } });
					updated++;
				} else {
					unchanged++;
				}
				if (processed % 100 === 0) {
					console.log(`Progress: processed=${processed}, updated=${updated}, unchanged=${unchanged}`);
				}
			}
			console.log(`Done. processed=${processed}, updated=${updated}, unchanged=${unchanged}`);
			return;
		}

		// Try by _id if provided via flag or if titleInput looks like ObjectId and no company
		let job = null;
		const isIdFlag = titleInput === "--id" && companyInput;
		const looksLikeId = /^[a-fA-F0-9]{24}$/.test(titleInput) && !companyInput;
		if (isIdFlag || looksLikeId) {
			const idStr = isIdFlag ? companyInput : titleInput;
			try {
				job = await jobs.findOne({ _id: new ObjectId(idStr) });
			} catch {}
			// Fallback: some collections store _id as string
			if (!job) {
				job = await jobs.findOne({ _id: idStr });
			}
		}

		// Try exact match first; fallback to case-insensitive trimmed match
		if (!job) {
			if (companyInput) {
				const exactFilter = { title: titleInput, company: companyInput };
				job = await jobs.findOne(exactFilter);
			} else {
				job = await jobs.findOne({ title: titleInput });
			}
		}

		if (!job) {
			const ciFilter = companyInput
				? {
					title: { $regex: `^${escapeRegex(titleInput.trim())}$`, $options: "i" },
					company: { $regex: `^${escapeRegex(companyInput.trim())}$`, $options: "i" }
				}
				: {
					title: { $regex: `^${escapeRegex(titleInput.trim())}$`, $options: "i" }
				};
			job = await jobs.findOne(ciFilter);
		}

		// Third attempt: contains search (case-insensitive)
		if (!job) {
			const containsFilter = companyInput
				? {
					$and: [
						{ title: { $regex: escapeRegex(titleInput.trim()), $options: "i" } },
						{ $or: [
							{ company: { $regex: escapeRegex(companyInput.trim()), $options: "i" } },
							{ companyName: { $regex: escapeRegex(companyInput.trim()), $options: "i" } }
						]}
					]
				}
				: { title: { $regex: escapeRegex(titleInput.trim()), $options: "i" } };
			let candidates = await jobs.find(containsFilter).limit(10).toArray();
			// Fourth attempt: tokenized fuzzy match
			if (candidates.length === 0) {
				const titleTokens = tokenize(titleInput);
				const titleAndClauses = titleTokens.map(t => ({ title: { $regex: escapeRegex(t), $options: "i" } }));
				const tokenFilter = companyInput
					? {
						$and: [
							...titleAndClauses,
							{ $or: [
								{ company: { $regex: escapeRegex(companyInput), $options: "i" } },
								{ companyName: { $regex: escapeRegex(companyInput), $options: "i" } }
							]}
						]
					}
					: { $and: [...titleAndClauses] };
				candidates = await jobs.find(tokenFilter).limit(10).toArray();
			}
			if (candidates.length > 0) {
				if (candidates.length > 1) {
					console.log(`Found ${candidates.length} candidates; using the first match.`);
					candidates.forEach((c, idx) => console.log(`#${idx + 1}:`, c.title, "@", c.company));
				}
				job = candidates[0];
			}
		}

		if (!job) {
			console.log(companyInput ? "No job found for given title and company." : "No job found for given title.");
			// Diagnostics: show nearby candidates to help refine inputs
			if (companyInput) {
				const companyOnly = await jobs
					.find({ $or: [
						{ company: { $regex: escapeRegex(companyInput.trim()), $options: "i" } },
						{ companyName: { $regex: escapeRegex(companyInput.trim()), $options: "i" } }
					] })
					.project({ title: 1, company: 1, companyName: 1 })
					.limit(10)
					.toArray();
				if (companyOnly.length > 0) {
					console.log("Found jobs with matching company:");
					companyOnly.forEach((c, i) => console.log(`#${i + 1}:`, c.title, "@", c.company || c.companyName));
				}
			}

			const titleOnly = await jobs
				.find({ title: { $regex: escapeRegex(titleInput.trim()), $options: "i" } })
				.project({ title: 1, company: 1 })
				.limit(10)
				.toArray();
			if (titleOnly.length > 0) {
				console.log("Found jobs with matching title:");
				titleOnly.forEach((c, i) => console.log(`#${i + 1}:`, c.title, "@", c.company));
			}
			if (companyInput) {
				// Broader diagnostics: search for companies containing part of provided company
				const firstToken = tokenize(companyInput)[0] || companyInput;
				const softCo = await jobs
					.aggregate([
						{ $match: { $or: [ { company: { $regex: firstToken, $options: "i" } }, { companyName: { $regex: firstToken, $options: "i" } } ] } },
						{ $project: { company: 1, companyName: 1, title: 1 } },
						{ $limit: 20 }
					])
					.toArray();
				if (softCo.length > 0) {
					console.log(`Companies similar to '${firstToken}':`);
					softCo.forEach((c, i) => console.log(`#${i + 1}:`, c.title, "@", c.company || c.companyName));
				}
			}
			return;
		}

		// Compute skills using existing extractor
		const enriched = extractSkillsAndExperience({
			...job,
			// Ensure description is a string for the extractor
			description: typeof job.description === "string" ? job.description : ""
		});
		const newSkills = Array.isArray(enriched.skills) ? enriched.skills : [];

		// Update only if there is a change
		const shouldUpdate = !arraysEqualUnordered(job.skills || [], newSkills);
		if (!shouldUpdate) {
			console.log("Skills already up to date.");
			return;
		}

		const result = await jobs.findOneAndUpdate(
			{ _id: job._id },
			{ $set: { skills: newSkills } },
			{ returnDocument: "after" }
		);

		console.log(`Updated skills for job: ${result.value?.title} @ ${result.value?.company}`);
		console.log("New skills:", newSkills);
	} catch (err) {
		console.error("Error updating skills:", err);
	} finally {
		await client.close();
	}
}

function escapeRegex(str) {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tokenize(str) {
	return String(str)
		.toLowerCase()
		.split(/[^a-z0-9+]+/i)
		.filter(s => s && s.length >= 2);
}

function arraysEqualUnordered(a, b) {
	if (a.length !== b.length) return false;
	const setA = new Set(a);
	for (const item of b) {
		if (!setA.has(item)) return false;
	}
	return true;
}

// Entry
const [, , titleArg, companyArg] = process.argv;
updateJobSkills(titleArg, companyArg);


