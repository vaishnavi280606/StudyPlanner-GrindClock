import React, { useState } from 'react';

interface ReviewPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, review: string) => Promise<void>;
  mentorName?: string;
}

export const ReviewPopup: React.FC<ReviewPopupProps> = ({ isOpen, onClose, onSubmit, mentorName }) => {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleStarClick = (star: number) => {
    setRating(star);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Please select a rating.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit(rating, review);
      setReview('');
      setRating(0);
      onClose();
    } catch (err) {
      setError('Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-2">Rate your Mentor</h2>
        {mentorName && <p className="mb-2 text-slate-600">{mentorName}</p>}
        <form onSubmit={handleSubmit}>
          <div className="flex items-center gap-1 mb-4">
            {[1,2,3,4,5].map(star => (
              <button
                key={star}
                type="button"
                className={star <= rating ? 'text-amber-500' : 'text-slate-300'}
                onClick={() => handleStarClick(star)}
                aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20" width={28} height={28}>
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.38-2.454a1 1 0 00-1.175 0l-3.38 2.454c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z" />
                </svg>
              </button>
            ))}
          </div>
          <textarea
            className="w-full border rounded-lg p-2 mb-3 text-slate-700"
            rows={3}
            placeholder="Write a review (optional)"
            value={review}
            onChange={e => setReview(e.target.value)}
            disabled={submitting}
          />
          {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-amber-500 text-white font-bold hover:bg-amber-600" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
