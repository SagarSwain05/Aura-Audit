'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'

/** Searchable single-select typeahead against a flat catalog list, with a "use my own text" escape hatch. */
export function CatalogPicker({
  value, onChange, options, icon: Icon, placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  icon: React.ComponentType<{ className?: string }>
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase()
    if (!q) return options.slice(0, 8)
    return options.filter((o) => o.toLowerCase().includes(q)).slice(0, 8)
  }, [value, options])

  return (
    <div ref={ref} className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aura-muted" />
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="input-field pl-9 text-sm w-full"
      />
      {open && (
        <div className="absolute z-20 mt-1.5 w-full glass-card border border-white/10 rounded-xl overflow-hidden max-h-56 overflow-y-auto shadow-xl">
          {suggestions.length > 0 ? (
            suggestions.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => { onChange(o); setOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-white/5 transition-colors"
              >
                <Icon className="w-3.5 h-3.5 shrink-0 text-aura-muted" />
                <span className="truncate">{o}</span>
              </button>
            ))
          ) : (
            <p className="px-3 py-2.5 text-xs text-aura-muted">No catalog match — your own text will be used as typed.</p>
          )}
        </div>
      )}
    </div>
  )
}

/** Searchable multi-select against a flat catalog list — pick many skills, shown as removable tags. */
export function MultiCatalogPicker({
  value, onChange, options, placeholder,
}: {
  value: string[]
  onChange: (v: string[]) => void
  options: string[]
  placeholder: string
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const selected = useMemo(() => new Set(value.map((v) => v.toLowerCase())), [value])

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    const pool = q ? options.filter((o) => o.toLowerCase().includes(q)) : options
    return pool.filter((o) => !selected.has(o.toLowerCase())).slice(0, 8)
  }, [query, options, selected])

  const add = (skill: string) => {
    const s = skill.trim()
    if (!s || selected.has(s.toLowerCase())) return
    onChange([...value, s])
    setQuery('')
  }
  const remove = (skill: string) => onChange(value.filter((v) => v !== skill))

  return (
    <div ref={ref} className="relative">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((s) => (
            <span key={s} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-aura-purple/15 text-aura-purple-light">
              {s}
              <button type="button" onClick={() => remove(s)} className="hover:text-red-400 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && query.trim()) { e.preventDefault(); add(query) }
        }}
        placeholder={placeholder}
        className="input-field text-sm w-full"
      />
      {open && (
        <div className="absolute z-20 mt-1.5 w-full glass-card border border-white/10 rounded-xl overflow-hidden max-h-56 overflow-y-auto shadow-xl">
          {suggestions.length > 0 ? (
            suggestions.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => add(o)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-white/5 transition-colors"
              >
                <span className="truncate">{o}</span>
              </button>
            ))
          ) : query.trim() ? (
            <button
              type="button"
              onClick={() => add(query)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-white/5 transition-colors text-aura-purple-light"
            >
              Add &quot;{query.trim()}&quot; as a custom skill
            </button>
          ) : (
            <p className="px-3 py-2.5 text-xs text-aura-muted">Start typing to search the skill catalog.</p>
          )}
        </div>
      )}
    </div>
  )
}
