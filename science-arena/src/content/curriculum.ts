import type { ExamTag, SubjectId } from '../engine/types';

// The subject → chapter → topic map. `exams` says where a chapter sits:
//  - VVM: listed in the official VVM 2026-27 Class IX syllabus (see sources.ts, S2).
//  - MVPP: the MVPP circular names subjects only (Physics, Chemistry, Biology, Mathematics …
//    in SAT; reasoning in MAT) — it gives no chapter list. MVPP mapping to Class IX chapters
//    is therefore an informed preparation recommendation, flagged `mvppInferred`.
//  - GEN: advanced/extension science beyond both syllabi (still valuable for competition depth).

export interface Subject {
  id: SubjectId;
  name: string;
  short: string;
  icon: string; // emoji glyph used as an icon
  color: string; // CSS variable name
}

export interface Chapter {
  id: string;
  subject: SubjectId;
  name: string;
  exams: ExamTag[];
  mvppInferred?: boolean;
  topics: string[];
  boss?: string;
  /** Official syllabus wording this chapter covers, where one exists. */
  syllabusNote?: string;
}

export const SUBJECTS: Subject[] = [
  { id: 'physics', name: 'Physics', short: 'PHY', icon: '⚛', color: '--c-physics' },
  { id: 'chemistry', name: 'Chemistry', short: 'CHE', icon: '⚗', color: '--c-chemistry' },
  { id: 'biology', name: 'Biology', short: 'BIO', icon: '🧬', color: '--c-biology' },
  { id: 'space', name: 'Space Science', short: 'SPA', icon: '🪐', color: '--c-space' },
  { id: 'techenv', name: 'Technology & Environment', short: 'T&E', icon: '🔋', color: '--c-techenv' },
  { id: 'indian', name: 'Indian Contributions & Scientists', short: 'ICS', icon: '🏛', color: '--c-indian' },
  { id: 'reasoning', name: 'Scientific & Logical Reasoning', short: 'REA', icon: '🧩', color: '--c-reasoning' },
  { id: 'maths', name: 'Mathematics', short: 'MAT', icon: '∑', color: '--c-maths' },
];

export const subjectById = Object.fromEntries(SUBJECTS.map((s) => [s.id, s])) as Record<SubjectId, Subject>;

