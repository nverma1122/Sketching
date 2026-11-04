# SCIENCE IQ — Think Beyond the Textbook

A compact, offline-first science olympiad trainer for a Grade 9 student preparing for **MVPP** (Mukhyamantri Vigyan Pratibha Pariksha, Delhi) and **VVM** (Vidyarthi Vigyan Manthan). React + Vite + TypeScript, plain CSS, progress in LocalStorage. No backend, no login, no paid APIs.

## Run it

```bash
cd science-iq
npm install
npm run dev        # http://localhost:5173 — development
npm run build      # validates the question bank, type-checks, builds into dist/
npm run preview    # serves the built app at http://localhost:4173
npm run e2e        # end-to-end test in Chromium (needs Playwright; run after build) — 28 checks
```

Open the app once while online (or from `npm run preview`). The service worker then caches everything, and the app works with no connection. On a phone or tablet, use the browser's **Add to Home screen** option to install it.

## Use it on a laptop or tablet without installing anything

`download/science-iq-offline.html` is the whole app in one file (`npm run build` regenerates it). Copy it to the laptop by USB, email or Google Drive and double-click it. It opens in the browser and works with no internet and no server.

**Moving progress between devices:** open **My Progress → Move to another device → Copy progress code** on the first device. Send the code to yourself, then paste it in the same box on the other device and tap **Import pasted code**. Importing replaces the progress on that device. The JSON export and import buttons also work in the offline file.

## What is inside

| Section | What it does |
|---|---|
| **Dashboard** | Level ring, XP, streak, accuracy, Survival best, recommended next activity, daily mission status, the 7 sections and all badges |
| **My Learning** | 20 concise lessons (principle, definitions, formulas, everyday examples, misconceptions, step-by-step worked examples). Each ends with a 3-question knowledge check and a button to practise that topic |
| **Practice Arena** | Choose subject, topic, difficulty, 5–20 questions, timed or untimed. Immediate feedback, progressive hints and full explanations. Also **Survival** (3 lives, rising difficulty, streak multiplier) and **Speed** (60 s / 120 s, +10 / −5) |
| **Olympiad Challenge** | MVPP, VVM and General Olympiad tests: countdown, question palette, mark for review, autosave and resume, auto-submit at time-out, no hints or explanations until you submit, detailed report |
| **Science IQ** | 222 unfamiliar-situation problems (what-if, numerical, experimental, interdisciplinary), each with 2+ progressive hints and an explanation of the underlying principle |
| **Mistake Master** | Every wrong answer is saved automatically. Retry mistakes, or get *new* questions from the same topics. A mistake clears only after two correct answers ≥ 10 minutes apart; a topic counts as mastered only with ≥ 6 of the last 8 correct across ≥ 4 different questions, including an Advanced/Olympiad one |
| **Daily Mission** | 10 questions across all six areas (3 Foundation, 4 Advanced, 3 Olympiad), the same all day, never repeating the last 7 missions; +50 XP; resumes if interrupted |
| **My Progress** | Totals, accuracy, XP, level, streak, personal bests, subject accuracy bars, 14-day activity chart, first-30 vs latest-30 improvement, topic weaknesses, recent tests, three recommendations, export / import / reset |

### No repeats

On each device, a question you have already seen is not shown again until you have seen every other question that matches your filters. After that, the questions you saw longest ago come back first. Practice shows how many matching questions are still unseen. Mistake Master's **Retry my mistakes** repeats questions on purpose.

### XP and levels

Correct answers earn 5 / 10 / 20 XP (Foundation / Advanced / Olympiad). Each hint used takes away 40% of that question's XP. Wrong answers earn nothing, and so do correct answers given in under 2 s on questions that need 30 s or more, because those can't be told apart from guesses. Other XP: +25 for a completed lesson (once), +50 for the daily mission, and +40 plus your marks for an Olympiad test. Opening the app earns nothing.
There are ten levels, from **Science Explorer** (0 XP) to **Science Champion** (9000 XP). There are eleven badges, each tied to measurable activity (see the Dashboard).

## Competition information (verified 3 Nov 2026)

