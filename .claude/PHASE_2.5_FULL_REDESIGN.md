# PHASE 2.5: ELLIE FULL REDESIGN - REALISTIC SHIH TZU

## Mission Statement
Complete visual transformation of Ellie from emoji-style to photo-realistic Shih Tzu matching reference photos. This is a comprehensive redesign maintaining Phase 1 (positioning) and Phase 2 (GSAP) functionality while achieving professional illustration quality.

---

## Reference Photo Analysis

### Observed Characteristics

**Photo 1 - With Orange Toy (Sitting, 3/4 view)**
- Cream/tan base color with golden ears
- Alert, happy expression
- Visible body structure and legs
- Natural fur flow and layering
- Pink collar visible

**Photo 2 - Pink Bandana (Front view, sitting)**
- Round face with prominent muzzle
- Large expressive eyes positioned slightly apart
- Natural ear fall framing face
- Visible front legs and paws
- Fluffy chest area

**Photo 3 - Close-up (Head detail)**
- CRITICAL REFERENCE for facial features
- Large, round, dark brown eyes (4-5x current size)
- Prominent black nose with visible nostrils
- Natural fur parting creating "eyebrows"
- Layered ear fur (tan/gold on top, lighter inside)
- Gentle, sweet expression

---

## Color Palette (Photo-Accurate)

```typescript
// Primary Colors
CREAM_BASE: '#F5E6D3'      // Body base, face base
CREAM_LIGHT: '#FBF4E8'     // Highlights, chest
TAN_ACCENT: '#D4C5B0'      // Ear tops, shadows
GOLD_ACCENT: '#C4B090'     // Ear highlights, depth

// Facial Features
NOSE_BLACK: '#1A1410'      // Nose, eye pupils
EYE_BROWN: '#2C1810'       // Eye color
EYE_SHINE: '#FFFFFF'       // Eye highlights

// Shadows & Depth
FUR_SHADOW: 'rgba(212, 197, 176, 0.3)'
DEPTH_SHADOW: 'rgba(180, 170, 150, 0.2)'

// Accessories
COLLAR_PINK: '#FFB5D5'     // Pink collar from photos
TONGUE_PINK: '#FFB5BA'     // Tongue color
```

---

## New Coordinate System (Realistic Proportions)

**Current SVG ViewBox**: `0 0 100 100`

### Body Structure (Natural Shih Tzu)

```typescript
// Body - More oval, less round
body: {
  cx: 50,
  cy: 65,
  rx: 18,  // Wider
  ry: 16,  // Taller
}

// Chest - Prominent fluffy area
chest: {
  cx: 50,
  cy: 70,
  rx: 12,
  ry: 10,
}

// Neck - Connect head to body naturally
neck: {
  cx: 50,
  cy: 48,
  rx: 8,
  ry: 6,
}
```

### Head Structure (Photo-Accurate)

```typescript
// Head - Larger, rounder
head: {
  cx: 50,
  cy: 35,
  radius: 16,  // Increased from 12
}

// Muzzle - More prominent, defined
muzzle: {
  upper: {
    cx: 50,
    cy: 42,
    rx: 8,
    ry: 6,
  },
  lower: {
    cx: 50,
    cy: 45,
    rx: 6,
    ry: 4,
  }
}

// Face shape overlay
faceOval: {
  cx: 50,
  cy: 35,
  rx: 14,
  ry: 16,
}
```

### Facial Features (Critical Detail)

```typescript
// Eyes - MUCH LARGER (from photos)
eyes: {
  left: {
    cx: 44,   // Slightly wider apart
    cy: 32,
    radius: 4.5,  // Triple current size!
  },
  right: {
    cx: 56,
    cy: 32,
    radius: 4.5,
  }
}

// Nose - Prominent and detailed
nose: {
  cx: 50,
  cy: 42,
  width: 5,   // Larger
  height: 4,  // More prominent
}

// Nostrils
nostrils: {
  left: {
    cx: 48.5,
    cy: 43,
    rx: 0.8,
    ry: 1.2,
  },
  right: {
    cx: 51.5,
    cy: 43,
    rx: 0.8,
    ry: 1.2,
  }
}
```

### Ears (Natural Fall)

```typescript
// Left Ear - Teardrop shape
leftEar: {
  // Outer ear
  path: 'M 38 30 Q 32 28 30 35 Q 28 42 32 48 Q 36 50 40 46 Q 42 40 40 35 Z',
  
  // Inner ear (lighter)
  innerPath: 'M 38 32 Q 34 30 33 36 Q 32 42 35 46 Q 38 47 40 44 Q 41 39 40 36 Z',
}

// Right Ear - Mirror
rightEar: {
  path: 'M 62 30 Q 68 28 70 35 Q 72 42 68 48 Q 64 50 60 46 Q 58 40 60 35 Z',
  innerPath: 'M 62 32 Q 66 30 67 36 Q 68 42 65 46 Q 62 47 60 44 Q 59 39 60 36 Z',
}
```

### Legs (Visible in sitting pose)

```typescript
// Front legs - visible when sitting
frontLegs: {
  left: {
    path: 'M 42 75 L 40 85 Q 40 88 42 88 L 44 88 Q 45 88 45 85 L 44 75 Z',
  },
  right: {
    path: 'M 58 75 L 60 85 Q 60 88 58 88 L 56 88 Q 55 88 55 85 L 56 75 Z',
  }
}

// Paws - small ovals at bottom
paws: {
  left: { cx: 42, cy: 87, rx: 2, ry: 1.5 },
  right: { cx: 58, cy: 87, rx: 2, ry: 1.5 },
}
```

---

## Implementation Instructions for Claude Code

### STEP 1: Create New Color Constants

**@frontend-builder**: Establish photo-accurate palette

**File**: `frontend/src/components/ellie/constants/defaults.ts`

**REPLACE entire color section:**

```typescript
// Photo-Accurate Shih Tzu Color Palette
export const ELLIE_COLORS = {
  // Primary Fur Colors
  CREAM_BASE: '#F5E6D3',
  CREAM_LIGHT: '#FBF4E8',
  TAN_ACCENT: '#D4C5B0',
  GOLD_ACCENT: '#C4B090',
  
  // Facial Features
  NOSE_BLACK: '#1A1410',
  EYE_BROWN: '#2C1810',
  EYE_SHINE: '#FFFFFF',
  
  // Shadows & Depth
  FUR_SHADOW: 'rgba(212, 197, 176, 0.3)',
  DEPTH_SHADOW: 'rgba(180, 170, 150, 0.2)',
  
  // Accessories
  COLLAR_PINK: '#FFB5D5',
  TONGUE_PINK: '#FFB5BA',
};

// Legacy exports for compatibility
export const DEFAULT_FUR_COLOR = ELLIE_COLORS.CREAM_BASE;
export const DEFAULT_COLLAR_COLOR = ELLIE_COLORS.COLLAR_PINK;
```

