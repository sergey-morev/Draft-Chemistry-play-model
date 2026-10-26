import { normalizeFormulaInput } from "../chemistry/formula.js";
import { addHeavyWaterProcess, brominateDoubleBond, chlorinateBenzene, combustionPreview, enrichHydrogenIsotope, hydrateAlkene, hydrogenateDoubleBond, resetHydrogenIsotopes } from "../chemistry/reactions.js";
import { tuneSelectedAtoms } from "../simulation/molecule.js";
import { state as labState } from "../state.js";

export const reactions = [
  { id: "hydrogenation", label: "H2 + C=C", run: hydrogenateDoubleBond },
  { id: "bromination", label: "Br2 + C=C", run: brominateDoubleBond },
  { id: "chlorinateBenzene", label: "Cl2 + ⏣", run: chlorinateBenzene },
  { id: "combustion", label: "O2 горение", run: combustionPreview },
  { id: "hydrateAlkene", label: "H2O + C=C", run: hydrateAlkene }
];

export const isotopeProcesses = [
  { id: "heavyWater", label: "D2O", run: addHeavyWaterProcess },
  { id: "deuteriumEnrich", label: "D↑", run: () => enrichHydrogenIsotope("D", 0.65) },
  { id: "tritiumLabel", label: "T*", run: () => enrichHydrogenIsotope("T", 0.35) },
  { id: "genericMassDown", label: "A-", run: () => tuneSelectedAtoms("isotope", -1) },
  { id: "genericMassUp", label: "A+", run: () => tuneSelectedAtoms("isotope", 1) },
  { id: "genericEnrichDown", label: "%-", run: () => tuneSelectedAtoms("enrichment", -0.25) },
  { id: "genericEnrichUp", label: "%+", run: () => tuneSelectedAtoms("enrichment", 0.25) },
  { id: "hydrogenReset", label: "H↺", run: resetHydrogenIsotopes }
];

export const radioisotopePresets = [
  { id: "lu177", label: "177Lu", symbol: "Lu", massNumber: 177, charge: 3, valence: 8, kind: "β− металл", bestChelator: "DOTA", note: "Lu-177 часто моделируют с DOTA-подобными хелаторами: металл удерживается координационными связями." },
  { id: "y90", label: "90Y", symbol: "Y", massNumber: 90, charge: 3, valence: 8, kind: "β− металл", bestChelator: "DOTA/DTPA", note: "Y-90 — учебный пример β-излучающего металла для радиолигандов." },
  { id: "cu67", label: "67Cu", symbol: "Cu", massNumber: 67, charge: 2, valence: 4, kind: "β− металл", bestChelator: "TETA/DOTA", note: "Cu-67 показывает, что разные металлы предпочитают разную геометрию хелатора." },
  { id: "ac225", label: "225Ac", symbol: "Ac", massNumber: 225, charge: 3, valence: 9, kind: "α металл", bestChelator: "DOTA/Macropa", note: "Ac-225 удобно показывать как крупный α-излучающий актинид в большой клетке-хелаторе." },
  { id: "ra223", label: "223Ra", symbol: "Ra", massNumber: 223, charge: 2, valence: 8, kind: "α металл", bestChelator: "Macropa", note: "Ra-223 крупный щёлочноземельный металл; модель подчёркивает размер и слабую ковалентность." },
  { id: "sm153", label: "153Sm", symbol: "Sm", massNumber: 153, charge: 3, valence: 8, kind: "β− металл", bestChelator: "DTPA/DOTA", note: "Sm-153 — пример лантанидного радиометалла." },
  { id: "sr89", label: "89Sr", symbol: "Sr", massNumber: 89, charge: 2, valence: 4, kind: "β− металл", bestChelator: "костная мишень", note: "Sr-89 в учебной модели похож на Ca/Sr и показывает идею костного накопления." },
  { id: "i131", label: "131I", symbol: "I", massNumber: 131, charge: 0, valence: 1, kind: "β−/γ неметалл", bestChelator: "ковалентная метка", note: "I-131 обычно показывается как ковалентная метка, а не металл в клетке." },
  { id: "at211", label: "211At", symbol: "At", massNumber: 211, charge: 0, valence: 1, kind: "α неметалл", bestChelator: "ковалентная метка", note: "At-211 — тяжёлый галоген; в песочнице это безопасная неметаллическая метка." },
  { id: "f18", label: "18F", symbol: "F", massNumber: 18, charge: 0, valence: 1, kind: "β+ неметалл", bestChelator: "ковалентная метка", note: "F-18 удобно показывать на примере фтордезоксиглюкозы: атом F заменяет OH-группу." }
];

