import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { supabase } from '../../lib/supabase';
import PlanSelectionModal from '../../components/PlanSelectionModal';
import { createSubscriptionPreference } from '../../lib/mercadopago';

export default function Subscriptions() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [user, setUser] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);

  const plans = [
    {
      id: 'autonomo',
      name: 'Autônomo',
      price: 97,
      maxProfessionals: 1,
      icon: '🏃‍♂️',
      features: [
        '1 profissional',
        'Agendamento via WhatsApp',
        'Agenda online',
        'Feed ICS para Google/Outlook',
        'Bloqueio automático de horários'
      ]
    },
    {
      id: 'ate_3',
      name: 'Clínica Pequena',
      price: 197,
      maxProfessionals: 3,
      icon: '🏢',
      popular: true,
      features: [
        'Até 3 profissionais',
        'Agendamento via WhatsApp',
        'Agenda online',
        'Feed ICS para Google/Outlook',
        'Bloqueio automático de horários',
        'Múltiplas clínicas/cidades'
      ]
    },
    {
      id: 'ate_5',
      name: 'Clínica Média',
      price: 297,
      maxProfessionals: 5,
      icon: '🏥',
      features: [
        'Até 5 profissionais',
        'Agendamento via WhatsApp',
        'Agenda online',
        'Feed ICS para Google/Outlook',
        'Bloqueio automático de horários',
        'Múltiplas clínicas/cidades',
        'Suporte prioritário'
      ]
    }
  ];

  useEffect(() => {
    fetchSubscriptionInfo();
  }, []);

  // Verificar se há um plano pré-selecionado na URL (vindo do registro)
  useEffect(() => {
    if (router.query.plan && subscriptionInfo) {
      // Se o plano da URL for diferente do plano atual, destacar
      const selectedPlan = router.query.plan;
      if (selectedPlan !== subscriptionInfo.plan) {
        // Scroll para o plano selecionado
        setTimeout(() => {
          const element = document.getElementById(`plan-${selectedPlan}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 500);
      }
    }
  }, [router.query.plan, subscriptionInfo]);

  const fetchSubscriptionInfo = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      setUser(session.user);

      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('owner_user_id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar assinatura:', error);
      } else {
        setSubscriptionInfo(subscription);
      }
    } catch (error) {
      console.error('Erro ao buscar informações:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'test':
        return 'text-blue-600 bg-blue-100';
      case 'blocked':
        return 'text-red-600 bg-red-100';
      case 'canceled':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'test':
        return 'Teste Grátis';
      case 'blocked':
        return 'Bloqueado';
      case 'canceled':
        return 'Cancelado';
      default:
        return 'Desconhecido';
    }
  };

  const getPlanAction = (planId) => {
    if (!subscriptionInfo) return 'Assinar';
    
    const currentPlan = subscriptionInfo.plan;
    const planOrder = { 'autonomo': 1, 'ate_3': 2, 'ate_5': 3 };
    
    if (currentPlan === planId) {
      return 'Plano Atual';
    } else if (planOrder[currentPlan] < planOrder[planId]) {
      return 'Upgrade';
    } else {
      return 'Downgrade';
    }
  };

  const handlePlanSelection = (planId) => {
    // Por enquanto, apenas redireciona para a home com o plano selecionado
    // Futuramente será integrado com Mercado Pago
    window.location.href = `/?plan=${planId}#planos`;
  };

  const handleSelectPlanFromModal = async (planId) => {
    try {
      if (!user) {
        console.error('Usuário não encontrado');
        return;
      }

      console.log('=== INICIANDO CRIAÇÃO DE ASSINATURA ===');
      console.log('PlanId selecionado:', planId);

      // Criar preferência de pagamento via API route
      const userInfo = {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email
      };

      // Buscar informações do plano
      const { PLAN_CONFIGS } = await import('../../lib/mercadopago');
      const planInfo = PLAN_CONFIGS[planId];
      
      if (!planInfo) {
        console.error('Plano não encontrado:', planId);
        return;
      }

      console.log('UserInfo:', userInfo);
      console.log('PlanInfo:', planInfo);

      // Chamar API route para criar assinatura
      const response = await fetch('/api/mercadopago/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userInfo,
          planInfo
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro na API:', errorData);
        throw new Error(errorData.message || 'Erro ao criar assinatura');
      }

      const data = await response.json();
      console.log('=== RESPOSTA DA API ===');
      console.log('Data:', data);

      // Redirecionar para o checkout do Mercado Pago
      if (data.subscription && data.subscription.init_point) {
        console.log('Redirecionando para:', data.subscription.init_point);
        window.location.href = data.subscription.init_point;
      } else {
        console.error('URL de checkout não encontrada na resposta:', data);
        throw new Error('URL de checkout não encontrada');
      }
    } catch (error) {
      console.error('=== ERRO AO PROCESSAR SELEÇÃO DE PLANO ===');
      console.error('Error:', error);
      console.error('Stack:', error.stack);
      // TODO: Mostrar mensagem de erro para o usuário
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <Layout title="Assinaturas">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Assinaturas">
      <div className="max-w-7xl mx-auto">
        {/* Status Atual */}
        {subscriptionInfo && (
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Status da Assinatura</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Status Atual</dt>
                <dd className={`mt-1 text-sm font-semibold px-2 py-1 rounded-full inline-block ${getStatusColor(subscriptionInfo.status)}`}>
                  {getStatusText(subscriptionInfo.status)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Plano Atual</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900 capitalize">
                  {plans.find(p => p.id === subscriptionInfo.plan)?.name || subscriptionInfo.plan}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Validade</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">
                  {formatDate(subscriptionInfo.current_period_end)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Criado em</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">
                  {formatDate(subscriptionInfo.created_at)}
                </dd>
              </div>
            </div>

            {/* Botão Assinar para usuários bloqueados */}
            {subscriptionInfo.status === 'blocked' && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-red-800">Assinatura Bloqueada</h3>
                    <p className="text-sm text-red-700 mt-1">
                      Sua assinatura expirou. Escolha um plano para reativar seu acesso.
                    </p>
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h4 className="text-sm font-medium text-blue-800">
                            Reconexão do WhatsApp
                          </h4>
                          <p className="text-sm text-blue-700 mt-1">
                            Após o pagamento, o WhatsApp dos seus profissionais deverá ser reconectado.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPlanModal(true)}
                    className="ml-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                  >
                    Assinar Agora
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Planos Disponíveis */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold text-center mb-2 text-gray-900">Planos Disponíveis</h2>
          <p className="text-center text-gray-600 mb-8">Escolha o plano ideal para sua clínica</p>
          
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => {
              const action = getPlanAction(plan.id);
              const isCurrentPlan = subscriptionInfo?.plan === plan.id;
              
              return (
                <div
                  key={plan.id}
                  id={`plan-${plan.id}`}
                  className={`relative bg-white p-8 rounded-xl shadow-lg border-2 transition-all duration-300 hover:transform hover:scale-105 ${
                    plan.popular 
                      ? 'border-blue-500 transform scale-105' 
                      : isCurrentPlan 
                        ? 'border-green-500' 
                        : router.query.plan === plan.id 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-200'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <span className="bg-gradient-to-r from-amber-400 to-amber-500 text-white text-sm font-bold uppercase py-1 px-4 rounded-full">
                        Mais popular
                      </span>
                    </div>
                  )}
                  
                  {isCurrentPlan && (
                    <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
                      <span className="bg-green-500 text-white text-xs font-bold uppercase py-1 px-3 rounded-full">
                        Atual
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <div className="text-4xl mb-2">{plan.icon}</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <div className="text-4xl font-bold text-blue-600 mb-2">
                      R$ {plan.price}
                      <span className="text-lg text-gray-500">/mês</span>
                    </div>
                    <div className="h-1 w-24 bg-amber-400 mx-auto"></div>
                  </div>

                  <ul className="mb-8 space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-gray-700">
                        <svg className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handlePlanSelection(plan.id)}
                    disabled={isCurrentPlan}
                    className={`w-full py-3 px-6 rounded-lg font-bold transition-all duration-300 ${
                      isCurrentPlan
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : action === 'Upgrade'
                          ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-md hover:shadow-lg'
                          : action === 'Downgrade'
                            ? 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white shadow-md hover:shadow-lg'
                            : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg'
                    }`}
                  >
                    {action}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Informações Adicionais */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-blue-900">Informações Importantes</h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>Todos os planos incluem 7 dias de teste grátis</li>
                  <li>Você pode fazer upgrade ou downgrade a qualquer momento</li>
                  <li>O pagamento será processado via Mercado Pago (em breve)</li>
                  <li>Cancelamento pode ser feito a qualquer momento</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Modal de Seleção de Planos */}
        <PlanSelectionModal
          isOpen={showPlanModal}
          onClose={() => setShowPlanModal(false)}
          onSelectPlan={handleSelectPlanFromModal}
        />
      </div>
    </Layout>
  );
}