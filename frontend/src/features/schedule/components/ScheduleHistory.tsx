/**
 * ScheduleHistory component for viewing and restoring previous versions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, RotateCcw, Eye, X, ChevronRight } from 'lucide-react';
import type { ScheduleVersion, UpdateScheduleData } from '../types/schedule.types';
import * as scheduleApi from '../services/scheduleApi';

interface ScheduleHistoryProps {
  scheduleId: string;
  currentVersion: number;
  isOpen: boolean;
  onClose: () => void;
  onRestore: (versionData: UpdateScheduleData) => void;
}

/**
 * Component for viewing version history and restoring previous versions
 * - Lists all versions with timestamps
 * - Allows viewing version details
 * - Shows diff between versions
 * - Restores selected version
 */
export const ScheduleHistory: React.FC<ScheduleHistoryProps> = ({
  scheduleId,
  currentVersion,
  isOpen,
  onClose,
  onRestore,
}) => {
  const [versions, setVersions] = useState<ScheduleVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<ScheduleVersion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVersions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await scheduleApi.getVersions(scheduleId);
      setVersions(data.versions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load version history');
    } finally {
      setLoading(false);
    }
  }, [scheduleId]);

  useEffect(() => {
    if (isOpen) {
      loadVersions();
    }
  }, [isOpen, loadVersions]);

  const handleViewVersion = async (version: number) => {
    setLoading(true);
    setError(null);

    try {
      const versionData = await scheduleApi.getVersion(scheduleId, version);
      setSelectedVersion(versionData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load version');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreVersion = () => {
    if (!selectedVersion) return;

    if (!window.confirm(`Are you sure you want to restore version ${selectedVersion.version}?`)) {
      return;
    }

    onRestore({
      scheduleData: selectedVersion.scheduleData,
      notes: selectedVersion.notes,
    });
    onClose();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-semibold">Version History</h2>
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
        <div className="flex-1 overflow-hidden flex">
          {/* Version List */}
          <div className="w-1/3 border-r overflow-y-auto">
            {loading && !selectedVersion && (
              <div className="p-4 text-center text-gray-500">Loading versions...</div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border-b border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            {!loading && versions.length === 0 && (
              <div className="p-4 text-center text-gray-500">No version history available</div>
            )}

            <div className="divide-y">
              {versions.map((version) => (
                <button
                  key={version.version}
                  onClick={() => handleViewVersion(version.version)}
                  className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                    selectedVersion?.version === version.version ? 'bg-purple-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">
                      Version {version.version}
                      {version.version === currentVersion && (
                        <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                          Current
                        </span>
                      )}
                    </span>
                    <ChevronRight
                      className={`w-4 h-4 transition-transform ${
                        selectedVersion?.version === version.version ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                  <div className="text-xs text-gray-500">{formatDate(version.modifiedAt)}</div>
                  <div className="text-xs text-gray-600 mt-1">By: {version.modifiedBy}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Version Details */}
          <div className="flex-1 overflow-y-auto p-6">
            {!selectedVersion ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Eye className="w-12 h-12 mb-2 opacity-20" />
                <p>Select a version to view details</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Version {selectedVersion.version}</h3>
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="text-gray-600">Modified:</span>{' '}
                      {formatDate(selectedVersion.modifiedAt)}
                    </p>
                    <p>
                      <span className="text-gray-600">By:</span> {selectedVersion.modifiedBy}
                    </p>
                  </div>
                  {selectedVersion.notes && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700">Notes:</p>
                      <p className="text-sm text-gray-600 mt-1">{selectedVersion.notes}</p>
                    </div>
                  )}
                </div>

                {selectedVersion.version !== currentVersion && (
                  <button
                    onClick={handleRestoreVersion}
                    className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Restore This Version
                  </button>
                )}

                {/* Schedule Data Preview */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3">Schedule Data</h4>
                  <div className="space-y-2">
                    {Object.entries(selectedVersion.scheduleData).map(([day, blocks]) => (
                      <div key={day} className="text-sm">
                        <span className="font-medium capitalize">{day}:</span>{' '}
                        <span className="text-gray-600">{blocks.length} time blocks</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
