import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import './Chatbot.css'
import chatbotKnowledge from '../data/chatbotKnowledge.json'
import { ChatMessage } from './support/ChatMessage'
import { ChatInput } from './support/ChatInput'
import { ContactVendorModal } from './support/ContactVendorModal'
import { TicketModal } from './support/TicketModal'
import { TrackTicketModal } from './support/TrackTicketModal'
import { apiGet } from '../lib/api'
import { getSession } from '../lib/session'

const MENU_OPTIONS_PUBLIC = [
  'Raise Ticket',
  'Admin',
  'Vendor',
  'Contact Vendor',
  'Track My Ticket',
  'How Trust Score Works',
  'Privacy & Security',
]

const MENU_OPTIONS_VENDOR = [
  'Raise Ticket',
  'Admin',
  'Vendor',
  'Track My Ticket',
  'How Trust Score Works',
  'Privacy & Security',
  'Support Response Time',
]

const ROUTE_ACTIONS = [
  'Raise Ticket',
  'Raise Ticket for Vendor',
  'Raise Ticket for another Vendor',
  'Raise Ticket for Admin',
  'Open Admin Ticket',
  'Open New Ticket',
  'Admin',
  'Vendor',
  'Vendor Details',
  'Contact Vendor',
  'Contact Vendor Details',
  'Track My Ticket',
  'How Trust Score Works',
  'Privacy & Security',
  'Support Response Time',
  'Back to Menu',
]

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function createBotMessage(text, actions = []) {
  return {
    id: `${Date.now()}-${Math.random()}`,
    sender: 'bot',
    text,
    actions,
  }
}

function createUserMessage(text) {
  return {
    id: `${Date.now()}-${Math.random()}`,
    sender: 'user',
    text,
  }
}

function buildRaiseTicketForVendorLabel(vendorName) {
  return `Raise Ticket for ${String(vendorName || '').trim()}`
}

function buildVendorProfileDetails(vendor) {
  if (!vendor) {
    return 'Select a vendor first, then I can show vendor profile details.'
  }

  const supportEmail = vendor.supportEmail || vendor.email || 'Not available'
  const supportNumber = vendor.phone || 'Not available'
  const locationLine = [vendor.city, vendor.state, vendor.country].filter(Boolean).join(', ') || 'Not available'
  const websiteLine = vendor.website || 'Not available'

  return [
    'Contact Vendor Details',
    `Vendor Name: ${vendor.name || 'N/A'}`,
    `Category: ${vendor.category || 'N/A'}`,
    '',
    'Support Contact:',
    `- Email: ${supportEmail}`,
    `- Number: ${supportNumber}`,
    '',
    `Website: ${websiteLine}`,
    `Location: ${locationLine}`,
  ].join('\n')
}

