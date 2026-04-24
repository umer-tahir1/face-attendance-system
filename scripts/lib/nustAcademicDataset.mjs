const UNDERGRADUATE_SEMESTERS = 8;
const POSTGRADUATE_SEMESTERS = 4;

export const schools = [
  {
    code: 'SCEE',
    name: 'School of Civil & Environmental Engineering',
    programs: [
      { key: 'CE', name: 'Civil Engineering', levels: ['Undergraduate'] },
      { key: 'ENV', name: 'Environmental Engineering', levels: ['Undergraduate', 'Postgraduate'] },
      { key: 'GEOINF', name: 'Geoinformatics Engineering', levels: ['Undergraduate'] },
      { key: 'WREM', name: 'Water Resources Engineering & Management', levels: ['Postgraduate'] },
      { key: 'CEM', name: 'Construction Engineering & Management', levels: ['Postgraduate'] },
      { key: 'RSGIS', name: 'Remote Sensing & GIS', levels: ['Postgraduate'] },
    ],
  },
  {
    code: 'SCME',
    name: 'School of Chemical & Materials Engineering',
    programs: [
      { key: 'CHE', name: 'Chemical Engineering', levels: ['Undergraduate', 'Postgraduate'] },
      { key: 'MME', name: 'Metallurgy & Materials Engineering', levels: ['Undergraduate'] },
      { key: 'MSE', name: 'Materials & Surface Engineering', levels: ['Postgraduate'] },
      { key: 'NSE', name: 'Nanoscience & Engineering', levels: ['Postgraduate'] },
    ],
  },
  {
    code: 'SEECS',
    name: 'School of Electrical Engineering & Computer Science',
    programs: [
      { key: 'EE', name: 'Electrical Engineering', levels: ['Undergraduate'] },
      { key: 'CS', name: 'Computer Science', levels: ['Undergraduate', 'Postgraduate'] },
      { key: 'SE', name: 'Software Engineering', levels: ['Undergraduate'] },
      { key: 'AI', name: 'Artificial Intelligence', levels: ['Undergraduate', 'Postgraduate'] },
      { key: 'DS', name: 'Data Science', levels: ['Undergraduate', 'Postgraduate'] },
      { key: 'IS', name: 'Information Security', levels: ['Postgraduate'] },
      { key: 'IT', name: 'Information Technology', levels: ['Postgraduate'] },
      { key: 'LT', name: 'Learning Technologies', levels: ['Postgraduate'] },
    ],
  },
  {
    code: 'SMME',
    name: 'School of Mechanical & Manufacturing Engineering',
    programs: [
      { key: 'ME', name: 'Mechanical Engineering', levels: ['Undergraduate', 'Postgraduate'] },
      { key: 'AE', name: 'Aerospace Engineering', levels: ['Undergraduate'] },
      { key: 'RAI', name: 'Robotics & AI Engineering', levels: ['Postgraduate'] },
      { key: 'BME', name: 'Biomedical Engineering', levels: ['Postgraduate'] },
      { key: 'DM', name: 'Design & Manufacturing', levels: ['Postgraduate'] },
    ],
  },
  {
    code: 'SNS',
    name: 'School of Natural Sciences',
    programs: [
      { key: 'MATH', name: 'Mathematics', levels: ['Undergraduate', 'Postgraduate'] },
      { key: 'PHY', name: 'Physics', levels: ['Undergraduate', 'Postgraduate'] },
      { key: 'CHEM', name: 'Chemistry', levels: ['Undergraduate', 'Postgraduate'] },
      { key: 'STAT', name: 'Statistics', levels: ['Postgraduate'] },
    ],
  },
  {
    code: 'ASAB',
    name: 'Atta-ur-Rahman School of Applied Biosciences',
    programs: [
      { key: 'BIO', name: 'Biotechnology', levels: ['Undergraduate', 'Postgraduate'] },
      { key: 'FST', name: 'Food Science & Technology', levels: ['Undergraduate'] },
      { key: 'AGR', name: 'Agriculture', levels: ['Undergraduate'] },
      { key: 'MMED', name: 'Molecular Medicine', levels: ['Postgraduate'] },
    ],
  },
  {
    code: 'NBS',
    name: 'NUST Business School',
    programs: [
      { key: 'BBA', name: 'Business Administration', levels: ['Undergraduate'] },
      { key: 'AF', name: 'Accounting & Finance', levels: ['Undergraduate'] },
      { key: 'THM', name: 'Tourism & Hospitality Management', levels: ['Undergraduate'] },
      { key: 'MS', name: 'Management Sciences', levels: ['Postgraduate'] },
      { key: 'MBA', name: 'MBA / Executive MBA', levels: ['Postgraduate'] },
    ],
  },
  {
    code: 'S3H',
    name: 'School of Social Sciences & Humanities',
    programs: [
      { key: 'ECON', name: 'Economics', levels: ['Undergraduate', 'Postgraduate'] },
      { key: 'PSY', name: 'Psychology', levels: ['Undergraduate'] },
      { key: 'MC', name: 'Mass Communication', levels: ['Undergraduate'] },
      { key: 'PA', name: 'Public Administration', levels: ['Undergraduate'] },
      { key: 'LAH', name: 'Liberal Arts & Humanities', levels: ['Undergraduate'] },
      { key: 'DS', name: 'Development Studies', levels: ['Postgraduate'] },
    ],
  },
  {
    code: 'SADA',
    name: 'School of Art, Design & Architecture',
    programs: [
      { key: 'ARCH', name: 'Architecture', levels: ['Undergraduate'] },
      { key: 'ID', name: 'Industrial Design', levels: ['Undergraduate'] },
      { key: 'AD', name: 'Architectural Design', levels: ['Postgraduate'] },
    ],
  },
  {
    code: 'NLS',
    name: 'NUST Law School',
    programs: [{ key: 'LLB', name: 'Law (LLB)', levels: ['Undergraduate'] }],
  },
  {
    code: 'JSPPL',
    name: 'Jinnah School of Public Policy & Leadership',
    programs: [{ key: 'PA', name: 'Public Administration', levels: ['Undergraduate'] }],
  },
  {
    code: 'SINES',
    name: 'School of Interdisciplinary Engineering & Sciences',
    programs: [
      { key: 'BIOINF', name: 'Bioinformatics', levels: ['Undergraduate'] },
      { key: 'CSCI', name: 'Computational Science', levels: ['Postgraduate'] },
      { key: 'CCSD', name: 'Climate Change & Sustainable Development', levels: ['Postgraduate'] },
    ],
  },
  {
    code: 'NSHS',
    name: 'NUST School of Health Sciences',
    programs: [{ key: 'HSP', name: 'Health Sciences Programs', levels: ['Postgraduate'] }],
  },
];

const toRoman = (value) => {
  const map = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
  return map[value - 1] || String(value);
};

const unique = (values) => {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      result.push(value);
    }
  }
  return result;
};

const normalizeSemesters = ({ rawSemesters, expectedCount, minCourses, maxCourses, programName, level }) => {
  const normalized = [];

  for (let semesterIndex = 0; semesterIndex < expectedCount; semesterIndex += 1) {
    const raw = rawSemesters[semesterIndex] || [];
    const deduped = unique(raw).slice(0, maxCourses);

    while (deduped.length < minCourses) {
      const electiveIndex = deduped.length - minCourses + 2;
      deduped.push(
        `${level} elective in ${programName} ${toRoman(Math.max(1, electiveIndex))}`,
      );
    }

    normalized.push({
      semester: semesterIndex + 1,
      courses: deduped.map((courseName) => ({ courseName })),
    });
  }

  return normalized;
};

