export function QuickActions({ actions, onAction }) {
  if (!actions.length) return null

  return (
    <div className="trustyQuickOptions">
      {actions.map((option) => (
        <button
          key={option}
          type="button"
          className="trustyQuickOptionButton"
          onClick={() => onAction(option)}
        >
          {option}
        </button>
      ))}
    </div>
  )
}