**Validation**: Colors exported and compile

---

### STEP 2: Update Coordinate Constants

**@frontend-builder**: Realistic proportions

**File**: `frontend/src/components/ellie/constants/coordinates.ts`

**REPLACE ELLIE_COORDINATES:**

```typescript
export const ELLIE_COORDINATES = {
  // Body structure - natural Shih Tzu proportions
  body: {
    cx: 50,
    cy: 65,
    rx: 18,
    ry: 16,
  },
  
  chest: {
    cx: 50,
    cy: 70,
    rx: 12,
    ry: 10,
  },
  
  neck: {
    cx: 50,
    cy: 48,
    rx: 8,
    ry: 6,
  },
  
  // Head - larger, rounder
  head: {
    cx: 50,
    cy: 35,
    radius: 16,
  },
  
  // Muzzle - prominent
  muzzle: {
    upper: {
      cx: 50,
      cy: 42,
      rx: 8,
      ry: 6,
    },
    lower: {
      cx: 50,
      cy: 45,
      rx: 6,
      ry: 4,
    },
  },
  
  // Face shape
  faceOval: {
    cx: 50,
    cy: 35,
    rx: 14,
    ry: 16,
  },
  
  // Facial features - photo-accurate
  face: {
    leftEye: {
      cx: 44,
      cy: 32,
      radius: 4.5,
    },
    rightEye: {
      cx: 56,
      cy: 32,
      radius: 4.5,
    },
    nose: {
      cx: 50,
      cy: 42,
      width: 5,
      height: 4,
    },
    nostrils: {
      left: {
        cx: 48.5,
        cy: 43,
        rx: 0.8,
        ry: 1.2,
      },
      right: {
        cx: 51.5,
        cy: 43,
        rx: 0.8,
        ry: 1.2,
      },
    },
    // Ears - natural teardrop shapes
    leftEar: {
      cx: 36,
      cy: 38,
      rx: 6,
      ry: 12,
      rotation: -15,
    },
    rightEar: {
      cx: 64,
      cy: 38,
      rx: 6,
      ry: 12,
      rotation: 15,
    },
  },
  
  // Tail
  tail: {
    cx: 50,
    cy: 55,
    innerRadius: 3,
    outerRadius: 8,
  },
  
  // Legs
  legs: {
    frontLeft: {
      top: { x: 42, y: 75 },
      bottom: { x: 40, y: 87 },
      width: 4,
    },
    frontRight: {
      top: { x: 58, y: 75 },
      bottom: { x: 60, y: 87 },
      width: 4,
    },
  },
  
  // Paws
  paws: {
    left: { cx: 42, cy: 87, rx: 2, ry: 1.5 },
    right: { cx: 58, cy: 87, rx: 2, ry: 1.5 },
  },
  
  // Shadow
  shadow: {
    cx: 50,
    cy: 90,
    rx: 20,
    ry: 3,
  },
};
```

**Validation**: New coordinates compile and export

---

### STEP 3: Completely Redesign Eyes Component

**@frontend-builder**: Photo-accurate large expressive eyes

**File**: `frontend/src/components/ellie/facial/Eyes.tsx`

**REPLACE ENTIRE FILE:**

