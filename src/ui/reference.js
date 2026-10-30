import { analyzeMolecule } from "../chemistry/analysis.js";
import { describeCompound } from "../chemistry/description.js";
import { elementStateDescription, elementStudyTips } from "../chemistry/elements.js";
import { findKnownSubstance } from "../chemistry/formula.js";
import { isotopeLabel } from "../chemistry/properties.js";
import { guideTopics } from "../data/catalogs.js";
import { bondHasSymbols, getAtom, getElement } from "../simulation/graph.js";
import { state as labState } from "../state.js";
import { referenceBody, referenceDialog, referenceModal, referenceTitle } from "./dom.js";
import { displayFormula, renderExternalCheck, renderForceFieldCheck, renderRdkitCheck } from "./inspector.js";
import { clamp, escapeHtml, formatNumber, signed, stabilityText } from "../utils/format.js";

export function openReferenceModal() {
  const analysis = labState.lastAnalysis || analyzeMolecule();
  referenceTitle.textContent = labState.compoundMeta?.commonName || displayFormula(analysis) || "Substance properties";
  referenceBody.innerHTML = buildReferenceGuide(analysis);
  referenceModal.hidden = false;
}

export function closeReferenceModal() {
  referenceModal.hidden = true;
}

export function startReferenceResize(event) {
  event.preventDefault();
  event.stopPropagation();
  const rect = referenceDialog.getBoundingClientRect();
  referenceDialog.style.position = "absolute";
  referenceDialog.style.left = `${rect.left}px`;
  referenceDialog.style.top = `${rect.top}px`;
  labState.referenceResizeState = {
    edge: event.currentTarget.dataset.resize,
    startX: event.clientX,
    startY: event.clientY,
    startWidth: rect.width,
    startHeight: rect.height,
    startLeft: rect.left,
    startTop: rect.top
  };
  referenceDialog.setPointerCapture?.(event.pointerId);
}

export function resizeReferenceDialog(event) {
  if (!labState.referenceResizeState) return;
  const dx = event.clientX - labState.referenceResizeState.startX;
  const dy = event.clientY - labState.referenceResizeState.startY;
  const edge = labState.referenceResizeState.edge;
  const minW = Math.min(420, window.innerWidth - 24);
  const minH = Math.min(340, window.innerHeight - 24);
  const maxW = Math.max(minW, window.innerWidth - 32);
  const maxH = Math.max(minH, window.innerHeight - 32);
  let width = labState.referenceResizeState.startWidth;
  let height = labState.referenceResizeState.startHeight;
  if (edge.includes("e")) width += dx;
  if (edge.includes("w")) width -= dx;
  if (edge.includes("s")) height += dy;
  if (edge.includes("n")) height -= dy;
  width = clamp(width, minW, maxW);
  height = clamp(height, minH, maxH);
  let left = labState.referenceResizeState.startLeft;
  let top = labState.referenceResizeState.startTop;
  if (edge.includes("w")) left += labState.referenceResizeState.startWidth - width;
  if (edge.includes("n")) top += labState.referenceResizeState.startHeight - height;
  left = clamp(left, 12, window.innerWidth - minW - 12);
  top = clamp(top, 12, window.innerHeight - minH - 12);
  referenceDialog.style.left = `${left}px`;
  referenceDialog.style.top = `${top}px`;
  referenceDialog.style.width = `${Math.min(width, window.innerWidth - left - 12)}px`;
  referenceDialog.style.height = `${Math.min(height, window.innerHeight - top - 12)}px`;
  referenceDialog.dataset.resizedAt = String(Date.now());
}

export function stopReferenceResize() {
  labState.referenceResizeState = null;
}

