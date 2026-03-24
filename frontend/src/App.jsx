import { useEffect, useRef, useState } from 'react'
import './App.css'

const initialAgentMessage =
  'Hi! Ask me anything about the weather. Try: Should I go hiking in Austin this weekend?'

function extractCityFromMessages(messages) {
  const userMessages = messages.filter((m) => m.role === 'user')
  if (!userMessages.length) return null

  const text = userMessages[userMessages.length - 1].content
  const match = text.match(/(?:[Ii]n|[Ff]or|[Aa]t)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/)
  return match ? match[1] : null
}

function getWeatherEmoji(description) {
  if (!description) return '🌡️'
  const d = description.toLowerCase()
  if (d.includes('thunder')) return '⛈️'
  if (d.includes('rain') || d.includes('drizzle')) return '🌧️'
  if (d.includes('snow')) return '❄️'
  if (d.includes('cloud') || d.includes('overcast')) return '☁️'
  if (d.includes('clear') || d.includes('sun')) return '☀️'
  if (d.includes('fog') || d.includes('mist') || d.includes('haze')) return '🌫️'
  return '🌡️'
}

const themes = {
  dark: {
    pageBg: 'var(--green-950)',
    cardBg: 'var(--green-800)',
    cardBorder: 'var(--teal-700)',
    cardShadow: '0 12px 40px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)',
    headerGradient: 'linear-gradient(135deg, var(--green-800), var(--teal-700))',
    messagesBg: 'var(--green-950)',
    agentBubbleBg: 'var(--teal-700)',
    agentBubbleColor: 'var(--grey-200)',
    agentBubbleShadow: '0 1px 4px rgba(0,0,0,0.3)',
    userBubbleBg: 'var(--blue-500)',
    userBubbleColor: 'var(--white)',
    userBubbleShadow: '0 2px 8px rgba(116,178,242,0.3)',
    typingDotColor: 'var(--teal-500)',
    footerBg: 'var(--green-800)',
    footerBorder: 'var(--teal-700)',
    inputBg: 'var(--green-950)',
    inputBgDisabled: 'var(--green-800)',
    inputBorder: 'var(--teal-600)',
    inputColor: 'var(--grey-200)',
    inputPlaceholder: 'var(--teal-500)',
    sendBgActive: 'var(--sage-500)',
    sendBgDisabled: 'var(--teal-600)',
  },
  light: {
    pageBg: 'var(--grey-50)',
    cardBg: 'var(--white)',
    cardBorder: 'var(--grey-200)',
    cardShadow: '0 12px 40px rgba(36,59,50,0.08), 0 2px 8px rgba(36,59,50,0.04)',
    headerGradient: 'linear-gradient(135deg, var(--sage-500), var(--blue-500))',
    messagesBg: 'var(--grey-100)',
    agentBubbleBg: 'var(--grey-200)',
    agentBubbleColor: 'var(--green-800)',
    agentBubbleShadow: '0 1px 4px rgba(36,59,50,0.06)',
    userBubbleBg: 'var(--blue-500)',
    userBubbleColor: 'var(--white)',
    userBubbleShadow: '0 2px 8px rgba(116,178,242,0.2)',
    typingDotColor: 'var(--grey-400)',
    footerBg: 'var(--white)',
    footerBorder: 'var(--grey-200)',
    inputBg: 'var(--white)',
    inputBgDisabled: 'var(--grey-100)',
    inputBorder: 'var(--grey-300)',
    inputColor: 'var(--green-800)',
    inputPlaceholder: 'var(--grey-400)',
    sendBgActive: 'var(--sage-500)',
    sendBgDisabled: 'var(--grey-300)',
  },
}

function TypingDots({ theme }) {
  const dot = (delay) => ({
    width: 7,
    height: 7,
    borderRadius: '50%',
    backgroundColor: theme.typingDotColor,
    animation: `typingDot 1.2s ${delay}s infinite ease-in-out`,
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 2px' }}>
      <span style={dot(0)} />
      <span style={dot(0.2)} />
      <span style={dot(0.4)} />
    </div>
  )
}

function AgentAvatar() {
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--sage-500), var(--blue-500))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.9rem',
        flexShrink: 0,
        boxShadow: '0 2px 6px rgba(164,190,116,0.3)',
      }}
    >
      ☀️
    </div>
  )
}

function ThemeToggle({ dark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        marginLeft: 'auto',
        background: 'rgba(255,255,255,0.15)',
        border: '1px solid rgba(255,255,255,0.25)',
        borderRadius: 10,
        width: 38,
        height: 38,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.15rem',
        cursor: 'pointer',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      {dark ? '☀️' : '🌙'}
    </button>
  )
}

