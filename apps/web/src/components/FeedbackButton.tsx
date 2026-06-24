import { Bug, Lightbulb, MessageCircle, MessageSquarePlus, X } from 'lucide-react';
import * as React from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/primitives';
import { useStateCtx } from '@/lib/state';
import { cn } from '@/lib/utils';

// Feedback lands in the maintainer's inbox via a prefilled mailto: — no backend or
// email service required (the site deploys as a static SPA + serverless API).
const FEEDBACK_EMAIL = 'arseniy.shafran@novaukraine.org';

type Kind = 'bug' | 'idea' | 'other';
const KINDS: { value: Kind; label: string; subject: string; icon: typeof Bug }[] = [
  { value: 'bug', label: 'Bug', subject: 'Bug report', icon: Bug },
  { value: 'idea', label: 'Idea', subject: 'Feature idea', icon: Lightbulb },
  { value: 'other', label: 'Other', subject: 'Feedback', icon: MessageCircle },
];

/** A trigger (styled by the caller via className/children) that opens the feedback modal. */
export function FeedbackButton({ className, children }: { className?: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      {open ? <FeedbackModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function FeedbackModal({ onClose }: { onClose: () => void }) {
  const [kind, setKind] = React.useState<Kind>('bug');
  const [message, setMessage] = React.useState('');
  const location = useLocation();
  const { state } = useStateCtx();
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    textareaRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const meta = KINDS.find((k) => k.value === kind)!;
  // Auto-append context so reports are actionable without back-and-forth.
  const context = [
    `Page: ${location.pathname}${location.search}`,
    `State: ${state}`,
    `Browser: ${navigator.userAgent}`,
  ].join('\n');
  const mailto = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(
    `[Bill Aid] ${meta.subject}`,
  )}&body=${encodeURIComponent(`${message.trim()}\n\n— — —\n${context}`)}`;

  const send = () => {
    if (!message.trim()) return;
    window.location.href = mailto;
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border bg-popover p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Send feedback"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <MessageSquarePlus className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Send feedback</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Found a bug or have an idea? Let us know — it opens your email app with the details prefilled.
        </p>

        <div className="mb-3 grid grid-cols-3 gap-2">
          {KINDS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setKind(value)}
              aria-pressed={kind === value}
              className={cn(
                'flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-xs font-medium transition-colors',
                kind === value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-input text-muted-foreground hover:bg-accent/50 hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder={
            kind === 'bug'
              ? 'What happened, and what did you expect? Steps to reproduce help a lot.'
              : kind === 'idea'
                ? 'What would you like to see?'
                : 'Your feedback…'
          }
          className="w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-base shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
        />

        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          Your current page, selected state, and browser are added automatically to help us
          reproduce issues. Nothing is sent until you press send in your email app.
        </p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <a href={`mailto:${FEEDBACK_EMAIL}`} className="text-xs text-muted-foreground hover:text-foreground hover:underline">
            or email us directly
          </a>
          <Button onClick={send} disabled={!message.trim()}>
            Send feedback
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
