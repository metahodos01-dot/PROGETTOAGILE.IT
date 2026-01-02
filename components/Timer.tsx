
import React, { useState, useEffect, useRef } from 'react';

const Timer: React.FC = () => {
  const [seconds, setSeconds] = useState(2700);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isActive && seconds > 0) {
      timerRef.current = window.setInterval(() => {
        setSeconds(s => s - 1);
      }, 1000);
    } else if (seconds === 0) {
      setIsActive(false);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, seconds]);

  const toggle = () => setIsActive(!isActive);
  const reset = () => {
    setIsActive(false);
    setSeconds(2700);
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-[#4B4E54] rounded-[32px] p-6 shadow-2xl border border-white/5 flex flex-col items-center">
      <div className="text-[10px] font-black text-[#FF5A79] uppercase tracking-[0.3em] mb-4">Timebox</div>
      <div className="text-6xl font-mono font-black text-white mb-6 tracking-tight flex items-center">
        {formatTime(seconds).split(':').map((part, i) => (
          <React.Fragment key={i}>
            <span className="w-20 text-center">{part}</span>
            {i === 0 && <span className="opacity-30 -mt-1">:</span>}
          </React.Fragment>
        ))}
      </div>
      <div className="flex space-x-2 w-full">
        <button 
          onClick={toggle}
          className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
            isActive 
              ? 'bg-amber-500 text-white hover:bg-amber-600' 
              : 'bg-[#FF5A79] text-white hover:bg-[#ff4065]'
          }`}
        >
          {isActive ? 'Pausa' : 'Avvia'}
        </button>
        <button 
          onClick={reset}
          className="bg-white/10 hover:bg-white/20 text-white px-5 py-4 rounded-2xl font-black text-xs uppercase transition-all"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default Timer;