export const CHAPTERS: Chapter[] = [
  // ---------------------------------------------------------------- PHYSICS
  {
    id: 'motion', subject: 'physics', name: 'Motion', exams: ['VVM', 'MVPP'], mvppInferred: true, boss: 'Kinematics Hydra',
    topics: ['Distance & displacement', 'Speed & velocity', 'Acceleration', 'Motion graphs', 'Equations of motion', 'Relative motion', 'Circular motion'],
    syllabusNote: 'VVM: distance and displacement, velocity; uniform and non-uniform motion; acceleration; distance–time and velocity–time graphs; elementary idea of uniform circular motion.',
  },
  {
    id: 'laws-of-motion', subject: 'physics', name: 'Force & Laws of Motion', exams: ['VVM', 'MVPP'], mvppInferred: true, boss: "Newton's Laws Titan",
    topics: ['Inertia', "Newton's first law", "Newton's second law", "Newton's third law", 'Momentum', 'Conservation of momentum', 'Friction', 'Impulse'],
    syllabusNote: "VVM: Newton's laws, action–reaction, inertia and mass, momentum, force and acceleration, elementary conservation of momentum.",
  },
  {
    id: 'gravitation', subject: 'physics', name: 'Gravitation', exams: ['VVM', 'MVPP'], mvppInferred: true, boss: 'Gravity Colossus',
    topics: ['Universal law of gravitation', 'Acceleration due to gravity', 'Mass & weight', 'Free fall', 'Variation of g'],
    syllabusNote: 'VVM: universal law, gravity of the Earth, acceleration due to gravity, mass and weight, free fall.',
  },
  {
    id: 'floatation', subject: 'physics', name: 'Pressure & Floatation', exams: ['VVM', 'MVPP'], mvppInferred: true, boss: 'Kraken of Buoyancy',
    topics: ['Thrust & pressure', 'Fluid pressure', "Archimedes' principle", 'Buoyancy', 'Density & relative density', 'Floating & sinking'],
    syllabusNote: "VVM (Floatation): thrust and pressure, Archimedes' principle, buoyancy.",
  },
  {
    id: 'work-energy', subject: 'physics', name: 'Work, Energy & Power', exams: ['VVM', 'MVPP'], mvppInferred: true, boss: 'Energy Leviathan',
    topics: ['Work', 'Kinetic energy', 'Potential energy', 'Conservation of energy', 'Power', 'Efficiency'],
    syllabusNote: 'VVM: work, energy, power, kinetic and potential energy, conservation of energy (excluding commercial unit).',
  },
  {
    id: 'sound', subject: 'physics', name: 'Sound & Waves', exams: ['VVM', 'MVPP'], mvppInferred: true, boss: 'Sonic Wraith',
    topics: ['Nature of waves', 'Wave equation', 'Propagation of sound', 'Speed of sound', 'Echo & reflection', 'Range of hearing & ultrasound', 'Doppler effect'],
    syllabusNote: 'VVM: nature and propagation of sound, speed of sound, range of hearing, ultrasound, reflection of sound, echo.',
  },
  {
    id: 'light', subject: 'physics', name: 'Light & Optics (extension)', exams: ['GEN'], boss: 'Prism Phantom',
    topics: ['Reflection', 'Refraction', 'Mirrors', 'Lenses', 'Dispersion', 'Human eye'],
  },
  {
    id: 'electricity', subject: 'physics', name: 'Electricity & Magnetism (extension)', exams: ['GEN'], boss: 'Voltage Golem',
    topics: ['Current & charge', "Ohm's law", 'Series & parallel', 'Electrical power', 'Magnetic effects', 'Electromagnetic induction'],
  },
  // ---------------------------------------------------------------- CHEMISTRY
  {
    id: 'matter', subject: 'chemistry', name: 'Matter in Our Surroundings', exams: ['MVPP', 'GEN'], mvppInferred: true, boss: 'Phase Shifter',
    topics: ['Particle model', 'Diffusion', 'States of matter', 'Changes of state', 'Latent heat', 'Evaporation', 'Gas behaviour'],
  },
  {
    id: 'mixtures', subject: 'chemistry', name: 'Mixtures & Their Separation', exams: ['VVM', 'MVPP'], mvppInferred: true, boss: 'Chromatography Chimera',
    topics: ['Pure substances & mixtures', 'Solutions & concentration', 'Colloids & suspensions', 'Separation techniques', 'Physical vs chemical change'],
    syllabusNote: 'VVM 2026-27: "Exploring Mixtures and their Separation".',
  },
  {
    id: 'atoms-molecules', subject: 'chemistry', name: 'Atoms, Molecules & the Mole', exams: ['VVM', 'MVPP'], mvppInferred: true, boss: 'Mole Monarch',
    topics: ['Laws of chemical combination', 'Atomic & molecular mass', 'Chemical formulae & valency', 'Mole concept', 'Percentage composition'],
    syllabusNote: 'VVM 2026-27: "Atomic Foundations of Matter".',
  },
  {
    id: 'atom-structure', subject: 'chemistry', name: 'Structure of the Atom', exams: ['VVM', 'MVPP'], mvppInferred: true, boss: 'Atomic Structure Sentinel',
    topics: ['Subatomic particles', 'Atomic models', 'Electronic configuration', 'Valency', 'Isotopes & isobars', 'Average atomic mass'],
    syllabusNote: 'VVM 2026-27: "Journey Inside the Atom".',
  },
  {
    id: 'reactions', subject: 'chemistry', name: 'Reactions, Acids, Bases & Salts (extension)', exams: ['GEN'], boss: 'Redox Revenant',
    topics: ['Types of reactions', 'Balancing equations', 'Oxidation & reduction', 'Acids & bases', 'pH', 'Salts'],
  },
  {
    id: 'periodic-bonding', subject: 'chemistry', name: 'Periodic Table, Bonding & Carbon (extension)', exams: ['GEN'], boss: 'Periodic Overlord',
    topics: ['Periodic trends', 'Ionic & covalent bonds', 'Metals & non-metals', 'Carbon compounds', 'Electrolysis & corrosion'],
  },
  // ---------------------------------------------------------------- BIOLOGY
  {
    id: 'cell', subject: 'biology', name: 'The Cell & Cell Division', exams: ['VVM', 'MVPP'], mvppInferred: true, boss: 'Cell Biology Leviathan',
    topics: ['Cell theory', 'Cell membrane & osmosis', 'Organelles', 'Plant vs animal cells', 'Mitosis', 'Meiosis'],
    syllabusNote: 'VVM 2026-27: cell structure and function, cell division.',
  },
  {
    id: 'tissues', subject: 'biology', name: 'Plant & Animal Tissues', exams: ['VVM', 'MVPP'], mvppInferred: true, boss: 'Tissue Titan',
    topics: ['Meristematic tissue', 'Permanent plant tissue', 'Epithelial tissue', 'Connective tissue', 'Muscle tissue', 'Nervous tissue'],
    syllabusNote: 'VVM 2026-27: animal tissues, plant tissues.',
  },
  {
    id: 'diversity', subject: 'biology', name: 'Diversity & Classification', exams: ['VVM', 'MVPP'], mvppInferred: true, boss: 'Taxonomy Hydra',
    topics: ['Basis of classification', 'Five kingdoms', 'Microorganisms & viruses', 'Plant groups', 'Animal phyla', 'Nomenclature'],
    syllabusNote: 'VVM 2026-27: "Patterns in Life: Diversity and Classification".',
  },
  {
    id: 'reproduction', subject: 'biology', name: 'Reproduction: How Life Continues', exams: ['VVM', 'GEN'], boss: 'Lifecycle Sphinx',
    topics: ['Asexual reproduction', 'Sexual reproduction in plants', 'Human reproduction', 'DNA copying & variation'],
    syllabusNote: 'VVM 2026-27: "Reproduction: How Life Continues".',
  },
  {
    id: 'ecology', subject: 'biology', name: 'Ecology & Biogeochemical Cycles', exams: ['VVM', 'MVPP'], mvppInferred: true, boss: 'Cycle Wyrm',
    topics: ['Ecosystems', 'Food chains & webs', 'Energy flow', 'Carbon cycle', 'Nitrogen cycle', 'Water cycle', 'Human intervention'],
    syllabusNote: 'VVM 2026-27: "Biogeochemical cycle and human intervention".',
  },
  {
    id: 'human-bio', subject: 'biology', name: 'Human Biology & Health (extension)', exams: ['GEN', 'MVPP'], mvppInferred: true, boss: 'Physiology Phantom',
    topics: ['Digestion', 'Respiration', 'Circulation & blood', 'Excretion', 'Nervous & endocrine', 'Immunity & disease', 'Nutrition'],
  },
  {
    id: 'genetics', subject: 'biology', name: 'Genetics & Evolution (extension)', exams: ['GEN'], boss: 'Genetics Gorgon',
    topics: ['DNA & genes', 'Mendelian genetics', 'Sex determination', 'Natural selection', 'Evolution evidence'],
  },
  {
    id: 'food-resources', subject: 'biology', name: 'Improvement in Food Resources', exams: ['MVPP'], mvppInferred: true,
    topics: ['Crop variety improvement', 'Crop production management', 'Animal husbandry'],
    syllabusNote: 'In VVM 2025-26 Class IX syllabus; dropped from VVM 2026-27. Kept for MVPP (traditional NCERT Class IX content).',
  },
  // ---------------------------------------------------------------- SPACE
  {
    id: 'solar-system', subject: 'space', name: 'Solar System & Earth in Space', exams: ['GEN'], boss: 'Orbit Warden',
    topics: ['Planets', 'Moons & phases', 'Small bodies', 'Seasons & eclipses', 'Orbits & satellites'],
  },
  {
    id: 'stars-universe', subject: 'space', name: 'Stars, Galaxies & the Universe', exams: ['GEN'], boss: 'Supernova Sovereign',
    topics: ['The Sun', 'Life cycle of stars', 'Neutron stars & black holes', 'Galaxies', 'Big Bang & light-years'],
  },
  {
    id: 'isro', subject: 'space', name: 'Indian & Global Space Missions', exams: ['GEN', 'VVM'], boss: 'Mission Control Mainframe',
    topics: ['ISRO missions', 'Chandrayaan', 'Mangalyaan', 'Aditya-L1', 'Space telescopes', 'Launch vehicles'],
  },
  // ---------------------------------------------------------------- TECH & ENVIRONMENT
  {
    id: 'emerging-tech', subject: 'techenv', name: 'Emerging Science & Technology', exams: ['GEN'], boss: 'Singularity Engine',
    topics: ['AI & machine learning', 'Biotechnology & CRISPR', 'Semiconductors', 'Nanotechnology', 'Sensors & IoT', 'Medical technology', 'Quantum computing'],
  },
  {
    id: 'energy-environment', subject: 'techenv', name: 'Energy & Environment', exams: ['GEN', 'VVM'], boss: 'Climate Kraken',
    topics: ['Greenhouse effect', 'Ozone layer', 'Renewable energy', 'Nuclear energy', 'Pollution', 'Conservation movements & conventions'],
  },
  // ---------------------------------------------------------------- INDIAN CONTRIBUTIONS
  {
    id: 'ics', subject: 'indian', name: 'Indian Contributions to Science', exams: ['VVM', 'GEN'], boss: 'Sage of the Siddhantas',
    topics: ['Ancient mathematics', 'Ancient astronomy', 'Metallurgy', 'Medicine & Ayurveda', 'Modern Indian science', 'Scientific institutions'],
    syllabusNote: 'VVM Section A (20 questions) is set from the VVM study material "Indian Contributions to Science: Volume-II" (Vijnana Bharati). That book is not reproduced here — these are original questions on overlapping, independently verifiable facts.',
  },
  {
    id: 'scientists', subject: 'indian', name: 'Life Stories of Scientists', exams: ['VVM', 'GEN'], boss: 'Council of Laureates',
    topics: ['Asima Chatterjee', 'Anna Mani', 'Rohini Godbole', 'C.V. Raman', 'J.C. Bose', 'S.N. Bose', 'Homi Bhabha & Vikram Sarabhai', 'Other scientists'],
    syllabusNote: 'VVM 2026-27 Class IX life story: Asima Chatterjee — "Unlocking Nature\'s Chemistry" (20 questions in Section A from the VVM booklet). Original questions here use widely documented biographical facts only.',
  },
  // ---------------------------------------------------------------- REASONING
  {
    id: 'sci-reasoning', subject: 'reasoning', name: 'Scientific Reasoning & Experiment', exams: ['VVM', 'MVPP', 'GEN'], boss: 'Hypothesis Hydra',
    topics: ['Variables & fair tests', 'Observation vs inference', 'Graph interpretation', 'Data interpretation', 'Experimental error', 'Assertion–reason'],
  },
  {
    id: 'logic', subject: 'reasoning', name: 'Logical & Mental Ability', exams: ['MVPP', 'VVM'], boss: 'Labyrinth Mind',
    topics: ['Number & letter series', 'Coding–decoding', 'Analogy & odd one out', 'Blood relations', 'Direction sense', 'Order & ranking', 'Clocks & calendars', 'Syllogism', 'Venn diagrams', 'Mathematical operations', 'Data sufficiency'],
    syllabusNote: 'MVPP Paper I (MAT): verbal & non-verbal reasoning, quantitative aptitude, data interpretation. VVM Section B: 12 Logic & Reasoning questions.',
  },
  // ---------------------------------------------------------------- MATHS
  {
    id: 'maths', subject: 'maths', name: 'Mathematics for VVM & MVPP', exams: ['VVM', 'MVPP'], mvppInferred: true,
    topics: ['Number systems & surds', 'Polynomials & factor theorem', 'Linear equations', 'Geometry', 'Mensuration & Heron', 'Statistics & probability', 'Coordinate geometry', 'AP & GP', 'Sets & counting'],
    syllabusNote: 'VVM Section B: 12 Mathematics questions (VVM 2026-27 Class IX syllabus). MVPP SAT lists Mathematics.',
  },
];

export const chapterById = Object.fromEntries(CHAPTERS.map((c) => [c.id, c])) as Record<string, Chapter>;

export const chaptersOf = (s: SubjectId) => CHAPTERS.filter((c) => c.subject === s);
