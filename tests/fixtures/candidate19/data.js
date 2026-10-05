// Static game data: catalog, market, tuning. Pure data — no DOM, no rendering.
// Numbers are tuning values (GDD §61): they are deliberately centralized here.

export const MIN_PER_DAY = 1440;
export const TICKS_PER_SEC_1X = 24;          // 1x = one game day per real minute
export const BILLING_CYCLE_DAYS = 30;
export const OFFICE_HOURS = [8, 18];
export const ACCESS_HOURS = [6, 22];
export const FLOOR_H = 1.9;                  // world units per floor

// Ground layer codes
export const G = { GRASS: 0, ASPHALT: 1, CONCRETE: 2, STREET: 3, LOADING: 4, PARKING: 5, SIDEWALK: 6 };
export const VEH_GROUND = new Set([G.ASPHALT, G.STREET, G.LOADING, G.PARKING]);
export const PED_GROUND = new Set([G.ASPHALT, G.CONCRETE, G.LOADING, G.PARKING, G.SIDEWALK]);

// Unit sizes: frontage (cells along the door face) x depth (cells). 1 cell = 5 ft.
export const SIZES = {
  '5x5':  { w: 1, d: 1, sqft: 25 },
  '5x10': { w: 1, d: 2, sqft: 50 },
  '10x10':{ w: 2, d: 2, sqft: 100 },
  '10x20':{ w: 2, d: 4, sqft: 200 },
};
export const SIZE_KEYS = Object.keys(SIZES);

// Market — Maple Street (suburban). Monthly street rents.
export const MARKETS = {
  maple: {
    name: 'Vista suburban',
    rent: { '5x5': 75, '5x10': 118.75, '10x10': 187.5, '10x20': 325 },
    climatePremium: 1.35,
    upperFloorDiscount: 0.92,
    // prospects per day by size at market price (all environments)
    demand: { '5x5': 0.35, '5x10': 0.7, '10x10': 0.8, '10x20': 0.35 },
    climateShare: 0.3,
    settled: 0.4, // after the tutorial the pent-up local backlog is gone: steady-state demand for a small facility
  },
  urban: {
    name: 'Dense urban infill',
    rent: { '5x5': 106.25, '5x10': 168.75, '10x10': 268.75, '10x20': 450 },
    climatePremium: 1.3,
    upperFloorDiscount: 0.95,
    demand: { '5x5': 1.3, '5x10': 1.8, '10x10': 1.3, '10x20': 0.35 },
    climateShare: 0.6,
  },
  rural: {
    name: 'Rural highway corridor',
    rent: { '5x5': 56.25, '5x10': 87.5, '10x10': 137.5, '10x20': 237.5 },
    climatePremium: 1.3,
    upperFloorDiscount: 0.9,
    demand: { '5x5': 0.3, '5x10': 0.7, '10x10': 1.1, '10x20': 1.0 },
    climateShare: 0.15,
  },
  blank: {
    name: 'Growing suburban parcel',
    rent: { '5x5': 81.25, '5x10': 125, '10x10': 200, '10x20': 343.75 },
    climatePremium: 1.4,
    upperFloorDiscount: 0.92,
    demand: { '5x5': 0.8, '5x10': 1.4, '10x10': 1.6, '10x20': 0.7 },
    climateShare: 0.35,
  },
};

// Build catalog (GDD §9 / §47 palette categories)
export const CATEGORIES = [
  { id: 'site',     name: 'Site' },
  { id: 'roads',    name: 'Roads & Loading' },
  { id: 'buildings',name: 'Buildings' },
  { id: 'units',    name: 'Units' },
  { id: 'interior', name: 'Interior' },
  { id: 'security', name: 'Access & Security' },
  { id: 'utilities',name: 'Utilities' },
  { id: 'amenities',name: 'Customer Amenities' },
  { id: 'logistics',name: 'Carts' },
  { id: 'edit',     name: 'Edit' },
];