export function buildReferenceGuide(analysis) {
  const preview = previewExampleGuide(analysis);
  if (preview) return preview;
  const info = describeCompound(analysis);
  const substance = labState.compoundMeta?.commonName ? labState.compoundMeta : findKnownSubstance(displayFormula(analysis));
  const selectedAtom = labState.selectedAtomIds.length === 1 ? getAtom(labState.selectedAtomIds[0]) : null;
  const selectedElement = selectedAtom ? getElement(selectedAtom.symbol) : null;
  const reactions = relevantReactionCards(analysis);
  const properties = compoundPropertyList(analysis, substance);
  const quests = experimentQuestList(analysis, substance);
  const topics = guideTopicCards(analysis);
  const rdkitBlock = renderRdkitCheck(labState.compoundMeta?.rdkit);
  const externalBlock = renderExternalCheck(labState.compoundMeta?.external);
  const forceFieldBlock = renderForceFieldCheck(analysis);
  const roleBlock = renderRoleMap();
  const atomBlock = selectedElement ? `
    <section>
      <h3>Активный элемент</h3>
      <p><strong>${escapeHtml(selectedElement.name)} (${escapeHtml(selectedElement.symbol)})</strong>: ${escapeHtml(elementStateDescription(selectedElement))}</p>
      <ul>${elementStudyTips(selectedElement).map((tip) => `<li>${escapeHtml(tip)}</li>`).join("")}</ul>
    </section>
  ` : "";
  return `
    <section>
      <h3>Что получилось</h3>
      <p>${escapeHtml(info.summary)}</p>
      <div class="reference-tags">
        <span>${escapeHtml(info.kind)}</span>
        <span>формула ${escapeHtml(displayFormula(analysis) || analysis.formula || "нет")}</span>
        <span>масса ${escapeHtml(formatNumber(analysis.mass))} г/моль</span>
        <span>заряд ${escapeHtml(signed(analysis.totalCharge, true))}</span>
      </div>
    </section>
    <section>
      <h3>Свойства и качества</h3>
      <ul>${properties.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </section>
    <section>
      <h3>Наша оценка и RDKit</h3>
      <div class="reference-split">
        <article>
          <strong>Учебная модель</strong>
          <p>Стабильность ${escapeHtml(stabilityText(analysis.score))} ${analysis.score}%. Масса ${escapeHtml(formatNumber(analysis.mass))} г/моль. Ароматических колец: ${analysis.aromaticRings}.</p>
        </article>
        ${rdkitBlock}
      </div>
    </section>
    <section>
      <h3>Внешние данные и силовой шлюз</h3>
      <div class="reference-split">
        ${externalBlock}
        ${forceFieldBlock}
      </div>
    </section>
    ${roleBlock}
    <section>
      <h3>Практический интерес</h3>
      <ul>${compoundUseList(analysis, substance).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </section>
    <section>
      <h3>Игровые задания</h3>
      <ul>${quests.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </section>
    <section>
      <h3>Интересная химия</h3>
      <div class="reference-cards">${topics.map(renderGuideTopicCard).join("")}</div>
    </section>
    <section>
      <h3>Идеи реакций</h3>
      <div class="reference-cards">${reactions.map(renderReferenceReactionCard).join("")}</div>
    </section>
    ${atomBlock}
    <section class="safety-note">
      <h3>Безопасная граница</h3>
      <p>Это учебная модель. Она помогает понимать связи, валентности, устойчивость и классы веществ, но не заменяет SDS, лабораторный протокол, расчетный пакет или консультацию специалиста.</p>
    </section>
  `;
}

