import { useEffect, useRef, useState } from 'react'

const initialAgentMessage =
  'Hi! Ask me anything about the weather. Try: Should I go hiking in Austin this weekend?'

function App() {
  const [messages, setMessages] = useState([
    { role: 'agent', content: initialAgentMessage },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)

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
      const response = await fetch('http://127.0.0.1:8001/chat', {
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
          // Fall back to a generic error if response is not JSON.
        }
        throw new Error(detail)
      }

      const data = await response.json()
      setMessages((prev) => [
        ...prev,
        { role: 'agent', content: data?.response ?? 'No response from agent.' },
      ])
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          content:
            error instanceof Error
              ? `I couldn't reach the backend: ${error.message}`
              : "I couldn't reach the backend.",
        },
      ])
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f4f7fb',
        color: '#1f2937',
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      }}
    >
      <header
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid #d9e2ec',
          backgroundColor: '#ffffff',
          position: 'sticky',
          top: 0,
          zIndex: 2,
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
          ☀️ Weather Agent
        </h1>
      </header>

      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          paddingBottom: '96px',
        }}
      >
        {messages.map((message, index) => {
          const isUser = message.role === 'user'
          return (
            <div
              key={`${message.role}-${index}`}
              style={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                marginBottom: '10px',
              }}
            >
              <div
                style={{
                  maxWidth: '78%',
                  padding: '10px 12px',
                  borderRadius: '14px',
                  lineHeight: 1.45,
                  whiteSpace: 'pre-wrap',
                  backgroundColor: isUser ? '#1f75fe' : '#e5e7eb',
                  color: isUser ? '#ffffff' : '#111827',
                  borderTopRightRadius: isUser ? '6px' : '14px',
                  borderTopLeftRadius: isUser ? '14px' : '6px',
                }}
              >
                {message.content}
              </div>
            </div>
          )
        })}

        {sending && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '10px' }}>
            <div
              style={{
                maxWidth: '78%',
                padding: '10px 12px',
                borderRadius: '14px',
                backgroundColor: '#e5e7eb',
                color: '#111827',
              }}
            >
              Thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      <footer
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          borderTop: '1px solid #d9e2ec',
          backgroundColor: '#ffffff',
          padding: '12px 14px',
        }}
      >
        <div style={{ display: 'flex', gap: '10px', maxWidth: '900px', margin: '0 auto' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') sendMessage()
            }}
            placeholder="Ask about weather in any city..."
            style={{
              flex: 1,
              padding: '11px 12px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              outline: 'none',
              fontSize: '0.95rem',
            }}
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={sending || !input.trim()}
            style={{
              padding: '11px 16px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: sending || !input.trim() ? '#94a3b8' : '#1f75fe',
              color: '#ffffff',
              fontWeight: 600,
              cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            Send
          </button>
        </div>
      </footer>
    </div>
  )
}

export default App
