'use strict';
// ---------------------------------------------------------------------------
// The species catalogue. Every animal has a real length (ft) and weight (lb);
// the game derives its on-screen size, how big a crocodile can swallow it, and
// how much it feeds you. Colors and proportions feed the procedural rigs.
// ---------------------------------------------------------------------------
const SPECIES = {};
function def(id, o) { o.id = id; SPECIES[id] = o; return o; }
const sizeClassOf = ft => ft / 1.5;
const massOf = lb => 3 * Math.pow(lb, 0.7) + 0.5;

// ------------------------------------------------------------ fish
const F = (id, name, ft, lb, rig, beh) => def(id, Object.assign({ name, ft, lb, rig: 'fish', cat: 'fish' }, rig, beh || {}));
F('minnow', 'MOSQUITOFISH', 0.22, 0.01, { len: 40, h: 0.3, snout: 'blunt', tail: 'round', back: '#7d95a8', mid: '#c4d3dd', belly: '#eef2f4', dark: '#3a4a58', dorsal: 'soft' }, { speed: 45, band: [8, 220], school: [5, 10], flee: 90, layer: -1 });
F('shiner', 'GOLDEN SHINER', 0.4, 0.05, { len: 44, h: 0.3, snout: 'blunt', tail: 'fork', back: '#8a8a50', mid: '#d8c878', belly: '#f4eec8', dark: '#4a4a2a', dorsal: 'soft' }, { speed: 55, band: [8, 160], school: [4, 8], flee: 100, layer: -1 });
F('sunfish', 'SPOTTED SUNFISH', 0.45, 0.25, { len: 40, h: 0.5, snout: 'blunt', tail: 'round', back: '#3a6a3a', mid: '#6a9a4a', belly: '#e0c060', dark: '#1e3a1e', pattern: 'spots', spot: '#d04030', dorsal: 'spiny' }, { speed: 55, band: [12, 200], school: [2, 4], flee: 100 });
F('bluegill', 'BLUEGILL', 0.7, 0.6, { len: 44, h: 0.5, snout: 'blunt', tail: 'round', back: '#2b5230', mid: '#4f8a52', belly: '#d9a83c', dark: '#1c3020', pattern: 'bars', dorsal: 'spiny' }, { speed: 55, band: [15, 260], school: [2, 5], flee: 110 });
F('mullet', 'STRIPED MULLET', 1.2, 2, { len: 50, h: 0.28, snout: 'blunt', tail: 'fork', back: '#5c6f78', mid: '#b9c8ce', belly: '#eef2f4', dark: '#2e3a40', pattern: 'stripe', dorsal: 'soft' }, { speed: 95, band: [8, 90], school: [4, 8], flee: 110, jumper: true });
F('tilapia', 'BLUE TILAPIA', 1.2, 3, { len: 50, h: 0.42, snout: 'blunt', tail: 'round', back: '#4a5a5a', mid: '#8a9a92', belly: '#d0a0a0', dark: '#2a3232', pattern: 'bars', dorsal: 'spiny' }, { speed: 60, band: [15, 220], school: [3, 6], flee: 100 });
F('bass', 'LARGEMOUTH BASS', 1.6, 4, { len: 56, h: 0.34, snout: 'point', tail: 'fork', back: '#33451f', mid: '#607a3a', belly: '#c1c78f', dark: '#1a2410', pattern: 'stripe', dorsal: 'spiny' }, { speed: 85, band: [20, 320], school: [1, 2], flee: 120, aggr: 4, aggrMax: 1.3 });
F('peacock', 'PEACOCK BASS', 1.5, 4, { len: 56, h: 0.36, snout: 'point', tail: 'fork', back: '#3a5a20', mid: '#8ac040', belly: '#e0a020', dark: '#1e3010', pattern: 'bars', dorsal: 'spiny' }, { speed: 105, band: [20, 260], school: [1, 3], flee: 130, aggr: 4, aggrMax: 1.3 });
F('bowfin', 'BOWFIN', 2, 6, { len: 60, h: 0.26, snout: 'blunt', tail: 'round', back: '#2a3a22', mid: '#5a6a42', belly: '#a0a880', dark: '#141c10', pattern: 'blotch', dorsal: 'sail' }, { speed: 70, band: [60, 400], school: [1, 2], flee: 90, aggr: 5, aggrMax: 1.5 });
F('snook', 'COMMON SNOOK', 2.5, 10, { len: 64, h: 0.28, snout: 'point', tail: 'fork', back: '#6a7a6a', mid: '#c0ccc0', belly: '#e8eee8', dark: '#2a3a2a', pattern: 'stripe', dorsal: 'spiny' }, { speed: 120, band: [20, 300], school: [1, 3], flee: 140 });
F('catfish', 'CHANNEL CATFISH', 2, 8, { len: 60, h: 0.3, snout: 'blunt', tail: 'fork', back: '#3a2a1a', mid: '#6b4b2e', belly: '#b09a70', dark: '#1a1008', dorsal: 'spiny', barbels: true }, { speed: 50, band: [200, 900], nearFloor: true, school: [1, 1], flee: 90 });
F('walkingcat', 'WALKING CATFISH', 1.3, 2, { len: 56, h: 0.24, snout: 'blunt', tail: 'eel', back: '#3a3a3a', mid: '#5a5a5a', belly: '#9a9a90', dark: '#1a1a1a', dorsal: 'sail', barbels: true }, { speed: 55, band: [20, 200], school: [1, 3], flee: 80 });
F('flgar', 'FLORIDA GAR', 2.5, 5, { len: 68, h: 0.2, snout: 'gar', tail: 'round', back: '#5a6a3a', mid: '#8a9a5a', belly: '#c0c090', dark: '#2a3418', pattern: 'spots', spot: '#2a3418', dorsal: 'soft' }, { speed: 90, band: [20, 300], school: [1, 3], flee: 100, armor: 6, aggr: 5, aggrMax: 1.6 });
F('gar', 'ALLIGATOR GAR', 6, 120, { len: 72, h: 0.22, snout: 'gar', tail: 'round', back: '#3e4a2e', mid: '#7b8a58', belly: '#b5bb8f', dark: '#1a2010', dorsal: 'soft' }, { speed: 95, band: [30, 400], school: [1, 2], flee: 100, armor: 9, aggr: 7, aggrMax: 2.2 });
F('tarpon', 'TARPON', 5, 80, { len: 68, h: 0.3, snout: 'blunt', tail: 'lunate', back: '#5a6f7a', mid: '#a9bfc8', belly: '#e2ecef', dark: '#2a3a44', dorsal: 'soft' }, { speed: 130, band: [30, 500], school: [1, 3], flee: 160 });
F('eel', 'AMERICAN EEL', 3, 4, { len: 70, h: 0.14, snout: 'point', tail: 'eel', back: '#2a2418', mid: '#5a4a2a', belly: '#b0a070', dark: '#120e08', dorsal: 'none' }, { speed: 80, band: [300, 900], nearFloor: true, school: [1, 1], flee: 80, shock: 6 });
F('snakehead', 'BULLSEYE SNAKEHEAD', 2.5, 6, { len: 64, h: 0.24, snout: 'point', tail: 'round', back: '#4a3a1a', mid: '#8a6a3a', belly: '#c0a070', dark: '#241a08', pattern: 'blotch', dorsal: 'sail', teeth: true }, { speed: 90, band: [20, 200], school: [1, 2], flee: 90, aggr: 6, aggrMax: 1.6 });
F('ladyfish', 'LADYFISH', 1.5, 3, { len: 56, h: 0.22, snout: 'point', tail: 'fork', back: '#4a6a7a', mid: '#b0c8d0', belly: '#f0f4f6', dark: '#243440', dorsal: 'soft' }, { speed: 140, band: [10, 120], school: [3, 6], flee: 150, jumper: true });
F('snapper', 'MANGROVE SNAPPER', 1.2, 2, { len: 48, h: 0.4, snout: 'blunt', tail: 'fork', back: '#6a4a3a', mid: '#a07a60', belly: '#d8c0a0', dark: '#2e1e14', pattern: 'stripe', dorsal: 'spiny' }, { speed: 80, band: [20, 300], school: [2, 5], flee: 110 });
F('sheepshead', 'SHEEPSHEAD', 1.5, 5, { len: 52, h: 0.46, snout: 'blunt', tail: 'fork', back: '#5a5a5a', mid: '#c0c0c0', belly: '#e8e8e8', dark: '#222222', pattern: 'bars', dorsal: 'spiny' }, { speed: 70, band: [20, 300], school: [1, 3], flee: 100 });
F('redfish', 'RED DRUM', 2.5, 12, { len: 64, h: 0.3, snout: 'blunt', tail: 'fork', back: '#8a4a30', mid: '#c08a60', belly: '#e8d0b0', dark: '#3a1e10', pattern: 'spots', spot: '#101010', dorsal: 'spiny' }, { speed: 100, band: [20, 300], school: [1, 3], flee: 120 });
F('grouper', 'GOLIATH GROUPER', 7, 400, { len: 76, h: 0.46, snout: 'blunt', tail: 'round', back: '#4a4030', mid: '#8a7a5a', belly: '#c0b090', dark: '#221c10', pattern: 'blotch', dorsal: 'spiny' }, { speed: 55, band: [400, 900], school: [1, 1], flee: 70, pred: 16 });
F('sawfish', 'SMALLTOOTH SAWFISH', 12, 500, { len: 100, h: 0.2, snout: 'gar', tail: 'fork', back: '#8a8a7a', mid: '#c8c8b8', belly: '#e8e8dc', dark: '#3a3a30', dorsal: 'soft' }, { speed: 110, band: [200, 800], school: [1, 1], flee: 90, aggr: 14, aggrMax: 5 });
F('shark', 'BULL SHARK', 8, 250, { len: 84, h: 0.3, snout: 'point', tail: 'lunate', back: '#6a7f8a', mid: '#9aaeb8', belly: '#d8dfe0', dark: '#2a3a44', dorsal: 'sail', teeth: true }, { speed: 175, band: [60, 800], school: [1, 1], flee: 0, pred: 22 });
F('bonnet', 'BONNETHEAD SHARK', 3.5, 20, { len: 70, h: 0.26, snout: 'blunt', tail: 'lunate', back: '#7a8a8a', mid: '#a8b8b8', belly: '#e0e8e8', dark: '#2a3a3a', dorsal: 'sail', teeth: true }, { speed: 130, band: [40, 400], school: [1, 2], flee: 80, aggr: 8, aggrMax: 2 });
F('dolphin', 'BOTTLENOSE DOLPHIN', 8, 400, { len: 84, h: 0.3, snout: 'point', tail: 'lunate', back: '#4a5a66', mid: '#8a9aa6', belly: '#d8e0e6', dark: '#1e2a34', dorsal: 'sail' }, { speed: 200, band: [30, 400], school: [2, 4], flee: 220, mammal: true, jumper: true });
F('manatee', 'MANATEE', 10, 1000, { len: 92, h: 0.42, snout: 'blunt', tail: 'round', back: '#6a7070', mid: '#8a9090', belly: '#a8aeae', dark: '#2e3434', dorsal: 'none' }, { speed: 30, band: [20, 300], school: [1, 2], flee: 60, mammal: true });

