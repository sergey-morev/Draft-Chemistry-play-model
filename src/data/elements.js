import { inferCategory, inferElectronegativity, inferRadius, inferValences } from "../chemistry/elements.js";

export const periodicPositions = [
  ["H", 1, 1], ["He", 18, 1],
  ["Li", 1, 2], ["Be", 2, 2], ["B", 13, 2], ["C", 14, 2], ["N", 15, 2], ["O", 16, 2], ["F", 17, 2], ["Ne", 18, 2],
  ["Na", 1, 3], ["Mg", 2, 3], ["Al", 13, 3], ["Si", 14, 3], ["P", 15, 3], ["S", 16, 3], ["Cl", 17, 3], ["Ar", 18, 3],
  ["K", 1, 4], ["Ca", 2, 4], ["Sc", 3, 4], ["Ti", 4, 4], ["V", 5, 4], ["Cr", 6, 4], ["Mn", 7, 4], ["Fe", 8, 4], ["Co", 9, 4], ["Ni", 10, 4], ["Cu", 11, 4], ["Zn", 12, 4], ["Ga", 13, 4], ["Ge", 14, 4], ["As", 15, 4], ["Se", 16, 4], ["Br", 17, 4], ["Kr", 18, 4],
  ["Rb", 1, 5], ["Sr", 2, 5], ["Y", 3, 5], ["Zr", 4, 5], ["Nb", 5, 5], ["Mo", 6, 5], ["Tc", 7, 5], ["Ru", 8, 5], ["Rh", 9, 5], ["Pd", 10, 5], ["Ag", 11, 5], ["Cd", 12, 5], ["In", 13, 5], ["Sn", 14, 5], ["Sb", 15, 5], ["Te", 16, 5], ["I", 17, 5], ["Xe", 18, 5],
  ["Cs", 1, 6], ["Ba", 2, 6], ["Hf", 4, 6], ["Ta", 5, 6], ["W", 6, 6], ["Re", 7, 6], ["Os", 8, 6], ["Ir", 9, 6], ["Pt", 10, 6], ["Au", 11, 6], ["Hg", 12, 6], ["Tl", 13, 6], ["Pb", 14, 6], ["Bi", 15, 6], ["Po", 16, 6], ["At", 17, 6], ["Rn", 18, 6],
  ["Fr", 1, 7], ["Ra", 2, 7], ["Rf", 4, 7], ["Db", 5, 7], ["Sg", 6, 7], ["Bh", 7, 7], ["Hs", 8, 7], ["Mt", 9, 7], ["Ds", 10, 7], ["Rg", 11, 7], ["Cn", 12, 7], ["Nh", 13, 7], ["Fl", 14, 7], ["Mc", 15, 7], ["Lv", 16, 7], ["Ts", 17, 7], ["Og", 18, 7],
  ["La", 3, 8], ["Ce", 4, 8], ["Pr", 5, 8], ["Nd", 6, 8], ["Pm", 7, 8], ["Sm", 8, 8], ["Eu", 9, 8], ["Gd", 10, 8], ["Tb", 11, 8], ["Dy", 12, 8], ["Ho", 13, 8], ["Er", 14, 8], ["Tm", 15, 8], ["Yb", 16, 8], ["Lu", 17, 8],
  ["Ac", 3, 9], ["Th", 4, 9], ["Pa", 5, 9], ["U", 6, 9], ["Np", 7, 9], ["Pu", 8, 9], ["Am", 9, 9], ["Cm", 10, 9], ["Bk", 11, 9], ["Cf", 12, 9], ["Es", 13, 9], ["Fm", 14, 9], ["Md", 15, 9], ["No", 16, 9], ["Lr", 17, 9]
];

