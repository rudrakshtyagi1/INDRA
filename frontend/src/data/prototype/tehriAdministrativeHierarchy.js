/**
 * PROTOTYPE ADMINISTRATIVE & SETTLEMENT HIERARCHY
 * Hierarchical grouping of settlements, tehsils/blocks, and districts
 * along the 145 km Bhagirathi - Ganga river corridor to Bijnor Barrage.
 *
 * PROVENANCE: PROTOTYPE FIXTURE
 */

import { DOMAIN_CONFIG } from './tehriDomainConfig';
import { PROTOTYPE_SETTLEMENTS } from './tehriPrototypeSettlements';

export const ADMINISTRATIVE_DISTRICTS = [
  { id: 'all', name: 'All Districts' },
  { id: 'tehri_garhwal', name: 'Tehri Garhwal', totalSettlements: 6, popAtRisk: 6110 },
  { id: 'pauri_garhwal', name: 'Pauri Garhwal', totalSettlements: 2, popAtRisk: 4200 },
  { id: 'dehradun', name: 'Dehradun', totalSettlements: 1, popAtRisk: 8500 },
  { id: 'haridwar', name: 'Haridwar', totalSettlements: 2, popAtRisk: 22400 },
  { id: 'bijnor', name: 'Bijnor (UP Boundary)', totalSettlements: 2, popAtRisk: 12300 },
];

export const ADMINISTRATIVE_TEHSILS = [
  { id: 'all', name: 'All Tehsils / Blocks', districtId: 'all' },
  { id: 'tehri', name: 'Tehri Tehsil', districtId: 'tehri_garhwal' },
  { id: 'chamba', name: 'Chamba Block', districtId: 'tehri_garhwal' },
  { id: 'devprayag', name: 'Devprayag Tehsil', districtId: 'pauri_garhwal' },
  { id: 'narendranagar', name: 'Narendranagar Block', districtId: 'tehri_garhwal' },
  { id: 'rishikesh', name: 'Rishikesh Tehsil', districtId: 'dehradun' },
  { id: 'haridwar', name: 'Haridwar Sadar', districtId: 'haridwar' },
  { id: 'laksar', name: 'Laksar Tehsil', districtId: 'haridwar' },
  { id: 'bijnor_sadar', name: 'Bijnor Sadar', districtId: 'bijnor' },
];

// Major district centers / regional anchor towns (visible at Full Domain zoom)
export const MAJOR_REGIONAL_TOWNS = [
  { id: 'town_tehri', name: 'New Tehri (District HQ)', lat: 30.392, lon: 78.475, pop: 24000, elevM: 1650, role: 'District HQ / Safe Ridge' },
  { id: 'town_chamba', name: 'Chamba Town', lat: 30.347, lon: 78.396, pop: 12000, elevM: 1480, role: 'Emergency Staging Hub' },
  { id: 'town_devprayag', name: 'Devprayag Confluence', lat: 30.146, lon: 78.599, pop: 4800, elevM: 520, role: 'Bhagirathi-Alaknanda Sangam' },
  { id: 'town_rishikesh', name: 'Rishikesh City', lat: 30.103, lon: 78.298, pop: 102000, elevM: 372, role: 'Ganga Foothills Urban Hub' },
  { id: 'town_haridwar', name: 'Haridwar City', lat: 29.956, lon: 78.170, pop: 228000, elevM: 314, role: 'Bhimgoda Barrage / Pilgrimage City' },
  { id: 'town_bijnor', name: 'Bijnor Barrage Boundary', lat: 29.375, lon: 78.130, pop: 115000, elevM: 225, role: DOMAIN_CONFIG.downstreamBoundaryLabel },
];

// Cluster definitions for Downstream Corridor Zoom (Zoom 10–12)
export const CORRIDOR_CLUSTERS = [
  {
    id: 'cluster_upper_gorge',
    name: 'Upper Bhagirathi Gorge Cluster',
    kmRange: '0–15 km',
    lat: 30.345,
    lon: 78.490,
    settlementIds: ['sirain', 'tipri', 'pangarh'],
    totalSettlements: 3,
    criticalCount: 2,
    totalPopulation: 2710,
    districtId: 'tehri_garhwal',
    tehsilId: 'tehri',
    arrivalRange: 'T+8m to T+26m',
  },
  {
    id: 'cluster_koteshwar_middle',
    name: 'Koteshwar – Bagwan Canyon Cluster',
    kmRange: '15–35 km',
    lat: 30.250,
    lon: 78.528,
    settlementIds: ['koteshwar', 'bagwan'],
    totalSettlements: 2,
    criticalCount: 1,
    totalPopulation: 3880,
    districtId: 'tehri_garhwal',
    tehsilId: 'narendranagar',
    arrivalRange: 'T+32m to T+48m',
  },
  {
    id: 'cluster_devprayag_confluence',
    name: 'Devprayag – Sangam Cluster',
    kmRange: '35–60 km',
    lat: 30.146,
    lon: 78.599,
    settlementIds: ['devprayag'],
    totalSettlements: 1,
    criticalCount: 1,
    totalPopulation: 3200,
    districtId: 'pauri_garhwal',
    tehsilId: 'devprayag',
    arrivalRange: 'T+68m',
  },
  {
    id: 'cluster_foothills_haridwar',
    name: 'Rishikesh – Haridwar Foothills Cluster',
    kmRange: '60–100 km',
    lat: 30.030,
    lon: 78.230,
    settlementIds: ['shivpuri', 'rishikesh', 'haridwar'],
    totalSettlements: 3,
    criticalCount: 0,
    totalPopulation: 23200,
    districtId: 'haridwar',
    tehsilId: 'haridwar',
    arrivalRange: 'T+110m to T+175m',
  },
  {
    id: 'cluster_upper_ganga_plains',
    name: 'Upper Ganga Floodplains Reach (Laksar – Bijnor)',
    kmRange: '100–145 km',
    lat: 29.600,
    lon: 78.180,
    settlementIds: ['laksar', 'balawali', 'bijnor_boundary'],
    totalSettlements: 3,
    criticalCount: 0,
    totalPopulation: 12300,
    districtId: 'bijnor',
    tehsilId: 'laksar',
    arrivalRange: 'T+195m to T+235m',
  },
];

/**
 * Filter settlements based on administrative selections and risk thresholds.
 */
export function getFilteredSettlements(settlements, filters = {}) {
  const {
    district = 'all',
    tehsil = 'all',
    riskState = 'all',
    searchQuery = '',
  } = filters;

  return settlements.filter((st) => {
    // 1. District match
    if (district !== 'all' && st.districtId && st.districtId !== district) {
      return false;
    }

    // 2. Tehsil match
    if (tehsil !== 'all' && st.tehsilId && st.tehsilId !== tehsil) {
      return false;
    }

    // 3. Risk state match
    if (riskState !== 'all') {
      if (riskState === 'CRITICAL' && st.urgency !== 'CRITICAL') return false;
      if (riskState === 'HIGH' && st.urgency !== 'HIGH') return false;
      if (riskState === 'MODERATE' && st.urgency !== 'MODERATE') return false;
      if (riskState === 'SAFE' && st.urgency !== 'LOW' && st.urgency !== 'SAFE') return false;
    }

    // 4. Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = st.name.toLowerCase().includes(q);
      const matchDesc = st.description?.toLowerCase().includes(q);
      if (!matchName && !matchDesc) return false;
    }

    return true;
  });
}
