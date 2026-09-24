import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Clock } from 'lucide-react';

/**
 * TimeInput Component
 * Enforces strict 'HH:MM' (24-hour) display and input formatting.
 * Internal / External form value is standardized to 'HH:MM'
 */
const TimeInput = forwardRef(({
  value = '',
  onChange,
  className = '',
  placeholder = 'HH:MM',
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

  const normalizeTime = (timeStr) => {
    if (!timeStr) return '';
    const str = String(timeStr).substring(0, 5);
    const match = str.match(/^(\d{2}):(\d{2})/);
    if (match) {
      return `${match[1]}:${match[2]}`;
    }
    return str;
  };

  const [displayValue, setDisplayValue] = useState(() => normalizeTime(value));
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    setDisplayValue(normalizeTime(value));
  }, [value]);

  const handleInputChange = (e) => {
    const raw = e.target.value;
    // Keep only numbers and colons
    const digits = raw.replace(/\D/g, '').slice(0, 4);

    let formatted = '';
    if (digits.length <= 2) {
      formatted = digits;
    } else {
      formatted = `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
    }

    setDisplayValue(formatted);

    if (formatted.length === 5) {
      const match = formatted.match(/^(\d{2}):(\d{2})$/);
      if (match) {
        const h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
          setIsValid(true);
          if (onChange) {
            onChange({
              target: {
                value: formatted,
                name: name || id,
                id: id
              }
            });
          }
          return;
        }
      }
      setIsValid(false);
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
    if (displayValue && displayValue.length < 5) {
      setIsValid(false);
    } else if (displayValue && displayValue.length === 5) {
      const match = displayValue.match(/^(\d{2}):(\d{2})$/);
      if (match) {
        const h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
          setIsValid(true);
          if (onChange) {
            onChange({
              target: {
                value: displayValue,
                name: name || id,
                id: id
              }
            });
          }
        } else {
           setIsValid(false);
        }
      } else {
        setIsValid(false);
      }
    }
    if (onBlur) onBlur(e);
  };

  // Hidden native time picker change handler
  const handlePickerChange = (e) => {
    const pickedTime = e.target.value; // 'HH:MM'
    if (pickedTime) {
      setDisplayValue(pickedTime);
      setIsValid(true);
      if (onChange) {
        onChange({
          target: {
            value: pickedTime,
            name: name || id,
            id: id
          }
        });
      }
    }
  };

  const openClock = () => {
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
          pattern="\d{2}:\d{2}"
          value={displayValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onFocus={onFocus}
          placeholder={placeholder || 'HH:MM'}
          required={required}
          disabled={disabled}
          id={id}
          name={name}
          maxLength={5}
          className={`w-full bg-slate-50 border rounded-xl p-2.5 ltr:pr-8 rtl:pl-8 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all ${
            !isValid ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/30' : 'border-slate-200'
          } ${className}`}
          {...props}
        />

        {/* Clock picker icon button */}
        <div className="absolute ltr:right-2 rtl:left-2 flex items-center pointer-events-auto">
          <button
            type="button"
            tabIndex={-1}
            onClick={openClock}
            title="اختيار الوقت / Choisir l'heure"
            className="p-1 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
          >
            <Clock size={15} />
          </button>
        </div>

        {/* Hidden native time input to allow visual time picker */}
        <input
          ref={hiddenPickerRef}
          type="time"
          tabIndex={-1}
          value={displayValue || ''}
          onChange={handlePickerChange}
          className="absolute -bottom-1 right-2 opacity-0 pointer-events-none w-0 h-0"
          aria-hidden="true"
        />
      </div>

      {!isValid && (
        <span className="text-[10px] text-rose-500 font-medium mt-0.5 block">
          صيغة الوقت يجب أن تكون: ساعة:دقيقة (HH:MM)
        </span>
      )}
    </div>
  );
});

TimeInput.displayName = 'TimeInput';

export default TimeInput;
