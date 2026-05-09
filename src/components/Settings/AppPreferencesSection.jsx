export default function AppPreferencesSection({ preferences, onChange }) {
  return (
    <>
      {/* Landing Page */}
      <div className="setting-row">
        <div className="setting-label-block">
          <div className="setting-label">Landing Page</div>
          <div className="setting-description">Where you arrive when you open the app.</div>
        </div>
        <div className="setting-control">
          <div className="settings-radio-group">
            <label className={`settings-radio-option${preferences.landingPage === 'dashboard' ? ' selected' : ''}`}>
              <input
                type="radio"
                name="landingPage"
                value="dashboard"
                checked={preferences.landingPage === 'dashboard'}
                onChange={() => onChange('landingPage', 'dashboard')}
              />
              <span className="radio-label">Dashboard</span>
            </label>
            <label className={`settings-radio-option${preferences.landingPage === 'quickstart' ? ' selected' : ''}`}>
              <input
                type="radio"
                name="landingPage"
                value="quickstart"
                checked={preferences.landingPage === 'quickstart'}
                onChange={() => onChange('landingPage', 'quickstart')}
              />
              <span className="radio-label">Quick Start Guide</span>
            </label>
          </div>
        </div>
      </div>

      {/* Output Display */}
      <div className="setting-row">
        <div className="setting-label-block">
          <div className="setting-label">Coaching Output Display</div>
          <div className="setting-description">How your AI coaching outputs are revealed after analysis.</div>
        </div>
        <div className="setting-control">
          <div className="settings-radio-group">
            <label className={`settings-radio-option${preferences.outputView === 'progressive' ? ' selected' : ''}`}>
              <input
                type="radio"
                name="outputView"
                value="progressive"
                checked={preferences.outputView === 'progressive'}
                onChange={() => onChange('outputView', 'progressive')}
              />
              <span className="radio-label">Progressive (one section at a time)</span>
            </label>
            <label className={`settings-radio-option${preferences.outputView === 'full' ? ' selected' : ''}`}>
              <input
                type="radio"
                name="outputView"
                value="full"
                checked={preferences.outputView === 'full'}
                onChange={() => onChange('outputView', 'full')}
              />
              <span className="radio-label">Expand all at once</span>
            </label>
            <label className={`settings-radio-option${preferences.outputView === 'focus' ? ' selected' : ''}`}>
              <input
                type="radio"
                name="outputView"
                value="focus"
                checked={preferences.outputView === 'focus'}
                onChange={() => onChange('outputView', 'focus')}
              />
              <span className="radio-label">Focus Mode (one voice only)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Default Coaching Voice */}
      <div className="setting-row">
        <div className="setting-label-block">
          <div className="setting-label">Default Coaching Voice</div>
          <div className="setting-description">Which voice opens first when you view your coaching outputs. Applies in both Full and Focus modes. You can always switch tabs. Choose "All Voices" to default to The Classical Master.</div>
        </div>
        <div className="setting-control">
          <select
            className="settings-select"
            value={preferences.defaultVoice}
            onChange={(e) => onChange('defaultVoice', e.target.value)}
          >
            <option value="all">All Voices</option>
            <option value="empathetic">The Empathetic Coach</option>
            <option value="classical">The Classical Master</option>
            <option value="technical">The Technical Coach</option>
            <option value="strategist">The Practical Strategist</option>
          </select>
        </div>
      </div>

      {/* Voice Fragments */}
      <div className="setting-row">
        <div className="setting-label-block">
          <div className="setting-label">In-Line Voice Fragments</div>
          <div className="setting-description">
            Brief 1-2 sentence coaching cues embedded throughout your outputs. Adds presence; adds ~5% to generation time.
          </div>
        </div>
        <div className="setting-control">
          <label className="settings-toggle-wrap">
            <input
              type="checkbox"
              checked={preferences.voiceFragments}
              onChange={(e) => onChange('voiceFragments', e.target.checked)}
            />
            <span className="settings-toggle-slider" />
          </label>
        </div>
      </div>
    </>
  );
}
