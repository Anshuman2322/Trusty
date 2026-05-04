function pad2(value) {
  return String(value).padStart(2, '0');
}

function toDateValue(value) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return `${parsed.getUTCFullYear()}-${pad2(parsed.getUTCMonth() + 1)}-${pad2(parsed.getUTCDate())}`;
}

function normalizeRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value;
}

function renderTemplate(template, data = {}, options = {}) {
  const source = String(template || '');
  if (!source) return '';

  const values = normalizeRecord(data);
  const keepUnknown = options.keepUnknown !== false;

  return source.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (placeholder, key) => {
    if (!Object.prototype.hasOwnProperty.call(values, key)) {
      return keepUnknown ? placeholder : '';
    }

    const rawValue = values[key];
    if (rawValue === undefined || rawValue === null) {
      return keepUnknown ? placeholder : '';
    }

    return String(rawValue);
  });
}

function deriveRepName(user = {}) {
  const explicit = String(user?.name || '').trim();
  if (explicit) return explicit;

  const email = String(user?.email || '').trim();
  if (!email) return '';

  return email.split('@')[0].replace(/[._-]+/g, ' ').trim();
}

function buildLeadTemplateData({ lead, user, extraData = {} }) {
  const extra = normalizeRecord(extraData);

  return {
    // Existing placeholders
    name: String(lead?.name || extra.name || ''),
    product: String(lead?.product || extra.product || ''),
    dosage: String(extra.dosage || ''),
    country: String(lead?.country || extra.country || ''),
    rep_name: String(extra.rep_name || deriveRepName(user)),
    rep_email: String(extra.rep_email || user?.email || ''),

    // Client info
    email: String(lead?.email || extra.email || ''),
    phone: String(lead?.phone || extra.phone || ''),
    company_name: String(extra.company_name || ''),

    // Product / order info
    quantity: String(extra.quantity || ''),
    price: String(extra.price || ''),
    currency: String(extra.currency || ''),
    total_amount: String(extra.total_amount || ''),

    // Shipping info
    shipping_address: String(extra.shipping_address || lead?.address || ''),
    city: String(extra.city || ''),
    postal_code: String(extra.postal_code || ''),

    // Payment / invoice
    payment_link: String(extra.payment_link || ''),
    invoice_id: String(extra.invoice_id || ''),
    invoice_link: String(extra.invoice_link || ''),

    // Tracking
    tracking_link: String(extra.tracking_link || ''),
    tracking_id: String(extra.tracking_id || lead?.trackingRef || ''),

    // System / CRM
    order_id: String(extra.order_id || lead?.linkedOrderId || ''),
    lead_id: String(extra.lead_id || lead?._id || ''),
    status: String(extra.status || lead?.status || ''),

    // Time / dates
    date: String(extra.date || toDateValue(lead?.date) || toDateValue(new Date())),
    expected_delivery: String(extra.expected_delivery || ''),
    followup_date: String(extra.followup_date || toDateValue(lead?.followUpAt) || ''),

    // Engagement
    feedback_link: String(extra.feedback_link || ''),
    rating_link: String(extra.rating_link || ''),
  };
}

module.exports = {
  renderTemplate,
  buildLeadTemplateData,
};
