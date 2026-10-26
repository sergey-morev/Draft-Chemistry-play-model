import { describeCompound } from "../chemistry/description.js";
import { elementStateDescription } from "../chemistry/elements.js";
import { atomMass, desiredBondLength, isHydrogenLike, isotopeLabel } from "../chemistry/properties.js";
import { stabilityState } from "../render/effects.js";
import { bondHasSymbols, getAtom, getBond } from "../simulation/graph.js";
import { state as labState } from "../state.js";
import { catalystAdvice } from "./controls.js";
import { atomCount, atomReports, bondCount, chargeValue, compoundInfo, energyBar, energyValue, formulaInput, formulaLine, issueList, massValue, selectionInfo, stabilityBar, stabilityLabel, stabilityValue, stageWrap } from "./dom.js";
import { bondName, bondNameShort, clamp, distance, escapeHtml, formatNumber, signed, stabilityColor, stabilityText } from "../utils/format.js";

export function renderAnalysis(analysis) {
  formulaLine.textContent = displayFormula(analysis) || "пустая модель";
  if (formulaInput && document.activeElement !== formulaInput) {
    formulaInput.value = analysis.formula || "";
  }
  stabilityValue.textContent = `${analysis.score}%`;
  stabilityBar.style.width = `${analysis.score}%`;
  stabilityBar.style.background = stabilityColor(analysis.score);
  energyValue.textContent = formatNumber(analysis.strainEnergy);
  energyBar.style.width = `${clamp(analysis.strainEnergy * 5, 0, 100)}%`;
  stabilityLabel.textContent = stabilityText(analysis.score);
  stabilityLabel.style.color = stabilityColor(analysis.score);
  stabilityLabel.style.background = `${stabilityColor(analysis.score)}16`;
  massValue.textContent = `${formatNumber(analysis.mass)} г/моль`;
  chargeValue.textContent = signed(analysis.totalCharge, true);
  atomCount.textContent = String(labState.atoms.length);
  bondCount.textContent = String(labState.bonds.length);
  if (stageWrap) stageWrap.dataset.state = stabilityState(analysis.score);

  renderSelection(analysis);
  renderCompoundInfo(analysis);
  renderAtomReports(analysis);
  renderIssues(analysis);
  const validation = document.getElementById("validationSummary");
  if (validation) validation.innerHTML = renderForceFieldCheck(analysis) + renderRdkitCheck(labState.compoundMeta?.rdkit);
}

export function displayFormula(analysis = labState.lastAnalysis) {
  if (labState.compoundMeta?.displayFormula) return labState.compoundMeta.displayFormula;
  if (labState.compoundMeta?.commonName && labState.compoundMeta.sourceFormula) return labState.compoundMeta.sourceFormula;
  return analysis?.formula || "";
}

export function renderSelection(analysis) {
  if (labState.selectedBondId) {
    const bond = getBond(labState.selectedBondId);
    const a = getAtom(bond?.a);
    const b = getAtom(bond?.b);
    selectionInfo.innerHTML = bond && a && b
      ? `<strong>${a.symbol}${a.id}-${b.symbol}${b.id}</strong><br>тип: ${bondName(bond.order)}; длина ${formatNumber(distance(a, b) / 100)} усл. Å`
      : "Связь не выбрана.";
    return;
  }

  if (labState.selectedAtomIds.length === 1) {
    const atom = getAtom(labState.selectedAtomIds[0]);
    const report = analysis.atomMap.get(atom?.id);
    const isotope = atom && report ? isotopeLabel(atom, report.element) : "";
    const shift = atom?.isotopeShift || 0;
    const shiftText = shift > 0 ? `+${shift}` : String(shift);
    selectionInfo.innerHTML = atom && report
      ? `<strong>${atom.symbol}${atom.id} · ${report.element.name} · ${isotope}</strong><br>V валентность: ${report.allowedValences.join("/")}; связи ${formatNumber(report.usage)}; заряд ${signed(atom.charge, true)}<br>A изотоп: ${isotope}; сдвиг ${shiftText}; обогащ. ${Math.round((atom.enrichment || 0) * 100)}%; масса ${formatNumber(atomMass(atom, report.element))}<br>${escapeHtml(elementStateDescription(report.element))}`
      : "Атом не выбран.";
    return;
  }

  if (labState.selectedAtomIds.length > 1) {
    selectionInfo.innerHTML = `<strong>Выбрано атомов: ${labState.selectedAtomIds.length}</strong><br>${labState.selectedAtomIds.map((id) => {
      const atom = getAtom(id);
      return atom ? `${atom.symbol}${atom.id}` : "";
    }).filter(Boolean).join(", ")}`;
    return;
  }

  selectionInfo.textContent = "Нет выбранного объекта.";
}

