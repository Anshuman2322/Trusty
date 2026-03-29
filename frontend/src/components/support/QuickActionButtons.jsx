export function QuickActionButtons({ actions, onAction }) {
  if (!Array.isArray(actions) || actions.length === 0) return null

  return (
    <div className="trustyInlineActions">
      {actions.map((action) => (
        <button
          key={action}
          type="button"
          className="trustyInlineActionButton"
          onClick={() => onAction(action)}
        >
          {action}
        </button>
      ))}
    </div>
  )
}