// ------------------------------------------------------------ birds
const B = (id, name, ft, lb, rig, beh) => def(id, Object.assign({ name, ft, lb, rig: 'bird', cat: 'bird' }, rig, beh || {}));
B('heron', 'GREAT BLUE HERON', 2.6, 5, { len: 44, neck: 1, legs: 1, beak: 'spear', body: '#6f8798', belly: '#9fb3c4', head: '#e8e8e0', wing: '#5a7080', beakCol: '#e0b040', legCol: '#4a4a3a', crest: '#1a1a2a' }, { flee: 120, speed: 120, mode: 'wade', hunts: 0.6 });
B('egret', 'GREAT EGRET', 2.2, 2.2, { len: 40, neck: 1, legs: 1, beak: 'spear', body: '#f0f0ea', belly: '#ffffff', head: '#f4f4f0', wing: '#e0e0d8', beakCol: '#e8c040', legCol: '#222222' }, { flee: 120, speed: 115, mode: 'wade', hunts: 0.45 });
B('snowy', 'SNOWY EGRET', 1.6, 0.8, { len: 32, neck: 0.8, legs: 0.9, beak: 'spear', body: '#f4f4f0', belly: '#ffffff', head: '#f8f8f4', wing: '#e4e4dc', beakCol: '#222222', legCol: '#222222' }, { flee: 110, speed: 110, mode: 'wade', hunts: 0.35 });
B('littleblue', 'LITTLE BLUE HERON', 1.8, 0.7, { len: 34, neck: 0.8, legs: 0.9, beak: 'spear', body: '#5a6a8a', belly: '#7a8aa4', head: '#6a4a5a', wing: '#4a5a7a', beakCol: '#8090a0', legCol: '#3a4a3a' }, { flee: 110, speed: 110, mode: 'wade', hunts: 0.35 });
B('tricolor', 'TRICOLORED HERON', 1.9, 0.8, { len: 34, neck: 0.9, legs: 0.9, beak: 'spear', body: '#4a5a6a', belly: '#f0f0f0', head: '#4a5a6a', wing: '#3a4a5a', beakCol: '#e0b040', legCol: '#a0a060' }, { flee: 110, speed: 110, mode: 'wade', hunts: 0.35 });
B('ibis', 'WHITE IBIS', 1.8, 2, { len: 36, neck: 0.6, legs: 0.8, beak: 'curve', body: '#f4f0ea', belly: '#ffffff', head: '#f4f0ea', wing: '#e8e2d8', beakCol: '#d9573a', legCol: '#d9573a' }, { flee: 120, speed: 100, mode: 'wade' });
B('spoonbill', 'ROSEATE SPOONBILL', 2.6, 3.3, { len: 40, neck: 0.6, legs: 0.9, beak: 'spoon', body: '#f0a0b0', belly: '#f8c8d0', head: '#e8e0d8', wing: '#e87a95', beakCol: '#a0a090', legCol: '#c04a60' }, { flee: 130, speed: 100, mode: 'wade' });
B('woodstork', 'WOOD STORK', 3, 5.5, { len: 44, neck: 0.7, legs: 1, beak: 'curve', body: '#f0f0e8', belly: '#ffffff', head: '#3a3a3a', wing: '#2a2a2a', beakCol: '#4a3a2a', legCol: '#2a2a2a' }, { flee: 130, speed: 105, mode: 'wade' });
B('anhinga', 'ANHINGA', 2.8, 3, { len: 40, neck: 1, legs: 0.4, beak: 'spear', body: '#1a1a1a', belly: '#2a2a2a', head: '#3a3a3a', wing: '#2a2a2a', beakCol: '#d0c060', legCol: '#3a3a3a' }, { flee: 100, speed: 105, mode: 'fly', diver: 'swim' });
B('cormorant', 'DOUBLE-CRESTED CORMORANT', 2.7, 4, { len: 42, neck: 0.8, legs: 0.4, beak: 'hook', body: '#1e1e22', belly: '#2e2e32', head: '#2a2a2e', wing: '#2a2a2e', beakCol: '#e0a040', legCol: '#222' }, { flee: 100, speed: 110, mode: 'fly', diver: 'swim' });
B('osprey', 'OSPREY', 2, 3.5, { len: 36, neck: 0.3, legs: 0.5, beak: 'hook', body: '#5a4a3a', belly: '#e8e8e0', head: '#e8e8e0', wing: '#3a2f24', beakCol: '#2a2a2a', legCol: '#d0a020', crest: '#3a2f24' }, { flee: 100, speed: 140, mode: 'fly', diver: 'plunge' });
B('eagle', 'BALD EAGLE', 3, 10, { len: 46, neck: 0.3, legs: 0.5, beak: 'hook', body: '#3a2a1a', belly: '#4a3a2a', head: '#f4f4f0', wing: '#2a1e14', beakCol: '#e8c040', legCol: '#e8c040' }, { flee: 90, speed: 150, mode: 'fly', diver: 'plunge' });
B('pelican', 'BROWN PELICAN', 4, 8, { len: 52, neck: 0.5, legs: 0.4, beak: 'pouch', body: '#8a8a80', belly: '#a8a8a0', head: '#e8e8e0', wing: '#6a6a60', beakCol: '#c0a060', legCol: '#4a4a44' }, { flee: 100, speed: 115, mode: 'fly', diver: 'plunge' });
B('vulture', 'BLACK VULTURE', 2, 4, { len: 40, neck: 0.4, legs: 0.6, beak: 'hook', body: '#1a1a1a', belly: '#2a2a2a', head: '#4a4a4a', wing: '#2a2a2a', beakCol: '#5a5a5a', legCol: '#5a5a5a' }, { flee: 90, speed: 85, mode: 'fly', scavenger: true });
B('limpkin', 'LIMPKIN', 2.2, 2.5, { len: 38, neck: 0.7, legs: 0.9, beak: 'curve', body: '#5a4a34', belly: '#7a6a54', head: '#5a4a34', wing: '#4a3a24', beakCol: '#c0b060', legCol: '#3a3a2a' }, { flee: 110, speed: 100, mode: 'wade' });
B('gallinule', 'PURPLE GALLINULE', 1.1, 0.5, { len: 26, neck: 0.4, legs: 0.7, beak: 'short', body: '#3a2a8a', belly: '#4a6a4a', head: '#4a3a9a', wing: '#3a6a5a', beakCol: '#e0c030', legCol: '#e0e060', crest: '#a0c0e0' }, { flee: 90, speed: 90, mode: 'wade' });
B('duck', 'MOTTLED DUCK', 1.7, 2, { len: 34, neck: 0.3, legs: 0.3, beak: 'short', body: '#6b4a30', belly: '#8a6a4a', head: '#5a4a30', wing: '#4a3a24', beakCol: '#e0a030', legCol: '#e0a030' }, { flee: 80, speed: 95, mode: 'float' });
B('kingfisher', 'BELTED KINGFISHER', 1, 0.3, { len: 22, neck: 0.3, legs: 0.2, beak: 'spear', body: '#3a6a8a', belly: '#f0f0f0', head: '#3a6a8a', wing: '#2a5a7a', beakCol: '#222222', legCol: '#333333', crest: '#2a5a7a' }, { flee: 100, speed: 160, mode: 'fly', diver: 'plunge' });
B('kite', 'SWALLOW-TAILED KITE', 2, 1, { len: 38, neck: 0.3, legs: 0.3, beak: 'hook', body: '#f0f0f0', belly: '#ffffff', head: '#f0f0f0', wing: '#1a1a2a', beakCol: '#222222', legCol: '#333333' }, { flee: 100, speed: 150, mode: 'fly' });
B('owl', 'BARRED OWL', 1.7, 1.5, { len: 30, neck: 0.2, legs: 0.3, beak: 'hook', body: '#7a6a5a', belly: '#c0b0a0', head: '#8a7a6a', wing: '#5a4a3a', beakCol: '#e0c060', legCol: '#c0b090' }, { flee: 90, speed: 100, mode: 'fly', night: true });
B('hawk', 'RED-SHOULDERED HAWK', 1.6, 1.3, { len: 32, neck: 0.3, legs: 0.4, beak: 'hook', body: '#8a5a3a', belly: '#d0a070', head: '#6a4a3a', wing: '#3a3a3a', beakCol: '#222222', legCol: '#e0c040' }, { flee: 100, speed: 140, mode: 'fly' });

