import React, { useState, useEffect, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import {
  Navigation,
  MapPin,
  Clock,
  Zap,
  BatteryCharging,
  Phone,
  MessageSquare,
  ShieldCheck,
  AlertTriangle,
  Play,
  Pause,
  FastForward,
  RotateCcw,
  CheckCircle2,
  Bike,
  Car,
  Truck,
  User,
  Star,
} from 'lucide-react';
import { CityMarketplace } from '../types';

interface CustomerCourierTrackingProps {
  orderId?: string;
  courierName?: string;
  cityName?: string;
}

// Sample GPS Waypoint Trajectories for NYC Midtown / Downtown orders
const TRACKING_SCENARIOS = [
  {
    orderId: 'ORD-98214',
    courierId: 'CR-8841',
    courierName: 'Marcus Vance',
    courierRating: 4.92,
    vehicleType: 'E-Cargo Bike',
    vehicleIcon: Bike,
    merchantName: 'Joe\'s Gourmet Pizza & Pasta',
    merchantAddress: '550 8th Ave, New York, NY',
    merchantCoords: { lat: 40.7549, lng: -73.9910 },
    customerName: 'Sarah Jenkins',
    customerAddress: '240 W 40th St, Apt 12B, New York, NY',
    customerCoords: { lat: 40.7562, lng: -73.9890 },
    routePath: [
      { lat: 40.7520, lng: -73.9940, heading: 45, speedKmH: 22, label: 'En route to merchant' },
      { lat: 40.7535, lng: -73.9925, heading: 45, speedKmH: 24, label: 'Approaching Joe\'s Gourmet' },
      { lat: 40.7549, lng: -73.9910, heading: 90, speedKmH: 0, label: 'Picked up order at Merchant' },
      { lat: 40.7554, lng: -73.9900, heading: 30, speedKmH: 18, label: 'Departed merchant, heading to customer' },
      { lat: 40.7558, lng: -73.9895, heading: 30, speedKmH: 19, label: '100m from dropoff building' },
      { lat: 40.7562, lng: -73.9890, heading: 0, speedKmH: 0, label: 'Arrived at Customer Entrance' },
    ],
    batteryLevelPct: 88,
    cargoTempC: 62.4, // Warm food thermal box
    initialEtaMinutes: 12,
  },
  {
    orderId: 'ORD-89219',
    courierId: 'CR-4022',
    courierName: 'Elena Rostova',
    courierRating: 4.85,
    vehicleType: 'Electric Scooter',
    vehicleIcon: Bike,
    merchantName: 'Gourmet Organic Pantry',
    merchantAddress: '180 9th Ave, New York, NY',
    merchantCoords: { lat: 40.7450, lng: -74.0020 },
    customerName: 'Apex BioTech Lab',
    customerAddress: '350 W 23rd St, New York, NY',
    customerCoords: { lat: 40.7470, lng: -73.9980 },
    routePath: [
      { lat: 40.7430, lng: -74.0040, heading: 30, speedKmH: 28, label: 'En route on 9th Ave' },
      { lat: 40.7450, lng: -74.0020, heading: 90, speedKmH: 0, label: 'Picking up cold-chain package' },
      { lat: 40.7460, lng: -74.0000, heading: 45, speedKmH: 25, label: 'Crossing 23rd St Corridor' },
      { lat: 40.7470, lng: -73.9980, heading: 0, speedKmH: 0, label: 'At Security Desk' },
    ],
    batteryLevelPct: 94,
    cargoTempC: 4.2, // Cold-chain temperature
    initialEtaMinutes: 8,
  },
];

// Helper Polyline Component for Google Maps
const RoutePolyline: React.FC<{ path: Array<{ lat: number; lng: number }> }> = ({ path }) => {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const polylineRef = useRef<any>(null);

  useEffect(() => {
    if (!map || !mapsLib) return;

    if (!polylineRef.current) {
      polylineRef.current = new mapsLib.Polyline({
        path,
        geodesic: true,
        strokeColor: '#06b6d4', // Cyan accent
        strokeOpacity: 0.85,
        strokeWeight: 5,
        map,
      });
    } else {
      polylineRef.current.setPath(path);
      polylineRef.current.setMap(map);
    }

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }
    };
  }, [map, mapsLib, path]);

  return null;
};

