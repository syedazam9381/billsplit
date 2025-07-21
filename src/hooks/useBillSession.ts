import { useState, useEffect } from 'react';
import { apiClient, type BillSession, type BillItem, type Friend } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export function useBillSession(initialSessionId?: string) {
  const [session, setSession] = useState<BillSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Create a new session
  const createSession = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.createBillSession();
      if (response.success && response.data) {
        setSession(response.data);
        toast({
          title: "Session created",
          description: "New bill session started successfully.",
        });
        return response.data;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create session';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load existing session
  const loadSession = async (sessionId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.getBillSession(sessionId);
      if (response.success && response.data) {
        setSession(response.data);
        return response.data;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load session';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Update session items
  const updateItems = async (items: BillItem[]) => {
    if (!session) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.updateSessionItems(session.id, items);
      if (response.success && response.data) {
        setSession(response.data);
        return response.data;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update items';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Update session friends
  const updateFriends = async (friends: Friend[]) => {
    if (!session) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.updateSessionFriends(session.id, friends);
      if (response.success && response.data) {
        setSession(response.data);
        return response.data;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update friends';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate bill split
  const calculateSplit = async () => {
    if (!session) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.calculateBillSplit(session.id);
      if (response.success && response.data) {
        setSession(response.data.session);
        toast({
          title: "Split calculated",
          description: "Bill split has been calculated successfully.",
        });
        return response.data;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to calculate split';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Save final bill
  const saveBill = async () => {
    if (!session) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.saveBill({
        items: session.items,
        friends: session.friends,
        sessionId: session.id,
      });
      
      if (response.success) {
        toast({
          title: "Bill saved",
          description: "Your bill has been saved successfully.",
        });
        return response.data;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save bill';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Initialize session on mount
  useEffect(() => {
    if (initialSessionId) {
      loadSession(initialSessionId);
    }
  }, [initialSessionId]);

  return {
    session,
    loading,
    error,
    createSession,
    loadSession,
    updateItems,
    updateFriends,
    calculateSplit,
    saveBill,
  };
}