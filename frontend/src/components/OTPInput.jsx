import { useEffect, useMemo, useRef } from 'react'

export function OTPInput({ value = '', length = 6, onChange, disabled = false, autoFocus = false }) {
  const inputsRef = useRef([])
  const chars = useMemo(() => {
    const normalized = String(value || '').slice(0, length)
    return Array.from({ length }, (_, index) => normalized[index] || '')
  }, [value, length])

  useEffect(() => {
    if (!autoFocus || disabled) return
    inputsRef.current[0]?.focus()
  }, [autoFocus, disabled])

  function focusAt(index) {
    const safeIndex = Math.max(0, Math.min(length - 1, index))
    inputsRef.current[safeIndex]?.focus()
  }

  function updateAt(index, nextChar) {
    const next = [...chars]
    next[index] = nextChar
    onChange(next.join(''))
  }

  function handleChange(index, event) {
    const raw = String(event.target.value || '')
    const digits = raw.replace(/\D/g, '')
    if (!digits) {
      updateAt(index, '')
      return
    }

    if (digits.length === 1) {
      updateAt(index, digits)
      if (index < length - 1) focusAt(index + 1)
      return
    }

    // Handle multi-char paste into a single input.
    const next = [...chars]
    let cursor = index
    for (const digit of digits) {
      if (cursor >= length) break
      next[cursor] = digit
      cursor += 1
    }
    onChange(next.join(''))
    focusAt(Math.min(cursor, length - 1))
  }

  function handleKeyDown(index, event) {
    if (event.key === 'Backspace') {
      if (chars[index]) {
        updateAt(index, '')
      } else if (index > 0) {
        updateAt(index - 1, '')
        focusAt(index - 1)
      }
      event.preventDefault()
      return
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      focusAt(index - 1)
      event.preventDefault()
      return
    }

    if (event.key === 'ArrowRight' && index < length - 1) {
      focusAt(index + 1)
      event.preventDefault()
    }
  }

  function handlePaste(event) {
    event.preventDefault()
    const digits = String(event.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, length)
    if (!digits) return
    onChange(digits)
    focusAt(Math.min(digits.length, length - 1))
  }

  return (
    <div className="tw-flex tw-gap-2" onPaste={handlePaste}>
      {chars.map((char, index) => (
        <input
          key={index}
          ref={(node) => {
            inputsRef.current[index] = node
          }}
          value={char}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          disabled={disabled}
          onChange={(event) => handleChange(index, event)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          className="tw-h-11 tw-w-11 tw-rounded-lg tw-border tw-border-slate-300 tw-bg-white tw-text-center tw-text-lg tw-font-semibold tw-text-slate-800 tw-outline-none focus:tw-border-cyan-500 focus:tw-ring-2 focus:tw-ring-cyan-100 disabled:tw-cursor-not-allowed disabled:tw-bg-slate-100"
          aria-label={`OTP digit ${index + 1}`}
        />
      ))}
    </div>
  )
}
