/**
 * Report Modal Component
 * 
 * Allows users to report inappropriate behavior, spam, harassment, etc.
 * Part of the Trust & Safety system
 */

import React, { useState } from 'react';
import { X, AlertTriangle, Send } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { logger } from '../utils/logger';

interface Props {
    reportedUserId: string;
    reportedUserName: string;
    reporterId: string;
    onClose: () => void;
    onSubmit?: () => void;
}

const REPORT_CATEGORIES = [
    { value: 'harassment', label: 'Harassment or Bullying', description: 'Threatening, intimidating, or abusive behavior' },
    { value: 'spam', label: 'Spam or Scam', description: 'Unwanted promotional content or fraudulent activity' },
    { value: 'inappropriate_content', label: 'Inappropriate Content', description: 'Offensive, explicit, or disturbing material' },
    { value: 'fake_profile', label: 'Fake Profile', description: 'Impersonation or misleading information' },
    { value: 'other', label: 'Other', description: 'Something else that violates community guidelines' },
];

export const ReportModal: React.FC<Props> = ({
    reportedUserId,
    reportedUserName,
    reporterId,
    onClose,
    onSubmit,
}) => {
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!category) {
            setError('Please select a category');
            return;
        }

        if (!description.trim()) {
            setError('Please provide a description');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            logger.info('Submitting report', {
                reportedUserId,
                reporterId,
                category,
            });

            const { error: insertError } = await supabase
                .from('reports')
                .insert({
                    reporter_id: reporterId,
                    reported_user_id: reportedUserId,
                    category,
                    description: description.trim(),
                    status: 'pending',
                });

            if (insertError) {
                throw insertError;
            }

            logger.info('Report submitted successfully');
            onSubmit?.();
            onClose();
        } catch (err) {
            logger.error('Failed to submit report', err as Error);
            setError('Failed to submit report. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                Report User
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Report {reportedUserName}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Category Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            What's the issue?
                        </label>
                        <div className="space-y-2">
                            {REPORT_CATEGORIES.map((cat) => (
                                <label
                                    key={cat.value}
                                    className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${category === cat.value
                                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="category"
                                        value={cat.value}
                                        checked={category === cat.value}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="mt-1"
                                    />
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-900 dark:text-white">
                                            {cat.label}
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            {cat.description}
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Additional Details
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Please provide specific details about what happened..."
                            rows={4}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                            required
                        />
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            Your report will be reviewed by our moderation team. False reports may result in account restrictions.
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all font-medium"
                            disabled={submitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !category || !description.trim()}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg hover:from-red-700 hover:to-orange-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    Submit Report
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
