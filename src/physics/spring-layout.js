// Educational spring layout, not molecular dynamics or a thermodynamic prediction.
export function relaxStep(atoms, bonds, { targetLength, bondWeight, center = { x: 500, y: 360 } }) {
  const byId = new Map(atoms.map(atom => [atom.id, atom]));
  const connected = new Set(bonds.map(bond => pairKey(bond.a, bond.b)));
  atoms.forEach(atom => { atom.fx = 0; atom.fy = 0; });
  bonds.forEach(bond => {
    const a = byId.get(bond.a), b = byId.get(bond.b);
    if (!a || !b) return;
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.max(1, Math.hypot(dx, dy));
    const force = (d - targetLength(bond)) * 0.012 * bondWeight(bond.order);
    const fx = dx / d * force, fy = dy / d * force;
    a.fx += fx; a.fy += fy; b.fx -= fx; b.fy -= fy;
  });
  for (let i = 0; i < atoms.length; i++) {
    for (let j = i + 1; j < atoms.length; j++) {
      const a = atoms[i], b = atoms[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d2 = Math.max(80, dx * dx + dy * dy), d = Math.sqrt(d2);
      const force = (connected.has(pairKey(a.id, b.id)) ? 38 : 1450) / d2;
      const fx = dx / d * force, fy = dy / d * force;
      a.fx -= fx; a.fy -= fy; b.fx += fx; b.fy += fy;
    }
  }
  const count = Math.max(1, atoms.length);
  const current = atoms.reduce((sum, atom) => ({ x: sum.x + atom.x / count, y: sum.y + atom.y / count }), { x: 0, y: 0 });
  atoms.forEach(atom => {
    atom.fx += (center.x - current.x) * 0.0007;
    atom.fy += (center.y - current.y) * 0.0007;
    atom.vx = ((atom.vx || 0) + atom.fx) * 0.82;
    atom.vy = ((atom.vy || 0) + atom.fy) * 0.82;
    atom.x = Math.max(24, Math.min(976, atom.x + atom.vx));
    atom.y = Math.max(24, Math.min(696, atom.y + atom.vy));
  });
}

function pairKey(a, b) { return a < b ? `${a}:${b}` : `${b}:${a}`; }