// ------------------------------------------------------------ land mammals and reptiles
const Q = (id, name, ft, lb, rig, beh) => def(id, Object.assign({ name, ft, lb, rig: 'quad', cat: 'land' }, rig, beh || {}));
Q('deer', 'WHITE-TAILED DEER', 6, 130, { len: 60, h: 0.42, legs: 1, snout: 0.7, ears: 'long', antlers: true, tail: 'short', tailCol: '#f4f0e8', body: '#a67c52', belly: '#efe6d2', dark: '#4a3420', hoof: '#2a2018' }, { speed: 170, flee: 150, gibs: 5 });
Q('doe', 'WHITE-TAILED DOE', 5.3, 100, { len: 56, h: 0.42, legs: 1, snout: 0.7, ears: 'long', tail: 'short', tailCol: '#f4f0e8', body: '#a67c52', belly: '#efe6d2', dark: '#4a3420', hoof: '#2a2018' }, { speed: 175, flee: 160, gibs: 5 });
Q('raccoon', 'RACCOON', 2.5, 15, { len: 46, h: 0.44, legs: 0.35, snout: 0.6, ears: 'short', mask: true, tail: 'bushy', tailCol: '#8a8a8a', body: '#6e6e6e', belly: '#9a9a9a', dark: '#2a2a2a', pattern: 'none' }, { speed: 110, flee: 90, gibs: 3 });
Q('boar', 'WILD BOAR', 5, 200, { len: 60, h: 0.5, legs: 0.4, snout: 0.9, ears: 'short', tusks: true, tail: 'short', body: '#3a2a20', belly: '#5a4a40', dark: '#1a1410', mane: '#241a14', hoof: '#1a1410' }, { speed: 150, flee: 70, gibs: 5, charge: 16 });
Q('panther', 'FLORIDA PANTHER', 6.5, 120, { len: 66, h: 0.36, legs: 0.7, snout: 0.35, ears: 'short', tail: 'long', tailTip: '#2a2018', body: '#b08a50', belly: '#e0d0b0', dark: '#4a3820', eye: '#40e060' }, { speed: 220, flee: 60, gibs: 5, charge: 22, hunter: true });
Q('bear', 'BLACK BEAR', 5.5, 300, { len: 64, h: 0.58, legs: 0.5, snout: 0.6, ears: 'short', tail: 'none', body: '#2a1e18', belly: '#3a2e28', dark: '#120c08', eye: '#c08030' }, { speed: 130, flee: 50, gibs: 6, charge: 30 });
Q('armadillo', 'NINE-BANDED ARMADILLO', 2.2, 12, { len: 44, h: 0.42, legs: 0.25, snout: 0.9, ears: 'long', tail: 'long', body: '#9a8a70', belly: '#b0a088', dark: '#4a4030', pattern: 'bands' }, { speed: 70, flee: 80, gibs: 3, armor: 6 });
Q('coyote', 'COYOTE', 4, 30, { len: 56, h: 0.4, legs: 0.7, snout: 0.9, ears: 'long', tail: 'bushy', body: '#8a7a5a', belly: '#c0b090', dark: '#3a3020' }, { speed: 180, flee: 90, gibs: 4, charge: 10, hunter: true });
Q('bobcat', 'BOBCAT', 3, 20, { len: 48, h: 0.42, legs: 0.6, snout: 0.3, ears: 'long', tail: 'short', body: '#a08a60', belly: '#e0d8c0', dark: '#3a3020', pattern: 'spots', spot: '#3a3020' }, { speed: 200, flee: 80, gibs: 4, charge: 12, hunter: true });
Q('fox', 'GRAY FOX', 3, 10, { len: 46, h: 0.38, legs: 0.6, snout: 0.8, ears: 'long', tail: 'bushy', tailTip: '#1a1a1a', body: '#7a7a72', belly: '#c8a070', dark: '#2a2a24' }, { speed: 190, flee: 110, gibs: 3, hunter: true });
Q('rabbit', 'MARSH RABBIT', 1.3, 3, { len: 30, h: 0.55, legs: 0.5, snout: 0.3, ears: 'long', tail: 'short', body: '#6a5a44', belly: '#a09080', dark: '#2a2418' }, { speed: 160, flee: 130, gibs: 2 });
Q('opossum', 'VIRGINIA OPOSSUM', 2.5, 8, { len: 44, h: 0.42, legs: 0.3, snout: 1, ears: 'short', tail: 'long', tailCol: '#d0b0a0', body: '#8a8a88', belly: '#c0c0bc', dark: '#3a3a38', head: '#e8e8e4' }, { speed: 80, flee: 70, gibs: 3, night: true });
Q('otter', 'RIVER OTTER', 3.5, 20, { len: 60, h: 0.3, legs: 0.2, snout: 0.5, ears: 'short', tail: 'long', body: '#5a3e2a', belly: '#8a6a4a', dark: '#2a1c12' }, { speed: 150, flee: 180, gibs: 3, swims: true, band: [5, 120] });
Q('nutria', 'NUTRIA', 2, 15, { len: 46, h: 0.44, legs: 0.2, snout: 0.6, ears: 'short', tail: 'long', tailCol: '#3a2a1a', body: '#6a4a2a', belly: '#8a6a4a', dark: '#2a1a0a' }, { speed: 110, flee: 150, gibs: 3, swims: true, band: [4, 60] });
Q('iguana', 'GREEN IGUANA', 4, 10, { len: 50, h: 0.3, legs: 0.3, snout: 0.5, ears: 'none', tail: 'long', tailCol: '#5a7a3a', body: '#7aaa4a', belly: '#a8c870', dark: '#3a5a20', pattern: 'bands', mane: '#5a7a3a' }, { speed: 120, flee: 110, gibs: 3 });
Q('cow', 'FLORIDA CRACKER COW', 8, 900, { len: 76, h: 0.55, legs: 0.8, snout: 0.7, ears: 'short', horns: true, tail: 'long', body: '#8a6a4a', belly: '#c0a888', dark: '#3a2a1a', pattern: 'spots', spot: '#f0e8e0', hoof: '#2a2018' }, { speed: 90, flee: 60, gibs: 6 });
Q('rat', 'SEWER RAT', 0.9, 0.8, { len: 20, h: 0.5, legs: 0.25, snout: 0.9, ears: 'long', tail: 'long', tailCol: '#c09080', body: '#6a5a50', belly: '#9a8a80', dark: '#2a2420', eye: '#e03030' }, { speed: 130, flee: 70, gibs: 2 });
Q('dog', 'CAMP DOG', 3, 60, { len: 48, h: 0.42, legs: 0.7, snout: 0.7, ears: 'short', tail: 'long', body: '#c0a060', belly: '#e8d8b0', dark: '#4a3a20' }, { speed: 200, flee: 90, gibs: 4 });

