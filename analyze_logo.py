from PIL import Image

img = Image.open('WJG.jpeg')
width, height = img.size
print(f"Dimensions: {width}x{height}")

# Let's sample colors:
# Blue in J
# Let's find dominant colors
pixels = img.load()

# Let's sample along key points
# Center of image
print("Center (50%, 50%):", pixels[width//2, height//2])

# Let's find the bounding box of non-white pixels
# White threshold > 240 in all RGB
non_white_x = []
non_white_y = []
color_samples = {}

for y in range(0, height, 10):
    for x in range(0, width, 10):
        r, g, b = pixels[x, y][:3]
        if not (r > 240 and g > 240 and b > 240):
            # Check if blue
            if b > r + 30 and b > g + 20:
                color_samples.setdefault('blue', []).append((r, g, b))
            elif r < 60 and g < 60 and b < 60:
                color_samples.setdefault('charcoal', []).append((r, g, b))

avg_blue = [sum(c[i] for c in color_samples['blue'])//len(color_samples['blue']) for i in range(3)]
avg_charcoal = [sum(c[i] for c in color_samples['charcoal'])//len(color_samples['charcoal']) for i in range(3)]

print(f"Average Blue: RGB({avg_blue[0]}, {avg_blue[1]}, {avg_blue[2]}) -> #{avg_blue[0]:02x}{avg_blue[1]:02x}{avg_blue[2]:02x}")
print(f"Average Charcoal: RGB({avg_charcoal[0]}, {avg_charcoal[1]}, {avg_charcoal[2]}) -> #{avg_charcoal[0]:02x}{avg_charcoal[1]:02x}{avg_charcoal[2]:02x}")