```typescript
import React from 'react';
import type { FacialFeatureProps } from '../types/ellie.types';
import { ELLIE_COORDINATES, ELLIE_COLORS } from '../constants';

export const Eyes: React.FC<FacialFeatureProps> = ({ mood, className = '' }) => {
  const { leftEye, rightEye } = ELLIE_COORDINATES.face;
  const { EYE_BROWN, EYE_SHINE, DEPTH_SHADOW } = ELLIE_COLORS;

  const renderEyes = () => {
    switch(mood) {
      case 'sleeping':
        // Closed eyes - gentle curves
        return (
          <>
            <defs>
              <filter id="eyeSoftShadow">
                <feGaussianBlur in="SourceAlpha" stdDeviation="0.5"/>
                <feOffset dx="0" dy="0.5" result="offsetblur"/>
                <feFlood floodColor={DEPTH_SHADOW}/>
                <feComposite in2="offsetblur" operator="in"/>
                <feMerge>
                  <feMergeNode/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* Closed eyelids */}
            <path
              d={`M ${leftEye.cx - 5} ${leftEye.cy} Q ${leftEye.cx} ${leftEye.cy + 2} ${leftEye.cx + 5} ${leftEye.cy}`}
              stroke={EYE_BROWN}
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
              filter="url(#eyeSoftShadow)"
            />
            <path
              d={`M ${rightEye.cx - 5} ${rightEye.cy} Q ${rightEye.cx} ${rightEye.cy + 2} ${rightEye.cx + 5} ${rightEye.cy}`}
              stroke={EYE_BROWN}
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
              filter="url(#eyeSoftShadow)"
            />
            
            {/* Sleeping lashes */}
            {[leftEye, rightEye].map((eye, idx) => (
              <g key={idx}>
                <line
                  x1={eye.cx - 3}
                  y1={eye.cy}
                  x2={eye.cx - 3.5}
                  y2={eye.cy - 1.5}
                  stroke={EYE_BROWN}
                  strokeWidth="0.5"
                  strokeLinecap="round"
                  opacity="0.6"
                />
                <line
                  x1={eye.cx + 3}
                  y1={eye.cy}
                  x2={eye.cx + 3.5}
                  y2={eye.cy - 1.5}
                  stroke={EYE_BROWN}
                  strokeWidth="0.5"
                  strokeLinecap="round"
                  opacity="0.6"
                />
              </g>
            ))}
          </>
        );

      case 'happy':
      case 'excited':
      case 'celebrating':
        // Wide, bright, sparkling eyes
        return (
          <>
            <defs>
              <radialGradient id="eyeGradient" cx="40%" cy="40%">
                <stop offset="0%" stopColor={EYE_BROWN} stopOpacity="1"/>
                <stop offset="100%" stopColor="#1A0F08" stopOpacity="1"/>
              </radialGradient>
            </defs>
            
            {[leftEye, rightEye].map((eye, idx) => (
              <g key={idx}>
                {/* Eye white subtle background */}
                <circle
                  cx={eye.cx}
                  cy={eye.cy}
                  r={eye.radius + 0.5}
                  fill="#FDFBF8"
                  opacity="0.3"
                />
                
                {/* Main eye with gradient */}
                <circle
                  cx={eye.cx}
                  cy={eye.cy}
                  r={eye.radius}
                  fill="url(#eyeGradient)"
                />
                
                {/* Large primary shine (top-left) */}
                <ellipse
                  cx={eye.cx - 1.2}
                  cy={eye.cy - 1.2}
                  rx="1.8"
                  ry="2"
                  fill={EYE_SHINE}
                  opacity="0.95"
                />
                
                {/* Secondary shine (bottom-right) */}
                <circle
                  cx={eye.cx + 1}
                  cy={eye.cy + 1.5}
                  r="0.9"
                  fill={EYE_SHINE}
                  opacity="0.7"
                />
                
                {/* Tiny sparkle */}
                <circle
                  cx={eye.cx + 2}
                  cy={eye.cy - 1.5}
                  r="0.4"
                  fill={EYE_SHINE}
                  opacity="0.8"
                />
                
                {/* Upper eyelid suggestion */}
                <path
                  d={`M ${eye.cx - eye.radius} ${eye.cy - 2} Q ${eye.cx} ${eye.cy - eye.radius - 1} ${eye.cx + eye.radius} ${eye.cy - 2}`}
                  stroke={DEPTH_SHADOW}
                  strokeWidth="0.8"
                  fill="none"
                  opacity="0.4"
                />
              </g>
            ))}
          </>
        );

      case 'concerned':
        // Wide eyes with worried expression
        return (
          <>
            <defs>
              <radialGradient id="eyeGradient" cx="40%" cy="40%">
                <stop offset="0%" stopColor={EYE_BROWN} stopOpacity="1"/>
                <stop offset="100%" stopColor="#1A0F08" stopOpacity="1"/>
              </radialGradient>
            </defs>
            
            {[leftEye, rightEye].map((eye, idx) => (
              <g key={idx}>
                {/* Main eye */}
                <circle
                  cx={eye.cx}
                  cy={eye.cy}
                  r={eye.radius}
                  fill="url(#eyeGradient)"
                />
                
                {/* Shine - slightly higher for concerned look */}
                <ellipse
                  cx={eye.cx - 1}
                  cy={eye.cy - 1.5}
                  rx="1.5"
                  ry="1.8"
                  fill={EYE_SHINE}
                  opacity="0.9"
                />
                
                {/* Secondary shine */}
                <circle
                  cx={eye.cx + 1}
                  cy={eye.cy + 1}
                  r="0.7"
                  fill={EYE_SHINE}
                  opacity="0.6"
                />
              </g>
            ))}
            
            {/* Worried eyebrows */}
            <path
              d={`M ${leftEye.cx - 4} ${leftEye.cy - 7} Q ${leftEye.cx - 1} ${leftEye.cy - 8} ${leftEye.cx + 2} ${leftEye.cy - 9}`}
              stroke={EYE_BROWN}
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
              opacity="0.7"
            />
            <path
              d={`M ${rightEye.cx + 4} ${rightEye.cy - 7} Q ${rightEye.cx + 1} ${rightEye.cy - 8} ${rightEye.cx - 2} ${rightEye.cy - 9}`}
              stroke={EYE_BROWN}
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
              opacity="0.7"
            />
          </>
        );

      default:
        // Default: Large, expressive, soulful eyes (like reference photos)
        return (
          <>
            <defs>
              <radialGradient id="eyeGradient" cx="40%" cy="40%">
                <stop offset="0%" stopColor={EYE_BROWN} stopOpacity="1"/>
                <stop offset="100%" stopColor="#1A0F08" stopOpacity="1"/>
              </radialGradient>
              
              {/* Subtle eye socket shadow */}
              <radialGradient id="eyeSocketGradient" cx="50%" cy="50%">
                <stop offset="60%" stopColor="transparent"/>
                <stop offset="100%" stopColor={DEPTH_SHADOW}/>
              </radialGradient>
            </defs>
            
            {[leftEye, rightEye].map((eye, idx) => (
              <g key={idx}>
                {/* Eye socket subtle shadow */}
                <circle
                  cx={eye.cx}
                  cy={eye.cy}
                  r={eye.radius + 1.5}
                  fill="url(#eyeSocketGradient)"
                  opacity="0.15"
                />
                
                {/* Eye white subtle hint */}
                <circle
                  cx={eye.cx}
                  cy={eye.cy}
                  r={eye.radius + 0.3}
                  fill="#FDFBF8"
                  opacity="0.2"
                />
                
                {/* Main eye iris with gradient */}
                <circle
                  cx={eye.cx}
                  cy={eye.cy}
                  r={eye.radius}
                  fill="url(#eyeGradient)"
                />
                
                {/* Large prominent shine (primary) - top-left */}
                <ellipse
                  cx={eye.cx - 1.2}
                  cy={eye.cy - 1.2}
                  rx="1.6"
                  ry="1.9"
                  fill={EYE_SHINE}
                  opacity="0.95"
                />
                
                {/* Secondary shine (bottom-right) */}
                <circle
                  cx={eye.cx + 1}
                  cy={eye.cy + 1.5}
                  r="0.8"
                  fill={EYE_SHINE}
                  opacity="0.65"
                />
                
                {/* Pupil depth */}
                <circle
                  cx={eye.cx + 0.3}
                  cy={eye.cy + 0.3}
                  r={eye.radius * 0.6}
                  fill="#0A0604"
                  opacity="0.5"
                />
                
                {/* Upper eyelid subtle definition */}
                <ellipse
                  cx={eye.cx}
                  cy={eye.cy - eye.radius - 0.5}
                  rx={eye.radius}
                  ry="1.2"
                  fill={DEPTH_SHADOW}
                  opacity="0.15"
                />
                
                {/* Lower eyelid subtle definition */}
                <ellipse
                  cx={eye.cx}
                  cy={eye.cy + eye.radius + 0.3}
                  rx={eye.radius * 0.8}
                  ry="0.8"
                  fill={DEPTH_SHADOW}
                  opacity="0.1"
                />
              </g>
            ))}
          </>
        );
    }
  };

  return (
    <g className={`ellie-eyes ${className}`}>
      {renderEyes()}
    </g>
  );
};
```

