import type { CrmRecord } from './types'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

function isoOffset(msOffset: number) {
  return new Date(Date.now() + msOffset).toISOString()
}

function mkActivity(kind: CrmRecord['activity'][number]['kind'], title: string, detail: string, actor = 'System', atOffset = 0) {
  return {
    kind,
    title,
    detail,
    actor,
    at: isoOffset(atOffset),
  }
}

function mkRecord(seed: Partial<CrmRecord> & Pick<CrmRecord, 'id'>): CrmRecord {
  const fallbackName = seed.basicInfo?.name || 'Unknown Lead'
  return {
    id: seed.id,
    stage: seed.stage || 'new_lead',
    priority: seed.priority || 'medium',
    paymentStatus: seed.paymentStatus || 'none',
    dealValue: seed.dealValue ?? 0,
    trustScore: seed.trustScore ?? 62,
    totalOrders: seed.totalOrders ?? 0,
    activityItems: seed.activityItems ?? (seed.activity?.length || 0),
    followUpAt: seed.followUpAt ?? null,
    deletedAt: seed.deletedAt ?? null,
    updatedAt: seed.updatedAt || isoOffset(-3 * HOUR),
    source: seed.source || 'CRM Import',
    tags: seed.tags || [],
    basicInfo: {
      name: fallbackName,
      company: seed.basicInfo?.company || 'Unknown Company',
      email: seed.basicInfo?.email || 'unknown@example.com',
      phone: seed.basicInfo?.phone || '+1 555 000 0000',
      country: seed.basicInfo?.country || 'Unknown',
    },
    product: {
      name: seed.product?.name || 'General Product',
      dosage: seed.product?.dosage,
      quantity: seed.product?.quantity,
      raw: seed.product?.raw,
    },
    activity: seed.activity || [mkActivity('system', 'Record created', 'Lead created in CRM pipeline', 'System', -5 * DAY)],
    notes: seed.notes || [],
  }
}

