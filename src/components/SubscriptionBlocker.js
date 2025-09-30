import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { checkUserAccess, getSubscriptionStatusMessage } from '../lib/subscriptionUtils';
import { toast } from 'react-toastify';

export default function SubscriptionBlocker({ children }) {
  const [accessStatus, setAccessStatus] = useState('loading');
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setAccessStatus('blocked');
        return;
      }

      const result = await checkUserAccess(user.id);
      setAccessStatus(result.status);
      setSubscriptionInfo(result.subscriptionInfo);
    } catch (error) {
      console.error('Erro ao verificar acesso:', error);
      setAccessStatus('blocked');
    }
  };

  if (accessStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (accessStatus === 'blocked') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="mt-2 text-lg font-medium text-gray-900">Acesso Bloqueado</h3>
            <p className="mt-1 text-sm text-gray-500">
              {subscriptionInfo ? getSubscriptionStatusMessage(subscriptionInfo) : 'Sua assinatura expirou.'}
            </p>
            <div className="mt-6">
              <button
                onClick={() => window.location.href = '/dashboard/subscriptions'}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Assinar Agora
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

// Hook para verificar status da assinatura
export function useSubscriptionCheck() {
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      const result = await checkUserAccess(user.id);
      setSubscriptionInfo(result.subscriptionInfo);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao verificar assinatura:', error);
      setLoading(false);
    }
  };

  return { subscriptionInfo, loading, refetch: checkSubscription };
}