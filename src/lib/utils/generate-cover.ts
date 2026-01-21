'use client';

/**
 * Utility to generate a cover image from a logo and brand color
 * This creates a gradient background with the logo and store name
 */

// Predefined brand colors for quick selection
export const BRAND_COLORS = [
  { value: '#009DE0', label: 'أزرق إنجزنا', labelEn: 'Engezna Blue' },
  { value: '#EF4444', label: 'أحمر', labelEn: 'Red' },
  { value: '#F97316', label: 'برتقالي', labelEn: 'Orange' },
  { value: '#EAB308', label: 'أصفر', labelEn: 'Yellow' },
  { value: '#22C55E', label: 'أخضر', labelEn: 'Green' },
  { value: '#06B6D4', label: 'سماوي', labelEn: 'Cyan' },
  { value: '#8B5CF6', label: 'بنفسجي', labelEn: 'Purple' },
  { value: '#EC4899', label: 'وردي', labelEn: 'Pink' },
  { value: '#6B7280', label: 'رمادي', labelEn: 'Gray' },
  { value: '#0F172A', label: 'داكن', labelEn: 'Dark' },
];

// Convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 157, b: 224 }; // Default to Engezna blue
}

// Darken a color
function darkenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  const factor = 1 - percent / 100;
  const r = Math.round(rgb.r * factor);
  const g = Math.round(rgb.g * factor);
  const b = Math.round(rgb.b * factor);
  return `rgb(${r}, ${g}, ${b})`;
}

// Lighten a color
function lightenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  const factor = percent / 100;
  const r = Math.round(rgb.r + (255 - rgb.r) * factor);
  const g = Math.round(rgb.g + (255 - rgb.g) * factor);
  const b = Math.round(rgb.b + (255 - rgb.b) * factor);
  return `rgb(${r}, ${g}, ${b})`;
}

interface GenerateCoverOptions {
  logoUrl: string | null;
  storeName: string;
  brandColor?: string;
  width?: number;
  height?: number;
}

/**
 * Generate a cover image as a data URL
 * Returns a Promise that resolves to a base64 data URL
 */
export async function generateCoverFromLogo({
  logoUrl,
  storeName,
  brandColor = '#009DE0',
  width = 1080,
  height = 360,
}: GenerateCoverOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, brandColor);
    gradient.addColorStop(0.5, darkenColor(brandColor, 15));
    gradient.addColorStop(1, darkenColor(brandColor, 30));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add subtle pattern overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let i = 0; i < width; i += 40) {
      for (let j = 0; j < height; j += 40) {
        if ((i + j) % 80 === 0) {
          ctx.fillRect(i, j, 20, 20);
        }
      }
    }

    // Draw store name
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = 'bold 48px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // Position text on the left side (for RTL layout, logo will be on the right)
    const textX = 60;
    const textY = height / 2;
    ctx.fillText(storeName, textX, textY);

    // If no logo, just return the gradient with text
    if (!logoUrl) {
      resolve(canvas.toDataURL('image/jpeg', 0.9));
      return;
    }

    // Load and draw logo
    const logo = new Image();
    logo.crossOrigin = 'anonymous';
    logo.onload = () => {
      // Calculate logo size and position (right side)
      const logoSize = Math.min(height * 0.7, 200);
      const logoX = width - logoSize - 60;
      const logoY = (height - logoSize) / 2;

      // Draw white circle background for logo
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.beginPath();
      ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 10, 0, Math.PI * 2);
      ctx.fill();

      // Draw logo (circular clip)
      ctx.save();
      ctx.beginPath();
      ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
      ctx.restore();

      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };

    logo.onerror = () => {
      // If logo fails to load, return without logo
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };

    logo.src = logoUrl;
  });
}

/**
 * Get a CSS gradient style for use as a fallback background
 */
export function getCoverGradientStyle(brandColor: string = '#009DE0'): string {
  return `linear-gradient(135deg, ${brandColor} 0%, ${darkenColor(brandColor, 20)} 100%)`;
}
