import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-toastify';
import { checkUserAccess } from '../../../lib/subscriptionUtils';
import TrialExpiredModal from '../../../components/TrialExpiredModal';

export default function Appointments() {
  const router = useRouter();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('upcoming'); // 'upcoming', 'past', 'all'
  const [professionals, setProfessionals] = useState([]);
  const [selectedProfessional, setSelectedProfessional] = useState('all');
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [showTrialExpiredModal, setShowTrialExpiredModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [view, selectedProfessional]);

  async function fetchData() {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      // Verificar acesso do usuário (período de teste)
      const accessStatus = await checkUserAccess(session.user.id);
      
      if (!accessStatus.hasAccess) {
        // Buscar informações da assinatura para exibir no modal
        const { data: subscriptionData } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('owner_user_id', session.user.id)
          .single();

        setSubscriptionInfo(subscriptionData);
        
        // Exibir modal se o período de teste expirou
        if (accessStatus.reason === 'trial_expired') {
          setShowTrialExpiredModal(true);
        } else if (accessStatus.reason === 'blocked') {
          toast.error('Sua assinatura está bloqueada. Faça upgrade do seu plano para continuar.');
        }
        
        setLoading(false);
        return;
      }

      // Se está em past_due, mostrar aviso mas permitir continuar
      if (accessStatus.isPastDue) {
        toast.warning(accessStatus.message || 'Sua assinatura está vencida. Efetue o pagamento para evitar o bloqueio.');
      }

      // Buscar profissionais
      const { data: professionalsData, error: professionalsError } = await supabase
        .from('professionals')
        .select('id, name')
        .eq('owner_user_id', session.user.id)
        .eq('status', 'active');

      if (professionalsError) throw professionalsError;
      setProfessionals(professionalsData || []);

      // Construir query para agendamentos
      let query = supabase
        .from('appointments')
        .select(`
          *,
          professionals:professional_id (name, owner_user_id)
        `);

      // Filtrar por profissional
      if (selectedProfessional !== 'all') {
        query = query.eq('professional_id', selectedProfessional);
      }

      // Filtrar por data
      const now = new Date().toISOString();
      if (view === 'upcoming') {
        query = query.gte('start_at', now);
      } else if (view === 'past') {
        query = query.lt('start_at', now);
      }

      // Ordenar
      query = query.order('start_at', { ascending: view !== 'past' });

      const { data, error } = await query;

      if (error) throw error;
      
      // Filtrar apenas agendamentos dos profissionais do usuário logado
      const filteredData = (data || []).filter(appointment => 
        appointment.professionals?.owner_user_id === session.user.id
      );
      
      setAppointments(filteredData);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  // Formatar data e hora
  const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    return {
      date: date.toLocaleDateString('pt-BR'),
      time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
  };

  // Obter classe de cor com base no status
  const getStatusClass = (status) => {
    switch (status) {
      case 'booked':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'canceled':
        return 'bg-red-100 text-red-800';
      case 'no_show':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Traduzir status
  const translateStatus = (status) => {
    const statusMap = {
      'booked': 'Agendado',
      'completed': 'Concluído',
      'canceled': 'Cancelado',
      'no_show': 'Não compareceu'
    };
    return statusMap[status] || status;
  };

  return (
    <Layout title="Agendamentos">
      <Head>
        <title>Agendamentos | CinthIA</title>
      </Head>

      <div className="py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mt-1 text-sm text-gray-500">
              Visualize os agendamentos da sua clínica
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
          {/* Filtro de visualização */}
          <div className="inline-flex rounded-md shadow-sm">
            <button
              type="button"
              onClick={() => setView('upcoming')}
              className={`relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${
                view === 'upcoming' 
                  ? 'bg-blue-50 text-blue-700 z-10' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Próximos
            </button>
            <button
              type="button"
              onClick={() => setView('past')}
              className={`relative inline-flex items-center px-4 py-2 border-t border-b border-gray-300 text-sm font-medium ${
                view === 'past' 
                  ? 'bg-blue-50 text-blue-700 z-10' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Anteriores
            </button>
            <button
              type="button"
              onClick={() => setView('all')}
              className={`relative inline-flex items-center px-4 py-2 rounded-r-md border border-gray-300 text-sm font-medium ${
                view === 'all' 
                  ? 'bg-blue-50 text-blue-700 z-10' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Todos
            </button>
          </div>

          {/* Filtro de profissional */}
          <div>
            <select
              id="professional-filter"
              name="professional-filter"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={selectedProfessional}
              onChange={(e) => setSelectedProfessional(e.target.value)}
            >
              <option value="all">Todos os profissionais</option>
              {professionals.map((professional) => (
                <option key={professional.id} value={professional.id}>
                  {professional.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Verificação de acesso */}
      {!loading && subscriptionInfo && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Acesso Bloqueado
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>Sua assinatura expirou. Para continuar usando o sistema, efetue o pagamento.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : appointments.length > 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {appointments.map((appointment) => {
              const { date, time } = formatDateTime(appointment.start_at);
              const endTime = formatDateTime(appointment.end_at).time;
              
              return (
                <li key={appointment.id}>
                  <Link href={`/dashboard/appointments/${appointment.id}`} className="block hover:bg-gray-50">
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="text-xs font-medium text-gray-500">{date}</div>
                            <div className="text-sm font-bold">{time} - {endTime}</div>
                          </div>
                          <div className="ml-4">
                            <p className="text-lg font-medium text-blue-600 truncate">
                              {appointment.nome_paciente || 'Nome não informado'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {appointment.service_name} com {appointment.professionals?.name || 'Profissional não encontrado'}
                            </p>
                          </div>
                        </div>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(appointment.status)}`}>
                            {translateStatus(appointment.status)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                            {appointment.city} - {appointment.clinic_name}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {appointment.price_cents ? `R$ ${(appointment.price_cents / 100).toFixed(2)}` : 'Preço não definido'}
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-12 sm:px-6 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">Nenhum agendamento encontrado</h3>
            <p className="mt-1 text-sm text-gray-500">
              {view === 'upcoming' 
                ? 'Não há agendamentos futuros no momento.' 
                : view === 'past' 
                  ? 'Não há agendamentos anteriores no sistema.' 
                  : 'Não há agendamentos registrados no sistema.'}
            </p>
          </div>
        </div>
      )}

      {/* Modal de Teste Expirado */}
      <TrialExpiredModal 
        isOpen={showTrialExpiredModal}
        onClose={() => setShowTrialExpiredModal(false)}
        subscription={subscriptionInfo}
      />
    </Layout>
  );
}