import React, { useState, Children, isValidElement, useMemo, useRef, useEffect } from 'react';

const CustomSelect = ({ value, onChange, children, className, disabled, options: propOptions, placeholder: propPlaceholder, searchable }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  
  const options = propOptions ? [...propOptions] : [];
  Children.toArray(children).forEach(child => {
    if (isValidElement(child) && child.type === 'option') {
      options.push({
        value: child.props.value,
        label: child.props.children,
        image: child.props['data-image'],
        search: child.props['data-search'] || ''
      });
    } else if (isValidElement(child) && child.type === React.Fragment) {
       Children.toArray(child.props.children).forEach(subChild => {
         if (isValidElement(subChild) && subChild.type === 'option') {
           options.push({
             value: subChild.props.value,
             label: subChild.props.children,
             image: subChild.props['data-image'],
             search: subChild.props['data-search'] || ''
           });
         }
       });
    }
  });

  const selectedOption = options.find(opt => String(opt.value) === String(value));
  const placeholder = propPlaceholder || (options.length > 0 ? options[0].label : 'Select...');

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchTerm) return options;
    const term = searchTerm.toLowerCase();
    return options.filter(opt => {
      const searchTarget = (opt.search + ' ' + String(opt.label)).toLowerCase();
      return searchTarget.includes(term);
    });
  }, [options, searchable, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen && searchable && inputRef.current) {
      inputRef.current.focus();
    }
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen, searchable]);

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div
        className={`${className || "w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold"} cursor-pointer flex justify-between items-center ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        tabIndex={disabled ? -1 : 0}
      >
        <span className={selectedOption ? 'flex items-center gap-2 truncate text-sm font-semibold' : 'truncate text-sm text-slate-400'}>
          {selectedOption?.image && <img src={selectedOption.image} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />}
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="text-slate-400 text-[10px] shrink-0 ml-2">▼</span>
      </div>
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 flex flex-col overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-slate-100 bg-slate-50">
              <input
                ref={inputRef}
                type="text"
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="بحث / Search..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          )}
          <div className="overflow-y-auto max-h-48">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  onClick={(e) => {
                    e.preventDefault();
                    if (onChange) {
                      onChange({ target: { value: opt.value } });
                    }
                    setIsOpen(false);
                  }}
                  className="px-4 py-2 hover:bg-emerald-50 cursor-pointer text-sm text-slate-700 transition-colors border-b border-slate-50 last:border-0 flex items-center gap-3"
                >
                  {opt.image && <img src={opt.image} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />}
                  <span className="truncate">{opt.label}</span>
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-center text-xs text-slate-400">لا توجد نتائج / No results</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
