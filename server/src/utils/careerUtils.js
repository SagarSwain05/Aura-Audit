const DOMAINS = {
  'Full Stack Developer': { required: ['JavaScript','React','Node.js','MongoDB'], bonus: ['TypeScript','Docker','AWS'], trendScore: 92, hiringGrowth: '+25% YoY', avgPackage: '₹8L–22L', futureProof: 88 },
  'Data Scientist':       { required: ['Python','Machine Learning','SQL','Statistics'], bonus: ['TensorFlow','Spark'], trendScore: 95, hiringGrowth: '+35% YoY', avgPackage: '₹10L–30L', futureProof: 95 },
  'DevOps Engineer':      { required: ['Linux','Docker','Kubernetes','AWS'], bonus: ['Terraform','CI/CD'], trendScore: 91, hiringGrowth: '+30% YoY', avgPackage: '₹10L–28L', futureProof: 92 },
  'ML Engineer':          { required: ['Python','TensorFlow','Scikit-learn'], bonus: ['PyTorch','MLOps'], trendScore: 96, hiringGrowth: '+40% YoY', avgPackage: '₹15L–40L', futureProof: 97 },
  'Frontend Developer':   { required: ['React','JavaScript','HTML','CSS'], bonus: ['Next.js','TypeScript'], trendScore: 88, hiringGrowth: '+20% YoY', avgPackage: '₹7L–18L', futureProof: 82 },
};

function recommend_careers_fallback(skills = [], cgpa = 0) {
  const skillNames = skills.map(s => (typeof s === 'string' ? s : s.name).toLowerCase());
  return Object.entries(DOMAINS).map(([domain, profile]) => {
    const req = profile.required.map(r => r.toLowerCase());
    const bon = profile.bonus.map(b => b.toLowerCase());
    const matchedReq = req.filter(r => skillNames.includes(r));
    const matchedBon = bon.filter(b => skillNames.includes(b));
    const missing = profile.required.filter(r => !skillNames.includes(r.toLowerCase()));
    const score = Math.min(Math.round((matchedReq.length / req.length) * 70 + (matchedBon.length / Math.max(bon.length, 1)) * 20 + (cgpa / 10) * 10), 100);
    return {
      domain, readiness_score: score,
      readiness_label: score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'needs_work',
      matched_skills: matchedReq.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
      missing_skills: missing,
      trend_score: profile.trendScore,
      hiring_growth: profile.hiringGrowth,
      avg_package: profile.avgPackage,
      future_proof: profile.futureProof,
    };
  }).sort((a, b) => b.readiness_score - a.readiness_score).slice(0, 5);
}

module.exports = { recommend_careers_fallback };
