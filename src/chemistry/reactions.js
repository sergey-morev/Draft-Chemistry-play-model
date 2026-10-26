import { playElementSound } from "../audio/sound.js";
import { analyzeMolecule } from "./analysis.js";
import { formatCoefficient } from "./formula.js";
import { bondOrderValue, isHydrogenLike, neighborsOf } from "./properties.js";
import { isotopeSymbols } from "../data/elements.js";
import { centerMolecule, freeCenterPoint } from "../render/camera.js";
import { findSixCarbonRing } from "../simulation/fragments.js";
import { componentAtoms, connects, findBondByOrder, getAtom, getElement, isDonorAtom, isMetalAtom, molecularComponents, moveComponentToward, pickComponentsForCombination } from "../simulation/graph.js";
import { addAtom, addAtomAttached, createOrUpdateBond, weakenOrRemoveBond } from "../simulation/molecule.js";
import { state as labState } from "../state.js";
import { catalystAdvice, catalystLabel } from "../ui/controls.js";
import { buildStabilizationSuggestions } from "../ui/inspector.js";
import { reactionResult } from "../ui/journal.js";
import { stabilityText } from "../utils/format.js";

export function hydrogenateDoubleBond() {
  const bond = findBondByOrder(2, "C", "C");
  if (!bond) return reactionResult(false, "Гидрирование не прошло", "Двойная связь C=C не найдена.", {
    advice: ["Выберите связь между двумя C и переключите ее на двойную, затем повторите H2 + C=C."]
  });
  bond.order = 1;
  const atomA = getAtom(bond.a);
  const atomB = getAtom(bond.b);
  const angle = Math.atan2(atomB.y - atomA.y, atomB.x - atomA.x);
  addAtomAttached("H", atomA.id, angle + Math.PI * 0.72, 74);
  addAtomAttached("H", atomB.id, angle - Math.PI * 0.28, 74);
  labState.selectedAtomIds = [bond.a, bond.b];
  labState.selectedBondId = bond.id;
  return reactionResult(true, "Гидрирование алкена", "C=C стала C-C, к двум атомам углерода добавлены H.", {
    equation: "C=C + H2 -> C-C",
    uses: "Так насыщают растительные масла, получают алканы из алкенов и снижают реакционную способность двойных связей.",
    advice: ["Если молекула стала перегруженной, удалите лишний H или уменьшите порядок соседней связи.", "Для каталитической версии мысленно добавьте Ni, Pd или Pt как поверхность реакции."]
  });
}

export function brominateDoubleBond() {
  const bond = findBondByOrder(2, "C", "C");
  if (!bond) return reactionResult(false, "Бромирование не прошло", "Двойная связь C=C не найдена.", {
    advice: ["Создайте алкен: два C и двойная связь между ними."]
  });
  bond.order = 1;
  const atomA = getAtom(bond.a);
  const atomB = getAtom(bond.b);
  const angle = Math.atan2(atomB.y - atomA.y, atomB.x - atomA.x);
  addAtomAttached("Br", atomA.id, angle + Math.PI * 0.65, 92);
  addAtomAttached("Br", atomB.id, angle - Math.PI * 0.35, 92);
  labState.selectedAtomIds = [bond.a, bond.b];
  labState.selectedBondId = bond.id;
  return reactionResult(true, "Бромирование алкена", "Двойная связь раскрыта, Br добавлен к обоим атомам C.", {
    equation: "C=C + Br2 -> Br-C-C-Br",
    uses: "Классическая качественная реакция на двойную связь: бромная вода обесцвечивается.",
    advice: ["Если стабильность просела, проверьте валентность каждого C.", "Br тяжелый и поляризуемый: такие связи часто делают молекулу более плотной и реакционно полезной."]
  });
}

