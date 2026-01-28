'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  Type,
  Image as ImageIcon,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Move,
  Trash2,
  Plus,
  Loader2,
  Download,
  Eye,
  Settings,
  Layers,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

interface BannerElement {
  id: string;
  type: 'text' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  style: {
    color?: string;
    backgroundColor?: string;
    fontSize?: number;
    fontWeight?: 'normal' | 'bold';
    textAlign?: 'left' | 'center' | 'right';
    borderRadius?: number;
    opacity?: number;
  };
}

interface BannerConfig {
  width: number;
  height: number;
  backgroundColor: string;
  backgroundImage?: string;
  elements: BannerElement[];
}

interface BannerDesignerProps {
  initialConfig?: BannerConfig;
  onChange: (config: BannerConfig) => void;
  locale?: 'ar' | 'en';
}

const DEFAULT_CONFIG: BannerConfig = {
  width: 800,
  height: 400,
  backgroundColor: '#f3f4f6',
  elements: [],
};

const PRESET_COLORS = [
  '#ffffff',
  '#000000',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#64748b',
];

const PRESET_SIZES = [
  { name: 'Hero (1200x400)', width: 1200, height: 400 },
  { name: 'Banner (800x200)', width: 800, height: 200 },
  { name: 'Square (600x600)', width: 600, height: 600 },
  { name: 'Card (400x300)', width: 400, height: 300 },
  { name: 'Mobile (375x200)', width: 375, height: 200 },
];

