# Comprehensive Dressage Test Database

## Overview

This database contains complete technical specifications for all USDF and FEI dressage tests from Introductory Level through Grand Prix Special, including standard tests and freestyle tests.

**Database Version:** 2023-2026  
**Effective Dates:** December 1, 2022 - November 30, 2026  
**Last Updated:** February 9, 2026

## File Structure

### 1. comprehensive_dressage_test_database.json (Main Index)
**Purpose:** Master index and quick reference guide  
**Contains:**
- Database metadata and organization
- Complete level progression from Intro through Grand Prix Special
- Movement glossary with definitions
- Scoring systems for standard and freestyle tests
- Arena specifications
- Quick reference to all test requirements
- Pointers to detailed test files

**Use this file for:**
- Understanding the progression between levels
- Quick lookup of movement definitions
- Identifying which movements are introduced at each level
- Understanding scoring systems
- Finding the right detailed file for your needs

### 2. usdf_intro_training_tests.json (Detailed Tests)
**Tests Included:** 6 tests
- Introductory Test A (Walk-Trot)
- Introductory Test B (Walk-Trot) 
- Introductory Test C (Walk-Trot-Canter)
- Training Level Test 1
- Training Level Test 2 (introduces stretch circle)
- Training Level Test 3 (introduces shallow loops)

**Contains:**
- Complete movement-by-movement breakdown
- Exact marker locations (A, X, C, etc.)
- Detailed directives for each movement
- Coefficient assignments
- Collective marks with descriptions
- Test purpose and requirements
- Instructions for riders

**Use this file for:**
- Creating detailed training plans for Intro/Training level riders
- Identifying exact requirements for each movement
- Understanding judge's directives
- Preparing for specific tests

### 3. usdf_first_level_tests.json (Detailed Tests)
**Tests Included:** 3 tests
- First Level Test 1 (introduces lengthening stride in trot, 15m canter circles, 10m half circles in trot)
- First Level Test 2 (introduces leg-yield, lengthening stride in canter)
- First Level Test 3 (introduces 10m trot circles, shallow loops at canter, change of lead through trot)

**Contains:**
- Complete movement-by-movement breakdown
- Exact marker locations and patterns
- Detailed directives for each movement
- Coefficient assignments (x2 multipliers)
- Collective marks
- Movements organized by gait
- Movement progression notes between tests

**Use this file for:**
- Detailed preparation for First Level tests
- Understanding the introduction of lengthening stride
- Learning leg-yield requirements
- Training plan development for lateral work

### 4. usdf_second_third_fourth_tests.json (Detailed Tests)
**Tests Included:** 9 tests
- Second Level Tests 1, 2, 3
- Third Level Tests 1, 2, 3
- Fourth Level Tests 1, 2, 3

**Contains:**
- Complete movement-by-movement breakdown
- Exact marker locations and patterns
- Detailed directives for each movement
- Coefficient assignments (x2 multipliers)
- Collective marks
- Movements organized by gait
- Movement progression notes between levels
- Key differences between each level

**Use this file for:**
- Detailed preparation for Second through Fourth Level
- Understanding the progression of lateral movements
- Identifying coefficient movements (worth double points)
- Training plan development for upper levels

### 5. usdf_freestyle_tests.json (Freestyle Requirements)
**Tests Included:** 5 freestyle tests
- Training Level Freestyle
- First Level Freestyle
- Second Level Freestyle
- Third Level Freestyle
- Fourth Level Freestyle

**Contains:**
- Compulsory elements for each level
- Minimum requirements (distances, repetitions)
- Coefficient assignments
- Artistic impression criteria with coefficients
- Forbidden movements for each level
- Additionally allowed movements
- Time limits and penalties
- General freestyle rules

**Use this file for:**
- Choreographing freestyle routines
- Ensuring all compulsory elements are included
- Understanding artistic scoring criteria
- Checking which movements are allowed vs. forbidden
- Maximizing coefficient opportunities

### 6. fei_test_database_complete.json (FEI Tests)
**Tests Included:** 5 FEI tests
- Prix St. Georges
- Intermediate I
- Intermediate II
- Grand Prix
- Grand Prix Special

**Contains:**
- Required movements organized by gait
- Coefficient movement numbers
- Key differences between levels
- Test codes and durations
- Minimum horse ages
- Point totals (base + collective)
- Movement introductions at each level

**Use this file for:**
- FEI level competition preparation
- Understanding progression from Fourth Level to PSG
- Identifying FEI-specific requirements
- Planning training for international competition

## Database Organization

### Test Naming Convention

**USDF Standard Tests:**
- Format: `{year}_{level}_{test_number}`
- Example: `2023_training_2`

**USDF Freestyle Tests:**
- Format: `{year}_{level}_freestyle`
- Example: `2023_second_freestyle`

**FEI Tests:**
- Format: `{level_name}` (lowercase with underscores)
- Example: `prix_st_georges`, `intermediate_1`

### Level Numbering System

The database uses consistent numbering across all levels:

0. Introductory
1. Training
2. First Level
3. Second Level
4. Third Level
5. Fourth Level
6. Prix St. Georges (FEI)
7. Intermediate I (FEI)
8. Intermediate II (FEI)
9. Grand Prix (FEI)
10. Grand Prix Special (FEI)

## Key Features for YDJ Platform Integration

### 1. Event Preparation Planning
**Relevant fields:**
- `required_movements` - List movements to practice
- `coefficient_movements` - Identify high-value movements
- `introduces` - New movements at this test
- `purpose` - Understanding test goals
- `directives` - What judges look for

**Example usage:**
```javascript
// For rider preparing for Third Level Test 1
const test = database.tests["2023_third_1"];
const focusAreas = test.movements
  .filter(m => m.coefficient > 1)
  .map(m => m.movement);
// Returns: ["Extended walk", "Half-pass right", etc.]
```

