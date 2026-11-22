// OP-01: presentation-only calculation. All values are read from current derived state.
// Full service by a Tech/vendor restores condition to 1 but does not fix power.
export function hvacRepairOutlook(sim, plant, ratedCapacity) {
  if (!plant || plant.type !== 'hvac' || plant.cstate !== 'operating') return null;
  const zone = sim.D?.hvac?.[plant.serves];
  if (!zone) return null;
  const currentCapacity = zone.cap;
  const load = zone.load;
  const base = ratedCapacity;
  // Same per-plant formula as Sim.rebuild. Zone capacity is only re-derived on a rebuild, and wear below 45%
  // does not trigger one, so rebuild the post-repair total from live plants instead of adjusting zone.cap.
  const plantCapacity = (p) => p.unpowered ? 0 : base * (p.cond < 0.2 ? 0.25 : p.cond < 0.45 ? 0.8 : 1);
  const others = (zone.plants || []).filter(id => id !== plant.id).map(id => sim.s?.objects?.[id]);
  if (others.some(p => !p)) return null;
  const servicedPlantCapacity = plant.unpowered ? 0 : base;
  const repairedCapacity = others.reduce((sum, p) => sum + (p.cstate === 'operating' ? plantCapacity(p) : 0), servicedPlantCapacity);
  const otherPlants = others.length;
  return {
    currentCapacity, load, repairedCapacity, otherPlants,
    unpowered: !!plant.unpowered,
    shortageNow: Math.max(0, load - currentCapacity),
    shortageAfter: Math.max(0, load - repairedCapacity),
    gain: Math.max(0, repairedCapacity - currentCapacity),
  };
}

export function hvacRepairOutlookText(outlook) {
  if (!outlook) return 'Repair effect cannot be estimated from current zone data.';
  const x = outlook;
  const num = n => Number(n.toFixed(1)).toLocaleString('en-US');
  const peers = x.otherPlants ? ` This zone also has ${x.otherPlants} other operating HVAC ${x.otherPlants === 1 ? 'plant' : 'plants'}.` : '';
  if (x.unpowered) return `This plant has no power. Repairing it alone will not restore climate capacity; check electrical service first.${peers}`;
  if (x.gain < 1e-6) return x.shortageNow > 1e-6
    ? `This plant is already providing its full capacity; servicing it will not fix the zone's ${num(x.shortageNow)}-cell shortage.${peers}`
    : `Current climate capacity covers the zone's load. Full service would not increase capacity right now.${peers}`;
  if (x.shortageNow <= 1e-6) return `Capacity meets current load. Full service would increase available capacity from ${num(x.currentCapacity)} to ${num(x.repairedCapacity)} cells, but there is no current capacity shortage.${peers}`;
  if (x.shortageAfter <= 1e-6) return `Climate load exceeds current capacity by ${num(x.shortageNow)} cells. Full service of this plant could cover that shortage if it stays powered.${peers}`;
  return `Climate load exceeds current capacity by ${num(x.shortageNow)} cells. Full service would improve capacity to ${num(x.repairedCapacity)} cells, but ${num(x.shortageAfter)} cells would still be short.${peers}`;
}
