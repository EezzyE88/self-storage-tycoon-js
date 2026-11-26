// FCPR Rev 1 in-code regulations register (D6, REG-1). Frozen data only: nothing here is
// read by the simulation. tests/headless/tregulations.mjs checks that every refusal and every
// opening issue the game produces maps to an entry, and that categories are honoured.
//
// Categories (FCPR §2):
//   1 mandatory construction/placement regulation   -> plan 'invalid'
//   2 opening or operational requirement            -> openingIssues / readiness / removal protection, never a build refusal
//   3 nonbinding recommendation                     -> 'incomplete', warnings, guidance
//   4 unrestricted player choice                    -> nothing
//   5 current technical limitation                  -> plan 'invalid', worded as a limitation
//   0 not a construction rule (economy, operations, scripted content)
// stems: stable starts of the player messages produced for the rule (empty for rules with no message).
// test: the headless test that exercises the rule.
const R = (id, cat, stems, requirement, test, disp) => Object.freeze({ id, cat, stems: Object.freeze(stems), requirement, test, disp });
export const LIMITATION_REVIEW = 'Cat 5 stems are listed for limitation-wording review (REG-2 d).';

export const REGULATIONS = Object.freeze([
  // 4.0 All tools
  R('ALL-1', 1, ['Outside the property line', 'Off the map'], 'Legal property boundary', 'tregulations', 'Keep'),
  R('ALL-2', 1, ['Blocked: overlaps', 'Something is already here', 'Already one here', 'Blocked', 'Nothing to change here'], 'Physical: one structure per cell', 'tregulations', 'Keep'),
  R('ALL-3', 1, ['No floor here', 'This building has no floor'], 'Physical: floors must exist', 'tregulations', 'Keep'),
  R('ALL-4', 1, ['Reserved by the committed vertical package'], 'Construction safety in an active vertical upgrade', 'tvert', 'Keep'),
  R('ALL-5', 1, ['Not enough cash'], 'Economy integrity (hard cash at Confirm)', 'tregulations', 'Keep'),
  R('ALL-6', 0, [], 'Accepted control: manual Pause on review', 'tsecurity_line', 'Keep'),
  R('ALL-7', 1, ['Choose another spot. Building here would block customer access'], 'Accessibility of operating units (found by REG-2 sweep; existing behavior)', 'tregulations', 'Keep (register addition)'),
  R('ALL-8', 1, ['Unknown tool'], 'Physical: tool must exist', 'tregulations', 'Keep (register addition)'),
  // 4.1 Drive Aisle
  R('AIS-1', 5, ['Blocked: surface already paved'], 'Repaving model (ground is one layer)', 'tregulations', 'Relabel'),
  R('AIS-2', 1, ['Blocked: overlaps a building or unit'], 'Physical', 'tregulations', 'Keep'),
  R('AIS-3', 3, ['Not connected to an existing drive aisle', 'Not connected yet - add an Entrance Gate'], 'Efficiency', 'tsecurity_line', 'SL-1 (counts public-lot driveways)'),
  R('AIS-4', 3, ['open unit'], 'Advice; Cat 2 effect on units', 'tregulations', 'Keep'),
  // 4.2 Loading and Parking
  R('PRK-1', 5, ['Loading Zone must be painted on a drive aisle', 'Parking must be painted on a drive aisle'], 'Paint-on-paving model (FO-2)', 'tregulations', 'Relabel'),
  R('PRK-2', 3, ['No building entrance nearby'], 'Efficiency', 'tregulations', 'Keep'),
  R('PRK-3', 3, [], 'Advice (as AIS-4)', 'tregulations', 'Keep'),
  R('PRK-4', 2, ['Office needs customer Parking in the public lot'], 'R0 security and access: classic customers park on public bays', 'tsecurity_line', 'SL-1'),
  // 4.3 Walkway
  R('WLK-1', 5, [], 'Ground-layer model (shares the AIS-1 message)', 'tregulations', 'Relabel'),
  R('WLK-2', 3, [], 'Advice', 'tregulations', 'Keep'),
  // 4.4 Canopy
  R('CAN-1', 1, ['Canopy must cover paved loading or walkway cells'], 'Physical support', 'tregulations', 'Keep'),
  R('CAN-2', 1, ['Canopy must touch a building'], 'Structural attachment', 'tregulations', 'Keep'),
  R('CAN-3', 1, ['Already covered'], 'Physical', 'tregulations', 'Keep'),
  // 4.5 Office
  R('OFF-1', 5, ['Offices must be built on the ground floor.'], 'Upper-floor offices not modeled', 'tregulations', 'Relabel'),
  R('OFF-2', 5, ['Blocked: office needs clear unpaved land'], 'Building over paving not modeled (FO-3)', 'tregulations', 'Relabel'),
  R('OFF-3', 5, ['This property already has an office'], 'Single-office model (FO-4)', 'tregulations', 'Relabel'),
  R('OFF-4', 1, ['Wait for people and vehicles to clear the office footprint.'], 'Safety', 'tregulations', 'Keep'),
  R('OFF-5', 1, ['Office entrance needs a clear outdoor pedestrian landing', 'Office door needs pavement in front of it'], 'Physical access to the door', 'tregulations', 'Keep'),
  R('OFF-6', 0, [], 'Deleted by SL-1 (forced sequence; violated R0)', 'tsecurity_line', 'SL-1 (deleted)'),
  R('OFF-7', 1, ['Keep the vehicle lanes and gate approach clear.', 'Connect the office entrance to the public sidewalk.', 'Provide a public parking bay with vehicle entry and exit', 'Connect a separate staff door to the secured yard.', 'Keep this area clear for the', 'Keep a public walkway', 'Keep a driveable public parking bay', 'Keep a secured staff route', 'Keep the parking and return route', 'Keep a secured return route'], 'R0 on authored frontage sites (scripted geometry)', 'tfrontage', 'Keep'),
  R('OFF-8', 1, ['Face the office door into the public lot, in front of the security line.', 'Your gate is on the front row, so there is no public lot.'], 'R0 security: customers never enter the yard', 'tsecurity_line', 'SL-1'),
  R('OFF-9', 2, ['Office needs customer Parking in the public lot'], 'R0 access: a public bay with an all-public walk to the door', 'tsecurity_line', 'SL-1'),
  R('OFF-10', 2, ['Office needs a staff route into the yard'], 'Operation: staff reach the yard', 'tsecurity_line', 'SL-1'),
  R('OFF-11', 2, ['Connect an operating secured gate to the street before building the office.', 'Connect the office entrance to parking with an outdoor pedestrian route.', 'Provide a parking bay reachable by vehicles through the secured gate.', 'Office entrance needs a clear outdoor pedestrian landing.'], 'Preserve existing facilities (D2): legacy yard office opening rule', 'tsecurity_line_equiv', 'SL-1'),
  R('OFF-12', 0, [], 'Operations (not construction)', 'n/a', 'Keep'),
  // 4.6 Entrance Gate
  R('GAT-1', 5, ['Gates go on the front fence line, facing the street', 'For now a gate needs at least one yard row behind it.'], 'Straight-line model: a yard row must exist behind the line (frontage sites keep the front fence)', 'tsecurity_line', 'SL-1 (any row; sets the line)'),
  R('GAT-1a', 3, ['A gate on the front row leaves no public lot'], 'Advice', 'tsecurity_line', 'SL-1'),
  R('GAT-2', 5, ['This property already has two entrance gates'], 'Gate-access stage 2A', 'tregulations', 'Relabel'),
  R('GAT-3', 1, ['Too close to the property corner'], 'Physical (3-cell lane)', 'tregulations', 'Keep'),
  R('GAT-4', 1, ['Blocked: gate lane overlaps a structure'], 'Physical', 'tregulations', 'Keep'),
  R('GAT-5', 3, ['Gate has no drive aisle behind it yet'], 'Efficiency', 'tregulations', 'Keep'),
  R('GAT-6', 1, ['A yard gate needs a secure street-facing spot'], 'R0 on authored sites', 'tfrontage', 'Keep'),
  R('GAT-7', 1, ['Keep the vehicle lanes and gate approach clear.'], 'Traffic safety', 'tfrontage', 'Keep'),
  R('GAT-8', 5, ['For now all gates sit on one security line.'], 'Straight-line model', 'tsecurity_line', 'SL-1'),
  R('GAT-9', 5, ['For now the line can only move while the lot is empty of vehicles and people.'], 'Mid-trip rerouting not modeled', 'tsecurity_line', 'SL-1'),
  R('GAT-10a', 1, ['Storage must stay inside the secured yard.'], 'Owner: storage only inside the secured yard', 'tsecurity_line', 'SL-1'),
  R('GAT-10b', 1, ['This line would put the office door inside the secured yard.'], 'R0 security', 'tsecurity_line', 'SL-1'),
  R('GAT-11', 3, ['No drive from the street to this gate yet.'], 'Efficiency (Cat 2 at opening as GAT-12)', 'tsecurity_line', 'SL-1'),
  R('GAT-12', 2, ['Main gate is not connected to the street'], 'Tenant access', 'tsecurity_line', 'Keep (classic: through the public lot)'),
  R('GAT-13', 0, [], 'Retired on classic lots (D4); code removed, no frontage use', 'tfirst_gate_guidance', 'SL-1 (retired)'),
  // 4.7 Shell
  R('SHL-1', 5, ['Buildings must be at least 3x3 cells'], 'Interior hall and unit model', 'tregulations', 'Relabel'),
  R('SHL-2', 5, ['Blocked: would sit on a drive aisle'], 'Ground-layer model (FO-3)', 'tregulations', 'Relabel'),
  R('SHL-3', 1, ['Blocked: overlaps another structure'], 'Physical', 'tregulations', 'Keep'),
  R('SHL-4', 3, ['Needs hallway, units, a door and lights to earn rent'], 'Advice', 'tregulations', 'Keep'),
  R('SHL-5', 1, ['Storage buildings go inside the secured yard.'], 'Owner: storage only inside the secured yard', 'tsecurity_line', 'SL-1'),
  // 4.8 Hallway
  R('HAL-1', 1, ['Hallways must be inside a building'], 'Physical', 'tregulations', 'Keep'),
  R('HAL-2', 5, ['Hallway spans two buildings'], 'Separate building networks', 'tregulations', 'Relabel'),
  R('HAL-3', 1, ['Blocked: overlaps a unit, elevator, stairwell or restroom'], 'Physical', 'tregulations', 'Keep'),
  // 4.9 Doors
  R('DOR-1', 1, ['Doors go on a building wall, on a hallway cell', 'Not on an exterior wall'], 'Physical', 'tregulations', 'Keep'),
  R('DOR-2', 1, ['Exterior doors are on the ground floor'], 'Physical', 'tregulations', 'Keep'),
  R('DOR-3', 1, ['The inside of this door needs a hallway (build one first)'], 'Physical (passes the sequence test)', 'tregulations', 'Keep'),
  R('DOR-4', 1, ['A door is already here'], 'Physical', 'tregulations', 'Keep'),
  R('DOR-5', 3, ['Door opens onto grass - pave a walkway or loading zone'], 'Advice; Cat 2 via unit route', 'tregulations', 'Keep'),
  R('DOR-6', 1, ['Storage doors must open into the secured yard.'], 'Security: no bypass into storage', 'tsecurity_line', 'SL-1'),
  // 4.10 Elevator and Stairwell
  R('VRT-1', 1, ['Elevators go inside a building', 'Stairwells go inside a building'], 'Physical', 'tregulations', 'Keep'),
  R('VRT-2', 1, ['This building has only one floor'], 'Physical', 'tregulations', 'Keep'),
  R('VRT-3', 1, ['An elevator is already here', 'Already a shaft or stairwell here'], 'Physical', 'tregulations', 'Keep'),
  R('VRT-4', 3, ['No hallway beside the shaft on floor', 'No hallway beside the stairs on floor'], 'Advice; Cat 2 via unit route', 'tregulations', 'Keep'),
  // 4.11 Units
  R('UNT-1', 5, ['Blocked: would sit on a drive aisle'], 'Ground-layer model (FO-3)', 'tregulations', 'Relabel'),
  R('UNT-2', 1, ['Interior units must be inside a building', 'Row spans two buildings', 'Blocked: overlaps a hallway, unit, elevator, stairwell or restroom'], 'Physical / row model', 'tregulations', 'Keep / Relabel'),
  R('UNT-3', 1, ['Unit door must face a hallway (build the hallway first)'], 'Physical access (passes the sequence test)', 'tregulations', 'Keep'),
  R('UNT-4', 3, ['Door faces no drive aisle yet'], 'Advice', 'tregulations', 'Keep'),
  R('UNT-5', 3, ['Floor ', 'Interior route', 'Hallway is dark - add a light', 'Climate zone has no HVAC capacity', 'HVAC capacity would be exceeded', 'Building has no entrance door'], 'Advice', 'tregulations', 'Keep'),
  R('UNT-6', 2, ['Door must face a drive aisle connected to the gate', 'Unit door faces the property edge', 'HVAC capacity exceeded for this zone'], 'Tenant access and operation (readiness)', 'tregulations', 'Keep'),
  R('UNT-7', 1, ['Storage units go inside the secured yard.'], 'Owner: rentable units only inside the secured yard (initially)', 'tsecurity_line', 'SL-1'),
  R('UNT-8', 0, [], 'Economy', 'n/a', 'Keep'),
  // 4.12 Security fixtures
  R('SEC-1', 1, ['Mount it in a hallway, not inside a unit'], 'Physical', 'tregulations', 'Keep'),
  R('SEC-2', 5, ['Exterior fixtures go on the ground level'], 'Upper exterior mounts not modeled', 'tregulations', 'Relabel'),
  R('SEC-3', 1, ['Blocked'], 'Physical', 'tregulations', 'Keep'),
  R('SEC-4', 1, ['Tap a building door', 'This door already has a keypad'], 'Physical', 'tregulations', 'Keep'),
  R('SEC-5', 0, [], 'Scripted: accepted owner rule Nov 24', 'n/a', 'Keep'),
  R('SEC-6', 1, [], 'Tenant safety, accepted SI-1', 'tsecurity_integrity', 'Keep'),
  R('SEC-7', 0, [], 'Operation', 'n/a', 'Keep'),
  R('SEC-8', 4, [], 'Player choice: lights and cameras in the public lot', 'tsecurity_line', 'SL-1 (explicit)'),
  // 4.13 Utilities
  R('UTL-1', 5, ['Utility pads go on open ground', 'HVAC pads go on open ground'], 'Ground-layer model', 'tregulations', 'Relabel'),
  R('UTL-2', 1, ['HVAC must sit directly beside a building', 'Water service must sit directly beside a building'], 'Physical connection', 'tregulations', 'Keep'),
  R('UTL-3', 5, ['This building already has water service'], 'One hookup per building', 'tregulations', 'Relabel'),
  R('UTL-4', 3, ['Power'], 'Advice', 'tregulations', 'Keep'),
  R('UTL-5', 4, [], 'Player choice: utilities in the public lot', 'tsecurity_line', 'SL-1 (explicit)'),
  // 4.14 Amenities
  R('AMN-1', 1, ['Restrooms go inside a building, off a hallway', 'Needs an empty cell beside a hallway (not on it)', 'The restroom door must open onto a hallway', 'Hallway under construction here'], 'Physical', 'tregulations', 'Keep'),
  R('AMN-2', 1, ['Fountains go on a built hallway'], 'Physical', 'tregulations', 'Keep'),
  R('AMN-3', 3, ['Building has no water service'], 'Advice; Cat 2 for operation', 'tregulations', 'Keep'),
  // 4.15 Corral
  R('COR-1', 1, ['Corrals go on a walkway, loading pad or hallway'], 'Physical (cart reach)', 'tregulations', 'Keep'),
  R('COR-2', 1, ['Already a corral here'], 'Physical', 'tregulations', 'Keep'),
  R('COR-3', 4, [], 'Player choice: corrals in the public lot', 'tsecurity_line', 'SL-1 (explicit)'),
  // 4.16 Vertical upgrade
  R('VUP-1', 1, ['Select a completed interior building.', "Finish this building's existing construction first.", 'Finish the freight elevator first.'], 'Construction safety', 'tvert', 'Keep'),
  R('VUP-2', 5, ['Prototype maximum is three floors.'], 'Floor model', 'tvert', 'Relabel'),
  R('VUP-3', 1, [], 'Physical / layout-copy model', 'tvert', 'Keep / Relabel'),
  R('VUP-4', 1, ['Occupied units will not be removed.'], 'Tenant protection', 'tvert', 'Keep'),
  // 4.17 Demolish (removal review). Messages vary with the asset; stems are the shared openings.
  R('REM-1', 1, ['A current customer or worker would lose their path', 'A customer or worker is using this asset', 'A person is on the selected surface', 'A scheduled trip references this asset', 'Cancel this unit’s upgrade installation', 'Finish or cancel assigned service work', 'Finish or cancel this building’s construction', 'Finish or Cancel construction/installation for', 'Remove the asset on this surface first', 'Remove the fixture or shaft supported', 'Resolve work on this floor', 'Select a completed hallway cell', 'Select an editable cell', 'Select an exact asset', 'Select player-editable paving', 'Select the highest completed upper floor', 'The selected asset no longer exists', 'The selected cart no longer exists', 'This door has no installed keypad', 'This is not a player-built removable asset', 'Use Cancel installation', 'Wait for', 'Occupied or reserved — resolve the lease/reservation', 'Would remove ', 'Cart corral #'], 'Safety and state integrity (people, trips, orders, leases and carts)', 'tuniversal_remove', 'Keep'),
  R('REM-2', 2, ['Keep required access to', 'Keep working freight access', 'Keep working HVAC capacity'], 'Operation', 'tuniversal_remove', 'Keep'),
  R('REM-3', 2, ['Keep required customer access to the office and entrance', 'Keep a customer route to the existing office door'], 'Operation and R0', 'tuniversal_remove', 'Keep'),
  R('REM-4', 2, ['Last necessary access'], 'Operation', 'tuniversal_remove', 'Keep'),
  R('REM-5', 2, [], 'R0 on authored sites (lostMapleAccess, shares OFF-7 wording)', 'tfrontage', 'Keep'),
  // 4.18 Opening requirements
  R('OPN-1', 2, ['Main gate is not connected to the street'], 'Tenant access', 'tsecurity_line', 'Keep (classic: through the public lot)'),
  R('OPN-2', 2, ['No operating office'], 'Operation', 'tsecurity_line', 'Keep'),
  R('OPN-3', 2, ['Office needs a secured staff passage into the yard.', 'Office needs a public walk and driveable public parking.'], 'R0 on authored frontage sites', 'tfrontage', 'Keep'),
  R('OPN-4', 2, ['Office needs customer Parking in the public lot', 'Office needs a staff route into the yard'], 'R0 (OFF-9, OFF-10) or legacy OFF-11', 'tsecurity_line', 'SL-1'),
  R('OPN-5', 2, ['Office door has no customer route'], 'Legacy non-general office customer route', 'tsecurity_line_equiv', 'Keep'),
  R('OPN-6', 2, ['No operating rent-ready units'], 'Operation', 'tsecurity_line', 'Keep'),
]);

// Entries whose stems start a message (longest stem wins, so specific rules beat generic ones).
export function regulationFor(msg, filter = () => true) {
  let best = null;
  for (const r of REGULATIONS) if (filter(r)) for (const st of r.stems) if (msg.startsWith(st) && (!best || st.length > best.len)) best = { r, len: st.length };
  return best?.r || null;
}
