import React, { useEffect, useState } from 'react'

interface OverlayState {
  visible: boolean
  phase: 'work' | 'break'
  interval: number
  maxIntervals: number
  remMins: number
  remSecs: number
  progress: number
  taskTitle: string
  color: string
  pomodoroMode: boolean
}

const DEFAULT: OverlayState = {
  visible: false,
  phase: 'work',
  interval: 1,
  maxIntervals: 4,
  remMins: 25,
  remSecs: 0,
  progress: 0,
  taskTitle: '',
  color: '#6366f1',
  pomodoroMode: false,
}

// Minimal color helpers — no Tailwind needed in overlay
const WORK_BG    = 'rgba(17,17,27,0.92)'
const BREAK_BG   = 'rgba(6,32,26,0.92)'
const ACCENT_W   = '#6366f1'
const ACCENT_B   = '#10b981'

function pad(n: number) { return String(n).padStart(2, '0') }

export default function OverlayApp() {
  const [state, setState] = useState<OverlayState>(DEFAULT)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    // Listen for state pushes from main process
    const handler = (incoming: unknown) => {
      setState(prev => ({ ...prev, ...(incoming as Partial<OverlayState>) }))
    }
    window.api.on('overlay:state', handler)
    return () => window.api.off('overlay:state', handler)
  }, [])

  if (!state.visible) return null

  const isBreak  = state.phase === 'break'
  const bg       = isBreak ? BREAK_BG : WORK_BG
  const accent   = isBreak ? ACCENT_B : (state.color || ACCENT_W)
  const phaseLabel = isBreak
    ? `☕ Break ${state.interval}/${state.maxIntervals}`
    : state.pomodoroMode
      ? `🍅 Work ${state.interval}/${state.maxIntervals}`
      : '🛡 Focusing'

  // Arc progress for SVG mini-ring
  const size = 44
  const strokeW = 4
  const r = (size - strokeW * 2) / 2
  const circ = 2 * Math.PI * r
  const dash = circ * (1 - Math.min(1, state.progress))

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 12px',
        background: bg,
        borderRadius: 14,
        border: `1.5px solid ${accent}40`,
        backdropFilter: 'blur(12px)',
        WebkitAppRegion: 'drag',
        userSelect: 'none',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        cursor: 'grab',
        boxShadow: `0 4px 24px ${accent}30, 0 1px 6px rgba(0,0,0,0.5)`,
        transition: 'opacity 0.2s',
        opacity: hovered ? 1 : 0.92,
      } as React.CSSProperties}
    >
      {/* Mini ring */}
      <div style={{ flexShrink: 0, WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <svg width={size} height={size}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={accent + '30'} strokeWidth={strokeW} />
          <circle
            cx={size/2} cy={size/2} r={r}
            fill="none" stroke={accent} strokeWidth={strokeW}
            strokeDasharray={circ} strokeDashoffset={dash}
            strokeLinecap="round"
            transform={`rotate(-90 ${size/2} ${size/2})`}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
          {/* Center: phase emoji */}
          <text
            x={size/2} y={size/2 + 5}
            textAnchor="middle"
            fontSize="14"
            fill="white"
          >{isBreak ? '☕' : '🛡'}</text>
        </svg>
      </div>

      {/* Middle: time + label */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Countdown */}
        <div style={{
          fontSize: 22,
          fontWeight: 900,
          color: 'white',
          letterSpacing: '-0.5px',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {pad(state.remMins)}:{pad(state.remSecs)}
        </div>
        {/* Phase + task */}
        <div style={{ fontSize: 10, fontWeight: 700, color: accent, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {phaseLabel}
        </div>
        {state.taskTitle && (
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {state.taskTitle}
          </div>
        )}
        {/* Interval dots */}
        {state.pomodoroMode && (
          <div style={{ display: 'flex', gap: 3, marginTop: 3 }}>
            {Array.from({ length: state.maxIntervals }, (_, i) => (
              <div key={i} style={{
                width: 5, height: 5, borderRadius: '50%',
                background: i < state.interval - 1
                  ? accent
                  : i === state.interval - 1 && state.phase === 'work'
                    ? accent + 'aa'
                    : 'rgba(255,255,255,0.2)',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0, WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {/* Skip */}
        <OverlayBtn
          label={isBreak ? '⏭' : '⏭'}
          title={isBreak ? 'Skip break → next work' : 'Skip to break'}
          color={accent}
          onClick={() => window.api.overlay.skip()}
        />
        {/* Stop */}
        <OverlayBtn
          label="⏹"
          title="Stop focus session"
          color="#ef4444"
          onClick={() => window.api.overlay.stop()}
        />
      </div>
    </div>
  )
}

function OverlayBtn({ label, title, color, onClick }: {
  label: string; title: string; color: string; onClick: () => void
}) {
  const [hover, setHover] = useState(false)
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 26, height: 26,
        borderRadius: 7,
        border: `1.5px solid ${color}50`,
        background: hover ? color + '30' : color + '15',
        color: hover ? color : color + 'cc',
        fontSize: 11,
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
        outline: 'none',
      }}
    >
      {label}
    </button>
  )
}
