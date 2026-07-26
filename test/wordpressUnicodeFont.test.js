'use strict';

const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { PDFDocument } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');

const ROOT = path.join(__dirname, '..');

test('WordPress PDF font path supports macrons', async () => {
  const templatePath = path.join(ROOT, 'wp-plugin', 'rg-ps-generator', 'templates', 'MP_PS1_2026.pdf');
  const fontPath = path.join(ROOT, 'wp-plugin', 'rg-ps-generator', 'assets', 'fonts', 'Arial.ttf');
  const pdf = await PDFDocument.load(fs.readFileSync(templatePath));

  pdf.registerFontkit(fontkit);
  const unicodeFont = await pdf.embedFont(fs.readFileSync(fontPath), { subset: true });
  const form = pdf.getForm();
  form.getTextField('Name').setText('Tūranga');
  form.updateFieldAppearances(unicodeFont);

  await assert.doesNotReject(() => pdf.save());
});
