export function ChatInput({ value, onChange, onSend, onKeyDown, disabled = false }) {
  return (
    <div className="trustyChatbotInputRow">
      <input
        type="text"
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder="Type your message..."
        className="trustyChatbotInput"
        disabled={disabled}
      />
      <button type="button" className="trustySendButton" onClick={onSend} disabled={disabled}>
        Send
      </button>
    </div>
  )
}