export const namesRu = {
  H: "Водород", He: "Гелий", Li: "Литий", Be: "Бериллий", B: "Бор", C: "Углерод", N: "Азот", O: "Кислород", F: "Фтор", Ne: "Неон",
  Na: "Натрий", Mg: "Магний", Al: "Алюминий", Si: "Кремний", P: "Фосфор", S: "Сера", Cl: "Хлор", Ar: "Аргон",
  K: "Калий", Ca: "Кальций", Sc: "Скандий", Ti: "Титан", V: "Ванадий", Cr: "Хром", Mn: "Марганец", Fe: "Железо", Co: "Кобальт", Ni: "Никель", Cu: "Медь", Zn: "Цинк", Ga: "Галлий", Ge: "Германий", As: "Мышьяк", Se: "Селен", Br: "Бром", Kr: "Криптон",
  Rb: "Рубидий", Sr: "Стронций", Y: "Иттрий", Zr: "Цирконий", Nb: "Ниобий", Mo: "Молибден", Tc: "Технеций", Ru: "Рутений", Rh: "Родий", Pd: "Палладий", Ag: "Серебро", Cd: "Кадмий", In: "Индий", Sn: "Олово", Sb: "Сурьма", Te: "Теллур", I: "Йод", Xe: "Ксенон",
  Cs: "Цезий", Ba: "Барий", La: "Лантан", Ce: "Церий", Pr: "Празеодим", Nd: "Неодим", Pm: "Прометий", Sm: "Самарий", Eu: "Европий", Gd: "Гадолиний", Tb: "Тербий", Dy: "Диспрозий", Ho: "Гольмий", Er: "Эрбий", Tm: "Тулий", Yb: "Иттербий", Lu: "Лютеций",
  Hf: "Гафний", Ta: "Тантал", W: "Вольфрам", Re: "Рений", Os: "Осмий", Ir: "Иридий", Pt: "Платина", Au: "Золото", Hg: "Ртуть", Tl: "Таллий", Pb: "Свинец", Bi: "Висмут", Po: "Полоний", At: "Астат", Rn: "Радон",
  Fr: "Франций", Ra: "Радий", Ac: "Актиний", Th: "Торий", Pa: "Протактиний", U: "Уран", Np: "Нептуний", Pu: "Плутоний", Am: "Америций", Cm: "Кюрий", Bk: "Берклий", Cf: "Калифорний", Es: "Эйнштейний", Fm: "Фермий", Md: "Менделевий", No: "Нобелий", Lr: "Лоуренсий",
  Rf: "Резерфордий", Db: "Дубний", Sg: "Сиборгий", Bh: "Борий", Hs: "Хассий", Mt: "Мейтнерий", Ds: "Дармштадтий", Rg: "Рентгений", Cn: "Коперниций", Nh: "Нихоний", Fl: "Флеровий", Mc: "Московий", Lv: "Ливерморий", Ts: "Теннессин", Og: "Оганесон"
};

// English display names; namesRu remains the legacy Russian lookup source.
export const namesEn = {
  H: "Hydrogen",
  He: "Helium",
  Li: "Lithium",
  Be: "Beryllium",
  B: "Boron",
  C: "Carbon",
  N: "Nitrogen",
  O: "Oxygen",
  F: "Fluorine",
  Ne: "Neon",
  Na: "Sodium",
  Mg: "Magnesium",
  Al: "Aluminium",
  Si: "Silicon",
  P: "Phosphorus",
  S: "Sulfur",
  Cl: "Chlorine",
  Ar: "Argon",
  K: "Potassium",
  Ca: "Calcium",
  Sc: "Scandium",
  Ti: "Titanium",
  V: "Vanadium",
  Cr: "Chromium",
  Mn: "Manganese",
  Fe: "Iron",
  Co: "Cobalt",
  Ni: "Nickel",
  Cu: "Copper",
  Zn: "Zinc",
  Ga: "Gallium",
  Ge: "Germanium",
  As: "Arsenic",
  Se: "Selenium",
  Br: "Bromine",
  Kr: "Krypton",
  Rb: "Rubidium",
  Sr: "Strontium",
  Y: "Yttrium",
  Zr: "Zirconium",
  Nb: "Niobium",
  Mo: "Molybdenum",
  Tc: "Technetium",
  Ru: "Ruthenium",
  Rh: "Rhodium",
  Pd: "Palladium",
  Ag: "Silver",
  Cd: "Cadmium",
  In: "Indium",
  Sn: "Tin",
  Sb: "Antimony",
  Te: "Tellurium",
  I: "Iodine",
  Xe: "Xenon",
  Cs: "Caesium",
  Ba: "Barium",
  La: "Lanthanum",
  Ce: "Cerium",
  Pr: "Praseodymium",
  Nd: "Neodymium",
  Pm: "Promethium",
  Sm: "Samarium",
  Eu: "Europium",
  Gd: "Gadolinium",
  Tb: "Terbium",
  Dy: "Dysprosium",
  Ho: "Holmium",
  Er: "Erbium",
  Tm: "Thulium",
  Yb: "Ytterbium",
  Lu: "Lutetium",
  Hf: "Hafnium",
  Ta: "Tantalum",
  W: "Tungsten",
  Re: "Rhenium",
  Os: "Osmium",
  Ir: "Iridium",
  Pt: "Platinum",
  Au: "Gold",
  Hg: "Mercury",
  Tl: "Thallium",
  Pb: "Lead",
  Bi: "Bismuth",
  Po: "Polonium",
  At: "Astatine",
  Rn: "Radon",
  Fr: "Francium",
  Ra: "Radium",
  Ac: "Actinium",
  Th: "Thorium",
  Pa: "Protactinium",
  U: "Uranium",
  Np: "Neptunium",
  Pu: "Plutonium",
  Am: "Americium",
  Cm: "Curium",
  Bk: "Berkelium",
  Cf: "Californium",
  Es: "Einsteinium",
  Fm: "Fermium",
  Md: "Mendelevium",
  No: "Nobelium",
  Lr: "Lawrencium",
  Rf: "Rutherfordium",
  Db: "Dubnium",
  Sg: "Seaborgium",
  Bh: "Bohrium",
  Hs: "Hassium",
  Mt: "Meitnerium",
  Ds: "Darmstadtium",
  Rg: "Roentgenium",
  Cn: "Copernicium",
  Nh: "Nihonium",
  Fl: "Flerovium",
  Mc: "Moscovium",
  Lv: "Livermorium",
  Ts: "Tennessine",
  Og: "Oganesson",
  D: "Deuterium",
  T: "Tritium",
};

