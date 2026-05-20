import { Link } from 'react-router-dom';
import './TipsAndFaq.css';
import './OutputsTipsAndFaq.css';

export default function TipsAndFaq() {
  return (
    <div className="tips-faq-page" id="top">
      <a href="#top" className="tips-back-to-top" aria-label="Back to top">&uarr;</a>
      <header className="tips-header">
        <img src="/assets/logo-color.svg" alt="Your Dressage Journey" className="tips-logo-img" />
        <h1>How to Use Your Dressage Journey</h1>
        <p className="tips-subtitle">A practical guide to the forms, tools, and settings that power your coaching</p>
        <span className="tips-tagline-badge">ILLUMINATE YOUR JOURNEY</span>
      </header>

      {/* Intro + TOC */}
      <div className="tips-section">
        <h2>On This Page</h2>
        <p className="tips-text-block">
          Welcome. This guide is your orientation to the data side of Your Dressage Journey&mdash;the forms you fill out, the tools that ride with you, and the dashboard, settings, and Learn area where everything lives. The companion <Link to="/outputs-tips-and-faq">Outputs Guide</Link> covers what the AI <em>does</em> with your data.
        </p>
        <nav className="tips-toc">
          <a href="#first-week">Your First Week</a>
          <a href="#quickstart">The Quick Start Map</a>
          <a href="#forms">Your Forms at a Glance</a>
          <a href="#rhythm">The Daily &amp; Weekly Rhythm</a>
          <a href="#reflections-cats">The Six Reflection Categories</a>
          <a href="#profiles">Setting Up Your Profiles</a>
          <a href="#debrief">Post-Ride Debrief</a>
          <a href="#micro">Quick Capture (Micro-Debrief)</a>
          <a href="#reflection-form">Reflection</a>
          <a href="#lesson-notes">Lesson Notes</a>
          <a href="#observation">Observation</a>
          <a href="#events">Shows &amp; Journey Events</a>
          <a href="#horse-health">Horse Health &amp; Soundness</a>
          <a href="#rider-health">Rider Health &amp; Wellness</a>
          <a href="#assessments">Self-Assessments (Three of Them)</a>
          <a href="#toolkit">The Rider&#39;s Toolkit</a>
          <a href="#tools">Tools That Ride With You</a>
          <a href="#viz-scripts">Visualization Scripts</a>
          <a href="#fresh-start">Fresh Start</a>
          <a href="#dashboard">Your Dashboard</a>
          <a href="#settings">Settings</a>
          <a href="#learn">The Learn Section</a>
          <a href="#tips">Habits That Compound</a>
          <a href="#faq">Frequently Asked Questions</a>
          <a href="#contact">Contact</a>
        </nav>
      </div>

      {/* Your First Week */}
      <div className="tips-section tips-section--start" id="first-week">
        <span className="tips-section-badge">Start Here</span>
        <h2>Your First Week</h2>
        <p className="tips-welcome-text">Five steps to get the platform working for you right away.</p>
        <ol className="tips-numbered-steps">
          <li>
            <strong>Complete your Rider Profile</strong>
            Your background, current level, goals, instructor, and training focus. Every output reads your data through this lens, so this is the one form you should never skip.
          </li>
          <li>
            <strong>Add a Horse Profile for each horse you ride</strong>
            Breed, age, training level, temperament, strengths, quirks. The AI tracks patterns separately for each partnership, so every horse needs their own profile.
          </li>
          <li>
            <strong>Complete First Light</strong>
            First Light is your first AI coaching output. You&#39;ll work through six short reflections&mdash;one for each of the six reflection categories. When you finish, the four coaching voices read your reflections back to you. It&#39;s the platform&#39;s welcome read on who you are as a rider.
          </li>
          <li>
            <strong>Bookmark the Post-Ride Debrief and Reflection on your phone</strong>
            Save them to your home screen. You&#39;ll do most of your data entry on your phone at the barn&mdash;memories are freshest right after you dismount.
          </li>
          <li>
            <strong>Build the rhythm: one debrief per ride, one reflection per week</strong>
            That cadence produces enough signal for the AI to start finding real patterns. Every other form (events, observations, self-assessments, health logs) layers in as opportunities come up.
          </li>
        </ol>
        <div className="tips-tip-box">
          <h4>About First Light</h4>
          <p>First Light is generated once, on completion of the wizard. You can <strong>regenerate it one time</strong> after you&#39;ve added new data (a debrief, a reflection, an observation, or an event). It retires automatically after your fifth debrief, at which point Multi-Voice Coaching takes over with the full weekly arc. Until then, First Light is your coaching window.</p>
        </div>
        <div className="tips-tip-box">
          <h4>Try voice input on day one</h4>
          <p>Every text field on mobile has a microphone icon. Talking through a debrief while untacking is faster than typing, and you&#39;ll catch details you&#39;d forget by the time you got home.</p>
        </div>
      </div>

      {/* Quick Start Map */}
      <div className="tips-section tips-section--start" id="quickstart">
        <span className="tips-section-badge">Start Here</span>
        <h2>The Quick Start Map</h2>
        <p className="tips-welcome-text">
          The Quick Start Guide is a visual map of the onboarding path. You can reach it from the nav at any time. It shows you where you are on the path and what comes next.
        </p>

        <h3>What the map tracks</h3>
        <p>The map walks you through four required stations:</p>
        <ol className="tips-bullets-numbered">
          <li><strong>Rider Profile</strong> complete</li>
          <li><strong>Horse Profile(s)</strong> complete</li>
          <li><strong>Six First Light reflections</strong> &mdash; one from each category (these are the reflections you complete inside the First Light wizard)</li>
          <li><strong>Five Post-Ride Debriefs</strong> logged</li>
        </ol>

        <h3>When you &ldquo;graduate&rdquo;</h3>
        <p>Once you&#39;ve hit all six reflection categories <em>and</em> logged five debriefs, your full coaching arc unlocks. First Light retires; Multi-Voice Coaching takes over as your weekly coaching output. At that point the Quick Start Map has done its job and you can switch your landing page to the Dashboard (see <a href="#settings">Settings</a>). You can still visit the Quick Start Guide any time, but it&#39;s no longer the primary view.</p>

        <div className="tips-emphasis">
          <strong>The path is sequenced for a reason.</strong> Profiles before First Light gives First Light the context it needs. First Light before regular reflections gives you a coaching read of yourself before you start the weekly rhythm. Don&#39;t worry about &ldquo;getting ahead&rdquo;&mdash;the map shows you exactly what to do next.
        </div>
      </div>

      {/* Forms at a Glance */}
      <div className="tips-section" id="forms">
        <h2>Your Forms at a Glance</h2>
        <p className="tips-welcome-text">All the data entry points, grouped by how often you&#39;ll touch them. Tap any card to jump straight to that form.</p>

        <h3>Daily / per ride</h3>
        <div className="tips-form-cards">
          <Link to="/debriefs/new" className="tips-form-card">
            <div className="tips-card-icon">&#x1F4DD;</div>
            <div className="tips-card-title">Post-Ride Debrief</div>
            <div className="tips-card-desc">Intentions, rider/horse state, what happened, what worked, what&#39;s next.</div>
            <span className="tips-card-freq">After every ride</span>
          </Link>
          <Link to="/forms/micro-debrief" className="tips-form-card">
            <div className="tips-card-icon">&#x26A1;</div>
            <div className="tips-card-title">Quick Capture</div>
            <div className="tips-card-desc">A 60-second debrief for the days you don&#39;t have time for the full one.</div>
            <span className="tips-card-freq">When time is short</span>
          </Link>
          <Link to="/lesson-notes/new" className="tips-form-card">
            <div className="tips-card-icon">&#x1F4DA;</div>
            <div className="tips-card-title">Lesson Notes</div>
            <div className="tips-card-desc">Instructor cues, exercises, corrections, and what to take home.</div>
            <span className="tips-card-freq">After lessons</span>
          </Link>
        </div>

        <h3>Weekly</h3>
        <div className="tips-form-cards">
          <Link to="/reflections/new" className="tips-form-card">
            <div className="tips-card-icon">&#x1F4AD;</div>
            <div className="tips-card-title">Reflection</div>
            <div className="tips-card-desc">Deeper exploration in one of six categories&mdash;and where you tell your coaches what to focus on.</div>
            <span className="tips-card-freq">Weekly (or more)</span>
          </Link>
        </div>

        <h3>When something happens</h3>
        <div className="tips-form-cards">
          <Link to="/observations/new" className="tips-form-card">
            <div className="tips-card-icon">&#x1F441;&#xFE0F;</div>
            <div className="tips-card-title">Observation</div>
            <div className="tips-card-desc">Capture what you learn watching clinics, lessons, video, or other riders.</div>
            <span className="tips-card-freq">When watching</span>
          </Link>
          <Link to="/events/new" className="tips-form-card">
            <div className="tips-card-icon">&#x1F4C5;</div>
            <div className="tips-card-title">Journey Event Log</div>
            <div className="tips-card-desc">Major life events and changes that affect your training context.</div>
            <span className="tips-card-freq">As they happen</span>
          </Link>
          <Link to="/horse-health/new" className="tips-form-card">
            <div className="tips-card-icon">&#x1F434;</div>
            <div className="tips-card-title">Horse Health &amp; Soundness</div>
            <div className="tips-card-desc">Vet visits, bodywork, saddle fittings, soundness concerns, emergencies.</div>
            <span className="tips-card-freq">As they happen</span>
          </Link>
          <Link to="/rider-health/new" className="tips-form-card">
            <div className="tips-card-icon">&#x1FA7A;</div>
            <div className="tips-card-title">Rider Health &amp; Wellness</div>
            <div className="tips-card-desc">Dated rider-side health events that are affecting your riding.</div>
            <span className="tips-card-freq">As needed</span>
          </Link>
          <Link to="/show-prep/new" className="tips-form-card">
            <div className="tips-card-icon">&#x1F4CB;</div>
            <div className="tips-card-title">Show Preparation</div>
            <div className="tips-card-desc">A show within the next six months&mdash;tests, goals, timeline.</div>
            <span className="tips-card-freq">Before shows</span>
          </Link>
        </div>

        <h3>One-time and periodic</h3>
        <div className="tips-form-cards">
          <Link to="/profile/rider" className="tips-form-card">
            <div className="tips-card-icon">&#x1F464;</div>
            <div className="tips-card-title">Rider Profile</div>
            <div className="tips-card-desc">Your background, goals, current level, and training context.</div>
            <span className="tips-card-freq">One-time setup</span>
          </Link>
          <Link to="/horses" className="tips-form-card">
            <div className="tips-card-icon">&#x1F40E;</div>
            <div className="tips-card-title">Horse Profile</div>
            <div className="tips-card-desc">Each horse you ride&mdash;breed, level, temperament, training history, quirks.</div>
            <span className="tips-card-freq">One per horse</span>
          </Link>
          <Link to="/rider-assessments/new" className="tips-form-card">
            <div className="tips-card-icon">&#x1F4CA;</div>
            <div className="tips-card-title">Rider Self-Assessment</div>
            <div className="tips-card-desc">Mental skills, scenarios, regulation strategies, self-rating sliders.</div>
            <span className="tips-card-freq">Monthly / quarterly</span>
          </Link>
          <Link to="/physical-assessments/new" className="tips-form-card">
            <div className="tips-card-icon">&#x1F9D8;</div>
            <div className="tips-card-title">Physical Self-Assessment</div>
            <div className="tips-card-desc">Body awareness, kinesthetic awareness, tension patterns.</div>
            <span className="tips-card-freq">Monthly / quarterly</span>
          </Link>
          <Link to="/technical-assessments/new" className="tips-form-card">
            <div className="tips-card-icon">&#x2696;&#xFE0F;</div>
            <div className="tips-card-title">Technical &amp; Philosophical</div>
            <div className="tips-card-desc">Movement-by-movement ratings, training scale, philosophy.</div>
            <span className="tips-card-freq">Periodic</span>
          </Link>
          <Link to="/toolkit" className="tips-form-card">
            <div className="tips-card-icon">&#x1F9F0;</div>
            <div className="tips-card-title">Rider&#39;s Toolkit</div>
            <div className="tips-card-desc">A catalog of off-horse discoveries&mdash;exercises, supplements, books, recovery.</div>
            <span className="tips-card-freq">Anytime</span>
          </Link>
        </div>
      </div>

      {/* Rhythm */}
      <div className="tips-section tips-section--start" id="rhythm">
        <span className="tips-section-badge">Start Here</span>
        <h2>The Daily &amp; Weekly Rhythm</h2>
        <p className="tips-welcome-text">You don&#39;t need to use every form every week. Here&#39;s the cadence that produces the richest coaching.</p>

        <div className="tips-rhythm-grid">
          <div className="tips-rhythm-card">
            <div className="tips-rhythm-when">After every ride</div>
            <div className="tips-rhythm-what"><strong>Post-Ride Debrief</strong> (2&ndash;5 minutes). When time is short, <strong>Quick Capture</strong> instead (about 60 seconds).</div>
          </div>
          <div className="tips-rhythm-card">
            <div className="tips-rhythm-when">After every lesson</div>
            <div className="tips-rhythm-what"><strong>Lesson Notes</strong>&mdash;instructor cues, repeated corrections, what to take home.</div>
          </div>
          <div className="tips-rhythm-card">
            <div className="tips-rhythm-when">Once a week</div>
            <div className="tips-rhythm-what"><strong>Reflection</strong> (10&ndash;15 minutes). Pick one of the six categories. This is also where you tell your coaches what to focus on for the week.</div>
          </div>
          <div className="tips-rhythm-card">
            <div className="tips-rhythm-when">As they happen</div>
            <div className="tips-rhythm-what"><strong>Journey Events, Horse Health, Rider Health, Observations</strong>&mdash;whenever something noteworthy occurs.</div>
          </div>
          <div className="tips-rhythm-card">
            <div className="tips-rhythm-when">Monthly or quarterly</div>
            <div className="tips-rhythm-what"><strong>Rider, Physical, and Technical &amp; Philosophical Self-Assessments.</strong></div>
          </div>
          <div className="tips-rhythm-card">
            <div className="tips-rhythm-when">Before a show</div>
            <div className="tips-rhythm-what"><strong>Show Preparation</strong> (for events within the next six months).</div>
          </div>
          <div className="tips-rhythm-card">
            <div className="tips-rhythm-when">After a gap</div>
            <div className="tips-rhythm-what"><strong>Fresh Start</strong>&mdash;the re-onboarding form for when you&#39;ve been away.</div>
          </div>
        </div>

        <p className="tips-text-spacing">
          <strong>The principle:</strong> short and consistent beats long and sporadic. Three specific sentences after a ride are more useful than one paragraph a month later. The AI finds patterns in frequency and repetition&mdash;volume beats polish.
        </p>
      </div>

      {/* Six Reflection Categories */}
      <div className="tips-section" id="reflections-cats">
        <h2>The Six Reflection Categories</h2>
        <p className="tips-welcome-text">
          The reflection categories are a core innovation of the platform&mdash;a universal framework for capturing the meaningful moments in skill development. The <strong>Reflection</strong> form uses all six. The <strong>Post-Ride Debrief</strong> and <strong>Observation</strong> forms use related but different shapes (described in each form&#39;s section below).
        </p>

        <div className="tips-color-legend tips-color-legend--stacked">
          <div className="tips-color-item">
            <div className="tips-color-dot" style={{ background: '#4A90E2' }}></div>
            <div>
              <strong>Personal Milestone</strong><br />
              <span className="tips-color-desc">Progress you recognize in yourself&mdash;achievements, breakthroughs, goals met. The wins that matter to you, regardless of external recognition.</span>
            </div>
          </div>
          <div className="tips-color-item">
            <div className="tips-color-dot" style={{ background: '#7ED321' }}></div>
            <div>
              <strong>External Validation</strong><br />
              <span className="tips-color-desc">Feedback from coaches, judges, peers&mdash;recognition that moved you forward or shifted your perspective.</span>
            </div>
          </div>
          <div className="tips-color-item">
            <div className="tips-color-dot" style={{ background: '#F5A623' }}></div>
            <div>
              <strong>Aha Moment</strong><br />
              <span className="tips-color-desc">The click. The sudden realization. Moments when theory connected to feeling, or something finally made sense.</span>
            </div>
          </div>
          <div className="tips-color-item">
            <div className="tips-color-dot" style={{ background: '#D0021B' }}></div>
            <div>
              <strong>Obstacle</strong><br />
              <span className="tips-color-desc">Challenges, setbacks, frustrations&mdash;the hard parts of the journey, including physical, mental, financial, or partnership issues.</span>
            </div>
          </div>
          <div className="tips-color-item">
            <div className="tips-color-dot" style={{ background: '#8B5CF6' }}></div>
            <div>
              <strong>Connection</strong><br />
              <span className="tips-color-desc">Moments with your horse&mdash;partnership, communication, mutual understanding, trust building, and what they teach you.</span>
            </div>
          </div>
          <div className="tips-color-item">
            <div className="tips-color-dot" style={{ background: '#FF8C42' }}></div>
            <div>
              <strong>Feel / Body Awareness</strong><br />
              <span className="tips-color-desc">Physical sensations and discoveries&mdash;the first time you felt your seat bones, recognized a tension pattern, or understood biomechanics through your body.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profiles */}
      <div className="tips-section" id="profiles">
        <h2>Setting Up Your Profiles</h2>
        <p className="tips-welcome-text">
          Your Rider Profile and Horse Profile(s) are the foundation of personalized analysis. They give the AI the context it needs to make coaching specific to <em>you</em> rather than generic advice.
        </p>

        <h3>Rider Profile</h3>
        <p>Your riding background, current level, goals, training frequency, instructor information, and what you&#39;re working on. Update it whenever your circumstances change&mdash;new instructor, new goals, different focus.</p>

        <h3>Horse Profile(s)</h3>
        <p>Each horse&#39;s breed, age, training level, temperament, strengths, areas of development, and any quirks. The AI tracks patterns separately for each partnership, so create a profile for every horse you ride regularly. When the AI references one of your horses in an output, it uses their actual name&mdash;never &ldquo;your horse.&rdquo;</p>

        <div className="tips-tip-box">
          <h4>Keep profiles current</h4>
          <p>Profiles aren&#39;t &ldquo;set and forget.&rdquo; As your training evolves, your horse progresses, or your goals shift, update them. Current profiles mean current, relevant analysis.</p>
        </div>
      </div>

      {/* Post-Ride Debrief */}
      <div className="tips-section" id="debrief">
        <h2>Post-Ride Debrief</h2>
        <p className="tips-welcome-text">
          Your primary daily tool. Open it on your phone while you&#39;re still at the barn&mdash;memories degrade fast. Not every field needs an answer; follow what&#39;s meaningful for today&#39;s ride.
        </p>

        <h3>What the Debrief captures</h3>
        <p>The form pulls together five narrative areas plus structured fields (date, horse, session type, modality, ride arc, intentions/goal ratings, confidence, rider and horse effort, rider and horse energy, mental state, and movement tags). The five narrative areas use a related-but-different shape from the six reflection categories: two pairs are combined, and one is dedicated to the work itself.</p>

        <h3>Three session modalities &mdash; in the saddle, on the ground, or both</h3>
        <p>The Debrief isn&#39;t only for ridden work. When you open the form, you choose a <strong>session modality</strong>:</p>
        <ul className="tips-bullets">
          <li><strong>In the saddle</strong>&mdash;ridden work. The movement tags are the usual dressage vocabulary (lateral work, transitions, lengthenings, collected work, and so on).</li>
          <li><strong>On the ground</strong>&mdash;in-hand, lunging, long-lining, liberty, body work, handling and life skills. The form swaps in a ground-work tag set so you can capture lunging, in-hand lateral work, obstacle work, trailer loading, desensitization, partnership building, and the rest of what actually happens on the ground.</li>
          <li><strong>Combined</strong>&mdash;both in one session. The form gives you access to both tag sets so you can log the whole thing in a single entry.</li>
        </ul>
        <p>Groundwork sessions count as data the same way ridden sessions do. They feed your coaching, your Journey Map, and your patterns. Don&#39;t skip the debrief just because you didn&#39;t ride.</p>

        <div className="tips-color-legend tips-color-legend--stacked">
          <div className="tips-color-item">
            <div className="tips-color-dot" style={{ background: '#7ED321' }}></div>
            <div>
              <strong>Personal Milestones and External Validation</strong> (Wins)<br />
              <span className="tips-color-desc">What went well, what felt good, what progress you made, and any feedback or recognition you received. Combines the Personal Milestone and External Validation reflection categories into one ride-focused prompt.</span>
            </div>
          </div>
          <div className="tips-color-item">
            <div className="tips-color-dot" style={{ background: '#F5A623' }}></div>
            <div>
              <strong>Aha Moment</strong><br />
              <span className="tips-color-desc">Anything that &ldquo;clicked,&rdquo; an insight that emerged, or a change in your understanding of timing, feel, or technique.</span>
            </div>
          </div>
          <div className="tips-color-item">
            <div className="tips-color-dot" style={{ background: '#8B5CF6' }}></div>
            <div>
              <strong>Connection and Feel</strong><br />
              <span className="tips-color-desc">Your horse&#39;s energy, responsiveness, balance, comfort, tension&mdash;and your own body: seat, legs, hands, breathing, tension, balance. Combines the Connection and Feel reflection categories so partnership and embodied learning live together.</span>
            </div>
          </div>
          <div className="tips-color-item">
            <div className="tips-color-dot" style={{ background: '#D0021B' }}></div>
            <div>
              <strong>Obstacle</strong><br />
              <span className="tips-color-desc">What was difficult, what didn&#39;t work, what left you puzzled, what felt stuck.</span>
            </div>
          </div>
          <div className="tips-color-item">
            <div className="tips-color-dot" style={{ background: '#4A90E2' }}></div>
            <div>
              <strong>Additional notes on your work</strong><br />
              <span className="tips-color-desc">Exercises, movements, concepts, focus areas. Unique to the debrief&mdash;there&#39;s no equivalent reflection category, because this is where the work itself gets named.</span>
            </div>
          </div>
        </div>

        <div className="tips-emphasis">
          <strong>The 2&ndash;5 minute target.</strong> If a debrief is taking longer than five minutes, you&#39;re overthinking it. Capture the key details and move on. Consistent short entries always beat sporadic essays.
        </div>
      </div>

      {/* Quick Capture / Micro-Debrief */}
      <div className="tips-section" id="micro">
        <h2>Quick Capture (Micro-Debrief)</h2>
        <p className="tips-welcome-text">
          For the days when you don&#39;t have time for a full debrief but still want to capture something. Quick Capture is about 60 seconds: date, horse, quality (1&ndash;10), one mental-state chip, and an optional moment.
        </p>

        <h3>What you get back</h3>
        <p>Within a few seconds of saving, the Empathetic Coach writes a brief response to your entry. It&#39;s a warm, in-the-moment reading&mdash;not full coaching, just a presence to ride home with. The form stays on screen after submit so you can read the response or capture another entry.</p>

        <div className="tips-tip-box">
          <h4>Quick Capture vs. full Debrief</h4>
          <p>Both feed your weekly coaching. The full debrief is richer signal; Quick Capture is &ldquo;something is always better than nothing.&rdquo; A week of five Quick Captures plus two full debriefs gives the AI much more to work with than three perfect debriefs and four blank days.</p>
        </div>
      </div>

      {/* Reflection */}
      <div className="tips-section" id="reflection-form">
        <h2>Reflection</h2>
        <p className="tips-welcome-text">
          Deeper than a debrief, on its own rhythm. The Reflection form has three parts: a weekly check-in (where you set the agenda for your coaches), a category selection from the six, and the reflection itself guided by a curated prompt.
        </p>

        <h3>Weekly check-in (before you reflect)</h3>
        <p>Before you choose a category, the form asks three things about the week itself:</p>
        <ul className="tips-bullets">
          <li><strong>Compared to last week, your confidence as a rider feels...</strong> (higher / about the same / lower). This is about your sense of yourself, not just how the rides went.</li>
          <li><strong>Anything you want your coaches to focus on this week?</strong> This is where you steer your coaching. You can ask a question (&ldquo;Why do I keep pulling in downward transitions?&rdquo;), name something you&#39;re wrestling with, flag a pattern you&#39;ve noticed, or point them somewhere specific. Your coaches read everything you write here.</li>
          <li><strong>What patterns did you notice in your riding this week?</strong> Your own analysis before you read the AI&#39;s. The AI compares its findings to yours.</li>
        </ul>

        <h3>Then choose a category and a prompt</h3>
        <p>Each category has 25 curated prompts. You&#39;ll see one prompt when you pick a category; if it doesn&#39;t resonate, you can pass (three passes per session) to see another. The point is to capture meaningful moments, not to force responses to prompts that don&#39;t fit your experience.</p>

        <h3>The reflection itself</h3>
        <p>Three text fields: the reflection itself, how it makes you feel, and how it will influence your approach going forward. Obstacle reflections add a fourth field for strategies.</p>

        <div className="tips-emphasis">
          <strong>The coaching-focus field is the most underused power feature.</strong> If you use it, your weekly coaching is dramatically more relevant to what you actually want help with.
        </div>
      </div>

      {/* Lesson Notes */}
      <div className="tips-section" id="lesson-notes">
        <h2>Lesson Notes</h2>
        <p className="tips-welcome-text">
          Lessons produce some of the densest, fastest-fading training detail you&#39;ll ever collect&mdash;movements, corrections, imagery, the exact words your instructor used. Lesson Notes is built to capture all of it, and it includes a feature most riders don&#39;t expect: <strong>paste a transcript and let the AI organize it for you</strong>.
        </p>

        <div className="tips-emphasis">
          <strong>Record your lesson, transcribe it, paste it in.</strong> Voice recording during a lesson is often the only realistic capture method&mdash;you can&#39;t take notes from the saddle. After the lesson, run the recording through any transcription tool (Otter, Whisper, your phone&#39;s built-in transcription, anything that gives you text), then paste the full transcript into Lesson Notes. The AI does the rest.
        </div>

        <h3>How the transcript flow works</h3>
        <ol className="tips-bullets-numbered">
          <li><strong>Record your lesson</strong> on your phone or a small recorder.</li>
          <li><strong>Transcribe the audio</strong> with any transcription service. No speaker labels needed&mdash;the AI identifies your instructor&#39;s voice.</li>
          <li><strong>Open Lesson Notes</strong> and expand the transcript panel.</li>
          <li><strong>Paste the full transcript</strong> into the field and tap the process button.</li>
          <li><strong>Wait a few seconds</strong> while the AI organizes the transcript into structured guidance.</li>
          <li><strong>Review the populated fields</strong>: Movements &amp; Exercises, Purpose, Cues &amp; Corrections, Coach&#39;s Eye. The AI extracts your instructor&#39;s actual guidance and slots it into the right buckets.</li>
          <li><strong>Scan for mangled dressage terms</strong> &mdash; transcription tools often miss our vocabulary (common ones: &ldquo;haunches&rdquo; &rarr; &ldquo;hunches,&rdquo; &ldquo;volte&rdquo; &rarr; &ldquo;vault,&rdquo; &ldquo;half halt&rdquo; &rarr; &ldquo;half fault&rdquo;). Fix in place.</li>
          <li><strong>Add your own reflection and takeaways</strong> &mdash; these don&#39;t come from the transcript, they&#39;re yours.</li>
          <li><strong>Save.</strong></li>
        </ol>

        <h3>The form&#39;s structure</h3>
        <p>Whether you use the transcript flow or type by hand, the form has the same shape. The four AI-populatable sections sit under &ldquo;Instructor Guidance&rdquo;:</p>
        <ul className="tips-bullets">
          <li><strong>Movements &amp; Exercises</strong>&mdash;what you worked on, specific directions for performing each, figures and sequences, anything repeated.</li>
          <li><strong>Purpose</strong>&mdash;what training problem was the exercise trying to solve, what quality was it building toward. Your best guess is fine.</li>
          <li><strong>Cues &amp; Corrections</strong>&mdash;short verbal cues, position corrections, repeated reminders, brief positive feedback, and the questions your instructor asked you.</li>
          <li><strong>Coach&#39;s Eye</strong>&mdash;imagery and metaphors, observations about your horse, praise, anything connected to a bigger training idea.</li>
        </ul>
        <p>Then two fields that are always yours to write:</p>
        <ul className="tips-bullets">
          <li><strong>Rider Reflection</strong>&mdash;what surprised you reading the lesson back, what came up more than once, where the instructor&#39;s description and your felt sense diverged, what you want to try on your own.</li>
          <li><strong>Top 3 Takeaways</strong>&mdash;the three things you want to carry into your next ride.</li>
        </ul>

        <p>You can also link a Lesson Note to the related Debrief, so the AI sees them together when it builds your coaching.</p>

        <div className="tips-tip-box">
          <h4>Why this changes what&#39;s possible</h4>
          <p>Most riders capture maybe 20% of what their instructor said. With the transcript flow, you can capture all of it&mdash;structured, searchable, and feeding directly into your coaching outputs. Over a year of lessons, that compounds dramatically. Patterns the AI couldn&#39;t see before are suddenly visible.</p>
        </div>
      </div>

      {/* Observation */}
      <div className="tips-section" id="observation">
        <h2>Observation</h2>
        <p className="tips-welcome-text">
          For learning from <strong>watching others</strong>&mdash;clinics, lessons, your trainer riding your horse, audited shows, instructional video. The form uses its own category set, related to but distinct from the reflection categories, with two additional fields that connect what you saw to your own riding.
        </p>

        <h3>The Observation field shape</h3>
        <div className="tips-color-legend tips-color-legend--stacked">
          <div className="tips-color-item">
            <div className="tips-color-dot" style={{ background: '#4A90E2' }}></div>
            <span><strong>Technical Insight</strong>&mdash;the cue, correction, or technique that produced a visible change, and what happened in the horse or rider when it worked.</span>
          </div>
          <div className="tips-color-item">
            <div className="tips-color-dot" style={{ background: '#F5A623' }}></div>
            <span><strong>What Resonated</strong>&mdash;what stood out or clicked for you.</span>
          </div>
          <div className="tips-color-item">
            <div className="tips-color-dot" style={{ background: '#8B5CF6' }}></div>
            <span><strong>Horse-Rider Connection</strong>&mdash;what you noticed about the partnership.</span>
          </div>
          <div className="tips-color-item">
            <div className="tips-color-dot" style={{ background: '#C67B5C' }}></div>
            <span><strong>In your own riding</strong> <em>(unique to Observation)</em>&mdash;where you recognize this pattern in yourself, either a struggle you share or a quality you&#39;re working toward.</span>
          </div>
          <div className="tips-color-item">
            <div className="tips-color-dot" style={{ background: '#7ED321' }}></div>
            <span><strong>Concepts Confirmed</strong>&mdash;what was reinforced or validated.</span>
          </div>
          <div className="tips-color-item">
            <div className="tips-color-dot" style={{ background: '#D0021B' }}></div>
            <span><strong>Challenges Observed</strong>&mdash;what challenges you saw.</span>
          </div>
          <div className="tips-color-item">
            <div className="tips-color-dot" style={{ background: '#6B8E5F' }}></div>
            <span><strong>What I&#39;ll try next ride</strong> <em>(unique to Observation)</em>&mdash;the specific thing you&#39;ll attempt in your next ride because of this. Be concrete.</span>
          </div>
          <div className="tips-color-item">
            <div className="tips-color-dot" style={{ background: '#8B7355' }}></div>
            <span><strong>Additional Notes</strong>&mdash;anything else worth keeping.</span>
          </div>
        </div>

        <p>The form supports multiple observations per event, so a single clinic can produce several entries from the same session. You also tag the context (clinic, trainer-on-your-horse, schooling show, audited show, video, own video) and add context-specific detail (clinician name, rider level, session focus, etc.).</p>

        <div className="tips-tip-box">
          <h4>Highest-value observations</h4>
          <p>Watching your own trainer ride your horse, attending clinics with instructors whose methods you want to understand, and watching riders just one level above you&mdash;close enough to be immediately applicable.</p>
        </div>
      </div>

      {/* Events */}
      <div className="tips-section" id="events">
        <h2>Shows &amp; Journey Events</h2>
        <p className="tips-welcome-text">
          Two forms work together to help you get the most from shows, clinics, and other significant moments in your journey.
        </p>

        <h3>Show Preparation</h3>
        <p>Use this <strong>before</strong> a dressage show that&#39;s <strong>within the next six months</strong> (beyond that, plans change too much to be practical). The form captures your goals, your tests, your prep timeline, and your concerns&mdash;and feeds the Event Planner output, which builds a personalized week-by-week prep plan and show-day strategy.</p>

        <ul className="tips-bullets">
          <li><strong>Recognized shows:</strong> Scores count toward year-end awards. The plan emphasizes consistency and accuracy.</li>
          <li><strong>Schooling shows:</strong> Lower stakes, higher learning. The plan frames this as an experience-gathering opportunity.</li>
          <li><strong>Test selection:</strong> Choose your specific tests so the planner can reference exact movements, geometry, and common errors from the verified test database.</li>
        </ul>

        <h3>Journey Event Log</h3>
        <p>Use this <strong>after</strong> (or during) major events and changes in your training context&mdash;shows, clinics, environmental changes (new barn, footing changes, seasonal shifts), new equipment, training milestones, or any other significant shift. Horse health, vet visits, and bodywork have their own dedicated tracker; use the <Link to="/horse-health/new">Horse Health &amp; Soundness Tracker</Link> for those.</p>

        <div className="tips-emphasis">
          <strong>The power of pairing.</strong> When you submit a Show Preparation form AND log what actually happened afterward, the AI can analyze the gap between intention and outcome&mdash;one of the most revealing patterns in rider development.
        </div>
      </div>

      {/* Horse Health */}
      <div className="tips-section" id="horse-health">
        <h2>Horse Health &amp; Soundness</h2>
        <p className="tips-welcome-text">
          A dedicated log for everything related to your horse&#39;s physical wellbeing&mdash;from routine maintenance to concerns worth monitoring to emergencies. Each entry ties to a specific horse, so each builds its own health history.
        </p>

        <h3>How it differs from the Journey Event Log</h3>
        <p>The Event Log captures life events that affect your training context. The Health &amp; Soundness Tracker is <strong>horse-specific and clinical</strong>&mdash;a medical and care record, not a narrative log.</p>

        <h3>The three issue types</h3>
        <ul className="tips-bullets">
          <li><strong>Maintenance:</strong> Routine, planned care&mdash;chiro, massage, farrier, saddle fitting, PPE check-ins. Positive signals of attentive horsemanship.</li>
          <li><strong>Concern:</strong> Something worth monitoring&mdash;mild lameness, behavior shift, subtle change. Not yet an emergency.</li>
          <li><strong>Emergency:</strong> Acute or serious&mdash;colic, injury, significant lameness. Requires immediate professional attention.</li>
        </ul>

        <h3>Status tracking</h3>
        <p>Mark entries <strong>Ongoing</strong> or <strong>Resolved</strong>, and update them as things change. This gives the AI a longitudinal health picture to correlate with your training data&mdash;and when a concern resolves, updating the entry tells the AI the constraint has lifted.</p>

        <div className="tips-tip-box">
          <h4>Log every professional visit, not just problems</h4>
          <p>Chiro, massage, saddle fitter, and farrier visits are data. When the AI sees that bodywork two days before a breakthrough ride happened more than once, it can flag that connection. The AI&#39;s role with health data is correlation, not diagnosis&mdash;it will never second-guess your vet or your professionals.</p>
        </div>
      </div>

      {/* Rider Health */}
      <div className="tips-section" id="rider-health">
        <h2>Rider Health &amp; Wellness</h2>
        <p className="tips-welcome-text">
          A place to track dated health events that are affecting your riding&mdash;a PT appointment, a new injury, a flare-up of an old pattern, a chiro visit. It&#39;s a training journal, not a medical record.
        </p>

        <h3>What it is NOT</h3>
        <p>Not a medical record. Specific medications, dosages, formal diagnoses, and mental health treatment detail belong in your doctor&#39;s chart, not here.</p>

        <h3>How it differs from the Physical Self-Assessment</h3>
        <p>The Self-Assessment captures your <strong>baseline</strong>&mdash;long-standing asymmetries and patterns. The Health Log captures what&#39;s <strong>changing</strong>. If your right hip has been tight for years, that&#39;s the Self-Assessment. If it flared last Tuesday, that&#39;s the Health Log.</p>

        <h3>The three issue types</h3>
        <ul className="tips-bullets">
          <li><strong>Maintenance:</strong> Routine care like monthly massage.</li>
          <li><strong>Concern:</strong> Something to monitor over time.</li>
          <li><strong>Injury:</strong> An acute event.</li>
        </ul>

        <div className="tips-emphasis">
          <strong>Your rider health entries are private.</strong> The AI uses them to contextualize your training, but they are stripped from any shared-audience output (the Weekly Coach Brief, the Journey Map) before it&#39;s assembled. Numeric body data (weight, BF%, BMR) is never echoed back to you, and professionals are never referenced by first name.
        </div>
      </div>

      {/* Self-Assessments */}
      <div className="tips-section" id="assessments">
        <h2>Self-Assessments (Three of Them)</h2>
        <p className="tips-welcome-text">
          Three periodic check-ins that give the AI a structured snapshot of where you are right now&mdash;mentally, physically, and technically. Each one calibrates how the AI talks to you in your other outputs.
        </p>

        <h3>Rider Self-Assessment</h3>
        <p>Six sections: three scenarios, journey context, regulation strategies, attribute grids (max four selections each), and five self-rating sliders. A structured review of your mental skills, confidence, and focus areas across different aspects of dressage.</p>

        <h3>Physical Self-Assessment</h3>
        <p>Four sections: profile, coaching, a kinesthetic awareness slider (1&ndash;10), and tension body-map grids. An honest look at your physical readiness for riding&mdash;flexibility, core, balance, and any limitations. The kinesthetic awareness slider calibrates the physical cues you receive across the entire platform.</p>

        <h3>Technical &amp; Philosophical</h3>
        <p>Six sections of movement-by-movement and concept-by-concept ratings: arena geometry, gait mechanics (walk/trot/canter understanding), specific movements, the training scale (rhythm, suppleness, contact, impulsion, straightness, collection&mdash;each rated for both <em>understanding</em> and <em>application</em>), rider skills (independent seat, unilateral aids, timing of the aid), and a synthesis section covering your philosophy of dressage, biggest knowledge-body gap, formative influences, and your burning question. This is the deepest of the three&mdash;take your time.</p>

        <div className="tips-emphasis">
          <strong>Why three?</strong> They cover different territory and inform different outputs. The Rider Self-Assessment shapes how Grand Prix Thinking talks to you. The Physical Self-Assessment shapes Physical Guidance. The Technical &amp; Philosophical Assessment sharpens the Classical Master&#39;s and Technical Coach&#39;s reads of where you are.
        </div>

        <div className="tips-tip-box">
          <h4>When to reassess</h4>
          <p>Take your first self-assessments early, then revisit monthly or quarterly. They&#39;re especially valuable after a break from riding, recovery from an injury, a change in training intensity, or starting work with a new horse.</p>
        </div>
      </div>

      {/* Toolkit */}
      <div className="tips-section" id="toolkit">
        <h2>The Rider&#39;s Toolkit</h2>
        <p className="tips-welcome-text">
          Your personal catalog of off-horse discoveries&mdash;exercises, supplements, books, recovery practices, anything that might support your riding. It&#39;s not a to-do list and it&#39;s not a commitment. It&#39;s a place to put things so you don&#39;t lose them.
        </p>

        <h3>What belongs here</h3>
        <p>Anything you encountered that you wanted to remember. A Pilates sequence that might help open your hips. A magnesium supplement your trainer mentioned. A book on rider biomechanics. A breathing technique from a yoga class. A stretch that helped your lower back. If you had the thought &ldquo;I want to remember this,&rdquo; it belongs here.</p>

        <h3>How it differs from the Physical Self-Assessment</h3>
        <p>The Self-Assessment captures what&#39;s <em>true</em> about your body. The Toolkit captures what you&#39;re <em>trying</em>. They&#39;re complementary&mdash;the assessment tells you where you are; the Toolkit tracks what you&#39;re doing about it.</p>

        <h3>The five statuses</h3>
        <ul className="tips-bullets">
          <li><strong>Want to try</strong>&mdash;noted but not started yet.</li>
          <li><strong>Currently using</strong>&mdash;actively incorporating it.</li>
          <li><strong>Tried it</strong>&mdash;you&#39;ve given it a go; your follow-up notes capture what you found.</li>
          <li><strong>On pause</strong>&mdash;you were using it and have stopped temporarily.</li>
          <li><strong>Not for me</strong>&mdash;tried, didn&#39;t fit. Keeping the record so you remember you explored it.</li>
        </ul>
      </div>

      {/* Tools that ride with you */}
      <div className="tips-section" id="tools">
        <h2>Tools That Ride With You</h2>
        <p className="tips-welcome-text">
          Four lightweight tools that translate your coaching and self-awareness into something you can actually carry to the barn.
        </p>

        <h3><Link to="/practice-card">Practice Card</Link></h3>
        <p>A barn-ready, mobile-first card distilled from your latest coaching output. Three states:</p>
        <ul className="tips-bullets">
          <li><strong>Unconfirmed</strong>&mdash;the card opens with your suggested process goals editable. Adjust them so they fit today&#39;s ride.</li>
          <li><strong>Breath</strong>&mdash;a short transitional moment when you tap &ldquo;Ready to ride.&rdquo;</li>
          <li><strong>Locked</strong>&mdash;the card goes read-only and waits for you after your ride with a debrief CTA.</li>
        </ul>
        <p>Use it before mounting. The process goals you confirm here flow into your Post-Ride Debrief, so the loop closes naturally.</p>

        <h3><Link to="/pre-ride-ritual">Pre-Ride Ritual</Link></h3>
        <p>A custom routine you build from up to five blocks. Building a pre-ride ritual is one of the single most useful habits you can adopt&mdash;it focuses your attention before you mount, and the same ritual repeated reliably becomes a cue for your nervous system that it&#39;s time to ride. Available blocks:</p>
        <ul className="tips-bullets">
          <li><strong>Barn Aisle Prep</strong>&mdash;pre-ride physical checklist drawn from your Physical Guidance.</li>
          <li><strong>This Week in GPT</strong>&mdash;a quick read of your current Grand Prix Thinking assignment for this week.</li>
          <li><strong>Practice Card</strong>&mdash;set or confirm today&#39;s process goals before mounting.</li>
          <li><strong>Pre-Lesson Summary</strong>&mdash;the rider-prep summary described below.</li>
          <li><strong>Visualization Script</strong>&mdash;run an opening movement in your mind before mounting.</li>
          <li><strong>Custom</strong>&mdash;your own block, your own routine.</li>
        </ul>
        <p>Drag to reorder. Whatever sequence works for you is the right one. (See <a href="#tips">Habits That Compound</a> below for an example of how to weave these together.)</p>

        <h3><Link to="/lesson-prep">Pre-Lesson Summary</Link></h3>
        <p><strong>This is a tool for you, the rider</strong>&mdash;a focused summary you read before a lesson so you arrive clear on what you&#39;ve been working on, where the patterns are, and what you want to ask your instructor. It pulls from your recent debriefs and reflections and surfaces them in one place.</p>
        <p>Sharing it with your instructor is an <em>optional</em> secondary use. If you want to, there&#39;s a &ldquo;Share with coach&rdquo; link on the summary itself. Your instructor only ever sees this curated summary&mdash;never your raw debriefs or reflections.</p>

        <h3><Link to="/toolkit/visualization/new">Visualization Script</Link></h3>
        <p>See the dedicated <a href="#viz-scripts">Visualization Scripts</a> section below.</p>
      </div>

      {/* Visualization Scripts */}
      <div className="tips-section" id="viz-scripts">
        <h2>Visualization Scripts</h2>
        <p className="tips-welcome-text">
          Visualization is one of the most evidence-backed mental-skills practices in sport, and it&#39;s often the missing piece for adult amateur riders. The Visualization Script tool generates a personalized, multi-block mental rehearsal script for a specific movement, problem focus, and context (training ride, show warm-up, or competition test).
        </p>

        <h3>How to generate one</h3>
        <ol className="tips-bullets-numbered">
          <li>Open the <Link to="/toolkit">Rider&#39;s Toolkit</Link> and tap <strong>Build Visualization Script</strong> at the top. (You can also reach it from the Visualization block of your Pre-Ride Ritual or directly via the Build Visualization Script button.)</li>
          <li><strong>Pick a movement.</strong> Foundation &amp; Balance, Lateral Work, Transitions &amp; Changes, or Advanced Collection. Some movements have sub-options (which gait, which transition, how many tempi).</li>
          <li><strong>Choose a problem focus.</strong> What you&#39;re working on with that movement.</li>
          <li><strong>Choose a reference type.</strong> Free-text description, recall a recent ride, etc.</li>
          <li><strong>Choose the context.</strong> Training ride, show warm-up, or competition test. The script adapts.</li>
          <li><strong>Choose a sensory preference</strong> if you have one, and pick a length (standard or extended).</li>
          <li><strong>Generate.</strong> A multi-block script appears with timed phases. Each block has a built-in timer.</li>
        </ol>

        <h3>How to find scripts you&#39;ve already created</h3>
        <p>Every script you generate is saved to your <Link to="/toolkit">Rider&#39;s Toolkit</Link>. Filter the Toolkit by &ldquo;Visualization Scripts&rdquo; to see only your scripts; tap any one to open and use it again. You can also save scripts to a specific session for later recall.</p>

        <div className="tips-tip-box">
          <h4>The Weekly Focus shortcut</h4>
          <p>Your Weekly Focus on the Dashboard includes a Visualization Script card. When the AI sees a movement that&#39;s ripe for mental rehearsal&mdash;something showing up repeatedly in your debriefs&mdash;it pre-fills a visualization recommendation. Tap the card and the script form opens with the movement, problem, context, and length already chosen for you.</p>
        </div>

        <div className="tips-emphasis">
          <strong>Use them before you ride.</strong> Visualization Scripts are designed to be run mentally in the few minutes before you mount&mdash;or the night before a show. The Pre-Ride Ritual&#39;s Visualization block links right to your most recent script.
        </div>
      </div>

      {/* Fresh Start */}
      <div className="tips-section" id="fresh-start">
        <h2>Fresh Start</h2>
        <p className="tips-welcome-text">
          The re-onboarding form for when you&#39;ve been away from the platform&mdash;a few weeks, a few months, longer. Fresh Start gives you a low-friction way back in without trying to backfill what you missed.
        </p>

        <h3>How it works</h3>
        <p>Two required fields: a confidence rating (1&ndash;10) and a state toggle:</p>
        <ul className="tips-bullets">
          <li><strong>State A</strong>&mdash;you haven&#39;t been riding during the gap. The form keeps it simple.</li>
          <li><strong>State B</strong>&mdash;you have been riding, just not logging. The form opens additional fields: what you&#39;ve been working on, what&#39;s going well, what&#39;s been difficult, and anything else.</li>
        </ul>
        <p>When you submit, the Empathetic Coach writes you back with a multi-paragraph response&mdash;a warm welcome and a re-orientation. From there, you pick up the dataset from your next entry. There&#39;s no catch-up required.</p>

        <div className="tips-tip-box">
          <h4>Don&#39;t backfill</h4>
          <p>Reconstructing rides from memory introduces noise. The AI works with what you give it from today forward. If something significant happened during the gap, log it as a Journey Event so the AI knows the gap had a shape.</p>
        </div>
      </div>

      {/* Dashboard */}
      <div className="tips-section" id="dashboard">
        <h2>Your Dashboard</h2>
        <p className="tips-welcome-text">
          The Dashboard is your home base once you&#39;ve graduated from the Quick Start Map. It pulls together your stats, this week&#39;s coaching focus, recent rides, and quick links to every form and every output.
        </p>

        <h3>The three top blocks</h3>
        <p>Three primary blocks anchor the top of the Dashboard. Their order is configurable.</p>
        <ul className="tips-bullets">
          <li><strong>Stats</strong>&mdash;total rides, current streak, data coverage, and recent activity at a glance.</li>
          <li><strong>Focus</strong>&mdash;your Weekly Focus, Practice Card preview, and Pre-Lesson Summary preview if relevant.</li>
          <li><strong>Data</strong>&mdash;movement coverage heatmap, process goal bars, and journey snapshot.</li>
        </ul>

        <h3>Arrange mode</h3>
        <p>Tap the &ldquo;Arrange&rdquo; control to enter rearrange mode. Drag the three top blocks into the order that works for you, then save. Your layout persists across devices.</p>

        <h3>Weekly Focus &mdash; your week, distilled</h3>
        <p>The Weekly Focus block is structured to orient you for the week and give you links to all the depth you need from a single place. Think of it as your week&#39;s control panel.</p>
        <ul className="tips-bullets">
          <li><strong>Celebration</strong>&mdash;the AI&#39;s read on what to acknowledge from last week.</li>
          <li><strong>Coaching</strong>&mdash;your priority this week and the headline patterns, with a link into the full Multi-Voice Coaching report.</li>
          <li><strong>GPT (Grand Prix Thinking)</strong>&mdash;this week&#39;s assignment from your active 30-day mental-skills program. Tick items off as you do them.</li>
          <li><strong>Physical</strong>&mdash;this week&#39;s assignment from your active 30-day Physical Guidance program. Tick items off as you do them.</li>
          <li><strong>Visualization</strong>&mdash;the script the AI recommends generating this week, pre-filled from your patterns. One tap takes you into the form.</li>
          <li><strong>Show</strong>&mdash;if you have an upcoming Show Preparation, this surfaces show-specific items.</li>
        </ul>
        <p>You can <strong>pin</strong> the cards you want at the top, <strong>mark them done</strong>, or <strong>collapse</strong> ones you don&#39;t need this week. There&#39;s also a Priority Mode that elevates just one focus when you want to keep things simple.</p>

        <h3>The drawer groups</h3>
        <p>Below the top blocks, the Dashboard organizes every form and every view into groups:</p>
        <ul className="tips-bullets">
          <li><strong>Record</strong>&mdash;Debrief, Quick Capture, Reflection, Observation, Lesson Notes, Horse Health, Rider Health, Journey Event</li>
          <li><strong>Plan</strong>&mdash;Show Preparation</li>
          <li><strong>Assess</strong>&mdash;Rider Self-Assessment, Technical &amp; Philosophical, Physical Self-Assessment, Toolkit</li>
          <li><strong>Review</strong>&mdash;every list page where you browse, edit, or delete past entries (All Debriefs, Quick Captures, All Reflections, Observations, Lesson Notes, Health Log, Rider Health Log, Journey Events, Show Preparations, Toolkit)</li>
          <li><strong>Learn</strong>&mdash;the Learn area (see below)</li>
        </ul>

        <div className="tips-emphasis">
          <strong>The Review group is where you edit or delete past entries.</strong> Each &ldquo;All [Thing]&rdquo; link opens the list of saved entries; tap an entry to open, edit, or soft-delete it.
        </div>
      </div>

      {/* Settings */}
      <div className="tips-section" id="settings">
        <h2>Settings</h2>
        <p className="tips-welcome-text">
          <Link to="/settings">Settings</Link> lives in the nav. It&#39;s where you tune how the platform looks and feels, who you share with, and what you hear about by email.
        </p>

        <h3>App Preferences</h3>
        <ul className="tips-bullets">
          <li><strong>Landing Page</strong>&mdash;where you arrive when you open the app. Choose between the Dashboard and the Quick Start Guide. New riders default to Quick Start; switch to Dashboard once you&#39;ve graduated.</li>
          <li><strong>Coaching Output Display</strong>&mdash;how outputs reveal themselves. <em>Progressive</em> opens one section at a time. <em>Expand all</em> shows everything at once. <em>Focus Mode</em> shows one coaching voice only.</li>
          <li><strong>Default Coaching Voice</strong>&mdash;which voice opens first: All Voices (defaults to Classical), Empathetic, Classical, Technical, or Practical Strategist. You can always switch tabs.</li>
          <li><strong>In-Line Voice Fragments</strong>&mdash;the brief 1&ndash;2 sentence coaching cues embedded throughout your outputs. Toggle off if you find them busy; adds about 5% to generation time when on.</li>
          <li><strong>Weekly Focus Block</strong>&mdash;show or hide the Weekly Focus on your Dashboard.</li>
        </ul>

        <h3>Coach Sharing</h3>
        <p>Add your coaches here. Today, sharing is manual: you generate a Pre-Lesson Summary and use the &ldquo;Share with coach&rdquo; link to send it. Your coaches in Settings is your roster of who you typically send to. Automatic delivery is a planned future enhancement. When you do share, your coach receives only the Pre-Lesson Summary&mdash;never your full reflections, raw notes, or personal debrief entries.</p>

        <h3>Notifications</h3>
        <p>Product updates, &ldquo;your output is ready&rdquo; emails, and streak reminders. Toggle individually.</p>

        <h3>Privacy</h3>
        <p>Aggregate opt-in (anonymous, aggregated stats only) and analytics cookies. Both default on; both can be turned off here.</p>

        <h3>Account</h3>
        <p>Email, password, subscription, and data export.</p>
      </div>

      {/* Learn */}
      <div className="tips-section" id="learn">
        <h2>The Learn Section</h2>
        <p className="tips-welcome-text">
          Reference material, deeper context, and the people (and books) behind the four coaching voices. The Learn area lives under its own group on the Dashboard.
        </p>

        <ul className="tips-bullets">
          <li><strong>Arena Geometry Trainer</strong>&mdash;letters, lines, and the geometry of the dressage arena.</li>
          <li><strong>Test Explorer</strong>&mdash;browse the verified dressage test database. Movements, coefficients, scores, common errors. Useful for show prep and for understanding what comes next.</li>
          <li><strong>Meet Your Coaches</strong>&mdash;the four voices in their own words. Personalities, lineages, what each one notices.</li>
          <li><strong>Recommended Reading</strong>&mdash;the books your four coaches most often press into a rider&#39;s hands.</li>
          <li><strong>Science &amp; Research</strong>&mdash;the learning theory behind the platform.</li>
        </ul>
      </div>

      {/* Tips */}
      <div className="tips-section" id="tips">
        <h2>Habits That Compound</h2>
        <p className="tips-welcome-text">
          A handful of small habits make a large difference in the quality of your coaching outputs. The most powerful is a real ride-day loop&mdash;a sequence you repeat consistently. Here&#39;s an example you can borrow or adapt.
        </p>

        <div className="tips-emphasis">
          <strong>A ride-day loop that works</strong>
          <ol className="tips-bullets-numbered" style={{ marginTop: '12px' }}>
            <li><strong>Open your Pre-Ride Ritual.</strong> Walk through the blocks you&#39;ve set up.</li>
            <li><strong>Review this week&#39;s Weekly Focus &mdash; GP Thinking section.</strong> Pull up the mental-skills assignment for the week and do whatever piece of it fits today.</li>
            <li><strong>Review this week&#39;s Weekly Focus &mdash; Physical section.</strong> Do the body-prep items that apply (barn-aisle prep, mobility cues).</li>
            <li><strong>If you&#39;re preparing for a lesson, open your Pre-Lesson Summary.</strong> Read what you&#39;ve been working on and what you want to bring to today&#39;s lesson.</li>
            <li><strong>Open the Practice Card.</strong> Confirm or set your intentions for the ride. Lock the card.</li>
            <li><strong>Ride.</strong></li>
            <li><strong>Complete your Post-Ride Debrief</strong> right after, while you&#39;re still at the barn. Two to five minutes.</li>
            <li><strong>Later that day or the next, add your Lesson Notes</strong> (if applicable). Use the transcript flow if you recorded the lesson.</li>
          </ol>
          <p style={{ marginTop: '12px', marginBottom: '0' }}>The first few days the loop will feel deliberate. After a few weeks it&#39;s automatic, and the data quality the AI gets from you compounds.</p>
        </div>

        <h3>Build a pre-ride ritual you&#39;ll actually do</h3>
        <p>The ritual works because it&#39;s repeated. Pick the four or five blocks that fit your actual life at the barn and arrange them in the order that flows. A short, consistent ritual beats a long ideal one you skip.</p>

        <h3>Use the weekly coaching-focus field</h3>
        <p>The single highest-leverage one-line habit. In the weekly check-in step of the Reflection form, tell your coaches what you&#39;re wrestling with this week. They actually address it.</p>

        <h3>Write for future you, not for perfection</h3>
        <p>Three specific sentences beat one vague paragraph. &ldquo;Slow to pick up the right lead&rdquo; is more useful than &ldquo;horse was stiff.&rdquo; The AI finds patterns in specifics, not generalities.</p>

        <h3>Use voice input at the barn</h3>
        <p>On mobile, tap the microphone icon in any text field. Talk through observations while untacking&mdash;faster than typing, and you capture details you&#39;d forget by the time you get home.</p>

        <h3>Record your lessons and use the transcript flow</h3>
        <p>You can&#39;t take notes from the saddle. Record the lesson on your phone, transcribe it with any tool, paste the transcript into Lesson Notes, and let the AI organize it. Over a year, this single habit changes what your coaching can see.</p>

        <h3>Be honest about the hard stuff</h3>
        <p>The AI learns most from obstacles and challenges. If you only record wins, the analysis won&#39;t have enough signal to help you break through plateaus.</p>

        <h3>Use &ldquo;compared to&rdquo; language</h3>
        <p>Five extra seconds, big payoff: &ldquo;more balanced than last Tuesday,&rdquo; &ldquo;stiffer than warmup,&rdquo; &ldquo;better after the walk break.&rdquo; Context creates patterns.</p>
      </div>

      {/* FAQ */}
      <div className="tips-section" id="faq">
        <h2>Frequently Asked Questions</h2>

        <details className="tips-faq">
          <summary>How do I edit or delete an entry I already saved?</summary>
          <p>From the Dashboard, open the <strong>Review</strong> group. Each entry type has its own list page (All Debriefs, Quick Captures, All Reflections, Observations, Lesson Notes, Health Log, Rider Health Log, Journey Events, Show Preparations, Toolkit). Tap any entry to open, edit, or delete it. Deletes are <em>soft</em>&mdash;the entry is hidden, not destroyed&mdash;so if you change your mind, get in touch and we can restore it.</p>
        </details>

        <details className="tips-faq">
          <summary>Can I export my data?</summary>
          <p>Yes. Every list page in the Review group has CSV and JSON export buttons. Your data belongs to you.</p>
        </details>

        <details className="tips-faq">
          <summary>Voice input isn&#39;t working. What should I check?</summary>
          <p>Voice input uses the browser&#39;s Web Speech API. On iPhone, make sure Safari has microphone permission (Settings &rarr; Safari &rarr; Microphone). On Android, check your browser&#39;s site permissions. Voice input requires a network connection and works best in Chrome and Safari.</p>
        </details>

        <details className="tips-faq">
          <summary>Why did my save not work on my iPhone?</summary>
          <p>iPhone and iPad Safari sometimes pause network activity when you switch apps or lock your screen, even if our app already showed a save message. When you save a debrief, reflection, or assessment, stay on the page until you see the full green confirmation card before navigating away. If your save didn&#39;t go through, your draft is stored locally for 7 days&mdash;reopen the same form and a recovery banner will offer to restore it.</p>
        </details>

        <details className="tips-faq">
          <summary>How many horses can I track?</summary>
          <p>No limit. Create a Horse Profile for each horse you ride regularly. The AI tracks patterns for each partnership separately.</p>
        </details>

        <details className="tips-faq">
          <summary>I missed a week or more. How do I catch up?</summary>
          <p>Use <Link to="/forms/fresh-start">Fresh Start</Link>. It&#39;s the re-onboarding form for when you&#39;ve been away. Don&#39;t try to backfill old rides from memory&mdash;it introduces noise. Fresh Start gets you a warm welcome back from the Empathetic Coach and picks the dataset up from your next entry. If something significant happened during the gap, log it as a Journey Event so the AI knows the gap had a shape.</p>
        </details>

        <details className="tips-faq">
          <summary>How do I tell my coaches what I want help with this week?</summary>
          <p>In the weekly check-in step of the <Link to="/reflections/new">Reflection</Link> form, there&#39;s a field called &ldquo;Anything you want your coaches to focus on this week?&rdquo; Use it. Ask a question, name something you&#39;re wrestling with, flag a pattern. Your coaches read every word you write there&mdash;it&#39;s the most direct way to steer your coaching.</p>
        </details>

        <details className="tips-faq">
          <summary>How do I generate a Visualization Script?</summary>
          <p>From the <Link to="/toolkit">Rider&#39;s Toolkit</Link>, tap <strong>Build Visualization Script</strong> at the top of the list. Choose a movement (with sub-options where applicable), a problem focus, a reference type, a context (training ride, show warm-up, or competition test), an optional sensory preference, and a length. The form generates a multi-block script with timed phases. You can also reach the form from the Visualization card in your Weekly Focus, where the choices are pre-filled based on your patterns.</p>
        </details>

        <details className="tips-faq">
          <summary>Where do I find a Visualization Script I already created?</summary>
          <p>All your generated scripts live in your <Link to="/toolkit">Rider&#39;s Toolkit</Link>. Use the Toolkit filter to show only Visualization Scripts. Tap any script to open and run it again, or attach it to a specific session for later recall. The Pre-Ride Ritual&#39;s Visualization block also links to your most recently used script.</p>
        </details>

        <details className="tips-faq">
          <summary>Can I record my lesson and have the AI organize my notes?</summary>
          <p>Yes&mdash;this is one of the most useful features in the platform. Record the lesson on your phone or a recorder, transcribe the audio with any transcription tool (Otter, Whisper, your phone&#39;s built-in transcription, anything that produces text), then open Lesson Notes, expand the transcript panel, paste the full transcript, and tap the process button. The AI identifies your instructor&#39;s voice and organizes the guidance into Movements, Purpose, Cues, and Coach&#39;s Eye. Review for any mangled dressage terms, add your own reflections, and save.</p>
        </details>

        <details className="tips-faq">
          <summary>What&#39;s the difference between a Reflection, a Debrief, and an Observation?</summary>
          <p><strong>Debrief</strong> = what happened in <em>your</em> ride, captured right after. Five narrative areas. <strong>Reflection</strong> = a deeper, weekly exploration in one of the six categories, with curated prompts. <strong>Observation</strong> = what you learned watching <em>others</em> ride, with two extra fields (&ldquo;In your own riding&rdquo; and &ldquo;What I&#39;ll try next ride&rdquo;) that translate it into action.</p>
        </details>

        <details className="tips-faq">
          <summary>How do I change my email, password, or notification settings?</summary>
          <p>From <Link to="/settings">Settings</Link>. Account section for email/password; Notifications section for email preferences.</p>
        </details>

        <details className="tips-faq">
          <summary>Is my data private?</summary>
          <p>Yes. Your data is stored securely and used exclusively to generate your personalized coaching. It&#39;s never shared with other riders, and your coaching analysis is private to you. Rider Health entries are additionally stripped from any output that could be shared (Weekly Coach Brief, Journey Map). The only thing you ever share with a coach is a Pre-Lesson Summary, and only by clicking the &ldquo;Share with coach&rdquo; link yourself.</p>
        </details>

        <details className="tips-faq">
          <summary>What is First Light and can I regenerate it?</summary>
          <p>First Light is your first AI coaching output, generated after you complete the six-prompt First Light wizard. You can regenerate it <strong>one time</strong> after you&#39;ve added new data&mdash;a debrief, reflection, observation, or event. It retires automatically after your fifth debrief, when Multi-Voice Coaching takes over with the full weekly coaching arc.</p>
        </details>

        <details className="tips-faq">
          <summary>Do I need to fill out every form?</summary>
          <p>No. Profiles, debriefs, and reflections are the core data that powers most coaching. Everything else (events, observations, self-assessments, health logs, lesson notes) adds richness and enables specific features. Start with the core, layer in the rest as opportunities come up.</p>
        </details>

        <details className="tips-faq">
          <summary>Where do I read the AI outputs?</summary>
          <p>The <Link to="/insights">Insights page</Link>&mdash;tabs across the top for Coaching Voices, Journey Map, Grand Prix Thinking, and Data Visualizations. See the <Link to="/outputs-tips-and-faq">Outputs Guide</Link> for what each one contains and when it appears.</p>
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
        <p className="tips-quote">&ldquo;Five rides show you what happened. Twenty rides reveal why it keeps happening.<br />Fifty rides show you the conditions that create your best work.&rdquo;</p>
        <p className="tips-footer-tagline">Illuminate Your Journey</p>
      </div>
    </div>
  );
}
