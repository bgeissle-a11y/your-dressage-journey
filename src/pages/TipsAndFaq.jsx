import { Link } from 'react-router-dom';
import './TipsAndFaq.css';
import './OutputsTipsAndFaq.css';

export default function TipsAndFaq() {
  return (
    <div className="tips-faq-page">
      <header className="tips-header">
        <div className="tips-logo">&#x1F40E;</div>
        <h1>Tips & FAQ</h1>
        <p className="tips-subtitle">Everything you need to get the most from Your Dressage Journey</p>
        <span className="tips-tagline-badge">ILLUMINATE YOUR JOURNEY</span>
      </header>

      {/* Table of Contents */}
      <div className="tips-section">
        <h2>On This Page</h2>
        <nav className="tips-toc">
          <a href="#your-forms">Your Forms at a Glance</a>
          <a href="#getting-started">Getting Started</a>
          <a href="#daily-workflow">Your Daily & Weekly Workflow</a>
          <a href="#reflections">The Six Reflection Categories</a>
          <a href="#profiles">Setting Up Your Profiles</a>
          <a href="#events">Events: Logging & Preparation</a>
          <a href="#health-soundness">Horse Health & Soundness Tracker</a>
          <a href="#observations">Observation Form</a>
          <a href="#assessments">Self-Assessments</a>
          <a href="#best-tips">Getting the Most Value</a>
          <a href="#contact">Questions? Problems? Ideas?</a>
        </nav>
        <div className="outputs-cross-link">
          Looking for help with your <strong>AI coaching outputs</strong>? <Link to="/outputs-tips-and-faq">Outputs Tips &amp; FAQ &rarr;</Link>
        </div>
      </div>

      {/* Your Forms at a Glance */}
      <div className="tips-section" id="your-forms">
        <h2>Your Forms at a Glance</h2>
        <p className="tips-welcome-text">
          Your Dressage Journey gives you a complete toolkit for capturing, reflecting on, and understanding your riding. Each form serves a specific purpose—and together, they give the AI the richest possible picture of your journey.
        </p>

        <div className="tips-form-cards">
          <Link to="/profile/rider" className="tips-form-card">
            <div className="tips-card-icon">&#x1F3C7;</div>
            <div className="tips-card-title">Rider Profile</div>
            <div className="tips-card-desc">Your riding background, goals, training focus, and personal context.</div>
            <span className="tips-card-freq">One-time setup</span>
          </Link>
          <Link to="/horses" className="tips-form-card">
            <div className="tips-card-icon">&#x1F40E;</div>
            <div className="tips-card-title">Horse Profile</div>
            <div className="tips-card-desc">Your horse&#39;s (or horses&#39;) details, temperament, training history, and quirks that matter.</div>
            <span className="tips-card-freq">One-time setup</span>
          </Link>
          <Link to="/debriefs/new" className="tips-form-card">
            <div className="tips-card-icon">&#x1F4DD;</div>
            <div className="tips-card-title">Post-Ride Debrief</div>
            <div className="tips-card-desc">Set intentions, capture rider and horse states, and record what happened, what worked, and what to focus on next.</div>
            <span className="tips-card-freq">After every ride</span>
          </Link>
          <Link to="/reflections/new" className="tips-form-card">
            <div className="tips-card-icon">&#x1F4AD;</div>
            <div className="tips-card-title">Reflection Form</div>
            <div className="tips-card-desc">Deeper exploration across six categories with curated prompts to guide your thinking.</div>
            <span className="tips-card-freq">Weekly+ (anytime!)</span>
          </Link>
          <Link to="/event-prep/new" className="tips-form-card">
            <div className="tips-card-icon">&#x1F4CB;</div>
            <div className="tips-card-title">Event Preparation</div>
            <div className="tips-card-desc">Plan ahead for shows, clinics, and competitions within the next six months.</div>
            <span className="tips-card-freq">Before events</span>
          </Link>
          <Link to="/events/new" className="tips-form-card">
            <div className="tips-card-icon">&#x1F4C5;</div>
            <div className="tips-card-title">Journey Event Log</div>
            <div className="tips-card-desc">Record shows, clinics, rider health, environmental changes, and other significant moments and their impact on your journey.</div>
            <span className="tips-card-freq">As they happen</span>
          </Link>
          <Link to="/horse-health/new" className="tips-form-card">
            <div className="tips-card-icon">&#x1F434;</div>
            <div className="tips-card-title">Health & Soundness</div>
            <div className="tips-card-desc">Track vet visits, body work, saddle fittings, soundness concerns, and emergencies — with full history per horse.</div>
            <span className="tips-card-freq">As they happen</span>
          </Link>
          <Link to="/observations/new" className="tips-form-card">
            <div className="tips-card-icon">&#x1F441;&#xFE0F;</div>
            <div className="tips-card-title">Observation Form</div>
            <div className="tips-card-desc">Capture insights from watching clinics, lessons, videos, and other riders.</div>
            <span className="tips-card-freq">When opportunities arise</span>
          </Link>
          <Link to="/rider-assessments/new" className="tips-form-card">
            <div className="tips-card-icon">&#x1F4CA;</div>
            <div className="tips-card-title">Self-Assessments</div>
            <div className="tips-card-desc">Periodic check-ins on your riding skills and physical readiness.</div>
            <span className="tips-card-freq">Monthly / Quarterly</span>
          </Link>
        </div>

        <div className="tips-emphasis">
          <strong>Start with your profiles, then build the habit.</strong> Complete your Rider Profile and Horse Profile(s) first—they give the AI essential context. Then focus on Post-Ride Debriefs after every ride and one Reflection per week. The other forms add richness as opportunities arise.
        </div>
      </div>

      {/* Getting Started */}
      <div className="tips-section" id="getting-started">
        <h2>Getting Started</h2>

        <ol className="tips-numbered-steps">
          <li>
            <strong>Complete Your Rider Profile</strong>
            Tell us about your riding background, goals, current level, and what you&#39;re working on. This gives the AI essential context about who you are as a rider.
          </li>
          <li>
            <strong>Complete Your Horse Profile(s)</strong>
            Enter your horse&#39;s details—breed, age, temperament, training level, strengths, and any quirks. If you ride multiple horses, create a profile for each.
          </li>
          <li>
            <strong>Bookmark the Post-Ride Debrief on Your Phone</strong>
            This is your primary daily tool. Save it to your phone&#39;s home screen for instant access at the barn. You&#39;ll use this after every ride—the memories are freshest right after you dismount.
          </li>
          <li>
            <strong>Bookmark the Reflection Form on Your Phone</strong>
            This is for deeper reflections. Save it alongside the debrief form. We suggest weekly as a starting rhythm, but reflect as often as you like—there&#39;s no limit.
          </li>
          <li>
            <strong>Try Voice Input</strong>
            All forms support voice input on mobile. Tap the microphone icon in any text field—this is a game-changer for quick entries while untacking or capturing observations on the go.
          </li>
        </ol>

        <div className="tips-tip-box">
          <h4>Pro Tip: Mobile-First Setup</h4>
          <p>You&#39;ll do most of your data entry on your phone at the barn. Set yourself up for success by bookmarking the Debrief and Reflection forms to your home screen and practicing voice input before your next ride.</p>
        </div>
      </div>

      {/* Daily & Weekly Workflow */}
      <div className="tips-section" id="daily-workflow">
        <h2>Your Daily &amp; Weekly Workflow</h2>

        <h3>After Every Ride (2–5 Minutes)</h3>
        <p className="tips-text-block">Open the <strong>Post-Ride Debrief</strong> on your phone while you&#39;re still at the barn. Not every section needs an answer—follow what&#39;s meaningful for today&#39;s ride.</p>

        <div className="tips-emphasis">
          <strong>Key debrief features:</strong> Set your <strong>ride intentions</strong> before you mount (what are you focusing on today?) and note whether you met them afterward. The debrief also captures your <strong>rider state</strong> and <strong>horse state</strong>—energy, mood, focus, tension—going into and coming out of the ride. These states are powerful data points: over time, the AI can show you which conditions consistently produce your best work.
        </div>

        <div className="tips-color-legend">
          <div className="tips-color-item">
            <div className="tips-color-dot" style={{ background: '#4A90E2' }}></div>
            <span><strong>Breakthrough:</strong> What worked</span>
          </div>
          <div className="tips-color-item">
            <div className="tips-color-dot" style={{ background: '#F5A623' }}></div>
            <span><strong>Aha Moment:</strong> What clicked</span>
          </div>
          <div className="tips-color-item">
            <div className="tips-color-dot" style={{ background: '#8B5CF6' }}></div>
            <span><strong>Connection:</strong> Your horse</span>
          </div>
          <div className="tips-color-item">
            <div className="tips-color-dot" style={{ background: '#7ED321' }}></div>
            <span><strong>Validation:</strong> Feedback</span>
          </div>
          <div className="tips-color-item">
            <div className="tips-color-dot" style={{ background: '#D0021B' }}></div>
            <span><strong>Challenge:</strong> What&#39;s hard</span>
          </div>
          <div className="tips-color-item">
            <div className="tips-color-dot" style={{ background: '#FF8C42' }}></div>
            <span><strong>Feel:</strong> Body awareness</span>
          </div>
        </div>

        <h3>Weekly (10–15 Minutes)</h3>
        <p>Choose one <strong>Reflection</strong> from the six categories. These dig deeper into specific moments, challenges, or realizations. The prompts help trigger memories and guide your thinking. If a prompt doesn&#39;t resonate, pass it—you get three passes per session.</p>
        <p className="tips-text-spacing"><strong>Weekly is a great rhythm, but it&#39;s not a limit.</strong> Reflect whenever inspiration strikes and as often as you like. Had a breakthrough lesson on Monday and a frustrating ride on Thursday? Capture both. The more reflections you record, the richer the patterns the AI can find.</p>

        <h3>The More You Collect, The More You Discover</h3>
        <p className="tips-text-spacing-sm">Think of data collection like building a puzzle. Five pieces show you a corner. Twenty pieces reveal a pattern. Fifty pieces show you the full picture. Be generous with your reflections and debriefs—each one adds another data point that helps the AI identify what&#39;s really going on beneath the surface.</p>
      </div>

      {/* Six Reflection Categories */}
      <div className="tips-section" id="reflections">
        <h2>The Six Reflection Categories</h2>

        <p className="tips-text-block">Each week, pick one category that resonates with where you are right now. Over time, aim to capture reflections across all six categories so the AI has a complete picture of your riding experience.</p>

        <div className="tips-color-legend tips-color-legend--stacked">
          <div className="tips-color-item">
            <div className="tips-color-dot" style={{ background: '#4A90E2' }}></div>
            <div>
              <strong>Personal Milestone</strong><br />
              <span className="tips-color-desc">Achievements, breakthroughs, goals met—the wins that matter to you regardless of external recognition</span>
            </div>
          </div>
          <div className="tips-color-item">
            <div className="tips-color-dot" style={{ background: '#7ED321' }}></div>
            <div>
              <strong>External Validation</strong><br />
              <span className="tips-color-desc">Feedback from coaches, judges, peers—recognition that moved you forward or shifted your perspective</span>
            </div>
          </div>
          <div className="tips-color-item">
            <div className="tips-color-dot" style={{ background: '#F5A623' }}></div>
            <div>
              <strong>Aha Moment</strong><br />
              <span className="tips-color-desc">The click, the realization, the sudden understanding—when theory connected to feeling or something finally made sense</span>
            </div>
          </div>
          <div className="tips-color-item">
            <div className="tips-color-dot" style={{ background: '#D0021B' }}></div>
            <div>
              <strong>Obstacle</strong><br />
              <span className="tips-color-desc">Challenges, setbacks, frustrations—the hard parts of the journey including physical, mental, financial, or partnership issues</span>
            </div>
          </div>
          <div className="tips-color-item">
            <div className="tips-color-dot" style={{ background: '#8B5CF6' }}></div>
            <div>
              <strong>Connection</strong><br />
              <span className="tips-color-desc">Moments with your horse—partnership, communication, mutual understanding, trust building, and what they teach you</span>
            </div>
          </div>
          <div className="tips-color-item">
            <div className="tips-color-dot" style={{ background: '#FF8C42' }}></div>
            <div>
              <strong>Feel (Body Awareness)</strong><br />
              <span className="tips-color-desc">Physical sensations and discoveries—the first time you felt your seat bones, recognized tension patterns, or understood biomechanics through your body</span>
            </div>
          </div>
        </div>

        <div className="tips-tip-box">
          <h4>How Prompts Work</h4>
          <p>Each category has 25 prompts to trigger specific memories. When you select a category, you&#39;ll see one prompt. If it doesn&#39;t resonate, you can pass it (3 passes per session) to see another. The goal is to capture meaningful moments, not force responses to prompts that don&#39;t fit your experience.</p>
        </div>
      </div>

      {/* Setting Up Your Profiles */}
      <div className="tips-section" id="profiles">
        <h2>Setting Up Your Profiles</h2>

        <p className="tips-welcome-text">
          Your Rider Profile and Horse Profile(s) are the foundation of personalized analysis. They give the AI the context it needs to make your coaching insights specific to <em>you</em> rather than generic advice.
        </p>

        <h3>Rider Profile</h3>
        <p>Your riding background, current level, goals, training frequency, instructor information, and what you&#39;re working on. This helps the AI calibrate its feedback to your experience and ambitions. Update it whenever your circumstances change—new instructor, new goals, different training focus.</p>

        <h3>Horse Profile(s)</h3>
        <p>Your horse&#39;s breed, age, training level, temperament, strengths, areas of development, and any quirks or considerations. The more the AI knows about your horse, the better it can interpret patterns in your ride debriefs. Create a profile for each horse you ride regularly—the AI tracks patterns for each partnership separately.</p>

        <div className="tips-tip-box">
          <h4>Keep Profiles Current</h4>
          <p>Profiles aren&#39;t "set and forget." As your training evolves, your horse progresses, or your goals shift, update your profiles. Current profiles mean more relevant analysis.</p>
        </div>
      </div>

      {/* Events: Logging & Preparation */}
      <div className="tips-section" id="events">
        <h2>Events: Logging &amp; Preparation</h2>

        <p className="tips-welcome-text">
          Two forms work together to help you get the most from shows, clinics, lessons, and other significant moments in your dressage journey.
        </p>

        <h3>Event Preparation Form</h3>
        <p>Use this <strong>before</strong> an upcoming show, clinic, or significant lesson that&#39;s <strong>within the next six months</strong>. (Beyond six months, plans change too much to be practical.) It helps you think through your goals, preparation plan, potential challenges, and what you want to focus on. Structured preparation leads to better performance and—just as importantly—better learning from the experience afterward.</p>

        <ul className="tips-bullets">
          <li><strong>Shows &amp; competitions:</strong> Define your goals beyond just scores—what do you want to demonstrate? What are you testing?</li>
          <li><strong>Clinics:</strong> Identify specific questions and focus areas so you arrive with clarity</li>
          <li><strong>Significant lessons:</strong> Prepare when you&#39;re working on something new or challenging with your instructor</li>
        </ul>

        <h3>Journey Event Log</h3>
        <p>Use this <strong>after</strong> (or during) significant events to create a record. Log shows, clinics, rider health issues, environmental changes (new barn, footing changes, seasonal shifts), new equipment, or training milestones. <strong>Horse health, vet visits, body work, and soundness concerns now have their own dedicated tracker</strong> — use the <Link to="/horse-health/new">Health &amp; Soundness Tracker</Link> for those. The form captures not just what happened, but the <strong>impact and significance</strong> of each event on your journey.</p>

        <div className="tips-emphasis">
          <strong>The power of pairing these forms:</strong> When you prepare for an event AND log what actually happened, the AI can analyze the gap between intention and outcome—one of the most revealing patterns in rider development.
        </div>

        <div className="tips-tip-box">
          <h4>Don&#39;t Forget the "Small" Events</h4>
          <p>A farrier visit, a saddle fitting, a sore back, allergy season, even a change in turnout schedule can affect your riding. Log these too—they often explain patterns that would otherwise seem mysterious.</p>
        </div>
      </div>

      {/* Horse Health & Soundness Tracker */}
      <div className="tips-section" id="health-soundness">
        <h2>Horse Health &amp; Soundness Tracker</h2>

        <p className="tips-welcome-text">
          A dedicated log for tracking everything related to your horse&#39;s physical wellbeing — from routine maintenance to concerns worth monitoring to emergencies.
        </p>

        <h3>How It Differs from the Journey Event Log</h3>
        <p>The Journey Event Log captures life events that affect your training context — shows, clinics, barn changes, rider health. The Health &amp; Soundness Tracker is <strong>horse-specific and clinical</strong> — it&#39;s a medical and care record, not a narrative log. Each entry is tied to a horse by name, so if you ride multiple horses, each builds its own health history.</p>

        <h3>The Three Issue Types</h3>
        <ul className="tips-bullets">
          <li><strong>Maintenance:</strong> Routine, planned care — chiropractic, massage, farrier, saddle fitting, PPE check-ins. These are positive signals of attentive horsemanship.</li>
          <li><strong>Concern:</strong> Something worth monitoring — mild lameness, behavior shift, subtle change. Not yet an emergency, but worth tracking.</li>
          <li><strong>Emergency:</strong> Acute or serious — colic, injury, significant lameness episode. Entries that require immediate professional attention.</li>
        </ul>

        <h3>Status Tracking</h3>
        <p>Mark entries as <strong>Ongoing</strong> or <strong>Resolved</strong> — and update them over time. This creates a longitudinal health picture the AI can use to correlate with your training data. When an ongoing concern resolves, update the entry so the AI knows the constraint has lifted.</p>

        <div className="tips-tip-box">
          <h4>Log Every Professional Visit</h4>
          <p>Log every professional visit, not just problems. Chiro, massage, saddle fitter, and farrier visits are data. When the AI sees that your horse had bodywork two days before a breakthrough ride, it can flag that connection.</p>
        </div>
      </div>

      {/* Observation Form */}
      <div className="tips-section" id="observations">
        <h2>Observation Form</h2>

        <p className="tips-welcome-text">
          Beyond your own riding, there&#39;s tremendous value in capturing insights from <strong>watching others</strong>. The Observation Form lets you document learning moments when you:
        </p>

        <ul className="tips-bullets">
          <li><strong>Attend a clinic</strong> as an auditor or participant</li>
          <li><strong>Watch your trainer ride your horse</strong></li>
          <li><strong>Observe training sessions</strong> at your barn</li>
          <li><strong>Audit a show</strong> or competition</li>
          <li><strong>Watch instructional videos</strong> or competitions online</li>
        </ul>

        <h3>How It Works</h3>
        <p>The Observation Form is structured similarly to your reflections, allowing you to capture multiple learning moments from a single event using five categories (Feel is not included since it captures your own body awareness while riding):</p>

        <div className="tips-color-legend">
          <div className="tips-color-item">
            <div className="tips-color-dot" style={{ background: '#4A90E2' }}></div>
            <span><strong>Breakthrough:</strong> Technical or training breakthroughs you observed</span>
          </div>
          <div className="tips-color-item">
            <div className="tips-color-dot" style={{ background: '#F5A623' }}></div>
            <span><strong>Aha Moment:</strong> What resonated and how you could apply it</span>
          </div>
          <div className="tips-color-item">
            <div className="tips-color-dot" style={{ background: '#8B5CF6' }}></div>
            <span><strong>Connection:</strong> Horse-rider partnership dynamics</span>
          </div>
          <div className="tips-color-item">
            <div className="tips-color-dot" style={{ background: '#7ED321' }}></div>
            <span><strong>Validation:</strong> Concepts confirmed or validated</span>
          </div>
          <div className="tips-color-item">
            <div className="tips-color-dot" style={{ background: '#D0021B' }}></div>
            <span><strong>Obstacle:</strong> Challenges and how they were overcome</span>
          </div>
        </div>

        <h3>Why This Matters</h3>
        <p>Observation data enriches your overall pattern analysis. When the AI sees both what you experience in the saddle AND what resonates when you watch others, it can identify gaps between what you recognize intellectually and what you&#39;re implementing practically. This reveals blind spots and accelerates learning transfer.</p>

        <div className="tips-tip-box">
          <h4>Best Use Cases</h4>
          <p><strong>Most valuable:</strong> Watching your trainer ride your own horse (direct application to your partnership), attending clinics with instructors whose methods you want to understand better, or watching riders just one level above you (close enough to be immediately applicable).</p>
        </div>
      </div>

      {/* Self-Assessments */}
      <div className="tips-section" id="assessments">
        <h2>Self-Assessments</h2>

        <p className="tips-welcome-text">
          Periodic self-assessments give you and the AI a structured snapshot of where you are right now—both as a rider and physically.
        </p>

        <h3>Rider Self-Assessment</h3>
        <p>A structured review of your riding skills, confidence levels, and areas of focus across different aspects of dressage. Taking this periodically lets you track how your self-perception evolves over time—and the AI can compare your self-assessment against patterns in your ride debriefs for deeper insight.</p>

        <h3>Physical Self-Assessment</h3>
        <p>An honest look at your physical readiness for riding—flexibility, core strength, balance, fitness, and any limitations. Physical factors have a huge impact on riding performance, and tracking them helps the AI connect the dots between your body and your rides.</p>

        <div className="tips-tip-box">
          <h4>When to Reassess</h4>
          <p>Take your first self-assessments when you start, then revisit them monthly or quarterly. They&#39;re especially valuable after a break from riding, recovering from an injury, changing training intensity, or starting work with a new horse.</p>
        </div>
      </div>

      {/* Getting the Most Value */}
      <div className="tips-section" id="best-tips">
        <h2>Getting the Most Value</h2>

        <h3>Write for Future You, Not for Perfection</h3>
        <p>Three specific sentences beat one vague paragraph every time. "Slow to pick up right lead" is infinitely more useful than "horse was stiff." The AI finds patterns in specifics, not generalities.</p>

        <h3>Use Voice Input at the Barn</h3>
        <p>On mobile, tap the microphone icon in any text field. Talk through your observations while untacking—it&#39;s faster than typing and captures details you&#39;d forget by the time you get home.</p>

        <h3>Set Intentions, Then Track Results</h3>
        <p>Before your ride, note what you&#39;re planning to focus on. After, note what actually happened. The gap between intention and result reveals where you need support.</p>

        <h3>Be Honest About the Hard Stuff</h3>
        <p>The AI learns most from obstacles and challenges. If you only record wins, the analysis won&#39;t have enough signal to help you break through plateaus.</p>

        <h3>Use "Compared To" Language</h3>
        <p>Adding comparison takes 5 seconds but multiplies value: "More balanced than last Tuesday" or "Stiffer than warmup" or "Better after the walk break." Context creates patterns.</p>

        <h3>Pair Preparation with Follow-Up</h3>
        <p>Use the Event Preparation form before shows and clinics, then log the event and complete a debrief afterward. This before/after pairing is one of the richest sources of insight the AI can work with.</p>

        <div className="tips-tip-box">
          <h4>The 2-Minute Rule</h4>
          <p>If completing a form feels like it&#39;s taking more than 5 minutes, you&#39;re overthinking it. Capture the key details and move on. Consistent 2-minute entries beat sporadic 20-minute essays.</p>
        </div>
      </div>

      {/* Contact Section */}
      <div className="tips-contact-box" id="contact">
        <h3>Questions? Problems? Ideas?</h3>
        <p className="tips-contact-lead">We&#39;d love to hear from you:</p>
        <p><a href="mailto:barb@yourdressagejourney.com">barb@yourdressagejourney.com</a></p>
        <p className="tips-contact-footnote">Your feedback shapes this platform. No question is too small, no idea is too weird.</p>
      </div>

      <div className="tips-footer-quote">
        <p className="tips-quote">"Five rides show you what happened. Twenty rides reveal why it keeps happening.<br />Fifty rides show you the conditions that create your best work."</p>
        <p className="tips-footer-tagline">Illuminate Your Journey</p>
      </div>
    </div>
  );
}
