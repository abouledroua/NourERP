import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Calendar } from 'lucide-react';

/**
 * DateInput Component
 * Enforces strict 'JJ/MM/AAAA' (Day/Month/Year) display and input formatting.
 * Internal / External form value is standardized to ISO 'YYYY-MM-DD' for DB compatibility.
 */
const DateInput = forwardRef(({
  value = '',
  onChange,
  className = '',
  placeholder = 'JJ/MM/AAAA',
  required = false,
  disabled = false,
  id,
  name,
  onBlur,
  onFocus,
  ...props
}, ref) => {
  const inputRef = useRef(null);
  const hiddenPickerRef = useRef(null);
  useImperativeHandle(ref, () => inputRef.current);

  // Convert incoming 'YYYY-MM-DD' to 'DD/MM/YYYY' for display
  const isoToDisplay = (isoStr) => {
    if (!isoStr) return '';
    const str = String(isoStr).split('T')[0];
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, y, m, d] = match;
      return `${d}/${m}/${y}`;
    }
    // If already in DD/MM/YYYY
    const dMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (dMatch) return str;
    return str;
  };

  // Convert display 'DD/MM/YYYY' to ISO 'YYYY-MM-DD'
  const displayToIso = (dispStr) => {
    if (!dispStr) return '';
    const match = dispStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return '';
    const [, d, m, y] = match;
    const day = parseInt(d, 10);
    const month = parseInt(m, 10);
    const year = parseInt(y, 10);
    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
      return '';
    }
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  };

  const [displayValue, setDisplayValue] = useState(() => isoToDisplay(value));
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    setDisplayValue(isoToDisplay(value));
  }, [value]);

  const handleInputChange = (e) => {
    const raw = e.target.value;
    // Keep only numbers and slashes
    const digits = raw.replace(/\D/g, '').slice(0, 8);

    let formatted = '';
    if (digits.length <= 2) {
      formatted = digits;
    } else if (digits.length <= 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
    }

    setDisplayValue(formatted);

    if (formatted.length === 10) {
      const iso = displayToIso(formatted);
      if (iso) {
        setIsValid(true);
        if (onChange) {
          onChange({
            target: {
              value: iso,
              name: name || id,
              id: id
            }
          });
        }
      } else {
        setIsValid(false);
      }
    } else if (formatted.length === 0) {
      setIsValid(true);
      if (onChange) {
        onChange({
          target: {
            value: '',
            name: name || id,
            id: id
          }
        });
      }
    }
  };

  const handleInputBlur = (e) => {
    if (displayValue && displayValue.length < 10) {
      setIsValid(false);
    } else if (displayValue && displayValue.length === 10) {
      const iso = displayToIso(displayValue);
      setIsValid(!!iso);
      if (iso && onChange) {
        onChange({
          target: {
            value: iso,
            name: name || id,
            id: id
          }
        });
      }
    }
    if (onBlur) onBlur(e);
  };

  // Hidden native date picker change handler
  const handlePickerChange = (e) => {
    const pickedIso = e.target.value; // 'YYYY-MM-DD'
    if (pickedIso) {
      const disp = isoToDisplay(pickedIso);
      setDisplayValue(disp);
      setIsValid(true);
      if (onChange) {
        onChange({
          target: {
            value: pickedIso,
            name: name || id,
            id: id
          }
        });
      }
    }
  };

  const openCalendar = () => {
    if (hiddenPickerRef.current) {
      try {
        if (typeof hiddenPickerRef.current.showPicker === 'function') {
          hiddenPickerRef.current.showPicker();
        } else {
          hiddenPickerRef.current.click();
        }
      } catch {
        hiddenPickerRef.current.click();
      }
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="\d{2}/\d{2}/\d{4}"
          value={displayValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onFocus={onFocus}
          placeholder={placeholder || 'JJ/MM/AAAA'}
          required={required}
          disabled={disabled}
          id={id}
          name={name}
          maxLength={10}
          className={`w-full bg-slate-50 border rounded-xl p-2.5 ltr:pr-8 rtl:pl-8 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all ${
            !isValid ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/30' : 'border-slate-200'
          } ${className}`}
          {...props}
        />

        {/* Calendar picker icon button */}
        <div className="absolute ltr:right-2 rtl:left-2 flex items-center pointer-events-auto">
          <button
            type="button"
            tabIndex={-1}
            onClick={openCalendar}
            title="اختيار من التقويم / Choisir depuis le calendrier"
            className="p-1 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
          >
            <Calendar size={15} />
          </button>
        </div>

        {/* Hidden native date input to allow visual calendar picker */}
        <input
          ref={hiddenPickerRef}
          type="date"
          tabIndex={-1}
          value={displayToIso(displayValue) || ''}
          onChange={handlePickerChange}
          className="absolute -bottom-1 right-2 opacity-0 pointer-events-none w-0 h-0"
          aria-hidden="true"
        />
      </div>

      {!isValid && (
        <span className="text-[10px] text-rose-500 font-medium mt-0.5 block">
          صيغة التاريخ يجب أن تكون: يوم/شهر/سنة (JJ/MM/AAAA)
        </span>
      )}
    </div>
  );
});

DateInput.displayName = 'DateInput';

export default DateInput;
