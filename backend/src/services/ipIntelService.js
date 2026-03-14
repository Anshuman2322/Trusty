const net = require('net');
const path = require('path');

const { Reader } = require('@maxmind/geoip2-node');
const { fetch } = require('undici');

const { sha256Hex } = require('./cryptoService');

let cityReaderPromise;
let asnReaderPromise;
let missingIpqsApiKeyLogged = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveDataPath(envName, defaultFileName) {
  const configuredPath = String(process.env[envName] || '').trim();
  if (configuredPath) return path.resolve(configuredPath);
  return path.resolve(__dirname, '../../data', defaultFileName);
}

function getIpQualityScoreApiKey() {
  return String(process.env.IPQUALITYSCORE_API_KEY || '').trim();
}

function getIpQualityScoreBaseUrl() {
  return process.env.IPQUALITYSCORE_BASE_URL || 'https://ipqualityscore.com/api/json/ip';
}

function getIpQualityScoreTimeoutMs() {
  return Number(process.env.IPQUALITYSCORE_TIMEOUT_MS || 1800);
}

function getIpQualityScoreAttempts() {
  return Math.max(1, Number(process.env.IPQUALITYSCORE_RETRY_ATTEMPTS || 2));
}

function getIpQualityScoreStrictness() {
  return Math.max(0, Math.min(3, Number(process.env.IPQUALITYSCORE_STRICTNESS || 1)));
}

function readHeader(headers, names) {
  for (const name of names) {
    const value = headers?.[name];
    if (Array.isArray(value) && value[0]) return String(value[0]).trim();
    if (value) return String(value).trim();
  }
  return '';
}

function normalizeCountryCode(value) {
  const trimmed = String(value || '').trim().toUpperCase();
  if (!trimmed || trimmed === 'XX' || trimmed === 'UNKNOWN') return null;
  return trimmed;
}

function normalizeLocationValue(value) {
  const trimmed = String(value || '').trim();
  return trimmed || null;
}

function resolveCountryName(countryCode, countryName) {
  if (countryName) return countryName;
  if (!countryCode) return null;

  try {
    const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
    return displayNames.of(countryCode) || countryCode;
  } catch {
    return countryCode;
  }
}

function normalizeClientIp(rawValue) {
  let value = String(rawValue || '').split(',')[0].trim();
  if (!value) return '';

  value = value.replace(/^for=/i, '').replace(/^"|"$/g, '');

  const semicolonIndex = value.indexOf(';');
  if (semicolonIndex >= 0) {
    value = value.slice(0, semicolonIndex).trim();
  }

  if (value.startsWith('[') && value.includes(']')) {
    value = value.slice(1, value.indexOf(']'));
  }

  const zoneIndex = value.indexOf('%');
  if (zoneIndex >= 0) {
    value = value.slice(0, zoneIndex);
  }

  if (value.startsWith('::ffff:')) {
    value = value.slice(7);
  }

  if (value === '::1' || value === '0:0:0:0:0:0:0:1') {
    return '127.0.0.1';
  }

  const ipv4WithPort = value.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  if (ipv4WithPort) {
    value = ipv4WithPort[1];
  }

  if (net.isIP(value) === 6) {
    return value.toLowerCase();
  }

  return value;
}

function extractClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
  const candidate = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return normalizeClientIp(candidate);
}

function extractLocationHeaders(headers = {}) {
  const country = normalizeCountryCode(
    readHeader(headers, [
      'x-vercel-ip-country',
      'cf-ipcountry',
      'cloudfront-viewer-country',
      'x-appengine-country',
      'x-country-code',
    ])
  );
  const countryName = normalizeLocationValue(
    readHeader(headers, ['x-vercel-ip-country-name', 'x-country-name'])
  );
  const region = normalizeLocationValue(
    readHeader(headers, [
      'x-vercel-ip-country-region',
      'cloudfront-viewer-country-region',
      'x-appengine-region',
      'x-region',
      'x-state',
    ])
  );
  const city = normalizeLocationValue(readHeader(headers, ['x-vercel-ip-city', 'x-appengine-city', 'x-city']));
  const timezone = normalizeLocationValue(
    readHeader(headers, ['cf-timezone', 'x-vercel-ip-timezone', 'x-timezone'])
  );

  return {
    country,
    countryName,
    region,
    city,
    timezone,
    hasSignal: Boolean(country || countryName || region || city || timezone),
  };
}

