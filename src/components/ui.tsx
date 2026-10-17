"use client";

import { useEffect, useId, useRef, type ComponentProps, type ReactNode, type RefObject } from "react";
import { ChevronDown, X, type LucideIcon } from "lucide-react";
import { filledIconFor, FilledIcon } from "./filled-icons";

function classes(...values: (string | undefined | false)[]) {
  return values.filter(Boolean).join(" ");
}

export type ButtonProps = ComponentProps<"button"> & {
  variant?: "inverse" | "outline" | "ghost" | "coral" | "circle" | "text";
};

export function Button({ variant = "outline", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={classes("button", `button-${variant}`, className)} {...props} />;
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={classes("input", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <span className="select-wrap">
    <select className={classes("select", className)} {...props} />
    {!props.multiple && <ChevronDown className="select-chevron" size={16} strokeWidth={1.75} aria-hidden="true" focusable="false" />}
  </span>;
}

export function Badge({ className, ...props }: ComponentProps<"span">) {
  return <span className={classes("badge", className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={classes("card", className)} {...props} />;
}

export function NavLink({ active = false, className, ...props }: ComponentProps<"a"> & { active?: boolean }) {
  return <a className={classes("nav-tab", active && "active", className)} aria-current={active ? "page" : undefined} {...props} />;
}

export function Icon({ icon: Component, size = 20, className }: { icon: LucideIcon; size?: number; className?: string }) {
  return filledIconFor(Component)
    ? <FilledIcon icon={Component} size={size} className={className} />
    : <Component size={size} strokeWidth={1.75} aria-hidden="true" focusable="false" className={className} data-icon-style="outline" data-icon-name={Component.displayName ?? "Icon"} />;
}

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  /** Useful when a non-button card opens the dialog through a nested action. */
  returnFocusRef?: RefObject<HTMLElement | null>;
}

let scrollLockCount = 0;
let restoreBodyScroll: (() => void) | null = null;

/** A nested history/seller-details dialog must not unlock its still-open parent. */
function lockBodyScroll() {
  if (scrollLockCount === 0) {
    const body = document.body;
    const originalOverflow = body.style.overflow;
    const originalPadding = body.style.paddingInlineEnd;
    const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    if (scrollbarWidth > 0) {
      const currentPadding = Number.parseFloat(getComputedStyle(body).paddingInlineEnd) || 0;
      body.style.paddingInlineEnd = `${currentPadding + scrollbarWidth}px`;
    }
    body.style.overflow = "hidden";
    restoreBodyScroll = () => {
      body.style.overflow = originalOverflow;
      body.style.paddingInlineEnd = originalPadding;
    };
  }
  scrollLockCount += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    scrollLockCount -= 1;
    if (scrollLockCount === 0) {
      restoreBodyScroll?.();
      restoreBodyScroll = null;
    }
  };
}

/** Native modal dialogs supply top-layer/inert semantics; the trap also handles custom day controls. */
export function Dialog({ open, onClose, title, children, className, returnFocusRef }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;
    const trigger = returnFocusRef?.current
      ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const unlockScroll = lockBodyScroll();
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      unlockScroll();
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [open, returnFocusRef]);

  return (
    <dialog
      ref={dialogRef}
      className={classes("modal", className)}
      aria-labelledby={titleId}
      tabIndex={-1}
      onCancel={(event) => { if (event.target !== event.currentTarget) return; event.preventDefault(); onClose(); }}
      onClose={(event) => { if (open && !event.currentTarget.open) onClose(); }}
      onKeyDown={(event) => {
        if (event.key !== "Tab" || event.defaultPrevented) return;
        if (event.target instanceof Element && event.target.closest("dialog") !== event.currentTarget) return;
        const dialog = event.currentTarget;
        const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
          'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]',
        )).filter((element) => element.tabIndex >= 0
          && !element.matches(":disabled")
          && element.getClientRects().length > 0
          && getComputedStyle(element).visibility !== "hidden");
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) {
          event.preventDefault();
          dialog.focus();
        } else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
          event.preventDefault();
          first.focus();
        }
      }}
      onClick={(event) => {
        // A backdrop click has the dialog as its target but falls outside its rectangle.
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
      }}
    >
      <div className="modal-header">
        <h2 id={titleId} className="section-title">{title}</h2>
        <Button variant="circle" onClick={onClose} aria-label="بستن پنجره">
          <Icon icon={X} />
        </Button>
      </div>
      <div className="modal-body">{children}</div>
    </dialog>
  );
}
