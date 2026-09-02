from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / "icon" / "通讯录.png"
OUTPUT = Path(__file__).with_name("contact-book.png")

image = Image.open(SOURCE).convert("RGB")
pixels = np.asarray(image)
chroma = pixels.max(axis=2) - pixels.min(axis=2)
colored = chroma > 2

height, width = colored.shape
outside = np.zeros_like(colored, dtype=bool)
queue = deque()

for x in range(width):
    if not colored[0, x]:
        outside[0, x] = True
        queue.append((0, x))
    if not colored[height - 1, x]:
        outside[height - 1, x] = True
        queue.append((height - 1, x))
for y in range(height):
    if not colored[y, 0]:
        outside[y, 0] = True
        queue.append((y, 0))
    if not colored[y, width - 1]:
        outside[y, width - 1] = True
        queue.append((y, width - 1))

while queue:
    y, x = queue.popleft()
    for next_y, next_x in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
        if 0 <= next_y < height and 0 <= next_x < width and not colored[next_y, next_x] and not outside[next_y, next_x]:
            outside[next_y, next_x] = True
            queue.append((next_y, next_x))

alpha = Image.fromarray((~outside).astype(np.uint8) * 255, mode="L").filter(ImageFilter.GaussianBlur(1.1))
rgba = image.convert("RGBA")
rgba.putalpha(alpha)
bounds = alpha.getbbox()
if not bounds:
    raise RuntimeError("No foreground found in contact illustration")

padding = 18
left = max(0, bounds[0] - padding)
top = max(0, bounds[1] - padding)
right = min(width, bounds[2] + padding)
bottom = min(height, bounds[3] + padding)
rgba.crop((left, top, right, bottom)).save(OUTPUT)
