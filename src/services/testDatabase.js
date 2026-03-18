// ─────────────────────────────────────────────────────────────────────────────
// Test Database Service
// Single source of truth for all dressage test data across Test Explorer,
// Show Prep Form, and Show Planner.
// ─────────────────────────────────────────────────────────────────────────────

// ── FULL TEST LIST (for dropdowns) ───────────────────────────────────────────

const ALL_TESTS = [
  // USDF Standard
  { value: 'intro_a', label: 'Intro — Test A', shortLabel: 'Intro A', org: 'USDF' },
  { value: 'intro_b', label: 'Intro — Test B', shortLabel: 'Intro B', org: 'USDF' },
  { value: 'intro_c', label: 'Intro — Test C', shortLabel: 'Intro C', org: 'USDF' },
  { value: 'training_1', label: 'Training Level — Test 1', shortLabel: 'TL T1', org: 'USDF' },
  { value: 'training_2', label: 'Training Level — Test 2', shortLabel: 'TL T2', org: 'USDF' },
  { value: 'training_3', label: 'Training Level — Test 3', shortLabel: 'TL T3', org: 'USDF' },
  { value: 'first_1', label: 'First Level — Test 1', shortLabel: '1L T1', org: 'USDF' },
  { value: 'first_2', label: 'First Level — Test 2', shortLabel: '1L T2', org: 'USDF' },
  { value: 'first_3', label: 'First Level — Test 3', shortLabel: '1L T3', org: 'USDF' },
  { value: 'second_1', label: 'Second Level — Test 1', shortLabel: '2L T1', org: 'USDF' },
  { value: 'second_2', label: 'Second Level — Test 2', shortLabel: '2L T2', org: 'USDF' },
  { value: 'second_3', label: 'Second Level — Test 3', shortLabel: '2L T3', org: 'USDF' },
  { value: 'third_1', label: 'Third Level — Test 1', shortLabel: '3L T1', org: 'USDF' },
  { value: 'third_2', label: 'Third Level — Test 2', shortLabel: '3L T2', org: 'USDF' },
  { value: 'third_3', label: 'Third Level — Test 3', shortLabel: '3L T3', org: 'USDF' },
  { value: 'fourth_1', label: 'Fourth Level — Test 1', shortLabel: '4L T1', org: 'USDF' },
  { value: 'fourth_2', label: 'Fourth Level — Test 2', shortLabel: '4L T2', org: 'USDF' },
  { value: 'fourth_3', label: 'Fourth Level — Test 3', shortLabel: '4L T3', org: 'USDF' },
  // FEI
  { value: 'psg', label: 'FEI — Prix St. Georges', shortLabel: 'PSG', org: 'FEI' },
  { value: 'inter_1', label: 'FEI — Intermediate I', shortLabel: 'Inter I', org: 'FEI' },
  { value: 'inter_2', label: 'FEI — Intermediate II', shortLabel: 'Inter II', org: 'FEI' },
  { value: 'grand_prix', label: 'FEI — Grand Prix', shortLabel: 'GP', org: 'FEI' },
  { value: 'gp_special', label: 'FEI — Grand Prix Special', shortLabel: 'GPS', org: 'FEI' },
];

const FREESTYLE_TESTS = [
  { value: 'fs_training', label: 'Training Level Freestyle', shortLabel: 'TL FS', org: 'USDF' },
  { value: 'fs_first', label: 'First Level Freestyle', shortLabel: '1L FS', org: 'USDF' },
  { value: 'fs_second', label: 'Second Level Freestyle', shortLabel: '2L FS', org: 'USDF' },
  { value: 'fs_third', label: 'Third Level Freestyle', shortLabel: '3L FS', org: 'USDF' },
  { value: 'fs_fourth', label: 'Fourth Level Freestyle', shortLabel: '4L FS', org: 'USDF' },
];

// ── FEI TEST DATA ────────────────────────────────────────────────────────────
// Complete data for all 5 FEI tests. Sourced from:
//   - fei_test_database_complete.json → required_movements
//   - comprehensive_dressage_test_database_with_coefficients.json → coefficients_by_test

