from PIL import Image
import os

icons_dir = '/Users/isustic/Desktop/epp-app/frontend/src-tauri/icons'
icon_path = os.path.join(icons_dir, 'icon.png')

print(f"Opening {icon_path}...")
img = Image.open(icon_path)
bbox = img.getbbox()
print(f'Original Image size: {img.size}')
print(f'Content bounding box: {bbox}')

if bbox:
    content_width = bbox[2] - bbox[0]
    content_height = bbox[3] - bbox[1]
    print(f'Content size: {content_width}x{content_height}')

    # Crop to exact content
    cropped = img.crop(bbox)
    
    # Calculate new canvas size to give 80% coverage
    max_dim = max(content_width, content_height)
    canvas_size = int(max_dim / 0.82)  # ~82% coverage to fit nicely
    
    print(f'Creating new canvas: {canvas_size}x{canvas_size}')
    # Create new square image with transparent background
    square = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    
    # Calculate paste coordinates to center the cropped image
    paste_x = (canvas_size - content_width) // 2
    paste_y = (canvas_size - content_height) // 2
    
    square.paste(cropped, (paste_x, paste_y), cropped)
    
    # Resize to exactly 1024x1024 for master icon
    print('Resizing master icon to 1024x1024...')
    master = square.resize((1024, 1024), Image.Resampling.LANCZOS)
    
    # Overwrite the original icon.png with the new master version
    master.save(icon_path)
    print("Done generating master icon.")
else:
    print("Image is entirely empty/transparent.")