export const atomicOrder = [
  "H", "He",
  "Li", "Be", "B", "C", "N", "O", "F", "Ne",
  "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar",
  "K", "Ca", "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn", "Ga", "Ge", "As", "Se", "Br", "Kr",
  "Rb", "Sr", "Y", "Zr", "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Ag", "Cd", "In", "Sn", "Sb", "Te", "I", "Xe",
  "Cs", "Ba", "La", "Ce", "Pr", "Nd", "Pm", "Sm", "Eu", "Gd", "Tb", "Dy", "Ho", "Er", "Tm", "Yb", "Lu",
  "Hf", "Ta", "W", "Re", "Os", "Ir", "Pt", "Au", "Hg", "Tl", "Pb", "Bi", "Po", "At", "Rn",
  "Fr", "Ra", "Ac", "Th", "Pa", "U", "Np", "Pu", "Am", "Cm", "Bk", "Cf", "Es", "Fm", "Md", "No", "Lr",
  "Rf", "Db", "Sg", "Bh", "Hs", "Mt", "Ds", "Rg", "Cn", "Nh", "Fl", "Mc", "Lv", "Ts", "Og"
];

export const atomicNumbers = new Map(atomicOrder.map((symbol, index) => [symbol, index + 1]));

export const categoryColors = {
  nonmetal: "#536878",
  noble: "#7b6fb6",
  alkali: "#c65a3d",
  alkaline: "#c27d2b",
  metalloid: "#607d3f",
  post: "#517f95",
  transition: "#3867a6",
  halogen: "#0f8b8d",
  isotope: "#1f9fb5",
  lanthanide: "#836aa6",
  actinide: "#9a5b76",
  unknown: "#6f7782"
};

export const rich = {
  H: { mass: 1.008, valences: [1], electronegativity: 2.20, radius: 31, category: "nonmetal", color: "#9aa6b2", organic: true },
  He: { mass: 4.003, valences: [0], electronegativity: null, radius: 28, category: "noble" },
  Li: { mass: 6.94, valences: [1], electronegativity: 0.98, radius: 128, category: "alkali" },
  Be: { mass: 9.012, valences: [2], electronegativity: 1.57, radius: 96, category: "alkaline" },
  B: { mass: 10.81, valences: [3], electronegativity: 2.04, radius: 84, category: "metalloid", organic: true },
  C: { mass: 12.011, valences: [4], electronegativity: 2.55, radius: 76, category: "nonmetal", color: "#2f3a44", organic: true },
  N: { mass: 14.007, valences: [3, 5], electronegativity: 3.04, radius: 71, category: "nonmetal", color: "#3157b7", organic: true },
  O: { mass: 15.999, valences: [2], electronegativity: 3.44, radius: 66, category: "nonmetal", color: "#d34b4b", organic: true },
  F: { mass: 18.998, valences: [1], electronegativity: 3.98, radius: 57, category: "halogen", color: "#18a999" },
  Ne: { mass: 20.18, valences: [0], electronegativity: null, radius: 58, category: "noble" },
  Na: { mass: 22.99, valences: [1], electronegativity: 0.93, radius: 166, category: "alkali" },
  Mg: { mass: 24.305, valences: [2], electronegativity: 1.31, radius: 141, category: "alkaline" },
  Al: { mass: 26.982, valences: [3], electronegativity: 1.61, radius: 121, category: "post" },
  Si: { mass: 28.085, valences: [4], electronegativity: 1.90, radius: 111, category: "metalloid", organic: true },
  P: { mass: 30.974, valences: [3, 5], electronegativity: 2.19, radius: 107, category: "nonmetal", color: "#d18d00", organic: true },
  S: { mass: 32.06, valences: [2, 4, 6], electronegativity: 2.58, radius: 105, category: "nonmetal", color: "#c9a113", organic: true },
  Cl: { mass: 35.45, valences: [1, 3, 5, 7], electronegativity: 3.16, radius: 102, category: "halogen", color: "#239b56" },
  Ar: { mass: 39.948, valences: [0], electronegativity: null, radius: 106, category: "noble" },
  K: { mass: 39.098, valences: [1], electronegativity: 0.82, radius: 203, category: "alkali" },
  Ca: { mass: 40.078, valences: [2], electronegativity: 1.00, radius: 176, category: "alkaline" },
  Fe: { mass: 55.845, valences: [2, 3], electronegativity: 1.83, radius: 132, category: "transition" },
  Cu: { mass: 63.546, valences: [1, 2], electronegativity: 1.90, radius: 132, category: "transition" },
  Zn: { mass: 65.38, valences: [2], electronegativity: 1.65, radius: 122, category: "transition" },
  Br: { mass: 79.904, valences: [1, 3, 5], electronegativity: 2.96, radius: 120, category: "halogen", color: "#96543f" },
  I: { mass: 126.9, valences: [1, 3, 5, 7], electronegativity: 2.66, radius: 139, category: "halogen", color: "#6c4a8f" },
  Ag: { mass: 107.87, valences: [1], electronegativity: 1.93, radius: 145, category: "transition" },
  Au: { mass: 196.97, valences: [1, 3], electronegativity: 2.54, radius: 136, category: "transition" },
  Hg: { mass: 200.59, valences: [1, 2], electronegativity: 2.00, radius: 132, category: "transition" },
  Sn: { mass: 118.71, valences: [2, 4], electronegativity: 1.96, radius: 139, category: "post" },
  Pb: { mass: 207.2, valences: [2, 4], electronegativity: 2.33, radius: 146, category: "post" },
  U: { mass: 238.029, valences: [3, 4, 5, 6], electronegativity: 1.38, radius: 196, category: "actinide" }
};