// shape: 'rect' drag rectangle, 'row' drag line of repeated units, 'tap' single placement
export const TOOLS = {
  aisle:   { cat: 'roads', name: 'Drive Aisle', shape: 'rect', costPerCell: 45, desc: 'Paved vehicle circulation. Drive-up doors need aisle frontage.' },
  loading: { cat: 'roads', name: 'Loading Zone', shape: 'rect', costPerCell: 60, desc: 'Marked stalls where interior customers stop to unload.' },
  parking: { cat: 'roads', name: 'Parking', shape: 'rect', costPerCell: 40, desc: 'Office/customer parking stalls.' },
  walk:    { cat: 'roads', name: 'Walkway', shape: 'rect', costPerCell: 25, desc: 'Concrete pedestrian apron.' },
  canopy:  { cat: 'roads', name: 'Covered Canopy', shape: 'rect', costPerCell: 140, desc: 'Weather-protected loading. Must touch a building.' },

  office:  { cat: 'site', name: 'Office', shape: 'tap', cost: 9000, fw: 5, fd: 4, desc: 'Reception, leasing and customer service. Required to open.' },
  gate:    { cat: 'site', name: 'Entrance Gate', shape: 'tap', cost: 4500, desc: 'Street-connected vehicle gate with keypad. Place on the front fence line.' },

  shell1:  { cat: 'buildings', name: 'Building Shell (1 floor)', shape: 'rect', costPerCell: 32, floors: 1, desc: 'Enclosed interior space. Earns nothing until fit out.' },
  shell2:  { cat: 'buildings', name: 'Building Shell (2 floors)', shape: 'rect', costPerCell: 58, floors: 2, desc: 'Two-floor shell. Floor 2 needs an elevator.' },

  hall:    { cat: 'interior', name: 'Hallway', shape: 'rect', costPerCell: 12, desc: 'Pedestrian/cart network inside a building. 1 cell = standard, 2+ = wide.' },
  doorStd: { cat: 'interior', name: 'Standard Door', shape: 'tap', cost: 650, doorKind: 'std', desc: 'Basic exterior door. Slow for carts.' },
  doorWide:{ cat: 'interior', name: 'Wide Sliding Door', shape: 'tap', cost: 1800, doorKind: 'wide', desc: 'Loading entrance. Good cart throughput.' },
  doorAuto:{ cat: 'interior', name: 'Automatic Wide Door', shape: 'tap', cost: 3600, doorKind: 'auto', desc: 'Fastest entrance. Uses power, needs service.' },
  elevator:{ cat: 'interior', name: 'Elevator', shape: 'tap', cost: 9500, desc: 'Freight elevator serving all floors. Carts consume capacity.' },
  stairs:  { cat: 'interior', name: 'Stairwell', shape: 'tap', cost: 2800, desc: 'Walk-up access between floors. People only - carts still need an elevator.' },

  light:   { cat: 'security', name: 'Light', shape: 'tap', cost: 350, radius: 3.2, desc: 'Illuminates hallways and lots. Dark halls cannot open.' },
  camera:  { cat: 'security', name: 'Camera', shape: 'tap', cost: 800, radius: 5.5, desc: 'Visible coverage improves security quality.' },
  keypad:  { cat: 'security', name: 'Door Keypad', shape: 'tap', cost: 900, desc: 'Controlled access at a building entrance.' },

  hvac:    { cat: 'utilities', name: 'HVAC Plant', shape: 'tap', cost: 4200, capacity: 60, desc: 'Serves the adjacent building. Capacity in climate cells.' },
  power:   { cat: 'utilities', name: 'Electrical Service Upgrade', shape: 'tap', cost: 6500, kw: 40, desc: 'Transformer pad. Adds 40 kW of utility capacity for the whole property.' },
  water:   { cat: 'utilities', name: 'Water Service', shape: 'tap', cost: 2400, desc: 'Plumbing hookup beside a building. Restrooms and fountains inside need it.' },

  restroom:{ cat: 'amenities', name: 'Restroom', shape: 'tap', cost: 5200, desc: 'Customer restroom off a hallway. Needs water service and regular cleaning.' },
  fountain:{ cat: 'amenities', name: 'Water Fountain', shape: 'tap', cost: 900, desc: 'Small comfort touch on a hallway. Needs water service.' },

  corral:  { cat: 'logistics', name: 'Cart Corral', shape: 'tap', cost: 250, desc: 'Home for carts. Place near loading and elevators.' },

  demolish:{ cat: 'edit', name: 'Demolish', shape: 'tap', desc: 'Remove an unoccupied asset. Consequences shown first.' },
};
// Units (drive-up + interior) generated
for (const s of SIZE_KEYS) {
  const base = { '5x5': 420, '5x10': 620, '10x10': 980, '10x20': 1650 }[s];
  TOOLS['du' + s] = { cat: 'units', name: `Drive-Up ${s}`, shape: 'row', unit: true, access: 'drive', size: s, cost: base, desc: 'Direct vehicle access. Door must face a drive aisle.' };
  TOOLS['iu' + s] = { cat: 'units', name: `Interior ${s}`, shape: 'row', unit: true, access: 'interior', size: s, cost: Math.round(base * 0.55), desc: 'Inside a building. Door must face a hallway.' };
}

