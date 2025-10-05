import React, { useState, useEffect, useRef } from "react";
import { clsx } from "clsx";

interface EnhancedShihTzuProps {
  mood?: string;
  position?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
  onClick?: () => void;
  onPet?: () => void;
  size?: "sm" | "md" | "lg";
  accessories?: string[];
  showThoughtBubble?: boolean;
  thoughtText?: string;
  particleEffect?: "hearts" | "sparkles" | "treats" | "zzz" | null;
  variant?: "default" | "winter" | "party" | "workout" | "balloon";
  className?: string;
  style?: React.CSSProperties;
}

const EnhancedShihTzu: React.FC<EnhancedShihTzuProps> = ({
  mood = "idle",
  position = { x: 100, y: 100 },
  onPositionChange,
  onClick,
  onPet,
  size = "md",
  accessories = [],
  showThoughtBubble = false,
  thoughtText = "",
  particleEffect = null,
  variant = "default",
  className,
  style,
}) => {
  const [currentPosition, setCurrentPosition] = useState(position);
  const [isMoving, setIsMoving] = useState(false);
  const [currentMood, setCurrentMood] = useState(mood);
  const [isPetting, setIsPetting] = useState(false);
  const [particles, setParticles] = useState<
    Array<{ id: number; x: number; y: number }>
  >([]);
  const companionRef = useRef<HTMLDivElement>(null);
  const particleIdRef = useRef(0);
  const positionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Responsive size map - smaller on mobile
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 640);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sizeMap = {
    sm: {
      width: windowWidth < 640 ? 50 : 60,
      height: windowWidth < 640 ? 50 : 60,
    },
    md: {
      width: windowWidth < 640 ? 60 : 80,
      height: windowWidth < 640 ? 60 : 80,
    },
    lg: {
      width: windowWidth < 640 ? 80 : 100,
      height: windowWidth < 640 ? 80 : 100,
    },
  };

  const currentSize = sizeMap[size] || sizeMap.md; // Fallback to medium size

  // Sync mood changes
  useEffect(() => {
    if (mood !== currentMood) {
      setCurrentMood(mood);
    }
  }, [mood, currentMood]);

  // Handle position changes with smoother transitions
  useEffect(() => {
    if (positionTimerRef.current) {
      clearTimeout(positionTimerRef.current);
    }

    if (position.x !== currentPosition.x || position.y !== currentPosition.y) {
      setIsMoving(true);

      // Immediate update for responsiveness
      setCurrentPosition(position);

      positionTimerRef.current = setTimeout(() => {
        setIsMoving(false);

        if (onPositionChange) {
          onPositionChange(position);
        }
      }, 1000); // Extend duration for smoother movement
    }

    return () => {
      if (positionTimerRef.current) {
        clearTimeout(positionTimerRef.current);
      }
    };
  }, [position.x, position.y, currentPosition.x, currentPosition.y, onPositionChange]);

  // Handle particle effects
  useEffect(() => {
    if (particleEffect && particleEffect !== null) {
      const newParticles = Array.from({ length: 5 }, () => ({
        id: particleIdRef.current++,
        x: Math.random() * 60 - 30,
        y: Math.random() * -30 - 10,
      }));
      setParticles((prev) => [...prev, ...newParticles]);

      const timer = setTimeout(() => {
        setParticles([]);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [particleEffect]);

  // Handle petting
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPet) {
      setIsPetting(true);
      onPet();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (onPet) {
      setIsPetting(true);
      onPet();
    }
  };

  const handleMouseUp = () => {
    setIsPetting(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    }
  };

  // Get variant colors
  const getVariantColors = () => {
    switch (variant) {
      case "winter":
        return { primary: "#E0F2FE", secondary: "#7DD3FC", accent: "#0EA5E9" };
      case "party":
        return { primary: "#FEF3C7", secondary: "#FDE68A", accent: "#F59E0B" };
      case "workout":
        return { primary: "#D1FAE5", secondary: "#6EE7B7", accent: "#10B981" };
      case "balloon":
        // Vibrant balloon party colors - purple, teal, pink
        return { primary: "#FDE2E4", secondary: "#E0B1CB", accent: "#BE185D" }; // Pink tones with hot pink accent
      default:
        return { primary: "white", secondary: "#e5e7eb", accent: "#8B4513" };
    }
  };

  const colors = getVariantColors();

  return (
    <div
      ref={companionRef}
      className={clsx(
        "cursor-pointer transition-all duration-1000 ease-in-out select-none",
        isPetting && "scale-110",
        className,
      )}
      style={{
        position: style?.position || "fixed", // Use fixed positioning to avoid scroll issues
        left: `${currentPosition.x}px`,
        top: `${currentPosition.y}px`,
        transform: isMoving ? "translateY(-10px)" : "translateY(0)",
        zIndex: style?.zIndex || 9999, // High z-index but allow override
        ...style,
      }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleMouseUp}
    >
      {/* Thought Bubble - improved positioning and structure */}
      {showThoughtBubble && thoughtText && (
        <div
          className="absolute left-1/2 transform -translate-x-1/2 pointer-events-none whitespace-nowrap"
          style={{
            // Dynamic positioning based on screen position
            ...(currentPosition.y < 150 ? {
              // If near top, show bubble below
              top: `${currentSize.height + 10}px`,
            } : {
              // If not near top, show bubble above
              bottom: `${currentSize.height + 10}px`,
            }),
            maxWidth: "250px", // Maximum width for longer thoughts
            zIndex: 110, // Higher than companion to ensure visibility
          }}
        >
          <div className="relative animate-float-subtle">
            {/* Main bubble with dynamic width */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 shadow-xl border border-gray-100 relative">
              <p className="text-xs sm:text-sm font-medium text-gray-800 whitespace-normal text-center">
                {thoughtText}
              </p>
            </div>
            {/* Dynamic tail positioning */}
            {currentPosition.y < 150 ? (
              // Tail pointing up when bubble is below
              <div className="absolute left-1/2 transform -translate-x-1/2 -top-2">
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-b-[8px] border-b-white/95 border-r-[6px] border-r-transparent"></div>
              </div>
            ) : (
              // Tail pointing down when bubble is above
              <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-2">
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-t-[8px] border-t-white/95 border-r-[6px] border-r-transparent"></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Particle Effects */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute pointer-events-none text-lg sm:text-xl animate-float-up"
          style={{
            left: "50%",
            top: "20%",
            transform: `translate(${particle.x}px, ${particle.y}px)`,
          }}
        >
          {particleEffect === "hearts" && "❤️"}
          {particleEffect === "sparkles" && "✨"}
          {particleEffect === "treats" && "🦴"}
          {particleEffect === "zzz" && "Z"}
        </div>
      ))}

      <svg
        width={currentSize.width}
        height={currentSize.height}
        viewBox="0 0 100 100"
        className={clsx(
          currentMood === "happy" && "animate-bounce-subtle",
          currentMood === "excited" && "animate-wiggle-subtle",
          currentMood === "playful" && "animate-spin-slow",
          currentMood === "walking" && "animate-walk",
          currentMood === "celebrating" && "animate-wiggle",
        )}
      >
        <defs>
          <radialGradient id="bodyGradient">
            <stop offset="0%" stopColor={colors.primary} />
            <stop offset="100%" stopColor={colors.secondary} />
          </radialGradient>

          {variant === "balloon" && (
            <>
              <radialGradient id="balloonGradient1">
                <stop offset="0%" stopColor="#E879F9" />
                <stop offset="100%" stopColor="#9333EA" />
              </radialGradient>
              <radialGradient id="balloonGradient2">
                <stop offset="0%" stopColor="#5EEAD4" />
                <stop offset="100%" stopColor="#14B8A6" />
              </radialGradient>
            </>
          )}

          <filter id="softshadow">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
            <feOffset dx="0" dy="2" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <style>
            {`
              @keyframes wag-enhanced {
                0%, 100% { transform: rotate(-45deg); }
                25% { transform: rotate(-65deg); }
                75% { transform: rotate(-25deg); }
              }

              @keyframes wiggle {
                0%, 100% { transform: rotate(0deg); }
                25% { transform: rotate(-5deg); }
                75% { transform: rotate(5deg); }
              }

              @keyframes wiggle-subtle {
                0%, 100% { transform: rotate(0deg); }
                25% { transform: rotate(-3deg); }
                75% { transform: rotate(3deg); }
              }

              @keyframes bounce-subtle {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-5px); }
              }

              @keyframes spin-slow {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }

              @keyframes blink {
                0%, 90%, 100% { opacity: 1; }
                95% { opacity: 0; }
              }

              @keyframes ear-wiggle {
                0%, 100% { transform: rotate(0deg); }
                50% { transform: rotate(10deg); }
              }

              @keyframes breathe {
                0%, 100% { transform: scaleY(1) scaleX(1); }
                50% { transform: scaleY(0.95) scaleX(1.02); }
              }

              @keyframes float-up {
                0% { opacity: 1; transform: translateY(0); }
                100% { opacity: 0; transform: translateY(-40px); }
              }

              @keyframes float-subtle {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-3px); }
              }

              @keyframes fade-in {
                from { opacity: 0; transform: translateY(5px); }
                to { opacity: 1; transform: translateY(0); }
              }

              .animate-fade-in {
                animation: fade-in 0.3s ease-out;
              }

              .animate-wag-enhanced {
                animation: wag-enhanced 0.6s ease-in-out infinite;
                transform-origin: 30px 57px;
              }

              .animate-wiggle {
                animation: wiggle 2s ease-in-out infinite;
              }

              .animate-wiggle-subtle {
                animation: wiggle-subtle 3s ease-in-out infinite;
              }

              .animate-bounce-subtle {
                animation: bounce-subtle 2s ease-in-out infinite;
              }

              .animate-spin-slow {
                animation: spin-slow 4s linear infinite;
              }

              .animate-blink {
                animation: blink 4s ease-in-out infinite;
              }

              .animate-ear-wiggle {
                animation: ear-wiggle 3s ease-in-out infinite;
                transform-origin: 50% 100%;
              }

              .animate-breathe {
                animation: breathe 3s ease-in-out infinite;
              }

              .animate-float-up {
                animation: float-up 2s ease-out forwards;
              }

              .animate-float-subtle {
                animation: float-subtle 3s ease-in-out infinite;
              }
            `}
          </style>
        </defs>

        {/* Shadow */}
        <ellipse
          cx="50"
          cy="85"
          rx="20"
          ry="5"
          fill="rgba(0,0,0,0.1)"
          className={isMoving ? "opacity-50" : "opacity-100"}
        />

        {/* Body */}
        <ellipse
          cx="50"
          cy="60"
          rx="25"
          ry="20"
          fill="url(#bodyGradient)"
          stroke={colors.secondary}
          strokeWidth="1"
          filter="url(#softshadow)"
          className={
            currentMood === "sleeping" || currentMood === "zen"
              ? "animate-breathe"
              : ""
          }
        />

        {/* Chest fluff */}
        <ellipse
          cx="50"
          cy="65"
          rx="12"
          ry="8"
          fill={colors.primary}
          opacity="0.7"
        />

        {/* Head group */}
        <g
          transform={
            currentMood === "curious" || currentMood === "concerned"
              ? undefined
              : "rotate(0 50 35)"
          }
          style={{ transformOrigin: "50px 35px" }}
          filter="url(#softshadow)"
        >
          {(currentMood === "curious" || currentMood === "concerned") && (
            <animateTransform
              attributeName="transform"
              attributeType="XML"
              type="rotate"
              values="0 50 35; 0 50 35; 8 50 35; 8 50 35; 8 50 35; 0 50 35"
              dur="4s"
              repeatCount="indefinite"
            />
          )}

          {/* Ears */}
          <g className={currentMood === "playful" ? "animate-ear-wiggle" : ""}>
            <path
              d="M 33 25 Q 25 35 28 48 Q 30 52 33 48 Q 35 40 33 25"
              fill={colors.primary}
              stroke={colors.secondary}
              strokeWidth="1"
            />
            <path
              d="M 67 25 Q 75 35 72 48 Q 70 52 67 48 Q 65 40 67 25"
              fill={colors.primary}
              stroke={colors.secondary}
              strokeWidth="1"
            />
          </g>

          {/* Head */}
          <circle
            cx="50"
            cy="35"
            r="20"
            fill="url(#bodyGradient)"
            stroke={colors.secondary}
            strokeWidth="1"
          />

          {/* Eyes */}
          {currentMood !== "sleeping" && currentMood !== "zen" ? (
            <>
              <g className="animate-blink">
                <circle
                  cx="42"
                  cy="35"
                  r={
                    currentMood === "excited" || currentMood === "curious"
                      ? "4"
                      : "3"
                  }
                  fill="black"
                />
                <circle cx="43" cy="34" r="1" fill="white" />
              </g>
              <g className="animate-blink" style={{ animationDelay: "0.1s" }}>
                <circle
                  cx="58"
                  cy="35"
                  r={
                    currentMood === "excited" || currentMood === "curious"
                      ? "4"
                      : "3"
                  }
                  fill="black"
                />
                <circle cx="59" cy="34" r="1" fill="white" />
              </g>
            </>
          ) : (
            <>
              <path
                d="M 39 35 Q 42 37 45 35"
                stroke="black"
                strokeWidth="1.5"
                fill="none"
              />
              <path
                d="M 55 35 Q 58 37 61 35"
                stroke="black"
                strokeWidth="1.5"
                fill="none"
              />
            </>
          )}

          {/* Eyebrows */}
          {currentMood === "curious" && (
            <>
              <path
                d="M 37 30 L 42 28"
                stroke="black"
                strokeWidth="1"
                fill="none"
              />
              <path
                d="M 58 28 L 63 30"
                stroke="black"
                strokeWidth="1"
                fill="none"
              />
            </>
          )}
          {currentMood === "concerned" && (
            <>
              <path
                d="M 37 28 L 42 30"
                stroke="black"
                strokeWidth="1"
                fill="none"
              />
              <path
                d="M 58 30 L 63 28"
                stroke="black"
                strokeWidth="1"
                fill="none"
              />
            </>
          )}
          {currentMood === "proud" && (
            <>
              <path
                d="M 38 29 L 44 28"
                stroke="black"
                strokeWidth="1"
                fill="none"
              />
              <path
                d="M 56 28 L 62 29"
                stroke="black"
                strokeWidth="1"
                fill="none"
              />
            </>
          )}

          {/* Nose */}
          <ellipse cx="50" cy="42" rx="3" ry="2" fill={colors.accent} />

          {/* Mouth */}
          {currentMood === "happy" ||
          currentMood === "excited" ||
          currentMood === "celebrating" ? (
            <path
              d="M 45 44 Q 50 48 55 44"
              stroke="black"
              strokeWidth="1.5"
              fill="none"
            >
              <animate
                attributeName="d"
                values="M 45 44 Q 50 48 55 44;M 45 44 Q 50 49 55 44;M 45 44 Q 50 48 55 44"
                dur="0.5s"
                repeatCount="indefinite"
              />
            </path>
          ) : currentMood === "playful" ? (
            <>
              <path
                d="M 45 44 Q 50 47 55 44"
                stroke="black"
                strokeWidth="1.5"
                fill="none"
              />
              <path
                d="M 50 47 L 50 49"
                stroke="pink"
                strokeWidth="2"
                fill="none"
              />
            </>
          ) : currentMood === "proud" ? (
            <path
              d="M 43 44 Q 50 47 57 44"
              stroke="black"
              strokeWidth="1.5"
              fill="none"
            />
          ) : (
            <path
              d="M 47 44 Q 50 46 53 44"
              stroke="black"
              strokeWidth="1"
              fill="none"
            />
          )}
        </g>

        {/* Tail */}
        <ellipse
          cx="25"
          cy="55"
          rx="10"
          ry="5"
          fill={colors.primary}
          stroke={colors.secondary}
          strokeWidth="1"
          transform="rotate(-45 25 55)"
          className={
            currentMood === "happy" ||
            currentMood === "excited" ||
            currentMood === "playful" ||
            currentMood === "celebrating"
              ? "animate-wag-enhanced"
              : ""
          }
          filter="url(#softshadow)"
        />

        {/* Legs */}
        <rect
          x="40"
          y="70"
          width="6"
          height="15"
          rx="3"
          fill={colors.primary}
          stroke={colors.secondary}
          strokeWidth="1"
          className={currentMood === "walking" ? "animate-walk-front-leg" : ""}
        />
        <rect
          x="54"
          y="70"
          width="6"
          height="15"
          rx="3"
          fill={colors.primary}
          stroke={colors.secondary}
          strokeWidth="1"
          className={currentMood === "walking" ? "animate-walk-back-leg" : ""}
        />

        {/* Accessories */}
        {accessories.includes("party-hat") && (
          <g transform="translate(50, 15)">
            <path
              d="M 0 0 L -10 15 L 10 15 Z"
              fill="#FF6B6B"
              stroke="#C92A2A"
              strokeWidth="1"
            />
            <circle cx="0" cy="0" r="3" fill="#FFD700" />
          </g>
        )}

        {/* Balloon decorations for balloon variant */}
        {variant === "balloon" && (
          <g>
            {/* Floating balloons */}
            <circle
              cx="15"
              cy="20"
              r="8"
              fill="url(#balloonGradient1)"
              opacity="0.8"
              className="animate-float-subtle"
            />
            <line
              x1="15"
              y1="28"
              x2="18"
              y2="40"
              stroke="#9333EA"
              strokeWidth="0.5"
            />

            <circle
              cx="85"
              cy="15"
              r="6"
              fill="url(#balloonGradient2)"
              opacity="0.8"
              className="animate-float-subtle"
              style={{ animationDelay: "1s" }}
            />
            <line
              x1="85"
              y1="21"
              x2="82"
              y2="30"
              stroke="#14B8A6"
              strokeWidth="0.5"
            />

            <circle
              cx="75"
              cy="35"
              r="5"
              fill="#EC4899"
              opacity="0.7"
              className="animate-float-subtle"
              style={{ animationDelay: "2s" }}
            />
            <line
              x1="75"
              y1="40"
              x2="73"
              y2="48"
              stroke="#BE185D"
              strokeWidth="0.5"
            />
          </g>
        )}

        {/* Mood effects */}
        {currentMood === "happy" && (
          <>
            <text x="70" y="25" className="animate-sparkle" fontSize="12">
              ✨
            </text>
          </>
        )}

        {currentMood === "excited" && (
          <>
            <text x="15" y="30" className="animate-bounce-subtle" fontSize="14">
              !
            </text>
            <text
              x="75"
              y="25"
              className="animate-bounce-subtle"
              style={{ animationDelay: "0.2s" }}
              fontSize="14"
            >
              !
            </text>
          </>
        )}

        {currentMood === "proud" && (
          <text x="70" y="20" className="animate-float-subtle" fontSize="16">
            👑
          </text>
        )}

        {currentMood === "zen" && (
          <>
            <circle
              cx="50"
              cy="15"
              r="10"
              fill="none"
              stroke="#9333EA"
              strokeWidth="0.5"
              className="animate-pulse"
            />
          </>
        )}
      </svg>

      {/* Petting feedback */}
      {isPetting && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 pointer-events-none">
          <span className="text-xs bg-gray-800 text-white px-2 py-1 rounded-full whitespace-nowrap">
            Good dog! 🥰
          </span>
        </div>
      )}
    </div>
  );
};

export default EnhancedShihTzu;
