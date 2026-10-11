import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  InfoWindow,
  useMap,
  useMapsLibrary,
  useApiLoadingStatus,
  APILoadingStatus,
} from '@vis.gl/react-google-maps';
import {
  Flame,
  Users,
  Layers,
  Crosshair,
  AlertTriangle,
  Sparkles,
  ArrowUpRight,
  Radio,
  Compass,
  Activity,
  Navigation,
  Globe,
  Grid,
} from 'lucide-react';
import { CityMarketplace, SubMarketZone } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface CityHeatmapProps {
  city: CityMarketplace;
  zonesSim: SubMarketZone[];
  selectedZoneId: string;
  onSelectZone: (zoneId: string) => void;
  demandSurgeFactor?: number;
  courierDropFactor?: number;
  onNavigateToGovernance?: (advisoryData?: any) => void;
}

type HeatmapLayerMode = 'composite' | 'demand_hotspots' | 'courier_density' | 'imbalance_delta';
type MapEngineMode = 'google_maps' | 'h3_radar';

interface H3HexCell {
  h3Index: string;
  zoneId: string;
  x: number;
  y: number;
  demandIntensity: number; // 0 - 100
  courierDensity: number; // couriers per km2
  netBalance: number; // -100 to +100
  isHotspot: boolean;
}

// Verified Center Coordinates and Zone Lat/Lng anchors per City
const CITY_GEO_CONFIG: Record<
  string,
  {
    center: { lat: number; lng: number };
    zoom: number;
    latLabel: string;
    lngLabel: string;
    gridCode: string;
    zoneCoords: Record<string, { lat: number; lng: number }>;
  }
> = {
  nyc: {
    center: { lat: 40.7359, lng: -73.9911 },
    zoom: 13,
    latLabel: '40.7128° N',
    lngLabel: '74.0060° W',
    gridCode: 'US-EAST-NYC-H3R8',
    zoneCoords: {
      'ZONE-01': { lat: 40.7128, lng: -74.0060 }, // Financial District / Tribeca
      'ZONE-02': { lat: 40.7209, lng: -73.9840 }, // Lower East Side / East Village
      'ZONE-03': { lat: 40.7465, lng: -74.0014 }, // Chelsea / Meatpacking
      'ZONE-04': { lat: 40.7440, lng: -73.9887 }, // Midtown South / Flatiron
    },
  },
  chicago: {
    center: { lat: 41.8858, lng: -87.6365 },
    zoom: 13,
    latLabel: '41.8781° N',
    lngLabel: '87.6298° W',
    gridCode: 'US-CENTRAL-CHI-H3R8',
    zoneCoords: {
      'CHI-01': { lat: 41.8786, lng: -87.6251 }, // The Loop Commercial Hub
      'CHI-02': { lat: 41.8924, lng: -87.6341 }, // River North Dining Grid
      'CHI-03': { lat: 41.8825, lng: -87.6478 }, // West Loop Logistics Corridor
    },
  },
  sf: {
    center: { lat: 37.7785, lng: -122.4056 },
    zoom: 13,
    latLabel: '37.7749° N',
    lngLabel: '122.4194° W',
    gridCode: 'US-WEST-SFO-H3R8',
    zoneCoords: {
      'SF-01': { lat: 37.7786, lng: -122.4056 }, // SoMa Tech Core
      'SF-02': { lat: 37.7599, lng: -122.4148 }, // Mission / Potrero Hill
      'SF-03': { lat: 37.7946, lng: -122.3999 }, // Financial / Embarcadero
    },
  },
  london: {
    center: { lat: 51.5118, lng: -0.0955 },
    zoom: 12,
    latLabel: '51.5072° N',
    lngLabel: '0.1276° W',
    gridCode: 'EU-UK-LON-H3R8',
    zoneCoords: {
      'LON-01': { lat: 51.5136, lng: -0.1365 }, // Soho / West End
      'LON-02': { lat: 51.5155, lng: -0.0922 }, // City of London / Bank
      'LON-03': { lat: 51.5054, lng: -0.0235 }, // Canary Wharf / Docklands
    },
  },
  sao_paulo: {
    center: { lat: -23.5685, lng: -46.6625 },
    zoom: 13,
    latLabel: '23.5505° S',
    lngLabel: '46.6333° W',
    gridCode: 'LATAM-GRU-H3R8',
    zoneCoords: {
      'SP-01': { lat: -23.5614, lng: -46.6559 }, // Avenida Paulista
      'SP-02': { lat: -23.5855, lng: -46.6784 }, // Itaim Bibi / Vila Olímpia
      'SP-03': { lat: -23.5616, lng: -46.6915 }, // Pinheiros Dining Hub
    },
  },
};

