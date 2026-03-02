import React, { useState, useEffect, useRef } from 'react'
import Viewport from './components/Viewport'
import { LEVELS } from './LevelManager'

interface FloatingScore { id: number; value: string; x: number; y: number; }

// --- REFINED QUICK TIP COMPONENT ---
interface QuickTipProps {
    label: string;
    short: string;
    long: string;
    top?: string;
    left?: string;
    right?: string;
    bottom?: string;
    expanded: boolean;
    setExpanded: (e: React.MouseEvent) => void;
    arrowDir?: 'left' | 'right' | 'up' | 'down';
}

const QuickTip: React.FC<QuickTipProps> = ({ label, short, long, top, left, right, bottom, expanded, setExpanded, arrowDir }) => (
    <div style={{ position: 'absolute', top, left, right, bottom, zIndex: expanded ? 3000 : 1000, pointerEvents: 'auto', display: 'flex', flexDirection: arrowDir === 'right' ? 'row' : 'row-reverse', alignItems: 'center', gap: '0px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: arrowDir === 'right' ? 'flex-end' : 'flex-start', filter: 'drop-shadow(0 4px 15px rgba(0,0,0,0.4))' }}>
            <div style={{ background: 'rgba(0,0,0,0.95)', border: '1px solid #444', padding: '6px 12px', borderRadius: '2px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'default' }}>
                <span style={{ fontSize: '9px', color: '#eee', fontWeight: 'bold', letterSpacing: '1px' }}>{label}: {short}</span>
                <button onClick={setExpanded} style={{ background: '#f1c40f', border: 'none', color: '#000', fontSize: '10px', padding: '1px 5px', cursor: 'pointer', fontWeight: 'bold', borderRadius: '1px' }}>...</button>
            </div>
            {expanded && (
                <div style={{ marginTop: '8px', background: '#f1c40f', color: '#000', padding: '12px', borderRadius: '2px', fontSize: '10px', maxWidth: '220px', lineHeight: '1.5', fontWeight: 'bold', boxShadow: '0 10px 40px rgba(0,0,0,0.6)', border: '1px solid #000' }}>
                    {long}
                </div>
            )}
        </div>
        {!expanded && (
            <div style={{ width: '15px', height: '1px', background: '#f1c40f', position: 'relative' }}>
                <div style={{ position: 'absolute', right: arrowDir === 'right' ? '-2px' : 'auto', left: arrowDir === 'left' ? '-2px' : 'auto', top: '-3.5px', width: '0', height: '0', borderTop: '4.5px solid transparent', borderBottom: '4.5px solid transparent', borderLeft: arrowDir === 'right' ? '7px solid #f1c40f' : 'none', borderRight: arrowDir === 'left' ? '7px solid #f1c40f' : 'none' }} />
            </div>
        )}
    </div>
);

function App() {
  const [levelIndex, setLevelIndex] = useState(0)
  const [operations, setOperations] = useState<any[]>([])
  const [activeStep, setActiveStep] = useState(0)
  const [totalScore, setTotalScore] = useState(0)
  const [levelStartTime, setLevelStartTime] = useState(Date.now())
  const [moveCount, setMoveCount] = useState(0)
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false)
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([])
  const [levelProgress, setLevelProgress] = useState(0)
  const [showBlueprint, setShowBlueprint] = useState(false)
  const [blueprintUsed, setBlueprintUsed] = useState(false)
  const [hoverNext, setHoverNext] = useState(false)
  const [showNumericInput, setShowNumericInput] = useState(false)
  const [isGameComplete, setIsGameComplete] = useState(false)
  const [showExtraHint, setShowExtraHint] = useState(false)
  const [secretClickCount, setSecretClickCount] = useState(0)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [inputStates, setInputStates] = useState<string[]>(["1", "1", "1", "1"])
  const [expandedTip, setExpandedTip] = useState<string | null>(null)
  const [showPerfectWarning, setShowPerfectWarning] = useState(false)
  const [showLabels, setShowLabels] = useState(true)
  const [autoHint, setAutoHint] = useState<string | null>(null)
  const [tutorialActive, setTutorialActive] = useState(true)
  
  // --- MOBILE OPTIMIZATION STATE ---
  const [isMobile, setIsMobile] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [showMobileTutorial, setShowMobileTutorial] = useState(false)

  const [isDetached, setIsDetached] = useState(false);
  const [logPos, setLogPos] = useState({ x: window.innerWidth - 355, y: 580 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const logPlaceholderRef = useRef<HTMLDivElement>(null);

  const currentLevel = LEVELS[levelIndex]
  const showTutorial = levelIndex === 0 && tutorialActive && !isMobile;

  useEffect(() => {
    const checkMobile = () => {
        const mobileMatch = window.matchMedia("(max-width: 768px)").matches;
        setIsMobile(mobileMatch);
        if (mobileMatch) {
            setMobileSidebarOpen(false); // Start collapsed on mobile
            setShowMobileTutorial(true);
        }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (levelIndex > 0) setIsHeaderCollapsed(true);
    else setIsHeaderCollapsed(false);
    setLevelStartTime(Date.now());
    setMoveCount(0);
    setLevelProgress(0);
    setBlueprintUsed(false);
    setActiveStep(0);
    setShowExtraHint(false);
    setSecretClickCount(0);
  }, [levelIndex]);

  useEffect(() => {
    if (activeStep > 0) {
        const op = operations[activeStep - 1];
        if (op && op.scale) {
            setInputStates([ String(op.scale[0]), String(op.scale[1]), String(op.scale[2]), String(op.scale[0]) ]);
        }
    }
  }, [activeStep, operations]);

  useEffect(() => {
    if (moveCount > currentLevel.minMoves * 2 && levelProgress < 99.8) {
        let hint = currentLevel.hint;
        const hasSubtract = operations.some(o => o.type.includes('subtract'));
        const hasRotate = operations.some(o => o.rotation && o.rotation.some((r:number) => r !== 0));
        if (levelProgress < 20) hint = "Check Blueprints for base shapes & dimensions.";
        else if ((levelIndex === 1 || levelIndex === 2) && !hasSubtract) hint = "Use [−] Subtract (L-Click) for the hole.";
        else if (levelIndex === 3 && !hasRotate) hint = "Try rotating the branch 90° on Y.";
        else if (levelProgress > 80) hint = "You are close! Fine-tune Size (±0.1) or Move (±10).";
        setAutoHint(hint);
    } else {
        setAutoHint(null);
    }
  }, [moveCount, levelProgress, currentLevel, operations, levelIndex]);

  const onSecretClick = () => {
      const newCount = secretClickCount + 1;
      setSecretClickCount(newCount);
      if (newCount >= 5) { setIsGameComplete(true); setShowBlueprint(false); }
  };

  const startGameplay = () => { if (tutorialActive) setTutorialActive(false); }

  const addFloatingScore = (val: string) => {
    const id = Date.now();
    setFloatingScores(prev => [...prev, { id, value: val, x: 280, y: window.innerHeight - 100 }]);
    setTimeout(() => { setFloatingScores(prev => prev.filter(s => s.id !== id)); }, 1500);
  }

  const addOp = (type: string, isSubtract: boolean = false) => {
    startGameplay();
    if (levelProgress >= 99.8) {
        setShowPerfectWarning(true);
        setTimeout(() => setShowPerfectWarning(false), 3000);
    }
    const opType = isSubtract ? `subtract${type}` : `add${type}`;
    const newOps = operations.slice(0, activeStep);
    newOps.push({ type: opType, scale: [1, 1, 1], translate: [0, 0, 0], rotation: [0, 0, 0], id: Date.now() });
    setOperations(newOps);
    setActiveStep(newOps.length);
    setMoveCount(prev => prev + 1);
  }

  const handleDualClick = (e: React.MouseEvent, type: string) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const isSubtract = (e.clientX - rect.left) < rect.width / 2;
      if (levelIndex + 1 < 4) {
          if (type === 'Cube' || type === 'Tetra') addOp(type, false);
          if (type === 'Cylinder') addOp(type, true);
          return;
      }
      addOp(type, isSubtract);
  }

  const adjustTransform = (type: 'translate' | 'scale' | 'rotation', axis: number, delta: number) => {
      startGameplay();
      if (activeStep === 0) return;
      const newOps = [...operations];
      const targetOp = { ...newOps[activeStep - 1] };
      const arr = [...(targetOp[type] || (type === 'scale' ? [1,1,1] : [0,0,0]))];
      if (type === 'scale') arr[axis] = Math.max(0.1, Number((arr[axis] + delta).toFixed(1)));
      else if (type === 'rotation') arr[axis] = (arr[axis] + delta) % 360;
      else arr[axis] += delta;
      targetOp[type] = arr;
      newOps[activeStep - 1] = targetOp;
      setOperations(newOps);
      setMoveCount(prev => prev + 1);
  }

  const setNumericTransform = (type: 'translate' | 'scale' | 'rotation', axis: number, value: number) => {
      startGameplay();
      if (activeStep === 0) return;
      const newOps = [...operations];
      const targetOp = { ...newOps[activeStep - 1] };
      const arr = [...(targetOp[type] || (type === 'scale' ? [1,1,1] : [0,0,0]))];
      arr[axis] = value;
      targetOp[type] = arr;
      newOps[activeStep - 1] = targetOp;
      setOperations(newOps);
  }

  const setUniformScale = (val: number) => {
      startGameplay();
      if (activeStep === 0) return;
      const newOps = [...operations];
      const targetOp = { ...newOps[activeStep - 1] };
      targetOp.scale = [val, val, val];
      newOps[activeStep - 1] = targetOp;
      setOperations(newOps);
  }

  const nextLevel = () => {
    const timeElapsed = (Date.now() - levelStartTime) / 1000;
    const timeBonus = Math.max(0, Math.floor(100 - timeElapsed));
    const moveBonus = Math.max(0, Math.floor(50 - (moveCount * 2)));
    const earned = 100 + timeBonus + moveBonus;
    setTotalScore(prev => prev + earned);
    addFloatingScore(`+${earned}`);
    if (levelIndex < LEVELS.length - 1) {
      setLevelIndex(levelIndex + 1);
      setOperations([]);
      setActiveStep(0);
    } else {
        setIsGameComplete(true);
    }
  }

  const getFidelityGrade = (prog: number) => {
      if (prog >= 99.8) return { text: "PERFECT", bonus: 100 };
      if (prog >= 95) return { text: "CLOSE ENOUGH", bonus: 50 };
      if (prog >= 85) return { text: "GOOD FIT", bonus: 20 };
      if (prog >= 70) return { text: "TOO BIG BUT WILL LET IT SLIDE", bonus: 0 };
      return { text: "NEEDS ADJUSTMENT", bonus: -10 };
  }

  const startDrag = (e: React.MouseEvent) => {
      setIsDragging(true);
      const startX = isDetached ? logPos.x : (window.innerWidth - 380 + 25);
      const startY = isDetached ? logPos.y : (logPlaceholderRef.current?.getBoundingClientRect().top || 0);
      dragOffset.current = { x: e.clientX - startX, y: e.clientY - startY };
      setIsDetached(true);
  }

  useEffect(() => {
      const onMouseMove = (e: MouseEvent) => { if (isDragging) setLogPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y }); };
      const onMouseUp = (e: MouseEvent) => { if (!isDragging) return; setIsDragging(false); if (e.clientX > window.innerWidth - 400) setIsDetached(false); };
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, [isDragging]);

  const isAdvancedMode = (levelIndex + 1) >= 4;
  const activeOpsToRender = operations.slice(0, activeStep);
  const grade = getFidelityGrade(levelProgress);

  const sidebarBg = theme === 'dark' ? '#111' : '#f5f5f5';
  const sidebarColor = theme === 'dark' ? '#eee' : '#222';
  const subBg = theme === 'dark' ? '#0a0a0a' : '#fff';
  const borderColor = theme === 'dark' ? '#222' : '#ddd';

  // --- MOBILE LAYOUT LOGIC ---
  const sidebarPosition = isMobile 
    ? { position: 'absolute', top: 0, left: mobileSidebarOpen ? 0 : '100vw', transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)', width: '100vw' } 
    : { width: '380px' };

  const logContent = (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: subBg }}>
        <div onMouseDown={startDrag} style={{ ...dragHandleStyle, background: theme === 'dark' ? '#111' : '#eee', borderColor, color: theme === 'dark' ? '#444' : '#888', cursor: isDragging ? 'grabbing' : 'grab' }}>
            <span>SEQUENTIAL_LOG</span>
            <span style={{ fontSize: '8px', opacity: 0.4 }}>{isDetached ? '[DETACHED]' : '[DOCKED]'}</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px', scrollbarWidth: 'none' }}>
            {operations.length === 0 && <div style={{ fontSize: '10px', color: '#333', textAlign: 'center', padding: '10px' }}>NO_RECORDS</div>}
            {operations.map((op, i) => (
                <div key={op.id} onClick={() => { setActiveStep(i + 1); if(isMobile) setMobileSidebarOpen(false); }} style={{ 
                    ...opItemStyle, borderColor, opacity: (i+1) > activeStep ? 0.3 : 1, 
                    background: (i+1) === activeStep ? (theme === 'dark' ? '#1a1a1a' : '#f0f0f0') : 'transparent'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', color: (i+1) === activeStep ? sidebarColor : '#666' }}>{String(i+1).padStart(2,'0')} // {op.type.toUpperCase()}</span>
                    <span style={{ fontSize: '9px', color: op.type.includes('sub') ? '#c0392b' : '#27ae60' }}>{op.type.includes('sub') ? '[−]' : '[+]'}</span>
                  </div>
                </div>
            ))}
        </div>
        <div style={{ borderTop: `1px solid ${borderColor}`, padding: '5px 10px', display: 'flex', justifyContent: 'flex-end', background: subBg }}>
            <button onClick={()=>{ startGameplay(); setOperations([]);setActiveStep(0);}} style={{ background: 'transparent', border: 'none', color: '#c0392b', fontSize: '9px', cursor: 'pointer' }}>[WIPE]</button>
        </div>
    </div>
  );

  return (
    <div className="App" style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden', display: 'flex', position: 'relative', backgroundColor: subBg, fontFamily: '"IBM Plex Mono", monospace', color: sidebarColor }}>
      {/* VIEWPORT CONTAINER: Always 100% on mobile, flex-1 on desktop */}
      <div style={{ flex: 1, position: 'relative', height: '100%', width: isMobile ? '100vw' : 'auto' }}>
        <Viewport currentLevel={currentLevel} userOperations={activeOpsToRender} theme={theme} showLabels={showLabels} setShowLabels={(s)=>{ startGameplay(); setShowLabels(s); }} onMeshUpdated={(_, f)=>setLevelProgress(f)} />
        
        {/* MOBILE CONTROLS */}
        {isMobile && (
            <>
                {/* PERSISTENT MOBILE HEADER (Startup Only) */}
                {levelIndex === 0 && tutorialActive && (
                    <div style={{ position: 'absolute', top: '25px', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', pointerEvents: 'none', zIndex: 30 }}>
                        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', letterSpacing: '4px', textTransform: 'uppercase', color: sidebarColor, textShadow: theme === 'dark' ? '0 2px 10px rgba(0,0,0,0.8)' : '0 2px 10px rgba(255,255,255,0.8)' }}>Design Gauntlet</h1>
                        <div style={{ fontSize: '8px', color: '#888', marginTop: '4px', letterSpacing: '1px' }}>TAP YELLOW BUTTON [≡] FOR CAD CONTROLS</div>
                    </div>
                )}

                {/* FLOATING MOBILE TOGGLE */}
                <button 
                    onClick={() => { setMobileSidebarOpen(!mobileSidebarOpen); setShowMobileTutorial(false); }}
                    style={{ position: 'absolute', bottom: '20px', right: '20px', width: '50px', height: '50px', borderRadius: '25px', background: '#f1c40f', color: '#000', border: '2px solid #000', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.5)', cursor: 'pointer', animation: showMobileTutorial ? 'pulse 1.5s infinite ease-in-out' : 'none' }}
                >
                    <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{mobileSidebarOpen ? '×' : '≡'}</span>
                </button>

                {/* MOBILE TUTORIAL POPUP */}
                {showMobileTutorial && (
                    <div style={{ position: 'absolute', bottom: '80px', right: '20px', background: '#f1c40f', color: '#000', padding: '12px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', width: '180px', border: '1px solid #000', zIndex: 40, boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
                        MOBILE MODE: Tap the yellow button to open CAD controls. Orbit/Zoom using touch gestures.
                        <div style={{ position: 'absolute', bottom: '-10px', right: '15px', width: 0, height: 0, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderTop: '10px solid #f1c40f' }} />
                    </div>
                )}
            </>
        )}

        {/* THEME TOGGLE */}
        {(!isMobile || mobileSidebarOpen) && (
            <button 
                onClick={() => { startGameplay(); setTheme(t => t === 'dark' ? 'light' : 'dark'); }}
                style={{ position: 'absolute', top: '25px', left: '25px', background: 'transparent', border: 'none', color: '#444', padding: '10px', cursor: 'pointer', zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(135deg)' }}
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
                <div style={{ width: '12px', height: '16px', position: 'relative' }}>
                    {/* Flashlight Head (Wide Part) */}
                    <div style={{ width: '12px', height: '5px', border: '1px solid currentColor', borderRadius: '1px 1px 5px 5px', position: 'absolute', top: 0, left: 0, background: theme === 'light' ? 'currentColor' : 'transparent' }} />
                    {/* Flashlight Body (Cylinder) */}
                    <div style={{ width: '6px', height: '10px', border: '1px solid currentColor', borderRadius: '0 0 1px 1px', position: 'absolute', top: '5px', left: '3px' }} />
                    
                    {/* Light Beam Effect */}
                    {theme === 'light' && (
                        <div style={{ position: 'absolute', top: '-15px', left: '-14px', width: '40px', height: '40px', background: 'radial-gradient(circle, rgba(241, 196, 15, 0.4) 0%, transparent 70%)', pointerEvents: 'none' }} />
                    )}
                </div>
            </button>
        )}

        {/* TUTORIAL OVERLAY (Level 1 only, Hidden on Mobile) */}
        {showTutorial && (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 100 }}>
                <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(241, 196, 15, 0.95)', color: '#000', padding: '12px 40px', borderRadius: '4px', border: '1px solid #000', zIndex: 1000, textAlign: 'center', boxShadow: '0 8px 30px rgba(0,0,0,0.5)', pointerEvents: 'auto' }}>
                    <strong style={{ fontSize: '16px', letterSpacing: '2px' }}>Tutorial:</strong>
                    <div style={{ fontSize: '11px', marginTop: '6px', fontWeight: 'bold' }}>Click [ ... ] for technical info. Click any button (hint: Tetra [+]) to dismiss & began gameplay.</div>
                </div>

                <QuickTip label="MODE" short="Theme Toggle" long="Toggle between Dark and Light architectural themes. Flashlight pointing toward the grid." top="25px" left="60px" arrowDir="left" expanded={expandedTip === 'mode'} setExpanded={(e) => { e.stopPropagation(); setExpandedTip(expandedTip === 'mode' ? null : 'mode'); }} />
                <QuickTip label="STATS" short="Move Efficiency" long="Track your Move Efficiency and Total Score. Minimal moves = Maximum bonus points!" top="115px" right="35px" arrowDir="right" expanded={expandedTip === 'stats'} setExpanded={(e) => { e.stopPropagation(); setExpandedTip(expandedTip === 'stats' ? null : 'stats'); }} />
                <QuickTip label="LVL INFO" short="Blueprints" long="Open 2D technical sketches and step-by-step logic help. Costs 50 points but clarifies geometry." top="170px" right="35px" arrowDir="right" expanded={expandedTip === 'bp'} setExpanded={(e) => { e.stopPropagation(); setExpandedTip(expandedTip === 'bp' ? null : 'bp'); }} />
                <QuickTip label="HINT" short="Logic Guide" long="Quick guidance on the logic needed for this phase. Check this if you're stuck on Booleans." top="235px" right="35px" arrowDir="right" expanded={expandedTip === 'hint'} setExpanded={(e) => { e.stopPropagation(); setExpandedTip(expandedTip === 'hint' ? null : 'hint'); }} />
                <QuickTip label="PRIMITIVES" short="Add base shapes" long="Tetra +, Cube +, and Cylinder -. +/- for all shapes unlocks LVL 4." top="300px" right="35px" arrowDir="right" expanded={expandedTip === 'prim'} setExpanded={(e) => { e.stopPropagation(); setExpandedTip(expandedTip === 'prim' ? null : 'prim'); }} />
                <QuickTip label="LOG" short="Time Machine" long="History of operations. Drag to detach, or click any step to 'Time Travel' and edit dimensions. WIPE to reset level." top="460px" right="35px" arrowDir="right" expanded={expandedTip === 'log'} setExpanded={(e) => { e.stopPropagation(); setExpandedTip(expandedTip === 'log' ? null : 'log'); }} />
                <QuickTip label="FIDELITY" short="Match accuracy" long="Your match accuracy. Reach 100% for smooth-shading reward! 70% required to pass to next phase." bottom="85px" right="35px" arrowDir="right" expanded={expandedTip === 'fid'} setExpanded={(e) => { e.stopPropagation(); setExpandedTip(expandedTip === 'fid' ? null : 'fid'); }} />
                <QuickTip label="NAVIGATE" short="Orbit/Zoom" long="Resets view to default perspective. MOUSE: Orbit (L-Click), Pan (R-Click), Zoom (Scroll). TOUCH: Drag to orbit, 2-finger pinch/drag to zoom/pan." top="20px" right="53px" arrowDir="right" expanded={expandedTip === 'nav'} setExpanded={(e) => { e.stopPropagation(); setExpandedTip(expandedTip === 'nav' ? null : 'nav'); }} />
                <QuickTip label="X,Y,Z" short="Axis Legend" long="Toggles the X, Y, and Z axis legend for spatial orientation. Essential for complex rotations." bottom="20px" right="53px" arrowDir="right" expanded={expandedTip === 'xyz'} setExpanded={(e) => { e.stopPropagation(); setExpandedTip(expandedTip === 'xyz' ? null : 'xyz'); }} />
            </div>
        )}

        {showPerfectWarning && (
            <div style={{ position: 'absolute', bottom: '100px', left: '50%', transform: 'translateX(-50%)', background: '#2ecc71', color: '#000', padding: '10px 20px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', zIndex: 1000, boxShadow: '0 4px 20px rgba(0,0,0,0.5)', animation: 'pop 0.3s ease-out' }}>
                PERFECT MATCH ACHIEVED! CLICK {">>"} TO CONTINUE
            </div>
        )}

        {autoHint && (
            <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: '#fff', color: '#000', padding: '10px 20px', borderRadius: '2px', fontSize: '10px', fontWeight: 'bold', zIndex: 500, border: '1px solid #000', maxWidth: '400px', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
                HINT: {autoHint}
            </div>
        )}
      </div>

      {showBlueprint && (
        <div style={blueprintOverlayStyle}>
           <div style={blueprintModalStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.3)', paddingBottom: '10px', marginBottom: '20px' }}>
                 <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>Blueprints // {currentLevel.name}</h2>
                 <button onClick={() => setShowBlueprint(false)} style={{ background: 'transparent', color: '#fff', border: 'none', fontSize: '16px', cursor: 'pointer' }}>CLOSE [X]</button>
              </div>
              <div style={{ display: 'flex', gap: '40px', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', gap: '40px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        {currentLevel.sketch(onSecretClick)}
                    </div>
                    <pre style={{ flex: 1, whiteSpace: 'pre-wrap', lineHeight: '2', fontSize: '13px', color: '#bdc3c7', margin: 0 }}>
                        {currentLevel.blueprint}
                    </pre>
                  </div>
                  {currentLevel.extraHint && (
                      <div style={{ borderTop: '1px solid #222', paddingTop: '20px' }}>
                          <button onClick={() => setShowExtraHint(!showExtraHint)} style={blueprintBtnStyle}>{showExtraHint ? "HIDE EXTRA HINT" : "SHOW ADVANCED HINT"}</button>
                          {showExtraHint && <div style={{ marginTop: '15px', color: '#f1c40f', fontSize: '12px', borderLeft: '3px solid #f1c40f', paddingLeft: '15px', lineHeight: '1.6' }}>{currentLevel.extraHint}</div>}
                      </div>
                  )}
              </div>
           </div>
        </div>
      )}

      {isGameComplete && (
          <div style={{ ...blueprintOverlayStyle, flexDirection: 'column', justifyContent: 'flex-start', paddingTop: '5vh' }}>
              <div style={{ ...blueprintModalStyle, textAlign: 'center', maxWidth: '550px' }}>
                  <h1 style={{ color: '#fff', fontSize: '32px', letterSpacing: '4px', marginBottom: '10px' }}>YOU WIN!</h1>
                  <p style={{ color: '#bdc3c7', marginBottom: '30px' }}>Design Gauntlet Completed successfully.</p>
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', border: '1px solid #333', marginBottom: '30px' }}>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>TOTAL_SCORE_ACHIEVED</div>
                      <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#f1c40f' }}>{totalScore}</div>
                  </div>
                  <p style={{ color: '#eee', fontSize: '14px', marginBottom: '20px' }}>More Levels Coming Soon!</p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
                      <a href="https://www.youtube.com/@RandoTechNerd" target="_blank" style={socialLinkStyle}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff4d4d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="4"></rect><path d="M10 9l5 3-5 3V9z"></path></svg>
                          YouTube
                      </a>
                      <a href="https://randotechnerd.com/" target="_blank" style={socialLinkStyle}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3498db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M3.6 9h16.8M3.6 15h16.8"></path><path d="M12 3a15.3 15.3 0 0 1 4 9 15.3 15.3 0 0 1-4 9 15.3 15.3 0 0 1-4-9 15.3 15.3 0 0 1 4-9z"></path></svg>
                          randotechnerd.com
                      </a>
                  </div>

                  <div style={{ marginTop: '25px', padding: '15px', background: 'rgba(0,0,0,0.2)', border: '1px solid #222', borderRadius: '4px' }}>
                      <p style={{ fontSize: '11px', color: '#666', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>
                          Powered by <strong><a href="https://brep.io/" target="_blank" style={{ color: '#eee', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            BREP.io <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M3.6 9h16.8M3.6 15h16.8"></path><path d="M12 3a15.3 15.3 0 0 1 4 9 15.3 15.3 0 0 1-4 9 15.3 15.3 0 0 1-4-9 15.3 15.3 0 0 1 4-9z"></path></svg>
                          </a></strong> (Open Source)
                      </p>
                      <a href="https://youtu.be/8njaTHLfm14?si=rqZKESq3kXj0rIhq" target="_blank" style={{ ...socialLinkStyle, background: '#111', border: '1px solid #c0392b', fontSize: '12px', justifyContent: 'center' }}>
                          🚀 WATCH YOUTUBE INTRO
                      </a>
                      <p style={{ fontSize: '10px', color: '#444', marginTop: '8px' }}>Create custom designs on the full platform</p>
                  </div>

                  <button onClick={() => window.location.reload()} style={{ ...blueprintBtnStyle, marginTop: '30px', height: 'auto', padding: '10px 20px', fontSize: '12px' }}>RESTART_GAUNTLET</button>
              </div>

              <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
                  <svg viewBox="0 0 1000 1000" style={{ width: '100%', height: '100%', position: 'absolute', bottom: 0, overflow: 'visible' }}>
                      <g className="tank-wrap">
                          <g className="tank-body" transform="translate(0, 850)">
                              <path d="M 20 130 L 120 130 L 140 110 L 120 90 L 20 90 L 0 110 Z" fill="rgba(46,204,113,0.1)" stroke="#2ecc71" strokeWidth="3" />
                              <path d="M 30 90 L 110 90 L 90 60 L 50 60 Z" fill="rgba(46,204,113,0.1)" stroke="#2ecc71" strokeWidth="3" />
                              <g className="turret" style={{ transformOrigin: '70px 60px' }}>
                                  <path d="M 60 60 L 80 60 L 80 45 L 60 45 Z" fill="#1a1a1a" stroke="#2ecc71" strokeWidth="3" />
                                  <line x1="80" y1="52" x2="150" y2="52" stroke="#2ecc71" strokeWidth="5" />
                                  <circle cx="150" cy="52" r="10" fill="white" className="flash" />
                                  <circle cx="150" cy="52" r="4" fill="#f1c40f" className="projectile proj1" />
                                  <circle cx="150" cy="52" r="4" fill="#3498db" className="projectile proj2" />
                                  <circle cx="150" cy="52" r="4" fill="#e74c3c" className="projectile proj3" />
                              </g>
                          </g>
                      </g>
                  </svg>
                  <div className="fw fw1"></div>
                  <div className="fw fw2"></div>
                  <div className="fw fw3"></div>
              </div>
          </div>
      )}

      {isDetached && <div style={{ ...detachedLogStyle, left: logPos.x, top: logPos.y, opacity: isDragging ? 0.8 : 1 }}>{logContent}</div>}

      <div style={{ ...(sidebarPosition as any), height: '100vh', background: sidebarBg, color: sidebarColor, display: 'flex', flexDirection: 'column', borderLeft: isMobile ? 'none' : `1px solid ${borderColor}`, zIndex: isMobile ? 100 : 10 }}>
        {isMobile && (
             <div style={{ padding: '15px 20px', borderBottom: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#000', color: '#f1c40f' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '2px' }}>CAD_CONTROLS</span>
                <button onClick={() => setMobileSidebarOpen(false)} style={{ background: 'transparent', border: 'none', color: '#f1c40f', fontSize: '18px', cursor: 'pointer' }}>[X]</button>
             </div>
        )}
        <div style={{ padding: isHeaderCollapsed ? '15px 25px' : '30px', borderBottom: `1px solid ${borderColor}`, position: 'relative' }}>
          {!isHeaderCollapsed ? (
            <div style={{ position: 'relative' }}>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase' }}>Design Gauntlet</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <p style={{ color: '#666', fontSize: '10px', margin: '2px 0 0 0', textTransform: 'uppercase' }}>Computational Geometry Trainer</p>
                    <a href="https://brep.io/" target="_blank" style={{ color: '#444', fontSize: '10px', textDecoration: 'none', borderBottom: '1px solid #333', marginTop: '2px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>powered by BREP.io <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M3.6 9h16.8M3.6 15h16.8"></path><path d="M12 3a15.3 15.3 0 0 1 4 9 15.3 15.3 0 0 1-4 9 15.3 15.3 0 0 1-4-9 15.3 15.3 0 0 1 4-9z"></path></svg></a>
                </div>
            </div>
          ) : (
            <div style={{ fontSize: '10px', color: '#444', fontWeight: 'bold', letterSpacing: '1px' }}>SYSTEM.V2.5 // Z-UP</div>
          )}
          <button onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)} style={toggleBtnStyle}>{isHeaderCollapsed ? '▼' : '▲'}</button>
        </div>

        <div style={{ display: 'flex', background: subBg, padding: '10px 25px', fontSize: '9px', borderBottom: `1px solid ${borderColor}`, justifyContent: 'space-between', color: '#555', position: 'relative' }}>
            <span>MOVES // {moveCount}</span>
            <span>SCORE // <span style={{ color: sidebarColor }}>{totalScore}</span></span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 25px', scrollbarWidth: 'none' }}>
          <div style={{ marginBottom: '20px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#444', fontSize: '9px', fontWeight: 'bold' }}>LVL {levelIndex + 1}</span>
                <button onClick={()=>{ if(!blueprintUsed){setTotalScore(s=>s-50); setBlueprintUsed(true); addFloatingScore("-50");} setShowBlueprint(true); }} style={blueprintBtnStyle}>BLUEPRINTS</button>
            </div>
            <h2 style={{ color: theme === 'dark' ? '#fff' : '#000', margin: '0 0 5px 0', fontSize: '16px', textTransform: 'uppercase' }}>{currentLevel.name}</h2>
            <p style={{ fontSize: '11px', color: '#666', lineHeight: '1.5', marginBottom: '10px' }}>{currentLevel.description}</p>
            <div style={{ fontSize: '10px', color: '#888', borderLeft: `2px solid ${borderColor}`, paddingLeft: '10px', position: 'relative' }}>{currentLevel.hint}</div>
          </div>

          <div style={{ display: 'grid', gap: '8px', position: 'relative' }}>
            <div style={{ fontSize: '9px', color: '#444', fontWeight: 'bold' }}>{isAdvancedMode ? "SMART_PRIMITIVES: [L]SUB | [R]ADD" : "PRIMITIVES:"}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {renderButton('Tetra', 'Tetra', isAdvancedMode, true)}
                {renderButton('Cube', 'Cube', isAdvancedMode, true)}
            </div>
            {renderButton('Cylinder', 'Cylinder', isAdvancedMode, true)}
          </div>

          {activeStep > 0 && (
            <div style={{ ...transformPanelStyle, background: subBg, borderColor }}>
                <div style={{ fontSize: '9px', color: '#444', fontWeight: 'bold', marginBottom: '15px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>MODIFIER_S{activeStep}</span>
                    <span style={{ color: sidebarColor }}>{operations[activeStep-1].type.toUpperCase()}</span>
                </div>
                <div style={controlRowStyle}><span style={controlLabelStyle}>MOVE</span>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {['X','Y','Z'].map((axis, i) => <div key={axis} style={{ ...btnGroupStyle, borderColor }}>
                            <button onClick={()=>adjustTransform('translate',i,-10)} style={{ ...tBtn, color: sidebarColor }}>-</button>
                            <span style={{ fontSize: '8px', padding: '0 3px', color: '#444' }}>{axis}</span>
                            <button onClick={()=>adjustTransform('translate',i,10)} style={{ ...tBtn, color: sidebarColor }}>+</button>
                        </div>)}
                    </div>
                </div>
                <div style={{ ...controlRowStyle, marginBottom: '15px' }}><span style={controlLabelStyle}>SIZE</span>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {['X','Y','Z'].map((axis, i) => <div key={axis} style={{ ...btnGroupStyle, borderColor }}>
                            <button onClick={()=>adjustTransform('scale',i,-0.1)} style={{ ...tBtn, color: sidebarColor }}>-</button>
                            <span style={{ fontSize: '8px', padding: '0 3px', color: '#444' }}>{axis}</span>
                            <button onClick={()=>adjustTransform('scale',i,0.1)} style={{ ...tBtn, color: sidebarColor }}>+</button>
                        </div>)}
                        <button onClick={() => setShowNumericInput(!showNumericInput)} style={{ ...rBtn, color: sidebarColor, background: theme === 'dark' ? '#1a1a1a' : '#eee', borderColor, marginLeft: '5px', padding: '2px 6px' }}>...</button>
                    </div>
                </div>

                {showNumericInput && (
                    <div style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', padding: '10px', marginTop: '5px', marginBottom: '15px', border: `1px solid ${borderColor}` }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between' }}>
                                {['X','Y','Z'].map((axis, i) => (
                                    <div key={axis} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                        <span style={{ fontSize: '8px', color: '#444', marginRight: '2px' }}>{axis}:</span>
                                        <div style={{ ...btnGroupStyle, borderColor, background: subBg }}>
                                            <button onClick={()=>adjustTransform('scale',i,-0.1)} style={{ ...tBtn, color: sidebarColor, padding: '0 4px' }}>-</button>
                                            <input type="text" value={inputStates[i]} onChange={(e) => { const val = e.target.value; const newStates = [...inputStates]; newStates[i] = val; setInputStates(newStates); const num = parseFloat(val); if (!isNaN(num)) setNumericTransform('scale', i, num); }} style={{ ...numInputStyle, border: 'none', textAlign: 'center', width: '25px' }} />
                                            <button onClick={()=>adjustTransform('scale',i,0.1)} style={{ ...tBtn, color: sidebarColor, padding: '0 4px' }}>+</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', borderTop: `1px solid ${borderColor}`, paddingTop: '8px' }}>
                                <span style={{ fontSize: '8px', color: theme === 'dark' ? '#eee' : '#444' }}>UNIFORM SCALE:</span>
                                <div style={{ ...btnGroupStyle, borderColor, background: subBg }}>
                                    <button onClick={()=>{ const newVal = Math.max(0.1, Number((parseFloat(inputStates[3]) - 0.1).toFixed(1))); setUniformScale(newVal); setInputStates([String(newVal), String(newVal), String(newVal), String(newVal)]); }} style={{ ...tBtn, color: sidebarColor, padding: '0 6px' }}>-</button>
                                    <input type="text" value={inputStates[3]} onChange={(e) => { const val = e.target.value; const newStates = [val, val, val, val]; setInputStates(newStates); const num = parseFloat(val); if (!isNaN(num)) setUniformScale(num); }} style={{ ...numInputStyle, border: 'none', textAlign: 'center', width: '35px' }} />
                                    <button onClick={()=>{ const newVal = Number((parseFloat(inputStates[3]) + 0.1).toFixed(1)); setUniformScale(newVal); setInputStates([String(newVal), String(newVal), String(newVal), String(newVal)]); }} style={{ ...tBtn, color: sidebarColor, padding: '0 6px' }}>+</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div style={controlRowStyle}><span style={controlLabelStyle}>TURN</span>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {['X','Y','Z'].map((axis, i) => <button key={axis} onClick={()=>adjustTransform('rotation',i,90)} style={{ ...rBtn, color: sidebarColor, background: theme === 'dark' ? '#1a1a1a' : '#eee', borderColor }}>{axis} 90°</button>)}
                    </div>
                </div>
            </div>
          )}

          <div ref={logPlaceholderRef} style={{ marginTop: '20px', borderTop: `1px solid ${borderColor}`, paddingTop: '15px', minHeight: '20px', position: 'relative' }}>
              {!isDetached ? logContent : ( <div style={{ fontSize: '8px', color: '#444', textAlign: 'center', lineHeight: '20px', border: `1px dashed ${borderColor}`, textTransform: 'uppercase' }}>LOG_DETACHED</div> )}
          </div>
        </div>

        {levelIndex === 0 ? (
            <div style={{ padding: '20px 25px', borderTop: `1px solid ${borderColor}`, background: subBg, position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                    <span style={{ color: '#444', fontSize: '9px', fontWeight: 'bold' }}>FIDELITY</span>
                    <span className={levelProgress >= 99.8 ? "perfect-pop" : ""} style={{ color: sidebarColor, fontSize: '12px', fontWeight: 'bold' }}>{Math.floor(levelProgress)}%</span>
                </div>
                <div onMouseEnter={() => setHoverNext(true)} onMouseLeave={() => setHoverNext(false)} style={{ cursor: levelProgress < 70 ? 'help' : 'pointer' }}>
                    <button 
                        disabled={levelProgress < 70} 
                        onClick={() => { nextLevel(); if(isMobile) setMobileSidebarOpen(false); }} 
                        className={levelProgress >= 99.8 ? "perfect-pulse" : ""} 
                        style={{ ...nextBtnStyle, background: theme === 'dark' ? '#eee' : '#222', color: theme === 'dark' ? '#000' : '#fff', opacity: levelProgress < 70 ? 0.5 : 1, pointerEvents: levelProgress < 70 ? 'none' : 'auto' }}
                    >
                        {levelProgress < 70 && hoverNext ? "Align Primitives to Advance" : (hoverNext ? grade.text : "NEXT_LVL_>>")}
                    </button>
                </div>
            </div>
        ) : (
            <div style={{ padding: '8px 25px', borderTop: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: subBg }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ color: '#444', fontSize: '8px', fontWeight: 'bold' }}>FIDELITY</span>
                    <span className={levelProgress >= 99.8 ? "perfect-pop" : ""} style={{ color: sidebarColor, fontSize: '10px', fontWeight: 'bold' }}>{Math.floor(levelProgress)}%</span>
                </div>
                <div onMouseEnter={() => setHoverNext(true)} onMouseLeave={() => setHoverNext(false)} style={{ cursor: levelProgress < 70 ? 'help' : 'pointer' }}>
                    <button 
                        disabled={levelProgress < 70} 
                        onClick={() => { nextLevel(); if(isMobile) setMobileSidebarOpen(false); }} 
                        className={levelProgress >= 99.8 ? "perfect-pulse" : ""} 
                        style={{ ...minimalNextBtn, background: theme === 'dark' ? '#eee' : '#222', color: theme === 'dark' ? '#000' : '#fff', opacity: levelProgress >= 70 ? 1 : 0.2, width: hoverNext ? 'auto' : '35px', pointerEvents: levelProgress < 70 ? 'none' : 'auto' }}
                    >
                        {levelProgress < 70 && hoverNext ? "Align Primitives to Advance" : (hoverNext ? grade.text : '>>')}
                    </button>
                </div>
            </div>
        )}
      </div>

      {floatingScores.map(score => ( <div key={score.id} className="floating-score" style={{ position: 'fixed', left: score.x, top: score.y, color: '#2ecc71', fontWeight: 'bold', fontSize: '20px', pointerEvents: 'none', zIndex: 1000 }}>{score.value}</div> ))}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap');
        @keyframes floatUp { 0% { opacity: 0; transform: translateY(0); } 20% { opacity: 1; } 100% { opacity: 0; transform: translateY(-80px); } }
        .floating-score { animation: floatUp 1.5s forwards ease-out; }
        
        .tank-wrap { animation: driveIn 4s ease-in-out forwards; }
        @keyframes driveIn { 
            0% { transform: translateX(-500px); } 
            60% { transform: translateX(500px); } 
            80% { transform: translateX(400px); } 
            100% { transform: translateX(400px); } 
        }
        
        .turret { animation: scan 4s infinite ease-in-out 4s; transform-origin: 70px 60px; }
        @keyframes scan { 
            0%, 100% { transform: rotate(0deg); } 
            50% { transform: rotate(-60deg); } 
        }
        
        .tank-body { animation: recoil 0.8s infinite 5s; transform: translateY(850px); }
        @keyframes recoil {
            0%, 10% { transform: translate(0, 850px); }
            20% { transform: translate(-20px, 850px); }
            40%, 100% { transform: translate(0, 850px); }
        }

        .flash { opacity: 0; transform-origin: 150px 52px; }
        .flash { animation: pulseFlash 0.8s infinite 5s; }
        @keyframes pulseFlash {
            0% { opacity: 0; transform: scale(0.5); }
            10% { opacity: 1; transform: scale(1.5); }
            20% { opacity: 0; transform: scale(1); }
            100% { opacity: 0; }
        }

        .projectile { opacity: 0; transform-origin: center; }
        .proj1 { animation: shootArc 2.4s infinite 5s; }
        .proj2 { animation: shootArc 2.4s infinite 5.8s; }
        .proj3 { animation: shootArc 2.4s infinite 6.6s; }

        @keyframes shootArc {
            0% { opacity: 0; transform: translate(0, 0); }
            10% { opacity: 1; transform: translate(0, 0); }
            40% { opacity: 1; transform: translate(300px, -700px); }
            60% { opacity: 1; transform: translate(600px, -300px); }
            61%, 100% { opacity: 0; transform: translate(600px, -300px); }
        }

        .fw { position: absolute; width: 4px; height: 4px; border-radius: 50%; opacity: 0; }
        .fw::before, .fw::after {
            content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; border-radius: 50%;
            box-shadow: 0 -60px 0 0 #f1c40f, 60px 0 0 0 #e74c3c, 0 60px 0 0 #3498db, -60px 0 0 0 #9b59b6, 45px -45px 0 0 #2ecc71, -45px 45px 0 0 #e67e22;
        }
        .fw1 { animation: bang 2.4s infinite 6.0s; left: 40%; bottom: 700px; }
        .fw2 { animation: bang 2.4s infinite 6.8s; left: 55%; bottom: 850px; }
        .fw3 { animation: bang 2.4s infinite 7.6s; left: 45%; bottom: 650px; }

        @keyframes bang {
            0%, 19% { opacity: 0; transform: scale(0.1); }
            20% { opacity: 1; transform: scale(0.1); }
            40% { opacity: 0; transform: scale(3); }
            100% { opacity: 0; transform: scale(3); }
        }

        .perfect-pop {
            animation: textPulse 1.5s infinite ease-in-out;
            color: #fff !important;
            display: inline-block;
        }
        @keyframes textPulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); }
        }

        .perfect-pulse {
            animation: pulse 1.5s infinite ease-in-out;
        }
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
      `}</style>
    </div>
  )

  function renderButton(label: string, type: string, advanced: boolean, simple: boolean) {
      let left = ""; let right = "";
      if (advanced) { left = "−"; right = "+"; } 
      else if (simple) { if (type === 'Cylinder') left = "−"; else right = "+"; }
      return (
        <button onClick={(e) => handleDualClick(e, type)} style={{ ...btnStyle, background: theme === 'dark' ? '#1a1a1a' : '#fff', color: sidebarColor, borderColor }}>
            <span style={{ ...sym, color: '#ff4d4d', border: left ? '1px solid rgba(255, 77, 77, 0.6)' : 'none', visibility: left ? 'visible' : 'hidden', fontSize: '18px' }}>{left}</span>
            <span style={{ flex: 1 }}>{label.toUpperCase()}</span>
            <span style={{ ...sym, color: '#27ae60', border: right ? '1px solid rgba(46, 204, 113, 0.6)' : 'none', visibility: right ? 'visible' : 'hidden', fontSize: '18px' }}>{right}</span>
        </button>
      )
  }
}

const numInputStyle: React.CSSProperties = { border: '1px solid #333', color: '#27ae60', fontSize: '9px', width: '30px', padding: '1px 2px', fontFamily: '"IBM Plex Mono", monospace' }
const dragHandleStyle: React.CSSProperties = { padding: '8px 10px', fontSize: '10px', fontWeight: 'bold', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'grab' }
const detachedLogStyle: React.CSSProperties = { position: 'fixed', width: '240px', border: '1px solid #444', zIndex: 100, display: 'flex', flexDirection: 'column', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', maxHeight: '300px' }
const btnStyle: React.CSSProperties = { height: '36px', border: '1px solid #222', borderRadius: '2px', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', padding: '0 8px' }
const sym: React.CSSProperties = { width: '24px', height: '24px', fontWeight: 'bold', fontSize: '14px', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const toggleBtnStyle: React.CSSProperties = { position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#333', cursor: 'pointer', fontSize: '10px' }
const blueprintBtnStyle: React.CSSProperties = { background: '#eee', color: '#000', border: 'none', padding: '2px 8px', fontSize: '8px', cursor: 'pointer', fontWeight: 'bold', height: '20px' }
const blueprintOverlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, backgroundColor: 'rgba(5, 10, 30, 0.98)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px' }
const blueprintModalStyle: React.CSSProperties = { border: '1px solid rgba(255,255,255,0.2)', padding: '40px', maxWidth: '800px', width: '90%', position: 'relative' }
const transformPanelStyle: React.CSSProperties = { marginTop: '15px', padding: '12px', border: '1px solid #222' }
const controlRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }
const controlLabelStyle: React.CSSProperties = { fontSize: '8px', color: '#333', width: '25px', fontWeight: 'bold' }
const btnGroupStyle: React.CSSProperties = { display: 'flex', border: '1px solid #222', alignItems: 'center' }
const tBtn: React.CSSProperties = { background: 'transparent', border: 'none', fontSize: '10px', padding: '1px 6px', cursor: 'pointer' }
const rBtn: React.CSSProperties = { border: '1px solid #222', fontSize: '8px', padding: '2px 6px', cursor: 'pointer' }
const opItemStyle: React.CSSProperties = { padding: '6px 10px', border: '1px solid #222', cursor: 'pointer' }
const nextBtnStyle: React.CSSProperties = { width: '100%', padding: '12px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }
const minimalNextBtn: React.CSSProperties = { border: 'none', padding: '4px 10px', fontSize: '9px', cursor: 'pointer', fontWeight: 'bold', height: '20px', transition: 'width 0.2s', minWidth: '35px' }
const socialLinkStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px', color: '#eee', textDecoration: 'none', fontSize: '14px', background: '#1a1a1a', padding: '10px 20px', border: '1px solid #333' }

export default App