// ------------------------------------------------------------ people
const P = (id, name, ft, lb, rig, beh) => def(id, Object.assign({ name, ft, lb, rig: 'biped', cat: 'human', len: 60 }, rig, beh || {}));
P('fisherman', 'FISHERMAN', 5.8, 170, { skin: '#e0b090', shirt: '#556b2f', pants: '#3a3a4a', hair: '#3a2a1a', hat: '#8a7a5a', rod: true }, { speed: 130, flee: 110 });
P('tourist', 'TOURIST', 5.6, 160, { skin: '#e0b090', shirt: '#d94a4a', pants: '#3050a0', hair: '#e8d8a0', hat: '#f0f0e0' }, { speed: 140, flee: 200 });
P('poacher', 'POACHER', 5.9, 180, { skin: '#d0a080', shirt: '#4a4a30', pants: '#2a3020', hair: '#5a3a1a', rifle: true }, { speed: 130, flee: 100 });
P('ranger', 'RANGER', 5.8, 170, { skin: '#c09070', shirt: '#4a6a30', pants: '#3a4a28', hair: '#3a2a1a', hat: '#3a5a2a' }, { speed: 140, flee: 130 });
P('kayaker', 'KAYAKER', 5.7, 165, { skin: '#e0b090', shirt: '#e0a020', pants: '#202020', hair: '#2a1a0a' }, {});
P('scientist', 'SCIENTIST', 5.8, 160, { skin: '#e0b090', shirt: '#3a6ab0', pants: '#3a3a4a', hair: '#3a2a1a' }, { speed: 120, flee: 160 });
P('shopkeep', 'SHOPKEEPER', 5.8, 190, { skin: '#e0b090', shirt: '#f0f0e0', pants: '#3a3a4a', hair: '#5a3a1a' }, { speed: 110, flee: 120 });
P('camper', 'CAMPER', 5.7, 165, { skin: '#e0b090', shirt: '#4a9a5a', pants: '#6a5a4a', hair: '#c08040' }, { speed: 140, flee: 170 });

