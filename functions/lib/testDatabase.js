/**
 * Test Database Loader
 *
 * Loads dressage test JSON files and builds level-appropriate context
 * for prompt injection. Filters to rider's current level + 2-3 levels
 * ahead to keep token usage reasonable (~2-4K tokens per call).
 *
 * Files loaded from functions/data/ (copied from project root at deploy time).
 */

const path = require("path");

// ─── Load static JSON at module init ────────────────────────────────

const DATA_DIR = path.join(__dirname, "..", "data");

const comprehensiveDB = require(path.join(DATA_DIR, "comprehensive_dressage_test_database.json"));
const introTrainingTests = require(path.join(DATA_DIR, "usdf_intro_training_tests.json"));
const firstLevelTests = require(path.join(DATA_DIR, "usdf_first_level_tests.json"));
const secondThirdFourthTests = require(path.join(DATA_DIR, "usdf_tests_second_third_fourth.json"));
const feiTests = require(path.join(DATA_DIR, "fei_test_database_complete.json"));

// ─── Level Parsing ──────────────────────────────────────────────────

const LEVEL_MAP = {
  // Introductory
  introductory: 0, intro: 0, "intro level": 0, "introductory level": 0,
  // Training
  training: 1, "training level": 1,
  // First
  first: 2, "first level": 2, "1st": 2, "1st level": 2,
  // Second
  second: 3, "second level": 3, "2nd": 3, "2nd level": 3,
  // Third
  third: 4, "third level": 4, "3rd": 4, "3rd level": 4,
  // Fourth
  fourth: 5, "fourth level": 5, "4th": 5, "4th level": 5,
  // FEI levels
  "prix st. georges": 6, "prix st georges": 6, psg: 6,
  "intermediate i": 7, "intermediate 1": 7, "inter i": 7, "inter 1": 7, "i-1": 7,
  "intermediate ii": 8, "intermediate 2": 8, "inter ii": 8, "inter 2": 8, "i-2": 8,
  "grand prix": 9, gp: 9,
  "grand prix special": 10, gps: 10,
};

/**
 * Parse a free-text level string to a numeric level number (0-10).
 * Falls back to 1 (Training) if unrecognized.
 *
 * @param {string} levelString
 * @returns {number} 0-10
 */
function parseLevelToNumber(levelString) {
  if (typeof levelString !== "string" || !levelString.trim()) return 1;
  const normalized = levelString.trim().toLowerCase();
  if (LEVEL_MAP[normalized] !== undefined) return LEVEL_MAP[normalized];

  // Partial match fallback
  for (const [key, num] of Object.entries(LEVEL_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) return num;
  }

  return 1; // Default: Training
}

// ─── Level-to-File Mapping ──────────────────────────────────────────

const LEVEL_NAMES = [
  "introductory", "training", "first", "second", "third", "fourth",
  "prix_st_georges", "intermediate_1", "intermediate_2", "grand_prix", "grand_prix_special",
];

/**
 * Get the human-readable level name for a level number.
 */
function getLevelName(levelNum) {
  const names = [
    "Introductory", "Training", "First", "Second", "Third", "Fourth",
    "Prix St. Georges", "Intermediate I", "Intermediate II", "Grand Prix", "Grand Prix Special",
  ];
  return names[levelNum] || "Training";
}

/**
 * Load test details for the given level range.
 *
 * @param {number} minLevel - Start of range (inclusive)
 * @param {number} maxLevel - End of range (inclusive)
 * @returns {object[]} Array of test summary objects
 */
function loadTestsForRange(minLevel, maxLevel) {
  const tests = [];

  // Intro/Training (levels 0-1)
  if (minLevel <= 1 && maxLevel >= 0) {
    for (const t of introTrainingTests.tests || []) {
      tests.push(summarizeTest(t));
    }
  }

  // First (level 2)
  if (minLevel <= 2 && maxLevel >= 2) {
    for (const t of firstLevelTests.tests || []) {
      tests.push(summarizeTest(t));
    }
  }

  // Second/Third/Fourth (levels 3-5)
  if (minLevel <= 5 && maxLevel >= 3) {
    for (const t of secondThirdFourthTests.tests || []) {
      const tLevel = parseLevelToNumber(t.level);
      if (tLevel >= minLevel && tLevel <= maxLevel) {
        tests.push(summarizeTest(t));
      }
    }
  }

  // FEI (levels 6-10)
  if (maxLevel >= 6) {
    for (const t of feiTests.tests || []) {
      const tLevel = parseLevelToNumber(t.level);
      if (tLevel >= Math.max(minLevel, 6) && tLevel <= maxLevel) {
        tests.push(summarizeTest(t));
      }
    }
  }

  return tests;
}

