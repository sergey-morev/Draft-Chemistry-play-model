import { isHydrogenLike, isotopeLabel } from "./properties.js";
import { bondHasSymbols, getAtom } from "../simulation/graph.js";
import { state as labState } from "../state.js";
import { catalystLabel } from "../ui/controls.js";
import { buildStabilizationSuggestions, displayFormula } from "../ui/inspector.js";
import { formatCompactCount, signed, stabilityText } from "../utils/format.js";

export function describeCompound(analysis) {
  const counts = analysis.counts;
  const formula = displayFormula(analysis) || "empty model";
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
  const tags = [`formula ${formula}`, `${stabilityText(analysis.score)} ${analysis.score}%`, `catalyst: ${catalystLabel()}`];
  const tips = [];
  let kind = "inorganic";
  let summary = "A short description will appear after you add atoms.";

  if (!labState.atoms.length) {
    return { title: "No compound", kind: "empty", summary, tags: ["add an atom"], tips: ["Select an element on the left, then place it in the workspace."] };
  }

  if (labState.compoundMeta?.commonName) {
    kind = labState.compoundMeta.className || (labState.compoundMeta.condensed ? "biomacromolecule sketch" : "known substance");
    summary = `${labState.compoundMeta.commonName}: ${labState.compoundMeta.note || "substance from the local catalog."}`;
    tips.push("You can enter this substance by its legacy Russian name, formula or supported SMILES.");
  } else if (hasChelator) {
    kind = chelatedMetals.length ? "radiometal chelate sketch" : "chelator sketch";
    summary = chelatedMetals.length
      ? `The model places metal ${chelatedMetals.map((atom) => atom.radioisotope || isotopeLabel(atom)).join(", ")} among the chelator's N/O donors; real complex formation is not established.`
      : "The chelator sketch is ready: try adding Lu-177, Y-90, Cu-67, Ac-225 or another modeled radiometal.";
    tips.push("Use Place metal at center to put the selected metal in the coordination sketch.");
  } else if (labState.compoundMeta?.bioName && labState.compoundMeta.bioName !== "пользовательская формула") {
    kind = labState.compoundMeta.condensed ? "biomacromolecule sketch" : "bio-organic sketch";
    summary = `${labState.compoundMeta.bioName}: ${labState.compoundMeta.condensed ? "a compact composition map is shown because a full atom drawing would be too large." : "a small bio-organic structure is shown as a bond sketch."}`;
    tips.push("Change the formula above, or use Fe↔Cu to explore modeled metal substitutions; biological equivalence is not implied.");
  } else if (o === 1 && c === 0 && h === 0 && d === 2 && t === 0) {
    kind = "heavy water";
    summary = "D2O has the same modeled valence pattern as water, with greater mass from deuterium.";
    tips.push("Use H↺ to compare it with ordinary water in the model.");
  } else if (o === 1 && c === 0 && t > 0) {
    kind = "tritiated water";
    summary = "Water containing T shows where the tritium label is placed in this model.";
    tips.push("Tritium is radioactive; here it is only an illustrative label.");
  } else if (analysis.aromaticRings > 0) {
    kind = halogensCount ? "halogenated aromatic sketch" : "aromatic sketch";
    summary = halogensCount ? "The model identifies an aromatic ring with a halogen substituent; its chemical role needs review." : "The model identifies an aromatic ring; electron delocalization is the relevant teaching concept.";
    tips.push("Try adding substituents at available C-H positions and check carbon valence warnings.");
  } else if (c > 0 && hasTripleCC) {
    kind = "alkyne";
    summary = "Contains a C≡C triple bond; this fragment is modeled with a more nearly linear geometry.";
    tips.push("Explore stepwise reduction of the triple-bond order as an illustrative hydrogenation exercise.");
  } else if (c > 0 && hasDoubleCC) {
    kind = "alkene";
    summary = "Contains a C=C double bond; the model offers illustrative hydrogenation, bromination and hydration examples.";
    tips.push("Try the modeled H2 + C=C, Br2 + C=C or H2O + C=C examples.");
  } else if (c > 0 && hasOH) {
    kind = "alcohol/phenol-like fragment";
    summary = "An O-H bond can affect polarity and hydrogen-bonding behavior; the exact structure needs review.";
    tips.push("Replace H in O-H with D to add a modeled isotope label.");
  } else if (c > 0) {
    kind = "organic";
    summary = "A carbon framework with single bonds can be used to explore functional groups.";
    tips.push("Add O, N, a halogen or C=C to explore different modeled fragments.");
  } else {
    summary = "This model has no carbon framework; its heuristic score depends in part on valence and charge.";
    tips.push("Check whether H, D and T have no more than one modeled bond each.");
  }

  if (isotopeTotal > 0) {
    tags.push(`D/T isotopes: ${isotopeTotal}`);
    tips.push("D/T change modeled mass while retaining hydrogen's modeled valence.");
  }
  if (isotopeLabels.length > 0) {
    tags.push(...isotopeLabels);
    tips.push("A± changes the displayed mass number; V± changes the target valence in this model.");
  }
  if (hasChelator) {
    tags.push(chelatedMetals.length ? "metal in chelator sketch" : "empty chelator sketch");
    tips.push("The chelator view illustrates metal placement; it is not a synthesis or application guide.");
  }
  if (analysis.strainEnergy > 10) {
    tags.push("layout strain estimate");
    tips.push("Use Relax graph layout or increase the spacing between atoms in the drawing.");
  }
  if (analysis.totalCharge !== 0) {
    tags.push(`charge ${signed(analysis.totalCharge, true)}`);
    tips.push("Adjust the selected atom's charge with +/− in the model.");
  }
  if (labState.compoundMeta?.condensed) {
    tags.push(`atoms ${formatCompactCount(labState.compoundMeta.totalAtoms)}`);
    tips.push("Circles marked ×N represent groups of that element in a large formula sketch.");
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