**Validation**: 
- Eyes now 4.5px radius (3x larger!)
- Multiple shine points
- Gradient depth
- Eyelid definition

---

### STEP 4: Redesign Nose (Prominent & Detailed)

**@frontend-builder**: Photo-accurate nose

**File**: `frontend/src/components/ellie/facial/Nose.tsx`

**REPLACE core nose rendering:**

```typescript
import React from 'react';
import type { FacialFeatureProps } from '../types/ellie.types';
import { ELLIE_COORDINATES, ELLIE_COLORS } from '../constants';

export interface NoseProps extends FacialFeatureProps {
  onClick?: () => void;
}

export const Nose: React.FC<NoseProps> = ({ mood, onClick, className = '' }) => {
  const { nose, nostrils } = ELLIE_COORDINATES.face;
  const { NOSE_BLACK, DEPTH_SHADOW } = ELLIE_COLORS;

  return (
    <g className={`ellie-nose ${className}`}>
      <defs>
        {/* Nose gradient for depth */}
        <radialGradient id="noseGradient" cx="30%" cy="30%">
          <stop offset="0%" stopColor={NOSE_BLACK} stopOpacity="0.9"/>
          <stop offset="100%" stopColor={NOSE_BLACK} stopOpacity="1"/>
        </radialGradient>
      </defs>
      
      {/* Main nose - rounded triangle/heart shape */}
      <ellipse
        cx={nose.cx}
        cy={nose.cy}
        rx={nose.width / 2}
        ry={nose.height / 2}
        fill="url(#noseGradient)"
        style={{ cursor: onClick ? 'pointer' : 'default' }}
        onClick={onClick}
      />
      
      {/* Nose bridge definition */}
      <path
        d={`M ${nose.cx} ${nose.cy - nose.height / 2} L ${nose.cx} ${nose.cy - 2}`}
        stroke={DEPTH_SHADOW}
        strokeWidth="0.8"
        opacity="0.3"
      />
      
      {/* Detailed nostrils */}
      <ellipse
        cx={nostrils.left.cx}
        cy={nostrils.left.cy}
        rx={nostrils.left.rx}
        ry={nostrils.left.ry}
        fill="rgba(0, 0, 0, 0.5)"
      />
      <ellipse
        cx={nostrils.right.cx}
        cy={nostrils.right.cy}
        rx={nostrils.right.rx}
        ry={nostrils.right.ry}
        fill="rgba(0, 0, 0, 0.5)"
      />
      
      {/* Nose shine - subtle, top-left */}
      <ellipse
        cx={nose.cx - 1.2}
        cy={nose.cy - 1}
        rx="1.2"
        ry="0.9"
        fill="rgba(255, 255, 255, 0.35)"
      />
      
      {/* Philtrum (nose-to-mouth line) */}
      <line
        x1={nose.cx}
        y1={nose.cy + nose.height / 2}
        x2={nose.cx}
        y2={nose.cy + nose.height / 2 + 2}
        stroke={DEPTH_SHADOW}
        strokeWidth="0.6"
        opacity="0.4"
      />
    </g>
  );
};
```

**Validation**:
- Nose is larger and more prominent
- Visible nostrils
- Subtle shine
- Natural philtrum line

---

### STEP 5: Completely Redesign Ears (Natural Fall)

**@frontend-builder**: Photo-accurate hanging ears

**File**: `frontend/src/components/ellie/facial/Ears.tsx`

**REPLACE ENTIRE FILE:**

```typescript
import React from 'react';
import type { FacialFeatureProps } from '../types/ellie.types';
import { ELLIE_COORDINATES, ELLIE_COLORS } from '../constants';

export const Ears = React.forwardRef<SVGGElement, FacialFeatureProps>(
  ({ furColor, mood, className = '' }, ref) => {
    const { leftEar, rightEar } = ELLIE_COORDINATES.face;
    const { TAN_ACCENT, GOLD_ACCENT, CREAM_LIGHT, FUR_SHADOW } = ELLIE_COLORS;

    return (
      <g className={`ellie-ears ${className}`} ref={ref}>
        <defs>
          {/* Ear outer gradient - tan/gold top, cream bottom */}
          <linearGradient id="earOuterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={GOLD_ACCENT} stopOpacity="1"/>
            <stop offset="30%" stopColor={TAN_ACCENT} stopOpacity="1"/>
            <stop offset="70%" stopColor={furColor || ELLIE_COLORS.CREAM_BASE} stopOpacity="1"/>
            <stop offset="100%" stopColor={CREAM_LIGHT} stopOpacity="0.8"/>
          </linearGradient>
          
          {/* Ear inner gradient - lighter */}
          <linearGradient id="earInnerGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={CREAM_LIGHT} stopOpacity="1"/>
            <stop offset="100%" stopColor={furColor || ELLIE_COLORS.CREAM_BASE} stopOpacity="0.8"/>
          </linearGradient>
          
          {/* Ear shadow */}
          <filter id="earSoftShadow">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1"/>
            <feOffset dx="0.5" dy="1" result="offsetblur"/>
            <feFlood floodColor={FUR_SHADOW}/>
            <feComposite in2="offsetblur" operator="in"/>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* LEFT EAR */}
        <g transform={`rotate(${leftEar.rotation} ${leftEar.cx} ${leftEar.cy - 2})`}>
          {/* Outer ear shape - teardrop */}
          <ellipse
            cx={leftEar.cx}
            cy={leftEar.cy}
            rx={leftEar.rx}
            ry={leftEar.ry}
            fill="url(#earOuterGradient)"
            filter="url(#earSoftShadow)"
          />
          
          {/* Inner ear lighter area */}
          <ellipse
            cx={leftEar.cx + 1}
            cy={leftEar.cy + 2}
            rx={leftEar.rx - 1.5}
            ry={leftEar.ry - 2}
            fill="url(#earInnerGradient)"
            opacity="0.7"
          />
          
          {/* Fur flow lines */}
          <path
            d={`M ${leftEar.cx - 2} ${leftEar.cy - 4} Q ${leftEar.cx} ${leftEar.cy + 4} ${leftEar.cx - 1} ${leftEar.cy + 10}`}
            stroke={FUR_SHADOW}
            strokeWidth="0.6"
            fill="none"
            opacity="0.3"
          />
          <path
            d={`M ${leftEar.cx + 1} ${leftEar.cy - 3} Q ${leftEar.cx + 1} ${leftEar.cy + 5} ${leftEar.cx + 1} ${leftEar.cy + 9}`}
            stroke={FUR_SHADOW}
            strokeWidth="0.5"
            fill="none"
            opacity="0.25"
          />
        </g>

        {/* RIGHT EAR - mirror of left */}
        <g transform={`rotate(${rightEar.rotation} ${rightEar.cx} ${rightEar.cy - 2})`}>
          {/* Outer ear shape */}
          <ellipse
            cx={rightEar.cx}
            cy={rightEar.cy}
            rx={rightEar.rx}
            ry={rightEar.ry}
            fill="url(#earOuterGradient)"
            filter="url(#earSoftShadow)"
          />
          
          {/* Inner ear lighter area */}
          <ellipse
            cx={rightEar.cx - 1}
            cy={rightEar.cy + 2}
            rx={rightEar.rx - 1.5}
            ry={rightEar.ry - 2}
            fill="url(#earInnerGradient)"
            opacity="0.7"
          />
          
          {/* Fur flow lines */}
          <path
            d={`M ${rightEar.cx + 2} ${rightEar.cy - 4} Q ${rightEar.cx} ${rightEar.cy + 4} ${rightEar.cx + 1} ${rightEar.cy + 10}`}
            stroke={FUR_SHADOW}
            strokeWidth="0.6"
            fill="none"
            opacity="0.3"
          />
          <path
            d={`M ${rightEar.cx - 1} ${rightEar.cy - 3} Q ${rightEar.cx - 1} ${rightEar.cy + 5} ${rightEar.cx - 1} ${rightEar.cy + 9}`}
            stroke={FUR_SHADOW}
            strokeWidth="0.5"
            fill="none"
            opacity="0.25"
          />
        </g>
      </g>
    );
  }
);

Ears.displayName = 'Ears';
```

