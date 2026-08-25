'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { PDFDocument } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');

const ROOT = path.join(__dirname, '..');
const APP_PATH = path.join(ROOT, 'wp-plugin', 'rg-ps-generator', 'assets', 'app.js');
const TEMPLATE_DIR = path.join(ROOT, 'wp-plugin', 'rg-ps-generator', 'templates');
const FONT_PATH = path.join(ROOT, 'wp-plugin', 'rg-ps-generator', 'assets', 'fonts', 'Arial.ttf');

function fakeElement() {
  return {
    value: '', checked: false, disabled: false, style: {}, classList: { add() {}, remove() {} },
    addEventListener() {}, focus() {},
  };
}

function loadPdfFillers() {
  let ready;
  const window = { RGPS_TEST_API: {} };
  const document = {
    getElementById: fakeElement,
    addEventListener(type, handler) { if (type === 'DOMContentLoaded') ready = handler; },
    querySelector: fakeElement,
    querySelectorAll() { return []; },
  };
  const context = {
    RGPSConfig: { ajaxUrl: '/ajax', nonce: 'test', fontUrl: '/font' },
    PDFLib: { PDFDocument },
    fontkit,
    window,
    document,
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    URLSearchParams,
    setTimeout,
    clearTimeout,
    Uint8Array,
    ArrayBuffer,
    atob(value) { return Buffer.from(value, 'base64').toString('binary'); },
    fetch: async (url) => {
      if (url === '/font') {
        const bytes = fs.readFileSync(FONT_PATH);
        return { ok: true, arrayBuffer: async () => bytes };
      }
      const name = new URL(url, 'https://example.test').searchParams.get('name');
      const bytes = fs.readFileSync(path.join(TEMPLATE_DIR, name));
      return { json: async () => ({ ok: true, data: bytes.toString('base64') }) };
    },
  };
  vm.runInNewContext(fs.readFileSync(APP_PATH, 'utf8'), context);
  ready();
  return window.RGPS_TEST_API;
}

function loadRecordingPdfFillers(missingTextField = '') {
  let ready;
  const textFields = new Map();
  const checkFields = new Map();
  const form = {
    getTextField(name) {
      if (name === missingTextField) throw new Error('Missing field: ' + name);
      return {
        enableMultiline() {},
        setText(value) { textFields.set(name, value); },
      };
    },
    getCheckBox(name) {
      return {
        check() { checkFields.set(name, true); },
        uncheck() { checkFields.set(name, false); },
      };
    },
    updateFieldAppearances() {},
    flatten() {},
  };
  const pdf = {
    registerFontkit() {},
    embedFont: async () => ({}),
    getForm() { return form; },
    save: async () => new Uint8Array([1]),
  };
  const window = { RGPS_TEST_API: {} };
  const context = {
    RGPSConfig: { ajaxUrl: '/ajax', nonce: 'test', fontUrl: '/font' },
    PDFLib: { PDFDocument: { load: async () => pdf } },
    fontkit: {},
    window,
    document: {
      getElementById: fakeElement,
      addEventListener(type, handler) { if (type === 'DOMContentLoaded') ready = handler; },
      querySelector: fakeElement,
      querySelectorAll() { return []; },
    },
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    URLSearchParams,
    setTimeout,
    clearTimeout,
    Uint8Array,
    atob() { return ''; },
    fetch: async (url) => url === '/font'
      ? { ok: true, arrayBuffer: async () => new Uint8Array([1]) }
      : { json: async () => ({ ok: true, data: '' }) },
  };
  vm.runInNewContext(fs.readFileSync(APP_PATH, 'utf8'), context);
  ready();
  return { fillers: window.RGPS_TEST_API, textFields, checkFields };
}

test('fills the actual PS1 and PS3 templates for a combined-area document', async () => {
  const { fillPS1, fillPS3 } = loadPdfFillers();
  const data = {
    clientName: 'Mātai ū',
    address: '12 Tāmaki Drive',
    bcNumber: 'BC123',
    lotDescription: 'Tūrangawaewae',
    combinedAreaList: 'Internal Stair and Balcony Area and External Deck Area',
    structure: 'Stair and Balcony and Deck',
    substrate: 'Timber',
    location: 'Internal and External',
    newOrExisting: 'New',
    thickness: '12',
    glassType: 'Toughened',
    longDescription: '12mm Toughened Glass installation for New Internal Stair and Balcony Area and External Deck Area using Mini Post System',
  };

  const [ps1, ps3] = await Promise.all([
    fillPS1('MP_PS1_2026.pdf', data, { height: '1.01', heightAboveFix: '0.85' }),
    fillPS3(data),
  ]);

  assert.ok(ps1.length > 0);
  assert.ok(ps3.length > 0);

  const poolPs1 = await fillPS1('MP_PS1_POOL_Template.pdf', {
    ...data,
    combinedAreaList: 'External Pool Area',
    structure: 'Pool',
    location: 'External',
    longDescription: '12mm Toughened Glass installation for New External Pool Area using Mini Post System',
  }, { height: '1.26', heightAboveFix: '1.05' });
  assert.ok(poolPs1.length > 0);
});

test('maps combined areas and aggregate locations into the required PDF fields', async () => {
  const { fillers, textFields, checkFields } = loadRecordingPdfFillers();
  const data = {
    clientName: 'Mātai ū',
    address: '12 Tāmaki Drive',
    bcNumber: 'BC123',
    lotDescription: 'Tūrangawaewae',
    combinedAreaList: 'Internal Stair and Balcony Area and External Deck Area',
    substrate: 'Timber',
    location: 'Internal and External',
    newOrExisting: 'New',
    thickness: '12',
    glassType: 'Toughened',
    longDescription: '12mm Toughened Glass installation for New Internal Stair and Balcony Area and External Deck Area using Mini Post System',
  };

  await fillers.fillPS1('MP_PS1_2026.pdf', data, { height: '1.01', heightAboveFix: '0.85' });
  assert.equal(textFields.get('Description'), data.longDescription);
  assert.equal(textFields.get('Description02'), data.longDescription);
  assert.equal(textFields.get('Structure02'), data.combinedAreaList);
  assert.equal(checkFields.get('InternalTB'), true);
  assert.equal(checkFields.get('ExternalTB'), true);

  textFields.clear();
  checkFields.clear();
  await fillers.fillPS3(data);
  assert.equal(textFields.get('Description3'), data.combinedAreaList);
  assert.equal(textFields.get('Description2'), data.longDescription);
});

test('fails generation when a required combined-description field is absent', async () => {
  const data = {
    clientName: 'Mātai ū', address: '12 Tāmaki Drive', bcNumber: 'BC123', lotDescription: '',
    combinedAreaList: 'Internal Stair Area', substrate: 'Timber', location: 'Internal',
    newOrExisting: 'New', thickness: '12', glassType: 'Toughened', longDescription: '12mm Toughened Glass installation for New Internal Stair Area using Mini Post System',
  };
  const ps1 = loadRecordingPdfFillers('Description').fillers;
  await assert.rejects(() => ps1.fillPS1('MP_PS1_2026.pdf', data, { height: '1.01', heightAboveFix: '0.85' }), /Missing field: Description/);

  const ps3 = loadRecordingPdfFillers('Description3').fillers;
  await assert.rejects(() => ps3.fillPS3(data), /Missing field: Description3/);
});
