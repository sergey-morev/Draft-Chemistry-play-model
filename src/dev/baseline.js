import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { relaxStep } from "../physics/spring-layout.js";

const atoms = [{ id:1,x:400,y:360,vx:0,vy:0 }, { id:2,x:600,y:360,vx:0,vy:0 }];
const bonds = [{ id:1,a:1,b:2,order:1 }];
const options = { targetLength: () => 100, bondWeight: () => 1 };
for (let step = 0; step < 250; step++) relaxStep(atoms,bonds,options);
assert.ok(atoms.every(atom => [atom.x,atom.y,atom.vx,atom.vy].every(Number.isFinite)));
assert.ok(Math.abs(atoms[1].x-atoms[0].x-100) < 1);
assert.ok(Math.abs((atoms[0].x+atoms[1].x)/2-500) < 1e-8);
relaxStep([],[],options);
const overlapping = [{id:1,x:500,y:350},{id:2,x:500,y:350}];
relaxStep(overlapping, [], options);
assert.ok(overlapping.every(atom => Number.isFinite(atom.x)));
const kernel = readFileSync(new URL("../physics/spring-layout.js", import.meta.url),"utf8");
assert.ok(!/\b(document|window|requestAnimationFrame)\b/.test(kernel));
let files = 0;
function checkTree(url) {
  for (const item of readdirSync(url,{withFileTypes:true})) {
    const child = new URL(item.name+(item.isDirectory()?"/":""),url);
    if (item.isDirectory()) checkTree(child);
    else if (item.name.endsWith(".js")) {
      const code = readFileSync(child,"utf8");
      assert.ok(!/[\u00d0\u00d1\u00c3]/.test(code), `Mojibake in ${child.pathname}`);
      for (const [,relative] of code.matchAll(/from\s+["'](\.[^"']+)["']/g)) assert.ok(readFileSync(new URL(relative,child)), relative);
      files++;
    }
  }
}
checkTree(new URL("../",import.meta.url));
console.log(JSON.stringify({status:"PASS",sourceModules:files,relaxedLength:Math.abs(atoms[1].x-atoms[0].x),checks:["spring convergence","finite coordinates","symmetric center","empty input","DOM-free kernel","local import paths","UTF-8"]},null,2));
