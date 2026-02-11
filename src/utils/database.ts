import { supabase } from './supabase';
import { Subject, StudySession, StudyGoal, ScheduleSlot } from '../types';

// User Profile Data
export interface UserProfile {
  id: string;
  user_id: string;
  full_name?: string;
  avatar_url?: string;
  timezone?: string;
  study_preferences?: {
    defaultSessionDuration: number;
    reminderEnabled: boolean;
    reminderTime: string;
    darkMode: boolean;
    focusMode: boolean;
  };
  academic_info?: {
    institution?: string;
    degree?: string;
    year?: string;
    gpa?: number;
  };
  created_at: string;
  updated_at: string;
}

// Database operations for user profiles
export const userProfileService = {
  // Get user profile
  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data;
  },

  // Create or update user profile
  async upsertProfile(profile: Partial<UserProfile>): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(profile, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error('Error upserting profile:', error);
      return null;
    }

    return data;
  },

  // Update specific profile fields
  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<boolean> {
    const { error } = await supabase
      .from('user_profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating profile:', error);
      return false;
    }

    return true;
  }
};

// Database operations for subjects
export const subjectService = {
  async getSubjects(userId: string): Promise<Subject[]> {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching subjects:', error);
      return [];
    }

    return data || [];
  },

  async createSubject(userId: string, subject: Omit<Subject, 'id'>): Promise<Subject | null> {
    const { data, error } = await supabase
      .from('subjects')
      .insert({ ...subject, user_id: userId })
      .select()
      .single();

    if (error) {
      console.error('Error creating subject:', error);
      return null;
    }

    return data;
  },

  async updateSubject(subjectId: string, updates: Partial<Subject>): Promise<boolean> {
    const { error } = await supabase
      .from('subjects')
      .update(updates)
      .eq('id', subjectId);

    if (error) {
      console.error('Error updating subject:', error);
      return false;
    }

    return true;
  },

  async deleteSubject(subjectId: string): Promise<boolean> {
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', subjectId);

    if (error) {
      console.error('Error deleting subject:', error);
      return false;
    }

    return true;
  }
};// Databa
se operations for study sessions
export const studySessionService = {
  async getSessions(userId: string, limit?: number): Promise<StudySession[]> {
    let query = supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching study sessions:', error);
      return [];
    }

    return data?.map(session => ({
      ...session,
      startTime: new Date(session.start_time),
      endTime: session.end_time ? new Date(session.end_time) : undefined
    })) || [];
  },

  async createSession(userId: string, session: Omit<StudySession, 'id'>): Promise<StudySession | null> {
    const { data, error } = await supabase
      .from('study_sessions')
      .insert({
        ...session,
        user_id: userId,
        start_time: session.startTime.toISOString(),
        end_time: session.endTime?.toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating study session:', error);
      return null;
    }

    return {
      ...data,
      startTime: new Date(data.start_time),
      endTime: data.end_time ? new Date(data.end_time) : undefined
    };
  },

  async updateSession(sessionId: string, updates: Partial<StudySession>): Promise<boolean> {
    const dbUpdates: any = { ...updates };
    
    if (updates.startTime) {
      dbUpdates.start_time = updates.startTime.toISOString();
      delete dbUpdates.startTime;
    }
    
    if (updates.endTime) {
      dbUpdates.end_time = updates.endTime.toISOString();
      delete dbUpdates.endTime;
    }

    const { error } = await supabase
      .from('study_sessions')
      .update(dbUpdates)
      .eq('id', sessionId);

    if (error) {
      console.error('Error updating study session:', error);
      return false;
    }

    return true;
  }
};

// Database operations for study goals
export const studyGoalService = {
  async getGoals(userId: string): Promise<StudyGoal[]> {
    const { data, error } = await supabase
      .from('study_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching study goals:', error);
      return [];
    }

    return data?.map(goal => ({
      ...goal,
      targetDate: goal.target_date ? new Date(goal.target_date) : undefined,
      completedAt: goal.completed_at ? new Date(goal.completed_at) : undefined,
      examDate: goal.exam_date ? new Date(goal.exam_date) : undefined
    })) || [];
  },

  async createGoal(userId: string, goal: Omit<StudyGoal, 'id'>): Promise<StudyGoal | null> {
    const { data, error } = await supabase
      .from('study_goals')
      .insert({
        ...goal,
        user_id: userId,
        target_date: goal.targetDate?.toISOString(),
        completed_at: goal.completedAt?.toISOString(),
        exam_date: goal.examDate?.toISOString(),
        subject_ids: goal.subjectIds
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating study goal:', error);
      return null;
    }

    return {
      ...data,
      targetDate: data.target_date ? new Date(data.target_date) : undefined,
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      examDate: data.exam_date ? new Date(data.exam_date) : undefined,
      subjectIds: data.subject_ids
    };
  },

  async updateGoal(goalId: string, updates: Partial<StudyGoal>): Promise<boolean> {
    const dbUpdates: any = { ...updates };
    
    if (updates.targetDate) {
      dbUpdates.target_date = updates.targetDate.toISOString();
      delete dbUpdates.targetDate;
    }
    
    if (updates.completedAt) {
      dbUpdates.completed_at = updates.completedAt.toISOString();
      delete dbUpdates.completedAt;
    }
    
    if (updates.examDate) {
      dbUpdates.exam_date = updates.examDate.toISOString();
      delete dbUpdates.examDate;
    }

    if (updates.subjectIds) {
      dbUpdates.subject_ids = updates.subjectIds;
      delete dbUpdates.subjectIds;
    }

    const { error } = await supabase
      .from('study_goals')
      .update(dbUpdates)
      .eq('id', goalId);

    if (error) {
      console.error('Error updating study goal:', error);
      return false;
    }

    return true;
  }
};