function previewExampleGuide(analysis) {
  const formula = displayFormula(analysis);
  const name = labState.compoundMeta?.commonName;
  const counts = analysis.counts;
  const water = name === "water" && formula === "H2O" && counts.H === 2 && counts.O === 1 && Object.keys(counts).length === 2;
  const carbonDioxide = name === "carbon dioxide" && formula === "CO2" && counts.C === 1 && counts.O === 2 && Object.keys(counts).length === 2;
  if (!water && !carbonDioxide) return "";
  const observation = water
    ? "The canvas draws one explicit oxygen atom; two hydrogens are implicit in this supported SMILES model. The H2O formula includes all three atoms."
    : "The canvas draws one carbon and two oxygen atoms with two modeled C=O double bonds. The local catalog maps CO2 to O=C=O; a formula alone does not identify a unique structure in general.";
  const exercise = water
    ? "Select oxygen in the periodic table, enter H2O, then compare the explicit canvas atoms with the formula and inspector."
    : "Enter CO2, then inspect the three explicit atoms, two modeled bonds and the formula shown in the inspector.";
  return `
    <section>
      <h3>What this model shows</h3>
      <p>${escapeHtml(observation)}</p>
      <div class="reference-tags">
        <span>formula ${escapeHtml(formula)}</span>
        <span>model mass ${escapeHtml(formatNumber(analysis.mass))} g/mol</span>
        <span>formal charge ${escapeHtml(signed(analysis.totalCharge, true))}</span>
      </div>
    </section>
    <section>
      <h3>Teaching prompt</h3>
      <p>${escapeHtml(exercise)}</p>
    </section>
    <section class="safety-note">
      <h3>Scope and safety</h3>
      <p>Exploratory teaching prototype. It is not scientifically validated and not approved for student use. It does not predict reactions or provide laboratory or clinical guidance. Other reaction, isotope, coordination and biomolecular features remain outside this preview and require review.</p>
    </section>
    <section>
      <h3>Model checks</h3>
      <p>The ${analysis.score}% score is a rule-based heuristic, not measured chemical stability. The 2D layout and displayed strain are schematic estimates, not validated physical energy.</p>
      <div class="reference-split">
        ${renderForceFieldCheck(analysis)}
        ${renderRdkitCheck(labState.compoundMeta?.rdkit)}
      </div>
    </section>
  `;
}

export function renderReferenceReactionCard(reaction) {
  return `
    <article>
      <strong>${escapeHtml(reaction.name)}</strong>
      <span>${escapeHtml(reaction.equation || "")}</span>
      <p>${escapeHtml([reaction.energy, reaction.temperature, reaction.medium].filter(Boolean).join("; "))}</p>
    </article>
  `;
}

