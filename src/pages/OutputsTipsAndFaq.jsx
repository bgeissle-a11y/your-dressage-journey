import { Link } from 'react-router-dom';
import './TipsAndFaq.css';
import './OutputsTipsAndFaq.css';

export default function OutputsTipsAndFaq() {
  return (
    <div className="tips-faq-page">
      <header className="tips-header">
        <div className="tips-logo">&#x1F3C7;</div>
        <h1>Your Outputs</h1>
        <p className="tips-subtitle">What Your Dressage Journey creates for you &mdash; and how to get the most from it</p>
        <span className="tips-tagline-badge">ILLUMINATE YOUR JOURNEY</span>
      </header>

      {/* Table of Contents */}
      <div className="tips-section">
        <h2>On This Page</h2>
        <nav className="tips-toc">
          <a href="#overview">Your Outputs at a Glance</a>
          <a href="#how-it-works">How Your Data Becomes Insight</a>
          <a href="#reading-outputs">Reading Your Outputs: Scan, Then Dive Deep</a>
          <a href="#journey-map">Journey Map</a>
          <a href="#multi-voice">Multi-Voice Coaching</a>
          <a href="#data-viz">Data Visualizations</a>
          <a href="#grand-prix">Grand Prix Thinking</a>
          <a href="#physical">Physical Guidance</a>
          <a href="#event-planner">Event Planner</a>
          <a href="#self-assessment">Self-Assessment Analysis</a>
          <a href="#coaching-voices">Meet Your Coaching Team</a>
          <a href="#maximize">Getting the Most from Your Outputs</a>
          <a href="#faq">Frequently Asked Questions</a>
          <a href="#contact">Questions? Problems? Ideas?</a>
        </nav>
        <div className="outputs-cross-link">
          Looking for help with the <strong>forms</strong> you fill out? <Link to="/tips-and-faq">Forms Tips &amp; FAQ &rarr;</Link>
        </div>
      </div>

      {/* Overview */}
      <div className="tips-section" id="overview">
        <h2>Your Outputs at a Glance</h2>
        <p className="tips-welcome-text">Every debrief, reflection, event log, and self-assessment you submit feeds into a suite of AI-powered analyses. These aren&#39;t generic tips &mdash; they&#39;re personalized coaching intelligence drawn from <em>your</em> data, <em>your</em> horses, and <em>your</em> patterns. Here&#39;s what the platform creates for you:</p>
        <div className="outputs-card-grid">
          <div className="outputs-card">
            <div className="outputs-card-icon">&#x1F5FA;&#xFE0F;</div>
            <div className="outputs-card-title">Journey Map</div>
            <div className="outputs-card-desc">Your visual and narrative timeline &mdash; milestones, patterns, and progress you might not see yourself.</div>
            <span className="outputs-card-freq">Weekly + on demand</span>
          </div>
          <div className="outputs-card">
            <div className="outputs-card-icon">&#x1F399;&#xFE0F;</div>
            <div className="outputs-card-title">Multi-Voice Coaching</div>
            <div className="outputs-card-desc">Four distinct coaching perspectives analyze your same data through different lenses.</div>
            <span className="outputs-card-freq">Weekly + on demand</span>
          </div>
          <div className="outputs-card">
            <div className="outputs-card-icon">&#x1F4CA;</div>
            <div className="outputs-card-title">Data Visualizations</div>
            <div className="outputs-card-desc">Charts and graphs that make the invisible visible &mdash; your trends, correlations, and progress over time.</div>
            <span className="outputs-card-freq">Weekly</span>
          </div>
          <div className="outputs-card">
            <div className="outputs-card-icon">&#x1F9E0;</div>
            <div className="outputs-card-title">Grand Prix Thinking</div>
            <div className="outputs-card-desc">Mental skills development with daily practices and long-term training trajectory paths.</div>
            <span className="outputs-card-freq">On data thresholds</span>
          </div>
          <div className="outputs-card">
            <div className="outputs-card-icon">&#x1F3CB;&#xFE0F;</div>
            <div className="outputs-card-title">Physical Guidance</div>
            <div className="outputs-card-desc">Off-horse exercises and body awareness practices tailored to your documented challenges.</div>
            <span className="outputs-card-freq">Bi-weekly</span>
          </div>
          <div className="outputs-card">
            <div className="outputs-card-icon">&#x1F3AF;</div>
            <div className="outputs-card-title">Event Planner</div>
            <div className="outputs-card-desc">Personalized preparation plans for shows, clinics, and competitions &mdash; from readiness analysis to show-day strategy.</div>
            <span className="outputs-card-freq">On demand</span>
          </div>
          <div className="outputs-card">
            <div className="outputs-card-icon">&#x1F4C8;</div>
            <div className="outputs-card-title">Self-Assessment Analysis</div>
            <div className="outputs-card-desc">How your self-perception compares to your actual riding patterns &mdash; the "meta-coaching" layer.</div>
            <span className="outputs-card-freq">On submission</span>
          </div>
        </div>
        <div className="tips-emphasis"><strong>The core insight:</strong> You can&#39;t hold all your training context in your head simultaneously. That&#39;s not a failing &mdash; that&#39;s human. The AI can hold all of it at once, find the patterns, and reflect them back to you with coaching intelligence.</div>
      </div>

      {/* How It Works */}
      <div className="tips-section" id="how-it-works">
        <h2>How Your Data Becomes Insight</h2>
        <p className="tips-welcome-text">Every output follows the same fundamental pattern. Your data is collected, assembled into context, analyzed through specialized coaching frameworks, and delivered as personalized intelligence.</p>
        <div className="outputs-data-flow">
          <p className="outputs-flow-title">The YDJ Pipeline</p>
          <div className="outputs-flow-steps">
            <div className="outputs-flow-step">&#x1F4DD; Your Forms</div>
            <span className="outputs-flow-arrow">&rarr;</span>
            <div className="outputs-flow-step">&#x1F504; Pattern Assembly</div>
            <span className="outputs-flow-arrow">&rarr;</span>
            <div className="outputs-flow-step">&#x1F916; AI Analysis</div>
            <span className="outputs-flow-arrow">&rarr;</span>
            <div className="outputs-flow-step">&#x1F4CB; Your Coaching Report</div>
          </div>
        </div>
        <p>Your profiles, debriefs, reflections, events, observations, and self-assessments are all combined into a rich picture of your riding. The AI doesn&#39;t analyze each form in isolation &mdash; it cross-references everything. A pattern in your debriefs might be explained by an event you logged. A shift in your reflections might correlate with a change in your physical self-assessment. The more data points you provide, the more connections the AI can make.</p>
        <div className="tips-tip-box">
          <h4>Why Cross-Referencing Matters</h4>
          <p>When the AI sees that your ride quality consistently dips the week after a farrier visit, or that your confidence peaks when you&#39;ve done a reflection the same morning &mdash; those are insights no single form could reveal. The magic is in the connections between data types.</p>
        </div>
      </div>

      {/* Reading Your Outputs */}
      <div className="tips-section" id="reading-outputs">
        <h2>Reading Your Outputs: Scan, Then Dive Deep</h2>
        <p className="tips-welcome-text">Your outputs are designed so you can get value in 30 seconds <em>or</em> 30 minutes. Every output leads with a quick summary so you can scan the highlights first, then expand into the sections that matter most to you today.</p>

        <h3>Quick Insights Come First</h3>
        <p>Each output opens with the most important information up front &mdash; key numbers, top patterns, your priority this week, and a celebration of what&#39;s going well. You&#39;ll always see this summary without needing to expand or click anything.</p>
        <div className="outputs-ux-demo">
          <div className="outputs-demo-label">What you&#39;ll see first</div>
          <div className="outputs-mock-metrics">
            <div className="outputs-mock-metric"><div className="outputs-mock-num">24</div><div className="outputs-mock-label">Rides Logged</div></div>
            <div className="outputs-mock-metric"><div className="outputs-mock-num">3</div><div className="outputs-mock-label">Breakthroughs</div></div>
            <div className="outputs-mock-metric"><div className="outputs-mock-num">5</div><div className="outputs-mock-label">Patterns Found</div></div>
            <div className="outputs-mock-metric"><div className="outputs-mock-num">&nearr;</div><div className="outputs-mock-label">Trending Up</div></div>
          </div>
          <div className="outputs-mock-priority"><strong>&#x1F3AF; Your Priority This Week:</strong> Practice 10-meter circles at walk before every trot work session to establish rhythm without tension.</div>
          <div className="outputs-mock-celebration">&#x1F31F; <strong>This Week&#39;s Celebration:</strong> You maintained connection through all three downward transitions on Tuesday &mdash; a major breakthrough.</div>
        </div>

        <h3>Expand What Matters Today</h3>
        <p>Below the summary, detailed sections are organized in collapsible panels. Tap or click any section header to expand it. Each section stands on its own &mdash; you don&#39;t need to read everything to get value from the part that&#39;s relevant right now.</p>
        <div className="outputs-ux-demo">
          <div className="outputs-demo-label">Expandable sections &mdash; open what you need</div>
          <div className="outputs-mock-collapsible"><span>&#x1F4C5; Recent Progress (Last 2 Weeks)</span><span className="outputs-mock-arrow">&#x25B6;</span></div>
          <div className="outputs-mock-collapsible outputs-mock-collapsible--open"><span>&#x1F50D; Pattern Analysis</span><span className="outputs-mock-arrow">&#x25BC;</span></div>
          <div className="outputs-mock-expanded"><strong>Success:</strong> Shoulder-in quality improved 65% when you established bend in walk first<br /><strong>Challenge:</strong> Rushing tempo appears in 80% of rides &mdash; specifically on corner approaches<br /><strong>Progress:</strong> Napoleon shows 40% better relaxation in morning sessions vs. evening</div>
          <div className="outputs-mock-collapsible"><span>&#x1F3C6; Breakthroughs &amp; Celebrations</span><span className="outputs-mock-arrow">&#x25B6;</span></div>
          <div className="outputs-mock-collapsible"><span>&#x1F434; Napoleon&#39;s Progress</span><span className="outputs-mock-arrow">&#x25B6;</span></div>
        </div>

        <h3>Tabs Let You Compare Perspectives</h3>
        <p>Where multiple perspectives exist on the same data &mdash; like the four coaching voices or the two Grand Prix Thinking layers &mdash; tabs let you switch between them without losing your place. Each tab contains a complete, self-contained analysis.</p>
        <div className="outputs-ux-demo">
          <div className="outputs-demo-label">Tabbed coaching voices</div>
          <div className="outputs-mock-tabs">
            <div className="outputs-mock-tab outputs-mock-tab--active">&#x1F3AF; Classical Master</div>
            <div className="outputs-mock-tab">&#x2B50; Empathetic Coach</div>
            <div className="outputs-mock-tab">&#x1F52C; Technical Coach</div>
            <div className="outputs-mock-tab">&#x1F4CB; Strategist</div>
          </div>
          <p className="outputs-mock-tab-hint"><em>Each voice&#39;s full analysis appears when you select their tab. Switch between perspectives to see what different lenses reveal about the same rides.</em></p>
        </div>

        <div className="tips-emphasis"><strong>The key principle:</strong> The AI generates the same depth of analysis it always has. We&#39;ve organized it so you can scan quickly, find what&#39;s relevant, and go deep when you&#39;re ready &mdash; without being overwhelmed by the full volume all at once.</div>
      </div>

      {/* Journey Map */}
      <div className="tips-section" id="journey-map">
        <h2>&#x1F5FA;&#xFE0F; Journey Map</h2>
        <p className="tips-welcome-text">Your Journey Map is a living document &mdash; a visual and narrative timeline that shows where you&#39;ve been, where you are, and the trajectory of your growth. Think of it as your riding autobiography, written by an AI that&#39;s read every debrief and reflection you&#39;ve ever submitted.</p>
        <h3>What You&#39;ll See</h3>
        <p>The Journey Map opens with <strong>At-a-Glance Metrics</strong> &mdash; total rides logged, breakthroughs identified, patterns found, and your current focus area. Below that, the detail is organized into expandable sections:</p>
        <ul className="tips-bullets">
          <li><strong>Recent Progress:</strong> A dated timeline of your last two weeks &mdash; achievements, challenges, and key moments with brief context for each.</li>
          <li><strong>Pattern Analysis:</strong> Recurring themes across your rides, each tagged as a Success, Challenge, or In-Progress pattern so you can scan quickly. Includes a "What&#39;s Working" summary.</li>
          <li><strong>Breakthroughs &amp; Celebrations:</strong> Key achievements the AI has identified &mdash; your first successful shoulder-in, a breakthrough in canter transitions, confidence recovery after a setback. Some you&#39;ll recognize; others you might not have noticed.</li>
          <li><strong>Challenges &amp; Learning Edges:</strong> Current challenges with frequency data (how often they appear in your debriefs) and skills under active development.</li>
          <li><strong>[Horse Name]&#39;s Progress:</strong> A dedicated section for each horse &mdash; physical development, mental/emotional growth, and training response patterns tracked separately.</li>
          <li><strong>Goal Tracking:</strong> Your progress mapped against your stated goals, with honest assessment of momentum, plateaus, and trajectory.</li>
        </ul>
        <div className="tips-tip-box">
          <h4>Getting the Richest Journey Map</h4>
          <p>The Journey Map draws from <em>everything</em> &mdash; debriefs, reflections, events, observations. The more consistently you record, the more detailed and accurate your map becomes. Five rides show you what happened. Twenty rides reveal why it keeps happening. Fifty rides show you the conditions that create your best work.</p>
        </div>
        <div className="tips-emphasis"><strong>Generated:</strong> Weekly (triggered by your reflection submission) and available on demand. Each generation incorporates all data submitted to date.</div>
      </div>

      {/* Multi-Voice Coaching */}
      <div className="tips-section" id="multi-voice">
        <h2>&#x1F399;&#xFE0F; Multi-Voice Coaching</h2>
        <p className="tips-welcome-text">The same riding data, analyzed through four completely different coaching lenses. Each voice sees your data from a distinct perspective and offers insights the others might miss. It&#39;s like having a team of coaches around the table, each bringing their expertise to bear on <em>your</em> riding.</p>
        <h3>Quick Insights First, Voices When You&#39;re Ready</h3>
        <p>Your weekly coaching report opens with a <strong>Quick Insights</strong> summary that&#39;s always visible:</p>
        <ul className="tips-bullets">
          <li><strong>Top 3 Patterns This Week</strong> &mdash; the most significant, actionable patterns from your recent rides, each in one sentence with data to back it up.</li>
          <li><strong>Your Priority This Week</strong> &mdash; one clear, achievable focus for the next seven days with specific context from your data. Always visible, never buried.</li>
          <li><strong>This Week&#39;s Celebration</strong> &mdash; one genuine breakthrough or success, connected to your broader progress. Expandable if you want to read more.</li>
        </ul>
        <p>Below the Quick Insights, the four coaching voices are presented in <strong>tabs</strong>. Tap any voice to read their full analysis (400&ndash;600 words each). The Technical Coach might focus on a position pattern while the Empathetic Coach notices an emotional shift. The Classical Master might remind you that difficulty is a sign of deepening understanding, while the Practical Strategist maps out next week.</p>
        <div className="outputs-voice-grid">
          <div className="outputs-voice-card outputs-voice-technical">
            <div className="outputs-voice-icon">&#x1F52C;</div>
            <div className="outputs-voice-name">Technical Coach</div>
            <div className="outputs-voice-desc">Biomechanics, position, aids, cause-and-effect analysis.</div>
          </div>
          <div className="outputs-voice-card outputs-voice-empathetic">
            <div className="outputs-voice-icon">&#x2B50;</div>
            <div className="outputs-voice-name">Empathetic Coach</div>
            <div className="outputs-voice-desc">Psychology, confidence, partnership, the whole person.</div>
          </div>
          <div className="outputs-voice-card outputs-voice-classical">
            <div className="outputs-voice-icon">&#x1F3AF;</div>
            <div className="outputs-voice-name">Classical Master</div>
            <div className="outputs-voice-desc">Principles, training scale, long-term development.</div>
          </div>
          <div className="outputs-voice-card outputs-voice-strategist">
            <div className="outputs-voice-icon">&#x1F4CB;</div>
            <div className="outputs-voice-name">Practical Strategist</div>
            <div className="outputs-voice-desc">Goals, planning, timelines, measurable progress.</div>
          </div>
        </div>
        <div className="tips-tip-box">
          <h4>Voice Snippets Everywhere</h4>
          <p>Beyond the full Multi-Voice Coaching report, you&#39;ll notice brief coaching voice annotations throughout your other outputs &mdash; a Technical Coach note in your Physical Guidance, a Classical Master reflection in your Journey Map. These are marked with each voice&#39;s icon and color so you always know who&#39;s speaking. They feel like expert margin notes, not competing headlines.</p>
        </div>
        <div className="tips-emphasis"><strong>Generated:</strong> Weekly coaching report (triggered by reflection submission). Individual voices can also be triggered on demand.</div>
      </div>

      {/* Data Visualizations */}
      <div className="tips-section" id="data-viz">
        <h2>&#x1F4CA; Data Visualizations</h2>
        <p className="tips-welcome-text">Making the invisible visible. Your subjective riding experience &mdash; feel, mood, energy, quality &mdash; transformed into trackable visual data that reveals patterns over time. Each visualization includes a clear title, brief context, and a highlighted key insight so you can scan quickly.</p>
        <div className="outputs-viz-grid">
          <div className="outputs-viz-item"><strong>&#x1F4C8; Ride Quality Trend</strong><span>Session-by-session trajectory with rolling average &mdash; see the real direction beneath the daily ups and downs.</span></div>
          <div className="outputs-viz-item"><strong>&#x1F9E0; Mental State Patterns</strong><span>How often you report focused vs. frustrated vs. tense &mdash; and which states correlate with higher ride quality.</span></div>
          <div className="outputs-viz-item"><strong>&#x1F3AF; Training Focus</strong><span>What you&#39;ve been working on most &mdash; your training distribution over time.</span></div>
          <div className="outputs-viz-item"><strong>&#x1F3C6; Goal Progress</strong><span>Visual progress toward each stated goal with milestone markers along the way.</span></div>
          <div className="outputs-viz-item"><strong>&#x1F4AA; Confidence Trajectory</strong><span>Your emotional arc with annotated events that shifted your trajectory.</span></div>
          <div className="outputs-viz-item"><strong>&#x1F525; Theme Frequency</strong><span>Which topics and challenges appear most often in your debriefs &mdash; what&#39;s really on your mind.</span></div>
        </div>
        <p>The AI provides a narrative interpretation alongside each chart &mdash; not just the numbers, but what the patterns mean and what they suggest about your training trajectory.</p>
        <div className="tips-tip-box">
          <h4>The Quality + Mental State Connection</h4>
          <p>One of the most revealing visualizations cross-references your ride quality ratings with your reported mental state. Over time, this can show you exactly which mindset conditions produce your best riding &mdash; information that feeds directly into your Grand Prix Thinking practices.</p>
        </div>
        <div className="tips-emphasis"><strong>Generated:</strong> Weekly, alongside your coaching report.</div>
      </div>

      {/* Grand Prix Thinking */}
      <div className="tips-section" id="grand-prix">
        <h2>&#x1F9E0; Grand Prix Thinking</h2>
        <p className="tips-welcome-text">Mental skills development for dressage riders, built from sport psychology principles and personalized to your specific patterns, horses, and challenges. "Grand Prix" isn&#39;t about your competition level &mdash; it&#39;s about developing the mental approach that the best riders in the world use, adapted to where <em>you</em> are right now.</p>
        <h3>Two Layers, One Dashboard</h3>
        <p>Grand Prix Thinking operates in two layers that appear together. <strong>Tabs</strong> let you switch between "what do I practice today" and "where is all this taking me" without either perspective getting lost.</p>
        <div className="outputs-layer-compare">
          <div className="outputs-layer-box outputs-layer-1">
            <h4>Layer 1: Mental Performance</h4>
            <p>"What do I practice today?"</p>
            <p className="outputs-layer-sub">Exactly 3 paths, each with the same parallel structure:</p>
            <ul>
              <li><strong>The Pattern</strong> &mdash; what&#39;s happening now</li>
              <li><strong>The Mental Shift</strong> &mdash; the reframe needed</li>
              <li><strong>This Week&#39;s Practice</strong> &mdash; 3 specific exercises</li>
              <li><strong>Success Metric</strong> &mdash; how you&#39;ll know it&#39;s working</li>
            </ul>
            <p className="outputs-layer-note">4-week progressive programs with daily practices</p>
          </div>
          <div className="outputs-layer-box outputs-layer-2">
            <h4>Layer 2: Training Trajectory</h4>
            <p>"Where is all this taking me?"</p>
            <p className="outputs-layer-sub">Exactly 3 trajectories, each with parallel structure:</p>
            <ul>
              <li><strong>Current Position</strong> &mdash; where you are now</li>
              <li><strong>Next Milestones</strong> &mdash; 3&ndash;6 month view</li>
              <li><strong>Building Blocks</strong> &mdash; how current work connects</li>
              <li><strong>Timeline Projection</strong> &mdash; realistic estimate</li>
            </ul>
            <p className="outputs-layer-note">Long-term roadmaps with movement progression</p>
          </div>
        </div>
        <p>Everything in Grand Prix Thinking is personalized. Your affirmations use your own language &mdash; pulled from your reflections and self-assessment. Your self-talk scripts address your actual negative patterns. Horse-specific strategies exist for every horse in your profile. Each path includes a coaching voice annotation from the voice most natural to that path&#39;s focus.</p>
        <div className="tips-tip-box">
          <h4>Unlocking Deeper Personalization</h4>
          <p>Grand Prix Thinking gets significantly more specific as your data grows. With 5+ debriefs, it starts identifying your mental state patterns. With a completed Rider Self-Assessment, it has your self-awareness levels, self-regulation strategies, and performance history. The richest personalization comes when debriefs, reflections, self-assessments, and event data all work together.</p>
        </div>
        <div className="tips-emphasis"><strong>Generated:</strong> Layer 1 updates when you cross data thresholds (5+ debriefs) or every 30 days. Layer 2 generates at key milestones &mdash; onboarding, Week 4, and Week 8.</div>
      </div>

      {/* Physical Guidance */}
      <div className="tips-section" id="physical">
        <h2>&#x1F3CB;&#xFE0F; Physical Guidance</h2>
        <p className="tips-welcome-text">Dressage is an athletic pursuit, and your body is your primary tool. Physical Guidance addresses the rider&#39;s body with off-horse exercises, stretches, and body awareness practices &mdash; all tailored to what <em>your</em> Physical Self-Assessment and debrief data reveal about your specific challenges.</p>
        <h3>What You&#39;ll See</h3>
        <ul className="tips-bullets">
          <li><strong>Position Pattern Analysis:</strong> The AI cross-references your physical self-assessment with what you describe in your debriefs to identify recurring position-related themes.</li>
          <li><strong>Off-Horse Exercises:</strong> Targeted exercises addressing your documented asymmetries and tension patterns. Each exercise includes a <strong>Technical Coach annotation</strong> &mdash; one sentence explaining the biomechanical cause-and-effect between this exercise and your in-saddle improvement.</li>
          <li><strong>Classical Framing:</strong> A brief <strong>Classical Master annotation</strong> at the top connecting your physical preparation to classical principles &mdash; why suppleness matters, why the rider&#39;s body must be as prepared as the horse&#39;s.</li>
          <li><strong>Pre-Ride Preparation:</strong> Warm-up routines calibrated to your kinesthetic awareness level &mdash; simpler cues if you&#39;re building body awareness, more nuanced proprioceptive work if you&#39;re already tuned in.</li>
          <li><strong>Body Awareness Prompts:</strong> In-ride mindfulness cues targeting your specific tension areas from your physical self-assessment.</li>
        </ul>
        <p>Physical Guidance complements (but doesn&#39;t duplicate) the Pre-Ride path in Grand Prix Thinking. Where Grand Prix Thinking&#39;s body scan serves a mental performance goal, Physical Guidance stands alone as dedicated fitness and body awareness support.</p>
        <div className="tips-tip-box">
          <h4>The Kinesthetic Awareness Slider</h4>
          <p>Your Physical Self-Assessment includes a 1&ndash;10 kinesthetic awareness rating. This calibrates <em>all</em> physical cues across the platform &mdash; not just in Physical Guidance but in Grand Prix Thinking and coaching voice annotations too. As your awareness grows and you update this rating, the cues you receive become more refined.</p>
        </div>
        <div className="tips-emphasis"><strong>Generated:</strong> Bi-weekly, plus a fresh analysis whenever you submit a new Physical Self-Assessment. <em>Standard disclaimer: These are general fitness suggestions for riders, not medical advice. Riders with injuries or conditions should consult their healthcare provider.</em></div>
      </div>

      {/* Event Planner */}
      <div className="tips-section" id="event-planner">
        <h2>&#x1F3AF; Event Planner</h2>
        <p className="tips-welcome-text">When you submit an Event Preparation form for an upcoming show, clinic, or competition, the Event Planner generates a comprehensive, personalized preparation plan &mdash; from readiness analysis against specific dressage test requirements all the way through show-day strategy.</p>
        <h3>The Four-Part Plan</h3>
        <ul className="tips-bullets">
          <li><strong>Test Requirements Assembly:</strong> If you&#39;re competing, the planner pulls the complete requirements from the verified dressage test database &mdash; movements, geometry, coefficients, and common errors for your specific test.</li>
          <li><strong>Readiness Analysis:</strong> Your recent debriefs, profiles, and self-assessments evaluated against the test requirements. Where are you strong? Where are the gaps? What are the risk areas?</li>
          <li><strong>Preparation Plan:</strong> A personalized week-by-week training plan from now until the event. Each week includes a <strong>coaching voice tip</strong> from the voice most relevant to that week&#39;s focus.</li>
          <li><strong>Show-Day Guidance:</strong> A timeline for the day itself &mdash; warm-up strategy, between-rides routine, recovery plan &mdash; connected to your Grand Prix Thinking practices for continuity.</li>
        </ul>
        <div className="tips-tip-box">
          <h4>The Preparation + Follow-Up Loop</h4>
          <p>The Event Planner generates structured post-event debrief questions that feed back into the YDJ system. When you prepare for an event AND log what actually happened afterward, the AI can analyze the gap between intention and outcome &mdash; one of the most revealing patterns in rider development.</p>
        </div>
        <div className="tips-emphasis"><strong>Generated:</strong> On demand, whenever you submit an Event Preparation form. Works for events within the next six months.</div>
      </div>

      {/* Self-Assessment Analysis */}
      <div className="tips-section" id="self-assessment">
        <h2>&#x1F4C8; Self-Assessment Analysis</h2>
        <p className="tips-welcome-text">Self-assessments are both input and output. When you complete a self-assessment, the AI doesn&#39;t just store it &mdash; it generates an analysis that compares your self-perception against your actual riding patterns from your debriefs. This is the "meta-coaching" layer: coaching you on how you see yourself.</p>
        <p>The analysis includes a <strong>Growth Narrative</strong> &mdash; a coaching-voice-infused story of how your self-perception is evolving &mdash; with an <strong>Empathetic Coach annotation</strong> reflecting on the emotional journey of your self-awareness and a <strong>Classical Master annotation</strong> connecting it to the broader arc of your development.</p>
        <p className="tips-text-spacing">Over time, as you submit multiple self-assessments (we suggest monthly or quarterly), the analysis becomes longitudinal &mdash; tracking how your self-perception evolves and whether changes in how you see yourself align with changes in your riding data. Are you becoming more accurate in your self-assessment? Are you underestimating your progress? Overestimating a challenge that your debriefs suggest is actually improving?</p>
        <div className="tips-tip-box">
          <h4>When to Reassess</h4>
          <p>Take your first self-assessments when you start, then revisit them monthly or quarterly. They&#39;re especially valuable after a break from riding, recovering from an injury, changing training intensity, or starting work with a new horse. The comparison between "then" and "now" is where the deepest insights live.</p>
        </div>
        <div className="tips-emphasis"><strong>Generated:</strong> Automatically when you submit a Rider Self-Assessment or Physical Self-Assessment. Compares against all previous assessments and your accumulated debrief data.</div>
      </div>

      {/* Meet Your Coaching Team */}
      <div className="tips-section" id="coaching-voices">
        <h2>Meet Your Coaching Team</h2>
        <p className="tips-welcome-text">Four coaching voices appear throughout the platform &mdash; each with a distinct personality, perspective, and communication style. They&#39;re most prominent in the Multi-Voice Coaching report (where each voice delivers a full 400&ndash;600 word analysis via tabs), but you&#39;ll encounter their brief annotations across nearly every output, marked with their icon and signature color.</p>
        <div className="outputs-voice-card outputs-voice-technical outputs-voice-card--full">
          <div className="outputs-voice-icon">&#x1F52C;</div>
          <div className="outputs-voice-name">The Technical Coach</div>
          <div className="outputs-voice-desc">Focuses on biomechanics, position, aids, and cause-and-effect. Sees your riding as a puzzle of interconnected physical systems. If the Empathetic Coach asks "how did that make you feel?" the Technical Coach asks "what was your hip angle doing when that happened?" Clear, specific, constructive &mdash; never vague. <strong>Appears in:</strong> Physical Guidance exercise annotations, Grand Prix Thinking practice notes, Event Planner skill-building weeks.</div>
        </div>
        <div className="outputs-voice-card outputs-voice-empathetic outputs-voice-card--full">
          <div className="outputs-voice-icon">&#x2B50;</div>
          <div className="outputs-voice-name">The Empathetic Coach</div>
          <div className="outputs-voice-desc">Focuses on rider psychology, confidence, fear, and the rider-horse relationship. Sees the whole person, not just the rider. Catches emotional patterns &mdash; the anxiety that shows up at certain movements, the joy that correlates with breakthrough rides. Warm, validating, insightful. <strong>Appears in:</strong> Self-Assessment Growth Narrative, Grand Prix Thinking Curious Explorer path, Event Planner confidence weeks.</div>
        </div>
        <div className="outputs-voice-card outputs-voice-classical outputs-voice-card--full">
          <div className="outputs-voice-icon">&#x1F3AF;</div>
          <div className="outputs-voice-name">The Classical Master</div>
          <div className="outputs-voice-desc">Focuses on principles, philosophy, and the long view. Evaluates your work through classical dressage principles and the training scale. Reminds you that a "struggle" might actually be a sign you&#39;re asking harder questions. Wise, patient, sometimes poetic. <strong>Appears in:</strong> Journey Map narrative reflections, Physical Guidance philosophical framing, Grand Prix Thinking Steady Builder path, Event Planner final-week grounding.</div>
        </div>
        <div className="outputs-voice-card outputs-voice-strategist outputs-voice-card--full">
          <div className="outputs-voice-icon">&#x1F4CB;</div>
          <div className="outputs-voice-name">The Practical Strategist</div>
          <div className="outputs-voice-desc">Focuses on goals, timelines, and actionable plans. Takes all the data and turns it into "here&#39;s what to do next week." Manages your training plan, competition prep, and time constraints with direct, organized efficiency. <strong>Appears in:</strong> Grand Prix Thinking Ambitious Competitor path, Event Planner logistics and strategy, Data Visualization action takeaways.</div>
        </div>
        <div className="tips-tip-box">
          <h4>Different Riders, Different Resonance</h4>
          <p>You&#39;ll probably find that one or two voices resonate more than the others &mdash; and that&#39;s by design. But pay attention to the voices that challenge you, too. The one that makes you slightly uncomfortable might be offering the insight you need most.</p>
        </div>
      </div>

      {/* Getting the Most from Your Outputs */}
      <div className="tips-section" id="maximize">
        <h2>Getting the Most from Your Outputs</h2>

        <h3>Start with Quick Insights</h3>
        <p>Every output leads with the most important takeaways. On a busy day, the Quick Insights summary alone &mdash; your top patterns, this week&#39;s priority, and your celebration &mdash; gives you real value in under a minute. You can always come back and expand the detailed sections when you have time.</p>

        <h3>Consistency Beats Intensity</h3>
        <p>Ten brief debriefs over two weeks reveal more patterns than one detailed essay. The AI finds signal in frequency and repetition. Short, consistent entries after every ride will always produce richer analysis than occasional deep dives.</p>

        <h3>Let All Six Reflection Categories Do Their Work</h3>
        <p>Each reflection category feeds different aspects of the analysis. Personal Milestones drive your Journey Map trajectory. Obstacles fuel Grand Prix Thinking&#39;s resilience path. Feel/Body Awareness powers Physical Guidance calibration. If you only ever reflect on breakthroughs, the AI has blind spots. Aim for variety over time.</p>

        <h3>Keep Profiles and Self-Assessments Current</h3>
        <p>Your Rider Profile, Horse Profile(s), and self-assessments are the foundation that every output builds on. When your goals shift, your horse&#39;s training level advances, or your physical situation changes &mdash; update the relevant profile. Current data means current, relevant analysis.</p>

        <h3>Log the "Small" Events</h3>
        <p>A farrier visit, a saddle fitting, allergy season, a change in turnout schedule &mdash; these often explain patterns that would otherwise seem mysterious. When your ride quality dips for two weeks and the AI can see that it coincided with a barn change, that&#39;s an insight worth having.</p>

        <h3>Use the Event Planner Loop</h3>
        <p>Submit the Event Preparation form before shows and clinics, then log the event and complete a debrief afterward. The before/after pairing is one of the richest sources of insight the AI can work with.</p>

        <h3>Read What Challenges You</h3>
        <p>If a coaching voice says something that feels uncomfortable or surprising, sit with it before dismissing it. The AI can see patterns across your entire dataset that are hard to hold in your head simultaneously. Sometimes the most valuable insight is the one that doesn&#39;t match your self-narrative.</p>

        <div className="tips-tip-box">
          <h4>The Data Threshold Effect</h4>
          <p>Your first outputs will be helpful but general. After 10+ debriefs, the patterns start to sharpen. After 20+, the AI starts making connections that genuinely surprise you. After 50, it knows your riding tendencies better than you do. Be patient with the early outputs &mdash; the system gets dramatically better as it learns you.</p>
        </div>
      </div>

      {/* FAQ */}
      <div className="tips-section" id="faq">
        <h2>Frequently Asked Questions</h2>

        <div className="outputs-faq-item"><div className="outputs-faq-q">How often are my outputs updated?</div><div className="outputs-faq-a">Your Journey Map, Multi-Voice Coaching report, and Data Visualizations regenerate weekly, triggered by your reflection submission. Grand Prix Thinking updates when you cross data thresholds (like submitting your 5th debrief) or every 30 days. Physical Guidance updates bi-weekly. The Event Planner and Self-Assessment Analysis generate on demand when you submit the relevant form. Every generation incorporates all your data to date.</div></div>

        <div className="outputs-faq-item"><div className="outputs-faq-q">What&#39;s the minimum data I need before outputs are useful?</div><div className="outputs-faq-a">You&#39;ll start receiving outputs after completing your Rider Profile and submitting your first few debriefs and reflections. The pilot minimum &mdash; 5 debriefs and 6 reflections (one from each category) &mdash; gives the AI enough for meaningful initial analysis. But the outputs get significantly richer with more data. Think of the first few outputs as a foundation that deepens with every entry.</div></div>

        <div className="outputs-faq-item"><div className="outputs-faq-q">Do I need to read every section of every output?</div><div className="outputs-faq-a">Not at all &mdash; that&#39;s exactly why outputs are organized the way they are. The Quick Insights summary at the top gives you the most important takeaways at a glance. Below that, sections are collapsible &mdash; expand only what&#39;s relevant to you today. On a busy week you might just read Quick Insights and your priority. On a quieter day you might dive into the full pattern analysis or read all four coaching voices. Both are valid.</div></div>

        <div className="outputs-faq-item"><div className="outputs-faq-q">Do I need to fill out every form to get useful outputs?</div><div className="outputs-faq-a">No. Post-Ride Debriefs and Reflections are the core data that powers most outputs. Profiles give essential context. Everything else &mdash; events, observations, self-assessments &mdash; adds richness and enables specific features (like the Event Planner, Physical Guidance, and Grand Prix Thinking&#39;s deeper personalization). Start with debriefs and reflections, then add the other forms as opportunities arise.</div></div>

        <div className="outputs-faq-item"><div className="outputs-faq-q">Will the AI give me generic advice?</div><div className="outputs-faq-a">No. Every output is built from your actual data &mdash; your horse names, your self-talk patterns, your documented challenges, your specific goals. If a recommendation could apply to any random rider, it hasn&#39;t done its job. The system uses your own words and references your specific situations. If you ever receive something that feels generic, that&#39;s valuable feedback for us.</div></div>

        <div className="outputs-faq-item"><div className="outputs-faq-q">What if I ride multiple horses?</div><div className="outputs-faq-a">Create a Horse Profile for each horse you ride regularly. The AI tracks patterns for each partnership separately &mdash; your ride quality trends with Horse A vs. Horse B, the different challenges each horse presents. Your Journey Map includes a dedicated progress section for each horse. Grand Prix Thinking includes horse-specific mental preparation sequences for every horse in your profile.</div></div>

        <div className="outputs-faq-item"><div className="outputs-faq-q">How do the tabs work in Multi-Voice Coaching?</div><div className="outputs-faq-a">The Quick Insights summary is always visible at the top. Below that, the four coaching voices appear as tabs &mdash; tap any voice&#39;s name to read their full analysis. Each voice provides a complete, independent perspective (400&ndash;600 words), so you can read one or all four. The tab interface means you don&#39;t have to scroll past three voices to reach the fourth.</div></div>

        <div className="outputs-faq-item"><div className="outputs-faq-q">What&#39;s the difference between Grand Prix Thinking Layer 1 and Layer 2?</div><div className="outputs-faq-a">Layer 1 is your daily mental performance toolkit &mdash; 3 specific paths addressing your current performance challenges, each with concrete exercises and success metrics. It answers "what do I do today?" Layer 2 maps 3 long-term training trajectories with milestone timelines and movement progressions. It answers "where is all this taking me?" They appear together in one dashboard with tabs, so you can toggle between the immediate and the long-term.</div></div>

        <div className="outputs-faq-item"><div className="outputs-faq-q">I see coaching voice annotations in outputs other than Multi-Voice Coaching. What are those?</div><div className="outputs-faq-a">Those are brief, embedded snippets (1&ndash;2 sentences) from the coaching voice most relevant to that section. They&#39;re marked with the voice&#39;s icon and color &mdash; for example, a &#x1F52C; Technical Coach note explaining why a specific exercise connects to your riding position, or a &#x1F3AF; Classical Master reflection on your long-term trajectory. They add perspective without adding volume &mdash; think of them as expert margin notes from your coaching team.</div></div>

        <div className="outputs-faq-item"><div className="outputs-faq-q">What do the collapsible sections and tags mean?</div><div className="outputs-faq-a">Collapsible sections let you expand only the detail you want &mdash; tap the header to open it, tap again to close. Pattern tags like "Success," "Challenge," and "Progress" help you scan quickly without reading every detail. Quantitative anchors (percentages, ride counts, frequency data) give you concrete numbers so the insights feel grounded in evidence, not just opinion.</div></div>

        <div className="outputs-faq-item"><div className="outputs-faq-q">Are the physical exercises safe for everyone?</div><div className="outputs-faq-a">Physical Guidance provides general fitness suggestions for riders &mdash; conservative and gentle exercises. They are not medical advice. If you have injuries, chronic conditions, or physical limitations, please consult your healthcare provider before starting any exercise program. If you work with a PT or bodyworker, the Physical Self-Assessment captures their specific cues so the AI can align its recommendations.</div></div>

        <div className="outputs-faq-item"><div className="outputs-faq-q">How does the Event Planner know about my dressage test?</div><div className="outputs-faq-a">YDJ includes a comprehensive, verified dressage test database covering USDF tests (Introductory through Fourth Level) and FEI tests (Prix St. Georges through Grand Prix Special). When you specify which test you&#39;re preparing for, the planner pulls the complete requirements &mdash; movements, geometry, coefficients, and common errors &mdash; and evaluates your readiness against them specifically.</div></div>

        <div className="outputs-faq-item"><div className="outputs-faq-q">What happens to my data?</div><div className="outputs-faq-a">Your data is yours. It&#39;s stored securely and used exclusively to generate your personalized outputs. It&#39;s never shared with other riders, and your coaching analysis is completely private. You can export your data at any time.</div></div>
      </div>

      {/* Contact Section */}
      <div className="tips-contact-box" id="contact">
        <h3>Questions? Problems? Ideas?</h3>
        <p className="tips-contact-lead">We&#39;d love to hear from you:</p>
        <p><a href="mailto:barb@yourdressagejourney.com">barb@yourdressagejourney.com</a></p>
        <p className="tips-contact-footnote">Your feedback shapes this platform. No question is too small, no idea is too weird.</p>
      </div>

      <div className="tips-footer-quote">
        <p className="tips-quote">"Journaling without analysis is just expensive record-keeping.<br />Your data deserves to work as hard as you do."</p>
        <p className="tips-footer-tagline">Illuminate Your Journey</p>
      </div>
    </div>
  );
}
