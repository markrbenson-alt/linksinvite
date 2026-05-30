// ============================================================
// LinksInvite API Service
// All backend calls go through here — swap BASE_URL in .env
// ============================================================

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Session token stored in memory (set after magic link verify)
let _sessionToken = null

export function setSessionToken(token) {
  _sessionToken = token
  if (token) {
    localStorage.setItem('li_token', token)
  } else {
    localStorage.removeItem('li_token')
  }
}

export function getSessionToken() {
  if (_sessionToken) return _sessionToken
  // Restore from localStorage on page refresh
  const stored = localStorage.getItem('li_token')
  if (stored) { _sessionToken = stored }
  return _sessionToken
}

export function clearSession() {
  _sessionToken = null
  localStorage.removeItem('li_token')
}

// ─── Core fetch wrapper ──────────────────────────────────────

async function apiFetch(path, options = {}) {
  const token = getSessionToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'x-auth-token': token } : {}),
    ...(options.headers || {})
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }

  return res.json()
}

// ============================================================
// AUTH
// ============================================================

/**
 * Request a magic link email
 * @param {string} email
 */
export async function requestMagicLink(email) {
  return apiFetch('/auth/magic-link', {
    method: 'POST',
    body: JSON.stringify({ email })
  })
}

/**
 * Verify magic link token (from URL query param)
 * Returns { player, session_token }
 */
export async function verifyToken(token) {
  const data = await apiFetch(`/auth/verify?token=${token}`)
  if (data.session_token) {
    setSessionToken(data.session_token)
  }
  return data
}

// ============================================================
// ROSTER
// ============================================================

/**
 * Get current week roster + weather
 * Returns { week, saturday, sunday }
 * saturday/sunday: { confirmed[], waitlist[], spots_remaining, is_full, is_locked }
 */
export async function getCurrentWeek() {
  return apiFetch('/roster/week/current')
}

/**
 * Sign up for one or both days
 * @param {string} week_id
 * @param {boolean} saturday
 * @param {boolean} sunday
 */
export async function signup(week_id, saturday, sunday) {
  return apiFetch('/roster/signup', {
    method: 'POST',
    body: JSON.stringify({ week_id, saturday, sunday })
  })
}

/**
 * Cancel for a day
 * @param {string} week_id
 * @param {'saturday'|'sunday'} day
 */
export async function cancel(week_id, day) {
  return apiFetch('/roster/cancel', {
    method: 'POST',
    body: JSON.stringify({ week_id, day })
  })
}

/**
 * Claim a waitlist spot (from waitlist notification email)
 * @param {string} week_id
 * @param {'saturday'|'sunday'} day
 */
export async function claimSpot(week_id, day) {
  return apiFetch('/roster/claim', {
    method: 'POST',
    body: JSON.stringify({ week_id, day })
  })
}

// ============================================================
// WEATHER (via backend proxy → Open-Meteo)
// ============================================================

/**
 * Fetch weather for the current week
 * Backend returns { saturday: {...}, sunday: {...} }
 * Transformed to match the shape App.jsx weatherData.days[] expects
 */
export async function fetchWeather() {
  const { week } = await getCurrentWeek()
  if (!week) throw new Error('No active week')

  // Transform backend weather fields → App.jsx weatherData shape
  const playability = (rain) => {
    if (rain === null) return 'Unknown'
    if (rain <= 10) return 'Perfect'
    if (rain <= 30) return 'Excellent'
    if (rain <= 50) return 'Good'
    if (rain <= 70) return 'Fair'
    return 'Poor'
  }

  const condition = (rain) => {
    if (rain === null) return 'Checking...'
    if (rain <= 10) return 'Sunny & Clear'
    if (rain <= 30) return 'Partly Cloudy'
    if (rain <= 50) return 'Mostly Cloudy'
    if (rain <= 70) return 'Chance of Rain'
    return 'Rainy'
  }

  const fmt = (low, high) =>
    low !== null && high !== null ? `${high}°F / ${low}°F` : 'N/A'

  const satRain = week.saturday_rain_pct
  const sunRain = week.sunday_rain_pct

  // Sunday date = Saturday + 1
  const sunDate = new Date(week.week_of + 'T12:00:00')
  sunDate.setDate(sunDate.getDate() + 1)
  const monDate = new Date(sunDate)
  monDate.setDate(monDate.getDate() + 1)

  return {
    courseName: 'Newnan Country Club',
    location: 'Newnan, GA',
    days: [
      {
        dayName: 'Saturday',
        temp: fmt(week.saturday_low_temp, week.saturday_high_temp),
        condition: condition(satRain),
        rainChance: satRain !== null ? `${satRain}%` : 'N/A',
        playability: playability(satRain)
      },
      {
        dayName: 'Sunday',
        temp: fmt(week.sunday_low_temp, week.sunday_high_temp),
        condition: condition(sunRain),
        rainChance: sunRain !== null ? `${sunRain}%` : 'N/A',
        playability: playability(sunRain)
      },
      {
        dayName: 'Monday',
        temp: 'N/A',
        condition: 'Next Week',
        rainChance: 'N/A',
        playability: 'TBD'
      }
    ],
    overallAdvice: satRain !== null
      ? satRain <= 30
        ? `Great conditions on Saturday (${satRain}% rain). ${sunRain <= 30 ? 'Sunday looks good too!' : 'Sunday may be wetter.'}`
        : `Watch the forecast — ${satRain}% chance of rain Saturday. ${sunRain < satRain ? 'Sunday looks better.' : 'Plan accordingly.'}`
      : 'Weather forecast loading...'
  }
}

