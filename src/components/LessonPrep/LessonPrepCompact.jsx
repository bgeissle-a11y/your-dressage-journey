import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { generateLessonPrepSummary } from '../../services/lessonPrepService';
import './LessonPrepCompact.css';

export default function LessonPrepCompact() {
  const [openingLine, setOpeningLine] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await generateLessonPrepSummary();
      if (cancelled) return;
      if (result.success) {
        setOpeningLine(result.briefData?.openingLine || null);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return null;

  return (
    <div className="lesson-prep-compact">
      <div className="lpc-label">Lesson Prep</div>
      {openingLine ? (
        <div className="lpc-quote">&ldquo;{openingLine}&rdquo;</div>
      ) : (
        <div className="lpc-pending">
          Complete a few more rides and your lesson prep summary will appear here.
        </div>
      )}
      <Link to="/lesson-prep" className="lpc-link">
        {openingLine ? 'Read full summary' : 'Open lesson prep'} &rarr;
      </Link>
    </div>
  );
}
