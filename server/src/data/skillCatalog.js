// Master skill catalog — the controlled vocabulary skills are validated
// against. Organized into the 4 categories the app tracks. Not literally
// exhaustive of every skill in every industry (impossible), but broad and
// representative across major tech, business, and practical/trade domains
// so "Add Skill" picks from something real instead of arbitrary free text.
//
// ALIASES maps common variant spellings/abbreviations to the canonical name
// used in CATALOG, so resume text like "ReactJS", "Node", "K8s", "ML" all
// normalize to one consistent entry instead of fragmenting the skill list.

const CATALOG = {
  technical: [
    // Programming languages
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C', 'C++', 'C#', 'Go', 'Rust',
    'Kotlin', 'Swift', 'PHP', 'Ruby', 'Scala', 'R', 'MATLAB', 'Perl', 'Dart',
    'Objective-C', 'Elixir', 'Haskell', 'Lua', 'Julia', 'Solidity', 'Assembly',
    'Shell Scripting', 'PowerShell', 'VBA',

    // Frontend
    'React', 'Next.js', 'Vue.js', 'Angular', 'Svelte', 'HTML', 'CSS', 'Sass',
    'Tailwind CSS', 'Bootstrap', 'jQuery', 'Redux', 'Webpack', 'Vite',
    'Framer Motion', 'Three.js', 'D3.js', 'WebAssembly', 'Progressive Web Apps',
    'Web Accessibility (WCAG)', 'Responsive Design',

    // Backend / frameworks
    'Node.js', 'Express.js', 'Django', 'Flask', 'FastAPI', 'Spring Boot',
    'ASP.NET', '.NET Core', 'Ruby on Rails', 'Laravel', 'NestJS', 'GraphQL',
    'REST APIs', 'gRPC', 'WebSockets', 'Microservices Architecture',
    'Serverless Architecture', 'Event-Driven Architecture',

    // Mobile
    'Android Development', 'iOS Development', 'React Native', 'Flutter',
    'SwiftUI', 'Jetpack Compose', 'Xamarin',

    // Databases
    'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'SQLite', 'Oracle Database',
    'Microsoft SQL Server', 'Cassandra', 'DynamoDB', 'Elasticsearch', 'Neo4j',
    'Firebase', 'Supabase', 'Database Design', 'Database Administration',

    // Cloud & DevOps
    'AWS', 'Azure', 'Google Cloud Platform', 'Docker', 'Kubernetes', 'Terraform',
    'Ansible', 'Jenkins', 'GitHub Actions', 'GitLab CI/CD', 'CI/CD Pipelines',
    'Prometheus', 'Grafana', 'Datadog', 'Nginx', 'Apache', 'Load Balancing',
    'Infrastructure as Code', 'Site Reliability Engineering', 'Chef', 'Puppet',
    'Vagrant', 'Helm', 'Istio', 'Cloud Architecture', 'Serverless Computing',

    // Systems / networking / security
    'Linux', 'Unix', 'Windows Server', 'Bash', 'Networking (TCP/IP)', 'DNS',
    'VPN Configuration', 'Firewalls', 'Network Security', 'Penetration Testing',
    'Ethical Hacking', 'Cybersecurity', 'Cryptography', 'SIEM Tools',
    'Identity & Access Management', 'OWASP Security Practices', 'Zero Trust Architecture',
    'Vulnerability Assessment', 'Incident Response', 'Security Auditing',

    // Data / AI / ML
    'Machine Learning', 'Deep Learning', 'Natural Language Processing',
    'Computer Vision', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'Keras',
    'Data Engineering', 'ETL Pipelines', 'Apache Spark', 'Apache Kafka',
    'Apache Airflow', 'Hadoop', 'Big Data', 'MLOps', 'LLM Fine-tuning',
    'Prompt Engineering', 'RAG Pipelines', 'Generative AI', 'Reinforcement Learning',
    'Model Deployment', 'Feature Engineering',

    // Testing / QA
    'Unit Testing', 'Integration Testing', 'Test Automation', 'Selenium',
    'Cypress', 'Playwright', 'Jest', 'PyTest', 'JUnit', 'Postman',
    'Performance Testing', 'Load Testing', 'Manual QA Testing',

    // Design / creative tools
    'Figma', 'Adobe XD', 'Sketch', 'Adobe Photoshop', 'Adobe Illustrator',
    'Adobe Premiere Pro', 'Adobe After Effects', 'Canva', 'Blender', 'AutoCAD',
    'UI Design', 'UX Design', 'Wireframing', 'Prototyping', '3D Modeling',
    'Motion Graphics', 'Video Editing', 'Graphic Design',

    // Version control / tools
    'Git', 'GitHub', 'GitLab', 'Bitbucket', 'Jira', 'Confluence', 'Linux Shell',
    'VS Code', 'IntelliJ IDEA', 'Postman', 'Swagger/OpenAPI',

    // Other technical domains
    'Blockchain Development', 'Smart Contracts', 'Web3', 'Cryptocurrency Systems',
    'Embedded Systems', 'IoT (Internet of Things)', 'Robotics', 'PLC Programming',
    'Game Development', 'Unity', 'Unreal Engine', 'AR/VR Development',
    'CAD Software', 'CRM Systems (Salesforce)', 'ERP Systems (SAP)',
    'ServiceNow', 'Low-Code/No-Code Platforms', 'API Integration',
    'System Design', 'Distributed Systems', 'Operating Systems Concepts',
    'Compiler Design', 'Data Structures & Algorithms',
  ],

  communication: [
    'Public Speaking', 'Presentation Skills', 'Technical Writing', 'Business Writing',
    'Copywriting', 'Content Writing', 'Editing & Proofreading', 'Storytelling',
    'Active Listening', 'Interpersonal Communication', 'Cross-functional Collaboration',
    'Negotiation', 'Conflict Resolution', 'Persuasion', 'Client Management',
    'Stakeholder Management', 'Vendor Communication', 'Team Leadership',
    'People Management', 'Mentoring', 'Coaching', 'Public Relations',
    'Media Relations', 'Journalism', 'Social Media Communication',
    'Community Management', 'Facilitation', 'Meeting Facilitation',
    'Cross-cultural Communication', 'Multilingual Communication', 'Translation',
    'Interpretation', 'Documentation Writing', 'Grant Writing', 'Report Writing',
    'Email Etiquette', 'Customer Communication', 'Sales Pitching',
    'Investor Relations', 'Diplomacy', 'Emotional Intelligence',
    'Nonverbal Communication', 'Debate', 'Moderation', 'Training Delivery',
    'Onboarding & Training', 'Feedback Delivery', 'Crisis Communication',
  ],

  quantitative: [
    'Statistics', 'Statistical Analysis', 'Data Analysis', 'Data Visualization',
    'Excel', 'Google Sheets', 'SQL', 'Tableau', 'Power BI', 'Looker',
    'Financial Modeling', 'Financial Analysis', 'Accounting', 'Bookkeeping',
    'Budgeting', 'Forecasting', 'Cost Analysis', 'Cost-Benefit Analysis',
    'Econometrics', 'Economics', 'Quantitative Research', 'Market Research',
    'A/B Testing', 'Hypothesis Testing', 'Regression Analysis', 'Probability',
    'Linear Algebra', 'Calculus', 'Operations Research', 'Risk Analysis',
    'Risk Management', 'Actuarial Science', 'Investment Analysis',
    'Portfolio Management', 'Valuation', 'Financial Reporting', 'Auditing',
    'Tax Analysis', 'Business Analytics', 'Predictive Analytics',
    'Pandas', 'NumPy', 'R Programming', 'SPSS', 'SAS', 'Stata',
    'Supply Chain Analytics', 'Inventory Analysis', 'Pricing Strategy',
    'KPI Tracking & Reporting', 'Data Mining', 'Survey Design & Analysis',
  ],

  real_world: [
    'Project Management', 'Agile Methodology', 'Scrum', 'Kanban', 'PMP',
    'Product Management', 'Product Strategy', 'Roadmap Planning',
    'Problem Solving', 'Critical Thinking', 'Decision Making', 'Time Management',
    'Organizational Skills', 'Adaptability', 'Resilience', 'Multitasking',
    'Customer Service', 'Customer Success', 'Sales', 'Business Development',
    'Account Management', 'Retail Management', 'E-commerce Operations',
    'Operations Management', 'Supply Chain Management', 'Logistics',
    'Inventory Management', 'Procurement', 'Vendor Management',
    'Manufacturing Processes', 'Quality Assurance', 'Quality Control',
    'Lean Manufacturing', 'Six Sigma', 'Process Improvement',
    'Clinical Research', 'Patient Care', 'Healthcare Administration',
    'Nursing Skills', 'Medical Coding', 'Laboratory Techniques',
    'Teaching', 'Curriculum Development', 'Classroom Management',
    'Instructional Design', 'Event Planning', 'Hospitality Management',
    'Food Safety', 'Construction Management', 'Carpentry', 'Electrical Work',
    'Plumbing', 'Welding', 'HVAC Systems', 'Automotive Repair',
    'Agriculture & Farming', 'Landscaping', 'Legal Research',
    'Contract Management', 'Compliance & Regulatory Affairs', 'Paralegal Skills',
    'Human Resources', 'Recruiting & Talent Acquisition', 'Payroll Administration',
    'Employee Relations', 'Performance Management', 'Onboarding',
    'Fundraising', 'Grant Management', 'Volunteer Coordination',
    'Real Estate Management', 'Property Management', 'Insurance Underwriting',
    'Banking Operations', 'Loan Processing', 'Fleet Management',
    'Warehouse Operations', 'Field Service Management', 'Emergency Response',
    'Safety Management (OSHA)', 'First Aid & CPR', 'Military Operations',
    'Law Enforcement Procedures', 'Aviation Operations', 'Maritime Operations',
  ],
};

