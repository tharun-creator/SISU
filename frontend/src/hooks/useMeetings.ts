import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';
import { Meeting } from '../types/meeting';

export const useMeetings = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data: any = await client.get('/meetings');
      setMeetings(data);
      
      const statsData: any = await client.get('/meetings/stats');
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load meetings');
    } finally {
      setLoading(false);
    }
  }, []);

  const createMeeting = async (payload: any) => {
    const res: any = await client.post('/meetings', payload);
    await fetchMeetings();
    return res;
  };

  const cancelMeeting = async (id: number) => {
    await client.delete(`/meetings/${id}`);
    await fetchMeetings();
  };

  const rescheduleMeeting = async (id: number, payload: any) => {
    const res: any = await client.put(`/meetings/${id}/reschedule`, payload);
    await fetchMeetings();
    return res;
  };

  const confirmReschedule = async (id: number) => {
    const res: any = await client.put(`/meetings/${id}/confirm-reschedule`);
    await fetchMeetings();
    return res;
  };

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  return {
    meetings,
    stats,
    loading,
    error,
    refresh: fetchMeetings,
    createMeeting,
    cancelMeeting,
    rescheduleMeeting,
    confirmReschedule
  };
};
export default useMeetings;