export const CustomerCourierTracking: React.FC<CustomerCourierTrackingProps> = ({
  orderId = 'ORD-98214',
}) => {
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState<number>(0);
  const scenario = TRACKING_SCENARIOS[selectedScenarioIndex] || TRACKING_SCENARIOS[0];

  const [currentWaypointIndex, setCurrentWaypointIndex] = useState<number>(1);
  const [isSimulatingGps, setIsSimulatingGps] = useState<boolean>(true);
  const [etaMinutes, setEtaMinutes] = useState<number>(scenario.initialEtaMinutes);
  const [trafficDelayApplied, setTrafficDelayApplied] = useState<boolean>(false);
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);

  const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyB8diwI4YWiS0UX2ahSS9D2mfh7zS9Sryw';

  // Listen for quota or auth errors
  useEffect(() => {
    const handleQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  // Periodic GPS Location Telemetry Stream Simulation
  useEffect(() => {
    if (!isSimulatingGps) return;

    const interval = setInterval(() => {
      setCurrentWaypointIndex((prev) => {
        const next = (prev + 1) % scenario.routePath.length;
        // Decrease ETA as courier approaches customer
        setEtaMinutes((prevEta) => Math.max(1, prevEta - (next === 0 ? -scenario.initialEtaMinutes : 1)));
        return next;
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [isSimulatingGps, scenario]);

  const currentCoords = scenario.routePath[currentWaypointIndex] || scenario.routePath[0];
  const VehicleIcon = scenario.vehicleIcon;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Quota Exceeded Banner (Mandatory by Google Maps skill) */}
      {quotaExceeded && (
        <div className="bg-amber-950/80 border border-amber-500/50 text-amber-300 px-4 py-2.5 text-xs font-mono rounded-lg flex items-center justify-between">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-bold text-amber-200 hover:text-white"
            >
              maps developer site
            </a>{' '}
            for instructions.
          </span>
          <button onClick={() => setQuotaExceeded(false)} className="text-amber-400 hover:text-white">
            ×
          </button>
        </div>
      )}

      {/* Main Header & Scenario Selector */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold">
              REAL-TIME GPS COURIER TRACKING
            </span>
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Live Telemetry Stream
            </span>
          </div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Navigation className="w-5 h-5 text-cyan-400" />
            Customer Delivery Map & Courier Geolocation
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Google Maps Platform integration with periodic GPS coordinate streaming, cargo telemetry, and ETA calculation.
          </p>
        </div>

        {/* Order Scenario Selector */}
        <div className="flex items-center gap-2 bg-neutral-950 p-1.5 rounded-lg border border-neutral-800 text-xs font-mono">
          <span className="text-neutral-500 px-2">Order:</span>
          {TRACKING_SCENARIOS.map((sc, idx) => (
            <button
              key={sc.orderId}
              onClick={() => {
                setSelectedScenarioIndex(idx);
                setCurrentWaypointIndex(0);
                setEtaMinutes(sc.initialEtaMinutes);
                setTrafficDelayApplied(false);
              }}
              className={`px-3 py-1.5 rounded transition cursor-pointer ${
                selectedScenarioIndex === idx
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {sc.orderId} ({sc.courierName.split(' ')[0]})
            </button>
          ))}
        </div>
      </div>

      {/* Map & Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Google Maps Component (8 cols) */}
        <div className="lg:col-span-8 bg-neutral-900/80 border border-neutral-800 rounded-xl overflow-hidden relative flex flex-col justify-between h-[520px]">
          {/* Map View */}
          <div className="w-full h-full relative">
            <APIProvider apiKey={mapsApiKey}>
              <Map
                defaultCenter={scenario.merchantCoords}
                defaultZoom={15}
                center={currentCoords}
                mapId="DEMO_MAP_ID"
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                className="w-full h-full"
                gestureHandling="greedy"
                disableDefaultUI={false}
              >
                {/* Route Polyline connecting Merchant and Customer */}
                <RoutePolyline
                  path={[
                    scenario.merchantCoords,
                    ...scenario.routePath.map((pt) => ({ lat: pt.lat, lng: pt.lng })),
                    scenario.customerCoords,
                  ]}
                />

                {/* Merchant Marker */}
                <AdvancedMarker position={scenario.merchantCoords} title={scenario.merchantName}>
                  <Pin background="#3b82f6" glyphColor="#ffffff" borderColor="#1d4ed8" />
                </AdvancedMarker>

                {/* Customer Dropoff Marker */}
                <AdvancedMarker position={scenario.customerCoords} title={scenario.customerName}>
                  <Pin background="#10b981" glyphColor="#ffffff" borderColor="#047857" />
                </AdvancedMarker>

                {/* Courier Real-Time Moving Marker */}
                <AdvancedMarker position={currentCoords} title={scenario.courierName}>
                  <div className="relative group cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/30 border-2 border-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/40 animate-pulse">
                      <VehicleIcon className="w-5 h-5 text-cyan-300" />
                    </div>
                    <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 bg-neutral-950/90 border border-cyan-500/40 rounded text-[10px] font-mono text-cyan-300 font-bold shadow-md">
                      {scenario.courierName} ({currentCoords.speedKmH} km/h)
                    </div>
                  </div>
                </AdvancedMarker>
              </Map>
            </APIProvider>

            {/* Floating Top Map Telemetry Bar */}
            <div className="absolute top-3 left-3 right-3 bg-neutral-950/90 border border-neutral-800 backdrop-blur-md rounded-lg p-3 text-xs font-mono flex flex-wrap items-center justify-between gap-2 shadow-lg">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-white font-semibold">{currentCoords.label}</span>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-neutral-300">
                <span>Speed: <strong className="text-cyan-400">{currentCoords.speedKmH} km/h</strong></span>
                <span>Lat: {currentCoords.lat.toFixed(4)} | Lng: {currentCoords.lng.toFixed(4)}</span>
              </div>
            </div>

            {/* Bottom Floating Map Controls */}
            <div className="absolute bottom-3 left-3 right-3 bg-neutral-950/90 border border-neutral-800 backdrop-blur-md rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSimulatingGps(!isSimulatingGps)}
                  className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-cyan-300 border border-neutral-700 font-semibold transition cursor-pointer flex items-center gap-1"
                >
                  {isSimulatingGps ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {isSimulatingGps ? 'Pause GPS Stream' : 'Resume GPS Stream'}
                </button>

                <button
                  onClick={() =>
                    setCurrentWaypointIndex((prev) => (prev + 1) % scenario.routePath.length)
                  }
                  className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition cursor-pointer flex items-center gap-1"
                >
                  <FastForward className="w-3.5 h-3.5" />
                  Step Waypoint
                </button>
              </div>

              <button
                onClick={() => {
                  setTrafficDelayApplied(true);
                  setEtaMinutes((prev) => prev + 5);
                }}
                disabled={trafficDelayApplied}
                className="px-3 py-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                {trafficDelayApplied ? 'Traffic Bottleneck Applied (+5m)' : 'Simulate Traffic Delay (+5m)'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Courier Profile & Order Progress Card (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Courier Identity Card */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <span className="text-xs font-mono text-neutral-400">ASSIGNED COURIER</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">
                EN ROUTE
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center font-bold text-base text-cyan-300">
                {scenario.courierName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </div>
              <div>
                <h4 className="text-base font-bold text-white">{scenario.courierName}</h4>
                <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono mt-0.5">
                  <span className="text-yellow-400 font-bold flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-yellow-400" />
                    {scenario.courierRating}
                  </span>
                  <span>•</span>
                  <span>{scenario.vehicleType}</span>
                </div>
              </div>
            </div>

            {/* Estimated Arrival Banner */}
            <div className="p-4 bg-neutral-950 border border-cyan-500/30 rounded-xl text-center space-y-1">
              <div className="text-[11px] text-neutral-400 font-mono uppercase">Estimated Delivery Time</div>
              <div className="text-3xl font-bold text-cyan-400 font-mono tracking-tight flex items-center justify-center gap-2">
                <Clock className="w-6 h-6 text-cyan-400" />
                {etaMinutes} mins
              </div>
              <div className="text-[11px] text-emerald-400 font-mono">On-Time SLA Guaranteed (&lt;30m)</div>
            </div>

            {/* Cargo Telemetry Box */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg">
                <div className="text-[10px] text-neutral-500 flex items-center gap-1">
                  <BatteryCharging className="w-3 h-3 text-emerald-400" /> Vehicle Battery
                </div>
                <div className="text-emerald-400 font-bold mt-1">{scenario.batteryLevelPct}% Charged</div>
              </div>

              <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg">
                <div className="text-[10px] text-neutral-500 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" /> Cargo Thermal
                </div>
                <div className="text-amber-300 font-bold mt-1">{scenario.cargoTempC}°C Controlled</div>
              </div>
            </div>

            {/* Contact Actions */}
            <div className="pt-2 border-t border-neutral-800 grid grid-cols-2 gap-2 text-xs font-mono">
              <button
                onClick={() => alert(`Calling courier ${scenario.courierName}...`)}
                className="py-2 px-3 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5 text-cyan-400" /> Call Courier
              </button>
              <button
                onClick={() => alert(`Opening chat with ${scenario.courierName}...`)}
                className="py-2 px-3 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-cyan-400" /> Send Note
              </button>
            </div>
          </div>

          {/* Handoff Address Breakdown */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 space-y-3 text-xs font-mono">
            <div className="flex items-start gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1 shrink-0" />
              <div>
                <span className="text-neutral-500 text-[10px] block uppercase">Merchant Pickup</span>
                <span className="text-white font-semibold">{scenario.merchantName}</span>
                <span className="text-neutral-400 block text-[11px]">{scenario.merchantAddress}</span>
              </div>
            </div>

            <div className="border-l-2 border-dashed border-neutral-800 ml-1 pl-4 py-1 text-[11px] text-neutral-500">
              3-item order verified by WMS barcode scan
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
              <div>
                <span className="text-neutral-500 text-[10px] block uppercase">Customer Dropoff</span>
                <span className="text-white font-semibold">{scenario.customerName}</span>
                <span className="text-neutral-400 block text-[11px]">{scenario.customerAddress}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
