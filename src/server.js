'use strict';

require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const { getSystem, getHeights, buildDescription, buildShortDescription } = require('./systemConfig');
const { fillPS1, fillPS3 } = require('./pdfFiller');
const { logGeneration, getRecords } = require('./supabaseClient');

const app = express();
const PORT = process.env.PORT || 3000;
const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD;
const GENERATED_DIR = path.join(__dirname, '..', 'generated');

app.use(express.json());
app.use(cookieParser());

// Clean up generated files older than 1 hour
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  fs.readdirSync(GENERATED_DIR).forEach(file => {
    const fp = path.join(GENERATED_DIR, file);
    if (fs.statSync(fp).mtimeMs < cutoff) fs.unlinkSync(fp);
  });
}, 15 * 60 * 1000);

function requireAuth(req, res, next) {
  if (req.cookies.session === ACCESS_PASSWORD) return next();
  res.status(401).json({ error: 'Unauthorised' });
}

app.post('/api/auth', (req, res) => {
  const { password } = req.body;
  if (password === ACCESS_PASSWORD) {
    res.cookie('session', ACCESS_PASSWORD, { httpOnly: true });
    res.json({ ok: true });
  } else {
    res.status(401).json({ error: 'Wrong password' });
  }
});

app.post('/api/generate', requireAuth, async (req, res) => {
  try {
    const { clientName, address, bcNumber, system, substrate, structure, location, newOrExisting, type, markPS3, thickness = '12' } = req.body;

    const sys = getSystem(system);
    const heights = getHeights(system, structure);
    const data = {
      clientName, address, bcNumber, substrate, structure, location, newOrExisting, thickness,
      longDescription:  buildDescription(thickness, structure, system),
      shortDescription: buildShortDescription(structure, system)
    };

    let pdfBytes, pdfFilename;

    if (type === 'ps3') {
      pdfBytes = await fillPS3(data);
      pdfFilename = `${address} - PS3.pdf`;
    } else {
      pdfBytes = await fillPS1(sys.templateFile, data, heights);
      pdfFilename = `${address} - PS1.pdf`;
      fs.writeFileSync(path.join(GENERATED_DIR, pdfFilename), pdfBytes);
      await logGeneration({
        client_name: clientName,
        address,
        bc_number: bcNumber || null,
        system,
        substrate,
        structure,
        location,
        new_or_existing: newOrExisting,
        ps3_generated: !!markPS3,
        filename: pdfFilename
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfFilename}"`);
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/records', requireAuth, async (req, res) => {
  try {
    const rows = await getRecords(50);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use(express.static(path.join(__dirname, '..', 'public')));

app.listen(PORT, () => console.log(`PS1 Generator running on http://localhost:${PORT}`));