/**
 * Create a compact test summary suitable for prompt injection.
 * Includes key info without full movement-by-movement details.
 */
function summarizeTest(test) {
  // Gather key movements from different possible structures
  let keyMovements = [];
  if (test.movements_by_gait) {
    for (const gait of Object.values(test.movements_by_gait)) {
      keyMovements.push(...gait);
    }
  }
  if (test.required_movements) {
    for (const gait of Object.values(test.required_movements)) {
      keyMovements.push(...gait);
    }
  }

  // Gather coefficient movements
  let coefficientMovements = [];
  if (test.coefficient_movements) {
    coefficientMovements = test.coefficient_movements.map(
      (m) => m.movement || m.name || m
    );
  }
  if (Array.isArray(test.movements)) {
    coefficientMovements = test.movements
      .filter((m) => m.coefficient && m.coefficient > 1)
      .map((m) => m.movement);
  }

  return {
    test_id: test.test_id,
    name: test.name,
    level: test.level,
    purpose: test.purpose || null,
    introduces: test.introduces || null,
    key_movements: keyMovements.slice(0, 20), // Cap at 20 for token efficiency
    coefficient_movements: coefficientMovements.slice(0, 8),
    max_points: test.test_info?.max_points || test.max_points || null,
    arena_size: test.test_info?.arena_size || test.arena_size || null,
  };
}

// ─── Level Progression Context ──────────────────────────────────────

/**
 * Extract level progression entries for the given range.
 */
function getLevelProgressionForRange(minLevel, maxLevel) {
  const progression = {};
  const levelProgression = comprehensiveDB.level_progression || {};

  for (const [key, value] of Object.entries(levelProgression)) {
    if (value.level_number >= minLevel && value.level_number <= maxLevel) {
      progression[key] = {
        level_number: value.level_number,
        description: value.description,
        key_movements: value.key_movements,
        introduces: value.introduces || null,
        purpose: value.purpose || null,
        bridge_to_fei: value.bridge_to_fei || null,
      };
    }
  }

  return progression;
}

/**
 * Extract movement glossary entries relevant to the level range.
 */
function getMovementGlossaryForRange(minLevel, maxLevel) {
  const glossary = comprehensiveDB.movement_glossary || {};
  const result = {};

  // Always include walk and trot basics
  result.walk = glossary.walk;
  result.trot = glossary.trot;

  // Include canter for all levels
  result.canter = glossary.canter;

  // Include lateral for Second+
  if (maxLevel >= 2) {
    result.lateral_movements = glossary.lateral_movements;
  }

  // Include special for Fourth+
  if (maxLevel >= 5) {
    result.special_movements = glossary.special_movements;
  }

  return result;
}

// ─── Detailed Test Context (Event Planner) ──────────────────────────

/**
 * Load full (non-summarized) test objects for a single level.
 *
 * @param {number} levelNum - Level number (0-10)
 * @returns {object[]} Raw test objects from the JSON files
 */
function loadFullTestsForLevel(levelNum) {
  if (levelNum <= 1) {
    // Intro (0) and Training (1) share a file — filter by level
    return (introTrainingTests.tests || []).filter((t) => {
      return parseLevelToNumber(t.level) === levelNum;
    });
  }
  if (levelNum === 2) {
    return firstLevelTests.tests || [];
  }
  if (levelNum >= 3 && levelNum <= 5) {
    return (secondThirdFourthTests.tests || []).filter((t) => {
      return parseLevelToNumber(t.level) === levelNum;
    });
  }
  if (levelNum >= 6) {
    return (feiTests.tests || []).filter((t) => {
      return parseLevelToNumber(t.level) === levelNum;
    });
  }
  return [];
}

/**
 * Normalize a single test's movement data into a consistent shape.
 * Handles schema differences across Intro/Training, First+, and FEI files.
 *
 * @param {object} test - Raw test object from a JSON file
 * @returns {object} Normalized test object
 */
