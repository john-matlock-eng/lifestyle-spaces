import React from 'react';
import type { BodyPartProps } from '../types/ellie.types';
import { Nose, Mouth, Tongue, Eyes, Ears } from '../facial';
import { ELLIE_COORDINATES, FUR_ACCENT_COLOR, FUR_SHADOW_COLOR } from '../constants';

export interface HeadProps extends BodyPartProps {
  onNoseBoop?: () => void;
}

export const Head = React.forwardRef<SVGGElement, HeadProps>(
  ({ furColor, furPattern = 'parti', accentColor = '#000000', mood, onNoseBoop, className = '' }, ref) => {
    const { head, muzzle, face } = ELLIE_COORDINATES;
    const showPartiPatches = furPattern === 'parti';

    return (
      <g className={`ellie-head ${className}`} ref={ref}>
        <defs>
          {/* Subtle head fur gradient - minimal 2 stops */}
          <radialGradient id="headFurGradient" cx="50%" cy="40%">
            <stop offset="0%" stopColor={furColor} stopOpacity="1" />
            <stop offset="100%" stopColor={FUR_SHADOW_COLOR} stopOpacity="0.95" />
          </radialGradient>

          {/* Subtle muzzle gradient */}
          <radialGradient id="muzzleGradient" cx="50%" cy="50%">
            <stop offset="30%" stopColor={FUR_ACCENT_COLOR} stopOpacity="0.9" />
            <stop offset="100%" stopColor={furColor} stopOpacity="1" />
          </radialGradient>

          {/* Clip path for head to constrain all markings */}
          <clipPath id="headClip">
            <circle cx={head.cx} cy={head.cy} r={head.radius} />
          </clipPath>

          {/* Clip paths for ears */}
          <clipPath id="leftEarClip">
            <ellipse
              cx={face.leftEar.cx}
              cy={face.leftEar.cy}
              rx={face.leftEar.rx}
              ry={face.leftEar.ry}
              transform={`rotate(${face.leftEar.rotation} ${face.leftEar.cx} ${face.leftEar.cy})`}
            />
          </clipPath>
          <clipPath id="rightEarClip">
            <ellipse
              cx={face.rightEar.cx}
              cy={face.rightEar.cy}
              rx={face.rightEar.rx}
              ry={face.rightEar.ry}
              transform={`rotate(${face.rightEar.rotation} ${face.rightEar.cx} ${face.rightEar.cy})`}
            />
          </clipPath>
        </defs>

        {/* Ears (behind head) - base white */}
        <Ears furColor={furColor} mood={mood} />

        {/* Black ears - solid black, clipped to ear shape */}
        {showPartiPatches && (
          <g className="ellie-parti-ear-patches">
            {/* Left ear - solid black */}
            <g clipPath="url(#leftEarClip)">
              <ellipse
                cx={face.leftEar.cx}
                cy={face.leftEar.cy}
                rx={face.leftEar.rx + 2}
                ry={face.leftEar.ry + 2}
                fill={accentColor}
                transform={`rotate(${face.leftEar.rotation} ${face.leftEar.cx} ${face.leftEar.cy})`}
              />
            </g>
            {/* Right ear - solid black */}
            <g clipPath="url(#rightEarClip)">
              <ellipse
                cx={face.rightEar.cx}
                cy={face.rightEar.cy}
                rx={face.rightEar.rx + 2}
                ry={face.rightEar.ry + 2}
                fill={accentColor}
                transform={`rotate(${face.rightEar.rotation} ${face.rightEar.cx} ${face.rightEar.cy})`}
              />
            </g>
          </g>
        )}

        {/* Main head circle with gradient (white base) */}
        <circle
          cx={head.cx}
          cy={head.cy}
          r={head.radius}
          fill="url(#headFurGradient)"
        />

        {/* Parti pattern - raccoon eyes and markings, clipped to head */}
        {showPartiPatches && (
          <g className="ellie-parti-face-patches" clipPath="url(#headClip)">
            {/* Left raccoon eye patch - surrounds eye */}
            <ellipse
              cx={face.leftEye.cx}
              cy={face.leftEye.cy + 2}
              rx={8}
              ry={10}
              fill={accentColor}
              opacity={0.95}
            />
            {/* Right raccoon eye patch - surrounds eye */}
            <ellipse
              cx={face.rightEye.cx}
              cy={face.rightEye.cy + 2}
              rx={8}
              ry={10}
              fill={accentColor}
              opacity={0.95}
            />
            {/* White blaze - stripe between eyes going up */}
            <path
              d={`M ${head.cx - 3} ${head.cy + 5}
                  Q ${head.cx} ${head.cy - 5} ${head.cx - 2} ${head.cy - 16}
                  L ${head.cx + 2} ${head.cy - 16}
                  Q ${head.cx} ${head.cy - 5} ${head.cx + 3} ${head.cy + 5}
                  Z`}
              fill={furColor}
            />
            {/* White topknot poof - fluffy crown between ears */}
            <ellipse
              cx={head.cx}
              cy={head.cy - 15}
              rx={10}
              ry={6}
              fill={furColor}
            />
          </g>
        )}

        {/* Upper muzzle with gradient (white) */}
        <ellipse
          cx={muzzle.upper.cx}
          cy={muzzle.upper.cy}
          rx={muzzle.upper.rx}
          ry={muzzle.upper.ry}
          fill="url(#muzzleGradient)"
        />

        {/* Lower muzzle (white) */}
        <ellipse
          cx={muzzle.lower.cx}
          cy={muzzle.lower.cy}
          rx={muzzle.lower.rx}
          ry={muzzle.lower.ry}
          fill="url(#muzzleGradient)"
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