**Validation**:
- Ears have natural teardrop shape
- Gold/tan gradient matching photos
- Inner ear detail visible
- Fur flow texture lines

---

### STEP 6: Redesign Head (Fluffy, Natural Fur)

**@frontend-builder**: Complete head with fur texture

**File**: `frontend/src/components/ellie/anatomy/Head.tsx`

**REPLACE with layered approach:**

```typescript
import React from 'react';
import type { BodyPartProps } from '../types/ellie.types';
import { Nose, Mouth, Tongue, Eyes, Ears } from '../facial';
import { ELLIE_COORDINATES, ELLIE_COLORS } from '../constants';

export interface HeadProps extends BodyPartProps {
  onNoseBoop?: () => void;
}

export const Head = React.forwardRef<SVGGElement, HeadProps>(
  ({ furColor, mood, onNoseBoop, className = '' }, ref) => {
    const { head, muzzle, faceOval } = ELLIE_COORDINATES;
    const { CREAM_BASE, CREAM_LIGHT, TAN_ACCENT, FUR_SHADOW, DEPTH_SHADOW } = ELLIE_COLORS;
    
    const activeFurColor = furColor || CREAM_BASE;

    return (
      <g className={`ellie-head ${className}`} ref={ref}>
        <defs>
          {/* Head fur gradient - lighter on top, darker on sides */}
          <radialGradient id="headFurGradient" cx="50%" cy="25%">
            <stop offset="0%" stopColor={CREAM_LIGHT} stopOpacity="1"/>
            <stop offset="40%" stopColor={activeFurColor} stopOpacity="1"/>
            <stop offset="80%" stopColor={TAN_ACCENT} stopOpacity="0.4"/>
            <stop offset="100%" stopColor={FUR_SHADOW}/>
          </radialGradient>
          
          {/* Muzzle gradient - lighter, prominent */}
          <radialGradient id="muzzleGradient" cx="50%" cy="30%">
            <stop offset="0%" stopColor={CREAM_LIGHT} stopOpacity="1"/>
            <stop offset="70%" stopColor={activeFurColor} stopOpacity="1"/>
            <stop offset="100%" stopColor={activeFurColor} stopOpacity="0.8"/>
          </radialGradient>
          
          {/* Soft shadow filter */}
          <filter id="headSoftShadow">
            <feGaussianBlur in="SourceAlpha" stdDeviation="0.8"/>
            <feOffset dx="0" dy="0.5" result="offsetblur"/>
            <feFlood floodColor={DEPTH_SHADOW}/>
            <feComposite in2="offsetblur" operator="in"/>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Ears (behind head) */}
        <Ears furColor={activeFurColor} mood={mood} />

        {/* Main head - round with gradient */}
        <circle
          cx={head.cx}
          cy={head.cy}
          r={head.radius}
          fill="url(#headFurGradient)"
        />
        
        {/* Face shape overlay - slightly oval */}
        <ellipse
          cx={faceOval.cx}
          cy={faceOval.cy}
          rx={faceOval.rx}
          ry={faceOval.ry}
          fill={activeFurColor}
          opacity="0.6"
        />
        
        {/* Top of head fluffy texture */}
        <path
          d={`M ${head.cx - 12} ${head.cy - 10} Q ${head.cx - 6} ${head.cy - 14} ${head.cx} ${head.cy - 15} Q ${head.cx + 6} ${head.cy - 14} ${head.cx + 12} ${head.cy - 10}`}
          stroke={FUR_SHADOW}
          strokeWidth="1"
          fill="none"
          opacity="0.15"
        />
        
        {/* Natural fur parting (like photo 3) */}
        <line
          x1={head.cx}
          y1={head.cy - head.radius + 3}
          x2={head.cx}
          y2={head.cy - 6}
          stroke={FUR_SHADOW}
          strokeWidth="0.7"
          opacity="0.25"
        />
        
        {/* Side fur texture (left) */}
        <path
          d={`M ${head.cx - 10} ${head.cy - 5} Q ${head.cx - 12} ${head.cy} ${head.cx - 11} ${head.cy + 5}`}
          stroke={FUR_SHADOW}
          strokeWidth="0.6"
          fill="none"
          opacity="0.2"
        />
        
        {/* Side fur texture (right) */}
        <path
          d={`M ${head.cx + 10} ${head.cy - 5} Q ${head.cx + 12} ${head.cy} ${head.cx + 11} ${head.cy + 5}`}
          stroke={FUR_SHADOW}
          strokeWidth="0.6"
          fill="none"
          opacity="0.2"
        />

        {/* Upper muzzle with gradient */}
        <ellipse
          cx={muzzle.upper.cx}
          cy={muzzle.upper.cy}
          rx={muzzle.upper.rx}
          ry={muzzle.upper.ry}
          fill="url(#muzzleGradient)"
          filter="url(#headSoftShadow)"
        />

        {/* Lower muzzle/jaw */}
        <ellipse
          cx={muzzle.lower.cx}
          cy={muzzle.lower.cy}
          rx={muzzle.lower.rx}
          ry={muzzle.lower.ry}
          fill="url(#muzzleGradient)"
        />
        
        {/* Muzzle fur texture */}
        <path
          d={`M ${muzzle.upper.cx - 4} ${muzzle.upper.cy} Q ${muzzle.upper.cx} ${muzzle.upper.cy - 2} ${muzzle.upper.cx + 4} ${muzzle.upper.cy}`}
          stroke={FUR_SHADOW}
          strokeWidth="0.5"
          fill="none"
          opacity="0.2"
        />

        {/* Eyes */}
        <Eyes mood={mood} />

        {/* Nose */}
        <Nose mood={mood} onClick={onNoseBoop} />

        {/* Mouth */}
        <Mouth mood={mood} />

        {/* Tongue (on top of everything) */}
        <Tongue mood={mood} />
      </g>
    );
  }
);

Head.displayName = 'Head';
```

