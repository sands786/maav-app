import { useState, useEffect, useRef, useId } from "react";
import * as THREE from "three";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Zap, Cpu, Fingerprint, Pencil, Settings2, Sparkles } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';

// ── Fonts & Global Styles ──────────────────────────────────────────────────
const FontLink = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg0: #02040a;
      --bg1: rgba(6,10,20,0.85);
      --bg2: rgba(10,16,32,0.80);
      --bg3: rgba(16,24,48,0.85);
      --border: rgba(99,120,200,0.15);
      --purple: #8b5cf6;
      --blue: #3b82f6;
      --teal: #10b981;
      --amber: #f59e0b;
      --red: #ef4444;
      --text0: #f8fafc;
      --text1: #cbd5e1;
      --text2: #64748b;
      --mono: 'Space Mono', monospace;
      --sans: 'DM Sans', sans-serif;
      --glow-purple: 0 0 24px rgba(139,92,246,0.25);
    }
    html, body { height: 100%; background: var(--bg0); }
    body { color: var(--text0); font-family: var(--sans); -webkit-font-smoothing: antialiased; overflow-x: hidden; }
    * { scrollbar-width: thin; scrollbar-color: rgba(99,120,200,0.2) transparent; }
    input, button, select { font-family: var(--sans); }
    @keyframes fadeUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
    @keyframes spin    { to{transform:rotate(360deg)} }
    @keyframes float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
    @keyframes ticker  { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
    @keyframes authIn  { from{opacity:0;transform:translateY(28px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
    .fade-up   { animation: fadeUp 0.45s ease both; }
    .fade-up-2 { animation: fadeUp 0.45s 0.08s ease both; }
    .fade-up-3 { animation: fadeUp 0.45s 0.16s ease both; }
    .fade-up-4 { animation: fadeUp 0.45s 0.24s ease both; }
    .auth-in   { animation: authIn 0.65s cubic-bezier(0.16,1,0.3,1) both; }
    .feature-grid { display: grid; grid-template-columns: repeat(3, 1fr); }
    @media (max-width: 768px) { .feature-grid { grid-template-columns: 1fr; } }
  `}</style>
);

// ── Mock data ──────────────────────────────────────────────────────────────
const PROTOCOLS = {
  Rivera:         { color: "#8b5cf6", apy: 18.4, tvl: "124M", risk: "medium" },
  "Merchant Moe": { color: "#3b82f6", apy: 22.1, tvl: "87M",  risk: "medium-high" },
  "Agni Finance": { color: "#10b981", apy: 14.7, tvl: "203M", risk: "low" },
};

const genHistory = (days=30, start=10000, drift=1.003) =>
  Array.from({length: days}, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - i));
    const val = start * Math.pow(drift, i) + (Math.random() - 0.4) * start * 0.01;
    return {
      date: date.toLocaleDateString("en", {month:"short", day:"numeric"}),
      value: Math.round(val)
    };
  });

const MOCK_VAULTS = [
  {
    id: 1,
    name: "Alpha Yield Maximizer",
    description: "Aggressive multi-protocol yield farming",
    riskLevel: "aggressive",
    investmentGoal: "yield",
    status: "active",
    totalValueUSD: 24830,
    initialDepositUSD: 20000,
    autoRebalanceEnabled: true,
    allocations: [
      {protocol:"Rivera", pct:40, apy:18.4},
      {protocol:"Merchant Moe", pct:45, apy:22.1},
      {protocol:"Agni Finance", pct:15, apy:14.7}
    ],
    history: genHistory(30, 20000, 1.004)
  },
  {
    id: 2,
    name: "Stable Growth Fund",
    description: "Conservative allocation for steady returns",
    riskLevel: "conservative",
    investmentGoal: "stability",
    status: "active",
    totalValueUSD: 52140,
    initialDepositUSD: 50000,
    autoRebalanceEnabled: false,
    allocations: [
      {protocol:"Rivera", pct:20, apy:18.4},
      {protocol:"Merchant Moe", pct:10, apy:22.1},
      {protocol:"Agni Finance", pct:70, apy:14.7}
    ],
    history: genHistory(30, 50000, 1.0015)
  },
];

const SENTIMENT = {
  score: 72,
  label: "Bullish",
  confidence: 84,
  summary: "Strong inflows to Mantle ecosystem. Rivera TVL up 18% WoW. MNT price momentum positive.",
  recommendation: "Increase exposure to higher-yield protocols."
};

const MOCK_RECS = [
  {
    id: 1,
    vaultId: 1,
    reason: "Merchant Moe APY spiked +3.2% due to new incentive program. Rebalancing towards higher yield while maintaining risk parameters.",
    current: [40, 45, 15],
    recommended: [25, 60, 15],
    projectedAPY: 20.8,
    status: "pending"
  },
  {
    id: 2,
    vaultId: 2,
    reason: "Market sentiment bullish. Moderate increase in Rivera exposure captures upside while Agni Finance anchors portfolio stability.",
    current: [20, 10, 70],
    recommended: [30, 15, 55],
    projectedAPY: 16.2,
    status: "pending"
  },
];

const TICKER_ITEMS = [
  "MNT $0.841 +4.2%",
  "ETH $3,241 +1.8%",
  "Rivera APY 18.4%",
  "Merchant Moe APY 22.1%",
  "Agni Finance APY 14.7%",
  "Total Mantle TVL $1.2B",
  "MAAV AUM $2.4M +12%"
];

// ── Three.js Shader Background ─────────────────────────────────────────────
const ShaderBackground = () => {
  const containerRef = useRef(null);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const vertexShader = `void main(){gl_Position=vec4(position,1.0);}`;
    const fragmentShader = `
      precision highp float;
      uniform vec2  resolution;
      uniform float time;
      void main(void){
        vec2 uv=(gl_FragCoord.xy*2.0-resolution.xy)/min(resolution.x,resolution.y);
        float t=time*0.05;
        float lw=0.002;
        vec3 color=vec3(0.0);
        for(int j=0;j<3;j++){
          for(int i=0;i<5;i++){
            color[j]+=lw*float(i*i)/abs(fract(t-0.01*float(j)+float(i)*0.01)*5.0-length(uv)+mod(uv.x+uv.y,0.2));
          }
        }
        gl_FragColor=vec4(color[0],color[1],color[2],1.0);
      }
    `;
    const camera = new THREE.Camera();
    camera.position.z = 1;
    const scene = new THREE.Scene();
    const geometry = new THREE.PlaneGeometry(2, 2);
    const uniforms = {
      time: { type: "f", value: 1.0 },
      resolution: { type: "v2", value: new THREE.Vector2() }
    };
    const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader });
    scene.add(new THREE.Mesh(geometry, material));
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    const resize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      uniforms.resolution.value.set(renderer.domElement.width, renderer.domElement.height);
    };
    resize();
    window.addEventListener("resize", resize);
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      uniforms.time.value += 0.05;
      renderer.render(scene, camera);
    };
    animate();
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, []);
  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed", inset: 0, zIndex: 0,
        pointerEvents: "none", opacity: 0.25, mixBlendMode: "screen"
      }}
    />
  );
};

const GlobalOverlay = () => (
  <div style={{
    position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",
    background: "radial-gradient(ellipse 120% 80% at 50% 0%,rgba(2,4,10,0.60) 0%,rgba(2,4,10,0.90) 100%)"
  }} />
);

// ── Feature Cards ──────────────────────────────────────────────────────────
function GridPattern({ width, height, x, y, squares, className, ...props }) {
  const patternId = useId();
  return (
    <svg aria-hidden="true" className={className} {...props}>
      <defs>
        <pattern id={patternId} width={width} height={height} patternUnits="userSpaceOnUse" x={x} y={y}>
          <path d={`M.5 ${height}V.5H${width}`} fill="none" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${patternId})`} />
      {squares && (
        <svg x={x} y={y} style={{overflow:"visible"}}>
          {squares.map(([sx, sy], index) => (
            <rect strokeWidth="0" key={index} width={width + 1} height={height + 1} x={sx * width} y={sy * height} />
          ))}
        </svg>
      )}
    </svg>
  );
}

function genRandomPattern(length = 5) {
  return Array.from({ length }, () => [
    Math.floor(Math.random() * 4) + 7,
    Math.floor(Math.random() * 6) + 1,
  ]);
}

function FeatureCard({ feature }) {
  const p = genRandomPattern();
  const Icon = feature.icon;
  return (
    <div style={{
      position: "relative", overflow: "hidden", padding: 24,
      transition: "background 0.3s",
      borderRight: "1px dashed rgba(100,116,139,0.3)",
      borderBottom: "1px dashed rgba(100,116,139,0.3)",
    }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      <div style={{
        pointerEvents: "none", position: "absolute", top: 0, left: "50%",
        marginLeft: -80, marginTop: -8, height: "100%", width: "100%",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to right, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
        }}>
          <GridPattern
            width={20} height={20} x="-12" y="4" squares={p}
            style={{
              fill: "rgba(255,255,255,0.04)",
              stroke: "rgba(255,255,255,0.15)",
              position: "absolute", inset: 0, height: "100%", width: "100%",
              mixBlendMode: "overlay",
            }}
          />
        </div>
      </div>
      <div style={{
        position: "relative", zIndex: 10, marginBottom: 16, display: "inline-flex",
        borderRadius: 8, padding: 10,
        background: "linear-gradient(135deg,rgba(139,92,246,0.2),rgba(59,130,246,0.1))",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.1)",
      }}>
        <Icon style={{color:"#a78bfa", width:20, height:20}} strokeWidth={1.5} />
      </div>
      <h3 style={{
        position: "relative", zIndex: 10, marginTop: 24, fontSize: 14,
        fontWeight: 600, letterSpacing: "-0.01em", color: "#f1f5f9",
      }}>{feature.title}</h3>
      <p style={{
        position: "relative", zIndex: 10, marginTop: 8, fontSize: 12,
        fontWeight: 300, lineHeight: 1.7, color: "#94a3b8",
      }}>{feature.description}</p>
    </div>
  );
}

const FeatureGridDemo = () => {
  const features = [
    { title: 'Lightning Fast', icon: Zap, description: 'Optimized performance with edge caching and minimal bundle size for instant load times.' },
    { title: 'Powerful Compute', icon: Cpu, description: 'Distributed computing infrastructure that scales automatically with your workload demands.' },
    { title: 'Enterprise Security', icon: Fingerprint, description: 'End-to-end encryption, SOC2 compliance, and advanced threat detection built-in.' },
    { title: 'Deep Customization', icon: Pencil, description: 'Fully customizable themes, components, and workflows to match your brand identity.' },
    { title: 'Granular Control', icon: Settings2, description: 'Fine-tuned access controls, audit logs, and resource management dashboards.' },
    { title: 'AI-Native', icon: Sparkles, description: 'Built-in AI assistants, smart autocomplete, and intelligent automation capabilities.' },
  ];

  return (
    <section style={{paddingTop: 48, paddingBottom: 48}}>
      <div style={{maxWidth: 960, margin: "0 auto", padding: "0 16px"}}>
        <div style={{textAlign: "center", marginBottom: 32, maxWidth: 600, margin: "0 auto 32px"}}>
          <h2 style={{fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em", color: "#f1f5f9"}}>
            Power. Speed. Control.
          </h2>
          <p style={{color: "#94a3b8", marginTop: 12, fontSize: 14, letterSpacing: "0.03em"}}>
            Everything you need to build fast, secure, and scalable applications.
          </p>
        </div>
        <div className="feature-grid" style={{
          border: "1px dashed rgba(100,116,139,0.3)",
          borderRadius: 12, overflow: "hidden",
          background: "rgba(15,23,42,0.3)",
        }}>
          {features.map((feature, i) => (
            <FeatureCard key={i} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
};

// ── UI Primitives ─────────────────────────────────────────────────────────
const Badge = ({label, color}) => (
  <span style={{
    background: color + "20", color, border: `1px solid ${color}40`,
    borderRadius: 6, padding: "3px 10px", fontSize: 11,
    fontFamily: "var(--mono)", letterSpacing: "0.05em", fontWeight: 500
  }}>{label}</span>
);

const StatCard = ({label, value, sub, accent, delay=0}) => (
  <div className="fade-up" style={{
    animationDelay: `${delay}s`,
    background: "linear-gradient(135deg,rgba(16,24,48,0.90),rgba(10,16,32,0.85))",
    backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
    border: `1px solid ${accent}30`, borderRadius: 12, padding: "20px 24px",
    flex: 1, minWidth: 160, position: "relative", overflow: "hidden",
    boxShadow: "0 4px 24px rgba(0,0,0,0.3)"
  }}>
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, height: 2,
      background: `linear-gradient(90deg,${accent}00,${accent},${accent}00)`
    }} />
    <div style={{
      fontSize: 11, color: "var(--text2)", fontFamily: "var(--mono)",
      textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8, fontWeight: 500
    }}>{label}</div>
    <div style={{fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text0)"}}>{value}</div>
    {sub && <div style={{fontSize: 12, color: accent, marginTop: 4, fontWeight: 500}}>{sub}</div>}
  </div>
);

const Card = ({children, style, glow, className}) => (
  <div className={className} style={{
    background: "linear-gradient(145deg,rgba(16,24,48,0.85),rgba(8,14,28,0.90))",
    backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
    border: "1px solid rgba(99,120,200,0.12)", borderRadius: 14, padding: 24,
    boxShadow: glow
      ? "0 0 0 1px rgba(139,92,246,0.15) inset,0 8px 32px rgba(0,0,0,0.4),var(--glow-purple)"
      : "0 4px 24px rgba(0,0,0,0.3),0 0 0 1px rgba(255,255,255,0.03) inset",
    transition: "all 0.3s ease", ...style
  }}>{children}</div>
);

const Btn = ({children, onClick, variant="primary", small, disabled, style: sx}) => {
  const base = {
    primary: {background:"linear-gradient(135deg,#8b5cf6,#3b82f6)",color:"#fff",border:"none",boxShadow:"0 4px 20px rgba(139,92,246,0.35)"},
    ghost:   {background:"rgba(255,255,255,0.03)",color:"var(--text1)",border:"1px solid rgba(99,120,200,0.15)"},
    danger:  {background:"rgba(239,68,68,0.10)",color:"#ef4444",border:"1px solid rgba(239,68,68,0.25)"},
    success: {background:"rgba(16,185,129,0.10)",color:"#10b981",border:"1px solid rgba(16,185,129,0.25)"},
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...base[variant], borderRadius: 8,
      padding: small ? "8px 16px" : "12px 24px",
      fontSize: small ? 12 : 14, fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1, transition: "all 0.2s",
      fontFamily: "var(--sans)", whiteSpace: "nowrap", ...sx
    }}>{children}</button>
  );
};

const Input = ({label, ...props}) => (
  <div style={{marginBottom: 16}}>
    {label && (
      <label style={{
        fontSize: 11, color: "var(--text2)", display: "block", marginBottom: 6,
        fontFamily: "var(--mono)", textTransform: "uppercase",
        letterSpacing: "0.1em", fontWeight: 500
      }}>{label}</label>
    )}
    <input {...props} style={{
      width: "100%", background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(99,120,200,0.15)", borderRadius: 8,
      padding: "12px 16px", color: "var(--text0)", fontSize: 14,
      outline: "none", fontFamily: "var(--sans)", transition: "all 0.2s", ...props.style
    }}
      onFocus={e => { e.target.style.borderColor = "rgba(139,92,246,0.5)"; e.target.style.background = "rgba(255,255,255,0.05)"; }}
      onBlur={e  => { e.target.style.borderColor = "rgba(99,120,200,0.15)"; e.target.style.background = "rgba(255,255,255,0.03)"; }}
    />
  </div>
);

const Select = ({label, children, ...props}) => (
  <div style={{marginBottom: 16}}>
    {label && (
      <label style={{
        fontSize: 11, color: "var(--text2)", display: "block", marginBottom: 6,
        fontFamily: "var(--mono)", textTransform: "uppercase",
        letterSpacing: "0.1em", fontWeight: 500
      }}>{label}</label>
    )}
    <select {...props} style={{
      width: "100%", background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(99,120,200,0.15)", borderRadius: 8,
      padding: "12px 16px", color: "var(--text0)", fontSize: 14,
      outline: "none", fontFamily: "var(--sans)", appearance: "none", cursor: "pointer"
    }}>{children}</select>
  </div>
);

// ── Ticker ─────────────────────────────────────────────────────────────────
const Ticker = () => (
  <div style={{
    overflow: "hidden", borderBottom: "1px solid rgba(99,120,200,0.1)",
    background: "rgba(4,8,16,0.85)", backdropFilter: "blur(16px)",
    height: 36, display: "flex", alignItems: "center",
    position: "relative", zIndex: 10
  }}>
    <div style={{
      display: "flex", gap: 48, animation: "ticker 28s linear infinite",
      whiteSpace: "nowrap", padding: "0 24px"
    }}>
      {[...TICKER_ITEMS, ...TICKER_ITEMS].map((t, i) => (
        <span key={i} style={{
          fontSize: 11, fontFamily: "var(--mono)",
          color: t.includes("+") ? "#10b981" : "var(--text2)", fontWeight: 500
        }}>
          {t.includes("+") ? "▲ " : ""}{t}
        </span>
      ))}
    </div>
  </div>
);

// ── Sidebar ────────────────────────────────────────────────────────────────
const NAV = ["Dashboard", "Vaults", "AI Agent", "Analytics", "Settings"];
const NAV_ICONS = {Dashboard:"◈", Vaults:"⬡", "AI Agent":"◎", Analytics:"◉", Settings:"⚙"};

const Sidebar = ({page, setPage, user}) => (
  <aside style={{
    width: 240, background: "linear-gradient(180deg,rgba(4,8,16,0.95),rgba(2,4,10,0.98))",
    backdropFilter: "blur(32px)", WebkitBackdropFilter: "blur(32px)",
    borderRight: "1px solid rgba(99,120,200,0.1)", display: "flex",
    flexDirection: "column", height: "100vh", position: "sticky",
    top: 0, flexShrink: 0, zIndex: 20
  }}>
    <div style={{padding: "32px 24px 24px", borderBottom: "1px solid rgba(99,120,200,0.1)"}}>
      <div style={{fontFamily:"var(--mono)",fontWeight:700,fontSize:20,letterSpacing:"-0.02em",textShadow:"0 0 30px rgba(139,92,246,0.6)"}}>
        <span style={{color:"var(--purple)"}}>M</span>AAV
      </div>
      <div style={{fontSize:10,color:"var(--text2)",fontFamily:"var(--mono)",marginTop:4,letterSpacing:"0.15em",fontWeight:500}}>MANTLE AI VAULT</div>
    </div>
    <nav style={{padding: "20px 14px", flex: 1}}>
      {NAV.map(n => (
        <button key={n} onClick={() => setPage(n)} style={{
          display: "flex", alignItems: "center", gap: 12, width: "100%",
          padding: "12px 14px", borderRadius: 10, border: "none",
          background: page === n ? "linear-gradient(90deg,rgba(139,92,246,0.15),rgba(59,130,246,0.05))" : "transparent",
          color: page === n ? "#8b5cf6" : "var(--text1)",
          fontSize: 13, fontWeight: page === n ? 600 : 500,
          cursor: "pointer", marginBottom: 4, transition: "all 0.2s",
          textAlign: "left",
          boxShadow: page === n ? "inset 0 0 0 1px rgba(139,92,246,0.2),0 2px 8px rgba(139,92,246,0.1)" : "none",
          fontFamily: "var(--sans)"
        }}>
          <span style={{fontSize:15, opacity: page === n ? 1 : 0.7}}>{NAV_ICONS[n]}</span>
          {n}
          {page === n && <span style={{marginLeft:"auto",width:4,height:4,borderRadius:"50%",background:"#8b5cf6",boxShadow:"0 0 8px #8b5cf6"}} />}
        </button>
      ))}
    </nav>
    <div style={{padding: "20px 24px", borderTop: "1px solid rgba(99,120,200,0.1)"}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <div style={{
          width:36,height:36,borderRadius:"50%",
          background:"linear-gradient(135deg,#8b5cf6,#3b82f6)",
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:14,fontWeight:700,boxShadow:"0 2px 12px rgba(139,92,246,0.3)"
        }}>{user.name[0]}</div>
        <div>
          <div style={{fontSize:13,fontWeight:600,color:"var(--text0)"}}>{user.name}</div>
          <div style={{fontSize:11,color:"var(--text2)"}}>{user.email}</div>
        </div>
      </div>
    </div>
  </aside>
);

// ── Auth Screen ────────────────────────────────────────────────────────────
const AuthScreen = ({onLogin}) => {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({name:"", email:"demo@maav.io", password:"demo1234"});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = () => {
    if (!form.email || !form.password) { setErr("Please fill in all fields."); return; }
    setLoading(true); setErr("");
    setTimeout(() => { setLoading(false); onLogin({name: form.name || "DeFi Trader", email: form.email}); }, 900);
  };

  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
      <div className="auth-in" style={{marginBottom:40,textAlign:"center"}}>
        <div style={{fontFamily:"var(--mono)",fontSize:56,fontWeight:700,letterSpacing:"-0.03em",lineHeight:1,textShadow:"0 0 60px rgba(139,92,246,0.8),0 0 120px rgba(59,130,246,0.4)"}}>
          <span style={{color:"var(--purple)"}}>M</span><span style={{color:"var(--text0)"}}>AAV</span>
        </div>
        <div style={{fontSize:11,color:"var(--text2)",fontFamily:"var(--mono)",letterSpacing:"0.25em",marginTop:8,fontWeight:500}}>MANTLE AI VAULT</div>
        <div style={{marginTop:16,fontSize:15,color:"var(--text1)",maxWidth:360,lineHeight:1.6,margin:"16px auto 0"}}>AI-powered DeFi yield optimization on Mantle Network</div>
      </div>

      <div className="auth-in" style={{
        width:"100%",maxWidth:440,
        background:"linear-gradient(145deg,rgba(16,24,48,0.90),rgba(8,14,28,0.95))",
        backdropFilter:"blur(40px)",WebkitBackdropFilter:"blur(40px)",
        border:"1px solid rgba(139,92,246,0.25)",borderRadius:20,padding:"32px 36px",
        boxShadow:"0 0 0 1px rgba(255,255,255,0.05) inset,0 40px 100px rgba(0,0,0,0.7),0 0 60px rgba(139,92,246,0.15)"
      }}>
        <div style={{display:"flex",gap:0,marginBottom:28,background:"rgba(255,255,255,0.03)",borderRadius:12,padding:4}}>
          {["login","register"].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex:1,padding:"10px",borderRadius:10,border:"none",
              background: mode===m ? "linear-gradient(135deg,rgba(139,92,246,0.25),rgba(59,130,246,0.15))" : "transparent",
              color: mode===m ? "var(--text0)" : "var(--text2)",
              fontSize:13,fontWeight: mode===m ? 600 : 500,cursor:"pointer",
              fontFamily:"var(--sans)",transition:"all 0.2s",
              boxShadow: mode===m ? "0 2px 8px rgba(0,0,0,0.3),inset 0 0 0 1px rgba(139,92,246,0.3)" : "none"
            }}>
              {m === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>
        {mode === "register" && (
          <Input label="Full Name" placeholder="Satoshi Nakamoto" value={form.name} onChange={e => setForm({...form, name:e.target.value})} />
        )}
        <Input label="Email" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm({...form, email:e.target.value})} />
        <Input label="Password" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({...form, password:e.target.value})} />
        {err && <div style={{color:"var(--red)",fontSize:13,marginBottom:12,fontWeight:500}}>{err}</div>}
        <button onClick={submit} disabled={loading} style={{
          width:"100%",padding:"14px",fontSize:15,fontWeight:600,
          background: loading ? "rgba(139,92,246,0.3)" : "linear-gradient(135deg,#8b5cf6 0%,#3b82f6 100%)",
          color:"#fff",border:"none",borderRadius:10,cursor: loading ? "not-allowed" : "pointer",
          fontFamily:"var(--sans)",transition:"all 0.25s",
          boxShadow: loading ? "none" : "0 4px 28px rgba(139,92,246,0.5),0 1px 0 rgba(255,255,255,0.1) inset"
        }}>
          {loading
            ? <span style={{display:"flex",alignItems:"center",gap:10,justifyContent:"center"}}>
                <span style={{width:16,height:16,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",display:"inline-block",animation:"spin 0.8s linear infinite"}}/>
                Authenticating...
              </span>
            : mode === "login" ? "Sign In →" : "Create Account →"
          }
        </button>
        <div style={{marginTop:20,textAlign:"center",fontSize:12,color:"var(--text2)"}}>Demo credentials pre-filled — just hit sign in</div>
      </div>

      <div className="auth-in" style={{marginTop:28,display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
        {Object.entries(PROTOCOLS).map(([name, p]) => (
          <div key={name} style={{
            fontSize:11,fontFamily:"var(--mono)",color:p.color,
            background: p.color+"15",border:`1px solid ${p.color}35`,
            backdropFilter:"blur(8px)",borderRadius:8,padding:"6px 12px",
            letterSpacing:"0.06em",fontWeight:500
          }}>
            {name.split(" ")[0]} {p.apy}% APY
          </div>
        ))}
      </div>

      <div className="auth-in" style={{marginTop:24,display:"flex",gap:32,justifyContent:"center"}}>
        {[["$1.2B","Mantle TVL"],["18.6%","Avg APY"],["3","Protocols"]].map(([v, l]) => (
          <div key={l} style={{textAlign:"center"}}>
            <div style={{fontFamily:"var(--mono)",fontWeight:700,fontSize:22,textShadow:"0 0 24px rgba(139,92,246,0.6)"}}>{v}</div>
            <div style={{fontSize:10,color:"var(--text2)",fontFamily:"var(--mono)",letterSpacing:"0.12em",textTransform:"uppercase",marginTop:4,fontWeight:500}}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Dashboard ─────────────────────────────────────────────────────────────
const Dashboard = ({vaults, setPage, setSelectedVault}) => {
  const totalValue = vaults.reduce((s, v) => s + v.totalValueUSD, 0);
  const totalInit  = vaults.reduce((s, v) => s + v.initialDepositUSD, 0);
  const totalReturn = totalValue - totalInit;
  const combined = genHistory(30, totalInit, 1.003);
  const activities = [
    {time:"2h ago", msg:"AI rebalanced Alpha Yield Maximizer", type:"rebalance"},
    {time:"5h ago", msg:"Merchant Moe APY updated to 22.1%", type:"update"},
    {time:"1d ago", msg:"Stable Growth Fund performance snapshot", type:"snapshot"},
    {time:"2d ago", msg:"New recommendation: increase Rivera allocation", type:"rec"},
  ];
  const typeColor = {rebalance:"#8b5cf6",update:"#3b82f6",snapshot:"var(--text2)",rec:"#10b981"};

  return (
    <div style={{padding:"40px 48px",maxWidth:1200,margin:"0 auto"}}>
      <div className="fade-up" style={{marginBottom:36}}>
        <h1 style={{fontSize:32,fontWeight:700,letterSpacing:"-0.02em",color:"var(--text0)"}}>Portfolio Overview</h1>
        <div style={{fontSize:15,color:"var(--text1)",marginTop:6,fontWeight:400}}>Real-time AI-optimized yield across Mantle DeFi</div>
      </div>

      <FeatureGridDemo />

      <div style={{display:"flex",gap:20,marginBottom:36,flexWrap:"wrap",marginTop:40}}>
        <StatCard label="Total Portfolio" value={`$${totalValue.toLocaleString()}`} sub={`+$${totalReturn.toLocaleString()} returns`} accent="#8b5cf6" delay={0}/>
        <StatCard label="Avg APY" value="18.6%" sub="Across all vaults" accent="#10b981" delay={0.05}/>
        <StatCard label="Active Vaults" value={vaults.length} sub="All performing" accent="#3b82f6" delay={0.1}/>
        <StatCard label="AI Recommendations" value="2 pending" sub="Action required" accent="#f59e0b" delay={0.15}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 380px",gap:24,marginBottom:28}}>
        <Card className="fade-up-2">
          <div style={{fontSize:12,color:"var(--text2)",fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:20,fontWeight:600}}>Portfolio Value (30d)</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={combined}>
              <defs>
                <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{fill:"#64748b",fontSize:11,fontFamily:"Space Mono"}} tickLine={false} axisLine={false} interval={6}/>
              <YAxis tick={{fill:"#64748b",fontSize:11,fontFamily:"Space Mono"}} tickLine={false} axisLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`}/>
              <Tooltip contentStyle={{background:"rgba(16,24,48,0.95)",border:"1px solid rgba(139,92,246,0.3)",borderRadius:10,fontSize:13,fontFamily:"Space Mono",backdropFilter:"blur(16px)",color:"#f8fafc"}} formatter={v=>[`$${v.toLocaleString()}`,"Value"]}/>
              <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#grad1)"/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card className="fade-up-3">
          <div style={{fontSize:12,color:"var(--text2)",fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:20,fontWeight:600}}>Activity Feed</div>
          {activities.map((a, i) => (
            <div key={i} style={{display:"flex",gap:12,marginBottom:16,alignItems:"flex-start"}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:typeColor[a.type],marginTop:6,flexShrink:0,boxShadow:`0 0 8px ${typeColor[a.type]}`}}/>
              <div>
                <div style={{fontSize:13,lineHeight:1.5,color:"var(--text1)",fontWeight:500}}>{a.msg}</div>
                <div style={{fontSize:11,color:"var(--text2)",marginTop:3,fontFamily:"var(--mono)"}}>{a.time}</div>
              </div>
            </div>
          ))}
        </Card>
      </div>

      <div style={{fontSize:17,fontWeight:700,marginBottom:20,color:"var(--text0)"}}>Your Vaults</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
        {vaults.map((v, i) => {
          const ret = v.totalValueUSD - v.initialDepositUSD;
          const retPct = ((ret / v.initialDepositUSD) * 100).toFixed(1);
          const blended = v.allocations.reduce((s, a) => s + a.apy * a.pct / 100, 0);
          return (
            <Card key={v.id} className={`fade-up-${i+2}`} style={{cursor:"pointer"}} onClick={() => { setSelectedVault(v); setPage("Vaults"); }}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
                <div>
                  <div style={{fontWeight:700,fontSize:16,color:"var(--text0)"}}>{v.name}</div>
                  <div style={{fontSize:13,color:"var(--text2)",marginTop:4,fontWeight:400}}>{v.description}</div>
                </div>
                <Badge label={v.riskLevel} color={v.riskLevel==="aggressive"?"#ef4444":v.riskLevel==="moderate"?"#f59e0b":"#10b981"}/>
              </div>
              <div style={{display:"flex",gap:28,marginBottom:20}}>
                <div><div style={{fontSize:11,color:"var(--text2)",fontFamily:"var(--mono)",fontWeight:600}}>VALUE</div><div style={{fontSize:20,fontWeight:700,color:"var(--text0)"}}>${v.totalValueUSD.toLocaleString()}</div></div>
                <div><div style={{fontSize:11,color:"var(--text2)",fontFamily:"var(--mono)",fontWeight:600}}>RETURNS</div><div style={{fontSize:20,fontWeight:700,color:"#10b981"}}>+{retPct}%</div></div>
                <div><div style={{fontSize:11,color:"var(--text2)",fontFamily:"var(--mono)",fontWeight:600}}>BLEND APY</div><div style={{fontSize:20,fontWeight:700,color:"#8b5cf6"}}>{blended.toFixed(1)}%</div></div>
              </div>
              <div style={{display:"flex",gap:4,height:4,borderRadius:2,overflow:"hidden"}}>
                {v.allocations.map(a => <div key={a.protocol} style={{width:`${a.pct}%`,background:PROTOCOLS[a.protocol].color}}/>)}
              </div>
              <div style={{display:"flex",gap:16,marginTop:10}}>
                {v.allocations.map(a => <div key={a.protocol} style={{fontSize:11,color:PROTOCOLS[a.protocol].color,fontFamily:"var(--mono)",fontWeight:600}}>{a.protocol.split(" ")[0]} {a.pct}%</div>)}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

// ── Vaults ─────────────────────────────────────────────────────────────────
const Vaults = ({vaults, setVaults, selected, setSelected}) => {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({name:"",description:"",riskLevel:"moderate",investmentGoal:"yield",deposit:""});
  const [saving, setSaving] = useState(false);

  const createVault = () => {
    if (!form.name || !form.deposit) return;
    setSaving(true);
    setTimeout(() => {
      const allocs =
        form.riskLevel === "aggressive"
          ? [{protocol:"Rivera",pct:35,apy:18.4},{protocol:"Merchant Moe",pct:50,apy:22.1},{protocol:"Agni Finance",pct:15,apy:14.7}]
          : form.riskLevel === "conservative"
          ? [{protocol:"Rivera",pct:15,apy:18.4},{protocol:"Merchant Moe",pct:10,apy:22.1},{protocol:"Agni Finance",pct:75,apy:14.7}]
          : [{protocol:"Rivera",pct:33,apy:18.4},{protocol:"Merchant Moe",pct:34,apy:22.1},{protocol:"Agni Finance",pct:33,apy:14.7}];
      const dep = Number(form.deposit);
      const nv = {
        id: Date.now(), name: form.name, description: form.description || "Custom AI vault",
        riskLevel: form.riskLevel, investmentGoal: form.investmentGoal,
        status: "active", totalValueUSD: dep, initialDepositUSD: dep,
        autoRebalanceEnabled: true, allocations: allocs, history: genHistory(7, dep, 1.002)
      };
      setVaults(p => [...p, nv]);
      setSelected(nv); setSaving(false); setCreating(false);
    }, 1200);
  };

  if (creating) return (
    <div style={{padding:"40px 48px",maxWidth:600,margin:"0 auto"}}>
      <button onClick={() => setCreating(false)} style={{background:"none",border:"none",color:"var(--text1)",cursor:"pointer",marginBottom:24,fontSize:14,fontFamily:"var(--sans)",fontWeight:500}}>← Back</button>
      <h1 className="fade-up" style={{fontSize:28,fontWeight:700,marginBottom:10,color:"var(--text0)"}}>Create AI Vault</h1>
      <div className="fade-up" style={{fontSize:15,color:"var(--text1)",marginBottom:32}}>The AI agent will optimize your allocation automatically</div>
      <Card className="fade-up-2">
        <Input label="Vault Name" placeholder="e.g. My Yield Machine" value={form.name} onChange={e => setForm({...form, name:e.target.value})} />
        <Input label="Description (optional)" placeholder="What's this vault for?" value={form.description} onChange={e => setForm({...form, description:e.target.value})} />
        <Select label="Risk Level" value={form.riskLevel} onChange={e => setForm({...form, riskLevel:e.target.value})}>
          <option value="conservative">Conservative — stability first</option>
          <option value="moderate">Moderate — balanced approach</option>
          <option value="aggressive">Aggressive — max yield</option>
        </Select>
        <Select label="Investment Goal" value={form.investmentGoal} onChange={e => setForm({...form, investmentGoal:e.target.value})}>
          <option value="yield">Yield — maximize APY</option>
          <option value="growth">Growth — capital appreciation</option>
          <option value="stability">Stability — preserve capital</option>
        </Select>
        <Input label="Initial Deposit (USD)" type="number" placeholder="10000" value={form.deposit} onChange={e => setForm({...form, deposit:e.target.value})} />
        <div style={{background:"linear-gradient(135deg,rgba(139,92,246,0.08),rgba(59,130,246,0.05))",border:"1px solid rgba(139,92,246,0.2)",borderRadius:10,padding:16,marginBottom:24}}>
          <div style={{fontSize:12,color:"#8b5cf6",fontFamily:"var(--mono)",marginBottom:10,fontWeight:600,letterSpacing:"0.05em"}}>AI ALLOCATION PREVIEW</div>
          {(form.riskLevel==="aggressive"
            ? [[35,"Rivera"],[50,"Merchant Moe"],[15,"Agni Finance"]]
            : form.riskLevel==="conservative"
            ? [[15,"Rivera"],[10,"Merchant Moe"],[75,"Agni Finance"]]
            : [[33,"Rivera"],[34,"Merchant Moe"],[33,"Agni Finance"]]
          ).map(([pct, name]) => (
            <div key={name} style={{display:"flex",justifyContent:"space-between",fontSize:13,color:"var(--text1)",marginBottom:6,fontWeight:500}}>
              <span style={{color:PROTOCOLS[name].color}}>{name}</span>
              <span>{pct}% · {PROTOCOLS[name].apy}% APY</span>
            </div>
          ))}
        </div>
        <Btn onClick={createVault} disabled={saving || !form.name || !form.deposit} style={{width:"100%",padding:14}}>
          {saving ? "Creating vault..." : "Deploy Vault →"}
        </Btn>
      </Card>
    </div>
  );

  if (selected) {
    const ret = selected.totalValueUSD - selected.initialDepositUSD;
    const retPct = ((ret / selected.initialDepositUSD) * 100).toFixed(2);
    const blended = selected.allocations.reduce((s, a) => s + a.apy * a.pct / 100, 0);
    const pieData = selected.allocations.map(a => ({name:a.protocol,value:a.pct,color:PROTOCOLS[a.protocol].color}));
    return (
      <div style={{padding:"40px 48px",maxWidth:1100,margin:"0 auto"}}>
        <button onClick={() => setSelected(null)} style={{background:"none",border:"none",color:"var(--text1)",cursor:"pointer",marginBottom:24,fontSize:14,fontFamily:"var(--sans)",fontWeight:500}}>← All vaults</button>
        <div className="fade-up" style={{marginBottom:32}}>
          <h1 style={{fontSize:28,fontWeight:700,color:"var(--text0)"}}>{selected.name}</h1>
          <div style={{fontSize:14,color:"var(--text1)",marginTop:6}}>{selected.description}</div>
          <div style={{display:"flex",gap:10,marginTop:14}}>
            <Badge label={selected.riskLevel} color={selected.riskLevel==="aggressive"?"#ef4444":selected.riskLevel==="moderate"?"#f59e0b":"#10b981"}/>
            <Badge label={selected.investmentGoal} color="#3b82f6"/>
            <Badge label={selected.autoRebalanceEnabled?"auto-rebalance ON":"manual"} color={selected.autoRebalanceEnabled?"#10b981":"var(--text2)"}/>
          </div>
        </div>
        <div style={{display:"flex",gap:20,marginBottom:28,flexWrap:"wrap"}}>
          <StatCard label="Total Value" value={`$${selected.totalValueUSD.toLocaleString()}`} accent="#8b5cf6"/>
          <StatCard label="Total Returns" value={`+$${ret.toLocaleString()}`} sub={`+${retPct}%`} accent="#10b981"/>
          <StatCard label="Blended APY" value={`${blended.toFixed(1)}%`} accent="#3b82f6"/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:24,marginBottom:24}}>
          <Card className="fade-up-2">
            <div style={{fontSize:12,color:"var(--text2)",fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:20,fontWeight:600}}>Performance History</div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={selected.history}>
                <defs>
                  <linearGradient id="vg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{fill:"#64748b",fontSize:11,fontFamily:"Space Mono"}} tickLine={false} axisLine={false} interval={4}/>
                <YAxis tick={{fill:"#64748b",fontSize:11,fontFamily:"Space Mono"}} tickLine={false} axisLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`}/>
                <Tooltip contentStyle={{background:"rgba(16,24,48,0.95)",border:"1px solid rgba(59,130,246,0.3)",borderRadius:10,fontSize:13,fontFamily:"Space Mono",color:"#f8fafc"}} formatter={v=>[`$${v.toLocaleString()}`,"Value"]}/>
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2.5} fill="url(#vg)"/>
              </AreaChart>
            </ResponsiveContainer>
          </Card>
          <Card className="fade-up-3">
            <div style={{fontSize:12,color:"var(--text2)",fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:20,fontWeight:600}}>Allocation</div>
            <PieChart width={250} height={140}>
              <Pie data={pieData} cx={125} cy={70} innerRadius={45} outerRadius={68} dataKey="value" strokeWidth={0}>
                {pieData.map((e, i) => <Cell key={i} fill={e.color}/>)}
              </Pie>
            </PieChart>
            {pieData.map(d => (
              <div key={d.name} style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:8,fontWeight:500}}>
                <span style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{width:10,height:10,borderRadius:"50%",background:d.color,display:"inline-block"}}/>
                  <span style={{color:"var(--text1)"}}>{d.name.split(" ")[0]}</span>
                </span>
                <span style={{color:d.color,fontFamily:"var(--mono)",fontWeight:600}}>{d.value}%</span>
              </div>
            ))}
          </Card>
        </div>
        <Card className="fade-up-4">
          <div style={{fontSize:12,color:"var(--text2)",fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:20,fontWeight:600}}>Protocol Breakdown</div>
          {selected.allocations.map(a => (
            <div key={a.protocol} style={{display:"flex",alignItems:"center",gap:16,padding:"16px 0",borderBottom:"1px solid rgba(99,120,200,0.1)"}}>
              <div style={{width:12,height:12,borderRadius:"50%",background:PROTOCOLS[a.protocol].color,boxShadow:`0 0 8px ${PROTOCOLS[a.protocol].color}`,flexShrink:0}}/>
              <div style={{flex:1,fontWeight:600,color:"var(--text0)"}}>{a.protocol}</div>
              <div style={{fontSize:13,color:"var(--text2)",fontFamily:"var(--mono)"}}>TVL ${PROTOCOLS[a.protocol].tvl}</div>
              <div style={{width:100}}>
                <div style={{height:5,borderRadius:3,background:"rgba(255,255,255,0.05)",overflow:"hidden"}}>
                  <div style={{width:`${a.pct}%`,height:"100%",background:PROTOCOLS[a.protocol].color,borderRadius:3}}/>
                </div>
              </div>
              <div style={{width:50,textAlign:"right",fontSize:14,fontFamily:"var(--mono)",fontWeight:600,color:"var(--text0)"}}>{a.pct}%</div>
              <div style={{width:70,textAlign:"right"}}><Badge label={`${a.apy}%`} color={PROTOCOLS[a.protocol].color}/></div>
            </div>
          ))}
        </Card>
      </div>
    );
  }

  return (
    <div style={{padding:"40px 48px",maxWidth:1100,margin:"0 auto"}}>
      <div className="fade-up" style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:32}}>
        <div>
          <h1 style={{fontSize:32,fontWeight:700,letterSpacing:"-0.02em",color:"var(--text0)"}}>Vaults</h1>
          <div style={{fontSize:15,color:"var(--text1)",marginTop:6}}>{vaults.length} active vaults</div>
        </div>
        <Btn onClick={() => setCreating(true)}>+ New Vault</Btn>
      </div>
      <div style={{display:"grid",gap:20}}>
        {vaults.map((v, i) => {
          const ret = v.totalValueUSD - v.initialDepositUSD;
          const blended = v.allocations.reduce((s, a) => s + a.apy * a.pct / 100, 0);
          return (
            <Card key={v.id} className={`fade-up-${i+1}`} style={{cursor:"pointer"}} onClick={() => setSelected(v)}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",gap:24,alignItems:"center"}}>
                  <div style={{
                    width:52,height:52,borderRadius:12,
                    background:`linear-gradient(135deg,${PROTOCOLS[v.allocations[0].protocol].color}25,${PROTOCOLS[v.allocations[1].protocol].color}15)`,
                    border:`1px solid ${PROTOCOLS[v.allocations[0].protocol].color}40`,
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,
                    boxShadow:`0 4px 20px ${PROTOCOLS[v.allocations[0].protocol].color}20`
                  }}>⬡</div>
                  <div>
                    <div style={{fontWeight:700,fontSize:16,color:"var(--text0)"}}>{v.name}</div>
                    <div style={{fontSize:13,color:"var(--text2)",marginTop:3}}>{v.description}</div>
                    <div style={{display:"flex",gap:8,marginTop:8}}>
                      <Badge label={v.riskLevel} color={v.riskLevel==="aggressive"?"#ef4444":v.riskLevel==="moderate"?"#f59e0b":"#10b981"}/>
                      {v.autoRebalanceEnabled && <Badge label="auto-rebalance" color="#10b981"/>}
                    </div>
                  </div>
                </div>
                <div style={{display:"flex",gap:48,alignItems:"center"}}>
                  <div style={{textAlign:"right"}}><div style={{fontSize:11,color:"var(--text2)",fontFamily:"var(--mono)",fontWeight:600}}>VALUE</div><div style={{fontSize:24,fontWeight:700,color:"var(--text0)"}}>${v.totalValueUSD.toLocaleString()}</div></div>
                  <div style={{textAlign:"right"}}><div style={{fontSize:11,color:"var(--text2)",fontFamily:"var(--mono)",fontWeight:600}}>RETURNS</div><div style={{fontSize:24,fontWeight:700,color:"#10b981"}}>+${ret.toLocaleString()}</div></div>
                  <div style={{textAlign:"right"}}><div style={{fontSize:11,color:"var(--text2)",fontFamily:"var(--mono)",fontWeight:600}}>BLEND APY</div><div style={{fontSize:24,fontWeight:700,color:"#8b5cf6"}}>{blended.toFixed(1)}%</div></div>
                  <div style={{color:"var(--text2)",fontSize:20}}>›</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

// ── AI Agent ───────────────────────────────────────────────────────────────
const AIAgent = ({vaults, recs, setRecs}) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const run = () => { setAnalyzing(true); setTimeout(() => { setAnalyzing(false); setAnalyzed(true); }, 2200); };
  const handle = (id, action) => setRecs(p => p.map(r => r.id === id ? {...r, status:action} : r));
  const sentScore = SENTIMENT.score;
  const scoreColor = sentScore > 60 ? "#10b981" : sentScore > 40 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{padding:"40px 48px",maxWidth:1100,margin:"0 auto"}}>
      <div className="fade-up" style={{marginBottom:32}}>
        <h1 style={{fontSize:32,fontWeight:700,letterSpacing:"-0.02em",color:"var(--text0)"}}>AI Agent</h1>
        <div style={{fontSize:15,color:"var(--text1)",marginTop:6}}>Market intelligence and rebalancing recommendations</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,marginBottom:28}}>
        <Card className="fade-up" glow>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
            <div style={{fontSize:12,color:"var(--text2)",fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:600}}>Market Sentiment</div>
            <Badge label={SENTIMENT.label} color={scoreColor}/>
          </div>
          <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:20}}>
            <div style={{fontSize:56,fontWeight:800,fontFamily:"var(--mono)",color:scoreColor,textShadow:`0 0 30px ${scoreColor}`}}>{sentScore}</div>
            <div style={{fontSize:16,color:"var(--text2)"}}>/ 100</div>
          </div>
          <div style={{height:8,borderRadius:4,background:"rgba(255,255,255,0.05)",overflow:"hidden",marginBottom:16}}>
            <div style={{width:`${sentScore}%`,height:"100%",background:`linear-gradient(90deg,${scoreColor}88,${scoreColor})`,borderRadius:4}}/>
          </div>
          <div style={{fontSize:14,color:"var(--text1)",lineHeight:1.7,fontWeight:400}}>{SENTIMENT.summary}</div>
          <div style={{marginTop:14,fontSize:13,color:scoreColor,fontFamily:"var(--mono)",fontWeight:600}}>Confidence: {SENTIMENT.confidence}%</div>
        </Card>
        <Card className="fade-up-2">
          <div style={{fontSize:12,color:"var(--text2)",fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:20,fontWeight:600}}>Protocol Yield Comparison</div>
          {Object.entries(PROTOCOLS).map(([name, p]) => (
            <div key={name} style={{marginBottom:18}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <span style={{fontSize:14,color:p.color,fontWeight:600}}>{name}</span>
                <span style={{fontSize:14,fontFamily:"var(--mono)",fontWeight:700,color:"var(--text0)"}}>{p.apy}% APY</span>
              </div>
              <div style={{height:8,borderRadius:4,background:"rgba(255,255,255,0.05)",overflow:"hidden"}}>
                <div style={{width:`${(p.apy/25)*100}%`,height:"100%",background:`linear-gradient(90deg,${p.color}66,${p.color})`,borderRadius:4}}/>
              </div>
              <div style={{fontSize:11,color:"var(--text2)",marginTop:6,fontFamily:"var(--mono)"}}>TVL ${p.tvl} · Risk: {p.risk}</div>
            </div>
          ))}
          <Btn onClick={run} disabled={analyzing} small style={{width:"100%",marginTop:12}}>
            {analyzing
              ? <span style={{display:"flex",alignItems:"center",gap:10,justifyContent:"center"}}>
                  <span style={{width:14,height:14,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",display:"inline-block",animation:"spin 0.8s linear infinite"}}/>
                  Analyzing...
                </span>
              : "Run AI Analysis ◎"
            }
          </Btn>
        </Card>
      </div>

      {(analyzed || recs.some(r => r.status === "pending")) && (
        <div>
          <div style={{fontSize:17,fontWeight:700,marginBottom:20,color:"var(--text0)"}}>Rebalancing Recommendations</div>
          {recs.map((rec, i) => {
            const vault = vaults.find(v => v.id === rec.vaultId);
            const protocols = Object.keys(PROTOCOLS);
            return (
              <Card key={rec.id} className={`fade-up-${i+1}`} style={{marginBottom:20}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
                  <div>
                    <div style={{fontSize:12,color:"var(--text2)",fontFamily:"var(--mono)",marginBottom:6,fontWeight:600}}>VAULT</div>
                    <div style={{fontWeight:700,fontSize:16,color:"var(--text0)"}}>{vault?.name}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:11,color:"var(--text2)",fontFamily:"var(--mono)",fontWeight:600}}>PROJECTED APY</div>
                    <div style={{fontSize:28,fontWeight:800,color:"#10b981",fontFamily:"var(--mono)",textShadow:"0 0 20px #10b981"}}>{rec.projectedAPY}%</div>
                  </div>
                </div>
                <div style={{fontSize:14,color:"var(--text1)",lineHeight:1.7,marginBottom:20,background:"rgba(255,255,255,0.03)",borderRadius:10,padding:"14px 18px",fontWeight:400}}>{rec.reason}</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:20}}>
                  {["Current","Recommended"].map((label, li) => (
                    <div key={label}>
                      <div style={{fontSize:11,color:"var(--text2)",fontFamily:"var(--mono)",marginBottom:12,fontWeight:600}}>{label.toUpperCase()}</div>
                      {protocols.map((p, pi) => (
                        <div key={p} style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                          <span style={{fontSize:13,color:PROTOCOLS[p].color,fontWeight:500}}>{p.split(" ")[0]}</span>
                          <span style={{fontSize:13,fontFamily:"var(--mono)",fontWeight:600,color:"var(--text0)"}}>{li===0?rec.current[pi]:rec.recommended[pi]}%</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                {rec.status === "pending"
                  ? <div style={{display:"flex",gap:12}}>
                      <Btn variant="success" onClick={() => handle(rec.id,"accepted")} small>Accept ✓</Btn>
                      <Btn variant="danger"  onClick={() => handle(rec.id,"rejected")} small>Reject ✕</Btn>
                    </div>
                  : <Badge label={rec.status==="accepted"?"✓ Accepted":"✕ Rejected"} color={rec.status==="accepted"?"#10b981":"#ef4444"}/>
                }
              </Card>
            );
          })}
        </div>
      )}

      {!analyzed && !recs.some(r => r.status === "pending") && (
        <Card style={{textAlign:"center",padding:56}}>
          <div style={{fontSize:48,marginBottom:20,animation:"float 4s ease-in-out infinite",filter:"drop-shadow(0 0 20px rgba(139,92,246,0.5))"}}>◎</div>
          <div style={{fontWeight:700,fontSize:18,marginBottom:10,color:"var(--text0)"}}>AI Agent Ready</div>
          <div style={{fontSize:14,color:"var(--text2)",marginBottom:28,fontWeight:400}}>Run analysis to get personalized rebalancing recommendations</div>
          <Btn onClick={run}>Start Analysis</Btn>
        </Card>
      )}
    </div>
  );
};

// ── Analytics ──────────────────────────────────────────────────────────────
const Analytics = () => {
  const allHistory   = genHistory(60, 70000, 1.0022);
  const benchHistory = genHistory(60, 70000, 1.0012);
  const combined = allHistory.map((d, i) => ({...d, benchmark: benchHistory[i].value}));
  return (
    <div style={{padding:"40px 48px",maxWidth:1100,margin:"0 auto"}}>
      <div className="fade-up" style={{marginBottom:32}}>
        <h1 style={{fontSize:32,fontWeight:700,letterSpacing:"-0.02em",color:"var(--text0)"}}>Analytics</h1>
        <div style={{fontSize:15,color:"var(--text1)",marginTop:6}}>Portfolio performance vs benchmark</div>
      </div>
      <Card className="fade-up" style={{marginBottom:24}}>
        <div style={{fontSize:12,color:"var(--text2)",fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:20,fontWeight:600}}>60-day performance vs ETH benchmark</div>
        <div style={{display:"flex",gap:24,marginBottom:20}}>
          <span style={{fontSize:13,display:"flex",alignItems:"center",gap:8,color:"var(--text1)"}}>
            <span style={{width:14,height:3,background:"#8b5cf6",display:"inline-block",borderRadius:2}}/> MAAV Portfolio
          </span>
          <span style={{fontSize:13,display:"flex",alignItems:"center",gap:8,color:"var(--text1)"}}>
            <span style={{width:14,display:"inline-block",borderTop:"2px dashed #64748b"}}/> ETH Benchmark
          </span>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={combined}>
            <XAxis dataKey="date" tick={{fill:"#64748b",fontSize:11,fontFamily:"Space Mono"}} tickLine={false} axisLine={false} interval={8}/>
            <YAxis tick={{fill:"#64748b",fontSize:11,fontFamily:"Space Mono"}} tickLine={false} axisLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`}/>
            <Tooltip contentStyle={{background:"rgba(16,24,48,0.95)",border:"1px solid rgba(139,92,246,0.3)",borderRadius:10,fontSize:13,fontFamily:"Space Mono",color:"#f8fafc"}} formatter={v=>[`$${Math.round(v).toLocaleString()}`]}/>
            <Line type="monotone" dataKey="value"     stroke="#8b5cf6" strokeWidth={3}   dot={false} name="MAAV"/>
            <Line type="monotone" dataKey="benchmark" stroke="#64748b" strokeWidth={2}   strokeDasharray="5 5" dot={false} name="Benchmark"/>
          </LineChart>
        </ResponsiveContainer>
      </Card>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20}}>
        <StatCard label="60d Return"    value="+12.4%" sub="vs +7.1% benchmark" accent="#10b981"/>
        <StatCard label="Alpha Generated" value="+5.3%" sub="Outperformance"   accent="#8b5cf6"/>
        <StatCard label="Sharpe Ratio"  value="1.84"   sub="Risk-adjusted"     accent="#3b82f6"/>
      </div>
    </div>
  );
};

// ── Settings ───────────────────────────────────────────────────────────────
const SettingsPage = ({user, setAuthed}) => (
  <div style={{padding:"40px 48px",maxWidth:640,margin:"0 auto"}}>
    <div className="fade-up" style={{marginBottom:32}}>
      <h1 style={{fontSize:32,fontWeight:700,letterSpacing:"-0.02em",color:"var(--text0)"}}>Settings</h1>
    </div>
    <Card className="fade-up" style={{marginBottom:24}}>
      <div style={{fontSize:12,color:"var(--text2)",fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:20,fontWeight:600}}>Profile</div>
      <div style={{display:"flex",alignItems:"center",gap:20,marginBottom:24}}>
        <div style={{width:60,height:60,borderRadius:"50%",background:"linear-gradient(135deg,#8b5cf6,#3b82f6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:700,boxShadow:"0 4px 20px rgba(139,92,246,0.4)"}}>{user.name[0]}</div>
        <div>
          <div style={{fontWeight:700,fontSize:17,color:"var(--text0)"}}>{user.name}</div>
          <div style={{fontSize:14,color:"var(--text2)"}}>{user.email}</div>
        </div>
      </div>
      <Input label="Display Name" defaultValue={user.name}/>
      <Input label="Email" defaultValue={user.email}/>
      <Btn>Save Changes</Btn>
    </Card>
    <Card className="fade-up-2" style={{marginBottom:24}}>
      <div style={{fontSize:12,color:"var(--text2)",fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:20,fontWeight:600}}>AI Settings</div>
      {[["Auto-rebalance threshold","5% deviation"],["Max slippage tolerance","0.5%"],["AI analysis frequency","Every 6 hours"]].map(([k,v]) => (
        <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 0",borderBottom:"1px solid rgba(99,120,200,0.1)"}}>
          <span style={{fontSize:14,color:"var(--text1)",fontWeight:500}}>{k}</span>
          <span style={{fontSize:14,color:"#8b5cf6",fontFamily:"var(--mono)",fontWeight:600}}>{v}</span>
        </div>
      ))}
    </Card>
    <Btn variant="danger" onClick={() => setAuthed(false)}>Sign Out</Btn>
  </div>
);

// ── App Root ───────────────────────────────────────────────────────────────
export default function App() {
  const [authed, setAuthed]             = useState(false);
  const [user, setUser]                 = useState(null);
  const [page, setPage]                 = useState("Dashboard");
  const [vaults, setVaults]             = useState(MOCK_VAULTS);
  const [selectedVault, setSelectedVault] = useState(null);
  const [recs, setRecs]                 = useState(MOCK_RECS);

  const renderPage = () => {
    switch (page) {
      case "Dashboard": return <Dashboard vaults={vaults} setPage={setPage} setSelectedVault={setSelectedVault}/>;
      case "Vaults":    return <Vaults vaults={vaults} setVaults={setVaults} selected={selectedVault} setSelected={setSelectedVault}/>;
      case "AI Agent":  return <AIAgent vaults={vaults} recs={recs} setRecs={setRecs}/>;
      case "Analytics": return <Analytics/>;
      case "Settings":  return <SettingsPage user={user} setAuthed={setAuthed}/>;
      default:          return null;
    }
  };

  return (
    <>
      <FontLink/>
      <ShaderBackground/>
      <GlobalOverlay/>
      <div style={{position:"relative",zIndex:10,minHeight:"100vh"}}>
        {!authed
          ? <AuthScreen onLogin={u => { setUser(u); setAuthed(true); }}/>
          : <div style={{display:"flex",minHeight:"100vh"}}>
              <Sidebar page={page} setPage={p => { setPage(p); setSelectedVault(null); }} user={user}/>
              <div style={{flex:1,overflow:"auto",display:"flex",flexDirection:"column"}}>
                <Ticker/>
                <div style={{flex:1}}>{renderPage()}</div>
              </div>
            </div>
        }
      </div>
    </>
  );
}