export function renderCompoundInfo(analysis) {
  if (!compoundInfo) return;
  const info = describeCompound(analysis);
  const tags = [
    `формула ${displayFormula(analysis) || analysis.formula || "нет"}`,
    `${stabilityText(analysis.score)} ${analysis.score}%`,
    `масса ${formatNumber(analysis.mass)}`
  ];
  if (labState.compoundMeta?.external?.cid) tags.push(`PubChem CID ${labState.compoundMeta.external.cid}`);
  if (labState.compoundMeta?.rdkit?.formula) tags.push(`RDKit ${labState.compoundMeta.rdkit.formula}`);
  compoundInfo.innerHTML = `
    <div class="compound-title">
      <strong>${escapeHtml(info.title)}</strong>
      <span>${escapeHtml(info.kind)}</span>
    </div>
    <p>${escapeHtml(shortenText(info.summary, 118))}</p>
    <div class="compound-tags">
      ${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
    </div>
    <div class="compound-actions">
      <button type="button" class="reference-wide" data-open-reference>Справочник</button>
      <button type="button" class="reference-wide scheme" data-expand-molecule>Развернуть схему</button>
    </div>
  `;
}

export function renderRdkitCheck(check) {
  const status = check?.status || labState.rdkitStatus;
  const statusText = labState.rdkitModule ? "готов" : status;
  const rows = [`данные: ${labState.dataLoadStatus}`];
  if (check?.formula) rows.push(`формула ${check.formula}`);
  if (check?.exactMass != null) rows.push(`масса ${formatNumber(Number(check.exactMass))}`);
  if (check?.canonical) rows.push(`SMILES ${check.canonical}`);
  const notes = check?.notes?.length ? check.notes : ["Введите SMILES или известное название, чтобы сверить структуру."];
  return `
    <div class="check-panel rdkit-check ${statusText === "готов" ? "ready" : "pending"}">
      <div class="check-head"><strong>Проверка RDKit</strong><span>${escapeHtml(statusText)}</span></div>
      ${!labState.rdkitModule && labState.rdkitStatus !== "загрузка" ? '<button class="chip" data-enable-rdkit title="Загрузить RDKit.js из внешнего CDN; структура проверяется на этом компьютере">Включить RDKit</button>' : ""}
      ${rows.length ? `<div class="compound-tags">${rows.map((row) => `<span>${escapeHtml(row)}</span>`).join("")}</div>` : ""}
      <ul>${notes.slice(0, 3).map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>
    </div>
  `;
}

export function renderExternalCheck(external = labState.compoundMeta?.external) {
  const rows = [`статус: ${labState.externalLookupStatus}`];
  if (external?.cid) rows.push(`PubChem CID ${external.cid}`);
  if (external?.molecularWeight) rows.push(`масса ${external.molecularWeight}`);
  if (external?.inchiKey) rows.push(`InChIKey ${external.inchiKey}`);
  const notes = external
    ? ["Формула и SMILES пришли из внешней базы, но учебная геометрия всё равно строится нашей песочницей.", "Онлайн-поиск не сохраняется в локальный JSON без вашего отдельного решения."]
    : ["Нажмите Pub в верхней строке, чтобы поискать название или SMILES во внешней базе PubChem.", "ChEBI оставлен как следующий источник для биологических классов и онтологий."];
  return `
    <div class="check-panel external-check ${external ? "ready" : "pending"}">
      <div class="check-head"><strong>PubChem / ChEBI</strong><span>${external ? "найдено" : "локально"}</span></div>
      <div class="compound-tags">${rows.map((row) => `<span>${escapeHtml(row)}</span>`).join("")}</div>
      <ul>${notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>
      ${external?.url ? `<a class="external-link" href="${escapeHtml(external.url)}" target="_blank" rel="noreferrer">Открыть PubChem</a>` : ""}
    </div>
  `;
}

export function renderForceFieldCheck(analysis) {
  const clashes = labState.bonds.filter((bond) => {
    const a = getAtom(bond.a);
    const b = getAtom(bond.b);
    return a && b && distance(a, b) < desiredBondLength(bond) * 0.62;
  }).length;
  const state = analysis.strainEnergy < 5 && clashes === 0 ? "ready" : "pending";
  const notes = [
    `Учебная энергия графа: ${formatNumber(analysis.strainEnergy)}; коротких столкновений: ${clashes}.`,
    "Это геометрическая оценка схемы, а не энергия вещества и не расчёт UFF/MMFF94.",
    labState.rdkitModule ? "RDKit загружен: можно сверять SMILES/формулу; 3D-конформеры оставлены как следующий тяжёлый режим." : "Для настоящего силового поля нужен RDKit/WASM или локальный химический backend."
  ];
  return `
    <div class="check-panel forcefield-check ${state}">
      <div class="check-head"><strong>Наша учебная оценка</strong><span>${state === "ready" ? "согласовано" : "есть напряжение"}</span></div>
      <ul>${notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>
    </div>
  `;
}

