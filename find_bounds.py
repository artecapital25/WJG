from PIL import Image

img = Image.open('WJG.jpeg').convert('RGB')
w, h = img.size
pixels = img.load()

# 1. Circle bounds
# Let's find circle boundary (where white circle meets outer shadow/transparent/light gray)
# Look across center horizontal line (y = 1024)
circle_left = 0
circle_right = w - 1
for x in range(w):
    r, g, b = pixels[x, 1024]
    if r > 245 and g > 245 and b > 245:
        circle_left = x
        break
for x in range(w - 1, -1, -1):
    r, g, b = pixels[x, 1024]
    if r > 245 and g > 245 and b > 245:
        circle_right = x
        break

print(f"Circle horizontal bounds: X {circle_left} to {circle_right} (radius ~ {(circle_right-circle_left)//2})")

# 2. Extruder (blue component near top center)
extruder_box = [w, h, 0, 0]
for y in range(300, 900):
    for x in range(700, 1350):
        r, g, b = pixels[x, y]
        if b > r + 30 and b > g + 20: # blue
            extruder_box[0] = min(extruder_box[0], x)
            extruder_box[1] = min(extruder_box[1], y)
            extruder_box[2] = max(extruder_box[2], x)
            extruder_box[3] = max(extruder_box[3], y)

print(f"Extruder & filament bounds: {extruder_box}")

# 3. Letter W bounds (charcoal, x < 900, y between 800 and 1500)
w_box = [w, h, 0, 0]
for y in range(800, 1500):
    for x in range(100, 900):
        r, g, b = pixels[x, y]
        if r < 80 and g < 80 and b < 80:
            w_box[0] = min(w_box[0], x)
            w_box[1] = min(w_box[1], y)
            w_box[2] = max(w_box[2], x)
            w_box[3] = max(w_box[3], y)
print(f"Letter W bounds: {w_box}")

# 4. Letter J bounds (blue, y between 800 and 1500)
j_box = [w, h, 0, 0]
for y in range(800, 1500):
    for x in range(700, 1300):
        r, g, b = pixels[x, y]
        if b > r + 30 and b > g + 20:
            j_box[0] = min(j_box[0], x)
            j_box[1] = min(j_box[1], y)
            j_box[2] = max(j_box[2], x)
            j_box[3] = max(j_box[3], y)
print(f"Letter J bounds: {j_box}")

# 5. Letter G bounds (charcoal, x > 1100, y between 800 and 1500)
g_box = [w, h, 0, 0]
for y in range(800, 1500):
    for x in range(1150, 1900):
        r, g, b = pixels[x, y]
        if r < 80 and g < 80 and b < 80:
            g_box[0] = min(g_box[0], x)
            g_box[1] = min(g_box[1], y)
            g_box[2] = max(g_box[2], x)
            g_box[3] = max(g_box[3], y)
print(f"Letter G bounds: {g_box}")

# 6. WJGEEKS text bounds (charcoal, y > 1500)
text_box = [w, h, 0, 0]
for y in range(1500, 1800):
    for x in range(200, 1900):
        r, g, b = pixels[x, y]
        if r < 80 and g < 80 and b < 80:
            text_box[0] = min(text_box[0], x)
            text_box[1] = min(text_box[1], y)
            text_box[2] = max(text_box[2], x)
            text_box[3] = max(text_box[3], y)
print(f"WJGEEKS text bounds: {text_box}")
