import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Keyboard, Check, X, Globe, Sparkles } from 'lucide-react';

// Standard Arabic 102 (AZERTY) layout mapping widely used in Algeria / Maghreb
const AZERTY_ARABIC_MAP = {
  'a': 'ض', 'z': 'ص', 'e': 'ث', 'r': 'ق', 't': 'ف', 'y': 'غ', 'u': 'ع', 'i': 'ه', 'o': 'خ', 'p': 'ح',
  '^': 'ج', '$': 'د',
  'q': 'ش', 's': 'س', 'd': 'ي', 'f': 'ب', 'g': 'ل', 'h': 'ا', 'j': 'ت', 'k': 'ن', 'l': 'م', 'm': 'ك',
  'ù': 'ط', '*': 'ذ', '²': 'ذ',
  'w': 'ئ', 'x': 'ء', 'c': 'ؤ', 'v': 'ر', 'b': 'لا', 'n': 'ى', ',': 'ة', ';': 'و', ':': 'ز', '!': 'ظ',

  // CapsLock / Uppercase fallbacks (same letters for names, preventing accidental harakat)
  'A': 'ض', 'Z': 'ص', 'E': 'ث', 'R': 'ق', 'T': 'ف', 'Y': 'غ', 'U': 'ع', 'I': 'ه', 'O': 'خ', 'P': 'ح',
  'Q': 'ش', 'S': 'س', 'D': 'ي', 'F': 'ب', 'G': 'ل', 'H': 'ا', 'J': 'ت', 'K': 'ن', 'L': 'م', 'M': 'ك',
  'W': 'ئ', 'X': 'ء', 'C': 'ؤ', 'V': 'ر', 'B': 'لا', 'N': 'ى',
};

// Shift specific mappings (for Alef forms and symbols)
const AZERTY_SHIFT_MAP = {
  'H': 'أ', 'h': 'أ',
  'Y': 'إ', 'y': 'إ',
  'N': 'آ', 'n': 'آ',
  'T': 'لإ', 't': 'لإ',
  'G': 'لأ', 'g': 'لأ',
  'B': 'لآ', 'b': 'لآ',
  'A': 'َ', 'a': 'َ',
  'Z': 'ً', 'z': 'ً',
  'E': 'ُ', 'e': 'ُ',
  'R': 'ٌ', 'r': 'ٌ',
  'Q': 'ِ', 'q': 'ِ',
  'S': 'ٍ', 's': 'ٍ',
  'X': 'ْ', 'x': 'ْ',
  'K': '،', 'k': '،',
  '?': '؟'
};

// Standard Arabic 101 (QWERTY) layout mapping
const QWERTY_ARABIC_MAP = {
  'q': 'ض', 'w': 'ص', 'e': 'ث', 'r': 'ق', 't': 'ف', 'y': 'غ', 'u': 'ع', 'i': 'ه', 'o': 'خ', 'p': 'ح',
  '[': 'ج', ']': 'د',
  'a': 'ش', 's': 'س', 'd': 'ي', 'f': 'ب', 'g': 'ل', 'h': 'ا', 'j': 'ت', 'k': 'ن', 'l': 'م', ';': 'ك',
  '\'': 'ط', '`': 'ذ',
  'z': 'ئ', 'x': 'ء', 'c': 'ؤ', 'v': 'ر', 'b': 'لا', 'n': 'ى', 'm': 'ة', ',': 'و', '.': 'ز', '/': 'ظ',

  // Uppercase fallbacks
  'Q': 'ض', 'W': 'ص', 'E': 'ث', 'R': 'ق', 'T': 'ف', 'Y': 'غ', 'U': 'ع', 'I': 'ه', 'O': 'خ', 'P': 'ح',
  'A': 'ش', 'S': 'س', 'D': 'ي', 'F': 'ب', 'G': 'ل', 'H': 'ا', 'J': 'ت', 'K': 'ن', 'L': 'م',
  'Z': 'ئ', 'X': 'ء', 'C': 'ؤ', 'V': 'ر', 'B': 'لا', 'N': 'ى', 'M': 'ة'
};

