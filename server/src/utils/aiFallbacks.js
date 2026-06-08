const normalizeSkill = (skill) => String(skill || '').trim();

const getSkillNames = (skills = []) => (Array.isArray(skills) ? skills : String(skills || '').split(','))
  .map((skill) => (typeof skill === 'string' ? skill : skill?.name))
  .map(normalizeSkill)
  .filter(Boolean);

const makeFallbackRoadmap = (role, skills = [], days = 30) => {
  const topics = [
    `Understand ${role} responsibilities and core tools`,
    'Strengthen fundamentals and terminology',
    'Practice hands-on implementation',
    'Build a small portfolio artifact',
    'Review, document, and publish your work',
  ];
  const skillNames = getSkillNames(skills);
  const totalDays = Math.max(1, Math.min(Number(days) || 30, 60));

  return {
    skill: role,
    goal: `Be job-ready as a ${role} in ${totalDays} days`,
    total_days: totalDays,
    fallback: true,
    days: Array.from({ length: totalDays }, (_, index) => {
      const day = index + 1;
      const baseTopic = topics[index % topics.length];
      const focusSkill = skillNames[index % Math.max(skillNames.length, 1)] || role;
      return {
        day,
        topic: day % 5 === 0 ? `${role} mini-project checkpoint` : `${baseTopic}: ${focusSkill}`,
        tasks: day % 5 === 0
          ? [
              `Build a small ${role} project feature using ${focusSkill}`,
              'Write a short README covering setup, decisions, and tradeoffs',
              'Review gaps and add the next improvement task',
            ]
          : [
              `Study one practical concept in ${focusSkill}`,
              `Create notes with examples relevant to ${role}`,
              'Complete one hands-on exercise and commit the work',
            ],
        resources: [
          {
            title: `${role} learning resources`,
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${role} ${focusSkill} tutorial`)}`,
            type: 'youtube',
          },
        ],
        project_idea: day % 5 === 0 ? `Add a portfolio-ready ${focusSkill} feature for a ${role} project.` : null,
      };
    }),
  };
};

const makeFallbackAssessment = (skill, currentLevel = 'beginner', targetLevel = 'intermediate') => {
  const s = normalizeSkill(skill) || 'Software Engineering';
  const questions = [
    {
      id: 1,
      type: 'mcq',
      question: `Which activity best demonstrates practical ${s} knowledge?`,
      options: ['A) Memorizing definitions only', 'B) Building and explaining a working example', 'C) Avoiding debugging', 'D) Copying code without testing'],
      correct_answer: 'B',
      explanation: 'Practical knowledge is best shown through working implementation and explanation.',
      points: 10,
    },
    {
      id: 2,
      type: 'mcq',
      question: `When learning ${s}, what should you do after a tutorial?`,
      options: ['A) Build a variation independently', 'B) Stop practicing', 'C) Delete the code', 'D) Ignore errors'],
      correct_answer: 'A',
      explanation: 'Independent variation proves understanding beyond copying.',
      points: 10,
    },
    {
      id: 3,
      type: 'mcq',
      question: `What is the best way to debug a ${s} issue?`,
      options: ['A) Change random code', 'B) Reproduce, isolate, inspect logs, then fix', 'C) Ignore it', 'D) Rewrite everything first'],
      correct_answer: 'B',
      explanation: 'A systematic debugging flow reduces guesswork.',
      points: 10,
    },
    {
      id: 4,
      type: 'code',
      question: `Write a small function or pseudocode example that validates input before using it in a ${s} workflow.`,
      starter_code: 'function validateInput(input) {\n  // return true when input is usable\n}',
      test_cases: [{ input: 'valid non-empty input', output: 'true' }, { input: '', output: 'false' }],
      explanation: 'Input validation prevents predictable runtime failures.',
      points: 15,
    },
    {
      id: 5,
      type: 'code',
      question: `Write pseudocode for handling an external API failure in a ${s} feature.`,
      starter_code: 'async function callService() {\n  // try request, catch error, return fallback\n}',
      test_cases: [{ input: 'service returns 429', output: 'fallback response' }],
      explanation: 'Production systems need graceful fallback behavior.',
      points: 15,
    },
    {
      id: 6,
      type: 'true_false',
      question: `In ${s}, readable code and clear naming are part of maintainability.`,
      correct_answer: 'true',
      explanation: 'Maintainability is essential for production work.',
      points: 5,
    },
    {
      id: 7,
      type: 'true_false',
      question: `A project is complete once it works once locally, even without tests or documentation.`,
      correct_answer: 'false',
      explanation: 'Reliable work needs repeatability, tests, and documentation.',
      points: 5,
    },
    {
      id: 8,
      type: 'short_answer',
      question: `Explain one core concept in ${s} and where you would use it.`,
      model_answer: `A strong answer defines the concept, gives a use case, and mentions tradeoffs.`,
      key_points: ['definition', 'use case', 'tradeoff'],
      explanation: 'Clear explanations show conceptual understanding.',
      points: 10,
    },
    {
      id: 9,
      type: 'short_answer',
      question: `Describe a project you could build to prove ${targetLevel} level ${s} ability.`,
      model_answer: 'A strong answer includes scope, features, tools, and measurable outcomes.',
      key_points: ['scope', 'tools', 'outcome'],
      explanation: 'Project planning connects skills to employability.',
      points: 10,
    },
    {
      id: 10,
      type: 'short_answer',
      question: `What would you learn next to move from ${currentLevel} to ${targetLevel} in ${s}?`,
      model_answer: 'A strong answer identifies a specific gap, a resource, and a practice plan.',
      key_points: ['gap', 'resource', 'practice plan'],
      explanation: 'Self-directed learning is a key career skill.',
      points: 10,
    },
  ];

  return { success: true, fallback: true, questions, total_points: 100, skill: s, target_level: targetLevel };
};

const makeFallbackLiveJobs = (role = 'Software Engineer', location = 'India', numJobs = 10) => {
  const title = normalizeSkill(role) || 'Software Engineer';
  const count = Math.max(1, Math.min(Number(numJobs) || 10, 12));
  const companies = ['TCS', 'Infosys', 'Wipro', 'Accenture', 'Capgemini', 'Cognizant', 'HCLTech', 'Tech Mahindra', 'Zoho', 'Freshworks', 'LTIMindtree', 'Persistent'];
  const jobs = Array.from({ length: count }, (_, index) => ({
    title: index % 3 === 0 ? `Entry Level ${title}` : `${title} ${index % 2 === 0 ? 'Intern' : 'Associate'}`,
    company: companies[index % companies.length],
    location,
    description: `Fallback listing suggestion for ${title}. Verify live openings on the company careers page before applying.`,
    apply_link: `https://www.google.com/search?q=${encodeURIComponent(`${companies[index % companies.length]} ${title} jobs ${location}`)}`,
    salary: '',
    job_type: index % 2 === 0 ? 'Full-time' : 'Internship',
    posted_at: 'Check source',
    source: 'fallback_search',
    match_percentage: Math.max(55, 88 - index * 3),
    match_reason: 'Generated from your role and location because live job search is temporarily unavailable.',
    matched_skills: [],
    missing_skills: [],
  }));

  return {
    query: `${title} jobs`,
    location,
    total: jobs.length,
    jobs,
    fallback: true,
    error: 'Live job provider temporarily unavailable. Showing fallback search suggestions.',
  };
};

module.exports = {
  makeFallbackRoadmap,
  makeFallbackAssessment,
  makeFallbackLiveJobs,
};
