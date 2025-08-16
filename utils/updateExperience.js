// scripts/updateExperience.js
const mongoose = require("mongoose");
const Job = require("../models/Job");

// Parse "experience" string into min and max
function parseExperience(expStr) {
  if (!expStr) return { min: null, max: null };

  const clean = expStr.toLowerCase().replace(/[^0-9\-\+]/g, "");
  let min = null, max = null;

  // Pattern: "4-5" → min=4, max=5
  if (/^\d+\-\d+$/.test(clean)) {
    const [a, b] = clean.split("-").map(Number);
    min = a;
    max = b;
  }
  // Pattern: "4+" → min=4, max=null
  else if (/^\d+\+$/.test(clean)) {
    min = parseInt(clean);
    max = null;
  }
  // Pattern: single number → min=max
  else if (/^\d+$/.test(clean)) {
    min = parseInt(clean);
    max = min;
  }

  return { min, max };
}

async function run() {
  await mongoose.connect("YOUR_MONGO_URI", {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  console.log("Connected to MongoDB");

  const jobs = await Job.find({});
  console.log(`Found ${jobs.length} jobs`);

  for (const job of jobs) {
    const { min, max } = parseExperience(job.experience);
    job.miniExperience = min;
    job.maxExperience = max;
    await job.save();
    console.log(`Updated job: ${job.title} → min=${min}, max=${max}`);
  }

  console.log("Experience fields updated.");
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  mongoose.disconnect();
});
