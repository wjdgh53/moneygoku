'use client';

import { useRouter } from 'next/navigation';
import { BulkBotCreationResponse } from '@/lib/types/autoBotCreator';

interface CreationSuccessModalProps {
  show: boolean;
  result: BulkBotCreationResponse | null;
  onClose: () => void;
}

export default function CreationSuccessModal({
  show,
  result,
  onClose
}: CreationSuccessModalProps) {
  const router = useRouter();

  if (!show || !result) return null;

  const handleViewBots = () => {
    router.push('/bots');
  };

  const handleCreateMore = () => {
    onClose();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-300">
        {/* Success Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-8 text-white text-center rounded-t-3xl">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-bold mb-2">Bots Created Successfully!</h2>
          <p className="text-green-100">
            {result.summary.successful} bot{result.summary.successful !== 1 ? 's' : ''} created
            {result.summary.failed > 0 && `, ${result.summary.failed} failed`}
          </p>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Created Bots List */}
          {result.created.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Successfully Created Bots
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {result.created.map((item) => (
                  <div
                    key={item.bot.id}
                    className="flex items-center justify-between p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                        <span className="text-white font-bold">{item.bot.symbol.charAt(0)}</span>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{item.bot.symbol}</div>
                        <div className="text-sm text-gray-600">{item.bot.name}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/bots/${item.bot.id}`)}
                      className="px-4 py-2 bg-white text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-colors text-sm font-medium opacity-0 group-hover:opacity-100"
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Failed Bots List */}
          {result.failed.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                Failed to Create
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {result.failed.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-red-50 rounded-xl"
                  >
                    <div>
                      <div className="font-semibold text-gray-900">{item.error.symbol}</div>
                      <div className="text-sm text-red-600">{item.error.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 mt-8">
            <button
              onClick={handleViewBots}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
            >
              View All Bots
            </button>
            <button
              onClick={handleCreateMore}
              className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
            >
              Create More
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full mt-4 text-gray-600 hover:text-gray-900 text-sm font-medium py-2"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