export const catalysts = [
  { id: "none", label: "нет", hint: "без катализатора: реакции идут вручную" },
  { id: "ni", label: "Ni", hint: "гидрирование C=C водородом" },
  { id: "pd", label: "Pd", hint: "мягкое гидрирование C=C" },
  { id: "pt", label: "Pt", hint: "быстрое гидрирование C=C" },
  { id: "acid", label: "H+", hint: "кислотная гидратация алкенов" },
  { id: "fecl3", label: "FeCl3", hint: "хлорирование ароматического кольца" },
  { id: "brhv", label: "Br2/hν", hint: "бромирование двойных связей" }
];

export const knownSubstances = [
  { names: ["поваренная соль", "кухонная соль", "соль", "хлорид натрия"], formula: "NaCl", smiles: "[Na+].[Cl-]", commonName: "поваренная соль", className: "ионная соль", note: "NaCl: пищевая соль, электролит, растворяется в воде с гидратацией ионов." },
  { names: ["серная кислота", "sulfuric acid"], formula: "H2SO4", smiles: "OS(=O)(=O)O", commonName: "серная кислота", className: "минеральная кислота", note: "H2SO4: сильная кислота и дегидратирующий реагент; в реальности требует осторожности." },
  { names: ["соляная кислота", "хлороводородная кислота"], formula: "HCl", smiles: "Cl", commonName: "соляная кислота", className: "минеральная кислота", note: "В воде это H3O+ и Cl-, а не отдельная ковалентная молекула HCl." },
  { names: ["вода", "water"], formula: "H2O", smiles: "O", commonName: "вода", className: "растворитель", note: "H2O: полярный растворитель, образует водородные связи." },
  { names: ["тяжелая вода", "тяжёлая вода"], formula: "D2O", smiles: "O", commonName: "тяжелая вода", className: "изотопная вода", note: "D2O содержит дейтерий вместо обычного водорода." },
  { names: ["углекислый газ", "диоксид углерода", "carbon dioxide"], formula: "CO2", smiles: "O=C=O", commonName: "углекислый газ", className: "оксид", note: "CO2: линейный оксид углерода, продукт дыхания и горения." },
  { names: ["оксид железа", "оксид железа 3", "оксид железа iii", "ржавчина"], formula: "Fe2O3", smiles: null, commonName: "оксид железа(III)", className: "оксид металла", note: "Fe2O3: модель ржавчины и железной руды; связь в твердом веществе ионно-ковалентная." },
  { names: ["оксид железа 2", "оксид железа ii"], formula: "FeO", smiles: null, commonName: "оксид железа(II)", className: "оксид металла", note: "FeO: оксид железа со степенью окисления +2." },
  { names: ["этанол", "спирт", "ethyl alcohol"], formula: "C2H6O", smiles: "CCO", commonName: "этанол", className: "спирт", note: "Этанол содержит гидроксильную группу O-H." },
  { names: ["бензол", "benzene"], formula: "C6H6", smiles: "c1ccccc1", commonName: "бензол", className: "ароматическое", note: "Бензол стабилизирован ароматической делокализацией." },
  { names: ["дофамин"], formula: "C8H11NO2", smiles: "NCCc1ccc(O)c(O)c1", commonName: "дофамин", className: "нейромедиатор", note: "Дофамин: катехоламин, важен для нервной системы." },
  { names: ["серотонин"], formula: "C10H12N2O", smiles: "NCCc1c[nH]c2ccc(O)cc12", commonName: "серотонин", className: "нейромедиатор", note: "Серотонин: биогенный амин, связан с регуляцией настроения и сна." }
];

