import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Save, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/services/api';
import { useWallet } from '@solana/wallet-adapter-react';

// Admin wallet addresses
const ADMIN_WALLETS = [
  '8eQUQeiqaroRzjLZoZtqnz8371X87WUTNdv5JRKbmLe2',
  'CJpMo2ANF1Q614szsj9jU7qkaWM8RMTTgF3AtKM7Lpw',
  '4Gw23RWwuam8DeRyjXxMNmccaH6f1u82jMDkVJxQ4SGR',
  'GJrjFmeqSvLwDdRJiQFoYXUiRQgF95bE9NddZfEsJQvz',
];

export function AdminSettings() {
  const queryClient = useQueryClient();
  const { publicKey, connected } = useWallet();

  const isAdmin = connected && publicKey && ADMIN_WALLETS.includes(publicKey.toBase58());

  const [formData, setFormData] = useState({
    ticketPrice: 10,
    platformFee: 0.01,
    maxEventsPerDay: 3,
    claimDelayHours: 3,
    maintenanceMode: false,
  });

  const { data } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => api.getPlatformSettings(),
  });

  const mutation = useMutation({
    mutationFn: (settings: typeof formData) => api.updatePlatformSettings(settings),
    onSuccess: () => {
      toast.success('Settings updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
    },
    onError: () => toast.error('Failed to update settings'),
  });

  // Update form when data loads from API
  if (data?.data && formData.ticketPrice !== data.data.ticketPrice) {
    setFormData({
      ticketPrice: data.data.ticketPrice ?? 10,
      platformFee: data.data.platformFee ?? 0.01,
      maxEventsPerDay: data.data.maxEventsPerDay ?? 3,
      claimDelayHours: data.data.claimDelayHours ?? 0,
      maintenanceMode: data.data.maintenanceMode ?? false,
    });
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-dark-400">Admin access required</p>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Platform Settings</h1>
        <p className="text-dark-400 mt-1">Configure global platform parameters</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Pricing Settings */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary-400" />
            Pricing Configuration
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">Default Ticket Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="1"
                max="10000"
                value={formData.ticketPrice}
                onChange={(e) => setFormData({ ...formData, ticketPrice: parseFloat(e.target.value) })}
                className="input"
              />
              <p className="text-xs text-dark-500 mt-1">
                Default price for new events
              </p>
            </div>

            <div>
              <label className="label">Platform Fee (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="50"
                value={formData.platformFee * 100}
                onChange={(e) => setFormData({ ...formData, platformFee: parseFloat(e.target.value) / 100 })}
                className="input"
              />
              <p className="text-xs text-dark-500 mt-1">
                Fee charged upfront per bet (currently {(formData.platformFee * 100).toFixed(1)}%)
              </p>
            </div>
          </div>
        </div>

        {/* Limits */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Limits & Restrictions</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">Max Events Per Day</label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.maxEventsPerDay}
                onChange={(e) => setFormData({ ...formData, maxEventsPerDay: parseInt(e.target.value) })}
                className="input"
              />
              <p className="text-xs text-dark-500 mt-1">
                Maximum new events that can be created daily
              </p>
            </div>

            <div>
              <label className="label">Claim Delay (Hours)</label>
              <input
                type="number"
                min="0"
                max="168"
                value={formData.claimDelayHours}
                onChange={(e) => setFormData({ ...formData, claimDelayHours: parseInt(e.target.value) })}
                className="input"
              />
              <p className="text-xs text-dark-500 mt-1">
                Time winners must wait before claiming payouts
              </p>
            </div>
          </div>
        </div>

        {/* Maintenance Mode */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Maintenance</h3>

          <div className="flex items-center justify-between p-4 bg-dark-800 rounded-lg">
            <div>
              <p className="font-medium text-white">Maintenance Mode</p>
              <p className="text-sm text-dark-400">
                Temporarily disable ticket purchases and claims
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.maintenanceMode}
                onChange={(e) => setFormData({ ...formData, maintenanceMode: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-dark-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
            </label>
          </div>

          {formData.maintenanceMode && (
            <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-sm text-yellow-400">
                ⚠️ Maintenance mode is enabled. Users cannot purchase tickets or claim winnings.
              </p>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn btn-primary"
          >
            <Save className="w-4 h-4" />
            {mutation.isPending ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
