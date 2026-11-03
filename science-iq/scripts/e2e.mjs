// End-to-end test: drives the production build in real Chromium, clicking through every major
// feature and checking the stored progress. Run after `npm run build`:  npm run e2e
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // pre-installed globally; or npm i -D playwright
import { spawn } from 'node:child_process';
import { readFileSync, readdirSync, mkdirSync } from 'node:fs';

const PORT = 4318;
const URL = `http://localhost:${PORT}/`;
const KEY = 'science-iq.progress.v1';
const BANK = Object.fromEntries(readdirSync('src/data/bank').flatMap((f) => JSON.parse(readFileSync(`src/data/bank/${f}`, 'utf8'))).map((q) => [q.id, q]));
const XP = [0, 5, 10, 20];
mkdirSync('shots', { recursive: true });

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
await new Promise((r) => setTimeout(r, 2500));

let passed = 0;
const failures = [];
async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log('  ✓', name);
  } catch (e) {
    failures.push(name);
    console.log('  ✗', name, '—', e.message.split('\n')[0]);
  }
}
const assert = (c, m) => {
  if (!c) throw new Error(m);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, acceptDownloads: true });
const page = await ctx.newPage();
page.setDefaultTimeout(8000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const store = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), KEY);
const qid = () => page.locator('.qcard').first().getAttribute('data-qid');
const opts = () => page.locator('.qcard .opt');

/** Answer the current question correctly (right=true) or wrongly; returns {id, right}. */
async function answer(right, { check: doCheck = true } = {}) {
  const id = await qid();
  const q = BANK[id];
  const idx = right ? q.answer : (q.answer + 1) % 4;
  await opts().nth(idx).click();
  if (doCheck) await page.getByRole('button', { name: 'Check answer' }).click();
  return { id, right, q };
}

await page.goto(URL);
await page.evaluate(() => localStorage.clear());
await page.reload();

console.log('Dashboard & navigation');
await check('dashboard shows title, level ring and 7 sections', async () => {
  await page.getByText('Welcome, scientist.').waitFor();
  assert((await page.locator('.grid-sections .section').count()) === 7, 'expected 7 section cards');
});
await check('every navigation link opens its page', async () => {
  for (const [hash, heading] of [['learn', 'My Learning'], ['practice', 'Practice Arena'], ['olympiad', 'Olympiad Challenge'], ['iq', 'Science IQ'], ['mistakes', 'Mistake Master'], ['daily', 'Daily Mission'], ['progress', 'My Progress'], ['home', 'Welcome']]) {
    await page.locator(`.nav nav a[href="#/${hash}"]`).click();
    await page.locator('h1', { hasText: heading }).first().waitFor({ timeout: 3000 });
  }
});

