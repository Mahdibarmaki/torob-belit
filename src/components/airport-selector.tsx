"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown, PlaneLanding, PlaneTakeoff, Search } from "lucide-react";
import { AIRPORTS, type Airport } from "@/data/airports";
import { searchAirports } from "@/lib/airport-search";
import { Dialog, Icon, Input } from "./ui";

export interface AirportSelectorProps {
  value: string;
  onChange: (code: string) => void;
  label: string;
  id?: string;
  airports?: readonly Airport[];
  placeholder?: string;
  direction?: "origin" | "destination";
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

/** A draft search never changes the selected airport until an existing result is chosen. */
export function AirportSelector({ value, onChange, label, id, airports = AIRPORTS, placeholder = "شهر یا فرودگاه را انتخاب کنید", direction = "origin", "aria-invalid": invalid, "aria-describedby": describedBy }: AirportSelectorProps) {
  const generatedId = useId();
  const triggerId = id ?? `airport-${generatedId}`;
  const listId = `${triggerId}-results`;
  const helpId = `${triggerId}-help`;
  const selectionId = `${triggerId}-selection`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedCode, setHighlightedCode] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef(new Map<string, HTMLButtonElement>());
  const selected = airports.find((airport) => airport.code === value);
  const results = searchAirports(airports, query);
  const highlighted = results.find((airport) => airport.code === highlightedCode);

  useEffect(() => {
    if (!open) return;
    const input = inputRef.current;
    const dialog = input?.closest("dialog");
    const viewport = window.visualViewport;
    // Native dialogs match the date picker normally. Recenter only when a soft keyboard
    // shrinks or pans the visual viewport without resizing the layout viewport.
    const syncViewport = () => {
      if (!dialog || !viewport) return;
      dialog.style.setProperty("--airport-viewport-height", `${viewport.height}px`);
      dialog.style.setProperty("--airport-viewport-top", `${viewport.offsetTop}px`);
      dialog.toggleAttribute("data-keyboard-viewport", viewport.height < window.innerHeight - 80 || viewport.offsetTop > 0);
    };
    syncViewport();
    viewport?.addEventListener("resize", syncViewport);
    viewport?.addEventListener("scroll", syncViewport);
    const frame = requestAnimationFrame(() => {
      // Touch users opt into the keyboard by tapping the search input.
      if (!window.matchMedia("(pointer: coarse)").matches) input?.focus({ preventScroll: true });
    });
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", syncViewport);
      viewport?.removeEventListener("scroll", syncViewport);
      dialog?.removeAttribute("data-keyboard-viewport");
      dialog?.style.removeProperty("--airport-viewport-height");
      dialog?.style.removeProperty("--airport-viewport-top");
    };
  }, [open]);

  useEffect(() => {
    if (open && highlightedCode) optionRefs.current.get(highlightedCode)?.scrollIntoView({ block: "nearest" });
  }, [open, highlightedCode]);

  function choose(code: string) {
    if (!airports.some((airport) => airport.code === code)) return;
    onChange(code);
    setOpen(false);
  }

  function navigate(event: KeyboardEvent<HTMLElement>) {
    if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
    if (event.key === "Enter") {
      event.preventDefault();
      if (highlighted) choose(highlighted.code);
      return;
    }
    if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
    event.preventDefault();
    if (!results.length) return;
    const index = results.findIndex((airport) => airport.code === highlightedCode);
    const next = index < 0 ? (event.key === "ArrowDown" ? 0 : results.length - 1)
      : (index + (event.key === "ArrowDown" ? 1 : -1) + results.length) % results.length;
    setHighlightedCode(results[next].code);
    inputRef.current?.focus({ preventScroll: true });
  }

  return <>
    <button
      id={triggerId}
      ref={triggerRef}
      type="button"
      className={`search-control airport-selector-trigger${selected ? "" : " is-placeholder"}`}
      aria-label={label}
      aria-describedby={[selectionId, describedBy].filter(Boolean).join(" ")}
      data-invalid={invalid || undefined}
      aria-haspopup="dialog"
      aria-expanded={open}
      data-airport-code={value}
      onClick={() => {
        setQuery("");
        setHighlightedCode(selected?.code ?? airports[0]?.code ?? null);
        setOpen(true);
      }}
    ><span className="airport-trigger-value">{selected ? <>{selected.city} · <bdi>{value}</bdi></> : value || placeholder}</span><Icon icon={ChevronDown} size={16} /></button>
    <span id={selectionId} className="visually-hidden">{selected ? `فرودگاه انتخاب‌شده: ${selected.city}، ${selected.name}، ${selected.code}` : "فرودگاهی انتخاب نشده است."}</span>
    <Dialog open={open} onClose={() => setOpen(false)} title={`انتخاب ${label}`} className="picker-dialog airport-picker-dialog" returnFocusRef={triggerRef}>
      <div className="airport-search-field">
        <Icon icon={Search} size={18} />
        <Input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label="جست‌وجوی شهر یا فرودگاه"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={highlighted ? `${listId}-${highlighted.code}` : undefined}
          aria-describedby={helpId}
          placeholder="جست‌وجوی شهر یا فرودگاه"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={query}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);
            setHighlightedCode(searchAirports(airports, nextQuery)[0]?.code ?? null);
          }}
          onKeyDown={navigate}
        />
      </div>
      <div className="airport-results" id={listId} role="listbox" aria-label="فرودگاه‌ها">
        {results.map((airport) => <button
          key={airport.code}
          type="button"
          role="option"
          id={`${listId}-${airport.code}`}
          ref={(element) => { if (element) optionRefs.current.set(airport.code, element); else optionRefs.current.delete(airport.code); }}
          className={`airport-option${value === airport.code ? " is-selected" : ""}${highlightedCode === airport.code ? " is-active" : ""}`}
          aria-label={`${airport.city}، ${airport.name}، ${airport.code}`}
          aria-selected={value === airport.code}
          tabIndex={-1}
          onPointerMove={() => setHighlightedCode(airport.code)}
          onKeyDown={navigate}
          onClick={() => choose(airport.code)}
        ><Icon icon={direction === "destination" ? PlaneLanding : PlaneTakeoff} size={20} /><span className="airport-option-details"><span className="airport-city">{airport.city}</span><span className="airport-name">{airport.name}</span></span><bdi lang="en" className="airport-code">{airport.code}</bdi>{value === airport.code && <Icon icon={Check} size={18} />}</button>)}
      </div>
      {!results.length && <p className="airport-empty" role="status">فرودگاهی پیدا نشد. نام شهر، فرودگاه یا کد سه‌حرفی را تغییر دهید.</p>}
      <p id={helpId} className="visually-hidden">با کلیدهای بالا و پایین بین فرودگاه‌ها حرکت کنید؛ Enter انتخاب می‌کند و Escape پنجره را می‌بندد.</p>
      <span className="visually-hidden" role="status" aria-live="polite">{new Intl.NumberFormat("fa-IR").format(results.length)} فرودگاه پیدا شد.</span>
    </Dialog>
  </>;
}
