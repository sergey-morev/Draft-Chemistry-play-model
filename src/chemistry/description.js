import { isHydrogenLike, isotopeLabel } from "./properties.js";
import { bondHasSymbols, getAtom } from "../simulation/graph.js";
import { state as labState } from "../state.js";
import { catalystLabel } from "../ui/controls.js";
import { buildStabilizationSuggestions, displayFormula } from "../ui/inspector.js";
import { formatCompactCount, signed, stabilityText } from "../utils/format.js";

export function describeCompound(analysis) {
  const counts = analysis.counts;
  const formula = displayFormula(analysis) || "пустая модель";
  const c = counts.C || 0;
  const h = counts.H || 0;
  const d = counts.D || 0;
  const t = counts.T || 0;
  const o = counts.O || 0;
  const halogensCount = ["F", "Cl", "Br", "I"].reduce((sum, key) => sum + (counts[key] || 0), 0);
  const hasDoubleCC = labState.bonds.some((bond) => bond.order === 2 && bondHasSymbols(bond, "C", "C"));
  const hasTripleCC = labState.bonds.some((bond) => bond.order === 3 && bondHasSymbols(bond, "C", "C"));
  const hasChelator = labState.atoms.some((atom) => atom.chelatorId);
  const chelatedMetals = labState.atoms.filter((atom) => atom.chelatedBy);
  const hasOH = labState.bonds.some((bond) => {
    const a = getAtom(bond.a);
    const b = getAtom(bond.b);
    return bond.order === 1 && ((a?.symbol === "O" && isHydrogenLike(b?.symbol)) || (b?.symbol === "O" && isHydrogenLike(a?.symbol)));
  });
  const isotopeTotal = d + t;
  const isotopeLabels = labState.atoms
    .filter((atom) => (atom.isotopeShift || 0) !== 0)
    .slice(0, 3)
    .map((atom) => `${isotopeLabel(atom)} ${Math.round((atom.enrichment || 0) * 100)}%`);
  const tags = [`формула ${formula}`, `${stabilityText(analysis.score)} ${analysis.score}%`, `кат. ${catalystLabel()}`];
  const tips = [];
  let kind = "неорганическое";
  let summary = "Короткая справка появится после добавления атомов.";

  if (!labState.atoms.length) {
    return { title: "Нет соединения", kind: "пусто", summary, tags: ["добавьте атом"], tips: ["Выберите элемент слева и поставьте его на поле."] };
  }

  if (labState.compoundMeta?.commonName) {
    kind = labState.compoundMeta.className || (labState.compoundMeta.condensed ? "биомакро" : "известное вещество");
    summary = `${labState.compoundMeta.commonName}: ${labState.compoundMeta.note || "вещество из локального словаря лаборатории."}`;
    tips.push("Можно вводить это вещество по русскому названию, формуле или SMILES.");
  } else if (hasChelator) {
    kind = chelatedMetals.length ? "радиометалл-хелат" : "хелатор";
    summary = chelatedMetals.length
      ? `Металл ${chelatedMetals.map((atom) => atom.radioisotope || isotopeLabel(atom)).join(", ")} удерживается N/O-донорами хелатора.`
      : "Хелаторная клетка готова: добавьте Lu-177, Y-90, Cu-67, Ac-225 или другой радиометалл.";
    tips.push("Нажмите M⊂Хелат, чтобы поместить выбранный металл внутрь координационной клетки.");
  } else if (labState.compoundMeta?.bioName && labState.compoundMeta.bioName !== "пользовательская формула") {
    kind = labState.compoundMeta.condensed ? "биомакро" : "биоорганика";
    summary = `${labState.compoundMeta.bioName}: ${labState.compoundMeta.condensed ? "показана компактная карта состава, атомов слишком много для полного рисунка." : "малая биоорганическая молекула построена как схема связей."}`;
    tips.push("Меняйте формулу сверху или используйте Fe↔Cu для металл-содержащих вариантов.");
  } else if (o === 1 && c === 0 && h === 0 && d === 2 && t === 0) {
    kind = "тяжелая вода";
    summary = "D2O похожа на воду по валентности, но тяжелее из-за дейтерия.";
    tips.push("Нажмите H↺, чтобы сравнить с обычной водой.");
  } else if (o === 1 && c === 0 && t > 0) {
    kind = "тритированная вода";
    summary = "Изотопная вода с T показывает, где находится водородная метка.";
    tips.push("T в реальности радиоактивен; здесь это только учебная метка.");
  } else if (analysis.aromaticRings > 0) {
    kind = halogensCount ? "галогенарен" : "ароматическое";
    summary = halogensCount ? "Ароматическое кольцо с галогенным заместителем: полезный промежуточный фрагмент." : "Ароматическое кольцо стабилизировано делокализацией электронов.";
    tips.push("Добавляйте заместители к свободным C-H и следите за валентностью C.");
  } else if (c > 0 && hasTripleCC) {
    kind = "алкин";
    summary = "Есть тройная C≡C связь: фрагмент реакционно активен и линейнее по геометрии.";
    tips.push("Можно гидрировать тройную связь пошагово, уменьшив порядок связи.");
  } else if (c > 0 && hasDoubleCC) {
    kind = "алкен";
    summary = "Есть двойная C=C связь: доступны гидрирование, бромирование и гидратация.";
    tips.push("Попробуйте H2 + C=C, Br2 + C=C или H2O + C=C.");
  } else if (c > 0 && hasOH) {
    kind = "спирт/фенольный фрагмент";
    summary = "Связь O-H повышает полярность и способность к водородным связям.";
    tips.push("Замените H в O-H на D для изотопной метки.");
  } else if (c > 0) {
    kind = "органическое";
    summary = "Углеродный скелет с насыщенными связями: хорошая база для функциональных групп.";
    tips.push("Добавьте O, N, галоген или C=C, чтобы получить более реакционный фрагмент.");
  } else {
    summary = "Соединение без углеродного скелета; устойчивость зависит от валентностей и зарядов.";
    tips.push("Проверьте, чтобы H/D/T имели только одну связь.");
  }

  if (isotopeTotal > 0) {
    tags.push(`изотопы D/T: ${isotopeTotal}`);
    tips.push("D/T меняют массу, но в этой модели сохраняют валентность H.");
  }
  if (isotopeLabels.length > 0) {
    tags.push(...isotopeLabels);
    tips.push("A± меняет массовое число изотопа, V± меняет целевую валентность.");
  }
  if (hasChelator) {
    tags.push(chelatedMetals.length ? "металл в хелаторе" : "пустой хелатор");
    tips.push("Хелатор показывает удержание металла, а не реальную инструкцию по синтезу или применению.");
  }
  if (analysis.strainEnergy > 10) {
    tags.push("напряжение");
    tips.push("Запустите релаксацию ▶ или увеличьте расстояния между атомами.");
  }
  if (analysis.totalCharge !== 0) {
    tags.push(`заряд ${signed(analysis.totalCharge, true)}`);
    tips.push("Снизьте заряд выбранного атома кнопками +/−.");
  }
  if (labState.compoundMeta?.condensed) {
    tags.push(`атомов ${formatCompactCount(labState.compoundMeta.totalAtoms)}`);
    tips.push("Кружки с ×N означают группы атомов этого элемента в большой формуле.");
  }
  const stabilization = buildStabilizationSuggestions(analysis)[0];
  if (stabilization) tips.push(`${stabilization.title}: ${stabilization.text}`);

  return {
    title: labState.compoundMeta?.commonName || formula,
    kind,
    summary,
    tags,
    tips: [...new Set(tips)].slice(0, 4)
  };
}