function isPrivateIpv4(ip) {
  const parts = ip.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false;

  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    parts[0] === 0 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168)
  );
}

function isPrivateIpv6(ip) {
  const normalized = ip.toLowerCase();
  return (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe80:')
  );
}

function isPublicIp(ip) {
  const version = net.isIP(ip);
  if (version === 4) return !isPrivateIpv4(ip);
  if (version === 6) return !isPrivateIpv6(ip);
  return false;
}

function formatLookupError(error, timeoutMs) {
  if (error?.name === 'AbortError') {
    return timeoutMs ? `timeout after ${timeoutMs}ms` : 'timeout';
  }

  const code = error?.cause?.code || error?.code || error?.errno;
  const message = error?.cause?.message || error?.message || 'unknown error';
  return code ? `${code} ${message}` : message;
}

function toNumberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

async function openMaxMindReader(kind, envName, defaultFileName) {
  const dbPath = resolveDataPath(envName, defaultFileName);

  try {
    return await Reader.open(dbPath);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`MaxMind ${kind} database unavailable at ${dbPath}: ${formatLookupError(error)}`);
    return null;
  }
}

async function getCityReader() {
  if (cityReaderPromise === undefined) {
    cityReaderPromise = openMaxMindReader('city', 'MAXMIND_CITY_DB_PATH', 'GeoLite2-City.mmdb');
  }

  return cityReaderPromise;
}

async function getAsnReader() {
  if (asnReaderPromise === undefined) {
    asnReaderPromise = openMaxMindReader('asn', 'MAXMIND_ASN_DB_PATH', 'GeoLite2-ASN.mmdb');
  }

  return asnReaderPromise;
}

async function lookupMaxMind(ip) {
  const [cityReader, asnReader] = await Promise.all([getCityReader(), getAsnReader()]);
  if (!cityReader || !asnReader) {
    return { intel: null, success: false };
  }

  let cityRecord = null;
  let asnRecord = null;

  try {
    cityRecord = cityReader.city(ip);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`MaxMind city lookup failed: ${formatLookupError(error)}`);
  }

  try {
    asnRecord = asnReader.asn(ip);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`MaxMind ASN lookup failed: ${formatLookupError(error)}`);
  }

  const primarySubdivision = cityRecord?.subdivisions?.[0] || cityRecord?.mostSpecificSubdivision;
  const intel = {
    countryCode: normalizeCountryCode(cityRecord?.country?.isoCode),
    country: normalizeLocationValue(cityRecord?.country?.names?.en),
    region: normalizeLocationValue(primarySubdivision?.names?.en),
    city: normalizeLocationValue(cityRecord?.city?.names?.en),
    latitude: toNumberOrNull(cityRecord?.location?.latitude),
    longitude: toNumberOrNull(cityRecord?.location?.longitude),
    timezone: normalizeLocationValue(cityRecord?.location?.timeZone),
    isp: normalizeLocationValue(asnRecord?.autonomousSystemOrganization),
    asn: asnRecord?.autonomousSystemNumber ? `AS${asnRecord.autonomousSystemNumber}` : null,
  };

  return {
    intel,
    success: Boolean(cityRecord && asnRecord),
  };
}