**Validation**:
- Head has multi-layer gradients
- Fur parting visible (like photo 3)
- Natural texture lines
- Fluffy appearance

---

### STEP 7: Redesign Body (Natural Proportions)

**@frontend-builder**: Realistic Shih Tzu body

**File**: `frontend/src/components/ellie/anatomy/Body.tsx`

**REPLACE ENTIRE FILE:**

```typescript
import React from 'react';
import type { BodyPartProps } from '../types/ellie.types';
import { ELLIE_COORDINATES, ELLIE_COLORS } from '../constants';

export const Body = React.forwardRef<SVGGElement, BodyPartProps>(
  ({ furColor, className = '' }, ref) => {
    const { body, chest, neck } = ELLIE_COORDINATES;
    const { CREAM_BASE, CREAM_LIGHT, TAN_ACCENT, FUR_SHADOW, DEPTH_SHADOW } = ELLIE_COLORS;
    
    const activeFurColor = furColor || CREAM_BASE;

    return (
      <g className={`ellie-body ${className}`} ref={ref}>
        <defs>
          {/* Body fur gradient */}
          <radialGradient id="bodyFurGradient" cx="50%" cy="20%">
            <stop offset="0%" stopColor={activeFurColor} stopOpacity="1"/>
            <stop offset="60%" stopColor={activeFurColor} stopOpacity="1"/>
            <stop offset="100%" stopColor={TAN_ACCENT} stopOpacity="0.3"/>
          </radialGradient>
          
          {/* Chest highlight gradient */}
          <radialGradient id="chestGradient" cx="50%" cy="30%">
            <stop offset="0%" stopColor={CREAM_LIGHT} stopOpacity="0.9"/>
            <stop offset="50%" stopColor={activeFurColor} stopOpacity="0.6"/>
            <stop offset="100%" stopColor={activeFurColor} stopOpacity="0"/>
          </radialGradient>
          
          {/* Neck gradient */}
          <radialGradient id="neckGradient" cx="50%" cy="30%">
            <stop offset="0%" stopColor={CREAM_LIGHT} stopOpacity="1"/>
            <stop offset="100%" stopColor={activeFurColor} stopOpacity="1"/>
          </radialGradient>
          
          {/* Soft shadow */}
          <filter id="bodySoftShadow">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1"/>
            <feOffset dx="0" dy="1" result="offsetblur"/>
            <feFlood floodColor={DEPTH_SHADOW}/>
            <feComposite in2="offsetblur" operator="in"/>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Neck connector */}
        <ellipse
          cx={neck.cx}
          cy={neck.cy}
          rx={neck.rx}
          ry={neck.ry}
          fill="url(#neckGradient)"
        />

        {/* Main body with gradient */}
        <ellipse
          cx={body.cx}
          cy={body.cy}
          rx={body.rx}
          ry={body.ry}
          fill="url(#bodyFurGradient)"
          filter="url(#bodySoftShadow)"
        />

        {/* Fluffy chest highlight */}
        <ellipse
          cx={chest.cx}
          cy={chest.cy}
          rx={chest.rx}
          ry={chest.ry}
          fill="url(#chestGradient)"
        />
        
        {/* Chest fur texture - layered fluffy appearance */}
        <path
          d={`M ${chest.cx - 8} ${chest.cy - 3} Q ${chest.cx} ${chest.cy - 5} ${chest.cx + 8} ${chest.cy - 3}`}
          stroke={FUR_SHADOW}
          strokeWidth="0.7"
          fill="none"
          opacity="0.2"
        />
        <path
          d={`M ${chest.cx - 10} ${chest.cy + 2} Q ${chest.cx} ${chest.cy} ${chest.cx + 10} ${chest.cy + 2}`}
          stroke={FUR_SHADOW}
          strokeWidth="0.7"
          fill="none"
          opacity="0.2"
        />
        <path
          d={`M ${chest.cx - 9} ${chest.cy + 6} Q ${chest.cx} ${chest.cy + 4} ${chest.cx + 9} ${chest.cy + 6}`}
          stroke={FUR_SHADOW}
          strokeWidth="0.6"
          fill="none"
          opacity="0.15"
        />
        
        {/* Side body texture */}
        <path
          d={`M ${body.cx - 15} ${body.cy - 5} Q ${body.cx - 16} ${body.cy + 5} ${body.cx - 14} ${body.cy + 10}`}
          stroke={FUR_SHADOW}
          strokeWidth="0.6"
          fill="none"
          opacity="0.15"
        />
        <path
          d={`M ${body.cx + 15} ${body.cy - 5} Q ${body.cx + 16} ${body.cy + 5} ${body.cx + 14} ${body.cy + 10}`}
          stroke={FUR_SHADOW}
          strokeWidth="0.6"
          fill="none"
          opacity="0.15"
        />
      </g>
    );
  }
);

Body.displayName = 'Body';
```

**Validation**:
- Body has natural oval shape
- Prominent fluffy chest
- Neck connector visible
- Layered fur texture

---

### STEP 8: Add Front Legs Component

**@frontend-builder**: Create visible legs (from sitting pose photos)

**CREATE NEW FILE**: `frontend/src/components/ellie/anatomy/Legs.tsx`

**REPLACE ENTIRE EXISTING FILE OR CREATE:**