const buildEngineeringUndergraduate = (programName, focus) =>
  normalizeSemesters({
    expectedCount: UNDERGRADUATE_SEMESTERS,
    minCourses: 5,
    maxCourses: 7,
    programName,
    level: 'Undergraduate',
    rawSemesters: [
      [
        'Calculus and Analytical Geometry',
        'Applied Physics for Engineers',
        'Chemistry for Engineers',
        'Functional English and Academic Writing',
        'Engineering Drawing and Computer Aided Design',
      ],
      [
        'Multivariable Calculus',
        'Linear Algebra and Differential Equations',
        'Computer Programming for Engineers',
        'Engineering Mechanics',
        'Communication Skills and Technical Writing',
      ],
      [
        'Probability and Statistics for Engineers',
        'Numerical Methods for Engineering Analysis',
        'Thermodynamics',
        'Materials Science and Engineering',
        focus[0] || `Fundamentals of ${programName}`,
      ],
      [
        'Fluid Mechanics',
        'Instrumentation and Measurement Systems',
        'Engineering Economics',
        focus[1] || `Intermediate Topics in ${programName}`,
        focus[2] || `Laboratory Practice in ${programName}`,
      ],
      [
        'Control Systems Engineering',
        'Engineering Ethics and Professional Practice',
        'Project Management for Engineers',
        focus[3] || `Advanced Concepts in ${programName}`,
        focus[4] || `Design Applications in ${programName}`,
      ],
      [
        'Simulation and Modeling for Engineers',
        'Quality Engineering and Risk Management',
        'Sustainability and Environmental Impact Assessment',
        focus[5] || `Applied Analysis in ${programName}`,
        focus[6] || `Innovation in ${programName}`,
      ],
      [
        'Final Year Design Project I',
        'Industrial Internship and Professional Practice',
        'Technical Elective I',
        focus[7] || `Professional Topics in ${programName}`,
        focus[8] || `Systems Integration in ${programName}`,
      ],
      [
        'Final Year Design Project II',
        'Technical Elective II',
        'Engineering Entrepreneurship and Technology Management',
        focus[9] || `Advanced Design in ${programName}`,
        focus[10] || `Emerging Technologies in ${programName}`,
      ],
    ],
  });

const buildComputerScienceUndergraduate = () =>
  normalizeSemesters({
    expectedCount: UNDERGRADUATE_SEMESTERS,
    minCourses: 5,
    maxCourses: 7,
    programName: 'Computer Science',
    level: 'Undergraduate',
    rawSemesters: [
      [
        'Introduction to Computing',
        'Programming Fundamentals',
        'Calculus and Analytical Geometry',
        'Applied Physics',
        'Expository Writing and Communication',
      ],
      [
        'Object Oriented Programming',
        'Discrete Structures',
        'Linear Algebra',
        'Probability and Statistics',
        'Digital Logic Design',
      ],
      [
        'Data Structures and Algorithms',
        'Computer Organization and Assembly Language',
        'Database Systems',
        'Software Engineering',
        'Professional Practices in Computing',
      ],
      [
        'Operating Systems',
        'Analysis of Algorithms',
        'Computer Networks',
        'Human Computer Interaction',
        'Information Security',
      ],
      [
        'Artificial Intelligence',
        'Web Engineering',
        'Theory of Automata',
        'Mobile Application Development',
        'Design and Analysis of Experiments',
      ],
      [
        'Machine Learning',
        'Data Mining',
        'Distributed Systems',
        'Cloud Computing',
        'Compiler Construction',
      ],
      [
        'Technical Elective I',
        'Natural Language Processing',
        'Computer Vision',
        'Final Year Project I',
        'Entrepreneurship and Innovation',
      ],
      [
        'Technical Elective II',
        'Parallel and High Performance Computing',
        'Blockchain Systems and Applications',
        'Final Year Project II',
        'Technology Policy and Society',
      ],
    ],
  });

const buildSoftwareEngineeringUndergraduate = () =>
  normalizeSemesters({
    expectedCount: UNDERGRADUATE_SEMESTERS,
    minCourses: 5,
    maxCourses: 7,
    programName: 'Software Engineering',
    level: 'Undergraduate',
    rawSemesters: [
      [
        'Introduction to Computing',
        'Programming Fundamentals',
        'Calculus and Analytical Geometry',
        'Applied Physics',
        'Functional English',
      ],
      [
        'Object Oriented Programming',
        'Discrete Structures',
        'Communication and Presentation Skills',
        'Probability and Statistics',
        'Computer Organization',
      ],
      [
        'Data Structures and Algorithms',
        'Database Systems',
        'Software Construction',
        'Requirements Engineering',
        'Technical and Business Writing',
      ],
      [
        'Software Design and Architecture',
        'Operating Systems',
        'Computer Networks',
        'Quality Assurance and Testing',
        'Human Computer Interaction',
      ],
      [
        'Web Engineering',
        'Mobile Application Engineering',
        'Software Project Management',
        'Information Security',
        'Formal Methods in Software Engineering',
      ],
      [
        'DevOps and Continuous Delivery',
        'Cloud Native Software Engineering',
        'Software Metrics and Measurement',
        'Software Maintenance and Evolution',
        'Artificial Intelligence for Software Engineers',
      ],
      [
        'Final Year Project I',
        'Technical Elective I',
        'Enterprise Systems Engineering',
        'Software Product Management',
        'Legal and Ethical Issues in Software Engineering',
      ],
      [
        'Final Year Project II',
        'Technical Elective II',
        'Advanced Topics in Software Engineering',
        'Entrepreneurship for Software Ventures',
        'Industry Internship and Reflection',
      ],
    ],
  });

const buildArtificialIntelligenceUndergraduate = () =>
  normalizeSemesters({
    expectedCount: UNDERGRADUATE_SEMESTERS,
    minCourses: 5,
    maxCourses: 7,
    programName: 'Artificial Intelligence',
    level: 'Undergraduate',
    rawSemesters: [
      [
        'Introduction to Computing',
        'Programming Fundamentals',
        'Calculus and Analytical Geometry',
        'Linear Algebra',
        'Expository Writing and Communication',
      ],
      [
        'Object Oriented Programming',
        'Discrete Mathematics',
        'Probability and Statistics',
        'Data Structures',
        'Computer Organization',
      ],
      [
        'Data Structures and Algorithms',
        'Database Systems',
        'Machine Learning Fundamentals',
        'Digital Signal Processing Fundamentals',
        'Professional Ethics in Artificial Intelligence',
      ],
      [
        'Artificial Intelligence',
        'Operating Systems',
        'Knowledge Representation and Reasoning',
        'Computer Networks',
        'Human Computer Interaction',
      ],
      [
        'Deep Learning',
        'Natural Language Processing',
        'Computer Vision',
        'Data Mining',
        'Optimization Methods for Artificial Intelligence',
      ],
      [
        'Reinforcement Learning',
        'Multimodal Artificial Intelligence Systems',
        'Intelligent Robotics',
        'Cloud Platforms for Artificial Intelligence',
        'Responsible Artificial Intelligence and Governance',
      ],
      [
        'Technical Elective I',
        'Generative Models and Representation Learning',
        'Artificial Intelligence Product Design',
        'Final Year Project I',
        'Entrepreneurship and Innovation',
      ],
      [
        'Technical Elective II',
        'Artificial Intelligence in Healthcare and Industry',
        'MLOps and Deployment Engineering',
        'Final Year Project II',
        'Technology Policy and Society',
      ],
    ],
  });