export const mockData: CrmRecord[] = [
  ...[
    { name: 'Gary Gilbert', company: 'KingBee Guitars', email: 'garygilbertkingbeeguitars@gmail.com', phone: '+1 202 555 0101', country: 'United States', product: 'Tadalafil Tablets-100 Strip' },
    { name: 'Brandon Henry', company: 'BH Pharma Connect', email: 'bchenry20001010@gmail.com', phone: '+1 202 555 0102', country: 'United States', product: 'Alerte Modafinil 100 Mg' },
    { name: 'Gary', company: 'Seiserg Retail', email: 'seisegr@yahoo.com', phone: '+1 202 555 0103', country: 'United States', product: 'Vidalista 10 Mg Tadalafil Tablets-1 Box' },
    { name: 'Yusuf Khan', company: 'Doha MediTrade', email: 'yusuf@meditrade.qa', phone: '+974 5550 1886', country: 'Qatar', product: 'Clopidogrel 75mg' },
    { name: 'Dr. Aiko Tanaka', company: 'Sakura Medical Imports', email: 'aiko@sakura-medical.jp', phone: '+81 90 6110 2345', country: 'Japan', product: 'Atorvastatin 20mg' },
    { name: 'Prof. Mateo Rossi', company: 'Lombardia Pharma S.R.L.', email: 'mateo.rossi@lombardia.it', phone: '+39 335 410 882', country: 'Italy', product: 'Metformin 500mg' },
    { name: 'Fatima Al-Mansoori', company: 'Gulf Wellness Distributors', email: 'fatima@gulfwellness.ae', phone: '+971 55 311 7940', country: 'UAE', product: 'Amoxicillin 500mg' },
    { name: 'Dr. Emeka Okafor', company: 'Lagos HealthLine Ltd.', email: 'e.okafor@lagoshealth.ng', phone: '+234 803 501 1881', country: 'Nigeria', product: 'Paracetamol 500mg' },
    { name: 'Liu Wei', company: 'Shanghai BioTrade Co.', email: 'liu.wei@biotrade.cn', phone: '+86 138 1120 6651', country: 'China', product: 'Insulin Glargine 100IU/mL' },
    { name: 'Sofia Hernandez', company: 'Madrid Clinical Supply', email: 'sofia@madridclinical.es', phone: '+34 611 301 210', country: 'Spain', product: 'Omeprazole 20mg' },
    { name: 'Ravi Sharma', company: 'Mumbai Medico Exports', email: 'ravi@mumbaimedico.in', phone: '+91 98970 22441', country: 'India', product: 'Azithromycin 500mg' },
    { name: 'Hans Muller', company: 'Berlin Pharma Logistik', email: 'h.muller@berlinpharma.de', phone: '+49 157 8011 2200', country: 'Germany', product: 'Levothyroxine 100mcg' },
    { name: 'Dr. Laila Hassan', company: 'Cairo Remedy Chain', email: 'laila@cairoremedy.eg', phone: '+20 100 889 5521', country: 'Egypt', product: 'Cefixime 200mg' },
    { name: 'Carlos Mendes', company: 'Lisbon Care Imports', email: 'c.mendes@lisboncare.pt', phone: '+351 918 224 171', country: 'Portugal', product: 'Ibuprofen 400mg' },
    { name: 'Priya Menon', company: 'Kerala Lifecare', email: 'priya@keralalifecare.in', phone: '+91 90731 11941', country: 'India', product: 'Rabeprazole 20mg' },
    { name: 'Helena Costa', company: 'Porto Cureline', email: 'helena@cureline.pt', phone: '+351 911 222 101', country: 'Portugal', product: 'Montelukast 10mg' },
    { name: 'Omar Al-Hadi', company: 'Riyadh MediHub', email: 'omar@medihub.sa', phone: '+966 50 320 8123', country: 'Saudi Arabia', product: 'Cefuroxime 500mg' },
    { name: 'Nadia Ibrahim', company: 'Alexandria Pharma Gate', email: 'nadia@apharmagate.eg', phone: '+20 111 508 9123', country: 'Egypt', product: 'Esomeprazole 40mg' },
    { name: 'Kenji Sato', company: 'Osaka Medisupply', email: 'kenji@medisupply.jp', phone: '+81 80 7222 3301', country: 'Japan', product: 'Losartan 50mg' },
    { name: 'Lucas Pereira', company: 'Sao Paulo Health Connect', email: 'lucas@healthconnect.br', phone: '+55 11 95555 1020', country: 'Brazil', product: 'Metronidazole 400mg' },
    { name: 'Amina Noor', company: 'Nairobi Care Network', email: 'amina@carenetwork.ke', phone: '+254 712 440 230', country: 'Kenya', product: 'Fluconazole 150mg' },
  ].map((seed, index) => {
    const stageCycle: CrmRecord['stage'][] = [
      'new_lead',
      'contacted',
      'negotiation_follow_up',
      'invoice_sent',
      'payment_pending',
      'order_processing',
      'shipped',
      'delivered',
      'payment_received',
      'feedback_retention',
    ]
    const stage = stageCycle[index % stageCycle.length]

    const paymentStatus: CrmRecord['paymentStatus'] =
      stage === 'payment_pending'
        ? 'pending'
        : ['payment_received', 'order_processing', 'shipped', 'delivered', 'feedback_retention'].includes(stage)
          ? 'paid'
          : 'none'

    return mkRecord({
    id: `REC-${9001 + index}`,
    stage,
    priority: index % 7 === 0 ? 'high' : 'medium',
    paymentStatus,
    dealValue: 0,
    trustScore: 60,
    totalOrders: index % 4 === 0 ? 3 : 0,
    activityItems: 1,
    followUpAt: isoOffset((index % 6) * DAY + 4 * HOUR),
    updatedAt: isoOffset(-(index + 1) * 2 * HOUR),
    source: 'CRM Pipeline',
    tags: ['New'],
    basicInfo: {
      name: seed.name,
      company: seed.company,
      email: seed.email,
      phone: seed.phone,
      country: seed.country,
    },
    product: { name: seed.product },
    activity: [
      mkActivity('system', 'Lead created', 'Lead added to New Lead stage in CRM pipeline', 'System', -(index + 1) * HOUR),
    ],
  })
  }),
]