```typescript
import React from 'react';
import type { BodyPartProps } from '../types/ellie.types';
import { ELLIE_COORDINATES, ELLIE_COLORS } from '../constants';

export const Legs = React.forwardRef<SVGGElement, BodyPartProps>(
  ({ furColor, mood, className = '' }, ref) => {
    const { legs, paws } = ELLIE_COORDINATES;
    const { CREAM_BASE, CREAM_LIGHT, FUR_SHADOW, DEPTH_SHADOW } = ELLIE_COLORS;
    
    const activeFurColor = furColor || CREAM_BASE;

    return (
      <g className={`ellie-legs ${className}`} ref={ref}>
        <defs>
          {/* Leg gradient */}
          <linearGradient id="legGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={activeFurColor} stopOpacity="1"/>
            <stop offset="70%" stopColor={activeFurColor} stopOpacity="1"/>
            <stop offset="100%" stopColor={CREAM_LIGHT} stopOpacity="1"/>
          </linearGradient>
          
          {/* Paw gradient */}
          <radialGradient id="pawGradient" cx="50%" cy="40%">
            <stop offset="0%" stopColor={CREAM_LIGHT} stopOpacity="1"/>
            <stop offset="100%" stopColor={activeFurColor} stopOpacity="0.8"/>
          </radialGradient>
        </defs>

        {/* LEFT LEG */}
        <g>
          {/* Leg shape */}
          <path
            d={`M ${legs.frontLeft.top.x} ${legs.frontLeft.top.y} 
                L ${legs.frontLeft.bottom.x} ${legs.frontLeft.bottom.y - 2}
                Q ${legs.frontLeft.bottom.x} ${legs.frontLeft.bottom.y} ${legs.frontLeft.bottom.x + 2} ${legs.frontLeft.bottom.y}
                L ${legs.frontLeft.top.x + legs.frontLeft.width} ${legs.frontLeft.bottom.y}
                Q ${legs.frontLeft.top.x + legs.frontLeft.width} ${legs.frontLeft.bottom.y - 2} ${legs.frontLeft.top.x + legs.frontLeft.width} ${legs.frontLeft.bottom.y - 3}
                L ${legs.frontLeft.top.x + legs.frontLeft.width} ${legs.frontLeft.top.y} Z`}
            fill="url(#legGradient)"
          />
          
          {/* Fur texture on leg */}
          <line
            x1={legs.frontLeft.top.x + 1}
            y1={legs.frontLeft.top.y + 2}
            x2={legs.frontLeft.bottom.x + 1}
            y2={legs.frontLeft.bottom.y - 3}
            stroke={FUR_SHADOW}
            strokeWidth="0.5"
            opacity="0.2"
          />
          
          {/* Paw */}
          <ellipse
            cx={paws.left.cx}
            cy={paws.left.cy}
            rx={paws.left.rx}
            ry={paws.left.ry}
            fill="url(#pawGradient)"
          />
          
          {/* Paw pads (subtle) */}
          {[0, 1, 2].map((i) => (
            <circle
              key={i}
              cx={paws.left.cx - 1 + i}
              cy={paws.left.cy - 0.3}
              r="0.3"
              fill={DEPTH_SHADOW}
              opacity="0.3"
            />
          ))}
        </g>

        {/* RIGHT LEG - mirror of left */}
        <g>
          {/* Leg shape */}
          <path
            d={`M ${legs.frontRight.top.x} ${legs.frontRight.top.y} 
                L ${legs.frontRight.bottom.x} ${legs.frontRight.bottom.y - 2}
                Q ${legs.frontRight.bottom.x} ${legs.frontRight.bottom.y} ${legs.frontRight.bottom.x - 2} ${legs.frontRight.bottom.y}
                L ${legs.frontRight.top.x - legs.frontRight.width} ${legs.frontRight.bottom.y}
                Q ${legs.frontRight.top.x - legs.frontRight.width} ${legs.frontRight.bottom.y - 2} ${legs.frontRight.top.x - legs.frontRight.width} ${legs.frontRight.bottom.y - 3}
                L ${legs.frontRight.top.x - legs.frontRight.width} ${legs.frontRight.top.y} Z`}
            fill="url(#legGradient)"
          />
          
          {/* Fur texture */}
          <line
            x1={legs.frontRight.top.x - 1}
            y1={legs.frontRight.top.y + 2}
            x2={legs.frontRight.bottom.x - 1}
            y2={legs.frontRight.bottom.y - 3}
            stroke={FUR_SHADOW}
            strokeWidth="0.5"
            opacity="0.2"
          />
          
          {/* Paw */}
          <ellipse
            cx={paws.right.cx}
            cy={paws.right.cy}
            rx={paws.right.rx}
            ry={paws.right.ry}
            fill="url(#pawGradient)"
          />
          
          {/* Paw pads */}
          {[0, 1, 2].map((i) => (
            <circle
              key={i}
              cx={paws.right.cx - 1 + i}
              cy={paws.right.cy - 0.3}
              r="0.3"
              fill={DEPTH_SHADOW}
              opacity="0.3"
            />
          ))}
        </g>
      </g>
    );
  }
);

Legs.displayName = 'Legs';
```

**Validation**:
- Front legs visible in sitting pose
- Natural gradient shading
- Paw detail at bottom

---

### STEP 9: Update ModularEnhancedShihTzu Integration

**@frontend-builder**: Integrate all new components

**File**: `frontend/src/components/ellie/ModularEnhancedShihTzu.tsx`

**UPDATE imports and rendering order:**

```typescript
// ENSURE these imports at top:
import { Head } from './anatomy/Head';
import { Body } from './anatomy/Body';
import { Neck } from './anatomy/Neck';
import { Legs } from './anatomy/Legs';
import { Tail } from './anatomy/Tail';
import { ELLIE_COLORS } from './constants';

// IN THE RENDER, UPDATE order (back to front):

{/* Shadow */}
<ellipse
  cx={ELLIE_COORDINATES.shadow.cx}
  cy={ELLIE_COORDINATES.shadow.cy}
  rx={ELLIE_COORDINATES.shadow.rx}
  ry={ELLIE_COORDINATES.shadow.ry}
  fill="rgba(0, 0, 0, 0.1)"
/>

{/* 1. Tail (furthest back) */}
<Tail furColor={effectiveFurColor} mood={mood} ref={animRefs.tail} />

{/* 2. Legs (behind body) */}
<Legs furColor={effectiveFurColor} mood={mood} ref={animRefs.legs} />

{/* 3. Body */}
<Body furColor={effectiveFurColor} mood={mood} ref={animRefs.body} />

{/* 4. Collar (on body/neck) */}
{collarStyle !== 'none' && (
  <Collar
    style={collarStyle}
    color={collarColor}
    showTag={collarTag}
  />
)}

{/* 5. Head (with all facial features) */}
<Head
  furColor={effectiveFurColor}
  mood={mood}
  onNoseBoop={handleNoseBoop}
  ref={animRefs.head}
/>

{/* 6. Variant decorations (balloons, snowflakes, etc.) */}
<VariantDecorations variant={variant} />
```

