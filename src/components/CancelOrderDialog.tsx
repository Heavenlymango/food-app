import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { X, XCircle } from 'lucide-react';

interface CancelOrderDialogProps {
  orderId: string;
  onConfirm: (orderId: string, reason: string) => void;
}

const PRESET_REASONS = [
  'Out of ingredients',
  'Kitchen equipment issue',
  'Too busy / Cannot fulfill in time',
  'Duplicate order',
  'Customer request',
  'Staff shortage',
];

export function CancelOrderDialog({ orderId, onConfirm }: CancelOrderDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const handleConfirm = () => {
    const reason = isCustom ? customReason : selectedReason;
    if (reason && reason.trim()) {
      onConfirm(orderId, reason);
      setIsOpen(false);
      // Reset state
      setSelectedReason(null);
      setCustomReason('');
      setIsCustom(false);
    } else {
      alert('Please select or enter a cancellation reason');
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    // Reset state
    setSelectedReason(null);
    setCustomReason('');
    setIsCustom(false);
  };

  return (
    <>
      {/* Cancel Button */}
      <Button
        size="sm"
        variant="destructive"
        onClick={() => setIsOpen(true)}
      >
        Cancel
      </Button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md bg-white p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-6 w-6 text-red-600" />
                <h2 className="text-xl">Cancel Order</h2>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Order #{orderId.slice(0, 8)}
            </p>

            <div className="space-y-3 mb-4">
              <p className="text-sm">Select a reason for cancellation:</p>
              
              {/* Preset Reasons */}
              <div className="space-y-2">
                {PRESET_REASONS.map((reason) => (
                  <button
                    key={reason}
                    onClick={() => {
                      setSelectedReason(reason);
                      setIsCustom(false);
                    }}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      selectedReason === reason && !isCustom
                        ? 'border-orange-600 bg-orange-50'
                        : 'border-gray-200 hover:border-orange-300 bg-white'
                    }`}
                  >
                    <span className="text-sm">{reason}</span>
                  </button>
                ))}
              </div>

              {/* Custom Reason Toggle */}
              <button
                onClick={() => {
                  setIsCustom(true);
                  setSelectedReason(null);
                }}
                className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                  isCustom
                    ? 'border-orange-600 bg-orange-50'
                    : 'border-gray-200 hover:border-orange-300 bg-white'
                }`}
              >
                <span className="text-sm">Other (write custom reason)</span>
              </button>

              {/* Custom Reason Input */}
              {isCustom && (
                <div className="mt-3">
                  <textarea
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Enter your reason for cancellation..."
                    className="w-full p-3 border-2 border-orange-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                    rows={3}
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Go Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirm}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Confirm Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}