// Common abbreviations/variants -> canonical catalog name. Lowercased keys.
const ALIASES = {
  'js': 'JavaScript', 'ecmascript': 'JavaScript', 'ts': 'TypeScript',
  'reactjs': 'React', 'react.js': 'React', 'vuejs': 'Vue.js', 'vue': 'Vue.js',
  'angularjs': 'Angular', 'nodejs': 'Node.js', 'node': 'Node.js',
  'expressjs': 'Express.js', 'express': 'Express.js', 'nextjs': 'Next.js',
  'nestjs': 'NestJS', 'dotnet': '.NET Core', '.net': '.NET Core',
  'asp.net core': 'ASP.NET', 'golang': 'Go', 'py': 'Python',
  'postgres': 'PostgreSQL', 'postgresql': 'PostgreSQL', 'mongo': 'MongoDB',
  'mssql': 'Microsoft SQL Server', 'sql server': 'Microsoft SQL Server',
  'aws cloud': 'AWS', 'amazon web services': 'AWS', 'gcp': 'Google Cloud Platform',
  'google cloud': 'Google Cloud Platform', 'ms azure': 'Azure',
  'microsoft azure': 'Azure', 'k8s': 'Kubernetes', 'iac': 'Infrastructure as Code',
  'ci/cd': 'CI/CD Pipelines', 'cicd': 'CI/CD Pipelines',
  'ml': 'Machine Learning', 'dl': 'Deep Learning', 'nlp': 'Natural Language Processing',
  'cv': 'Computer Vision', 'ai': 'Machine Learning', 'genai': 'Generative AI',
  'generative ai': 'Generative AI', 'llm': 'Generative AI',
  'tensor flow': 'TensorFlow', 'pytorch lightning': 'PyTorch',
  'scikit learn': 'Scikit-learn', 'sklearn': 'Scikit-learn',
  'rest api': 'REST APIs', 'restful api': 'REST APIs', 'rest': 'REST APIs',
  'graph ql': 'GraphQL', 'oop': 'Object-Oriented Programming',
  'dsa': 'Data Structures & Algorithms', 'data structures': 'Data Structures & Algorithms',
  'algorithms': 'Data Structures & Algorithms', 'system design': 'System Design',
  'linux administration': 'Linux', 'bash scripting': 'Bash', 'shell': 'Bash',
  'networking': 'Networking (TCP/IP)', 'tcp/ip': 'Networking (TCP/IP)',
  'cyber security': 'Cybersecurity', 'infosec': 'Cybersecurity',
  'pentest': 'Penetration Testing', 'pentesting': 'Penetration Testing',
  'ux': 'UX Design', 'ui': 'UI Design', 'ui/ux': 'UI Design',
  'ui/ux design': 'UI Design', 'photoshop': 'Adobe Photoshop',
  'illustrator': 'Adobe Illustrator', 'premiere': 'Adobe Premiere Pro',
  'premiere pro': 'Adobe Premiere Pro', 'after effects': 'Adobe After Effects',
  'ios': 'iOS Development', 'android': 'Android Development',
  'react native': 'React Native', 'salesforce': 'CRM Systems (Salesforce)',
  'sap': 'ERP Systems (SAP)', 'iot': 'IoT (Internet of Things)',
  'ar/vr': 'AR/VR Development', 'vr': 'AR/VR Development', 'ar': 'AR/VR Development',

  'public speaking skills': 'Public Speaking', 'presentation': 'Presentation Skills',
  'writing': 'Business Writing', 'tech writing': 'Technical Writing',
  'leadership': 'Team Leadership', 'people management': 'People Management',
  'teamwork': 'Cross-functional Collaboration', 'collaboration': 'Cross-functional Collaboration',
  'emotional intelligence (eq)': 'Emotional Intelligence', 'eq': 'Emotional Intelligence',

  'excel spreadsheets': 'Excel', 'microsoft excel': 'Excel',
  'google sheets': 'Google Sheets', 'data viz': 'Data Visualization',
  'power bi': 'Power BI', 'powerbi': 'Power BI', 'tableau software': 'Tableau',
  'financial modelling': 'Financial Modeling', 'fp&a': 'Financial Analysis',
  'stats': 'Statistics', 'statistical modeling': 'Statistical Analysis',
  'a/b test': 'A/B Testing', 'ab testing': 'A/B Testing',

  'pm': 'Project Management', 'project mgmt': 'Project Management',
  'agile methodologies': 'Agile Methodology', 'scrum master': 'Scrum',
  'six sigma': 'Six Sigma', 'lean six sigma': 'Six Sigma',
  'customer support': 'Customer Service', 'biz dev': 'Business Development',
  'hr': 'Human Resources', 'recruiting': 'Recruiting & Talent Acquisition',
  'osha': 'Safety Management (OSHA)', 'cpr': 'First Aid & CPR',
};

function allSkills() {
  return Object.entries(CATALOG).flatMap(([category, names]) => names.map((name) => ({ name, category })));
}

module.exports = { CATALOG, ALIASES, allSkills };