console.log('Practice Arena');
let practiceXp = 0;
let wrongIds = [];
await check('subject + difficulty filters build a matching set', async () => {
  await page.goto(URL + '#/practice');
  await page.getByRole('button', { name: /Physics/ }).first().click();
  await page.locator('.seg button', { hasText: 'Foundation' }).click();
  await page.locator('.seg button', { hasText: /^5$/ }).click();
  await page.getByRole('button', { name: 'Start practice →' }).click();
  const id = await qid();
  assert(BANK[id].subject === 'Physics' && BANK[id].level === 1, `got ${id}`);
});
await check('hint button reveals progressive hints', async () => {
  await page.getByRole('button', { name: /Hint/ }).click();
  await page.locator('.hint').first().waitFor();
});
await check('answers are evaluated correctly, explanations shown, XP correct', async () => {
  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(2100); // answers faster than 2 s on ≥ 30 s questions earn no XP by design
    const r = await answer(i % 2 === 0);
    const verdict = await page.locator('.verdict').textContent();
    assert(r.right ? verdict.includes('Correct') : verdict.includes('Not quite'), `verdict "${verdict}" for ${r.id}`);
    await page.locator('.explain').getByText(r.q.explanation.slice(0, 30)).waitFor();
    if (r.right) practiceXp += i === 0 ? Math.round(XP[1] * 0.6) : XP[1];
    else wrongIds.push(r.id);
    await page.getByRole('button', { name: /Continue|See results/ }).click();
  }
  await page.getByText('Practice complete').waitFor();
  const s = await store();
  assert(s.attempts.length === 5, `attempts ${s.attempts.length}`);
  assert(s.xp === practiceXp, `xp ${s.xp} expected ${practiceXp}`);
});
await check('results show score, accuracy, time and revision topics', async () => {
  await page.getByText('Accuracy').first().waitFor();
  await page.getByText('Topics requiring revision').waitFor();
  assert((await page.locator('.kpi').first().textContent()).includes('3/5'), 'score 3/5');
});
await check('wrong answers are saved in Mistake Master', async () => {
  const s = await store();
  for (const id of wrongIds) assert(s.mistakes[id]?.wrong === 1, `mistake ${id} missing`);
  await page.goto(URL + '#/mistakes');
  await page.getByText(`Active (${wrongIds.length})`).waitFor();
});
await check('progress survives a page reload', async () => {
  await page.reload();
  const s = await store();
  assert(s.attempts.length === 5 && s.xp === practiceXp, 'lost progress');
  await page.goto(URL + '#/progress');
  await page.locator('.kpi', { hasText: 'Questions attempted' }).getByText('5').waitFor();
});

console.log('Mistake Master');
await check('retry mistakes serves the mistaken questions; clearing needs two spaced correct answers', async () => {
  await page.goto(URL + '#/mistakes');
  await page.getByRole('button', { name: /Retry my mistakes/ }).click();
  const id = await qid();
  assert(wrongIds.includes(id), 'retry served a non-mistake');
  await page.waitForTimeout(2100);
  await answer(true);
  const m = (await store()).mistakes[id];
  assert(m.right === 1 && !m.cleared, 'one immediate correct answer must not clear a mistake');
});
await check('“new questions on the same topics” avoids mistaken questions', async () => {
  await page.locator('.nav nav a[href="#/mistakes"]').click(); // clicking the current section restarts it
  await page.getByRole('button', { name: /New questions on the same topics/ }).click();
  const id = await qid();
  const s = await store();
  assert(!s.mistakes[id], 'served a mistaken question');
  const topics = new Set(Object.keys(s.mistakes).map((k) => BANK[k].topic));
  assert(topics.has(BANK[id].topic), 'not from a mistake topic');
});

console.log('Learning');
await check('lesson: step-by-step worked example, knowledge check completes lesson (+25 XP once)', async () => {
  await page.goto(URL + '#/learn/newton');
  await page.getByRole('button', { name: 'Show solution step by step' }).first().click();
  await page.locator('.worked ol li').first().waitFor();
  const before = (await store()).xp;
  await page.getByRole('button', { name: /Knowledge check/ }).click();
  let gained = 0;
  for (let i = 0; i < 3; i++) {
    await page.waitForTimeout(2100);
    const r = await answer(true);
    gained += XP[r.q.level];
    await page.getByRole('button', { name: /Continue|See results/ }).click();
  }
  await page.getByText('Knowledge check: 3/3 correct').waitFor();
  const s = await store();
  assert(s.lessonsDone.includes('newton'), 'lesson not recorded');
  assert(s.xp === before + gained + 25, `xp ${s.xp} vs ${before + gained + 25}`);
});
await check('“Practise this topic” opens practice filtered to the topic', async () => {
  await page.getByRole('button', { name: 'Practise this topic →' }).click();
  assert((await page.locator('select').inputValue()) === "Force & Newton's Laws", 'topic not preset');
});

