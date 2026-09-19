// One-time seed/migration script — run manually against production:
//   MONGO_URI="..." node scripts/seedTridentDemo.js
//
// 1. Seeds the university/college catalog (unclaimed placeholders).
// 2. Corrects the real Trident Academy of Technology TPO account, which was
//    registered with its affiliating university's name ("Biju Patnaik
//    University of Technology, Rourkela") in the institution-name field —
//    relinks it as a College correctly affiliated to BPUT.
// 3. Migrates any student with no university set onto Trident (the user's
//    explicit ask: "whatever accounts available for students add them
//    under Trident Academy").
// 4. Generates realistic demo student records for Trident across multiple
//    departments and batch years, some marked placed with real-looking
//    (but fictional) placement details, then lists a portion as verified
//    alumni — so Home/Students/Employability/Intervention/Placements/
//    Alumni Connect all have real data to show instead of being empty.
// 5. Seeds a couple of demo pending-KYC companies for Company Approval.
// 6. Seeds a few demo placement notices for the notice board.

require('dotenv').config();
const mongoose = require('mongoose');

const University = require('../src/models/University');
const Student = require('../src/models/Student');
const User = require('../src/models/User');
const Company = require('../src/models/Company');
const Notice = require('../src/models/Notice');
const Alumni = require('../src/models/Alumni');
const { UNIVERSITIES, COLLEGES } = require('../src/data/universityCatalog');
const { normalize } = require('../src/utils/universityMatcher');

const FIRST_NAMES = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Krishna', 'Ishaan', 'Rohan',
  'Ananya', 'Diya', 'Saanvi', 'Aadhya', 'Myra', 'Pari', 'Anika', 'Navya', 'Kiara', 'Riya',
  'Rahul', 'Amit', 'Suresh', 'Priya', 'Sneha', 'Pooja', 'Rajesh', 'Vikram', 'Neha', 'Deepak',
  'Swati', 'Manoj', 'Kavya', 'Nikhil', 'Shreya', 'Abhishek', 'Divya', 'Karan', 'Ritu', 'Sandeep'];
const LAST_NAMES = ['Sahoo', 'Patra', 'Nayak', 'Mohanty', 'Panda', 'Behera', 'Das', 'Rout', 'Jena', 'Pradhan',
  'Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Mishra', 'Tripathy', 'Swain', 'Dash', 'Bhoi'];
const DEPARTMENTS = ['cse', 'it', 'ece', 'eee', 'mechanical', 'civil'];
const SKILL_POOL = {
  cse: ['JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL', 'Git', 'Data Structures', 'DBMS', 'MongoDB'],
  it: ['Python', 'Java', 'SQL', 'Networking', 'Linux', 'Cloud Computing', 'AWS', 'Docker', 'Git', 'REST APIs'],
  ece: ['C Programming', 'MATLAB', 'VLSI', 'Embedded Systems', 'Signal Processing', 'Microcontrollers', 'IoT'],
  eee: ['MATLAB', 'Power Systems', 'C Programming', 'Circuit Design', 'PLC', 'AutoCAD Electrical'],
  mechanical: ['AutoCAD', 'SolidWorks', 'Thermodynamics', 'CAD/CAM', 'Manufacturing', 'ANSYS'],
  civil: ['AutoCAD', 'Structural Analysis', 'Surveying', 'Project Management', 'Revit', 'STAAD Pro'],
};
const COMPANIES = ['TCS', 'Infosys', 'Wipro', 'Accenture', 'Cognizant', 'HCLTech', 'Tech Mahindra', 'Capgemini',
  'IBM', 'L&T Infotech', 'Mindtree', 'Genpact'];
