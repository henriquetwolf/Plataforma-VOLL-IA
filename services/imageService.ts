
import { LogoConfig } from "../types";

export const compositeImageWithLogo = async (
  baseImageUrl: string,
  logoUrl: string,
  config: LogoConfig
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error("Canvas not supported"));
      return;
    }

    const baseImg = new Image();
    baseImg.crossOrigin = "anonymous";
    baseImg.src = baseImageUrl;

    baseImg.onload = () => {
      canvas.width = baseImg.width;
      canvas.height = baseImg.height;

      // Draw base image
      ctx.drawImage(baseImg, 0, 0);

      const logoImg = new Image();
      logoImg.crossOrigin = "anonymous";
      logoImg.src = logoUrl;

      logoImg.onload = () => {
        // Calculate Size based on the largest dimension to fit within the target percentage relative to the smallest canvas side
        // This ensures the logo fits regardless if it's wide or tall, or if the canvas is portrait/landscape.
        const baseMinDim = Math.min(canvas.width, canvas.height);
        let targetSize = 0;

        // Adjusted percentages to be safe and visible
        if (config.size === 'small') {
          targetSize = baseMinDim * 0.15; 
        } else if (config.size === 'medium') {
          targetSize = baseMinDim * 0.20;
        } else {
          targetSize = baseMinDim * 0.30;
        }

        // Calculate scale to fit the logo's largest dimension into the target size
        const scale = targetSize / Math.max(logoImg.width, logoImg.height);
        
        const logoWidth = logoImg.width * scale;
        const logoHeight = logoImg.height * scale;

        // Calculate Position with padding
        let x = 0;
        let y = 0;
        const padding = baseMinDim * 0.05; // 5% padding relative to image size

        if (config.position.includes('left')) {
          x = padding;
        } else {
          x = canvas.width - logoWidth - padding;
        }

        if (config.position.includes('top')) {
          y = padding;
        } else {
          y = canvas.height - logoHeight - padding;
        }

        // Safety: Ensure logo is fully within canvas bounds (never cropped)
        x = Math.max(0, Math.min(x, canvas.width - logoWidth));
        y = Math.max(0, Math.min(y, canvas.height - logoHeight));

        // Apply Opacity/Watermark
        ctx.globalAlpha = config.type === 'watermark' ? 0.5 : 1.0; 

        // Draw Logo
        ctx.drawImage(logoImg, x, y, logoWidth, logoHeight);

        // Reset alpha for safety
        ctx.globalAlpha = 1.0;

        // Return result
        resolve(canvas.toDataURL('image/png'));
      };

      logoImg.onerror = () => {
        console.warn("Could not load logo for composition. Returning base image.");
        resolve(baseImageUrl);
      };
    };

    baseImg.onerror = (err) => {
      reject(new Error("Failed to load base image"));
    };
  });
};