**Validation**:
- Proper layering (tail→legs→body→head)
- All components render
- GSAP refs attached

---

### STEP 10: Update GSAP Animation Hook (Add Legs Ref)

**@frontend-builder**: Support new anatomy

**File**: `frontend/src/components/ellie/hooks/useEllieAnimations.ts`

**ADD legs ref to interface:**

```typescript
interface AnimationRefs {
  body: React.RefObject<SVGGElement>;
  tail: React.RefObject<SVGGElement>;
  ears: React.RefObject<SVGGElement>;
  nose: React.RefObject<SVGGElement>;
  tongue: React.RefObject<SVGGElement>;
  head: React.RefObject<SVGGElement>;
  legs: React.RefObject<SVGGElement>;  // ADD THIS
}

// In the hook:
const legsRef = useRef<SVGGElement>(null);  // ADD THIS

// In the return:
return {
  refs: {
    body: bodyRef,
    tail: tailRef,
    ears: earsRef,
    nose: noseRef,
    tongue: tongueRef,
    head: headRef,
    legs: legsRef,  // ADD THIS
  },
  celebrate,
};
```

**Validation**:
- Legs ref available for animation
- No TypeScript errors

---

### STEP 11: Update Default Colors Globally

**@frontend-builder**: Apply new palette everywhere

**File**: `frontend/src/components/ellie/utils/variants.ts`

**UPDATE getEffectiveFurColor:**

```typescript
import { ELLIE_COLORS } from '../constants';

export function getEffectiveFurColor(
  propColor: string | undefined,
  variant: EllieVariant
): string {
  // Prop color always takes precedence
  if (propColor) return propColor;

  // Variant-specific colors
  const variantColors = getVariantColors(variant);
  
  // Use variant primary if not default
  if (variant !== 'default') {
    return variantColors.primary;
  }

  // New realistic default
  return ELLIE_COLORS.CREAM_BASE;  // Changed from '#FFFFFF'
}
```

**Validation**:
- Default is now cream/tan
- Variants still work
- Custom colors override

---

### STEP 12: Manual Visual Validation

**@validation-agent**: Comprehensive testing

**Run dev server:**
```bash
npm run dev
```

**Visual Comparison Checklist:**

Compare to reference photos:

1. **Overall Appearance**
   - [ ] Cream/tan coloring (not white)
   - [ ] Natural Shih Tzu proportions
   - [ ] Fluffy, layered appearance

2. **Face (Compare to Photo 3)**
   - [ ] Large expressive eyes (4.5px radius)
   - [ ] Prominent black nose
   - [ ] Natural fur parting
   - [ ] Round face shape
   - [ ] Tan/gold ears

3. **Body (Compare to Photos 1 & 2)**
   - [ ] Natural sitting pose
   - [ ] Visible front legs
   - [ ] Fluffy chest
   - [ ] Proper proportions

4. **Details**
   - [ ] Ear gradient (tan→cream)
   - [ ] Eye shine prominent
   - [ ] Fur texture visible
   - [ ] Paw detail present

5. **Animations (Phase 2 Integration)**
   - [ ] GSAP animations still work
   - [ ] Breathing natural
   - [ ] Tail wag smooth
   - [ ] Mood transitions smooth

6. **Positioning (Phase 1 Integration)**
   - [ ] Perch system works
   - [ ] Cycle button functions
   - [ ] Mobile hiding works

---

### STEP 13: Test Coverage Update

**@test-agent**: Update tests for new design

**Run tests:**
```bash
npm test -- modular-compatibility
```

**Expected**: Some snapshot updates needed

**Update snapshots:**
```bash
npm test -- -u
```

**Validation**:
- All tests passing
- Visual changes documented
- No functional regressions

---

## Success Criteria

### Visual Transformation
- [ ] Ellie looks like a realistic Shih Tzu
- [ ] Matches reference photo coloring (cream/tan/gold)
- [ ] Eyes 3x larger and expressive
- [ ] Natural fur texture and layering
- [ ] Prominent features (nose, ears, eyes)
- [ ] Sitting pose with visible legs

### Technical Quality
- [ ] All files compile without errors
- [ ] GSAP animations work perfectly
- [ ] Perch positioning unaffected
- [ ] Test coverage maintained
- [ ] Build succeeds
- [ ] No performance regression

### Integration
- [ ] Customization still works
- [ ] Variants still work
- [ ] Collars/accessories compatible
- [ ] All moods render correctly
- [ ] All pages using Ellie work

---

## Timeline Estimate

- Color palette & constants: 45 minutes
- Eyes redesign: 1.5 hours
- Nose redesign: 30 minutes
- Ears complete redesign: 1 hour
- Head with fur texture: 1.5 hours
- Body redesign: 1 hour
- Legs creation: 45 minutes
- Integration & testing: 1.5 hours
- Visual validation & polish: 1 hour

**Total: 8-9 hours** (upper bound of 6-8 estimate)

---

## Post-Implementation

1. Screenshot comparison (before/after)
2. Gather feedback on realism
3. Fine-tune proportions if needed
4. Update documentation
5. Consider additional moods/expressions
6. Plan accessories (bandanas like photo 2)

---

## Notes for Claude Code

- This is COMPLETE redesign, not enhancement
- Follow exact color values from palette
- Test each component individually
- Verify GSAP animations after each change
- Keep SVG viewBox 0 0 100 100
- Maintain animation ref compatibility
- Test all moods after implementation
- Verify perch system unaffected
- Take time to get proportions right
- Reference photos are the gold standard

---

## Rollback Plan

If full redesign has critical issues:

```bash
git checkout HEAD -- frontend/src/components/ellie/anatomy/
git checkout HEAD -- frontend/src/components/ellie/facial/
git checkout HEAD -- frontend/src/components/ellie/constants/
```

---

## Success Definition

Ellie looks like the dog in the reference photos while maintaining all Phase 1 (positioning) and Phase 2 (GSAP) functionality.