const FEI_TESTS = {

  // ─── INTRODUCTORY — TEST A ───────────────────────────────────────────
  intro_a: {
    testId: 'intro_a',
    label: 'Introductory — Test A',
    shortLabel: 'Intro A',
    org: 'USDF',
    year: '2023',
    arena: '20×40 or 20×60',
    keyDifferences: 'Walk and trot only. No canter. First introduction to dressage competition.',

    movementGroups: [
      { label: 'Trot', color: '#2e5c82', movements: [
        { text: 'Working trot rising', coeff: false, newAtLevel: true },
        { text: '20m circle left (trot)', coeff: false, newAtLevel: true },
        { text: '20m circle right (trot)', coeff: false, newAtLevel: true },
      ]},
      { label: 'Walk', color: '#b8862a', movements: [
        { text: 'Medium walk', coeff: false, newAtLevel: true },
        { text: 'Free walk', coeff: false, newAtLevel: true },
      ]},
      { label: 'Other', color: '#6b4f38', movements: [
        { text: 'Halt through walk', coeff: false, newAtLevel: true },
      ]},
    ],

    coefficients: [
      { movement: 'Submission', badge: '×2', type: 'collective', why: 'Acceptance of steady contact, attention, confidence — the foundation of all future training.' },
    ],

    assessItems: [
      { id: 'sub',   text: 'Submission (collective)', note: 'Double coefficient · acceptance of steady contact, attention, confidence', coeff: true, gaitGroup: 'other' },
      { id: 'wtr',   text: 'Working trot rising', note: 'Rhythm and willingness to move forward', coeff: false, gaitGroup: 'trot' },
      { id: 'c20l',  text: '20m circle left (trot)', note: 'Geometry, bend, balance', coeff: false, gaitGroup: 'trot' },
      { id: 'c20r',  text: '20m circle right (trot)', note: 'Geometry, bend, balance', coeff: false, gaitGroup: 'trot' },
      { id: 'mw',    text: 'Medium walk', note: 'Clear four-beat rhythm, relaxation', coeff: false, gaitGroup: 'walk' },
      { id: 'fw',    text: 'Free walk', note: 'Horse stretches forward and downward', coeff: false, gaitGroup: 'walk' },
      { id: 'halt',  text: 'Halt through walk', note: 'Progressive transition, stillness', coeff: false, gaitGroup: 'other' },
    ],

    directives: [
      { title: 'Rhythm', body: 'Clear, consistent tempo in both walk and trot' },
      { title: 'Willingness', body: 'Horse moves forward freely without resistance or tension' },
      { title: 'Correct Basics', body: 'Steady contact, balanced turns, accurate geometry on circles' },
      { title: 'Submission (collective ×2)', body: 'Acceptance of steady contact, attention, confidence — the only doubled score' },
    ],
  },

  // ─── INTRODUCTORY — TEST B ───────────────────────────────────────────
  intro_b: {
    testId: 'intro_b',
    label: 'Introductory — Test B',
    shortLabel: 'Intro B',
    org: 'USDF',
    year: '2023',
    arena: '20×40 or 20×60',
    keyDifferences: 'Adds change of rein and more complex trot patterns. Still walk and trot only.',

    movementGroups: [
      { label: 'Trot', color: '#2e5c82', movements: [
        { text: 'Working trot rising', coeff: false, newAtLevel: false },
        { text: '20m circle left (trot)', coeff: false, newAtLevel: false },
        { text: '20m circle right (trot)', coeff: false, newAtLevel: false },
        { text: 'Change of rein (trot)', coeff: false, newAtLevel: true },
      ]},
      { label: 'Walk', color: '#b8862a', movements: [
        { text: 'Medium walk', coeff: false, newAtLevel: false },
        { text: 'Free walk', coeff: false, newAtLevel: false },
      ]},
      { label: 'Other', color: '#6b4f38', movements: [
        { text: 'Halt through walk', coeff: false, newAtLevel: false },
      ]},
    ],

    coefficients: [
      { movement: 'Submission', badge: '×2', type: 'collective', why: 'Acceptance of steady contact, attention, confidence — the foundation of all future training.' },
    ],

    assessItems: [
      { id: 'sub',   text: 'Submission (collective)', note: 'Double coefficient · acceptance of steady contact, attention, confidence', coeff: true, gaitGroup: 'other' },
      { id: 'wtr',   text: 'Working trot rising', note: 'Rhythm and willingness to move forward', coeff: false, gaitGroup: 'trot' },
      { id: 'cor',   text: 'Change of rein (trot)', note: 'New in Intro B · straightness and balance through the change', coeff: false, gaitGroup: 'trot' },
      { id: 'c20l',  text: '20m circle left (trot)', note: 'Geometry, bend, balance', coeff: false, gaitGroup: 'trot' },
      { id: 'c20r',  text: '20m circle right (trot)', note: 'Geometry, bend, balance', coeff: false, gaitGroup: 'trot' },
      { id: 'mw',    text: 'Medium walk', note: 'Clear four-beat rhythm, relaxation', coeff: false, gaitGroup: 'walk' },
      { id: 'fw',    text: 'Free walk', note: 'Horse stretches forward and downward', coeff: false, gaitGroup: 'walk' },
      { id: 'halt',  text: 'Halt through walk', note: 'Progressive transition, stillness', coeff: false, gaitGroup: 'other' },
    ],

    directives: [
      { title: 'Rhythm', body: 'Clear, consistent tempo in both walk and trot' },
      { title: 'Willingness', body: 'Horse moves forward freely without resistance or tension' },
      { title: 'Correct Basics', body: 'Steady contact, balanced turns, accurate geometry on circles and changes of rein' },
      { title: 'Submission (collective ×2)', body: 'Acceptance of steady contact, attention, confidence — the only doubled score' },
    ],
  },

  // ─── INTRODUCTORY — TEST C ───────────────────────────────────────────
  intro_c: {
    testId: 'intro_c',
    label: 'Introductory — Test C',
    shortLabel: 'Intro C',
    org: 'USDF',
    year: '2023',
    arena: '20×40 or 20×60',
    keyDifferences: 'First test to include canter. Tests all three gaits.',

    movementGroups: [
      { label: 'Trot', color: '#2e5c82', movements: [
        { text: 'Working trot rising', coeff: false, newAtLevel: false },
        { text: '20m circle left (trot)', coeff: false, newAtLevel: false },
        { text: '20m circle right (trot)', coeff: false, newAtLevel: false },
      ]},
      { label: 'Canter', color: '#3d6b46', movements: [
        { text: 'Working canter left lead', coeff: false, newAtLevel: true },
        { text: 'Working canter right lead', coeff: false, newAtLevel: true },
      ]},
      { label: 'Walk', color: '#b8862a', movements: [
        { text: 'Medium walk', coeff: false, newAtLevel: false },
        { text: 'Free walk', coeff: false, newAtLevel: false },
      ]},
      { label: 'Other', color: '#6b4f38', movements: [
        { text: 'Halt through walk', coeff: false, newAtLevel: false },
      ]},
    ],

    coefficients: [
      { movement: 'Submission', badge: '×2', type: 'collective', why: 'Acceptance of steady contact, attention, confidence — the foundation of all future training.' },
    ],

    assessItems: [
      { id: 'sub',   text: 'Submission (collective)', note: 'Double coefficient · acceptance of steady contact, attention, confidence', coeff: true, gaitGroup: 'other' },
      { id: 'wcl',   text: 'Working canter left lead', note: 'New in Intro C · correct lead, rhythm, balance', coeff: false, gaitGroup: 'canter' },
      { id: 'wcr',   text: 'Working canter right lead', note: 'New in Intro C · correct lead, rhythm, balance', coeff: false, gaitGroup: 'canter' },
      { id: 'wtr',   text: 'Working trot rising', note: 'Rhythm and willingness to move forward', coeff: false, gaitGroup: 'trot' },
      { id: 'c20l',  text: '20m circle left (trot)', note: 'Geometry, bend, balance', coeff: false, gaitGroup: 'trot' },
      { id: 'c20r',  text: '20m circle right (trot)', note: 'Geometry, bend, balance', coeff: false, gaitGroup: 'trot' },
      { id: 'mw',    text: 'Medium walk', note: 'Clear four-beat rhythm, relaxation', coeff: false, gaitGroup: 'walk' },
      { id: 'fw',    text: 'Free walk', note: 'Horse stretches forward and downward', coeff: false, gaitGroup: 'walk' },
      { id: 'halt',  text: 'Halt through walk', note: 'Progressive transition, stillness', coeff: false, gaitGroup: 'other' },
    ],

    directives: [
      { title: 'Rhythm', body: 'Clear, consistent tempo in walk, trot, and canter' },
      { title: 'Willingness', body: 'Horse moves forward freely without resistance or tension' },
      { title: 'Correct Basics', body: 'Correct canter leads, balanced transitions, accurate geometry' },
      { title: 'Submission (collective ×2)', body: 'Acceptance of steady contact, attention, confidence — the only doubled score' },
    ],
  },

  // ─── TRAINING LEVEL — TEST 1 ─────────────────────────────────────────
  training_1: {
    testId: 'training_1',
    label: 'Training Level — Test 1',
    shortLabel: 'TL T1',
    org: 'USEF/USDF',
    year: '2023',
    arena: '20×60',
    keyDifferences: 'First scored level. 20m circles, developing canter from trot, clear transitions.',

    movementGroups: [
      { label: 'Trot', color: '#2e5c82', movements: [
        { text: 'Working trot', coeff: false, newAtLevel: true },
        { text: 'Circle left 20m', coeff: true, newAtLevel: true },
        { text: 'Circle right 20m', coeff: true, newAtLevel: true },
      ]},
      { label: 'Canter', color: '#3d6b46', movements: [
        { text: 'Working canter left lead', coeff: false, newAtLevel: false },
        { text: 'Working canter right lead', coeff: false, newAtLevel: false },
        { text: 'Working canter / working trot transition (left)', coeff: true, newAtLevel: true },
        { text: 'Working canter / working trot transition (right)', coeff: true, newAtLevel: true },
      ]},
      { label: 'Walk', color: '#b8862a', movements: [
        { text: 'Medium walk', coeff: false, newAtLevel: false },
        { text: 'Medium walk and transition from trot', coeff: true, newAtLevel: true },
        { text: 'Free walk', coeff: false, newAtLevel: false },
        { text: 'Change rein, free walk / medium walk', coeff: true, newAtLevel: true },
      ]},
      { label: 'Other', color: '#6b4f38', movements: [
        { text: 'Halt through walk', coeff: false, newAtLevel: false },
      ]},
    ],

    coefficients: [
      { movement: 'Circle left 20m', badge: '×2', type: 'movement', why: 'Geometry, bend, and balance — each rein scored independently.' },
      { movement: 'Working canter / working trot transition (left)', badge: '×2', type: 'movement', why: 'Quality of upward and downward transitions reveals suppleness and responsiveness.' },
      { movement: 'Medium walk and transition from trot', badge: '×2', type: 'movement', why: 'Smooth transition to walk without loss of rhythm or contact.' },
      { movement: 'Change rein, free walk / medium walk', badge: '×2', type: 'movement', why: 'Freedom in free walk and prompt return to medium walk on the new rein.' },
      { movement: 'Circle right 20m', badge: '×2', type: 'movement', why: 'Each rein scored independently — asymmetry is visible.' },
      { movement: 'Working canter / working trot transition (right)', badge: '×2', type: 'movement', why: 'Both leads scored separately; the weaker transition stands alone.' },
      { movement: 'Impulsion', badge: '×2', type: 'collective', why: 'Desire to move forward; elasticity of steps; suppleness of back; engagement of hindquarters.' },
      { movement: 'Submission', badge: '×2', type: 'collective', why: 'Willing cooperation; harmony; attention and confidence; acceptance of bit and aids; straightness; lightness of forehand.' },
    ],

    assessItems: [
      { id: 'c20l',  text: 'Circle left 20m', note: 'Double coefficient · geometry, bend, balance', coeff: true, gaitGroup: 'trot' },
      { id: 'ctr-l', text: 'Working canter / working trot transition (left)', note: 'Double coefficient · suppleness and responsiveness', coeff: true, gaitGroup: 'canter' },
      { id: 'mwt',   text: 'Medium walk and transition from trot', note: 'Double coefficient · smooth transition without loss of rhythm', coeff: true, gaitGroup: 'walk' },
      { id: 'fwmw',  text: 'Change rein, free walk / medium walk', note: 'Double coefficient · freedom in free walk, prompt return', coeff: true, gaitGroup: 'walk' },
      { id: 'c20r',  text: 'Circle right 20m', note: 'Double coefficient · asymmetry visible', coeff: true, gaitGroup: 'trot' },
      { id: 'ctr-r', text: 'Working canter / working trot transition (right)', note: 'Double coefficient · weaker transition stands alone', coeff: true, gaitGroup: 'canter' },
      { id: 'imp',   text: 'Impulsion (collective)', note: 'Double coefficient · forward desire, elasticity, suppleness of back', coeff: true, gaitGroup: 'other' },
      { id: 'sub',   text: 'Submission (collective)', note: 'Double coefficient · willing cooperation, harmony, acceptance of aids', coeff: true, gaitGroup: 'other' },
      { id: 'wt',    text: 'Working trot', note: 'Rhythm, tempo, freedom of stride', coeff: false, gaitGroup: 'trot' },
      { id: 'wcl',   text: 'Working canter left lead', note: 'Correct lead, clear three-beat rhythm', coeff: false, gaitGroup: 'canter' },
      { id: 'wcr',   text: 'Working canter right lead', note: 'Correct lead, clear three-beat rhythm', coeff: false, gaitGroup: 'canter' },
      { id: 'mw',    text: 'Medium walk', note: 'Clear four-beat rhythm, relaxation', coeff: false, gaitGroup: 'walk' },
      { id: 'fw',    text: 'Free walk', note: 'Horse stretches forward and downward with overstride', coeff: false, gaitGroup: 'walk' },
      { id: 'halt',  text: 'Halt through walk', note: 'Progressive transition, stillness', coeff: false, gaitGroup: 'other' },
    ],

    directives: [
      { title: 'Rhythm', body: 'Clear, consistent tempo maintained through all transitions and figures' },
      { title: 'Relaxation', body: 'Freedom from tension; willingness to stretch into contact' },
      { title: 'Freedom of Gaits', body: 'Ground-covering strides with natural swing through the body' },
      { title: 'Suppleness', body: 'Elasticity through the topline; horse bends on circles without stiffness' },
      { title: 'Forward Tendency', body: 'Desire to move forward from light aids; not running or rushing' },
      { title: 'Acceptance of Contact', body: 'Steady, elastic connection with the rider\'s hand without resistance' },
    ],
  },

  // ─── TRAINING LEVEL — TEST 2 ─────────────────────────────────────────
  training_2: {
    testId: 'training_2',
    label: 'Training Level — Test 2',
    shortLabel: 'TL T2',
    org: 'USEF/USDF',
    year: '2023',
    arena: '20×60',
    keyDifferences: 'Adds stretch circle in trot — horse must seek contact forward and downward.',

    movementGroups: [
      { label: 'Trot', color: '#2e5c82', movements: [
        { text: 'Working trot', coeff: false, newAtLevel: false },
        { text: 'Change of rein in trot', coeff: true, newAtLevel: true },
        { text: 'Stretch circle (trot)', coeff: false, newAtLevel: true },
      ]},
      { label: 'Canter', color: '#3d6b46', movements: [
        { text: 'Working canter left lead and transition', coeff: true, newAtLevel: false },
        { text: 'Working canter right lead and transition', coeff: true, newAtLevel: false },
      ]},
      { label: 'Walk', color: '#b8862a', movements: [
        { text: 'Medium walk', coeff: false, newAtLevel: false },
        { text: 'Medium walk / change rein, medium walk', coeff: true, newAtLevel: true },
        { text: 'Free walk', coeff: false, newAtLevel: false },
        { text: 'Change rein, free walk / medium walk', coeff: true, newAtLevel: false },
      ]},
      { label: 'Other', color: '#6b4f38', movements: [
        { text: 'Halt through walk', coeff: false, newAtLevel: false },
      ]},
    ],

    coefficients: [
      { movement: 'Change of rein in trot', badge: '×2', type: 'movement', why: 'Straightness and balance through the change of direction.' },
      { movement: 'Working canter left lead and transition', badge: '×2', type: 'movement', why: 'Quality of canter and transitions scored together.' },
      { movement: 'Medium walk / change rein, medium walk', badge: '×2', type: 'movement', why: 'Maintaining rhythm and contact through change of rein in walk.' },
      { movement: 'Change rein, free walk / medium walk', badge: '×2', type: 'movement', why: 'Freedom in free walk and prompt return to medium walk.' },
      { movement: 'Change of rein in trot (second)', badge: '×2', type: 'movement', why: 'Both directions scored — the weaker rein is exposed.' },
      { movement: 'Working canter right lead and transition', badge: '×2', type: 'movement', why: 'Each lead scored separately; quality of transitions matters.' },
      { movement: 'Impulsion', badge: '×2', type: 'collective', why: 'Desire to move forward; elasticity of steps; suppleness of back; engagement of hindquarters.' },
      { movement: 'Submission', badge: '×2', type: 'collective', why: 'Willing cooperation; harmony; attention and confidence; acceptance of bit and aids; straightness; lightness of forehand.' },
    ],

    assessItems: [
      { id: 'cort',  text: 'Change of rein in trot', note: 'Double coefficient · straightness and balance through direction change', coeff: true, gaitGroup: 'trot' },
      { id: 'ctr-l', text: 'Working canter left lead and transition', note: 'Double coefficient · canter quality and transition scored together', coeff: true, gaitGroup: 'canter' },
      { id: 'mwcr',  text: 'Medium walk / change rein, medium walk', note: 'Double coefficient · maintaining rhythm through change of rein', coeff: true, gaitGroup: 'walk' },
      { id: 'fwmw',  text: 'Change rein, free walk / medium walk', note: 'Double coefficient · freedom in free walk, prompt return', coeff: true, gaitGroup: 'walk' },
      { id: 'cort2', text: 'Change of rein in trot (second)', note: 'Double coefficient · weaker rein exposed', coeff: true, gaitGroup: 'trot' },
      { id: 'ctr-r', text: 'Working canter right lead and transition', note: 'Double coefficient · each lead scored separately', coeff: true, gaitGroup: 'canter' },
      { id: 'imp',   text: 'Impulsion (collective)', note: 'Double coefficient · forward desire, elasticity, suppleness of back', coeff: true, gaitGroup: 'other' },
      { id: 'sub',   text: 'Submission (collective)', note: 'Double coefficient · willing cooperation, harmony, acceptance of aids', coeff: true, gaitGroup: 'other' },
      { id: 'str',   text: 'Stretch circle (trot)', note: 'New in T2 · horse seeks contact forward and downward', coeff: false, gaitGroup: 'trot' },
      { id: 'wt',    text: 'Working trot', note: 'Rhythm, tempo, freedom of stride', coeff: false, gaitGroup: 'trot' },
      { id: 'mw',    text: 'Medium walk', note: 'Clear four-beat rhythm, relaxation', coeff: false, gaitGroup: 'walk' },
      { id: 'fw',    text: 'Free walk', note: 'Horse stretches forward and downward with overstride', coeff: false, gaitGroup: 'walk' },
      { id: 'halt',  text: 'Halt through walk', note: 'Progressive transition, stillness', coeff: false, gaitGroup: 'other' },
    ],

    directives: [
      { title: 'Rhythm', body: 'Clear, consistent tempo maintained through all transitions and figures' },
      { title: 'Relaxation', body: 'Freedom from tension; stretch circle reveals willingness to seek contact downward' },
      { title: 'Freedom of Gaits', body: 'Ground-covering strides with natural swing through the body' },
      { title: 'Suppleness', body: 'Elasticity through the topline; horse bends without stiffness' },
      { title: 'Forward Tendency', body: 'Desire to move forward from light aids; not running or rushing' },
      { title: 'Acceptance of Contact', body: 'Steady, elastic connection; stretch circle tests the horse\'s trust in the contact' },
    ],
  },

  // ─── TRAINING LEVEL — TEST 3 ─────────────────────────────────────────
  training_3: {
    testId: 'training_3',
    label: 'Training Level — Test 3',
    shortLabel: 'TL T3',
    org: 'USEF/USDF',
    year: '2023',
    arena: '20×60',
    keyDifferences: 'Adds shallow loops with change of bend and stretch circle. Tests suppleness through bend changes.',

    movementGroups: [
      { label: 'Trot', color: '#2e5c82', movements: [
        { text: 'Working trot', coeff: false, newAtLevel: false },
        { text: 'Single loop left (trot)', coeff: true, newAtLevel: true },
        { text: 'Single loop right (trot)', coeff: true, newAtLevel: true },
        { text: 'Circle right 20m, stretch forward and downward (rising trot)', coeff: true, newAtLevel: true },
      ]},
      { label: 'Canter', color: '#3d6b46', movements: [
        { text: 'Working canter left lead', coeff: false, newAtLevel: false },
        { text: 'Working canter right lead', coeff: false, newAtLevel: false },
      ]},
      { label: 'Walk', color: '#b8862a', movements: [
        { text: 'Medium walk', coeff: true, newAtLevel: false },
        { text: 'Free walk', coeff: false, newAtLevel: false },
        { text: 'Free walk / medium walk', coeff: true, newAtLevel: false },
      ]},
      { label: 'Other', color: '#6b4f38', movements: [
        { text: 'Halt through walk', coeff: false, newAtLevel: false },
      ]},
    ],

    coefficients: [
      { movement: 'Single loop left (trot)', badge: '×2', type: 'movement', why: 'Suppleness through the change of bend; balance maintained throughout the loop.' },
      { movement: 'Medium walk', badge: '×2', type: 'movement', why: 'Clear four-beat rhythm, relaxation, ground cover.' },
      { movement: 'Free walk / medium walk', badge: '×2', type: 'movement', why: 'Freedom in free walk and quality of transition back to medium walk.' },
      { movement: 'Single loop right (trot)', badge: '×2', type: 'movement', why: 'Each rein scored independently — suppleness through bend changes.' },
      { movement: 'Circle right 20m, stretch forward and downward', badge: '×2', type: 'movement', why: 'Horse must seek the contact forward and downward while maintaining rhythm and balance on a circle.' },
      { movement: 'Impulsion', badge: '×2', type: 'collective', why: 'Desire to move forward; elasticity of steps; suppleness of back; engagement of hindquarters.' },
      { movement: 'Submission', badge: '×2', type: 'collective', why: 'Willing cooperation; harmony; attention and confidence; acceptance of bit and aids; straightness; lightness of forehand.' },
    ],

    assessItems: [
      { id: 'sll',   text: 'Single loop left (trot)', note: 'Double coefficient · suppleness through change of bend', coeff: true, gaitGroup: 'trot' },
      { id: 'mw',    text: 'Medium walk', note: 'Double coefficient · clear four-beat rhythm, relaxation', coeff: true, gaitGroup: 'walk' },
      { id: 'fwmw',  text: 'Free walk / medium walk', note: 'Double coefficient · freedom in free walk, quality transition back', coeff: true, gaitGroup: 'walk' },
      { id: 'slr',   text: 'Single loop right (trot)', note: 'Double coefficient · each rein scored independently', coeff: true, gaitGroup: 'trot' },
      { id: 'strc',  text: 'Circle right 20m, stretch forward and downward', note: 'Double coefficient · new in T3 · seeks contact downward on circle', coeff: true, gaitGroup: 'trot' },
      { id: 'imp',   text: 'Impulsion (collective)', note: 'Double coefficient · forward desire, elasticity, suppleness of back', coeff: true, gaitGroup: 'other' },
      { id: 'sub',   text: 'Submission (collective)', note: 'Double coefficient · willing cooperation, harmony, acceptance of aids', coeff: true, gaitGroup: 'other' },
      { id: 'wt',    text: 'Working trot', note: 'Rhythm, tempo, freedom of stride', coeff: false, gaitGroup: 'trot' },
      { id: 'wcl',   text: 'Working canter left lead', note: 'Correct lead, clear three-beat rhythm', coeff: false, gaitGroup: 'canter' },
      { id: 'wcr',   text: 'Working canter right lead', note: 'Correct lead, clear three-beat rhythm', coeff: false, gaitGroup: 'canter' },
      { id: 'fw',    text: 'Free walk', note: 'Horse stretches forward and downward with overstride', coeff: false, gaitGroup: 'walk' },
      { id: 'halt',  text: 'Halt through walk', note: 'Progressive transition, stillness', coeff: false, gaitGroup: 'other' },
    ],

    directives: [
      { title: 'Rhythm', body: 'Clear, consistent tempo maintained through loops, circles, and transitions' },
      { title: 'Relaxation', body: 'Freedom from tension; shallow loops and stretch circle reveal true suppleness' },
      { title: 'Freedom of Gaits', body: 'Ground-covering strides with natural swing through the body' },
      { title: 'Suppleness', body: 'The defining quality at this test — bend changes through loops must be smooth and balanced' },
      { title: 'Forward Tendency', body: 'Desire to move forward from light aids; not running or rushing' },
      { title: 'Acceptance of Contact', body: 'Steady, elastic connection; stretch circle confirms the horse trusts the contact' },
    ],
  },

  // ─── FIRST LEVEL TEST 1 ──────────────────────────────────────────────
  first_1: {
    testId: 'first_1',
    label: 'First Level — Test 1',
    shortLabel: '1L T1',
    org: 'USEF/USDF',
    year: '2023',
    arena: '20×60',
    keyDifferences: 'First level requiring lengthening. 10m half circles in trot, 15m circles in canter introduced.',

    movementGroups: [
      { label: 'Trot', color: '#2e5c82', movements: [
        { text: 'Working trot', coeff: false, newAtLevel: false },
        { text: 'Lengthen stride in trot', coeff: false, newAtLevel: true },
        { text: '10m half circle left', coeff: false, newAtLevel: true },
        { text: '10m half circle right', coeff: false, newAtLevel: true },
        { text: 'Circle left 20m, stretch forward and downward (rising trot)', coeff: true, newAtLevel: false },
      ]},
      { label: 'Canter', color: '#3d6b46', movements: [
        { text: 'Working canter left lead', coeff: true, newAtLevel: false },
        { text: 'Working canter right lead', coeff: true, newAtLevel: false },
        { text: 'Lengthen stride in canter', coeff: false, newAtLevel: true },
        { text: '15m circle in canter', coeff: false, newAtLevel: true },
      ]},
      { label: 'Walk', color: '#b8862a', movements: [
        { text: 'Medium walk', coeff: true, newAtLevel: false },
        { text: 'Free walk on long rein', coeff: true, newAtLevel: false },
      ]},
      { label: 'Other', color: '#6b4f38', movements: [
        { text: 'Halt through walk', coeff: false, newAtLevel: false },
      ]},
    ],

    coefficients: [
      { movement: 'Circle left 20m, stretch forward and downward (rising trot)', badge: '×2', type: 'movement', why: 'Tests willingness to stretch into contact while maintaining rhythm and balance.' },
      { movement: 'Medium walk', badge: '×2', type: 'movement', why: 'Clear four-beat rhythm with purposeful marching stride and relaxation.' },
      { movement: 'Change rein, free walk / Medium walk', badge: '×2', type: 'movement', why: 'Freedom of the walk and smooth transition back to medium walk both scored.' },
      { movement: 'Working trot / Working canter left lead and transition', badge: '×2', type: 'movement', why: 'Quality of canter depart and maintenance of rhythm through the transition.' },
      { movement: 'Working canter right lead and transition', badge: '×2', type: 'movement', why: 'Each lead scored independently — weaker lead is exposed.' },
      { movement: 'Impulsion', badge: '×2', type: 'collective', why: 'Desire to move forward with elasticity and engagement from behind.' },
      { movement: 'Submission', badge: '×2', type: 'collective', why: 'Willing acceptance of the aids; attention and confidence; steadiness of contact.' },
    ],

    assessItems: [
      { id: 'str-c',  text: 'Circle left 20m, stretch forward and downward (rising trot)', note: 'Double coefficient · willingness to stretch into contact', coeff: true, gaitGroup: 'trot' },
      { id: 'mw',     text: 'Medium walk', note: 'Double coefficient · clear four-beat rhythm', coeff: true, gaitGroup: 'walk' },
      { id: 'fw-mw',  text: 'Change rein, free walk / Medium walk', note: 'Double coefficient · freedom and transition quality', coeff: true, gaitGroup: 'walk' },
      { id: 'wc-l',   text: 'Working trot / Working canter left lead and transition', note: 'Double coefficient · quality of canter depart', coeff: true, gaitGroup: 'canter' },
      { id: 'wc-r',   text: 'Working canter right lead and transition', note: 'Double coefficient · each lead scored independently', coeff: true, gaitGroup: 'canter' },
      { id: 'imp',    text: 'Impulsion (collective)', note: 'Double coefficient · desire to move forward with elasticity', coeff: true, gaitGroup: 'other' },
      { id: 'sub',    text: 'Submission (collective)', note: 'Double coefficient · willing acceptance of aids', coeff: true, gaitGroup: 'other' },
      { id: 'len-t',  text: 'Lengthen stride in trot', note: 'New at First Level · maintaining rhythm while showing difference', coeff: false, gaitGroup: 'trot' },
      { id: 'hc-10',  text: '10m half circles in trot', note: 'New at First Level · balance and geometry on smaller figure', coeff: false, gaitGroup: 'trot' },
      { id: 'len-c',  text: 'Lengthen stride in canter', note: 'New at First Level · clear lengthening without rushing', coeff: false, gaitGroup: 'canter' },
      { id: 'c-15',   text: '15m circle in canter', note: 'New at First Level · balance on smaller circle', coeff: false, gaitGroup: 'canter' },
      { id: 'halt',   text: 'Halt through walk', note: 'Straightness and immobility', coeff: false, gaitGroup: 'other' },
    ],

    directives: [
      { title: 'Pushing Power', body: 'Development of thrust from the hindquarters — the horse steps actively under the body' },
      { title: 'Rhythm in Lengthening', body: 'Lengthened strides must show a clear difference in frame and stride while maintaining the same tempo' },
      { title: 'Acceptance of Contact', body: 'Steady, elastic connection from leg to hand; stretchy circle proves genuine throughness' },
      { title: 'Transitions', body: 'Smooth, balanced transitions within and between gaits; rhythm maintained throughout' },
    ],
  },

  // ─── FIRST LEVEL TEST 2 ──────────────────────────────────────────────
  first_2: {
    testId: 'first_2',
    label: 'First Level — Test 2',
    shortLabel: '1L T2',
    org: 'USEF/USDF',
    year: '2023',
    arena: '20×60',
    keyDifferences: 'Introduces leg yield and lengthening stride in canter.',

    movementGroups: [
      { label: 'Trot', color: '#2e5c82', movements: [
        { text: 'Working trot', coeff: false, newAtLevel: false },
        { text: 'Lengthen stride in trot', coeff: false, newAtLevel: true },
        { text: 'Leg yield right', coeff: true, newAtLevel: true },
        { text: 'Leg yield left', coeff: true, newAtLevel: true },
        { text: 'Circle right 20m, stretch forward and downward (rising trot)', coeff: true, newAtLevel: false },
      ]},
      { label: 'Canter', color: '#3d6b46', movements: [
        { text: 'Working canter', coeff: false, newAtLevel: false },
        { text: 'Lengthen stride in canter (left lead)', coeff: true, newAtLevel: true },
        { text: 'Lengthen stride in canter (right lead)', coeff: true, newAtLevel: true },
        { text: '15m circle in canter', coeff: false, newAtLevel: true },
      ]},
      { label: 'Walk', color: '#b8862a', movements: [
        { text: 'Medium walk', coeff: true, newAtLevel: false },
        { text: 'Free walk on long rein', coeff: true, newAtLevel: false },
      ]},
      { label: 'Other', color: '#6b4f38', movements: [
        { text: 'Halt through walk', coeff: false, newAtLevel: false },
      ]},
    ],

    coefficients: [
      { movement: 'Leg yield right', badge: '×2', type: 'movement', why: 'First lateral movement at First Level — crossing, angle, and straightness all assessed.' },
      { movement: 'Leg yield left', badge: '×2', type: 'movement', why: 'Each direction scored independently; asymmetry between sides is exposed.' },
      { movement: 'Medium walk', badge: '×2', type: 'movement', why: 'Clear four-beat rhythm with purposeful marching stride.' },
      { movement: 'Change rein, free walk / Medium walk', badge: '×2', type: 'movement', why: 'Freedom of the walk and smooth transition back to medium walk.' },
      { movement: 'Lengthen stride in canter (left lead)', badge: '×2', type: 'movement', why: 'Clear lengthening without losing balance or rushing.' },
      { movement: 'Lengthen stride in canter (right lead)', badge: '×2', type: 'movement', why: 'Each lead scored independently.' },
      { movement: 'Circle right 20m, stretch forward and downward (rising trot)', badge: '×2', type: 'movement', why: 'Proves genuine throughness and willingness to seek the contact.' },
      { movement: 'Impulsion', badge: '×2', type: 'collective', why: 'Desire to move forward with elasticity and engagement from behind.' },
      { movement: 'Submission', badge: '×2', type: 'collective', why: 'Willing acceptance of the aids; attention and confidence.' },
    ],

    assessItems: [
      { id: 'ly-r',   text: 'Leg yield right', note: 'Double coefficient · new at First Level · crossing, angle, straightness', coeff: true, gaitGroup: 'trot' },
      { id: 'ly-l',   text: 'Leg yield left', note: 'Double coefficient · new at First Level · each direction scored independently', coeff: true, gaitGroup: 'trot' },
      { id: 'mw',     text: 'Medium walk', note: 'Double coefficient · clear four-beat rhythm', coeff: true, gaitGroup: 'walk' },
      { id: 'fw-mw',  text: 'Change rein, free walk / Medium walk', note: 'Double coefficient · freedom and transition quality', coeff: true, gaitGroup: 'walk' },
      { id: 'len-cl', text: 'Lengthen stride in canter (left lead)', note: 'Double coefficient · clear lengthening without rushing', coeff: true, gaitGroup: 'canter' },
      { id: 'len-cr', text: 'Lengthen stride in canter (right lead)', note: 'Double coefficient · each lead scored independently', coeff: true, gaitGroup: 'canter' },
      { id: 'str-c',  text: 'Circle right 20m, stretch forward and downward (rising trot)', note: 'Double coefficient · proves genuine throughness', coeff: true, gaitGroup: 'trot' },
      { id: 'imp',    text: 'Impulsion (collective)', note: 'Double coefficient · desire to move forward with elasticity', coeff: true, gaitGroup: 'other' },
      { id: 'sub',    text: 'Submission (collective)', note: 'Double coefficient · willing acceptance of aids', coeff: true, gaitGroup: 'other' },
      { id: 'len-t',  text: 'Lengthen stride in trot', note: 'New at First Level · clear difference in stride', coeff: false, gaitGroup: 'trot' },
      { id: 'c-15',   text: '15m circle in canter', note: 'New at First Level · balance on smaller circle', coeff: false, gaitGroup: 'canter' },
      { id: 'halt',   text: 'Halt through walk', note: 'Straightness and immobility', coeff: false, gaitGroup: 'other' },
    ],

    directives: [
      { title: 'Pushing Power', body: 'Development of thrust from the hindquarters — the horse steps actively under the body' },
      { title: 'Rhythm in Lengthening', body: 'Lengthened strides in canter must show a clear difference while maintaining the same tempo and balance' },
      { title: 'Beginning Lateral Work', body: 'Leg yield introduces sideways movement — the horse should cross willingly without losing forwardness or rhythm' },
      { title: 'Acceptance of Contact', body: 'Steady, elastic connection; stretchy circle confirms the horse seeks the contact down and forward' },
    ],
  },

  // ─── FIRST LEVEL TEST 3 ──────────────────────────────────────────────
  first_3: {
    testId: 'first_3',
    label: 'First Level — Test 3',
    shortLabel: '1L T3',
    org: 'USEF/USDF',
    year: '2023',
    arena: '20×60',
    keyDifferences: 'Adds single loop in canter (counter canter introduction) and combines leg yield with stretch circle.',

    movementGroups: [
      { label: 'Trot', color: '#2e5c82', movements: [
        { text: 'Working trot', coeff: false, newAtLevel: false },
        { text: 'Lengthen stride in trot', coeff: false, newAtLevel: true },
        { text: 'Leg yield right', coeff: true, newAtLevel: true },
        { text: 'Leg yield left', coeff: true, newAtLevel: true },
        { text: 'Circle right 20m, stretch forward and downward (rising trot)', coeff: true, newAtLevel: false },
      ]},
      { label: 'Canter', color: '#3d6b46', movements: [
        { text: 'Working canter', coeff: false, newAtLevel: false },
        { text: 'Lengthen stride in canter', coeff: false, newAtLevel: true },
        { text: 'Single loop canter (right lead)', coeff: true, newAtLevel: true },
        { text: 'Single loop canter (left lead)', coeff: true, newAtLevel: true },
        { text: '15m circle in canter', coeff: false, newAtLevel: true },
      ]},
      { label: 'Walk', color: '#b8862a', movements: [
        { text: 'Medium walk', coeff: true, newAtLevel: false },
        { text: 'Free walk on long rein', coeff: true, newAtLevel: false },
      ]},
      { label: 'Other', color: '#6b4f38', movements: [
        { text: 'Halt through walk', coeff: false, newAtLevel: false },
      ]},
    ],

    coefficients: [
      { movement: 'Leg yield right', badge: '×2', type: 'movement', why: 'Crossing, angle, and straightness all assessed; each direction independent.' },
      { movement: 'Circle right 20m, stretch forward and downward (rising trot)', badge: '×2', type: 'movement', why: 'Proves genuine throughness and willingness to seek the contact.' },
      { movement: 'Single loop canter (right lead)', badge: '×2', type: 'movement', why: 'Introduction to counter canter — balance and lead maintenance through the loop.' },
      { movement: 'Medium walk', badge: '×2', type: 'movement', why: 'Clear four-beat rhythm with purposeful marching stride.' },
      { movement: 'Change rein, free walk / Medium walk', badge: '×2', type: 'movement', why: 'Freedom of the walk and smooth transition back.' },
      { movement: 'Leg yield left', badge: '×2', type: 'movement', why: 'Each direction scored independently; asymmetry exposed.' },
      { movement: 'Single loop canter (left lead)', badge: '×2', type: 'movement', why: 'Lead maintenance and balance through the shallow loop.' },
      { movement: 'Impulsion', badge: '×2', type: 'collective', why: 'Desire to move forward with elasticity and engagement from behind.' },
      { movement: 'Submission', badge: '×2', type: 'collective', why: 'Willing acceptance of the aids; attention and confidence.' },
    ],

    assessItems: [
      { id: 'ly-r',   text: 'Leg yield right', note: 'Double coefficient · crossing, angle, and straightness', coeff: true, gaitGroup: 'trot' },
      { id: 'str-c',  text: 'Circle right 20m, stretch forward and downward (rising trot)', note: 'Double coefficient · proves genuine throughness', coeff: true, gaitGroup: 'trot' },
      { id: 'sl-cr',  text: 'Single loop canter (right lead)', note: 'Double coefficient · new at First Level · counter canter introduction', coeff: true, gaitGroup: 'canter' },
      { id: 'mw',     text: 'Medium walk', note: 'Double coefficient · clear four-beat rhythm', coeff: true, gaitGroup: 'walk' },
      { id: 'fw-mw',  text: 'Change rein, free walk / Medium walk', note: 'Double coefficient · freedom and transition quality', coeff: true, gaitGroup: 'walk' },
      { id: 'ly-l',   text: 'Leg yield left', note: 'Double coefficient · each direction scored independently', coeff: true, gaitGroup: 'trot' },
      { id: 'sl-cl',  text: 'Single loop canter (left lead)', note: 'Double coefficient · new at First Level · lead maintenance through loop', coeff: true, gaitGroup: 'canter' },
      { id: 'imp',    text: 'Impulsion (collective)', note: 'Double coefficient · desire to move forward with elasticity', coeff: true, gaitGroup: 'other' },
      { id: 'sub',    text: 'Submission (collective)', note: 'Double coefficient · willing acceptance of aids', coeff: true, gaitGroup: 'other' },
      { id: 'len-t',  text: 'Lengthen stride in trot', note: 'New at First Level · maintaining rhythm while showing difference', coeff: false, gaitGroup: 'trot' },
      { id: 'len-c',  text: 'Lengthen stride in canter', note: 'New at First Level · clear lengthening without rushing', coeff: false, gaitGroup: 'canter' },
      { id: 'c-15',   text: '15m circle in canter', note: 'New at First Level · balance on smaller circle', coeff: false, gaitGroup: 'canter' },
      { id: 'halt',   text: 'Halt through walk', note: 'Straightness and immobility', coeff: false, gaitGroup: 'other' },
    ],

    directives: [
      { title: 'Pushing Power', body: 'Development of thrust from the hindquarters — the horse steps actively under the body' },
      { title: 'Rhythm in Lengthening', body: 'Lengthened strides must show a clear difference while maintaining the same tempo' },
      { title: 'Beginning Lateral Work', body: 'Leg yield should show willing crossing without losing forwardness or rhythm' },
      { title: 'Counter Canter Introduction', body: 'Single loop tests balance and lead maintenance — the horse stays in the original lead through a shallow change of direction' },
    ],
  },

  // ─── SECOND LEVEL TEST 1 ─────────────────────────────────────────────
  second_1: {
    testId: 'second_1',
    label: 'Second Level — Test 1',
    shortLabel: '2L T1',
    org: 'USEF/USDF',
    year: '2023',
    arena: '20×60',
    keyDifferences: 'First collected and medium gaits. Introduces shoulder-in, rein back, and counter canter.',

    movementGroups: [
      { label: 'Trot', color: '#2e5c82', movements: [
        { text: 'Collected trot', coeff: false, newAtLevel: true },
        { text: 'Medium trot', coeff: false, newAtLevel: true },
        { text: 'Shoulder-in right', coeff: true, newAtLevel: true },
        { text: 'Shoulder-in left', coeff: true, newAtLevel: true },
      ]},
      { label: 'Canter', color: '#3d6b46', movements: [
        { text: 'Collected canter', coeff: false, newAtLevel: true },
        { text: 'Medium canter', coeff: false, newAtLevel: true },
        { text: 'Counter canter right', coeff: true, newAtLevel: true },
        { text: 'Counter canter left', coeff: true, newAtLevel: true },
        { text: '10m circle in canter', coeff: false, newAtLevel: true },
      ]},
      { label: 'Walk', color: '#b8862a', movements: [
        { text: 'Medium walk', coeff: true, newAtLevel: false },
        { text: 'Free walk on long rein', coeff: true, newAtLevel: false },
      ]},
      { label: 'Other', color: '#6b4f38', movements: [
        { text: 'Halt, rein back 3–4 steps, proceed medium walk', coeff: true, newAtLevel: true },
        { text: 'Halt through walk', coeff: false, newAtLevel: false },
      ]},
    ],

    coefficients: [
      { movement: 'Shoulder-in right', badge: '×2', type: 'movement', why: 'New at Second Level — correct 3-track angle, bend, and rhythm all assessed.' },
      { movement: 'Shoulder-in left', badge: '×2', type: 'movement', why: 'Each direction scored independently; asymmetry in suppleness is exposed.' },
      { movement: 'Halt, rein back 3–4 steps, proceed medium walk', badge: '×2', type: 'movement', why: 'Tests obedience, straightness, and willingness to step backward in rhythm.' },
      { movement: 'Medium walk', badge: '×2', type: 'movement', why: 'Clear four-beat rhythm with purposeful marching stride.' },
      { movement: 'Change rein, free walk / Medium walk', badge: '×2', type: 'movement', why: 'Freedom of the walk and smooth transition back to medium walk.' },
      { movement: 'Change rein, counter canter right', badge: '×2', type: 'movement', why: 'New at Second Level — balance and self-carriage in counter canter.' },
      { movement: 'Change rein, counter canter left', badge: '×2', type: 'movement', why: 'Each direction scored independently.' },
      { movement: 'Impulsion', badge: '×2', type: 'collective', why: 'Desire to move forward with elasticity; beginning of true impulsion through collection.' },
      { movement: 'Submission', badge: '×2', type: 'collective', why: 'Willing acceptance of the aids; rein back reveals training depth.' },
    ],

    assessItems: [
      { id: 'si-r',   text: 'Shoulder-in right', note: 'Double coefficient · new at Second Level · 3-track angle', coeff: true, gaitGroup: 'trot' },
      { id: 'si-l',   text: 'Shoulder-in left', note: 'Double coefficient · new at Second Level · each direction independent', coeff: true, gaitGroup: 'trot' },
      { id: 'rb',     text: 'Halt, rein back 3–4 steps, proceed medium walk', note: 'Double coefficient · new at Second Level · obedience and straightness', coeff: true, gaitGroup: 'other' },
      { id: 'mw',     text: 'Medium walk', note: 'Double coefficient · clear four-beat rhythm', coeff: true, gaitGroup: 'walk' },
      { id: 'fw-mw',  text: 'Change rein, free walk / Medium walk', note: 'Double coefficient · freedom and transition quality', coeff: true, gaitGroup: 'walk' },
      { id: 'cc-r',   text: 'Change rein, counter canter right', note: 'Double coefficient · new at Second Level · balance in counter canter', coeff: true, gaitGroup: 'canter' },
      { id: 'cc-l',   text: 'Change rein, counter canter left', note: 'Double coefficient · new at Second Level · each direction independent', coeff: true, gaitGroup: 'canter' },
      { id: 'imp',    text: 'Impulsion (collective)', note: 'Double coefficient · beginning of true impulsion through collection', coeff: true, gaitGroup: 'other' },
      { id: 'sub',    text: 'Submission (collective)', note: 'Double coefficient · rein back reveals training depth', coeff: true, gaitGroup: 'other' },
      { id: 'ct',     text: 'Collected trot', note: 'New at Second Level · shorter, more elevated steps with engagement', coeff: false, gaitGroup: 'trot' },
      { id: 'mt',     text: 'Medium trot', note: 'New at Second Level · clear difference from collected trot', coeff: false, gaitGroup: 'trot' },
      { id: 'cc',     text: 'Collected canter', note: 'New at Second Level · uphill tendency with active hind legs', coeff: false, gaitGroup: 'canter' },
      { id: 'mc',     text: 'Medium canter', note: 'New at Second Level · clear lengthening with balance', coeff: false, gaitGroup: 'canter' },
      { id: 'c-10',   text: '10m circle in canter', note: 'New at Second Level · balance on small circle', coeff: false, gaitGroup: 'canter' },
      { id: 'halt',   text: 'Halt through walk', note: 'Straightness and immobility', coeff: false, gaitGroup: 'other' },
    ],

    directives: [
      { title: 'Development of Collection', body: 'The horse accepts more weight on the hindquarters, producing shorter, more elevated steps' },
      { title: 'Medium Gaits', body: 'Medium trot and canter must show a clear difference from collected gaits without losing balance' },
      { title: 'Shoulder-in (3 tracks)', body: 'Correct angle with the forehand brought inward — approximately 30°; not four-track overbending' },
      { title: 'Counter Canter', body: 'Willing maintenance of the lead through a change of direction; balance and self-carriage are key' },
      { title: 'Submission through Rein Back', body: 'Willingness to step backward in diagonal pairs, straight, without resistance' },
    ],
  },

  // ─── SECOND LEVEL TEST 2 ─────────────────────────────────────────────
  second_2: {
    testId: 'second_2',
    label: 'Second Level — Test 2',
    shortLabel: '2L T2',
    org: 'USEF/USDF',
    year: '2023',
    arena: '20×60',
    keyDifferences: 'Adds travers and half circles in collected trot. Continues counter canter work.',

    movementGroups: [
      { label: 'Trot', color: '#2e5c82', movements: [
        { text: 'Collected trot', coeff: false, newAtLevel: true },
        { text: 'Medium trot', coeff: false, newAtLevel: true },
        { text: 'Shoulder-in', coeff: false, newAtLevel: true },
        { text: 'Travers right', coeff: true, newAtLevel: true },
        { text: 'Travers left', coeff: true, newAtLevel: true },
        { text: 'Half circle right 10m', coeff: true, newAtLevel: false },
        { text: 'Half circle left 10m', coeff: true, newAtLevel: false },
      ]},
      { label: 'Canter', color: '#3d6b46', movements: [
        { text: 'Collected canter', coeff: false, newAtLevel: true },
        { text: 'Medium canter', coeff: false, newAtLevel: true },
        { text: 'Counter canter right', coeff: true, newAtLevel: true },
        { text: 'Counter canter left', coeff: true, newAtLevel: true },
        { text: '10m circle in canter', coeff: false, newAtLevel: true },
      ]},
      { label: 'Walk', color: '#b8862a', movements: [
        { text: 'Medium walk', coeff: true, newAtLevel: false },
        { text: 'Free walk on long rein', coeff: true, newAtLevel: false },
      ]},
      { label: 'Other', color: '#6b4f38', movements: [
        { text: 'Halt through walk', coeff: false, newAtLevel: false },
      ]},
    ],

    coefficients: [
      { movement: 'Travers right / Half circle right 10m', badge: '×2', type: 'movement', why: 'Travers introduces haunches-in — bend, angle, and rhythm all assessed.' },
      { movement: 'Half circle left 10m / Travers left', badge: '×2', type: 'movement', why: 'Each direction scored independently; combines figure accuracy with lateral work.' },
      { movement: 'Medium walk', badge: '×2', type: 'movement', why: 'Clear four-beat rhythm with purposeful marching stride.' },
      { movement: 'Change rein, free walk / Medium walk', badge: '×2', type: 'movement', why: 'Freedom of the walk and smooth transition back.' },
      { movement: 'Change rein, counter canter right', badge: '×2', type: 'movement', why: 'Balance and self-carriage in counter canter.' },
      { movement: 'Change rein, counter canter left', badge: '×2', type: 'movement', why: 'Each direction scored independently.' },
      { movement: 'Impulsion', badge: '×2', type: 'collective', why: 'Desire to move forward with elasticity; impulsion through collection.' },
      { movement: 'Submission', badge: '×2', type: 'collective', why: 'Willing acceptance of the aids; lateral work reveals suppleness.' },
    ],

    assessItems: [
      { id: 'tv-r',   text: 'Travers right / Half circle right 10m', note: 'Double coefficient · new at Second Level · haunches-in with figure accuracy', coeff: true, gaitGroup: 'trot' },
      { id: 'tv-l',   text: 'Half circle left 10m / Travers left', note: 'Double coefficient · new at Second Level · each direction independent', coeff: true, gaitGroup: 'trot' },
      { id: 'mw',     text: 'Medium walk', note: 'Double coefficient · clear four-beat rhythm', coeff: true, gaitGroup: 'walk' },
      { id: 'fw-mw',  text: 'Change rein, free walk / Medium walk', note: 'Double coefficient · freedom and transition quality', coeff: true, gaitGroup: 'walk' },
      { id: 'cc-r',   text: 'Change rein, counter canter right', note: 'Double coefficient · balance in counter canter', coeff: true, gaitGroup: 'canter' },
      { id: 'cc-l',   text: 'Change rein, counter canter left', note: 'Double coefficient · each direction independent', coeff: true, gaitGroup: 'canter' },
      { id: 'imp',    text: 'Impulsion (collective)', note: 'Double coefficient · impulsion through collection', coeff: true, gaitGroup: 'other' },
      { id: 'sub',    text: 'Submission (collective)', note: 'Double coefficient · lateral work reveals suppleness', coeff: true, gaitGroup: 'other' },
      { id: 'ct',     text: 'Collected trot', note: 'New at Second Level · shorter, more elevated steps', coeff: false, gaitGroup: 'trot' },
      { id: 'mt',     text: 'Medium trot', note: 'New at Second Level · clear difference from collected', coeff: false, gaitGroup: 'trot' },
      { id: 'si',     text: 'Shoulder-in', note: 'New at Second Level · 3-track angle', coeff: false, gaitGroup: 'trot' },
      { id: 'cc',     text: 'Collected canter', note: 'New at Second Level · uphill tendency', coeff: false, gaitGroup: 'canter' },
      { id: 'mc',     text: 'Medium canter', note: 'New at Second Level · clear lengthening with balance', coeff: false, gaitGroup: 'canter' },
      { id: 'c-10',   text: '10m circle in canter', note: 'New at Second Level · balance on small circle', coeff: false, gaitGroup: 'canter' },
      { id: 'halt',   text: 'Halt through walk', note: 'Straightness and immobility', coeff: false, gaitGroup: 'other' },
    ],

    directives: [
      { title: 'Development of Collection', body: 'The horse accepts more weight on the hindquarters with shorter, more elevated steps' },
      { title: 'Medium Gaits', body: 'Medium trot and canter must show a clear difference from collected gaits' },
      { title: 'Travers (Haunches-in)', body: 'Haunches brought inward with correct bend — a progression from shoulder-in requiring greater suppleness' },
      { title: 'Counter Canter', body: 'Willing maintenance of the lead; balance and self-carriage are key' },
      { title: 'Submission', body: 'Willing acceptance of aids through increasingly complex lateral and counter-canter work' },
    ],
  },

  // ─── SECOND LEVEL TEST 3 ─────────────────────────────────────────────
  second_3: {
    testId: 'second_3',
    label: 'Second Level — Test 3',
    shortLabel: '2L T3',
    org: 'USEF/USDF',
    year: '2023',
    arena: '20×60',
    keyDifferences: 'Most complex Second Level test. Adds half turn on haunches, simple changes, and medium/collected trot transitions.',

    movementGroups: [
      { label: 'Trot', color: '#2e5c82', movements: [
        { text: 'Collected trot', coeff: false, newAtLevel: true },
        { text: 'Medium trot', coeff: false, newAtLevel: true },
        { text: 'Collected / medium / collected trot transitions', coeff: true, newAtLevel: true },
        { text: 'Shoulder-in', coeff: false, newAtLevel: true },
        { text: 'Travers', coeff: false, newAtLevel: true },
      ]},
      { label: 'Canter', color: '#3d6b46', movements: [
        { text: 'Collected canter', coeff: false, newAtLevel: true },
        { text: 'Medium canter', coeff: false, newAtLevel: true },
        { text: 'Simple change (first)', coeff: true, newAtLevel: true },
        { text: 'Simple change (second)', coeff: true, newAtLevel: true },
        { text: 'Counter canter', coeff: false, newAtLevel: true },
        { text: '10m circle in canter', coeff: false, newAtLevel: true },
      ]},
      { label: 'Walk', color: '#b8862a', movements: [
        { text: 'Medium walk', coeff: false, newAtLevel: false },
        { text: 'Free walk on long rein', coeff: true, newAtLevel: false },
        { text: 'Half turn on haunches left', coeff: true, newAtLevel: true },
        { text: 'Half turn on haunches right', coeff: true, newAtLevel: true },
      ]},
      { label: 'Other', color: '#6b4f38', movements: [
        { text: 'Halt, rein back 3–4 steps, proceed medium walk', coeff: true, newAtLevel: true },
        { text: 'Halt through walk', coeff: false, newAtLevel: false },
      ]},
    ],

    coefficients: [
      { movement: 'Collected / medium / collected trot and transitions (first)', badge: '×2', type: 'movement', why: 'Tests ability to show clear difference between collected and medium gaits with smooth transitions.' },
      { movement: 'Collected / medium / collected trot and transitions (second)', badge: '×2', type: 'movement', why: 'Repeated to confirm consistency; both directions assessed.' },
      { movement: 'Halt, rein back 3–4 steps, proceed medium walk', badge: '×2', type: 'movement', why: 'Obedience, straightness, and willingness to step backward in rhythm.' },
      { movement: 'Half turn on haunches left', badge: '×2', type: 'movement', why: 'New at Second Level — horse pivots around the inner hind leg, maintaining walk rhythm.' },
      { movement: 'Half turn on haunches right', badge: '×2', type: 'movement', why: 'Each direction scored independently; tests engagement and obedience.' },
      { movement: 'Change rein, free walk / Medium walk', badge: '×2', type: 'movement', why: 'Freedom of the walk and smooth transition back.' },
      { movement: 'Simple change (first)', badge: '×2', type: 'movement', why: 'New at Second Level — clean transition through walk with clear walk steps.' },
      { movement: 'Simple change (second)', badge: '×2', type: 'movement', why: 'Each simple change scored independently; consistency matters.' },
      { movement: 'Impulsion', badge: '×2', type: 'collective', why: 'Desire to move forward with elasticity; impulsion powers the transitions.' },
      { movement: 'Submission', badge: '×2', type: 'collective', why: 'Willing acceptance of aids; simple changes and half turns reveal training depth.' },
    ],

    assessItems: [
      { id: 'cmc-1',  text: 'Collected / medium / collected trot and transitions (first)', note: 'Double coefficient · clear gait difference with smooth transitions', coeff: true, gaitGroup: 'trot' },
      { id: 'cmc-2',  text: 'Collected / medium / collected trot and transitions (second)', note: 'Double coefficient · confirms consistency', coeff: true, gaitGroup: 'trot' },
      { id: 'rb',     text: 'Halt, rein back 3–4 steps, proceed medium walk', note: 'Double coefficient · obedience and straightness', coeff: true, gaitGroup: 'other' },
      { id: 'hth-l',  text: 'Half turn on haunches left', note: 'Double coefficient · new at Second Level · pivot around inner hind leg', coeff: true, gaitGroup: 'walk' },
      { id: 'hth-r',  text: 'Half turn on haunches right', note: 'Double coefficient · new at Second Level · each direction independent', coeff: true, gaitGroup: 'walk' },
      { id: 'fw-mw',  text: 'Change rein, free walk / Medium walk', note: 'Double coefficient · freedom and transition quality', coeff: true, gaitGroup: 'walk' },
      { id: 'sc-1',   text: 'Simple change (first)', note: 'Double coefficient · new at Second Level · clean transition through walk', coeff: true, gaitGroup: 'canter' },
      { id: 'sc-2',   text: 'Simple change (second)', note: 'Double coefficient · each scored independently', coeff: true, gaitGroup: 'canter' },
      { id: 'imp',    text: 'Impulsion (collective)', note: 'Double coefficient · impulsion powers the transitions', coeff: true, gaitGroup: 'other' },
      { id: 'sub',    text: 'Submission (collective)', note: 'Double coefficient · simple changes and half turns reveal training depth', coeff: true, gaitGroup: 'other' },
      { id: 'ct',     text: 'Collected trot', note: 'New at Second Level · shorter, more elevated steps', coeff: false, gaitGroup: 'trot' },
      { id: 'mt',     text: 'Medium trot', note: 'New at Second Level · clear difference from collected', coeff: false, gaitGroup: 'trot' },
      { id: 'si',     text: 'Shoulder-in', note: 'New at Second Level · 3-track angle', coeff: false, gaitGroup: 'trot' },
      { id: 'tv',     text: 'Travers', note: 'New at Second Level · haunches-in', coeff: false, gaitGroup: 'trot' },
      { id: 'cc',     text: 'Collected canter', note: 'New at Second Level · uphill tendency', coeff: false, gaitGroup: 'canter' },
      { id: 'mc',     text: 'Medium canter', note: 'New at Second Level · clear lengthening with balance', coeff: false, gaitGroup: 'canter' },
      { id: 'ctrc',   text: 'Counter canter', note: 'New at Second Level · lead maintenance', coeff: false, gaitGroup: 'canter' },
      { id: 'c-10',   text: '10m circle in canter', note: 'New at Second Level · balance on small circle', coeff: false, gaitGroup: 'canter' },
      { id: 'halt',   text: 'Halt through walk', note: 'Straightness and immobility', coeff: false, gaitGroup: 'other' },
    ],

    directives: [
      { title: 'Development of Collection', body: 'The horse accepts more weight on the hindquarters; collected/medium transitions prove adjustability' },
      { title: 'Medium Gaits', body: 'Medium trot must show a clear difference from collected — the transition quality is as important as the gait itself' },
      { title: 'Half Turn on Haunches', body: 'Horse pivots around the inner hind leg while maintaining clear walk rhythm — not stepping backward or losing activity' },
      { title: 'Simple Changes', body: 'Clean canter–walk–canter transitions with 3–5 clear walk steps; balanced and without resistance' },
      { title: 'Submission through Rein Back', body: 'Willingness to step backward in diagonal pairs, straight, without resistance; tests obedience and suppleness' },
    ],
  },

  // ─── THIRD LEVEL TEST 1 ──────────────────────────────────────────────
  third_1: {
    testId: 'third_1',
    label: 'Third Level — Test 1',
    shortLabel: '3L T1',
    org: 'USEF/USDF',
    year: '2023',
    arena: '20×60',
    keyDifferences: 'First extended gaits. Introduces half-pass in trot and canter, and single flying changes.',

    movementGroups: [
      { label: 'Trot', color: '#2e5c82', movements: [
        { text: 'Collected trot', coeff: false, newAtLevel: false },
        { text: 'Medium trot', coeff: false, newAtLevel: false },
        { text: 'Extended trot', coeff: false, newAtLevel: true },
        { text: 'Shoulder-in', coeff: false, newAtLevel: false },
        { text: 'Half circle left 10m / Half pass left', coeff: true, newAtLevel: true },
        { text: 'Half circle right 10m / Half pass right', coeff: true, newAtLevel: true },
      ]},
      { label: 'Canter', color: '#3d6b46', movements: [
        { text: 'Collected canter', coeff: false, newAtLevel: false },
        { text: 'Medium canter', coeff: false, newAtLevel: false },
        { text: 'Extended canter', coeff: false, newAtLevel: true },
        { text: 'Half-pass (canter)', coeff: false, newAtLevel: true },
        { text: 'Flying change of lead (right lead)', coeff: true, newAtLevel: true },
        { text: 'Flying change of lead (left lead)', coeff: true, newAtLevel: true },
        { text: 'Counter canter', coeff: false, newAtLevel: false },
      ]},
      { label: 'Walk', color: '#b8862a', movements: [
        { text: 'Medium walk', coeff: true, newAtLevel: false },
        { text: 'Extended walk', coeff: false, newAtLevel: true },
        { text: 'Change rein, extended walk / Medium walk', coeff: true, newAtLevel: true },
      ]},
      { label: 'Other', color: '#6b4f38', movements: [
        { text: 'Halt, rein back 4 steps, proceed medium walk', coeff: true, newAtLevel: false },
        { text: 'Renvers', coeff: false, newAtLevel: true },
        { text: 'Halt — immobility', coeff: false, newAtLevel: false },
      ]},
    ],

    coefficients: [
      { movement: 'Half circle left 10m / Half pass left', badge: '×2', type: 'movement', why: 'First half-pass at Third Level; clear crossing and consistent bend required each rein.' },
      { movement: 'Half circle right 10m / Half pass right', badge: '×2', type: 'movement', why: 'Each rein scored independently — asymmetry between left and right is fully exposed.' },
      { movement: 'Halt, rein back 4 steps, proceed medium walk', badge: '×2', type: 'movement', why: 'Tests obedience and suppleness through transitions; clean diagonal steps back.' },
      { movement: 'Change rein, extended walk / Medium walk', badge: '×2', type: 'movement', why: 'Maximum overstride in extension with clear transition back to medium walk.' },
      { movement: 'Medium walk', badge: '×2', type: 'movement', why: 'Clear four-beat rhythm, relaxation, and purpose in the walk.' },
      { movement: 'Flying change of lead (right lead)', badge: '×2', type: 'movement', why: 'New at Third Level; must be straight, uphill, and clean.' },
      { movement: 'Flying change of lead (left lead)', badge: '×2', type: 'movement', why: 'Each direction scored separately — the weaker lead has nowhere to hide.' },
      { movement: 'Impulsion', badge: '×2', type: 'collective', why: 'Increased impulsion is a defining requirement at Third Level; stored energy powers the new movements.' },
      { movement: 'Submission', badge: '×2', type: 'collective', why: 'Willing, attentive response to aids; half-passes and flying changes reveal training depth.' },
    ],

    assessItems: [
      { id: 'hp-l',   text: 'Half circle left 10m / Half pass left', note: 'Double coefficient · new at Third Level · clear crossing and bend', coeff: true, gaitGroup: 'trot' },
      { id: 'hp-r',   text: 'Half circle right 10m / Half pass right', note: 'Double coefficient · asymmetry fully exposed', coeff: true, gaitGroup: 'trot' },
      { id: 'rb',     text: 'Halt, rein back 4 steps, proceed medium walk', note: 'Double coefficient · obedience and suppleness', coeff: true, gaitGroup: 'other' },
      { id: 'ewmw',   text: 'Change rein, extended walk / Medium walk', note: 'Double coefficient · overstride with clear transition', coeff: true, gaitGroup: 'walk' },
      { id: 'mw',     text: 'Medium walk', note: 'Double coefficient · clear four-beat rhythm', coeff: true, gaitGroup: 'walk' },
      { id: 'fc-r',   text: 'Flying change of lead (right lead)', note: 'Double coefficient · new at Third Level · straight and uphill', coeff: true, gaitGroup: 'canter' },
      { id: 'fc-l',   text: 'Flying change of lead (left lead)', note: 'Double coefficient · weaker lead exposed', coeff: true, gaitGroup: 'canter' },
      { id: 'imp',    text: 'Impulsion (collective)', note: 'Double coefficient · increased impulsion defines Third Level', coeff: true, gaitGroup: 'other' },
      { id: 'sub',    text: 'Submission (collective)', note: 'Double coefficient · willingness and attentiveness', coeff: true, gaitGroup: 'other' },
      { id: 'et',     text: 'Extended trot', note: 'New at Third Level · uphill balance with clear lengthening', coeff: false, gaitGroup: 'trot' },
      { id: 'ec',     text: 'Extended canter', note: 'New at Third Level · extension with balance and return to collection', coeff: false, gaitGroup: 'canter' },
      { id: 'hpc',    text: 'Half-pass (canter)', note: 'New at Third Level · crossing and bend in canter', coeff: false, gaitGroup: 'canter' },
      { id: 'ren',    text: 'Renvers', note: 'New at Third Level · haunches-out on the track', coeff: false, gaitGroup: 'trot' },
      { id: 'ew',     text: 'Extended walk', note: 'New at Third Level · maximum overstride', coeff: false, gaitGroup: 'walk' },
      { id: 'si',     text: 'Shoulder-in', note: '30° / three tracks', coeff: false, gaitGroup: 'trot' },
      { id: 'halt',   text: 'Halt — immobility', note: 'Square halt, genuine immobility', coeff: false, gaitGroup: 'other' },
    ],

    directives: [
      { title: 'Extension with Uphill Balance', body: 'Extended gaits must show clear lengthening while maintaining an uphill tendency — speed without balance is not extension' },
      { title: 'Half-Pass Quality', body: 'Clear crossing of legs with consistent bend toward the direction of travel; horse nearly parallel to the long side' },
      { title: 'Flying Changes', body: 'Single changes must be straight, uphill, and clean — no swinging haunches or loss of rhythm' },
      { title: 'Increased Self-Carriage', body: 'The horse maintains balance and carriage with less support from the rider\'s hand; lightness in the contact' },
    ],
  },

  // ─── THIRD LEVEL TEST 2 ──────────────────────────────────────────────
  third_2: {
    testId: 'third_2',
    label: 'Third Level — Test 2',
    shortLabel: '3L T2',
    org: 'USEF/USDF',
    year: '2023',
    arena: '20×60',
    keyDifferences: 'Introduces renvers, extended trot as coefficient, release of reins at canter (self-carriage test).',

    movementGroups: [
      { label: 'Trot', color: '#2e5c82', movements: [
        { text: 'Collected trot', coeff: false, newAtLevel: false },
        { text: 'Medium trot', coeff: false, newAtLevel: false },
        { text: 'Change rein, extended trot', coeff: true, newAtLevel: true },
        { text: 'Shoulder-in', coeff: false, newAtLevel: false },
        { text: 'Renvers right', coeff: true, newAtLevel: true },
        { text: 'Renvers left', coeff: true, newAtLevel: true },
        { text: 'Half-pass (trot)', coeff: false, newAtLevel: true },
      ]},
      { label: 'Canter', color: '#3d6b46', movements: [
        { text: 'Collected canter', coeff: false, newAtLevel: false },
        { text: 'Medium canter', coeff: false, newAtLevel: false },
        { text: 'Extended canter', coeff: true, newAtLevel: true },
        { text: 'Half-pass (canter)', coeff: false, newAtLevel: true },
        { text: 'Flying change left', coeff: true, newAtLevel: true },
        { text: 'Flying change right', coeff: true, newAtLevel: true },
        { text: 'Circle right in canter 20m with release of both reins', coeff: true, newAtLevel: false },
        { text: 'Counter canter', coeff: false, newAtLevel: false },
      ]},
      { label: 'Walk', color: '#b8862a', movements: [
        { text: 'Medium walk', coeff: true, newAtLevel: false },
        { text: 'Change rein, extended walk / Medium walk', coeff: true, newAtLevel: true },
      ]},
      { label: 'Other', color: '#6b4f38', movements: [
        { text: 'Halt — immobility', coeff: false, newAtLevel: false },
      ]},
    ],

    coefficients: [
      { movement: 'Renvers right', badge: '×2', type: 'movement', why: 'New at Third Level; haunches-out demands clear bend and angle.' },
      { movement: 'Change rein, extended trot', badge: '×2', type: 'movement', why: 'Extended trot as coefficient exposes suspension and uphill balance.' },
      { movement: 'Renvers left', badge: '×2', type: 'movement', why: 'Each rein scored independently — asymmetry in lateral work is exposed.' },
      { movement: 'Medium walk', badge: '×2', type: 'movement', why: 'Clear four-beat rhythm, relaxation, and purpose in the walk.' },
      { movement: 'Change rein, extended walk / Medium walk', badge: '×2', type: 'movement', why: 'Maximum overstride in extension with clear transition back to medium walk.' },
      { movement: 'Flying change left', badge: '×2', type: 'movement', why: 'Must be straight, uphill, and clean on each lead.' },
      { movement: 'Flying change right', badge: '×2', type: 'movement', why: 'Each direction scored separately — the weaker lead has nowhere to hide.' },
      { movement: 'Circle right in canter 20m with release of both reins', badge: '×2', type: 'movement', why: 'Self-carriage test — horse must maintain balance without rein support.' },
      { movement: 'Extended canter', badge: '×2', type: 'movement', why: 'Clear lengthening with uphill balance and controlled return to collection.' },
      { movement: 'Impulsion', badge: '×2', type: 'collective', why: 'Increased impulsion is a defining requirement at Third Level.' },
      { movement: 'Submission', badge: '×2', type: 'collective', why: 'Willing, attentive response; self-carriage test reveals training depth.' },
    ],

    assessItems: [
      { id: 'ren-r',  text: 'Renvers right', note: 'Double coefficient · new at Third Level · haunches-out with clear bend', coeff: true, gaitGroup: 'trot' },
      { id: 'ext-t',  text: 'Change rein, extended trot', note: 'Double coefficient · suspension and uphill balance', coeff: true, gaitGroup: 'trot' },
      { id: 'ren-l',  text: 'Renvers left', note: 'Double coefficient · asymmetry in lateral work exposed', coeff: true, gaitGroup: 'trot' },
      { id: 'mw',     text: 'Medium walk', note: 'Double coefficient · clear four-beat rhythm', coeff: true, gaitGroup: 'walk' },
      { id: 'ewmw',   text: 'Change rein, extended walk / Medium walk', note: 'Double coefficient · overstride with clear transition', coeff: true, gaitGroup: 'walk' },
      { id: 'fc-l',   text: 'Flying change left', note: 'Double coefficient · straight and uphill', coeff: true, gaitGroup: 'canter' },
      { id: 'fc-r',   text: 'Flying change right', note: 'Double coefficient · weaker lead exposed', coeff: true, gaitGroup: 'canter' },
      { id: 'rel',    text: 'Circle right in canter 20m with release of both reins', note: 'Double coefficient · self-carriage test', coeff: true, gaitGroup: 'canter' },
      { id: 'ec',     text: 'Extended canter', note: 'Double coefficient · lengthening with uphill balance', coeff: true, gaitGroup: 'canter' },
      { id: 'imp',    text: 'Impulsion (collective)', note: 'Double coefficient · increased impulsion defines Third Level', coeff: true, gaitGroup: 'other' },
      { id: 'sub',    text: 'Submission (collective)', note: 'Double coefficient · willingness and attentiveness', coeff: true, gaitGroup: 'other' },
      { id: 'hpt',    text: 'Half-pass (trot)', note: 'New at Third Level · crossing and bend', coeff: false, gaitGroup: 'trot' },
      { id: 'hpc',    text: 'Half-pass (canter)', note: 'New at Third Level · crossing and bend in canter', coeff: false, gaitGroup: 'canter' },
      { id: 'si',     text: 'Shoulder-in', note: '30° / three tracks', coeff: false, gaitGroup: 'trot' },
      { id: 'halt',   text: 'Halt — immobility', note: 'Square halt, genuine immobility', coeff: false, gaitGroup: 'other' },
    ],

    directives: [
      { title: 'Extension with Uphill Balance', body: 'Extended gaits must show clear lengthening while maintaining an uphill tendency — speed without balance is not extension' },
      { title: 'Half-Pass Quality', body: 'Clear crossing of legs with consistent bend toward the direction of travel; horse nearly parallel to the long side' },
      { title: 'Flying Changes', body: 'Single changes must be straight, uphill, and clean — no swinging haunches or loss of rhythm' },
      { title: 'Increased Self-Carriage', body: 'Release of reins test proves the horse maintains balance without rein support; lightness in the contact throughout' },
    ],
  },

  // ─── THIRD LEVEL TEST 3 ──────────────────────────────────────────────
  third_3: {
    testId: 'third_3',
    label: 'Third Level — Test 3',
    shortLabel: '3L T3',
    org: 'USEF/USDF',
    year: '2023',
    arena: '20×60',
    keyDifferences: 'Most complex Third Level test. Half-passes in both trot and canter with flying changes; rein back to collected trot.',

    movementGroups: [
      { label: 'Trot', color: '#2e5c82', movements: [
        { text: 'Collected trot', coeff: false, newAtLevel: false },
        { text: 'Medium trot', coeff: false, newAtLevel: false },
        { text: 'Extended trot', coeff: false, newAtLevel: true },
        { text: 'Shoulder-in', coeff: false, newAtLevel: false },
        { text: 'Half pass left (trot)', coeff: true, newAtLevel: true },
        { text: 'Half pass right (trot)', coeff: true, newAtLevel: true },
      ]},
      { label: 'Canter', color: '#3d6b46', movements: [
        { text: 'Collected canter', coeff: false, newAtLevel: false },
        { text: 'Medium canter', coeff: false, newAtLevel: false },
        { text: 'Extended canter', coeff: false, newAtLevel: true },
        { text: 'Half pass left (canter)', coeff: true, newAtLevel: true },
        { text: 'Half circle left 10m / Flying change of lead', coeff: true, newAtLevel: true },
        { text: 'Half pass right (canter)', coeff: true, newAtLevel: true },
        { text: 'Half circle right 10m / Flying change of lead', coeff: true, newAtLevel: true },
        { text: 'Counter canter', coeff: false, newAtLevel: false },
      ]},
      { label: 'Walk', color: '#b8862a', movements: [
        { text: 'Medium walk', coeff: true, newAtLevel: false },
        { text: 'Extended walk', coeff: true, newAtLevel: true },
      ]},
      { label: 'Other', color: '#6b4f38', movements: [
        { text: 'Halt, rein back 4 steps, proceed collected trot', coeff: true, newAtLevel: false },
        { text: 'Renvers', coeff: false, newAtLevel: true },
        { text: 'Halt — immobility', coeff: false, newAtLevel: false },
      ]},
    ],

    coefficients: [
      { movement: 'Half pass left (trot)', badge: '×2', type: 'movement', why: 'Half-pass quality is central to Third Level; clear crossing and bend required.' },
      { movement: 'Halt, rein back 4 steps, proceed collected trot', badge: '×2', type: 'movement', why: 'Tests obedience and suppleness; clean diagonal steps back with smooth transition forward.' },
      { movement: 'Half pass right (trot)', badge: '×2', type: 'movement', why: 'Each rein scored independently — asymmetry between left and right is fully exposed.' },
      { movement: 'Medium walk', badge: '×2', type: 'movement', why: 'Clear four-beat rhythm, relaxation, and purpose in the walk.' },
      { movement: 'Extended walk', badge: '×2', type: 'movement', why: 'Maximum overstride with total freedom in the neck. Any restriction is penalized.' },
      { movement: 'Half pass left (canter)', badge: '×2', type: 'movement', why: 'Canter half-pass demands clear crossing and bend while maintaining canter quality.' },
      { movement: 'Half circle left 10m / Flying change of lead', badge: '×2', type: 'movement', why: 'Combination of geometry and flying change — must be seamless.' },
      { movement: 'Half pass right (canter)', badge: '×2', type: 'movement', why: 'Each rein scored independently in canter half-pass.' },
      { movement: 'Half circle right 10m / Flying change of lead', badge: '×2', type: 'movement', why: 'Flying change out of half circle tests balance and preparation.' },
      { movement: 'Impulsion', badge: '×2', type: 'collective', why: 'Increased impulsion is a defining requirement at Third Level; powers the complex lateral work.' },
      { movement: 'Submission', badge: '×2', type: 'collective', why: 'Willing, attentive response; complex combinations reveal training depth.' },
    ],

    assessItems: [
      { id: 'hp-tl',  text: 'Half pass left (trot)', note: 'Double coefficient · new at Third Level · crossing and bend', coeff: true, gaitGroup: 'trot' },
      { id: 'rb',     text: 'Halt, rein back 4 steps, proceed collected trot', note: 'Double coefficient · obedience and suppleness', coeff: true, gaitGroup: 'other' },
      { id: 'hp-tr',  text: 'Half pass right (trot)', note: 'Double coefficient · asymmetry fully exposed', coeff: true, gaitGroup: 'trot' },
      { id: 'mw',     text: 'Medium walk', note: 'Double coefficient · clear four-beat rhythm', coeff: true, gaitGroup: 'walk' },
      { id: 'ew',     text: 'Extended walk', note: 'Double coefficient · maximum overstride', coeff: true, gaitGroup: 'walk' },
      { id: 'hp-cl',  text: 'Half pass left (canter)', note: 'Double coefficient · canter half-pass with crossing and bend', coeff: true, gaitGroup: 'canter' },
      { id: 'hc-fc-l', text: 'Half circle left 10m / Flying change of lead', note: 'Double coefficient · geometry and flying change combined', coeff: true, gaitGroup: 'canter' },
      { id: 'hp-cr',  text: 'Half pass right (canter)', note: 'Double coefficient · each rein scored independently', coeff: true, gaitGroup: 'canter' },
      { id: 'hc-fc-r', text: 'Half circle right 10m / Flying change of lead', note: 'Double coefficient · balance and preparation into change', coeff: true, gaitGroup: 'canter' },
      { id: 'imp',    text: 'Impulsion (collective)', note: 'Double coefficient · powers complex lateral work', coeff: true, gaitGroup: 'other' },
      { id: 'sub',    text: 'Submission (collective)', note: 'Double coefficient · complex combinations reveal training depth', coeff: true, gaitGroup: 'other' },
      { id: 'et',     text: 'Extended trot', note: 'New at Third Level · uphill balance with clear lengthening', coeff: false, gaitGroup: 'trot' },
      { id: 'ec',     text: 'Extended canter', note: 'New at Third Level · extension with balance', coeff: false, gaitGroup: 'canter' },
      { id: 'ren',    text: 'Renvers', note: 'New at Third Level · haunches-out on the track', coeff: false, gaitGroup: 'trot' },
      { id: 'si',     text: 'Shoulder-in', note: '30° / three tracks', coeff: false, gaitGroup: 'trot' },
      { id: 'halt',   text: 'Halt — immobility', note: 'Square halt, genuine immobility', coeff: false, gaitGroup: 'other' },
    ],

    directives: [
      { title: 'Extension with Uphill Balance', body: 'Extended gaits must show clear lengthening while maintaining an uphill tendency — speed without balance is not extension' },
      { title: 'Half-Pass Quality', body: 'Clear crossing of legs with consistent bend toward the direction of travel in both trot and canter' },
      { title: 'Flying Changes', body: 'Single changes must be straight, uphill, and clean — seamless out of half circles and half-passes' },
      { title: 'Increased Self-Carriage', body: 'The horse maintains balance and carriage with less support from the rider\'s hand; rein back to collected trot proves suppleness' },
    ],
  },

  // ─── FOURTH LEVEL TEST 1 ─────────────────────────────────────────────
  fourth_1: {
    testId: 'fourth_1',
    label: 'Fourth Level — Test 1',
    shortLabel: '4L T1',
    org: 'USEF/USDF',
    year: '2023',
    arena: '20×60',
    keyDifferences: 'First collected walk and very collected canter. Introduces trot half-passes and multiple single flying changes on diagonal.',

    movementGroups: [
      { label: 'Trot', color: '#2e5c82', movements: [
        { text: 'Collected trot', coeff: false, newAtLevel: false },
        { text: 'Medium trot / 6–7 steps collected trot', coeff: true, newAtLevel: false },
        { text: 'Extended trot', coeff: false, newAtLevel: false },
        { text: 'Shoulder-in', coeff: false, newAtLevel: false },
        { text: 'Half pass right (trot)', coeff: true, newAtLevel: true },
        { text: 'Half pass left (trot)', coeff: true, newAtLevel: true },
      ]},
      { label: 'Canter', color: '#3d6b46', movements: [
        { text: 'Collected canter', coeff: false, newAtLevel: false },
        { text: 'Medium canter', coeff: false, newAtLevel: false },
        { text: 'Extended canter', coeff: false, newAtLevel: false },
        { text: '5–6 steps very collected canter on circle', coeff: true, newAtLevel: true },
        { text: '3 single flying changes', coeff: true, newAtLevel: true },
        { text: 'Half-pass (canter)', coeff: false, newAtLevel: false },
        { text: 'Counter canter', coeff: false, newAtLevel: false },
      ]},
      { label: 'Walk', color: '#b8862a', movements: [
        { text: 'Collected walk', coeff: true, newAtLevel: true },
        { text: 'Extended walk', coeff: true, newAtLevel: false },
        { text: 'Medium walk', coeff: false, newAtLevel: false },
      ]},
      { label: 'Other', color: '#6b4f38', movements: [
        { text: 'Halt — immobility', coeff: false, newAtLevel: false },
      ]},
    ],

    coefficients: [
      { movement: 'Medium trot / 6–7 steps collected trot', badge: '×2', type: 'movement', why: 'Tests the ability to shorten and collect within the gait — true collection, not just slowing down.' },
      { movement: 'Half pass right (trot)', badge: '×2', type: 'movement', why: 'Trot half-passes as coefficient at Fourth Level demand precision and established lateral work.' },
      { movement: 'Half pass left (trot)', badge: '×2', type: 'movement', why: 'Each rein scored independently — asymmetry between left and right is fully exposed.' },
      { movement: 'Collected walk', badge: '×2', type: 'movement', why: 'New at Fourth Level; clear four-beat rhythm with increased collection and self-carriage.' },
      { movement: 'Extended walk', badge: '×2', type: 'movement', why: 'Maximum overstride with total freedom in the neck. Any restriction is penalized.' },
      { movement: '5–6 steps very collected canter on circle', badge: '×2', type: 'movement', why: 'New at Fourth Level; introduces very collected canter — preparation for pirouette work.' },
      { movement: '3 single flying changes', badge: '×2', type: 'movement', why: 'Multiple single changes on diagonal; rhythm and straightness across the sequence.' },
      { movement: 'Impulsion', badge: '×2', type: 'collective', why: 'Highest USDF level demands maximum stored energy; powers collection and extensions.' },
      { movement: 'Submission', badge: '×2', type: 'collective', why: 'Willing, attentive response to aids; very collected work reveals training depth.' },
    ],

    assessItems: [
      { id: 'mt-ct',  text: 'Medium trot / 6–7 steps collected trot', note: 'Double coefficient · true collection within the gait', coeff: true, gaitGroup: 'trot' },
      { id: 'hp-tr',  text: 'Half pass right (trot)', note: 'Double coefficient · precision and established lateral work', coeff: true, gaitGroup: 'trot' },
      { id: 'hp-tl',  text: 'Half pass left (trot)', note: 'Double coefficient · asymmetry fully exposed', coeff: true, gaitGroup: 'trot' },
      { id: 'cw',     text: 'Collected walk', note: 'Double coefficient · new at Fourth Level · increased collection', coeff: true, gaitGroup: 'walk' },
      { id: 'ew',     text: 'Extended walk', note: 'Double coefficient · maximum overstride', coeff: true, gaitGroup: 'walk' },
      { id: 'vcc',    text: '5–6 steps very collected canter on circle', note: 'Double coefficient · new at Fourth Level · pirouette preparation', coeff: true, gaitGroup: 'canter' },
      { id: '3fc',    text: '3 single flying changes', note: 'Double coefficient · rhythm and straightness across sequence', coeff: true, gaitGroup: 'canter' },
      { id: 'imp',    text: 'Impulsion (collective)', note: 'Double coefficient · maximum stored energy', coeff: true, gaitGroup: 'other' },
      { id: 'sub',    text: 'Submission (collective)', note: 'Double coefficient · very collected work reveals training depth', coeff: true, gaitGroup: 'other' },
      { id: 'et',     text: 'Extended trot', note: 'Uphill balance with clear lengthening', coeff: false, gaitGroup: 'trot' },
      { id: 'ec',     text: 'Extended canter', note: 'Extension with balance and return to collection', coeff: false, gaitGroup: 'canter' },
      { id: 'hpc',    text: 'Half-pass (canter)', note: 'Crossing and bend in canter', coeff: false, gaitGroup: 'canter' },
      { id: 'si',     text: 'Shoulder-in', note: '30° / three tracks', coeff: false, gaitGroup: 'trot' },
      { id: 'halt',   text: 'Halt — immobility', note: 'Square halt, genuine immobility', coeff: false, gaitGroup: 'other' },
    ],

    directives: [
      { title: 'Highest Collection at USDF', body: 'Very collected canter and collected walk demand the greatest degree of collection seen at the national level — the horse must carry more weight behind' },
      { title: 'Pirouette Preparation', body: 'Very collected canter on circle introduces the quality needed for pirouettes; maintaining canter jump and activity is essential' },
      { title: 'Tempi Change Readiness', body: 'Multiple single flying changes on diagonal test rhythm and straightness — foundation for tempi changes at FEI' },
      { title: 'Bridge to FEI', body: 'Fourth Level is the direct preparation for Prix St. Georges; every movement should reflect FEI-level quality and self-carriage' },
    ],
  },

  // ─── FOURTH LEVEL TEST 2 ─────────────────────────────────────────────
  fourth_2: {
    testId: 'fourth_2',
    label: 'Fourth Level — Test 2',
    shortLabel: '4L T2',
    org: 'USEF/USDF',
    year: '2023',
    arena: '20×60',
    keyDifferences: 'Introduces walk half-pirouettes, working pirouettes in canter, and 4-tempi changes. Bridge to FEI.',

    movementGroups: [
      { label: 'Trot', color: '#2e5c82', movements: [
        { text: 'Collected trot', coeff: false, newAtLevel: false },
        { text: 'Medium trot', coeff: false, newAtLevel: false },
        { text: 'Extended trot', coeff: false, newAtLevel: false },
        { text: 'Shoulder-in', coeff: false, newAtLevel: false },
        { text: 'Half-pass (trot)', coeff: false, newAtLevel: false },
      ]},
      { label: 'Canter', color: '#3d6b46', movements: [
        { text: 'Collected canter', coeff: false, newAtLevel: false },
        { text: 'Medium canter', coeff: false, newAtLevel: false },
        { text: 'Extended canter', coeff: false, newAtLevel: false },
        { text: 'Half pass right (canter)', coeff: true, newAtLevel: false },
        { text: 'Half pass left (canter)', coeff: true, newAtLevel: false },
        { text: 'Working pirouette right (canter)', coeff: true, newAtLevel: true },
        { text: 'Working pirouette left (canter)', coeff: true, newAtLevel: true },
        { text: '3 flying changes every fourth stride', coeff: true, newAtLevel: true },
        { text: 'Single flying changes', coeff: false, newAtLevel: false },
      ]},
      { label: 'Walk', color: '#b8862a', movements: [
        { text: 'Collected walk', coeff: false, newAtLevel: true },
        { text: 'Extended walk', coeff: true, newAtLevel: false },
        { text: 'Medium walk', coeff: false, newAtLevel: false },
        { text: 'Half pirouette left (walk)', coeff: true, newAtLevel: true },
        { text: 'Half pirouette right (walk)', coeff: true, newAtLevel: true },
      ]},
      { label: 'Other', color: '#6b4f38', movements: [
        { text: 'Halt — immobility', coeff: false, newAtLevel: false },
      ]},
    ],

    coefficients: [
      { movement: 'Extended walk', badge: '×2', type: 'movement', why: 'Maximum overstride with total freedom in the neck. Any restriction is penalized.' },
      { movement: 'Half pirouette left (walk)', badge: '×2', type: 'movement', why: 'New at Fourth Level; clear two-beat walk maintained throughout the turn.' },
      { movement: 'Half pirouette right (walk)', badge: '×2', type: 'movement', why: 'Each direction scored separately — asymmetry exposed.' },
      { movement: 'Half pass right (canter)', badge: '×2', type: 'movement', why: 'Clear crossing and bend in canter; collection maintained throughout.' },
      { movement: 'Half pass left (canter)', badge: '×2', type: 'movement', why: 'Each rein scored independently — the harder direction cannot be hidden.' },
      { movement: 'Working pirouette right (canter)', badge: '×2', type: 'movement', why: 'New at Fourth Level; maintaining canter quality and collection in the turn.' },
      { movement: '3 flying changes every fourth stride', badge: '×2', type: 'movement', why: 'New at Fourth Level; 4-tempi changes test rhythm and straightness.' },
      { movement: 'Working pirouette left (canter)', badge: '×2', type: 'movement', why: 'Each direction scored separately; canter jump must be maintained.' },
      { movement: 'Impulsion', badge: '×2', type: 'collective', why: 'Highest USDF level demands maximum stored energy; powers pirouettes and tempi changes.' },
      { movement: 'Submission', badge: '×2', type: 'collective', why: 'Willing, attentive response; pirouette and tempi change quality reveals training depth.' },
    ],

    assessItems: [
      { id: 'ew',     text: 'Extended walk', note: 'Double coefficient · maximum overstride', coeff: true, gaitGroup: 'walk' },
      { id: 'hpw-l',  text: 'Half pirouette left (walk)', note: 'Double coefficient · new at Fourth Level · maintain walk rhythm', coeff: true, gaitGroup: 'walk' },
      { id: 'hpw-r',  text: 'Half pirouette right (walk)', note: 'Double coefficient · asymmetry exposed', coeff: true, gaitGroup: 'walk' },
      { id: 'hp-cr',  text: 'Half pass right (canter)', note: 'Double coefficient · crossing and bend in collection', coeff: true, gaitGroup: 'canter' },
      { id: 'hp-cl',  text: 'Half pass left (canter)', note: 'Double coefficient · harder direction cannot be hidden', coeff: true, gaitGroup: 'canter' },
      { id: 'wp-r',   text: 'Working pirouette right (canter)', note: 'Double coefficient · new at Fourth Level · canter quality in turn', coeff: true, gaitGroup: 'canter' },
      { id: '4t',     text: '3 flying changes every fourth stride', note: 'Double coefficient · new at Fourth Level · rhythm and straightness', coeff: true, gaitGroup: 'canter' },
      { id: 'wp-l',   text: 'Working pirouette left (canter)', note: 'Double coefficient · canter jump must be maintained', coeff: true, gaitGroup: 'canter' },
      { id: 'imp',    text: 'Impulsion (collective)', note: 'Double coefficient · maximum stored energy', coeff: true, gaitGroup: 'other' },
      { id: 'sub',    text: 'Submission (collective)', note: 'Double coefficient · pirouette and tempi quality reveals depth', coeff: true, gaitGroup: 'other' },
      { id: 'cw',     text: 'Collected walk', note: 'New at Fourth Level · increased collection', coeff: false, gaitGroup: 'walk' },
      { id: 'hpt',    text: 'Half-pass (trot)', note: 'Crossing and bend in trot', coeff: false, gaitGroup: 'trot' },
      { id: 'et',     text: 'Extended trot', note: 'Uphill balance with clear lengthening', coeff: false, gaitGroup: 'trot' },
      { id: 'ec',     text: 'Extended canter', note: 'Extension with balance and return to collection', coeff: false, gaitGroup: 'canter' },
      { id: 'si',     text: 'Shoulder-in', note: '30° / three tracks', coeff: false, gaitGroup: 'trot' },
      { id: 'halt',   text: 'Halt — immobility', note: 'Square halt, genuine immobility', coeff: false, gaitGroup: 'other' },
    ],

    directives: [
      { title: 'Highest Collection at USDF', body: 'Walk half-pirouettes and working pirouettes demand the greatest degree of collection at the national level' },
      { title: 'Pirouette Work', body: 'Working pirouettes must maintain canter quality, jump, and activity — the horse turns around the inside hind leg without losing rhythm' },
      { title: 'Tempi Changes', body: '4-tempi changes require consistent rhythm and straightness; each change must be clean and uphill' },
      { title: 'Bridge to FEI', body: 'Walk half-pirouettes and working pirouettes are direct preparation for the full pirouettes required at Prix St. Georges' },
    ],
  },

  // ─── FOURTH LEVEL TEST 3 ─────────────────────────────────────────────
  fourth_3: {
    testId: 'fourth_3',
    label: 'Fourth Level — Test 3',
    shortLabel: '4L T3',
    org: 'USEF/USDF',
    year: '2023',
    arena: '20×60',
    keyDifferences: 'Most demanding USDF test. Working half-pirouettes in canter and 3-tempi changes. Direct preparation for Prix St. Georges.',

    movementGroups: [
      { label: 'Trot', color: '#2e5c82', movements: [
        { text: 'Collected trot', coeff: false, newAtLevel: false },
        { text: 'Transition collected trot to extended trot and back', coeff: true, newAtLevel: false },
        { text: 'Medium trot', coeff: false, newAtLevel: false },
        { text: 'Shoulder-in', coeff: false, newAtLevel: false },
        { text: 'Half-pass (trot)', coeff: false, newAtLevel: false },
      ]},
      { label: 'Canter', color: '#3d6b46', movements: [
        { text: 'Collected canter', coeff: false, newAtLevel: false },
        { text: 'Medium canter', coeff: false, newAtLevel: false },
        { text: 'Extended canter', coeff: false, newAtLevel: false },
        { text: 'Half-pass (canter)', coeff: false, newAtLevel: false },
        { text: 'Working half-pirouette left (canter)', coeff: true, newAtLevel: true },
        { text: 'Working half-pirouette right (canter)', coeff: true, newAtLevel: true },
        { text: '3 flying changes every third stride', coeff: true, newAtLevel: true },
        { text: 'Single flying changes', coeff: false, newAtLevel: false },
      ]},
      { label: 'Walk', color: '#b8862a', movements: [
        { text: 'Collected walk', coeff: true, newAtLevel: true },
        { text: 'Extended walk', coeff: true, newAtLevel: false },
        { text: 'Medium walk', coeff: false, newAtLevel: false },
      ]},
      { label: 'Other', color: '#6b4f38', movements: [
        { text: 'Halt, rein back 4 steps, proceed collected trot', coeff: true, newAtLevel: false },
        { text: 'Halt — immobility', coeff: false, newAtLevel: false },
      ]},
    ],

    coefficients: [
      { movement: 'Transition collected trot to extended trot and back', badge: '×2', type: 'movement', why: 'Tests the range within the gait — clear difference between collected and extended while maintaining balance.' },
      { movement: 'Halt, rein back 4 steps, proceed collected trot', badge: '×2', type: 'movement', why: 'Tests obedience and suppleness; clean diagonal steps back with smooth transition to collected trot.' },
      { movement: 'Collected walk', badge: '×2', type: 'movement', why: 'Clear four-beat rhythm with increased collection and self-carriage; tension destroys it.' },
      { movement: 'Extended walk', badge: '×2', type: 'movement', why: 'Maximum overstride with total freedom in the neck. Any restriction is penalized.' },
      { movement: 'Working half-pirouette left (canter)', badge: '×2', type: 'movement', why: 'Most demanding pirouette at USDF level; canter quality and collection must be maintained.' },
      { movement: 'Working half-pirouette right (canter)', badge: '×2', type: 'movement', why: 'Each direction scored separately — the weaker rein has nowhere to hide.' },
      { movement: '3 flying changes every third stride', badge: '×2', type: 'movement', why: 'Most demanding tempi changes at USDF; rhythm and straightness across the sequence.' },
      { movement: 'Impulsion', badge: '×2', type: 'collective', why: 'Maximum stored energy required for the most demanding USDF movements.' },
      { movement: 'Submission', badge: '×2', type: 'collective', why: 'Willing, attentive response; the most demanding test reveals the partnership completely.' },
    ],

    assessItems: [
      { id: 'tran',   text: 'Transition collected trot to extended trot and back', note: 'Double coefficient · range within the gait with balance', coeff: true, gaitGroup: 'trot' },
      { id: 'rb',     text: 'Halt, rein back 4 steps, proceed collected trot', note: 'Double coefficient · obedience and suppleness', coeff: true, gaitGroup: 'other' },
      { id: 'cw',     text: 'Collected walk', note: 'Double coefficient · new at Fourth Level · increased collection', coeff: true, gaitGroup: 'walk' },
      { id: 'ew',     text: 'Extended walk', note: 'Double coefficient · maximum overstride', coeff: true, gaitGroup: 'walk' },
      { id: 'whp-l',  text: 'Working half-pirouette left (canter)', note: 'Double coefficient · most demanding pirouette at USDF', coeff: true, gaitGroup: 'canter' },
      { id: 'whp-r',  text: 'Working half-pirouette right (canter)', note: 'Double coefficient · weaker rein exposed', coeff: true, gaitGroup: 'canter' },
      { id: '3t',     text: '3 flying changes every third stride', note: 'Double coefficient · most demanding tempi at USDF', coeff: true, gaitGroup: 'canter' },
      { id: 'imp',    text: 'Impulsion (collective)', note: 'Double coefficient · maximum stored energy', coeff: true, gaitGroup: 'other' },
      { id: 'sub',    text: 'Submission (collective)', note: 'Double coefficient · most demanding test reveals partnership', coeff: true, gaitGroup: 'other' },
      { id: 'hpt',    text: 'Half-pass (trot)', note: 'Crossing and bend in trot', coeff: false, gaitGroup: 'trot' },
      { id: 'hpc',    text: 'Half-pass (canter)', note: 'Crossing and bend in canter', coeff: false, gaitGroup: 'canter' },
      { id: 'ec',     text: 'Extended canter', note: 'Extension with balance and return to collection', coeff: false, gaitGroup: 'canter' },
      { id: 'si',     text: 'Shoulder-in', note: '30° / three tracks', coeff: false, gaitGroup: 'trot' },
      { id: 'halt',   text: 'Halt — immobility', note: 'Square halt, genuine immobility', coeff: false, gaitGroup: 'other' },
    ],

    directives: [
      { title: 'Highest Collection at USDF', body: 'Working half-pirouettes in canter demand the greatest degree of collection at the national level — the horse must sit and carry' },
      { title: 'Pirouette Work', body: 'Working half-pirouettes must maintain canter quality, jump, and activity; direct preparation for full pirouettes at PSG' },
      { title: 'Tempi Changes', body: '3-tempi changes require consistent rhythm and straightness — each change clean, uphill, and without loss of balance' },
      { title: 'Bridge to FEI', body: 'The most demanding USDF test is direct preparation for Prix St. Georges; every movement should reflect FEI-level quality' },
    ],
  },

  // ─── PRIX ST. GEORGES ────────────────────────────────────────────────
  psg: {
    testId: 'psg',
    label: 'Prix St. Georges',
    shortLabel: 'PSG',
    org: 'FEI',
    year: '2022/2026',
    duration: '5:50',
    minAge: '7+',
    arena: '20×60',
    maxPoints: 340,
    keyDifferences: 'Introduction of half-pirouettes in canter (3–4 strides), 3-tempis and 4-tempis, half-pirouettes in walk.',

    movementGroups: [
      { label: 'Trot', color: '#2e5c82', movements: [
        { text: 'Collected trot', coeff: false, newAtLevel: false },
        { text: 'Medium trot', coeff: false, newAtLevel: false },
        { text: 'Extended trot', coeff: false, newAtLevel: false },
        { text: 'Shoulder-in', coeff: false, newAtLevel: false },
        { text: 'Half-pass right', coeff: true, newAtLevel: false },
        { text: 'Half-pass left', coeff: true, newAtLevel: false },
        { text: '8m volte', coeff: false, newAtLevel: true },
      ]},
      { label: 'Canter', color: '#3d6b46', movements: [
        { text: 'Collected canter', coeff: false, newAtLevel: false },
        { text: 'Extended canter', coeff: false, newAtLevel: false },
        { text: 'Half-pass with flying changes', coeff: false, newAtLevel: false },
        { text: 'Single flying changes', coeff: false, newAtLevel: false },
        { text: '4-tempi changes × 5', coeff: false, newAtLevel: true },
        { text: '3-tempi changes × 5', coeff: false, newAtLevel: true },
        { text: 'Half-pirouette left (3–4 strides)', coeff: true, newAtLevel: true },
        { text: 'Half-pirouette right (3–4 strides)', coeff: true, newAtLevel: true },
        { text: 'Counter canter', coeff: false, newAtLevel: false },
      ]},
      { label: 'Walk', color: '#b8862a', movements: [
        { text: 'Collected walk', coeff: true, newAtLevel: false },
        { text: 'Extended walk', coeff: true, newAtLevel: false },
        { text: 'Half-pirouette in walk left', coeff: false, newAtLevel: true },
        { text: 'Half-pirouette in walk right', coeff: false, newAtLevel: true },
      ]},
      { label: 'Other', color: '#6b4f38', movements: [
        { text: 'Halt — immobility', coeff: false, newAtLevel: false },
      ]},
    ],

    coefficients: [
      { movement: 'Trot half-pass right', badge: '×2', type: 'movement', why: 'Horse nearly parallel to long side, clear crossing, consistent bend. Each rein scored independently.' },
      { movement: 'Trot half-pass left', badge: '×2', type: 'movement', why: 'Asymmetry between left and right is fully exposed — each rein stands alone.' },
      { movement: 'Collected walk', badge: '×2', type: 'movement', why: 'Clear four-beat rhythm, self-carriage, suppleness through the back. Tension destroys it.' },
      { movement: 'Extended walk', badge: '×2', type: 'movement', why: 'Maximum overstride with total freedom in the neck. Any restriction is penalized.' },
      { movement: 'Half-pirouette left (canter)', badge: '×2', type: 'movement', why: 'New at PSG. 3–4 strides, energy upward, clear jump of canter maintained throughout.' },
      { movement: 'Half-pirouette right (canter)', badge: '×2', type: 'movement', why: 'New at PSG. Each direction scored separately — the weaker rein has nowhere to hide.' },
      { movement: 'Harmony', badge: '×2', type: 'collective', why: 'Cooperation, lightness, effectiveness, sensitivity of aids, adherence to training scale.' },
    ],

    assessItems: [
      { id: 'hp-tr',  text: 'Trot half-pass right', note: 'Double coefficient · each rein scored independently', coeff: true, gaitGroup: 'trot' },
      { id: 'hp-tl',  text: 'Trot half-pass left', note: 'Double coefficient · asymmetry fully exposed', coeff: true, gaitGroup: 'trot' },
      { id: 'cw',     text: 'Collected walk', note: 'Double coefficient · tension destroys the four-beat rhythm', coeff: true, gaitGroup: 'walk' },
      { id: 'ew',     text: 'Extended walk', note: 'Double coefficient · maximum overstride; any restriction penalized', coeff: true, gaitGroup: 'walk' },
      { id: 'hpl',    text: 'Half-pirouette left (canter)', note: 'Double coefficient · new at PSG · 3–4 strides; energy upward', coeff: true, gaitGroup: 'canter' },
      { id: 'hpr',    text: 'Half-pirouette right (canter)', note: 'Double coefficient · new at PSG', coeff: true, gaitGroup: 'canter' },
      { id: 'harm',   text: 'Harmony (collective)', note: 'Double coefficient · cooperation, lightness, aids sensitivity', coeff: true, gaitGroup: 'other' },
      { id: '4t',     text: '4-tempi changes × 5', note: 'New at PSG · straightness and rhythm matter as much as timing', coeff: false, gaitGroup: 'canter' },
      { id: '3t',     text: '3-tempi changes × 5', note: 'New at PSG · loss of rhythm or straightness drops score quickly', coeff: false, gaitGroup: 'canter' },
      { id: 'hpwl',   text: 'Half-pirouette in walk left', note: 'New at PSG · clear two-beat walk maintained throughout', coeff: false, gaitGroup: 'walk' },
      { id: 'hpwr',   text: 'Half-pirouette in walk right', note: 'New at PSG', coeff: false, gaitGroup: 'walk' },
      { id: 'hpc',    text: 'Half-pass with flying changes (canter)', note: 'Prompt change of bend; consistent angle and crossing', coeff: false, gaitGroup: 'canter' },
      { id: 'sfc',    text: 'Single flying changes', note: 'Straightness and uphill tendency both scored', coeff: false, gaitGroup: 'canter' },
      { id: '8v',     text: '8m volte', note: 'New at PSG · geometry matters; will bulge if over-size', coeff: false, gaitGroup: 'trot' },
      { id: 'si',     text: 'Shoulder-in', note: '30° / three tracks; not four-track overbending', coeff: false, gaitGroup: 'trot' },
      { id: 'et',     text: 'Extended trot', note: 'Uphill tendency and clear return to collection both scored', coeff: false, gaitGroup: 'trot' },
      { id: 'ec',     text: 'Extended canter', note: 'Return to collection is part of the picture', coeff: false, gaitGroup: 'canter' },
      { id: 'halt',   text: 'Halt — immobility', note: 'Square halt, genuine immobility before moving off', coeff: false, gaitGroup: 'other' },
    ],

    directives: [
      { title: 'Regularity & Freedom', body: 'Pure, clear rhythm with engagement and elasticity in all gaits' },
      { title: 'Collection & Self-Carriage', body: 'The horse carries itself; the rider\'s hand supports but does not hold the balance' },
      { title: 'Impulsion', body: 'Stored energy that can be released into any movement; not speed' },
      { title: 'Straightness', body: 'Hind feet track up on forefeet; no haunches trailing or shoulders escaping' },
      { title: 'Submission', body: 'Willing, attentive, harmonious; jaw or neck tension reads immediately as resistance' },
      { title: 'Harmony (collective ×2)', body: 'Cooperation, lightness, effectiveness, sensitivity of aids, adherence to training scale — the only doubled collective' },
    ],
  },

  // ─── INTERMEDIATE I ──────────────────────────────────────────────────
  inter_1: {
    testId: 'inter_1',
    label: 'Intermediate I',
    shortLabel: 'Inter I',
    org: 'FEI',
    year: '2023/2026',
    duration: '5:30',
    minAge: '7+',
    arena: '20×60',
    maxPoints: 340,
    keyDifferences: 'Full pirouettes (6–8 strides) replace half-pirouettes. 2-tempis appear. Zigzag becomes a coefficient. Half-pirouettes in walk disappear. Rein back added.',

    movementGroups: [
      { label: 'Trot', color: '#2e5c82', movements: [
        { text: 'Collected trot', coeff: false, newAtLevel: false },
        { text: 'Medium trot', coeff: false, newAtLevel: false },
        { text: 'Extended trot', coeff: false, newAtLevel: false },
        { text: 'Shoulder-in', coeff: false, newAtLevel: false },
        { text: 'Half-pass right', coeff: true, newAtLevel: false },
        { text: 'Half-pass left', coeff: true, newAtLevel: false },
        { text: '8m volte', coeff: false, newAtLevel: false },
      ]},
      { label: 'Canter', color: '#3d6b46', movements: [
        { text: 'Collected canter', coeff: false, newAtLevel: false },
        { text: 'Extended canter', coeff: false, newAtLevel: false },
        { text: 'Zigzag (3 half-passes × 5m, flying changes)', coeff: true, newAtLevel: true },
        { text: 'Single flying changes', coeff: false, newAtLevel: false },
        { text: '3-tempi changes × 5', coeff: false, newAtLevel: false },
        { text: '2-tempi changes × 7', coeff: false, newAtLevel: true },
        { text: 'Full pirouette left (6–8 strides)', coeff: true, newAtLevel: true },
        { text: 'Full pirouette right (6–8 strides)', coeff: true, newAtLevel: true },
      ]},
      { label: 'Walk', color: '#b8862a', movements: [
        { text: 'Collected walk', coeff: true, newAtLevel: false },
        { text: 'Extended walk', coeff: true, newAtLevel: false },
      ]},
      { label: 'Other', color: '#6b4f38', movements: [
        { text: 'Halt — immobility', coeff: false, newAtLevel: false },
        { text: 'Rein back (5 steps)', coeff: false, newAtLevel: true },
      ]},
    ],

    coefficients: [
      { movement: 'Trot half-pass right', badge: '×2', type: 'movement', why: 'Same as PSG — each rein scored independently; asymmetry is fully visible.' },
      { movement: 'Trot half-pass left', badge: '×2', type: 'movement', why: 'Each rein stands alone — the harder direction cannot be hidden.' },
      { movement: 'Collected walk', badge: '×2', type: 'movement', why: 'Clear four-beat rhythm, self-carriage, suppleness through the back.' },
      { movement: 'Extended walk', badge: '×2', type: 'movement', why: 'Maximum overstride with total freedom. Any restriction is penalized.' },
      { movement: 'Zigzag (canter)', badge: '×2', type: 'movement', why: 'New coefficient at Inter I. 3 half-passes with flying changes; prompt change of bend, consistent angle throughout.' },
      { movement: 'Full pirouette left (canter)', badge: '×2', type: 'movement', why: 'New at Inter I. 6–8 strides; must maintain clear canter jump and collection throughout.' },
      { movement: 'Full pirouette right (canter)', badge: '×2', type: 'movement', why: 'Each direction scored separately. The most technically demanding new movement at this level.' },
      { movement: 'Harmony', badge: '×2', type: 'collective', why: 'Cooperation, lightness, effectiveness, sensitivity of aids, adherence to training scale.' },
    ],

    assessItems: [
      { id: 'hp-tr',  text: 'Trot half-pass right', note: 'Double coefficient · each rein scored independently', coeff: true, gaitGroup: 'trot' },
      { id: 'hp-tl',  text: 'Trot half-pass left', note: 'Double coefficient · asymmetry fully exposed', coeff: true, gaitGroup: 'trot' },
      { id: 'cw',     text: 'Collected walk', note: 'Double coefficient', coeff: true, gaitGroup: 'walk' },
      { id: 'ew',     text: 'Extended walk', note: 'Double coefficient · maximum overstride; any restriction penalized', coeff: true, gaitGroup: 'walk' },
      { id: 'zig',    text: 'Zigzag (3 half-passes, flying changes)', note: 'Double coefficient · new at Inter I · prompt change of bend each direction', coeff: true, gaitGroup: 'canter' },
      { id: 'pirl',   text: 'Full pirouette left (6–8 strides)', note: 'Double coefficient · new at Inter I · must maintain canter jump', coeff: true, gaitGroup: 'canter' },
      { id: 'pirr',   text: 'Full pirouette right (6–8 strides)', note: 'Double coefficient · new at Inter I · most demanding new movement', coeff: true, gaitGroup: 'canter' },
      { id: 'harm',   text: 'Harmony (collective)', note: 'Double coefficient', coeff: true, gaitGroup: 'other' },
      { id: '2t',     text: '2-tempi changes × 7', note: 'New at Inter I · rhythm and straightness across 7 changes', coeff: false, gaitGroup: 'canter' },
      { id: '3t',     text: '3-tempi changes × 5', note: 'Carried forward from PSG · must now be more confirmed', coeff: false, gaitGroup: 'canter' },
      { id: 'sfc',    text: 'Single flying changes', note: 'Straightness and uphill tendency both scored', coeff: false, gaitGroup: 'canter' },
      { id: '8v',     text: '8m volte', note: 'Carried from PSG; geometry and rhythm', coeff: false, gaitGroup: 'trot' },
      { id: 'si',     text: 'Shoulder-in', note: '30° / three tracks', coeff: false, gaitGroup: 'trot' },
      { id: 'et',     text: 'Extended trot', note: 'Uphill tendency; clear return to collection', coeff: false, gaitGroup: 'trot' },
      { id: 'ec',     text: 'Extended canter', note: 'Return to collection is part of the picture', coeff: false, gaitGroup: 'canter' },
      { id: 'rb',     text: 'Rein back (5 steps)', note: 'New at Inter I · 5 clean steps back, straight, willing', coeff: false, gaitGroup: 'other' },
      { id: 'halt',   text: 'Halt — immobility', note: 'Square halt, genuine immobility', coeff: false, gaitGroup: 'other' },
    ],

    directives: [
      { title: 'Regularity & Freedom', body: 'Pure, clear rhythm with engagement and elasticity in all gaits' },
      { title: 'Collection & Self-Carriage', body: 'Higher degree of collection required; rein back tests obedience and suppleness' },
      { title: 'Impulsion', body: 'Stored energy that powers the pirouettes and tempi changes; not rush or tension' },
      { title: 'Straightness', body: 'Zigzag half-passes expose any lateral evasion — each change of direction must be crisp' },
      { title: 'Submission', body: 'Willing, attentive, harmonious; pirouette quality reveals training depth' },
      { title: 'Harmony (collective ×2)', body: 'Cooperation, lightness, effectiveness, sensitivity of aids, adherence to training scale' },
    ],
  },

  // ─── INTERMEDIATE II ─────────────────────────────────────────────────
  inter_2: {
    testId: 'inter_2',
    label: 'Intermediate II',
    shortLabel: 'Inter II',
    org: 'FEI',
    year: '2023/2026',
    duration: '5:25',
    minAge: '8+',
    arena: '20×60',
    maxPoints: 340,
    keyDifferences: 'Introduction of PASSAGE and PIAFFE — entirely new movement categories. 1-tempis (every stride). Trot zigzag. Medium canter added.',

    movementGroups: [
      { label: 'Trot', color: '#2e5c82', movements: [
        { text: 'Collected trot', coeff: false, newAtLevel: false },
        { text: 'Extended trot', coeff: false, newAtLevel: false },
        { text: 'Zigzag (3 half-passes × 5m, trot)', coeff: true, newAtLevel: true },
        { text: 'Passage', coeff: false, newAtLevel: true },
        { text: 'Piaffe (8–10 steps)', coeff: false, newAtLevel: true },
        { text: 'Transitions passage–piaffe–passage', coeff: false, newAtLevel: true },
      ]},
      { label: 'Canter', color: '#3d6b46', movements: [
        { text: 'Collected canter', coeff: false, newAtLevel: false },
        { text: 'Medium canter', coeff: false, newAtLevel: true },
        { text: 'Extended canter', coeff: false, newAtLevel: false },
        { text: 'Half-pass in canter', coeff: false, newAtLevel: false },
        { text: 'Single flying changes', coeff: false, newAtLevel: false },
        { text: '2-tempi changes × 7', coeff: false, newAtLevel: false },
        { text: '1-tempi changes × 11', coeff: false, newAtLevel: true },
        { text: 'Pirouette left (6–8 strides)', coeff: true, newAtLevel: false },
        { text: 'Pirouette right (6–8 strides)', coeff: true, newAtLevel: false },
      ]},
      { label: 'Walk', color: '#b8862a', movements: [
        { text: 'Collected walk', coeff: true, newAtLevel: false },
        { text: 'Extended walk', coeff: true, newAtLevel: false },
      ]},
      { label: 'Other', color: '#6b4f38', movements: [
        { text: 'Halt — immobility', coeff: false, newAtLevel: false },
      ]},
    ],

    coefficients: [
      { movement: 'Trot zigzag (3 half-passes)', badge: '×2', type: 'movement', why: 'New at Inter II. Demands consistent angle and prompt change of bend in trot.' },
      { movement: 'Extended walk', badge: '×2', type: 'movement', why: 'Maximum overstride with total freedom. Any restriction is penalized.' },
      { movement: 'Collected walk', badge: '×2', type: 'movement', why: 'Clear four-beat rhythm, self-carriage, suppleness through the back.' },
      { movement: 'Pirouette left (canter)', badge: '×2', type: 'movement', why: '6–8 strides; must maintain clear canter jump and collection.' },
      { movement: 'Pirouette right (canter)', badge: '×2', type: 'movement', why: 'Each direction scored separately.' },
      { movement: 'Harmony', badge: '×2', type: 'collective', why: 'Cooperation, lightness, effectiveness, sensitivity of aids, adherence to training scale.' },
    ],

    assessItems: [
      { id: 'tzz',    text: 'Trot zigzag (3 half-passes)', note: 'Double coefficient · new at Inter II', coeff: true, gaitGroup: 'trot' },
      { id: 'cw',     text: 'Collected walk', note: 'Double coefficient', coeff: true, gaitGroup: 'walk' },
      { id: 'ew',     text: 'Extended walk', note: 'Double coefficient · maximum overstride', coeff: true, gaitGroup: 'walk' },
      { id: 'pirl',   text: 'Pirouette left (canter)', note: 'Double coefficient · 6–8 strides', coeff: true, gaitGroup: 'canter' },
      { id: 'pirr',   text: 'Pirouette right (canter)', note: 'Double coefficient', coeff: true, gaitGroup: 'canter' },
      { id: 'harm',   text: 'Harmony (collective)', note: 'Double coefficient', coeff: true, gaitGroup: 'other' },
      { id: 'pass',   text: 'Passage', note: 'NEW at Inter II · elevated trot with prolonged suspension', coeff: false, gaitGroup: 'trot' },
      { id: 'piaffe', text: 'Piaffe (8–10 steps)', note: 'NEW at Inter II · highly collected trot on the spot', coeff: false, gaitGroup: 'trot' },
      { id: 'ppp',    text: 'Passage–piaffe–passage transitions', note: 'NEW at Inter II · seamless quality transitions', coeff: false, gaitGroup: 'trot' },
      { id: '1t',     text: '1-tempi changes × 11', note: 'New at Inter II · every stride; rhythm and straightness critical', coeff: false, gaitGroup: 'canter' },
      { id: '2t',     text: '2-tempi changes × 7', note: 'Carried forward · must be confirmed', coeff: false, gaitGroup: 'canter' },
      { id: 'hpc',    text: 'Half-pass in canter', note: 'Maintain collection and rhythm', coeff: false, gaitGroup: 'canter' },
      { id: 'sfc',    text: 'Single flying changes', note: 'Straightness and uphill tendency', coeff: false, gaitGroup: 'canter' },
      { id: 'mc',     text: 'Medium canter', note: 'New at Inter II · clear lengthening with balance', coeff: false, gaitGroup: 'canter' },
      { id: 'ec',     text: 'Extended canter', note: 'Return to collection is part of the picture', coeff: false, gaitGroup: 'canter' },
      { id: 'et',     text: 'Extended trot', note: 'Uphill tendency; clear return to collection', coeff: false, gaitGroup: 'trot' },
      { id: 'halt',   text: 'Halt — immobility', note: 'Square halt, genuine immobility', coeff: false, gaitGroup: 'other' },
    ],

    directives: [
      { title: 'Regularity & Freedom', body: 'Pure, clear rhythm; passage and piaffe demand exceptional regularity' },
      { title: 'Collection & Self-Carriage', body: 'Highest degree of collection yet; piaffe requires maximum engagement with minimal forward' },
      { title: 'Impulsion', body: 'Passage requires stored energy expressed as elevation; piaffe is impulsion without forward movement' },
      { title: 'Straightness', body: 'Trot zigzag and 1-tempis expose any lateral weakness' },
      { title: 'Submission', body: 'Willing, attentive; passage/piaffe quality reveals trust and training depth' },
      { title: 'Harmony (collective ×2)', body: 'Cooperation, lightness, effectiveness, sensitivity of aids, adherence to training scale' },
    ],
  },

  // ─── GRAND PRIX ──────────────────────────────────────────────────────
  grand_prix: {
    testId: 'grand_prix',
    label: 'Grand Prix',
    shortLabel: 'GP',
    org: 'FEI',
    year: '2022/2026',
    duration: '6:30',
    minAge: '8+',
    arena: '20×60',
    maxPoints: 460,
    keyDifferences: 'Multiple piaffe sections (12–15 steps), extensive passage work, longer change sequences, complex 5-half-pass zigzag, transitions from walk to passage.',

    movementGroups: [
      { label: 'Trot', color: '#2e5c82', movements: [
        { text: 'Collected trot', coeff: false, newAtLevel: false },
        { text: 'Extended trot', coeff: false, newAtLevel: false },
        { text: 'Half-pass right', coeff: true, newAtLevel: false },
        { text: 'Half-pass left', coeff: true, newAtLevel: false },
        { text: 'Passage (multiple sections)', coeff: false, newAtLevel: false },
        { text: 'Piaffe (12–15 steps, 3×)', coeff: true, newAtLevel: true },
        { text: 'Passage–piaffe–passage transitions', coeff: false, newAtLevel: false },
      ]},
      { label: 'Canter', color: '#3d6b46', movements: [
        { text: 'Collected canter', coeff: false, newAtLevel: false },
        { text: 'Extended canter', coeff: false, newAtLevel: false },
        { text: 'Half-pass in canter', coeff: false, newAtLevel: false },
        { text: 'Zigzag (5 half-passes with changes)', coeff: true, newAtLevel: true },
        { text: 'Single flying changes', coeff: false, newAtLevel: false },
        { text: '2-tempi changes × 9', coeff: false, newAtLevel: false },
        { text: '1-tempi changes × 15', coeff: true, newAtLevel: true },
        { text: 'Pirouette left (6–8 strides)', coeff: true, newAtLevel: false },
        { text: 'Pirouette right (6–8 strides)', coeff: true, newAtLevel: false },
      ]},
      { label: 'Walk', color: '#b8862a', movements: [
        { text: 'Collected walk', coeff: true, newAtLevel: false },
        { text: 'Extended walk', coeff: true, newAtLevel: false },
        { text: 'Walk–passage transitions', coeff: false, newAtLevel: true },
      ]},
      { label: 'Other', color: '#6b4f38', movements: [
        { text: 'Halt — immobility', coeff: false, newAtLevel: false },
        { text: 'Rein back (5 steps)', coeff: false, newAtLevel: false },
      ]},
    ],

    coefficients: [
      { movement: 'Trot half-pass right', badge: '×2', type: 'movement', why: 'Each rein scored independently.' },
      { movement: 'Trot half-pass left', badge: '×2', type: 'movement', why: 'Asymmetry fully exposed.' },
      { movement: 'Piaffe at D (12–15 steps)', badge: '×2', type: 'movement', why: 'First of three piaffe sections; maximum engagement on the spot.' },
      { movement: 'Extended walk', badge: '×2', type: 'movement', why: 'Maximum overstride with total freedom.' },
      { movement: 'Collected walk', badge: '×2', type: 'movement', why: 'Clear four-beat rhythm, self-carriage.' },
      { movement: 'Piaffe at I (12–15 steps)', badge: '×2', type: 'movement', why: 'Second piaffe; consistent quality across repetitions.' },
      { movement: 'Zigzag (5 half-passes)', badge: '×2', type: 'movement', why: 'Complex pattern with 5 direction changes and flying changes.' },
      { movement: '15 flying changes every stride', badge: '×2', type: 'movement', why: 'Longest tempi sequence; rhythm and straightness critical.' },
      { movement: 'Pirouette left (canter)', badge: '×2', type: 'movement', why: '6–8 strides; clear canter jump maintained.' },
      { movement: 'Pirouette right (canter)', badge: '×2', type: 'movement', why: 'Each direction scored separately.' },
      { movement: 'Piaffe at X (12–15 steps)', badge: '×2', type: 'movement', why: 'Third and final piaffe; judges expect the best here.' },
      { movement: 'Harmony', badge: '×2', type: 'collective', why: 'Cooperation, lightness, effectiveness, sensitivity of aids, adherence to training scale.' },
    ],

    assessItems: [
      { id: 'hp-tr',   text: 'Trot half-pass right', note: 'Double coefficient', coeff: true, gaitGroup: 'trot' },
      { id: 'hp-tl',   text: 'Trot half-pass left', note: 'Double coefficient', coeff: true, gaitGroup: 'trot' },
      { id: 'pf-d',    text: 'Piaffe at D (12–15 steps)', note: 'Double coefficient · first of three', coeff: true, gaitGroup: 'trot' },
      { id: 'pf-i',    text: 'Piaffe at I (12–15 steps)', note: 'Double coefficient · second of three', coeff: true, gaitGroup: 'trot' },
      { id: 'pf-x',    text: 'Piaffe at X (12–15 steps)', note: 'Double coefficient · third; judges expect the best', coeff: true, gaitGroup: 'trot' },
      { id: 'cw',      text: 'Collected walk', note: 'Double coefficient', coeff: true, gaitGroup: 'walk' },
      { id: 'ew',      text: 'Extended walk', note: 'Double coefficient', coeff: true, gaitGroup: 'walk' },
      { id: 'zig5',    text: 'Zigzag (5 half-passes, canter)', note: 'Double coefficient · complex pattern', coeff: true, gaitGroup: 'canter' },
      { id: '1t15',    text: '1-tempi changes × 15', note: 'Double coefficient · longest sequence', coeff: true, gaitGroup: 'canter' },
      { id: 'pirl',    text: 'Pirouette left (canter)', note: 'Double coefficient', coeff: true, gaitGroup: 'canter' },
      { id: 'pirr',    text: 'Pirouette right (canter)', note: 'Double coefficient', coeff: true, gaitGroup: 'canter' },
      { id: 'harm',    text: 'Harmony (collective)', note: 'Double coefficient', coeff: true, gaitGroup: 'other' },
      { id: 'pass',    text: 'Passage (multiple sections)', note: 'Elevated trot; consistent quality throughout', coeff: false, gaitGroup: 'trot' },
      { id: 'ppp',     text: 'Passage–piaffe–passage transitions', note: 'Seamless transitions', coeff: false, gaitGroup: 'trot' },
      { id: 'wp',      text: 'Walk–passage transitions', note: 'New at GP · from stillness to elevation', coeff: false, gaitGroup: 'walk' },
      { id: '2t',      text: '2-tempi changes × 9', note: 'Rhythm and straightness across 9 changes', coeff: false, gaitGroup: 'canter' },
      { id: 'hpc',     text: 'Half-pass in canter', note: 'Collection and rhythm', coeff: false, gaitGroup: 'canter' },
      { id: 'sfc',     text: 'Single flying changes', note: 'Straightness and uphill tendency', coeff: false, gaitGroup: 'canter' },
      { id: 'ec',      text: 'Extended canter', note: 'Return to collection', coeff: false, gaitGroup: 'canter' },
      { id: 'et',      text: 'Extended trot', note: 'Uphill tendency', coeff: false, gaitGroup: 'trot' },
      { id: 'rb',      text: 'Rein back (5 steps)', note: 'Straight, willing', coeff: false, gaitGroup: 'other' },
      { id: 'halt',    text: 'Halt — immobility', note: 'Square halt', coeff: false, gaitGroup: 'other' },
    ],

    directives: [
      { title: 'Regularity & Freedom', body: 'Passage and piaffe demand exceptional regularity; every step is judged' },
      { title: 'Collection & Self-Carriage', body: 'The highest degree of collection; 12–15 step piaffe requires maximum engagement' },
      { title: 'Impulsion', body: 'Passage is controlled explosion upward; piaffe is maximum energy with minimal forward' },
      { title: 'Straightness', body: '15 one-tempis on a diagonal expose every lateral weakness' },
      { title: 'Submission', body: 'Three piaffes and extensive passage reveal the depth of training and partnership' },
      { title: 'Harmony (collective ×2)', body: 'Cooperation, lightness, effectiveness, sensitivity of aids, adherence to training scale' },
    ],
  },

  // ─── GRAND PRIX SPECIAL ──────────────────────────────────────────────
  gp_special: {
    testId: 'gp_special',
    label: 'Grand Prix Special',
    shortLabel: 'GPS',
    org: 'FEI',
    year: '2022/2026',
    duration: '6:40',
    minAge: '8+',
    arena: '20×60',
    maxPoints: 470,
    keyDifferences: 'Most extensive passage work of all tests, 24 total 1-tempis, walk directly to piaffe transitions, pirouettes on centerline.',

    movementGroups: [
      { label: 'Trot', color: '#2e5c82', movements: [
        { text: 'Collected trot', coeff: false, newAtLevel: false },
        { text: 'Extended trot', coeff: false, newAtLevel: false },
        { text: 'Half-pass left', coeff: true, newAtLevel: false },
        { text: 'Half-pass right', coeff: true, newAtLevel: false },
        { text: 'Passage (extensive, multiple sections)', coeff: false, newAtLevel: false },
        { text: 'Piaffe (12–15 steps, 3×)', coeff: true, newAtLevel: false },
        { text: 'Passage–piaffe–passage transitions', coeff: false, newAtLevel: false },
        { text: 'Passage–extended trot–passage transitions', coeff: false, newAtLevel: true },
      ]},
      { label: 'Canter', color: '#3d6b46', movements: [
        { text: 'Collected canter', coeff: false, newAtLevel: false },
        { text: 'Extended canter', coeff: false, newAtLevel: false },
        { text: 'Half-pass in canter with flying changes', coeff: false, newAtLevel: false },
        { text: 'Single flying changes', coeff: false, newAtLevel: false },
        { text: '2-tempi changes × 9', coeff: false, newAtLevel: false },
        { text: '1-tempi changes × 24 (15 + 9)', coeff: false, newAtLevel: true },
        { text: 'Pirouette left on centerline (6–8 strides)', coeff: true, newAtLevel: true },
        { text: 'Pirouette right on centerline (6–8 strides)', coeff: true, newAtLevel: true },
      ]},
      { label: 'Walk', color: '#b8862a', movements: [
        { text: 'Collected walk', coeff: true, newAtLevel: false },
        { text: 'Extended walk', coeff: true, newAtLevel: false },
        { text: 'Walk–piaffe–passage transitions', coeff: false, newAtLevel: true },
      ]},
      { label: 'Other', color: '#6b4f38', movements: [
        { text: 'Halt — immobility', coeff: false, newAtLevel: false },
      ]},
    ],

    coefficients: [
      { movement: 'Trot half-pass left', badge: '×2', type: 'movement', why: 'Each rein scored independently.' },
      { movement: 'Trot half-pass right', badge: '×2', type: 'movement', why: 'Asymmetry fully exposed.' },
      { movement: 'Extended walk', badge: '×2', type: 'movement', why: 'Maximum overstride with total freedom.' },
      { movement: 'Collected walk', badge: '×2', type: 'movement', why: 'Clear four-beat rhythm, self-carriage.' },
      { movement: 'Piaffe at G (12–15 steps)', badge: '×2', type: 'movement', why: 'First piaffe in the Special.' },
      { movement: 'Piaffe at I (12–15 steps)', badge: '×2', type: 'movement', why: 'Second piaffe.' },
      { movement: 'Pirouette left on centerline', badge: '×2', type: 'movement', why: 'Centerline pirouettes are more exposed — nowhere to hide.' },
      { movement: 'Pirouette right on centerline', badge: '×2', type: 'movement', why: 'Each direction scored separately on the centerline.' },
      { movement: 'Piaffe at X (12–15 steps)', badge: '×2', type: 'movement', why: 'Third and final piaffe — judges expect the best.' },
      { movement: 'Harmony', badge: '×2', type: 'collective', why: 'Cooperation, lightness, effectiveness, sensitivity of aids, adherence to training scale.' },
    ],

    assessItems: [
      { id: 'hp-tl',   text: 'Trot half-pass left', note: 'Double coefficient', coeff: true, gaitGroup: 'trot' },
      { id: 'hp-tr',   text: 'Trot half-pass right', note: 'Double coefficient', coeff: true, gaitGroup: 'trot' },
      { id: 'cw',      text: 'Collected walk', note: 'Double coefficient', coeff: true, gaitGroup: 'walk' },
      { id: 'ew',      text: 'Extended walk', note: 'Double coefficient', coeff: true, gaitGroup: 'walk' },
      { id: 'pf-g',    text: 'Piaffe at G (12–15 steps)', note: 'Double coefficient · first piaffe', coeff: true, gaitGroup: 'trot' },
      { id: 'pf-i',    text: 'Piaffe at I (12–15 steps)', note: 'Double coefficient · second piaffe', coeff: true, gaitGroup: 'trot' },
      { id: 'pf-x',    text: 'Piaffe at X (12–15 steps)', note: 'Double coefficient · third; judges expect the best', coeff: true, gaitGroup: 'trot' },
      { id: 'pirl-cl', text: 'Pirouette left on centerline', note: 'Double coefficient · most exposed', coeff: true, gaitGroup: 'canter' },
      { id: 'pirr-cl', text: 'Pirouette right on centerline', note: 'Double coefficient', coeff: true, gaitGroup: 'canter' },
      { id: 'harm',    text: 'Harmony (collective)', note: 'Double coefficient', coeff: true, gaitGroup: 'other' },
      { id: 'pass',    text: 'Passage (extensive sections)', note: 'Most passage of any test', coeff: false, gaitGroup: 'trot' },
      { id: 'ppp',     text: 'Passage–piaffe–passage transitions', note: 'Seamless transitions', coeff: false, gaitGroup: 'trot' },
      { id: 'pep',     text: 'Passage–extended trot–passage', note: 'New at GPS · unique transition', coeff: false, gaitGroup: 'trot' },
      { id: 'wpp',     text: 'Walk–piaffe–passage transitions', note: 'New at GPS · from walk to piaffe directly', coeff: false, gaitGroup: 'walk' },
      { id: '1t24',    text: '1-tempi changes × 24', note: 'New at GPS · 15 + 9 across two sections', coeff: false, gaitGroup: 'canter' },
      { id: '2t',      text: '2-tempi changes × 9', note: 'Rhythm and straightness', coeff: false, gaitGroup: 'canter' },
      { id: 'hpc',     text: 'Half-pass in canter with flying changes', note: 'Collection and rhythm', coeff: false, gaitGroup: 'canter' },
      { id: 'sfc',     text: 'Single flying changes', note: 'Straightness and uphill tendency', coeff: false, gaitGroup: 'canter' },
      { id: 'ec',      text: 'Extended canter', note: 'Return to collection', coeff: false, gaitGroup: 'canter' },
      { id: 'et',      text: 'Extended trot', note: 'Uphill tendency', coeff: false, gaitGroup: 'trot' },
      { id: 'halt',    text: 'Halt — immobility', note: 'Square halt', coeff: false, gaitGroup: 'other' },
    ],

    directives: [
      { title: 'Regularity & Freedom', body: 'The most extensive passage work of all tests demands unwavering regularity' },
      { title: 'Collection & Self-Carriage', body: 'Walk directly to piaffe requires the deepest collection and trust' },
      { title: 'Impulsion', body: '24 one-tempis require sustained energy and balance across the longest sequence in dressage' },
      { title: 'Straightness', body: 'Centerline pirouettes and 24 one-tempis expose every lateral weakness' },
      { title: 'Submission', body: 'The most demanding test reveals the partnership in its entirety' },
      { title: 'Harmony (collective ×2)', body: 'Cooperation, lightness, effectiveness, sensitivity of aids, adherence to training scale' },
    ],
  },
};

