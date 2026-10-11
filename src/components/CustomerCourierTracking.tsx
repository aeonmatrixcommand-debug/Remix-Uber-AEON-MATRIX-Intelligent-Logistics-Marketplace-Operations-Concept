import React, { useState, useEffect, useRef } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
  useMapsLibrary,
  useApiLoadingStatus,
  APILoadingStatus,
} from '@vis.gl/react-google-maps';
import {
  Navigation,
  Clock,
  Zap,
  BatteryCharging,
  Phone,
  MessageSquare,
  AlertTriangle,
  Play,
  Pause,
  FastForward,
  CheckCircle2,
  Bike,
  Star,
} from 'lucide-react';

interface CustomerCourierTrackingProps {
  orderId?: string;
  courierName?: string;
  cityName?: string;
}

// Verified NYC Midtown / Chelsea Dispatch Coordinates
const TRACKING_SCENARIOS = [
  {
    orderId: 'ORD-98214',
    courierId: 'CR-8841',
    courierName: 'Marcus Vance',
    courierRating: 4.92,
    vehicleType: 'E-Cargo Bike',
    vehicleIcon: Bike,
    merchantName: "Joe's Pizza Broadway",
    merchantAddress: '1435 Broadway, New York, NY 10018',
    merchantCoords: { lat: 40.7546, lng: -73.9870 },
    customerName: 'Midtown Tech Tower — 14th Fl',
    customerAddress: '500 7th Ave, New York, NY 10018',
    customerCoords: { lat: 40.7532, lng: -73.9896 },
    routePath: [
      { lat: 40.7558, lng: -73.9855, heading: 210, speedKmH: 22, label: 'En route to merchant pickup' },
      { lat: 40.7551, lng: -73.9863, heading: 215, speedKmH: 20, label: 'Approaching Broadway pickup zone' },
      { lat: 40.7546, lng: -73.9870, heading: 180, speedKmH: 0, label: 'Order verified & scanned at Merchant' },
      { lat: 40.7541, lng: -73.9879, heading: 230, speedKmH: 19, label: 'Departed merchant via W 40th St' },
      { lat: 40.7536, lng: -73.9888, heading: 225, speedKmH: 21, label: '120m from customer dropoff entrance' },
      { lat: 40.7532, lng: -73.9896, heading: 0, speedKmH: 0, label: 'Arrived at Customer Dropoff Lobby' },
    ],
    batteryLevelPct: 88,
    cargoTempC: 62.4,
    initialEtaMinutes: 11,
  },
  {
    orderId: 'ORD-89219',
    courierId: 'CR-4022',
    courierName: 'Elena Rostova',
    courierRating: 4.85,
    vehicleType: 'Electric Scooter',
    vehicleIcon: Bike,
    merchantName: 'Chelsea Market Artisanal Hub',
    merchantAddress: '75 9th Ave, New York, NY 10011',
    merchantCoords: { lat: 40.7424, lng: -74.0061 },
    customerName: 'Flatiron Studios West',
    customerAddress: '175 5th Ave, New York, NY 10010',
    customerCoords: { lat: 40.7411, lng: -73.9897 },
    routePath: [
      { lat: 40.7432, lng: -74.0075, heading: 135, speedKmH: 26, label: 'Approaching 9th Ave dock' },
      { lat: 40.7424, lng: -74.0061, heading: 90, speedKmH: 0, label: 'Cold-chain package loaded at Chelsea Market' },
      { lat: 40.7419, lng: -74.0005, heading: 95, speedKmH: 27, label: 'Cruising eastbound on W 16th St corridor' },
      { lat: 40.7415, lng: -73.9945, heading: 95, speedKmH: 24, label: 'Crossing 6th Ave intersection' },
      { lat: 40.7411, lng: -73.9897, heading: 0, speedKmH: 0, label: 'Arrived at Flatiron Security Desk' },
    ],
    batteryLevelPct: 94,
    cargoTempC: 4.2,
    initialEtaMinutes: 8,
  },
];