export function shortenText(text, limit = 120) {
  const source = String(text || "");
  return source.length > limit ? `${source.slice(0, limit - 1)}...` : source;
}

export function renderAtomReports(analysis) {
  atomReports.innerHTML = "";
  const reports = [...analysis.atomMap.values()].slice(0, 14);
  if (!reports.length) {
    atomReports.innerHTML = `<div class="issue-row"><strong>Пусто</strong><span>атомные связи появятся после добавления элементов</span></div>`;
    return;
  }
  reports.forEach((report) => {
    const row = document.createElement("div");
    row.className = `report-row ${report.state}`;
    const bondsText = labState.bonds
      .filter((bond) => bond.a === report.atom.id || bond.b === report.atom.id)
      .map((bond) => {
        const other = getAtom(bond.a === report.atom.id ? bond.b : bond.a);
        return `${bondNameShort(bond.order)} ${other?.symbol}${other?.id}`;
      })
      .join(", ") || "нет";
    row.innerHTML = `
      <strong>${report.atom.symbol}${report.atom.id}: ${report.detail}</strong>
      <span>связи: ${bondsText}; валентности ${report.allowedValences.join("/")}; χ=${formatNumber(report.element.electronegativity)}</span>
    `;
    atomReports.appendChild(row);
  });
}

export function renderIssues(analysis) {
  issueList.innerHTML = "";
  const issues = analysis.issues.slice(0, 8);
  const suggestions = buildStabilizationSuggestions(analysis);
  if (!issues.length && !suggestions.length) {
    issueList.innerHTML = `<div class="issue-row"><strong>Без предупреждений</strong><span>модель не видит перегрузки валентности</span></div>`;
    return;
  }
  [...issues, ...suggestions].slice(0, 10).forEach((issue) => {
    const row = document.createElement("div");
    row.className = `issue-row ${issue.kind}`;
    row.innerHTML = `<strong>${issue.title}</strong><span>${issue.text}</span>`;
    issueList.appendChild(row);
  });
}

export function buildStabilizationSuggestions(analysis) {
  const suggestions = [];
  const reports = [...analysis.atomMap.values()];
  const over = reports.find((report) => report.usage > Math.max(...report.allowedValences) + 0.05);
  const under = reports.find((report) => report.state === "warn" && !isHydrogenLike(report.atom.symbol));
  const charged = reports.find((report) => report.atom.charge !== 0);
  const doubleBond = labState.bonds.find((bond) => bond.order === 2 && bondHasSymbols(bond, "C", "C"));

  if (over) {
    suggestions.push({
      kind: "bad",
      title: `Стабилизировать ${over.atom.symbol}${over.atom.id}`,
      text: "Ослабьте или удалите одну связь: получится допустимая валентность и выше оценка устойчивости."
    });
  }
  if (under) {
    suggestions.push({
      kind: "warn",
      title: `Закрыть валентность ${under.atom.symbol}${under.atom.id}`,
      text: "Добавьте H или подходящий атом: получится насыщенный фрагмент без свободной валентности."
    });
  }
  if (charged) {
    suggestions.push({
      kind: "warn",
      title: `Нейтрализовать заряд ${charged.atom.symbol}${charged.atom.id}`,
      text: "Кнопками +/− сдвиньте заряд к 0: получится менее напряженная электронная форма."
    });
  }
  if (analysis.strainEnergy > 10) {
    suggestions.push({
      kind: "warn",
      title: "Снизить геометрическое напряжение",
      text: "Запустите ▶ или раздвиньте атомы: связи приблизятся к равновесной длине."
    });
  }
  if (doubleBond) {
    suggestions.push({
      kind: "ok",
      title: "Возможная реакция C=C",
      text: `${catalystAdvice()} Можно получить алкан, спирт или дигалогенид в зависимости от катализатора.`
    });
  }
  if (analysis.aromaticRings > 0) {
    suggestions.push({
      kind: "ok",
      title: "Ароматическое кольцо",
      text: "FeCl3 направит хлорирование: получится хлорированный арен с сохранением кольца."
    });
  }
  if (analysis.score >= 86 && labState.atoms.length) {
    suggestions.push({
      kind: "ok",
      title: "Соединение устойчиво",
      text: "Можно исследовать функционализацию: добавить OH, галоген, изотопную метку или катализатор."
    });
  }

  return suggestions;
}
