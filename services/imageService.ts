
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
        // 1. Determinar a dimensão de referência (menor lado da imagem base)
        const baseMinDim = Math.min(canvas.width, canvas.height);
        
        // 2. Definir fator de escala fixo (Pequeno, Médio, Grande)
        // Isso define o tamanho máximo que o MAIOR lado da logo terá em relação à imagem
        let scaleFactor = 0.15; // Pequeno (15% da menor dimensão)
        if (config.size === 'medium') scaleFactor = 0.25; // Médio (25%)
        if (config.size === 'large') scaleFactor = 0.35;  // Grande (35%)

        // 3. Calcular dimensões de desenho mantendo o Aspect Ratio da logo
        const logoAspectRatio = logoImg.width / logoImg.height;
        let drawWidth, drawHeight;

        if (logoAspectRatio > 1) {
          // Logo é mais larga que alta
          drawWidth = baseMinDim * scaleFactor;
          drawHeight = drawWidth / logoAspectRatio;
        } else {
          // Logo é mais alta que larga ou quadrada
          drawHeight = baseMinDim * scaleFactor;
          drawWidth = drawHeight * logoAspectRatio;
        }

        // 4. Calcular Posição com Margem de Segurança (Padding)
        const padding = baseMinDim * 0.05; // 5% de margem
        let x = 0;
        let y = 0;

        // Lógica de alinhamento horizontal
        if (config.position.includes('left')) {
          x = padding;
        } else {
          // Right: Largura Total - Largura Logo - Margem
          x = canvas.width - drawWidth - padding;
        }

        // Lógica de alinhamento vertical
        if (config.position.includes('top')) {
          y = padding;
        } else {
          // Bottom: Altura Total - Altura Logo - Margem
          y = canvas.height - drawHeight - padding;
        }

        // 5. Aplicar Transparência se for Marca D'água
        ctx.save(); // Salvar estado atual
        ctx.globalAlpha = config.type === 'watermark' ? 0.6 : 1.0; 

        // 6. Desenhar a Logo (usando drawImage com 4 argumentos para escalar)
        // drawImage(img, x, y, width, height)
        ctx.drawImage(logoImg, x, y, drawWidth, drawHeight);

        // Restaurar estado (para não afetar futuros desenhos se houver)
        ctx.restore();

        // Retornar resultado
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
