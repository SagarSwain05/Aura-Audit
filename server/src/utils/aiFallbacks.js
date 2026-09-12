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

const makeFallbackInterview = (role = 'Software Engineer') => {
  const r = normalizeSkill(role) || 'Software Engineer';
  return {
    fallback: true,
    questions: [
      { question: `Walk me through the most technically challenging project on your resume as a ${r} candidate — what was the hardest decision you made?`, category: 'project', difficulty: 'medium', hint: 'Specific project, a real tradeoff, and the reasoning behind the choice.' },
      { question: `What is a core concept a ${r} should understand deeply, and how would you explain it to a junior teammate?`, category: 'technical', difficulty: 'medium', hint: 'Clear definition, a concrete example, and a common misconception to avoid.' },
      { question: 'Tell me about a time you disagreed with a teammate on a technical approach. How did you resolve it?', category: 'behavioral', difficulty: 'easy', hint: 'Situation, differing viewpoints, how you reached a resolution, the outcome.' },
      { question: `How would you design a simple, scalable version of a system relevant to a ${r} role (e.g. handling growing load or data)?`, category: 'system_design', difficulty: 'hard', hint: 'Key components, bottlenecks, and how you would scale each one.' },
      { question: 'Describe a bug that was hard to track down. What was your debugging process?', category: 'technical', difficulty: 'medium', hint: 'Reproduction steps, isolation strategy, root cause, and the fix.' },
    ],
    error: 'AI interview generation temporarily unavailable — showing general practice questions instead.',
  };
};

const makeFallbackBulletEnhancement = (original = '') => ({
  fallback: true,
  enhanced: original,
  reasoning: 'AI enhancement is temporarily unavailable. Try again shortly, or manually add a quantified result (%, time saved, scale) and a strong action verb to this bullet.',
  error: 'AI enhancement temporarily unavailable.',
});

// Deterministic offline grading fallback for assessment submission when the AI
// evaluator is unreachable — auto-gradable types (mcq/true_false) are scored
// exactly against correct_answer; open-ended types get partial credit for effort
// so a submission is never silently lost or blocked by an AI outage.
const makeFallbackEvaluation = (questions = [], answersArray = []) => {
  const answerByQ = new Map(answersArray.map((a) => [String(a.question_id), a.answer]));
  const passThreshold = 70;
  let totalScore = 0;
  let totalPoints = 0;
  let correctCount = 0;
  const autoGradable = ['mcq', 'true_false'];

  const results = questions.map((q) => {
    const points = Number(q.points) || 0;
    totalPoints += points;
    const studentAnswer = String(answerByQ.get(String(q.id)) ?? '').trim();
    let earned = 0;
    let isCorrect = false;
    let feedback;

    if (autoGradable.includes(q.type)) {
      isCorrect = studentAnswer.toLowerCase() === String(q.correct_answer ?? '').trim().toLowerCase();
      earned = isCorrect ? points : 0;
      feedback = isCorrect ? 'Correct.' : `Incorrect. Expected: ${q.correct_answer}`;
    } else {
      // Open-ended (code/short_answer): can't semantically grade offline —
      // award half credit for a genuine attempt so effort isn't zeroed out.
      earned = studentAnswer.length > 10 ? Math.round(points * 0.5) : 0;
      feedback = 'AI grading was unavailable — partial credit given for this attempt. Ask a mentor or retry evaluation later for full feedback.';
    }

    totalScore += earned;
    if (isCorrect) correctCount += 1;
    return { question_id: q.id, answer: studentAnswer, is_correct: isCorrect, points_earned: earned, points_possible: points, feedback };
  });

  const percentage = totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0;

  const passed = percentage >= passThreshold;

  return {
    fallback: true,
    evaluation: {
      totalScore, totalPoints, percentage,
      passed,
      passThreshold,
      results,
      correctCount,
      totalQuestions: questions.length,
    },
    // Must match Assessment.feedback's schema shape (server/src/models/Assessment.js)
    // — a plain string here throws a Mongoose cast error on save.
    feedback: {
      personalizedMessage: passed
        ? `You scored ${percentage}%. AI evaluation was temporarily unavailable, so open-ended answers received partial credit for effort rather than full semantic grading — auto-gradable questions were scored exactly.`
        : `You scored ${percentage}%, below the ${passThreshold}% pass mark. AI evaluation was temporarily unavailable, so open-ended answers only received partial credit for effort — try again shortly for full semantic grading.`,
      strengths: correctCount > 0 ? ['Answered auto-gradable questions correctly'] : [],
      areasForImprovement: passed ? [] : ['Retry this assessment once AI evaluation is available for full-credit grading on open-ended answers'],
      recommendations: [],
      nextSteps: ['Retry the assessment later for complete AI-graded feedback on your open-ended answers'],
      estimatedReadinessDays: 14,
      motivationalQuote: 'Every expert was once a beginner.',
    },
  };
};

module.exports = {
  makeFallbackRoadmap,
  makeFallbackAssessment,
  makeFallbackLiveJobs,
  makeFallbackInterview,
  makeFallbackBulletEnhancement,
  makeFallbackEvaluation,
};
