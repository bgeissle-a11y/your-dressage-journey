import { Link } from 'react-router-dom';
import './RecommendedReading.css';

export default function RecommendedReading() {
  return (
    <div className="rr-page">
      <main className="rr-main">

        <Link to="/dashboard" className="rr-back">Back to Learn</Link>

        {/* ── HERO ── */}
        <section className="rr-hero">
          <div className="rr-hero-eyebrow">From Your Four Coaches</div>
          <h1>Recommended <em>Reading</em></h1>
          <p className="rr-hero-lede">A bibliography from the four coaching voices that guide riders through Your Dressage Journey. Each voice has selected the titles they most often press into a rider's hands &mdash; written in their own words, in their own register.</p>
          <div className="rr-hero-rule"></div>
        </section>

        {/* ── CLASSICAL MASTER ── */}
        <section className="rr-voice rr-classical">
          <div className="rr-voice-head">
            <div className="rr-voice-icon">&#127919;</div>
            <div className="rr-voice-name">The Classical Master</div>
            <div className="rr-voice-subtitle">Principles &amp; Philosophy</div>
            <p className="rr-voice-intro">There are books a rider returns to over the seasons, the way a horse returns to the rail to find its balance. These are mine. Read them slowly. Read them again. The horse you ride a year from now will thank you for the time you spent in their pages.</p>
          </div>

          <div className="rr-voice-books">
            <div className="rr-book">
              <div className="rr-book-title">The Complete Training of Horse and Rider</div>
              <div className="rr-book-author">Alois Podhajsky</div>
              <p className="rr-book-desc">If a rider were to keep only one book on the shelf, I would gently suggest this one. Colonel Podhajsky distilled a quarter-century at the Spanish Riding School into a single volume, and what he gives you is not a recipe but a way of seeing &mdash; the rider's seat, the horse's gymnastic development, the long arc of correctness. He writes as a man who has lived inside the work, and he will not let you hurry. Keep it within reach for the years, not the weekends.</p>
            </div>

            <div className="rr-book">
              <div className="rr-book-title">Gymnasium of the Horse</div>
              <div className="rr-book-author">Gustav Steinbrecht</div>
              <p className="rr-book-desc">This is the book that quietly underpins almost every German training manual that followed it, and you can feel that lineage on every page. Steinbrecht's most-quoted line &mdash; "ride your horse forward and set him straight" &mdash; is not a slogan; it is a whole philosophy compressed into seven words. The text is dense, sometimes severe, and that is precisely the gift: each sentence has been weighed. I ask my riders to read a single chapter, then put the book down and think for a week. <em>Why not the first time?</em> Because Steinbrecht teaches you that the first time is built from a thousand quiet, correct repetitions before it.</p>
            </div>

            <div className="rr-book">
              <div className="rr-book-title">The Ethics and Passions of Dressage</div>
              <div className="rr-book-author">Charles de Kunffy</div>
              <p className="rr-book-desc">De Kunffy writes about dressage the way a philosopher writes about virtue, and that is not an accident &mdash; for him, the two are the same subject. He asks the questions our sport too often skips: what does competition do to classical horsemanship, what kind of person are we becoming as we ride, what do we owe the horse who carries us? Every page invites the rider to choose tradition, kindness, and patience over shortcuts. When I want a rider to remember <em>why</em> we do this work, this is the book I send them home with.</p>
            </div>

            <div className="rr-book">
              <div className="rr-book-title">Reflections on Equestrian Art</div>
              <div className="rr-book-author">Nuno Oliveira</div>
              <p className="rr-book-desc">Oliveira is not in the central German-Austrian line that shapes much of my thinking, yet I recommend him without hesitation, because no one in the modern era has written more beautifully about <em>lightness</em> &mdash; and lightness is the moral center of classical riding. His chapters are short, almost like prose poems, and they emphasize harmony, respect, and the ear that listens for the horse's offer. Read him when you feel the work becoming mechanical, or when you have begun to mistake force for influence. He will return you to the art.</p>
            </div>
          </div>

          <div className="rr-voice-foot">"Why not the first time?"</div>
        </section>

        {/* ── EMPATHETIC COACH ── */}
        <section className="rr-voice rr-empathetic">
          <div className="rr-voice-head">
            <div className="rr-voice-icon">&#11088;</div>
            <div className="rr-voice-name">The Empathetic Coach</div>
            <div className="rr-voice-subtitle">Rider Psychology &amp; Partnership</div>
            <p className="rr-voice-intro">The books on this list aren't just about riding &mdash; they're about being a whole human in the saddle. They normalize the hard parts: the fear that shows up out of nowhere, the comparison spiral after a bad lesson, the way a rough day at work follows you into the arena. If any of that sounds familiar, you're not alone, and these authors will tell you so with so much warmth.</p>
          </div>

          <div className="rr-voice-books">
            <div className="rr-book">
              <div className="rr-book-title">That Winning Feeling!</div>
              <div className="rr-book-author">Jane Savoie</div>
              <p className="rr-book-desc">Jane Savoie is the patron saint of every adult amateur who has ever frozen at the in-gate, and this is the book that started it all. She takes the dense world of sport psychology and translates it into language that feels like a kind friend talking you through your nerves &mdash; visualization, "as if" thinking, swapping "problem" for "challenge." What I love most is that she never makes you feel small for struggling; she assumes you're capable and worthy of feeling that way too. If your inner critic has been loud lately, start here. <em>You've got this.</em></p>
            </div>

            <div className="rr-book">
              <div className="rr-book-title">It's Not Just About the Ribbons</div>
              <div className="rr-book-author">Jane Savoie</div>
              <p className="rr-book-desc">This is the Savoie book to read once you've made friends with the first one. Where <em>That Winning Feeling!</em> gives you the toolkit, <em>Ribbons</em> gives you the perspective &mdash; that the score sheet is not the relationship, that progress is not always visible, and that a rider's life with a horse is meant to enrich a whole life, not measure it. Savoie wrote it for the rider who keeps wondering "is this enough?" &mdash; and her answer is generous. I reach for it whenever a student is being too hard on herself.</p>
            </div>

            <div className="rr-book">
              <div className="rr-book-title">How Two Minds Meet</div>
              <div className="rr-book-author">Beth Baumert</div>
              <p className="rr-book-desc">Baumert's first book lives on the Technical Coach's shelf, but this follow-up belongs squarely with us. Here she turns from the body to the mind &mdash; the rider's analytical mind, the rider's sensory mind, and the horse's beautifully different mind &mdash; and she gives you concrete ways to settle into the "non-thinking place" where partnership actually happens. It's the rare book that honors both your need to understand things <em>and</em> your need to feel them. Adult amateurs who tend to over-think will recognize themselves on every page, gently.</p>
            </div>

            <div className="rr-book">
              <div className="rr-book-title">In the Middle Are the Horsemen</div>
              <div className="rr-book-author">Tik Maynard</div>
              <p className="rr-book-desc">This one isn't from the rider-psychology lineage &mdash; it's a memoir &mdash; and that is exactly why it belongs here. Maynard chronicles his years as a working student at rock bottom: heartbroken, injured, doubting himself, learning from world-class trainers and from his own discouragement. What he models, page after page, is the vulnerability of being an adult who is still learning, and that is the deepest emotional terrain our riders walk every week. When a student tells me she's embarrassed to still be struggling at her level, I hand her this book. Maynard's humility makes it safe to be a beginner forever.</p>
            </div>

            <div className="rr-book">
              <div className="rr-book-title">Inside Your Ride: Mental Skills for Being Happy and Successful with Your Horse</div>
              <div className="rr-book-author">Tonya Johnston</div>
              <p className="rr-book-desc">Johnston is a sport psychology coach rather than a Savoie-or-Baumert lineage author, and I include her because she fills a very specific need: real, do-it-this-week tools for riders whose anxiety and comparison patterns are interfering right now. Her chapters on focus, pre-ride routines, and communicating with trainers and barn-mates speak directly to adult amateur life. If you're someone who wants warmth <em>and</em> a checklist, she gives you both. Read her alongside Savoie &mdash; the two voices complement each other beautifully.</p>
            </div>
          </div>

          <div className="rr-voice-foot">"You've got this."</div>
        </section>

        {/* ── TECHNICAL COACH ── */}
        <section className="rr-voice rr-technical">
          <div className="rr-voice-head">
            <div className="rr-voice-icon">&#128300;</div>
            <div className="rr-voice-name">The Technical Coach</div>
            <div className="rr-voice-subtitle">Biomechanics &amp; Precision</div>
            <p className="rr-voice-intro">Position is not decoration. Every degree of pelvic tilt, every millimeter of rein length, every micro-second of timing changes what your horse feels under you &mdash; and these authors will show you exactly how. Read with a mirror, a video camera, and a willingness to test what you read. <em>Did you feel that?</em> You will, after these.</p>
          </div>

          <div className="rr-voice-books">
            <div className="rr-book">
              <div className="rr-book-title">Centered Riding</div>
              <div className="rr-book-author">Sally Swift</div>
              <p className="rr-book-desc">Swift built her teaching out of Alexander Technique, anatomy, and a pioneer's willingness to use imagery &mdash; soft eyes, building blocks, growing roots from your seat &mdash; to bypass the rider's tense, overthinking left brain and let the body actually do the thing. Don't be fooled by how gentle the language sounds: every image she gives you is anatomically precise and produces measurable change in your seat. I ask new riders to read one chapter, take one image into their next ride, and tell me what they noticed. Almost without fail, the horse tells them the same thing the book did.</p>
            </div>

            <div className="rr-book">
              <div className="rr-book-title">Balance in Movement: How to Achieve the Perfect Seat</div>
              <div className="rr-book-author">Susanne von Dietze</div>
              <p className="rr-book-desc">Von Dietze is a physiotherapist, a dressage rider, and a clinician &mdash; and that combination is exactly why this book is on the USDF Instructor Certification reading list. She analyzes the seat the way an engineer analyzes a load-bearing structure: where the forces go, why a particular fault produces a particular consequence in the horse, and which unmounted exercises will fix the cause rather than nag at the symptom. If you have ever been told "sit straighter" without anyone explaining how, this book is your translator.</p>
            </div>

            <div className="rr-book">
              <div className="rr-book-title">Ride With Your Mind: A Right Brain Approach to Riding</div>
              <div className="rr-book-author">Mary Wanless</div>
              <p className="rr-book-desc">Wanless spent forty years decoding what "talented" riders do that they themselves can't articulate, and she turned the answers into a teachable system of rider biomechanics. She is precise about bearing-down, plumb lines, the bowl of the pelvis, and the muscular tone that allows a horse to actually receive your aids. Her writing demands attention, but the payoff is enormous: you stop guessing and start knowing. Pair this with her <em>Rider Biomechanics: An Illustrated Guide</em> if you want the diagrams to match the prose.</p>
            </div>

            <div className="rr-book">
              <div className="rr-book-title">When Two Spines Align: Dressage Dynamics</div>
              <div className="rr-book-author">Beth Baumert</div>
              <p className="rr-book-desc">Baumert's "Powerlines" &mdash; Vertical, Connecting, Spiraling, Visual &mdash; give the rider a vocabulary for what an effective seat is actually doing in three dimensions. She then turns the same analytical eye on the horse's balance challenges and shows you how the rider's alignment regulates rhythm, energy, flexion, and line of travel. Carl Hester has said he quotes this book frequently in his clinics, and that should tell you something. Read it with a pencil; you will be marking it.</p>
            </div>

            <div className="rr-book">
              <div className="rr-book-title">Activate Your Horse's Core</div>
              <div className="rr-book-author">Hilary M. Clayton &amp; Narelle C. Stubbs</div>
              <p className="rr-book-desc">Clayton is a veterinary biomechanist rather than a rider-position author, so this title sits outside the canonical lineage &mdash; and I include it deliberately. Everything we ask the rider to do with biomechanics ultimately has to be received by a horse with a functional, mobilized, switched-on core, and this manual (with its companion DVD) gives you the unmounted carrot-stretches, rein-back exercises, and pelvic tucks that science actually validates. If the rider's biomechanics is the question on one side of the saddle, this is the answer on the other side. Use it as a daily ten-minute warm-up and watch what your half-halts can do six weeks later.</p>
            </div>
          </div>

          <div className="rr-voice-foot">"Did you feel that?"</div>
        </section>

        {/* ── PRACTICAL STRATEGIST ── */}
        <section className="rr-voice rr-strategist">
          <div className="rr-voice-head">
            <div className="rr-voice-icon">&#128203;</div>
            <div className="rr-voice-name">The Practical Strategist</div>
            <div className="rr-voice-subtitle">Goal Achievement &amp; Planning</div>
            <p className="rr-voice-intro">Time is finite, lessons cost money, and your horse is not getting younger. The books here aren't for browsing &mdash; they're for working. Pick one, build a plan from it, mark your calendar, and execute. <em>Be accurate!</em> That goes for the work in the saddle and the work on the page.</p>
          </div>

          <div className="rr-voice-books">
            <div className="rr-book">
              <div className="rr-book-title">The New Basic Training of the Young Horse</div>
              <div className="rr-book-author">Reiner Klimke &amp; Ingrid Klimke</div>
              <p className="rr-book-desc">This is the book I want every rider with a green or restarting horse to keep in the tack room. The Klimkes lay out a stage-by-stage progression &mdash; handling, longeing, backing, the development of the basic gaits, the introduction of impulsion and lateral work, the first competition &mdash; with clear timelines and clear indicators of when to move on and when to wait. It is the German training scale rendered as a real-world program, written by two of the most successful trainer-competitors in the sport's history. If you don't know what your horse should be doing this month, start reading.</p>
            </div>

            <div className="rr-book">
              <div className="rr-book-title">Cavalletti: For Dressage and Jumping</div>
              <div className="rr-book-author">Ingrid Klimke &amp; Reiner Klimke</div>
              <p className="rr-book-desc">A standard reference since 1969, and updated by Ingrid into a working manual with exact distances, layouts, and four-to-six-week training schedules for basic, dressage, and jumping horses. What I value most is that Klimke gives you measurable structure: which patterns build rhythm, which build cadence, which build fitness, and how to slot them into a weekly plan without grinding the horse. Cavalletti is one of the most efficient training tools you own &mdash; this book turns it into a system.</p>
            </div>

            <div className="rr-book">
              <div className="rr-book-title">The Principles of Riding: Basic Training for Horse and Rider</div>
              <div className="rr-book-author">German National Equestrian Federation (FN)</div>
              <p className="rr-book-desc">This is the official manual. It is required reading on the USDF and USEA Instructor Certification lists for a reason: it is the single most consistent, codified, rider-tested framework in the sport. When riders ask me what the "right" answer is &mdash; for a seat fault, an aid sequence, a stage of training &mdash; I check this book first, because it represents fifty-plus years of revision against actual results. Buy the current Kenilworth Press edition, not an out-of-date one. Then use it as a reference, not a novel.</p>
            </div>

            <div className="rr-book">
              <div className="rr-book-title">101 Dressage Exercises for Horse &amp; Rider</div>
              <div className="rr-book-author">Jec Aristotle Ballou</div>
              <p className="rr-book-desc">Ballou is not in the Klimke-FN lineage, and I recommend her anyway &mdash; for one practical reason: this book is built to be hung on a hook in your arena and ridden from. Each of the 101 exercises has a full arena diagram, step-by-step instructions, and a stated training purpose, organized by what you're trying to develop. It solves the most common adult-amateur problem I see, which is showing up to ride with no plan and leaving with no progress. Pick three exercises a week, ride them with intent, log what changed. That's a program.</p>
            </div>

            <div className="rr-book">
              <div className="rr-book-title">Pressure Proof Your Riding</div>
              <div className="rr-book-author">Daniel Stewart</div>
              <p className="rr-book-desc">Stewart is a sport psychologist rather than a German-system trainer, and that's exactly why this book belongs on a goal-oriented rider's shelf. Competition readiness is not just biomechanics and conditioning &mdash; it's the show-morning nerves, the warm-up plan, the after-the-mistake reset, and Stewart gives you specific, testable tools for each. His "Plan the Ride, Ride the Plan" framework is the most practical thing I've read on translating training into a successful test. If your scores at home don't match your scores at shows, this is your gap to close.</p>
            </div>
          </div>

          <div className="rr-voice-foot">"Be accurate!"</div>
        </section>

        {/* ── NOTES / CAVEATS ── */}
        <section className="rr-notes">
          <h2>A Few Honest Notes</h2>
          <p>Several of these books &mdash; particularly Steinbrecht's <em>Gymnasium of the Horse</em> and Podhajsky's <em>Complete Training</em> &mdash; exist in multiple editions and translations of varying quality; the editions cited here (Xenophon Press for Steinbrecht, the modern reprints for Podhajsky and the Klimkes) are the versions most readers will be able to find new.</p>
          <p>Walter Zettl's <em>Dressage in Harmony</em>, Erik Herbermann's <em>Dressage Formula</em>, and Charles de Kunffy's <em>The Athletic Development of the Dressage Horse</em> are excellent additional Classical Master titles that didn't make the final cut purely for length; readers ready for a deeper bookshelf should add them.</p>
          <p>Beth Baumert's <em>When Two Spines Align</em> (Technical) and <em>How Two Minds Meet</em> (Empathetic) are by the same author but address genuinely different territory, which is why they appear on different voices' lists.</p>
        </section>

        <div className="rr-page-foot">Illuminate Your Journey.</div>

      </main>
    </div>
  );
}