console.log('Daily Mission');
await check('mission has 10 questions from ≥ 5 subjects; resumes after reload; completes with +50 XP', async () => {
  await page.goto(URL + '#/daily');
  await page.getByRole('button', { name: /Start mission/ }).click();
  for (let i = 0; i < 3; i++) {
    await answer(true);
    await page.getByRole('button', { name: /Continue/ }).click();
  }
  await page.reload();
  await page.getByText('In progress — 3/10 answered').waitFor();
  await page.getByRole('button', { name: /Continue mission/ }).click();
  await page.getByText(/resumed at 4\/10/).waitFor();
  const xpBefore = (await store()).xp;
  for (let i = 0; i < 7; i++) {
    await answer(true);
    await page.getByRole('button', { name: /Continue|See results/ }).click();
  }
  await page.getByText('Daily Mission complete').waitFor();
  const s = await store();
  const d = Object.values(s.daily)[0];
  assert(d.done && d.qids.length === 10 && d.correct === 10, 'mission record');
  assert(new Set(d.qids.map((q) => BANK[q].subject)).size >= 5, 'not mixed subjects');
  assert(s.xp >= xpBefore + 50, 'no mission bonus');
});

console.log('Survival & Speed');
await check('survival: 3 lives, ends after 3 wrong answers, saves personal best', async () => {
  await page.goto(URL + '#/practice/survival');
  await answer(true);
  await page.getByRole('button', { name: /Continue/ }).click();
  for (let i = 0; i < 3; i++) {
    await answer(false);
    await page.getByRole('button', { name: /Continue|See results/ }).click();
  }
  await page.getByText(/Survival|personal best/).first().waitFor();
  const s = await store();
  assert(s.bests.survival >= 10 && s.bests.survivalQ === 1, `best ${JSON.stringify(s.bests)}`);
});
await check('speed 60 s: counts down and ends itself; +10 / −5 scoring', async () => {
  await page.clock.install();
  await page.goto(URL + '#/practice/speed60');
  await answer(true, { check: false });
  await page.clock.runFor(800);
  await answer(false, { check: false });
  await page.clock.runFor(800);
  await page.clock.runFor(61_000);
  await page.getByText('60-second').first().waitFor({ timeout: 5000 });
  const t = (await store()).tests.find((x) => x.kind === 'speed60');
  assert(t && t.score === 5, `speed score ${t?.score}`);
});

console.log('Olympiad Challenge');
await check('MVPP test: timer, palette, mark for review, autosave and resume after reload', async () => {
  await page.goto(URL + '#/olympiad');
  await page.getByRole('button', { name: 'Start MVPP Challenge' }).click();
  await page.locator('.timer.big').waitFor();
  assert((await page.locator('.pal .pb').count()) === 40, 'expected 40 questions');
  await answer(true, { check: false });
  await page.getByRole('button', { name: '☆ Mark for review' }).click();
  await page.locator('.pal .pb').nth(5).click();
  await answer(false, { check: false });
  assert((await page.locator('.explain').count()) === 0, 'explanations must be hidden during the exam');
  assert((await page.getByRole('button', { name: /Hint/ }).count()) === 0, 'hints must be hidden during the exam');
  await page.reload();
  await page.getByText('2/40 answered').waitFor();
  await page.locator('.pal .pb.mk').first().waitFor();
});
await check('auto-submits when the timer ends; report saved with correct marks', async () => {
  await page.clock.runFor(41 * 60_000);
  await page.getByText('MVPP Challenge — report').waitFor({ timeout: 8000 });
  const t = (await store()).tests.find((x) => x.kind === 'mvpp');
  assert(t && t.max === 40 && t.score === 1 && t.correct === 1 && t.wrong === 1 && t.skipped === 38, JSON.stringify(t && { s: t.score, c: t.correct, w: t.wrong }));
  await page.getByText('Subject-wise').waitFor();
});
await check('VVM test: manual submit with confirmation, +4 / −1 marking', async () => {
  await page.goto(URL + '#/olympiad/list');
  await page.getByRole('button', { name: 'Start VVM Challenge' }).click();
  assert((await page.locator('.pal .pb').count()) === 48, 'expected 48');
  await answer(true, { check: false });
  await page.getByRole('button', { name: 'Next →' }).click();
  await answer(false, { check: false });
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await page.getByRole('button', { name: 'Submit now' }).click();
  await page.getByText('VVM Challenge — report').waitFor();
  const t = (await store()).tests.find((x) => x.kind === 'vvm');
  assert(t.score === 3 && t.max === 192, `score ${t.score}/${t.max}`);
});