export function hydrateAlkene() {
  const bond = findBondByOrder(2, "C", "C");
  if (!bond) return reactionResult(false, "Гидратация не прошла", "Двойная связь C=C не найдена.", {
    advice: ["Добавьте C=C, затем примените H2O + C=C для получения спиртового фрагмента."]
  });
  bond.order = 1;
  const atomA = getAtom(bond.a);
  const atomB = getAtom(bond.b);
  const angle = Math.atan2(atomB.y - atomA.y, atomB.x - atomA.x);
  const o = addAtomAttached("O", atomA.id, angle + Math.PI * 0.65, 86);
  addAtomAttached("H", o.id, angle + Math.PI * 0.95, 62);
  addAtomAttached("H", atomB.id, angle - Math.PI * 0.35, 72);
  labState.selectedAtomIds = [atomA.id, atomB.id, o.id];
  labState.selectedBondId = bond.id;
  return reactionResult(true, "Гидратация алкена", "По двойной связи добавлены OH и H, получился спиртовой фрагмент.", {
    equation: "C=C + H2O -> C-C(OH)",
    uses: "Так моделируют получение спиртов из алкенов, например промышленный путь к этанолу или изопропанолу.",
    advice: ["OH повышает полярность и способность к водородным связям.", "Если нужен менее полярный фрагмент, удалите O-H или замените OH на H."]
  });
}

export function chlorinateBenzene() {
  const ring = findSixCarbonRing();
  if (!ring) return reactionResult(false, "Хлорирование не прошло", "Бензольное кольцо не найдено.", {
    advice: ["Добавьте фрагмент «Бензол» или соберите шестиугольное кольцо C6."]
  });
  const analysis = analyzeMolecule();
  const targetId = ring.find((id) => (analysis.atomMap.get(id)?.implicitH || 0) > 0) || ring[0];
  const target = getAtom(targetId);
  const center = ring.reduce((acc, id) => {
    const atom = getAtom(id);
    acc.x += atom.x / ring.length;
    acc.y += atom.y / ring.length;
    return acc;
  }, { x: 0, y: 0 });
  const angle = Math.atan2(target.y - center.y, target.x - center.x);
  const cl = addAtomAttached("Cl", targetId, angle, 98);
  labState.selectedAtomIds = [targetId, cl.id];
  labState.selectedBondId = null;
  return reactionResult(true, "Электрофильное хлорирование бензола", "Один H в бензольном кольце замещен на Cl.", {
    equation: "C6H6 + Cl2 -> C6H5Cl + HCl",
    uses: "Хлорбензольные фрагменты применяются как промежуточные продукты в синтезе красителей, пестицидов, полимеров и лекарственных молекул.",
    advice: ["Cl делает кольцо менее активным к дальнейшему электрофильному замещению.", "Попробуйте добавить второй заместитель и сравнить стабильность/полярность."]
  });
}

export function combustionPreview() {
  const analysis = analyzeMolecule();
  const counts = analysis.counts;
  const c = counts.C || 0;
  const h = (counts.H || 0) + (counts.D || 0) + (counts.T || 0);
  const o = counts.O || 0;
  if (!c && !h) return reactionResult(false, "Горение не рассчитано", "Для горения нужен органический фрагмент с C или H.", {
    advice: ["Добавьте метан, этанол, бензол или другой C/H-фрагмент."]
  });
  const water = h / 2;
  const oxygen = c + h / 4 - o / 2;
  const left = analysis.formula;
  const waterProduct = ((counts.D || 0) + (counts.T || 0)) > 0 ? "(H/D/T)2O" : "H2O";
  const equation = `${left} + ${formatCoefficient(oxygen)}O2 -> ${formatCoefficient(c)}CO2 + ${formatCoefficient(water)}${waterProduct}`;
  return reactionResult(true, "Расчет полного горения", "Молекула не изменена: показано уравнение продуктов полного окисления.", {
    equation,
    uses: "Горение используют для оценки состава органических веществ, топлива, теплотворности и продуктов окисления.",
    advice: ["Больше C обычно дает больше CO2.", "Больше O в исходной молекуле уменьшает требуемое количество O2."]
  });
}

