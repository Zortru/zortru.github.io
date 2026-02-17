const COLORS = ['#00FF67', '#FF6384', '#36A2EB', '#FFCE56'];

function formatTick(value) {
  if (Math.abs(value) >= 1000 || (Math.abs(value) < 0.01 && value !== 0)) {
    return value.toExponential(1);
  }
  // Strip trailing zeros: 12.50 → 12.5, 10.00 → 10
  return parseFloat(value.toPrecision(4)).toString();
}

function baseOptions(title) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      title: { display: true, text: title, color: '#f5f5f5', font: { size: 14 } },
      legend: { display: false },
      tooltip: {
        mode: 'nearest',
        intersect: false,
        callbacks: {
          label: ctx => {
            const x = formatTick(ctx.parsed.x);
            const y = formatTick(ctx.parsed.y);
            return `(${x}, ${y})`;
          },
        },
      },
      zoom: {
        pan: { enabled: true, mode: 'xy' },
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: 'xy',
        },
      },
    },
    scales: {
      x: {
        type: 'linear',
        ticks: {
          color: '#888',
          maxTicksLimit: 8,
          callback: formatTick,
        },
        grid: { color: '#222' },
        title: { display: true, color: '#888' },
      },
      y: {
        type: 'linear',
        ticks: {
          color: '#888',
          maxTicksLimit: 8,
          callback: formatTick,
        },
        grid: { color: '#222' },
        title: { display: true, color: '#888' },
      },
    },
  };
}

function zipXY(xArr, yArr) {
  const pts = [];
  for (let i = 0; i < xArr.length; i++) {
    pts.push({ x: xArr[i], y: yArr[i] });
  }
  return pts;
}

function createCanvas(container, id) {
  const wrapper = document.createElement('div');
  wrapper.className = 'chart-wrapper';

  const btnBar = document.createElement('div');
  btnBar.className = 'chart-btn-bar';
  const resetBtn = document.createElement('button');
  resetBtn.className = 'btn-reset-zoom';
  resetBtn.textContent = 'Reset Zoom';
  resetBtn.type = 'button';
  btnBar.appendChild(resetBtn);

  const canvas = document.createElement('canvas');
  canvas.id = id;

  wrapper.appendChild(btnBar);
  wrapper.appendChild(canvas);
  container.appendChild(wrapper);

  return { canvas, resetBtn };
}

