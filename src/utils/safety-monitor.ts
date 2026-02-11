/**
 * Safety Monitor Utility
 * 
 * Automated content moderation and behavior monitoring
 * Part of the Trust & Safety system
 */

import { supabase } from './supabase';
import { logger } from './logger';

/**
 * List of inappropriate words/phrases to flag
 * In production, this would be more comprehensive and possibly use an external service
 */
const INAPPROPRIATE_PATTERNS = [
    /\b(hate|kill|die|stupid|idiot|dumb)\b/i,
    /\b(scam|fraud|fake|phishing)\b/i,
    // Add more patterns as needed
];

/**
 * Check if content contains inappropriate language
 */
export function containsInappropriateContent(content: string): boolean {
    return INAPPROPRIATE_PATTERNS.some(pattern => pattern.test(content));
}

/**
 * Analyze message for safety violations
 */
export interface SafetyAnalysis {
    isSafe: boolean;
    violations: string[];
    severity: 'low' | 'medium' | 'high';
}

export function analyzeContent(content: string): SafetyAnalysis {
    const violations: string[] = [];

    // Check for inappropriate language
    if (containsInappropriateContent(content)) {
        violations.push('inappropriate_language');
    }

    // Check for excessive caps (shouting)
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.7 && content.length > 10) {
        violations.push('excessive_caps');
    }

    // Check for spam patterns (repeated characters)
    if (/(.)\1{10,}/.test(content)) {
        violations.push('spam_pattern');
    }

    // Check for URLs (potential phishing)
    if (/https?:\/\//.test(content)) {
        violations.push('contains_url');
    }

    // Determine severity
    let severity: 'low' | 'medium' | 'high' = 'low';
    if (violations.includes('inappropriate_language')) {
        severity = 'high';
    } else if (violations.length > 2) {
        severity = 'medium';
    }

    return {
        isSafe: violations.length === 0,
        violations,
        severity,
    };
}

/**
 * Track user behavior patterns
 */
interface BehaviorPattern {
    userId: string;
    messageCount: number;
    reportCount: number;
    lastActivity: Date;
    violations: string[];
}

const behaviorCache = new Map<string, BehaviorPattern>();

/**
 * Update behavior tracking for a user
 */
export function trackUserBehavior(
    userId: string,
    action: 'message' | 'report' | 'violation',
    violationType?: string
): void {
    let pattern = behaviorCache.get(userId);

    if (!pattern) {
        pattern = {
            userId,
            messageCount: 0,
            reportCount: 0,
            lastActivity: new Date(),
            violations: [],
        };
    }

    pattern.lastActivity = new Date();

    switch (action) {
        case 'message':
            pattern.messageCount++;
            break;
        case 'report':
            pattern.reportCount++;
            break;
        case 'violation':
            if (violationType) {
                pattern.violations.push(violationType);
            }
            break;
    }

    behaviorCache.set(userId, pattern);

    // Check for suspicious patterns
    checkSuspiciousActivity(pattern);
}

/**
 * Detect suspicious activity patterns
 */
function checkSuspiciousActivity(pattern: BehaviorPattern): void {
    const suspiciousPatterns: string[] = [];

    // Too many messages in short time (spam)
    if (pattern.messageCount > 50) {
        suspiciousPatterns.push('high_message_frequency');
    }

    // Too many violations
    if (pattern.violations.length > 5) {
        suspiciousPatterns.push('repeated_violations');
    }

    // Multiple reports against user
    if (pattern.reportCount > 3) {
        suspiciousPatterns.push('multiple_reports');
    }

    if (suspiciousPatterns.length > 0) {
        logger.warn('Suspicious activity detected', {
            userId: pattern.userId,
            patterns: suspiciousPatterns,
            messageCount: pattern.messageCount,
            violations: pattern.violations,
            reportCount: pattern.reportCount,
        });

        // In production, this would trigger admin notification or auto-action
    }
}

/**
 * Check if user should be auto-suspended
 */
export async function checkAutoSuspension(userId: string): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .from('user_suspensions')
            .select('total_reports, is_suspended, is_banned')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = not found
            logger.error('Failed to check suspension status', error);
            return false;
        }

        // Already suspended or banned
        if (data?.is_suspended || data?.is_banned) {
            return true;
        }

        // Auto-suspend if 5+ reports
        if (data && data.total_reports >= 5) {
            logger.warn('Auto-suspending user due to multiple reports', {
                userId,
                reportCount: data.total_reports,
            });
            return true;
        }

        return false;
    } catch (error) {
        logger.error('Error checking auto-suspension', error as Error, { userId });
        return false;
    }
}

/**
 * Filter and sanitize user input
 */
export function sanitizeInput(input: string): string {
    // Remove potentially dangerous characters
    let sanitized = input.trim();

    // Remove excessive whitespace
    sanitized = sanitized.replace(/\s+/g, ' ');

    // Limit length
    if (sanitized.length > 5000) {
        sanitized = sanitized.substring(0, 5000);
    }

    return sanitized;
}

/**
 * Validate profile information
 */
export function validateProfileInfo(info: {
    fullName?: string;
    bio?: string;
    skills?: string[];
}): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate name
    if (info.fullName) {
        if (info.fullName.length < 2) {
            errors.push('Name is too short');
        }
        if (info.fullName.length > 100) {
            errors.push('Name is too long');
        }
        if (containsInappropriateContent(info.fullName)) {
            errors.push('Name contains inappropriate content');
        }
    }

    // Validate bio
    if (info.bio) {
        if (info.bio.length > 1000) {
            errors.push('Bio is too long');
        }
        if (containsInappropriateContent(info.bio)) {
            errors.push('Bio contains inappropriate content');
        }
    }

    // Validate skills
    if (info.skills) {
        if (info.skills.length > 20) {
            errors.push('Too many skills listed');
        }
        info.skills.forEach(skill => {
            if (skill.length > 50) {
                errors.push('Skill name is too long');
            }
        });
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Get user's safety score (0-100)
 * Higher score = safer user
 */
export async function calculateSafetyScore(userId: string): Promise<number> {
    try {
        let score = 100;

        // Check reports against user
        const { data: suspension } = await supabase
            .from('user_suspensions')
            .select('total_reports, is_suspended, is_banned')
            .eq('user_id', userId)
            .single();

        if (suspension) {
            // Deduct points for reports
            score -= (suspension.total_reports * 10);

            // Heavy penalty for suspension/ban
            if (suspension.is_suspended) score -= 30;
            if (suspension.is_banned) score = 0;
        }

        // Check behavior pattern
        const pattern = behaviorCache.get(userId);
        if (pattern) {
            // Deduct for violations
            score -= (pattern.violations.length * 5);
        }

        // Ensure score is in valid range
        return Math.max(0, Math.min(100, score));
    } catch (error) {
        logger.error('Error calculating safety score', error as Error, { userId });
        return 50; // Default neutral score
    }
}