export function Chatbot() {
  const location = useLocation()
  const session = getSession()
  const role = session?.user?.role === 'VENDOR' ? 'vendor' : 'public'

  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [flowState, setFlowState] = useState('menu')
  const [issueTypes, setIssueTypes] = useState(['Other'])
  const [vendors, setVendors] = useState([])
  const [selectedVendorId, setSelectedVendorId] = useState('')
  const [openContactModal, setOpenContactModal] = useState(false)
  const [openTicketModal, setOpenTicketModal] = useState(false)
  const [openTrackModal, setOpenTrackModal] = useState(false)
  const [typing, setTyping] = useState(false)
  const [messages, setMessages] = useState([
    createBotMessage(
      'Welcome to Trusty Support. Choose a guided option and I will route you clearly.',
      role === 'vendor' ? MENU_OPTIONS_VENDOR : MENU_OPTIONS_PUBLIC
    ),
  ])

  const messagesEndRef = useRef(null)

  const menuOptions = useMemo(() => {
    return role === 'vendor' ? MENU_OPTIONS_VENDOR : MENU_OPTIONS_PUBLIC
  }, [role])

  const selectedVendor = useMemo(() => {
    return vendors.find((item) => String(item._id) === String(selectedVendorId)) || null
  }, [vendors, selectedVendorId])

  const shouldLiftChatWidget = useMemo(() => {
    const isVendorDashboard = location.pathname.startsWith('/vendor/dashboard')
    if (!isVendorDashboard) return false

    const view = String(new URLSearchParams(location.search).get('view') || '').toLowerCase()
    return view === 'profile' || view === 'settings'
  }, [location.pathname, location.search])

  function withBackToMenu(actions = []) {
    return Array.from(new Set([...(actions || []), 'Back to Menu'])).slice(0, 5)
  }

  const vendorSelectionActions = useMemo(() => {
    if (!Array.isArray(vendors) || !vendors.length) {
      return withBackToMenu(['Contact Vendor'])
    }

    const vendorActions = vendors.slice(0, 4).map((vendor) => `Vendor: ${vendor.name}`)
    return withBackToMenu(vendorActions)
  }, [vendors])

  useEffect(() => {
    if (!isOpen) return
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isOpen])

  useEffect(() => {
    let cancelled = false

    async function loadMeta() {
      try {
        const data = await apiGet('/api/support/meta')
        if (cancelled) return
        setIssueTypes(Array.isArray(data?.issueTypes) && data.issueTypes.length ? data.issueTypes : ['Other'])
        setVendors(Array.isArray(data?.vendors) ? data.vendors : [])
      } catch {
        if (cancelled) return
        setIssueTypes(['Other'])
        setVendors([])
      }
    }

    loadMeta()
    return () => {
      cancelled = true
    }
  }, [])

  function pushBotResponse(text, actions = []) {
    setMessages((prev) => [...prev, createBotMessage(text, actions)])
  }

  function pushMenuResponse(prefix = 'What would you like to do next?') {
    setFlowState('menu')
    setSelectedVendorId('')
    pushBotResponse(prefix, menuOptions)
  }

  function findMatchingAction(rawText) {
    const normalized = normalizeText(rawText)

    const exact = ROUTE_ACTIONS.find((item) => normalizeText(item) === normalized)
    if (exact) return exact

    const vendorByLabel = vendors.find((vendor) => normalizeText(`Vendor: ${vendor.name}`) === normalized)
    if (vendorByLabel) return `Vendor: ${vendorByLabel.name}`

    if (normalized === 'vendor') return 'Raise Ticket for Vendor'
    if (normalized === 'admin') return 'Raise Ticket for Admin'

    if (normalized.startsWith('raise ticket for ')) {
      const vendorNameRaw = String(rawText || '').trim().slice('Raise Ticket for '.length).trim()
      if (!vendorNameRaw) return null

      if (normalizeText(vendorNameRaw) === 'admin') return 'Raise Ticket for Admin'
      if (normalizeText(vendorNameRaw) === 'vendor') return 'Raise Ticket for Vendor'
      if (normalizeText(vendorNameRaw) === 'another vendor') return 'Raise Ticket for another Vendor'

      const matchedVendor = vendors.find((vendor) => normalizeText(vendor.name) === normalizeText(vendorNameRaw))
      if (matchedVendor) return buildRaiseTicketForVendorLabel(matchedVendor.name)
    }

    if (normalized.includes('menu') || normalized.includes('start over') || normalized.includes('reset')) return 'Back to Menu'
    if (normalized.includes('track')) return 'Track My Ticket'
    if (normalized.includes('trust score')) return 'How Trust Score Works'
    if (normalized.includes('privacy') || normalized.includes('security')) return 'Privacy & Security'
    if (normalized.includes('response time') || normalized.includes('sla')) return 'Support Response Time'
    if (normalized.includes('vendor details')) return 'Vendor Details'
    if (normalized.includes('vendor details') || normalized.includes('profile')) return 'Contact Vendor Details'
    if (normalized.includes('admin') && normalized.includes('ticket')) return 'Raise Ticket for Admin'
    if (normalized.includes('another vendor')) return 'Raise Ticket for another Vendor'
    if (normalized.includes('vendor') && normalized.includes('ticket')) return 'Raise Ticket for Vendor'
    if (normalized.includes('new ticket')) return 'Open New Ticket'
    if (normalized.includes('open admin')) return 'Open Admin Ticket'
    if (normalized.includes('contact') && normalized.includes('vendor')) return 'Contact Vendor'
    if (normalized.includes('ticket')) return 'Raise Ticket'

    return null
  }

  function resolveKnowledgeResponse(rawText) {
    const normalized = normalizeText(rawText)

    const byTitle = chatbotKnowledge.find((item) => normalizeText(item.title) === normalized)
    if (byTitle) {
      return {
        answer: byTitle.answer,
        suggestions: byTitle.suggestions || (role === 'vendor' ? ['Raise Ticket'] : ['Contact Vendor', 'Raise Ticket']),
      }
    }

    let best = null
    let bestScore = 0

    for (const item of chatbotKnowledge) {
      let score = 0
      for (const keyword of item.keywords || []) {
        if (normalized.includes(normalizeText(keyword))) score += 1
      }
      if (score > bestScore) {
        bestScore = score
        best = item
      }
    }

    if (!best || bestScore === 0) return null

    return {
      answer: best.answer,
      suggestions: best.suggestions || (role === 'vendor' ? ['Raise Ticket'] : ['Contact Vendor', 'Raise Ticket']),
    }
  }

  function openVendorTicketFlow(vendor) {
    setFlowState('vendor-ticket')
    setSelectedVendorId(String(vendor._id))
    setOpenContactModal(true)
    window.setTimeout(() => {
      pushBotResponse(
        `Opening vendor ticket form for ${vendor.name}. After submit, choose track or open a new ticket.`,
        withBackToMenu(['Track My Ticket', 'Open New Ticket'])
      )
    }, 180)
  }

  function handleOption(option, addUserMessage = true) {
    const label = String(option || '')

    if (addUserMessage) {
      setMessages((prev) => [...prev, createUserMessage(label)])
    }

    if (label.startsWith('Vendor: ')) {
      const vendorName = label.replace('Vendor: ', '').trim()
      const vendor = vendors.find((item) => normalizeText(item.name) === normalizeText(vendorName))
      if (!vendor) {
        pushBotResponse('Vendor not found. Please choose from available options.', vendorSelectionActions)
        return
      }

      setSelectedVendorId(String(vendor._id))
      setFlowState('vendor-selected')
      window.setTimeout(() => {
        pushBotResponse(
          `${vendor.name} selected. Choose next step:`,
          withBackToMenu([
            'Contact Vendor Details',
            buildRaiseTicketForVendorLabel(vendor.name),
            'Raise Ticket for another Vendor',
          ])
        )
      }, 180)
      return
    }

    if (label === 'Back to Menu') {
      window.setTimeout(() => {
        pushMenuResponse('Main menu restored. Choose any option below.')
      }, 180)
      return
    }

    if (label === 'Raise Ticket') {
      setFlowState('ticket-routing')
      window.setTimeout(() => {
        pushBotResponse(
          'Choose where you want to raise the ticket.',
          ['Raise Ticket for Vendor', 'Raise Ticket for Admin', 'Support Response Time', 'How Trust Score Works', 'Privacy & Security']
        )
      }, 180)
      return
    }

    if (label === 'Admin') {
      handleOption('Raise Ticket for Admin', false)
      return
    }

    if (label === 'Vendor') {
      handleOption('Raise Ticket for Vendor', false)
      return
    }

    if (label === 'Raise Ticket for Admin') {
      setFlowState('ticket-admin')
      window.setTimeout(() => {
        pushBotResponse(
          'Admin selected. Choose one option:',
          withBackToMenu(['Open Admin Ticket', 'Track My Ticket', 'Vendor Details'])
        )
      }, 180)
      return
    }

    if (label === 'Vendor Details') {
      if (selectedVendor) {
        setFlowState('vendor-details')
        window.setTimeout(() => {
          pushBotResponse(
            buildVendorProfileDetails(selectedVendor),
            withBackToMenu([
              buildRaiseTicketForVendorLabel(selectedVendor.name),
              'Raise Ticket for another Vendor',
              'Open New Ticket',
            ])
          )
        }, 180)
        return
      }

      setFlowState('vendor-select')
      window.setTimeout(() => {
        pushBotResponse('Select vendor name to view vendor details:', vendorSelectionActions)
      }, 180)
      return
    }

    if (label === 'Open Admin Ticket') {
      setFlowState('ticket-admin')
      setOpenTicketModal(true)
      window.setTimeout(() => {
        pushBotResponse('Admin ticket form opened. Fill issue details and submit.', withBackToMenu(['Track My Ticket']))
      }, 180)
      return
    }

    if (label === 'Raise Ticket for Vendor' || label === 'Contact Vendor') {
      setFlowState('vendor-select')
      window.setTimeout(() => {
        pushBotResponse('Select vendor name:', vendorSelectionActions)
      }, 180)
      return
    }

    if (label === 'Contact Vendor Details') {
      setFlowState('vendor-details')
      window.setTimeout(() => {
        pushBotResponse(
          buildVendorProfileDetails(selectedVendor),
          withBackToMenu([
            selectedVendor ? buildRaiseTicketForVendorLabel(selectedVendor.name) : 'Raise Ticket for Vendor',
            'Raise Ticket for another Vendor',
            'Open New Ticket',
          ])
        )
      }, 180)
      return
    }

    if (
      label.startsWith('Raise Ticket for ') &&
      label !== 'Raise Ticket for Vendor' &&
      label !== 'Raise Ticket for Admin' &&
      label !== 'Raise Ticket for another Vendor'
    ) {
      const vendorName = label.slice('Raise Ticket for '.length).trim()
      const vendor = vendors.find((item) => normalizeText(item.name) === normalizeText(vendorName))

      if (!vendor) {
        setFlowState('vendor-select')
        window.setTimeout(() => {
          pushBotResponse('Vendor not found. Select vendor name:', vendorSelectionActions)
        }, 180)
        return
      }

      openVendorTicketFlow(vendor)
      return
    }

    if (label === 'Open New Ticket') {
      if (!selectedVendor) {
        setFlowState('vendor-select')
        window.setTimeout(() => {
          pushBotResponse('Select vendor first, then open new vendor ticket.', vendorSelectionActions)
        }, 180)
        return
      }

      openVendorTicketFlow(selectedVendor)
      return
    }

    if (label === 'Raise Ticket for another Vendor') {
      setFlowState('vendor-select')
      setSelectedVendorId('')
      window.setTimeout(() => {
        pushBotResponse('Select vendor name:', vendorSelectionActions)
      }, 180)
      return
    }

    if (label === 'Raise Ticket for Vendor') {
      if (!selectedVendor) {
        setFlowState('vendor-select')
        window.setTimeout(() => {
          pushBotResponse('Select vendor name to continue.', vendorSelectionActions)
        }, 180)
        return
      }

      openVendorTicketFlow(selectedVendor)
      return
    }

    if (label === 'Track My Ticket') {
      setFlowState('track')
      setOpenTrackModal(true)
      window.setTimeout(() => {
        pushBotResponse('Tracker opened. Search using reference ID or email.', withBackToMenu(['Open Admin Ticket', 'Open New Ticket']))
      }, 180)
      return
    }

    if (label === 'How Trust Score Works') {
      setFlowState('trust-score')
      window.setTimeout(() => {
        pushBotResponse(
          'Trusty Trust Score combines verified transaction behavior, delivery consistency, feedback authenticity, and dispute patterns into an explainable score from 0 to 100.',
          withBackToMenu(['Privacy & Security', 'Support Response Time'])
        )
      }, 180)
      return
    }

    if (label === 'Privacy & Security') {
      setFlowState('privacy')
      window.setTimeout(() => {
        pushBotResponse(
          'Trusty uses privacy-safe behavioral signals and does not expose sensitive personal data in trust outputs.',
          withBackToMenu(['How Trust Score Works', 'Raise Ticket'])
        )
      }, 180)
      return
    }

    if (label === 'Support Response Time') {
      setFlowState('response-time')
      window.setTimeout(() => {
        pushBotResponse(
          'Typical first support response is within 24 hours. Critical issues are prioritized faster when possible.',
          withBackToMenu(['Track My Ticket', 'Raise Ticket'])
        )
      }, 180)
      return
    }

    const knowledge = resolveKnowledgeResponse(label)
    if (knowledge) {
      window.setTimeout(() => {
        const mapped = (knowledge.suggestions || []).map((item) => findMatchingAction(item)).filter(Boolean)
        const fallback = role === 'vendor' ? ['Raise Ticket', 'Track My Ticket'] : ['Contact Vendor', 'Raise Ticket']
        pushBotResponse(knowledge.answer, withBackToMenu(mapped.length ? mapped : fallback))
      }, 180)
      return
    }

    window.setTimeout(() => {
      const fallback = role === 'vendor' ? ['Raise Ticket', 'Track My Ticket'] : ['Contact Vendor', 'Raise Ticket']
      pushBotResponse('Choose one guided option and I will route you to the exact support path.', withBackToMenu(fallback))
    }, 180)
  }

  function handleSend() {
    const trimmed = inputValue.trim()
    if (!trimmed) return

    setMessages((prev) => [...prev, createUserMessage(trimmed)])
    setInputValue('')

    const matchedAction = findMatchingAction(trimmed)
    if (matchedAction) {
      handleOption(matchedAction, false)
      return
    }

    const knowledge = resolveKnowledgeResponse(trimmed)
    if (knowledge) {
      setTyping(true)
      window.setTimeout(() => {
        const mapped = (knowledge.suggestions || []).map((item) => findMatchingAction(item)).filter(Boolean)
        const fallback = role === 'vendor' ? ['Raise Ticket', 'Track My Ticket'] : ['Contact Vendor', 'Raise Ticket']
        pushBotResponse(knowledge.answer, withBackToMenu(mapped.length ? mapped : fallback))
        setTyping(false)
      }, 260)
      return
    }

    setTyping(true)
    window.setTimeout(() => {
      const fallback = role === 'vendor' ? ['Raise Ticket', 'Track My Ticket'] : ['Contact Vendor', 'Raise Ticket']
      pushBotResponse('Use a guided action for the clearest support routing.', withBackToMenu(fallback))
      setTyping(false)
    }, 260)
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleSend()
    }
  }

  return (
    <div className={shouldLiftChatWidget ? 'trustyChatbot trustyChatbot--lifted' : 'trustyChatbot'} aria-live="polite">
      {isOpen ? (
        <section className="trustyChatbotPanel" role="dialog" aria-label="TRUSTY Support chat">
          <header className="trustyChatbotHeader">
            <div className="trustyChatbotHeaderTitle">Trusty Support Copilot</div>
            <div className="trustyChatbotHeaderMeta">Layered support: bot, vendor messaging, admin tickets | Flow: {flowState}</div>
          </header>

          <div className="trustyChatbotMessages">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} onAction={handleOption} />
            ))}
            {typing ? <div className="trustyTyping">Trusty assistant is typing...</div> : null}
            <div ref={messagesEndRef} />
          </div>

          <ChatInput
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={handleKeyDown}
            onSend={handleSend}
          />
        </section>
      ) : null}

      <div className="trustyLauncherStack">
        <div className="trustyAssistantWrap">
          <video className="trustyAssistantVideo" src="/robot.mp4" autoPlay loop muted playsInline />
        </div>

        <button
          type="button"
          className="trustyChatToggle"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label={isOpen ? 'Close support chat' : 'Open support chat'}
        >
          {isOpen ? 'Close Chat' : 'Support Chat'}
        </button>
      </div>

      <ContactVendorModal
        open={openContactModal}
        onClose={() => setOpenContactModal(false)}
        vendors={vendors}
        preselectedVendorId={selectedVendorId}
      />
      <TicketModal open={openTicketModal} onClose={() => setOpenTicketModal(false)} issueTypes={issueTypes} />
      <TrackTicketModal open={openTrackModal} onClose={() => setOpenTrackModal(false)} />
    </div>
  )
}