async function fetchJsonWithRetry(url, { timeoutMs, attempts, serviceName }) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      const payload = await response.json().catch(() => ({}));
      const invalidApiKey = String(payload?.message || '').toLowerCase().includes('invalid api');
      if (!response.ok || payload?.success === false || invalidApiKey) {
        throw new Error(payload?.message || payload?.error || `HTTP ${response.status}`);
      }

      return { payload, success: true };
    } catch (error) {
      lastError = error;

      if (attempt < attempts) {
        await sleep(200 * 2 ** (attempt - 1));
        continue;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  // eslint-disable-next-line no-console
  console.error(`${serviceName} lookup failed: ${formatLookupError(lastError, timeoutMs)}`);
  return { payload: null, success: false };
}

function parseIpQualityScorePayload(payload) {
  return {
    countryCode: normalizeCountryCode(payload?.country_code || payload?.countryCode),
    country: normalizeLocationValue(payload?.country),
    region: normalizeLocationValue(payload?.region),
    city: normalizeLocationValue(payload?.city),
    latitude: toNumberOrNull(payload?.latitude),
    longitude: toNumberOrNull(payload?.longitude),
    timezone: normalizeLocationValue(payload?.timezone),
    isp: normalizeLocationValue(payload?.ISP || payload?.isp || payload?.organization),
    asn: normalizeLocationValue(payload?.ASN || payload?.asn),
    vpn: Boolean(payload?.vpn || payload?.active_vpn),
    proxy: Boolean(payload?.proxy),
    tor: Boolean(payload?.tor || payload?.active_tor),
    fraudScore: toNumberOrNull(payload?.fraud_score ?? payload?.fraudScore),
    hosting: Boolean(payload?.hosting),
    datacenter: Boolean(payload?.datacenter || payload?.hosting),
    mobile: Boolean(payload?.mobile),
    connectionType: normalizeLocationValue(payload?.connection_type || payload?.connectionType),
  };
}

async function fetchIpQualityScoreIntel(ip) {
  const apiKey = getIpQualityScoreApiKey();
  if (!apiKey) {
    if (!missingIpqsApiKeyLogged) {
      // eslint-disable-next-line no-console
      console.error('IPQualityScore API key missing; IP risk lookup will remain neutral.');
      missingIpqsApiKeyLogged = true;
    }

    return { intel: null, success: false };
  }

  const baseUrl = getIpQualityScoreBaseUrl().replace(/\/$/, '');
  const url = new URL(`${baseUrl}/${encodeURIComponent(apiKey)}/${encodeURIComponent(ip)}`);
  url.searchParams.set('strictness', String(getIpQualityScoreStrictness()));
  url.searchParams.set('allow_public_access_points', 'true');
  url.searchParams.set('fast', 'true');

  const result = await fetchJsonWithRetry(url.toString(), {
    timeoutMs: getIpQualityScoreTimeoutMs(),
    attempts: getIpQualityScoreAttempts(),
    serviceName: 'IPQualityScore',
  });

  if (!result.success) {
    return { intel: null, success: false };
  }

  return {
    intel: parseIpQualityScorePayload(result.payload),
    success: true,
  };
}

function inferNetworkType({ ipQualityScore, maxMind }) {
  if (ipQualityScore?.tor) return 'TOR';
  if (ipQualityScore?.vpn || ipQualityScore?.proxy) return 'VPN';
  if (ipQualityScore?.datacenter || ipQualityScore?.hosting) return 'DATACENTER';

  const connectionType = String(ipQualityScore?.connectionType || '').trim().toLowerCase();
  if (ipQualityScore?.mobile || connectionType.includes('mobile') || connectionType.includes('cellular')) {
    return 'MOBILE';
  }
  if (
    connectionType.includes('business') ||
    connectionType.includes('corporate') ||
    connectionType.includes('enterprise') ||
    connectionType.includes('commercial')
  ) {
    return 'BUSINESS';
  }
  if (
    connectionType.includes('residential') ||
    connectionType.includes('consumer') ||
    connectionType.includes('broadband') ||
    connectionType.includes('dsl') ||
    connectionType.includes('fiber')
  ) {
    return 'RESIDENTIAL';
  }

  const providerDetails = `${ipQualityScore?.isp || ''} ${maxMind?.isp || ''}`.toLowerCase();
  if (/business|corporate|enterprise|commercial/.test(providerDetails)) return 'BUSINESS';
  if (/mobile|wireless|telecom|cellular/.test(providerDetails)) return 'MOBILE';
  if (
    /datacenter|data center|hosting|cloud|colo|digitalocean|linode|vultr|hetzner|ovh|aws|amazon|google cloud|gcp|azure|oracle cloud|cloudflare/.test(
      providerDetails
    )
  ) {
    return 'DATACENTER';
  }

  return 'RESIDENTIAL';
}

function deriveRiskLevel({ lookupFailed, networkType, fraudScore }) {
  if (lookupFailed) return 'UNKNOWN';
  if (networkType === 'TOR') return 'HIGH';
  if (networkType === 'VPN') return fraudScore !== null && fraudScore >= 80 ? 'HIGH' : 'MEDIUM';
  if (networkType === 'DATACENTER') return fraudScore !== null && fraudScore >= 80 ? 'HIGH' : 'MEDIUM';
  if (fraudScore !== null && fraudScore >= 85) return 'HIGH';
  if (fraudScore !== null && fraudScore >= 70) return 'MEDIUM';
  return 'LOW';
}

async function analyzeIp(ip) {
  const normalizedIp = normalizeClientIp(ip);
  if (!normalizedIp || !isPublicIp(normalizedIp)) {
    return {
      country: null,
      countryCode: null,
      region: null,
      city: null,
      latitude: null,
      longitude: null,
      timezone: null,
      isp: null,
      asn: null,
      vpn: false,
      proxy: false,
      tor: false,
      fraudScore: null,
      hosting: false,
      datacenter: false,
      mobile: false,
      connectionType: null,
      networkType: 'UNKNOWN',
      riskLevel: 'UNKNOWN',
      lookupFailed: false,
      suspiciousNetwork: false,
      locationSource: 'unknown',
    };
  }

  const [maxMindResult, ipQualityScoreResult] = await Promise.all([
    lookupMaxMind(normalizedIp),
    fetchIpQualityScoreIntel(normalizedIp),
  ]);

  const maxMind = maxMindResult.intel || {};
  const ipQualityScore = ipQualityScoreResult.intel || {};
  const lookupFailed = !maxMindResult.success || !ipQualityScoreResult.success;
  const countryCode = maxMind.countryCode || ipQualityScore.countryCode || null;
  const country = resolveCountryName(countryCode, maxMind.country || ipQualityScore.country || null);
  const networkType = inferNetworkType({ ipQualityScore, maxMind });
  const fraudScore = toNumberOrNull(ipQualityScore.fraudScore);

  return {
    country,
    countryCode,
    region: maxMind.region || ipQualityScore.region || null,
    city: maxMind.city || ipQualityScore.city || null,
    latitude: maxMind.latitude ?? ipQualityScore.latitude ?? null,
    longitude: maxMind.longitude ?? ipQualityScore.longitude ?? null,
    timezone: maxMind.timezone || ipQualityScore.timezone || null,
    isp: maxMind.isp || ipQualityScore.isp || null,
    asn: maxMind.asn || ipQualityScore.asn || null,
    vpn: Boolean(ipQualityScore.vpn),
    proxy: Boolean(ipQualityScore.proxy),
    tor: Boolean(ipQualityScore.tor),
    fraudScore,
    hosting: Boolean(ipQualityScore.hosting),
    datacenter: Boolean(ipQualityScore.datacenter),
    mobile: Boolean(ipQualityScore.mobile),
    connectionType: ipQualityScore.connectionType || null,
    networkType,
    riskLevel: deriveRiskLevel({ lookupFailed, networkType, fraudScore }),
    lookupFailed,
    suspiciousNetwork: Boolean(
      ipQualityScore.vpn ||
        ipQualityScore.proxy ||
        ipQualityScore.tor ||
        ipQualityScore.hosting ||
        ipQualityScore.datacenter
    ),
    locationSource: maxMindResult.success ? 'maxmind' : ipQualityScore.countryCode ? 'ipqs' : 'unknown',
  };
}

function buildLocationSource(headerLocation, analysis) {
  if (headerLocation.hasSignal) {
    return analysis.lookupFailed ? 'header+lookup_unavailable' : 'header+maxmind';
  }

  if (analysis.lookupFailed) return 'lookup_unavailable';
  return analysis.locationSource || 'maxmind';
}

function buildIpMeta({ ipHash, headerLocation, analysis, isPublicIpValue, lookupFailed, locationSource }) {
  const countryCode = headerLocation.country || analysis?.countryCode || null;
  const countryName = resolveCountryName(countryCode, headerLocation.countryName || analysis?.country || null);
  const region = headerLocation.region || analysis?.region || null;

  return {
    ipHash,
    ipCountry: countryCode,
    ipCountryName: countryName,
    ipRegion: region,
    ipState: region,
    ipCity: headerLocation.city || analysis?.city || null,
    ipTimezone: headerLocation.timezone || analysis?.timezone || null,
    ipLatitude: analysis?.latitude ?? null,
    ipLongitude: analysis?.longitude ?? null,
    ipIsp: analysis?.isp || null,
    ipAsn: analysis?.asn || null,
    ipRiskLevel: analysis?.riskLevel || 'UNKNOWN',
    isPublicIp: isPublicIpValue,
    lookupFailed,
    locationSource,
    networkType: analysis?.networkType || 'UNKNOWN',
    vpn: Boolean(analysis?.vpn),
    proxy: Boolean(analysis?.proxy),
    tor: Boolean(analysis?.tor),
    fraudScore: toNumberOrNull(analysis?.fraudScore),
    hosting: Boolean(analysis?.hosting),
    datacenter: Boolean(analysis?.datacenter),
    mobile: Boolean(analysis?.mobile),
    suspiciousNetwork: Boolean(analysis?.suspiciousNetwork),
    connectionType: analysis?.connectionType || null,
  };
}

function toLocationSnapshot(meta) {
  if (!meta) return undefined;

  return {
    ipHash: meta.ipHash,
    countryCode: meta.ipCountry,
    country: meta.ipCountryName,
    state: meta.ipState || meta.ipRegion,
    city: meta.ipCity,
    timezone: meta.ipTimezone,
    riskLevel: meta.ipRiskLevel || 'UNKNOWN',
    source: meta.locationSource || 'unknown',
    isPublicIp: Boolean(meta.isPublicIp),
    lookupFailed: Boolean(meta.lookupFailed),
    capturedAt: new Date(),
  };
}

async function inspectClientIp(rawIp, options = {}) {
  const ip = normalizeClientIp(rawIp);
  const ipHash = ip ? sha256Hex(ip) : undefined;
  const headerLocation = extractLocationHeaders(options.headers || {});

  if (!ip) {
    return buildIpMeta({
      ipHash,
      headerLocation,
      analysis: null,
      isPublicIpValue: false,
      lookupFailed: false,
      locationSource: headerLocation.hasSignal ? 'header' : 'unknown',
    });
  }

  if (!isPublicIp(ip)) {
    return buildIpMeta({
      ipHash,
      headerLocation,
      analysis: null,
      isPublicIpValue: false,
      lookupFailed: false,
      locationSource: headerLocation.hasSignal ? 'header' : 'private',
    });
  }

  const analysis = await analyzeIp(ip);

  return buildIpMeta({
    ipHash,
    headerLocation,
    analysis,
    isPublicIpValue: true,
    lookupFailed: Boolean(analysis.lookupFailed),
    locationSource: buildLocationSource(headerLocation, analysis),
  });
}

module.exports = {
  analyzeIp,
  extractClientIp,
  inspectClientIp,
  toLocationSnapshot,
};