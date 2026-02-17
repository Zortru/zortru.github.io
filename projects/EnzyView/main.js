import { createModel } from './modules/models.js';
import { solveBatch, solveCSTR, solveCSTRSeries } from './modules/solvers.js';
import { ChartManager } from './modules/charts.js';
import { UIManager } from './modules/ui.js';

const ui = new UIManager();
const charts = new ChartManager('chart-container');

let lastResults = null;
let lastInputs = null;

// ── Event listeners ──────────────────────────────────

ui.modeSelect.addEventListener('change', () => {
  ui.setMode(ui.modeSelect.value);
});

ui.inhibitionSelect.addEventListener('change', () => {
  ui.setInhibitionType(ui.inhibitionSelect.value);
});

ui.deactivationCheckbox.addEventListener('change', () => {
  ui.setDeactivationVisible(ui.deactivationCheckbox.checked);
});

ui.calculateBtn.addEventListener('click', calculate);

ui.resetBtn.addEventListener('click', () => {
  ui.resetDefaults();
  charts.destroy();
  lastResults = null;
  lastInputs = null;
});

// ── Slider ──────────────────────────────────────────

let sliderRafId = null;

function onSliderConfig() {
  ui.configureSlider();
}

ui.sliderParam.addEventListener('change', onSliderConfig);
ui.sliderMin.addEventListener('change', onSliderConfig);
ui.sliderMax.addEventListener('change', onSliderConfig);
ui.sliderStep.addEventListener('change', onSliderConfig);

ui.sliderRange.addEventListener('input', () => {
  ui.sliderValue.textContent = ui.sliderRange.value;
  if (sliderRafId) cancelAnimationFrame(sliderRafId);
  sliderRafId = requestAnimationFrame(() => runSlider(false));
});

ui.sliderRange.addEventListener('change', () => {
  runSlider(true);
});

function runSlider(fullPrecision) {
  if (!lastInputs || lastInputs.mode !== 'batch') return;

  const paramName = ui.getSliderParam();
  const paramValue = ui.getSliderValue();

  const modifiedInputs = { ...lastInputs, [paramName]: paramValue };

  const model = createModel(modifiedInputs.inhibition, modifiedInputs);
  const results = solveBatch(model, modifiedInputs);

  charts.addSliderOverlay(results);
}

// ── Calculate ───────────────────────────────────────

function calculate() {
  ui.clearErrors();

  const inputs = ui.readInputs();
  const errors = ui.validate(inputs);

  if (errors.length > 0) {
    ui.showErrors(errors);
    return;
  }

  const model = createModel(inputs.inhibition, inputs);
  lastInputs = inputs;

  if (inputs.mode === 'batch') {
    const results = solveBatch(model, inputs);
    lastResults = results;

    if (charts.charts.length >= 5) {
      charts.updateBatchData(results);
    } else {
      charts.initBatchCharts(results);
    }
  } else if (inputs.mode === 'cstr') {
    const result = solveCSTR(model, inputs);
    // Wrap single CSTR result as array for chart display
    charts.initContinuousCharts([result]);
    lastResults = [result];
  } else if (inputs.mode === 'series') {
    const results = solveCSTRSeries(model, inputs);
    charts.initContinuousCharts(results);
    lastResults = results;
  }

  // Configure slider with current state
  ui.configureSlider();
}