// ------------------------------------------------------------ snakes (chain bodies, see Snake)
def('moccasin', { name: 'WATER MOCCASIN', ft: 3, lb: 2.5, rig: 'snake', cat: 'snake', base: '#3a2a1e', band: '#5a4a34', belly: '#8a7a60', dark: '#1a1008', eye: '#c0a030', pattern: 'bands', n: 12, hp: 12, speed: 75, venom: 3 });
def('python', { name: 'BURMESE PYTHON', ft: 15, lb: 200, rig: 'snake', cat: 'snake', base: '#c8a86a', band: '#5a3a20', belly: '#e8d8a8', dark: '#3a2410', eye: '#101010', pattern: 'blotch', n: 22, hp: 110, speed: 60, constrict: 7 });
def('indigo', { name: 'EASTERN INDIGO SNAKE', ft: 7, lb: 8, rig: 'snake', cat: 'snake', base: '#1e2238', band: '#2a2e48', belly: '#6a5a4a', dark: '#0c0e18', eye: '#3a3a3a', pattern: 'plain', n: 16, hp: 24, speed: 90 });
def('ratsnake', { name: 'YELLOW RAT SNAKE', ft: 5, lb: 3, rig: 'snake', cat: 'snake', base: '#c8b060', band: '#7a6a30', belly: '#e8e0b0', dark: '#3a3010', eye: '#3a3a3a', pattern: 'bands', n: 14, hp: 16, speed: 85 });
def('skunkape', { name: 'THE SKUNK APE', ft: 7.5, lb: 500, rig: 'biped', cat: 'boss', len: 60, skin: '#3a2a20', shirt: '#2a1e14', pants: '#2a1e14', hair: '#1a1410', boots: '#3a2a20' });
// ------------------------------------------------------------ turtles, frogs, crustaceans, rays
def('turtle', { name: 'SNAPPING TURTLE', ft: 1.5, lb: 30, rig: 'turtle', cat: 'turtle', len: 40, shell: '#4a5a34', skin: '#7d8a48', belly: '#c8b080', dark: '#1e2a14', hooked: true, armor: 12, hp: 40 });
def('gatorsnapper', { name: 'ALLIGATOR SNAPPING TURTLE', ft: 2.6, lb: 150, rig: 'turtle', cat: 'turtle', len: 48, shell: '#3a3a2a', skin: '#5a5a40', belly: '#a09070', dark: '#141410', spiky: true, hooked: true, armor: 18, hp: 120, snap: 14 });
def('softshell', { name: 'FLORIDA SOFTSHELL', ft: 1.6, lb: 15, rig: 'turtle', cat: 'turtle', len: 42, shell: '#6a6a4a', skin: '#8a8a60', belly: '#d0c8a0', dark: '#2a2a1a', armor: 3, hp: 25 });
def('slider', { name: 'RED-EARED SLIDER', ft: 0.9, lb: 3, rig: 'turtle', cat: 'turtle', len: 34, shell: '#3a5a2a', skin: '#5a7a3a', belly: '#e0d080', dark: '#1a2a10', armor: 8, hp: 16 });
def('cooter', { name: 'FLORIDA COOTER', ft: 1.1, lb: 6, rig: 'turtle', cat: 'turtle', len: 36, shell: '#2a3a2a', skin: '#4a6a3a', belly: '#e8e0a0', dark: '#10180e', armor: 9, hp: 20 });
def('frog', { name: 'BULLFROG', ft: 0.6, lb: 1, rig: 'frog', cat: 'frog', len: 28, body: '#5f9e3a', belly: '#cfe08a', spots: true });
def('pigfrog', { name: 'PIG FROG', ft: 0.45, lb: 0.6, rig: 'frog', cat: 'frog', len: 26, body: '#4a7a3a', belly: '#c0d0a0', spots: true });
def('treefrog', { name: 'GREEN TREEFROG', ft: 0.2, lb: 0.03, rig: 'frog', cat: 'frog', len: 20, body: '#60c060', belly: '#e0f0c0' });
def('crayfish', { name: 'CRAYFISH', ft: 0.35, lb: 0.05, rig: 'crab', cat: 'bottom', len: 30, body: '#8a3a2a', claw: '#c05a3a', long: true, armor: 3, hp: 4, speed: 26 });
def('crab', { name: 'BLUE CRAB', ft: 0.6, lb: 0.5, rig: 'crab', cat: 'bottom', len: 26, body: '#3a6ab0', claw: '#5a8ad0', armor: 6, hp: 8, speed: 34, pinch: 3 });
def('fiddler', { name: 'FIDDLER CRAB', ft: 0.12, lb: 0.01, rig: 'crab', cat: 'bottom', len: 20, body: '#6a5a4a', claw: '#e0d0b0', armor: 1, hp: 1, speed: 40 });
def('roach', { name: 'COCKROACH', ft: 0.15, lb: 0.01, rig: 'crab', cat: 'bottom', len: 12, body: '#5a3a1a', claw: '#5a3a1a', long: true, armor: 0, hp: 1, speed: 60 });
def('shrimp', { name: 'GRASS SHRIMP', ft: 0.15, lb: 0.005, rig: 'crab', cat: 'bottom', len: 24, body: '#c0d0c0', claw: '#c0d0c0', long: true, armor: 0, hp: 1, speed: 50 });
def('snail', { name: 'APPLE SNAIL', ft: 0.2, lb: 0.1, rig: 'snail', cat: 'bottom', len: 18, shell: '#c09a4a', body: '#8a7a6a', armor: 4, hp: 3, speed: 6 });
def('ray', { name: 'SOUTHERN STINGRAY', ft: 3, lb: 40, rig: 'ray', cat: 'ray', len: 60, body: '#6a5a44', spot: '#8a7a5a' });
