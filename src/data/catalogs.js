import { normalizeFormulaInput } from "../chemistry/formula.js";
import { addHeavyWaterProcess, brominateDoubleBond, chlorinateBenzene, combustionPreview, enrichHydrogenIsotope, hydrateAlkene, hydrogenateDoubleBond, resetHydrogenIsotopes } from "../chemistry/reactions.js";
import { tuneSelectedAtoms } from "../simulation/molecule.js";
import { state as labState } from "../state.js";

export const reactions = [
  { id: "hydrogenation", label: "H2 + C=C", run: hydrogenateDoubleBond },
  { id: "bromination", label: "Br2 + C=C", run: brominateDoubleBond },
  { id: "chlorinateBenzene", label: "Cl2 + ⏣", run: chlorinateBenzene },
  { id: "combustion", label: "O2 combustion", run: combustionPreview },
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
  { id: "lu177", label: "177Lu", symbol: "Lu", massNumber: 177, charge: 3, valence: 8, kind: "β− metal", bestChelator: "DOTA", note: "Lu-177 is illustrated with a DOTA-like chelator and modeled coordination bonds; complex stability is not assessed." },
  { id: "y90", label: "90Y", symbol: "Y", massNumber: 90, charge: 3, valence: 8, kind: "β− metal", bestChelator: "DOTA/DTPA", note: "Y-90 is a teaching example of a β-emitting metal in a radioligand sketch." },
  { id: "cu67", label: "67Cu", symbol: "Cu", massNumber: 67, charge: 2, valence: 4, kind: "β− metal", bestChelator: "TETA/DOTA", note: "Cu-67 illustrates how different metals can favor different chelator geometries; this model does not validate a complex." },
  { id: "ac225", label: "225Ac", symbol: "Ac", massNumber: 225, charge: 3, valence: 9, kind: "α metal", bestChelator: "DOTA/Macropa", note: "Ac-225 is shown as a large α-emitting actinide in an illustrative chelator cavity." },
  { id: "ra223", label: "223Ra", symbol: "Ra", massNumber: 223, charge: 2, valence: 8, kind: "α metal", bestChelator: "Macropa", note: "Ra-223 is a large alkaline-earth metal; the model emphasizes size and limited covalent character." },
  { id: "sm153", label: "153Sm", symbol: "Sm", massNumber: 153, charge: 3, valence: 8, kind: "β− metal", bestChelator: "DTPA/DOTA", note: "Sm-153 is an illustrative lanthanide radiometal." },
  { id: "sr89", label: "89Sr", symbol: "Sr", massNumber: 89, charge: 2, valence: 4, kind: "β− metal", bestChelator: "bone-targeting concept", note: "Sr-89 is used here to discuss the concept of bone uptake; this model does not predict biological distribution." },
  { id: "i131", label: "131I", symbol: "I", massNumber: 131, charge: 0, valence: 1, kind: "β−/γ nonmetal", bestChelator: "covalent label", note: "I-131 is shown as a covalent label in this example, not as a metal in a chelator cavity." },
  { id: "at211", label: "211At", symbol: "At", massNumber: 211, charge: 0, valence: 1, kind: "α nonmetal", bestChelator: "covalent label", note: "At-211 is a heavy halogen, represented here only as a nonmetal label." },
  { id: "f18", label: "18F", symbol: "F", massNumber: 18, charge: 0, valence: 1, kind: "β+ nonmetal", bestChelator: "covalent label", note: "In this fluorodeoxyglucose teaching example, F replaces an OH group; the sketch is not a validated tracer structure." }
];

export const catalysts = [
  { id: "none", label: "None", hint: "No catalyst selected; reactions can be applied manually." },
  { id: "ni", label: "Ni", hint: "Illustrative C=C hydrogenation with H2." },
  { id: "pd", label: "Pd", hint: "Illustrative mild C=C hydrogenation." },
  { id: "pt", label: "Pt", hint: "Illustrative fast C=C hydrogenation; rate is not calculated." },
  { id: "acid", label: "H+", hint: "Illustrative acid-catalyzed alkene hydration." },
  { id: "fecl3", label: "FeCl3", hint: "Illustrative aromatic-ring chlorination." },
  { id: "brhv", label: "Br2/hν", hint: "Illustrative bromination of double bonds." }
];

export const knownSubstances = [
  { names: ["поваренная соль", "кухонная соль", "соль", "хлорид натрия", "table salt", "sodium chloride"], formula: "NaCl", smiles: "[Na+].[Cl-]", commonName: "table salt", className: "ionic salt", note: "NaCl is a dietary salt and electrolyte; in water, its ions become hydrated." },
  { names: ["серная кислота", "sulfuric acid"], formula: "H2SO4", smiles: "OS(=O)(=O)O", commonName: "sulfuric acid", className: "mineral acid", note: "H2SO4 is a strong acid and dehydrating reagent; real handling requires appropriate laboratory precautions." },
  { names: ["соляная кислота", "хлороводородная кислота", "hydrochloric acid"], formula: "HCl", smiles: "Cl", commonName: "hydrochloric acid", className: "mineral acid", note: "In water, this is represented by H3O+ and Cl− rather than an isolated covalent HCl molecule." },
  { names: ["вода", "water"], formula: "H2O", smiles: "O", commonName: "water", className: "solvent", note: "H2O is a polar solvent that can form hydrogen bonds." },
  { names: ["тяжелая вода", "тяжёлая вода", "heavy water", "deuterium oxide"], formula: "D2O", smiles: "O", commonName: "heavy water", className: "isotopic water", note: "D2O contains deuterium in place of ordinary hydrogen." },
  { names: ["углекислый газ", "диоксид углерода", "carbon dioxide"], formula: "CO2", smiles: "O=C=O", commonName: "carbon dioxide", className: "oxide", note: "CO2 is a linear carbon oxide associated with respiration and combustion." },
  { names: ["оксид железа", "оксид железа 3", "оксид железа iii", "ржавчина", "iron(III) oxide"], formula: "Fe2O3", smiles: null, commonName: "iron(III) oxide", className: "metal oxide", note: "Fe2O3 is used here as a simplified model of rust and iron ore; the solid has mixed ionic and covalent character." },
  { names: ["оксид железа 2", "оксид железа ii", "iron(II) oxide"], formula: "FeO", smiles: null, commonName: "iron(II) oxide", className: "metal oxide", note: "FeO is an iron oxide with iron in oxidation state +2." },
  { names: ["этанол", "спирт", "ethyl alcohol", "ethanol"], formula: "C2H6O", smiles: "CCO", commonName: "ethanol", className: "alcohol", note: "Ethanol contains a hydroxyl (O-H) group." },
  { names: ["бензол", "benzene"], formula: "C6H6", smiles: "c1ccccc1", commonName: "benzene", className: "aromatic compound", note: "Benzene is associated with aromatic electron delocalization in this model." },
  { names: ["дофамин", "dopamine"], formula: "C8H11NO2", smiles: "NCCc1ccc(O)c(O)c1", commonName: "dopamine", className: "neurotransmitter", note: "Dopamine is a catecholamine involved in nervous-system signaling." },
  { names: ["серотонин", "serotonin"], formula: "C10H12N2O", smiles: "NCCc1c[nH]c2ccc(O)cc12", commonName: "serotonin", className: "neurotransmitter", note: "Serotonin is a biogenic amine involved in the regulation of mood and sleep." }
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
