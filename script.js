const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const monthSelect = document.getElementById("monthSelect");
const yearInput = document.getElementById("yearInput");
const monthYearLabel = document.getElementById("monthYearLabel");
const calendarGrid = document.getElementById("calendarGrid");
const todayBtn = document.getElementById("todayBtn");
const clearBtn = document.getElementById("clearBtn");
const printBtn = document.getElementById("printBtn");
const pdfBtn = document.getElementById("pdfBtn");

const startMonthSelect = document.getElementById("startMonthSelect");
const startYearInput = document.getElementById("startYearInput");
const endMonthSelect = document.getElementById("endMonthSelect");
const endYearInput = document.getElementById("endYearInput");
const bulkPdfBtn = document.getElementById("bulkPdfBtn");
const rangeSummary = document.getElementById("rangeSummary");

function fillMonthSelect(select) {
  MONTHS.forEach((month, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = month;
    select.appendChild(option);
  });
}

[monthSelect, startMonthSelect, endMonthSelect].forEach(fillMonthSelect);

function safeYear(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return new Date().getFullYear();
  return Math.min(9999, Math.max(1, parsed));
}

// Evita a peculiaridade do JS em que new Date(26, ...) significaria 1926.
function makeDate(year, monthIndex, day) {
  const date = new Date(0);
  date.setHours(12, 0, 0, 0);
  date.setFullYear(year, monthIndex, day);
  return date;
}

function getDaysInMonth(year, monthIndex) {
  const date = makeDate(year, monthIndex + 1, 1);
  date.setDate(0);
  return date.getDate();
}

function getMondayFirstIndex(year, monthIndex) {
  // JS: domingo=0, segunda=1... -> planner: segunda=0 ... domingo=6
  const jsDay = makeDate(year, monthIndex, 1).getDay();
  return (jsDay + 6) % 7;
}