const buildDataScienceUndergraduate = () =>
  normalizeSemesters({
    expectedCount: UNDERGRADUATE_SEMESTERS,
    minCourses: 5,
    maxCourses: 7,
    programName: 'Data Science',
    level: 'Undergraduate',
    rawSemesters: [
      [
        'Introduction to Data Science',
        'Programming Fundamentals',
        'Calculus and Analytical Geometry',
        'Applied Statistics',
        'Functional English',
      ],
      [
        'Object Oriented Programming',
        'Linear Algebra',
        'Probability Theory',
        'Discrete Structures',
        'Communication and Presentation Skills',
      ],
      [
        'Data Structures and Algorithms',
        'Database Systems',
        'Statistical Inference',
        'Data Visualization',
        'Data Ethics and Privacy',
      ],
      [
        'Machine Learning',
        'Big Data Platforms',
        'Data Warehousing and Business Intelligence',
        'Experimental Design and A/B Testing',
        'Cloud Computing for Data Systems',
      ],
      [
        'Deep Learning',
        'Natural Language Processing for Data Science',
        'Time Series Analysis and Forecasting',
        'Data Governance and Security',
        'Optimization for Data Science',
      ],
      [
        'Recommender Systems and Personalization',
        'Geospatial Data Analytics',
        'Data Engineering Pipelines',
        'Applied Econometrics',
        'MLOps and Model Deployment',
      ],
      [
        'Technical Elective I',
        'Causal Inference and Decision Analytics',
        'Data Science for Public Policy',
        'Final Year Project I',
        'Entrepreneurship and Innovation',
      ],
      [
        'Technical Elective II',
        'Advanced Analytics Capstone',
        'Responsible Data Science and Regulation',
        'Final Year Project II',
        'Industry Internship and Reflection',
      ],
    ],
  });

const buildScienceUndergraduate = (discipline, focusedCourses) =>
  normalizeSemesters({
    expectedCount: UNDERGRADUATE_SEMESTERS,
    minCourses: 5,
    maxCourses: 7,
    programName: discipline,
    level: 'Undergraduate',
    rawSemesters: [
      [
        'Calculus and Analytical Geometry',
        'General Physics',
        'General Chemistry',
        'Functional English and Communication',
        'Introduction to Computing',
      ],
      [
        'Linear Algebra',
        'Probability and Statistics',
        'Scientific Writing and Presentation Skills',
        focusedCourses[0] || `Foundations of ${discipline}`,
        focusedCourses[1] || `Laboratory Fundamentals in ${discipline}`,
      ],
      [
        'Differential Equations',
        focusedCourses[2] || `Intermediate ${discipline} I`,
        focusedCourses[3] || `Intermediate ${discipline} II`,
        'Research Methods in Natural Sciences',
        'Computational Methods for Scientists',
      ],
      [
        focusedCourses[4] || `Advanced ${discipline} I`,
        focusedCourses[5] || `Advanced ${discipline} II`,
        focusedCourses[6] || `Experimental Methods in ${discipline}`,
        'Scientific Data Analysis',
        'Elective in Interdisciplinary Science I',
      ],
      [
        focusedCourses[7] || `Special Topics in ${discipline} I`,
        focusedCourses[8] || `Special Topics in ${discipline} II`,
        focusedCourses[9] || `Modeling in ${discipline}`,
        'Elective in Interdisciplinary Science II',
        'Scientific Ethics and Professional Practice',
      ],
      [
        focusedCourses[10] || `Applied ${discipline} I`,
        focusedCourses[11] || `Applied ${discipline} II`,
        'Laboratory Instrumentation and Safety',
        'Technical Elective I',
        'Project Planning and Proposal Writing',
      ],
      [
        'Research Project I',
        focusedCourses[12] || `Emerging Areas in ${discipline}`,
        'Technical Elective II',
        'Industry Internship and Professional Exposure',
        'Innovation and Entrepreneurship',
      ],
      [
        'Research Project II',
        focusedCourses[13] || `Contemporary Issues in ${discipline}`,
        'Technical Elective III',
        'Technology, Society and Policy',
        'Capstone Seminar',
      ],
    ],
  });

const buildBusinessUndergraduate = (programName, specializationCourses) =>
  normalizeSemesters({
    expectedCount: UNDERGRADUATE_SEMESTERS,
    minCourses: 5,
    maxCourses: 7,
    programName,
    level: 'Undergraduate',
    rawSemesters: [
      [
        'Principles of Management',
        'Business Mathematics',
        'Microeconomics',
        'Functional English and Communication',
        'Introduction to Information Technology',
      ],
      [
        'Financial Accounting',
        'Macroeconomics',
        'Business Statistics',
        'Business Communication and Report Writing',
        'Civics and Ethics',
      ],
      [
        'Marketing Management',
        'Managerial Accounting',
        'Business Law',
        'Organizational Behavior',
        specializationCourses[0] || `Foundations of ${programName}`,
      ],
      [
        'Financial Management',
        'Operations Management',
        'Human Resource Management',
        'Research Methods for Business',
        specializationCourses[1] || `Intermediate ${programName}`,
      ],
      [
        'Strategic Management',
        'Business Analytics',
        'Entrepreneurship and Venture Development',
        specializationCourses[2] || `Advanced ${programName} I`,
        specializationCourses[3] || `Advanced ${programName} II`,
      ],
      [
        'Supply Chain and Logistics Management',
        'International Business',
        'Corporate Governance and Business Ethics',
        specializationCourses[4] || `Applied ${programName} I`,
        specializationCourses[5] || `Applied ${programName} II`,
      ],
      [
        'Business Simulation and Decision Making',
        'Technical Elective I',
        'Technical Elective II',
        'Internship and Industry Practice',
        'Capstone Project I',
      ],
      [
        'Innovation and Digital Transformation',
        'Technical Elective III',
        'Technical Elective IV',
        'Capstone Project II',
        'Public Policy, Sustainability and Society',
      ],
    ],
  });

const buildSocialScienceUndergraduate = (programName, focus) =>
  normalizeSemesters({
    expectedCount: UNDERGRADUATE_SEMESTERS,
    minCourses: 5,
    maxCourses: 7,
    programName,
    level: 'Undergraduate',
    rawSemesters: [
      [
        'Introduction to Social Sciences',
        'Functional English and Academic Writing',
        'Introduction to Information and Communication Technologies',
        'Pakistan Studies',
        focus[0] || `Foundations of ${programName}`,
      ],
      [
        'Critical Thinking and Argumentation',
        'Quantitative Methods for Social Sciences',
        'Sociology and Society',
        'Communication and Presentation Skills',
        focus[1] || `Core Concepts in ${programName}`,
      ],
      [
        'Research Methods in Social Sciences',
        'Statistics for Social Sciences',
        'Public Policy and Governance',
        focus[2] || `Intermediate ${programName} I`,
        focus[3] || `Intermediate ${programName} II`,
      ],
      [
        'Qualitative Data Analysis',
        'Professional Ethics and Civic Responsibility',
        'Comparative Institutions and Society',
        focus[4] || `Advanced ${programName} I`,
        focus[5] || `Advanced ${programName} II`,
      ],
      [
        'Development Planning and Evaluation',
        'Program Design and Impact Assessment',
        focus[6] || `Applied ${programName} I`,
        focus[7] || `Applied ${programName} II`,
        'Elective in Interdisciplinary Humanities I',
      ],
      [
        'Data Visualization for Social Research',
        'Conflict Resolution and Negotiation',
        focus[8] || `Special Topics in ${programName} I`,
        focus[9] || `Special Topics in ${programName} II`,
        'Elective in Interdisciplinary Humanities II',
      ],
      [
        'Internship and Field Work',
        'Technical Elective I',
        'Technical Elective II',
        'Research Project I',
        'Leadership and Professional Practice',
      ],
      [
        'Policy Analysis and Advocacy',
        'Technical Elective III',
        'Technical Elective IV',
        'Research Project II',
        'Contemporary Issues in Society and Governance',
      ],
    ],
  });

