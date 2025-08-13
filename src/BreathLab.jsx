import React, { useEffect, useMemo, useRef, useState } from "react";

export default function BreathLab() {
  const GOLD = "#C49C25";

  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML =
      "@import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@400;600;700&display=swap'); body{font-family:'Quicksand',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#000;color:#e5e7eb}";
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const [size, setSize] = useState(360);
  useEffect(() => {
    const onR = () =>
      setSize(Math.max(320, Math.min(540, Math.min(window.innerWidth, 720) - 40)));
    onR();
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  const RAW_SVG = import.meta.env.BASE_URL + "lungs-lung-svgrepo-com.svg";

  const [lungPaths, setLungPaths] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(RAW_SVG, { mode: "cors" });
        const txt = await res.text();
        const doc = new DOMParser().parseFromString(txt, "image/svg+xml");
        const paths = Array.from(doc.querySelectorAll("path")).map(
          (p) => p.getAttribute("d") || ""
        );
        if (!cancelled && paths.length >= 3) setLungPaths(paths.slice(0, 3));
      } catch {
        if (!cancelled) setLungPaths(null);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const presets = useMemo(
    () => [
      { id: "box4444", name: "BOX 4:4:4:4", phases: [
        { label: "Inhale", seconds: 4 }, { label: "Hold", seconds: 4 },
        { label: "Exhale", seconds: 4 }, { label: "Hold", seconds: 4 }
      ], note: "Balanced box breathing." },
      { id: "coherent55", name: "COHERENT 5:5", phases: [
        { label: "Inhale", seconds: 5 }, { label: "Exhale", seconds: 5 }
      ], note: "Resonant HRV." },
      { id: "478", name: "4–7–8", phases: [
        { label: "Inhale", seconds: 4 }, { label: "Hold", seconds: 7 }, { label: "Exhale", seconds: 8 }
      ], note: "Downshift for sleep." },
      { id: "sigh", name: "PHYSIOLOGICAL SIGH", phases: [
        { label: "Inhale", seconds: 2 }, { label: "Top-up Inhale", seconds: 1 }, { label: "Long Exhale", seconds: 6 }
      ], note: "Two inhales and long exhale." },
      { id: "cadence36", name: "CADENCE 3:6", phases: [
        { label: "Inhale", seconds: 3 }, { label: "Exhale", seconds: 6 }
      ], note: "Vagal tone focus." },
      { id: "bof", name: "BREATH OF FIRE 60s", phases: [
        { label: "Inhale", seconds: 0.33 }, { label: "Exhale", seconds: 0.33 }
      ], cycles: 90, note: "Rapid rhythmic. Stop if dizzy." },
      { id: "power30", name: "POWER 30 + HOLD", phases: [
        { label: "Inhale", seconds: 1 }, { label: "Exhale", seconds: 1 }
      ], cycles: 30, tail: [{ label: "Exhale Hold", seconds: 45 }, { label: "Inhale Hold", seconds: 15 }],
        note: "Wim Hof style." },
      { id: "tesla369", name: "TESLA 3:6:9", phases: [
        { label: "Inhale", seconds: 3 }, { label: "Hold", seconds: 6 }, { label: "Exhale", seconds: 9 }
      ], note: "Sacred 3 6 9." },
      { id: "golden", name: "GOLDEN RATIO 5:3:8", phases: [
        { label: "Inhale", seconds: 5 }, { label: "Hold", seconds: 3 }, { label: "Exhale", seconds: 8 }
      ], note: "Fibonacci inspired." },
      { id: "fibo235", name: "FIBONACCI 2:3:5:3", phases: [
        { label: "Inhale", seconds: 2 }, { label: "Hold", seconds: 3 }, { label: "Exhale", seconds: 5 }, { label: "Hold", seconds: 3 }
      ], note: "Fibonacci box." },
      { id: "seven11", name: "7 11 RELAX", phases: [
        { label: "Inhale", seconds: 7 }, { label: "Exhale", seconds: 11 }
      ], note: "Long exhale." },
      { id: "twofour", name: "2 4 CALM", phases: [
        { label: "Inhale", seconds: 2 }, { label: "Exhale", seconds: 4 }
      ], note: "Quick downshift." },
      { id: "custom", name: "CUSTOM", customizable: true, phases: [
        { label: "Inhale", seconds: 4 }, { label: "Hold", seconds: 4 },
        { label: "Exhale", seconds: 4 }, { label: "Hold", seconds: 4 }
      ], note: "Your timing." }
    ],
    []
  );

  function buildPlan(p) {
    let plan = p.phases.slice();
    if (p.cycles && p.cycles > 1) {
      plan = [];
      for (let i = 0; i < p.cycles; i++) plan = plan.concat(p.phases);
    }
    if (p.tail) plan = plan.concat(p.tail);
    return plan;
  }

  const [current, setCurrent] = useState(presets[0]);
  const [running, setRunning] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [remaining, setRemaining] = useState(current.phases[0].seconds);
  const plan = useMemo(() => buildPlan(current), [current]);
  const phase = plan[phaseIndex];

  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef(null);

  function findFirstInhaleIndex(pPlan) {
    const idx = pPlan.findIndex(ph => (ph.label || "").toLowerCase().includes("inhale"));
    return idx >= 0 ? idx : 0;
  }

  const handleStart = () => {
    const inhaleIdx = findFirstInhaleIndex(plan);
    setRunning(false);
    setPhaseIndex(inhaleIdx);
    setRemaining(plan[inhaleIdx].seconds);
    startLevelRef.current = 0;
    lastLevelRef.current = 0;

    setCountdown(3);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
          setRunning(true);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  useEffect(() => () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  useEffect(() => {
    if (!running) return;
    const step = 100;
    const id = setInterval(() => {
      setRemaining(r => {
        const next = +(Math.max(0, r - step / 1000).toFixed(2));
        if (next > 0) return next;
        setPhaseIndex(i => {
          const nx = (i + 1) % plan.length;
          setRemaining(plan[nx].seconds);
          return nx;
        });
        return 0;
      });
    }, step);
    return () => clearInterval(id);
  }, [running, plan]);

  const startLevelRef = useRef(0);
  const lastLevelRef = useRef(0);
  useEffect(() => {
    startLevelRef.current = lastLevelRef.current;
  }, [phaseIndex]);

  const fillLevel = (() => {
    const label = (phase.label || "").toLowerCase();
    const prev = (plan[(phaseIndex - 1 + plan.length) % plan.length]?.label || "").toLowerCase();

    if (label.includes("hold")) {
      if (prev.includes("exhale")) { lastLevelRef.current = 0; return 0; }
      if (prev.includes("inhale") || prev.includes("top-up")) { lastLevelRef.current = 1; return 1; }
      return lastLevelRef.current;
    }

    const total = Math.max(phase.seconds, 0.1);
    const t = 1 - remaining / total;
    const eased = t * t * (3 - 2 * t);
    const target = label.includes("inhale") ? 1 : 0;
    const lvl = startLevelRef.current + (target - startLevelRef.current) * eased;
    lastLevelRef.current = Math.min(1, Math.max(0, lvl));
    return lastLevelRef.current;
  })();

  const effectiveFill = countdown ? 0 : fillLevel;

  const padding = Math.round(size * 0.14);
  const side = size - padding * 2;
  const center = { x: size / 2, y: size / 2 };

  function edgeForPhase(idx) {
    const lbl = (plan[idx]?.label || "").toLowerCase();
    if (lbl.includes("inhale")) return 3;
    if (lbl.includes("exhale")) return 1;
    if (lbl.includes("hold")) {
      const prevLbl = (plan[(idx - 1 + plan.length) % plan.length]?.label || "").toLowerCase();
      if (prevLbl.includes("inhale")) return 0;
      if (prevLbl.includes("exhale")) return 2;
      return 0;
    }
    return idx % 4;
  }

  const phaseDur = Math.max(phase.seconds, 0.1);
  const progress = countdown ? 0 : 1 - remaining / phaseDur + 1e-6;

  const x0 = padding, y0 = padding, x1 = padding + side, y1 = padding + side;
  const edgeIndex = countdown ? 3 : edgeForPhase(phaseIndex);
  let dot = { x: x0, y: y0 };
  if (edgeIndex === 0)      dot = { x: x0 + side * progress, y: y1 };
  else if (edgeIndex === 1) dot = { x: x1, y: y1 - side * progress };
  else if (edgeIndex === 2) dot = { x: x1 - side * progress, y: y0 };
  else if (edgeIndex === 3) dot = { x: x0, y: y0 + side * progress };

  const radius = side * 0.48;
  const lungBox = {
    x: center.x - radius * 0.82,
    y: center.y - radius * 0.60,
    w: radius * 1.64,
    h: radius * 1.38,
  };
  const VB = 500.001;
  const svgScale = Math.min(lungBox.w / VB, lungBox.h / VB);
  const lungTx = lungBox.x + (lungBox.w - VB * svgScale) / 2;
  const lungTy = lungBox.y + (lungBox.h - VB * svgScale) / 2;

  const [wavePhase, setWavePhase] = useState(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => { setWavePhase((p) => (p + 0.08) % (Math.PI * 2)); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  function buildWavePath(box, level, amp, freq, shift) {
    const yLevel = box.y + box.h * (1 - level);
    const steps = 40;
    const segs = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = box.x + box.w * t;
      const y = yLevel + Math.sin(t * freq * Math.PI * 2 + shift) * amp;
      segs.push(`${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`);
    }
    segs.push(`L${(box.x + box.w).toFixed(2)},${(box.y + box.h).toFixed(2)}`);
    segs.push(`L${box.x.toFixed(2)},${(box.y + box.h).toFixed(2)}Z`);
    return segs.join(" ");
  }

  const wavePath = buildWavePath(
    lungBox,
    effectiveFill,
    Math.max(2, radius * 0.04),
    2.2,
    wavePhase
  );

  const displayPhase = countdown ? "GET READY" : phase.label;

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: 16 }}>
        <header style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ color: GOLD, fontWeight: 700, fontSize: 30, marginRight: "auto" }}>Breath Lab</h1>
          <select
            value={current.id}
            onChange={(e) => {
              const p = presets.find((x) => x.id === e.target.value);
              setCurrent(p);
              setRunning(false);
              setPhaseIndex(0);
              setRemaining(p.phases[0].seconds);
              setCountdown(0);
            }}
            style={{ background: "#111", color: "#e5e7eb", border: `1px solid ${GOLD}`, borderRadius: 12, padding: "10px 12px", paddingRight: 36, fontWeight: 600 }}
          >
            {presets.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
          </select>
          <button
            onClick={() => { if (running) setRunning(false); else if (!countdown) handleStart(); }}
            disabled={!!countdown}
            style={{ background: GOLD, color: "#111", border: `1px solid ${GOLD}`, borderRadius: 12, padding: "10px 16px", fontWeight: 700, opacity: countdown ? 0.7 : 1 }}
          >
            {running ? "PAUSE" : countdown ? `GET READY ${countdown}` : "START"}
          </button>
          <button
            onClick={() => {
              const i = presets.findIndex((p) => p.id === current.id);
              const n = presets[(i + 1) % presets.length];
              setCurrent(n);
              setRunning(false);
              setPhaseIndex(0);
              setRemaining(n.phases[0].seconds);
              setCountdown(0);
            }}
            style={{ background: "#fff", color: "#111", border: "1px solid #d4d4d8", borderRadius: 12, padding: "10px 16px", fontWeight: 400, textTransform: "uppercase" }}
          >
            Next
          </button>
        </header>

        <section style={{ background: "#0a0a0a", borderRadius: 16, padding: 16, border: "1px solid #262626" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{current.name}</div>
            <div style={{ color: "#9ca3af", fontSize: 13 }}>{current.note}</div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", position: "relative" }}>
            <svg width={size} height={size} overflow="visible" style={{ display: "block" }}>
              <defs>
                <filter id="glow"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                <linearGradient id="lungGrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={GOLD} stopOpacity="0.9" /><stop offset="100%" stopColor={GOLD} stopOpacity="0.25" /></linearGradient>
                <pattern id="sacred" width="18" height="18" patternUnits="userSpaceOnUse">
                  <circle cx="9" cy="9" r="2" fill="#fff" opacity="0.08" />
                  <circle cx="0" cy="9" r="2" fill="#fff" opacity="0.08" />
                  <circle cx="18" cy="9" r="2" fill="#fff" opacity="0.08" />
                </pattern>
                <mask id="lungsMask">
                  <rect x="0" y="0" width={size} height={size} fill="black" />
                  <g transform={`translate(${lungTx},${lungTy}) scale(${svgScale})`}>
                    {lungPaths ? (<><path d={lungPaths[0]} fill="white" /><path d={lungPaths[1]} fill="white" /><path d={lungPaths[2]} fill="white" /></>) : (<><ellipse cx={250} cy={260} rx={150} ry={210} fill="white" /><ellipse cx={250} cy={260} rx={150} ry={210} fill="white" /></>)}
                  </g>
                </mask>
              </defs>

              <rect x={padding} y={padding} width={side} height={side} rx={16} fill="transparent" stroke={GOLD} strokeWidth={2} />

              {(() => {
                const gap = Math.max(24, Math.round(padding * 0.35));
                const SAFE = 16;
                const inhaleX = Math.max(SAFE, padding - gap);
                const exhaleX = Math.min(size - SAFE, size - padding + gap);
                return (<>
                  <text x={size / 2} y={padding - 22} textAnchor="middle" fill="#e5e7eb" fontSize={18}>HOLD</text>
                  <text x={size / 2} y={size - padding + 38} textAnchor="middle" fill="#e5e7eb" fontSize={18}>HOLD</text>
                  <text x={inhaleX} y={size / 2} textAnchor="end" dominantBaseline="middle" fill={GOLD} fontSize={18}>INHALE</text>
                  <text x={exhaleX} y={size / 2} textAnchor="start" dominantBaseline="middle" fill={GOLD} fontSize={18}>EXHALE</text>
                </>);
              })()}

              <rect x={padding} y={padding} width={side} height={side} rx={16} fill="none" stroke={GOLD} strokeOpacity="0.25" strokeWidth="2" />

              <g transform={`translate(${lungTx},${lungTy}) scale(${svgScale})`} opacity="0.95" pointerEvents="none">
                {lungPaths ? (<><path d={lungPaths[0]} fill="#101010" stroke="#9ca3af" strokeWidth="1.4" /><path d={lungPaths[1]} fill="#101010" stroke="#9ca3af" strokeWidth="1.4" /><path d={lungPaths[2]} fill="#101010" stroke="#9ca3af" strokeWidth="1.4" /></>) : (<><ellipse cx={250} cy={260} rx={150} ry={210} fill="#101010" stroke="#9ca3af" strokeWidth="1.4" /><ellipse cx={250} cy={260} rx={150} ry={210} fill="#101010" stroke="#9ca3af" strokeWidth="1.4" /></>)}
              </g>

              <g mask="url(#lungsMask)"><path d={wavePath} fill="url(#lungGrad)" /><path d={wavePath} fill="url(#sacred)" /></g>

              <circle cx={dot.x} cy={dot.y} r="10" fill={GOLD} filter="url(#glow)" />

              {countdown ? (<><rect x={0} y={0} width={size} height={size} fill="#000" opacity="0.35" /><text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="middle" fill={GOLD} fontSize={Math.round(size*0.28)} fontWeight="700">{countdown}</text></>) : null}
            </svg>
          </div>

          <div style={{ textAlign: "center", marginTop: 12 }}>
            <div style={{ color: "#9ca3af", fontSize: 14, letterSpacing: 0.3 }}>CURRENT PHASE</div>
            <div style={{ color: GOLD, fontWeight: 700, fontSize: 26 }}>{countdown ? "GET READY" : phase.label}</div>
            <div style={{ color: "#9ca3af", fontSize: 14 }}>{Number(remaining).toFixed(1)}s</div>
          </div>
        </section>

        {current.customizable && (
          <section style={{ background: "#0a0a0a", borderRadius: 16, padding: 16, border: "1px solid #262626", marginTop: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Custom timing</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(64px, auto))", gap: 12 }}>
              {current.phases.map((p, i) => (
                <label key={i} style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>{p.label}</span>
                  <input type="number" min={0.1} step={0.1} value={p.seconds}
                    onChange={(e)=>{
                      const v = Math.max(0.1, Number(e.target.value || 0));
                      const next = { ...current, phases: current.phases.map((pp,ii)=> ii===i?{...pp, seconds:v}:pp) };
                      setCurrent(next);
                    }}
                    style={{ background:"#111", color:"#eaeaea", border:"1px solid #3f3f46", borderRadius:10, padding:"8px 10px", width:64, textAlign:"center" }} />
                </label>
              ))}
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={()=>{ setRunning(false); setPhaseIndex(0); setRemaining(current.phases[0].seconds); setCountdown(0); }}
                style={{ background:GOLD, color:"#111", border:`1px solid ${GOLD}`, borderRadius:12, padding:"10px 16px", fontWeight:700 }}>
                APPLY
              </button>
            </div>
          </section>
        )}

        <footer style={{ marginTop: 12, color: "#9ca3af", fontSize: 12, textAlign: "center" }}>
          powered by <a href="https://www.pemfhealing.app" style={{ color: GOLD, textDecoration: "none" }}>www.pemfhealing.app</a> · © 2025
        </footer>
      </div>
    </div>
  );
}
