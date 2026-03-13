import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import useGenerationStatus from './useGenerationStatus';
import { getAllReflections, getAllShowPreparations } from '../services';
import {
  getWeekId, getWeekMonday, getWeekState, saveWeekState,
  readCoachingCaches, readGPTCache, readPhysicalCache, readShowPlanCache,
} from '../services/weeklyFocusService';
import {
  extractCoachingSnapshot, extractGPTSnapshot, extractPhysicalSnapshot,
  buildShowSnapshot, selectCelebration,
} from '../components/WeeklyFocus/weeklyFocusUtils';

/**
 * useWeeklyFocus — core orchestrator for the Weekly Focus page.
 *
 * Content stability model:
 * - On first load of a new ISO week, reads from analysisCache,
 *   extracts weekly focus fields, writes a frozen snapshot.
 * - Subsequent loads that week read from the snapshot.
 * - When background regeneration completes, compares generatedAt
 *   timestamps and sets hasNewerContent flags.
 * - Rider can manually "Update to latest" per section.
 */
export default function useWeeklyFocus() {
  const { currentUser } = useAuth();
  const { justCompleted } = useGenerationStatus();

  const weekId = useMemo(() => getWeekId(), []);
  const weekMonday = useMemo(() => getWeekMonday(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Content (from snapshot or fresh extraction)
  const [coaching, setCoaching] = useState(null);
  const [gptAssignments, setGptAssignments] = useState(null);
  const [physicalItems, setPhysicalItems] = useState(null);
  const [celebration, setCelebration] = useState(null);
  const [show, setShow] = useState(null);

  // hasNewerContent flags
  const [hasNewerContent, setHasNewerContent] = useState({
    coaching: false, gpt: false, physical: false, show: false,
  });

  // Interaction state
  const [pinned, setPinned] = useState(new Set());
  const [completed, setCompleted] = useState(new Set());
  const [collapsed, setCollapsed] = useState(new Set());
  const [checkedItems, setCheckedItems] = useState({ gpt: [], physical: [], show: [] });
  const [mode, setMode] = useState('all');

  // Refs
  const saveTimerRef = useRef(null);
  const stateLoadedRef = useRef(false);
  const snapshotRef = useRef(null); // stores sourceGeneratedAt timestamps
  const showPrepsRef = useRef(null); // cached show prep data for updates

  // ── Debounced save ──
  const debouncedSave = useCallback((stateUpdate) => {
    if (!currentUser || !stateLoadedRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveWeekState(currentUser.uid, weekId, stateUpdate);
    }, 300);
  }, [currentUser, weekId]);

  // ── Interaction toggles ──
  const togglePin = useCallback((section) => {
    setPinned(prev => {
      const next = new Set(prev);
      next.has(section) ? next.delete(section) : next.add(section);
      debouncedSave({ pinnedSections: [...next] });
      return next;
    });
  }, [debouncedSave]);

  const toggleDone = useCallback((section) => {
    setCompleted(prev => {
      const next = new Set(prev);
      next.has(section) ? next.delete(section) : next.add(section);
      debouncedSave({ completedSections: [...next] });
      return next;
    });
  }, [debouncedSave]);

  const toggleCollapse = useCallback((section) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(section) ? next.delete(section) : next.add(section);
      return next;
    });
  }, []);

  const handleItemCheck = useCallback((type, index) => {
    setCheckedItems(prev => {
      const arr = [...(prev[type] || [])];
      arr[index] = !arr[index];
      const next = { ...prev, [type]: arr };
      debouncedSave({ checkedItems: next });
      return next;
    });
  }, [debouncedSave]);

  // ── Read fresh AI data from analysisCache ──
  const readFreshContent = useCallback(async (uid) => {
    const [coachingData, gptData, physData] = await Promise.allSettled([
      readCoachingCaches(uid),
      readGPTCache(uid),
      readPhysicalCache(uid),
    ]);

    return {
      coaching: coachingData.status === 'fulfilled' ? extractCoachingSnapshot(coachingData.value) : null,
      gpt: gptData.status === 'fulfilled' ? extractGPTSnapshot(gptData.value) : null,
      physical: physData.status === 'fulfilled' ? extractPhysicalSnapshot(physData.value) : null,
    };
  }, []);

  // ── Read show plan content ──
  const readShowContent = useCallback(async (uid, showPreps) => {
    if (!showPreps?.length) return { state: 'no_shows' };

    // Find nearest upcoming show
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const upcoming = showPreps
      .filter(p =>
        (p.showDateStart || '') >= todayStr &&
        p.status !== 'completed'
      )
      .sort((a, b) => (a.showDateStart || '').localeCompare(b.showDateStart || ''));

    if (upcoming.length === 0) return { state: 'no_shows' };

    const activeShow = upcoming[0];
    const planCache = await readShowPlanCache(uid, activeShow.id);
    return buildShowSnapshot(showPreps, planCache, weekMonday);
  }, [weekMonday]);

  // ── Update a single section to latest ──
  const updateToLatest = useCallback(async (section) => {
    if (!currentUser) return;
    const uid = currentUser.uid;

    if (section === 'coaching') {
      const data = await readCoachingCaches(uid);
      const snap = extractCoachingSnapshot(data);
      if (snap) {
        setCoaching({ title: snap.title, excerpts: snap.excerpts, reflectionNudge: snap.reflectionNudge });
        snapshotRef.current = { ...snapshotRef.current, coaching: snap.sourceGeneratedAt };
        saveWeekState(uid, weekId, { 'contentSnapshot.coaching': snap });
      }
    } else if (section === 'gpt') {
      const data = await readGPTCache(uid);
      const snap = extractGPTSnapshot(data);
      const assignments = snap?.weeklyAssignments || null;
      setGptAssignments(assignments);
      // Reset checked items — assignment count may have changed
      setCheckedItems(prev => {
        const newArr = new Array(assignments?.length || 0).fill(false);
        const next = { ...prev, gpt: newArr };
        debouncedSave({ checkedItems: next });
        return next;
      });
      if (snap) {
        snapshotRef.current = { ...snapshotRef.current, gpt: snap.sourceGeneratedAt };
        saveWeekState(uid, weekId, { 'contentSnapshot.gpt': snap });
      }
    } else if (section === 'physical') {
      const data = await readPhysicalCache(uid);
      const snap = extractPhysicalSnapshot(data);
      const items = snap?.weeklyFocusItems || null;
      setPhysicalItems(items);
      setCheckedItems(prev => {
        const newArr = new Array(items?.length || 0).fill(false);
        const next = { ...prev, physical: newArr };
        debouncedSave({ checkedItems: next });
        return next;
      });
      if (snap) {
        snapshotRef.current = { ...snapshotRef.current, physical: snap.sourceGeneratedAt };
        saveWeekState(uid, weekId, { 'contentSnapshot.physical': snap });
      }
    } else if (section === 'show') {
      const showContent = await readShowContent(uid, showPrepsRef.current || []);
      setShow(showContent);
      if (showContent?.sourceGeneratedAt) {
        snapshotRef.current = { ...snapshotRef.current, show: showContent.sourceGeneratedAt };
        saveWeekState(uid, weekId, { 'contentSnapshot.show': showContent });
      }
    }

    setHasNewerContent(prev => ({ ...prev, [section]: false }));
  }, [currentUser, weekId, debouncedSave, readShowContent]);

  // ── Initial data fetch ──
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);
      const uid = currentUser.uid;

      try {
        // Read week state + supporting data in parallel
        const [weekStateRes, reflRes, showRes] = await Promise.all([
          getWeekState(uid, weekId),
          getAllReflections(uid),
          getAllShowPreparations(uid),
        ]);

        if (cancelled) return;

        const weekState = weekStateRes.success ? weekStateRes.data : null;
        const reflections = reflRes.success ? reflRes.data : [];
        const showPreps = showRes.success ? showRes.data : [];
        showPrepsRef.current = showPreps;

        // Restore interaction state
        if (weekState) {
          if (weekState.pinnedSections) setPinned(new Set(weekState.pinnedSections));
          if (weekState.completedSections) setCompleted(new Set(weekState.completedSections));
          if (weekState.checkedItems) setCheckedItems(weekState.checkedItems);
          if (weekState.hasNewerContent) setHasNewerContent(weekState.hasNewerContent);
        }

        stateLoadedRef.current = true;

        // ── Content: use snapshot if available, else build fresh ──
        const snapshot = weekState?.contentSnapshot;

        if (snapshot) {
          // Snapshot exists — use frozen content
          if (snapshot.coaching) {
            setCoaching({
              title: snapshot.coaching.title,
              excerpts: snapshot.coaching.excerpts,
              reflectionNudge: snapshot.coaching.reflectionNudge,
            });
          }
          if (snapshot.gpt?.weeklyAssignments) {
            setGptAssignments(snapshot.gpt.weeklyAssignments);
          }
          if (snapshot.physical?.weeklyFocusItems) {
            setPhysicalItems(snapshot.physical.weeklyFocusItems);
          }
          if (snapshot.show && snapshot.show.state !== 'no_shows') {
            setShow(snapshot.show);
          }

          // Store generatedAt timestamps for comparison
          snapshotRef.current = {
            coaching: snapshot.coaching?.sourceGeneratedAt || null,
            gpt: snapshot.gpt?.sourceGeneratedAt || null,
            physical: snapshot.physical?.sourceGeneratedAt || null,
            show: snapshot.show?.sourceGeneratedAt || null,
          };

          // Re-try any null sections — fallback extractors may succeed now
          const nullSections = [];
          if (!snapshot.coaching) nullSections.push('coaching');
          if (!snapshot.gpt) nullSections.push('gpt');
          if (!snapshot.physical) nullSections.push('physical');
          if (!snapshot.show) nullSections.push('show');

          if (nullSections.length > 0) {
            const freshContent = await readFreshContent(uid);
            if (cancelled) return;
            const updates = {};

            if (nullSections.includes('coaching') && freshContent.coaching) {
              setCoaching({
                title: freshContent.coaching.title,
                excerpts: freshContent.coaching.excerpts,
                reflectionNudge: freshContent.coaching.reflectionNudge,
              });
              updates['contentSnapshot.coaching'] = freshContent.coaching;
              snapshotRef.current.coaching = freshContent.coaching.sourceGeneratedAt;
            }
            if (nullSections.includes('gpt') && freshContent.gpt?.weeklyAssignments) {
              setGptAssignments(freshContent.gpt.weeklyAssignments);
              updates['contentSnapshot.gpt'] = freshContent.gpt;
              snapshotRef.current.gpt = freshContent.gpt.sourceGeneratedAt;
            }
            if (nullSections.includes('physical') && freshContent.physical?.weeklyFocusItems) {
              setPhysicalItems(freshContent.physical.weeklyFocusItems);
              updates['contentSnapshot.physical'] = freshContent.physical;
              snapshotRef.current.physical = freshContent.physical.sourceGeneratedAt;
            }
            if (nullSections.includes('show')) {
              const showContent = await readShowContent(uid, showPreps);
              if (showContent && showContent.state !== 'no_shows') {
                setShow(showContent);
                updates['contentSnapshot.show'] = showContent;
                snapshotRef.current.show = showContent.sourceGeneratedAt;
              }
            }

            if (Object.keys(updates).length > 0) {
              saveWeekState(uid, weekId, updates);
            }
          }
        } else {
          // No snapshot — build fresh from analysisCache
          const [freshContent, showContent] = await Promise.all([
            readFreshContent(uid),
            readShowContent(uid, showPreps),
          ]);

          if (cancelled) return;

          if (freshContent.coaching) {
            setCoaching({
              title: freshContent.coaching.title,
              excerpts: freshContent.coaching.excerpts,
              reflectionNudge: freshContent.coaching.reflectionNudge,
            });
          }
          if (freshContent.gpt?.weeklyAssignments) {
            setGptAssignments(freshContent.gpt.weeklyAssignments);
          }
          if (freshContent.physical?.weeklyFocusItems) {
            setPhysicalItems(freshContent.physical.weeklyFocusItems);
          }
          setShow(showContent);

          // Store generatedAt timestamps
          snapshotRef.current = {
            coaching: freshContent.coaching?.sourceGeneratedAt || null,
            gpt: freshContent.gpt?.sourceGeneratedAt || null,
            physical: freshContent.physical?.sourceGeneratedAt || null,
            show: showContent?.sourceGeneratedAt || null,
          };

          // Write snapshot to Firestore so subsequent loads are frozen
          const contentSnapshot = {
            coaching: freshContent.coaching || null,
            gpt: freshContent.gpt || null,
            physical: freshContent.physical || null,
            show: showContent || null,
          };
          saveWeekState(uid, weekId, { contentSnapshot });
        }

        // Celebration — handle locking
        if (weekState?.celebrationId) {
          const lockedRef = reflections.find(r => r.id === weekState.celebrationId);
          if (lockedRef) {
            setCelebration(selectCelebration([lockedRef]));
          } else {
            const cel = selectCelebration(reflections);
            setCelebration(cel);
          }
        } else {
          const cel = selectCelebration(reflections);
          setCelebration(cel);
          if (cel?.id) {
            saveWeekState(uid, weekId, { celebrationId: cel.id });
          }
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }

      if (!cancelled) setLoading(false);
    }

    init();
    return () => { cancelled = true; };
  }, [currentUser, weekId, readFreshContent, readShowContent]);

  // ── Detect newer content on background regen ──
  useEffect(() => {
    if (!justCompleted || !currentUser) return;

    async function checkForUpdates() {
      const uid = currentUser.uid;
      const [coachingData, gptData, physData] = await Promise.allSettled([
        readCoachingCaches(uid),
        readGPTCache(uid),
        readPhysicalCache(uid),
      ]);

      const stored = snapshotRef.current || {};
      const updates = {};

      if (coachingData.status === 'fulfilled' && coachingData.value) {
        const freshGenAt = coachingData.value.generatedAt;
        if (freshGenAt && freshGenAt !== stored.coaching) {
          updates.coaching = true;
        }
      }
      if (gptData.status === 'fulfilled' && gptData.value) {
        const freshGenAt = gptData.value.generatedAt;
        if (freshGenAt && freshGenAt !== stored.gpt) {
          updates.gpt = true;
        }
      }
      if (physData.status === 'fulfilled' && physData.value) {
        const freshGenAt = physData.value.generatedAt;
        if (freshGenAt && freshGenAt !== stored.physical) {
          updates.physical = true;
        }
      }

      if (Object.keys(updates).length > 0) {
        setHasNewerContent(prev => {
          const next = { ...prev, ...updates };
          // Persist flags so they survive page refresh
          saveWeekState(uid, weekId, { hasNewerContent: next });
          return next;
        });
      }
    }

    checkForUpdates();
  }, [justCompleted, currentUser, weekId]);

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // ── Progress computation ──
  const progress = useMemo(() => {
    const gptCount = checkedItems.gpt?.length || 0;
    const physCount = checkedItems.physical?.length || 0;
    const showCount = checkedItems.show?.length || 0;
    const total = gptCount + physCount + showCount;
    const done = (checkedItems.gpt?.filter(Boolean).length || 0)
      + (checkedItems.physical?.filter(Boolean).length || 0)
      + (checkedItems.show?.filter(Boolean).length || 0);
    return { done, total };
  }, [checkedItems]);

  return {
    loading,
    error,
    celebration,
    coaching,
    gptAssignments,
    physicalItems,
    show,
    pinned,
    togglePin,
    completed,
    toggleDone,
    collapsed,
    toggleCollapse,
    checkedItems,
    handleItemCheck,
    mode,
    setMode,
    progress,
    hasNewerContent,
    updateToLatest,
  };
}
