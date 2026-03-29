import { QuickActionButtons } from './QuickActionButtons'

export function ChatMessage({ message, onAction }) {
  const isBot = message.sender === 'bot'

  return (
    <div className={isBot ? 'trustyMessage trustyMessageBot' : 'trustyMessage trustyMessageUser'}>
      <p>{message.text}</p>
      <QuickActionButtons actions={message.actions} onAction={onAction} />
    </div>
  )
}
