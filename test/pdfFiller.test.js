'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { fillPS1, fillPS3 } = require('../src/pdfFiller');

const data = {
  clientName: 'Mātai ū',
  address: '12 Tāmaki Drive',
  bcNumber: 'BC123',
  lotDescription: 'Tūrangawaewae',
  structure: 'Deck',
  substrate: 'Timber',
  location: 'External',
  newOrExisting: 'New',
  thickness: '12',
  shortDescription: 'New Deck Mini Post Glass Balustrade',
  longDescription: '12mm thick Glass Balustrade installation for Deck area using Mini Post System'
};

test('fills PS1 text fields containing macrons', async () => {
  const bytes = await fillPS1(
    'MP_PS1_2026.pdf',
    data,
    { height: '1.01', heightAboveFix: '0.85' }
  );

  assert.ok(bytes.length > 0);
});

test('fills PS3 text fields containing macrons', async () => {
  const bytes = await fillPS3(data);

  assert.ok(bytes.length > 0);
});
