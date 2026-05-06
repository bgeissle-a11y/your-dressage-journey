import { Link } from 'react-router-dom';
import './MeetYourCoaches.css';

export default function MeetYourCoaches() {
  return (
    <div className="myc-page">
      <main className="myc-main">

        <Link to="/dashboard" className="myc-back">Back to Learn</Link>

        {/* ── HERO ── */}
        <section className="myc-hero">
          <div className="myc-hero-eyebrow">Four Voices, One Journey</div>
          <h1>Meet Your <em>Coaches</em></h1>
          <p className="myc-hero-lede">Every output Your Dressage Journey produces is shaped by four distinct coaching voices &mdash; different lineages, different lenses, different registers. Together they offer a fuller view than any single coach could. Meet them, in their own words.</p>
          <div className="myc-hero-rule"></div>
        </section>

        {/* ── CLASSICAL MASTER ── */}
        <section className="myc-coach myc-classical">
          <div className="myc-coach-head">
            <div className="myc-coach-icon-row">
              <div className="myc-coach-icon">&#127919;</div>
              <div className="myc-coach-name">The Classical Master</div>
            </div>
            <div className="myc-coach-meta">
              <div className="myc-coach-meta-row">
                <div className="myc-coach-meta-label">Lens</div>
                <div className="myc-coach-meta-value">Training Scale, classical principles, horse welfare, long-term development</div>
              </div>
              <div className="myc-coach-meta-row">
                <div className="myc-coach-meta-label">Lineage</div>
                <div className="myc-coach-meta-value">Podhajsky, de Kunffy, Kyrklund</div>
              </div>
            </div>
          </div>
          <div className="myc-coach-body">
            <p className="myc-coach-intro">I come from the classical tradition &mdash; Podhajsky and the Spanish Riding School, de Kunffy's articulation of <em>why</em> we do this work, Kyra Kyrklund's proof that the old principles still win at the highest modern levels. When you read what I write, you are reading what those riders would say to you if they could. I am not the voice for this week's lesson plan; I am the voice for the long arc of your riding. Come to me when the work begins to feel mechanical, when shortcuts start to look reasonable, when you want to remember <em>why</em> we ride this way at all. <em>Why not the first time?</em> Because correctness is built from a thousand quiet repetitions before the moment it appears.</p>
          </div>
          <div className="myc-coach-foot">"Why not the first time?"</div>
        </section>

        {/* ── EMPATHETIC COACH ── */}
        <section className="myc-coach myc-empathetic">
          <div className="myc-coach-head">
            <div className="myc-coach-icon-row">
              <div className="myc-coach-icon">&#11088;</div>
              <div className="myc-coach-name">The Empathetic Coach</div>
            </div>
            <div className="myc-coach-meta">
              <div className="myc-coach-meta-row">
                <div className="myc-coach-meta-label">Lens</div>
                <div className="myc-coach-meta-value">Rider psychology, confidence, partnership, the human side of riding</div>
              </div>
              <div className="myc-coach-meta-row">
                <div className="myc-coach-meta-label">Lineage</div>
                <div className="myc-coach-meta-value">Jane Savoie</div>
              </div>
            </div>
          </div>
          <div className="myc-coach-body">
            <p className="myc-coach-intro">I am the voice that knows you bring more than your body to the saddle. The bad day at work, the rough night of sleep, the comparison spiral after a hard lesson &mdash; those things ride with you whether we want them to or not, and I'm here for that part. Adult amateurs are doing one of the hardest things in this sport: showing up consistently, in real life, without anyone owing them progress &mdash; and that is worthy work. My lineage is Jane Savoie, who taught a generation of riders that confidence is a learnable skill, not a fixed trait. Come to me when you're being too hard on yourself, when fear arrives unannounced, when you need someone to remind you that you're allowed to still be learning. <em>You've got this</em> &mdash; and I mean it.</p>
          </div>
          <div className="myc-coach-foot">"You've got this."</div>
        </section>

        {/* ── TECHNICAL COACH ── */}
        <section className="myc-coach myc-technical">
          <div className="myc-coach-head">
            <div className="myc-coach-icon-row">
              <div className="myc-coach-icon">&#128300;</div>
              <div className="myc-coach-name">The Technical Coach</div>
            </div>
            <div className="myc-coach-meta">
              <div className="myc-coach-meta-row">
                <div className="myc-coach-meta-label">Lens</div>
                <div className="myc-coach-meta-value">Biomechanics, position, aids, timing, cause-and-effect</div>
              </div>
              <div className="myc-coach-meta-row">
                <div className="myc-coach-meta-label">Lineage</div>
                <div className="myc-coach-meta-value">Beth Baumert, Sally Swift, Susanne von Dietze, Mary Wanless</div>
              </div>
            </div>
          </div>
          <div className="myc-coach-body">
            <p className="myc-coach-intro">I am the voice for the body &mdash; yours and your horse's &mdash; and the precise mechanics of how one shapes the other. My language comes from Sally Swift, Mary Wanless, Susanne von Dietze, and Beth Baumert: the writers who turned "sit straighter" into a teachable, testable system. I will not tell you to relax; I will tell you which muscle to soften, which line to align, which image to carry into your next ride. Come to me when you've been told what to fix but not how, when something feels off in the saddle and you can't name it, when you want to stop guessing and start knowing. <em>Did you feel that?</em> You will.</p>
          </div>
          <div className="myc-coach-foot">"Did you feel that?"</div>
        </section>

        {/* ── PRACTICAL STRATEGIST ── */}
        <section className="myc-coach myc-strategist">
          <div className="myc-coach-head">
            <div className="myc-coach-icon-row">
              <div className="myc-coach-icon">&#128203;</div>
              <div className="myc-coach-name">The Practical Strategist</div>
            </div>
            <div className="myc-coach-meta">
              <div className="myc-coach-meta-row">
                <div className="myc-coach-meta-label">Lens</div>
                <div className="myc-coach-meta-value">Goals, timelines, training plans, competition prep, measurable progress</div>
              </div>
              <div className="myc-coach-meta-row">
                <div className="myc-coach-meta-label">Lineage</div>
                <div className="myc-coach-meta-value">Reiner and Ingrid Klimke; the systematic German tradition</div>
              </div>
            </div>
          </div>
          <div className="myc-coach-body">
            <p className="myc-coach-intro">I am the voice that respects your time. You have lessons that cost money, a horse who isn't getting younger, and a calendar full of life that has nothing to do with riding &mdash; and I will help you turn that reality into a program. My lineage is Reiner and Ingrid Klimke and the systematic German tradition: writers who give you measurable structure instead of inspiration &mdash; stage-by-stage progressions, exact timelines, and clear indicators of when to move on and when to wait. I will not give you motivational pep talks. I will give you what to ride this week, what to aim for this month, what to watch for at the next show. Come to me when you have a goal &mdash; a level, a score, an event &mdash; and you need a plan that fits your real life. <em>Be accurate!</em></p>
          </div>
          <div className="myc-coach-foot">"Be accurate!"</div>
        </section>

        {/* ── CROSS-LINK ── */}
        <section className="myc-cross-link">
          <h3>Want to read what they read?</h3>
          <p>Each coach has selected the books they most often press into a rider's hands &mdash; the titles that shaped their voice, in their own words.</p>
          <Link to="/learn/recommended-reading">See Recommended Reading</Link>
        </section>

        <div className="myc-page-foot">Illuminate Your Journey.</div>

      </main>
    </div>
  );
}
