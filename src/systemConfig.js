'use strict';

const SYSTEMS = {
  'mini-post': {
    displayName: 'Mini Post',
    templateFile: 'MP_PS1_2026.pdf',
    gateTemplateFile: 'MP_GATE_PS1_Template.pdf',
    heights: {
      pool:    { height: '1.26', heightAboveFix: '1.05' },
      default: { height: '1.01', heightAboveFix: '0.85' }
    }
  },
  'double-disc': {
    displayName: 'Double Disc',
    templateFile: 'DD_PS1_2026.pdf',
    heights: {
      pool:    { height: '1.20', heightAboveFix: '1.25' },
      default: { height: '1.00', heightAboveFix: '1.05' }
    }
  },
  'side-channel': {
    displayName: 'Side Mount Channel',
    templateFile: 'Side_Channel_PS1_Template.pdf',
    heights: {
      pool:    { height: '1.2', heightAboveFix: '1.2' },
      default: { height: '1.00', heightAboveFix: '1.00' }
    }
  },
  'top-channel': {
    displayName: 'Top Mount Channel',
    templateFile: 'Top_Channel_PS1_Template.pdf',
    heights: {
      pool:    { height: '1.2', heightAboveFix: '1.2' },
      default: { height: '1.00', heightAboveFix: '1.00' }
    }
  }
};

const POOL_STRUCTURES = ['Pool Area', 'Pool Fence'];

function getSystem(systemKey) {
  const sys = SYSTEMS[systemKey];
  if (!sys) throw new Error(`Unknown system: ${systemKey}`);
  return sys;
}

function getHeights(systemKey, structure) {
  const sys = getSystem(systemKey);
  const bucket = POOL_STRUCTURES.includes(structure) ? 'pool' : 'default';
  return sys.heights[bucket];
}

function buildDescription(thickness, structure, systemKey) {
  const sys = getSystem(systemKey);
  return `${thickness}mm thick Glass Balustrade installation for ${structure} area using ${sys.displayName} System`;
}

function buildShortDescription(structure, systemKey) {
  const sys = getSystem(systemKey);
  return `New ${structure} ${sys.displayName} Glass Balustrade`;
}

module.exports = { SYSTEMS, POOL_STRUCTURES, getSystem, getHeights, buildDescription, buildShortDescription };
