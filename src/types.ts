export interface Subject {
  id: string;
  name: string;
  color: string;
  difficulty: number;
  priority: number;
  targetHoursPerWeek: number;
  targetHoursPerDay?: number;
}

export interface StudySession {
  id: string;
  subjectId: string;
  startTime: Date;
  endTime?: Date;
  durationMinutes?: number;
  focusRating?: number;
  notes: string;
  completed: boolean;
}

export interface StudyGoal {
  id: string;
  subjectId?: string;
  subjectIds?: string[]; // For exams with multiple subjects
  title: string;
  description: string;
  targetDate?: Date;
  completed: boolean;
  completedAt?: Date;
  isExam?: boolean;
  examDate?: Date;
  examTime?: string;
  examLocation?: string;
  studyHoursTarget?: number;
}

export interface ScheduleSlot {
  id: string;
  subjectId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface ProductivityInsight {
  type: 'peak_hours' | 'weak_subjects' | 'streak' | 'recommendation';
  title: string;
  description: string;
  data?: any;
}

export interface Mentor {
  id: string;
  name: string;
  username?: string;
  avatarUrl: string;
  domain: string[]; // e.g., ['Web Dev', 'DSA', 'AI/ML']
  experienceYears?: number;
  company?: string;
  college?: string;
  bio: string;
  skills: string[];
  languages: string[];
  rating: number;
  totalReviews: number;
  isVerified: boolean;
  offerings?: MentorshipOffering[];
  reviews?: SessionReview[];
}

export interface MentorshipOffering {
  id: string;
  mentorId: string;
  title: string; // '1:1 Mentorship', 'Doubt Solving', etc.
  description: string;
  durationMinutes: number;
  mode: 'chat' | 'call' | 'video';
  isFree: boolean;
  price: number;
  isActive: boolean;
}

export interface SessionReview {
  id: string;
  rating: number;
  reviewText?: string;
  createdAt: Date;
  studentId: string;
  studentName?: string;
  studentAvatarUrl?: string;
  studentUsername?: string;
}

export interface SessionRequest {
  id: string;
  mentorId: string;
  studentId: string;
  offeringId?: string;
  topic: string;
  studentMessage: string;
  preferredDate?: string;
  preferredTime?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  mentorResponse?: string;
  meetingLink?: string;
  mode?: 'chat' | 'call' | 'video'; // Session mode set by mentor
  createdAt: Date;
  studentProfile?: UserProfile;
  mentorProfile?: UserProfile;
  offering?: MentorshipOffering; // Include offering details
  review?: SessionReview; // Review for this session
}

export interface Friend {
  id: string;
  name: string;
  username?: string;
  status: 'online' | 'offline' | 'studying';
  currentSubject?: string;
  studyStreak: number;
  avatarUrl: string;
  profilePicture?: string; // Real-time profile picture from database
  lastActive?: Date;
  role?: 'student' | 'mentor';
  isActive?: boolean;
}

export interface MentorSession {
  id: string;
  mentorId: string;
  userId: string;
  startTime: Date;
  durationMinutes: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  topic: string;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}
export interface UserProfile {
  id: string;
  userId: string;
  fullName: string;
  avatarUrl?: string;
  role: 'student' | 'mentor';
  phoneNumber?: string;
  // Mentor specific
  profession?: string;
  experience?: string;
  // Student specific
  class?: string;
  course?: string;
  age?: number;
  username?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Group {
  id: string;
  name: string;
  avatarUrl?: string;
  createdBy: string;
  createdAt: Date;
}

export interface GroupMember {
  groupId: string;
  userId: string;
  role: 'admin' | 'member';
  joinedAt: Date;
  profile?: UserProfile; // Optional joined profile data
}

export interface Message {
  id: string;
  senderId: string;
  receiverId?: string;
  groupId?: string;
  content: string;
  isRead: boolean;
  createdAt: Date;
  senderName?: string; // For UI convenience
  senderAvatar?: string; // For UI convenience
}
