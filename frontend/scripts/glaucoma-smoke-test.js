/*
  Glaucoma Dashboard Smoke Test
  Paste this into your browser DevTools console (F12) while on
  http://localhost:5173/clinic/glaucoma (logged in as glaucoma doctor).

  Run:  smokeTest()
  Run all tests individually:  smokeTest(true)  — shows verbose logging
*/

async function smokeTest(verbose) {
  const log = (ok, msg) => console.log(`${ok ? '✅' : '❌'} ${msg}`);
  const vlog = (msg) => { if (verbose) console.log(`  ℹ️  ${msg}`); };
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  console.log('%c🚬 Glaucoma Dashboard Smoke Test', 'font-size:18px;font-weight:bold');
  console.log(`Started: ${new Date().toISOString()}\n`);

  // ── 1. UI Render Check ──────────────────────────────────────────────
  console.group('📋 1. UI Rendering');

  const checks = [
    ['Title', document.body.innerText.includes('Glaucoma Clinic')],
    ['Subtitle', document.body.innerText.includes('Glaucoma Evaluation')],
    ['Patient Selection section', document.body.innerText.includes('Patient Selection')],
    ['Waiting Queue section', document.body.innerText.includes('Waiting Queue')],
    ['Optic Nerve Head Diagram section', document.body.innerText.includes('Optic Nerve Head Diagram')],
    ['Glaucoma Examination Findings section', document.body.innerText.includes('Glaucoma Examination Findings')],
    ['Diagnosis section', document.body.innerText.includes('Diagnosis')],
    ['Prescriptions section', document.body.innerText.includes('Prescriptions')],
    ['Get AI Suggestions button present', !!document.querySelector('button')?.innerText?.includes('AI')],
  ];
  checks.forEach(([name, ok]) => log(ok, name));
  const allRendered = checks.every(([_, ok]) => ok === true);
  vlog(`DOM checks: ${checks.length} total`);
  console.groupEnd();

  // ── 2. API: ICD-10 Search ──────────────────────────────────────────
  console.group('🔍 2. ICD-10 Search API');
  try {
    const icdResp = await fetch('/api/ai/icd10?q=glaucoma');
    const icdData = await icdResp.json();
    const icdOk = icdResp.ok && Array.isArray(icdData) && icdData.length > 0;
    log(icdOk, `GET /api/ai/icd10?q=glaucoma → ${icdData.length} results (${icdResp.status})`);
    if (verbose && icdOk) {
      console.table(icdData.slice(0, 5).map(c => ({ code: c.code, name: c.name })));
    }
    const hasH40 = icdOk && icdData.some(c => c.code?.startsWith('H40'));
    log(hasH40, `Glaucoma ICD-10 codes (H40*) present: ${hasH40}`);
  } catch (e) {
    log(false, `GET /api/ai/icd10?q=glaucoma — FAILED: ${e.message}`);
  }
  console.groupEnd();

  // ── 3. API: AI Diagnosis ───────────────────────────────────────────
  console.group('🤖 3. AI Diagnosis API');
  try {
    const aiResp = await fetch('/api/ai/diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        patientId: 'smoke-test-patient',
        symptoms: [{ name: 'Gradual Vision Loss', bodyArea: 'Optic Nerve Head', onset: 'Slow (>4 weeks)', severity: 6 }],
        vitals: { bloodPressureSystolic: 145, bloodPressureDiastolic: 90 },
        specialty: 'glaucoma',
      }),
    });
    const aiData = await aiResp.json();
    const aiOk = aiResp.ok && aiData;
    log(aiOk, `POST /api/ai/diagnose (specialty=glaucoma) → ${aiResp.status}`);
    if (aiOk) {
      log(aiData.diagnoses?.length > 0, `AI returned ${aiData.diagnoses?.length || 0} diagnoses`);
      log(aiData.tests?.length > 0, `AI returned ${aiData.tests?.length || 0} recommended tests`);
      log(aiData.treatments?.length > 0, `AI returned ${aiData.treatments?.length || 0} treatments`);
      if (verbose && aiData.diagnoses) {
        console.table(aiData.diagnoses.map(d => ({ name: d.name, confidence: d.confidence, icd10: d.icd10 })));
      }
    }
  } catch (e) {
    log(false, `POST /api/ai/diagnose — FAILED: ${e.message}`);
  }
  console.groupEnd();

  // ── 4. API: Queue Endpoint ──────────────────────────────────────────
  console.group('👥 4. Clinic Queue API');
  try {
    const queueResp = await fetch('/api/clinics/glaucoma/queue');
    const queueData = await queueResp.json();
    const queueOk = queueResp.ok && Array.isArray(queueData);
    log(queueOk, `GET /api/clinics/glaucoma/queue → ${queueOk ? `${queueData.length} queue items` : queueResp.status}`);
  } catch (e) {
    log(false, `GET /api/clinics/glaucoma/queue — FAILED: ${e.message}`);
  }
  console.groupEnd();

  // ── 5. API: Stats Endpoint ──────────────────────────────────────────
  console.group('📊 5. Clinic Stats API');
  try {
    const statsResp = await fetch('/api/clinics/glaucoma/stats');
    const statsData = await statsResp.json();
    const statsOk = statsResp.ok && statsData;
    log(statsOk, `GET /api/clinics/glaucoma/stats → ${statsResp.status}`);
    if (verbose && statsOk) console.table(statsData);
  } catch (e) {
    log(false, `GET /api/clinics/glaucoma/stats — FAILED: ${e.message}`);
  }
  console.groupEnd();

  // ── 6. Check React Component Tree for hooks ─────────────────────────
  console.group('⚛️  6. React Component Check');
  const root = document.getElementById('root');
  log(!!root, 'Root element (#root) exists');
  log(root?.innerHTML?.length > 100, 'Root has rendered content (length > 100 chars)');
  const hasButtons = document.querySelectorAll('button').length >= 5;
  log(hasButtons, `At least 5 <button> elements found: ${document.querySelectorAll('button').length}`);
  const hasInputs = document.querySelectorAll('input, select, textarea').length >= 10;
  log(hasInputs, `At least 10 input/select/textarea elements found: ${document.querySelectorAll('input, select, textarea').length}`);
  console.groupEnd();

  // ── Summary ─────────────────────────────────────────────────────────
  console.log('');
  console.log('%c══════════════════════════════════════', 'color:#888');
  console.log(`%c Smoke Test ${allRendered ? 'PASSED ✅' : 'FAILED ❌'}`, 'font-size:16px;font-weight:bold');
  console.log(`%c ${new Date().toISOString()}`, 'color:#888');
  console.log('%c══════════════════════════════════════', 'color:#888');
}