const QWERTY_SHIFT_MAP = {
  'H': 'أ', 'h': 'أ',
  'Y': 'إ', 'y': 'إ',
  'N': 'آ', 'n': 'آ',
  'T': 'لإ', 't': 'لإ',
  'G': 'لأ', 'g': 'لأ',
  'B': 'لآ', 'b': 'لآ',
  'Q': 'َ', 'q': 'َ',
  'W': 'ً', 'w': 'ً',
  'E': 'ُ', 'e': 'ُ',
  'R': 'ٌ', 'r': 'ٌ',
  'A': 'ِ', 'a': 'ِ',
  'S': 'ٍ', 's': 'ٍ',
  'X': 'ْ', 'x': 'ْ',
  'K': '،', 'k': '،',
  '?': '؟'
};

// Phonetic / Arabizi fallback
const PHONETIC_MAP = {
  'a': 'ا', 'b': 'ب', 't': 'ت', 'j': 'ج', 'h': 'ح', 'd': 'د', 'r': 'ر', 'z': 'ز',
  's': 'س', 'f': 'ف', 'q': 'ق', 'k': 'ك', 'l': 'ل', 'm': 'م', 'n': 'ن', 'w': 'و',
  'y': 'ي', 'i': 'ي', 'e': 'ي', 'o': 'و', 'u': 'و', 'c': 'ك', 'g': 'ق', 'p': 'ب',
  'v': 'ف', 'x': 'كس', '2': 'ء', '3': 'ع', '5': 'خ', '7': 'ح', '9': 'ق'
};