// Synchronizes Google Map camera when user switches cities and draws thermal/density circles + dispatch corridors
const GoogleMapsSpatialOverlays: React.FC<{
  cityCenter: { lat: number; lng: number };
  cityZoom: number;
  zonesWithLatLng: Array<{ zone: SubMarketZone; pos: { lat: number; lng: number } }>;
  layerMode: HeatmapLayerMode;
}> = ({ cityCenter, cityZoom, zonesWithLatLng, layerMode }) => {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const circlesRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);

  // Recenter map when city changes
  useEffect(() => {
    if (!map) return;
    map.panTo(cityCenter);
    map.setZoom(cityZoom);
  }, [map, cityCenter.lat, cityCenter.lng, cityZoom]);

  // Render demand hotspot circles and dispatch corridors on Google Map
  useEffect(() => {
    if (!map || !mapsLib) return;

    // Clear existing overlays
    circlesRef.current.forEach((c) => c.setMap(null));
    circlesRef.current = [];
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    // Draw dispatch corridor polylines connecting zones
    const corridorCoords = zonesWithLatLng.map((item) => item.pos);
    if (corridorCoords.length > 1) {
      const corridorLine = new mapsLib.Polyline({
        path: [...corridorCoords, corridorCoords[0]],
        geodesic: true,
        strokeColor: '#06b6d4',
        strokeOpacity: 0.45,
        strokeWeight: 2,
        map,
      });
      polylinesRef.current.push(corridorLine);
    }

    // Draw thermal demand / courier density circles around each zone
    zonesWithLatLng.forEach(({ zone, pos }) => {
      const isCritical = zone.status === 'CRITICAL' || zone.imbalancePct < -20;

      if (layerMode === 'composite' || layerMode === 'demand_hotspots' || layerMode === 'imbalance_delta') {
        const demandCircle = new mapsLib.Circle({
          center: pos,
          radius: Math.max(450, Math.min(1100, zone.demandReqMin * 0.95)),
          fillColor: isCritical ? '#f43f5e' : '#f59e0b',
          fillOpacity: isCritical ? 0.24 : 0.16,
          strokeColor: isCritical ? '#fb7185' : '#fbbf24',
          strokeOpacity: 0.6,
          strokeWeight: 1.5,
          clickable: false,
          map,
        });
        circlesRef.current.push(demandCircle);
      }

      if (layerMode === 'composite' || layerMode === 'courier_density') {
        const courierCircle = new mapsLib.Circle({
          center: pos,
          radius: Math.max(300, Math.min(850, zone.availableCouriers * 0.85)),
          fillColor: '#06b6d4',
          fillOpacity: 0.18,
          strokeColor: '#22d3ee',
          strokeOpacity: 0.55,
          strokeWeight: 1,
          clickable: false,
          map,
        });
        circlesRef.current.push(courierCircle);
      }
    });

    return () => {
      circlesRef.current.forEach((c) => c.setMap(null));
      polylinesRef.current.forEach((p) => p.setMap(null));
    };
  }, [map, mapsLib, zonesWithLatLng, layerMode]);

  return null;
};

const MapLoadErrorBanner: React.FC = () => {
  const status = useApiLoadingStatus();
  if (status === APILoadingStatus.AUTH_FAILURE || status === APILoadingStatus.FAILED) {
    return (
      <div className="bg-rose-950/90 border border-rose-500/40 text-rose-200 px-3 py-1.5 text-[11px] font-mono rounded-lg flex items-center gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
        <span>Unable to load Google Maps tiles. Please check your network or API key restrictions.</span>
      </div>
    );
  }
  return null;
};