### 2. Pattern Analysis
**Relevant fields:**
- `movements_by_gait` - Group movements by walk/trot/canter
- `collective_marks` - Overall assessment categories
- `level_progression` - Understanding advancement path

**Example usage:**
```javascript
// Analyze rider's trot work readiness
const requiredTrotWork = test.movements_by_gait.trot;
// Compare to rider's debrief data on trot movements
```

### 3. Coaching Insights
**Relevant fields:**
- `directives` - Specific criteria judges use
- `purpose` - Overall test objectives
- `introduces` - New concepts to master

**Example usage:**
```javascript
// Generate coaching tip for shoulder-in
const shoulderInMovement = test.movements.find(m => 
  m.movement.includes("Shoulder-in")
);
const judgeDirective = shoulderInMovement.directive;
// Use directive to generate personalized coaching feedback
```

### 4. Goal Setting
**Relevant fields:**
- `level_progression` - Understanding next level requirements
- `bridge_to_fei` - Fourth Level specific
- `introduces` - Skills to develop for next test

## Common Use Cases

### Use Case 1: "What do I need to practice for my next test?"

```javascript
// Get test data
const test = getTest("2023_second_2");

// Extract coefficient movements (worth double)
const priorityMovements = test.coefficient_movements;

// Extract new movements for this test
const newMovements = test.metadata.introduce;

// Combine for focus areas
const focusAreas = [...priorityMovements, ...newMovements];
```

### Use Case 2: "Am I ready to move up a level?"

```javascript
// Current level
const currentTest = getTest("2023_second_3");
const currentMovements = currentTest.movements_by_gait;

// Next level
const nextTest = getTest("2023_third_1");
const nextMovements = nextTest.movements_by_gait;
const introduces = nextTest.metadata.introduce;

// Gap analysis
const newSkills = introduces; // What needs to be learned
const advancedSkills = compareMovements(current, next);
```

### Use Case 3: "How should I choreograph my freestyle?"

```javascript
// Get freestyle requirements
const freestyle = getTest("2023_second_freestyle");

// Required elements
const compulsoryElements = freestyle.compulsory_elements;

// High-value elements (with coefficients)
const coefficientElements = compulsoryElements
  .filter(e => e.coefficient > 1);

// Forbidden movements to avoid
const forbidden = freestyle.forbidden_movements;

// Additionally allowed (optional but legal)
const optional = freestyle.additionally_allowed;
```

### Use Case 4: "What's different between Test 1 and Test 2 at my level?"

```javascript
const test1 = getTest("2023_third_1");
const test2 = getTest("2023_third_2");

// What Test 2 introduces
const test2Introduces = test2.metadata.introduce;

// Compare movement counts
const test1Movements = test1.movements.length;
const test2Movements = test2.movements.length;

// Compare coefficient movements
const test1Coefficients = test1.coefficient_movements.length;
const test2Coefficients = test2.coefficient_movements.length;
```

## Data Quality Notes

### Accuracy
All test data has been manually parsed from official USDF and FEI test sheets. Key accuracy measures:

- ✅ Movement descriptions match official tests exactly
- ✅ Coefficients verified against official scoresheets
- ✅ Point totals confirmed
- ✅ Marker locations verified for standard arena
- ✅ Cross-referenced between test sheets and rule books

### Completeness
- **USDF Standard Tests:** 18 tests fully detailed
- **USDF Freestyle Tests:** 5 tests with all compulsory elements
- **FEI Tests:** 5 tests with movement requirements

### Updates
Tests are valid through November 30, 2026. USDF typically releases new tests every 4 years. Monitor usdf.org for updates after this date.

## Technical Notes for Developers

### File Format
All files are valid JSON with consistent structure:
- Keys use snake_case
- Movement numbers are integers
- Coefficients are integers or null
- Descriptions are strings

### Performance Considerations
- Main index file: ~15KB (fast loading)
- Detailed test files: 50-100KB each (lazy load as needed)
- Total database: ~300KB (all files)

### Recommended Loading Strategy
```javascript
// Load main index on app initialization
import mainIndex from './comprehensive_dressage_test_database.json';

// Lazy load detailed tests only when needed
async function getDetailedTest(testId) {
  if (testId.includes('intro') || testId.includes('training')) {
    return import('./usdf_intro_training_tests.json');
  } else if (testId.includes('second') || testId.includes('third') || testId.includes('fourth')) {
    return import('./usdf_second_third_fourth_tests.json');
  } else if (testId.includes('freestyle')) {
    return import('./usdf_freestyle_tests.json');
  } else {
    return import('./fei_test_database_complete.json');
  }
}
```

## Changelog

### Version 2023-2026 (February 9, 2026)
- Initial comprehensive database creation
- Parsed all USDF tests from official 2023 scoresheets
- Integrated FEI test requirements
- Created master index with level progression
- Added movement glossary
- Created this README

### Known Gaps
- [ ] FEI tests need full movement-by-movement detail (currently summary format)
- [ ] Introductory Level Freestyle (if it exists) not included

### Future Enhancements
- Add movement diagrams/patterns
- Include common errors for each movement
- Add training progression recommendations
- Include approximate time for each movement
- Add judge commentary guidelines

## Support

For questions about database structure or usage within the YDJ platform, contact the development team.

For questions about official test requirements, refer to:
- USDF: https://www.usdf.org
- USEF: https://www.usef.org
- FEI: https://inside.fei.org

---

**Last Updated:** February 9, 2026  
**Maintained By:** Your Dressage Journey Development Team  
**License:** Proprietary - For YDJ Platform Use
