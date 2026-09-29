import cv2
import numpy as np

img = cv2.imread('WJG.jpeg')
h, w = img.shape[:2]

hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

# Blue mask
lower_blue = np.array([100, 80, 70])
upper_blue = np.array([130, 255, 255])
mask_blue = cv2.inRange(hsv, lower_blue, upper_blue)

# Charcoal mask
lower_charcoal = np.array([0, 0, 0])
upper_charcoal = np.array([180, 80, 115])
mask_charcoal = cv2.inRange(hsv, lower_charcoal, upper_charcoal)

# Refined colors from the actual image
# Average sampled hex
# Blue: #195ea9 or #1c61b2
# Charcoal: #2b2c31

def contour_to_svg_path(contour, epsilon=1.0):
    approx = cv2.approxPolyDP(contour, epsilon, True)
    pts = approx.reshape(-1, 2)
    if len(pts) < 3:
        return ""
    d = f"M {pts[0][0]} {pts[0][1]} "
    for p in pts[1:]:
        d += f"L {p[0]} {p[1]} "
    d += "Z"
    return d

def generate_svg_layer(mask, fill_color, min_area=300, epsilon=1.0):
    contours, hierarchy = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_TC89_KCOS)
    if hierarchy is None or len(contours) == 0:
        return ""
    
    paths = []
    hierarchy = hierarchy[0]
    
    # Process outer contours (hierarchy[i][3] == -1)
    for i, c in enumerate(contours):
        if cv2.contourArea(c) > min_area:
            path_d = contour_to_svg_path(c, epsilon)
            
            # Check for inner holes (children)
            child_idx = hierarchy[i][2]
            while child_idx != -1:
                child_contour = contours[child_idx]
                if cv2.contourArea(child_contour) > 50:
                    child_d = contour_to_svg_path(child_contour, epsilon)
                    path_d += " " + child_d
                child_idx = hierarchy[child_idx][0]
                
            if hierarchy[i][3] == -1: # Only top-level
                paths.append(path_d)

    combined_d = " ".join(paths)
    return f'<path fill="{fill_color}" fill-rule="evenodd" d="{combined_d}" />'

blue_svg = generate_svg_layer(mask_blue, "#1b62b1", min_area=300, epsilon=1.2)
charcoal_svg = generate_svg_layer(mask_charcoal, "#292a2f", min_area=300, epsilon=1.2)

# Also let's extract the subtle white brush ferrule ring
# Brush ferrule spacer is white between brush segments at around (1770, 1050)
svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="100%" height="100%">
  <defs>
    <filter id="badgeShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#000000" flood-opacity="0.12"/>
    </filter>
  </defs>

  <!-- Circular Badge with Shadow -->
  <circle cx="{w//2}" cy="{h//2}" r="1010" fill="#ffffff" filter="url(#badgeShadow)"/>

  <!-- Charcoal Elements (W, G, Brush Handle, WJGEEKS) -->
  {charcoal_svg}

  <!-- Blue Elements (Extruder, Rods, Filament, J, Paint Splash) -->
  {blue_svg}
</svg>
'''

with open('wjg_logo_vector.svg', 'w', encoding='utf-8') as f:
    f.write(svg_content)

print(f"Generated wjg_logo_vector.svg successfully! File size: {len(svg_content)} chars")
