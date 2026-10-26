import { actinides, alkali, alkaline, atomicNumbers, halogens, lanthanides, metalloids, nobles, postMetals, transitionSymbols } from "../data/elements.js";
import { getElement } from "../simulation/graph.js";

export function inferCategory(symbol) {
  if (lanthanides.has(symbol)) return "lanthanide";
  if (actinides.has(symbol)) return "actinide";
  if (transitionSymbols.has(symbol)) return "transition";
  if (alkali.has(symbol)) return "alkali";
  if (alkaline.has(symbol)) return "alkaline";
  if (halogens.has(symbol)) return "halogen";
  if (nobles.has(symbol)) return "noble";
  if (metalloids.has(symbol)) return "metalloid";
  if (postMetals.has(symbol)) return "post";
  return "nonmetal";
}

export function inferValences(symbol, group, category) {
  if (category === "noble") return [0];
  if (category === "alkali") return [1];
  if (category === "alkaline") return [2];
  if (category === "halogen") return [1, 3, 5, 7];
  if (category === "transition") return [2, 3];
  if (category === "lanthanide" || category === "actinide") return [3];
  if (group === 13) return [3];
  if (group === 14) return [4];
  if (group === 15) return [3, 5];
  if (group === 16) return [2, 4, 6];
  return [1];
}

export function inferElectronegativity(group, category) {
  if (category === "noble") return null;
  if (category === "alkali") return 0.9;
  if (category === "alkaline") return 1.2;
  if (category === "halogen") return 3.0;
  if (category === "transition") return 1.8;
  if (group >= 13) return 1.6 + (group - 13) * 0.22;
  return 1.6;
}

export function inferRadius(group, period, category) {
  const base = category === "transition" ? 132 : category === "halogen" ? 110 : category === "noble" ? 100 : 118;
  return Math.max(45, base + period * 7 - group * 2);
}

export function elementBrief(element) {
  if (element.brief) return element.brief;
  if (element.symbol === "D") return "изотоп H: тяжелее, валентность 1";
  if (element.symbol === "T") return "изотоп H: радиоактивная учебная метка";
  if (element.symbol === "U") return "актинид: базово U-238, A− даёт U-235";
  if (element.symbol === "C") return "строит органический скелет и кольца";
  if (element.symbol === "O") return "даёт спирты, воду, оксиды и полярность";
  if (element.symbol === "N") return "часто создаёт основания, амины и заряды";
  if (element.symbol === "S") return "похожа на O, но крупнее и мягче";
  if (element.category === "halogen") return "галоген: обычно 1 связь, хороший заместитель";
  if (element.category === "noble") return "инертный газ: связи обычно нестабильны";
  if (element.category === "transition") return "металл: переменные степени окисления";
  if (element.category === "alkali") return "щелочной металл: легко отдаёт электрон";
  if (element.category === "alkaline") return "щелочноземельный металл: обычно валентность 2";
  return "можно настраивать валентность и изотопную массу";
}

export function elementProfile(element) {
  if (isRadioactiveElement(element.symbol)) return { kind: "radioactive", label: "радиоактивность", color: "#7d3cff" };
  const phase = elementPhase(element.symbol);
  if (phase === "gas") return { kind: "gas", label: "газ", color: "#2e9bff" };
  if (phase === "liquid") return { kind: "liquid", label: "жидкость", color: "#12a6a6" };
  if (isMetalElement(element)) return { kind: "metal", label: "металл", color: "#d18d00" };
  return { kind: "solid", label: "неметалл/твердое", color: "#6f7782" };
}

export function elementPhase(symbol) {
  if (["H", "N", "O", "F", "Cl", "He", "Ne", "Ar", "Kr", "Xe", "Rn"].includes(symbol)) return "gas";
  if (["Br", "Hg"].includes(symbol)) return "liquid";
  return "solid";
}

export function isMetalElement(element) {
  return ["alkali", "alkaline", "transition", "post", "lanthanide", "actinide"].includes(element.category);
}

export function isRadioactiveElement(symbol) {
  const z = atomicNumbers.get(symbol) || getElement(symbol).z || 0;
  return z >= 84 || ["Tc", "Pm", "U", "Th", "Pa", "Ra", "Rn"].includes(symbol);
}

export function elementStateDescription(element) {
  const profile = elementProfile(element);
  const phaseText = elementPhase(element.symbol) === "gas" ? "газ при обычных условиях" : elementPhase(element.symbol) === "liquid" ? "жидкость при обычных условиях" : "обычно твердое вещество";
  const metalText = isMetalElement(element) ? "металлический характер: проводимость, катионы, координационные связи" : "неметаллический/ковалентный характер: важны валентность и электроотрицательность";
  const radio = isRadioactiveElement(element.symbol) ? " Радиоактивность показана только как визуальная ионизация, без практических ядерных параметров." : "";
  return `${phaseText}; ${metalText}; эффект: ${profile.label}.${radio}`;
}

export function elementStudyUse(element) {
  if (isRadioactiveElement(element.symbol)) return "Учебный интерес: изотопы, радиоактивность, ионизация, материалы и безопасная концептуальная ядерная физика.";
  if (isMetalElement(element)) return "Учебный интерес: металлическая связь, ионы, оксиды, соли, координационные комплексы и катализ.";
  if (elementPhase(element.symbol) === "gas") return "Учебный интерес: газообразные молекулы, давление, растворимость, окисление и восстановление.";
  if (elementPhase(element.symbol) === "liquid") return "Учебный интерес: летучесть, поляризуемость, растворы и взаимодействия в жидкой фазе.";
  return "Учебный интерес: ковалентные связи, валентность, функциональные группы и молекулярная геометрия.";
}

export function elementStudyTips(element) {
  if (element.symbol === "U") return [
    "Нажмите U-демо для безопасной визуализации нейтронов и ионизации.",
    "Не используйте модель как инструкцию: массы, обогащение и реальные условия цепной реакции намеренно не показываются.",
    "Сравните U-238/U-235 через A± как идею изотопов, не как практический расчет."
  ];
  if (isRadioactiveElement(element.symbol)) return ["Смотрите на эффект ионизации как на концепт.", "Не переносите параметры учебной модели в реальные вещества."];
  if (isMetalElement(element)) return ["Попробуйте соединить с O, Cl или S.", "Проверьте заряд +1/+2/+3 и координационные связи.", "Сравните оксид и соль этого металла."];
  if (elementPhase(element.symbol) === "gas") return ["Попробуйте образование H2O, CO2 или HCl.", "Обратите внимание на давление/летучесть как физическое свойство."];
  if (elementPhase(element.symbol) === "liquid") return ["Проверьте взаимодействие с двойными связями или металлами.", "Следите за поляризуемостью и слабым взаимодействием."];
  return ["Соберите молекулу и следите за валентностью.", "Добавьте O/N/S/галоген для функциональных групп."];
}