export function combineMoleculeFragments() {
  const components = molecularComponents(false).filter((component) => component.atomIds.length > 0);
  if (components.length < 2) {
    return reactionResult(false, "Нужно две молекулы", "На поле найден только один отдельный фрагмент.", {
      advice: ["Добавьте вторую молекулу, например NaCl и H2O, затем нажмите «⇄ Соединить»."]
    });
  }
  const [first, second] = pickComponentsForCombination(components);
  moveComponentToward(first, second);

  const special = combineSaltAndWater(first, second) || combineSaltAndWater(second, first);
  if (special) return special;

  const generic = createGenericIntermolecularLink(first, second);
  if (!generic) {
    return reactionResult(false, "Нет подходящей пары", "Модель не нашла полярные, ионные или донорно-акцепторные центры.", {
      advice: ["Выберите атомы из двух фрагментов или добавьте O/N/галоген/металл для межмолекулярного взаимодействия."]
    });
  }
  return generic;
}

export function nuclearConceptDemo() {
  const uraniumAtoms = labState.atoms.filter((atom) => atom.symbol === "U");
  if (!uraniumAtoms.length) {
    return reactionResult(false, "U-демо не запущено", "Добавьте атом U или введите урановую учебную модель, затем нажмите U-демо.", {
      advice: ["Это только безопасная визуализация радиоактивности и нейтронов, без параметров реальной цепной реакции."]
    });
  }
  labState.selectedAtomIds = uraniumAtoms.slice(0, 3).map((atom) => atom.id);
  playElementSound(getElement("U"), "nuclear");
  return reactionResult(true, "Концепт ядерной цепной реакции", "Показана абстрактная схема: нейтронные импульсы и ионизация вокруг U. Это не расчет и не инструкция.", {
    equation: "U + n -> возбужденное ядро -> осколки + n + энергия (учебная схема)",
    uses: "Научный интерес: понять идею деления ядра, нейтронного размножения, поглощения нейтронов и роли замедлителя/поглотителя на концептуальном уровне.",
    advice: [
      "Безопасная граница: модель не показывает массы, геометрию, обогащение, отражатели или практические условия реальной цепной реакции.",
      "Для стабилизации учебной модели добавляйте поглотитель нейтронов как концепт: B, Cd или H2O показывают идею торможения/поглощения, но не являются инструкцией.",
      "U в этой лаборатории можно использовать для разговора о радиоактивности, изотопах и материалах, а не для практического ядерного проектирования."
    ]
  });
}

export function combineSaltAndWater(saltComponent, waterComponent) {
  const na = componentAtoms(saltComponent).find((atom) => atom.symbol === "Na");
  const cl = componentAtoms(saltComponent).find((atom) => atom.symbol === "Cl");
  const waterO = componentAtoms(waterComponent).find((atom) => atom.symbol === "O" && neighborsOf(atom.id).some((id) => isHydrogenLike(getAtom(id)?.symbol)));
  const waterH = waterO ? neighborsOf(waterO.id).map(getAtom).find((atom) => atom && isHydrogenLike(atom.symbol)) : null;
  if (!na || !cl || !waterO || !waterH) return null;

  na.charge = 1;
  cl.charge = -1;
  const saltBond = labState.bonds.find((bond) => connects(bond, na.id, cl.id));
  if (saltBond) saltBond.order = "ionic";
  createOrUpdateBond(na.id, waterO.id, "solvation");
  createOrUpdateBond(cl.id, waterH.id, "hbond");
  labState.selectedAtomIds = [na.id, cl.id, waterO.id, waterH.id];
  labState.selectedBondId = null;

  return reactionResult(true, "Растворение и гидратация NaCl", "NaCl не становится ковалентной молекулой: вода разделяет и стабилизирует Na+ и Cl−.", {
    equation: "NaCl(s) + H2O(l) -> Na+(aq) + Cl-(aq); ΔHраств ≈ +3.9 кДж/моль",
    uses: "Это модель растворения соли в воде: энергия решетки компенсируется гидратацией ионов полярными молекулами воды.",
    advice: [
      "Тип процесса: физико-химическое растворение и диссоциация, а не обычная реакция замещения.",
      "Энергия: ΔHраств для NaCl около +3.9 кДж/моль; процесс слабо эндотермический, поэтому немного чувствителен к температуре.",
      "Условия: вода жидкая, около 20-25 °C, 1 атм, раствор не насыщен, желательно перемешивание.",
      "Параметры: высокая диэлектрическая проницаемость воды, ион-дипольное взаимодействие Na+···O и Cl−···H.",
      "Если повысить температуру, растворение NaCl обычно немного облегчается, потому что процесс слабо эндотермический.",
      "На схеме пунктирные связи показывают сольватацию, а не новую ковалентную связь."
    ]
  });
}

