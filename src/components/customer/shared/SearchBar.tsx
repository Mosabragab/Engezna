'use client'

import { Search, X, Mic } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'

interface SearchBarProps {
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  onSearch?: (value: string) => void
  onVoiceClick?: () => void
  autoFocus?: boolean
  className?: string
}

export function SearchBar({
  placeholder,
  value: externalValue,
  onChange,
  onSearch,
  onVoiceClick,
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
      <div className="relative flex items-center bg-slate-100 rounded-full border border-slate-200 focus-within:ring-2 focus-within:ring-primary focus-within:bg-white focus-within:border-primary">
        <Search className={`w-5 h-5 text-slate-400 ${isRTL ? 'mr-4' : 'ml-4'}`} />
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t('searchPlaceholder')}
          autoFocus={autoFocus}
          className={`flex-1 h-12 bg-transparent outline-none px-3 ${
            isRTL ? 'text-right' : 'text-left'
          }`}
        />
        {value && (
          <button
            onClick={handleClear}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {onVoiceClick && (
          <button
            onClick={onVoiceClick}
            className={`w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary hover:text-white text-primary transition-colors ${
              isRTL ? 'ml-1' : 'mr-1'
            }`}
            aria-label={locale === 'ar' ? 'البحث بالصوت' : 'Voice search'}
          >
            <Mic className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}
