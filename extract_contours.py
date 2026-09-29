import cv2
import numpy as np

# Load 2048x2048 image
img = cv2.imread('WJG.jpeg')
h, w = img.shape[:2]
print(f"Loaded image: {w}x{h}")

# Convert to HSV and RGB
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

# Mask for Blue:
# Blue in HSV: H between ~100 and ~135, S > 70, V > 50
lower_blue = np.array([100, 80, 70])
upper_blue = np.array([130, 255, 255])
mask_blue = cv2.inRange(hsv, lower_blue, upper_blue)

# Mask for Charcoal:
# Dark gray/black: V < 100 and S < 60
lower_charcoal = np.array([0, 0, 0])
upper_charcoal = np.array([180, 80, 110])
mask_charcoal = cv2.inRange(hsv, lower_charcoal, upper_charcoal)

# Find non-white outer circle
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
# Circle is white on white with subtle shadow
# Let's find contours of blue
contours_blue, _ = cv2.findContours(mask_blue, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
print(f"Blue contours found: {len(contours_blue)}")
for i, c in enumerate(contours_blue):
    area = cv2.contourArea(c)
    if area > 500:
        bx, by, bw, bh = cv2.boundingRect(c)
        print(f"  Blue #{i}: Area={area:.0f}, BoundingBox=({bx}, {by}, {bw}, {bh})")

# Charcoal contours
contours_charcoal, _ = cv2.findContours(mask_charcoal, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
print(f"\nCharcoal contours found: {len(contours_charcoal)}")
for i, c in enumerate(contours_charcoal):
    area = cv2.contourArea(c)
    if area > 500:
        bx, by, bw, bh = cv2.boundingRect(c)
        print(f"  Charcoal #{i}: Area={area:.0f}, BoundingBox=({bx}, {by}, {bw}, {bh})")
