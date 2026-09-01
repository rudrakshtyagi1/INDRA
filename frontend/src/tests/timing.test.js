/**
 * DETERMINISTIC UNIT TEST SUITE: HADR ROUTE TIMING & SAFETY MARGIN ARITHMETIC
 *
 * Tests:
 *   1. Positive operational margin
 *   2. Zero operational margin
 *   3. Negative operational margin (deficit detection)
 *   4. Mission dispatch start time after flood arrival (T_start > T_flood)
 *   5. Unavailable checkpoint / unconstrained handling
 *   6. Physically unavailable route mode (e.g. non-navigable boat corridor)
 *   7. AIR mode with valid landing zone vs unavailable landing zone
 *   8. Multi-modal state transition synchronization (ROAD -> FOOT -> AIR -> BOAT)
 *   9. NaN, Infinity, and negative transit time sanitization
 */

import {
  calculateOperationalMargin,
  PROTOTYPE_TACTICAL_ROUTES,
} from '../data/prototype/tehriPrototypeRoutes.js';

function runTimingTestSuite() {
  const results = [];
  function assert(condition, name, details = '') {
    if (!condition) {
      console.error(`FAIL: ${name}`, details);
      results.push({ name, passed: false, details });
    } else {
      results.push({ name, passed: true });
    }
  }

  // 1. Positive operational margin
  const resPositive = calculateOperationalMargin({
    checkpointFloodMin: 26,
    missionStartMin: 0,
    transitToCheckpointMin: 5,
    requiredBufferMin: 10,
    isRouteAvailable: true,
  });
  assert(
    resPositive.availableMarginMin === 21 &&
    resPositive.operationalMarginMin === 11 &&
    resPositive.isFeasible === true &&
    resPositive.status === 'OPERATIONAL_WINDOW_SAFE',
    'Test 1: Positive operational margin calculation'
  );

  // 2. Zero operational margin (Exact threshold)
  const resZero = calculateOperationalMargin({
    checkpointFloodMin: 15,
    missionStartMin: 0,
    transitToCheckpointMin: 5,
    requiredBufferMin: 10,
    isRouteAvailable: true,
  });
  assert(
    resZero.availableMarginMin === 10 &&
    resZero.operationalMarginMin === 0 &&
    resZero.deficitMin === 0 &&
    resZero.isFeasible === true &&
    resZero.status === 'OPERATIONAL_WINDOW_SAFE',
    'Test 2: Zero operational margin (Buffer exactly met)'
  );

  // 3. Negative operational margin (Buffer deficit)
  const resNegative = calculateOperationalMargin({
    checkpointFloodMin: 6,
    missionStartMin: 0,
    transitToCheckpointMin: 5,
    requiredBufferMin: 10,
    isRouteAvailable: true,
  });
  assert(
    resNegative.availableMarginMin === 1 &&
    resNegative.operationalMarginMin === -9 &&
    resNegative.deficitMin === 9 &&
    resNegative.isFeasible === false &&
    resNegative.status === 'SAFETY_BUFFER_DEFICIT' &&
    resNegative.label.includes('9 min deficit'),
    'Test 3: Negative operational margin (9 min deficit detected)'
  );

  // 4. Mission start time after flood arrival (T_start = 15 > T_flood = 8)
  const resLateStart = calculateOperationalMargin({
    checkpointFloodMin: 8,
    missionStartMin: 15,
    transitToCheckpointMin: 4,
    requiredBufferMin: 10,
    isRouteAvailable: true,
  });
  assert(
    resLateStart.availableMarginMin === -11 &&
    resLateStart.operationalMarginMin === -21 &&
    resLateStart.deficitMin === 21 &&
    resLateStart.isFeasible === false,
    'Test 4: Late mission dispatch after checkpoint inundation'
  );

  // 5. Physically unavailable route mode (e.g. non-navigable boat reach)
  const resUnavailable = calculateOperationalMargin({
    checkpointFloodMin: null,
    missionStartMin: 0,
    transitToCheckpointMin: 10,
    requiredBufferMin: 10,
    isRouteAvailable: false,
    unavailabilityReason: 'Non-navigable gorge rapids',
  });
  assert(
    resUnavailable.isFeasible === false &&
    resUnavailable.status === 'UNAVAILABLE' &&
    resUnavailable.label.includes('Non-navigable gorge rapids'),
    'Test 5: Physically unavailable route mode handling'
  );

  // 6. AIR mode with valid landing zone vs unavailable landing zone
  const resAirValid = calculateOperationalMargin({
    checkpointFloodMin: 45,
    missionStartMin: 0,
    transitToCheckpointMin: 4,
    requiredBufferMin: 10,
    isRouteAvailable: true,
  });
  assert(
    resAirValid.availableMarginMin === 41 &&
    resAirValid.operationalMarginMin === 31 &&
    resAirValid.isFeasible === true,
    'Test 6a: Air mode with valid extraction zone'
  );

  const resAirSubmerged = calculateOperationalMargin({
    checkpointFloodMin: null,
    missionStartMin: 0,
    transitToCheckpointMin: 4,
    requiredBufferMin: 10,
    isRouteAvailable: false,
    unavailabilityReason: 'Extraction Landing Zone Inundated',
  });
  assert(
    resAirSubmerged.isFeasible === false &&
    resAirSubmerged.status === 'UNAVAILABLE' &&
    resAirSubmerged.label.includes('Extraction Landing Zone Inundated'),
    'Test 6b: Air mode with inundated/unavailable landing zone'
  );

  // 7. Multi-modal route state transitions on Sirain village (ROAD -> FOOT -> AIR -> BOAT)
  const sirainRoutes = PROTOTYPE_TACTICAL_ROUTES.sirain;

  // Road mode timing
  const sirainRoad = calculateOperationalMargin({
    checkpointFloodMin: sirainRoutes.roadRoute.checkpointFloodMin,
    missionStartMin: 0,
    transitToCheckpointMin: sirainRoutes.roadRoute.transitToCheckpointMin,
    requiredBufferMin: 10,
    isRouteAvailable: sirainRoutes.roadRoute.isAvailable,
  });
  // Foot mode timing
  const sirainFoot = calculateOperationalMargin({
    checkpointFloodMin: sirainRoutes.fallbackGroundRoute.checkpointFloodMin,
    missionStartMin: 0,
    transitToCheckpointMin: sirainRoutes.fallbackGroundRoute.transitToCheckpointMin,
    requiredBufferMin: 10,
    isRouteAvailable: sirainRoutes.fallbackGroundRoute.isAvailable,
  });
  // Air mode timing
  const sirainAir = calculateOperationalMargin({
    checkpointFloodMin: sirainRoutes.airEvacRoute.checkpointFloodMin,
    missionStartMin: 0,
    transitToCheckpointMin: sirainRoutes.airEvacRoute.transitToCheckpointMin,
    requiredBufferMin: 10,
    isRouteAvailable: sirainRoutes.airEvacRoute.isAvailable,
  });
  // Boat mode timing
  const sirainBoat = calculateOperationalMargin({
    checkpointFloodMin: sirainRoutes.boatRoute.checkpointFloodMin,
    missionStartMin: 0,
    transitToCheckpointMin: sirainRoutes.boatRoute.transitToCheckpointMin,
    requiredBufferMin: 10,
    isRouteAvailable: sirainRoutes.boatRoute.isAvailable,
    unavailabilityReason: sirainRoutes.boatRoute.unavailabilityReason,
  });

  assert(
    sirainRoad.status === 'SAFETY_BUFFER_DEFICIT' &&
    sirainFoot.status === 'OPERATIONAL_WINDOW_SAFE' &&
    sirainAir.status === 'OPERATIONAL_WINDOW_SAFE' &&
    sirainBoat.status === 'UNAVAILABLE',
    'Test 7: Multi-modal mode transitions evaluate distinct checkpoints & statuses'
  );

  // 8. NaN, Infinity, and negative transit time sanitization
  const resNaN = calculateOperationalMargin({
    checkpointFloodMin: NaN,
    transitToCheckpointMin: 5,
  });
  assert(resNaN.status === 'MARGIN_UNAVAILABLE', 'Test 8a: NaN checkpoint arrival handled safely');

  const resInf = calculateOperationalMargin({
    checkpointFloodMin: 15,
    transitToCheckpointMin: Infinity,
  });
  assert(resInf.status === 'MARGIN_UNAVAILABLE', 'Test 8b: Infinity transit time handled safely');

  const resNegTransit = calculateOperationalMargin({
    checkpointFloodMin: 15,
    transitToCheckpointMin: -5,
  });
  assert(resNegTransit.status === 'MARGIN_UNAVAILABLE', 'Test 8c: Negative transit time handled safely');

  // Summary
  const allPassed = results.every((r) => r.passed);
  return {
    total: results.length,
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
    allPassed,
    results,
  };
}

// Self-run when executed directly via node
const testOutput = runTimingTestSuite();
console.log(
  `Timing Test Suite Summary: ${testOutput.passed}/${testOutput.total} passed. Overall: ${
    testOutput.allPassed ? 'PASS' : 'FAIL'
  }`
);

export { runTimingTestSuite };
