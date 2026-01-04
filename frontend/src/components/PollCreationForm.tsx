import { useState } from 'react';
import { pollApi } from '../services/api';
import { ApiError, isApiError, ApiErrorCode } from '../services/errors';
import type { CreatePollRequest } from '../types';

interface PollCreationFormProps {
  sessionId: string;
  onPollCreated?: (pollId: string) => void;
  onError?: (error: ApiError) => void;
}

interface PollOption {
  id: string; // Temporary client-side ID
  text: string;
}

export default function PollCreationForm({ sessionId, onPollCreated, onError }: PollCreationFormProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<PollOption[]>([
    { id: '1', text: '' },
    { id: '2', text: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, { id: Date.now().toString(), text: '' }]);
    }
  };

  const removeOption = (id: string) => {
    if (options.length > 2) {
      setOptions(options.filter(opt => opt.id !== id));
    }
  };

  const updateOption = (id: string, text: string) => {
    setOptions(options.map(opt => opt.id === id ? { ...opt, text } : opt));
  };

  const validateForm = (): string | null => {
    if (!question.trim()) {
      return 'Poll question is required';
    }
    if (question.length > 500) {
      return 'Question must be 500 characters or less';
    }
    
    const filledOptions = options.filter(opt => opt.text.trim());
    if (filledOptions.length < 2) {
      return 'At least 2 options are required';
    }
    
    for (const opt of filledOptions) {
      if (opt.text.length > 200) {
        return 'Options must be 200 characters or less';
      }
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      // Filter out empty options and format for API
      const filledOptions = options.filter(opt => opt.text.trim());
      const request: CreatePollRequest = {
        question: question.trim(),
        options: filledOptions.map((opt, index) => ({
          text: opt.text.trim(),
          order: index + 1,
        })),
      };

      const response = await pollApi.createPoll(sessionId, request);
      
      // Success
      setSuccess(true);
      setQuestion('');
      setOptions([
        { id: '1', text: '' },
        { id: '2', text: '' },
      ]);
      
      if (onPollCreated) {
        onPollCreated(response.pollId);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      // Handle API errors
      if (isApiError(err)) {
        const apiError = err as ApiError;
        
        switch (apiError.code) {
          case ApiErrorCode.SESSION_NOT_FOUND:
            setError('Session not found. Please refresh the page.');
            break;
          case ApiErrorCode.INVALID_STATE:
            setError('Session is not active. Cannot create polls.');
            break;
          case ApiErrorCode.INSUFFICIENT_OPTIONS:
            setError('At least 2 options are required.');
            break;
          case ApiErrorCode.TOO_MANY_OPTIONS:
            setError('Maximum 10 options allowed.');
            break;
          case ApiErrorCode.INVALID_PAYLOAD:
            setError('Invalid poll data. Please check your input.');
            break;
          case ApiErrorCode.UNAUTHORIZED:
            setError('You are not authorized to create polls for this session.');
            break;
          default:
            setError(apiError.getUserMessage());
        }
        
        if (onError) {
          onError(apiError);
        }
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create poll. Please try again.';
        setError(errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Create New Poll</h2>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border-2 border-green-500 text-green-800 px-4 py-3 rounded-lg mb-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold">Poll created successfully!</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-2 border-red-500 text-red-800 px-4 py-3 rounded-lg mb-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold">{error}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Question Input */}
        <div>
          <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-2">
            Poll Question <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Enter your poll question..."
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            maxLength={500}
            disabled={submitting}
          />
          <p className="text-sm text-gray-500 mt-1">{question.length}/500 characters</p>
        </div>

        {/* Options */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Answer Options <span className="text-red-500">*</span> (2-10 options)
          </label>
          <div className="space-y-3">
            {options.map((option, index) => (
              <div key={option.id} className="flex items-center space-x-2">
                <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
                  {String.fromCharCode(65 + index)}
                </span>
                <input
                  type="text"
                  value={option.text}
                  onChange={(e) => updateOption(option.id, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  maxLength={200}
                  disabled={submitting}
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(option.id)}
                    className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    disabled={submitting}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add Option Button */}
          {options.length < 10 && (
            <button
              type="button"
              onClick={addOption}
              className="mt-3 flex items-center px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
              disabled={submitting}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Option
            </button>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating Poll...
            </span>
          ) : (
            'Create Poll'
          )}
        </button>
      </form>
    </div>
  );
}
