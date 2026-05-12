'use strict';

const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

function today() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function setText(form, name, value) {
  try {
    form.getTextField(name).setText(value);
  } catch (_) {
    // field absent in this template — skip
  }
}

function setCheck(form, name, checked) {
  try {
    const cb = form.getCheckBox(name);
    checked ? cb.check() : cb.uncheck();
  } catch (_) {
    // field absent — skip
  }
}

async function fillPS1(templateFile, data, heights) {
  const templateBytes = fs.readFileSync(path.join(TEMPLATES_DIR, templateFile));
  const pdf = await PDFDocument.load(templateBytes);
  const form = pdf.getForm();
  const date = today();

  setText(form, 'Name',          data.clientName);
  setText(form, 'Address',       data.address);
  setText(form, 'Description',   data.shortDescription);
  setText(form, 'Date0',         date);
  setText(form, 'Date01',        date);
  setText(form, 'Date-4',        date);
  setText(form, 'Name-2',        data.clientName);
  setText(form, 'Address-2',     data.address);
  setText(form, 'Address02',     data.address);   // side-channel variant
  setText(form, 'Address-4',     data.address);
  setText(form, 'Thickness',     data.thickness || '12');
  setText(form, 'Height',        heights.height);
  setText(form, 'HeightAboveFix', heights.heightAboveFix);

  setCheck(form, 'TimberTB',   data.substrate === 'Timber');
  setCheck(form, 'ConcreteTB', data.substrate === 'Concrete');
  setCheck(form, 'SteelTB',    data.substrate === 'Steel');
  setCheck(form, 'InternalTB', data.location === 'Internal');
  setCheck(form, 'ExternalTB', data.location === 'External');
  setCheck(form, 'NewTB',      data.newOrExisting === 'New');
  setCheck(form, 'ExistingTB', data.newOrExisting === 'Existing');
  setCheck(form, 'ToughenedTB', true);
  setCheck(form, 'Direct',      true);
  setCheck(form, 'Cont',        false);

  form.flatten();
  return pdf.save();
}

async function fillPS3(data) {
  const templateBytes = fs.readFileSync(path.join(TEMPLATES_DIR, 'PS3_Template.pdf'));
  const pdf = await PDFDocument.load(templateBytes);
  const form = pdf.getForm();

  setText(form, 'BC',           data.bcNumber || '');
  setText(form, 'Address02',    data.address);
  setText(form, 'Description3', data.structure);
  setText(form, 'Description2', data.longDescription);
  setText(form, 'Date03',       today());
  setText(form, 'Legal',        data.lotDescription || '');

  setCheck(form, 'B1TB',    true);
  setCheck(form, 'B2TB',    false);
  setCheck(form, 'F4TB',    true);
  setCheck(form, 'GlassTB', true);
  setCheck(form, 'PS1TB',   true);

  form.flatten();
  return pdf.save();
}

async function mergePDFs(pdfBytesList) {
  const merged = await PDFDocument.create();
  for (const bytes of pdfBytesList) {
    const src = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach(p => merged.addPage(p));
  }
  return merged.save();
}

module.exports = { fillPS1, fillPS3, mergePDFs };