export function BannerDesigner({
  initialConfig = DEFAULT_CONFIG,
  onChange,
  locale = 'ar',
}: BannerDesignerProps) {
  const [config, setConfig] = useState<BannerConfig>(initialConfig);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [uploading, setUploading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const isRTL = locale === 'ar';

  const updateConfig = useCallback(
    (newConfig: BannerConfig) => {
      setConfig(newConfig);
      onChange(newConfig);
    },
    [onChange]
  );

  const handleImageUpload = useCallback(async (file: File): Promise<string | null> => {
    const supabase = createClient();
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `banners/${fileName}`;

    const { error: uploadError } = await supabase.storage.from('public').upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('public').getPublicUrl(filePath);

    return publicUrl;
  }, []);

  const addTextElement = () => {
    const newElement: BannerElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      x: 50,
      y: 50,
      width: 200,
      height: 40,
      content: isRTL ? 'نص جديد' : 'New Text',
      style: {
        color: '#000000',
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
      },
    };

    updateConfig({
      ...config,
      elements: [...config.elements, newElement],
    });
    setSelectedElement(newElement.id);
  };

  const addImageElement = async (file: File) => {
    setUploading(true);
    try {
      const url = await handleImageUpload(file);
      if (url) {
        const newElement: BannerElement = {
          id: `img-${Date.now()}`,
          type: 'image',
          x: 50,
          y: 50,
          width: 150,
          height: 150,
          content: url,
          style: {
            borderRadius: 8,
            opacity: 1,
          },
        };

        updateConfig({
          ...config,
          elements: [...config.elements, newElement],
        });
        setSelectedElement(newElement.id);
      }
    } finally {
      setUploading(false);
    }
  };

  const updateElement = (id: string, updates: Partial<BannerElement>) => {
    updateConfig({
      ...config,
      elements: config.elements.map((el) => (el.id === id ? { ...el, ...updates } : el)),
    });
  };

  const deleteElement = (id: string) => {
    updateConfig({
      ...config,
      elements: config.elements.filter((el) => el.id !== id),
    });
    setSelectedElement(null);
  };

  const handleMouseDown = (e: React.MouseEvent, elementId: string) => {
    e.preventDefault();
    const element = config.elements.find((el) => el.id === elementId);
    if (!element || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left - element.x,
      y: e.clientY - rect.top - element.y,
    });
    setIsDragging(true);
    setSelectedElement(elementId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedElement || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left - dragOffset.x, config.width - 50));
    const y = Math.max(0, Math.min(e.clientY - rect.top - dragOffset.y, config.height - 50));

    updateElement(selectedElement, { x, y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await handleImageUpload(file);
      if (url) {
        updateConfig({ ...config, backgroundImage: url });
      }
    } finally {
      setUploading(false);
    }
  };

  const selectedEl = config.elements.find((el) => el.id === selectedElement);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-3 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={addTextElement}>
            <Type className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {isRTL ? 'نص' : 'Text'}
          </Button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && addImageElement(e.target.files[0])}
            accept="image/*"
            className="hidden"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className={`w-4 h-4 animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`} />
            ) : (
              <ImageIcon className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            )}
            {isRTL ? 'صورة' : 'Image'}
          </Button>

          <div className="h-6 w-px bg-gray-300 mx-2" />

          <input
            type="file"
            ref={bgFileInputRef}
            onChange={handleBackgroundUpload}
            accept="image/*"
            className="hidden"
          />
          <Button size="sm" variant="outline" onClick={() => bgFileInputRef.current?.click()}>
            <Upload className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {isRTL ? 'خلفية' : 'Background'}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowSettings(true)}>
            <Settings className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowPreview(true)}>
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex">
        {/* Canvas */}
        <div className="flex-1 p-6 bg-gray-100 overflow-auto">
          <div
            ref={canvasRef}
            className="relative mx-auto shadow-lg"
            style={{
              width: config.width,
              height: config.height,
              backgroundColor: config.backgroundColor,
              backgroundImage: config.backgroundImage
                ? `url(${config.backgroundImage})`
                : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={() => setSelectedElement(null)}
          >
            {config.elements.map((element) => (
              <div
                key={element.id}
                className={`absolute cursor-move ${
                  selectedElement === element.id ? 'ring-2 ring-primary ring-offset-2' : ''
                }`}
                style={{
                  left: element.x,
                  top: element.y,
                  width: element.width,
                  height: element.height,
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleMouseDown(e, element.id);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedElement(element.id);
                }}
              >
                {element.type === 'text' ? (
                  <div
                    className="w-full h-full flex items-center"
                    style={{
                      color: element.style.color,
                      fontSize: element.style.fontSize,
                      fontWeight: element.style.fontWeight,
                      textAlign: element.style.textAlign,
                      justifyContent:
                        element.style.textAlign === 'center'
                          ? 'center'
                          : element.style.textAlign === 'right'
                            ? 'flex-end'
                            : 'flex-start',
                    }}
                  >
                    {element.content}
                  </div>
                ) : (
                  <img
                    src={element.content}
                    alt=""
                    className="w-full h-full object-cover"
                    style={{
                      borderRadius: element.style.borderRadius,
                      opacity: element.style.opacity,
                    }}
                    draggable={false}
                  />
                )}

                {selectedElement === element.id && (
                  <button
                    className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteElement(element.id);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Properties Panel */}
        {selectedEl && (
          <div className="w-64 border-l border-gray-200 p-4 bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">{isRTL ? 'الخصائص' : 'Properties'}</h3>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-500"
                onClick={() => deleteElement(selectedEl.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            {selectedEl.type === 'text' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isRTL ? 'النص' : 'Text'}
                  </label>
                  <input
                    type="text"
                    value={selectedEl.content}
                    onChange={(e) => updateElement(selectedEl.id, { content: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isRTL ? 'حجم الخط' : 'Font Size'}
                  </label>
                  <input
                    type="number"
                    value={selectedEl.style.fontSize || 16}
                    onChange={(e) =>
                      updateElement(selectedEl.id, {
                        style: { ...selectedEl.style, fontSize: parseInt(e.target.value) },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    min={8}
                    max={72}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isRTL ? 'اللون' : 'Color'}
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() =>
                          updateElement(selectedEl.id, {
                            style: { ...selectedEl.style, color },
                          })
                        }
                        className={`w-6 h-6 rounded border ${
                          selectedEl.style.color === color ? 'ring-2 ring-primary' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isRTL ? 'المحاذاة' : 'Alignment'}
                  </label>
                  <div className="flex gap-1">
                    {(['left', 'center', 'right'] as const).map((align) => (
                      <button
                        key={align}
                        onClick={() =>
                          updateElement(selectedEl.id, {
                            style: { ...selectedEl.style, textAlign: align },
                          })
                        }
                        className={`flex-1 p-2 rounded border ${
                          selectedEl.style.textAlign === align
                            ? 'bg-primary text-white border-primary'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {align === 'left' && <AlignLeft className="w-4 h-4 mx-auto" />}
                        {align === 'center' && <AlignCenter className="w-4 h-4 mx-auto" />}
                        {align === 'right' && <AlignRight className="w-4 h-4 mx-auto" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {selectedEl.type === 'image' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isRTL ? 'العرض' : 'Width'}
                  </label>
                  <input
                    type="number"
                    value={selectedEl.width}
                    onChange={(e) =>
                      updateElement(selectedEl.id, { width: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    min={20}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isRTL ? 'الارتفاع' : 'Height'}
                  </label>
                  <input
                    type="number"
                    value={selectedEl.height}
                    onChange={(e) =>
                      updateElement(selectedEl.id, { height: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    min={20}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isRTL ? 'استدارة الحواف' : 'Border Radius'}
                  </label>
                  <input
                    type="number"
                    value={selectedEl.style.borderRadius || 0}
                    onChange={(e) =>
                      updateElement(selectedEl.id, {
                        style: { ...selectedEl.style, borderRadius: parseInt(e.target.value) },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    min={0}
                    max={100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isRTL ? 'الشفافية' : 'Opacity'} (
                    {Math.round((selectedEl.style.opacity || 1) * 100)}%)
                  </label>
                  <input
                    type="range"
                    value={(selectedEl.style.opacity || 1) * 100}
                    onChange={(e) =>
                      updateElement(selectedEl.id, {
                        style: { ...selectedEl.style, opacity: parseInt(e.target.value) / 100 },
                      })
                    }
                    className="w-full"
                    min={0}
                    max={100}
                  />
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">X</label>
                  <input
                    type="number"
                    value={Math.round(selectedEl.x)}
                    onChange={(e) => updateElement(selectedEl.id, { x: parseInt(e.target.value) })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Y</label>
                  <input
                    type="number"
                    value={Math.round(selectedEl.y)}
                    onChange={(e) => updateElement(selectedEl.id, { y: parseInt(e.target.value) })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">
                {isRTL ? 'إعدادات البانر' : 'Banner Settings'}
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isRTL ? 'الأحجام المسبقة' : 'Preset Sizes'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_SIZES.map((size) => (
                    <button
                      key={size.name}
                      onClick={() =>
                        updateConfig({ ...config, width: size.width, height: size.height })
                      }
                      className={`p-2 text-sm border rounded-lg hover:bg-gray-50 ${
                        config.width === size.width && config.height === size.height
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200'
                      }`}
                    >
                      {size.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isRTL ? 'العرض' : 'Width'}
                  </label>
                  <input
                    type="number"
                    value={config.width}
                    onChange={(e) => updateConfig({ ...config, width: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    min={100}
                    max={2000}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isRTL ? 'الارتفاع' : 'Height'}
                  </label>
                  <input
                    type="number"
                    value={config.height}
                    onChange={(e) => updateConfig({ ...config, height: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    min={50}
                    max={1000}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isRTL ? 'لون الخلفية' : 'Background Color'}
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex flex-wrap gap-1 flex-1">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => updateConfig({ ...config, backgroundColor: color })}
                        className={`w-8 h-8 rounded border ${
                          config.backgroundColor === color ? 'ring-2 ring-primary' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <input
                    type="color"
                    value={config.backgroundColor}
                    onChange={(e) => updateConfig({ ...config, backgroundColor: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                </div>
              </div>

              {config.backgroundImage && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isRTL ? 'صورة الخلفية' : 'Background Image'}
                  </label>
                  <div className="flex items-center gap-2">
                    <img
                      src={config.backgroundImage}
                      alt=""
                      className="w-20 h-12 object-cover rounded"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-500"
                      onClick={() => updateConfig({ ...config, backgroundImage: undefined })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={() => setShowSettings(false)}>{isRTL ? 'تم' : 'Done'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-full max-h-full overflow-auto">
            <button
              onClick={() => setShowPreview(false)}
              className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
            <div
              style={{
                width: config.width,
                height: config.height,
                backgroundColor: config.backgroundColor,
                backgroundImage: config.backgroundImage
                  ? `url(${config.backgroundImage})`
                  : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
              className="relative"
            >
              {config.elements.map((element) => (
                <div
                  key={element.id}
                  className="absolute"
                  style={{
                    left: element.x,
                    top: element.y,
                    width: element.width,
                    height: element.height,
                  }}
                >
                  {element.type === 'text' ? (
                    <div
                      className="w-full h-full flex items-center"
                      style={{
                        color: element.style.color,
                        fontSize: element.style.fontSize,
                        fontWeight: element.style.fontWeight,
                        textAlign: element.style.textAlign,
                        justifyContent:
                          element.style.textAlign === 'center'
                            ? 'center'
                            : element.style.textAlign === 'right'
                              ? 'flex-end'
                              : 'flex-start',
                      }}
                    >
                      {element.content}
                    </div>
                  ) : (
                    <img
                      src={element.content}
                      alt=""
                      className="w-full h-full object-cover"
                      style={{
                        borderRadius: element.style.borderRadius,
                        opacity: element.style.opacity,
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BannerDesigner;