const buildDesignUndergraduate = (programName, focus) =>
  normalizeSemesters({
    expectedCount: UNDERGRADUATE_SEMESTERS,
    minCourses: 5,
    maxCourses: 7,
    programName,
    level: 'Undergraduate',
    rawSemesters: [
      [
        'Basic Design Studio',
        'Drawing and Visual Communication',
        'History of Art and Design',
        'Functional English and Communication',
        'Introduction to Digital Tools for Design',
      ],
      [
        'Design Studio I',
        'Materials and Construction Techniques',
        'Human Factors and Ergonomics',
        'Representation and Rendering Techniques',
        focus[0] || `Foundations of ${programName}`,
      ],
      [
        'Design Studio II',
        'Environmental Systems for Built Environments',
        'Structural Concepts for Designers',
        'Research Methods in Design',
        focus[1] || `Intermediate ${programName} I`,
      ],
      [
        'Design Studio III',
        'Computer Aided Design and Modeling',
        'Professional Practice in Design',
        'Design Theory and Criticism',
        focus[2] || `Intermediate ${programName} II`,
      ],
      [
        'Design Studio IV',
        'Urban and Contextual Studies',
        'Sustainable Design Strategies',
        focus[3] || `Advanced ${programName} I`,
        'Elective in Design and Humanities I',
      ],
      [
        'Design Studio V',
        'Construction Documentation and Specifications',
        'Project Management for Creative Industries',
        focus[4] || `Advanced ${programName} II`,
        'Elective in Design and Humanities II',
      ],
      [
        'Internship and Professional Attachment',
        'Research Project I',
        'Technical Elective I',
        focus[5] || `Special Topics in ${programName}`,
        'Entrepreneurship for Designers',
      ],
      [
        'Final Design Thesis Studio',
        'Research Project II',
        'Technical Elective II',
        'Design for Innovation and Social Impact',
        'Portfolio Development and Exhibition',
      ],
    ],
  });

const buildLawUndergraduate = () =>
  normalizeSemesters({
    expectedCount: UNDERGRADUATE_SEMESTERS,
    minCourses: 5,
    maxCourses: 7,
    programName: 'Law',
    level: 'Undergraduate',
    rawSemesters: [
      [
        'Legal Methods and Legal Writing',
        'Constitutional Law I',
        'Introduction to Political Science',
        'Functional English and Communication',
        'Pakistan Studies',
      ],
      [
        'Constitutional Law II',
        'Law of Torts',
        'Law of Contract I',
        'Sociology of Law',
        'Information Technology for Legal Practice',
      ],
      [
        'Law of Contract II',
        'Criminal Law I',
        'Jurisprudence',
        'Civil Procedure Code',
        'Communication and Advocacy Skills',
      ],
      [
        'Criminal Law II',
        'Law of Evidence',
        'Administrative Law',
        'Family Law',
        'Legal Research Methodology',
      ],
      [
        'Company Law',
        'Property Law',
        'Public International Law',
        'Taxation Law',
        'Alternative Dispute Resolution',
      ],
      [
        'Labour and Industrial Law',
        'Environmental Law',
        'Human Rights Law',
        'Banking and Commercial Law',
        'Elective in Legal Studies I',
      ],
      [
        'Law Clinic and Moot Court I',
        'Elective in Legal Studies II',
        'Comparative Constitutional Law',
        'Cyber Law and Digital Regulation',
        'Internship in Legal Practice',
      ],
      [
        'Law Clinic and Moot Court II',
        'Elective in Legal Studies III',
        'Legislative Drafting and Policy Analysis',
        'Professional Ethics for Lawyers',
        'Final Year Dissertation',
      ],
    ],
  });

const buildPostgraduate = (programName, focusCourses, electives) =>
  normalizeSemesters({
    expectedCount: POSTGRADUATE_SEMESTERS,
    minCourses: 4,
    maxCourses: 6,
    programName,
    level: 'Postgraduate',
    rawSemesters: [
      [
        focusCourses[0] || `Advanced Foundations of ${programName}`,
        focusCourses[1] || `Core Methods in ${programName}`,
        'Research Methodology and Scientific Writing',
        'Advanced Statistical Methods',
        `Graduate Seminar in ${programName}`,
      ],
      [
        focusCourses[2] || `Advanced Applications in ${programName}`,
        focusCourses[3] || `Systems and Practice in ${programName}`,
        focusCourses[4] || `Contemporary Issues in ${programName}`,
        `Elective in ${electives[0] || programName}`,
        'Professional Ethics and Policy Analysis',
      ],
      [
        focusCourses[5] || `Interdisciplinary Perspectives in ${programName}`,
        focusCourses[6] || `Innovation and Emerging Topics in ${programName}`,
        `Elective in ${electives[1] || programName}`,
        'Thesis Proposal Development',
        'Research Colloquium',
      ],
      [
        'Graduate Thesis Research',
        focusCourses[7] || `Advanced Topics in ${programName}`,
        `Elective in ${electives[2] || programName}`,
        'Publication and Defense Seminar',
        'Industry Internship and Professional Practice',
      ],
    ],
  });

const buildMBA = () =>
  normalizeSemesters({
    expectedCount: POSTGRADUATE_SEMESTERS,
    minCourses: 4,
    maxCourses: 6,
    programName: 'MBA / Executive MBA',
    level: 'Postgraduate',
    rawSemesters: [
      [
        'Managerial Economics for Decision Making',
        'Financial Reporting and Analysis',
        'Marketing Strategy and Customer Value',
        'Organizational Behavior and Leadership',
        'Business Communication and Executive Writing',
      ],
      [
        'Corporate Finance and Investment Decisions',
        'Operations and Supply Chain Strategy',
        'Business Analytics for Managers',
        'Strategic Human Resource Management',
        'Research Methods for Management',
      ],
      [
        'Strategic Management and Competitive Dynamics',
        'Digital Transformation and Innovation Management',
        'Elective in Entrepreneurship and Venture Development',
        'Elective in Global Business and Policy',
        'Capstone Project I',
      ],
      [
        'Corporate Governance and Business Ethics',
        'Elective in Industry and Sectoral Strategy',
        'Consulting Practicum and Internship',
        'Capstone Project II',
        'Executive Leadership Seminar',
      ],
    ],
  });

