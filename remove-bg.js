const sharp = require('sharp');
const path = require('path');

const inputPath = path.join(__dirname, 'src-tauri', 'icons', 'icon.png');
const outputPath = path.join(__dirname, 'src-tauri', 'icons', 'icon_transparent.png');

async function removeBackground() {
    try {
        const { data, info } = await sharp(inputPath)
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        // Assuming the top-left pixel is the background
        const bgR = data[0];
        const bgG = data[1];
        const bgB = data[2];
        const tolerance = 60;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            const isBg = Math.abs(r - bgR) < tolerance &&
                Math.abs(g - bgG) < tolerance &&
                Math.abs(b - bgB) < tolerance;

            // if it's very close to white/black edge artifacts we also fade or just strict chop
            if (isBg) {
                data[i + 3] = 0; // Set alpha to 0
            } else {
                // smooth edge a little if it's close? nah, simple cut is fine
            }
        }

        await sharp(data, {
            raw: {
                width: info.width,
                height: info.height,
                channels: 4
            }
        })
            .png()
            .toFile(outputPath);

        console.log('Successfully created transparent icon at', outputPath);
    } catch (error) {
        console.error('Failed to process image:', error);
    }
}

removeBackground();
