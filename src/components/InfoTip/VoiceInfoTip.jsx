import InfoTip from './InfoTip';
import { VOICE_META } from '../../services/aiService';
import { VOICE_TOOLTIP_CONTENT } from '../../constants/voiceTooltipContent';

/**
 * Voice-specific InfoTip. Composes name + catchphrase + lens + lineage from
 * VOICE_META (single source of truth for icon/name/color/catchphrase) and
 * VOICE_TOOLTIP_CONTENT (lens + lineage strings).
 *
 * Usage:
 *   <VoiceInfoTip voiceIndex={0} />
 */
export default function VoiceInfoTip({ voiceIndex, iconSize = 14, triggerClassName }) {
  const meta = VOICE_META[voiceIndex];
  const extra = VOICE_TOOLTIP_CONTENT[voiceIndex];
  if (!meta || !extra) return null;

  const content = (
    <>
      <p className="info-tip__heading">
        <span aria-hidden="true">{meta.icon} </span>
        {meta.name}
      </p>
      <span className="info-tip__catchphrase">&ldquo;{meta.catchphrase}&rdquo;</span>
      <p>
        <strong>Lens:</strong> {extra.lens}
      </p>
      <p>
        <strong>Lineage:</strong> {extra.lineage}
      </p>
    </>
  );

  return (
    <InfoTip
      content={content}
      variant="voice"
      voiceColor={meta.color}
      iconSize={iconSize}
      ariaLabel={`About ${meta.name}`}
      triggerClassName={triggerClassName}
    />
  );
}
