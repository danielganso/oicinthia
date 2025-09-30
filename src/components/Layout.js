import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function Layout({ children, title = 'Dashboard' }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const router = useRouter();

  useEffect(() => {
    // Verificar se o usuário está autenticado
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }
      
      setUser(session.user);

      // Buscar informações da assinatura
      const { data: subscriptionData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('owner_user_id', session.user.id)
        .single();

      setSubscriptionInfo(subscriptionData);
      setLoading(false);
    };
    
    checkUser();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar para desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 bg-blue-700">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <span className="text-white text-2xl font-bold">CinthIA</span>
              </div>
              <nav className="mt-5 flex-1 px-2 space-y-1">
                <Link href="/dashboard" className={`${
                  router.pathname === '/dashboard' ? 'bg-blue-800 text-white' : 'text-white hover:bg-blue-600'
                } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}>
                  <svg className="mr-3 h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Home
                </Link>

                <Link href="/dashboard/professionals" className={`${
                  router.pathname.includes('/dashboard/professionals') ? 'bg-blue-800 text-white' : 'text-white hover:bg-blue-600'
                } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}>
                  <svg className="mr-3 h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profissionais
                </Link>

                <Link href="/dashboard/appointments" className={`${
                  router.pathname.includes('/dashboard/appointments') ? 'bg-blue-800 text-white' : 'text-white hover:bg-blue-600'
                } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}>
                  <svg className="mr-3 h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Agendamentos
                </Link>

                <Link href="/dashboard/subscriptions" className={`${
                  router.pathname.includes('/dashboard/subscriptions') ? 'bg-blue-800 text-white' : 'text-white hover:bg-blue-600'
                } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}>
                  <svg className="mr-3 h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Assinaturas
                </Link>

                <Link href="/dashboard/absences" className={`${
                  router.pathname.includes('/dashboard/absences') ? 'bg-blue-800 text-white' : 'text-white hover:bg-blue-600'
                } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}>
                  <svg className="mr-3 h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Ausências
                </Link>
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-blue-800 p-4">
              <div className="flex-shrink-0 w-full group block">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div>
                      <svg className="h-9 w-9 rounded-full text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-white truncate max-w-[120px]">{user?.user_metadata?.name || user?.email}</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleSignOut}
                    className="flex items-center px-2 py-1 text-xs font-medium text-white bg-blue-800 hover:bg-blue-900 rounded-md transition-colors duration-150 ease-in-out"
                  >
                    <svg className="mr-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sair
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Mobile menu */}
      <div className="md:hidden">
        <div className="bg-blue-700 px-4 py-2 flex items-center justify-between">
            <span className="text-white text-xl font-bold">CinthIA</span>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-white hover:bg-blue-600 p-2 rounded-md transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              aria-expanded={isMobileMenuOpen}
            >
              <span className="sr-only">Abrir menu</span>
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {isMobileMenuOpen && (
            <div className="bg-blue-700 pt-2 pb-3 space-y-1 shadow-lg">
              <Link href="/dashboard" className={`${
                router.pathname === '/dashboard' ? 'bg-blue-800 text-white' : 'text-white hover:bg-blue-600'
              } flex items-center px-4 py-3 text-base font-medium transition-colors duration-150 ease-in-out`}>
                <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Home
              </Link>
              <Link href="/dashboard/professionals" className={`${
                router.pathname.includes('/dashboard/professionals') ? 'bg-blue-800 text-white' : 'text-white hover:bg-blue-600'
              } flex items-center px-4 py-3 text-base font-medium transition-colors duration-150 ease-in-out`}>
                <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profissionais
              </Link>
              <Link href="/dashboard/appointments" className={`${
                router.pathname.includes('/dashboard/appointments') ? 'bg-blue-800 text-white' : 'text-white hover:bg-blue-600'
              } flex items-center px-4 py-3 text-base font-medium transition-colors duration-150 ease-in-out`}>
                <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Agendamentos
              </Link>
              <Link href="/dashboard/subscriptions" className={`${
                router.pathname.includes('/dashboard/subscriptions') ? 'bg-blue-800 text-white' : 'text-white hover:bg-blue-600'
              } flex items-center px-4 py-3 text-base font-medium transition-colors duration-150 ease-in-out`}>
                <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Assinaturas
              </Link>
              <Link href="/dashboard/absences" className={`${
                router.pathname.includes('/dashboard/absences') ? 'bg-blue-800 text-white' : 'text-white hover:bg-blue-600'
              } flex items-center px-4 py-3 text-base font-medium transition-colors duration-150 ease-in-out`}>
                <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Ausências
              </Link>
              <div className="border-t border-blue-800 pt-4 pb-3 mt-2">
                <div className="flex items-center justify-between px-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-9 w-9 rounded-full text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <div className="text-base font-medium text-white truncate max-w-[200px]">{user?.user_metadata?.name || user?.email}</div>
                    </div>
                  </div>
                  <button 
                    onClick={handleSignOut}
                    className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-800 hover:bg-blue-900 rounded-md transition-colors duration-150 ease-in-out"
                  >
                    <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sair
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      {/* Main content */}
      <div className="md:pl-64">
        <main className="py-4 md:py-6">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
            <div className="flex-1 px-0 sm:px-2 flex justify-between mb-4">
              <div className="flex-1 flex">
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">{title}</h1>
              </div>
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}