export const transitionSymbols = new Set(["Sc", "Ti", "V", "Cr", "Mn", "Co", "Ni", "Y", "Zr", "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Cd", "Hf", "Ta", "W", "Re", "Os", "Ir", "Pt", "Rf", "Db", "Sg", "Bh", "Hs", "Mt", "Ds", "Rg", "Cn"]);

export const lanthanides = new Set(["La", "Ce", "Pr", "Nd", "Pm", "Sm", "Eu", "Gd", "Tb", "Dy", "Ho", "Er", "Tm", "Yb", "Lu"]);

export const actinides = new Set(["Ac", "Th", "Pa", "U", "Np", "Pu", "Am", "Cm", "Bk", "Cf", "Es", "Fm", "Md", "No", "Lr"]);

export const alkali = new Set(["Li", "Na", "K", "Rb", "Cs", "Fr"]);

export const alkaline = new Set(["Be", "Mg", "Ca", "Sr", "Ba", "Ra"]);

export const halogens = new Set(["F", "Cl", "Br", "I", "At", "Ts"]);

export const nobles = new Set(["He", "Ne", "Ar", "Kr", "Xe", "Rn", "Og"]);

export const metalloids = new Set(["B", "Si", "Ge", "As", "Sb", "Te"]);

export const postMetals = new Set(["Al", "Ga", "In", "Tl", "Sn", "Pb", "Bi", "Po", "Nh", "Fl", "Mc", "Lv"]);

export const organicSymbols = new Set(["C", "N", "O", "S", "P", "B", "Si"]);

export const isotopeSymbols = new Set(["D", "T"]);

export const elements = periodicPositions.map(([symbol, group, period], index) => {
  const base = rich[symbol] || {};
  const category = base.category || inferCategory(symbol);
  const atomicNumber = atomicNumbers.get(symbol) || index + 1;
  return {
    symbol,
    z: atomicNumber,
    group,
    period,
    name: namesEn[symbol] || symbol,
    legacyNames: [namesRu[symbol]].filter(Boolean),
    mass: base.mass || Math.round(atomicNumber * 2.15 * 10) / 10,
    valences: base.valences || inferValences(symbol, group, category),
    electronegativity: base.electronegativity ?? inferElectronegativity(group, category),
    radius: base.radius || inferRadius(group, period, category),
    category,
    color: base.color || categoryColors[category] || categoryColors.unknown,
    organic: Boolean(base.organic || organicSymbols.has(symbol))
  };
});

elements.push(
  { symbol: "D", z: 1, group: 1, period: 10, name: namesEn.D, legacyNames: ["Дейтерий"], mass: 2.014, valences: [1], electronegativity: 2.2, radius: 31, category: "isotope", color: "#1f9fb5", organic: false, isotopeOf: "H" },
  { symbol: "T", z: 1, group: 2, period: 10, name: namesEn.T, legacyNames: ["Тритий"], mass: 3.016, valences: [1], electronegativity: 2.2, radius: 31, category: "isotope", color: "#7a5ac8", organic: false, isotopeOf: "H" }
);

export const elementBySymbol = new Map(elements.map((element) => [element.symbol, element]));
