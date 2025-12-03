
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
        // Increased padding slightly to ensure it's not too close to edge
        const padding = baseMinDim * 0.05; 

        let x = 0;
        let y = 0;

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

        // Safety: Ensure logo is fully within canvas bounds (never cropped by canvas edge)
        // We add/subtract padding from bounds check to keep the safety margin
        if (x < 0) x = padding;
        if (y < 0) y = padding;
        if (x + logoWidth > canvas.width) x = canvas.width - logoWidth - padding;
        if (y + logoHeight > canvas.height) y = canvas.height - logoHeight - padding;

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
