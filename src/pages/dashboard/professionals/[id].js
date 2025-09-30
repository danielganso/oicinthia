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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const updateWhatsAppStatus = async () => {
    if (!professional) return;
    
    try {
      // Buscar dados atualizados da instância do WhatsApp
      const { data: instanceData, error: instanceError } = await supabase
        .from('evolution_instances')
        .select('*')
        .eq('professional_id', id)
        .single();
        
      if (!instanceError && instanceData) {
        console.log('Status atualizado:', instanceData.state);
        setWhatsappInstance(instanceData);
      }
    } catch (error) {
      console.error('Erro ao atualizar status do WhatsApp:', error);
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
                    <div>
                      <WhatsAppLinkButton professionalId={professional.id} deviceId={professional.whatsapp_device_id} />
                      
                      {whatsappInstance && (
                        <div className="mt-3 bg-gray-50 p-3 rounded-md">
                          <h4 className="font-medium text-gray-700 mb-2">Informações da Instância</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="font-medium">Nome:</span> {whatsappInstance.instance_name}
                            </div>
                            <div>
                              <span className="font-medium">Estado:</span> 
                              <span className={`ml-1 px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${whatsappInstance.state === 'connected' || whatsappInstance.state === 'open' || whatsappInstance.state === 'Open' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {whatsappInstance.state === 'connected' || whatsappInstance.state === 'open' || whatsappInstance.state === 'Open' ? 'Conectado' : 'Desconectado'}
                              </span>
                            </div>
                            {whatsappInstance.number_e164 && (
                              <div>
                                <span className="font-medium">Número:</span> {whatsappInstance.number_e164}
                              </div>
                            )}
                            {whatsappInstance.connected_at && (
                              <div>
                                <span className="font-medium">Conectado em:</span> {new Date(whatsappInstance.connected_at).toLocaleString()}
                              </div>
                            )}
                            {whatsappInstance.last_qr_at && (
                              <div>
                                <span className="font-medium">Último QR em:</span> {new Date(whatsappInstance.last_qr_at).toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
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