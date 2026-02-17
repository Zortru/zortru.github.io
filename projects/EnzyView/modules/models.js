class KineticModel {
  constructor(params) {
    this.Vmax = params.Vmax;
    this.Km = params.Km;
  }

  rate(S) {
    return 0;
  }
}

class MichaelisMenten extends KineticModel {
  rate(S) {
    return this.Vmax * S / (this.Km + S);
  }
}

class CompetitiveInhibition extends KineticModel {
  constructor(params) {
    super(params);
    this.I = params.I;
    this.KI = params.KI;
  }

  rate(S) {
    const apparentKm = this.Km * (1 + this.I / this.KI);
    return this.Vmax * S / (apparentKm + S);
  }
}

class NonCompetitiveInhibition extends KineticModel {
  constructor(params) {
    super(params);
    this.I = params.I;
    this.KI = params.KI;
  }

  rate(S) {
    const apparentVmax = this.Vmax / (1 + this.I / this.KI);
    return apparentVmax * S / (this.Km + S);
  }
}

class UncompetitiveInhibition extends KineticModel {
  constructor(params) {
    super(params);
    this.I = params.I;
    this.KI = params.KI;
  }

  rate(S) {
    const factor = 1 + this.I / this.KI;
    return (this.Vmax / factor) * S / (this.Km / factor + S);
  }
}

class PartiallyCompetitiveInhibition extends KineticModel {
  constructor(params) {
    super(params);
    this.I = params.I;
    this.KI = params.KI;
    this.KSI = params.KSI;
  }

  rate(S) {
    const apparentKm = this.Km * (1 + this.I / this.KI) / (1 + this.I / this.KSI);
    return this.Vmax * S / (apparentKm + S);
  }
}

class PartiallyNonCompetitiveInhibition extends KineticModel {
  constructor(params) {
    super(params);
    this.I = params.I;
    this.KI = params.KI;
    this.k2I = params.k2I;
    this.ET = params.ET;
  }

  rate(S) {
    const apparentVmax = (this.Vmax + this.k2I * this.ET * this.I / this.KI) / (1 + this.I / this.KI);
    return apparentVmax * S / (this.Km + S);
  }
}

class SubstrateInhibition extends KineticModel {
  constructor(params) {
    super(params);
    this.KSI = params.KSI;
  }

  rate(S) {
    return this.Vmax * S / (this.Km + S + S * S / this.KSI);
  }
}

const MODEL_MAP = {
  'none': MichaelisMenten,
  'competitive': CompetitiveInhibition,
  'noncompetitive': NonCompetitiveInhibition,
  'uncompetitive': UncompetitiveInhibition,
  'partially-competitive': PartiallyCompetitiveInhibition,
  'partially-noncompetitive': PartiallyNonCompetitiveInhibition,
  'substrate': SubstrateInhibition,
};

export function createModel(type, params) {
  const ModelClass = MODEL_MAP[type];
  if (!ModelClass) throw new Error(`Unknown model type: ${type}`);
  return new ModelClass(params);
}

export { KineticModel, MichaelisMenten };
