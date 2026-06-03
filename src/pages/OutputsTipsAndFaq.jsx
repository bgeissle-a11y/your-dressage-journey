import { Link } from 'react-router-dom';
import './TipsAndFaq.css';
import './OutputsTipsAndFaq.css';

export default function OutputsTipsAndFaq() {
  return (
    <div className="tips-faq-page" id="top">
      <a href="#top" className="tips-back-to-top" aria-label="Back to top">&uarr;</a>
      <header className="tips-header">
        <img src="/assets/logo-color.svg" alt="Your Dressage Journey" className="tips-logo-img" />
        <h1>Your AI Coaching Outputs</h1>
        <p className="tips-subtitle">What Your Dressage Journey creates for you &mdash; and how to read it</p>
        <span className="tips-tagline-badge">ILLUMINATE YOUR JOURNEY</span>
      </header>

      {/* Intro + TOC */}
      <div className="tips-section">
        <h2>On This Page</h2>
        <p className="tips-text-block">
          Your data becomes coaching intelligence through a suite of AI-powered analyses. Every output is built from your specific rides, horses, goals, and language&mdash;not generic advice. This guide explains what the platform creates, when it appears, and how to read it. The companion <Link to="/tips-and-faq">Forms Guide</Link> covers the forms, tools, and settings that feed everything.
        </p>
        <nav className="tips-toc">
          <a href="#overview">Your Outputs at a Glance</a>
          <a href="#how">How Your Data Becomes Insight</a>
          <a href="#when">When Outputs Appear</a>
          <a href="#reading">Reading Your Outputs</a>
          <a href="#first-light">First Light</a>
          <a href="#journey-map">Journey Map</a>
          <a href="#multi-voice">Multi-Voice Coaching</a>
          <a href="#data-viz">Data Visualizations</a>
          <a href="#grand-prix">Grand Prix Thinking</a>
          <a href="#physical">Physical Guidance</a>
          <a href="#event-planner">Event Planner</a>
          <a href="#viz-scripts">Visualization Scripts</a>
          <a href="#voices">Meet Your Coaching Team</a>
          <a href="#tiers">Your Subscription &amp; What You Get</a>
          <a href="#maximize">Getting the Most from Your Outputs</a>
          <a href="#faq">Frequently Asked Questions</a>
          <a href="#contact">Contact</a>
        </nav>
      </div>

      {/* Overview */}
      <div className="tips-section tips-section--start" id="overview">
        <span className="tips-section-badge">Start Here</span>
        <h2>Your Outputs at a Glance</h2>
        <p className="tips-welcome-text">Seven outputs plus First Light, your onboarding-only first read. Cadences describe when each output regenerates.</p>
        <div className="outputs-card-grid">
          <div className="outputs-card outputs-card--first-light">
            <div className="outputs-card-icon">&#x2728;</div>
            <div className="outputs-card-title">First Light</div>
            <div className="outputs-card-desc">Your first AI coaching read, generated from the six onboarding reflections. Regenerable once. Retires after your 5th debrief.</div>
            <span className="outputs-card-freq">Onboarding only</span>
          </div>
          <div className="outputs-card">
            <div className="outputs-card-icon">&#x1F5FA;&#xFE0F;</div>
            <div className="outputs-card-title">Journey Map</div>
            <div className="outputs-card-desc">Your visual and narrative timeline&mdash;milestones, themes, key events, and your trajectory.</div>
            <span className="outputs-card-freq">Auto-refresh on activity</span>
          </div>
          <div className="outputs-card">
            <div className="outputs-card-icon">&#x1F399;&#xFE0F;</div>
            <div className="outputs-card-title">Multi-Voice Coaching</div>
            <div className="outputs-card-desc">Four distinct coaching perspectives analyze the same data through different lenses.</div>
            <span className="outputs-card-freq">Auto-refresh on activity</span>
          </div>
          <div className="outputs-card">
            <div className="outputs-card-icon">&#x1F4CA;</div>
            <div className="outputs-card-title">Data Visualizations</div>
            <div className="outputs-card-desc">Charts and graphs that surface your trends, correlations, and progress over time.</div>
            <span className="outputs-card-freq">Refreshes with Multi-Voice</span>
          </div>
          <div className="outputs-card">
            <div className="outputs-card-icon">&#x1F9E0;</div>
            <div className="outputs-card-title">Grand Prix Thinking</div>
            <div className="outputs-card-desc">A 30-day mental-skills program with daily practices and long-term trajectory paths.</div>
            <span className="outputs-card-freq">Monthly, rider-led</span>
          </div>
          <div className="outputs-card">
            <div className="outputs-card-icon">&#x1F3CB;&#xFE0F;</div>
            <div className="outputs-card-title">Physical Guidance</div>
            <div className="outputs-card-desc">A 30-day off-horse program and body awareness practices, tailored to your documented challenges.</div>
            <span className="outputs-card-freq">Monthly, rider-led</span>
          </div>
          <div className="outputs-card">
            <div className="outputs-card-icon">&#x1F3AF;</div>
            <div className="outputs-card-title">Event Planner</div>
            <div className="outputs-card-desc">A personalized prep plan for a specific show&mdash;readiness analysis plus a week-by-week training plan. One plan per event, one horse per plan.</div>
            <span className="outputs-card-freq">On demand</span>
          </div>
          <div className="outputs-card">
            <div className="outputs-card-icon">&#x1F4FD;&#xFE0F;</div>
            <div className="outputs-card-title">Visualization Scripts</div>
            <div className="outputs-card-desc">Personalized mental rehearsal scripts for a specific movement, problem, and context&mdash;built block by block, ready to run before you ride.</div>
            <span className="outputs-card-freq">On demand</span>
          </div>
        </div>
        <div className="tips-emphasis">
          <strong>The core insight:</strong> you can&#39;t hold all your training context in your head simultaneously. That&#39;s not a failing&mdash;that&#39;s human. The AI can hold all of it at once, find the patterns, and reflect them back with coaching intelligence.
        </div>
      </div>

      {/* How */}
      <div className="tips-section" id="how">
        <h2>How Your Data Becomes Insight</h2>
        <p className="tips-welcome-text">Every output follows the same pattern. Your data is collected, assembled into context, analyzed through specialized coaching frameworks built on classical dressage principles, and delivered as personalized intelligence.</p>
        <div className="outputs-data-flow">
          <p className="outputs-flow-title">The Pipeline</p>
          <div className="outputs-flow-steps">
            <div className="outputs-flow-step">&#x1F4DD; Your Forms</div>
            <span className="outputs-flow-arrow">&rarr;</span>
            <div className="outputs-flow-step">&#x1F504; Pattern Assembly</div>
            <span className="outputs-flow-arrow">&rarr;</span>
            <div className="outputs-flow-step">&#x1F916; AI Analysis</div>
            <span className="outputs-flow-arrow">&rarr;</span>
            <div className="outputs-flow-step">&#x1F4CB; Your Coaching</div>
          </div>
        </div>
        <p>Your profiles, debriefs, reflections, lesson notes, events, observations, and self-assessments are combined into a rich picture of your riding. The AI doesn&#39;t analyze each form in isolation&mdash;it cross-references everything. A pattern in your debriefs might be explained by an event you logged. A shift in your reflections might correlate with a change in your physical self-assessment. The more data points you provide, the more connections the AI can make.</p>

        <h3>This isn&#39;t a generic LLM talking to you</h3>
        <p>Every AI call the platform makes is wrapped in a deep, dressage-specific scaffold:</p>
        <ul className="tips-bullets">
          <li><strong>Custom system prompts for each output</strong>&mdash;tens of pages of instructions per coaching surface that shape what to look for, how to phrase recommendations, and what your coaching voices sound like.</li>
          <li><strong>Core Dressage Principles</strong>&mdash;an authoritative training-philosophy reference (relaxation, forwardness, trust in the hand, the training scale) that every recommendation is evaluated against. The AI cannot tell you to ride harder when your data says your horse is tense.</li>
          <li><strong>Level Progression Guardrails</strong>&mdash;realistic timelines for moving between levels (Training to First, First to Second, all the way to the critical Intermediate I &rarr; Intermediate II transition that introduces passage and piaffe). The AI will not recommend skipping or compressing these.</li>
          <li><strong>Freestyle Guardrails</strong>&mdash;competition rules for compulsory elements, forbidden movements, and eligibility, so any freestyle guidance is technically accurate.</li>
          <li><strong>Horse Health and Rider Health awareness</strong>&mdash;health context is woven into prompts so the AI tempers recommendations around active concerns and never plays vet, PT, or doctor.</li>
          <li><strong>The Four Coaching Voices</strong>&mdash;each voice has its own prompt, its own intellectual lineage, and its own way of seeing the data.</li>
        </ul>
        <p>The result is coaching that&#39;s informed by sound dressage practice, not generic horse advice or guessed-at training theory.</p>

        <div className="tips-tip-box">
          <h4>Why cross-referencing matters</h4>
          <p>When the AI sees that your ride quality dips the week after a farrier visit, or that confidence peaks when you&#39;ve done a reflection the same morning&mdash;those are insights no single form could reveal. The magic is in the connections between data types, evaluated through a dressage-specific lens.</p>
        </div>
      </div>

      {/* When */}
      <div className="tips-section" id="when">
        <h2>When Outputs Appear</h2>
        <p className="tips-welcome-text">
          Each output has its own trigger&mdash;some run on a regular cadence, some run on data thresholds, some run only when you ask. Here&#39;s the full schedule.
        </p>

        <table className="outputs-schedule-table">
          <thead>
            <tr>
              <th>Output</th>
              <th>Cadence</th>
              <th>What triggers a refresh</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>First Light</strong></td>
              <td>One-time</td>
              <td>Generates on completion of the six First Light reflections. Regenerable <strong>once</strong> after you&#39;ve added new data. Retires automatically after your 5th debrief.</td>
            </tr>
            <tr>
              <td><strong>Journey Map</strong></td>
              <td>Auto-refresh on activity</td>
              <td>Refreshes after <strong>10 combined debriefs and reflections</strong>, or after a journey event plus 5 entries. Working tier: max once per month. Extended: no frequency cap.</td>
            </tr>
            <tr>
              <td><strong>Multi-Voice Coaching</strong></td>
              <td>Auto-refresh on activity</td>
              <td>Refreshes after <strong>every 10 new debriefs</strong>. Working tier: monthly fallback if the 10-debrief trigger hasn&#39;t fired. Extended tier: regenerate any time, with a 4-hour cooldown.</td>
            </tr>
            <tr>
              <td><strong>Data Visualizations</strong></td>
              <td>Refreshes with Multi-Voice</td>
              <td>Refreshes whenever your Multi-Voice Coaching refreshes (every 10 new debriefs; Working: monthly fallback; Extended: manual regen with 4-hour cooldown).</td>
            </tr>
            <tr>
              <td><strong>Grand Prix Thinking</strong></td>
              <td>Monthly, rider-led</td>
              <td>A 30-day program with weekly progression. When the cycle ends, you choose when to generate the next one. It does not refresh automatically. Medium tier includes one mid-cycle refresh; Extended tier can refresh any time.</td>
            </tr>
            <tr>
              <td><strong>Physical Guidance</strong></td>
              <td>Monthly, rider-led</td>
              <td>A 30-day program with weekly progression. When the cycle ends, you choose when to generate the next one. It does not refresh automatically. Medium tier includes one mid-cycle refresh; Extended tier can refresh any time.</td>
            </tr>
            <tr>
              <td><strong>Event Planner</strong></td>
              <td>On demand</td>
              <td>Generated when you submit a Show Preparation form. <strong>One plan per event, one horse per plan.</strong></td>
            </tr>
          </tbody>
        </table>

        <div className="tips-tip-box">
          <h4>What if I have very little data yet?</h4>
          <p>The path is sequenced. First Light is what you read while you build the rest. Once you&#39;ve hit five debriefs and reflected in all six categories, your full coaching arc unlocks: Multi-Voice Coaching takes over, the Journey Map opens up, and Data Visualizations populate. Grand Prix Thinking and Physical Guidance have their own data thresholds&mdash;with fewer than five debriefs in your first 30 days, they deliver a truncated two-week program instead of the full cycle, and graduate to the full cycle as your data grows.</p>
        </div>

        <div className="tips-emphasis">
          <strong>Health hold:</strong> if you log a significant health event (yours or your horse&#39;s) that should pause training, Grand Prix Thinking and Physical Guidance enter a hold state&mdash;no new program generates until you&#39;re ready. The AI&#39;s job is to support you, not push you through.
        </div>
      </div>

      {/* Reading Your Outputs */}
      <div className="tips-section" id="reading">
        <h2>Reading Your Outputs</h2>
        <p className="tips-welcome-text">Every output is designed so you can get value in 30 seconds <em>or</em> 30 minutes. The structure is the same across outputs.</p>

        <h3>Quick Insights come first</h3>
        <p>Each output opens with the most important information up front&mdash;key numbers, top patterns, your current focus, and a celebration of what&#39;s going well. You&#39;ll always see this without needing to expand or click anything. (Example below shows the Journey Map at-a-glance shape.)</p>
        <div className="outputs-ux-demo">
          <div className="outputs-demo-label">What you&#39;ll see first &mdash; Journey Map example</div>
          <div className="outputs-mock-metrics">
            <div className="outputs-mock-metric"><div className="outputs-mock-num">7</div><div className="outputs-mock-label">Milestones</div></div>
            <div className="outputs-mock-metric"><div className="outputs-mock-num">4</div><div className="outputs-mock-label">Themes</div></div>
            <div className="outputs-mock-metric"><div className="outputs-mock-num">12</div><div className="outputs-mock-label">Key Events</div></div>
            <div className="outputs-mock-metric"><div className="outputs-mock-num">Ascending</div><div className="outputs-mock-label">Trajectory</div></div>
          </div>
          <div className="outputs-mock-priority"><strong>&#x1F3AF; Current Focus:</strong> Establishing rhythm without tension at the start of every ride&mdash;walk circles and stretching work before asking for collection.</div>
        </div>

        <h3>Expand only what you need</h3>
        <p>Below the summary, detail is organized in collapsible panels. Tap any header to expand. Each section stands on its own&mdash;you don&#39;t need to read everything to get value from the part that&#39;s relevant today.</p>

        <h3>Tabs let you compare perspectives</h3>
        <p>Where multiple perspectives exist on the same data&mdash;like the four coaching voices, or the two layers of Grand Prix Thinking&mdash;tabs let you switch between them without losing your place. Each tab contains a complete, self-contained analysis. You can change which voice opens first in <Link to="/settings">Settings</Link> under <em>Default Coaching Voice</em>, and you can switch to Focus Mode (one voice only) or Progressive (one section at a time) if the full report ever feels like too much.</p>

        <div className="tips-emphasis">
          <strong>The key principle:</strong> the AI generates the same depth of analysis it always has. The page lets you scan quickly, find what&#39;s relevant, and go deep when you&#39;re ready&mdash;without being overwhelmed all at once.
        </div>
      </div>

      {/* First Light */}
      <div className="tips-section" id="first-light">
        <h2>&#x2728; First Light</h2>
        <p className="tips-welcome-text">
          First Light is your first AI coaching output&mdash;the platform&#39;s welcome read of who you are as a rider. It&#39;s generated after you complete the six-prompt First Light wizard (one reflection from each category), and it&#39;s the bridge between your onboarding and your full coaching arc.
        </p>

        <h3>What you&#39;ll see</h3>
        <p>The four coaching voices each read your six reflections back to you through their own lens. You&#39;ll get an Empathetic Coach read on the emotional shape of where you are, a Classical Master read on your relationship to the work itself, a Technical Coach read on what you&#39;re noticing physically, and a Practical Strategist read on what comes next. Together they form your first coaching window.</p>

        <h3>The regen-once rule</h3>
        <p>First Light can be regenerated <strong>one time</strong> after you&#39;ve added new data&mdash;a debrief, a reflection, an observation, or a journey event. After that, the regen option is no longer available. This is deliberate: First Light is meant to be a snapshot of who you are at the start, not a rolling weekly read. That&#39;s what Multi-Voice Coaching becomes once you&#39;ve graduated.</p>

        <h3>How it retires</h3>
        <p>First Light retires automatically after your <strong>fifth debrief</strong>. At that point, Multi-Voice Coaching becomes your ongoing coaching output and the Journey Map opens up alongside it. First Light remains in your archive as a record of where you started.</p>

        <div className="tips-tip-box">
          <h4>While you&#39;re still in First Light territory</h4>
          <p>Don&#39;t worry about not having a Journey Map or Multi-Voice Coaching yet. First Light is doing the coaching job. As you log debriefs and reflections, you&#39;re building the dataset that the full coaching arc needs.</p>
        </div>
      </div>

      {/* Journey Map */}
      <div className="tips-section" id="journey-map">
        <h2>&#x1F5FA;&#xFE0F; Journey Map</h2>
        <p className="tips-welcome-text">
          A living visual and narrative timeline of your riding&mdash;where you&#39;ve been, where you are, and the direction of your growth. Think of it as your riding autobiography, written by an AI that has read every debrief, reflection, lesson note, observation, and event you&#39;ve ever logged.
        </p>

        <h3>At a Glance &mdash; always visible at the top</h3>
        <p>The map opens with four headline stats and your current focus:</p>
        <ul className="tips-bullets">
          <li><strong>Milestones</strong>&mdash;count of significant achievements the AI has identified across your journey.</li>
          <li><strong>Themes Identified</strong>&mdash;count of recurring themes across your data.</li>
          <li><strong>Key Events</strong>&mdash;count of significant moments on your timeline.</li>
          <li><strong>Trajectory</strong>&mdash;a one-word read of your overall direction (defined below).</li>
          <li><strong>Current Focus</strong>&mdash;the AI&#39;s read on what you&#39;re working on right now, in one short paragraph.</li>
        </ul>

        <h3>Trajectory &mdash; the six readings</h3>
        <p>The Trajectory label is the AI&#39;s synthesis of the direction your work is moving. It&#39;s drawn from a controlled vocabulary so the reading is always specific and never vague. It takes one of six values:</p>
        <ul className="tips-bullets">
          <li><strong>Ascending</strong>&mdash;consistent forward movement. Scores and felt sense are trending upward across multiple dimensions.</li>
          <li><strong>Productive Stability</strong>&mdash;your gains are holding, but you&#39;re not yet deepening. Consistency before the next step. This is a healthy phase and the AI flags it so you don&#39;t mistake it for being stuck.</li>
          <li><strong>Stretching</strong>&mdash;you&#39;re working at the edge of your capability. High effort, some inconsistency. This is where growth happens, but it doesn&#39;t always feel good in the moment.</li>
          <li><strong>Plateauing</strong>&mdash;flat data. The same challenges keep recurring without resolution. The AI&#39;s recommendations will lean toward shifting your approach.</li>
          <li><strong>Struggling</strong>&mdash;declining confidence or feel, or the same obstacle repeating across three or more sessions without resolution. The AI will surface what&#39;s underneath and what to try.</li>
          <li><strong>Recalibrating</strong>&mdash;a meaningful context shift is in play (new horse, new trainer, new level, return from injury, extended break). The AI gives you grace and a recalibration framing rather than judging progress against a baseline that no longer applies.</li>
        </ul>

        <h3>The collapsible sections</h3>
        <p>Below the at-a-glance summary, the Journey Map expands into:</p>
        <ul className="tips-bullets">
          <li><strong>Key Milestones</strong>&mdash;a dated timeline of significant events. Some you&#39;ll recognize; others you might have missed at the time. (Open by default.)</li>
          <li><strong>Progress Snapshot</strong>&mdash;your Overall Trajectory plus two structured scores: Consistency and Self-Awareness, each on a 0&ndash;10 scale. (Open by default.)</li>
          <li><strong>Your Story</strong>&mdash;the longest section. A narrative read of your journey, written in coaching-voice language with embedded quotes from your reflections. (Closed by default&mdash;open it when you have time to sit with it.)</li>
          <li><strong>Emerging Themes</strong>&mdash;recurring patterns the AI has identified, each with the evidence behind it and a read of its significance. (Closed by default.)</li>
          <li><strong>Goal Progress</strong>&mdash;your stated goals with progress percentages, evidence, and suggested next steps. (Closed by default.)</li>
        </ul>

        <div className="tips-tip-box">
          <h4>Getting the richest Journey Map</h4>
          <p>The map draws from <em>everything</em>&mdash;debriefs, reflections, lesson notes, events, observations. The more consistently you record, the more detailed it becomes. Five rides show you what happened. Twenty rides reveal why it keeps happening. Fifty rides show you the conditions that create your best work.</p>
        </div>
      </div>

      {/* Multi-Voice Coaching */}
      <div className="tips-section" id="multi-voice">
        <h2>&#x1F399;&#xFE0F; Multi-Voice Coaching</h2>
        <p className="tips-welcome-text">
          The same data, analyzed through four completely different coaching lenses. Each voice offers insights the others might miss&mdash;like a small team of coaches around the table, each bringing their expertise to bear on your riding.
        </p>
        <h3>How often it refreshes</h3>
        <p>Multi-Voice Coaching auto-refreshes after every 10 new debriefs. Working tier also has a monthly fallback if you haven&#39;t hit the 10-debrief trigger. Extended tier can regenerate manually with a 4-hour cooldown. The Weekly Focus on your Dashboard surfaces the headlines of your current report; the full report opens when you tap in.</p>

        <h3>Quick Insights first, voices when you&#39;re ready</h3>
        <p>The report opens with a Quick Insights summary that&#39;s always visible:</p>
        <ul className="tips-bullets">
          <li><strong>Top patterns</strong>&mdash;the most significant patterns from your recent rides, each in one sentence with data to back it up.</li>
          <li><strong>Your current priority</strong>&mdash;one clear, achievable focus for now.</li>
          <li><strong>A celebration</strong>&mdash;one genuine breakthrough or success, connected to your broader progress.</li>
        </ul>
        <p>Below Quick Insights, the four voices are presented in tabs. Tap any voice to read their full analysis. The Technical Coach might focus on a position pattern while the Empathetic Coach notices an emotional shift; the Classical Master might remind you that difficulty is a sign of deepening understanding, while the Practical Strategist maps out what comes next.</p>
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
          <h4>Voice snippets everywhere</h4>
          <p>Beyond the full Multi-Voice report, you&#39;ll notice brief coaching voice annotations throughout your other outputs&mdash;a Technical Coach note in your Physical Guidance, a Classical Master reflection in your Journey Map. They&#39;re marked with each voice&#39;s icon and color so you always know who&#39;s speaking. You can toggle these off entirely in <Link to="/settings">Settings</Link> under <em>In-Line Voice Fragments</em> if you&#39;d rather keep outputs un-annotated.</p>
        </div>
      </div>

      {/* Data Visualizations */}
      <div className="tips-section" id="data-viz">
        <h2>&#x1F4CA; Data Visualizations</h2>
        <p className="tips-welcome-text">
          Making the invisible visible. Your subjective riding experience&mdash;quality, confidence, effort, mental state&mdash;transformed into charts that reveal patterns over time. Each chart includes a title, a brief subtitle, and a highlighted key insight so you can scan quickly.
        </p>

        <h3>Quality &mdash; how good was each ride, and why?</h3>
        <div className="outputs-viz-grid">
          <div className="outputs-viz-item"><strong>&#x1F4CA; Quality vs. Confidence</strong><span>Each ride plotted against your reported confidence. The dashed diagonal marks perfect calibration; dots below the line mean you&#39;re underestimating yourself.</span></div>
          <div className="outputs-viz-item"><strong>&#x1F4AA; Quality vs. Rider Effort</strong><span>A green band marks your optimal effort zone. Beyond effort-8, quality trends down&mdash;a counterintuitive insight for many riders.</span></div>
          <div className="outputs-viz-item"><strong>&#x1F3DF;&#xFE0F; Quality by Session Type</strong><span>Lessons vs. schooling vs. hacks, grouped by horse. Where you ride your best work surfaces here.</span></div>
          <div className="outputs-viz-item"><strong>&#x1F4C8; Quality by Ride Arc</strong><span>How your rides shape across their arc&mdash;built, peaked, faded, consistent, variable&mdash;and which arc produces your best quality.</span></div>
          <div className="outputs-viz-item"><strong>&#x1F9E0; Quality by Mental State</strong><span>Your ride quality cross-referenced with the mental state you reported going in. The mindset conditions that produce your best riding are usually a surprise.</span></div>
        </div>

        <h3>Outcomes &mdash; themes and goal adherence</h3>
        <div className="outputs-viz-grid">
          <div className="outputs-viz-item"><strong>&#x1F525; Theme Frequency Map</strong><span>Top training themes from your coaching analysis, color-coded by category&mdash;what&#39;s really on your mind across the weeks.</span></div>
          <div className="outputs-viz-item"><strong>&#x1F3AF; Process Goal Adherence</strong><span>How consistently you follow through on the process goals you set on your Practice Card each week.</span></div>
        </div>

        <p>The AI provides a narrative interpretation alongside each chart&mdash;not just the numbers, but what the patterns mean and what they suggest about how you ride.</p>

        <div className="tips-tip-box">
          <h4>The quality + mental state connection</h4>
          <p>One of the most revealing visualizations cross-references your ride quality ratings with your reported mental state. Over time, this shows you exactly which mindset conditions produce your best riding&mdash;information that feeds directly into your Grand Prix Thinking practices.</p>
        </div>
      </div>

      {/* Grand Prix Thinking */}
      <div className="tips-section" id="grand-prix">
        <h2>&#x1F9E0; Grand Prix Thinking</h2>
        <p className="tips-welcome-text">
          Mental skills development for dressage riders, built from sport psychology principles and personalized to your specific patterns, horses, and challenges. &ldquo;Grand Prix&rdquo; isn&#39;t about your competition level&mdash;it&#39;s about developing the mental approach the best riders in the world use, adapted to where <em>you</em> are right now.
        </p>

        <h3>A 30-day program, not a weekly report</h3>
        <p>Grand Prix Thinking operates as a full 30-day program. A single generation produces your entire cycle&mdash;four weeks of content, sequenced so each week builds on the last. Your dashboard advances week-by-week as you work through the cycle.</p>

        <h3>Two views, one dashboard</h3>
        <p>Grand Prix Thinking gives you two complementary views, accessible via tabs. You can move between &ldquo;what do I practice today&rdquo; and &ldquo;where is all this taking me&rdquo; without losing your place.</p>
        <div className="outputs-layer-compare">
          <div className="outputs-layer-box outputs-layer-1">
            <h4>Mental Performance</h4>
            <p>&ldquo;What do I practice today?&rdquo;</p>
            <p className="outputs-layer-sub">A single path is selected for your cycle from three options based on what your data shows you need:</p>
            <ul>
              <li><strong>Pre-Ride</strong>&mdash;preparation, visualization, focus</li>
              <li><strong>In-Saddle</strong>&mdash;real-time mental strategies</li>
              <li><strong>Resilience</strong>&mdash;bouncing back from setbacks</li>
            </ul>
            <p className="outputs-layer-note">Each path includes the pattern the AI sees in your data, the mental shift it recommends, this week&#39;s specific practice, and a success metric so you know if it&#39;s working.</p>
          </div>
          <div className="outputs-layer-box outputs-layer-2">
            <h4>Training Trajectory</h4>
            <p>&ldquo;Where is all this taking me?&rdquo;</p>
            <p className="outputs-layer-sub">Three long-view paths are generated together so you can compare and choose what fits where you are:</p>
            <ul>
              <li><strong>Ambitious Competitor</strong>&mdash;push toward your next level with appropriate timelines</li>
              <li><strong>Steady Builder</strong>&mdash;deepen current level, no rush</li>
              <li><strong>Curious Explorer</strong>&mdash;broaden skills laterally rather than vertically</li>
            </ul>
            <p className="outputs-layer-note">Each trajectory includes your current position, 3&ndash;6 month milestones, the building blocks that connect today&#39;s work to that horizon, and a realistic timeline projection that respects the level-progression guardrails.</p>
          </div>
        </div>
        <p>Everything in Grand Prix Thinking is personalized. Your affirmations use your own language&mdash;pulled from your reflections and Rider Self-Assessment. Your self-talk scripts address your actual negative patterns. Horse-specific strategies exist for every horse in your profile. Each path includes a coaching voice annotation from the voice most natural to that focus.</p>
        <div className="tips-tip-box">
          <h4>Unlocking deeper personalization</h4>
          <p>Grand Prix Thinking gets significantly more specific as your data grows. With 5+ debriefs, it starts identifying your mental state patterns. With a completed Rider Self-Assessment, it has your self-awareness levels, regulation strategies, and performance history. With Technical &amp; Philosophical Assessment data, it understands where you sit on the training scale. The richest personalization comes when debriefs, reflections, all three self-assessments, and event data work together.</p>
        </div>
      </div>

      {/* Physical Guidance */}
      <div className="tips-section" id="physical">
        <h2>&#x1F3CB;&#xFE0F; Physical Guidance</h2>
        <p className="tips-welcome-text">
          Dressage is an athletic pursuit, and your body is your primary tool. Physical Guidance addresses the rider&#39;s body with off-horse exercises, stretches, and body awareness practices&mdash;all tailored to what your Physical Self-Assessment and debrief data reveal about your specific challenges.
        </p>

        <h3>A 30-day program, aligned with Grand Prix Thinking</h3>
        <p>Like Grand Prix Thinking, Physical Guidance runs on a 30-day cycle. A single generation produces a four-week program; the dashboard advances week-by-week as you work through it. When the cycle ends, you choose when to generate the next one; it does not refresh on its own. Physical Guidance also receives your active Grand Prix Thinking trajectory as context, so the off-horse work and the mental work reinforce each other.</p>

        <h3>What you&#39;ll see</h3>
        <ul className="tips-bullets">
          <li><strong>Position Pattern Analysis:</strong> Cross-references your physical self-assessment with what you describe in your debriefs to identify recurring position themes.</li>
          <li><strong>Off-Horse Exercises:</strong> Targeted exercises addressing your documented asymmetries and tension patterns. Each exercise includes a Technical Coach annotation explaining the biomechanical link to your in-saddle work.</li>
          <li><strong>Classical Framing:</strong> A brief Classical Master annotation connecting your physical preparation to classical principles.</li>
          <li><strong>Pre-Ride Preparation:</strong> Warm-up routines calibrated to your kinesthetic awareness level. The Barn Aisle Prep block in your Pre-Ride Ritual pulls from this.</li>
          <li><strong>Body Awareness Prompts:</strong> In-ride mindfulness cues targeting your specific tension areas.</li>
        </ul>

        <div className="tips-tip-box">
          <h4>The kinesthetic awareness slider</h4>
          <p>Your Physical Self-Assessment includes a 1&ndash;10 kinesthetic awareness rating. This calibrates <em>all</em> physical cues across the platform&mdash;not just Physical Guidance but Grand Prix Thinking and coaching voice annotations too. As your awareness grows and you update the rating, the cues you receive become more refined.</p>
        </div>

        <div className="tips-emphasis">
          <em>Standard disclaimer: these are general fitness suggestions for riders, not medical advice. If you have injuries or conditions, consult your healthcare provider.</em>
        </div>
      </div>

      {/* Event Planner */}
      <div className="tips-section" id="event-planner">
        <h2>&#x1F3AF; Event Planner</h2>
        <p className="tips-welcome-text">
          When you submit a Show Preparation form for an upcoming show, the Event Planner generates a comprehensive, personalized preparation plan&mdash;readiness analysis against the specific dressage tests you&#39;re riding, plus a week-by-week training plan from now until the event.
        </p>

        <div className="tips-emphasis">
          <strong>One plan per event, one horse per plan.</strong> If you&#39;re riding two horses at the same show, that&#39;s two Show Preparation submissions and two Event Plans. Each horse gets their own readiness analysis and their own prep timeline, because each partnership has a different starting point and a different path to the test.
        </div>

        <h3>What the plan contains</h3>
        <ul className="tips-bullets">
          <li><strong>Test Requirements Assembly:</strong> Pulls complete requirements from the verified dressage test database&mdash;movements, geometry, coefficients, and common errors for the specific test(s) you&#39;re riding.</li>
          <li><strong>Readiness Analysis:</strong> Your recent debriefs, profiles, and self-assessments evaluated against test requirements. Where are you strong? Where are the gaps? Where are the risks?</li>
          <li><strong>Preparation Plan:</strong> A week-by-week training plan from now until the event. Each week includes a coaching voice tip from the voice most relevant to that week&#39;s focus.</li>
        </ul>

        <div className="tips-tip-box">
          <h4>The preparation + follow-up loop</h4>
          <p>The Event Planner generates structured post-event debrief questions that feed back into the system. When you prepare for an event AND log what actually happened afterward, the AI can analyze the gap between intention and outcome&mdash;one of the most revealing patterns in rider development.</p>
        </div>
      </div>

      {/* Visualization Scripts */}
      <div className="tips-section" id="viz-scripts">
        <h2>&#x1F4FD;&#xFE0F; Visualization Scripts</h2>
        <p className="tips-welcome-text">
          A personalized mental-rehearsal script for a specific movement, problem focus, and context (training ride, show warm-up, or competition test). Visualization is one of the most evidence-backed mental-skills practices in sport, and it&#39;s often the missing piece for adult amateur riders. Visualization Scripts give you a structured, multi-block rehearsal you can run in the minutes before mounting or the night before a show.
        </p>

        <h3>How they&#39;re built</h3>
        <p>The script generator takes your specific inputs (movement, problem focus, reference type, context, sensory preference, length) and produces a multi-block mental rehearsal. Each block has a phase (setup, rehearse, reflect), a recommended duration, and content that walks you through the movement in your head&mdash;timed, with a built-in timer for each phase.</p>

        <h3>Where they live</h3>
        <p>Every script you generate is saved to your Rider&#39;s Toolkit. Filter the Toolkit by &ldquo;Visualization Scripts&rdquo; to see only your scripts. Tap any script to open and run it again. The Visualization block in your Pre-Ride Ritual links to your most recent script. The Visualization card in your Weekly Focus suggests a script the AI thinks you&#39;d benefit from this week, with your movement, problem, and context pre-filled.</p>

        <div className="tips-tip-box">
          <h4>The Weekly Focus integration</h4>
          <p>When the AI sees a movement showing up repeatedly in your debriefs&mdash;something you&#39;re working on but not quite landing&mdash;it pre-fills a visualization recommendation on your Weekly Focus. One tap and the script form opens with the right movement, problem, context, and length already chosen. Generate, save, run before your next ride.</p>
        </div>
      </div>

      {/* Meet Your Coaching Team */}
      <div className="tips-section" id="voices">
        <h2>Meet Your Coaching Team</h2>
        <p className="tips-welcome-text">
          Four coaching voices appear throughout the platform&mdash;each with a distinct personality, perspective, and communication style. They&#39;re most prominent in the Multi-Voice Coaching report, but you&#39;ll see their brief annotations across nearly every output, marked with their icon and signature color.
        </p>
        <div className="outputs-voice-card outputs-voice-technical outputs-voice-card--full">
          <div className="outputs-voice-icon">&#x1F52C;</div>
          <div className="outputs-voice-name">The Technical Coach</div>
          <div className="outputs-voice-desc">Focuses on biomechanics, position, aids, and cause-and-effect. Sees your riding as a puzzle of interconnected physical systems. If the Empathetic Coach asks &ldquo;how did that make you feel?&rdquo; the Technical Coach asks &ldquo;what was your hip angle doing when that happened?&rdquo; Clear, specific, constructive&mdash;never vague. Catchphrase: <em>&ldquo;Did you feel that?&rdquo;</em> <strong>Appears in:</strong> Physical Guidance annotations, Grand Prix Thinking practice notes, Event Planner skill-building weeks.</div>
        </div>
        <div className="outputs-voice-card outputs-voice-empathetic outputs-voice-card--full">
          <div className="outputs-voice-icon">&#x2B50;</div>
          <div className="outputs-voice-name">The Empathetic Coach</div>
          <div className="outputs-voice-desc">Focuses on rider psychology, confidence, fear, and the rider-horse relationship. Sees the whole person, not just the rider. Catches emotional patterns&mdash;the anxiety that shows up at certain movements, the joy that correlates with breakthrough rides. Warm, validating, insightful. Catchphrase: <em>&ldquo;You&#39;ve got this.&rdquo;</em> <strong>Appears in:</strong> Quick Capture responses, Fresh Start welcome-backs, Grand Prix Thinking Resilience path, Event Planner confidence weeks.</div>
        </div>
        <div className="outputs-voice-card outputs-voice-classical outputs-voice-card--full">
          <div className="outputs-voice-icon">&#x1F3AF;</div>
          <div className="outputs-voice-name">The Classical Master</div>
          <div className="outputs-voice-desc">Focuses on principles, philosophy, and the long view. Evaluates your work through classical dressage principles and the training scale. Reminds you that a struggle might actually be a sign you&#39;re asking harder questions. Wise, patient, sometimes poetic. Catchphrase: <em>&ldquo;Why not the first time?&rdquo;</em> <strong>Appears in:</strong> Journey Map narrative reflections, Physical Guidance philosophical framing, Grand Prix Thinking Steady Builder trajectory, Event Planner final-week grounding.</div>
        </div>
        <div className="outputs-voice-card outputs-voice-strategist outputs-voice-card--full">
          <div className="outputs-voice-icon">&#x1F4CB;</div>
          <div className="outputs-voice-name">The Practical Strategist</div>
          <div className="outputs-voice-desc">Focuses on goals, timelines, and actionable plans. Takes all the data and turns it into &ldquo;here&#39;s what to do next week.&rdquo; Manages your training plan, competition prep, and time constraints with direct, organized efficiency. Catchphrase: <em>&ldquo;Be accurate!&rdquo;</em> <strong>Appears in:</strong> Grand Prix Thinking Ambitious Competitor trajectory, Event Planner logistics, Data Visualization action takeaways.</div>
        </div>
        <div className="tips-tip-box">
          <h4>Different riders, different resonance</h4>
          <p>You&#39;ll probably find that one or two voices resonate more than the others&mdash;and that&#39;s by design. But pay attention to the voices that challenge you, too. The one that makes you slightly uncomfortable might be offering the insight you need most. You can set a default voice in <Link to="/settings">Settings</Link>.</p>
        </div>
        <p><Link to="/learn/your-coaches">Read more about each voice &rarr;</Link></p>
      </div>

      {/* Tiers */}
      <div className="tips-section" id="tiers">
        <h2>Your Subscription &amp; What You Get</h2>
        <p className="tips-welcome-text">
          Outputs and features unlock based on your plan. See the <Link to="/pricing">pricing page</Link> for the full breakdown.
        </p>

        <div className="outputs-tier-grid">
          <div className="outputs-tier-card">
            <div className="outputs-tier-name">Working</div>
            <div className="outputs-tier-price">$30/mo &middot; $300/yr</div>
            <ul>
              <li>All data entry forms</li>
              <li>Multi-Voice Coaching (all 4 voices)</li>
              <li>Journey Map (12-month history)</li>
              <li>Weekly Focus &amp; Weekly Coach Brief</li>
              <li>Learn section &amp; Rider&#39;s Toolkit</li>
            </ul>
          </div>
          <div className="outputs-tier-card outputs-tier-card--popular">
            <div className="outputs-tier-name">Medium <span className="outputs-tier-badge">Most popular</span></div>
            <div className="outputs-tier-price">$50/mo &middot; $500/yr</div>
            <ul>
              <li>Everything in Working, plus:</li>
              <li>Grand Prix Thinking (30-day cycle)</li>
              <li>Physical Guidance (30-day cycle)</li>
              <li>Show Planner (10 shows/year)</li>
              <li>Journey Map (full history)</li>
              <li>Visualization Scripts, Practice Card, Readiness Snapshot</li>
            </ul>
          </div>
          <div className="outputs-tier-card">
            <div className="outputs-tier-name">Extended</div>
            <div className="outputs-tier-price">$130/mo &middot; $1,300/yr</div>
            <ul>
              <li>Everything in Medium, plus:</li>
              <li>Unrestricted Grand Prix Thinking &amp; Physical Guidance regeneration</li>
              <li>Unlimited Show Planner</li>
              <li>Priority processing</li>
            </ul>
          </div>
        </div>

        <div className="tips-tip-box">
          <h4>When does an output actually refresh?</h4>
          <p>Outputs are not freely refreshable on demand. Each has its own trigger&mdash;see the <a href="#when">When Outputs Appear</a> table for the exact rules. Briefly:</p>
          <ul className="tips-bullets">
            <li><strong>Multi-Voice Coaching</strong> refreshes after every 10 new debriefs. Working tier has a monthly fallback; Extended adds manual regen with a 4-hour cooldown.</li>
            <li><strong>Journey Map</strong> refreshes after 10 combined debriefs and reflections, or after a journey event plus 5 entries. Working tier: max once per month. Extended: no frequency cap.</li>
            <li><strong>Data Visualizations</strong> refresh alongside Multi-Voice Coaching.</li>
            <li><strong>Grand Prix Thinking</strong> and <strong>Physical Guidance</strong> are rider-led 30-day cycles. When a cycle ends, you start the next one yourself. Medium gets one mid-cycle refresh; Extended is unrestricted.</li>
            <li><strong>Event Planner</strong> generates per Show Preparation submission.</li>
            <li><strong>First Light</strong> regenerates exactly once on any tier.</li>
          </ul>
        </div>
      </div>

      {/* Getting the Most */}
      <div className="tips-section" id="maximize">
        <h2>Getting the Most from Your Outputs</h2>

        <h3>Start with Quick Insights</h3>
        <p>Every output leads with the most important takeaways. On a busy day, Quick Insights alone&mdash;your top patterns, this week&#39;s priority, and your celebration&mdash;gives you real value in under a minute. Expand the detailed sections when you have time.</p>

        <h3>Tell your coaches what to focus on</h3>
        <p>The single most underused power feature: the &ldquo;Anything you want your coaches to focus on this week?&rdquo; field in the Reflection form. Use it, and your coaching is dramatically more relevant to what you actually want help with.</p>

        <h3>Consistency beats intensity</h3>
        <p>Ten brief debriefs over two weeks reveal more patterns than one detailed essay. The AI finds signal in frequency and repetition. Quick Capture counts&mdash;a week of five Quick Captures plus two full debriefs gives the AI much more to work with than three perfect debriefs and four blank days.</p>

        <h3>Vary your reflection categories over time</h3>
        <p>Each category feeds different aspects of analysis. Personal Milestones drive your Journey Map. Obstacles fuel Grand Prix Thinking&#39;s Resilience path. Feel/Body Awareness powers Physical Guidance calibration. If you only ever reflect on breakthroughs, the AI has blind spots. Aim for variety.</p>

        <h3>Keep profiles and self-assessments current</h3>
        <p>Your profiles and three self-assessments are the foundation that every output builds on. When goals shift, your horse advances, or your physical situation changes&mdash;update the relevant profile.</p>

        <h3>Use the Show Planner loop</h3>
        <p>Submit Show Preparation before, then log the event and complete a debrief afterward. The before/after pairing is one of the richest sources of insight in the system.</p>

        <h3>Read what challenges you</h3>
        <p>If a coaching voice says something that feels uncomfortable or surprising, sit with it before dismissing it. The AI can see patterns across your entire dataset that are hard to hold in your head simultaneously. Sometimes the most valuable insight is the one that doesn&#39;t match your self-narrative.</p>

        <div className="tips-tip-box">
          <h4>The data threshold effect</h4>
          <p>Your first outputs (starting with First Light) will be helpful but general. After 10+ debriefs, the patterns sharpen. After 20+, the AI makes connections that surprise you. After 50, it knows your riding tendencies better than you do. Be patient with the early outputs&mdash;the system gets dramatically better as it learns you.</p>
        </div>
      </div>

      {/* FAQ */}
      <div className="tips-section" id="faq">
        <h2>Frequently Asked Questions</h2>

        <details className="tips-faq">
          <summary>How often are my outputs updated?</summary>
          <p>Each output has its own trigger&mdash;they don&#39;t refresh on a calendar. First Light is one-time (regenerable once). Multi-Voice Coaching refreshes after every 10 new debriefs (Working tier: monthly fallback; Extended: manual regen with 4-hour cooldown). Journey Map refreshes after 10 combined debriefs and reflections, or after a journey event plus 5 entries (Working: max once/month; Extended: no cap). Data Visualizations refresh with Multi-Voice. Grand Prix Thinking and Physical Guidance run on rider-led 30-day cycles; when a cycle ends, you choose when to start the next one (they do not refresh automatically). Event Planner generates per Show Preparation submission. See the <a href="#when">When Outputs Appear</a> table for the full rules.</p>
        </details>

        <details className="tips-faq">
          <summary>What&#39;s the minimum data I need before outputs are useful?</summary>
          <p>You&#39;ll get First Light after completing your Rider Profile, a Horse Profile, and the six First Light reflections. Your full coaching arc (Multi-Voice Coaching, Journey Map) unlocks once you&#39;ve hit five debriefs and reflected in all six categories. Grand Prix Thinking and Physical Guidance deliver a truncated two-week program with fewer than five debriefs in your first 30 days, then graduate to the full cycle.</p>
        </details>

        <details className="tips-faq">
          <summary>Can I regenerate First Light?</summary>
          <p>Yes&mdash;once. After you&#39;ve added new data (a debrief, reflection, observation, or event), a regenerate option appears on First Light. After that one regeneration, the option is no longer available. First Light retires automatically after your fifth debrief, when Multi-Voice Coaching takes over.</p>
        </details>

        <details className="tips-faq">
          <summary>Do I need to read every section of every output?</summary>
          <p>No. Quick Insights at the top gives you the most important takeaways. Below that, sections are collapsible&mdash;expand what&#39;s relevant. You can also switch to Progressive or Focus Mode in <Link to="/settings">Settings</Link> if the full report ever feels like too much.</p>
        </details>

        <details className="tips-faq">
          <summary>Will the AI give me generic advice?</summary>
          <p>No. Every output is built from your actual data&mdash;your horse names, your self-talk patterns, your documented challenges, your specific goals. If a recommendation could apply to any random rider, it hasn&#39;t done its job. If you ever get something that feels generic, that&#39;s valuable feedback for us.</p>
        </details>

        <details className="tips-faq">
          <summary>What if I ride multiple horses?</summary>
          <p>Create a Horse Profile for each horse you ride regularly. The AI tracks patterns for each partnership separately. Your Journey Map includes a dedicated progress section for each horse, and Grand Prix Thinking includes horse-specific mental preparation for every horse in your profile.</p>
        </details>

        <details className="tips-faq">
          <summary>How do the tabs work in Multi-Voice Coaching?</summary>
          <p>Quick Insights stays visible at the top. Below that, the four voices appear as tabs&mdash;tap any voice to read their full analysis. Each voice provides a complete, independent perspective, so you can read one or all four. You can set which voice opens first in <Link to="/settings">Settings</Link>.</p>
        </details>

        <details className="tips-faq">
          <summary>What&#39;s the difference between Mental Performance and Training Trajectory in Grand Prix Thinking?</summary>
          <p><strong>Mental Performance</strong> is your daily toolkit&mdash;a single path selected for your current 30-day cycle (Pre-Ride, In-Saddle, or Resilience) with concrete exercises and success metrics. It answers &ldquo;what do I practice today?&rdquo; <strong>Training Trajectory</strong> maps three long-view paths (Ambitious Competitor, Steady Builder, Curious Explorer) with milestones, building blocks, and realistic timeline projections. It answers &ldquo;where is all this taking me?&rdquo; Both live on the same dashboard with tabs to switch between them.</p>
        </details>

        <details className="tips-faq">
          <summary>What are the coaching voice annotations in outputs other than Multi-Voice Coaching?</summary>
          <p>Brief, embedded snippets (1&ndash;2 sentences) from the voice most relevant to that section. They&#39;re marked with the voice&#39;s icon and color. Turn them off entirely with the <em>In-Line Voice Fragments</em> toggle in Settings.</p>
        </details>

        <details className="tips-faq">
          <summary>Are the physical exercises safe for everyone?</summary>
          <p>Physical Guidance provides general fitness suggestions for riders&mdash;conservative and gentle. They are not medical advice. If you have injuries, chronic conditions, or physical limitations, consult your healthcare provider before starting any exercise program.</p>
        </details>

        <details className="tips-faq">
          <summary>How does the Event Planner know about my dressage test?</summary>
          <p>Your Dressage Journey includes a comprehensive, verified dressage test database covering USDF tests (Introductory through Fourth Level) and FEI tests (Prix St. Georges through Grand Prix Special), plus freestyle. When you specify which test you&#39;re preparing for, the planner pulls the complete requirements&mdash;movements, geometry, coefficients, and common errors&mdash;and evaluates your readiness against them.</p>
        </details>

        <details className="tips-faq">
          <summary>Can I manually refresh an output?</summary>
          <p>Not freely. Each output has refresh rules tied to your activity and your tier. <strong>First Light:</strong> regenerate once. <strong>Multi-Voice Coaching:</strong> auto-refresh every 10 new debriefs; Working tier gets a monthly fallback, Extended adds manual regen with a 4-hour cooldown. <strong>Journey Map:</strong> auto-refresh on activity (10 combined entries or a journey event + 5 entries); Working max once/month, Extended no cap. <strong>Data Visualizations:</strong> refresh whenever Multi-Voice refreshes. <strong>Grand Prix Thinking</strong> and <strong>Physical Guidance:</strong> rider-led 30-day cycles. When a cycle ends, you start the next one yourself; Medium gets one mid-cycle refresh; Extended unrestricted. <strong>Event Planner:</strong> one plan per Show Preparation submission.</p>
        </details>

        <details className="tips-faq">
          <summary>What&#39;s a Visualization Script and how do I generate one?</summary>
          <p>A personalized mental-rehearsal script for a specific movement and context. Generate one from the <Link to="/toolkit/visualization/new">Build Visualization Script</Link> button at the top of your Rider&#39;s Toolkit, or from the Visualization card in your Weekly Focus (where the AI pre-fills the movement, problem, and context based on your patterns). Choose a movement, problem focus, reference type, context (training ride / show warm-up / competition test), sensory preference, and length. The form generates a multi-block script with timed phases.</p>
        </details>

        <details className="tips-faq">
          <summary>Where do I find a Visualization Script I already created?</summary>
          <p>Every script you generate is saved to your <Link to="/toolkit">Rider&#39;s Toolkit</Link>. Filter by &ldquo;Visualization Scripts&rdquo; to see only your scripts. Tap any to open and run it again, or save it to a specific session. The Visualization block in your Pre-Ride Ritual also links to your most recently used script.</p>
        </details>

        <details className="tips-faq">
          <summary>What does the &ldquo;Trajectory&rdquo; reading on my Journey Map mean?</summary>
          <p>Trajectory is the AI&#39;s synthesis of the direction your work is moving overall. It&#39;s drawn from a controlled vocabulary of six values: <strong>Ascending</strong> (consistent forward movement), <strong>Productive Stability</strong> (gains holding, consistency before the next step), <strong>Stretching</strong> (working at the edge of capability, high effort with some inconsistency), <strong>Plateauing</strong> (flat data, recurring challenges without resolution), <strong>Struggling</strong> (declining confidence or the same obstacle repeating 3+ sessions), and <strong>Recalibrating</strong> (a meaningful context shift like a new horse, trainer, level, or return from injury). The detail in the Journey Map&#39;s collapsible sections tells you which dimensions of your work are driving that reading.</p>
        </details>

        <details className="tips-faq">
          <summary>What if a coaching voice says something I disagree with?</summary>
          <p>Sit with it before dismissing it. The AI sees patterns across your entire dataset that are hard to hold in your head all at once. That said, the voices aren&#39;t infallible&mdash;they&#39;re informed perspectives, not verdicts. Your instructor and your own felt sense always take precedence. If a voice repeatedly misses the mark, that&#39;s valuable feedback we&#39;d like to hear.</p>
        </details>

        <details className="tips-faq">
          <summary>Is my Rider Health data shared in my outputs?</summary>
          <p>Rider Health entries inform the AI&#39;s coaching context, but they are stripped from any shared-audience output (the Weekly Coach Brief and the Journey Map) before assembly. Numeric body data (weight, BF%, BMR) is never echoed back to you, and professionals are never referenced by first name.</p>
        </details>

        <details className="tips-faq">
          <summary>What happens to my data?</summary>
          <p>Your data is yours. It&#39;s stored securely and used exclusively to generate your personalized outputs. It&#39;s never shared with other riders, and your coaching is private to you. You can export your data at any time from any list page in the Review group on the Dashboard.</p>
        </details>
      </div>

      {/* Contact */}
      <div className="tips-contact-box" id="contact">
        <h3>Questions? Problems? Ideas?</h3>
        <p className="tips-contact-lead">We&#39;d love to hear from you:</p>
        <p><a href="mailto:barb@yourdressagejourney.com">barb@yourdressagejourney.com</a></p>
        <p className="tips-contact-footnote">Your feedback shapes this platform. No question is too small, no idea is too weird.</p>
      </div>

      <div className="tips-footer-quote">
        <p className="tips-quote">&ldquo;Journaling without analysis is just expensive record-keeping.<br />Your data deserves to work as hard as you do.&rdquo;</p>
        <p className="tips-footer-tagline">Illuminate Your Journey</p>
      </div>
    </div>
  );
}