// Modern Route & Geodesic Polyline Renderer using @vis.gl/react-google-maps hooks
const DeliveryRouteOverlay: React.FC<{
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  fallbackPath: Array<{ lat: number; lng: number }>;
  onRouteError?: (msg: string) => void;
}> = ({ origin, destination, fallbackPath, onRouteError }) => {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const routesLib = useMapsLibrary('routes');
  const polylineRef = useRef<any>(null);

  useEffect(() => {
    if (!map || !mapsLib) return;

    // Clean up previous polyline
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    const renderPath = (pathCoords: Array<{ lat: number; lng: number } | any>) => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }
      polylineRef.current = new mapsLib.Polyline({
        path: pathCoords,
        geodesic: true,
        strokeColor: '#06b6d4',
        strokeOpacity: 0.9,
        strokeWeight: 5,
        map,
      });
    };

    // Immediately draw telemetry trajectory so the map is responsive
    renderPath(fallbackPath);

    // Attempt modern Routes API calculation via JS SDK Route class if available
    const RouteClass = (routesLib as any)?.Route;
    if (RouteClass && typeof RouteClass.computeRoutes === 'function') {
      RouteClass.computeRoutes({
        origin,
        destination,
        travelMode: 'DRIVING',
        fields: ['path'],
      })
        .then((res: any) => {
          const computedPath = res?.routes?.[0]?.path;
          if (Array.isArray(computedPath) && computedPath.length > 0) {
            renderPath(computedPath);
          }
        })
        .catch((err: unknown) => {
          console.error('Routes API calculation fallback to telemetry waypoints:', err);
          if (onRouteError) {
            onRouteError('Using direct GPS telemetry corridor.');
          }
        });
    }

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }
    };
  }, [map, mapsLib, routesLib, origin, destination, fallbackPath]);

  return null;
};

const MapStatusMonitor: React.FC = () => {
  const status = useApiLoadingStatus();
  if (status === APILoadingStatus.AUTH_FAILURE || status === APILoadingStatus.FAILED) {
    return (
      <div className="bg-rose-950/90 border border-rose-500/40 text-rose-200 px-3 py-2 text-xs font-mono rounded-lg flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
        <span>Unable to load map tiles or route data. Please check your network or API key configuration.</span>
      </div>
    );
  }
  return null;
};

