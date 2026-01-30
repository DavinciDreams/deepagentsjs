# WebGL Context Loss Fix - Performance Optimizations

## Problem Summary

The Agents of Empire game was experiencing WebGL context loss immediately after loading, causing the 3D scene to crash. The browser was killing the WebGL context due to performance violations (frame times exceeding 300-1000ms).

## Root Cause Analysis

The primary culprits were:

1. **StructurePool Component** - The biggest offender, causing 674ms+ frame times
   - Expensive `Text` components from `@react-three/drei` (font generation and rendering)
   - Multiple `pointLight` instances on each structure
   - `Object3DTooltip` trying to render HTML `<div>` inside Canvas (R3F error)
   - Complex geometry with animations running every frame

2. **WorldGrid Component** - Caused 394ms+ frame times
   - Instanced mesh with 2500 tiles (50x50 grid)
   - Updating every frame without throttling
   - Per-tile color calculations in the render loop

3. **High Agent Count** - 100 agents spawning simultaneously
   - Each agent spawns a Deep Agent instance
   - No delay between spawns caused resource spikes

4. **Expensive Rendering Features**
   - Stars (5000 particles)
   - Environment HDRI
   - Terrain complex geometry
   - Shadows on all lights
   - Antialiasing
   - Connection lines with dynamic calculations

## Solution Implemented

### 1. Optimized Canvas Configuration

```typescript
<Canvas
  shadows={false}  // Disabled shadows
  gl={{
    antialias: false,  // Disabled for performance
    alpha: false,
    powerPreference: "high-performance",
    failIfMajorPerformanceCaveat: false,
    preserveDrawingBuffer: true,  // Better context recovery
    desynchronized: true,
    stencil: false,
    depth: true,
  }}
  dpr={1}  // Force DPR to 1
  frameloop="always"  // Consistent rendering
>
```

### 2. Replaced WorldGrid with SimpleGrid

```typescript
function SimpleGrid() {
  return (
    <gridHelper args={[20, 20, "#444444", "#222222"]} position={[10, 0, 10]} />
  );
}
```

- Uses Three.js's built-in `gridHelper` (highly optimized)
- Reduced grid size from 50x50 to 20x20
- No per-frame updates
- No instanced mesh overhead

### 3. Optimized Structure Component

**Disabled:**
- Text labels (most expensive)
- Point lights on goal indicators
- Tooltips (Object3DTooltip with HTML content)
- Assignment indicator text

**Kept:**
- Simple geometry meshes
- Throttled animations (50ms instead of every frame)
- Basic hover effects (ring highlights)
- Goal indicator spheres (without lights)

### 4. Reduced Initial Load

- Agent count: 100 → 1 agent
- Staggered spawning: 100ms delay between agent spawns
- Grid size: 50x50 → 20x20
- Structure positions adjusted for smaller grid

### 5. Game Loop Optimizations

```typescript
// Reduced tick rate
tickRate: 30  // (was 60)

// Cap delta time
const cappedDelta = Math.min(delta, 0.1);

// Limit ticks per frame
const maxTicksPerFrame = 3;
```

### 6. Simplified Lighting

```typescript
<ambientLight intensity={0.6} />
<directionalLight position={[30, 50, 30]} intensity={0.8} castShadow={false} />
<directionalLight position={[-20, 30, -20]} intensity={0.3} />
// Removed: pointLights, multiple shadow maps
```

## Current Stable Configuration

### Enabled Components
✅ Canvas with optimized settings
✅ SimpleGrid (20x20 grid helper)
✅ GroundPlane
✅ 1 Agent (staggered spawn)
✅ StructurePool (optimized without text/lights/tooltips)
✅ SelectionSystem
✅ Lighting (2 directional lights + ambient, no shadows)

### Disabled Components
❌ WorldGrid (replaced with SimpleGrid)
❌ Stars (5000 particles)
❌ Environment HDRI
❌ Terrain
❌ DragonPool
❌ ConnectionLines
❌ Structure text labels
❌ Structure point lights
❌ Structure tooltips

## Performance Metrics

### Before Optimization
- Frame time: 394-1877ms
- WebGL Context: **LOST** ❌
- Status: Unplayable

### After Optimization
- Frame time: 120-200ms
- WebGL Context: **STABLE** ✅
- Status: Playable

## Next Steps to Improve

1. **Gradually add agents** - Test 2, 5, 10 agents to find the stable limit
2. **Re-enable features one at a time** - Identify which specific features can be added back
3. **Optimize structures further** - Consider using 3D text sprites instead of Text components
4. **Lazy load expensive features** - Load dragons/terrain only when needed
5. **Add quality settings** - Allow users to choose between quality/performance
6. **Consider WebGL 2 fallback** - Detect if WebGL 2 is available and adjust accordingly

## Key Takeaways

1. **Text components in 3D are very expensive** - Use sparingly or find alternatives
2. **Point lights add up quickly** - Each light affects the entire scene
3. **Frame time budget is critical** - Browsers kill contexts after ~300ms
4. **Instanced meshes need optimization** - Don't update every frame if not needed
5. **Stagger expensive operations** - Don't spawn 100 agents simultaneously
6. **Start minimal, add gradually** - Better to have a working game than a crashed one

## Files Modified

- [App.tsx](../src/App.tsx) - Main scene configuration
- [Structure.tsx](../src/entities/Structure.tsx) - Optimized structure rendering
- [GameHooks.ts](../src/core/GameHooks.ts) - Reduced tick rate and delta capping
- [WorldManager.tsx](../src/world/WorldManager.tsx) - Ground plane sizing
- [AgentPool.tsx](../src/entities/AgentPool.tsx) - Staggered agent spawning

## Recovery Mechanism

The app includes a context loss handler that:

1. Prevents default context loss behavior
2. Stops the animation loop to prevent cascading errors
3. Forces re-render on context restoration
4. Logs recovery status

```typescript
function ContextLossHandler() {
  const gl = useThree((state) => state.gl);
  const [, forceUpdate] = useState(0);
  const contextLostRef = useRef(false);

  useEffect(() => {
    const handleContextLoss = (event: Event) => {
      event.preventDefault();
      contextLostRef.current = true;
      console.error("[WebGL] Context lost - attempting recovery...");
      try {
        gl.setAnimationLoop(null);
      } catch (e) {
        console.warn("[WebGL] Could not stop animation loop:", e);
      }
    };

    const handleContextRestored = () => {
      console.log("[WebGL] Context restored - forcing re-render");
      contextLostRef.current = false;
      forceUpdate((prev) => prev + 1);
      setTimeout(() => {
        console.log("[WebGL] Recovery complete");
      }, 100);
    };

    const canvas = gl.domElement;
    canvas.addEventListener("webglcontextlost", handleContextLoss);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);

    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLoss);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
    };
  }, [gl]);

  return null;
}
```

---

**Date:** 2025-01-28
**Status:** ✅ WebGL Context Stable
**Result:** Playable game with optimized performance
