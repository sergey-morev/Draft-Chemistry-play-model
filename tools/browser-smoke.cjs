const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.CHEMISTRY_URL || "http://127.0.0.1:4180";
const out = path.resolve(process.env.CHEMISTRY_TEST_OUTPUT || path.join(__dirname, "../test-results"));
fs.mkdirSync(out,{recursive:true});
(async () => {
  const browser = await chromium.launch({ ...(process.env.CHEMISTRY_BROWSER_EXECUTABLE ? { executablePath: process.env.CHEMISTRY_BROWSER_EXECUTABLE } : {}), headless: true });
  const page = await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];
  page.on("pageerror",e=>errors.push(e.stack));
  await page.route(/https:\/\/(unpkg.com|pubchem.ncbi.nlm.nih.gov)/,route=>route.abort());
  await page.goto(base);
  await page.waitForSelector(".atom-group",{timeout:15000});
  await page.screenshot({path:path.join(out,"desktop-initial.png")});
  console.log("INITIAL", await page.locator("#atomCount").innerText(), errors);
  if(errors.length) throw new Error(errors.join("; "));
  const result={checks:[],viewports:[]};
  async function check(name,fn) { await fn(); result.checks.push(name); console.log("PASS",name); }
  await check("name and glucose geometry",async()=>{
    await page.locator("#formulaInput").fill("глюкоза");
    await page.locator("#formulaInput").press("Enter");
    if(!/глюкоза/i.test(await page.locator("#compoundInfo").innerText())) throw new Error("Glucose name missing");
    if(Number(await page.locator("#atomCount").innerText())<20) throw new Error("Glucose not expanded");
  });
  await check("reference popup and resize",async()=>{
    await page.locator("#openReference").click();
    if(!await page.locator("#referenceModal").isVisible()) throw new Error("Reference hidden");
    if((await page.locator("#referenceBody").innerText()).length<500) throw new Error("Reference too short");
    const before=await page.locator(".reference-dialog").boundingBox();
    const handle=await page.locator(".resize-se").boundingBox();
    await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);
    await page.mouse.down(); await page.mouse.move(handle.x+45,handle.y+25); await page.mouse.up();
    const after=await page.locator(".reference-dialog").boundingBox();
    if(after.width<=before.width) throw new Error("Resize did not work");
    await page.screenshot({path:path.join(out,"reference.png")});
    await page.locator("#closeReference").click();
  });
  await check("SMILES CCO",async()=>{
    await page.locator("#smilesInput").fill("CCO"); await page.locator("#buildSmiles").click();
    if((await page.locator("#formulaLine").innerText())!=="C2H6O") throw new Error("CCO wrong formula");
  });
  await check("fragments and undo redo",async()=>{
    const before=Number(await page.locator("#atomCount").innerText());
    await page.locator('[data-fragment="ring5"]').click();
    if(Number(await page.locator("#atomCount").innerText())!==before+5) throw new Error("Ring missing");
    await page.locator("#undoAction").click();
    if(Number(await page.locator("#atomCount").innerText())!==before) throw new Error("Undo broken");
    await page.locator("#redoAction").click();
    if(Number(await page.locator("#atomCount").innerText())!==before+5) throw new Error("Redo broken");
  });
  await check("atom selection, isotope and charge controls",async()=>{
    await page.locator('[data-mode="select"]').click();
    await page.locator(".atom-circle").first().click();
    if(!await page.locator("#selectionInfo").isVisible()) throw new Error("Selection tab hidden");
    const before=await page.locator("#selectionInfo").innerText();
    await page.locator("#isotopePlus").click();
    if(before===await page.locator("#selectionInfo").innerText()) throw new Error("Isotope control broken");
    await page.locator("#chargePlus").click();
  });
  await check("periodic table",async()=>{
    await page.locator("#openPeriodicTable").click();
    const count=await page.locator("#periodicDialog .element-tile").count();
    if(count!==120) throw new Error("Periodic grid missing: "+count);
    await page.locator("#closePeriodicTable").click();
    await page.waitForSelector(".element-panel .element-tile");
    if(await page.locator(".element-panel .element-tile").count()!==120) throw new Error("Palette not restored");
  });
  await check("sound and relaxation",async()=>{
    await page.locator("#audioToggle").click();
    if(await page.locator("#audioToggle").getAttribute("aria-pressed")!=="false") throw new Error("Audio toggle broken");
    await page.locator("#runPhysics").click();
    await page.waitForTimeout(350);
    await page.locator("#runPhysics").click();
  });
  await check("panel resizing",async()=>{
    const before=await page.locator(".element-panel").boundingBox();
    const handle=await page.locator(".splitter-left").boundingBox();
    await page.mouse.move(handle.x+2,handle.y+50); await page.mouse.down();
    await page.mouse.move(handle.x+35,handle.y+50); await page.mouse.up();
    if((await page.locator(".element-panel").boundingBox()).width<=before.width) throw new Error("Splitter failed");
  });
  await check("save open roundtrip and invalid-file rejection",async()=>{
    const snapshot=await page.evaluate(async()=>{ const {snapshotMolecule}=await import("/src/simulation/history.js"); return {format:"chemistry-play-model",version:1,molecule:snapshotMolecule()}; });
    await page.locator("#modelFile").setInputFiles({name:"model.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(snapshot))});
    await page.waitForFunction(()=>/opened|Could not/.test(document.getElementById("workspaceStatus").textContent));
    if(!/opened/.test(await page.locator("#workspaceStatus").innerText())) throw new Error("Import failed: "+await page.locator("#workspaceStatus").innerText());
    const bad=structuredClone(snapshot); bad.molecule.atoms[0].symbol="<script>";
    await page.locator("#modelFile").setInputFiles({name:"bad.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(bad))});
    await page.waitForFunction(()=>/Could not/.test(document.getElementById("workspaceStatus").textContent));
    if(!/Could not/.test(await page.locator("#workspaceStatus").innerText())) throw new Error("Bad import accepted");
  });
  await check("deuterium, catalyst reaction and metal coordination",async()=>{
    await page.locator("#formulaInput").fill("D2O"); await page.locator("#formulaInput").press("Enter");
    if(await page.locator('[data-atom-id] .atom-label').filter({hasText:/^D$/}).count()!==2) throw new Error("D2O isotope model missing");
    await page.locator("#smilesInput").fill("C=C"); await page.locator("#buildSmiles").click();
    await page.locator('[data-dock-tab="catalysts"]').click();
    await page.locator('[data-catalyst="ni"]').click();
    await page.locator('[data-dock-tab="reactions"]').click();
    await page.locator("#reactionButtons button").filter({hasText:"H2 + C=C"}).click();
    if(await page.locator("#formulaLine").innerText()!=="C2H6") throw new Error("Hydrogenation failed");
    await page.locator("#clearAll").click();
    await page.locator('[data-dock-tab="fragments"]').click();
    await page.locator('[data-fragment="dota"]').click();
    await page.locator('[data-dock-tab="isotopes"]').click();
    await page.locator("#isotopeButtons button").filter({hasText:/^177Lu$/}).click();
    const coordination=await page.evaluate(async()=>{ const {state}=await import("/src/state.js"); return {bonds:state.bonds.filter(bond=>bond.order==="coordination").length,metal:state.atoms.find(atom=>atom.symbol==="Lu")}; });
    if(coordination.bonds<4 || !coordination.metal?.chelatedBy) throw new Error("Metal coordination failed");
    await page.locator('[data-inspector-tab="compound"]').click();
    await page.locator("#validationSummary [data-enable-rdkit]").click();
    await page.waitForFunction(async()=>{ const {state}=await import("/src/state.js"); return state.rdkitStatus==="недоступен"; });
  });
  await check("local save and SVG export",async()=>{
    const jsonDownload=page.waitForEvent("download"); await page.locator("#saveModel").evaluate(button=>button.click());
    const json=await jsonDownload; if(json.suggestedFilename()!=="molecule.json") throw new Error("Save not offered");
    const svgDownload=page.waitForEvent("download"); await page.locator("#exportSvg").evaluate(button=>button.click());
    const svg=await svgDownload; if(svg.suggestedFilename()!=="molecule.svg") throw new Error("SVG export not offered");
  });
  await page.locator("#formulaInput").fill("глюкоза"); await page.locator("#formulaInput").press("Enter");
  await page.locator('[data-inspector-tab="compound"]').click();
  await page.locator('[data-dock-tab="fragments"]').click();
  for(const [width,height] of [[1920,1080],[1366,768],[1024,768],[390,844]]) {
    await page.setViewportSize({width,height});
    await page.locator("#resetLayout").evaluate(button=>button.click());
    await page.screenshot({path:path.join(out,`workspace-${width}.png`)});
    const metrics=await page.evaluate(()=>{
      const shell=document.querySelector(".app-shell"), stage=document.getElementById("stage").getBoundingClientRect();
      return {scrollWidth:document.documentElement.scrollWidth,width:innerWidth,scrollHeight:document.documentElement.scrollHeight,height:innerHeight,stageWidth:stage.width,stageHeight:stage.height,shellHeight:shell.getBoundingClientRect().height};
    });
    if(metrics.scrollWidth>width+1 || metrics.scrollHeight>height+1 || metrics.stageHeight<100 || metrics.stageWidth<180) throw new Error("Bad viewport "+JSON.stringify(metrics));
    result.viewports.push({width,height,...metrics});
  }
  if(errors.length) throw new Error(errors.join("; "));
  result.status="PASS";result.pageErrors=errors;
  fs.writeFileSync(path.join(out,"browser-results.json"),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
  await browser.close();
})().catch(error=>{ console.error(error); process.exit(1); });
