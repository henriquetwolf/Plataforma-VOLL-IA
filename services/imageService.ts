
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
        // Calculate Size
        let logoWidth = 0;
        let logoHeight = 0;
        const aspectRatio = logoImg.width / logoImg.height;

        if (config.size === 'small') {
          logoWidth = canvas.width * 0.15; // 15% width (looks small on high res)
        } else if (config.size === 'medium') {
          logoWidth = canvas.width * 0.25;
        } else {
          logoWidth = canvas.width * 0.35;
        }
        logoHeight = logoWidth / aspectRatio;

        // Calculate Position
        let x = 0;
        let y = 0;
        const padding = canvas.width * 0.05; // 5% padding

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

        // Apply Opacity/Watermark
        ctx.globalAlpha = config.type === 'watermark' ? 0.3 : 1.0;

        // Draw Logo
        ctx.drawImage(logoImg, x, y, logoWidth, logoHeight);

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
