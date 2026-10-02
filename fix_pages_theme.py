import os
import glob

# Common zinc->var replacements for pages
replacements = [
    # Text colors
    ('text-zinc-100', 'text-[var(--foreground)]'),
    ('text-zinc-200', 'text-[var(--card-foreground)]'),
    ('text-zinc-300', 'text-[var(--foreground)]/80'),
    ('text-zinc-400', 'text-[var(--muted-foreground)]'),
    ('text-zinc-500', 'text-[var(--muted-foreground)]/70'),
    # Background colors
    ('bg-zinc-950', 'bg-[var(--background)]'),
    ('bg-zinc-900', 'bg-[var(--secondary)]'),
    ('bg-zinc-850', 'bg-[var(--muted)]'),
    ('bg-zinc-800', 'bg-[var(--accent)]'),
    # Border colors
    ('border-zinc-800', 'border-[var(--border)]'),
    ('border-zinc-850', 'border-[var(--border)]'),
    ('border-zinc-700', 'border-[var(--border)]'),
    # Divide colors
    ('divide-zinc-800', 'divide-[var(--border)]'),
    ('divide-zinc-850', 'divide-[var(--border)]'),
    # Hover backgrounds
    ('hover:bg-zinc-800', 'hover:bg-[var(--accent)]'),
    ('hover:bg-zinc-850', 'hover:bg-[var(--accent)]'),
    ('hover:bg-zinc-900', 'hover:bg-[var(--secondary)]'),
    ('hover:border-zinc-700', 'hover:border-[var(--primary)]/30'),
    # Input/form
    ('bg-zinc-900 border border-zinc-800', 'bg-[var(--input)] border border-[var(--border)]'),
    ('bg-zinc-800 text-zinc-100', 'bg-[var(--accent)] text-[var(--foreground)]'),
    ('bg-zinc-800 text-zinc-300', 'bg-[var(--accent)] text-[var(--foreground)]/80'),
]

pages_dir = 'src/app'
files = glob.glob(f'{pages_dir}/**/*.tsx', recursive=True)

total_changes = 0
for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    original = content
    for old, new in replacements:
        content = content.replace(old, new)
    if content != original:
        changes = sum(original.count(old) for old, _ in replacements)
        total_changes += changes
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Updated: {filepath}')

print(f'\nTotal replacements across all files: done')