| | Official facts | Sources |
|---|---|---|
| **MVPP 2026-27** | Directorate of Education, GNCT of Delhi (Science Branch). Two papers, **MAT** and **SAT**, each 100 questions, 100 marks, 100 minutes, **no negative marking**. Exam date 21/11/2026 (tentative). Qualifying 40% in each paper (32% SC/ST/PH). Scholarship ₹5,000 (top 1,000). The SAT subjects include Physics, Chemistry, Biology, Mathematics, Civics, History, Economics and Geography; the MAT covers verbal and non-verbal reasoning, quantitative aptitude and data interpretation. **No subject-wise split or chapter list is published.** | DoE circular F.No.DE.40(13)/Sc.Br./MVPP/2026/2766-2773 (08/09/2026); DoE circular 582-85 (01/11/2021) for the subject list |
| **VVM 2026-27** | Level-I: 100 MCQs, 90 minutes. Section A (30 min): 20 Indian Contributions to Science + 20 life stories (Class IX: **Asima Chatterjee**). Section B (60 min): 12 each of Physics, Chemistry, Mathematics, Biology and Logic & Reasoning. The syllabus page gives 4 marks per question with −1 per wrong answer in Section B; the Level-I page says 1 mark each, so the two official pages conflict. Class IX syllabus: Motion, Laws of motion, Gravitation, Floatation, Work & energy, Sound; Mixtures, the Atom, Atomic foundations of matter; Cell, Tissues, Reproduction, Diversity & classification, Biogeochemical cycles | vvm.org.in/syllabus; vvm.org.in/school-level-exam-i; VVM 2026-27 Class IX syllabus PDF |

**How the app uses this:**
- **The tests are practice simulations, not copies of the official papers.** The app labels each test that way and shows the official facts beside it.
- **MVPP Challenge:** 40 questions in 40 minutes, the official pace of 1 minute per question, with no negative marking. It does not include Mathematics or Social Science.
- **VVM Challenge:** follows Section B without Maths. It has 48 questions in 48 minutes, marked +4 / −1. Section A is not simulated.
- **Competition tags:** each question gets a `tracks` tag, worked out by the build script and never typed by hand.
  - **VVM** = the topic is named in the official VVM 2026-27 Class IX syllabus.
  - **MVPP** = the subject is named in the official circular. Relevance is subject-level only, because no chapter list is published.
  - **GEN** = general science practice. Every question has this tag.

## The question bank

- **1,000 questions**, all validated. By subject: Physics 200, Chemistry 180, Biology 220, Space Science 100, Environment & Technology 100, Scientific Reasoning 200. By level: Foundation 193, Advanced 446, Olympiad 361. 222 are Science IQ problems.
- **Question types:** concept MCQs, numerical, assertion–reason, statement-based, scientific reasoning, experimental situations, application, data interpretation (with tables), interdisciplinary and what-if questions.
- Every question has:
  - ID, subject, topic, level, type and competition tracks
  - four distinct options and the correct answer
  - an explanation, plus the common trap where useful
  - progressive hints and an estimated solving time

**Where it lives.** You write questions in `scripts/src/*.mjs`. `npm run bank` (also part of `npm run build`) validates them and writes the structured JSON files the app loads: `src/data/bank/{physics,chemistry,biology,space,envtech,reasoning}.json`.

**The quality gate in `scripts/build-bank.mjs`.** The build refuses to write the bank if any check fails:
- The ID is unique, the topic is known, and the level and type are valid.
- There are exactly four distinct options, and the answer index is valid.
- The explanation is at least 40 characters, there is at least one hint, and the time is 15–300 s.
- Science IQ problems have at least two hints.
- **Answers are recomputed independently.** Every numerical question carries a formula (`v`) that is evaluated separately. The keyed option must match it within 0.6%, and no other option may match it. 235 answers are checked this way, and the check already caught several real errors while the bank was being written.
- **Answer positions are balanced.** Options are shuffled in a fixed order based on each question's ID, so the correct answer is not always A (current split A/B/C/D: 259 / 229 / 255 / 257). Assertion–reason questions keep their standard option order.
- **Near-duplicate detection.** Question texts are normalised, with numbers replaced by `#`, then compared by word-trigram similarity. Anything at 0.6 or above is rejected, so a question with only its numbers changed cannot get in.

### Adding questions

1. Add objects to a file in `scripts/src/` (for example a new `physics-2.mjs`). Use the same keys as the existing entries: `id, t, d, ty, q, o, a, e, m, h, s, iq, v`.
2. Run `npm run bank`. Fix anything it reports. Nothing is written until every question passes.
3. Run `npm run build`.

Only questions that pass are written, and every written question carries `verified: true`. A question you are unsure of should not be added.

## Privacy

Progress stays in this browser's LocalStorage under `science-iq.progress.v1`. Nothing is sent anywhere. **Export** downloads a JSON backup, **Import** restores one, and **Reset** (you must type RESET) deletes everything.
