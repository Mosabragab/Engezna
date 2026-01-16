'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, X, Check, Navigation, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface InteractiveMapPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (coords: { lat: number; lng: number }) => void;
  initialPosition?: { lat: number; lng: number } | null;
  title?: string;
}

export function InteractiveMapPicker({
  isOpen,
  onClose,
  onSelect,
  initialPosition,
  title = 'اختر موقعك على الخريطة',
}: InteractiveMapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [selectedPosition, setSelectedPosition] = useState<{ lat: number; lng: number } | null>(
    initialPosition || null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Default center (Beni Suef, Egypt)
  const defaultCenter = { lat: 29.0744, lng: 31.0986 };

  useEffect(() => {
    if (!isOpen || !mapRef.current) return;

    // Dynamically import Leaflet
    const initMap = async () => {
      const L = (await import('leaflet')).default;

      // Import Leaflet CSS
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // Fix default marker icons
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Initialize map
      const center = initialPosition || defaultCenter;
      const map = L.map(mapRef.current!, {
        center: [center.lat, center.lng],
        zoom: initialPosition ? 16 : 12,
        zoomControl: true,
      });

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Custom red marker icon
      const redIcon = L.icon({
        iconUrl:
          'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      // Add initial marker if position exists
      if (initialPosition) {
        markerRef.current = L.marker([initialPosition.lat, initialPosition.lng], {
          icon: redIcon,
        }).addTo(map);
        setSelectedPosition(initialPosition);
      }

      // Handle map clicks
      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;

        // Remove existing marker
        if (markerRef.current) {
          map.removeLayer(markerRef.current);
        }

        // Add new marker
        markerRef.current = L.marker([lat, lng], { icon: redIcon }).addTo(map);
        setSelectedPosition({ lat, lng });
      });

      mapInstanceRef.current = map;
      setIsLoading(false);

      // Invalidate size after render
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    };

    initMap();

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [isOpen, initialPosition]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('الموقع الجغرافي غير مدعوم في متصفحك');
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        if (mapInstanceRef.current) {
          const L = (await import('leaflet')).default;

          // Remove existing marker
          if (markerRef.current) {
            mapInstanceRef.current.removeLayer(markerRef.current);
          }

          // Custom red marker icon
          const redIcon = L.icon({
            iconUrl:
              'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
          });

          // Add marker and pan to location
          markerRef.current = L.marker([coords.lat, coords.lng], { icon: redIcon }).addTo(
            mapInstanceRef.current
          );
          mapInstanceRef.current.setView([coords.lat, coords.lng], 16);
          setSelectedPosition(coords);
        }

        setGpsLoading(false);
      },
      (error) => {
        console.error('GPS error:', error);
        alert('لم نتمكن من الحصول على موقعك');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleConfirm = () => {
    if (selectedPosition) {
      onSelect(selectedPosition);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-red-600" />
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Map Container */}
        <div className="relative flex-1 min-h-[400px]">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
              <Loader2 className="w-8 h-8 animate-spin text-red-600" />
            </div>
          )}
          <div ref={mapRef} className="w-full h-full" style={{ minHeight: '400px' }} />

          {/* GPS Button */}
          <button
            onClick={handleGetCurrentLocation}
            disabled={gpsLoading}
            className="absolute top-4 right-4 z-[1000] bg-white p-3 rounded-full shadow-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="موقعي الحالي"
          >
            {gpsLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
            ) : (
              <Navigation className="w-5 h-5 text-red-600" />
            )}
          </button>

          {/* Instructions */}
          <div className="absolute bottom-4 left-4 right-4 z-[1000]">
            <div className="bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg text-center">
              <p className="text-sm text-gray-600">
                📍 انقر على الخريطة لتحديد موقعك أو استخدم زر GPS
              </p>
              {selectedPosition && (
                <p className="text-xs text-gray-500 mt-1" dir="ltr">
                  {selectedPosition.lat.toFixed(6)}, {selectedPosition.lng.toFixed(6)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose} className="flex-1">
            إلغاء
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedPosition}
            className="flex-1 bg-red-600 hover:bg-red-700"
          >
            <Check className="w-4 h-4 ml-2" />
            تأكيد الموقع
          </Button>
        </div>
      </div>
    </div>
  );
}

export default InteractiveMapPicker;