// ── SERVICE API ──────────────────────────────────────────────────────────────

/**
 * Returns the full test data object for a given testId, or null if no data.
 */
export function getTestData(testId) {
  return FEI_TESTS[testId] || null;
}

/**
 * Returns the list of all standard tests for dropdowns.
 * Each entry: { value, label, shortLabel, hasFullData }
 */
export function getTestList() {
  return ALL_TESTS.map(t => ({
    value: t.value,
    label: t.label,
    shortLabel: t.shortLabel,
    hasFullData: !!FEI_TESTS[t.value],
  }));
}

/**
 * Returns the freestyle test list for dropdowns.
 */
export function getFreestyleTestList() {
  return FREESTYLE_TESTS.map(t => ({
    value: t.value,
    label: t.label,
    shortLabel: t.shortLabel,
    hasFullData: false, // No freestyle data yet
  }));
}

/**
 * Returns the assessItems array for a test (used for Flag for Prep / Assessment tabs).
 */
export function getAssessItems(testId) {
  const data = FEI_TESTS[testId];
  return data ? data.assessItems : [];
}

/**
 * Returns the coefficients array for a test.
 */
export function getCoefficients(testId) {
  const data = FEI_TESTS[testId];
  return data ? data.coefficients : [];
}

/**
 * Returns true if the test has complete movement/coefficient/directive data.
 */
export function isFullDataAvailable(testId) {
  return !!FEI_TESTS[testId];
}

/**
 * Returns the short label for a test value (e.g., 'psg' → 'PSG').
 */
export function getShortLabel(testValue) {
  const fei = FEI_TESTS[testValue];
  if (fei) return fei.shortLabel;
  const std = ALL_TESTS.find(t => t.value === testValue);
  if (std) return std.shortLabel;
  const fs = FREESTYLE_TESTS.find(t => t.value === testValue);
  if (fs) return fs.shortLabel;
  return testValue;
}

/**
 * Returns the full label for a test value (e.g., 'psg' → 'Prix St. Georges').
 */
export function getTestLabel(testValue) {
  const fei = FEI_TESTS[testValue];
  if (fei) return fei.label;
  const std = ALL_TESTS.find(t => t.value === testValue);
  if (std) return std.label;
  const fs = FREESTYLE_TESTS.find(t => t.value === testValue);
  if (fs) return fs.label;
  return testValue;
}
