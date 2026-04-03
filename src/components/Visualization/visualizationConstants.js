/**
 * Visualization Script Builder — Constants & Helpers
 *
 * All movement data, problem options, reference options, context options,
 * sensory options, and length options extracted from the standalone HTML form.
 */

export const MOVEMENT_GROUPS = [
  {
    label: 'Foundation & Balance',
    movements: [
      { key: 'warm-up', label: 'Warm-up' },
      { key: 'sitting-trot', label: 'Sitting trot' },
      { key: 'stretchy-circle', label: 'Stretchy circle' },
    ],
  },
  {
    label: 'Lateral Work',
    movements: [
      { key: 'leg-yield', label: 'Leg yield' },
      { key: 'shoulder-in', label: 'Shoulder-in' },
      { key: 'travers', label: 'Travers' },
      { key: 'renvers', label: 'Renvers' },
      { key: 'half-pass', label: 'Half-pass', hasSub: true },
    ],
  },
  {
    label: 'Transitions & Changes',
    movements: [
      { key: 'transition', label: 'Transition', hasSub: true },
      { key: 'simple-change', label: 'Simple change' },
      { key: 'flying-change', label: 'Flying change' },
      { key: 'tempi-changes', label: 'Tempi changes', hasSub: true },
    ],
  },
  {
    label: 'Advanced Collection',
    movements: [
      { key: 'pirouette', label: 'Pirouette', hasSub: true, advanced: true },
      { key: 'piaffe', label: 'Piaffe', advanced: true },
      { key: 'passage', label: 'Passage', advanced: true },
    ],
  },
];

export const SUB_OPTIONS = {
  'half-pass': {
    label: 'Which gait?',
    options: [
      { key: 'trot', label: 'Trot' },
      { key: 'canter', label: 'Canter' },
    ],
  },
  'transition': {
    label: 'Which transition?',
    options: [
      { key: 'walk-trot', label: 'Walk \u2192 Trot' },
      { key: 'trot-canter', label: 'Trot \u2192 Canter' },
      { key: 'canter-trot', label: 'Canter \u2192 Trot' },
      { key: 'trot-walk', label: 'Trot \u2192 Walk' },
      { key: 'canter-walk', label: 'Canter \u2192 Walk' },
      { key: 'halt-rein-back', label: 'Halt / Rein-back' },
    ],
  },
  'tempi-changes': {
    label: 'How many strides between changes?',
    options: [
      { key: '4-tempi', label: '4-tempi' },
      { key: '3-tempi', label: '3-tempi' },
      { key: '2-tempi', label: '2-tempi' },
      { key: '1-tempi', label: '1-tempi', aspirational: true },
    ],
  },
  'pirouette': {
    label: 'Size of pirouette?',
    options: [
      { key: 'quarter', label: 'Quarter' },
      { key: 'half', label: 'Half' },
      { key: 'full', label: 'Full', aspirational: true },
    ],
    sub2: {
      label: 'Walk or canter?',
      options: [
        { key: 'walk', label: 'Walk' },
        { key: 'canter', label: 'Canter' },
      ],
    },
  },
};

export const ASPIRATIONAL_MOVEMENTS = ['piaffe', 'passage'];
export const ASPIRATIONAL_SUBS = ['1-tempi', '2-tempi', 'full'];

export const STANDARD_PROBLEMS = [
  { value: 'timing', icon: '\u23F1', label: 'Timing of the aid is off', desc: "The movement happens but the aid arrives early, late, or inconsistently \u2014 the rhythm isn't yours yet." },
  { value: 'position', icon: '\uD83E\uDE91', label: 'My position breaks down', desc: 'I tip forward, grip, collapse, or brace at the moment of difficulty. My body interferes with what I want.' },
  { value: 'collection', icon: '\uD83D\uDCC9', label: 'Loss of collection / horse flattens', desc: 'We lose energy, tempo, or throughness going into or during the movement. The quality drops.' },
  { value: 'anticipation', icon: '\u26A1', label: 'Horse anticipates, rushes, or tenses', desc: "He knows it's coming and reacts before the aid. I need to rehearse staying quiet and unreadable." },
  { value: 'mental', icon: '\uD83D\uDE36', label: 'I freeze mentally / lose confidence going in', desc: 'I hesitate, second-guess, or hold my breath. The movement lives in my head as much as in my body.' },
  { value: 'unfamiliar', icon: '\uD83D\uDDFA', label: "I'm building from scratch \u2014 no physical reference yet", desc: "I haven't ridden this movement. I want to develop an internal sense of it before I ask for it physically." },
];