console.log('Science IQ');
await check('Science IQ serves only unfamiliar-situation problems and shows the principle', async () => {
  await page.goto(URL + '#/iq');
  await page.getByRole('button', { name: 'Start thinking →' }).click();
  const id = await qid();
  assert(BANK[id].iq, `${id} is not a Science IQ problem`);
  await page.getByRole('button', { name: /Hint/ }).click();
  await page.locator('.hint').waitFor();
  await answer(true);
  await page.locator('.explain').waitFor();
});

console.log('Progress & data');
await check('progress page shows real stats, charts and recommendations', async () => {
  await page.goto(URL + '#/progress');
  const s = await store();
  await page.locator('.kpi', { hasText: 'Questions attempted' }).getByText(String(s.attempts.length)).waitFor();
  await page.getByText('Subject-wise accuracy').waitFor();
  await page.getByText('3 · Do this next').waitFor();
});
await check('export downloads a JSON copy of progress', async () => {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Export progress/ }).click()]);
  const data = JSON.parse(readFileSync(await dl.path(), 'utf8'));
  assert(data.progress.attempts.length === (await store()).attempts.length, 'export mismatch');
});
await check('badges are awarded from real activity (Perfect Ten after a flawless 10-question mission)', async () => {
  assert((await store()).badges.perfect, 'perfect badge missing');
});
await check('reset requires typing RESET and clears everything', async () => {
  await page.getByRole('button', { name: 'Reset all progress' }).click();
  assert(await page.getByRole('button', { name: 'Delete everything' }).isDisabled(), 'should be disabled');
  await page.getByPlaceholder('RESET').fill('RESET');
  await page.getByRole('button', { name: 'Delete everything' }).click();
  const s = await store();
  assert(s.attempts.length === 0 && s.xp === 0, 'not reset');
});

console.log('Responsive layouts');
for (const [name, vp] of [['phone', { width: 390, height: 844 }], ['tablet', { width: 820, height: 1180 }], ['laptop', { width: 1366, height: 768 }]]) {
  await check(`${name} ${vp.width}px: no horizontal overflow on key screens`, async () => {
    const p = await browser.newPage({ viewport: vp });
    for (const h of ['home', 'practice', 'olympiad', 'progress', 'learn/motion']) {
      await p.goto(URL + '#/' + h);
      await p.waitForTimeout(250);
      const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert(over <= 1, `${h} overflows by ${over}px`);
    }
    await p.goto(URL + '#/home');
    await p.screenshot({ path: `shots/${name}-home.png` });
    await p.goto(URL + '#/practice');
    await p.getByRole('button', { name: 'Start practice →' }).click();
    await p.screenshot({ path: `shots/${name}-question.png` });
    await p.close();
  });
}

console.log('Offline');
await check('after one visit, the app loads and works with the network disconnected', async () => {
  const c2 = await browser.newContext();
  const p = await c2.newPage();
  await p.goto(URL);
  await p.evaluate(() => navigator.serviceWorker.ready);
  await p.reload(); // second load populates the cache with every asset
  await p.waitForTimeout(800);
  await c2.setOffline(true);
  await p.reload();
  await p.getByText('SCIENCE IQ').first().waitFor();
  await p.goto(URL + '#/practice');
  await p.getByRole('button', { name: 'Start practice →' }).click();
  await p.locator('.qcard').waitFor();
  await c2.close();
});

await check('no JavaScript errors during the whole run', async () => {
  assert(!errors.length, errors.slice(0, 3).join(' | '));
});

await browser.close();
server.kill();
console.log(`\n${passed} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
