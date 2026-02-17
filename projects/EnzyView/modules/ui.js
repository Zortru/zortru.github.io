const INHIBITION_FIELDS = {
  'none': [],
  'competitive': ['I', 'KI'],
  'noncompetitive': ['I', 'KI'],
  'uncompetitive': ['I', 'KI'],
  'partially-competitive': ['I', 'KI', 'KSI'],
  'partially-noncompetitive': ['I', 'KI', 'k2I', 'ET'],
  'substrate': ['KSI'],
};

const SLIDER_PARAMS = {
  'none': ['Vmax', 'Km', 'S10'],
  'competitive': ['Vmax', 'Km', 'S10', 'I', 'KI'],
  'noncompetitive': ['Vmax', 'Km', 'S10', 'I', 'KI'],
  'uncompetitive': ['Vmax', 'Km', 'S10', 'I', 'KI'],
  'partially-competitive': ['Vmax', 'Km', 'S10', 'I', 'KI', 'KSI'],
  'partially-noncompetitive': ['Vmax', 'Km', 'S10', 'I', 'KI', 'k2I', 'ET'],
  'substrate': ['Vmax', 'Km', 'S10', 'KSI'],
};

export class UIManager {
  constructor() {
    this._cacheElements();
  }

  _cacheElements() {
    this.modeSelect = document.getElementById('mode');
    this.inhibitionSelect = document.getElementById('inhibition');

    // Mode-specific fields
    this.batchFields = document.getElementById('batch-fields');
    this.cstrFields = document.getElementById('cstr-fields');
    this.seriesFields = document.getElementById('series-fields');

    // Inhibition fields
    this.fieldI = document.getElementById('field-I');
    this.fieldKI = document.getElementById('field-KI');
    this.fieldKSI = document.getElementById('field-KSI');
    this.fieldk2I = document.getElementById('field-k2I');
    this.fieldET = document.getElementById('field-ET');

    // Deactivation
    this.deactivationGroup = document.getElementById('deactivation-group');
    this.deactivationCheckbox = document.getElementById('deactivation');
    this.fieldKd = document.getElementById('field-kd');

    // Slider
    this.sliderParam = document.getElementById('slider-param');
    this.sliderMin = document.getElementById('slider-min');
    this.sliderMax = document.getElementById('slider-max');
    this.sliderStep = document.getElementById('slider-step');
    this.sliderRange = document.getElementById('slider-range');
    this.sliderValue = document.getElementById('slider-value');

    // Buttons
    this.calculateBtn = document.getElementById('calculate-btn');
    this.resetBtn = document.getElementById('reset-btn');

    // Error display
    this.errorContainer = document.getElementById('error-container');
  }

  setMode(mode) {
    this.batchFields.classList.toggle('hidden', mode !== 'batch');
    this.cstrFields.classList.toggle('hidden', mode !== 'cstr' && mode !== 'series');
    this.seriesFields.classList.toggle('hidden', mode !== 'series');
    this.deactivationGroup.classList.toggle('hidden', mode !== 'batch');
  }

  setInhibitionType(type) {
    const fields = INHIBITION_FIELDS[type] || [];
    ['I', 'KI', 'KSI', 'k2I', 'ET'].forEach(f => {
      const el = document.getElementById(`field-${f}`);
      if (el) el.classList.toggle('hidden', !fields.includes(f));
    });

    // Update slider param options
    this._updateSliderParams(type);
  }

