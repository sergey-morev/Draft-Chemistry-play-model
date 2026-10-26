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
    logReaction(reactionResult(false, "Формула не разобрана", parsed.error || resolved.error, {
      advice: ["Пример записи: C8H11NO2, CH3CH2OH, Fe2(SO4)3, NaCl, «поваренная соль», «серная кислота», SMILES: CCO."]
    }), labState.lastAnalysis, labState.lastAnalysis);
    triggerReactionEffect(labState.lastAnalysis, { success: false, title: "ошибка формулы" });
    return;
  }
  const before = analyzeMolecule();
  buildMoleculeFromFormula(parsed.counts, parsed.formula, resolved);
  if (formulaInput) formulaInput.value = resolved.commonName || resolved.displayFormula || parsed.formula;
  if (smilesInput) smilesInput.value = labState.compoundMeta?.smiles || "";
  analyzeAndRender();
  requestRdkitCheck();
  logReaction(reactionResult(true, resolved.commonName ? "Вещество построено" : "Формула построена", `Создана модель ${resolved.commonName || parsed.formula}.`, {
    equation: parsed.formula,
    uses: resolved.note || formulaUseHint(parsed.counts, parsed.formula),
    advice: formulaBuildAdvice(parsed.counts)
  }), before, labState.lastAnalysis);
  triggerReactionEffect(labState.lastAnalysis, { success: true, title: "формула построена" });
}

export function applySmilesInput(rawSmiles, meta = null) {
  const resolved = meta || { smiles: String(rawSmiles || "").trim(), commonName: "", className: "SMILES", note: "" };
  const smiles = String(resolved.smiles || rawSmiles || "").trim();
  const parsed = parseSimpleSmiles(smiles);
  if (!parsed.ok) {
    logReaction(reactionResult(false, "SMILES не разобран", parsed.error, {
      advice: ["Поддержаны базовые SMILES: CCO, c1ccccc1, O=C=O, OS(=O)(=O)O. Для сложных молекул RDKit проверит запись, если загрузился."]
    }), labState.lastAnalysis, labState.lastAnalysis);
    triggerReactionEffect(labState.lastAnalysis, { success: false, title: "ошибка SMILES" });
    requestRdkitCheck(smiles, resolved);
    return;
  }
  const before = analyzeMolecule();
  buildMoleculeFromSmiles(parsed, smiles, resolved);
  if (formulaInput) formulaInput.value = labState.compoundMeta.commonName || labState.compoundMeta.sourceFormula || smiles;
  if (smilesInput) smilesInput.value = smiles;
  analyzeAndRender();
  requestRdkitCheck();
  logReaction(reactionResult(true, "SMILES построен", `Создана структура ${resolved.commonName || smiles}.`, {
    equation: smiles,
    uses: resolved.note || "SMILES задает не только состав, но и порядок связей: поэтому CCO, c1ccccc1 и O=C=O строятся точнее, чем по одной формуле.",
    advice: ["Сравните блок «Наша учебная оценка» и «Проверка RDKit» справа.", "Если RDKit не загрузился, лаборатория продолжает работать в локальном учебном режиме."]
  }), before, labState.lastAnalysis);
  triggerReactionEffect(labState.lastAnalysis, { success: true, title: "SMILES построен" });
}
