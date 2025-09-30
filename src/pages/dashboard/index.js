import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-toastify';
import { checkUserAccess, getSubscriptionStatusMessage } from '../../lib/subscriptionUtils';
import TrialExpiredModal from '../../components/TrialExpiredModal';

export default function Dashboard() {
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTrialExpiredModal, setShowTrialExpiredModal] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) return;

        // Verificar acesso do usuário (período de teste)
        const accessStatus = await checkUserAccess(session.user.id);
        
        if (!accessStatus.hasAccess) {
          // Se não tem acesso, ainda buscar informações da assinatura para exibir status
          const { data: subscriptionData } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('owner_user_id', session.user.id)
            .single();

          setSubscriptionInfo(subscriptionData);
          setLoading(false);
          
          // Exibir modal se o período de teste expirou
          if (accessStatus.reason === 'trial_expired') {
            setShowTrialExpiredModal(true);
          } else if (accessStatus.reason === 'blocked') {
            toast.error('Sua assinatura está bloqueada. Faça upgrade do seu plano para continuar.');
          }
          
          return;
        }

        // Buscar informações da assinatura
        const { data: subscriptionData } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('owner_user_id', session.user.id)
          .single();

        setSubscriptionInfo(subscriptionData);

        // Buscar profissionais do usuário
        const { data: professionalsData } = await supabase
          .from('professionals')
          .select('*')
          .eq('owner_user_id', session.user.id);

        setProfessionals(professionalsData || []);

        // Buscar próximas consultas
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            id,
            start_at,
            end_at,
            status,
            service_name,
            city,
            clinic_name,
            nome_paciente,
            telefone_paciente,
            professionals(name, specialty, owner_user_id)
          `)
          .eq('status', 'booked')
          .gte('start_at', new Date().toISOString())
          .order('start_at', { ascending: true })
          .limit(50);

        if (error) throw error;
        
        // Filtrar apenas agendamentos dos profissionais do usuário logado
        const filteredData = (data || [])
          .filter(appointment => appointment.professionals?.owner_user_id === session.user.id);
        
        // Pegar apenas os 5 primeiros para próximas consultas
        setUpcomingAppointments(filteredData.slice(0, 5));

        // Buscar total de consultas (todas as consultas do usuário)
        const { data: totalData, error: totalError } = await supabase
          .from('appointments')
          .select(`
            id,
            professionals(owner_user_id)
          `)
          .eq('status', 'booked');

        if (!totalError) {
          const totalFiltered = (totalData || [])
            .filter(appointment => appointment.professionals?.owner_user_id === session.user.id);
          setTotalAppointments(totalFiltered.length);
        }

      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Formatar data e hora
  const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Função para lidar com o clique no botão de cadastrar profissional
  const handleAddProfessional = async (e) => {
    e.preventDefault();
    
    console.log('handleAddProfessional chamado');
    console.log('subscriptionInfo:', subscriptionInfo);
    console.log('professionals:', professionals);
    
    if (!subscriptionInfo) {
      console.log('Erro: subscriptionInfo não encontrado');
      toast.error('Erro ao verificar informações da assinatura.');
      return;
    }

    // Verificar se o período de teste expirou ou se a assinatura está bloqueada
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const accessStatus = await checkUserAccess(session.user.id);
      
      if (!accessStatus.hasAccess) {
        if (accessStatus.reason === 'trial_expired') {
          toast.error('Seu período de teste expirou. Faça upgrade do seu plano para continuar cadastrando profissionais.');
        } else if (accessStatus.reason === 'blocked') {
          toast.error('Sua assinatura está bloqueada. Faça upgrade do seu plano para continuar.');
        }
        return;
      }

      // Se está em past_due, mostrar aviso mas permitir continuar
      if (accessStatus.isPastDue) {
        toast.warning(accessStatus.message || 'Sua assinatura está vencida. Efetue o pagamento para evitar o bloqueio.');
      }
    }

    const planLimits = {
      'autonomo': 1,
      'ate_3': 3,
      'ate_5': 5
    };

    const limit = planLimits[subscriptionInfo.plan] || 0;
    
    console.log('Plano:', subscriptionInfo.plan);
    console.log('Limite:', limit);
    console.log('Profissionais cadastrados:', professionals.length);
    
    if (professionals.length >= limit) {
      console.log('Limite atingido, exibindo toast de erro');
      toast.error(`Seu plano permite apenas ${limit} profissional(is) cadastrado(s). Faça upgrade do seu plano para cadastrar mais profissionais.`);
      return;
    }

    console.log('Validação passou, navegando para cadastro');
    // Se passou na validação, navegar para a tela de cadastro
    window.location.href = '/dashboard/professionals/new';
  };

  return (
    <Layout title="Dashboard">
      <Head>
        <title>Dashboard | CinthIA</title>
      </Head>

      <div className="mb-6">
        <p className="text-sm text-gray-500">
          Bem-vindo ao seu painel de controle CinthIA
        </p>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg leading-6 font-medium text-gray-900">Próximas Consultas</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Consultas agendadas para os próximos dias</p>
        </div>
        
        {loading ? (
          <div className="px-4 py-5 sm:p-6 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : upcomingAppointments.length > 0 ? (
          <>
            {/* Layout para desktop - tabela */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data/Hora
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Profissional
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Paciente
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Serviço
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Local
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {upcomingAppointments.map((appointment) => (
                    <tr key={appointment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDateTime(appointment.start_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{appointment.professionals?.name}</div>
                        <div className="text-sm text-gray-500">{appointment.professionals?.specialty}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{appointment.nome_paciente || 'Nome não informado'}</div>
                        <div className="text-sm text-gray-500">{appointment.telefone_paciente || 'Telefone não informado'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {appointment.service_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{appointment.clinic_name}</div>
                        <div className="text-sm text-gray-500">{appointment.city}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Layout para mobile - cards */}
            <div className="md:hidden space-y-4 px-4 py-4">
              {upcomingAppointments.map((appointment) => (
                <div key={appointment.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex justify-between items-start mb-3">
                    <div className="text-sm font-medium text-blue-600">
                      {formatDateTime(appointment.start_at)}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Profissional</span>
                      <div className="text-sm font-medium text-gray-900">{appointment.professionals?.name}</div>
                      <div className="text-xs text-gray-500">{appointment.professionals?.specialty}</div>
                    </div>
                    
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Paciente</span>
                      <div className="text-sm font-medium text-gray-900">{appointment.nome_paciente || 'Nome não informado'}</div>
                      <div className="text-xs text-gray-500">{appointment.telefone_paciente || 'Telefone não informado'}</div>
                    </div>
                    
                    <div className="flex justify-between">
                      <div>
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Serviço</span>
                        <div className="text-sm text-gray-900">{appointment.service_name}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Local</span>
                        <div className="text-sm text-gray-900">{appointment.clinic_name}</div>
                        <div className="text-xs text-gray-500">{appointment.city}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="px-4 py-5 sm:p-6 text-center text-gray-500">
            Não há consultas agendadas para os próximos dias.
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card de estatísticas */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total de Consultas
                </dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900">
                    {totalAppointments}
                  </div>
                </dd>
              </div>
            </div>
          </div>
        </div>

        {/* Card de informações do plano */}
        {subscriptionInfo && (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Plano Atual
                  </dt>
                  <dd className="flex flex-col">
                    <div className="text-lg font-semibold text-gray-900 capitalize">
                      {subscriptionInfo.plan}
                    </div>
                    <div className="text-sm text-gray-500">
                      Status: <span className={`font-medium ${
                        subscriptionInfo.status === 'test' ? 'text-yellow-600' :
                        subscriptionInfo.status === 'active' ? 'text-green-600' :
                        'text-red-600'
                      }`}>
                        {subscriptionInfo.status === 'test' ? 'Período de Teste' :
                         subscriptionInfo.status === 'active' ? 'Ativo' :
                         subscriptionInfo.status === 'blocked' ? 'Bloqueado' : subscriptionInfo.status}
                      </span>
                    </div>
                    {subscriptionInfo.current_period_end && (
                      <div className="text-sm text-gray-500">
                        {subscriptionInfo.status === 'test' ? 'Teste até:' : 'Válido até:'} {new Date(subscriptionInfo.current_period_end).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </dd>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Verificação de acesso */}
        {subscriptionInfo && subscriptionInfo.status === 'blocked' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 sm:col-span-2 lg:col-span-3">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800">
                  Acesso Bloqueado
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>Sua assinatura expirou. Para continuar usando o sistema, efetue o pagamento.</p>
                </div>
                <div className="mt-4">
                  <Link 
                    href="/dashboard/subscriptions" 
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                  >
                    Assinar Agora
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Seção de links rápidos */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Links Rápidos</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card Cadastrar Profissional */}
          <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-300">
            <button onClick={handleAddProfessional} className="block p-6 w-full text-left">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Cadastrar Profissional</h3>
                  <p className="text-sm text-gray-500">Adicione um novo profissional ao sistema</p>
                </div>
              </div>
            </button>
          </div>

          {/* Card Cadastrar Ausência */}
          <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-300">
            <Link href="/dashboard/absences/new" className="block p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-amber-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Cadastrar Ausência</h3>
                  <p className="text-sm text-gray-500">Registre períodos de ausência dos profissionais</p>
                </div>
              </div>
            </Link>
          </div>

          {/* Card Ver Agendamentos */}
          <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-300">
            <Link href="/dashboard/appointments" className="block p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Ver Agendamentos</h3>
                  <p className="text-sm text-gray-500">Visualize e gerencie todos os agendamentos</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Modal de Teste Expirado */}
      <TrialExpiredModal 
        isOpen={showTrialExpiredModal}
        onClose={() => setShowTrialExpiredModal(false)}
        subscription={subscriptionInfo}
      />
    </Layout>
  );
}