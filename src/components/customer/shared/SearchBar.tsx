'use client'

import { Search, X } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'

interface SearchBarProps {
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  onSearch?: (value: string) => void
  autoFocus?: boolean
  className?: string
}

export function SearchBar({
  placeholder,
  value: externalValue,
  onChange,
  onSearch,
  autoFocus = false,
  className = '',
}: SearchBarProps) {
  const locale = useLocale()
  const t = useTranslations('home')
  const [internalValue, setInternalValue] = useState('')

  const value = externalValue !== undefined ? externalValue : internalValue
  const isRTL = locale === 'ar'

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    if (onChange) {
      onChange(newValue)
    } else {
      setInternalValue(newValue)
    }
  }

  const handleClear = () => {
    if (onChange) {
      onChange('')
    } else {
      setInternalValue('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(value)
    }
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 ${isRTL ? 'right-4' : 'left-4'}`} />
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t('searchPlaceholder')}
          autoFocus={autoFocus}
          className={`w-full h-12 bg-slate-100 rounded-full outline-none transition-all focus:ring-2 focus:ring-primary focus:bg-white ${
            isRTL ? 'pr-12 pl-10' : 'pl-12 pr-10'
          }`}
        />
        {value && (
          <button
            onClick={handleClear}
            className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600 ${
              isRTL ? 'left-3' : 'right-3'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
