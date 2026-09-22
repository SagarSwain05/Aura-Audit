// Seeds realistic Hiring Pipeline / AI Matching / Analytics data on the
// company side. Before this: 3 companies (1 real — "Savvy Swell" — plus 2
// fully-demo), 1 job total, 0 applications anywhere, so Pipeline/Analytics/
// AI-Match all rendered empty states site-wide.
//
// Applies ONLY from the existing isDemo:true student pool (never a real
// student) — same trust boundary already established for the Intervention
// demo data. Real jobs get real (if synthetic) applicant volume without
// misrepresenting any actual person as having applied anywhere.
//
// Run once: MONGO_URI="..." node scripts/seedCompanyDemoData.js

require('dotenv').config();
const mongoose = require('mongoose');
const Company = require('../src/models/Company');
const Job = require('../src/models/Job');
const JobApplication = require('../src/models/JobApplication');
const Student = require('../src/models/Student');

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr, n) => [...arr].sort(() => Math.random() - 0.5).slice(0, n);

// Weighted so most land 'applied'/'shortlisted' — a realistic funnel shape,
// not an even split, and never more than a couple 'selected' per job.
function weightedStatus(index, total) {
  const pct = index / total;
  if (pct < 0.5) return 'applied';
  if (pct < 0.75) return 'shortlisted';
  if (pct < 0.88) return 'interview_scheduled';
  if (pct < 0.93) return 'selected';
  if (pct < 0.97) return 'rejected';
  return 'on_hold';
}

function matchScore(student, jobSkills) {
  const studentSkills = student.skills.map((s) => s.name.toLowerCase());
  const jSkills = jobSkills.map((s) => s.toLowerCase());
  const matched = jSkills.filter((s) => studentSkills.includes(s));
  return Math.round((matched.length / Math.max(jSkills.length, 1)) * 70 + (student.cgpa / 10) * 30);
}

async function seedApplicationsForJob(job, students, count) {
  const candidates = pick(students, Math.min(count, students.length));
  let created = 0;
  for (let i = 0; i < candidates.length; i++) {
    const student = candidates[i];
    const existing = await JobApplication.findOne({ student: student._id, job: job._id });
    if (existing) continue;
    await JobApplication.create({
      student: student._id,
      job: job._id,
      company: job.company,
      matchScore: matchScore(student, job.skills),
      status: weightedStatus(i, candidates.length),
      appliedAt: new Date(Date.now() - randInt(1, 150) * 24 * 60 * 60 * 1000),
    });
    created++;
  }
  await Job.findByIdAndUpdate(job._id, { $set: { applicationsCount: await JobApplication.countDocuments({ job: job._id }) } });
  return created;
}

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI not set');
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const students = await Student.find({ isDemo: true, 'skills.0': { $exists: true } });
  if (students.length === 0) throw new Error('No isDemo students with skills found — run seedTridentDemo.js first');
  console.log(`Found ${students.length} demo students to draw applicants from`);

  // Demo companies get a job each (if they don't already have one) so their
  // own Pipeline/AI-Match/Analytics pages are functional too, not just the
  // one real company's.
  const demoCompanies = await Company.find({ email: /aura-audit-demo\.test$/ });
  const DEMO_JOB_SPECS = {
    'Nimbus Cloud Systems (Demo)': {
      title: 'Cloud Infrastructure Engineer',
      description: 'Own our multi-region deployment pipeline and cloud cost optimization.',
      skills: ['AWS', 'Docker', 'Cloud Computing', 'Linux', 'Python'],
      location: 'Bangalore, India', workMode: 'hybrid', minCGPA: 6.5,
    },
    'BrightPath Analytics (Demo)': {
      title: 'Data Analyst',
      description: 'Turn raw product data into decisions the whole team can act on.',
      skills: ['SQL', 'Python', 'Data Structures', 'MongoDB'],
      location: 'Remote', workMode: 'remote', minCGPA: 6.0,
    },
  };

  let totalApplications = 0;
  const summary = [];

  for (const company of demoCompanies) {
    const spec = DEMO_JOB_SPECS[company.name];
    if (!spec) continue;
    let job = await Job.findOne({ company: company._id, title: spec.title });
    if (!job) {
      job = await Job.create({
        company: company._id,
        title: spec.title,
        description: spec.description,
        skills: spec.skills,
        location: spec.location,
        workMode: spec.workMode,
        type: 'Full-time',
        jobType: 'Fresher',
        minCGPA: spec.minCGPA,
        status: 'active',
        openings: randInt(2, 5),
      });
      console.log(`Created job "${job.title}" for ${company.name}`);
    }
    const created = await seedApplicationsForJob(job, students, randInt(12, 18));
    totalApplications += created;
    summary.push(`${company.name} — "${job.title}": ${created} applications`);
  }

  // Real (non-demo) companies' active jobs — applicants are still
  // exclusively isDemo students, per the trust boundary noted above.
  // Explicitly excludes demo-company jobs rather than picking any single
  // active job — findOne({status:'active'}) is not ordering-safe once
  // there's more than one, and previously silently matched a demo job here.
  const realCompanyIds = (await Company.find({ email: { $not: /aura-audit-demo\.test$/ } }).select('_id')).map((c) => c._id);
  const realJobs = await Job.find({ status: 'active', company: { $in: realCompanyIds } }).populate('company', 'name');
  for (const job of realJobs) {
    const created = await seedApplicationsForJob(job, students, randInt(15, 22));
    totalApplications += created;
    summary.push(`${job.company.name} — "${job.title}": ${created} applications`);
  }

  console.log('\nApplications created:');
  summary.forEach((s) => console.log('  ' + s));
  console.log(`\nTotal new applications: ${totalApplications}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
