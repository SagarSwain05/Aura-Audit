// Supplementary seed — the main demo batch (seedTridentDemo.js) never
// produced a student scoring below 40, so the Intervention tab had nothing
// real to demonstrate against. Adds a small number of genuinely low-score
// demo students (few skills, low/no CGPA) spread across the three risk
// tiers. Run once: MONGO_URI="..." node scripts/seedAtRiskDemo.js

require('dotenv').config();
const mongoose = require('mongoose');
const University = require('../src/models/University');
const Student = require('../src/models/Student');
const User = require('../src/models/User');
const { normalize } = require('../src/utils/universityMatcher');

const FIRST_NAMES = ['Ankit', 'Bijay', 'Chinmay', 'Debasis', 'Jyoti', 'Lipika', 'Mamata', 'Niranjan', 'Omkar', 'Pratik'];
const LAST_NAMES = ['Barik', 'Malik', 'Naik', 'Sethi', 'Samal', 'Pati', 'Biswal', 'Acharya'];
const DEPARTMENTS = ['cse', 'it', 'ece', 'eee', 'mechanical', 'civil'];
const SKILL_POOL = ['C Programming', 'MS Office', 'Communication', 'Basic Python'];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Target score bands: critical <20, high 20-29, medium 30-39
const RISK_PROFILES = [
  { count: 3, cgpaRange: [4.0, 5.2], skillCount: 0 },  // critical
  { count: 3, cgpaRange: [5.0, 5.8], skillCount: 1 },  // high
  { count: 3, cgpaRange: [5.5, 6.3], skillCount: 2 },  // medium
];

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI not set');
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const unis = await University.find({});
  const trident = unis.find((d) => normalize(d.name) === normalize('Trident Academy of Technology'));
  if (!trident) throw new Error('Trident Academy of Technology not found — run seedTridentDemo.js first');

  let created = 0;
  for (const profile of RISK_PROFILES) {
    for (let i = 0; i < profile.count; i++) {
      const firstName = rand(FIRST_NAMES);
      const lastName = rand(LAST_NAMES);
      const name = `${firstName} ${lastName}`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.risk${created}@aura-audit-demo.test`;
      if (await User.findOne({ email })) { created++; continue; }

      const dept = rand(DEPARTMENTS);
      const cgpa = Number((Math.random() * (profile.cgpaRange[1] - profile.cgpaRange[0]) + profile.cgpaRange[0]).toFixed(2));
      const skills = SKILL_POOL.slice(0, profile.skillCount).map((s) => ({
        name: s, level: 'beginner', category: 'technical', source: 'manual',
      }));

      const user = await User.create({
        name, email, password: Math.random().toString(36).slice(-10),
        role: 'student', university: trident._id, isEmailVerified: true,
      });

      const score = Math.round((cgpa / 10) * 40 + skills.length * 8 + randInt(0, 5));
      await Student.create({
        userId: user._id, name, email, department: dept,
        rollNumber: `TATRISK${created}`, year: randInt(2, 4), cgpa,
        university: trident._id, skills,
        careerReadinessScore: Math.min(score, 39),
        profileCompleted: skills.length > 0,
        isDemo: true,
      });
      created++;
    }
  }
  console.log(`At-risk demo students created: ${created}`);

  const students = await Student.find({ university: trident._id });
  const avgScore = students.length ? Math.round(students.reduce((s, x) => s + (x.careerReadinessScore || 0), 0) / students.length) : 0;
  await University.updateOne({ _id: trident._id }, { $set: { totalStudents: students.length, avgAuraScore: avgScore } });
  console.log(`Trident totals updated: ${students.length} students, avg score ${avgScore}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