export function createGenericIntermolecularLink(first, second) {
  const atomsA = componentAtoms(first);
  const atomsB = componentAtoms(second);
  const metalA = atomsA.find(isMetalAtom);
  const donorB = atomsB.find(isDonorAtom);
  const donorA = atomsA.find(isDonorAtom);
  const metalB = atomsB.find(isMetalAtom);
  const positiveA = atomsA.find((atom) => atom.charge > 0);
  const negativeB = atomsB.find((atom) => atom.charge < 0);
  const positiveB = atomsB.find((atom) => atom.charge > 0);
  const negativeA = atomsA.find((atom) => atom.charge < 0);
  const hDonorA = atomsA.find((atom) => isHydrogenLike(atom.symbol));
  const acceptorB = atomsB.find(isDonorAtom);
  const hDonorB = atomsB.find((atom) => isHydrogenLike(atom.symbol));
  const acceptorA = atomsA.find(isDonorAtom);

  if (metalA && donorB) return linkComponents(metalA, donorB, "coordination", "Координационное связывание", "M + :L -> M<-L; ΔG зависит от лиганда и pH", "донорно-акцепторная связь металл-лиганд");
  if (metalB && donorA) return linkComponents(metalB, donorA, "coordination", "Координационное связывание", "M + :L -> M<-L; ΔG зависит от лиганда и pH", "донорно-акцепторная связь металл-лиганд");
  if (positiveA && negativeB) return linkComponents(positiveA, negativeB, "ionic", "Ионная ассоциация", "A+ + B- -> A+···B-; энергия обычно отрицательная", "электростатическая ионная пара");
  if (positiveB && negativeA) return linkComponents(positiveB, negativeA, "ionic", "Ионная ассоциация", "A+ + B- -> A+···B-; энергия обычно отрицательная", "электростатическая ионная пара");
  if (hDonorA && acceptorB) return linkComponents(hDonorA, acceptorB, "hbond", "Водородная связь", "X-H + :Y -> X-H···Y; ~5-30 кДж/моль", "межмолекулярная водородная связь");
  if (hDonorB && acceptorA) return linkComponents(hDonorB, acceptorA, "hbond", "Водородная связь", "X-H + :Y -> X-H···Y; ~5-30 кДж/моль", "межмолекулярная водородная связь");
  return null;
}

export function linkComponents(a, b, order, title, equation, interactionText) {
  createOrUpdateBond(a.id, b.id, order);
  labState.selectedAtomIds = [a.id, b.id];
  labState.selectedBondId = null;
  const params = interactionParameters(order);
  return reactionResult(true, title, `Создано взаимодействие ${a.symbol}${a.id}···${b.symbol}${b.id}: ${interactionText}.`, {
    equation,
    uses: "Это физико-химическое соединение двух молекул через слабое или координационное взаимодействие, а не обязательно новая ковалентная молекула.",
    advice: [
      `Энергия: ${params.energy}.`,
      `Температура: ${params.temperature}.`,
      `Среда: ${params.medium}.`,
      `Параметры: ${params.parameters}.`
    ]
  });
}