export const CART_COST = 180;
export const CLIMATE_COST_MULT = 1.35;

// Staff (GDD §28)
export const ROLES = {
  owner:  { name: 'Owner',  wage: 0,  workHours: 8, can: ['makeready', 'clean', 'carts', 'repair_simple', 'office'] },
  // Daily wages are tuned for the first-facility economy. Staffing should trade profit for capacity
  // without making the first useful hire an automatic loss.
  porter: { name: 'Porter', wage: 12.5, workHours: 8, can: ['makeready', 'clean', 'carts'] },
  tech:   { name: 'Tech',   wage: 20, workHours: 8, can: ['repair_simple', 'repair_complex'] },
  clerk:  { name: 'Clerk',  wage: 15, can: ['office'] },
  manager:{ name: 'Manager',wage: 25, can: [] },
};

// Operating cost (per day)
// Power (GDD §22): utility service -> capacity -> powered assets. kW per operating asset.
export const POWER = {
  base: { maple: 40, blank: 30, urban: 36, rural: 26 },
  load: { office: 2, gate: 1, keypad: 0.15, doorAuto: 0.8, light: 0.2, camera: 0.05, elevator: 10, hvac: 12, restroom: 0.4, fountain: 0.2 },
  // when demand exceeds capacity, lower-priority loads are shed first (last in this list = shed first)
  priority: ['office', 'gate', 'keypad', 'doorAuto', 'light', 'camera', 'elevator', 'hvac', 'restroom', 'fountain'],
};

export const OPEX = {
  base: 18, perUnit: 0.25, light: 0.5, camera: 0.35, keypad: 0.4, doorAuto: 1.2,
  elevator: 5, hvacPlant: 3, hvacPerClimateCell: 0.18, gate: 1.0, restroom: 1.5, fountain: 0.3, power: 1.0,
};

// Work durations (game minutes)
export const WORK = {
  makeready: 150, clean: 60, carts: 20, repair_light: 70, repair_keypad: 110, repair_door: 110,
  repair_camera: 80, repair_elevator: 260, repair_hvac: 260, repair_gate: 140, pm: 60, clean_restroom: 40, repair_fountain: 60,
};

export const NAMES_FIRST = ['Ana','Ben','Carla','Dev','Elena','Frank','Grace','Hector','Iris','Jamal','Kim','Luis','Maya','Nate','Olga','Priya','Quinn','Rosa','Sam','Tara','Uma','Victor','Wes','Ximena','Yusuf','Zoe','Marco','Leah','Omar','Jen'];
export const NAMES_LAST = ['Alvarez','Brooks','Chen','Diaz','Evans','Flores','Garcia','Hughes','Ito','Johnson','Kowalski','Lopez','Martin','Nguyen','Ortiz','Patel','Reyes','Singh','Torres','Walker'];

// Operator career (company progression). Requirements are portfolio-wide.
export const TIERS = [
  { n: 1, name: 'Owner-operator', roll: 0, props: 1, perks: ['Suburban parcels and operating facilities for sale'] },
  { n: 2, name: 'Local operator', roll: 4375, props: 1, perks: ['Rush contractors: pay 25% more, build twice as fast', 'Priority vendor contract: repairs in ~5 hours instead of ~10'] },
  { n: 3, name: 'Regional operator', roll: 8750, props: 2, perks: ['Urban infill and rural highway parcels', 'Better loan rate (6.5%)'] },
  { n: 4, name: 'Portfolio operator', roll: 18750, props: 3, perks: ['Bulk purchasing: operating costs -8%', 'Premium marketing: +10% shopper traffic'] },
  { n: 5, name: 'Storage magnate', roll: 37500, props: 4, perks: ['Top of the industry. Keep growing.'] },
];