function normalizeTestMovements(test) {
  const isFEI = !Array.isArray(test.movements) && test.required_movements;
  const isFreestyle = !Array.isArray(test.movements) && test.compulsory_elements;

  // Normalize movements array
  let movements = [];
  if (Array.isArray(test.movements)) {
    movements = test.movements.map((m) => ({
      number: m.number,
      marker: m.marker || "",
      movement: m.movement || m.description || "",
      directive: m.directive || m.directives || "",
      coefficient: m.coefficient || null,
    }));
  }

  // Normalize collective marks
  let collectiveMarks = [];
  if (Array.isArray(test.collective_marks)) {
    collectiveMarks = test.collective_marks.map((c) => ({
      category: c.category || "",
      description: c.description || "",
      coefficient: c.coefficient || null,
    }));
  }

  // Determine max points from various possible field names
  const maxPoints =
    test.test_info?.max_points ||
    test.max_points ||
    test.test_info?.max_total_points ||
    test.max_total_points ||
    null;

  // Determine arena size
  const arenaSize =
    test.test_info?.arena_size ||
    test.test_info?.arena_sizes?.[0] ||
    test.arena_size ||
    null;

  // Coefficient movements (explicit list at test level)
  let coefficientMovements = [];
  if (test.coefficient_movements) {
    coefficientMovements = test.coefficient_movements.map(
      (m) => (typeof m === "object" ? m.movement || m.name : m)
    );
  } else if (movements.length) {
    coefficientMovements = movements
      .filter((m) => m.coefficient && m.coefficient > 1)
      .map((m) => `#${m.number}: ${m.movement}`);
  }

  const normalized = {
    test_id: test.test_id,
    name: test.name,
    level: test.level,
    purpose: test.purpose || test.key_differences || null,
    movements,
    collectiveMarks,
    maxPoints,
    arenaSize,
    coefficientMovements,
    isFEI,
    isFreestyle,
  };

  // FEI-specific: include required_movements by gait
  if (isFEI) {
    normalized.requiredMovements = test.required_movements || {};
    normalized.duration = test.duration || null;
    normalized.minHorseAge = test.min_horse_age || null;
  }

  // Freestyle-specific: include compulsory elements + forbidden movements
  if (isFreestyle) {
    normalized.compulsoryElements = (test.compulsory_elements || []).map((e) => ({
      number: e.number,
      description: e.description,
      coefficient: e.coefficient || null,
      minimumRequirement: e.minimum_requirement || null,
    }));
    normalized.forbiddenMovements = test.forbidden_movements || null;
    normalized.additionallyAllowed = test.additionally_allowed || null;
  }

  return normalized;
}

/**
 * Format normalized tests into a detailed text block for prompt injection.
 *
 * @param {string} levelName - Human-readable level name
 * @param {number} levelNum - Level number (0-10)
 * @param {object[]} tests - Array of normalized test objects
 * @returns {string} Formatted text block
 */
