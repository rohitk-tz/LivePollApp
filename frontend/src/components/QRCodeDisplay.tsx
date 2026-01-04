import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';

interface QRCodeDisplayProps {
  sessionCode: string;
  sessionUrl: string;
  presenterName?: string;
}

/**
 * QR Code Display Component
 * Shows session code as QR code and text for easy participant access
 */
export default function QRCodeDisplay({ sessionCode, sessionUrl, presenterName }: QRCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(sessionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(sessionUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Session Code
        </h3>
        {presenterName && (
          <p className="text-sm text-gray-600">
            Hosted by {presenterName}
          </p>
        )}
      </div>

      {/* QR Code */}
      <div className="flex justify-center mb-6">
        <div className="bg-white p-4 rounded-lg border-4 border-blue-500 shadow-xl">
          <QRCodeSVG 
            value={sessionUrl} 
            size={200}
            level="M"
            includeMargin={false}
          />
        </div>
      </div>

      {/* Session Code Text */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center bg-gray-100 rounded-lg px-6 py-4 mb-4">
          <span className="text-4xl font-bold text-blue-600 tracking-widest font-mono">
            {sessionCode}
          </span>
        </div>
        
        <button
          onClick={handleCopyCode}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center mx-auto"
        >
          <svg 
            className="w-4 h-4 mr-1" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" 
            />
          </svg>
          {copied ? 'Copied!' : 'Copy Code'}
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <p className="text-sm text-gray-700 text-center mb-3">
          <strong>How participants can join:</strong>
        </p>
        <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
          <li>Scan the QR code with their phone camera</li>
          <li>Or visit the app and enter code: <span className="font-mono font-bold">{sessionCode}</span></li>
          <li>Enter their name and start voting!</li>
        </ol>
      </div>

      {/* Share URL */}
      <div className="mt-4">
        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200">
          <span className="text-xs text-gray-600 truncate flex-1 mr-2">
            {sessionUrl}
          </span>
          <button
            onClick={handleCopyUrl}
            className="flex-shrink-0 text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Copy URL
          </button>
        </div>
      </div>
    </div>
  );
}