export function interactionParameters(order) {
  if (order === "hbond") return {
    energy: "примерно 5-30 кДж/моль",
    temperature: "лучше заметно при комнатной температуре и ниже",
    medium: "полярная среда или чистые вещества с O/N/F-H",
    parameters: "донор H, акцептор с неподеленной парой, расстояние 1.5-2.5 Å"
  };
  if (order === "coordination") return {
    energy: "примерно 40-200 кДж/моль, зависит от металла и лиганда",
    temperature: "обычно 20-80 °C в растворе",
    medium: "вода, спирт или буфер; важны pH и конкурирующие лиганды",
    parameters: "свободная орбиталь металла, донор O/N/S, подходящая геометрия"
  };
  if (order === "ionic") return {
    energy: "кулоновское притяжение часто десятки кДж/моль в воде",
    temperature: "обычно 20-25 °C, зависит от растворимости",
    medium: "полярный растворитель с высокой диэлектрической проницаемостью",
    parameters: "заряд ионов, ионная сила, концентрация, сольватация"
  };
  return {
    energy: "примерно 1-20 кДж/моль",
    temperature: "около 20-25 °C",
    medium: "подходящий растворитель",
    parameters: "полярность, концентрация, расстояние между центрами"
  };
}

export function reactAllPossible() {
  const operations = [];
  const catalyst = labState.activeCatalyst;
  let guard = 0;

  if (["ni", "pd", "pt"].includes(catalyst)) {
    while (findBondByOrder(2, "C", "C") && guard++ < 24) {
      const result = hydrogenateDoubleBond();
      if (!result.success) break;
      operations.push("C=C + H2 -> C-C");
    }
  } else if (catalyst === "acid") {
    while (findBondByOrder(2, "C", "C") && guard++ < 18) {
      const result = hydrateAlkene();
      if (!result.success) break;
      operations.push("C=C + H2O -> C-C(OH)");
    }
  } else if (catalyst === "brhv") {
    while (findBondByOrder(2, "C", "C") && guard++ < 18) {
      const result = brominateDoubleBond();
      if (!result.success) break;
      operations.push("C=C + Br2 -> Br-C-C-Br");
    }
  } else if (catalyst === "fecl3") {
    const result = chlorinateBenzene();
    if (result.success) operations.push("C6H6 + Cl2 -> C6H5Cl + HCl");
  } else {
    for (let i = 0; i < 10; i++) {
      const action = autoStabilizeStep();
      if (!action) break;
      operations.push(action);
    }
    if (!operations.length && findBondByOrder(2, "C", "C")) {
      const result = brominateDoubleBond();
      if (result.success) operations.push("C=C + Br2 -> Br-C-C-Br");
    }
  }

  if (!operations.length) {
    for (let i = 0; i < 8; i++) {
      const action = autoStabilizeStep();
      if (!action) break;
      operations.push(action);
    }
  }

  const after = analyzeMolecule();
  if (!operations.length) {
    return reactionResult(false, "Песочница: реакции не найдены", "Для текущей молекулы и катализатора нет подходящего шаблона.", {
      equation: `катализатор: ${catalystLabel()}`,
      uses: "Выберите катализатор под нужный фрагмент: Ni/Pd/Pt для C=C, H+ для гидратации, FeCl3 для бензола.",
      advice: [catalystAdvice(), ...buildStabilizationSuggestions(after).map((item) => item.text).slice(0, 2)]
    });
  }

  return reactionResult(true, "Песочница: общая реакция", `Выполнено операций: ${operations.length}. Катализатор: ${catalystLabel()}.`, {
    equation: operations.slice(0, 4).join("; ") + (operations.length > 4 ? "; ..." : ""),
    uses: "Это учебная массовая реакция: модель ищет подходящие фрагменты и применяет простые правила ко всем найденным местам.",
    advice: [`После реакции: ${stabilityText(after.score)} ${after.score}%.`, ...buildStabilizationSuggestions(after).map((item) => item.text).slice(0, 3)]
  });
}