export const CustomerCourierTracking: React.FC<CustomerCourierTrackingProps> = () => {
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState<number>(0);
  const scenario = TRACKING_SCENARIOS[selectedScenarioIndex] || TRACKING_SCENARIOS[0];

  const [currentWaypointIndex, setCurrentWaypointIndex] = useState<number>(1);
  const [isSimulatingGps, setIsSimulatingGps] = useState<boolean>(true);
  const [etaMinutes, setEtaMinutes] = useState<number>(scenario.initialEtaMinutes);
  const [trafficDelayApplied, setTrafficDelayApplied] = useState<boolean>(false);
  const [activeInfoMarker, setActiveInfoMarker] = useState<'merchant' | 'customer' | 'courier' | null>(null);
  const [contactActionStatus, setContactActionStatus] = useState<string | null>(null);

  const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // Periodic GPS Location Telemetry Stream Simulation
  useEffect(() => {
    if (!isSimulatingGps) return;

    const interval = setInterval(() => {
      setCurrentWaypointIndex((prev) => {
        const next = (prev + 1) % scenario.routePath.length;
        setEtaMinutes((prevEta) => Math.max(1, prevEta - (next === 0 ? -scenario.initialEtaMinutes : 1)));
        return next;
      });
    }, 3200);

    return () => clearInterval(interval);
  }, [isSimulatingGps, scenario]);

  const currentCoords = scenario.routePath[currentWaypointIndex] || scenario.routePath[0];
  const VehicleIcon = scenario.vehicleIcon;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Main Header & Scenario Selector */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold">
              GOOGLE MAPS PLATFORM • LIVE COURIER TELEMETRY
            </span>
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Active GPS Stream
            </span>
          </div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Navigation className="w-5 h-5 text-cyan-400" />
            Customer Delivery Map & Real-Time Courier Geolocation
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Interactive Google Maps Platform telemetry with Advanced Markers, route corridor overlay, and live cargo sensors.
          </p>
        </div>

        {/* Order Scenario Selector */}
        <div className="flex items-center gap-2 bg-neutral-950 p-1.5 rounded-lg border border-neutral-800 text-xs font-mono">
          <span className="text-neutral-500 px-2">Active Order:</span>
          {TRACKING_SCENARIOS.map((sc, idx) => (
            <button
              key={sc.orderId}
              onClick={() => {
                setSelectedScenarioIndex(idx);
                setCurrentWaypointIndex(0);
                setEtaMinutes(sc.initialEtaMinutes);
                setTrafficDelayApplied(false);
                setActiveInfoMarker(null);
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
          <div className="w-full h-full relative">
            <APIProvider apiKey={mapsApiKey}>
              <div className="absolute top-16 left-3 right-3 z-20 pointer-events-none">
                <MapStatusMonitor />
              </div>

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
                {/* Route Polyline connecting Merchant, Waypoints, and Customer */}
                <DeliveryRouteOverlay
                  origin={scenario.merchantCoords}
                  destination={scenario.customerCoords}
                  fallbackPath={[
                    scenario.merchantCoords,
                    ...scenario.routePath.map((pt) => ({ lat: pt.lat, lng: pt.lng })),
                    scenario.customerCoords,
                  ]}
                />

                {/* Merchant Pickup AdvancedMarker */}
                <AdvancedMarker
                  position={scenario.merchantCoords}
                  title={`Merchant Pickup: ${scenario.merchantName}`}
                  onClick={() => setActiveInfoMarker('merchant')}
                >
                  <Pin background="#3b82f6" glyphColor="#ffffff" borderColor="#1d4ed8" />
                </AdvancedMarker>

                {/* Customer Dropoff AdvancedMarker */}
                <AdvancedMarker
                  position={scenario.customerCoords}
                  title={`Customer Dropoff: ${scenario.customerName}`}
                  onClick={() => setActiveInfoMarker('customer')}
                >
                  <Pin background="#10b981" glyphColor="#ffffff" borderColor="#047857" />
                </AdvancedMarker>

                {/* Courier Real-Time Moving AdvancedMarker */}
                <AdvancedMarker
                  position={currentCoords}
                  title={`Courier: ${scenario.courierName}`}
                  onClick={() => setActiveInfoMarker('courier')}
                >
                  <div className="relative group cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/30 border-2 border-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/40 animate-pulse">
                      <VehicleIcon className="w-5 h-5 text-cyan-300" />
                    </div>
                    <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 bg-neutral-950/90 border border-cyan-500/40 rounded text-[10px] font-mono text-cyan-300 font-bold shadow-md">
                      {scenario.courierName} ({currentCoords.speedKmH} km/h)
                    </div>
                  </div>
                </AdvancedMarker>

                {/* InfoWindows for clicked markers */}
                {activeInfoMarker === 'merchant' && (
                  <InfoWindow
                    position={scenario.merchantCoords}
                    onCloseClick={() => setActiveInfoMarker(null)}
                  >
                    <div className="text-neutral-900 p-1 text-xs font-sans">
                      <div className="font-bold text-blue-700">Merchant Pickup Origin</div>
                      <div className="font-semibold mt-0.5">{scenario.merchantName}</div>
                      <div className="text-neutral-600 text-[11px]">{scenario.merchantAddress}</div>
                    </div>
                  </InfoWindow>
                )}

                {activeInfoMarker === 'customer' && (
                  <InfoWindow
                    position={scenario.customerCoords}
                    onCloseClick={() => setActiveInfoMarker(null)}
                  >
                    <div className="text-neutral-900 p-1 text-xs font-sans">
                      <div className="font-bold text-emerald-700">Customer Dropoff Destination</div>
                      <div className="font-semibold mt-0.5">{scenario.customerName}</div>
                      <div className="text-neutral-600 text-[11px]">{scenario.customerAddress}</div>
                    </div>
                  </InfoWindow>
                )}

                {activeInfoMarker === 'courier' && (
                  <InfoWindow
                    position={currentCoords}
                    onCloseClick={() => setActiveInfoMarker(null)}
                  >
                    <div className="text-neutral-900 p-1 text-xs font-sans">
                      <div className="font-bold text-cyan-700">{scenario.courierName} ({scenario.courierId})</div>
                      <div className="text-[11px] text-neutral-700 mt-0.5">
                        {scenario.vehicleType} • Speed: {currentCoords.speedKmH} km/h
                      </div>
                      <div className="text-[11px] text-emerald-700 font-semibold">
                        ETA: {etaMinutes} mins • Cargo: {scenario.cargoTempC}°C
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </Map>
            </APIProvider>

            {/* Floating Top Map Telemetry Bar */}
            <div className="absolute top-3 left-3 right-3 bg-neutral-950/90 border border-neutral-800 backdrop-blur-md rounded-lg p-3 text-xs font-mono flex flex-wrap items-center justify-between gap-2 shadow-lg z-10">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-white font-semibold">{currentCoords.label}</span>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-neutral-300">
                <span>
                  Speed: <strong className="text-cyan-400">{currentCoords.speedKmH} km/h</strong>
                </span>
                <span>
                  Lat: {currentCoords.lat.toFixed(4)} | Lng: {currentCoords.lng.toFixed(4)}
                </span>
              </div>
            </div>

            {/* Bottom Floating Map Controls */}
            <div className="absolute bottom-3 left-3 right-3 bg-neutral-950/90 border border-neutral-800 backdrop-blur-md rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono z-10">
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
                onClick={() =>
                  setContactActionStatus(`Encrypted VoIP bridge connected to ${scenario.courierName} (${scenario.courierId}).`)
                }
                className="py-2 px-3 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5 text-cyan-400" /> Call Courier
              </button>
              <button
                onClick={() =>
                  setContactActionStatus(`Dispatch instruction transmitted to ${scenario.courierName}'s terminal.`)
                }
                className="py-2 px-3 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-cyan-400" /> Send Note
              </button>
            </div>

            {contactActionStatus && (
              <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/40 text-cyan-200 text-[11px] font-mono flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  {contactActionStatus}
                </span>
                <button
                  onClick={() => setContactActionStatus(null)}
                  className="text-cyan-400 hover:text-white cursor-pointer"
                >
                  ×
                </button>
              </div>
            )}
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