export function renderRoleMap() {
  const roles = moleculeRoleSummary();
  if (!roles.length) return "";
  return `
    <section>
      <h3>Роли в конструкции</h3>
      <div class="reference-cards role-cards">
        ${roles.map((role) => `
          <article>
            <strong>${escapeHtml(role.title)}</strong>
            <span>${escapeHtml(role.count)}</span>
            <p>${escapeHtml(role.text)}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

export function moleculeRoleSummary() {
  const roles = [];
  const targetAtoms = labState.atoms.filter((atom) => atom.role === "target");
  const linkerAtoms = labState.atoms.filter((atom) => atom.role === "linker");
  const chelatorAtoms = labState.atoms.filter((atom) => atom.chelatorId);
  const payloadAtoms = labState.atoms.filter((atom) => atom.radioisotope || atom.chelatedBy);
  if (targetAtoms.length) roles.push({ title: "Target / мишень", count: `${targetAtoms.length} узл.`, text: "Биологический блок, который в реальных радиолигандах узнаёт рецептор или антиген." });
  if (linkerAtoms.length) roles.push({ title: "Linker / линкер", count: `${linkerAtoms.length} узл.`, text: "Мостик между мишенью и хелатором; в песочнице показывает расстояние и развязку блоков." });
  if (chelatorAtoms.length) roles.push({ title: "Chelator / хелатор", count: `${chelatorAtoms.length} атомов`, text: "N/O-донорная клетка для удержания металлического иона координационными связями." });
  if (payloadAtoms.length) roles.push({ title: "Payload / радиометка", count: payloadAtoms.map((atom) => atom.radioisotope || isotopeLabel(atom)).join(", "), text: "Изотопная метка или металл; это визуальная учебная роль без доз и протоколов." });
  return roles;
}

export function guideTopicCards(analysis) {
  return guideTopics.filter((topic) => topic.match(analysis)).slice(0, 4);
}

export function renderGuideTopicCard(topic) {
  return `
    <article>
      <strong>${escapeHtml(topic.title)}</strong>
      <p>${escapeHtml(topic.text)}</p>
      <span>${escapeHtml(topic.challenge)}</span>
    </article>
  `;
}

export function compoundPropertyList(analysis, substance) {
  const items = [];
  if (substance?.className) items.push(`Класс: ${substance.className}.`);
  if (labState.atoms.some((atom) => atom.chelatorId)) items.push("Есть хелаторная область: N/O-доноры могут удерживать металл координационными связями.");
  if (labState.atoms.some((atom) => atom.radioisotope)) items.push("Есть радионуклидная метка: изотоп показан визуально и влияет на массу, но не задаёт медицинские параметры.");
  if (analysis.aromaticRings > 0) items.push("Есть ароматичность: кольцо стабилизировано делокализацией электронов.");
  if (analysis.totalCharge !== 0) items.push("Есть общий заряд: важны растворитель, противоионы и сольватация.");
  if (analysis.strainEnergy > 8) items.push("Есть геометрическое напряжение: стоит запустить релаксацию или ослабить перегруженные связи.");
  if (analysis.score >= 86) items.push("Учебная устойчивость высокая: валентности в основном согласованы.");
  else if (analysis.score >= 50) items.push("Модель напряженная: проверьте свободные валентности, заряды и длины связей.");
  else items.push("Модель нестабильная: сначала уберите лишние связи и нейтрализуйте заряды.");
  if (!items.length) items.push("Добавьте атомы или введите формулу/SMILES, чтобы получить свойства.");
  return items;
}

export function compoundUseList(analysis, substance) {
  const uses = substance?.uses?.length ? [...substance.uses] : [];
  const counts = analysis.counts;
  if ((counts.C || 0) > 0) uses.push("Органическая химия: удобно проверять функциональные группы и реакционность.");
  if ((counts.Na || 0) && (counts.Cl || 0)) uses.push("Растворы и электролиты: хороший пример ионной диссоциации.");
  if ((counts.Fe || 0) || (counts.Cu || 0)) uses.push("Материалы и биомодели: можно сравнивать роли переходных металлов.");
  if ((counts.U || 0)) uses.push("Физика ядра: только концептуальная демонстрация изотопов и радиоактивности.");
  if (labState.atoms.some((atom) => atom.chelatorId || atom.radioisotope)) uses.push("Радиофарммодель: можно разделить роли «радионуклид», «хелатор», «линкер» и «биологическая мишень».");
  return [...new Set(uses)].slice(0, 6);
}

export function experimentQuestList(analysis, substance) {
  const counts = analysis.counts;
  const quests = [];
  if ((counts.Na || 0) && (counts.Cl || 0)) {
    quests.push("Добавьте H2O и нажмите «⇄ Соединить»: проверьте, появятся ли Na+ и Cl− с сольватацией.");
    quests.push("Поменяйте заряд Na/Cl и посмотрите, как падает учебная устойчивость.");
  }
  if (analysis.aromaticRings > 0) {
    quests.push("Попробуйте хлорирование бензольного кольца с FeCl3: увидите замещение H на Cl.");
    quests.push("Переключите ароматические связи и сравните стабильность кольца.");
  }
  if (labState.bonds.some((bond) => bond.order === 2 && bondHasSymbols(bond, "C", "C"))) {
    quests.push("Запустите H2 + C=C, Br2 + C=C и H2O + C=C: сравните, как меняется функциональная группа.");
  }
  if ((counts.Fe || 0) || (counts.Cu || 0)) {
    quests.push("Сравните Fe и Cu в одной формуле через кнопку Fe↔Cu: металл меняет массу, валентность и возможные комплексы.");
  }
  if (["glucose", "sucrose", "starch", "cellulose"].includes(substance?.structure)) {
    quests.push("Нажмите «⛓ Схема»: сахар разложится в кольцо или цепочку повторов, чтобы были видны OH-группы и гликозидные связи.");
    quests.push("Замените один H на D или измените заряд O: посмотрите, как меняются масса, устойчивость и подсказки.");
  }
  if (labState.atoms.some((atom) => atom.chelatorId)) {
    quests.push("Добавьте Lu-177 или Y-90: металл окажется в центре DOTA/DTPA и появятся пунктирные координационные связи.");
    quests.push("Сравните DOTA, DTPA и Macropa: у них разные донорные атомы и разный «размер клетки» для металла.");
  }
  if (labState.atoms.some((atom) => atom.radioisotope)) {
    quests.push("Откройте справочник и найдите роли: радионуклид, хелатор, линкер, мишень. Это безопасная схема, не рецепт.");
  }
  if ((counts.U || 0)) {
    quests.push("Нажмите U-демо: это безопасная концептуальная визуализация нейтронов и ионизации без практических ядерных параметров.");
  }
  if (substance?.commonName) {
    quests.push(`Найдите альтернативный путь: введите ${substance.commonName} как название, формулу и SMILES, затем сравните справку.`);
  }
  quests.push("Сделайте намеренно нестабильную структуру, а потом стабилизируйте ее: уберите лишние связи, добавьте H или измените заряд.");
  return [...new Set(quests)].slice(0, 7);
}

export function relevantReactionCards(analysis) {
  const counts = analysis.counts;
  const cards = [];
  const hasDoubleCC = labState.bonds.some((bond) => bond.order === 2 && bondHasSymbols(bond, "C", "C"));
  const hasBenzene = analysis.aromaticRings > 0;
  if ((counts.Na || 0) && (counts.Cl || 0)) cards.push(findReactionRecord("nacl_hydration"));
  if (hasDoubleCC) cards.push(findReactionRecord("alkene_hydrogenation"), findReactionRecord("alkene_bromination"));
  if (hasBenzene) cards.push(findReactionRecord("benzene_chlorination"));
  if ((counts.C || 0) >= 6 && (counts.O || 0) >= 5 && (counts.H || 0) >= 10) cards.push({
    name: "Углеводная химия",
    equation: "сахарное кольцо ⇄ открытая форма; дисахарид + H2O ⇄ моносахариды",
    energy: "учебно: зависит от среды и фермента/кислоты",
    temperature: "мягкие биохимические условия или нагрев в кислотной среде",
    medium: "вода, ферменты или кислота в справочном режиме"
  });
  if (labState.atoms.some((atom) => atom.chelatorId || atom.radioisotope)) cards.push({
    name: "Радиолигандная конструкция",
    equation: "мишень—линкер—хелатор⊂радиометалл",
    energy: "учебно: важна термодинамическая и кинетическая устойчивость комплекса",
    temperature: "без практических параметров",
    medium: "безопасная концептуальная модель"
  });
  if ((counts.U || 0)) cards.push({
    name: "U-демо: нейтронная концепция",
    equation: "U + n -> возбужденное ядро -> энергия + нейтроны",
    energy: "только качественная визуализация",
    temperature: "без практических параметров",
    medium: "безопасная учебная схема"
  });
  return cards.filter(Boolean).slice(0, 5);
}

export function findReactionRecord(id) {
  return labState.reactionDatabase.find((item) => item.id === id) || {
    nacl_hydration: { name: "Растворение NaCl", equation: "NaCl + H2O -> Na+(aq) + Cl-(aq)", energy: "ΔHраств ≈ +3.9 кДж/моль", temperature: "20-25 °C", medium: "вода" },
    alkene_hydrogenation: { name: "Гидрирование алкена", equation: "C=C + H2 -> C-C", energy: "обычно экзотермично", temperature: "зависит от катализатора", medium: "Ni/Pd/Pt" },
    alkene_bromination: { name: "Бромирование алкена", equation: "C=C + Br2 -> Br-C-C-Br", energy: "электрофильное присоединение", temperature: "20-25 °C", medium: "учебный режим" },
    benzene_chlorination: { name: "Хлорирование бензола", equation: "C6H6 + Cl2 -> C6H5Cl + HCl", energy: "требуется активация", temperature: "умеренная", medium: "FeCl3/AlCl3" }
  }[id];
}
