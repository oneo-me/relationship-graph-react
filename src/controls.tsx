import { useEffect, useRef, useState } from 'react';
import type { RelationshipGraphLabels } from './labels.js';

/** Inline copy of the ellipsis glyph, so the package needs no icon library. */
function EllipsisIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="24"
    >
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  );
}

export interface GraphSettingsControlProps {
  labels: RelationshipGraphLabels;
  showAttachments: boolean;
  onShowAttachmentsChange(showAttachments: boolean): void;
}

/**
 * Top-right settings button and its popover. The only setting today is
 * attachment visibility, which drives `filterDocumentGraph`.
 */
export function GraphSettingsControl({
  labels,
  showAttachments,
  onShowAttachmentsChange,
}: GraphSettingsControlProps) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (container.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className="rg-settings" ref={container}>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={labels.settings}
        className="rg-icon-button"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <EllipsisIcon />
      </button>
      {open ? (
        <div aria-label={labels.settings} className="rg-popover" role="dialog">
          <div className="rg-switch-row">
            <div className="rg-switch-text">
              <p className="rg-switch-title">{labels.showAttachments}</p>
              <p className="rg-switch-description">
                {labels.showAttachmentsDescription}
              </p>
            </div>
            <button
              aria-checked={showAttachments}
              aria-label={labels.showAttachments}
              className="rg-switch"
              data-checked={showAttachments ? '' : undefined}
              onClick={() => onShowAttachmentsChange(!showAttachments)}
              role="switch"
              type="button"
            >
              <span className="rg-switch-thumb" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