  _updateSliderParams(inhibitionType) {
    const params = SLIDER_PARAMS[inhibitionType] || SLIDER_PARAMS['none'];
    const current = this.sliderParam.value;
    this.sliderParam.innerHTML = '';
    params.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p;
      opt.textContent = p;
      this.sliderParam.appendChild(opt);
    });
    if (params.includes(current)) {
      this.sliderParam.value = current;
    }
  }

  setDeactivationVisible(checked) {
    this.fieldKd.classList.toggle('hidden', !checked);
  }

  readInputs() {
    const val = id => {
      const el = document.getElementById(id);
      return el ? parseFloat(el.value) : NaN;
    };

    return {
      mode: this.modeSelect.value,
      inhibition: this.inhibitionSelect.value,
      a: val('coeff-a'),
      b: val('coeff-b'),
      c: val('coeff-c'),
      d: val('coeff-d'),
      S10: val('S10'),
      S20: val('S20'),
      P10: val('P10'),
      P20: val('P20'),
      Vmax: val('Vmax'),
      Km: val('Km'),
      I: val('I'),
      KI: val('KI'),
      KSI: val('KSI'),
      k2I: val('k2I'),
      ET: val('ET'),
      Xmax: val('Xmax') / 100,
      V: val('volume'),
      F: val('flowrate'),
      N: Math.round(val('n-reactors')),
      deactivation: this.deactivationCheckbox.checked,
      kd: val('kd'),
    };
  }

  validate(inputs) {
    const errors = [];
    const positive = (name, val) => {
      if (isNaN(val) || val <= 0) errors.push(`${name} must be a positive number`);
    };
    const nonNeg = (name, val) => {
      if (isNaN(val) || val < 0) errors.push(`${name} must be a non-negative number`);
    };

    // Stoichiometry
    positive('Coefficient a', inputs.a);
    nonNeg('Coefficient b', inputs.b);
    nonNeg('Coefficient c', inputs.c);
    nonNeg('Coefficient d', inputs.d);

    // Concentrations
    positive('[S1]₀', inputs.S10);
    nonNeg('[S2]₀', inputs.S20);
    nonNeg('[P1]₀', inputs.P10);
    nonNeg('[P2]₀', inputs.P20);

    // Kinetics
    positive('Vmax', inputs.Vmax);
    positive('Km', inputs.Km);

    // Model-specific
    const inhibFields = INHIBITION_FIELDS[inputs.inhibition] || [];
    if (inhibFields.includes('I')) positive('[I]', inputs.I);
    if (inhibFields.includes('KI')) positive('KI', inputs.KI);
    if (inhibFields.includes('KSI')) positive('KSI', inputs.KSI);
    if (inhibFields.includes('k2I')) positive('k2I', inputs.k2I);
    if (inhibFields.includes('ET')) positive('[E]T', inputs.ET);

    // Mode-specific
    if (inputs.mode === 'batch') {
      if (isNaN(inputs.Xmax) || inputs.Xmax <= 0 || inputs.Xmax > 1) {
        errors.push('Max conversion must be between 0 and 100%');
      }
      if (inputs.deactivation) {
        positive('kd', inputs.kd);
      }
    } else {
      positive('Volume (V)', inputs.V);
      positive('Flow rate (F)', inputs.F);
      if (inputs.mode === 'series') {
        if (isNaN(inputs.N) || inputs.N < 1) errors.push('Number of reactors must be ≥ 1');
      }
    }

    return errors;
  }

  showErrors(errors) {
    this.errorContainer.innerHTML = '';
    if (errors.length === 0) {
      this.errorContainer.classList.add('hidden');
      return;
    }
    this.errorContainer.classList.remove('hidden');
    errors.forEach(msg => {
      const div = document.createElement('div');
      div.className = 'error-msg';
      div.textContent = msg;
      this.errorContainer.appendChild(div);
    });
  }

  clearErrors() {
    this.errorContainer.innerHTML = '';
    this.errorContainer.classList.add('hidden');
  }

  configureSlider() {
    const min = parseFloat(this.sliderMin.value) || 0;
    const max = parseFloat(this.sliderMax.value) || 100;
    const step = parseFloat(this.sliderStep.value) || 1;
    this.sliderRange.min = min;
    this.sliderRange.max = max;
    this.sliderRange.step = step;

    // Set to current parameter value
    const paramName = this.sliderParam.value;
    const currentEl = document.getElementById(this._paramToId(paramName));
    if (currentEl) {
      this.sliderRange.value = parseFloat(currentEl.value) || min;
    }
    this.sliderValue.textContent = this.sliderRange.value;
  }

  getSliderParam() {
    return this.sliderParam.value;
  }

  getSliderValue() {
    return parseFloat(this.sliderRange.value);
  }

  _paramToId(param) {
    const map = {
      'Vmax': 'Vmax',
      'Km': 'Km',
      'S10': 'S10',
      'I': 'I',
      'KI': 'KI',
      'KSI': 'KSI',
      'k2I': 'k2I',
      'ET': 'ET',
    };
    return map[param] || param;
  }

  resetDefaults() {
    document.getElementById('mode').value = 'batch';
    document.getElementById('inhibition').value = 'none';
    document.getElementById('coeff-a').value = '1';
    document.getElementById('coeff-b').value = '0';
    document.getElementById('coeff-c').value = '1';
    document.getElementById('coeff-d').value = '0';
    document.getElementById('S10').value = '50';
    document.getElementById('S20').value = '0';
    document.getElementById('P10').value = '0';
    document.getElementById('P20').value = '0';
    document.getElementById('Vmax').value = '100';
    document.getElementById('Km').value = '10';
    document.getElementById('I').value = '';
    document.getElementById('KI').value = '';
    document.getElementById('KSI').value = '';
    document.getElementById('k2I').value = '';
    document.getElementById('ET').value = '';
    document.getElementById('Xmax').value = '95';
    document.getElementById('volume').value = '';
    document.getElementById('flowrate').value = '';
    document.getElementById('n-reactors').value = '3';
    document.getElementById('kd').value = '';
    this.deactivationCheckbox.checked = false;
    this.setMode('batch');
    this.setInhibitionType('none');
    this.setDeactivationVisible(false);
    this.clearErrors();
  }
}
