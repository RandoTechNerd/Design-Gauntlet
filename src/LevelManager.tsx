import React from 'react';

export interface LevelTarget {
    manifold: (module: any) => any;
    color: number;
}

export interface Level {
  id: number;
  name: string;
  description: string;
  targetPieces: (module: any) => LevelTarget[]; 
  targetGeometry: (module: any) => any; 
  hint: string;
  points: number;
  tolerance: number;
  blueprint: string;
  sketch: (onSecretClick?: () => void) => React.ReactNode;
  extraHint?: string;
  minMoves: number; 
}

export const LEVELS: Level[] = [
  {
    id: 1,
    name: "The Humble Tetra",
    description: "Start your journey by placing a simple tetrahedron.",
    minMoves: 1,
    targetPieces: (_module) => [
        { manifold: (M) => M.Manifold.tetrahedron().scale([80, 80, 80]), color: 0x00ff00 }
    ],
    targetGeometry: (module) => module.Manifold.tetrahedron().scale([80, 80, 80]),
    hint: "Match the target shape!",
    points: 100,
    tolerance: 0.95,
    blueprint: "• PLACE TETRAHEDRON\n• CENTERED AT ORIGIN\n• SCALE TO 80 UNITS (1.0x)",
    sketch: (onSecretClick) => (
        <svg viewBox="0 0 100 100" width="150" height="150">
            <path d="M50 10 L90 80 L10 80 Z" fill="none" stroke="white" strokeWidth="2" />
            <path d="M50 10 L50 80" fill="none" stroke="white" strokeWidth="1" strokeDasharray="4" />
            <circle cx="50" cy="10" r="8" fill="transparent" style={{ cursor: 'pointer' }} onClick={onSecretClick} />
            <circle cx="50" cy="10" r="2" fill="white" pointerEvents="none" />
        </svg>
    )
  },
  {
    id: 2,
    name: "The Holey Box",
    description: "Subtract a cylinder from a cube to make a hole.",
    minMoves: 2,
    targetPieces: (module) => {
      const M = module.Manifold;
      return [
          { manifold: () => M.cube([60, 60, 60], true), color: 0x00ff00 },
          { manifold: () => M.cylinder(120, 15, 15, 32, true), color: 0xff00ff }
      ];
    },
    targetGeometry: (module) => {
      const M = module.Manifold;
      return M.cube([60, 60, 60], true).subtract(M.cylinder(120, 15, 15, 32, true));
    },
    hint: "Subtract the cylinder from the cube!",
    points: 200,
    tolerance: 0.90,
    blueprint: "• CONSTRUCT CUBE (60mm)\n• EXTRUDE CYLINDER (120mm)\n• APPLY BOOLEAN: DIFFERENCE",
    sketch: () => (
        <svg viewBox="0 0 100 100" width="150" height="150">
            <rect x="25" y="25" width="50" height="50" fill="none" stroke="white" strokeWidth="2" />
            <circle cx="50" cy="50" r="12" fill="none" stroke="white" strokeWidth="2" />
            <line x1="25" y1="25" x2="75" y2="75" stroke="white" strokeWidth="0.5" strokeDasharray="2" />
        </svg>
    )
  },
  {
    id: 3,
    name: "The Dual Hole",
    description: "A cube with two intersecting cylindrical holes. Use Rotate!",
    minMoves: 3,
    targetPieces: (module) => {
      const M = module.Manifold;
      return [
          { manifold: () => M.cube([60, 60, 60], true), color: 0x00ff00 },
          { manifold: () => M.cylinder(120, 12, 12, 32, true), color: 0xff00ff },
          { manifold: () => M.cylinder(120, 12, 12, 32, true).rotate([90, 0, 0]), color: 0x00ffff }
      ];
    },
    targetGeometry: (module) => {
      const M = module.Manifold;
      const cube = M.cube([60, 60, 60], true);
      const cyl1 = M.cylinder(120, 12, 12, 32, true);
      const cyl2 = M.cylinder(120, 12, 12, 32, true).rotate([90, 0, 0]);
      return cube.subtract(cyl1).subtract(cyl2);
    },
    hint: "Combine two subtractions with rotation!",
    points: 300,
    tolerance: 0.85,
    blueprint: "• BASE CUBE: 60mm\n• VERTICAL HOLE: CYL SCALE R:0.8\n• HORIZ HOLE: CYL SCALE R:0.8 (ROT X:90)",
    sketch: () => (
        <svg viewBox="0 0 100 100" width="150" height="150">
            <rect x="25" y="25" width="50" height="50" fill="none" stroke="white" strokeWidth="2" />
            <circle cx="50" cy="50" r="10" fill="none" stroke="white" strokeWidth="2" />
            <line x1="50" y1="10" x2="50" y2="90" stroke="white" strokeWidth="1" strokeDasharray="4" />
            <line x1="10" y1="50" x2="90" y2="50" stroke="white" strokeWidth="1" strokeDasharray="4" />
        </svg>
    )
  },
  {
    id: 4,
    name: "The T-Pipe",
    description: "Two cylinders joined at 90 degrees. Add, don't subtract!",
    minMoves: 2,
    targetPieces: (module) => {
      const M = module.Manifold;
      // Fixed for 100% button reachability and T-shape:
      // Branch rotated on Y to stick out to the Right (X-axis)
      return [
          { manifold: () => M.cylinder(120, 15, 15, 32, true), color: 0x00ff00 },
          { manifold: () => M.cylinder(120, 15, 15, 32, true).scale([1, 1, 0.5]).rotate([0, 90, 0]).translate([30, 0, 0]), color: 0xffa500 }
      ];
    },
    targetGeometry: (module) => {
      const M = module.Manifold;
      const cyl1 = M.cylinder(120, 15, 15, 32, true);
      const cyl2 = M.cylinder(120, 15, 15, 32, true).scale([1, 1, 0.5]).rotate([0, 90, 0]).translate([30, 0, 0]);
      return cyl1.add(cyl2);
    },
    hint: "Use Add (+) and Rotate! Scale the branch length to 0.5 and Rotate 90 on Y to form a T.",
    points: 400,
    tolerance: 0.90,
    blueprint: "• VERTICAL MAIN: H120 R15\n• HORIZ BRANCH: SCALE 0.5, ROT Y:90, TRANS X:30\n• JOIN TYPE: UNION",
    sketch: () => (
        <svg viewBox="0 0 100 100" width="150" height="150">
            <rect x="40" y="10" width="20" height="80" fill="none" stroke="white" strokeWidth="2" />
            <rect x="60" y="40" width="30" height="20" fill="none" stroke="white" strokeWidth="2" />
            <path d="M60 40 L60 60" stroke="white" strokeWidth="1" />
        </svg>
    )
  },
  {
    id: 5,
    name: "The Capped Cylinder",
    description: "A cylinder with tetrahedrons at each end.",
    minMoves: 3,
    targetPieces: (module) => {
      const M = module.Manifold;
      const cap = M.tetrahedron().scale([80, 80, 80]).scale([0.4, 0.4, 0.4]);
      return [
          { manifold: () => M.cylinder(120, 15, 15, 32, true), color: 0x00ff00 },
          { manifold: () => cap.translate([0, 0, 60]), color: 0xff00ff },
          { manifold: () => cap.rotate([180, 0, 0]).translate([0, 0, -60]), color: 0x00ffff }
      ];
    },
    targetGeometry: (module) => {
      const M = module.Manifold;
      const cyl = M.cylinder(120, 15, 15, 32, true);
      const cap = M.tetrahedron().scale([80, 80, 80]).scale([0.4, 0.4, 0.4]);
      const cap1 = cap.translate([0, 0, 60]);
      const cap2 = cap.rotate([180, 0, 0]).translate([0, 0, -60]);
      return cyl.add(cap1).add(cap2);
    },
    hint: "Scale Tetras to 0.4. Translate Z to 60 and -60. Flip the bottom cap!",
    points: 600,
    tolerance: 0.85,
    blueprint: "• MAIN POST: CYL R15 H120\n• CAPS: TETRA SCALE 0.4\n• POSITIONS: Z=+60, Z=-60 (ROT 180)",
    sketch: () => (
        <svg viewBox="0 0 100 100" width="150" height="150">
            <rect x="42" y="25" width="16" height="50" fill="none" stroke="white" strokeWidth="2" />
            <path d="M35 25 L50 5 L65 25 Z" fill="none" stroke="white" strokeWidth="2" />
            <path d="M35 75 L50 95 L65 75 Z" fill="none" stroke="white" strokeWidth="2" />
        </svg>
    )
  },
  {
    id: 6,
    name: "The Bracket",
    description: "An L-shaped block with a mounting hole.",
    minMoves: 3,
    targetPieces: (module) => {
      const M = module.Manifold;
      return [
          { manifold: () => M.cube([60, 60, 60], true).scale([1, 0.3, 1]).translate([0, -20, 0]), color: 0x00ff00 },
          { manifold: () => M.cube([60, 60, 60], true).scale([0.3, 1, 1]).translate([-20, 20, 0]), color: 0xffa500 },
          { manifold: () => M.cylinder(120, 10, 10, 32, true).rotate([90, 0, 0]).translate([-20, 20, 0]), color: 0xff00ff }
      ];
    },
    targetGeometry: (module) => {
      const M = module.Manifold;
      const base = M.cube([60, 60, 60], true).scale([1, 0.3, 1]).translate([0, -20, 0]);
      const wall = M.cube([60, 60, 60], true).scale([0.3, 1, 1]).translate([-20, 20, 0]);
      const hole = M.cylinder(120, 10, 10, 32, true).rotate([90, 0, 0]).translate([-20, 20, 0]);
      return base.add(wall).subtract(hole);
    },
    hint: "Combine two cubes scaled to 0.3, then subtract a rotated cylinder (R:0.7).",
    points: 700,
    tolerance: 0.85,
    blueprint: "• HORIZ BASE: SCALE Y:0.3, TRANS Y:-20\n• VERT WALL: SCALE X:0.3, TRANS X:-20, TRANS Y:20\n• MTG HOLE: CYL SCALE R:0.7, ROT X:90, TRANS X:-20, TRANS Y:20",
    sketch: () => (
        <svg viewBox="0 0 100 100" width="150" height="150">
            <path d="M20 80 L80 80 L80 60 L40 60 L40 20 L20 20 Z" fill="none" stroke="white" strokeWidth="2" />
            <circle cx="30" cy="40" r="6" fill="none" stroke="white" strokeWidth="1" strokeDasharray="2" />
        </svg>
    )
  },
  {
    id: 7,
    name: "The Star Block",
    description: "The Final Challenge. A cube with 4 offset tetras.",
    minMoves: 5,
    targetPieces: (module) => {
      const M = module.Manifold;
      const tetra = M.tetrahedron().scale([80, 80, 80]).scale([0.5, 0.5, 0.5]);
      return [
          { manifold: () => M.cube([60, 60, 60], true), color: 0x00ff00 },
          { manifold: () => tetra.translate([30, 0, 0]), color: 0xff0000 },
          { manifold: () => tetra.rotate([0, 0, 180]).translate([-30, 0, 0]), color: 0xffff00 },
          { manifold: () => tetra.rotate([0, 0, 90]).translate([0, 30, 0]), color: 0x0000ff },
          { manifold: () => tetra.rotate([0, 0, -90]).translate([0, -30, 0]), color: 0x00ffff }
      ];
    },
    targetGeometry: (module) => {
      const M = module.Manifold;
      const cube = M.cube([60, 60, 60], true);
      const tetra = M.tetrahedron().scale([80, 80, 80]).scale([0.5, 0.5, 0.5]);
      const t1 = tetra.translate([30, 0, 0]);
      const t2 = tetra.rotate([0, 0, 180]).translate([-30, 0, 0]);
      const t3 = tetra.rotate([0, 0, 90]).translate([0, 30, 0]);
      const t4 = tetra.rotate([0, 0, -90]).translate([0, -30, 0]);
      return cube.add(t1).add(t2).add(t3).add(t4);
    },
    hint: "Scale 0.5, Rotate Z, Translate +/- 30.",
    points: 1000,
    tolerance: 0.85,
    blueprint: "• FINAL BOSS LOGIC:\n• 1x BASE CUBE\n• 4x TETRA WINGS (SCALE 0.5)\n• TRANS X: 30 (RIGHT)\n• TRANS X: -30 (LEFT)\n• TRANS Y: 30 (FORWARD)\n• TRANS Y: -30 (BACKWARD)",
    extraHint: "GOAL: 5 Moves total. Add Cube, then 4x Tetras. NOTE: You MUST Rotate 2 of the Tetras by 90 or 180 on Z to align them with the side faces before moving them!",
    sketch: () => (
        <svg viewBox="0 0 1000 1000" width="150" height="150">
            <rect x="350" y="350" width="300" height="300" fill="none" stroke="white" strokeWidth="20" />
            <path d="M650 350 L850 500 L650 650 Z" fill="none" stroke="white" strokeWidth="10" />
            <path d="M350 350 L150 500 L350 650 Z" fill="none" stroke="white" strokeWidth="10" />
            <path d="M350 350 L500 150 L650 350 Z" fill="none" stroke="white" strokeWidth="10" />
            <path d="M350 650 L500 850 L650 650 Z" fill="none" stroke="white" strokeWidth="10" />
        </svg>
    )
  },
];
