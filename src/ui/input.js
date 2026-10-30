import { analyzeMolecule } from "../chemistry/analysis.js";
import { buildMoleculeFromFormula, formulaBuildAdvice, formulaUseHint } from "../chemistry/builders.js";
import { parseFormula, resolveSubstanceInput } from "../chemistry/formula.js";
import { buildMoleculeFromSmiles, parseSimpleSmiles } from "../chemistry/smiles.js";
import { triggerReactionEffect } from "../render/effects.js";
import { requestRdkitCheck } from "../services/rdkit.js";
import { analyzeAndRender } from "../simulation/update.js";
import { state as labState } from "../state.js";
import { formulaInput, smilesInput } from "./dom.js";
import { logReaction, reactionResult } from "./journal.js";

export function applyFormulaInput(rawFormula) {
  const resolved = resolveSubstanceInput(rawFormula);
  if (resolved.type === "smiles") {
    if (formulaInput) formulaInput.value = resolved.label;
    if (smilesInput) smilesInput.value = resolved.smiles;
    applySmilesInput(resolved.smiles, resolved);
    return;
  }
  const parsed = parseFormula(resolved.formula);
  if (!parsed.ok) {
    logReaction(reactionResult(false, "Formula could not be parsed", parsed.error || resolved.error, {
      advice: ["Examples: C8H11NO2, CH3CH2OH, Fe2(SO4)3, NaCl, table salt, sulfuric acid, or SMILES: CCO."]
    }), labState.lastAnalysis, labState.lastAnalysis);
    triggerReactionEffect(labState.lastAnalysis, { success: false, title: "formula error" });
    return;
  }
  const before = analyzeMolecule();
  buildMoleculeFromFormula(parsed.counts, parsed.formula, resolved);
  if (formulaInput) formulaInput.value = resolved.commonName || resolved.displayFormula || parsed.formula;
  if (smilesInput) smilesInput.value = labState.compoundMeta?.smiles || "";
  analyzeAndRender();
  requestRdkitCheck();
  logReaction(reactionResult(true, resolved.commonName ? "Substance built" : "Formula built", `Model created: ${resolved.commonName || parsed.formula}.`, {
    equation: parsed.formula,
    uses: resolved.note || formulaUseHint(parsed.counts, parsed.formula),
    advice: formulaBuildAdvice(parsed.counts)
  }), before, labState.lastAnalysis);
  triggerReactionEffect(labState.lastAnalysis, { success: true, title: "formula built" });
}

export function applySmilesInput(rawSmiles, meta = null) {
  const resolved = meta || { smiles: String(rawSmiles || "").trim(), commonName: "", className: "SMILES", note: "" };
  const smiles = String(resolved.smiles || rawSmiles || "").trim();
  const parsed = parseSimpleSmiles(smiles);
  if (!parsed.ok) {
    logReaction(reactionResult(false, "SMILES could not be parsed", parsed.error, {
      advice: ["Basic supported SMILES include CCO, c1ccccc1, O=C=O and OS(=O)(=O)O. If available, RDKit can check more complex notation."]
    }), labState.lastAnalysis, labState.lastAnalysis);
    triggerReactionEffect(labState.lastAnalysis, { success: false, title: "SMILES error" });
    requestRdkitCheck(smiles, resolved);
    return;
  }
  const before = analyzeMolecule();
  buildMoleculeFromSmiles(parsed, smiles, resolved);
  if (formulaInput) formulaInput.value = labState.compoundMeta.commonName || labState.compoundMeta.sourceFormula || smiles;
  if (smilesInput) smilesInput.value = smiles;
  analyzeAndRender();
  requestRdkitCheck();
  logReaction(reactionResult(true, "SMILES structure built", `Structure created: ${resolved.commonName || smiles}.`, {
    equation: smiles,
    uses: resolved.note || "SMILES specifies connectivity as well as composition, so CCO, c1ccccc1 and O=C=O convey more structural information than a formula alone.",
    advice: ["Compare the heuristic assessment and RDKit reference check in the inspector.", "If RDKit is unavailable, the sandbox continues in local teaching mode."]
  }), before, labState.lastAnalysis);
  triggerReactionEffect(labState.lastAnalysis, { success: true, title: "SMILES built" });
}
