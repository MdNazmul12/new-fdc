with open('src/components/dashboard-layout.tsx', 'r', encoding='utf-8') as f:
    c = f.read()
c = c.replace("|| 'dark';", "|| 'light';")
c = c.replace("useState<'light' | 'dark' | 'night'>('dark')", "useState<'light' | 'dark' | 'night'>('light')")
with open('src/components/dashboard-layout.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
print('Default theme set to light')
