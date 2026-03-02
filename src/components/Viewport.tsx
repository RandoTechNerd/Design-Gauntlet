import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import initManifold from 'manifold-3d';
import type { Level } from '../LevelManager';

// Set Z as the default Up axis for Three.js to match CAD standards
THREE.Object3D.DEFAULT_UP.set(0, 0, 1);

let globalKernel: any = null;
let kernelPromise: Promise<any> | null = null;

const getKernel = async () => {
    if (globalKernel) return globalKernel;
    if (kernelPromise) return kernelPromise;
    kernelPromise = (async () => {
        console.log('Viewport: Booting WASM Kernel...');
        const module = await initManifold({ locateFile: () => '/manifold.wasm' });
        if (module.setup) module.setup();
        globalKernel = module;
        console.log('Viewport: Kernel Online');
        return module;
    })();
    return kernelPromise;
};

interface ViewportProps {
  currentLevel: Level;
  onMeshUpdated: (manifold: any, fidelity: number) => void; 
  userOperations: any[]; 
  theme: 'dark' | 'light';
  showLabels: boolean;
  setShowLabels: (show: boolean) => void;
}

const Viewport: React.FC<ViewportProps> = ({ currentLevel, onMeshUpdated, userOperations, theme, showLabels, setShowLabels }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [terminalCollapsed, setTerminalCollapsed] = useState(true);
  const [ready, setReady] = useState(false);
  const [delayedPerfect, setDelayedPerfect] = useState(false);
  const perfectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const stateRef = useRef<{
    scene: THREE.Scene;
    renderer: THREE.WebGLRenderer | null;
    camera: THREE.PerspectiveCamera | null;
    controls: OrbitControls | null;
    targetMeshes: THREE.Mesh[];
    userResultMesh: THREE.Mesh | null;
    primitiveMeshes: THREE.Mesh[];
    axisLabels: THREE.Group | null;
    grid: THREE.GridHelper | null;
  }>({
    scene: new THREE.Scene(),
    renderer: null,
    camera: null,
    controls: null,
    targetMeshes: [],
    userResultMesh: null,
    primitiveMeshes: [],
    axisLabels: null,
    grid: null
  });

  const createTextSprite = (text: string, color: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 64; canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (ctx) {
          ctx.fillStyle = color;
          ctx.font = 'bold 48px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(text, 32, 32);
      }
      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(15, 15, 1);
      return sprite;
  };

  const buildMesh = (manifold: any, color: number, mode: 'ghost' | 'user' | 'overlap', isPerfect: boolean = false) => {
    try {
      if (!manifold) return null;
      const meshData = manifold.getMesh();
      const numProp = meshData.numProp || 3;
      const numVerts = meshData.vertProperties.length / numProp;
      const geometry = new THREE.BufferGeometry();
      const pos = new Float32Array(numVerts * 3);
      for (let i = 0; i < numVerts; i++) {
          pos[i * 3 + 0] = meshData.vertProperties[i * numProp + 0];
          pos[i * 3 + 1] = meshData.vertProperties[i * numProp + 1];
          pos[i * 3 + 2] = meshData.vertProperties[i * numProp + 2];
      }
      geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(meshData.triVerts), 1));
      geometry.computeVertexNormals(); 

      let material;
      if (mode === 'ghost') {
        const ghostOpacity = theme === 'light' ? 0.4 : 0.15;
        material = new THREE.MeshBasicMaterial({ 
            color, 
            transparent: true, 
            opacity: ghostOpacity, 
            side: THREE.DoubleSide, 
            depthWrite: false, 
            wireframe: true,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1
        });
      } else if (mode === 'overlap') {
        material = new THREE.MeshLambertMaterial({ 
            color: 0x9b59b6, 
            transparent: true, 
            opacity: 0.7, 
            blending: THREE.AdditiveBlending, 
            side: THREE.DoubleSide, 
            depthWrite: false, 
            flatShading: true,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1
        });
      } else if (isPerfect) {
        material = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide, flatShading: false });
      } else {
        const meshColor = theme === 'dark' ? 0xeeeeee : 0x333333;
        material = new THREE.MeshStandardMaterial({ color: meshColor, side: THREE.DoubleSide, roughness: 0.8, metalness: 0.1, flatShading: true });
      }
      return new THREE.Mesh(geometry, material);
    } catch (e) { return null; }
  };

  const resetCamera = () => {
      if (stateRef.current.camera && stateRef.current.controls) {
          stateRef.current.camera.position.set(150, 150, 150);
          stateRef.current.controls.target.set(0, 0, 0);
          stateRef.current.controls.update();
      }
  };

  useEffect(() => {
    if (!mountRef.current) return;
    const { scene } = stateRef.current;
    scene.background = new THREE.Color(theme === 'dark' ? 0x0a0a0a : 0xfafafa);

    const camera = new THREE.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 1, 10000);
    camera.position.set(150, 150, 150);
    stateRef.current.camera = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    mountRef.current.appendChild(renderer.domElement);
    stateRef.current.renderer = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    stateRef.current.controls = controls;

    scene.add(new THREE.AxesHelper(100));
    
    const labels = new THREE.Group();
    const xLab = createTextSprite('X', '#ff0000'); xLab.position.set(110, 0, 0); labels.add(xLab);
    const yLab = createTextSprite('Y', '#00ff00'); yLab.position.set(0, 110, 0); labels.add(yLab);
    const zLab = createTextSprite('Z', '#0000ff'); zLab.position.set(0, 0, 110); labels.add(zLab);
    stateRef.current.axisLabels = labels;
    scene.add(labels);

    const p1 = new THREE.PointLight(0xffffff, 1.2); p1.position.set(500, 500, 500); scene.add(p1);
    const p2 = new THREE.PointLight(0xffffff, 0.6); p2.position.set(-500, -500, 200); scene.add(p2);
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    getKernel().then(() => setReady(true));

    return () => {
        cancelAnimationFrame(animationId);
        renderer.dispose();
        if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
      const { scene, grid } = stateRef.current;
      if (scene) {
          scene.background = new THREE.Color(theme === 'dark' ? 0x0a0a0a : 0xfafafa);
          if (grid) scene.remove(grid);
          const gridColor = theme === 'dark' ? 0x555555 : 0xf8f8f8;
          const gridCenter = theme === 'dark' ? 0x444444 : 0xf0f0f0;
          const newGrid = new THREE.GridHelper(800, 40, gridColor, gridCenter);
          newGrid.rotation.x = Math.PI / 2;
          scene.add(newGrid);
          stateRef.current.grid = newGrid;
      }
  }, [theme]);

  useEffect(() => {
    if (!ready || !globalKernel) return;
    const { scene, axisLabels } = stateRef.current;
    if (axisLabels) axisLabels.visible = showLabels;

    stateRef.current.targetMeshes.forEach(m => scene.remove(m));
    stateRef.current.targetMeshes = [];
    
    try {
        const pieces = currentLevel.targetPieces(globalKernel);
        pieces.forEach(p => {
            const manifold = p.manifold(globalKernel);
            const mesh = buildMesh(manifold, p.color, 'ghost');
            if (mesh) {
                stateRef.current.targetMeshes.push(mesh);
                scene.add(mesh);
            }
        });
    } catch (e) { }

    stateRef.current.primitiveMeshes.forEach(m => scene.remove(m));
    stateRef.current.primitiveMeshes = [];
    if (stateRef.current.userResultMesh) scene.remove(stateRef.current.userResultMesh);

    try {
        const M = globalKernel.Manifold;
        let result: any = null;
        for (const op of userOperations) {
            let opMesh: any = null;
            const isSub = op.type.startsWith('subtract');
            if (op.type.endsWith('Cube')) opMesh = M.cube([60, 60, 60], true);
            else if (op.type.endsWith('Tetra')) opMesh = M.tetrahedron().scale([80, 80, 80]);
            else if (op.type.endsWith('Cylinder')) opMesh = M.cylinder(120, 15, 15, 32, true);

            if (opMesh) {
                // FIXED TRANSFORMATION ORDER: Rotate -> Scale -> Translate
                // This ensures Scaling buttons (X, Y, Z) always correspond to World Axes
                if (op.rotation) opMesh = opMesh.rotate(op.rotation);
                if (op.scale) opMesh = opMesh.scale(op.scale);
                if (op.translate) opMesh = opMesh.translate(op.translate);
                
                const pMesh = buildMesh(opMesh, 0x9b59b6, 'overlap');
                if (pMesh) { 
                    stateRef.current.primitiveMeshes.push(pMesh); 
                    scene.add(pMesh); 
                }

                if (!result) result = isSub ? null : opMesh;
                else result = isSub ? result.subtract(opMesh) : result.add(opMesh);
            }
        }

        let fidelity = 0;
        const goalManifold = currentLevel.targetGeometry(globalKernel);
        if (result && goalManifold) {
            const tVol = goalManifold.volume();
            const uVol = result.volume();
            const intersect = goalManifold.intersect(result);
            const iVol = intersect.volume();
            fidelity = (iVol / Math.max(tVol, uVol)) * 100;

            const isPerfect = fidelity > 99.8;
            
            if (isPerfect) {
                if (!delayedPerfect && !perfectTimeoutRef.current) {
                    perfectTimeoutRef.current = setTimeout(() => {
                        setDelayedPerfect(true);
                        perfectTimeoutRef.current = null;
                    }, 1000);
                }
            } else {
                if (perfectTimeoutRef.current) {
                    clearTimeout(perfectTimeoutRef.current);
                    perfectTimeoutRef.current = null;
                }
                if (delayedPerfect) setDelayedPerfect(false);
            }

            const mesh = buildMesh(result, 0xffffff, 'user', delayedPerfect);
            if (mesh) { 
                stateRef.current.userResultMesh = mesh; 
                scene.add(mesh); 
                if (delayedPerfect) {
                    stateRef.current.targetMeshes.forEach(m => m.visible = false);
                    stateRef.current.primitiveMeshes.forEach(m => m.visible = false);
                }
            }
        } else {
            if (delayedPerfect) setDelayedPerfect(false);
        }
        onMeshUpdated(result, fidelity);
    } catch (e) { }
  }, [currentLevel, userOperations, ready, showLabels, delayedPerfect]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      
      {/* CAMERA RESET [⬚] */}
      <button onClick={resetCamera} style={minimalIconBtnStyle(true, false, theme)} title="Reset View">
        <div style={{ width: '14px', height: '10px', border: '1px solid currentColor', borderRadius: '1px', position: 'relative' }}>
            <div style={{ width: '4px', height: '4px', border: '1px solid currentColor', borderRadius: '50%', position: 'absolute', top: '2px', left: '4px' }} />
        </div>
      </button>

      {/* COMPASS TOGGLE [⊙] */}
      <button onClick={() => setShowLabels(!showLabels)} style={minimalIconBtnStyle(false, showLabels, theme)} title="Toggle Labels">
        <div style={{ width: '12px', height: '12px', border: '1px solid currentColor', borderRadius: '50%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '1px', height: '8px', background: 'currentColor' }} />
            <div style={{ height: '1px', width: '8px', background: 'currentColor', position: 'absolute' }} />
        </div>
      </button>

      <div style={{ position: 'absolute', bottom: 20, left: 20, zIndex: 20 }}>
        {!terminalCollapsed && (
            <div style={{ background: theme === 'dark' ? 'rgba(0,0,0,0.95)' : 'rgba(255,255,255,0.95)', color: theme === 'dark' ? '#444' : '#888', padding: '12px', borderRadius: '2px', fontFamily: 'monospace', fontSize: '9px', width: '180px', border: '1px solid #222', boxShadow: '0 0 20px rgba(0,0,0,0.5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #222', paddingBottom: '4px' }}>
                    <strong>TERMINAL</strong>
                    <button onClick={() => setTerminalCollapsed(true)} style={{ background: 'transparent', border: 'none', color: '#444', cursor: 'pointer', fontSize: '9px' }}>[X]</button>
                </div>
                <div>KERN: READY</div>
                <div>FIDELITY: CALC_OK</div>
            </div>
        )}
        {terminalCollapsed && <button onClick={() => setTerminalCollapsed(false)} style={{ background: 'transparent', border: 'none', color: theme === 'dark' ? '#222' : '#888', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>▲</button>}
      </div>
    </div>
  );
};

const minimalIconBtnStyle = (top: boolean, active: boolean = false, theme: string): React.CSSProperties => ({
    position: 'absolute',
    top: top ? '20px' : 'auto',
    bottom: top ? 'auto' : '20px',
    right: '20px',
    background: 'transparent',
    border: 'none',
    color: active ? (theme === 'dark' ? '#eee' : '#444') : (theme === 'dark' ? '#222' : '#ddd'),
    padding: '10px',
    cursor: 'pointer',
    zIndex: 30,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s'
});

export default Viewport;