const ROLES = ['Software Engineer', 'Associate Software Engineer', 'Systems Engineer', 'Analyst', 'Graduate Trainee'];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max, decimals = 2) => Number((Math.random() * (max - min) + min).toFixed(decimals));

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI not set');
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  // ── 1. Seed the university catalog ──────────────────────────────────
  // Fetch once and keep it updated locally — avoids a DB round trip per
  // catalog entry across ~200 entries.
  let cachedUnis = await University.find({});
  let uniCreated = 0;
  for (const u of UNIVERSITIES) {
    const target = normalize(u.name);
    const existing = cachedUnis.find((d) => normalize(d.name) === target);
    if (existing) continue;
    const doc = await University.create({ name: u.name, state: u.state, location: u.city, type: 'university' });
    cachedUnis.push(doc);
    uniCreated++;
  }
  console.log(`Universities: ${uniCreated} created, ${UNIVERSITIES.length - uniCreated} already present`);

  // ── 2. Fix the real Trident Academy of Technology account ──────────
  cachedUnis = await University.find({}); // refresh after step 1's inserts
  const misnamedTrident = cachedUnis.find((d) =>
    normalize(d.name) === normalize('Biju Patnaik University of Technology, Rourkela') && d.userId
  );
  const bput = cachedUnis.find((d) => normalize(d.name) === normalize('Biju Patnaik University of Technology'));

  let trident = cachedUnis.find((d) => normalize(d.name) === normalize('Trident Academy of Technology'));
  if (misnamedTrident && !trident) {
    misnamedTrident.name = 'Trident Academy of Technology';
    misnamedTrident.type = 'college';
    misnamedTrident.state = 'Odisha';
    misnamedTrident.location = 'Bhubaneswar';
    if (bput) misnamedTrident.parentUniversity = bput._id;
    await misnamedTrident.save();
    trident = misnamedTrident;
    console.log(`Corrected TPO-registered entry -> "Trident Academy of Technology" (affiliated to BPUT), id=${trident._id}`);
  } else if (!trident) {
    trident = await University.create({
      name: 'Trident Academy of Technology', type: 'college', state: 'Odisha', location: 'Bhubaneswar',
      parentUniversity: bput ? bput._id : null,
    });
    cachedUnis.push(trident);
    console.log(`Created Trident Academy of Technology (no prior claimed account found), id=${trident._id}`);
  }

  // ── 3. Seed remaining affiliated colleges ───────────────────────────
  let collegeCreated = 0;
  for (const c of COLLEGES) {
    if (normalize(c.name) === normalize('Trident Academy of Technology')) continue; // handled above
    const target = normalize(c.name);
    const existing = cachedUnis.find((d) => normalize(d.name) === target);
    if (existing) continue;
    const parent = cachedUnis.find((d) => normalize(d.name) === normalize(c.parentUniversityName));
    const doc = await University.create({
      name: c.name, state: c.state, location: c.city, type: 'college',
      parentUniversity: parent ? parent._id : null,
    });
    cachedUnis.push(doc);
    collegeCreated++;
  }
  console.log(`Colleges: ${collegeCreated} created`);

  // ── 4. Migrate unaffiliated students to Trident ─────────────────────
  const migrated = await Student.updateMany({ university: null }, { $set: { university: trident._id } });
  await User.updateMany({ university: null, role: 'student' }, { $set: { university: trident._id } });
  console.log(`Migrated ${migrated.modifiedCount} unaffiliated students to Trident Academy of Technology`);

  // ── 5. Generate demo students for Trident ───────────────────────────
  const DEMO_COUNT = 60;
  const currentYear = new Date().getFullYear();
  let demoCreated = 0;
  const placedDemoStudents = [];

  for (let i = 0; i < DEMO_COUNT; i++) {
    const dept = rand(DEPARTMENTS);
    const firstName = rand(FIRST_NAMES);
    const lastName = rand(LAST_NAMES);
    const name = `${firstName} ${lastName}`;
    const rollSuffix = `${1000 + i}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.demo${i}@aura-audit-demo.test`;

    const existingUser = await User.findOne({ email });
    if (existingUser) continue;

    // Spread across year 1-4 (current students) and a "just graduated" cohort
    const isGraduatedCohort = i < DEMO_COUNT * 0.3; // ~30% are recent grads (placed alumni pool)
    const year = isGraduatedCohort ? 4 : randInt(1, 4);
    const passoutYear = isGraduatedCohort ? currentYear - randInt(0, 1) : currentYear + (4 - year);
    const cgpa = randFloat(5.5, 9.6);
    const isPlaced = isGraduatedCohort && cgpa >= 6.5 && Math.random() < 0.65;

    const tempPwd = Math.random().toString(36).slice(-10);
    const user = await User.create({
      name, email, password: tempPwd, role: 'student', university: trident._id, isEmailVerified: true,
    });

    const skills = [...new Set([rand(SKILL_POOL[dept]), rand(SKILL_POOL[dept]), rand(SKILL_POOL[dept]), rand(SKILL_POOL[dept])])]
      .map((s) => ({ name: s, level: rand(['beginner', 'intermediate', 'advanced']), category: 'technical', source: 'manual' }));

    const placementDetails = isPlaced ? {
      companyName: rand(COMPANIES),
      jobRole: rand(ROLES),
      package: randFloat(3.2, 12, 1),
      joiningDate: new Date(`${passoutYear}-07-01`),
    } : undefined;

    const student = await Student.create({
      userId: user._id, name, email, department: dept, rollNumber: `TAT${passoutYear}${rollSuffix}`,
      year, cgpa, university: trident._id, skills,
      isPlaced: !!isPlaced, placementDetails,
      careerReadinessScore: Math.round((cgpa / 10) * 40 + skills.length * 8 + randInt(0, 15)),
      profileCompleted: true,
      isDemo: true,
    });

    if (isPlaced) placedDemoStudents.push(student);
    demoCreated++;
  }
  console.log(`Demo students created: ${demoCreated} (placed: ${placedDemoStudents.length})`);

  // ── 6. List placed demo students as verified alumni ─────────────────
  let alumniListed = 0;
  for (const student of placedDemoStudents) {
    const exists = await Alumni.findOne({ student: student._id });
    if (exists) continue;
    await Alumni.create({
      student: student._id,
      currentCompany: student.placementDetails.companyName,
      currentRole: student.placementDetails.jobRole,
      graduationYear: new Date(student.placementDetails.joiningDate).getFullYear(),
      experience: 0,
      skills: student.skills.map((s) => s.name),
      isAvailableForMentorship: Math.random() < 0.6,
      mentorshipAreas: Math.random() < 0.6 ? ['Interview prep', 'Resume review'] : [],
      bio: `Placed as ${student.placementDetails.jobRole} at ${student.placementDetails.companyName} — Trident Academy of Technology alumnus.`,
      verified: true,
      verifiedBy: trident._id,
    });
    alumniListed++;
  }
  console.log(`Alumni listed: ${alumniListed}`);

  // ── 7. Recompute Trident's aggregate stats ───────────────────────────
  const tridentStudents = await Student.find({ university: trident._id });
  const avgScore = tridentStudents.length
    ? Math.round(tridentStudents.reduce((s, x) => s + (x.careerReadinessScore || 0), 0) / tridentStudents.length)
    : 0;
  trident.totalStudents = tridentStudents.length;
  trident.avgAuraScore = avgScore;
  await trident.save();
  console.log(`Trident totals: ${tridentStudents.length} students, avg score ${avgScore}`);

  // ── 8. Seed a couple of pending-KYC demo companies ──────────────────
  const demoCompanies = [
    { name: 'Nimbus Cloud Systems (Demo)', industry: 'IT Services', website: 'https://nimbus-demo.example.com' },
    { name: 'BrightPath Analytics (Demo)', industry: 'Data & Analytics', website: 'https://brightpath-demo.example.com' },
  ];
  let companiesCreated = 0;
  for (const dc of demoCompanies) {
    const email = `hr.${dc.name.toLowerCase().replace(/[^a-z]/g, '')}@aura-audit-demo.test`;
    const existingUser = await User.findOne({ email });
    if (existingUser) continue;
    const user = await User.create({ name: dc.name, email, password: Math.random().toString(36).slice(-10), role: 'company', isEmailVerified: true });
    await Company.create({
      userId: user._id, name: dc.name, email, industry: dc.industry, website: dc.website,
      isVerified: false,
      kycDocuments: [{ type: 'registration_certificate', url: 'https://example.com/demo-doc.pdf', status: 'pending' }],
    });
    companiesCreated++;
  }
  console.log(`Demo companies created: ${companiesCreated}`);

  // ── 9. Seed a few demo placement notices ────────────────────────────
  const tpoUser = await User.findById(trident.userId);
  if (tpoUser) {
    const demoNotices = [
      { title: 'TCS Campus Drive — Registrations Open', type: 'placement_drive', company: 'TCS',
        message: 'TCS is conducting an on-campus drive for final year CSE/IT/ECE students. Eligibility: 60%+ throughout, no active backlogs. Bring 3 copies of your resume and a valid photo ID.',
        eventDate: new Date(Date.now() + 12 * 86400000), pinned: true },
      { title: 'Mock Interview Bootcamp (AI-Assisted)', type: 'workshop',
        message: 'A hands-on session covering HR + technical mock interviews using the platform\'s AI Interview Sim, followed by live feedback. Open to all final-year students.',
        eventDate: new Date(Date.now() + 5 * 86400000) },
      { title: 'Resume Submission Deadline — Infosys Drive', type: 'deadline', company: 'Infosys',
        message: 'Submit your updated resume via the placement cell portal before the deadline to be considered for the upcoming Infosys drive.',
        eventDate: new Date(Date.now() + 3 * 86400000) },
    ];
    let noticesCreated = 0;
    for (const n of demoNotices) {
      const existing = await Notice.findOne({ university: trident._id, title: n.title });
      if (existing) continue;
      await Notice.create({ ...n, university: trident._id, postedBy: tpoUser._id });
      noticesCreated++;
    }
    console.log(`Demo notices created: ${noticesCreated}`);
  } else {
    console.log('Skipped demo notices — no TPO user linked to Trident yet');
  }

  console.log('\nSeed complete.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
