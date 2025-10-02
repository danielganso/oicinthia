import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../../../components/Layout';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-toastify';
import WhatsAppLinkButton from '../../../components/WhatsAppLinkButton';

export default function ProfessionalDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [professional, setProfessional] = useState(null);
  const [whatsappInstance, setWhatsappInstance] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const updateWhatsAppStatus = async () => {
    if (!professional?.id) return;
    
    try {
      const { data: instanceData, error: instanceError } = await supabase
        .from('evolution_instances')
        .select('*')
        .eq('professional_id', professional.id)
        .single();
        
      if (!instanceError && instanceData) {
        setWhatsappInstance(instanceData);
      }
    } catch (error) {
      console.error('Error updating WhatsApp status:', error);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    if (!professional?.id) return;
    
    const confirmDisconnect = window.confirm('Tem certeza que deseja desconectar o WhatsApp? Esta ação irá interromper todas as funcionalidades do WhatsApp para este profissional.');
    
    if (!confirmDisconnect) return;
    
    try {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão não encontrada');

      const response = await fetch('/api/evolution/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          professionalId: professional.id
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao desconectar WhatsApp');
      }

      toast.success('WhatsApp desconectado com sucesso!');
      
      // Atualizar dados locais
      setWhatsappInstance(null);
      setProfessional(prev => ({
        ...prev,
        whatsapp_device_id: null
      }));
      
      // Recarregar dados
      await fetchProfessional();
      
    } catch (error) {
      console.error('Error disconnecting WhatsApp:', error);
      toast.error(error.message || 'Erro ao desconectar WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchProfessional();
      
      // Atualizar o status a cada 10 segundos
      const interval = setInterval(() => {
        updateWhatsAppStatus();
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [id]);

  const fetchProfessional = async () => {
    try {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Sessão não encontrada');
      }

      // Buscar dados da subscription do usuário
      const { data: subscriptionInfo, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('owner_user_id', session.user.id)
        .single();

      if (!subscriptionError && subscriptionInfo) {
        setSubscriptionData(subscriptionInfo);
      }
      
      // Buscar dados do profissional
      const { data: profData, error: profError } = await supabase
        .from('professionals')
        .select('*')
        .eq('id', id)
        .single();

      if (profError) {
        throw profError;
      }

      if (profData) {
        setProfessional(profData);
        
        // Buscar dados da instância do WhatsApp
        const { data: instanceData, error: instanceError } = await supabase
          .from('evolution_instances')
          .select('*')
          .eq('professional_id', id)
          .single();
          
        if (!instanceError && instanceData) {
          setWhatsappInstance(instanceData);
        }
      }
    } catch (error) {
      console.error('Error fetching professional:', error);
      setError('Não foi possível carregar os dados do profissional.');
      toast.error('Erro ao carregar dados do profissional');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  if (error || !professional) {
    return (
      <Layout>
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error || 'Profissional não encontrado'}</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Voltar
        </button>
      </Layout>
    );
  }

  // Extrair as localizações do profissional
  const locations = professional.locations_json || [];

  return (
    <Layout title={professional.name}>
      <Head>
        <title>{professional.name} | CinthIA</title>
      </Head>

      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <p className="mt-1 text-sm text-gray-500">{professional.specialty}</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Voltar
              </button>
              <button
                onClick={() => router.push(`/dashboard/professionals/edit/${professional.id}`)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Editar
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-gray-50">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Informações do Profissional</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">Detalhes e configurações do profissional.</p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
              <dl className="sm:divide-y sm:divide-gray-200">
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Nome completo</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{professional.name}</dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Especialidade</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{professional.specialty}</dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1 text-sm sm:mt-0 sm:col-span-2">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      professional.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {professional.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Código público</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{professional.public_code}</dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Token do feed ICS</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <code className="bg-gray-100 px-2 py-1 rounded">{professional.ics_feed_token}</code>
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">WhatsApp</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {subscriptionData && (subscriptionData.plan === 'ate_3' || subscriptionData.plan === 'ate_5') ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-blue-800">
                              WhatsApp da Clínica
                            </h3>
                            <div className="mt-2 text-sm text-blue-700">
                              <p>Para planos de clínica, o WhatsApp é compartilhado entre todos os profissionais.</p>
                              <p className="mt-1">Configure o WhatsApp da clínica em <strong>Meus Dados</strong>.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex gap-2 mb-3">
                          <WhatsAppLinkButton 
                            professionalId={professional.id} 
                            deviceId={professional.whatsapp_device_id}
                            onSuccess={() => {
                              // Recarregar dados após sucesso na conexão
                              fetchProfessional();
                            }}
                          />
                          
                          {whatsappInstance && whatsappInstance.state !== 'disconnected' && whatsappInstance.state !== 'close' && (
                            <button
                              onClick={handleDisconnectWhatsApp}
                              disabled={loading}
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                            >
                              {loading ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Desconectando...
                                </>
                              ) : (
                                <>
                                  <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  Desconectar WhatsApp
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Status do WhatsApp - sempre mostrar */}
                    {whatsappInstance && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">Status da Conexão</p>
                            <p className="text-xs text-gray-500">Última atualização: {new Date(whatsappInstance.updated_at).toLocaleString('pt-BR')}</p>
                          </div>
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full mr-2 ${
                              whatsappInstance.state === 'open' ? 'bg-green-400' : 
                              whatsappInstance.state === 'qr' ? 'bg-yellow-400' : 'bg-red-400'
                            }`}></div>
                            <span className={`text-xs font-medium ${
                              whatsappInstance.state === 'open' ? 'text-green-600' : 
                              whatsappInstance.state === 'qr' ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {whatsappInstance.state === 'open' ? 'Conectado' : 
                               whatsappInstance.state === 'qr' ? 'Aguardando QR' : 
                               whatsappInstance.state || 'Desconectado'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Seção de localizações */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg mt-6">
            <div className="px-4 py-5 sm:px-6 bg-gray-50">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Locais de Atendimento</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">Clínicas e cidades onde o profissional atende.</p>
            </div>
            <div className="border-t border-gray-200">
              {locations.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {locations.map((location, index) => (
                    <li key={index} className="px-4 py-4 sm:px-6">
                      <div className="flex justify-between">
                        <div>
                          <h4 className="text-lg font-medium text-blue-600">{location.clinic}</h4>
                          <p className="text-sm text-gray-500">{location.city}</p>
                          <p className="text-sm text-gray-500 mt-1">{location.address}</p>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-gray-900">R$ {parseFloat(location.price).toFixed(2)}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-5 sm:px-6 text-center">
                  <p className="text-sm text-gray-500">Nenhum local de atendimento cadastrado.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}