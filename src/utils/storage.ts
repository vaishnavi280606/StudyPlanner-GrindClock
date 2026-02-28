import { Subject, StudySession, StudyGoal, ScheduleSlot } from '../types';
import { supabase } from './supabase';

const STORAGE_KEYS = {
  SUBJECTS: 'study_planner_subjects',
  SESSIONS: 'study_planner_sessions',
  GOALS: 'study_planner_goals',
  SCHEDULE: 'study_planner_schedule',
};

// Get user-specific storage key to keep data separate per user
// IMPORTANT: Data persists across logout/login cycles
// - Each user has their own localStorage keys (e.g., study_planner_subjects_abc123)
// - Data is synced to Supabase database for cross-device access
// - Logout only clears auth session, NOT user data
// - On login, data is loaded from database and cached in localStorage
const getUserStorageKey = (baseKey: string, userId: string | null): string => {
  // Use a guest key for unauthenticated users, user-specific key for authenticated
  return userId ? `${baseKey}_${userId}` : `${baseKey}_guest`;
};

// Helper to get current user ID - uses getSession which is more reliable
const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error getting session:', error);
      return null;
    }
    return session?.user?.id || null;
  } catch (err) {
    console.error('Failed to get current user ID:', err);
    return null;
  }
};

// Hybrid storage: Use database if user is authenticated, fallback to localStorage
// Data persists across sign-outs and syncs across devices
export const storage = {
  getSubjects: async (): Promise<Subject[]> => {
    const userId = await getCurrentUserId();
    const storageKey = getUserStorageKey(STORAGE_KEYS.SUBJECTS, userId);

    console.log(`Getting subjects - User ID: ${userId || 'guest'}, Storage key: ${storageKey}`);

    // ALWAYS try to load from localStorage first for immediate access
    const localData = localStorage.getItem(storageKey);
    let localSubjects = localData ? JSON.parse(localData) : [];
    console.log(`Found ${localSubjects.length} subjects in localStorage`);

    if (userId) {
      // If authenticated, try to sync with database
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching subjects from database:', error);
        // Return localStorage data as fallback
        console.log(`Using localStorage fallback: ${localSubjects.length} subjects`);
        return localSubjects;
      }

      const dbSubjects = data?.map(subject => ({
        id: subject.id,
        name: subject.name,
        color: subject.color,
        difficulty: subject.difficulty,
        priority: subject.priority,
        targetHoursPerWeek: subject.target_hours_per_week,
        targetHoursPerDay: subject.target_hours_per_day
      })) || [];

      console.log(`Found ${dbSubjects.length} subjects in database`);

      // Use database data if available, otherwise use localStorage
      const subjects = dbSubjects.length > 0 ? dbSubjects : localSubjects;

      // Always update localStorage cache
      localStorage.setItem(storageKey, JSON.stringify(subjects));
      console.log(`Using ${subjects.length} subjects (from ${dbSubjects.length > 0 ? 'database' : 'localStorage'})`);

      return subjects;
    } else {
      // Use guest-specific localStorage for unauthenticated users
      console.log(`Using guest localStorage: ${localSubjects.length} subjects`);
      return localSubjects;
    }
  },

  saveSubjects: async (subjects: Subject[]) => {
    const userId = await getCurrentUserId();
    const storageKey = getUserStorageKey(STORAGE_KEYS.SUBJECTS, userId);

    console.log(`Saving ${subjects.length} subjects with key: ${storageKey}`);
    console.log('Subjects to save:', subjects);

    // ALWAYS save to user-specific localStorage first for immediate persistence
    localStorage.setItem(storageKey, JSON.stringify(subjects));

    // Verify it was saved
    const verification = localStorage.getItem(storageKey);
    const verified = verification ? JSON.parse(verification) : [];
    console.log(`✓ Verified: ${verified.length} subjects saved to localStorage (${userId ? 'user ' + userId : 'guest'})`);

    if (userId) {
      try {
        // Also save to database for cross-device sync
        // First, delete existing subjects for this user
        const { error: deleteError } = await supabase
          .from('subjects')
          .delete()
          .eq('user_id', userId);

        if (deleteError) {
          console.error('Error deleting old subjects from database:', deleteError);
        }

        // Then insert new subjects
        if (subjects.length > 0) {
          const { error: insertError } = await supabase
            .from('subjects')
            .insert(subjects.map(subject => ({
              id: subject.id,
              user_id: userId,
              name: subject.name,
              color: subject.color,
              difficulty: subject.difficulty,
              priority: subject.priority,
              target_hours_per_week: subject.targetHoursPerWeek,
              target_hours_per_day: subject.targetHoursPerDay
            })));

          if (insertError) {
            console.error('Error saving subjects to database:', insertError);
          } else {
            console.log(`Successfully saved ${subjects.length} subjects to database`);
          }
        }
      } catch (error) {
        console.error('Error in saveSubjects database operation:', error);
      }
    }
  },

  getSessions: async (): Promise<StudySession[]> => {
    const userId = await getCurrentUserId();
    const storageKey = getUserStorageKey(STORAGE_KEYS.SESSIONS, userId);

    console.log(`Getting sessions - User ID: ${userId || 'guest'}, Storage key: ${storageKey}`);

    // ALWAYS try to load from localStorage first for immediate access
    const localData = localStorage.getItem(storageKey);
    let localSessions: StudySession[] = [];
    if (localData) {
      const parsed = JSON.parse(localData);
      localSessions = parsed.map((s: any) => ({
        ...s,
        startTime: new Date(s.startTime),
        endTime: s.endTime ? new Date(s.endTime) : undefined,
      }));
    }
    console.log(`Found ${localSessions.length} sessions in localStorage`);

    if (userId) {
      // If authenticated, try to sync with database
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: false });

      if (error) {
        console.error('Error fetching sessions from database:', error);
        // Return localStorage data as fallback
        console.log(`Using localStorage fallback: ${localSessions.length} sessions`);
        return localSessions;
      }

      const dbSessions = data?.map(session => {
        // Try to recover subjectId from local storage if missing in DB (legacy fix)
        let subjectId = session.subject_id;
        if (!subjectId) {
          const localMatch = localSessions.find(ls => ls.id === session.id);
          if (localMatch && localMatch.subjectId) {
            subjectId = localMatch.subjectId;
          }
        }

        return {
          id: session.id,
          subjectId: subjectId || '', // Fallback to empty string if absolutely not found
          startTime: new Date(session.start_time),
          endTime: session.end_time ? new Date(session.end_time) : undefined,
          durationMinutes: session.duration_minutes,
          focusRating: session.focus_rating,
          notes: session.notes || '',
          completed: session.completed
        };
      }) || [];

      console.log(`Found ${dbSessions.length} sessions in database`);

      // AUTO-SYNC: If we have local sessions but none in database, push them to database
      if (dbSessions.length === 0 && localSessions.length > 0) {
        console.log('🔄 Auto-syncing localStorage sessions to database...');
        try {
          const sessionsToInsert = localSessions.map(session => ({
            id: session.id,
            user_id: userId,
            subject_id: session.subjectId, // Try to keep the subject link
            start_time: session.startTime instanceof Date ? session.startTime.toISOString() : new Date(session.startTime).toISOString(),
            end_time: session.endTime ? (session.endTime instanceof Date ? session.endTime.toISOString() : new Date(session.endTime).toISOString()) : null,
            duration_minutes: session.durationMinutes,
            focus_rating: session.focusRating,
            notes: session.notes || '',
            completed: session.completed
          }));

          const { error: insertError, data: insertedData } = await supabase
            .from('study_sessions')
            .insert(sessionsToInsert)
            .select();

          if (insertError) {
            console.error('❌ Auto-sync failed:', insertError.message);
          } else {
            console.log(`✅ Auto-synced ${insertedData?.length || 0} sessions to database!`);
          }
        } catch (err) {
          console.error('❌ Auto-sync exception:', err);
        }

        // Return local sessions (they're now in DB too)
        return localSessions;
      }

      // Merge sessions from both sources, preferring localStorage for conflicts
      // This ensures newly saved sessions from the timer aren't lost if DB save fails
      const sessionMap = new Map<string, StudySession>();
      dbSessions.forEach(s => sessionMap.set(s.id, s));
      localSessions.forEach(s => sessionMap.set(s.id, s));
      const sessions = Array.from(sessionMap.values()).sort(
        (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );

      // Always update localStorage cache
      localStorage.setItem(storageKey, JSON.stringify(sessions));
      console.log(`Using ${sessions.length} sessions (merged from ${dbSessions.length} DB + ${localSessions.length} local)`);

      return sessions;
    } else {
      // Use guest-specific localStorage for unauthenticated users
      console.log(`Using guest localStorage: ${localSessions.length} sessions`);
      return localSessions;
    }
  },

  saveSessions: async (sessions: StudySession[]) => {
    const userId = await getCurrentUserId();
    const storageKey = getUserStorageKey(STORAGE_KEYS.SESSIONS, userId);

    console.log(`Saving ${sessions.length} sessions with key: ${storageKey}`);

    // ALWAYS save to user-specific localStorage first for immediate persistence
    localStorage.setItem(storageKey, JSON.stringify(sessions));

    // Verify it was saved
    const verification = localStorage.getItem(storageKey);
    const verified = verification ? JSON.parse(verification) : [];
    console.log(`✓ Verified: ${verified.length} sessions saved to localStorage (${userId ? 'user ' + userId : 'guest'})`);

    if (userId) {
      try {
        // Also save to database for cross-device sync
        console.log('🔄 Syncing sessions to database for user:', userId);

        // First, delete existing sessions for this user
        // Note: DELETE then INSERT is inefficient but simple for sync. 
        // Ideally we should upsert, but this ensures deleted sessions in local are reflected (if we were full syncing).
        // Actually, here we are saving *all* sessions from state.
        const { error: deleteError } = await supabase.from('study_sessions').delete().eq('user_id', userId);
        if (deleteError) {
          console.error('❌ Error deleting old sessions from database:', deleteError);
        } else {
          console.log('✓ Deleted old sessions from database');
        }

        // Then insert new sessions
        if (sessions.length > 0) {
          const sessionsToInsert = sessions.map(session => ({
            id: session.id,
            user_id: userId,
            subject_id: session.subjectId, // Keep the subject link!
            start_time: session.startTime instanceof Date ? session.startTime.toISOString() : new Date(session.startTime).toISOString(),
            end_time: session.endTime ? (session.endTime instanceof Date ? session.endTime.toISOString() : new Date(session.endTime).toISOString()) : null,
            duration_minutes: session.durationMinutes,
            focus_rating: session.focusRating,
            notes: session.notes || '',
            completed: session.completed
          }));

          console.log('📤 Inserting sessions to database:', sessionsToInsert);

          const { error, data } = await supabase
            .from('study_sessions')
            .insert(sessionsToInsert)
            .select();

          if (error) {
            console.error('❌ Error saving sessions to database:', error);
            console.error('Error details:', error.message, error.details, error.hint);
          } else {
            console.log('✅ Successfully saved', data?.length || 0, 'sessions to database');
          }
        }
      } catch (err) {
        console.error('❌ Exception in saveSessions database sync:', err);
      }
    }
  },

  getGoals: async (): Promise<StudyGoal[]> => {
    const userId = await getCurrentUserId();
    const storageKey = getUserStorageKey(STORAGE_KEYS.GOALS, userId);

    console.log(`Getting goals - User ID: ${userId || 'guest'}, Storage key: ${storageKey}`);

    // ALWAYS try to load from localStorage first for immediate access
    const localData = localStorage.getItem(storageKey);
    let localGoals: StudyGoal[] = [];
    if (localData) {
      const parsed = JSON.parse(localData);
      localGoals = parsed.map((g: any) => ({
        ...g,
        targetDate: g.targetDate ? new Date(g.targetDate) : undefined,
        completedAt: g.completedAt ? new Date(g.completedAt) : undefined,
        examDate: g.examDate ? new Date(g.examDate) : undefined,
      }));
    }
    console.log(`Found ${localGoals.length} goals in localStorage`);

    if (userId) {
      // If authenticated, try to sync with database
      const { data, error } = await supabase
        .from('study_goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching goals from database:', error);
        // Return localStorage data as fallback
        console.log(`Using localStorage fallback: ${localGoals.length} goals`);
        return localGoals;
      }

      const dbGoals = data?.map(goal => ({
        ...goal,
        subjectId: goal.subject_id,
        subjectIds: goal.subject_ids,
        targetDate: goal.target_date ? new Date(goal.target_date) : undefined,
        completedAt: goal.completed_at ? new Date(goal.completed_at) : undefined,
        examDate: goal.exam_date ? new Date(goal.exam_date) : undefined,
        examTime: goal.exam_time,
        examLocation: goal.exam_location,
        studyHoursTarget: goal.study_hours_target,
        isExam: goal.is_exam
      })) || [];

      console.log(`Found ${dbGoals.length} goals in database`);

      // Use database data if available, otherwise use localStorage
      const goals = dbGoals.length > 0 ? dbGoals : localGoals;

      // Always update localStorage cache
      localStorage.setItem(storageKey, JSON.stringify(goals));
      console.log(`Using ${goals.length} goals (from ${dbGoals.length > 0 ? 'database' : 'localStorage'})`);

      return goals;
    } else {
      // Use guest-specific localStorage for unauthenticated users
      console.log(`Using guest localStorage: ${localGoals.length} goals`);
      return localGoals;
    }
  },

  saveGoals: async (goals: StudyGoal[]) => {
    const userId = await getCurrentUserId();
    const storageKey = getUserStorageKey(STORAGE_KEYS.GOALS, userId);

    console.log(`Saving ${goals.length} goals with key: ${storageKey}`);

    // ALWAYS save to user-specific localStorage first for immediate persistence
    localStorage.setItem(storageKey, JSON.stringify(goals));

    // Verify it was saved
    const verification = localStorage.getItem(storageKey);
    const verified = verification ? JSON.parse(verification) : [];
    console.log(`✓ Verified: ${verified.length} goals saved to localStorage (${userId ? 'user ' + userId : 'guest'})`);

    if (userId) {
      // Also save to database for cross-device sync
      // First, delete existing goals for this user
      await supabase.from('study_goals').delete().eq('user_id', userId);

      // Then insert new goals
      if (goals.length > 0) {
        const { error } = await supabase
          .from('study_goals')
          .insert(goals.map(goal => ({
            id: goal.id,
            user_id: userId,
            subject_id: goal.subjectId,
            subject_ids: goal.subjectIds,
            title: goal.title,
            description: goal.description,
            target_date: goal.targetDate?.toISOString(),
            completed: goal.completed,
            completed_at: goal.completedAt?.toISOString(),
            is_exam: goal.isExam,
            exam_date: goal.examDate?.toISOString(),
            exam_time: goal.examTime,
            exam_location: goal.examLocation,
            study_hours_target: goal.studyHoursTarget
          })));

        if (error) {
          console.error('Error saving goals to database:', error);
        }
      }
    }
  },

  getSchedule: (): ScheduleSlot[] => {
    const data = localStorage.getItem(STORAGE_KEYS.SCHEDULE);
    return data ? JSON.parse(data) : [];
  },

  saveSchedule: (schedule: ScheduleSlot[]) => {
    localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(schedule));
  },

  // Migrate data from guest to authenticated user
  migrateGuestData: async (userId: string) => {
    console.log('🚀 Starting guest data migration for user:', userId);

    const migrate = async (key: string, getFn: () => Promise<any[]>, saveFn: (data: any[]) => Promise<void>) => {
      const guestKey = getUserStorageKey(key, null);
      const guestData = localStorage.getItem(guestKey);

      if (guestData) {
        try {
          const parsed = JSON.parse(guestData);
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log(`📦 Migrating ${parsed.length} items from ${guestKey} to user ${userId}`);

            // Get existing user data (if any)
            const existingUserData = await getFn();

            // Merge (preferring guest data for simpler initial migration, or append)
            // For subjects and goals, we append if IDs are unique
            const merged = [...existingUserData];
            parsed.forEach(item => {
              if (!merged.find(m => m.id === item.id)) {
                merged.push(item);
              }
            });

            // Save to user storage (this will also sync to Supabase)
            await saveFn(merged);

            // Clear guest data after successful migration
            localStorage.removeItem(guestKey);
            console.log(`✅ Successfully migrated ${key}`);
          }
        } catch (err) {
          console.error(`❌ Error migrating ${key}:`, err);
        }
      }
    };

    await migrate(STORAGE_KEYS.SUBJECTS, storage.getSubjects, storage.saveSubjects);
    await migrate(STORAGE_KEYS.SESSIONS, storage.getSessions, storage.saveSessions);
    await migrate(STORAGE_KEYS.GOALS, storage.getGoals, storage.saveGoals);

    console.log('🏁 Guest data migration finished');
  }
};