function storageKey(year, monthIndex, day) {
  return `planner:${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthAbsolute(year, monthIndex) {
  return year * 12 + monthIndex;
}

function absoluteToMonth(absolute) {
  return {
    year: Math.floor(absolute / 12),
    month: absolute % 12
  };
}

function monthData(year, month) {
  const daysInMonth = getDaysInMonth(year, month);
  const leadingEmpty = getMondayFirstIndex(year, month);
  const weekCount = Math.ceil((leadingEmpty + daysInMonth) / 7);
  const notes = {};

  for (let day = 1; day <= daysInMonth; day++) {
    const value = localStorage.getItem(storageKey(year, month, day)) || "";
    if (value) notes[day] = value;
  }

  return { year, month, daysInMonth, leadingEmpty, weekCount, notes };
}

function renderCalendar() {
  const year = safeYear(yearInput.value);
  const month = Number(monthSelect.value);
  yearInput.value = year;

  const data = monthData(year, month);
  const totalCells = data.weekCount * 7;

  monthYearLabel.textContent = `${MONTHS[month]} / ${year}`;
  calendarGrid.innerHTML = "";
  calendarGrid.style.setProperty("--week-count", data.weekCount);

  for (let cellIndex = 0; cellIndex < totalCells; cellIndex++) {
    const cell = document.createElement("div");
    cell.className = "day-cell";

    const day = cellIndex - data.leadingEmpty + 1;
    const column = cellIndex % 7;

    if (day < 1 || day > data.daysInMonth) {
      cell.classList.add("empty");
      calendarGrid.appendChild(cell);
      continue;
    }

    if (column >= 5) cell.classList.add("weekend");

    const number = document.createElement("span");
    number.className = "day-number";
    number.textContent = String(day).padStart(2, "0");

    const notes = document.createElement("textarea");
    notes.className = "day-notes";
    notes.setAttribute("aria-label", `${day} de ${MONTHS[month]} de ${year}`);
    notes.spellcheck = true;
    notes.value = data.notes[day] || "";

    notes.addEventListener("input", () => {
      if (notes.value) {
        localStorage.setItem(storageKey(year, month, day), notes.value);
      } else {
        localStorage.removeItem(storageKey(year, month, day));
      }
    });

    cell.append(number, notes);
    calendarGrid.appendChild(cell);
  }
}

function goToCurrentMonth() {
  const now = new Date();
  monthSelect.value = now.getMonth();
  yearInput.value = now.getFullYear();
  renderCalendar();
}

function clearCurrentMonth() {
  const year = safeYear(yearInput.value);
  const month = Number(monthSelect.value);
  const daysInMonth = getDaysInMonth(year, month);

  if (!confirm(`Apagar todas as anotações de ${MONTHS[month]} de ${year}?`)) return;

  for (let day = 1; day <= daysInMonth; day++) {
    localStorage.removeItem(storageKey(year, month, day));
  }

  renderCalendar();
}

function slugMonth(month) {
  return MONTHS[month]
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function downloadCurrentPdf() {
  const year = safeYear(yearInput.value);
  const month = Number(monthSelect.value);
  PlannerPDF.download(
    [monthData(year, month)],
    `planner-${slugMonth(month)}-${year}.pdf`
  );
}

function normalizedRange() {
  const startYear = safeYear(startYearInput.value);
  const endYear = safeYear(endYearInput.value);
  const startMonth = Number(startMonthSelect.value);
  const endMonth = Number(endMonthSelect.value);

  startYearInput.value = startYear;
  endYearInput.value = endYear;

  return {
    startYear,
    startMonth,
    endYear,
    endMonth,
    startAbsolute: monthAbsolute(startYear, startMonth),
    endAbsolute: monthAbsolute(endYear, endMonth)
  };
}

function updateRangeSummary() {
  const range = normalizedRange();
  const count = range.endAbsolute - range.startAbsolute + 1;

  rangeSummary.classList.toggle("error", count < 1);
  bulkPdfBtn.disabled = count < 1;

  if (count < 1) {
    rangeSummary.textContent = "A data final precisa vir depois da inicial.";
    return;
  }

  rangeSummary.textContent = `${count} ${count === 1 ? "página" : "páginas"} no PDF`;
}

function downloadBulkPdf() {
  const range = normalizedRange();
  const count = range.endAbsolute - range.startAbsolute + 1;
  if (count < 1) return;

  const months = [];
  for (let absolute = range.startAbsolute; absolute <= range.endAbsolute; absolute++) {
    const { year, month } = absoluteToMonth(absolute);
    months.push(monthData(year, month));
  }

  const filename = [
    "planner",
    slugMonth(range.startMonth),
    range.startYear,
    "a",
    slugMonth(range.endMonth),
    range.endYear
  ].join("-") + ".pdf";

  PlannerPDF.download(months, filename);
}

monthSelect.addEventListener("change", renderCalendar);
yearInput.addEventListener("change", renderCalendar);
yearInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    yearInput.blur();
    renderCalendar();
  }
});

todayBtn.addEventListener("click", goToCurrentMonth);
clearBtn.addEventListener("click", clearCurrentMonth);
printBtn.addEventListener("click", () => window.print());
pdfBtn.addEventListener("click", downloadCurrentPdf);

[startMonthSelect, startYearInput, endMonthSelect, endYearInput].forEach((element) => {
  element.addEventListener("change", updateRangeSummary);
  element.addEventListener("input", updateRangeSummary);
});

bulkPdfBtn.addEventListener("click", downloadBulkPdf);

// Estado inicial: mês atual e intervalo de 12 meses a partir dele.
const now = new Date();
monthSelect.value = now.getMonth();
yearInput.value = now.getFullYear();

const startAbs = monthAbsolute(now.getFullYear(), now.getMonth());
const end = absoluteToMonth(startAbs + 11);
startMonthSelect.value = now.getMonth();
startYearInput.value = now.getFullYear();
endMonthSelect.value = end.month;
endYearInput.value = end.year;

renderCalendar();
updateRangeSummary();
