// Replace this with your actual Google Apps Script Web App URL
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyPn5h3Y9SPO3Mde3OpC_-IieS1nSDrbREFi_1Os2muf52Y_7msmBnidMtXVo8mLPr2/exec";
const REFRESH_MS = 2000;
const MAX_POINTS = 10;

let dataStore = { labels: [], spo2: [], hr: [], temp: [] };
let charts = {};

function initCharts() {
  const createChart = (id, label, color) => new Chart(document.getElementById(id), {
    type: "line",
    data: {
      labels: dataStore.labels,
      datasets: [{
        label,
        data: [],
        borderColor: color,
        backgroundColor: color + "33",
        fill: true,
        tension: 0.3,
        pointRadius: 0
      }]
    },
    options: {
      responsive: true,
      animation: false,
      plugins: { legend: { display: false } },
      scales: { x: { display: false } }
    }
  });

  charts.spo2 = createChart("chart-spo2", "SpO₂", "#06b6d4");
  charts.hr = createChart("chart-hr", "Heart Rate", "#10b981");
  charts.temp = createChart("chart-temp", "Temperature", "#f97316");
}

function updateCharts(spo2, hr, temp) {
  const label = new Date().toLocaleTimeString();
  dataStore.labels.push(label);
  dataStore.spo2.push(spo2);
  dataStore.hr.push(hr);
  dataStore.temp.push(temp);

  if (dataStore.labels.length > MAX_POINTS) {
    for (const key in dataStore) dataStore[key].shift();
  }

  for (let key of ['spo2', 'hr', 'temp']) {
    charts[key].data.labels = dataStore.labels;
    charts[key].data.datasets[0].data = dataStore[key];
    charts[key].update();
  }
}

function predictCondition(hr, spo2, temp) {
  let condition = "Normal";
  let advice = "Vitals are within normal range.";
  if (spo2 < 90 || hr > 120 || temp > 38) {
    condition = "Critical";
    advice = "Immediate medical attention recommended.";
  } else if (spo2 < 94 || hr > 100 || temp > 37.5) {
    condition = "Moderate Risk";
    advice = "Mild abnormality detected. Hydrate and rest.";
  }
  document.getElementById("prediction").textContent = condition;
  document.getElementById("recommendation").textContent = advice;
  document.getElementById("prediction").style.color =
    condition === "Critical" ? "#ef4444" :
    condition === "Moderate Risk" ? "#facc15" : "#22c55e";
}

async function fetchData() {
  const statusBox = document.getElementById("status");
  try {
    const res = await fetch(GOOGLE_SCRIPT_URL, { cache: "no-store" });
    const data = await res.json();

    const hr = Number(data.heartrate);
    const spo2 = Number(data.spo2);
    const temp = Number(data.temperature);

    if (isFinite(hr) && isFinite(spo2) && isFinite(temp)) {
      document.getElementById("val-spo2").textContent = `${spo2} %`;
      document.getElementById("val-hr").textContent = `${hr} bpm`;
      document.getElementById("val-temp").textContent = `${temp.toFixed(1)} °C`;
      statusBox.textContent = "Live data connected ✅";
      statusBox.className = "status ok";

      updateCharts(spo2, hr, temp);
      predictCondition(hr, spo2, temp);
    } else {
      statusBox.textContent = "Invalid or missing data.";
      statusBox.className = "status warn";
    }
  } catch {
    statusBox.textContent = "Connection failed. No live data.";
    statusBox.className = "status crit";
  }
}

// ----------- Professional PDF Report -----------
document.getElementById("download-btn").addEventListener("click", () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  doc.setFillColor(6, 182, 212);
  doc.rect(0, 0, 210, 25, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text("Smart Health Monitoring System", 15, 17);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text(`Report Generated: ${new Date().toLocaleString()}`, 15, 35);

  const pred = document.getElementById("prediction").textContent;
  const rec = document.getElementById("recommendation").textContent;

  let predColor = [34, 197, 94];
  if (pred === "Critical") predColor = [239, 68, 68];
  else if (pred === "Moderate Risk") predColor = [250, 204, 21];

  doc.setFillColor(...predColor);
  doc.roundedRect(15, 45, 180, 20, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text(`AI Prediction: ${pred}`, 25, 58);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text("Recommendation:", 15, 75);
  doc.text(rec, 60, 75, { maxWidth: 130 });

  const rows = [];
  for (let i = 0; i < dataStore.labels.length; i++) {
    rows.push([
      dataStore.labels[i],
      dataStore.spo2[i],
      dataStore.hr[i],
      dataStore.temp[i].toFixed(1)
    ]);
  }

  doc.autoTable({
    startY: 90,
    head: [["Time", "SpO₂ (%)", "Heart Rate (bpm)", "Temperature (°C)"]],
    body: rows,
    theme: "striped",
    headStyles: {
      fillColor: [6, 182, 212],
      textColor: [255, 255, 255],
      halign: "center"
    },
    styles: { halign: "center", cellPadding: 3, fontSize: 10 },
    margin: { left: 15, right: 15 }
  });

  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(10);
  doc.text("© 2025 Smart Health Monitoring System", 15, pageHeight - 10);

  doc.save("Health_Report.pdf");
});

window.addEventListener("load", () => {
  initCharts();
  fetchData();
  setInterval(fetchData, REFRESH_MS);
});