const buildUndergraduateCurriculum = ({ schoolCode, programKey, programName }) => {
  const compositeKey = `${schoolCode}-${programKey}`;

  if (compositeKey === 'SEECS-CS') {
    return buildComputerScienceUndergraduate();
  }

  if (compositeKey === 'SEECS-SE') {
    return buildSoftwareEngineeringUndergraduate();
  }

  if (compositeKey === 'SEECS-AI') {
    return buildArtificialIntelligenceUndergraduate();
  }

  if (compositeKey === 'SEECS-DS') {
    return buildDataScienceUndergraduate();
  }

  if (compositeKey === 'NLS-LLB') {
    return buildLawUndergraduate();
  }

  if (compositeKey === 'SADA-ARCH') {
    return buildDesignUndergraduate(programName, [
      'Architectural History and Theory',
      'Building Services and Environmental Control',
      'Urban Design and Planning',
      'Conservation and Heritage Studies',
      'Advanced Architectural Design Studio',
      'Computational Design and Fabrication',
    ]);
  }

  if (compositeKey === 'SADA-ID') {
    return buildDesignUndergraduate(programName, [
      'Industrial Product Development',
      'Design for Manufacturing',
      'Interaction and Experience Design',
      'Service and Systems Design',
      'Advanced Industrial Design Studio',
      'Design Research and Innovation',
    ]);
  }

  if (compositeKey === 'NBS-BBA') {
    return buildBusinessUndergraduate(programName, [
      'Consumer Behavior',
      'Business Negotiation',
      'Strategic Marketing',
      'Enterprise Risk Management',
      'Family Business Management',
      'Digital Business Models',
    ]);
  }

  if (compositeKey === 'NBS-AF') {
    return buildBusinessUndergraduate(programName, [
      'Advanced Financial Accounting',
      'Cost and Management Accounting',
      'Corporate Taxation',
      'Audit and Assurance',
      'Portfolio and Investment Management',
      'Financial Risk Analytics',
    ]);
  }

  if (compositeKey === 'NBS-THM') {
    return buildBusinessUndergraduate(programName, [
      'Hospitality Operations Management',
      'Tourism Destination Management',
      'Service Quality and Customer Experience',
      'Event and Convention Management',
      'Sustainable Tourism Planning',
      'Hotel Revenue and Distribution Management',
    ]);
  }

  if (compositeKey === 'S3H-ECON') {
    return buildSocialScienceUndergraduate(programName, [
      'Intermediate Microeconomics',
      'Intermediate Macroeconomics',
      'Econometrics I',
      'Econometrics II',
      'Development Economics',
      'International Economics',
      'Monetary Economics',
      'Public Economics',
      'Labor Economics',
      'Environmental Economics',
    ]);
  }

  if (compositeKey === 'S3H-PSY') {
    return buildSocialScienceUndergraduate(programName, [
      'Introduction to Psychology',
      'Cognitive Psychology',
      'Social Psychology',
      'Developmental Psychology',
      'Psychological Assessment',
      'Abnormal Psychology',
      'Clinical Psychology',
      'Counseling Psychology',
      'Health Psychology',
      'Organizational Psychology',
    ]);
  }

  if (compositeKey === 'S3H-MC') {
    return buildSocialScienceUndergraduate(programName, [
      'Introduction to Mass Communication',
      'Media Writing and Editing',
      'Broadcast Journalism',
      'Digital Journalism and New Media',
      'Public Relations and Strategic Communication',
      'Media Laws and Ethics',
      'Media Research Methods',
      'Documentary Production',
      'Advertising and Brand Communication',
      'Data Journalism and Visual Storytelling',
    ]);
  }

  if (compositeKey === 'S3H-PA' || compositeKey === 'JSPPL-PA') {
    return buildSocialScienceUndergraduate(programName, [
      'Introduction to Public Administration',
      'Public Policy Analysis',
      'Public Financial Management',
      'Governance and Institutional Reform',
      'Human Resource Management in Public Sector',
      'Public Procurement and Contract Management',
      'Local Government and Decentralization',
      'Monitoring and Evaluation in Public Programs',
      'E-Governance and Digital Public Services',
      'Comparative Public Administration',
    ]);
  }

  if (compositeKey === 'S3H-LAH') {
    return buildSocialScienceUndergraduate(programName, [
      'Introduction to Philosophy',
      'Cultural Studies and Identity',
      'History of Ideas',
      'Literary Theory and Criticism',
      'Religious and Ethical Thought',
      'Gender and Society',
      'Comparative Civilizations',
      'Creative Writing',
      'Translation and Interpretation Studies',
      'Digital Humanities',
    ]);
  }

  if (compositeKey === 'SNS-MATH') {
    return buildScienceUndergraduate(programName, [
      'Real Analysis',
      'Abstract Algebra',
      'Complex Analysis',
      'Ordinary Differential Equations',
      'Partial Differential Equations',
      'Numerical Analysis',
      'Topology',
      'Graph Theory',
      'Mathematical Modeling',
      'Stochastic Processes',
      'Operations Research',
      'Cryptography and Number Theory',
      'Applied Functional Analysis',
      'Mathematical Methods in Data Science',
    ]);
  }

  if (compositeKey === 'SNS-PHY') {
    return buildScienceUndergraduate(programName, [
      'Classical Mechanics',
      'Electricity and Magnetism',
      'Thermal Physics',
      'Quantum Physics I',
      'Quantum Physics II',
      'Electronics for Physicists',
      'Optics and Photonics',
      'Nuclear Physics',
      'Solid State Physics',
      'Computational Physics',
      'Astrophysics',
      'Particle Physics',
      'Advanced Laboratory in Physics',
      'Contemporary Topics in Physics',
    ]);
  }

  if (compositeKey === 'SNS-CHEM') {
    return buildScienceUndergraduate(programName, [
      'Organic Chemistry I',
      'Inorganic Chemistry I',
      'Physical Chemistry I',
      'Analytical Chemistry I',
      'Organic Chemistry II',
      'Inorganic Chemistry II',
      'Physical Chemistry II',
      'Instrumental Analysis',
      'Biochemistry',
      'Polymer Chemistry',
      'Environmental Chemistry',
      'Medicinal Chemistry',
      'Advanced Chemistry Laboratory',
      'Contemporary Topics in Chemistry',
    ]);
  }

  if (compositeKey === 'ASAB-BIO') {
    return buildScienceUndergraduate(programName, [
      'Cell Biology',
      'Molecular Biology',
      'Microbiology',
      'Biochemistry',
      'Genetics',
      'Immunology',
      'Bioinformatics Fundamentals',
      'Bioprocess Engineering',
      'Plant Biotechnology',
      'Medical Biotechnology',
      'Industrial Biotechnology',
      'Biostatistics and Experimental Design',
      'Advanced Biotechnology Laboratory',
      'Current Trends in Biotechnology',
    ]);
  }

  if (compositeKey === 'ASAB-FST') {
    return buildScienceUndergraduate(programName, [
      'Food Chemistry',
      'Food Microbiology',
      'Food Engineering Principles',
      'Food Processing and Preservation',
      'Food Quality Assurance',
      'Food Safety and Standards',
      'Dairy Science and Technology',
      'Meat and Poultry Technology',
      'Cereal and Baking Technology',
      'Food Packaging and Shelf Life',
      'Nutritional Biochemistry',
      'Food Product Development',
      'Advanced Food Technology Laboratory',
      'Emerging Technologies in Food Science',
    ]);
  }

  if (compositeKey === 'ASAB-AGR') {
    return buildScienceUndergraduate(programName, [
      'Principles of Agronomy',
      'Soil Science and Fertility',
      'Crop Physiology',
      'Plant Pathology',
      'Agricultural Entomology',
      'Irrigation and Water Management',
      'Farm Machinery and Mechanization',
      'Plant Breeding and Genetics',
      'Horticulture and Fruit Science',
      'Agricultural Economics and Marketing',
      'Precision Agriculture and Remote Monitoring',
      'Climate Smart Agriculture',
      'Advanced Agriculture Field Practicum',
      'Contemporary Issues in Agriculture',
    ]);
  }

  if (compositeKey === 'SINES-BIOINF') {
    return buildScienceUndergraduate(programName, [
      'Biology for Bioinformatics',
      'Programming for Life Sciences',
      'Data Structures for Bioinformatics',
      'Genomics and Proteomics',
      'Statistical Methods for Bioinformatics',
      'Computational Molecular Biology',
      'Machine Learning for Bioinformatics',
      'Systems Biology',
      'Clinical Bioinformatics',
      'Structural Bioinformatics',
      'Next Generation Sequencing Data Analysis',
      'Drug Discovery Informatics',
      'Advanced Bioinformatics Laboratory',
      'Frontiers in Computational Biology',
    ]);
  }

  if (['SCEE-CE', 'SCEE-ENV', 'SCEE-GEOINF'].includes(compositeKey)) {
    const focusMap = {
      'SCEE-CE': [
        'Structural Analysis',
        'Surveying and Geomatics',
        'Reinforced Concrete Design',
        'Transportation Engineering',
        'Soil Mechanics and Foundation Engineering',
        'Hydrology and Hydraulic Engineering',
        'Geotechnical Engineering',
        'Construction Planning and Scheduling',
        'Water and Wastewater Engineering',
        'Earthquake Engineering and Structural Dynamics',
        'Pavement Design and Management',
      ],
      'SCEE-ENV': [
        'Environmental Chemistry and Microbiology',
        'Air Pollution Control Engineering',
        'Water Supply and Sanitation Engineering',
        'Solid Waste Management',
        'Environmental Impact Assessment',
        'Industrial Wastewater Treatment',
        'Environmental Modeling and Simulation',
        'Climate Change Adaptation Engineering',
        'Renewable Energy and Sustainability',
        'Environmental Risk Assessment',
        'Environmental Monitoring and Compliance',
      ],
      'SCEE-GEOINF': [
        'Geospatial Data Acquisition and Processing',
        'Cartography and Map Design',
        'Geodesy and Positioning Systems',
        'Remote Sensing Principles',
        'Geographic Information Systems',
        'Spatial Database Management',
        'Photogrammetry and Digital Terrain Modeling',
        'Satellite Image Analysis',
        'Urban and Regional Geoinformatics',
        'Web and Mobile Geospatial Applications',
        'Spatial Decision Support Systems',
      ],
    };

    return buildEngineeringUndergraduate(programName, focusMap[compositeKey]);
  }

  if (['SCME-CHE', 'SCME-MME'].includes(compositeKey)) {
    const focusMap = {
      'SCME-CHE': [
        'Chemical Process Calculations',
        'Chemical Thermodynamics',
        'Fluid Flow Operations',
        'Heat Transfer Operations',
        'Mass Transfer Operations',
        'Chemical Reaction Engineering',
        'Process Control and Instrumentation',
        'Process Design and Optimization',
        'Petroleum Refining and Petrochemicals',
        'Safety and Loss Prevention in Process Industries',
        'Process Systems Engineering',
      ],
      'SCME-MME': [
        'Physical Metallurgy',
        'Materials Characterization Techniques',
        'Extractive Metallurgy',
        'Mechanical Behavior of Materials',
        'Heat Treatment and Surface Engineering',
        'Corrosion and Degradation of Materials',
        'Welding and Joining Technologies',
        'Manufacturing Processes for Metals',
        'Failure Analysis and Fracture Mechanics',
        'Advanced Functional Materials',
        'Quality Control in Metallurgical Industries',
      ],
    };

    return buildEngineeringUndergraduate(programName, focusMap[compositeKey]);
  }

  if (['SEECS-EE', 'SMME-ME', 'SMME-AE'].includes(compositeKey)) {
    const focusMap = {
      'SEECS-EE': [
        'Circuit Analysis',
        'Electronic Devices and Circuits',
        'Signals and Systems',
        'Electromagnetic Field Theory',
        'Power Systems Engineering',
        'Electrical Machines and Drives',
        'Control Systems Design',
        'Digital Signal Processing',
        'Communication Systems',
        'Embedded Systems and Internet of Things',
        'Power Electronics',
      ],
      'SMME-ME': [
        'Statics and Dynamics',
        'Mechanics of Materials',
        'Manufacturing Processes',
        'Machine Design',
        'Heat Transfer Engineering',
        'Internal Combustion Engines',
        'Engineering Tribology',
        'Finite Element Methods',
        'Mechatronics',
        'Thermal Systems Design',
        'Advanced Manufacturing Systems',
      ],
      'SMME-AE': [
        'Introduction to Aerospace Engineering',
        'Aerodynamics',
        'Aircraft Structures',
        'Flight Mechanics and Stability',
        'Propulsion Systems',
        'Avionics and Guidance Systems',
        'Aircraft Design',
        'Computational Fluid Dynamics',
        'Spacecraft Systems Engineering',
        'Aeroelasticity and Structural Dynamics',
        'Aircraft Maintenance and Safety',
      ],
    };

    return buildEngineeringUndergraduate(programName, focusMap[compositeKey]);
  }

  return buildEngineeringUndergraduate(programName, []);
};

