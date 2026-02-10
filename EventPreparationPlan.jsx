import React, { useState, useEffect } from 'react';

/**
 * Event Preparation Plan Generator
 * 
 * This component generates personalized week-by-week preparation plans
 * based on event preparation form data and rider's YDJ history.
 * 
 * Props:
 * - eventData: Form data from event-preparation-form
 * - riderHistory: YDJ data (debriefs, reflections, profiles)
 * - coachVoice: Selected coaching persona (klaus, jordan, emma)
 */

const EventPreparationPlan = ({ eventData, riderHistory, coachVoice = 'emma' }) => {
  const [plan, setPlan] = useState(null);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    if (eventData) {
      generatePlan();
    }
  }, [eventData, riderHistory]);

  // Calculate weeks until event and phase structure
  const calculateTimeframe = () => {
    const today = new Date();
    const eventDate = new Date(eventData.eventDetails.date);
    const daysUntil = Math.floor((eventDate - today) / (1000 * 60 * 60 * 24));
    const weeksUntil = Math.floor(daysUntil / 7);
    
    return {
      daysUntil,
      weeksUntil,
      phases: calculatePhases(weeksUntil)
    };
  };

  // Determine preparation phases based on available time
  const calculatePhases = (weeks) => {
    if (weeks >= 12) {
      return {
        foundation: { weeks: 4, start: 1, end: 4 },
        preparation: { weeks: 4, start: 5, end: 8 },
        peak: { weeks: 3, start: 9, end: 11 },
        taper: { weeks: 1, start: 12, end: 12 }
      };
    } else if (weeks >= 8) {
      return {
        foundation: { weeks: 3, start: 1, end: 3 },
        preparation: { weeks: 3, start: 4, end: 6 },
        peak: { weeks: 1, start: 7, end: 7 },
        taper: { weeks: 1, start: 8, end: 8 }
      };
    } else if (weeks >= 4) {
      return {
        foundation: { weeks: 2, start: 1, end: 2 },
        preparation: { weeks: 1, start: 3, end: 3 },
        peak: { weeks: 0, start: 0, end: 0 },
        taper: { weeks: 1, start: 4, end: 4 }
      };
    } else {
      return {
        foundation: { weeks: 0, start: 0, end: 0 },
        preparation: { weeks: Math.max(weeks - 1, 1), start: 1, end: Math.max(weeks - 1, 1) },
        peak: { weeks: 0, start: 0, end: 0 },
        taper: { weeks: 1, start: weeks, end: weeks }
      };
    }
  };

  // Main plan generation using Claude API
  const generatePlan = async () => {
    const timeframe = calculateTimeframe();
    
    // Construct comprehensive prompt for Claude
    const prompt = buildPlanPrompt(eventData, riderHistory, timeframe, coachVoice);
    
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [
            { 
              role: 'user', 
              content: prompt 
            }
          ]
        })
      });

      const data = await response.json();
      const planContent = data.content.find(item => item.type === 'text')?.text;
      
      if (planContent) {
        const parsedPlan = parsePlanContent(planContent, timeframe);
        setPlan(parsedPlan);
      }
    } catch (error) {
      console.error('Error generating plan:', error);
    }
  };

  // Build comprehensive prompt for plan generation
  const buildPlanPrompt = (eventData, riderHistory, timeframe, voice) => {
    return `You are creating a personalized event preparation plan for a dressage rider. Use the following information:

EVENT DETAILS:
${JSON.stringify(eventData.eventDetails, null, 2)}

RIDER CONTEXT:
${JSON.stringify(eventData.currentContext, null, 2)}

GOALS:
${eventData.goals.map((g, i) => `${i + 1}. ${g}`).join('\n')}

CONCERNS:
${eventData.concerns.map((c, i) => `${i + 1}. ${c}`).join('\n')}

RESOURCES:
${JSON.stringify(eventData.resources, null, 2)}

TIMEFRAME:
- Weeks until event: ${timeframe.weeksUntil}
- Days until event: ${timeframe.daysUntil}

RIDER HISTORY SUMMARY:
${summarizeRiderHistory(riderHistory)}

COACHING VOICE: ${voice}

Generate a comprehensive ${timeframe.weeksUntil}-week preparation plan with the following structure:

1. EXECUTIVE SUMMARY (2-3 paragraphs)
   - Opening that acknowledges their specific situation and readiness
   - Why this event is achievable based on their data
   - The one key insight they need to internalize

2. WEEKLY BREAKDOWN (for each week until event)
   For each week, provide:
   
   Week N: [Descriptive Title]
   Phase: [Foundation/Preparation/Peak/Taper]
   
   FOCUS THEME: [One-sentence theme for the week]
   
   TECHNICAL TARGETS:
   - [3-5 specific, actionable technical goals]
   - [Reference their known challenges and recent progress]
   - [Build progressively toward event requirements]
   
   MENTAL GAME:
   - [2-3 specific mental training exercises]
   - [Address their concerns directly]
   - [Build resilience and confidence]
   
   HORSE MANAGEMENT:
   - [Specific care/conditioning for their horse]
   - [Address any soundness or behavioral notes]
   - [Event-specific preparation]
   
   SUCCESS MARKERS:
   - [How they'll know this week was productive]
   - [What "good enough" looks like]

3. EVENT DAY STRATEGY
   - Hour-by-hour timeline from wake-up to post-event
   - Warm-up strategy specific to their horse
   - In-the-moment coping strategies for concerns
   - Recovery protocol between tests/rounds if applicable

4. GOAL-SPECIFIC GUIDANCE
   For each of their stated goals, provide:
   - How the plan builds toward this goal
   - Specific checkpoints to assess progress
   - What success looks like (and what "good enough" looks like)

5. CONCERN-SPECIFIC MITIGATION
   For each concern:
   - Direct strategy to address it
   - Early warning signs to watch for
   - In-the-moment response if it occurs

Use natural, conversational language appropriate to the ${voice} coaching voice.
Be specific and actionable - reference actual movements, techniques, and strategies.
Draw connections to their YDJ history data when relevant.
Balance realism with encouragement.

Format the response in markdown with clear headers and structure.`;
  };

  // Summarize rider history for context
  const summarizeRiderHistory = (history) => {
    if (!history) return 'No prior history available';
    
    let summary = '';
    
    // Recent debrief patterns
    if (history.debriefs && history.debriefs.length > 0) {
      const recent = history.debriefs.slice(-5);
      const avgQuality = recent.reduce((sum, d) => sum + d.quality, 0) / recent.length;
      summary += `Recent ride quality average: ${avgQuality}/10\n`;
      
      const commonChallenges = extractCommonThemes(recent.map(d => d.obstacles).filter(Boolean));
      if (commonChallenges.length > 0) {
        summary += `Common challenges: ${commonChallenges.join(', ')}\n`;
      }
    }
    
    // Reflection themes
    if (history.reflections && history.reflections.length > 0) {
      summary += `Total reflections: ${history.reflections.length}\n`;
      const themes = history.reflections.map(r => r.category);
      summary += `Focus areas: ${[...new Set(themes)].join(', ')}\n`;
    }
    
    return summary;
  };

  const extractCommonThemes = (items) => {
    // Simple keyword extraction - in production, use more sophisticated NLP
    const words = items.join(' ').toLowerCase().split(/\s+/);
    const frequency = {};
    words.forEach(word => {
      if (word.length > 4) {
        frequency[word] = (frequency[word] || 0) + 1;
      }
    });
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([word]) => word);
  };

  // Parse Claude's response into structured plan
  const parsePlanContent = (content, timeframe) => {
    // Parse markdown content into structured data
    const sections = {
      summary: '',
      weeks: [],
      eventDay: '',
      goalGuidance: [],
      concernMitigation: []
    };

    // Split content by headers and parse
    const lines = content.split('\n');
    let currentSection = null;
    let currentWeek = null;

    lines.forEach(line => {
      if (line.startsWith('# ') || line.startsWith('## ')) {
        const header = line.replace(/^#+\s+/, '').toLowerCase();
        
        if (header.includes('summary')) {
          currentSection = 'summary';
        } else if (header.includes('week')) {
          currentWeek = { weekNumber: null, title: '', content: '' };
          sections.weeks.push(currentWeek);
          currentSection = 'week';
        } else if (header.includes('event day')) {
          currentSection = 'eventDay';
        } else if (header.includes('goal')) {
          currentSection = 'goals';
        } else if (header.includes('concern')) {
          currentSection = 'concerns';
        }
      } else if (currentSection === 'summary') {
        sections.summary += line + '\n';
      } else if (currentSection === 'week' && currentWeek) {
        currentWeek.content += line + '\n';
      } else if (currentSection === 'eventDay') {
        sections.eventDay += line + '\n';
      }
    });

    return {
      ...sections,
      timeframe,
      generatedAt: new Date().toISOString(),
      eventData
    };
  };

  const toggleWeek = (weekNumber) => {
    setExpanded(prev => ({
      ...prev,
      [weekNumber]: !prev[weekNumber]
    }));
  };

  if (!plan) {
    return (
      <div className="preparation-plan loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Crafting your personalized preparation plan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="preparation-plan">
      <style>{`
        .preparation-plan {
          font-family: 'Work Sans', sans-serif;
          max-width: 900px;
          margin: 0 auto;
          padding: 20px;
          background: linear-gradient(to bottom, #FAF8F5 0%, #F5F1EB 100%);
          min-height: 100vh;
        }

        .plan-header {
          background: white;
          border-radius: 20px;
          padding: 40px;
          margin-bottom: 30px;
          box-shadow: 0 2px 12px rgba(139, 115, 85, 0.08);
          border: 1px solid #E0D5C7;
        }

        .plan-title {
          font-family: 'Playfair Display', serif;
          font-size: 2.5em;
          color: #8B7355;
          margin-bottom: 10px;
        }

        .plan-subtitle {
          color: #7A7A7A;
          font-size: 1.1em;
          margin-bottom: 20px;
        }

        .event-info {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          padding-top: 20px;
          border-top: 2px solid #F5F1EB;
        }

        .event-info-item {
          flex: 1;
          min-width: 200px;
        }

        .event-info-label {
          font-size: 0.85em;
          color: #7A7A7A;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 5px;
        }

        .event-info-value {
          font-size: 1.1em;
          color: #3A3A3A;
          font-weight: 500;
        }

        .countdown {
          background: linear-gradient(135deg, #8B7355 0%, #D4A574 100%);
          color: white;
          padding: 15px 25px;
          border-radius: 12px;
          text-align: center;
          font-size: 1.2em;
          font-weight: 600;
          margin-bottom: 30px;
        }

        .executive-summary {
          background: white;
          border-radius: 20px;
          padding: 40px;
          margin-bottom: 30px;
          box-shadow: 0 2px 12px rgba(139, 115, 85, 0.08);
          border-left: 5px solid #C67B5C;
          line-height: 1.8;
        }

        .executive-summary h2 {
          font-family: 'Playfair Display', serif;
          color: #8B7355;
          margin-bottom: 20px;
        }

        .weeks-container {
          margin-bottom: 30px;
        }

        .week-card {
          background: white;
          border-radius: 16px;
          margin-bottom: 20px;
          box-shadow: 0 2px 12px rgba(139, 115, 85, 0.08);
          border: 1px solid #E0D5C7;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .week-card:hover {
          box-shadow: 0 4px 24px rgba(139, 115, 85, 0.12);
        }

        .week-header {
          padding: 25px 30px;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(to right, #FAF8F5 0%, white 100%);
        }

        .week-header:hover {
          background: #FAF8F5;
        }

        .week-title-section {
          flex: 1;
        }

        .week-number {
          font-size: 0.85em;
          color: #7A7A7A;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 5px;
        }

        .week-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.5em;
          color: #8B7355;
          margin-bottom: 5px;
        }

        .week-phase {
          display: inline-block;
          padding: 4px 12px;
          background: #D4A574;
          color: white;
          border-radius: 20px;
          font-size: 0.8em;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .expand-icon {
          font-size: 1.5em;
          color: #8B7355;
          transition: transform 0.3s ease;
        }

        .expand-icon.expanded {
          transform: rotate(180deg);
        }

        .week-content {
          padding: 0 30px 30px 30px;
          display: none;
        }

        .week-content.expanded {
          display: block;
        }

        .focus-theme {
          background: #F5F1EB;
          padding: 15px 20px;
          border-radius: 10px;
          margin-bottom: 25px;
          border-left: 4px solid #C67B5C;
          font-style: italic;
          color: #3A3A3A;
        }

        .week-section {
          margin-bottom: 25px;
        }

        .week-section h3 {
          font-family: 'Playfair Display', serif;
          color: #8B7355;
          font-size: 1.2em;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .section-icon {
          width: 24px;
          height: 24px;
          background: #D4A574;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 0.8em;
        }

        .week-section ul {
          list-style: none;
          padding: 0;
        }

        .week-section li {
          padding: 10px 0 10px 25px;
          position: relative;
          line-height: 1.6;
          color: #3A3A3A;
        }

        .week-section li:before {
          content: '→';
          position: absolute;
          left: 0;
          color: #D4A574;
          font-weight: bold;
        }

        .success-markers {
          background: #F0F8F0;
          padding: 15px 20px;
          border-radius: 10px;
          border-left: 4px solid #6B8E5F;
        }

        .event-day-section {
          background: white;
          border-radius: 20px;
          padding: 40px;
          margin-bottom: 30px;
          box-shadow: 0 4px 24px rgba(139, 115, 85, 0.12);
          border: 2px solid #8B7355;
        }

        .event-day-section h2 {
          font-family: 'Playfair Display', serif;
          color: #8B7355;
          font-size: 2em;
          margin-bottom: 25px;
          text-align: center;
        }

        .goal-concern-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .goal-card, .concern-card {
          background: white;
          border-radius: 16px;
          padding: 25px;
          box-shadow: 0 2px 12px rgba(139, 115, 85, 0.08);
        }

        .goal-card {
          border-left: 5px solid #6B8E5F;
        }

        .concern-card {
          border-left: 5px solid #C67B5C;
        }

        .goal-card h3, .concern-card h3 {
          font-family: 'Playfair Display', serif;
          margin-bottom: 15px;
          color: #8B7355;
        }

        .download-actions {
          background: white;
          border-radius: 16px;
          padding: 30px;
          text-align: center;
          box-shadow: 0 2px 12px rgba(139, 115, 85, 0.08);
        }

        .btn-download {
          background: #8B7355;
          color: white;
          border: none;
          padding: 15px 40px;
          border-radius: 12px;
          font-size: 1em;
          font-weight: 600;
          cursor: pointer;
          margin: 0 10px;
          transition: all 0.3s ease;
        }

        .btn-download:hover {
          background: #6F5A43;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(139, 115, 85, 0.3);
        }

        .loading-spinner {
          text-align: center;
          padding: 100px 20px;
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #F5F1EB;
          border-top: 4px solid #8B7355;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .plan-title {
            font-size: 1.8em;
          }

          .event-info {
            flex-direction: column;
          }

          .week-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }

          .goal-concern-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Header Section */}
      <div className="plan-header">
        <h1 className="plan-title">Your Event Preparation Plan</h1>
        <p className="plan-subtitle">{plan.eventData.eventDetails.name}</p>
        
        <div className="event-info">
          <div className="event-info-item">
            <div className="event-info-label">Event Date</div>
            <div className="event-info-value">
              {new Date(plan.eventData.eventDetails.date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
          <div className="event-info-item">
            <div className="event-info-label">Event Type</div>
            <div className="event-info-value">{plan.eventData.eventDetails.type}</div>
          </div>
          <div className="event-info-item">
            <div className="event-info-label">Horse</div>
            <div className="event-info-value">{plan.eventData.currentContext.horse}</div>
          </div>
        </div>
      </div>

      {/* Countdown */}
      <div className="countdown">
        📅 {plan.timeframe.daysUntil} days ({plan.timeframe.weeksUntil} weeks) until your event
      </div>

      {/* Executive Summary */}
      <div className="executive-summary">
        <h2>Your Preparation Roadmap</h2>
        <div dangerouslySetInnerHTML={{ __html: formatMarkdown(plan.summary) }} />
      </div>

      {/* Weekly Breakdown */}
      <div className="weeks-container">
        <h2 style={{ 
          fontFamily: 'Playfair Display, serif', 
          fontSize: '2em', 
          color: '#8B7355',
          marginBottom: '25px',
          textAlign: 'center'
        }}>
          Week-by-Week Preparation
        </h2>

        {plan.weeks.map((week, index) => (
          <div key={index} className="week-card">
            <div className="week-header" onClick={() => toggleWeek(index)}>
              <div className="week-title-section">
                <div className="week-number">Week {index + 1}</div>
                <h3 className="week-title">{week.title || `Week ${index + 1}`}</h3>
                <span className="week-phase">{getPhaseForWeek(index + 1, plan.timeframe.phases)}</span>
              </div>
              <div className={`expand-icon ${expanded[index] ? 'expanded' : ''}`}>▼</div>
            </div>
            
            <div className={`week-content ${expanded[index] ? 'expanded' : ''}`}>
              <div dangerouslySetInnerHTML={{ __html: formatMarkdown(week.content) }} />
            </div>
          </div>
        ))}
      </div>

      {/* Event Day Strategy */}
      <div className="event-day-section">
        <h2>🎯 Event Day Strategy</h2>
        <div dangerouslySetInnerHTML={{ __html: formatMarkdown(plan.eventDay) }} />
      </div>

      {/* Goals and Concerns */}
      <div className="goal-concern-grid">
        {plan.eventData.goals.map((goal, index) => (
          <div key={index} className="goal-card">
            <h3>Goal {index + 1}: {goal}</h3>
            <div>Strategy and checkpoints will be detailed here...</div>
          </div>
        ))}

        {plan.eventData.concerns.map((concern, index) => (
          <div key={index} className="concern-card">
            <h3>Concern {index + 1}: {concern}</h3>
            <div>Mitigation strategy will be detailed here...</div>
          </div>
        ))}
      </div>

      {/* Download Actions */}
      <div className="download-actions">
        <h3 style={{ marginBottom: '20px', fontFamily: 'Playfair Display, serif', color: '#8B7355' }}>
          Save Your Plan
        </h3>
        <button className="btn-download" onClick={() => downloadPDF(plan)}>
          Download as PDF
        </button>
        <button className="btn-download" onClick={() => downloadDocx(plan)}>
          Download as Word Doc
        </button>
      </div>
    </div>
  );
};

// Helper functions

const getPhaseForWeek = (weekNumber, phases) => {
  if (weekNumber >= phases.foundation.start && weekNumber <= phases.foundation.end) {
    return 'Foundation';
  } else if (weekNumber >= phases.preparation.start && weekNumber <= phases.preparation.end) {
    return 'Preparation';
  } else if (weekNumber >= phases.peak.start && weekNumber <= phases.peak.end) {
    return 'Peak';
  } else if (weekNumber >= phases.taper.start && weekNumber <= phases.taper.end) {
    return 'Taper';
  }
  return 'Preparation';
};

const formatMarkdown = (markdown) => {
  // Simple markdown to HTML converter
  // In production, use a library like marked or react-markdown
  let html = markdown
    .replace(/### (.*)/g, '<h3>$1</h3>')
    .replace(/## (.*)/g, '<h2>$1</h2>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/- (.*)/g, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/<li>/g, '<ul><li>')
    .replace(/<\/li>\n(?!<li>)/g, '</li></ul>');
  
  return `<p>${html}</p>`;
};

const downloadPDF = async (plan) => {
  // Implementation would use jsPDF or similar
  console.log('Downloading PDF...', plan);
  alert('PDF download functionality to be implemented');
};

const downloadDocx = async (plan) => {
  // Implementation would use docx library
  console.log('Downloading DOCX...', plan);
  alert('DOCX download functionality to be implemented');
};

export default EventPreparationPlan;
