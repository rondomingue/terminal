import { useState, useEffect, useCallback } from "react"; // useCallback kept for handleSelect
import { motion, AnimatePresence } from "motion/react";
import Map, { Marker, Popup, NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

const MAPBOX_TOKEN = "pk.eyJ1Ijoicm9uZG9taW5ndWUiLCJhIjoiYTM4ODdRdyJ9.jcyNgQQolgrKfs6SKBXNJw";

const C = {
  surface:      "rgba(13,11,7,0.88)",
  surfaceHi:    "rgba(22,18,9,0.96)",
  primary:      "#967820",
  primaryDim:   "#5e4c14",
  primaryBright:"#b08f28",
  orange:       "#7a4812",
  alert:        "#722018",
  text:         "#a08850",
  textDim:      "#50421e",
  textBright:   "#c0a055",
  border:       "rgba(110,90,35,0.18)",
  borderHi:     "rgba(140,115,45,0.38)",
  gridMajor:    "rgba(105,88,38,0.18)",
  gridMinor:    "rgba(80,66,28,0.09)",
};

// Each shipment has a real geographic position — mix of port and at-sea positions
const SHIPMENTS = [
  // Port / loading
  { id: "DXB_4471", label: "SHIPMENT DXB-4471", route: "DUBAI → RIYADH",         bars: [82, 51, 68], status: "IN TRANSIT", color: "#967820", lng: 55.80, lat: 24.95 },
  { id: "RUH_2209", label: "SHIPMENT RUH-2209", route: "RIYADH → KUWAIT",         bars: [44, 77, 39], status: "LOADING",    color: "#967820", lng: 47.10, lat: 26.90 },
  { id: "DOH_1173", label: "SHIPMENT DOH-1173", route: "DOHA → ABU DHABI",        bars: [37, 85, 52], status: "IN TRANSIT", color: "#967820", lng: 51.60, lat: 25.15 },
  { id: "KWI_6640", label: "SHIPMENT KWI-6640", route: "KUWAIT → BAHRAIN",        bars: [70, 42, 88], status: "DELAYED",    color: "#722018", lng: 48.30, lat: 28.80 },
  // At sea — Persian Gulf
  { id: "PGF_3310", label: "VESSEL PGF-3310",   route: "KWI → DXB (GULF)",       bars: [68, 72, 55], status: "IN TRANSIT", color: "#967820", lng: 51.20, lat: 26.40 },
  { id: "PGF_5582", label: "VESSEL PGF-5582",   route: "BAH → MCT (GULF)",       bars: [55, 48, 80], status: "IN TRANSIT", color: "#7a4812", lng: 53.40, lat: 25.80 },
  // At sea — Strait of Hormuz
  { id: "HRM_0019", label: "TANKER HRM-0019",   route: "MCT → DXB (HORMUZ)",     bars: [91, 30, 62], status: "IN TRANSIT", color: "#7a4812", lng: 56.40, lat: 26.55 },
  // At sea — Gulf of Oman
  { id: "GOO_7741", label: "VESSEL GOO-7741",   route: "MCT → MUMBAI (OMAN SEA)", bars: [44, 88, 37], status: "IN TRANSIT", color: "#967820", lng: 58.80, lat: 23.60 },
  { id: "MCT_0835", label: "SHIPMENT MCT-0835", route: "MUSCAT → DOHA",           bars: [91, 23, 74], status: "LOADING",    color: "#967820", lng: 58.20, lat: 22.80 },
  // At sea — Arabian Sea
  { id: "ARB_2204", label: "FREIGHTER ARB-2204", route: "DXB → MUMBAI (ARAB SEA)", bars: [62, 55, 88], status: "IN TRANSIT", color: "#967820", lng: 62.50, lat: 21.20 },
  { id: "ARB_9901", label: "TANKER ARB-9901",   route: "RUH → KARACHI (ARAB SEA)", bars: [77, 40, 50], status: "DELAYED",    color: "#722018", lng: 60.80, lat: 19.50 },
  // At sea — Red Sea
  { id: "RED_1147", label: "VESSEL RED-1147",   route: "SUEZ → DXB (RED SEA)",   bars: [30, 85, 44], status: "IN TRANSIT", color: "#967820", lng: 37.80, lat: 22.40 },
  { id: "RED_4422", label: "TANKER RED-4422",   route: "DXB → SUEZ (RED SEA)",   bars: [58, 67, 71], status: "IN TRANSIT", color: "#7a4812", lng: 40.20, lat: 18.60 },
];

const ROUTE_LIST = [
  { corridor: "DXB → RUH → KWI", dist: "1,842 km", ships: 3, status: "ACTIVE",  freq: "DAILY"     },
  { corridor: "MCT → DOH → AUH", dist: "  612 km",  ships: 2, status: "ACTIVE",  freq: "WEEKLY"    },
  { corridor: "BAH → DXB → MCT", dist: "1,103 km",  ships: 4, status: "ACTIVE",  freq: "DAILY"     },
  { corridor: "AUH → RUH → DOH", dist: "1,290 km",  ships: 1, status: "STANDBY", freq: "ON-DEMAND" },
];

const ASSET_LIST = [
  { id: "VESSEL_MV-01",  type: "BULK CARRIER",   cap: "82,000 DWT",  loc: "25.2°N 55.3°E", status: "EN ROUTE" },
  { id: "VESSEL_MV-04",  type: "CONTAINER SHIP", cap: "14,000 TEU",  loc: "24.5°N 54.4°E", status: "LOADING"  },
  { id: "FREIGHTER_F9",  type: "GENERAL CARGO",  cap: "18,500 DWT",  loc: "26.2°N 50.5°E", status: "EN ROUTE" },
  { id: "TANKER_T3",     type: "CRUDE TANKER",   cap: "115,000 DWT", loc: "23.6°N 58.6°E", status: "STANDBY"  },
  { id: "FREIGHTER_F14", type: "REEFER CARGO",   cap: "9,200 DWT",   loc: "25.8°N 56.1°E", status: "EN ROUTE" },
];

function usePulse(ms = 2000) {
  const [t, setT] = useState(0);
  useEffect(() => { const id = setInterval(() => setT(n => n + 1), ms); return () => clearInterval(id); }, [ms]);
  return t;
}

function useCounter(target: number, speed = 40) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let cur = 0;
    const step = target / speed;
    const id = setInterval(() => {
      cur = Math.min(cur + step, target);
      setVal(Math.round(cur));
      if (cur >= target) clearInterval(id);
    }, 20);
    return () => clearInterval(id);
  }, [target, speed]);
  return val;
}