// Virtual on-screen keyboard keys organized by rows
const VIRTUAL_KEYBOARD_ROWS = [
  ['ذ', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩', '٠'],
  ['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج', 'د'],
  ['ش', 'س', 'ي', 'ب', 'ل', 'ا', 'ت', 'ن', 'م', 'ك', 'ط'],
  ['ئ', 'ء', 'ؤ', 'ر', 'لا', 'ى', 'ة', 'و', 'ز', 'ظ'],
  ['أ', 'إ', 'آ', '،', '؟', 'َ', 'ِ', 'ُ', 'ْ', 'ّ']
];

const ArabicInput = forwardRef(({
  value = '',
  onChange,
  className = '',
  placeholder = '',
  required = false,
  autoFocus = false,
  disabled = false,
  id,
  name,
  onFocus,
  onBlur,
  ...props
}, ref) => {
  const internalRef = useRef(null);
  useImperativeHandle(ref, () => internalRef.current);

  const containerRef = useRef(null);
  const [layout, setLayout] = useState(() => {
    return localStorage.getItem('nour_arabic_keyboard_layout') || 'azerty';
  });
  const [showMenu, setShowMenu] = useState(false);
  const [showVirtualKeyboard, setShowVirtualKeyboard] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    localStorage.setItem('nour_arabic_keyboard_layout', layout);
  }, [layout]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowMenu(false);
        setShowVirtualKeyboard(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper to insert text at the cursor position and trigger React's synthetic onChange
  const insertTextAtCursor = (text) => {
    const inputEl = internalRef.current;
    if (!inputEl) return;

    const start = inputEl.selectionStart ?? inputEl.value.length;
    const end = inputEl.selectionEnd ?? inputEl.value.length;
    const oldValue = inputEl.value || '';
    const newValue = oldValue.slice(0, start) + text + oldValue.slice(end);

    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;

    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(inputEl, newValue);
    } else {
      inputEl.value = newValue;
    }

    const event = new Event('input', { bubbles: true });
    inputEl.dispatchEvent(event);
    const changeEvent = new Event('change', { bubbles: true });
    inputEl.dispatchEvent(changeEvent);

    if (onChange) {
      onChange({ target: { value: newValue, name: inputEl.name, id: inputEl.id } });
    }

    setTimeout(() => {
      inputEl.focus();
      inputEl.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  // Helper for backspace on virtual keyboard
  const handleVirtualBackspace = () => {
    const inputEl = internalRef.current;
    if (!inputEl) return;

    const start = inputEl.selectionStart ?? inputEl.value.length;
    const end = inputEl.selectionEnd ?? inputEl.value.length;
    const oldValue = inputEl.value || '';

    let newValue = '';
    let newPos = start;

    if (start !== end) {
      newValue = oldValue.slice(0, start) + oldValue.slice(end);
      newPos = start;
    } else if (start > 0) {
      newValue = oldValue.slice(0, start - 1) + oldValue.slice(start);
      newPos = start - 1;
    } else {
      return;
    }

    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;

    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(inputEl, newValue);
    } else {
      inputEl.value = newValue;
    }

    const event = new Event('input', { bubbles: true });
    inputEl.dispatchEvent(event);
    const changeEvent = new Event('change', { bubbles: true });
    inputEl.dispatchEvent(changeEvent);

    if (onChange) {
      onChange({ target: { value: newValue, name: inputEl.name, id: inputEl.id } });
    }

    setTimeout(() => {
      inputEl.focus();
      inputEl.setSelectionRange(newPos, newPos);
    }, 0);
  };

  // Keystroke interceptor
  const handleKeyDown = (e) => {
    // Let browser shortcuts pass through (Ctrl+C, Ctrl+V, Ctrl+A, Alt, Meta, etc.)
    if (e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    // Ignore navigation & control keys
    if ([
      'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Tab', 'Enter', 'Home', 'End', 'PageUp', 'PageDown', 'Escape', 'Shift', 'CapsLock'
    ].includes(e.key)) {
      return;
    }

    // If disabled layout, let native typing happen
    if (layout === 'off') {
      return;
    }

    // If already Arabic character, let it pass natively
    if (/[\u0600-\u06FF]/.test(e.key)) {
      return;
    }

    let mappedChar = null;

    if (layout === 'azerty') {
      if (e.shiftKey && AZERTY_SHIFT_MAP[e.key]) {
        mappedChar = AZERTY_SHIFT_MAP[e.key];
      } else if (AZERTY_ARABIC_MAP[e.key]) {
        mappedChar = AZERTY_ARABIC_MAP[e.key];
      }
    } else if (layout === 'qwerty') {
      if (e.shiftKey && QWERTY_SHIFT_MAP[e.key]) {
        mappedChar = QWERTY_SHIFT_MAP[e.key];
      } else if (QWERTY_ARABIC_MAP[e.key]) {
        mappedChar = QWERTY_ARABIC_MAP[e.key];
      }
    } else if (layout === 'phonetic') {
      const lower = e.key.toLowerCase();
      if (PHONETIC_MAP[lower]) {
        mappedChar = PHONETIC_MAP[lower];
      }
    }

    if (mappedChar) {
      e.preventDefault();
      insertTextAtCursor(mappedChar);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          ref={internalRef}
          type="text"
          dir="rtl"
          lang="ar"
          inputMode="text"
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          onFocus={(e) => {
            setIsFocused(true);
            if (onFocus) onFocus(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            if (onBlur) onBlur(e);
          }}
          placeholder={placeholder}
          required={required}
          autoFocus={autoFocus}
          disabled={disabled}
          id={id}
          name={name}
          className={`w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 pl-20 text-xs text-slate-900 font-sans focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all ${className}`}
          {...props}
        />

        {/* Keyboard status & switcher pill button */}
        <div className="absolute left-2 flex items-center gap-1">
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowMenu(prev => !prev)}
            title="إعدادات لوحة المفاتيح العربية / Clavier Arabe"
            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
              layout !== 'off'
                ? 'bg-emerald-100/90 text-emerald-800 hover:bg-emerald-200 border border-emerald-300/60'
                : 'bg-slate-200/80 text-slate-600 hover:bg-slate-300 border border-slate-300'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${layout !== 'off' ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'}`} />
            <span className="font-mono">
              {layout === 'azerty' ? 'ع AZERTY' : layout === 'qwerty' ? 'ع QWERTY' : layout === 'phonetic' ? 'ع صوتي' : 'ع غير مفعل'}
            </span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowVirtualKeyboard(prev => !prev)}
            title="إظهار لوحة المفاتيح المرئية / Afficher le clavier virtuel"
            className={`p-1 rounded-lg text-xs transition-all ${
              showVirtualKeyboard
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <Keyboard size={14} />
          </button>
        </div>
      </div>

      {/* Settings Dropdown Menu */}
      {showMenu && (
        <div
          dir="rtl"
          className="absolute z-50 left-0 top-full mt-1.5 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-3 text-xs space-y-2 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Globe size={13} className="text-emerald-600" />
              لوحة المفاتيح العربية (إدخال فوري)
            </span>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowMenu(false)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
            >
              <X size={13} />
            </button>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            يقوم النظام بتحويل الحروف المكتوبة باللاتينية إلى العربية تلقائياً فورياً:
          </p>

          <div className="space-y-1">
            {[
              { id: 'azerty', label: 'AZERTY (الجزائر والمغرب العربي)', desc: 'موصى به للأجهزة بلوحة مفاتيح فرنسية' },
              { id: 'qwerty', label: 'QWERTY (اللوحة القياسية 101)', desc: 'للأجهزة بالإنجليزية' },
              { id: 'phonetic', label: 'صوتي / Arabizi (مثال: y -> ي)', desc: 'كتابة بالحروف اللاتينية صوتياً' },
              { id: 'off', label: 'إلغاء التحويل (إدخال الويندوز المباشر)', desc: 'إذا كنت تستخدم مفاتيح الويندوز Alt+Shift' },
            ].map(item => (
              <button
                key={item.id}
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setLayout(item.id);
                  setShowMenu(false);
                }}
                className={`w-full text-right p-2 rounded-xl flex items-start justify-between gap-2 transition-all ${
                  layout === item.id
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div>
                  <div className="text-xs">{item.label}</div>
                  <div className="text-[10px] text-slate-400 font-normal">{item.desc}</div>
                </div>
                {layout === item.id && <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />}
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setShowVirtualKeyboard(prev => !prev);
                setShowMenu(false);
              }}
              className="text-[11px] text-emerald-700 font-bold hover:underline flex items-center gap-1"
            >
              <Keyboard size={12} />
              {showVirtualKeyboard ? 'إخفاء اللوحة المرئية' : 'إظهار لوحة المفاتيح المرئية'}
            </button>
          </div>
        </div>
      )}

      {/* On-Screen Floating Arabic Keyboard */}
      {showVirtualKeyboard && (
        <div
          dir="rtl"
          className="absolute z-40 left-0 right-0 top-full mt-2 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-slate-700 p-3 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-150 select-none"
        >
          <div className="flex items-center justify-between pb-1 text-[11px] text-slate-400 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <Sparkles size={13} className="text-emerald-400" />
              <span className="font-bold text-slate-200">لوحة المفاتيح العربية المرئية</span>
            </div>
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShowVirtualKeyboard(false)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
            >
              <X size={14} />
            </button>
          </div>

          <div className="space-y-1 pt-1">
            {VIRTUAL_KEYBOARD_ROWS.map((row, rIdx) => (
              <div key={rIdx} className="flex justify-center gap-1">
                {row.map((k) => (
                  <button
                    key={k}
                    type="button"
                    tabIndex={-1}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertTextAtCursor(k);
                    }}
                    className="h-8 min-w-[28px] px-1.5 bg-slate-800 hover:bg-emerald-600 active:scale-95 text-slate-100 hover:text-white font-bold rounded-lg text-xs shadow-sm border border-slate-700 hover:border-emerald-500 transition-all flex items-center justify-center font-sans"
                  >
                    {k}
                  </button>
                ))}
              </div>
            ))}

            {/* Space, Backspace & Clear row */}
            <div className="flex justify-center gap-1.5 pt-1">
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleVirtualBackspace();
                }}
                className="h-8 px-3 bg-red-900/40 hover:bg-red-700 active:scale-95 text-red-200 font-bold rounded-lg text-xs border border-red-800/60 transition-all flex items-center justify-center gap-1"
              >
                ⌫ مسح حرف
              </button>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertTextAtCursor(' ');
                }}
                className="h-8 flex-1 max-w-[180px] bg-slate-800 hover:bg-emerald-600 active:scale-95 text-slate-200 font-bold rounded-lg text-xs border border-slate-700 transition-all flex items-center justify-center"
              >
                مسافة (Space)
              </button>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => {
                  e.preventDefault();
                  const inputEl = internalRef.current;
                  if (inputEl) {
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                      window.HTMLInputElement.prototype,
                      'value'
                    )?.set;
                    if (nativeInputValueSetter) nativeInputValueSetter.call(inputEl, '');
                    else inputEl.value = '';
                    const ev = new Event('input', { bubbles: true });
                    inputEl.dispatchEvent(ev);
                    setTimeout(() => inputEl.focus(), 0);
                  }
                }}
                className="h-8 px-3 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-bold rounded-lg text-xs border border-slate-700 transition-all flex items-center justify-center"
              >
                مسح الكل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

ArabicInput.displayName = 'ArabicInput';

export default ArabicInput;
