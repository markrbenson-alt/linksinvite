import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  Clock, 
  Users, 
  Settings, 
  Plus, 
  Trash2, 
  Bell, 
  CheckCircle, 
  AlertTriangle, 
  CloudSun, 
  Mail, 
  MessageSquare, 
  MapPin, 
  RefreshCw,
  Sun,
  CloudRain,
  HelpCircle,
  UserCheck,
  UserX,
  TrendingUp,
  Award,
  BookOpen,
  Shuffle,
  CalendarCheck,
  CalendarClock,
  Sliders,
  ChevronRight,
  ShieldAlert,
  Lock,
  Unlock,
  XCircle,
  Power,
  LogIn,
  LogOut,
  Loader2
} from 'lucide-react';

import {
  requestMagicLink,
  verifyToken,
  getCurrentWeek,
  signup,
  cancel,
  fetchWeather,
  getPlayers,
  addPlayer,
  updatePlayer,
  deactivatePlayer,
  getAdminRoster,
  lockSignups,
  refreshWeather,
  rosterToGolfers,
  getSessionToken,
  clearSession
} from './api.js';

const DEFAULT_COURSE = 'Newnan Country Club, Newnan, GA';

export default function App() {
  // â”€â”€â”€ Auth State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [currentPlayer, setCurrentPlayer] = useState(null); // { id, name, email, is_admin }
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authSent, setAuthSent] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // â”€â”€â”€ Week & Roster State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [weekData, setWeekData] = useState(null);        // full API response
  const [currentWeek, setCurrentWeek] = useState(null);  // week object
  const [golfers, setGolfers] = useState([]);             // transformed for UI
  const [waitlist, setWaitlist] = useState([]);           // waitlisted IDs
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState(null);

  // â”€â”€â”€ Game Config (derived from week) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [course] = useState(DEFAULT_COURSE);
  const [gameDate, setGameDate] = useState('');
  const [isGameCancelled, setIsGameCancelled] = useState(false);
  const [useBalancedFoursomes, setUseBalancedFoursomes] = useState(true);
  const [useTeeTimeAssignment, setUseTeeTimeAssignment] = useState(true);
  const [localRules, setLocalRules] = useState('Winter rules apply. Roll scorecard length in fairways. Maximum score of double par on any hole to keep pace of play moving.');

  // Saturday is fixed at 4 tee times, 8:50am, 10min intervals
  const SAT_TEE_TIMES = ['08:50', '09:00', '09:10', '09:20'];
  const SUN_TEE_TIMES = ['11:30', '11:40', '11:50'];
  const [activeDayTab, setActiveDayTab] = useState('saturday'); // 'saturday' | 'sunday'

  // â”€â”€â”€ Weather State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [weatherData, setWeatherData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(null);

  // â”€â”€â”€ Admin Panel State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [adminRoster, setAdminRoster] = useState(null);
  const [newGolferName, setNewGolferName] = useState('');
  const [newGolferEmail, setNewGolferEmail] = useState('');
  const [newGolferPhone, setNewGolferPhone] = useState('');
  const [newGolferHcp, setNewGolferHcp] = useState('10');
  const [newGolferGhin, setNewGolferGhin] = useState('');

  // â”€â”€â”€ UI State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [activeTab, setActiveTab] = useState('board');
  const [selectedSimPlayerId, setSelectedSimPlayerId] = useState(null);
  const [notifications, setNotifications] = useState([{
    id: 'init',
    type: 'System',
    timestamp: new Date().toLocaleTimeString(),
    text: 'LinksInvite initialized. Welcome to Newnan Country Club!',
    target: 'All Invitees'
  }]);
  const [showAdminAlert, setShowAdminAlert] = useState(false);

  // â”€â”€â”€ On Mount: check for magic link token in URL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      handleVerifyToken(token);
      // Clean token from URL without reload
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    // Restore session from localStorage
    const stored = getSessionToken();
    if (stored) {
      verifyToken(stored)
        .then(data => {
          setCurrentPlayer(data.player);
          setIsLoggedIn(true);
        })
        .catch(() => {
          clearSession();
        });
    }
  }, []);

  // â”€â”€â”€ Load roster on mount and after auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    loadRoster();
    loadWeather();
  }, []);

  // â”€â”€â”€ Auto-refresh roster every 60 seconds â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const interval = setInterval(loadRoster, 60000);
    return () => clearInterval(interval);
  }, []);

  // â”€â”€â”€ Auth Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleVerifyToken = async (token) => {
    try {
      setAuthLoading(true);
      const data = await verifyToken(token);
      setCurrentPlayer(data.player);
      setIsLoggedIn(true);
      addNotificationLog('Admin Setup', `ðŸ”‘ Signed in as ${data.player.name}.`, 'Self');
      // Reload roster to get player-specific data
      await loadRoster();
    } catch (err) {
      setAuthError('Sign-in link expired or already used. Request a new one.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRequestMagicLink = async (e) => {
    e.preventDefault();
    if (!authEmail.trim()) return;
    setAuthLoading(true);
    setAuthError('');
    try {
      await requestMagicLink(authEmail.trim());
      setAuthSent(true);
      addNotificationLog('Auth', `Magic link sent to ${authEmail}`, 'Self');
    } catch (err) {
      setAuthError('Could not send link. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = () => {
    clearSession();
    setCurrentPlayer(null);
    setIsLoggedIn(false);
    setAuthEmail('');
    setAuthSent(false);
    addNotificationLog('System', 'Signed out.', 'Self');
  };

  // â”€â”€â”€ Load Roster from API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const loadRoster = useCallback(async () => {
    setRosterLoading(true);
    setRosterError(null);
    try {
      const data = await getCurrentWeek();
      setWeekData(data);
      setCurrentWeek(data.week);
      setGameDate(data.week.week_of);

      // Transform to golfer shape the UI expects
      const transformed = rosterToGolfers(data, currentPlayer?.id);
      setGolfers(transformed);

      // Populate waitlist IDs from Saturday waitlist
      const waitIds = data.saturday.waitlist.map(p => p.id);
      setWaitlist(waitIds);

      // Update sim player if not set
      if (!selectedSimPlayerId && transformed.length > 0) {
        setSelectedSimPlayerId(transformed[0].id);
      }
    } catch (err) {
      setRosterError(err.message);
      console.error('Roster load failed:', err);
    } finally {
      setRosterLoading(false);
    }
  }, [currentPlayer?.id, selectedSimPlayerId]);

  // â”€â”€â”€ Load Weather â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const loadWeather = async () => {
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const data = await fetchWeather();
      setWeatherData(data);
    } catch (err) {
      setWeatherError(err.message);
      // Fallback weather display
      setWeatherData({
        courseName: 'Newnan Country Club',
        location: 'Newnan, GA',
        days: [
          { dayName: 'Saturday', temp: 'N/A', condition: 'Unavailable', rainChance: 'N/A', playability: 'Unknown' },
          { dayName: 'Sunday', temp: 'N/A', condition: 'Unavailable', rainChance: 'N/A', playability: 'Unknown' },
          { dayName: 'Monday', temp: 'N/A', condition: 'Unavailable', rainChance: 'N/A', playability: 'Unknown' },
        ],
        overallAdvice: 'Weather data temporarily unavailable. Check back shortly.'
      });
    } finally {
      setWeatherLoading(false);
    }
  };

  // Legacy hook for the weather refresh button in UI
  const fetchLiveWeather = async () => { await loadWeather(); };

  // â”€â”€â”€ Registration Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleRegister = async (golferId, forDay = activeDayTab) => {
    if (!isLoggedIn) {
      logSystemAlert('Sign in to register for a game.');
      return;
    }
    if (!currentWeek) return;

    // Only allow players to register themselves (unless admin)
    if (golferId !== currentPlayer?.id && !currentPlayer?.is_admin) {
      logSystemAlert('You can only register yourself.');
      return;
    }

    const isSat = forDay === 'saturday';
    const isLocked = isSat ? currentWeek.saturday_locked : currentWeek.sunday_locked;
    if (isLocked) {
      logSystemAlert(`${forDay} signups are currently locked.`);
      return;
    }

    try {
      const result = await signup(
        currentWeek.id,
        forDay === 'saturday',
        forDay === 'sunday'
      );
      const golfer = golfers.find(g => g.id === golferId);
      const status = isSat ? result.saturday_status : result.sunday_status;
      const msg = status === 'confirmed'
        ? `â›³ ${golfer?.name || 'Player'} confirmed for ${forDay}!`
        : `ðŸš¨ ${golfer?.name || 'Player'} added to ${forDay} waitlist.`;
      addNotificationLog(status === 'confirmed' ? 'Registration' : 'Waitlisted', msg, 'All Group');
      await loadRoster();
    } catch (err) {
      logSystemAlert(`Registration failed: ${err.message}`);
    }
  };

  const handleUnregister = async (golferId, forDay = activeDayTab) => {
    if (!isLoggedIn) return;
    if (golferId !== currentPlayer?.id && !currentPlayer?.is_admin) return;
    if (!currentWeek) return;

    try {
      await cancel(currentWeek.id, forDay);
      const golfer = golfers.find(g => g.id === golferId);
      addNotificationLog('Unregister', `${golfer?.name || 'Player'} withdrew from ${forDay}.`, 'All Group');
      await loadRoster();
    } catch (err) {
      logSystemAlert(`Cancellation failed: ${err.message}`);
    }
  };

  // â”€â”€â”€ Admin Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleAddNewGolfer = async (e) => {
    e.preventDefault();
    if (!newGolferName.trim()) return;
    try {
      await addPlayer({
        name: newGolferName,
        email: newGolferEmail,
        phone: newGolferPhone,
        handicap_index: Number(newGolferHcp) || 10
      });
      addNotificationLog('Admin Action', `Added ${newGolferName} to player list.`, 'All Group');
      setNewGolferName(''); setNewGolferEmail(''); setNewGolferPhone('');
      setNewGolferHcp('10'); setNewGolferGhin('');
      await loadRoster();
    } catch (err) {
      logSystemAlert(`Add player failed: ${err.message}`);
    }
  };

  const handleRemoveGolfer = async (playerId) => {
    try {
      await deactivatePlayer(playerId);
      const g = golfers.find(p => p.id === playerId);
      addNotificationLog('Admin Action', `Removed ${g?.name || 'player'} from roster.`, 'All Group');
      await loadRoster();
    } catch (err) {
      logSystemAlert(`Remove failed: ${err.message}`);
    }
  };

  const handleLockDay = async (day) => {
    if (!currentWeek) return;
    try {
      await lockSignups(currentWeek.id, day);
      addNotificationLog('Admin Action', `${day} signups locked.`, 'All Group');
      await loadRoster();
    } catch (err) {
      logSystemAlert(`Lock failed: ${err.message}`);
    }
  };

  const handleRefreshWeather = async () => {
    if (!currentWeek) return;
    try {
      await refreshWeather(currentWeek.id);
      await loadWeather();
      addNotificationLog('System', 'Weather refreshed.', 'All Group');
    } catch (err) {
      logSystemAlert('Weather refresh failed.');
    }
  };

  const handleCancelGame = () => {
    setIsGameCancelled(true);
    addNotificationLog('Cancellation Alert', `ðŸš¨ GAME CANCELLED: ${course.split(',')[0]} for ${gameDate} cancelled by admin.`, 'All Group');
  };

  const handleRestoreGame = () => {
    setIsGameCancelled(false);
    addNotificationLog('System Alert', `ðŸ’š GAME RESTORED: ${course.split(',')[0]} for ${gameDate} reactivated.`, 'All Group');
  };

  // â”€â”€â”€ Tee Sheet Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const getTeeTimesList = (day = activeDayTab) => {
    const times = day === 'saturday' ? SAT_TEE_TIMES : SUN_TEE_TIMES;
    const confirmedPlayers = day === 'saturday'
      ? weekData?.saturday?.confirmed || []
      : weekData?.sunday?.confirmed || [];

    return times.map((time, i) => ({
      time,
      slots: [0, 1, 2, 3].map(idx => confirmedPlayers[i * 4 + idx] || null)
    }));
  };

  const teeTimesList = getTeeTimesList();
  const activeDayData = activeDayTab === 'saturday' ? weekData?.saturday : weekData?.sunday;
  const totalSlots = activeDayTab === 'saturday' ? (currentWeek?.saturday_max || 16) : (currentWeek?.sunday_max || 12);
  const registeredPlayers = activeDayData?.confirmed || [];
  const availableSlotsCount = activeDayData?.spots_remaining || 0;
  const isLocked = activeDayTab === 'saturday'
    ? (currentWeek?.saturday_locked || isGameCancelled)
    : (currentWeek?.sunday_locked || isGameCancelled);

  const handleArrangeFoursomes = () => {
    // Visual-only: foursomes are assigned at the course (random draw)
    addNotificationLog('Foursome Shuffle', 'ðŸŽ² Groups will be randomly drawn at the course per Newnan CC policy.', 'All Group');
  };

  const getGameRecommendation = () => {
    const count = registeredPlayers.length;
    if (count === 0) return { format: 'Awaiting Players', reason: 'Register golfers to receive a format recommendation.' };
    const avgHcp = registeredPlayers.reduce((sum, g) => sum + Number(g.handicap_index || 0), 0) / count;
    const highHcpCount = registeredPlayers.filter(g => Number(g.handicap_index || 0) >= 15).length;
    if (avgHcp >= 16 || highHcpCount > (count / 2)) {
      return { format: 'Stableford Points Quotas', reason: `High average handicap (${avgHcp.toFixed(1)}). Stableford is forgiving and keeps pace of play moving.` };
    } else if (count >= 8) {
      return { format: '2 Best Ball Full Handicap', reason: `Large field of ${count}. Scoring best 2 net balls encourages teamwork.` };
    }
    return { format: '1 Best Ball Full Handicap', reason: `Smaller field (${count}). Each team counts their single best net score per hole.` };
  };

  const recommendation = getGameRecommendation();

  // â”€â”€â”€ Notification Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const addNotificationLog = (type, text, target) => {
    setNotifications(prev => [{
      id: crypto.randomUUID(), type,
      timestamp: new Date().toLocaleTimeString(),
      text, target,
      weather: weatherData ? `${weatherData.days[0].condition}, ${weatherData.days[0].temp} (${weatherData.days[0].rainChance} Rain)` : 'N/A'
    }, ...prev]);
  };

  const logSystemAlert = (text) => addNotificationLog('System Alert', text, 'Self');

  const formatFriendlyDate = (dateStr) => {
    if (!dateStr) return 'TBD';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const currentSimPlayer = golfers.find(g => g.id === selectedSimPlayerId) || golfers[0];

  // â”€â”€â”€ Derived status badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const getRegistrationStatus = () => {
    if (isGameCancelled) return { status: 'Game Cancelled', color: 'text-rose-400 bg-rose-950/40 border-rose-500/20', isLocked: true };
    if (!currentWeek) return { status: 'Loading...', color: 'text-slate-400 bg-slate-950/40 border-slate-500/20', isLocked: true };
    if (activeDayTab === 'saturday' && currentWeek.saturday_locked) return { status: 'Closed / Locked', color: 'text-rose-400 bg-rose-950/40 border-rose-500/20', isLocked: true };
    if (activeDayTab === 'sunday' && currentWeek.sunday_locked) return { status: 'Closed / Locked', color: 'text-rose-400 bg-rose-950/40 border-rose-500/20', isLocked: true };
    return { status: 'Open', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/20', isLocked: false };
  };

  const currentStatus = getRegistrationStatus();

  // â”€â”€â”€ My signup status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const mySignup = currentPlayer ? golfers.find(g => g.id === currentPlayer.id) : null;
  const mySatStatus = mySignup?.saturdayStatus || 'out';
  const mySunStatus = mySignup?.sundayStatus || 'out';

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // RENDER
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">

      {/* â”€â”€ Header â”€â”€ */}
      <header className="border-b border-slate-800 bg-slate-950/85 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-tr from-emerald-500 to-teal-400 p-2 rounded-xl text-slate-950 shadow-md shadow-emerald-500/10">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400 bg-clip-text text-transparent">LinksInvite</span>
              <span className="text-xs text-slate-400 block -mt-1 font-medium">Weekly Golf Coordinator</span>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-6 text-xs text-slate-300">
            <div className="flex items-center space-x-2 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-850">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Saturday: <strong className="text-white">{weekData?.saturday?.confirmed?.length || 0}/16</strong></span>
            </div>
            <div className="flex items-center space-x-2 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-850">
              <Users className="w-3.5 h-3.5 text-sky-400" />
              <span>Sunday: <strong className="text-white">{weekData?.sunday?.confirmed?.length || 0}/12</strong></span>
            </div>
            <div className="flex items-center space-x-2 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-850">
              <Award className="w-3.5 h-3.5 text-sky-400" />
              <span>Format: <strong className="text-white">{recommendation.format}</strong></span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isLoggedIn && currentPlayer ? (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-300 hidden sm:block">{currentPlayer.name}</span>
                {currentPlayer.is_admin && (
                  <span className="text-[10px] bg-emerald-950 border border-emerald-700 text-emerald-400 px-2 py-0.5 rounded-full font-bold">ADMIN</span>
                )}
                <button onClick={handleSignOut} className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg transition-all" title="Sign out">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setActiveTab('admin')}
                className="text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-400 hover:bg-emerald-900 transition-all flex items-center space-x-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* â”€â”€ Main â”€â”€ */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* Loading overlay */}
        {rosterLoading && !weekData && (
          <div className="flex items-center justify-center py-16 space-x-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
            <span className="text-sm">Loading this week's roster...</span>
          </div>
        )}

        {/* Game Cancelled Banner */}
        {isGameCancelled && (
          <div className="bg-rose-950/70 border border-rose-500 text-rose-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center space-x-4">
              <div className="bg-rose-500 p-3 rounded-full text-slate-950"><XCircle className="w-8 h-8" /></div>
              <div>
                <h3 className="text-lg font-black tracking-wide">WEEKLY GOLF GAME CANCELLED</h3>
                <p className="text-sm text-rose-300">The administrator has cancelled this week's round. Registration is blocked.</p>
              </div>
            </div>
            {isLoggedIn && currentPlayer?.is_admin && (
              <button onClick={handleRestoreGame} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 shrink-0">
                <Power className="w-4 h-4" />
                <span>Re-activate Game</span>
              </button>
            )}
          </div>
        )}

        {/* â”€â”€ My Status Banner (signed-in players) â”€â”€ */}
        {isLoggedIn && currentPlayer && weekData && (
          <div className="bg-slate-950 border border-emerald-500/20 rounded-2xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white">Your Status This Weekend</h3>
                <p className="text-xs text-slate-400 mt-0.5">{formatFriendlyDate(currentWeek?.week_of)}</p>
              </div>
              <div className="flex gap-3">
                {/* Saturday status */}
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">Saturday 8:50 AM</span>
                  {mySatStatus === 'confirmed' ? (
                    <div className="flex items-center space-x-1.5">
                      <span className="bg-emerald-950 border border-emerald-700 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-full">âœ… Confirmed</span>
                      <button onClick={() => handleUnregister(currentPlayer.id, 'saturday')} className="text-rose-400 text-[10px] hover:underline">Cancel</button>
                    </div>
                  ) : mySatStatus === 'waitlist' ? (
                    <span className="bg-amber-950 border border-amber-700 text-amber-400 text-[10px] font-bold px-2.5 py-1 rounded-full animate-pulse">â³ Waitlisted</span>
                  ) : (
                    <button
                      onClick={() => handleRegister(currentPlayer.id, 'saturday')}
                      disabled={currentWeek?.saturday_locked}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-slate-950 font-bold text-[10px] px-3 py-1.5 rounded-full"
                    >
                      {weekData?.saturday?.is_full ? 'Join Waitlist' : '+ Join Saturday'}
                    </button>
                  )}
                </div>

                <div className="border-l border-slate-800" />

                {/* Sunday status */}
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">Sunday 11:30 AM</span>
                  {mySunStatus === 'confirmed' ? (
                    <div className="flex items-center space-x-1.5">
                      <span className="bg-emerald-950 border border-emerald-700 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-full">âœ… Confirmed</span>
                      <button onClick={() => handleUnregister(currentPlayer.id, 'sunday')} className="text-rose-400 text-[10px] hover:underline">Cancel</button>
                    </div>
                  ) : mySunStatus === 'waitlist' ? (
                    <span className="bg-amber-950 border border-amber-700 text-amber-400 text-[10px] font-bold px-2.5 py-1 rounded-full animate-pulse">â³ Waitlisted</span>
                  ) : (
                    <button
                      onClick={() => handleRegister(currentPlayer.id, 'sunday')}
                      disabled={currentWeek?.sunday_locked}
                      className="bg-sky-700 hover:bg-sky-600 disabled:opacity-40 text-white font-bold text-[10px] px-3 py-1.5 rounded-full"
                    >
                      {weekData?.sunday?.is_full ? 'Join Waitlist' : '+ Join Sunday'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* â”€â”€ Top section: Course + Weather + Registration â”€â”€ */}
        {weekData && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Weather Card */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-bold text-sm text-slate-100">{DEFAULT_COURSE.split(',')[0]}</h3>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span>ðŸ“… Saturday: {formatFriendlyDate(currentWeek?.week_of)}</span>
                    <span>â° Tee: <strong>8:50 AM</strong></span>
                    <span>â° Sunday: <strong>11:30 AM</strong></span>
                  </div>
                </div>
                <button
                  onClick={fetchLiveWeather}
                  disabled={weatherLoading}
                  className="flex items-center space-x-1.5 text-xs text-slate-400 bg-slate-950 hover:text-white px-3 py-2 rounded-xl border border-slate-800 hover:border-slate-700 transition-all shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${weatherLoading ? 'animate-spin text-emerald-400' : ''}`} />
                  <span>Sync Weather</span>
                </button>
              </div>

              <div className="mt-4 border-t border-slate-800/85 pt-4">
                {weatherLoading ? (
                  <div className="flex flex-col items-center justify-center py-6 space-y-2">
                    <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                    <span className="text-xs text-slate-400">Syncing live Open-Meteo data...</span>
                  </div>
                ) : weatherData ? (
                  <div>
                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                      {weatherData.days.map((day, idx) => (
                        <div key={idx} className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl flex flex-col items-center text-center">
                          <span className="text-xs font-semibold text-slate-400">{day.dayName}</span>
                          {day.condition.toLowerCase().includes('sun') || day.condition.toLowerCase().includes('clear') ? (
                            <Sun className="w-6 h-6 my-2 text-amber-400" />
                          ) : (
                            <CloudSun className="w-6 h-6 my-2 text-sky-300" />
                          )}
                          <span className="text-xs font-bold text-white">{day.temp}</span>
                          <span className="text-[11px] font-medium text-sky-400 flex items-center space-x-1 mt-1">
                            <CloudRain className="w-3 h-3 shrink-0" />
                            <span>{day.rainChance} Rain</span>
                          </span>
                          <span className="text-[10px] text-slate-400 truncate w-full mt-1">{day.condition}</span>
                          <span className="text-[10px] mt-2 text-emerald-400 bg-emerald-950/50 border border-emerald-900/40 px-1.5 py-0.5 rounded-full font-medium">
                            {day.playability} Play
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-emerald-300 bg-emerald-950/25 border border-emerald-900/30 p-2.5 rounded-xl flex items-start space-x-2">
                      <CloudSun className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Forecast:</strong> {weatherData.overallAdvice}</span>
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-500 text-xs">Weather unavailable. Try syncing.</div>
                )}
              </div>
            </div>

            {/* Registration Status Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <Sliders className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-bold text-sm uppercase tracking-wide text-slate-200">Roster</h3>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${currentStatus.color}`}>
                    {currentStatus.status}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="bg-slate-950 rounded-xl p-3 border border-slate-850 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Saturday</span>
                      <span className="font-bold text-white">{weekData?.saturday?.confirmed?.length || 0} / 16</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(100, ((weekData?.saturday?.confirmed?.length || 0) / 16) * 100)}%` }}
                      />
                    </div>
                    {(weekData?.saturday?.waitlist?.length || 0) > 0 && (
                      <p className="text-amber-400 text-[10px]">+{weekData.saturday.waitlist.length} on waitlist</p>
                    )}
                  </div>

                  <div className="bg-slate-950 rounded-xl p-3 border border-slate-850 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Sunday</span>
                      <span className="font-bold text-white">{weekData?.sunday?.confirmed?.length || 0} / 12</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5">
                      <div
                        className="bg-sky-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(100, ((weekData?.sunday?.confirmed?.length || 0) / 12) * 100)}%` }}
                      />
                    </div>
                    {(weekData?.sunday?.waitlist?.length || 0) > 0 && (
                      <p className="text-amber-400 text-[10px]">+{weekData.sunday.waitlist.length} on waitlist</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                <span>Signups lock <strong className="text-white">Friday 5 PM ET</strong></span>
                <button onClick={loadRoster} className="text-emerald-400 hover:text-emerald-300">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* â”€â”€ Day Toggle â”€â”€ */}
        {weekData && (
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveDayTab('saturday')}
              className={`px-5 py-2 rounded-xl text-xs font-bold border transition-all ${
                activeDayTab === 'saturday'
                  ? 'bg-emerald-950 border-emerald-500 text-emerald-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              â›³ Saturday ({weekData?.saturday?.confirmed?.length || 0}/16)
            </button>
            <button
              onClick={() => setActiveDayTab('sunday')}
              className={`px-5 py-2 rounded-xl text-xs font-bold border transition-all ${
                activeDayTab === 'sunday'
                  ? 'bg-sky-950 border-sky-500 text-sky-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              ðŸŒ¤ï¸ Sunday ({weekData?.sunday?.confirmed?.length || 0}/12)
            </button>
          </div>
        )}

        {/* â”€â”€ Nav Tabs â”€â”€ */}
        <div className="flex border-b border-slate-800 overflow-x-auto whitespace-nowrap scrollbar-none">
          {[
            { id: 'board', label: 'â›³ Tee Sheet & Groupings' },
            { id: 'simulator', label: 'ðŸ“² Email & SMS Invites' },
            { id: 'admin', label: 'ðŸ› ï¸ Admin Panel', icon: isLoggedIn ? <Unlock className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-slate-500" /> },
            { id: 'notifications', label: 'ðŸ’¬ Live Group Logs', badge: notifications.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center space-x-1.5 ${
                activeTab === tab.id ? 'border-emerald-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.icon && tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="bg-slate-800 text-[10px] text-slate-300 px-1.5 py-0.5 rounded-full font-normal">{tab.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {/* TAB 1: Tee Sheet */}
        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {activeTab === 'board' && weekData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">

              {/* Format Recommendation */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-3">
                  <div className="flex items-center space-x-2.5">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h4 className="font-bold text-sm text-slate-100">Live Field Recommendation</h4>
                      <p className="text-xs text-slate-400">Based on registered roster handicaps.</p>
                    </div>
                  </div>
                  <div className="bg-emerald-950/40 border border-emerald-500/20 px-3 py-1 rounded-lg text-emerald-400 text-xs font-extrabold flex items-center space-x-1.5">
                    <Award className="w-3.5 h-3.5" />
                    <span>{recommendation.format}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{recommendation.reason}</p>
              </div>

              {/* Tee Sheet */}
              <div className="space-y-4">
                <h3 className="font-bold text-lg text-white flex items-center space-x-2">
                  <span>{activeDayTab === 'saturday' ? 'Saturday' : 'Sunday'} Tee Sheet</span>
                  <span className="text-xs font-normal text-slate-400">(groups drawn at course)</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {teeTimesList.map((tee, index) => {
                    const assignedPlayers = tee.slots.filter(Boolean);
                    const avgHcp = assignedPlayers.length > 0
                      ? (assignedPlayers.reduce((sum, p) => sum + Number(p.handicap_index || 0), 0) / assignedPlayers.length).toFixed(1)
                      : null;

                    return (
                      <div key={index} className="bg-slate-900 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-5 shadow-lg transition-all">
                        <div className="flex justify-between items-start border-b border-slate-800 pb-3 mb-3">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-emerald-400" />
                            <h4 className="text-lg font-bold text-white">{tee.time}</h4>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            assignedPlayers.length === 4 ? 'bg-rose-950 text-rose-400' : 'bg-emerald-950 text-emerald-400'
                          }`}>
                            {assignedPlayers.length}/4
                          </span>
                        </div>
                        {avgHcp && <p className="text-[10px] text-slate-400 mb-3">Avg HCP: <strong className="text-emerald-400">{avgHcp}</strong></p>}
                        <div className="space-y-2">
                          {tee.slots.map((slot, slotIdx) => (
                            <div
                              key={slotIdx}
                              className={`flex items-center justify-between p-2.5 rounded-lg text-xs ${
                                slot ? 'bg-slate-800/60 border border-slate-700/40' : 'bg-slate-950/40 border border-dashed border-slate-800'
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <span className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 text-[10px] text-slate-400 font-bold">{slotIdx + 1}</span>
                                {slot ? (
                                  <div>
                                    <span className="font-semibold">{slot.name}</span>
                                    <span className="text-[10px] text-slate-400 block -mt-0.5">HCP: {slot.handicap_index || 'N/A'}</span>
                                  </div>
                                ) : (
                                  <span className="italic text-slate-600">Open Slot</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Waitlist Sidebar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-fit space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="font-bold text-sm uppercase tracking-wide text-slate-200 flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Waitlist ({activeDayData?.waitlist?.length || 0})</span>
                </h3>
              </div>

              {(activeDayData?.waitlist?.length || 0) === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  No waitlist. <strong className="text-emerald-400">{availableSlotsCount} spots</strong> remaining.
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-400">Players are promoted automatically when a spot opens (FIFO order).</p>
                  {activeDayData.waitlist.map((player, index) => (
                    <div key={player.id} className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded-md text-[10px]">#{index + 1}</span>
                        <div>
                          <span className="font-semibold text-white">{player.name}</span>
                          <span className="text-[10px] text-slate-400 block">HCP: {player.handicap_index || 'N/A'}</span>
                        </div>
                      </div>
                      {(currentPlayer?.is_admin || player.id === currentPlayer?.id) && (
                        <button
                          onClick={() => handleUnregister(player.id, activeDayTab)}
                          className="text-slate-400 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {/* TAB 2: Email Preview Simulator */}
        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {activeTab === 'simulator' && weekData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-fit space-y-4">
              <h3 className="font-bold text-sm uppercase tracking-wide text-slate-200">Select Recipient</h3>
              <p className="text-xs text-slate-400">Preview the invitation email any player receives.</p>
              <div className="space-y-1 max-h-[350px] overflow-y-auto pr-2">
                {golfers.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedSimPlayerId(g.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs border transition-all ${
                      selectedSimPlayerId === g.id
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-white font-semibold'
                        : 'bg-slate-950/40 border-slate-850 hover:bg-slate-950 text-slate-400'
                    }`}
                  >
                    <div>
                      <span className="block">{g.name}</span>
                      <span className="text-[10px] text-slate-400">HCP: {g.handicap || 'N/A'}</span>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      g.status === 'Registered' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/40'
                      : g.status === 'Waitlisted' ? 'bg-amber-950 text-amber-400 border border-amber-900/40'
                      : 'bg-slate-800 text-slate-300'
                    }`}>{g.status}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Email Preview */}
            <div className="lg:col-span-2 bg-white text-slate-900 rounded-2xl p-6 shadow-xl text-sm">
              <div className="border-b pb-4 mb-4">
                <p className="text-xs text-slate-500">From: <strong>noreply@linksinvite.com</strong></p>
                <p className="text-xs text-slate-500">To: <strong>{currentSimPlayer?.email || 'player@example.com'}</strong></p>
                <p className="text-xs text-slate-500 mt-1">Subject: <strong>â›³ Saturday Golf â€“ {formatFriendlyDate(currentWeek?.week_of)} | {weekData?.saturday?.spots_remaining} spots open</strong></p>
              </div>

              <h2 className="text-green-800 text-lg font-bold border-b-2 border-green-700 pb-2 mb-4">
                Saturday, {formatFriendlyDate(currentWeek?.week_of)}
              </h2>

              <p>We have <strong>4 tee times</strong> this Saturday, starting at <strong>8:50 AM</strong>.</p>

              {weatherData && (
                <div className="bg-slate-100 rounded p-3 my-3 text-sm">
                  ðŸŒ¤ï¸ {weatherData.days[0]?.rainChance} chance of rain Â· Low: {weatherData.days[0]?.temp?.split('/')[1]?.trim()} Â· High: {weatherData.days[0]?.temp?.split('/')[0]?.trim()}
                </div>
              )}

              <p className="mt-3 font-semibold">Playing so far:</p>
              <ol className="mt-2 space-y-1">
                {(weekData?.saturday?.confirmed || []).map((p, i) => (
                  <li key={p.id}>{i + 1}. {p.name}</li>
                ))}
                {(weekData?.saturday?.confirmed || []).length === 0 && (
                  <li className="text-slate-400 italic">Be the first to sign up!</li>
                )}
              </ol>

              <p className="mt-4">
                We have <strong>{weekData?.saturday?.spots_remaining} spots available</strong> for Saturday. First tee time is <strong>8:50 AM</strong>.
              </p>

              <div className="mt-6">
                <a href="#" className="inline-block bg-green-700 text-white font-bold px-6 py-3 rounded-lg no-underline">
                  Count Me In for Saturday â›³
                </a>
              </div>
            </div>
          </div>
        )}

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {/* TAB 3: Admin Panel */}
        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {activeTab === 'admin' && (
          <div className="space-y-6 max-w-4xl mx-auto">

            {/* Sign In */}
            {!isLoggedIn && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md mx-auto space-y-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-emerald-950 p-2.5 rounded-xl border border-emerald-700">
                    <Lock className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Sign In</h3>
                    <p className="text-xs text-slate-400">We'll email you a magic link â€” no password needed.</p>
                  </div>
                </div>

                {!authSent ? (
                  <form onSubmit={handleRequestMagicLink} className="space-y-4">
                    <input
                      type="email"
                      value={authEmail}
                      onChange={e => setAuthEmail(e.target.value)}
                      placeholder="Your email address"
                      required
                      className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 placeholder-slate-600"
                    />
                    {authError && <p className="text-rose-400 text-xs">{authError}</p>}
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold py-3 rounded-xl text-sm flex items-center justify-center space-x-2"
                    >
                      {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                      <span>{authLoading ? 'Sending...' : 'Send Magic Link'}</span>
                    </button>
                  </form>
                ) : (
                  <div className="bg-emerald-950/40 border border-emerald-700 rounded-xl p-4 text-center space-y-2">
                    <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
                    <p className="text-sm text-white font-semibold">Check your email</p>
                    <p className="text-xs text-slate-400">A sign-in link was sent to <strong>{authEmail}</strong>. Click it to sign in.</p>
                    <button onClick={() => setAuthSent(false)} className="text-xs text-slate-500 hover:text-slate-300 mt-2">Use a different email</button>
                  </div>
                )}
              </div>
            )}

            {/* Admin Tools (logged in) */}
            {isLoggedIn && currentPlayer && (
              <div className="space-y-6">

                {/* Admin Controls */}
                {currentPlayer.is_admin && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <h3 className="font-bold text-sm uppercase tracking-wide text-slate-200 border-b border-slate-800 pb-2">Admin Controls</h3>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => handleLockDay('saturday')}
                        className="bg-rose-950/40 border border-rose-900/60 hover:bg-rose-900/30 text-rose-400 px-3 py-2 rounded-lg text-xs font-bold"
                      >
                        ðŸ”’ Lock Saturday
                      </button>
                      <button
                        onClick={() => handleLockDay('sunday')}
                        className="bg-rose-950/40 border border-rose-900/60 hover:bg-rose-900/30 text-rose-400 px-3 py-2 rounded-lg text-xs font-bold"
                      >
                        ðŸ”’ Lock Sunday
                      </button>
                      <button
                        onClick={handleRefreshWeather}
                        className="bg-sky-950/40 border border-sky-900/60 hover:bg-sky-900/30 text-sky-400 px-3 py-2 rounded-lg text-xs font-bold"
                      >
                        ðŸŒ¤ï¸ Refresh Weather
                      </button>
                      {!isGameCancelled ? (
                        <button onClick={handleCancelGame} className="bg-rose-950/40 border border-rose-900/60 hover:bg-rose-900/30 text-rose-400 px-3 py-2 rounded-lg text-xs font-bold">
                          âŒ Cancel Game
                        </button>
                      ) : (
                        <button onClick={handleRestoreGame} className="bg-emerald-950/40 border border-emerald-900/60 text-emerald-400 px-3 py-2 rounded-lg text-xs font-bold">
                          âœ… Restore Game
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Add Player */}
                {currentPlayer.is_admin && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <h3 className="font-bold text-sm uppercase tracking-wide text-slate-200 border-b border-slate-800 pb-2">Add Player to Distribution</h3>
                    <form onSubmit={handleAddNewGolfer} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { val: newGolferName, set: setNewGolferName, ph: 'Full Name *', type: 'text' },
                        { val: newGolferEmail, set: setNewGolferEmail, ph: 'Email *', type: 'email' },
                        { val: newGolferPhone, set: setNewGolferPhone, ph: 'Phone', type: 'tel' },
                        { val: newGolferHcp, set: setNewGolferHcp, ph: 'Handicap Index', type: 'number' },
                      ].map(({ val, set, ph, type }) => (
                        <input
                          key={ph}
                          type={type}
                          value={val}
                          onChange={e => set(e.target.value)}
                          placeholder={ph}
                          className="bg-slate-950 border border-slate-800 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500 placeholder-slate-600"
                        />
                      ))}
                      <button
                        type="submit"
                        className="sm:col-span-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center space-x-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add to Distribution List</span>
                      </button>
                    </form>
                  </div>
                )}

                {/* Player List */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <h3 className="font-bold text-sm uppercase tracking-wide text-slate-200 border-b border-slate-800 pb-2">Current Invitees & Status</h3>
                  <div className="overflow-x-auto border border-slate-800 rounded-2xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-800 text-slate-400">
                          <th className="p-3">Player</th>
                          <th className="p-3">HCP</th>
                          <th className="p-3">Saturday</th>
                          <th className="p-3">Sunday</th>
                          {currentPlayer.is_admin && <th className="p-3 text-right">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 bg-slate-900/40">
                        {golfers.map(g => (
                          <tr key={g.id} className="hover:bg-slate-950/40">
                            <td className="p-3">
                              <span className="font-semibold text-white block">{g.name}</span>
                              <span className="text-[10px] text-slate-500 font-mono">{g.email}</span>
                            </td>
                            <td className="p-3 font-bold text-slate-100">{g.handicap || 'N/A'}</td>
                            <td className="p-3">
                              <span className={`inline-block text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                                g.saturdayStatus === 'confirmed' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/40'
                                : g.saturdayStatus === 'waitlist' ? 'bg-amber-950 text-amber-400 border border-amber-900/40 animate-pulse'
                                : 'bg-slate-800 text-slate-400'
                              }`}>
                                {g.saturdayStatus === 'confirmed' ? 'âœ… In' : g.saturdayStatus === 'waitlist' ? 'â³ Wait' : 'â€”'}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className={`inline-block text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                                g.sundayStatus === 'confirmed' ? 'bg-sky-950 text-sky-400 border border-sky-900/40'
                                : g.sundayStatus === 'waitlist' ? 'bg-amber-950 text-amber-400 border border-amber-900/40 animate-pulse'
                                : 'bg-slate-800 text-slate-400'
                              }`}>
                                {g.sundayStatus === 'confirmed' ? 'âœ… In' : g.sundayStatus === 'waitlist' ? 'â³ Wait' : 'â€”'}
                              </span>
                            </td>
                            {currentPlayer.is_admin && (
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => handleRemoveGolfer(g.id)}
                                  className="text-slate-500 hover:text-rose-400 p-1.5 rounded transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {/* TAB 4: Notification Log */}
        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {activeTab === 'notifications' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 max-w-4xl mx-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="space-y-1">
                <h3 className="font-bold text-base text-white flex items-center space-x-2">
                  <Bell className="w-5 h-5 text-emerald-400" />
                  <span>Live Activity Log</span>
                </h3>
                <p className="text-xs text-slate-400">Every registration, cancellation, and change logged here.</p>
              </div>
              <button onClick={() => setNotifications([{ id: 'init', type: 'System', timestamp: new Date().toLocaleTimeString(), text: 'Log cleared.', target: 'All' }])} className="text-xs text-slate-500 hover:text-rose-400 transition-colors">
                Clear Logs
              </button>
            </div>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {notifications.map((n) => (
                <div key={n.id} className={`p-4 rounded-xl border text-xs transition-all ${
                  n.type === 'Registration' ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-300'
                  : n.type === 'Waitlisted' ? 'bg-amber-950/30 border-amber-500/20 text-amber-300'
                  : n.type === 'Unregister' ? 'bg-slate-950 border-slate-800 text-slate-300'
                  : n.type === 'FIFO Promotion' ? 'bg-sky-950/30 border-sky-500/20 text-sky-300'
                  : n.type === 'Cancellation Alert' ? 'bg-rose-950/50 border-rose-500/50 text-rose-300'
                  : 'bg-slate-950 border-slate-850 text-slate-400'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold uppercase tracking-wider text-[10px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{n.type}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{n.timestamp}</span>
                  </div>
                  <p className="font-semibold text-slate-200 leading-relaxed">{n.text}</p>
                  <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
                    <span>Recipients: <strong className="text-slate-400">{n.target || 'All Group'}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      <footer className="border-t border-slate-800 bg-slate-950 py-6 mt-12 text-xs text-slate-500 text-center">
        <p>Â© {new Date().getFullYear()} LinksInvite Weekly Coordinator Â· Newnan Country Club</p>
        <p className="mt-1">React + Vite Â· Weather via Open-Meteo Â· Backend on Railway Â· DB on Supabase</p>
      </footer>
    </div>
  );
}
