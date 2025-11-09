/**
 * ShareModal component for generating and managing schedule share links
 */

import React, { useState, useEffect } from 'react';
import { Copy, Check, ExternalLink, Link2, LinkOff, X } from 'lucide-react';
import type { ScheduleShare } from '../types/schedule.types';
import * as scheduleApi from '../services/scheduleApi';

interface ShareModalProps {
  scheduleId: string;
  existingShare?: ScheduleShare;
  isOpen: boolean;
  onClose: () => void;
  onDisableShare?: () => void;
}

/**
 * Modal for managing schedule sharing
 * - Generates share links
 * - Copies link to clipboard
 * - Displays share status
 * - Allows disabling sharing
 */
export const ShareModal: React.FC<ShareModalProps> = ({
  scheduleId,
  existingShare,
  isOpen,
  onClose,
  onDisableShare,
}) => {
  const [shareData, setShareData] = useState<ScheduleShare | null>(existingShare || null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existingShare) {
      setShareData(existingShare);
    }
  }, [existingShare]);

  const handleGenerateLink = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await scheduleApi.shareSchedule(scheduleId);
      setShareData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate share link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!shareData?.shareLink) return;

    try {
      await navigator.clipboard.writeText(shareData.shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Failed to copy to clipboard');
    }
  };

  const handleDisableSharing = async () => {
    if (!window.confirm('Are you sure you want to stop sharing this schedule?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await scheduleApi.disableSharing(scheduleId);
      setShareData(null);
      onDisableShare?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable sharing');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenInNewTab = () => {
    if (shareData?.shareLink) {
      window.open(shareData.shareLink, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Share Schedule</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {!shareData ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">
                Generate a shareable link to allow others to view this schedule without logging in.
              </p>
              <button
                onClick={handleGenerateLink}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Generating...' : 'Generate Share Link'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Share Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareData.shareLink}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                  />
                  <button
                    onClick={handleCopyToClipboard}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span className="text-sm">Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleOpenInNewTab}
                  className="flex-1 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in New Tab
                </button>
                <button
                  onClick={handleDisableSharing}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  <LinkOff className="w-4 h-4" />
                  Stop Sharing
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
                <p className="font-medium mb-1">Sharing enabled</p>
                <p className="text-blue-700">
                  Anyone with this link can view your schedule. The link does not expire.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
