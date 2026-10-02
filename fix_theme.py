import re

with open('src/components/dashboard-layout.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

replacements = [
    ('min-h-screen bg-zinc-950 flex flex-col items-center justify-center', 'min-h-screen bg-[var(--background)] flex flex-col items-center justify-center'),
    ('border-4 border-indigo-500 border-t-transparent rounded-full animate-spin', 'border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin'),
    ('mt-4 text-zinc-400 font-medium', 'mt-4 text-[var(--muted-foreground)] font-medium'),
    ('min-h-screen flex bg-zinc-950', 'min-h-screen flex bg-[var(--background)]'),
    ('lg:flex-col lg:w-64 bg-zinc-900 border-r border-zinc-800', 'lg:flex-col lg:w-64 bg-[var(--card)] border-r border-[var(--border)]'),
    ('font-extrabold text-base tracking-tight bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent', 'font-extrabold text-base tracking-tight text-[var(--foreground)]'),
    ('block text-[10px] text-emerald-400 font-semibold tracking-wider uppercase', 'block text-[10px] text-emerald-500 font-semibold tracking-wider uppercase'),
    ("isActive ? 'text-indigo-400' : 'text-zinc-400'", "isActive ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'"),
    ('border-t border-zinc-800 pt-4 mt-4', 'border-t border-[var(--border)] pt-4 mt-4'),
    ('items-center justify-between p-2 rounded-lg bg-zinc-850 border border-zinc-800', 'items-center justify-between p-2 rounded-lg bg-[var(--secondary)] border border-[var(--border)]'),
    ('w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0 uppercase', 'w-8 h-8 rounded-full bg-[var(--primary)]/20 text-[var(--primary)] flex items-center justify-center font-bold text-sm shrink-0 uppercase'),
    ('text-xs font-semibold text-zinc-200 truncate', 'text-xs font-semibold text-[var(--foreground)] truncate'),
    ('text-[10px] text-zinc-500 capitalize', 'text-[10px] text-[var(--muted-foreground)] capitalize'),
    ('fixed inset-0 z-50 flex lg:hidden bg-zinc-950/80 backdrop-blur-sm', 'fixed inset-0 z-50 flex lg:hidden bg-black/60 backdrop-blur-sm'),
    ('w-64 bg-zinc-900 border-r border-zinc-800 p-4 flex flex-col justify-between h-full animate-fade-in-up', 'w-64 bg-[var(--card)] border-r border-[var(--border)] p-4 flex flex-col justify-between h-full animate-fade-in-up'),
    ('font-bold text-sm text-zinc-200', 'font-bold text-sm text-[var(--foreground)]'),
    ('block text-[9px] text-emerald-400 font-semibold', 'block text-[9px] text-emerald-500 font-semibold'),
    ('p-1 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-800', 'p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-md hover:bg-[var(--accent)]'),
    ('border-t border-zinc-800 pt-4', 'border-t border-[var(--border)] pt-4'),
    ('flex items-center justify-between p-2 rounded-lg bg-zinc-800', 'flex items-center justify-between p-2 rounded-lg bg-[var(--secondary)]'),
    ('w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm', 'w-8 h-8 rounded-full bg-[var(--primary)]/20 text-[var(--primary)] flex items-center justify-center font-bold text-sm'),
    ('text-xs font-semibold text-zinc-200', 'text-xs font-semibold text-[var(--foreground)]'),
    ('p-1.5 text-zinc-500 hover:text-rose-400 rounded-md', 'p-1.5 text-[var(--muted-foreground)] hover:text-rose-500 rounded-md'),
    ('bg-zinc-900/60 backdrop-blur-md border-b border-zinc-800', 'bg-[var(--card)]/80 backdrop-blur-md border-b border-[var(--border)]'),
    ('text-zinc-400 hover:text-white rounded-md lg:hidden hover:bg-zinc-800', 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-md lg:hidden hover:bg-[var(--accent)]'),
    ('text-base lg:text-lg font-bold text-zinc-100 flex items-center space-x-2', 'text-base lg:text-lg font-bold text-[var(--foreground)] flex items-center space-x-2'),
    ('flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors cursor-pointer', 'flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors cursor-pointer'),
    ('w-3 h-3 text-zinc-500', 'w-3 h-3 text-[var(--muted-foreground)]'),
    ('absolute right-0 mt-2 w-36 bg-zinc-900 border border-zinc-850 rounded-lg shadow-xl py-1 z-50', 'absolute right-0 mt-2 w-36 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl py-1 z-50'),
    ("'bg-indigo-600 text-white font-semibold' : 'text-zinc-400 hover:bg-zinc-800'", "'bg-[var(--primary)] text-white font-semibold' : 'text-[var(--muted-foreground)] hover:bg-[var(--accent)]'"),
    ("'bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500'", "'bg-[var(--primary)]/10 text-[var(--primary)] border-l-2 border-[var(--primary)]'"),
    ("'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'", "'text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]'"),
    ('bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all cursor-pointer', 'bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 hover:bg-[var(--primary)]/20 transition-all cursor-pointer'),
    ('absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-850 rounded-lg shadow-xl py-1 z-50', 'absolute right-0 mt-2 w-48 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl py-1 z-50'),
    ('px-3 py-1 border-b border-zinc-850', 'px-3 py-1 border-b border-[var(--border)]'),
    ('text-[10px] uppercase font-bold tracking-wider text-zinc-500', 'text-[10px] uppercase font-bold tracking-wider text-[var(--muted-foreground)]'),
    ("user.role === r.key \n                            ? 'bg-indigo-600 text-white font-medium' \n                            : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'", "user.role === r.key \n                            ? 'bg-[var(--primary)] text-white font-medium' \n                            : 'text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]'"),
    ('p-2 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 relative transition-all', 'p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-lg hover:bg-[var(--accent)] relative transition-all'),
    ('absolute right-0 mt-2 w-80 bg-zinc-900 border border-zinc-850 rounded-lg shadow-xl z-50', 'absolute right-0 mt-2 w-80 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl z-50'),
    ('p-3 border-b border-zinc-800 flex items-center justify-between', 'p-3 border-b border-[var(--border)] flex items-center justify-between'),
    ('text-xs font-bold text-zinc-200', 'text-xs font-bold text-[var(--foreground)]'),
    ('text-[10px] text-indigo-400 hover:text-indigo-300 font-medium', 'text-[10px] text-[var(--primary)] hover:opacity-80 font-medium'),
    ('max-h-72 overflow-y-auto divide-y divide-zinc-800', 'max-h-72 overflow-y-auto divide-y divide-[var(--border)]'),
    ('p-4 text-center text-xs text-zinc-500', 'p-4 text-center text-xs text-[var(--muted-foreground)]'),
    ("n.read ? 'bg-zinc-900 opacity-60' : 'bg-zinc-850 hover:bg-zinc-800'", "n.read ? 'opacity-60' : 'hover:bg-[var(--accent)]'"),
    ('text-xs font-semibold text-zinc-200', 'text-xs font-semibold text-[var(--foreground)]'),
    ('text-[10px] text-zinc-400 mt-0.5 leading-relaxed', 'text-[10px] text-[var(--muted-foreground)] mt-0.5 leading-relaxed'),
    ('text-[9px] text-zinc-500 mt-1', 'text-[9px] text-[var(--muted-foreground)] mt-1'),
    ('flex items-center space-x-2 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors', 'flex items-center space-x-2 p-1.5 rounded-lg hover:bg-[var(--accent)] transition-colors'),
    ('w-7.5 h-7.5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs overflow-hidden', 'w-8 h-8 rounded-full bg-[var(--primary)]/20 text-[var(--primary)] flex items-center justify-center font-bold text-xs overflow-hidden'),
    ('w-3.5 h-3.5 text-zinc-500 hidden sm:inline', 'w-3.5 h-3.5 text-[var(--muted-foreground)] hidden sm:inline'),
    ('px-3 py-2 border-b border-zinc-850 text-left', 'px-3 py-2 border-b border-[var(--border)] text-left'),
    ('text-[10px] text-zinc-500 truncate', 'text-[10px] text-[var(--muted-foreground)] truncate'),
    ('block w-full text-left px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200', 'block w-full text-left px-3 py-2 text-xs text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]'),
    ('w-full text-left px-3 py-2 text-xs text-rose-400 hover:bg-zinc-800 flex items-center space-x-1 border-t border-zinc-850', 'w-full text-left px-3 py-2 text-xs text-rose-500 hover:bg-[var(--accent)] flex items-center space-x-1 border-t border-[var(--border)]'),
    ('p-1.5 text-zinc-500 hover:text-rose-400 rounded-md hover:bg-zinc-800 transition-colors', 'p-1.5 text-[var(--muted-foreground)] hover:text-rose-500 rounded-md hover:bg-[var(--accent)] transition-colors'),
]

for old, new in replacements:
    content = content.replace(old, new)

with open('src/components/dashboard-layout.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done. Chars:', len(content))

with open('src/components/dashboard-layout.tsx', 'r', encoding='utf-8') as f:
    c = f.read()
c = c.replace('hover:bg-zinc-800 transition-colors', 'hover:bg-[var(--accent)] transition-colors')
with open('src/components/dashboard-layout.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
print('Patched logout button!')