function NoticeModal({ onClose }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="notice-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        backgroundColor: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(3px)',
        animation: 'fadeSlideIn 0.25s ease-out',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(160deg, var(--green-800), var(--teal-700))',
          border: '1px solid var(--teal-600)',
          borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.45), 0 4px 12px rgba(0,0,0,0.25)',
          padding: '28px 28px 24px',
          maxWidth: 380,
          width: '100%',
          color: 'var(--grey-100)',
        }}
      >
        {/* Icon + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>⏳</span>
          <h2
            id="notice-title"
            style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}
          >
            Heads up!
          </h2>
        </div>

        {/* Body */}
        <p style={{ margin: '0 0 10px', fontSize: '0.9rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.88)' }}>
          The agent may be <strong style={{ color: '#ffffff' }}>slow to respond</strong> on first use, our servers are warming up and may take a few seconds.
        </p>
        <p style={{ margin: '0 0 22px', fontSize: '0.9rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.88)' }}>
          Please avoid sending multiple messages within the same minute to get the best results. 🌸 
        </p>
        <p style={{ margin: '0 0 22px', fontSize: '0.9rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.88)' }}>
          If an error persists after a few minutes it might be because it reached the daily limit or too many requests were made throughout the day!
        </p>

        {/* Footer note */}
        <p style={{ margin: '0 0 20px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
          This project is still in beta so some hiccups may occur. Please be patient and report any issues you encounter. Thank you for trying it out! ⭐️
        </p>

        {/* Ok button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 28px',
              borderRadius: 10,
              border: 'none',
              backgroundColor: 'var(--sage-500)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  )
}

function HelpButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Show beta notice"
      style={{
        background: 'rgba(255,255,255,0.15)',
        border: '1px solid rgba(255,255,255,0.25)',
        borderRadius: 10,
        width: 38,
        height: 38,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1rem',
        fontWeight: 700,
        color: '#ffffff',
        cursor: 'pointer',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
    >
      ?
    </button>
  )
}

function MessageBubble({ role, content, theme }) {
  const isUser = role === 'user'

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        alignItems: 'flex-end',
        gap: 8,
        marginBottom: 12,
        animation: 'fadeSlideIn 0.3s ease-out',
      }}
    >
      {!isUser && <AgentAvatar />}
      <div
        style={{
          maxWidth: '75%',
          padding: '10px 14px',
          borderRadius: 18,
          lineHeight: 1.5,
          fontSize: '0.925rem',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          backgroundColor: isUser ? theme.userBubbleBg : theme.agentBubbleBg,
          color: isUser ? theme.userBubbleColor : theme.agentBubbleColor,
          borderBottomRightRadius: isUser ? 4 : 18,
          borderBottomLeftRadius: isUser ? 18 : 4,
          boxShadow: isUser ? theme.userBubbleShadow : theme.agentBubbleShadow,
        }}
      >
        {content}
      </div>
    </div>
  )
}

function ForecastList({ forecast, displayTemp }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {forecast.map((day) => (
        <div
          key={day.date}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            backgroundColor: 'var(--white)',
            borderRadius: 10,
            boxShadow: '0 1px 3px rgba(36,59,50,0.04)',
          }}
        >
          <span style={{ fontSize: '0.85rem', color: 'var(--teal-700)', fontWeight: 500, width: 40 }}>
            {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
          </span>
          <span style={{ fontSize: '1.2rem' }}>{getWeatherEmoji(day.description)}</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--green-800)' }}>
            {displayTemp(day.high)}°
          </span>
        </div>
      ))}
    </div>
  )
}

function WeatherPanel({ weatherData, loading }) {
  const [useFahrenheit, setUseFahrenheit] = useState(false)
  const [swiped, setSwiped] = useState(false)
  const swiperRef = useRef(null)
  const toF = (c) => c * 9 / 5 + 32
  const displayTemp = (c) => Math.round(useFahrenheit ? toF(c) : c)
  const unit = useFahrenheit ? '°F' : '°C'

  // Reset carousel position when a new city loads
  useEffect(() => {
    setSwiped(false)
    if (swiperRef.current) swiperRef.current.scrollLeft = 0
  }, [weatherData])

  const handleScroll = () => {
    if (swiperRef.current && swiperRef.current.scrollLeft > 10) setSwiped(true)
  }

  if (loading) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          color: 'var(--teal-500)',
          fontSize: '0.95rem',
          padding: 24,
        }}
      >
        <p>Loading weather data…</p>
      </div>
    )
  }

  if (!weatherData) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          color: 'var(--teal-500)',
          fontSize: '1rem',
          padding: 24,
        }}
      >
        <p>Ask me about a city to see its forecast 🌍</p>
      </div>
    )
  }

  const { city, country, temperature, description, humidity, windSpeed, forecast } = weatherData
  const hasForecast = forecast && forecast.length > 0

  const unitToggle = (
    <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 0 }}>
      <button
        onClick={() => setUseFahrenheit(false)}
        style={{
          padding: '4px 12px',
          fontSize: '0.75rem',
          fontWeight: 600,
          border: '1px solid var(--grey-300)',
          borderRight: 'none',
          borderRadius: '6px 0 0 6px',
          cursor: 'pointer',
          backgroundColor: !useFahrenheit ? 'var(--blue-500)' : 'var(--grey-100)',
          color: !useFahrenheit ? 'var(--white)' : 'var(--teal-700)',
        }}
      >°C</button>
      <button
        onClick={() => setUseFahrenheit(true)}
        style={{
          padding: '4px 12px',
          fontSize: '0.75rem',
          fontWeight: 600,
          border: '1px solid var(--grey-300)',
          borderRadius: '0 6px 6px 0',
          cursor: 'pointer',
          backgroundColor: useFahrenheit ? 'var(--blue-500)' : 'var(--grey-100)',
          color: useFahrenheit ? 'var(--white)' : 'var(--teal-700)',
        }}
      >°F</button>
    </div>
  )

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <div className="weather-swiper" ref={swiperRef} onScroll={handleScroll}>

        {/* ── Slide 1: current conditions ── */}
        <div className="weather-slide">
          {/* City + unit toggle */}
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: 'var(--green-800)' }}>
              {city}{country ? `, ${country}` : ''}
            </h2>
            {unitToggle}
          </div>

          {/* Temperature */}
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '3rem' }}>{getWeatherEmoji(description)}</span>
            <div style={{ fontSize: '2.8rem', fontWeight: 700, color: 'var(--green-800)', lineHeight: 1.1 }}>
              {displayTemp(temperature)}{unit}
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--teal-700)', textTransform: 'capitalize' }}>
              {description}
            </p>
          </div>

          {/* Humidity & wind */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 24,
              padding: '12px 0',
              borderTop: '1px solid var(--grey-200)',
              borderBottom: '1px solid var(--grey-200)',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--green-800)' }}>{humidity}%</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--teal-400)', fontWeight: 500 }}>Humidity</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--green-800)' }}>{windSpeed} km/h</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--teal-400)', fontWeight: 500 }}>Wind</div>
            </div>
          </div>

          {/* Forecast inline — desktop only */}
          {hasForecast && (
            <div className="forecast-desktop" style={{ flex: 1, overflow: 'auto' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--teal-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                5-Day Forecast
              </h3>
              <ForecastList forecast={forecast} displayTemp={displayTemp} />
            </div>
          )}
        </div>

        {/* ── Slide 2: 5-day forecast — mobile only ── */}
        {hasForecast && (
          <div className="weather-slide forecast-slide">
            <h3 style={{ margin: '0 0 12px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--teal-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              5-Day Forecast
            </h3>
            <ForecastList forecast={forecast} displayTemp={displayTemp} />
          </div>
        )}
      </div>

      {/* Swipe hint — mobile only, disappears after first swipe */}
      {hasForecast && !swiped && (
        <div className="swipe-hint" aria-hidden="true">
          5-day &rsaquo;
        </div>
      )}
    </div>
  )
}

function App() {
  const [messages, setMessages] = useState([
    { role: 'agent', content: initialAgentMessage },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [dark, setDark] = useState(true)
  const [weatherData, setWeatherData] = useState(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [showNotice, setShowNotice] = useState(true)
  const messagesEndRef = useRef(null)
  const theme = dark ? themes.dark : themes.light

  useEffect(() => {
    document.body.setAttribute('data-theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  useEffect(() => {
    const last = messages[messages.length - 1]
    if (!last || last.role !== 'agent' || messages.length <= 1) return

    const city = extractCityFromMessages(messages)
    if (!city) return

    let cancelled = false
    setWeatherLoading(true)

    const mcpUrl = import.meta.env.VITE_MCP_URL || 'http://localhost:8000'
    Promise.all([
      fetch(`${mcpUrl}/current-weather?city=${encodeURIComponent(city)}`).then((r) => r.ok ? r.json() : null),
      fetch(`${mcpUrl}/forecast?city=${encodeURIComponent(city)}&days=5`).then((r) => r.ok ? r.json() : null),
    ])
      .then(([current, forecast]) => {
        if (cancelled) return
        if (current) {
          setWeatherData({
            city: current.city,
            country: current.country || '',
            temperature: current.temperature_celsius,
            description: current.description,
            humidity: current.humidity,
            windSpeed: current.wind_speed_kmh,
            forecast: forecast?.forecast?.map((d) => ({
              date: d.date,
              high: d.high_temp_celsius,
              description: d.description,
            })) || [],
          })
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setWeatherLoading(false)
      })

    return () => { cancelled = true }
  }, [messages])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || sending) return

    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setInput('')
    setSending(true)

    try {
      const agentUrl = import.meta.env.VITE_AGENT_URL || 'http://localhost:8001'
      const response = await fetch(`${agentUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })

      if (!response.ok) {
        let detail = 'Something went wrong talking to the weather service.'
        try {
          const errJson = await response.json()
          if (errJson?.detail) detail = String(errJson.detail)
        } catch {
          // ignore non-JSON error bodies
        }
        throw new Error(detail)
      }

      const data = await response.json()
      setMessages((prev) => [
        ...prev,
        { role: 'agent', content: data?.response ?? 'No response from agent.' },
      ])
    } catch (error) {
      const errorText = error instanceof Error ? error.message.toLowerCase() : ''
      const isQuota =
        errorText.includes('insufficient_quota') ||
        errorText.includes('quota') ||
        errorText.includes('rate-limit') ||
        errorText.includes('rate limit') ||
        errorText.includes('429')

      setMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          content: isQuota
            ? 'I am temporarily unavailable because the AI usage limit has been reached. Please try again later.'
            : 'Sorry, something went wrong. Please try again.',
        },
      ])
    } finally {
      setSending(false)
    }
  }

  const canSend = input.trim() && !sending

  return (
    <div
      className="app-root"
      style={{ backgroundColor: theme.pageBg }}
    >
      {/* ---- left / top: chat card ---- */}
      <div
        className="chat-card"
        style={{
          backgroundColor: theme.cardBg,
          borderRadius: 20,
          boxShadow: theme.cardShadow,
          border: `1px solid ${theme.cardBorder}`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transition: 'background-color 0.3s, box-shadow 0.3s, border-color 0.3s',
        }}
      >
        {/* ---- header ---- */}
        <header
          style={{
            padding: '16px 22px',
            background: theme.headerGradient,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>☀️</span>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: '1.1rem',
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '-0.01em',
              }}
            >
              Weather Agent
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.75)',
                fontWeight: 500,
              }}
            >
              Powered by OpenWeather + Gemini
            </p>
          </div>
          <HelpButton onClick={() => setShowNotice(true)} />
          <ThemeToggle dark={dark} onToggle={() => setDark((d) => !d)} />
        </header>

        {/* ---- messages ---- */}
        <main
          className="chat-messages"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 18px',
            backgroundColor: theme.messagesBg,
            transition: 'background-color 0.3s',
          }}
        >
          {messages.map((msg, i) => (
            <MessageBubble key={`${msg.role}-${i}`} role={msg.role} content={msg.content} theme={theme} />
          ))}

          {sending && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 8,
                marginBottom: 12,
                animation: 'fadeSlideIn 0.25s ease-out',
              }}
            >
              <AgentAvatar />
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 18,
                  borderBottomLeftRadius: 4,
                  backgroundColor: theme.agentBubbleBg,
                  boxShadow: theme.agentBubbleShadow,
                }}
              >
                <TypingDots theme={theme} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </main>

        {/* ---- input bar ---- */}
        <footer
          style={{
            borderTop: `1px solid ${theme.footerBorder}`,
            backgroundColor: theme.footerBg,
            padding: '14px 18px',
            flexShrink: 0,
            transition: 'background-color 0.3s, border-color 0.3s',
          }}
        >
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              className="chat-input"
              type="text"
              value={input}
              disabled={sending}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !sending) sendMessage()
              }}
              placeholder="Ask about weather in any city…"
              style={{
                flex: 1,
                padding: '12px 14px',
                borderRadius: 12,
                border: `1.5px solid ${theme.inputBorder}`,
                outline: 'none',
                fontSize: '0.925rem',
                backgroundColor: sending ? theme.inputBgDisabled : theme.inputBg,
                color: theme.inputColor,
                transition: 'border-color 0.2s, box-shadow 0.2s, background-color 0.3s, color 0.3s',
              }}
            />
            <button
              className="send-btn"
              type="button"
              onClick={sendMessage}
              disabled={!canSend}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                border: 'none',
                backgroundColor: canSend ? theme.sendBgActive : theme.sendBgDisabled,
                color: '#ffffff',
                fontSize: '1.15rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: canSend ? 'pointer' : 'not-allowed',
                transition: 'background-color 0.2s, transform 0.1s',
                flexShrink: 0,
              }}
              aria-label="Send message"
            >
              ➤
            </button>
          </div>
        </footer>
      </div>

      {showNotice && <NoticeModal onClose={() => setShowNotice(false)} />}

      {/* ---- right / bottom: weather panel ---- */}
      <div
        className="weather-card"
        style={{
          backgroundColor: 'var(--sage-300)',
          borderRadius: 20,
          boxShadow: '0 4px 16px rgba(36,59,50,0.08)',
        }}
      >
        <WeatherPanel weatherData={weatherData} loading={weatherLoading} />
      </div>
    </div>
  )
}

export default App
