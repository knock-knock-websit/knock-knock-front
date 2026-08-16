"use client";

import { Children, forwardRef, isValidElement, useEffect, useMemo, useRef, useState, type InputHTMLAttributes, type ReactElement, type ReactNode, type SelectHTMLAttributes } from "react";

export const FormInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function FormInput({ className = "", ...props }, ref) {
    return <input ref={ref} className={`form-input ${className}`.trim()} {...props} />;
  },
);

type FormSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> & {
  onValueChange?: (value: string) => void;
  showArrow?: boolean;
};

export function FormSelect({ className = "", children, value, defaultValue, name, disabled, required, onValueChange, showArrow = true }: FormSelectProps) {
  const options = useMemo(() => Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child) || child.type !== "option") return [];
    const option = child as ReactElement<{ value?: string | number; disabled?: boolean; children?: unknown }>;
    const label = Children.toArray(option.props.children as ReactNode).map((part) => typeof part === "string" || typeof part === "number" ? String(part) : "").join("");
    return [{ value: String(option.props.value ?? label), label, disabled: Boolean(option.props.disabled) }];
  }), [children]);
  const initialValue = String(defaultValue ?? options.find((option) => !option.disabled)?.value ?? "");
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(initialValue);
  const selectedValue = controlled ? String(value) : internalValue;
  const selectedOption = options.find((option) => option.value === selectedValue);
  const [open, setOpen] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form || controlled) return;
    const reset = () => { setInternalValue(initialValue); setInvalid(false); };
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, [controlled, initialValue]);

  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form || !required) return;
    const validate = (event: Event) => {
      if (selectedValue) return;
      event.preventDefault();
      setInvalid(true);
      rootRef.current?.querySelector<HTMLButtonElement>(".form-select-trigger")?.focus();
    };
    form.addEventListener("submit", validate, true);
    return () => form.removeEventListener("submit", validate, true);
  }, [required, selectedValue]);

  const choose = (nextValue: string) => {
    if (!controlled) setInternalValue(nextValue);
    onValueChange?.(nextValue);
    setInvalid(false);
    setOpen(false);
  };

  return <div className={`form-select-wrap ${open ? "open" : ""} ${invalid ? "invalid" : ""} ${className}`.trim()} ref={rootRef}>
    {name && <input type="hidden" name={name} value={selectedValue} readOnly data-required={required || undefined} />}
    <button type="button" className="form-select-trigger" disabled={disabled} onClick={() => setOpen((current) => !current)} aria-haspopup="listbox" aria-expanded={open} aria-invalid={invalid}><span className={selectedOption ? "" : "placeholder"}>{selectedOption?.label ?? "請選擇"}</span>{showArrow && <i aria-hidden="true">⌄</i>}</button>
    {open && <div className="form-select-menu" role="listbox">{options.map((option) => <button type="button" role="option" disabled={option.disabled} aria-selected={selectedValue === option.value} className={selectedValue === option.value ? "selected" : ""} onClick={() => choose(option.value)} key={option.value}><span>{option.label}</span>{selectedValue === option.value && <b aria-hidden="true">✓</b>}</button>)}</div>}
    {invalid && <small className="form-control-error">請選擇一個選項</small>}
  </div>;
}

export const FormRadio = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function FormRadio({ className = "", ...props }, ref) {
    return <span className={`form-choice form-radio ${className}`.trim()}><input ref={ref} type="radio" {...props} /><span className="form-choice-mark" aria-hidden="true" /></span>;
  },
);

export const FormCheckbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function FormCheckbox({ className = "", ...props }, ref) {
    return <span className={`form-choice form-checkbox ${className}`.trim()}><input ref={ref} type="checkbox" {...props} /><span className="form-choice-mark" aria-hidden="true" /></span>;
  },
);

type FormDatePickerProps = {
  name: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  onValueChange?: (value: string) => void;
};

function toDateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateValue(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function FormDatePicker({ name, value, defaultValue = "", placeholder = "選擇日期", disabled, required, onValueChange }: FormDatePickerProps) {
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const selectedValue = controlled ? value : internalValue;
  const selectedDate = parseDateValue(selectedValue);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initial = parseDateValue(value ?? defaultValue) ?? new Date();
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });
  const rootRef = useRef<HTMLDivElement>(null);
  const days = useMemo(() => {
    const first = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [visibleMonth]);
  const currentYear = new Date().getFullYear();
  const availableYears = useMemo(() => Array.from({ length: currentYear - 1899 }, (_, index) => currentYear - index), [currentYear]);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const updateSelectedValue = (nextValue: string) => {
    if (!controlled) setInternalValue(nextValue);
    onValueChange?.(nextValue);
  };
  const choose = (nextValue: string) => {
    updateSelectedValue(nextValue);
    setOpen(false);
  };
  const changePeriod = (year: number, month: number) => {
    const preferredDay = selectedDate?.getDate() ?? 1;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const nextDate = new Date(year, month, Math.min(preferredDay, lastDay));
    setVisibleMonth(new Date(year, month, 1));
    updateSelectedValue(toDateValue(nextDate));
  };
  const displayValue = selectedDate ? selectedDate.toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" }) : placeholder;

  return <div className={`form-datepicker ${open ? "open" : ""}`} ref={rootRef}>
    <input type="hidden" name={name} value={selectedValue} readOnly data-required={required || undefined} />
    <button type="button" className="form-datepicker-trigger" disabled={disabled} onClick={() => setOpen((current) => !current)} aria-haspopup="dialog" aria-expanded={open}><span className={selectedDate ? "" : "placeholder"}>{displayValue}</span><i aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></svg></i></button>
    {open && <div className="form-datepicker-popover" role="dialog" aria-label="選擇日期">
      <div className="form-datepicker-head"><button type="button" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))} aria-label="上一個月">←</button><div className="form-datepicker-period"><FormSelect showArrow={false} value={String(visibleMonth.getFullYear())} onValueChange={(year) => changePeriod(Number(year), visibleMonth.getMonth())}>{availableYears.map((year) => <option value={year} key={year}>{year} 年</option>)}</FormSelect><FormSelect showArrow={false} value={String(visibleMonth.getMonth())} onValueChange={(month) => changePeriod(visibleMonth.getFullYear(), Number(month))}>{Array.from({ length: 12 }, (_, month) => <option value={month} key={month}>{month + 1} 月</option>)}</FormSelect></div><button type="button" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))} aria-label="下一個月">→</button></div>
      <div className="form-datepicker-weekdays">{["日", "一", "二", "三", "四", "五", "六"].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="form-datepicker-days">{days.map((day) => { const dateValue = toDateValue(day); return <button type="button" className={`${day.getMonth() !== visibleMonth.getMonth() ? "outside" : ""} ${selectedValue === dateValue ? "selected" : ""} ${toDateValue(new Date()) === dateValue ? "today" : ""}`.trim()} onClick={() => choose(dateValue)} aria-pressed={selectedValue === dateValue} key={dateValue}>{day.getDate()}</button>; })}</div>
      <div className="form-datepicker-actions"><button type="button" onClick={() => choose("")}>清除</button><button type="button" onClick={() => { const today = new Date(); setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1)); choose(toDateValue(today)); }}>今天</button></div>
    </div>}
  </div>;
}