export const WARMUP_PROBLEMS = [
  { value: 'warmup-presence', icon: '\uD83E\uDDD8', label: 'Getting present \u2014 transitioning into riding mode', desc: 'My mind is still in my day. I want to rehearse the mental shift from person to rider before I ever mount.' },
  { value: 'warmup-horse', icon: '\uD83D\uDC34', label: 'Meeting the horse where he is', desc: "Some days he's fresh, stiff, or tense. I want to rehearse reading him and adapting rather than pushing past what he's offering." },
  { value: 'warmup-rushing', icon: '\u23E9', label: 'I rush through it', desc: "I get to business too quickly. The warm-up becomes a formality rather than a conversation. I want to rehearse patience and listening." },
  { value: 'warmup-throughness', icon: '\uD83C\uDF0A', label: 'Finding the swing and throughness', desc: "I want to feel and rehearse the moment when his back comes up, the contact goes alive, and the horse is genuinely with me \u2014 not just going around." },
  { value: 'warmup-show', icon: '\uD83C\uDFDF', label: 'Managing show warm-up chaos', desc: 'Other horses, noise, ring traffic, time pressure. I tighten up or get reactive instead of staying focused and soft.' },
];

export const REFERENCE_OPTIONS = [
  { value: 'recent', icon: '\u2705', label: 'Yes \u2014 a recent ride I can describe', desc: 'This is the most powerful anchor. The AI will build from this specific felt memory.', showTextarea: true },
  { value: 'old', icon: '\uD83D\uDCC5', label: 'Yes \u2014 but it was a while ago', desc: 'Even a faded memory anchors the imagery better than nothing. Describe what you remember.', showTextarea: true },
  { value: 'partial', icon: '\uD83E\uDDE9', label: "Partially \u2014 I have pieces but not the whole thing", desc: "One stride that felt right. One moment of connection. That's enough.", showTextarea: true },
  { value: 'none', icon: '\uD83C\uDF31', label: "Not really \u2014 we're building something new", desc: 'The script will be constructed from component feelings you do know, extended toward the new movement.', showTextarea: false },
];

export const CONTEXT_OPTIONS = [
  { value: 'training', icon: '\uD83C\uDFE0', label: 'Training ride', desc: 'At home. Quiet arena. The work itself, not the performance of it.' },
  { value: 'warmup', icon: '\u26FA', label: 'Show warm-up', desc: 'Other horses, noise, limited space. Staying focused under distraction.' },
  { value: 'test', icon: '\uD83C\uDFDF', label: 'Competition test', desc: 'Down the centerline. The movement in context of the full test ride.' },
];

export const SENSORY_OPTIONS = [
  { value: 'feel', icon: '\uD83E\uDD32', label: 'What I feel in my body \u2014 rhythm, weight, contact, balance' },
  { value: 'hear', icon: '\uD83D\uDC42', label: 'What I hear \u2014 footfalls, rhythm, tempo' },
  { value: 'see', icon: '\uD83D\uDC41', label: 'What I see \u2014 line, geometry, where I\'m going' },
];

export const LENGTH_OPTIONS = [
  { value: 'short', time: '~8 min', label: 'Quick', desc: 'Settle + movement + brief close. Good for daily use.' },
  { value: 'standard', time: '~12 min', label: 'Standard', desc: 'Full PETTLEP structure. Best for most sessions.' },
  { value: 'extended', time: '~18 min', label: 'Extended', desc: 'Multiple rehearsal passes. Pre-show or deep work.' },
];

export const PROBLEM_LABELS = {
  timing: 'Timing of the aid',
  position: 'Position breaks down',
  collection: 'Loss of collection',
  anticipation: 'Horse anticipates or rushes',
  mental: 'Mental freeze or confidence loss',
  unfamiliar: 'Building from scratch',
  'warmup-presence': 'Getting present',
  'warmup-horse': 'Meeting the horse where he is',
  'warmup-rushing': 'Rushing through it',
  'warmup-throughness': 'Finding the swing',
  'warmup-show': 'Show warm-up chaos',
};

/**
 * Build a human-readable movement label from form data.
 */
export function buildMovementLabel(formData) {
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const transMap = {
    'walk-trot': 'Walk \u2192 Trot',
    'trot-canter': 'Trot \u2192 Canter',
    'canter-trot': 'Canter \u2192 Trot',
    'trot-walk': 'Trot \u2192 Walk',
    'canter-walk': 'Canter \u2192 Walk',
    'halt-rein-back': 'Halt / Rein-Back',
  };

  const labels = {
    'warm-up': 'Warm-Up',
    'sitting-trot': 'Sitting Trot',
    'stretchy-circle': 'Stretchy Circle',
    'leg-yield': 'Leg Yield',
    'shoulder-in': 'Shoulder-In',
    'travers': 'Travers',
    'renvers': 'Renvers',
    'half-pass': formData.movementSub ? `Half-Pass (${cap(formData.movementSub)})` : 'Half-Pass',
    'transition': formData.movementSub ? `Transition: ${transMap[formData.movementSub] || formData.movementSub}` : 'Transition',
    'simple-change': 'Simple Change',
    'flying-change': 'Flying Change',
    'tempi-changes': formData.movementSub ? `${formData.movementSub.replace('-tempi', '-Tempi')} Changes` : 'Tempi Changes',
    'pirouette': (() => {
      const sz = formData.movementSub ? cap(formData.movementSub) + ' ' : '';
      const gt = formData.movementSub2 ? ` (${cap(formData.movementSub2)})` : '';
      return `${sz}Pirouette${gt}`;
    })(),
    'piaffe': 'Piaffe',
    'passage': 'Passage',
  };

  return labels[formData.movement] || formData.movement;
}
