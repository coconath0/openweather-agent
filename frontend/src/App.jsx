import { useEffect, useRef, useState } from 'react'
import './App.css'

const initialAgentMessage =
  'Hi! Ask me anything about the weather. Try: Should I go hiking in Austin this weekend?'

const themes = {
  dark: {
    pageBg: '#0f172a',
    cardBg: '#1e293b',
    cardBorder: '#334155',
    cardShadow: '0 12px 40px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)',
    headerGradient: 'linear-gradient(135deg, #1e40af, #0369a1)',
    messagesBg: '#0f172a',
    agentBubbleBg: '#334155',
    agentBubbleColor: '#e2e8f0',
    agentBubbleShadow: '0 1px 4px rgba(0,0,0,0.3)',
    userBubbleBg: '#3b82f6',
    userBubbleColor: '#ffffff',
    userBubbleShadow: '0 2px 8px rgba(59,130,246,0.3)',
    typingDotColor: '#64748b',
    footerBg: '#1e293b',
    footerBorder: '#334155',
    inputBg: '#0f172a',
    inputBgDisabled: '#1e293b',
    inputBorder: '#475569',
    inputColor: '#e2e8f0',
    inputPlaceholder: '#64748b',
    sendBgActive: '#3b82f6',
    sendBgDisabled: '#475569',
  },
  light: {
    pageBg: '#f0f8ff',
    cardBg: '#ffffff',
    cardBorder: '#e2e8f0',
    cardShadow: '0 12px 40px rgba(15,23,42,0.09), 0 2px 8px rgba(15,23,42,0.04)',
    headerGradient: 'linear-gradient(135deg, #3b82f6, #0ea5e9)',
    messagesBg: '#f8fafc',
    agentBubbleBg: '#f1f5f9',
    agentBubbleColor: '#1e293b',
    agentBubbleShadow: '0 1px 4px rgba(15,23,42,0.06)',
    userBubbleBg: '#3b82f6',
    userBubbleColor: '#ffffff',
    userBubbleShadow: '0 2px 8px rgba(59,130,246,0.2)',
    typingDotColor: '#94a3b8',
    footerBg: '#ffffff',
    footerBorder: '#e2e8f0',
    inputBg: '#ffffff',
    inputBgDisabled: '#f1f5f9',
    inputBorder: '#cbd5e1',
    inputColor: '#1e293b',
    inputPlaceholder: '#94a3b8',
    sendBgActive: '#3b82f6',
    sendBgDisabled: '#cbd5e1',
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
        background: 'linear-gradient(135deg, #38bdf8, #3b82f6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.9rem',
        flexShrink: 0,
        boxShadow: '0 2px 6px rgba(59,130,246,0.25)',
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

function App() {
  const [messages, setMessages] = useState([
    { role: 'agent', content: initialAgentMessage },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [dark, setDark] = useState(true)
  const messagesEndRef = useRef(null)
  const theme = dark ? themes.dark : themes.light

  useEffect(() => {
    document.body.setAttribute('data-theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || sending) return

    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setInput('')
    setSending(true)

    try {
      const response = await fetch('http://localhost:8001/chat', {
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
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backgroundColor: theme.pageBg,
        transition: 'background-color 0.3s',
      }}
    >
      {/* ---- chat card ---- */}
      <div
        style={{
          width: '100%',
          maxWidth: 860,
          height: '100%',
          maxHeight: 940,
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
    </div>
  )
}

export default App