function formatDetailedTestBlock(levelName, levelNum, tests) {
  const lines = [];
  lines.push(`DETAILED TEST REQUIREMENTS FOR ${levelName.toUpperCase()}:`);
  lines.push("");

  for (const test of tests) {
    lines.push(`TEST: ${test.test_id} — ${test.name}`);
    if (test.purpose) {
      lines.push(`  Purpose: ${test.purpose}`);
    }
    lines.push(`  Arena: ${test.arenaSize || "Standard"} | Max Points: ${test.maxPoints || "N/A"}`);

    if (test.isFEI) {
      // FEI tests: required movements by gait
      if (test.duration) lines.push(`  Duration: ${test.duration}`);
      if (test.minHorseAge) lines.push(`  Minimum Horse Age: ${test.minHorseAge}`);
      lines.push("");
      lines.push("  REQUIRED MOVEMENTS BY GAIT:");
      for (const [gait, mvts] of Object.entries(test.requiredMovements)) {
        const gaitName = gait.charAt(0).toUpperCase() + gait.slice(1);
        lines.push(`    ${gaitName}: ${mvts.join(", ")}`);
      }
      if (test.coefficientMovements.length > 0) {
        lines.push(`  COEFFICIENT MOVEMENTS (movement numbers): ${test.coefficientMovements.join(", ")}`);
      }
      lines.push("  Note: FEI test — individual movement sequence unavailable in database.");
      lines.push("  Use required movements and coefficient indicators for readiness analysis.");

    } else if (test.isFreestyle) {
      // Freestyle tests: compulsory elements
      lines.push("");
      lines.push("  COMPULSORY ELEMENTS:");
      for (const el of test.compulsoryElements) {
        const coeff = el.coefficient ? ` (coefficient: ${el.coefficient})` : "";
        const min = el.minimumRequirement ? ` [min: ${el.minimumRequirement}]` : "";
        lines.push(`    ${el.number}. ${el.description}${coeff}${min}`);
      }
      if (test.forbiddenMovements) {
        lines.push(`  FORBIDDEN MOVEMENTS: ${test.forbiddenMovements}`);
      }
      if (test.additionallyAllowed) {
        const allowed = Array.isArray(test.additionallyAllowed)
          ? test.additionallyAllowed.join(", ")
          : test.additionallyAllowed;
        lines.push(`  ADDITIONALLY ALLOWED: ${allowed}`);
      }

    } else {
      // USDF standard tests: full movement-by-movement
      lines.push("");
      lines.push("  MOVEMENTS (ride-through order):");
      for (const m of test.movements) {
        const coeff = m.coefficient && m.coefficient > 1 ? ` [COEFFICIENT: ${m.coefficient}x]` : "";
        lines.push(`    ${m.number}. ${m.marker} — ${m.movement}${coeff}`);
        if (m.directive) {
          lines.push(`       Directive: ${m.directive}`);
        }
      }

      if (test.coefficientMovements.length > 0) {
        lines.push("");
        lines.push(`  COEFFICIENT MOVEMENTS (double score impact): ${test.coefficientMovements.join("; ")}`);
      }
    }

    // Collective marks (common across USDF standard tests)
    if (test.collectiveMarks.length > 0) {
      lines.push("");
      lines.push("  COLLECTIVE MARKS:");
      for (const c of test.collectiveMarks) {
        const coeff = c.coefficient ? ` (coefficient: ${c.coefficient})` : "";
        lines.push(`    ${c.category}: ${c.description}${coeff}`);
      }
    }

    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Build detailed test context for Event Planner prompt injection.
 * Unlike buildTestDatabaseContext() which gives summaries across a range,
 * this returns full movement-by-movement breakdowns for tests at ONE level.
 *
 * @param {string} targetLevel - Free-text level string
 * @returns {{ levelName: string, levelNum: number, tests: object[], textBlock: string }}
 */
function buildDetailedTestContext(targetLevel) {
  const levelNum = parseLevelToNumber(targetLevel);
  const levelName = getLevelName(levelNum);

  const fullTests = loadFullTestsForLevel(levelNum);
  const normalizedTests = fullTests.map(normalizeTestMovements);
  const textBlock = formatDetailedTestBlock(levelName, levelNum, normalizedTests);

  return { levelName, levelNum, tests: normalizedTests, textBlock };
}

// ─── Primary Export ─────────────────────────────────────────────────

/**
 * Build a formatted text block of test database context for prompt injection.
 * Filtered to the rider's current level + 2-3 levels ahead.
 *
 * @param {string} currentLevel - Free-text level string from rider/horse profile
 * @returns {string} Formatted text block (~2-4K tokens)
 */
function buildTestDatabaseContext(currentLevel) {
  const levelNum = parseLevelToNumber(currentLevel);
  const minLevel = levelNum;
  const maxLevel = Math.min(levelNum + 3, 10);
  const currentName = getLevelName(levelNum);

  const progression = getLevelProgressionForRange(minLevel, maxLevel);
  const tests = loadTestsForRange(minLevel, maxLevel);
  const glossary = getMovementGlossaryForRange(minLevel, maxLevel);

  const lines = [];
  lines.push(`DRESSAGE TEST DATABASE CONTEXT (${currentName} through ${getLevelName(maxLevel)}):`);
  lines.push("");

  // Level progression
  lines.push(`LEVEL PROGRESSION (Current: ${currentName}, Level ${levelNum}):`);
  for (const [key, value] of Object.entries(progression)) {
    lines.push(`  ${getLevelName(value.level_number)} (Level ${value.level_number}): ${value.description}`);
    if (value.key_movements) {
      lines.push(`    Key movements: ${value.key_movements.join(", ")}`);
    }
    if (value.introduces) {
      const intro = typeof value.introduces === "string"
        ? value.introduces
        : Object.values(value.introduces).join("; ");
      lines.push(`    Introduces: ${intro}`);
    }
    if (value.bridge_to_fei) {
      lines.push(`    Note: ${value.bridge_to_fei}`);
    }
  }
  lines.push("");

  // Relevant tests
  lines.push("RELEVANT TESTS:");
  for (const test of tests) {
    lines.push(`  ${test.test_id}: ${test.name} (${test.level})`);
    if (test.purpose) {
      lines.push(`    Purpose: ${test.purpose}`);
    }
    if (test.introduces) {
      const intro = Array.isArray(test.introduces)
        ? test.introduces.join(", ")
        : typeof test.introduces === "string"
          ? test.introduces
          : Object.values(test.introduces).join("; ");
      lines.push(`    Introduces: ${intro}`);
    }
    if (test.coefficient_movements.length > 0) {
      lines.push(`    Coefficient (2x) movements: ${test.coefficient_movements.join(", ")}`);
    }
    if (test.max_points) {
      lines.push(`    Max points: ${test.max_points}`);
    }
  }
  lines.push("");

  // Movement glossary subset
  lines.push("MOVEMENT GLOSSARY (relevant subset):");
  for (const [category, entries] of Object.entries(glossary)) {
    const catName = category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    lines.push(`  ${catName}:`);
    for (const [name, desc] of Object.entries(entries)) {
      const mvtName = name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      lines.push(`    ${mvtName}: ${desc}`);
    }
  }

  return lines.join("\n");
}

module.exports = {
  parseLevelToNumber,
  buildTestDatabaseContext,
  buildDetailedTestContext,
  getLevelName,
};