export const guideTopics = [
  {
    id: "radiopharma",
    title: "Радиолиганд и хелатор",
    match: () => labState.atoms.some((atom) => atom.chelatorId || atom.radioisotope),
    text: "В радиофарммодели есть три роли: радионуклид даёт сигнал или терапевтическое излучение, хелатор удерживает металлический ион, а биологический носитель отвечает за узнавание мишени.",
    challenge: "Поставьте DOTA, нажмите Lu-177 и сравните с 18F-FDG: металл сидит в координационной клетке, а F-18 ведёт себя как ковалентная метка."
  },
  {
    id: "electrolytes",
    title: "Растворы и электролиты",
    match: (analysis) => (analysis.counts.Na || 0) || (analysis.counts.Cl || 0) || analysis.totalCharge !== 0,
    text: "Ионные вещества в воде часто не становятся новой ковалентной молекулой: вода разделяет заряды, ориентирует диполи и образует гидратные оболочки.",
    challenge: "Соберите NaCl и H2O, затем нажмите «⇄ Соединить»: ищите Na+···O и Cl−···H."
  },
  {
    id: "aromaticity",
    title: "Ароматичность",
    match: (analysis) => analysis.aromaticRings > 0,
    text: "Ароматическое кольцо стабилизируется делокализацией электронов. Поэтому бензол ведет себя иначе, чем обычный циклогексен.",
    challenge: "Переключите бензольные связи и сравните устойчивость, затем попробуйте хлорирование с FeCl3."
  },
  {
    id: "functional-groups",
    title: "Функциональные группы",
    match: (analysis) => (analysis.counts.C || 0) > 0,
    text: "O, N, S, галогены и кратные связи превращают углеродный скелет в спирты, амины, кислоты, галогенпроизводные и реакционные центры.",
    challenge: "Возьмите C=C и примените H2, Br2 и H2O: это три разных сценария присоединения."
  },
  {
    id: "metals",
    title: "Металлы и координация",
    match: (analysis) => ["Fe", "Cu", "Zn", "Mg", "Na", "K", "Ca", "U"].some((symbol) => analysis.counts[symbol]),
    text: "Металлы часто работают как катионы, центры координации, катализаторы или части оксидов и солей. Их роль сильно зависит от заряда и лигандов.",
    challenge: "Сравните Fe и Cu в одной модели: поменяйте металл, заряд и посмотрите, как меняется подсказка."
  },
  {
    id: "isotopes",
    title: "Изотопы и метки",
    match: (analysis) => (analysis.counts.D || 0) || (analysis.counts.T || 0) || labState.atoms.some((atom) => atom.isotopeShift),
    text: "Изотоп меняет массу ядра, но в простой химической модели часто сохраняет похожую валентность. Поэтому D похож на H, но молекула становится тяжелее.",
    challenge: "Сравните H2O и D2O, затем измените A± у любого элемента и посмотрите массу."
  },
  {
    id: "stability",
    title: "Охота за стабильностью",
    match: () => true,
    text: "Стабильность в этой лаборатории складывается из валентности, зарядов, геометрического напряжения, ароматичности и слишком странных связей.",
    challenge: "Создайте нестабильный атом с лишними связями, а потом стабилизируйте его: уберите связь, добавьте H или измените заряд."
  }
];

export const knownFormulaSmiles = new Map(knownSubstances.filter((item) => item.smiles).map((item) => [normalizeFormulaInput(item.formula).toUpperCase(), item.smiles]));
