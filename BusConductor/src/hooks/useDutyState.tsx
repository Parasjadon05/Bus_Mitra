import { useState, useEffect } from 'react';

interface DutyState {
  isOnDuty: boolean;
  selectedBusId: string | null;
  dutyStartTime: number | null;
  lastLocationUpdate: number | null;
}

const DUTY_STATE_KEY = 'driver_duty_state';

export const useDutyState = () => {
  const [dutyState, setDutyState] = useState<DutyState>({
    isOnDuty: false,
    selectedBusId: null,
    dutyStartTime: null,
    lastLocationUpdate: null
  });

  // Load duty state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem(DUTY_STATE_KEY);
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        setDutyState(parsedState);
        console.log('🔄 DUTY STATE: Restored from localStorage:', parsedState);
      } catch (error) {
        console.error('Error parsing saved duty state:', error);
        // Clear corrupted data
        localStorage.removeItem(DUTY_STATE_KEY);
      }
    }
  }, []);

  // Save duty state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(DUTY_STATE_KEY, JSON.stringify(dutyState));
    console.log('💾 DUTY STATE: Saved to localStorage:', dutyState);
  }, [dutyState]);

  const startDuty = (busId: string) => {
    const newState: DutyState = {
      isOnDuty: true,
      selectedBusId: busId,
      dutyStartTime: Date.now(),
      lastLocationUpdate: null
    };
    setDutyState(newState);
    console.log('🚀 DUTY STATE: Started duty for bus:', busId);
  };

  const endDuty = () => {
    const newState: DutyState = {
      isOnDuty: false,
      selectedBusId: null,
      dutyStartTime: null,
      lastLocationUpdate: null
    };
    setDutyState(newState);
    console.log('🛑 DUTY STATE: Ended duty');
  };

  const updateLocationTimestamp = () => {
    setDutyState(prev => ({
      ...prev,
      lastLocationUpdate: Date.now()
    }));
  };

  const clearDutyState = () => {
    localStorage.removeItem(DUTY_STATE_KEY);
    setDutyState({
      isOnDuty: false,
      selectedBusId: null,
      dutyStartTime: null,
      lastLocationUpdate: null
    });
    console.log('🗑️ DUTY STATE: Cleared all duty data');
  };

  return {
    dutyState,
    startDuty,
    endDuty,
    updateLocationTimestamp,
    clearDutyState
  };
};



