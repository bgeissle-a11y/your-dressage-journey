/**
 * Quantitative comparison of coaching outputs across sessions.
 *
 * For each voice, across Set A (varied) and Set B (similar):
 *  - opening stem (first ~12 words of narrative)
 *  - catchphrase usage
 *  - pairwise Jaccard similarity of content-word sets (within-voice, across sessions)
 *  - recurring shared 4-grams that appear in a majority of sessions for that voice
 *  - cross-voice similarity within a session (are voices bleeding together?)
 */
const fs = require("fs");
const path = require("path");
const OUT = __dirname + "/out";

const VOICE_NAMES = ["Classical Master", "Empathetic Coach", "Technical Coach", "Practical Strategist"];
const CATCHPHRASES = [/why not the first time/i, /you'?ve got this/i, /did you feel that/i, /be accurate/i];

const SETS = { A: ["A1","A2","A3","A4","A5"], B: ["B1","B2","B3"] };

const STOP = new Set(("a an the of to and in is it you your for on that this with as at be by are was were not but his her him she he they them their our we i my me so what when where which who whom how then than into out up down over under again very can will just also each more most other some such only own same too then once here there all any both few".split(" ")));

function load(id){ return JSON.parse(fs.readFileSync(path.join(OUT, id+"_coaching.json"),"utf8")).result; }
function narrative(result, v){ return (result.voices[v] && result.voices[v].narrative) || ""; }
function words(s){ return (s.toLowerCase().match(/[a-z']+/g)||[]).filter(w=>w.length>3 && !STOP.has(w)); }
function contentSet(s){ return new Set(words(s)); }
function jaccard(a,b){ const A=contentSet(a),B=contentSet(b); let inter=0; for(const x of A) if(B.has(x)) inter++; const uni=A.size+B.size-inter; return uni?inter/uni:0; }
function ngrams(s,n){ const w=words(s); const out=[]; for(let i=0;i+n<=w.length;i++) out.push(w.slice(i,i+n).join(" ")); return out; }
function opening(s){ return s.split(/\s+/).slice(0,12).join(" "); }

const results = {};
const allIds = [...SETS.A, ...SETS.B];
for (const id of allIds) { try { results[id]=load(id); } catch(e){ console.log("MISSING "+id); } }
const haveIds = allIds.filter(id=>results[id]);

console.log("=".repeat(78));
console.log("OPENING STEMS + CATCHPHRASE USE (per voice, per session)");
console.log("=".repeat(78));
for (let v=0; v<4; v++){
  console.log("\n### "+VOICE_NAMES[v]);
  for (const id of haveIds){
    const n = narrative(results[id], v);
    const cp = CATCHPHRASES[v].test(n) ? " [CATCHPHRASE]" : "";
    console.log(`  ${id}: "${opening(n)}…"${cp}`);
  }
}

console.log("\n"+"=".repeat(78));
console.log("WITHIN-VOICE PAIRWISE JACCARD (content-word overlap across sessions)");
console.log("higher = more similar wording. Compare Set A (should be LOW if input-driven)");
console.log("vs Set B (expected HIGH). If Set A ≈ Set B and both high → structural.");
console.log("=".repeat(78));
function avgPairwise(ids, v){
  let sum=0,c=0;
  for(let i=0;i<ids.length;i++) for(let j=i+1;j<ids.length;j++){
    sum += jaccard(narrative(results[ids[i]],v), narrative(results[ids[j]],v)); c++;
  }
  return c?sum/c:0;
}
for (let v=0; v<4; v++){
  const a = avgPairwise(SETS.A.filter(id=>results[id]), v);
  const b = avgPairwise(SETS.B.filter(id=>results[id]), v);
  console.log(`  ${VOICE_NAMES[v].padEnd(20)}  SetA avg=${a.toFixed(3)}   SetB avg=${b.toFixed(3)}   ratio B/A=${(b/a).toFixed(2)}`);
}

console.log("\n"+"=".repeat(78));
console.log("RECURRING SHARED 4-GRAMS within a voice across SET A (varied inputs).");
console.log("Phrases here recur DESPITE different horses/problems → structural fingerprint.");
console.log("=".repeat(78));
for (let v=0; v<4; v++){
  const ids = SETS.A.filter(id=>results[id]);
  const counts = {};
  for (const id of ids){ const seen=new Set(ngrams(narrative(results[id],v),4)); for(const g of seen) counts[g]=(counts[g]||0)+1; }
  const shared = Object.entries(counts).filter(([,c])=>c>=Math.ceil(ids.length*0.6)).sort((a,b)=>b[1]-a[1]);
  console.log(`\n### ${VOICE_NAMES[v]} — 4-grams in ≥${Math.ceil(ids.length*0.6)}/${ids.length} Set-A sessions:`);
  if(!shared.length) console.log("  (none)");
  for(const [g,c] of shared.slice(0,25)) console.log(`  [${c}/${ids.length}] ${g}`);
}

console.log("\n"+"=".repeat(78));
console.log("CROSS-VOICE SIMILARITY WITHIN A SESSION (are the 4 voices bleeding together?)");
console.log("avg pairwise Jaccard among the 4 voice narratives in the same session.");
console.log("=".repeat(78));
for (const id of haveIds){
  let sum=0,c=0;
  for(let i=0;i<4;i++) for(let j=i+1;j<4;j++){ sum+=jaccard(narrative(results[id],i),narrative(results[id],j)); c++; }
  console.log(`  ${id}: ${(sum/c).toFixed(3)}`);
}