// Also expose individual test runners
const smoke = {
  ui: () => {
    const checks = [
      ['Glaucoma Clinic title', 'Glaucoma Clinic'],
      ['Subtitle', 'Glaucoma Evaluation'],
      ['Patient Selection', 'Patient Selection'],
      ['Waiting Queue', 'Waiting Queue'],
      ['Optic Nerve Head Diagram', 'Optic Nerve Head Diagram'],
      ['Exam Findings', 'Glaucoma Examination Findings'],
      ['Diagnosis section', 'Diagnosis'],
    ];
    console.group('UI Smoke Check');
    checks.forEach(([label, text]) =>
      console.log(`${document.body.innerText.includes(text) ? '✅' : '❌'} ${label}`));
    console.groupEnd();
  },
  api: {
    icd10: async (q = 'glaucoma') => {
      const r = await fetch(`/api/ai/icd10?q=${q}`);
      const d = await r.json();
      console.log(`ICD-10 "${q}": ${d.length} results`, r.ok ? '✅' : '❌');
      console.table(d.slice(0, 10));
    },
    diagnose: async () => {
      const r = await fetch('/api/ai/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          patientId: 'smoke-test',
          symptoms: [{ name: 'Peripheral Vision Loss', onset: 'Slow (>4 weeks)', severity: 7 }],
          specialty: 'glaucoma',
        }),
      });
      const d = await r.json();
      console.log(`AI Diagnose: ${r.status}`, r.ok ? '✅' : '❌');
      if (d.diagnoses) console.table(d.diagnoses);
    },
    queue: async () => {
      const r = await fetch('/api/clinics/glaucoma/queue');
      console.log(`Queue: ${r.status}`, r.ok ? '✅' : '❌');
    },
    stats: async () => {
      const r = await fetch('/api/clinics/glaucoma/stats');
      const d = await r.json();
      console.log(`Stats: ${r.status}`, r.ok ? '✅' : '❌');
      console.table(d);
    },
  },
};
