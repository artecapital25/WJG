import re

with open('wjg_logo_vector.svg', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Transparent version (no circle background, no shadow)
transparent = re.sub(r'<defs>.*?</defs>\s*<!-- Circular Badge with Shadow -->\s*<circle[^>]+/>', '', content, flags=re.DOTALL)
transparent = transparent.replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2048 2048" width="100%" height="100%">', 
                                  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="50 350 1948 1350" width="100%" height="100%">')

with open('wjg_logo_transparent.svg', 'w', encoding='utf-8') as f:
    f.write(transparent)

# 2. Dark mode variant (white/light elements for charcoal, glowing neon blue)
dark_mode = transparent.replace('#292a2f', '#f1f5f9') # Light silver-white for W, G and text
dark_mode = dark_mode.replace('#1b62b1', '#38bdf8') # Neon electric cyan-blue for extruder, J and paint

# Add glow filter to dark mode
dark_mode_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="50 350 1948 1350" width="100%" height="100%">
  <defs>
    <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur" />
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
{dark_mode[dark_mode.find('<path'):]}
'''

with open('wjg_logo_darkmode.svg', 'w', encoding='utf-8') as f:
    f.write(dark_mode_svg)

print("Generated wjg_logo_transparent.svg and wjg_logo_darkmode.svg!")
