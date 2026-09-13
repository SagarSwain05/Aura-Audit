// Master job-role catalog — a controlled vocabulary of job titles across
// industries, for the "Job Role" picker on the live-jobs search. Not literally
// every title in every industry worldwide (impossible), but broad and
// representative so search isn't limited to guessing free text. Users can
// still type a custom role if theirs isn't listed.

const JOB_ROLE_CATALOG = {
  technology: [
    'Software Engineer', 'Full Stack Developer', 'Frontend Developer', 'Backend Developer',
    'Mobile App Developer', 'iOS Developer', 'Android Developer', 'DevOps Engineer',
    'Site Reliability Engineer', 'Cloud Engineer', 'Cloud Architect', 'Platform Engineer',
    'Data Engineer', 'Data Scientist', 'Data Analyst', 'Machine Learning Engineer',
    'AI Engineer', 'AI Research Scientist', 'MLOps Engineer', 'Computer Vision Engineer',
    'NLP Engineer', 'Backend Architect', 'Solutions Architect', 'Systems Administrator',
    'Network Engineer', 'Network Administrator', 'Database Administrator',
    'Security Engineer', 'Cybersecurity Analyst', 'Penetration Tester', 'SOC Analyst',
    'QA Engineer', 'Test Automation Engineer', 'SDET', 'Game Developer', 'Game Designer',
    'Embedded Systems Engineer', 'Firmware Engineer', 'Blockchain Developer',
    'Web3 Developer', 'Technical Support Engineer', 'IT Support Specialist',
    'Salesforce Administrator', 'Salesforce Developer', 'SAP Consultant', 'ERP Consultant',
    'Technical Writer', 'Developer Advocate', 'Engineering Manager', 'CTO',
    'VP of Engineering', 'IT Manager', 'Release Engineer', 'Build Engineer',
    'Robotics Engineer', 'AR/VR Developer',
  ],
  product_design: [
    'Product Manager', 'Senior Product Manager', 'Associate Product Manager',
    'Product Owner', 'Product Designer', 'UX Designer', 'UI Designer', 'UX Researcher',
    'Graphic Designer', 'Visual Designer', 'Interaction Designer', 'Design Lead',
    'Creative Director', 'Art Director', 'Motion Designer', 'Video Editor',
    'Industrial Designer', '3D Artist', 'Game Artist', 'Copywriter',
  ],
  business_finance: [
    'Business Analyst', 'Financial Analyst', 'Investment Analyst', 'Investment Banker',
    'Accountant', 'Chartered Accountant', 'Auditor', 'Tax Consultant', 'Bookkeeper',
    'Financial Controller', 'CFO', 'Finance Manager', 'Risk Analyst', 'Credit Analyst',
    'Actuary', 'Equity Research Analyst', 'Portfolio Manager', 'Wealth Manager',
    'Management Consultant', 'Strategy Consultant', 'Business Development Manager',
    'Operations Manager', 'Operations Analyst', 'Procurement Manager',
    'Supply Chain Manager', 'Logistics Manager', 'Project Manager', 'Program Manager',
    'Scrum Master', 'Agile Coach', 'CEO', 'COO', 'Founder',
  ],
  marketing_sales: [
    'Marketing Manager', 'Digital Marketing Manager', 'Content Marketing Manager',
    'SEO Specialist', 'SEM Specialist', 'Social Media Manager', 'Brand Manager',
    'Growth Marketer', 'Performance Marketing Manager', 'Email Marketing Specialist',
    'Marketing Analyst', 'Public Relations Manager', 'Communications Manager',
    'Sales Executive', 'Sales Manager', 'Account Executive', 'Account Manager',
    'Business Development Executive', 'Sales Development Representative',
    'Customer Success Manager', 'Customer Support Representative', 'Inside Sales Rep',
    'Retail Sales Associate', 'Field Sales Representative', 'Channel Sales Manager',
  ],
  healthcare: [
    'Registered Nurse', 'Physician', 'Surgeon', 'Dentist', 'Pharmacist',
    'Physical Therapist', 'Occupational Therapist', 'Medical Assistant',
    'Clinical Research Associate', 'Clinical Research Coordinator', 'Radiologist',
    'Lab Technician', 'Medical Coder', 'Healthcare Administrator', 'Hospital Manager',
    'Nutritionist/Dietitian', 'Psychologist', 'Psychiatrist', 'Veterinarian',
    'Paramedic', 'Public Health Specialist', 'Biomedical Engineer',
  ],
  education: [
    'Teacher', 'Professor', 'Lecturer', 'Teaching Assistant', 'School Principal',
    'Curriculum Developer', 'Instructional Designer', 'Academic Counselor',
    'Corporate Trainer', 'Education Consultant', 'Tutor', 'Librarian',
  ],
  engineering_manufacturing: [
    'Mechanical Engineer', 'Electrical Engineer', 'Civil Engineer', 'Chemical Engineer',
    'Structural Engineer', 'Industrial Engineer', 'Manufacturing Engineer',
    'Quality Assurance Engineer', 'Quality Control Inspector', 'Process Engineer',
    'Production Manager', 'Plant Manager', 'Maintenance Engineer', 'Automotive Engineer',
    'Aerospace Engineer', 'Environmental Engineer', 'Mining Engineer',
    'Petroleum Engineer', 'Architect', 'Urban Planner', 'Construction Manager',
    'Site Engineer', 'Surveyor',
  ],
  legal_hr: [
    'Lawyer', 'Legal Counsel', 'Paralegal', 'Compliance Officer', 'Legal Analyst',
    'Contract Manager', 'HR Manager', 'HR Business Partner', 'Recruiter',
    'Technical Recruiter', 'Talent Acquisition Specialist', 'HR Generalist',
    'Compensation & Benefits Analyst', 'Learning & Development Manager',
    'Employee Relations Specialist', 'Diversity & Inclusion Manager',
  ],
  science_research: [
    'Research Scientist', 'Research Analyst', 'Lab Assistant', 'Biotechnologist',
    'Chemist', 'Physicist', 'Statistician', 'Economist', 'Geologist',
    'Environmental Scientist', 'Data Privacy Officer',
  ],
  trades_operations: [
    'Electrician', 'Plumber', 'Carpenter', 'Welder', 'HVAC Technician',
    'Automotive Technician', 'Machinist', 'Warehouse Associate', 'Forklift Operator',
    'Delivery Driver', 'Truck Driver', 'Logistics Coordinator', 'Fleet Manager',
    'Farmer/Agricultural Worker', 'Chef', 'Sous Chef', 'Restaurant Manager',
    'Hotel Manager', 'Event Planner', 'Flight Attendant', 'Pilot', 'Security Guard',
  ],
  government_nonprofit: [
    'Civil Servant', 'Policy Analyst', 'Urban Development Officer', 'Social Worker',
    'Nonprofit Program Manager', 'Fundraising Manager', 'Grant Writer',
    'Community Outreach Coordinator', 'Journalist', 'Editor', 'Content Writer',
    'News Anchor', 'Translator/Interpreter',
  ],
};

module.exports = { JOB_ROLE_CATALOG };
