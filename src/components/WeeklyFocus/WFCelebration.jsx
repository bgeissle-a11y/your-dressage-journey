export default function WFCelebration({ quote, horseName, date, category }) {
  return (
    <div className="celebration">
      <div className="cel-eyebrow">&#10022; A Moment Worth Keeping</div>
      <blockquote>{quote}</blockquote>
      <div className="cel-meta">
        {horseName} &middot; {date} &middot; <em>{category}</em>
      </div>
    </div>
  );
}