export class ChartManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.charts = [];
    this.sliderCharts = [];
  }

  destroy() {
    this.charts.forEach(c => c.destroy());
    this.charts = [];
    this.sliderCharts.forEach(c => c.destroy());
    this.sliderCharts = [];
    this.container.innerHTML = '';
  }

  _createChart(canvasId, title, xLabel, yLabel, xArr, yArr, colorIdx = 0) {
    const { canvas, resetBtn } = createCanvas(this.container, canvasId);
    const opts = baseOptions(title);
    opts.scales.x.title.text = xLabel;
    opts.scales.y.title.text = yLabel;

    const chart = new Chart(canvas, {
      type: 'scatter',
      data: {
        datasets: [{
          data: zipXY(xArr, yArr),
          borderColor: COLORS[colorIdx % COLORS.length],
          borderWidth: 1.5,
          pointRadius: 0,
          showLine: true,
          tension: 0,
        }],
      },
      options: opts,
    });

    resetBtn.addEventListener('click', () => chart.resetZoom());
    this.charts.push(chart);
    return chart;
  }

  initBatchCharts(results) {
    this.destroy();
    this.container.className = 'chart-grid batch';

    this._createChart('chart-s-t', 'Substrate vs Time', 'Time', 'Concentration',
      results.t, results.S1, 0);

    this._createChart('chart-p-t', 'Product vs Time', 'Time', 'Concentration',
      results.t, results.P1, 1);

    this._createChart('chart-x-t', 'Conversion vs Time', 'Time', 'Conversion',
      results.t, results.X, 2);

    this._createChart('chart-v-s', 'Rate vs Substrate', '[S]', 'Rate',
      results.S1, results.v, 3);

    // Lineweaver-Burk: 1/v vs 1/S
    const lbS = [];
    const lbV = [];
    for (let i = 0; i < results.S1.length; i++) {
      if (results.S1[i] > 1e-8 && results.v[i] > 1e-8) {
        lbS.push(1 / results.S1[i]);
        lbV.push(1 / results.v[i]);
      }
    }
    this._createChart('chart-lb', 'Lineweaver-Burk', '1/[S]', '1/v',
      lbS, lbV, 0);
  }

  updateBatchData(results) {
    if (this.charts.length < 5) return;

    const updates = [
      [results.t, results.S1],
      [results.t, results.P1],
      [results.t, results.X],
      [results.S1, results.v],
    ];

    for (let i = 0; i < 4; i++) {
      this.charts[i].data.datasets[0].data = zipXY(updates[i][0], updates[i][1]);
      this.charts[i].update('none');
    }

    // Lineweaver-Burk
    const lbS = [];
    const lbV = [];
    for (let i = 0; i < results.S1.length; i++) {
      if (results.S1[i] > 1e-8 && results.v[i] > 1e-8) {
        lbS.push(1 / results.S1[i]);
        lbV.push(1 / results.v[i]);
      }
    }
    this.charts[4].data.datasets[0].data = zipXY(lbS, lbV);
    this.charts[4].update('none');
  }

  initContinuousCharts(results) {
    this.destroy();
    this.container.className = 'chart-grid continuous';

    const labels = results.map((_, i) => `R${i + 1}`);

    const concData = {
      labels,
      datasets: [
        { label: 'S1', data: results.map(r => r.S1), borderColor: COLORS[0], backgroundColor: COLORS[0] + '80' },
        { label: 'P1', data: results.map(r => r.P1), borderColor: COLORS[1], backgroundColor: COLORS[1] + '80' },
      ],
    };

    const convData = {
      labels,
      datasets: [{
        label: 'Conversion',
        data: results.map(r => r.X),
        borderColor: COLORS[2],
        backgroundColor: COLORS[2] + '80',
      }],
    };

    const velData = {
      labels,
      datasets: [{
        label: 'Rate',
        data: results.map(r => r.v),
        borderColor: COLORS[3],
        backgroundColor: COLORS[3] + '80',
      }],
    };

    this._createBarChart('chart-conc-r', 'Concentration vs Reactor', 'Reactor', 'Concentration', concData);
    this._createBarChart('chart-x-r', 'Conversion vs Reactor', 'Reactor', 'Conversion', convData);
    this._createBarChart('chart-v-r', 'Rate vs Reactor', 'Reactor', 'Rate', velData);
  }

  _createBarChart(canvasId, title, xLabel, yLabel, data) {
    const { canvas, resetBtn } = createCanvas(this.container, canvasId);
    const opts = baseOptions(title);
    // Bar charts use category axis
    opts.scales.x.type = 'category';
    delete opts.scales.x.ticks.callback;
    delete opts.scales.x.ticks.maxTicksLimit;
    opts.scales.y.title.text = yLabel;
    opts.scales.x.title.text = xLabel;
    opts.plugins.legend = { display: true, labels: { color: '#888' } };

    const chart = new Chart(canvas, {
      type: 'bar',
      data,
      options: opts,
    });

    resetBtn.addEventListener('click', () => chart.resetZoom());
    this.charts.push(chart);
    return chart;
  }

  /** Add a slider overlay dataset to all batch charts */
  addSliderOverlay(results) {
    if (this.charts.length < 5) return;

    const yData = [results.S1, results.P1, results.X, results.v];
    const xData = [results.t, results.t, results.t, results.S1];

    for (let i = 0; i < 4; i++) {
      const chart = this.charts[i];
      if (chart.data.datasets.length > 1) {
        chart.data.datasets.splice(1);
      }
      chart.data.datasets.push({
        data: zipXY(xData[i], yData[i]),
        borderColor: '#ffffff55',
        borderWidth: 1,
        pointRadius: 0,
        showLine: true,
        borderDash: [4, 4],
      });
      chart.update('none');
    }

    // LB overlay
    const lbS = [];
    const lbV = [];
    for (let i = 0; i < results.S1.length; i++) {
      if (results.S1[i] > 1e-8 && results.v[i] > 1e-8) {
        lbS.push(1 / results.S1[i]);
        lbV.push(1 / results.v[i]);
      }
    }
    const lbChart = this.charts[4];
    if (lbChart.data.datasets.length > 1) {
      lbChart.data.datasets.splice(1);
    }
    lbChart.data.datasets.push({
      data: zipXY(lbS, lbV),
      borderColor: '#ffffff55',
      borderWidth: 1,
      pointRadius: 0,
      showLine: true,
      borderDash: [4, 4],
    });
    lbChart.update('none');
  }

  removeSliderOverlays() {
    this.charts.forEach(chart => {
      if (chart.data.datasets.length > 1) {
        chart.data.datasets.splice(1);
        chart.update('none');
      }
    });
  }
}
