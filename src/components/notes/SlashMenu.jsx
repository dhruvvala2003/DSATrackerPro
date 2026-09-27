import { Fragment, forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

const SlashMenu = forwardRef(function SlashMenu({ items, command }, ref) {
  const [selected, setSelected] = useState(0)
  const [prevItems, setPrevItems] = useState(items)
  const listRef = useRef(null)

  if (items !== prevItems) {
    setPrevItems(items)
    setSelected(0)
  }

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (!items.length) return false
      if (event.key === 'ArrowDown') {
        setSelected((index) => (index + 1) % items.length)
        return true
      }
      if (event.key === 'ArrowUp') {
        setSelected((index) => (index + items.length - 1) % items.length)
        return true
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        command(items[selected])
        return true
      }
      return false
    },
  }), [items, selected, command])

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  return (
    <div
      ref={listRef}
      role="listbox"
      className="w-72 max-h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md p-1.5 shadow-2xl shadow-slate-900/15"
    >
      {items.length === 0 && <p className="px-3 py-2.5 text-sm text-slate-400">No matching blocks</p>}
      {items.map((item, index) => {
        const Icon = item.icon
        const active = index === selected
        return (
          <Fragment key={item.title}>
            {(index === 0 || items[index - 1].group !== item.group) && (
              <p className="px-2.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.group}</p>
            )}
            <button
              type="button"
              role="option"
              aria-selected={active}
              data-active={active}
              onMouseEnter={() => setSelected(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => command(item)}
              className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-xl text-left transition-colors ${active ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
            >
              <span className={`w-9 h-9 shrink-0 rounded-lg border flex items-center justify-center ${active ? 'bg-white border-indigo-200 text-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                <Icon size={16} />
              </span>
              <span className="min-w-0">
                <span className={`block text-sm font-semibold ${active ? 'text-indigo-700' : 'text-slate-800'}`}>{item.title}</span>
                <span className="block text-xs text-slate-400 truncate">{item.description}</span>
              </span>
            </button>
          </Fragment>
        )
      })}
    </div>
  )
})

export default SlashMenu