export function autoStabilizeStep() {
  const analysis = analyzeMolecule();
  const reports = [...analysis.atomMap.values()];
  const over = reports.find((report) => report.usage > Math.max(...report.allowedValences) + 0.05);
  if (over) {
    const connected = labState.bonds
      .filter((bond) => bond.a === over.atom.id || bond.b === over.atom.id)
      .sort((a, b) => bondOrderValue(b.order) - bondOrderValue(a.order))[0];
    if (connected) {
      const a = getAtom(connected.a);
      const b = getAtom(connected.b);
      weakenOrRemoveBond(connected.id);
      return `${a?.symbol || "?"}-${b?.symbol || "?"}: связь ослаблена для снятия перегрузки`;
    }
  }

  const charged = labState.atoms.find((atom) => atom.charge !== 0);
  if (charged) {
    charged.charge += charged.charge > 0 ? -1 : 1;
    return `${charged.symbol}${charged.id}: заряд сдвинут к 0`;
  }

  const under = reports.find((report) => report.state === "warn" && report.implicitH === 0 && !isHydrogenLike(report.atom.symbol));
  if (under) {
    addAtomAttached("H", under.atom.id, nextAttachmentAngle(under.atom.id), 72);
    return `${under.atom.symbol}${under.atom.id}: добавлен H к свободной валентности`;
  }

  if (analysis.strainEnergy > 12) {
    centerMolecule(false);
    labState.atoms.forEach((atom) => {
      atom.vx = 0;
      atom.vy = 0;
    });
    return "геометрия центрирована для снижения напряжения";
  }

  return null;
}

export function addHeavyWaterProcess() {
  const point = freeCenterPoint();
  const o = addAtom("O", point.x, point.y);
  const d1 = addAtom("D", point.x - 68, point.y + 36);
  const d2 = addAtom("D", point.x + 68, point.y + 36);
  createOrUpdateBond(o.id, d1.id, 1);
  createOrUpdateBond(o.id, d2.id, 1);
  labState.selectedAtomIds = [o.id, d1.id, d2.id];
  labState.selectedBondId = null;
  return reactionResult(true, "Добавлена тяжелая вода", "Создана молекула D2O: изотопная форма воды с дейтерием вместо обычного H.", {
    equation: "2D + O -> D2O",
    uses: "D2O применяют как изотопную метку, растворитель в спектроскопии и учебный пример изотопного замещения.",
    advice: ["D химически похож на H, но почти вдвое тяжелее.", "Сравните H2O и D2O по массе и формуле в блоке «Соединение»."]
  });
}

export function enrichHydrogenIsotope(targetSymbol, ratio) {
  const target = getElement(targetSymbol);
  const selectedPool = labState.selectedAtomIds.map(getAtom).filter((atom) => atom && isHydrogenLike(atom.symbol));
  const explicitPool = labState.atoms.filter((atom) => atom.symbol === "H");
  const pool = selectedPool.length ? selectedPool : explicitPool;

  if (!pool.length) {
    const created = materializeImplicitIsotope(targetSymbol);
    if (!created) {
      return reactionResult(false, `${target.name}: обогащение не выполнено`, "Нет явных H и нет доступных скрытых H для замещения.", {
        advice: ["Добавьте метан, воду, этанол или выберите атом C/N/O со скрытым H."]
      });
    }
    labState.selectedAtomIds = [created.id];
    labState.selectedBondId = null;
    return reactionResult(true, `${target.name}: изотопное замещение`, `Скрытый H превращен в явный ${targetSymbol}.`, isotopeDetails(targetSymbol, true));
  }

  const changeCount = Math.max(1, Math.ceil(pool.length * ratio));
  pool.slice(0, changeCount).forEach((atom) => {
    atom.symbol = targetSymbol;
    atom.vx = 0;
    atom.vy = 0;
  });
  labState.selectedAtomIds = pool.slice(0, changeCount).map((atom) => atom.id);
  labState.selectedBondId = null;
  return reactionResult(true, `${target.name}: обогащение`, `${changeCount} атом(ов) водорода заменены на ${targetSymbol}.`, isotopeDetails(targetSymbol, false));
}