// ============================================================
// ADMIN
// ============================================================

/**
 * Get all players (admin only)
 */
export async function getPlayers() {
  return apiFetch('/admin/players')
}

/**
 * Add a new player (admin only)
 */
export async function addPlayer({ name, email, phone, handicap_index }) {
  return apiFetch('/admin/players', {
    method: 'POST',
    body: JSON.stringify({ name, email, phone, handicap_index })
  })
}

/**
 * Update a player (admin only)
 */
export async function updatePlayer(id, fields) {
  return apiFetch(`/admin/players/${id}`, {
    method: 'PUT',
    body: JSON.stringify(fields)
  })
}

/**
 * Deactivate a player (admin only)
 */
export async function deactivatePlayer(id) {
  return apiFetch(`/admin/players/${id}`, {
    method: 'DELETE'
  })
}

/**
 * Get full roster with non-respondents (admin only)
 */
export async function getAdminRoster(week_id) {
  return apiFetch(`/admin/roster/${week_id}`)
}

/**
 * Lock signups for a day (admin only)
 * @param {string} week_id
 * @param {'saturday'|'sunday'|'both'} day
 */
export async function lockSignups(week_id, day) {
  return apiFetch(`/admin/weeks/${week_id}/lock`, {
    method: 'POST',
    body: JSON.stringify({ day })
  })
}

/**
 * Refresh weather for current week (admin only)
 */
export async function refreshWeather(week_id) {
  return apiFetch(`/admin/weeks/${week_id}/refresh-weather`, {
    method: 'POST'
  })
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Transform backend roster data → App.jsx golfers[] shape
 * Used to populate the player list from real Supabase data
 */
export function rosterToGolfers(rosterData, currentPlayerId) {
  const { saturday, sunday } = rosterData

  // Merge sat+sun into a unified player list with status
  const playerMap = {}

  const addPlayer = (p, satStatus, sunStatus) => {
    if (!playerMap[p.id]) {
      playerMap[p.id] = {
        id: p.id,
        name: p.name,
        email: p.email || '',
        phone: p.phone || '',
        handicap: p.handicap_index || 0,
        ghin: p.ghin || '',
        assignedTeeTime: null,
        saturdayStatus: satStatus,
        sundayStatus: sunStatus,
        isCurrentPlayer: p.id === currentPlayerId
      }
    }
  }

  saturday.confirmed.forEach(p => addPlayer(p, 'confirmed', playerMap[p.id]?.sundayStatus || 'out'))
  saturday.waitlist.forEach(p => addPlayer(p, 'waitlist', playerMap[p.id]?.sundayStatus || 'out'))
  sunday.confirmed.forEach(p => addPlayer(p, playerMap[p.id]?.saturdayStatus || 'out', 'confirmed'))
  sunday.waitlist.forEach(p => addPlayer(p, playerMap[p.id]?.saturdayStatus || 'out', 'waitlist'))

  // Derive a single "status" for App.jsx compatibility
  return Object.values(playerMap).map(p => ({
    ...p,
    status: p.saturdayStatus === 'confirmed' || p.sundayStatus === 'confirmed'
      ? 'Registered'
      : p.saturdayStatus === 'waitlist' || p.sundayStatus === 'waitlist'
      ? 'Waitlisted'
      : 'Invited'
  }))
}