const buildPostgraduateCurriculum = ({ schoolCode, programKey, programName }) => {
  const compositeKey = `${schoolCode}-${programKey}`;

  if (compositeKey === 'NBS-MBA') {
    return buildMBA();
  }

  const pgTrackMap = {
    'SCEE-ENV': {
      focus: [
        'Advanced Environmental Systems Engineering',
        'Industrial Ecology and Sustainable Processes',
        'Advanced Water and Wastewater Treatment',
        'Environmental Modeling and Decision Support',
        'Environmental Monitoring and Compliance Management',
        'Climate Risk and Resilience Planning',
        'Life Cycle Assessment and Circular Economy',
        'Policy and Governance for Environmental Engineering',
      ],
      electives: ['Sustainable Infrastructure', 'Environmental Policy', 'Climate Technologies'],
    },
    'SCEE-WREM': {
      focus: [
        'Advanced Hydrology and Watershed Analysis',
        'Hydraulic Structures and Design',
        'Integrated Water Resources Management',
        'Groundwater Hydraulics and Modeling',
        'Flood Risk Assessment and Mitigation',
        'Water Resources Systems Optimization',
        'Climate Impacts on Water Systems',
        'River Basin Planning and Governance',
      ],
      electives: ['Hydroinformatics', 'Urban Water Management', 'Water Policy'],
    },
    'SCEE-CEM': {
      focus: [
        'Advanced Construction Planning and Control',
        'Construction Contracts and Law',
        'Construction Cost Engineering',
        'BIM and Digital Construction Management',
        'Construction Safety Engineering',
        'Sustainable Construction and Green Buildings',
        'Lean Construction and Productivity',
        'Strategic Project Delivery Systems',
      ],
      electives: ['Infrastructure Finance', 'Construction Analytics', 'Risk Engineering'],
    },
    'SCEE-RSGIS': {
      focus: [
        'Advanced Remote Sensing and Image Processing',
        'Geospatial Analytics and Modeling',
        'Satellite Data Products and Applications',
        'Spatial Database and Geoinformatics Systems',
        'Geodesy and Positioning Technologies',
        'Urban and Environmental Geospatial Intelligence',
        'Machine Learning for Geospatial Applications',
        'Decision Support with Geospatial Technologies',
      ],
      electives: ['Spatial Modeling', 'Earth Observation', 'Geospatial Policy'],
    },
    'SCME-CHE': {
      focus: [
        'Advanced Chemical Process Design',
        'Transport Phenomena in Complex Systems',
        'Catalysis and Reactor Engineering',
        'Process Intensification and Optimization',
        'Advanced Separation Processes',
        'Process Safety and Hazard Analysis',
        'Computational Process Engineering',
        'Sustainable Chemical Engineering Systems',
      ],
      electives: ['Biochemical Engineering', 'Energy Systems', 'Industrial Sustainability'],
    },
    'SCME-MSE': {
      focus: [
        'Surface Engineering and Coatings',
        'Advanced Materials Characterization',
        'Wear, Corrosion and Degradation',
        'Thin Film Deposition Technologies',
        'Nanostructured Surface Design',
        'Tribology and Surface Interactions',
        'Functional Surface Materials',
        'Reliability of Engineered Surfaces',
      ],
      electives: ['Biomaterials', 'Protective Coatings', 'Materials Failure'],
    },
    'SCME-NSE': {
      focus: [
        'Nanomaterials Synthesis and Processing',
        'Nano Characterization Techniques',
        'Nanoelectronics and Devices',
        'Nanobiotechnology',
        'Computational Nanoscience',
        'Nanophotonics and Plasmonics',
        'Nanomaterials for Energy Applications',
        'Safety and Regulation in Nanotechnology',
      ],
      electives: ['Quantum Materials', 'Nanomedicine', 'Energy Nanotechnology'],
    },
    'SEECS-CS': {
      focus: [
        'Advanced Algorithms',
        'Distributed and Cloud Systems',
        'Advanced Database Management Systems',
        'Software Architecture and Design Patterns',
        'Advanced Operating Systems',
        'Information Retrieval and Web Mining',
        'High Performance Computing',
        'Advanced Topics in Computer Science',
      ],
      electives: ['Computer Vision', 'Cybersecurity', 'Data Engineering'],
    },
    'SEECS-AI': {
      focus: [
        'Advanced Machine Learning',
        'Deep Neural Networks',
        'Natural Language Understanding',
        'Computer Vision and Pattern Recognition',
        'Reinforcement Learning and Decision Systems',
        'Knowledge Graphs and Reasoning Systems',
        'AI Systems Engineering and MLOps',
        'Responsible and Trustworthy AI',
      ],
      electives: ['Multimodal AI', 'Robotics Intelligence', 'AI Governance'],
    },
    'SEECS-DS': {
      focus: [
        'Advanced Statistical Learning',
        'Big Data Systems and Architectures',
        'Data Engineering and Pipelines',
        'Advanced Data Visualization',
        'Causal Inference for Data Science',
        'Time Series and Forecasting Analytics',
        'Data Science Productization',
        'Responsible Data Science and Ethics',
      ],
      electives: ['Financial Analytics', 'Healthcare Analytics', 'Public Sector Analytics'],
    },
    'SEECS-IS': {
      focus: [
        'Advanced Network Security',
        'Applied Cryptography',
        'Secure Software Engineering',
        'Digital Forensics and Incident Response',
        'Security Operations and Threat Intelligence',
        'Identity and Access Management',
        'Cloud Security Architecture',
        'Governance, Risk and Compliance',
      ],
      electives: ['Malware Analysis', 'Security Automation', 'Critical Infrastructure Security'],
    },
    'SEECS-IT': {
      focus: [
        'Enterprise Information Systems',
        'IT Service Management',
        'Cloud Infrastructure and DevOps',
        'Data Governance and Architecture',
        'IT Project and Portfolio Management',
        'Business Process Integration',
        'Cybersecurity for IT Operations',
        'Digital Transformation Strategy',
      ],
      electives: ['Platform Engineering', 'IT Governance', 'Service Analytics'],
    },
    'SEECS-LT': {
      focus: [
        'Foundations of Learning Technologies',
        'Instructional Design and Learning Sciences',
        'Digital Learning Platforms and Architectures',
        'Learning Analytics and Educational Data',
        'Design for Online and Blended Learning',
        'Assessment and Evaluation in Digital Learning',
        'AI in Education and Adaptive Systems',
        'Policy and Leadership in Technology Enhanced Learning',
      ],
      electives: ['Open Education', 'Educational Media', 'Learning Experience Design'],
    },
    'SMME-ME': {
      focus: [
        'Advanced Thermofluids Engineering',
        'Advanced Machine Design',
        'Finite Element Methods in Mechanical Systems',
        'Advanced Manufacturing Engineering',
        'Computational Mechanics',
        'Mechatronic Systems Design',
        'Energy Systems Optimization',
        'Reliability and Maintenance Engineering',
      ],
      electives: ['Robotics', 'Automotive Systems', 'Industrial Energy'],
    },
    'SMME-RAI': {
      focus: [
        'Robot Kinematics and Dynamics',
        'Perception and Sensor Fusion for Robotics',
        'Planning and Control of Autonomous Systems',
        'Artificial Intelligence for Robotics',
        'Human Robot Interaction',
        'Autonomous Navigation and Mapping',
        'Industrial Robotics and Automation',
        'Safety and Ethics of Autonomous Systems',
      ],
      electives: ['Medical Robotics', 'Aerial Robotics', 'Field Robotics'],
    },
    'SMME-BME': {
      focus: [
        'Biomedical Signal Processing',
        'Biomechanics and Human Movement',
        'Medical Imaging Systems',
        'Biomaterials and Tissue Engineering',
        'Biomedical Instrumentation',
        'Clinical Engineering and Healthcare Technology Management',
        'Computational Physiology',
        'Regulatory Affairs and Quality in Medical Devices',
      ],
      electives: ['Wearable Health Systems', 'Rehabilitation Engineering', 'Digital Health'],
    },
    'SMME-DM': {
      focus: [
        'Advanced Design Methodologies',
        'Digital Manufacturing and Automation',
        'Product Lifecycle Management',
        'Design for Manufacturability and Assembly',
        'Sustainable Product Design',
        'Additive Manufacturing Systems',
        'Innovation Management for Product Development',
        'Human Centered Engineering Design',
      ],
      electives: ['Smart Manufacturing', 'Industrial Design Strategy', 'Systems Engineering'],
    },
    'SNS-MATH': {
      focus: [
        'Advanced Real Analysis',
        'Advanced Algebraic Structures',
        'Topology and Functional Analysis',
        'Numerical Methods and Scientific Computing',
        'Stochastic Processes and Applications',
        'Mathematical Modeling and Simulation',
        'Optimization Theory',
        'Contemporary Topics in Applied Mathematics',
      ],
      electives: ['Financial Mathematics', 'Computational Mathematics', 'Cryptography'],
    },
    'SNS-PHY': {
      focus: [
        'Advanced Quantum Mechanics',
        'Electrodynamics',
        'Statistical Mechanics',
        'Solid State Physics',
        'Nuclear and Particle Physics',
        'Advanced Experimental Techniques in Physics',
        'Computational Physics and Simulation',
        'Frontiers in Modern Physics',
      ],
      electives: ['Astrophysics', 'Photonics', 'Condensed Matter'],
    },
    'SNS-CHEM': {
      focus: [
        'Advanced Organic Synthesis',
        'Advanced Inorganic Chemistry',
        'Chemical Kinetics and Reaction Mechanisms',
        'Advanced Analytical Techniques',
        'Physical Chemistry of Materials',
        'Spectroscopic Characterization Methods',
        'Computational Chemistry',
        'Frontiers in Chemical Sciences',
      ],
      electives: ['Medicinal Chemistry', 'Environmental Chemistry', 'Polymer Chemistry'],
    },
    'SNS-STAT': {
      focus: [
        'Advanced Probability Theory',
        'Statistical Inference and Decision Theory',
        'Regression and Multivariate Analysis',
        'Bayesian Statistics',
        'Time Series and Forecasting',
        'Applied Biostatistics',
        'Computational Statistics',
        'Advanced Topics in Statistics',
      ],
      electives: ['Data Science', 'Econometrics', 'Official Statistics'],
    },
    'ASAB-BIO': {
      focus: [
        'Advanced Molecular Biology',
        'Advanced Genomics and Proteomics',
        'Bioprocess Design and Scale Up',
        'Applied Microbial Biotechnology',
        'Bioinformatics and Systems Biology',
        'Advanced Immunotechnology',
        'Biotechnology Product Development',
        'Regulatory Affairs in Biotechnology',
      ],
      electives: ['Medical Biotechnology', 'Agricultural Biotechnology', 'Industrial Biotechnology'],
    },
    'ASAB-MMED': {
      focus: [
        'Molecular Basis of Disease',
        'Translational Medicine',
        'Clinical Genomics and Precision Medicine',
        'Molecular Diagnostics',
        'Cancer Biology and Therapeutics',
        'Advanced Cell and Gene Therapies',
        'Biomarker Discovery and Validation',
        'Clinical Research Design and Ethics',
      ],
      electives: ['Immunotherapy', 'Molecular Pharmacology', 'Clinical Bioinformatics'],
    },
    'NBS-MS': {
      focus: [
        'Advanced Organizational Theory',
        'Strategic Management Research',
        'Advanced Marketing and Consumer Insights',
        'Corporate Finance and Value Creation',
        'Operations and Service Excellence',
        'Innovation and Entrepreneurship Strategy',
        'Leadership and Change Management',
        'Contemporary Research in Management Sciences',
      ],
      electives: ['Sustainability Management', 'Digital Strategy', 'Human Capital Analytics'],
    },
    'S3H-ECON': {
      focus: [
        'Advanced Microeconomic Theory',
        'Advanced Macroeconomic Theory',
        'Econometrics and Causal Analysis',
        'Development Economics and Policy',
        'International Trade and Finance',
        'Monetary Policy and Financial Stability',
        'Public Economics and Governance',
        'Contemporary Issues in Economics',
      ],
      electives: ['Behavioral Economics', 'Energy Economics', 'Health Economics'],
    },
    'S3H-DS': {
      focus: [
        'Theories of Development',
        'Development Planning and Management',
        'Poverty, Inequality and Inclusion',
        'Governance and Public Policy for Development',
        'Development Finance and Institutions',
        'Monitoring and Evaluation for Development Programs',
        'Sustainable Development and Climate Policy',
        'Contemporary Debates in Development Studies',
      ],
      electives: ['Rural Development', 'Urban Development', 'Gender and Development'],
    },
    'SADA-AD': {
      focus: [
        'Advanced Architectural Design Studio',
        'Theory and Criticism in Architecture',
        'Sustainable and Resilient Built Environments',
        'Computational Design and Parametric Modeling',
        'Urban Morphology and Place Making',
        'Architectural Conservation and Adaptive Reuse',
        'Research Methods in Architectural Design',
        'Contemporary Directions in Architecture',
      ],
      electives: ['Digital Fabrication', 'Urban Regeneration', 'Interior Environments'],
    },
    'SINES-CSCI': {
      focus: [
        'Computational Modeling of Complex Systems',
        'Scientific Computing and Simulation',
        'High Performance Computing for Science',
        'Numerical Methods for Interdisciplinary Applications',
        'Data Driven Discovery in Sciences',
        'Machine Learning for Scientific Research',
        'Computational Experiment Design',
        'Emerging Topics in Computational Science',
      ],
      electives: ['Computational Biology', 'Computational Physics', 'Computational Engineering'],
    },
    'SINES-CCSD': {
      focus: [
        'Climate Science and Earth Systems',
        'Mitigation and Adaptation Strategies',
        'Sustainable Infrastructure and Urban Systems',
        'Climate Economics and Policy',
        'Disaster Risk Reduction and Resilience',
        'Sustainability Metrics and Reporting',
        'Environmental Governance and International Frameworks',
        'Integrated Climate Solutions Studio',
      ],
      electives: ['Carbon Management', 'Nature Based Solutions', 'Climate Finance'],
    },
    'NSHS-HSP': {
      focus: [
        'Advanced Public Health Systems',
        'Epidemiology and Biostatistics',
        'Health Policy and Governance',
        'Health Systems Management',
        'Digital Health Informatics',
        'Global Health Challenges and Response',
        'Quality Improvement in Healthcare',
        'Ethics and Leadership in Health Sciences',
      ],
      electives: ['Health Economics', 'Hospital Administration', 'Community Health Programs'],
    },
  };

  const track = pgTrackMap[compositeKey];
  if (track) {
    return buildPostgraduate(programName, track.focus, track.electives);
  }

  return buildPostgraduate(programName, [], []);
};

