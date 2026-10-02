// Player-facing reference for the current build catalog. Keep this aligned with data.js and sim placement rules.
export const BUILD_GUIDE = {
  aisle: { how: 'Press and hold, then drag pavement from the entrance network toward drive-up rows and loading areas. New aisle segments should connect to the existing vehicle network.', why: 'Vehicles and drive-up customers need connected paved circulation.', when: 'Build this before drive-up units, or whenever a new wing has no vehicle route.' },
  loading: { how: 'Paint a loading zone on existing paved vehicle surface near a building entrance.', why: 'Interior customers need a practical place to stop and unload.', when: 'Use it when adding interior storage or when customer walking/loading convenience is poor.' },
  parking: { how: 'Paint parking stalls on existing paved vehicle surface near the office or customer destination.', why: 'Provides dedicated customer and office parking instead of using circulation space.', when: 'Add it around the office or when a developed site needs clearer customer circulation.' },
  walk: { how: 'Press and hold, then drag concrete pedestrian space between destinations.', why: 'Customers and staff need walkable access to offices and entrances.', when: 'Use it to connect the office or building entrances to the accessible site network.' },
  canopy: { how: 'Drag it over paved loading or apron cells so the canopy touches a building.', why: 'Protects loading activity from weather.', when: 'Useful once an interior building has an established loading area.' },

  office: { how: 'Press and hold an open-ground location for the office footprint, then connect its entrance to pedestrian access.', why: 'The office handles reception, leasing and customer service and is required before opening a property.', when: 'Build one early on a new facility.' },
  gate: { how: 'Place it on the front fence line where the property meets the street, then connect a drive aisle behind it.', why: 'It is the controlled vehicle entrance and is required before opening.', when: 'Build it at the beginning of a new property and route vehicle circulation from it.' },

  shell1: { how: 'Press and hold, then drag a rectangle on open land. Fit the finished shell with halls, units, an entrance and lights.', why: 'Creates enclosed space for interior units.', when: 'Use it when land is available and interior capacity makes sense without vertical construction.' },
  shell2: { how: 'Drag a two-floor building footprint on open land, then fit out both levels. Floor 2 needs elevator access for practical rentable storage.', why: 'Adds more rentable area without consuming as much land.', when: 'Use it when land is becoming scarce or vertical expansion is worth the extra infrastructure.' },

  hall: { how: 'Drag hallway cells inside a building shell. Connect unit doors, entrances and vertical circulation.', why: 'Hallways are the pedestrian and cart network for interior storage.', when: 'Build them before interior units can become rent-ready.' },
  doorStd: { how: 'Place it on a valid exterior wall of a building with interior circulation behind it.', why: 'Provides basic customer access to the building, but carts pass through slowly.', when: 'Use for lower-volume entrances where cost matters more than throughput.' },
  doorWide: { how: 'Place it on a valid exterior building wall serving a hallway and loading route.', why: 'A wider loading entrance improves cart throughput.', when: 'Use at primary loading entrances for interior storage.' },
  doorAuto: { how: 'Place it like a wide door on an exterior wall and ensure electrical capacity is available.', why: 'It is the fastest entrance but consumes power.', when: 'Use at busy loading entrances when convenience justifies the cost and power draw.' },
  elevator: { how: 'Place the shaft inside a multi-floor building with hallway access on both floors.', why: 'Moves customers and carts between floors; upper-floor cart access depends on it.', when: 'Use whenever Floor 2 is intended to function as practical rentable storage.' },
  stairs: { how: 'Place inside a multi-floor shell beside hallways on both floors.', why: 'Provides people-only access between floors.', when: 'Use as supplementary vertical access; it does not replace an elevator for carts.' },

  light: { how: 'Place lights along exterior lots or interior halls; use the Security overlay to find dark areas.', why: 'Dark halls cannot open and lighting contributes to security.', when: 'Add before commissioning dark interior areas and anywhere customer or security quality is weak.' },
  camera: { how: 'Place cameras so their coverage overlaps customer and unit areas; check the Security overlay.', why: 'Visible camera coverage improves security quality.', when: 'Use around entrances, loading zones and poorly covered unit areas.' },
  keypad: { how: 'Place the upgrade on an existing building entrance door.', why: 'Adds controlled access to the building.', when: 'Use when an interior building needs stronger access control.' },

  hvac: { how: 'Place the plant on open ground directly beside the building it will serve.', why: 'Climate-controlled units require HVAC capacity.', when: 'Build before commissioning climate-controlled interior units and expand capacity when the zone is full.' },
  power: { how: 'Place the electrical service pad on open ground.', why: 'Adds 40 kW of property-wide electrical capacity. If demand exceeds capacity, lower-priority equipment is shed.', when: 'Add when the power readout approaches its limit or before heavy loads such as elevators and HVAC.' },
  water: { how: 'Place the hookup on open ground directly beside the building it serves.', why: 'Restrooms and water fountains need a water connection.', when: 'Build before adding plumbing-dependent amenities.' },

  restroom: { how: 'Place it in an empty building cell beside a hallway. The building needs water service.', why: 'Improves customer comfort but adds cleaning and operating needs.', when: 'Use in developed interior facilities where customer experience justifies the space and upkeep.' },
  fountain: { how: 'Place it on a built hallway in a building with water service.', why: 'Adds a small customer-comfort amenity.', when: 'Use after core storage and access needs are handled and you want to improve the interior experience.' },

  corral: { how: 'Place on a walkway, loading apron or hallway near where carts are used.', why: 'Gives carts a home and reduces wasted walking and search time.', when: 'Use near loading entrances and elevators once interior customers begin using carts.' },

  demolish: { how: 'Select Demolish, then press and hold the removable asset. The game shows consequences before confirmation.', why: 'Lets you correct or redevelop the property.', when: 'Use when an unoccupied asset is misplaced, obsolete or blocking a better layout.' },
};

export function guideFor(key, tool) {
  if (BUILD_GUIDE[key]) return BUILD_GUIDE[key];
  if (tool && tool.unit && tool.access === 'drive') return {
    how: 'Press and hold, then drag a row. The highlighted frontage edge must face a connected drive aisle; use Flip doors if needed.',
    why: 'Creates ' + tool.size + ' storage with direct vehicle access. Larger units use more land but serve customers needing more space.',
    when: 'Use when your market needs ' + tool.size + ' capacity and you have enough aisle frontage and land.',
  };
  if (tool && tool.unit && tool.access === 'interior') return {
    how: 'Inside a building, press and hold then drag a row. Unit doors must face a built hallway. Climate can be enabled if the building has HVAC capacity.',
    why: 'Creates ' + tool.size + ' interior storage while using enclosed building space efficiently.',
    when: 'Use when your market needs ' + tool.size + ' capacity and you have hallway access; choose climate when demand supports the premium.',
  };
  return { how: tool ? tool.desc : '', why: tool ? tool.desc : '', when: 'Use when this function is needed by the layout or operation.' };
}