export function resetHydrogenIsotopes() {
  const selectedPool = labState.selectedAtomIds.map(getAtom).filter((atom) => atom && isotopeSymbols.has(atom.symbol));
  const pool = selectedPool.length ? selectedPool : labState.atoms.filter((atom) => isotopeSymbols.has(atom.symbol));
  if (!pool.length) {
    return reactionResult(false, "Возврат к H не выполнен", "В молекуле нет D или T.", {
      advice: ["Сначала добавьте D2O, D-обогащение или T-метку."]
    });
  }
  pool.forEach((atom) => {
    atom.symbol = "H";
    atom.vx = 0;
    atom.vy = 0;
  });
  labState.selectedAtomIds = pool.map((atom) => atom.id);
  labState.selectedBondId = null;
  return reactionResult(true, "Изотопы возвращены к H", `${pool.length} атом(ов) D/T заменены на обычный H.`, {
    equation: "D/T -> H",
    uses: "В модели это быстрый способ сравнить обычную и изотопно обогащенную молекулу.",
    advice: ["Если формула стала легче, значит изотопная масса ушла.", "Можно снова применить D↑ или T* только к выбранным атомам."]
  });
}

export function isotopeDetails(targetSymbol, materialized) {
  if (targetSymbol === "D") {
    return {
      equation: materialized ? "R-H -> R-D" : "R-H + D -> R-D + H",
      uses: "Дейтерирование применяют для изотопной маркировки, изучения механизмов реакций и сдвигов в спектрах.",
      advice: ["D сохраняет валентность H, но увеличивает массу молекулы.", "Для большего обогащения выберите несколько H и нажмите D↑ ещё раз."]
    };
  }
  return {
    equation: materialized ? "R-H -> R-T" : "R-H + T -> R-T + H",
    uses: "Тритиевые метки используют как учебный пример трассировки; в реальности T радиоактивен и требует строгого контроля.",
    advice: ["T сохраняет валентность H, но заметно повышает массу.", "Используйте T* как метку отдельного положения, а H↺ для возврата."]
  };
}

export function materializeImplicitIsotope(symbol) {
  const analysis = analyzeMolecule();
  const selectedSet = new Set(labState.selectedAtomIds);
  const reports = [...analysis.atomMap.values()];
  const report = reports.find((item) => selectedSet.has(item.atom.id) && item.implicitH > 0)
    || reports.find((item) => item.implicitH > 0);
  if (!report) return null;
  return addAtomAttached(symbol, report.atom.id, nextAttachmentAngle(report.atom.id), symbol === "T" ? 78 : 76);
}

export function nextAttachmentAngle(atomId) {
  const atom = getAtom(atomId);
  const neighbors = neighborsOf(atomId).map(getAtom).filter(Boolean);
  if (!atom || !neighbors.length) return -Math.PI / 2;
  const angles = neighbors.map((neighbor) => Math.atan2(neighbor.y - atom.y, neighbor.x - atom.x)).sort((a, b) => a - b);
  let bestAngle = angles[0] + Math.PI;
  let bestGap = 0;
  for (let i = 0; i < angles.length; i++) {
    const current = angles[i];
    const next = angles[(i + 1) % angles.length] + (i === angles.length - 1 ? Math.PI * 2 : 0);
    const gap = next - current;
    if (gap > bestGap) {
      bestGap = gap;
      bestAngle = current + gap / 2;
    }
  }
  return bestAngle;
}
