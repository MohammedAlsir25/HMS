import { Router } from 'express';
import { generatePatientSummary, generateDischargeSummary } from '../utils/ccda.js';

const router = Router();

router.get('/patients/:id/summary', async (req, res) => {
  try {
    const doc = await generatePatientSummary(req.params.id);
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.title.replace(/[^a-zA-Z0-9]/g, '_')}.xml"`);
    res.send(doc.xml);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/surgeries/:id/discharge', async (req, res) => {
  try {
    const doc = await generateDischargeSummary(req.params.id);
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.title.replace(/[^a-zA-Z0-9]/g, '_')}.xml"`);
    res.send(doc.xml);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
