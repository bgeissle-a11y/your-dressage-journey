/**
 * Export Utilities
 * Client-side CSV and JSON export for user data.
 */

// Fields to strip from exported data (internal/Firestore fields)
const INTERNAL_FIELDS = ['id', 'userId', 'isDeleted', 'deletedAt', 'updatedAt', 'createdAt'];

/**
 * Remove internal fields from a data object
 */
function cleanRecord(record, extraFields = []) {
  const stripped = [...INTERNAL_FIELDS, ...extraFields];
  const cleaned = {};
  for (const [key, value] of Object.entries(record)) {
    if (!stripped.includes(key)) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

/**
 * Escape a value for CSV (handles commas, quotes, newlines)
 */
function escapeCSV(value) {
  if (value == null) return '';
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Convert an array of objects to CSV string
 */
function toCSV(data, columns) {
  if (!data.length) return '';

  const cols = columns || Object.keys(data[0]);
  const header = cols.map(escapeCSV).join(',');
  const rows = data.map(row =>
    cols.map(col => escapeCSV(row[col])).join(',')
  );

  return [header, ...rows].join('\n');
}

/**
 * Trigger a file download in the browser
 */
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export data as CSV file
 * @param {Array} data - Array of objects to export
 * @param {string} filename - File name (without extension)
 * @param {string[]} [columns] - Optional column order; defaults to all keys
 */
export function exportToCSV(data, filename, columns) {
  const cleaned = data.map(r => cleanRecord(r));
  const csv = toCSV(cleaned, columns);
  downloadFile(csv, `${filename}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Export data as JSON file
 * @param {Array} data - Array of objects to export
 * @param {string} filename - File name (without extension)
 */
export function exportToJSON(data, filename) {
  const cleaned = data.map(r => cleanRecord(r));
  const json = JSON.stringify(cleaned, null, 2);
  downloadFile(json, `${filename}.json`, 'application/json');
}

/**
 * Column definitions for each collection export
 */
export const EXPORT_COLUMNS = {
  debriefs: [
    'rideDate', 'horseName', 'sessionType', 'overallQuality',
    'riderEnergy', 'horseEnergy', 'mentalState', 'wins',
    'challenges', 'ahaRealization', 'horseNotices', 'workFocus', 'isDraft'
  ],
  reflections: [
    'category', 'prompt', 'mainReflection', 'obstacleStrategy',
    'feeling', 'influence'
  ],
  observations: [
    'date', 'contextType', 'clinicianName', 'pairObserved',
    'horseName', 'description', 'observations'
  ],
  journeyEvents: [
    'date', 'entryMode', 'category', 'type', 'description',
    'magnitude', 'duration', 'status', 'resolutionDate', 'prepReference'
  ],
  eventPrepPlans: [
    'eventName', 'eventDate', 'eventType', 'location', 'horseNames',
    'horseLevels', 'allGoals', 'allConcerns', 'status'
  ]
};

/**
 * Flatten multi-horse event prep data for CSV export.
 * Joins horse names, levels, goals, and concerns into semicolon-separated strings.
 */
export function flattenEventPrepForExport(plans) {
  return plans.map(plan => {
    const horses = plan.horses || [];
    return {
      ...plan,
      horseNames: horses.map(h => h.horseName).filter(Boolean).join('; '),
      horseLevels: horses.map(h => h.currentLevel).filter(Boolean).join('; '),
      allGoals: horses.flatMap(h => h.goals || []).filter(Boolean).join('; '),
      allConcerns: horses.flatMap(h => h.concerns || []).filter(Boolean).join('; ')
    };
  });
}