export const CityHeatmap: React.FC<CityHeatmapProps> = ({
  city,
  zonesSim,
  selectedZoneId,
  onSelectZone,
  demandSurgeFactor = 0,
  courierDropFactor = 0,
  onNavigateToGovernance,
}) => {
  const { language } = useLanguage();
  const isThai = language === 'th';

  const [mapEngine, setMapEngine] = useState<MapEngineMode>('google_maps');
  const [layerMode, setLayerMode] = useState<HeatmapLayerMode>('composite');
  const [showH3Mesh, setShowH3Mesh] = useState<boolean>(true);
  const [showCourierVectors, setShowCourierVectors] = useState<boolean>(true);
  const [hoveredHex, setHoveredHex] = useState<H3HexCell | null>(null);
  const [openInfoZoneId, setOpenInfoZoneId] = useState<string | null>(null);

  const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const selectedZone = zonesSim.find((z) => z.id === selectedZoneId) || zonesSim[0];
  const geoConfig = CITY_GEO_CONFIG[city.cityId] || CITY_GEO_CONFIG.nyc;

  // Map each simulated zone to its real-world Lat/Lng
  const zonesWithLatLng = useMemo(() => {
    return zonesSim.map((zone, idx) => {
      const explicitCoord = geoConfig.zoneCoords[zone.id];
      const fallbackCoord = {
        lat: geoConfig.center.lat + (idx - 1.5) * 0.012,
        lng: geoConfig.center.lng + ((idx % 2) - 0.5) * 0.015,
      };
      return {
        zone,
        pos: explicitCoord || fallbackCoord,
      };
    });
  }, [zonesSim, geoConfig]);

  // Generate deterministic H3 spatial cells around each zone in the selected city
  const h3Cells = useMemo<H3HexCell[]>(() => {
    const cells: H3HexCell[] = [];
    zonesSim.forEach((zone, zIdx) => {
      const baseDemandNorm = Math.min(100, Math.round((zone.demandReqMin / 220) * 100));
      const baseCourierDensity = Math.max(2, Math.round(zone.availableCouriers / 14));

      const offsets = [
        { dx: 0, dy: 0, weight: 1.0 },
        { dx: -7, dy: -6, weight: 0.82 },
        { dx: 8, dy: -5, weight: 0.76 },
        { dx: -6, dy: 7, weight: 0.79 },
        { dx: 7, dy: 6, weight: 0.88 },
      ];

      offsets.forEach((off, oIdx) => {
        const x = Math.max(8, Math.min(92, zone.coordinates.x + off.dx));
        const y = Math.max(12, Math.min(88, zone.coordinates.y + off.dy));
        const demandIntensity = Math.min(100, Math.round(baseDemandNorm * off.weight));
        const courierDensity = Math.max(1, Math.round(baseCourierDensity * (2 - off.weight * 0.85)));
        const netBalance = Math.round(zone.imbalancePct * off.weight);

        cells.push({
          h3Index: `882a100${zIdx}${oIdx}ffffff`,
          zoneId: zone.id,
          x,
          y,
          demandIntensity,
          courierDensity,
          netBalance,
          isHotspot: demandIntensity >= 68 || zone.status === 'CRITICAL',
        });
      });
    });
    return cells;
  }, [zonesSim]);

  // Aggregate telemetry stats for the header bar
  const hotspotZonesCount = zonesSim.filter((z) => z.status === 'CRITICAL' || z.demandReqMin >= 150).length;
  const totalDemandReqMin = zonesSim.reduce((acc, z) => acc + z.demandReqMin, 0);
  const totalCouriersOnline = zonesSim.reduce((acc, z) => acc + z.availableCouriers, 0);
  const avgCourierDensityKm2 = +(totalCouriersOnline / (zonesSim.length * 11.5)).toFixed(1);

  return (
    <div className="bg-neutral-900/85 border border-neutral-800 rounded-xl p-5 space-y-4">
      {/* Header & Layer Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-3 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 font-mono text-[10px] font-bold flex items-center gap-1">
              <Flame className="w-3 h-3" />
              {isThai ? 'แผนที่ความร้อนอุปสงค์และไรเดอร์แบบเรียลไทม์' : 'GOOGLE MAPS PLATFORM • LIVE GEOSPATIAL OVERLAY'}
            </span>
            <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-[10px]">
              {geoConfig.gridCode}
            </span>
            <h3 className="text-base font-bold text-white tracking-tight">
              {isThai
                ? `แผนที่ความร้อนระดับเมือง (CityHeatmap): จุดความต้องการสูงและความหนาแน่นไรเดอร์ — ${city.cityName}`
                : `CityHeatmap: Real-Time Demand Hotspots & Courier Density — ${city.cityName}`}
            </h3>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            {isThai
              ? 'ซ้อนทับข้อมูลความร้อนของคำสั่งซื้อรายนาที (Demand Hotspots) และความหนาแน่นของไรเดอร์ต่อตารางกิโลเมตร (Courier Density) บน Google Maps Platform และโครงข่าย H3'
              : 'Interactive Google Maps Platform & H3 hexagonal spatial overlay showing real-time order demand hotspots and active courier density across neighborhoods.'}
          </p>
        </div>

        {/* Engine Switcher + Layer Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Map Engine Toggle: Google Maps Live vs H3 Radar */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
            <button
              onClick={() => setMapEngine('google_maps')}
              className={`px-2.5 py-1.5 rounded text-[11px] font-mono transition cursor-pointer flex items-center gap-1.5 ${
                mapEngine === 'google_maps'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{isThai ? 'Google Maps สด' : 'Google Maps Live'}</span>
            </button>
            <button
              onClick={() => setMapEngine('h3_radar')}
              className={`px-2.5 py-1.5 rounded text-[11px] font-mono transition cursor-pointer flex items-center gap-1.5 ${
                mapEngine === 'h3_radar'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>{isThai ? 'เรดาร์ H3' : 'H3 Tactical Mesh'}</span>
            </button>
          </div>

          {/* Layer Mode Switcher */}
          <div className="flex flex-wrap items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
            <button
              onClick={() => setLayerMode('composite')}
              className={`px-2.5 py-1.5 rounded text-[11px] font-mono transition cursor-pointer flex items-center gap-1.5 ${
                layerMode === 'composite'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{isThai ? 'ซ้อนทับทั้งหมด' : 'Composite'}</span>
            </button>

            <button
              onClick={() => setLayerMode('demand_hotspots')}
              className={`px-2.5 py-1.5 rounded text-[11px] font-mono transition cursor-pointer flex items-center gap-1.5 ${
                layerMode === 'demand_hotspots'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>{isThai ? 'จุดอุปสงค์สูง' : 'Hotspots'}</span>
            </button>

            <button
              onClick={() => setLayerMode('courier_density')}
              className={`px-2.5 py-1.5 rounded text-[11px] font-mono transition cursor-pointer flex items-center gap-1.5 ${
                layerMode === 'courier_density'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{isThai ? 'ความหนาแน่นไรเดอร์' : 'Density'}</span>
            </button>

            <button
              onClick={() => setLayerMode('imbalance_delta')}
              className={`px-2.5 py-1.5 rounded text-[11px] font-mono transition cursor-pointer flex items-center gap-1.5 ${
                layerMode === 'imbalance_delta'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{isThai ? 'ส่วนต่างขาดดุล' : 'Imbalance'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Spatial Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-neutral-950/90 border border-neutral-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-neutral-400 uppercase flex items-center justify-between">
            <span>{isThai ? 'โซนจุดความร้อนวิกฤต' : 'Active Thermal Hotspots'}</span>
            <Flame className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-lg font-bold font-mono text-rose-400 mt-1">
            {hotspotZonesCount} / {zonesSim.length} {isThai ? 'โซน' : 'Zones'}
          </div>
          <div className="text-[10px] font-mono text-neutral-500 mt-0.5">
            {isThai ? `อัตราคำสั่งซื้อรวม: ${totalDemandReqMin} req/min` : `City Inflow: ${totalDemandReqMin} req/min`}
          </div>
        </div>

        <div className="bg-neutral-950/90 border border-neutral-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-neutral-400 uppercase flex items-center justify-between">
            <span>{isThai ? 'ความหนาแน่นไรเดอร์เฉลี่ย' : 'Avg Courier Density'}</span>
            <Users className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-lg font-bold font-mono text-cyan-400 mt-1">
            {avgCourierDensityKm2} <span className="text-xs font-normal text-neutral-400">drv/km²</span>
          </div>
          <div className="text-[10px] font-mono text-neutral-500 mt-0.5">
            {isThai ? `ออนไลน์ทั้งหมด: ${totalCouriersOnline} คน` : `Total Active Fleet: ${totalCouriersOnline} couriers`}
          </div>
        </div>

        <div className="bg-neutral-950/90 border border-neutral-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-neutral-400 uppercase flex items-center justify-between">
            <span>{isThai ? 'โซนที่กำลังตรวจสอบ' : 'Focused Partition'}</span>
            <Crosshair className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg font-bold font-mono text-white mt-1 truncate">
            {selectedZone.id} <span className="text-xs font-normal text-neutral-400">({selectedZone.name})</span>
          </div>
          <div className="text-[10px] font-mono text-amber-400 mt-0.5">
            {isThai
              ? `ความสมดุล: ${selectedZone.imbalancePct}% | SLA: ${selectedZone.medianSlaMinutes}m`
              : `Imbalance: ${selectedZone.imbalancePct}% | SLA: ${selectedZone.medianSlaMinutes}m`}
          </div>
        </div>

        <div className="bg-neutral-950/90 border border-neutral-800 rounded-lg p-3 flex flex-col justify-between">
          <div className="text-[10px] font-mono text-neutral-400 uppercase flex items-center justify-between">
            <span>{isThai ? 'ตัวเลือกการแสดงผลแผนที่' : 'Spatial Telemetry Layers'}</span>
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <label className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showH3Mesh}
                onChange={(e) => setShowH3Mesh(e.target.checked)}
                className="rounded bg-neutral-800 border-neutral-700 text-cyan-500"
              />
              <span>H3 Cells</span>
            </label>
            <label className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showCourierVectors}
                onChange={(e) => setShowCourierVectors(e.target.checked)}
                className="rounded bg-neutral-800 border-neutral-700 text-cyan-500"
              />
              <span>{isThai ? 'คลัสเตอร์ไรเดอร์' : 'Fleet Clusters'}</span>
            </label>
          </div>
          <div className="text-[10px] font-mono text-neutral-500 mt-0.5">
            {geoConfig.latLabel}, {geoConfig.lngLabel}
          </div>
        </div>
      </div>

      {/* Main Interactive Heatmap Canvas + Zone Density Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Geospatial Canvas (8 Cols) */}
        <div className="lg:col-span-8 relative h-[430px] bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden select-none">
          {mapEngine === 'google_maps' ? (
            <div className="w-full h-full relative">
              <APIProvider apiKey={mapsApiKey}>
                <div className="absolute top-14 left-3 right-3 z-20 pointer-events-none">
                  <MapLoadErrorBanner />
                </div>

                <GoogleMap
                  defaultCenter={geoConfig.center}
                  defaultZoom={geoConfig.zoom}
                  mapId="DEMO_MAP_ID"
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  className="w-full h-full"
                  gestureHandling="greedy"
                  disableDefaultUI={false}
                >
                  <GoogleMapsSpatialOverlays
                    cityCenter={geoConfig.center}
                    cityZoom={geoConfig.zoom}
                    zonesWithLatLng={zonesWithLatLng}
                    layerMode={layerMode}
                  />

                  {/* Satellite Courier Fleet Cluster Markers */}
                  {showCourierVectors &&
                    zonesWithLatLng.map(({ zone, pos }) => {
                      const offsets = [
                        { dLat: 0.0032, dLng: -0.0041 },
                        { dLat: -0.0028, dLng: 0.0038 },
                      ];
                      return offsets.map((off, idx) => (
                        <AdvancedMarker
                          key={`fleet-${zone.id}-${idx}`}
                          position={{ lat: pos.lat + off.dLat, lng: pos.lng + off.dLng }}
                          title={`Active Fleet Cluster • ${zone.id}`}
                        >
                          <div className="w-3 h-3 rounded-full bg-cyan-400 border border-neutral-950 shadow-md shadow-cyan-400/80 ring-2 ring-cyan-500/30" />
                        </AdvancedMarker>
                      ));
                    })}

                  {/* Operational Zone Advanced Markers */}
                  {zonesWithLatLng.map(({ zone, pos }) => {
                    const isSelected = zone.id === selectedZoneId;
                    const courierDensity = +(zone.availableCouriers / 11.5).toFixed(1);

                    return (
                      <AdvancedMarker
                        key={zone.id}
                        position={pos}
                        title={`${zone.id}: ${zone.name}`}
                        onClick={() => {
                          onSelectZone(zone.id);
                          setOpenInfoZoneId(zone.id);
                        }}
                      >
                        <div
                          className={`rounded-xl px-2.5 py-1.5 border backdrop-blur-md transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-neutral-900/95 border-cyan-400 ring-2 ring-cyan-500/50 shadow-xl scale-105'
                              : zone.status === 'CRITICAL'
                              ? 'bg-neutral-950/90 border-rose-500/80 hover:border-rose-400'
                              : zone.status === 'DEGRADED'
                              ? 'bg-neutral-950/90 border-amber-500/70 hover:border-amber-400'
                              : 'bg-neutral-950/90 border-neutral-700 hover:border-neutral-500'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  zone.status === 'STABLE'
                                    ? 'bg-emerald-400'
                                    : zone.status === 'DEGRADED'
                                    ? 'bg-amber-400'
                                    : 'bg-rose-500 animate-ping'
                                }`}
                              />
                              <span className="text-[11px] font-mono font-bold text-white">{zone.id}</span>
                            </div>
                            <span
                              className={`text-[9px] font-mono font-bold px-1 rounded ${
                                zone.imbalancePct < -20
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : zone.imbalancePct < 0
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-emerald-500/20 text-emerald-300'
                              }`}
                            >
                              {zone.imbalancePct > 0 ? `+${zone.imbalancePct}%` : `${zone.imbalancePct}%`}
                            </span>
                          </div>
                          <div className="text-[9px] text-neutral-300 font-sans truncate max-w-[115px]">
                            {zone.name}
                          </div>
                          <div className="mt-1 pt-0.5 border-t border-neutral-800 flex items-center justify-between gap-2 text-[9px] font-mono">
                            <span className="text-rose-300">{zone.demandReqMin}/m</span>
                            <span className="text-cyan-300">{courierDensity}/km²</span>
                          </div>
                        </div>
                      </AdvancedMarker>
                    );
                  })}

                  {/* Optional InfoWindow for active zone inspection */}
                  {openInfoZoneId &&
                    (() => {
                      const target = zonesWithLatLng.find((z) => z.zone.id === openInfoZoneId);
                      if (!target) return null;
                      return (
                        <InfoWindow
                          position={target.pos}
                          onCloseClick={() => setOpenInfoZoneId(null)}
                        >
                          <div className="text-neutral-900 p-1 text-xs font-sans space-y-1">
                            <div className="font-bold text-neutral-950">
                              {target.zone.id} — {target.zone.name}
                            </div>
                            <div className="text-[11px] text-neutral-700">
                              Demand: <strong>{target.zone.demandReqMin} req/min</strong> • Couriers:{' '}
                              <strong>{target.zone.availableCouriers}</strong>
                            </div>
                            <div className="text-[11px] text-neutral-700">
                              Median SLA: <strong>{target.zone.medianSlaMinutes}m</strong> • Imbalance:{' '}
                              <strong>{target.zone.imbalancePct}%</strong>
                            </div>
                          </div>
                        </InfoWindow>
                      );
                    })()}
                </GoogleMap>
              </APIProvider>

              {/* Top-Left Telemetry HUD Overlay */}
              <div className="absolute top-3 left-3 bg-neutral-950/90 border border-neutral-800 rounded-lg px-3 py-2 text-[10px] font-mono space-y-0.5 pointer-events-none z-10">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <Radio className="w-3 h-3 animate-pulse" />
                  <span>GOOGLE MAPS LIVE TELEMETRY: {city.cluster}</span>
                </div>
                <div className="text-neutral-400">
                  Sim Modifiers: Demand <span className="text-rose-400">+{demandSurgeFactor}%</span> | Fleet{' '}
                  <span className="text-amber-400">-{courierDropFactor}%</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Topographic Dark Grid Background (H3 Tactical Mesh Fallback/Toggle) */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, #262626 1px, transparent 1px), linear-gradient(to bottom, #262626 1px, transparent 1px)',
                  backgroundSize: '32px 32px',
                }}
              />

              {/* Subtle SVG Arterial Corridors & River/Coastline Geometry */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <radialGradient id="hotspotGradCritical" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(244, 63, 94, 0.55)" />
                    <stop offset="55%" stopColor="rgba(245, 158, 11, 0.22)" />
                    <stop offset="100%" stopColor="rgba(244, 63, 94, 0)" />
                  </radialGradient>
                  <radialGradient id="hotspotGradModerate" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(245, 158, 11, 0.40)" />
                    <stop offset="60%" stopColor="rgba(245, 158, 11, 0.12)" />
                    <stop offset="100%" stopColor="rgba(245, 158, 11, 0)" />
                  </radialGradient>
                  <radialGradient id="courierDensityGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(6, 182, 212, 0.42)" />
                    <stop offset="60%" stopColor="rgba(16, 185, 129, 0.16)" />
                    <stop offset="100%" stopColor="rgba(6, 182, 212, 0)" />
                  </radialGradient>
                </defs>

                {zonesSim.map((z, idx) => {
                  const nextZone = zonesSim[(idx + 1) % zonesSim.length];
                  return (
                    <line
                      key={`corridor-${z.id}-${nextZone.id}`}
                      x1={z.coordinates.x}
                      y1={z.coordinates.y}
                      x2={nextZone.coordinates.x}
                      y2={nextZone.coordinates.y}
                      stroke="rgba(6, 182, 212, 0.18)"
                      strokeWidth="0.4"
                      strokeDasharray="1.2 1.2"
                    />
                  );
                })}

                {(layerMode === 'composite' || layerMode === 'demand_hotspots' || layerMode === 'imbalance_delta') &&
                  zonesSim.map((zone) => {
                    const radius = Math.max(14, Math.min(28, (zone.demandReqMin / 190) * 24));
                    const isCritical = zone.status === 'CRITICAL' || zone.imbalancePct < -20;
                    return (
                      <circle
                        key={`thermal-${zone.id}`}
                        cx={zone.coordinates.x}
                        cy={zone.coordinates.y}
                        r={radius}
                        fill={isCritical ? 'url(#hotspotGradCritical)' : 'url(#hotspotGradModerate)'}
                      />
                    );
                  })}

                {(layerMode === 'composite' || layerMode === 'courier_density') &&
                  zonesSim.map((zone) => {
                    const courierRadius = Math.max(10, Math.min(24, (zone.availableCouriers / 350) * 22));
                    return (
                      <circle
                        key={`courier-contour-${zone.id}`}
                        cx={zone.coordinates.x}
                        cy={zone.coordinates.y}
                        r={courierRadius}
                        fill="url(#courierDensityGrad)"
                      />
                    );
                  })}
              </svg>

              {/* H3 Spatial Sub-Cell Nodes */}
              {showH3Mesh &&
                h3Cells.map((cell) => {
                  const isHighDemand = cell.demandIntensity >= 70;
                  return (
                    <div
                      key={cell.h3Index}
                      onMouseEnter={() => setHoveredHex(cell)}
                      onMouseLeave={() => setHoveredHex(null)}
                      onClick={() => onSelectZone(cell.zoneId)}
                      style={{ left: `${cell.x}%`, top: `${cell.y}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-md border transition-all cursor-pointer flex items-center justify-center ${
                        layerMode === 'courier_density'
                          ? 'border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/30'
                          : isHighDemand
                          ? 'border-rose-500/40 bg-rose-500/15 hover:bg-rose-500/35'
                          : 'border-amber-500/25 bg-amber-500/10 hover:bg-amber-500/25'
                      }`}
                    >
                      <span className="text-[7px] font-mono text-neutral-300">
                        {layerMode === 'courier_density' ? `${cell.courierDensity}` : `${cell.demandIntensity}`}
                      </span>
                    </div>
                  );
                })}

              {/* Courier Fleet Cluster Dots */}
              {showCourierVectors &&
                zonesSim.map((zone) => {
                  const clusterPoints = [
                    { dx: -4, dy: 3 },
                    { dx: 4, dy: -3 },
                    { dx: 3, dy: 4 },
                  ];
                  return clusterPoints.map((pt, i) => (
                    <div
                      key={`drv-${zone.id}-${i}`}
                      style={{
                        left: `${Math.min(94, Math.max(6, zone.coordinates.x + pt.dx))}%`,
                        top: `${Math.min(92, Math.max(8, zone.coordinates.y + pt.dy))}%`,
                      }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    >
                      <span className="block w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/80 ring-2 ring-cyan-500/30" />
                    </div>
                  ));
                })}

              {/* Primary Operational Zone Interactive Overlay Cards */}
              {zonesSim.map((zone) => {
                const isSelected = zone.id === selectedZoneId;
                const courierDensity = +(zone.availableCouriers / 11.5).toFixed(1);
                const demandPerCourier = +(zone.demandReqMin / Math.max(1, zone.availableCouriers)).toFixed(2);

                return (
                  <div
                    key={zone.id}
                    onClick={() => onSelectZone(zone.id)}
                    style={{ left: `${zone.coordinates.x}%`, top: `${zone.coordinates.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 z-10"
                  >
                    {zone.status === 'CRITICAL' && (
                      <div className="absolute -inset-2 rounded-2xl border border-rose-500/60 animate-ping pointer-events-none" />
                    )}

                    <div
                      className={`rounded-xl px-3 py-2 border backdrop-blur-md transition-all ${
                        isSelected
                          ? 'bg-neutral-900/95 border-cyan-400 ring-2 ring-cyan-500/40 shadow-xl shadow-cyan-500/20 scale-110'
                          : zone.status === 'CRITICAL'
                          ? 'bg-neutral-950/90 border-rose-500/70 hover:border-rose-400'
                          : zone.status === 'DEGRADED'
                          ? 'bg-neutral-950/90 border-amber-500/60 hover:border-amber-400'
                          : 'bg-neutral-950/85 border-neutral-700 hover:border-neutral-500'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              zone.status === 'STABLE'
                                ? 'bg-emerald-400'
                                : zone.status === 'DEGRADED'
                                ? 'bg-amber-400'
                                : 'bg-rose-500'
                            }`}
                          />
                          <span className="text-xs font-mono font-bold text-white">{zone.id}</span>
                        </div>
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                            zone.imbalancePct < -20
                              ? 'bg-rose-500/20 text-rose-300'
                              : zone.imbalancePct < 0
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {zone.imbalancePct > 0 ? `+${zone.imbalancePct}%` : `${zone.imbalancePct}%`}
                        </span>
                      </div>

                      <div className="text-[10px] text-neutral-400 font-sans truncate max-w-[130px] mt-0.5">
                        {zone.name}
                      </div>

                      <div className="mt-1.5 pt-1 border-t border-neutral-800/90 flex items-center justify-between gap-2 text-[10px] font-mono">
                        <span className="text-rose-300 flex items-center gap-0.5" title="Order Demand Rate">
                          <Flame className="w-2.5 h-2.5 text-rose-400" />
                          {zone.demandReqMin}/m
                        </span>
                        <span className="text-cyan-300 flex items-center gap-0.5" title="Courier Density">
                          <Users className="w-2.5 h-2.5 text-cyan-400" />
                          {zone.availableCouriers} ({courierDensity}/km²)
                        </span>
                      </div>
                      <div className="text-[9px] font-mono text-neutral-500 mt-0.5 flex justify-between">
                        <span>Load: {demandPerCourier} req/drv</span>
                        <span>SLA: {zone.medianSlaMinutes}m</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Top-Left Telemetry HUD Overlay */}
              <div className="absolute top-3 left-3 bg-neutral-950/90 border border-neutral-800 rounded-lg px-3 py-2 text-[10px] font-mono space-y-1 pointer-events-none">
                <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                  <Radio className="w-3 h-3 animate-pulse" />
                  <span>H3 SPATIAL STREAM: ACTIVE</span>
                </div>
                <div className="text-neutral-400">
                  Sim Modifiers: Demand <span className="text-rose-400">+{demandSurgeFactor}%</span> | Fleet{' '}
                  <span className="text-amber-400">-{courierDropFactor}%</span>
                </div>
                {hoveredHex && (
                  <div className="pt-1 border-t border-neutral-800 text-neutral-200">
                    Hex <span className="text-cyan-400">{hoveredHex.h3Index}</span> • Heat:{' '}
                    <span className="text-rose-400">{hoveredHex.demandIntensity}/100</span> • Density:{' '}
                    <span className="text-emerald-400">{hoveredHex.courierDensity} drv/km²</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Bottom-Left Heatmap Legend */}
          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 bg-neutral-950/90 border border-neutral-800 rounded-lg px-3 py-2 text-[10px] font-mono z-10 pointer-events-none">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5 text-neutral-300">
                <span className="w-3 h-3 rounded-full bg-rose-500/60 border border-rose-400 inline-block" />
                {isThai ? 'จุดความต้องการสูงวิกฤต (Demand Hotspot)' : 'Critical Demand Hotspot (>145 req/m)'}
              </span>
              <span className="flex items-center gap-1.5 text-neutral-300">
                <span className="w-3 h-3 rounded-full bg-amber-500/50 border border-amber-400 inline-block" />
                {isThai ? 'ความต้องการปานกลาง' : 'Elevated Demand Zone'}
              </span>
              <span className="flex items-center gap-1.5 text-neutral-300">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
                {isThai ? 'ความหนาแน่นไรเดอร์ (Courier Density)' : 'Courier Fleet Cluster (drv/km²)'}
              </span>
            </div>
            <span className="text-neutral-500">
              {isThai ? 'คลิกโซนบนแผนที่เพื่อดูรายละเอียด' : 'Click any zone node to inspect'}
            </span>
          </div>
        </div>

        {/* Right Side Panel: Zone Hotspot & Courier Density Breakdown (4 Cols) */}
        <div className="lg:col-span-4 bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold font-mono uppercase text-white tracking-wider">
                  {isThai ? 'วิเคราะห์ความหนาแน่นรายโซน' : 'Zone Hotspot & Density Telemetry'}
                </h4>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 font-bold">{selectedZone.id}</span>
            </div>

            {/* Selected Zone Deep Dive */}
            <div className="p-3 bg-neutral-900/90 border border-neutral-800 rounded-lg space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">{selectedZone.name}</div>
                  <div className="text-[10px] font-mono text-neutral-400">
                    Partition ID: {selectedZone.id} • Status: {selectedZone.status}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    selectedZone.status === 'CRITICAL'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : selectedZone.status === 'DEGRADED'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {selectedZone.status}
                </span>
              </div>

              {/* Demand Thermal Index Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-neutral-400">
                    {isThai ? 'ความเข้มข้นคำสั่งซื้อ (Hotspot Index):' : 'Demand Hotspot Intensity:'}
                  </span>
                  <span className="text-rose-400 font-bold">{selectedZone.demandReqMin} req/min</span>
                </div>
                <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.round((selectedZone.demandReqMin / 220) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Courier Spatial Density Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-neutral-400">
                    {isThai ? 'ความหนาแน่นไรเดอร์ (Courier Density):' : 'Courier Fleet Spatial Density:'}
                  </span>
                  <span className="text-cyan-400 font-bold">
                    {selectedZone.availableCouriers} drv ({(selectedZone.availableCouriers / 11.5).toFixed(1)}/km²)
                  </span>
                </div>
                <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.round((selectedZone.availableCouriers / 420) * 100))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Ranked All-Zones Hotspot & Density List */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono text-neutral-400 uppercase">
                {isThai ? 'เปรียบเทียบทุกโซนในเมือง' : 'City-Wide Hotspot vs. Courier Density Matrix'}
              </div>
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {zonesSim.map((z) => {
                  const isSel = z.id === selectedZoneId;
                  const densityKm2 = (z.availableCouriers / 11.5).toFixed(1);
                  return (
                    <button
                      key={z.id}
                      onClick={() => {
                        onSelectZone(z.id);
                        setOpenInfoZoneId(z.id);
                      }}
                      className={`w-full text-left p-2 rounded-lg border font-mono text-[11px] transition flex items-center justify-between cursor-pointer ${
                        isSel
                          ? 'bg-cyan-950/30 border-cyan-500/60 text-white'
                          : 'bg-neutral-900/60 border-neutral-800 text-neutral-300 hover:bg-neutral-900'
                      }`}
                    >
                      <div>
                        <div className="font-bold flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              z.status === 'STABLE'
                                ? 'bg-emerald-400'
                                : z.status === 'DEGRADED'
                                ? 'bg-amber-400'
                                : 'bg-rose-500'
                            }`}
                          />
                          <span>{z.id}</span>
                          <span className="text-[10px] text-neutral-500 font-sans truncate max-w-[100px]">
                            {z.name}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 text-[10px]">
                        <span className="text-rose-400">{z.demandReqMin}/m</span>
                        <span className="text-cyan-400">{densityKm2}/km²</span>
                        <span
                          className={`font-bold ${
                            z.imbalancePct < 0 ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {z.imbalancePct > 0 ? `+${z.imbalancePct}%` : `${z.imbalancePct}%`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Spatial Rebalance Advisory Action */}
          {onNavigateToGovernance && (
            <div className="pt-2 border-t border-neutral-800 space-y-2">
              <div className="text-[10px] font-mono text-amber-300/90 bg-amber-950/30 border border-amber-900/40 rounded p-2 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  {isThai
                    ? `ตรวจพบความไม่สมดุลเชิงพื้นที่ใน ${selectedZone.id} (${selectedZone.imbalancePct}%) ข้อเสนอแนะการย้ายไรเดอร์ต้องได้รับการอนุมัติจากมนุษย์`
                    : `Spatial hotspot imbalance in ${selectedZone.id} (${selectedZone.imbalancePct}%). Fleet dispatch proposals require AEON Guardian approval.`}
                </span>
              </div>
              <button
                onClick={() =>
                  onNavigateToGovernance({
                    source: 'CITY_HEATMAP_TELEMETRY',
                    zone: selectedZone.id,
                    imbalance: selectedZone.imbalancePct,
                    demand: selectedZone.demandReqMin,
                    couriers: selectedZone.availableCouriers,
                  })
                }
                className="w-full py-2 px-3 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 rounded-lg text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {isThai
                    ? 'ส่งแผนปรับสมดุลจุดความร้อนไปยัง AEON Guardian'
                    : 'Propose Hotspot Fleet Rebalance to AEON Guardian'}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