const buildSemestersForProgram = ({ schoolCode, programKey, programName, level }) => {
  if (level === 'Undergraduate') {
    return buildUndergraduateCurriculum({ schoolCode, programKey, programName });
  }

  return buildPostgraduateCurriculum({ schoolCode, programKey, programName });
};

export const levelCode = (level) => (level === 'Undergraduate' ? 'UG' : 'PG');

export const buildCatalogDefinitions = () =>
  schools.map((school) => ({
    schoolCode: school.code,
    schoolName: school.name,
    programs: school.programs.flatMap((program) =>
      program.levels.map((level) => ({
        programKey: program.key,
        programName: program.name,
        level,
        semesters: buildSemestersForProgram({
          schoolCode: school.code,
          programKey: program.key,
          programName: program.name,
          level,
        }),
      })),
    ),
  }));

const LAB_KEYWORDS = [
  'programming',
  'digital logic',
  'circuit',
  'electronics',
  'signal',
  'physics',
  'chemistry',
  'biology',
  'fluid mechanics',
  'thermodynamics',
  'materials',
  'microbiology',
  'genetics',
  'biochemistry',
  'instrumentation',
  'simulation',
  'microprocessor',
  'embedded',
  'robotics',
  'biomedical',
  'laboratory',
  'lab',
];

const hasLabByName = (courseName) => {
  const normalized = String(courseName || '').toLowerCase();
  return LAB_KEYWORDS.some((keyword) => normalized.includes(keyword));
};

const toLabPayload = (courseName) => ({
  lab_name: `${courseName} Lab`,
  attendance_required: true,
});

export const inferLabMetadata = (courseName) => {
  const hasLab = hasLabByName(courseName);

  return {
    hasLab,
    labName: hasLab ? `${courseName} Lab` : null,
    labAttendanceRequired: hasLab ? true : null,
  };
};

export const buildOutputDataset = () =>
  buildCatalogDefinitions().map((school) => ({
    school_name: school.schoolName,
    programs: school.programs.map((program) => ({
      program_name: program.programName,
      level: program.level,
      semesters: program.semesters.map((semester) => ({
        semester: semester.semester,
        courses: semester.courses.map((course) => {
          const labMeta = inferLabMetadata(course.courseName);

          return {
            course_name: course.courseName,
            has_lab: labMeta.hasLab,
            lab: labMeta.hasLab ? toLabPayload(course.courseName) : null,
          };
        }),
      })),
    })),
  }));
