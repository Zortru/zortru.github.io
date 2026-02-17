import { DATA_POINTS, CONVERSION_MAX, BISECTION_TOL, BISECTION_MAX_ITER } from './constants.js';
import { computeConcentrations } from './stoichiometry.js';

/**
 * Batch reactor solver using trapezoidal rule.
 * Integrates: t = S10 * ∫(0→Xmax) dX / v(S1(X))
 * Uses DATA_POINTS steps for the integration.
 */
export function solveBatch(model, params) {
  const { S10, S20, P10, P20, a, b, c, d, Xmax, deactivation, kd } = params;
  const Xlimit = Math.min(Xmax, CONVERSION_MAX);
  const nSteps = DATA_POINTS;
  const h = Xlimit / nSteps;

  const result = { t: [], S1: [], S2: [], P1: [], P2: [], X: [], v: [] };

  let t = 0;
  const originalVmax = model.Vmax;

  // Evaluate integrand at X=0
  const conc0 = computeConcentrations(S10, S20, P10, P20, a, b, c, d, 0);
  const v0 = model.rate(conc0.S1);
  let prevIntegrand = v0 > 0 ? S10 / v0 : 0;

  // Save initial point
  result.t.push(0);
  result.S1.push(S10);
  result.S2.push(S20);
  result.P1.push(P10);
  result.P2.push(P20);
  result.X.push(0);
  result.v.push(v0);

  for (let i = 1; i <= nSteps; i++) {
    const X = i * h;
    const conc = computeConcentrations(S10, S20, P10, P20, a, b, c, d, X);

    // Deactivation: update Vmax based on accumulated time
    if (deactivation && kd > 0) {
      model.Vmax = originalVmax * Math.exp(-kd * t);
    }

    const v = model.rate(conc.S1);
    const integrand = v > 0 ? S10 / v : 0;

    // Trapezoidal step
    t += 0.5 * (prevIntegrand + integrand) * h;
    prevIntegrand = integrand;

    result.t.push(t);
    result.S1.push(conc.S1);
    result.S2.push(conc.S2);
    result.P1.push(conc.P1);
    result.P2.push(conc.P2);
    result.X.push(X);
    result.v.push(v);
  }

  // Restore original Vmax
  if (deactivation && kd > 0) {
    model.Vmax = originalVmax;
  }

  return result;
}

/**
 * CSTR solver using bisection method.
 * Finds X where: F·S10·X / v(S1(X)) - V = 0
 */
export function solveCSTR(model, params) {
  const { S10, S20, P10, P20, a, b, c, d, V, F } = params;
  const tau = V / F; // residence time

  let lo = 0;
  let hi = CONVERSION_MAX;

  for (let iter = 0; iter < BISECTION_MAX_ITER; iter++) {
    const mid = (lo + hi) / 2;
    const conc = computeConcentrations(S10, S20, P10, P20, a, b, c, d, mid);
    const v = model.rate(conc.S1);

    if (v <= 0) {
      hi = mid;
      continue;
    }

    const f = (S10 * mid) / v - tau;

    if (Math.abs(f) < BISECTION_TOL) {
      return buildCSTRResult(conc, mid, v, params);
    }

    if (f > 0) {
      hi = mid;
    } else {
      lo = mid;
    }
  }

  // Return best estimate
  const Xfinal = (lo + hi) / 2;
  const conc = computeConcentrations(S10, S20, P10, P20, a, b, c, d, Xfinal);
  const v = model.rate(conc.S1);
  return buildCSTRResult(conc, Xfinal, v, params);
}

function buildCSTRResult(conc, X, v, params) {
  return {
    X,
    S1: conc.S1,
    S2: conc.S2,
    P1: conc.P1,
    P2: conc.P2,
    v,
    tau: params.V / params.F,
  };
}

/**
 * CSTRs in series: output of reactor i feeds reactor i+1.
 * Each reactor has volume V/N.
 */
export function solveCSTRSeries(model, params) {
  const { N } = params;
  const reactorV = params.V / N;
  const results = [];

  let currentParams = { ...params, V: reactorV };

  for (let i = 0; i < N; i++) {
    const res = solveCSTR(model, currentParams);
    results.push(res);

    // Feed next reactor with this reactor's output
    currentParams = {
      ...currentParams,
      S10: res.S1,
      S20: res.S2,
      P10: res.P1,
      P20: res.P2,
    };
  }

  return results;
}
