import React, { useState, useEffect, useRef } from 'react';
import { TwoWayAudioMessage } from '../types';
import {
  Mic,
  Radio,
  Volume2,
  VolumeX,
  Send,
  Sparkles,
  Check,
  HardHat,
  ShieldAlert,
  Wifi,
  Waves,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

interface TwoWayAudioIntercomProps {
  roverConnected: boolean;
  targetMinerName?: string;
  targetSector?: string;
  isDemonstrationActive?: boolean;
}

export const TwoWayAudioIntercom: React.FC<TwoWayAudioIntercomProps> = ({
  roverConnected,
  targetMinerName = 'Rajesh Murmu (Continuous Miner Operator)',
  targetSector = 'Sub-level 3 / Drift B-4 (Pillar 12)',
  isDemonstrationActive = false,
}) => {
  const [isPushToTalkActive, setIsPushToTalkActive] = useState(false);
  const [customRescuerText, setCustomRescuerText] = useState('');
  const [messages, setMessages] = useState<TwoWayAudioMessage[]>([
    {
      id: 'msg-1',
      sender: 'surface_rescuer',
      text: 'Surface Control to Sentinel 1: Audio channel open. Searching for personnel in Sub-level 3.',
      timestamp: '10:48:12',
    },
    {
      id: 'msg-2',
      sender: 'trapped_miner',
      text: 'Mayday! This is Rajesh at Pillar 12. Roof delamination behind us, we are inside the shored refuge alcove!',
      timestamp: '10:49:05',
    },
    {
      id: 'msg-3',
      sender: 'surface_rescuer',
      text: 'Rajesh, we see your thermal signature on SentinelRover camera. Stay inside the alcove. Shoring crew dispatched via Shaft 2.',
      timestamp: '10:49:30',
    },
  ]);

  const [waveformBars, setWaveformBars] = useState<number[]>([15, 25, 40, 65, 30, 20, 50, 80, 45, 20, 30, 60]);

  // Animate audio waveform when transmitting
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPushToTalkActive) {
      interval = setInterval(() => {
        setWaveformBars((prev) =>
          prev.map(() => Math.floor(Math.random() * 85) + 15)
        );
      }, 100);
    } else {
      setWaveformBars([10, 15, 20, 15, 12, 10, 18, 22, 15, 12, 10, 14]);
    }
    return () => clearInterval(interval);
  }, [isPushToTalkActive]);

  const handleStartPTT = () => {
    setIsPushToTalkActive(true);
    soundEngine.playRadioSquelch();
  };

  const handleStopPTT = () => {
    setIsPushToTalkActive(false);
    soundEngine.playRadioSquelch();

    if (customRescuerText.trim()) {
      const newMsg: TwoWayAudioMessage = {
        id: `msg-${Date.now()}`,
        sender: 'surface_rescuer',
        text: customRescuerText.trim(),
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, newMsg]);
      setCustomRescuerText('');

      // Auto-generate realistic miner response after 2.5s
      setTimeout(() => {
        soundEngine.playRadioSquelch();
        const minerReplies = [
          'Copy Surface Control! Airflow is low, we have oxygen self-rescuers equipped. Awaiting rover instructions.',
          'SentinelRover speaker is loud and clear. Roof is holding in the alcove. Methane meter reading 1.8%.',
          'Understood. We see the rover LED headlights. Standing by for extraction team.',
        ];
        const randomReply = minerReplies[Math.floor(Math.random() * minerReplies.length)];
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now() + 1}`,
            sender: 'trapped_miner',
            text: randomReply,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      }, 2500);
    }
  };

  const handleSendQuickDirective = (presetText: string) => {
    soundEngine.playRadioSquelch();
    const newMsg: TwoWayAudioMessage = {
      id: `msg-${Date.now()}`,
      sender: 'surface_rescuer',
      text: presetText,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, newMsg]);

    setTimeout(() => {
      soundEngine.playRadioSquelch();
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          sender: 'trapped_miner',
          text: 'Acknowledged Surface Control! Following safety procedure.',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    }, 2000);
  };

  return (
    <div
      id="two-way-audio-intercom-card"
      className="bg-[#0E0E0E]/95 backdrop-blur-md rounded-xl p-4 border border-[#262626] shadow-2xl flex flex-col gap-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#222222]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
            <Radio className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#EDEDED] flex items-center gap-1.5">
              <span>SentinelRover Two-Way Push-To-Talk Voice Intercom</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Opus QoS Priority Channel
              </span>
            </h4>
            <p className="text-[10px] text-[#888888]">
              Target: <strong className="text-amber-300">{targetMinerName}</strong> ({targetSector})
            </p>
          </div>
        </div>

        {/* Live Audio Status */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Full-Duplex Link Active</span>
          </span>
        </div>
      </div>

      {/* Message Transcript Box */}
      <div className="bg-[#080808] p-3 rounded-lg border border-[#1C1C1C] max-h-48 overflow-y-auto space-y-2 text-xs">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`p-2.5 rounded-lg border ${
              m.sender === 'surface_rescuer'
                ? 'bg-[#121820] border-cyan-900/50 text-[#D8E6F3] ml-4'
                : 'bg-[#20150E] border-amber-900/50 text-[#F5DECE] mr-4'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-mono mb-1">
              <span
                className={`font-bold flex items-center gap-1 ${
                  m.sender === 'surface_rescuer' ? 'text-cyan-400' : 'text-amber-400'
                }`}
              >
                {m.sender === 'surface_rescuer' ? <Radio className="w-3 h-3" /> : <HardHat className="w-3 h-3" />}
                <span>{m.sender === 'surface_rescuer' ? 'Surface Rescue Commander' : 'Trapped Miner (Rajesh)'}</span>
              </span>
              <span className="text-[#666666]">{m.timestamp}</span>
            </div>
            <p className="leading-relaxed font-sans">{m.text}</p>
          </div>
        ))}
      </div>

      {/* Audio Waveform & Push-to-Talk Button Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center pt-1">
        {/* Waveform visualizer */}
        <div className="sm:col-span-4 bg-[#121212] px-3 py-2 rounded-lg border border-[#222222] flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Waves className={`w-3.5 h-3.5 ${isPushToTalkActive ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`} />
            <span className="text-[10px] font-mono text-[#888888]">
              {isPushToTalkActive ? 'TRANSMITTING...' : 'MESH AUDIO RX'}
            </span>
          </div>
          <div className="flex items-end gap-0.5 h-6">
            {waveformBars.map((h, i) => (
              <div
                key={i}
                style={{ height: `${h}%` }}
                className={`w-1 rounded-sm transition-all duration-75 ${
                  isPushToTalkActive ? 'bg-red-500 shadow-sm shadow-red-500/50' : 'bg-cyan-500/70'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Big Push-To-Talk Button */}
        <div className="sm:col-span-8 flex items-center gap-2">
          <button
            id="btn-push-to-talk"
            onMouseDown={handleStartPTT}
            onMouseUp={handleStopPTT}
            onTouchStart={handleStartPTT}
            onTouchEnd={handleStopPTT}
            className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all select-none shadow-lg cursor-pointer ${
              isPushToTalkActive
                ? 'bg-red-600 text-white animate-pulse ring-2 ring-red-400 scale-[0.98]'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-950/50'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>{isPushToTalkActive ? 'HOLD TO TRANSMIT (LIVE MIC ON)' : 'PUSH-TO-TALK (HOLD TO SPEAK)'}</span>
          </button>
        </div>
      </div>

      {/* Quick Directives & Text Dispatch */}
      <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[#1C1C1C]">
        <span className="text-[10px] text-[#888888] font-mono">Quick Directives:</span>
        <button
          onClick={() => handleSendQuickDirective('Remain in the shored refuge alcove. Rescuers entering.')}
          className="px-2 py-1 rounded bg-[#161616] hover:bg-[#202020] text-[#CCCCCC] hover:text-cyan-300 border border-[#242424] text-[10px] font-medium transition-colors cursor-pointer"
        >
          "Remain in Refuge Alcove"
        </button>
        <button
          onClick={() => handleSendQuickDirective('Equip SCSR (Self-Contained Self-Rescuer) oxygen units immediately.')}
          className="px-2 py-1 rounded bg-[#161616] hover:bg-[#202020] text-[#CCCCCC] hover:text-amber-300 border border-[#242424] text-[10px] font-medium transition-colors cursor-pointer"
        >
          "Equip SCSR Oxygen"
        </button>
        <button
          onClick={() => handleSendQuickDirective('SentinelRover is dispensing emergency electrolyte fluid & radio beacon.')}
          className="px-2 py-1 rounded bg-[#161616] hover:bg-[#202020] text-[#CCCCCC] hover:text-emerald-300 border border-[#242424] text-[10px] font-medium transition-colors cursor-pointer"
        >
          "Dispense Supplies"
        </button>
      </div>
    </div>
  );
};
