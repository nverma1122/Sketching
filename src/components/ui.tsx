import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Icon } from './Icons';

// ---------------------------------------------------------------------------
// Toasts — brief, quiet confirmations with an optional single action (Undo).

interface Toast {
  id: number;
  message: string;
  tone: 'info' | 'error';
  action?: { label: string; run: () => void };
}

const ToastContext = createContext<(t: Omit<Toast, 'id'>) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = nextId.current++;
    setToasts((list) => [...list.slice(-2), { ...t, id }]);
    window.setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), t.action ? 7000 : 4000);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            <span>{t.message}</span>
            {t.action && (
              <button
                className="toast-action"
                onClick={() => {
                  t.action!.run();
                  setToasts((list) => list.filter((x) => x.id !== t.id));
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

// ---------------------------------------------------------------------------
// Dialog — wraps the native <dialog> element, which provides focus trapping,
// Escape-to-close and an accessible modal role.

export function Dialog({
  open,
  onClose,
  title,
  children,
  wide,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`dialog ${wide ? 'dialog-wide' : ''} ${className ?? ''}`}
      aria-label={title}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open && (
        <div className="dialog-body">
          <div className="dialog-head">
            <h2 className="dialog-title">{title}</h2>
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <Icon name="x" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  danger,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}) {
  return (
    <Dialog open={open} onClose={onCancel} title={title}>
      <div className="confirm-message">{message}</div>
      <div className="dialog-actions">
        <button className="btn btn-quiet" onClick={onCancel} autoFocus>
          Cancel
        </button>
        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}

/** Object URL for a Blob, revoked automatically. */
export function useObjectUrl(blob: Blob | undefined | null): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return;
    }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}

export function Lightbox({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  return (
    <Dialog open={open} onClose={onClose} title={title} wide className="lightbox">
      <div className="lightbox-content">{children}</div>
    </Dialog>
  );
}

/** Segmented choice built from native radio inputs (keyboard accessible). */
export function ChoiceGroup<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  columns,
  hideLegend,
}: {
  name: string;
  legend: string;
  options: { value: T; label: string; hint?: string; accent?: string }[];
  value: T | undefined;
  onChange: (v: T) => void;
  columns?: 2 | 3 | 4;
  hideLegend?: boolean;
}) {
  return (
    <fieldset className="choice-group">
      <legend className={hideLegend ? 'visually-hidden' : 'choice-legend'}>{legend}</legend>
      <div className={`choices cols-${columns ?? 2}`}>
        {options.map((o) => (
          <label key={o.value} className={`choice ${value === o.value ? 'is-selected' : ''}`} style={o.accent ? ({ '--accent': o.accent } as CSSProperties) : undefined}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span className="choice-label">{o.label}</span>
            {o.hint && <span className="choice-hint">{o.hint}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <svg viewBox="0 0 120 60" className="empty-mark" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <path d="M10 50h100M24 50V24l14-8v34M38 50V28h22v22M66 50V18h20v32M86 50V30h16v20" opacity=".55" />
        <path d="M44 34h4v5h-4zM52 34h4v5h-4zM72 24h4v5h-4zM72 34h4v5h-4z" opacity=".4" />
      </svg>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