// Blinking square marker rendered inside Mapbox
function ShipMarker({ ship, selected, onClick }: {
  ship: typeof SHIPMENTS[0]; selected: boolean; onClick: () => void;
}) {
  const pulse  = usePulse(1200);
  const active = selected || pulse % 4 === SHIPMENTS.indexOf(ship) % 4;
  const col = ship.color;
  const delayed = ship.status === "DELAYED";

  return (
    <div onClick={onClick} style={{ cursor: "pointer", position: "relative" }}>
      {/* Pulse ring */}
      {selected && (
        <div style={{
          position: "absolute",
          inset: "-8px",
          border: `1px solid ${col}`,
          borderRadius: "50%",
          opacity: 0.4,
          animation: "ping 1.6s ease-out infinite",
        }} />
      )}
      {/* Main square node */}
      <div style={{
        width: selected ? 10 : 7,
        height: selected ? 10 : 7,
        backgroundColor: active ? `${col}88` : `${col}22`,
        border: `${active ? 1.5 : 0.8}px solid ${delayed ? "#722018" : (active ? col : C.primaryDim)}`,
        transform: "rotate(45deg)",
        boxShadow: selected ? `0 0 10px 3px ${col}55` : active ? `0 0 4px 1px ${col}33` : "none",
        transition: "all 0.2s ease",
      }} />
    </div>
  );
}

