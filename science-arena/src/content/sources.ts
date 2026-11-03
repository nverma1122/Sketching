// Source register. Shown in-app (Sources page) and mirrored in docs/SOURCES.md.
// reliability: 'official' = issued by the examining body; 'institutional' = government / NCERT /
// scientific institution; 'secondary' = third-party summary, used only to cross-check.

export interface Source {
  id: string;
  title: string;
  publisher: string;
  url: string;
  accessed: string; // ISO date
  topics: string;
  reliability: 'official' | 'institutional' | 'secondary';
  licence: string;
}

export const SOURCES: Source[] = [
  {
    id: 'S1',
    title: 'Circular: Mukhyamantri Vigyan Pratibha Pariksha 2026-27 (F.No.DE.40(13)/Sc.Br./MVPP/2026/2766-2773, dated 08/09/2026)',
    publisher: 'Directorate of Education, GNCT of Delhi — Science Branch',
    url: 'https://theindianschool.in/uploads/Uploads%202026-27/Notice%20and%20Circular/17891085298127-doe-circular-mukhyamantri-vigyan-pratibha-pariksha.pdf',
    accessed: '2026-11-03',
    topics: 'MVPP eligibility, exam date (21/11/2026, tentative), pattern: MAT 100 Q / 100 marks / 100 min, SAT 100 Q / 100 marks / 100 min, no negative marking, qualifying marks, scholarship (₹5,000, top 1,000).',
    reliability: 'official',
    licence: 'Government circular (public notice). Facts summarised, not reproduced.',
  },
  {
    id: 'S1b',
    title: 'Circular: Mukhyamantri Vigyan Pratibha Pariksha (F.No.DE.40(13)/Sc.Br./MVPP/2021/582-85, dated 01/11/2021)',
    publisher: 'Directorate of Education, GNCT of Delhi — Science & TV Branch',
    url: 'https://edudel.nic.in/upload/upload_2021_22/582_85_dt_02112021.pdf',
    accessed: '2026-11-03',
    topics: 'Only official MVPP subject list found: SAT — Chemistry, Biology, Mathematics, Physics, Civics, History, Economics, Geography; MAT — verbal & non-verbal reasoning, quantitative aptitude, data interpretation. (2021 durations were 120 min; superseded by S1.)',
    reliability: 'official',
    licence: 'Government circular (public notice).',
  },
  {
    id: 'S2',
    title: 'Vidyarthi Vigyan Manthan 2026-27 Syllabus (Class IX)',
    publisher: 'Vijnana Bharati / VVM',
    url: 'https://d32lt7x711uuz8.cloudfront.net/2627/syllabus/T4CKwRhgUinR27gInnjEeifF1EqDmDSiaQVlkwwE.pdf',
    accessed: '2026-11-03',
    topics: 'Class IX Physics (motion, laws of motion, gravitation, floatation, work & energy, sound), Chemistry (mixtures, atom, atomic foundations), Biology (cell, tissues, reproduction, diversity, biogeochemical cycles), Mathematics, Logic & Reasoning, life story (Asima Chatterjee), Indian Contributions to Science Vol-II.',
    reliability: 'official',
    licence: 'Syllabus summarised; not reproduced.',
  },
  {
    id: 'S3',
    title: 'VVM — The Syllabus of Examination / Pattern of Question Paper',
    publisher: 'Vijnana Bharati / VVM',
    url: 'https://vvm.org.in/syllabus',
    accessed: '2026-11-03',
    topics: 'Level-I: 100 MCQs, 90 min. Section A (30 min): 20 Indian Contributions to Science + 20 life stories. Section B (60 min): 12 each of Physics, Chemistry, Mathematics, Biology, Logic & Reasoning. 4 marks each (400); −1 per wrong answer in Section B only. Section B evaluated only if Section A ≥ 50%.',
    reliability: 'official',
    licence: 'Pattern summarised.',
  },
  {
    id: 'S3b',
    title: 'VVM — School Level Exam Level-I',
    publisher: 'Vijnana Bharati / VVM',
    url: 'https://vvm.org.in/school-level-exam-i',
    accessed: '2026-11-03',
    topics: 'Same 100 MCQ / 90 min / Section A 40 + Section B 60 structure, but states 1 mark each (100 marks), a 50/20/20/10 content split and no negative-marking note. CONFLICTS with S3 on marking — the app lets you choose either scheme.',
    reliability: 'official',
    licence: 'Pattern summarised.',
  },
  {
    id: 'S4',
    title: 'Vidyarthi Vigyan Manthan 2025-26 Syllabus (Class IX)',
    publisher: 'Vijnana Bharati / VVM',
    url: 'https://vvm.org.in/assets/pdf/detailed-syllabus/syllabus-vvm-2025-26-class-ix.pdf',
    accessed: '2026-11-03',
    topics: 'Previous-year syllabus (life story: S.N. Bose; Chemistry "Matter in our surroundings", "Is matter around us pure?"; Biology crop production, animal husbandry). Used to identify what changed for 2026-27.',
    reliability: 'official',
    licence: 'Syllabus summarised.',
  },
  {
    id: 'S5',
    title: 'NCERT Science Textbook for Class IX',
    publisher: 'National Council of Educational Research and Training',
    url: 'https://ncert.nic.in/textbook.php',
    accessed: '2026-11-03',
    topics: 'Concept scope and depth for Class IX physics, chemistry and biology. Questions are original; no textbook text is reproduced.',
    reliability: 'institutional',
    licence: '© NCERT. Used for scope only.',
  },
  {
    id: 'S6',
    title: 'ISRO — Missions',
    publisher: 'Indian Space Research Organisation',
    url: 'https://www.isro.gov.in/',
    accessed: '2026-11-03',
    topics: 'Chandrayaan-1/2/3, Mars Orbiter Mission, Aditya-L1 facts and dates.',
    reliability: 'institutional',
    licence: 'Facts only.',
  },
  {
    id: 'S7',
    title: 'Nobel Prize facts (Physics 1930, Chemistry, Medicine)',
    publisher: 'Nobel Prize Outreach',
    url: 'https://www.nobelprize.org/',
    accessed: '2026-11-03',
    topics: 'C.V. Raman (Physics 1930), Har Gobind Khorana (Medicine 1968), S. Chandrasekhar (Physics 1983), Venkatraman Ramakrishnan (Chemistry 2009).',
    reliability: 'institutional',
    licence: 'Facts only.',
  },
  {
    id: 'S8',
    title: 'Indian National Science Academy / Indian Academy of Sciences biographical memoirs',
    publisher: 'INSA / IASc',
    url: 'https://www.ias.ac.in/',
    accessed: '2026-11-03',
    topics: 'Biographical facts on Asima Chatterjee, Anna Mani, Janaki Ammal, Meghnad Saha, J.C. Bose, S.N. Bose.',
    reliability: 'institutional',
    licence: 'Facts only.',
  },
];

export const sourceById = Object.fromEntries(SOURCES.map((s) => [s.id, s]));
