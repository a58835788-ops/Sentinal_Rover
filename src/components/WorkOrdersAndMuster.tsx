import React, { useState } from 'react';
import { WorkOrder, MinerMusterRecord } from '../types';
import {
  Wrench,
  Users,
  ShieldCheck,
  Plus,
  AlertOctagon,
  Clock,
  CheckCircle2,
  HardHat,
  Lock,
  Heart,
  Radio,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

interface WorkOrdersAndMusterProps {
  workOrders: WorkOrder[];
  musterList: MinerMusterRecord[];
  onUpdateWorkOrderStatus: (id: string, newStatus: 'pending' | 'in_progress' | 'completed') => void;
  onAddWorkOrder: (order: WorkOrder) => void;
}

export const WorkOrdersAndMuster: React.FC<WorkOrdersAndMusterProps> = ({
  workOrders,
  musterList,
  onUpdateWorkOrderStatus,
  onAddWorkOrder,
}) => {
  const [activeTab, setActiveTab] = useState<'work_orders' | 'muster'>('work_orders');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State for new Work Order
  const [newTitle, setNewTitle] = useState('');
  const [newLevel, setNewLevel] = useState(3);
  const [newLocation, setNewLocation] = useState('Sub-level 3 (Drift B-12)');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high' | 'emergency'>('high');
  const [newTeam, setNewTeam] = useState('Shoring Crew Bravo');
  const [newType, setNewType] = useState<WorkOrder['type']>('emergency_shoring');

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newOrder: WorkOrder = {
      id: `WO-${Date.now().toString().slice(-4)}`,
      title: newTitle,
      level: newLevel,
      location: newLocation,
      priority: newPriority,
      assignedTeam: newTeam,
      techniciansCount: 3,
      type: newType,
      status: 'in_progress',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      requiredGear: ['Resin Bolter', 'Hydraulic Jack (40T)', 'Self-Contained Breather (SCSR)'],
      estimatedTimeMin: 45,
      safetyLockout: true,
    };

    onAddWorkOrder(newOrder);
    soundEngine.playRadioSquelch();
    setShowAddModal(false);
    setNewTitle('');
  };

  const getPriorityBadge = (priority: WorkOrder['priority']) => {
    switch (priority) {
      case 'emergency':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
            EMERGENCY PRIORITY
          </span>
        );
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            HIGH
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300">
            LOW
          </span>
        );
    }
  };

  return (
    <div
      id="work-orders-and-muster-card"
      className="bg-[#0E0E0E]/95 backdrop-blur-md rounded-xl p-4 border border-[#262626] shadow-xl"
    >
      {/* Tab Switcher & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#222222]">
        <div className="flex items-center gap-2">
          <button
            id="tab-work-orders"
            onClick={() => setActiveTab('work_orders')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'work_orders'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'bg-[#141414] text-[#888888] hover:text-[#EDEDED] border border-[#222222]'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Emergency Shoring & Technician Work Orders ({workOrders.length})</span>
          </button>

          <button
            id="tab-crew-muster"
            onClick={() => setActiveTab('muster')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'muster'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'bg-[#141414] text-[#888888] hover:text-[#EDEDED] border border-[#222222]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Crew RFID Muster Station ({musterList.length})</span>
          </button>
        </div>

        {activeTab === 'work_orders' && (
          <button
            id="btn-new-work-order"
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Dispatch Emergency Work Order</span>
          </button>
        )}
      </div>

      {/* 1. Work Orders Tab */}
      {activeTab === 'work_orders' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {workOrders.map((wo) => (
            <div
              key={wo.id}
              className="p-3.5 rounded-xl bg-[#121212] border border-[#222222] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-cyan-400">{wo.id}</span>
                    <span className="font-semibold text-[#EDEDED] text-xs">{wo.title}</span>
                  </div>
                  {getPriorityBadge(wo.priority)}
                </div>

                <div className="text-[11px] text-[#888888] mb-2 flex items-center gap-2">
                  <span>Location: <strong className="text-[#CCCCCC]">{wo.location}</strong></span>
                  <span>•</span>
                  <span>Team: <strong className="text-[#CCCCCC]">{wo.assignedTeam}</strong></span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {wo.requiredGear.map((gear, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-[#0A0A0A] text-[#CCCCCC] border border-[#1E1E1E] text-[10px] font-mono"
                    >
                      {gear}
                    </span>
                  ))}
                  {wo.safetyLockout && (
                    <span className="px-2 py-0.5 rounded bg-red-950/40 text-red-300 border border-red-900/60 text-[10px] font-mono flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      LOTO ACTIVE
                    </span>
                  )}
                </div>
              </div>

              {/* Status footer & Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-[#1E1E1E] text-xs">
                <span className="text-[11px] text-[#777777] font-mono">
                  ETA: {wo.estimatedTimeMin} min • Created: {wo.createdAt}
                </span>

                <div className="flex items-center gap-1.5">
                  {wo.status !== 'completed' ? (
                    <button
                      onClick={() => {
                        soundEngine.playRadioSquelch();
                        onUpdateWorkOrderStatus(wo.id, 'completed');
                      }}
                      className="px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Mark Complete</span>
                    </button>
                  ) : (
                    <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Completed & Verified
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. Crew RFID Muster Station Tab */}
      {activeTab === 'muster' && (
        <div className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="bg-[#121212] p-3 rounded-xl border border-[#222222]">
              <span className="text-[10px] text-[#888888] uppercase font-semibold block">Total Subterranean Miners</span>
              <span className="text-xl font-bold font-mono text-[#EDEDED] mt-1 block">
                {musterList.length} Personnel
              </span>
            </div>
            <div className="bg-[#121212] p-3 rounded-xl border border-[#222222]">
              <span className="text-[10px] text-[#888888] uppercase font-semibold block">In Safe Refuge Bay</span>
              <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
                {musterList.filter((m) => m.status === 'in_refuge_bay' || m.status === 'safe').length} Logged
              </span>
            </div>
            <div className="bg-[#121212] p-3 rounded-xl border border-[#222222]">
              <span className="text-[10px] text-[#888888] uppercase font-semibold block">Active Evacuation Trajectory</span>
              <span className="text-xl font-bold font-mono text-amber-400 mt-1 block">
                {musterList.filter((m) => m.status === 'evacuating').length} Personnel
              </span>
            </div>
            <div className="bg-[#121212] p-3 rounded-xl border border-[#222222]">
              <span className="text-[10px] text-[#888888] uppercase font-semibold block">Telemetry Heart Rate Average</span>
              <span className="text-xl font-bold font-mono text-cyan-400 mt-1 block">
                84 BPM (Normal)
              </span>
            </div>
          </div>

          {/* Muster Table */}
          <div className="overflow-x-auto rounded-xl border border-[#222222]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#121212] text-[#888888] font-mono uppercase text-[10px]">
                <tr>
                  <th className="p-2.5">Miner Name</th>
                  <th className="p-2.5">Role</th>
                  <th className="p-2.5">Descent Level</th>
                  <th className="p-2.5">Sector</th>
                  <th className="p-2.5">RFID Beacon Tag</th>
                  <th className="p-2.5">Heart Rate</th>
                  <th className="p-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E1E1E] bg-[#0A0A0A]/70">
                {musterList.map((miner) => (
                  <tr key={miner.id} className="hover:bg-[#141414] transition-colors">
                    <td className="p-2.5 font-semibold text-[#EDEDED] flex items-center gap-2">
                      <HardHat className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{miner.name}</span>
                    </td>
                    <td className="p-2.5 text-[#CCCCCC]">{miner.role}</td>
                    <td className="p-2.5 font-mono text-amber-300 font-semibold">Sub-level {miner.level}</td>
                    <td className="p-2.5 text-[#CCCCCC]">{miner.sector}</td>
                    <td className="p-2.5 font-mono text-[#888888]">{miner.rfidTag}</td>
                    <td className="p-2.5 font-mono text-[#EDEDED]">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3 text-red-500 fill-red-500 animate-pulse" />
                        {miner.heartRateBpm} BPM
                      </span>
                    </td>
                    <td className="p-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          miner.status === 'in_refuge_bay'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : miner.status === 'evacuating'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                            : 'bg-[#181818] text-[#888888] border border-[#242424]'
                        }`}
                      >
                        {miner.status.toUpperCase().replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal for Creating Emergency Work Order */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl p-5 max-w-md w-full shadow-2xl">
            <h3 className="text-sm font-semibold text-[#EDEDED] mb-3 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-cyan-400" />
              <span>Issue Subterranean Shoring & Safety Work Order</span>
            </h3>

            <form onSubmit={handleCreateOrder} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#888888] mb-1">Work Order Directive / Title:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Reinforce Shear Heading with 40T Hydraulic Props"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#141414] border border-[#2A2A2A] text-[#EDEDED] focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#888888] mb-1">Descent Sub-Level:</label>
                  <select
                    value={newLevel}
                    onChange={(e) => setNewLevel(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#141414] border border-[#2A2A2A] text-[#CCCCCC] focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value={1}>Sub-level 1 (-240m)</option>
                    <option value={2}>Sub-level 2 (-480m)</option>
                    <option value={3}>Sub-level 3 (-720m)</option>
                    <option value={4}>Sub-level 4 (-960m)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#888888] mb-1">Priority Level:</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as WorkOrder['priority'])}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#141414] border border-[#2A2A2A] text-[#CCCCCC] focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="emergency">Emergency</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#888888] mb-1">Location / Drift Sector:</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#141414] border border-[#2A2A2A] text-[#EDEDED] focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#222222]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#181818] hover:bg-[#222222] text-[#CCCCCC] border border-[#2A2A2A] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow cursor-pointer"
                >
                  Dispatch to Crew
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