function RadarReticle({ cx, cy, radii, pulse, uid }: {
  cx: number; cy: number; radii: number[]; pulse: number; uid: string;
}) {
  const breathe = 0.5 + 0.5 * Math.sin(pulse * 0.6);
  const innerR  = radii[0];
  const outerR  = radii[radii.length - 1];

  function arcDash(r: number, arcFrac = 0.65) {
    const circ = 2 * Math.PI * r;
    const arc  = (circ / 4) * arcFrac;
    const gap  = (circ / 4) * (1 - arcFrac);
    return `${arc.toFixed(1)} ${gap.toFixed(1)}`;
  }
  function arcOffset(r: number, arcFrac = 0.65) {
    const circ = 2 * Math.PI * r;
    return ((circ / 4) * arcFrac * 0.5).toFixed(1);
  }

  return (
    <g>
      <defs>
        <filter id={`glow-${uid}`} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id={`rfill-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={`rgba(160,128,38,${(0.07 + 0.04 * breathe).toFixed(2)})`} />
          <stop offset="55%"  stopColor="rgba(110,88,28,0.02)" />
          <stop offset="100%" stopColor="rgba(80,65,20,0)" />
        </radialGradient>
      </defs>

      <circle cx={`${cx}%`} cy={`${cy}%`} r={outerR} fill={`url(#rfill-${uid})`} />

      {/* Outer arc-segment rings — slowly spinning */}
      <g style={{
        transformBox: "fill-box" as React.CSSProperties["transformBox"],
        transformOrigin: "center",
        animation: "reticle-spin 28s linear infinite",
      }}>
        {radii.slice(1).map((r, i) => {
          const isOuter = i === radii.length - 2;
          const op = (isOuter ? 0.08 : 0.14) + 0.04 * breathe;
          return (
            <circle key={r}
              cx={`${cx}%`} cy={`${cy}%`} r={r}
              fill="none"
              stroke={`rgba(168,136,48,${op.toFixed(2)})`}
              strokeWidth={isOuter ? 0.5 : 0.75}
              strokeDasharray={arcDash(r, 0.62)}
              strokeDashoffset={`-${arcOffset(r, 0.62)}`}
            />
          );
        })}
      </g>

      <circle
        cx={`${cx}%`} cy={`${cy}%`} r={innerR}
        fill="none"
        stroke={`rgba(190,155,52,${(0.28 + 0.14 * breathe).toFixed(2)})`}
        strokeWidth="0.75"
        filter={`url(#glow-${uid})`}
      />

      <circle
        cx={`${cx}%`} cy={`${cy}%`} r={innerR * 0.72}
        fill="none"
        stroke={`rgba(200,164,56,${(0.16 + 0.09 * breathe).toFixed(2)})`}
        strokeWidth="0.5"
      />

      {/* X crosshair — 4 diagonal arms, thin + transparent, no end caps */}
      {[45, 135, 225, 315].map(deg => {
        const a  = (deg * Math.PI) / 180;
        const bx = Math.cos(a), by = Math.sin(a);
        const tx = -Math.sin(a), ty = Math.cos(a);
        const op   = (0.22 + 0.10 * breathe).toFixed(2);
        const opLo = (0.10 + 0.05 * breathe).toFixed(2);

        const endR = outerR + 22;

        const px = (n: number) => `calc(${cx}% + ${n.toFixed(2)}px)`;
        const py = (n: number) => `calc(${cy}% + ${n.toFixed(2)}px)`;

        // Three broken segments — large gap at center, smaller gap at inner ring
        const segments = [
          { s: 8,              e: innerR * 0.80, dim: true  },  // inner arm (dim, dotted feel)
          { s: innerR * 1.12,  e: innerR * 1.55, dim: false },  // mid segment
          { s: innerR * 1.72,  e: endR,          dim: false },  // outer arm
        ];

        // Ticks at graduated intervals — 7 total, alternating short/tall
        const ticks = [
          { r: innerR * 0.42, hw: 1.4 },
          { r: innerR * 0.68, hw: 2.2 },
          { r: innerR * 0.90, hw: 1.4 },
          { r: innerR * 1.32, hw: 2.8 },
          { r: innerR * 1.62, hw: 1.6 },
          { r: outerR * 0.78, hw: 3.0 },
          { r: outerR * 0.95, hw: 1.6 },
        ];

        return (
          <g key={deg}>
            {segments.map(({ s, e, dim }, i) => (
              <line key={i}
                    x1={px(s * bx)} y1={py(s * by)}
                    x2={px(e * bx)} y2={py(e * by)}
                    stroke={`rgba(192,158,52,${dim ? opLo : op})`}
                    strokeWidth={dim ? "0.4" : "0.5"} />
            ))}
            {ticks.map(({ r, hw }, i) => (
              <line key={`t${i}`}
                    x1={px(r * bx + hw * tx)} y1={py(r * by + hw * ty)}
                    x2={px(r * bx - hw * tx)} y2={py(r * by - hw * ty)}
                    stroke={`rgba(200,164,56,${i % 2 === 1 ? op : opLo})`}
                    strokeWidth={i % 2 === 1 ? "0.6" : "0.45"} />
            ))}
          </g>
        );
      })}

      <circle cx={`${cx}%`} cy={`${cy}%`} r="1.8"
        fill={`rgba(210,172,60,${(0.42 + 0.22 * breathe).toFixed(2)})`}
        filter={`url(#glow-${uid})`}
      />
    </g>
  );
}

function ScanLine({ pulse }: { pulse: number }) {
  const angle = (pulse * 18) % 360;
  const rad   = (angle * Math.PI) / 180;
  const cx = 62, cy = 36, len = 52; // cy matches reticle center
  return (
    <line
      x1={`${cx}%`} y1={`${cy}%`}
      x2={`${cx + len * Math.cos(rad)}%`}
      y2={`${cy + len * Math.sin(rad)}%`}
      stroke="rgba(176,143,40,0.22)"
      strokeWidth="1"
      strokeDasharray="1.5 5"
    />
  );
}

function ShipmentCard({ ship, selected, onClick }: { ship: typeof SHIPMENTS[0]; selected: boolean; onClick: () => void }) {
  const pulse   = usePulse(2800);
  const live    = 28 + (pulse % 6) * 4;
  const delayed = ship.status === "DELAYED";
  const accent  = ship.color;

  return (
    <motion.div onClick={onClick} whileHover={{ x: 2 }} className="relative cursor-pointer">
      <div className="absolute left-0 top-0 bottom-0 w-0.5 transition-colors duration-300"
        style={{ backgroundColor: selected ? accent : `${accent}55` }} />
      <div className="ml-2 p-3 border transition-all duration-200"
        style={{
          backgroundColor: selected ? C.surfaceHi : C.surface,
          borderColor: selected ? `${accent}60` : C.border,
          boxShadow: selected ? `0 0 12px 2px ${accent}22, inset 0 0 18px 0px ${accent}0e` : "none",
        }}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-[10px] font-bold tracking-widest" style={{ color: selected ? C.textBright : C.text }}>{ship.label}</div>
            <div className="text-[8px] tracking-wider mt-0.5" style={{ color: C.textDim }}>{ship.route}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold" style={{ color: accent }}>{delayed ? "HOLD" : `${live}T`}</div>
            <div className="text-[7px] mt-0.5" style={{ color: `${accent}99` }}>{ship.status}</div>
          </div>
        </div>
        <div className="space-y-1.5 mb-2">
          {([["LOAD", ship.bars[0], C.alert], ["FUEL", ship.bars[1], accent], ["ETA", ship.bars[2], C.orange]] as [string, number, string][]).map(([lbl, val, col]) => (
            <div key={lbl} className="flex items-center gap-2">
              <span className="text-[7px] w-9 shrink-0" style={{ color: C.textDim }}>{lbl}</span>
              <div className="flex-1 h-1.5 overflow-hidden rounded-sm" style={{ backgroundColor: "rgba(80,70,30,0.18)" }}>
                <div className="h-full rounded-sm transition-all duration-1000" style={{ width: `${val}%`, backgroundColor: col }} />
              </div>
              <span className="text-[7px] w-6 text-right" style={{ color: col }}>{val}%</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between pt-1.5 border-t" style={{ borderColor: C.border }}>
          <span className="text-[7px]" style={{ color: C.textDim }}>ID: {ship.id}</span>
          <span className="text-[7px]" style={{ color: C.textDim }}>{live * 18} km/h</span>
        </div>
      </div>
    </motion.div>
  );
}

import React from "react";

const COUNTRY_LABELS = [
  { lng: 45.0,  lat: 24.0,  en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
  { lng: 54.5,  lat: 23.5,  en: "UAE",           ar: "الإمارات"                 },
  { lng: 57.0,  lat: 21.0,  en: "Oman",          ar: "عُمان"                    },
  { lng: 47.5,  lat: 16.0,  en: "Yemen",         ar: "اليمن"                    },
  { lng: 43.5,  lat: 33.2,  en: "Iraq",          ar: "العراق"                   },
  { lng: 53.5,  lat: 32.5,  en: "Iran",          ar: "إيران"                    },
  { lng: 51.2,  lat: 25.3,  en: "Qatar",         ar: "قطر"                      },
  { lng: 36.5,  lat: 31.0,  en: "Jordan",        ar: "الأردن"                   },
  { lng: 38.5,  lat: 35.0,  en: "Syria",         ar: "سوريا"                    },
  { lng: 29.0,  lat: 26.5,  en: "Egypt",         ar: "مصر"                      },
  { lng: 30.0,  lat: 15.5,  en: "Sudan",         ar: "السودان"                  },
  { lng: 68.0,  lat: 30.0,  en: "Pakistan",      ar: "باكستان"                  },
  { lng: 67.5,  lat: 33.5,  en: "Afghanistan",   ar: "أفغانستان"                },
  { lng: 35.5,  lat: 33.9,  en: "Lebanon",       ar: "لبنان"                    },
  { lng: 39.5,  lat: 15.5,  en: "Eritrea",       ar: "إريتريا"                  },
];

function CountryLabel({ ar }: { en: string; ar: string }) {
  return (
    <div style={{ pointerEvents: "none", transform: "translate(-50%, -50%)", textAlign: "center" }}>
      <div style={{ color: "#8a6828", fontSize: "16px", fontFamily: "Georgia, 'Times New Roman', serif", lineHeight: 1.1, direction: "rtl", opacity: 0.72 }}>
        {ar}
      </div>
    </div>
  );
}

const CITY_LABELS = [
  { lng: 55.296, lat: 25.276, en: "Dubai",       ar: "دبي"                      },
  { lng: 54.367, lat: 24.467, en: "Abu Dhabi",   ar: "أبو ظبي"                  },
  { lng: 46.738, lat: 24.774, en: "Riyadh",      ar: "الرياض"                   },
  { lng: 47.978, lat: 29.369, en: "Kuwait City", ar: "مدينة الكويت"             },
  { lng: 51.531, lat: 25.286, en: "Doha",        ar: "الدوحة"                   },
  { lng: 58.594, lat: 23.613, en: "Muscat",      ar: "مسقط"                     },
  { lng: 50.558, lat: 26.215, en: "Manama",      ar: "المنامة"                  },
  { lng: 39.192, lat: 21.543, en: "Jeddah",      ar: "جدة"                      },
  { lng: 50.103, lat: 26.392, en: "Dammam",      ar: "الدمام"                   },
  { lng: 44.366, lat: 33.339, en: "Baghdad",     ar: "بغداد"                    },
  { lng: 44.191, lat: 15.348, en: "Sana'a",      ar: "صنعاء"                    },
  { lng: 51.388, lat: 35.694, en: "Tehran",      ar: "طهران"                    },
  { lng: 36.292, lat: 33.510, en: "Damascus",    ar: "دمشق"                     },
  { lng: 35.901, lat: 31.903, en: "Amman",       ar: "عمّان"                    },
  { lng: 45.036, lat: 12.779, en: "Aden",        ar: "عدن"                      },
];

function CityLabel({ ar }: { en: string; ar: string }) {
  return (
    <div style={{ pointerEvents: "none", display: "flex", flexDirection: "column", alignItems: "center", transform: "translate(-50%, -100%)", marginBottom: 3 }}>
      <div style={{ background: "rgba(5,4,2,0.55)", padding: "1px 5px 2px", backdropFilter: "blur(3px)", textAlign: "center" }}>
        <div style={{ color: "#7a6030", fontSize: "13px", fontFamily: "Georgia, 'Times New Roman', serif", lineHeight: 1.2, direction: "rtl", whiteSpace: "nowrap" }}>
          {ar}
        </div>
      </div>
      <div style={{ width: 3, height: 3, borderRadius: "50%", background: "#967820", marginTop: 2, opacity: 0.7 }} />
    </div>
  );
}

const MapLayer = React.memo(function MapLayer({ selected, popup, onSelect, onPopupClose }: {
  selected: string; popup: string | null; onSelect: (id: string) => void; onPopupClose: () => void;
}) {
  const popupShip = SHIPMENTS.find(s => s.id === popup);
  return (
    <div className="absolute inset-0 z-0">
      <Map
        initialViewState={{ longitude: 50, latitude: 23.5, zoom: 4.2 }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
      >
        {/* Country labels */}
        {COUNTRY_LABELS.map((c) => (
          <Marker key={c.en} longitude={c.lng} latitude={c.lat} anchor="center">
            <CountryLabel en={c.en} ar={c.ar} />
          </Marker>
        ))}

        {/* Bilingual city labels */}
        {CITY_LABELS.map((city) => (
          <Marker key={city.en} longitude={city.lng} latitude={city.lat} anchor="bottom">
            <CityLabel en={city.en} ar={city.ar} />
          </Marker>
        ))}

        {/* Ship markers */}
        {SHIPMENTS.map((ship) => (
          <Marker key={ship.id} longitude={ship.lng} latitude={ship.lat} anchor="center">
            <ShipMarker ship={ship} selected={selected === ship.id} onClick={() => onSelect(ship.id)} />
          </Marker>
        ))}

        {popup && popupShip && (
          <Popup
            longitude={popupShip.lng}
            latitude={popupShip.lat}
            anchor="bottom"
            offset={14}
            closeOnClick={false}
            onClose={onPopupClose}
            style={{ zIndex: 50 }}
          >
            <div style={{ background: "rgba(10,9,5,0.96)", border: `1px solid ${C.borderHi}`, padding: "8px 10px", fontFamily: "carbon, monospace", minWidth: "160px" }}>
              <div style={{ color: C.textDim, fontSize: "7px", letterSpacing: "0.15em", marginBottom: "3px" }}>SHIPMENT NODE</div>
              <div style={{ color: C.primaryBright, fontSize: "10px", fontWeight: "bold", letterSpacing: "0.1em", marginBottom: "2px" }}>{popupShip.id}</div>
              <div style={{ color: C.text, fontSize: "8px", letterSpacing: "0.05em", marginBottom: "5px" }}>{popupShip.route}</div>
              <div style={{ display: "inline-block", color: popupShip.status === "DELAYED" ? C.alert : C.primary, border: `1px solid ${popupShip.status === "DELAYED" ? C.alert + "60" : C.borderHi}`, fontSize: "7px", padding: "1px 5px", letterSpacing: "0.12em", backgroundColor: "rgba(80,70,30,0.10)" }}>
                {popupShip.status}
              </div>
              <div style={{ marginTop: "5px", color: C.textDim, fontSize: "7px" }}>
                {popupShip.lat.toFixed(2)}°N {popupShip.lng.toFixed(2)}°E
              </div>
            </div>
          </Popup>
        )}

        <NavigationControl position="bottom-right" showCompass={true} />
      </Map>

      <div className="absolute inset-0 pointer-events-none" style={{ background: "rgba(30,16,3,0.48)" }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 85% 85% at 62% 50%, transparent 25%, rgba(5,4,2,0.55) 100%)" }} />
    </div>
  );
});

export default function App() {
  const [selected, setSelected] = useState("DXB_4471");
  const [tab, setTab]           = useState<"SHIPMENTS" | "ROUTES" | "ASSETS">("SHIPMENTS");
  const [popup, setPopup]       = useState<string | null>(null);
  const pulse    = usePulse(1200);
  const manifest = useCounter(2841, 60);
  const blinkOn  = pulse % 2 === 0;
  const activeShip = SHIPMENTS.find(s => s.id === selected);

  const handleSelect = useCallback((id: string) => {
    setSelected(id);
    setPopup(id);
  }, []);



  return (
    <div className="relative size-full overflow-hidden select-none"
      style={{ background: "#07060a", fontFamily: "carbon, monospace" }}>

      {/* Pulse ring animation + popup style overrides */}
      <style>{`
        @keyframes ping {
          0%   { transform: scale(1);   opacity: 0.5; }
          100% { transform: scale(2.4); opacity: 0;   }
        }
        @keyframes reticle-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .maplibregl-ctrl-logo { display: none !important; }
        .maplibregl-ctrl-attrib { display: none !important; }
        .maplibregl-popup-content {
          background: transparent !important;
          padding: 0 !important;
          box-shadow: none !important;
          border: none !important;
        }
        .maplibregl-popup-tip { display: none !important; }
        .maplibregl-popup-close-button {
          color: #50421e !important;
          font-size: 13px !important;
          right: 4px !important;
          top: 2px !important;
          background: transparent !important;
          line-height: 1 !important;
        }
        .maplibregl-popup-close-button:hover { color: #967820 !important; }
        .maplibregl-ctrl-group {
          background: rgba(13,11,7,0.88) !important;
          border: 1px solid rgba(110,90,35,0.30) !important;
          box-shadow: none !important;
        }
        .maplibregl-ctrl-group button {
          background: transparent !important;
          color: #967820 !important;
        }
        .maplibregl-ctrl-group button + button { border-top: 1px solid rgba(110,90,35,0.25) !important; }
        .maplibregl-ctrl-icon { filter: invert(60%) sepia(40%) saturate(400%) hue-rotate(10deg) !important; }
      `}</style>

      {/* ── MAP (memoized — only re-renders on selection change, not on pulse) ── */}
      <MapLayer selected={selected} popup={popup} onSelect={handleSelect} onPopupClose={() => setPopup(null)} />

      {/* Tactical grid overlay */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-[2]">
        <defs>
          <pattern id="micro" width="4" height="4" patternUnits="userSpaceOnUse">
            <polyline points="4,0 0,0 0,4" fill="none" stroke="rgba(90,72,28,0.07)" strokeWidth="0.4" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#micro)" />
      </svg>
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-[2]">
        <defs>
          <pattern id="minor" width="12" height="12" patternUnits="userSpaceOnUse">
            <polyline points="12,0 0,0 0,12" fill="none" stroke={C.gridMinor} strokeWidth="0.5" />
          </pattern>
          <pattern id="major" width="60" height="60" patternUnits="userSpaceOnUse">
            <rect width="60" height="60" fill="url(#minor)" />
            <polyline points="60,0 0,0 0,60" fill="none" stroke={C.gridMajor} strokeWidth="0.9" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#major)" />
      </svg>

      {/* Reticles + scan line (HUD overlay, non-interactive) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-[3]">
        <RadarReticle cx={62} cy={36} radii={[32, 55, 80]} pulse={pulse} uid="a" />
        <ScanLine pulse={pulse} />
        <line x1="0%" y1="50%" x2="100%" y2="50%" stroke={C.gridMinor} strokeWidth="0.4" />
        <line x1="47%" y1="0%" x2="47%" y2="100%" stroke={C.gridMinor} strokeWidth="0.4" />
      </svg>

      {/* Noise grain */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-[5]" style={{ opacity: 0.07 }}>
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noise)" />
      </svg>

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none z-10"
        style={{ background: "radial-gradient(ellipse at center, transparent 38%, rgba(4,3,2,0.65) 100%)" }} />

      {/* Dashed vertical accent */}
      <div className="absolute top-0 bottom-0 w-px z-10"
        style={{ left: "6.5%", background: `repeating-linear-gradient(to bottom, ${C.primary} 0px, ${C.primary} 6px, transparent 6px, transparent 14px)`, opacity: 0.4 }} />

      {/* ── HEADER ── */}
      <div className="relative z-20 flex items-center justify-between px-4 py-2 border-b"
        style={{ borderColor: C.border, backgroundColor: "rgba(7,6,4,0.94)" }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rotate-45" style={{ backgroundColor: C.primary, boxShadow: `0 0 6px ${C.primary}` }} />
          <div>
            <div className="text-[11px] font-bold tracking-[0.28em]" style={{ color: C.textBright }}>CARGO MERIDIAN // MIDDLE EAST</div>
            <div className="text-[8px] tracking-widest" style={{ color: C.textDim }}>ACTIVE NETWORK · SECTOR ME-7749 · {blinkOn ? "■" : "□"} LIVE FEED</div>
          </div>
        </div>
        <div className="text-center">
          <div className="text-[10px] font-bold tracking-[0.3em]" style={{ color: C.primaryBright }}>NEXUS-KP</div>
          <div className="text-[8px] tracking-wider" style={{ color: C.textDim }}>{blinkOn ? "■" : "□"} ME_FREIGHT_PRG.LFT</div>
        </div>
        <div className="text-right">
          <div className="text-[9px] font-bold tracking-widest" style={{ color: C.primaryBright }}>GRID XR-0429B</div>
          <div className="text-[8px] tracking-wider" style={{ color: C.textDim }}>Manifest #{manifest}</div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="relative z-20 flex h-[calc(100%-40px)]" style={{ pointerEvents: "none" }}>

        {/* Row markers */}
        <div className="flex flex-col items-center w-6 py-3 gap-4 border-r" style={{ borderColor: C.border, pointerEvents: "auto" }}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="text-[7px]" style={{ writingMode: "vertical-rl", color: C.textDim }}>{(i + 1).toString().padStart(2, "0")}</div>
          ))}
          <div className="mt-auto mb-2 w-2 h-2 rotate-45" style={{ backgroundColor: C.primary, boxShadow: `0 0 6px ${C.primary}` }} />
        </div>

        {/* ── LEFT PANEL ── */}
        <div className="relative flex flex-col border-r" style={{ width: "380px", minWidth: "380px", borderColor: C.border, backgroundColor: "rgba(7,6,4,0.70)", pointerEvents: "auto" }}>

          {/* Panel noise */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" style={{ opacity: 0.09 }}>
            <filter id="panel-noise">
              <feTurbulence type="fractalNoise" baseFrequency="0.68" numOctaves="4" stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#panel-noise)" />
          </svg>

          <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: C.border }}>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rotate-45" style={{ backgroundColor: C.primary }} />
              <div>
                <div className="text-[9px] font-bold tracking-widest" style={{ color: C.primaryBright }}>
                  {activeShip ? `${activeShip.lat.toFixed(4)}°N` : "25.1234°N"}
                </div>
                <div className="text-[9px] font-bold tracking-widest" style={{ color: C.primary }}>
                  {activeShip ? `${activeShip.lng.toFixed(4)}°E` : "55.1234°E"}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[7px] tracking-widest" style={{ color: C.textDim }}>ME-REGION</div>
              <div className="text-[7px] tracking-widest" style={{ color: C.textDim }}>GULF ANCHOR</div>
            </div>
          </div>

          <div className="flex border-b" style={{ borderColor: C.border }}>
            {(["SHIPMENTS", "ROUTES", "ASSETS"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className="flex-1 py-1.5 text-[8px] tracking-widest transition-all"
                style={{ color: tab === t ? C.primaryBright : C.textDim, borderBottom: tab === t ? `1px solid ${C.primary}` : "1px solid transparent", backgroundColor: "transparent" }}>
                {t}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1.5" style={{ scrollbarWidth: "none" }}>
            <AnimatePresence mode="wait">
              {tab === "SHIPMENTS" && (
                <motion.div key="ships" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1.5">
                  {SHIPMENTS.map((ship, i) => (
                    <motion.div key={ship.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                      <ShipmentCard ship={ship} selected={selected === ship.id} onClick={() => handleSelect(ship.id)} />
                    </motion.div>
                  ))}
                </motion.div>
              )}
              {tab === "ROUTES" && (
                <motion.div key="routes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1.5">
                  {ROUTE_LIST.map(r => (
                    <div key={r.corridor} className="p-3 border" style={{ borderColor: C.border, backgroundColor: C.surface }}>
                      <div className="font-bold text-[10px] tracking-wider mb-1" style={{ color: C.primaryBright }}>{r.corridor}</div>
                      <div className="flex justify-between mb-2">
                        <span className="text-[7px]" style={{ color: C.textDim }}>DIST: {r.dist}</span>
                        <span className="text-[7px]" style={{ color: r.status === "ACTIVE" ? C.primary : C.textDim }}>{r.status}</span>
                      </div>
                      <div className="flex justify-between pt-1.5 border-t" style={{ borderColor: C.border }}>
                        <span className="text-[7px]" style={{ color: C.textDim }}>{r.ships} SHIPMENTS</span>
                        <span className="text-[7px]" style={{ color: C.textDim }}>{r.freq}</span>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
              {tab === "ASSETS" && (
                <motion.div key="assets" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1.5">
                  {ASSET_LIST.map(a => (
                    <div key={a.id} className="p-3 border" style={{ borderColor: C.border, backgroundColor: C.surface }}>
                      <div className="flex justify-between mb-1">
                        <div className="font-bold text-[10px] tracking-wider" style={{ color: C.primaryBright }}>{a.id}</div>
                        <div className="text-[7px] font-bold" style={{ color: a.status === "STANDBY" ? C.textDim : C.primary }}>{a.status}</div>
                      </div>
                      <div className="text-[8px] mb-2" style={{ color: C.textDim }}>{a.type} · {a.cap}</div>
                      <div className="pt-1.5 border-t" style={{ borderColor: C.border }}>
                        <span className="text-[7px]" style={{ color: C.textDim }}>POS: {a.loc}</span>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="px-3 py-2 border-t text-[8px] tracking-widest flex justify-between" style={{ borderColor: C.border, color: C.textDim }}>
            <span>{blinkOn ? "■" : "□"} SYNC ACTIVE</span>
            <span style={{ color: C.primary }}>{SHIPMENTS.filter(s => s.status !== "DELAYED").length} ACTIVE · {SHIPMENTS.filter(s => s.status === "DELAYED").length} HOLD</span>
          </div>
        </div>

        {/* ── RIGHT: map canvas area — corner brackets + lat labels as HUD ── */}
        <div className="relative flex-1 overflow-hidden" style={{ pointerEvents: "none" }}>
          {/* Corner brackets */}
          {(["top-2 left-2 border-t border-l","top-2 right-2 border-t border-r","bottom-6 left-2 border-b border-l","bottom-6 right-2 border-b border-r"]).map((cls, i) => (
            <div key={i} className={`absolute w-4 h-4 ${cls}`} style={{ borderColor: `${C.primary}50` }} />
          ))}

          {/* Lat ticks */}
          <div className="absolute bottom-3 left-0 right-0 flex justify-around px-4">
            {["23.4241°N","24.4539°N","25.2048°N","26.0661°N","26.8206°N"].map((v, i) => (
              <span key={i} className="text-[7px]" style={{ color: C.textDim, fontFamily: "carbon, monospace" }}>{v}</span>
            ))}
          </div>

          {/* Active shipment readout */}
          {activeShip && (
            <motion.div key={activeShip.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-10 left-4 border p-3"
              style={{ backgroundColor: "rgba(10,9,5,0.94)", borderColor: C.borderHi, minWidth: "180px" }}>
              <div className="text-[8px] tracking-widest mb-1" style={{ color: C.textDim }}>ACTIVE SHIPMENT</div>
              <div className="text-[11px] font-bold tracking-wider mb-0.5" style={{ color: C.primaryBright }}>{activeShip.id}</div>
              <div className="text-[8px] tracking-wider mb-2" style={{ color: C.text }}>{activeShip.route}</div>
              <div className="text-[8px] font-bold tracking-widest px-1.5 py-0.5 inline-block border"
                style={{ color: activeShip.status === "DELAYED" ? C.alert : C.primary, borderColor: activeShip.status === "DELAYED" ? `${C.alert}60` : C.borderHi, backgroundColor: "rgba(80,70,30,0.08)" }}>
                {activeShip.status}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* CRT scanline */}
      <div className="absolute inset-0 pointer-events-none z-30"
        style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.02) 2px, rgba(0,0,0,0.02) 4px)" }} />
    </div>
  );
}
