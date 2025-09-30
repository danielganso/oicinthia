import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../../../components/Layout';
import { supabase } from '../../../lib/supabase';
import { deleteProfessional } from '../../../services/professionalService';
import { toast } from 'react-toastify';

export default function Professionals() {
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) return;

        // Buscar profissionais
        const { data: professionalsData, error: professionalsError } = await supabase
          .from('professionals')
          .select('*')
          .eq('owner_user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (professionalsError) throw professionalsError;
        
        setProfessionals(professionalsData || []);

        // Buscar informações da assinatura
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('owner_user_id', session.user.id)
          .single();

        if (subscriptionError && subscriptionError.code !== 'PGRST116') {
          throw subscriptionError;
        }
        
        setSubscription(subscriptionData);
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Verificar se o usuário pode adicionar mais profissionais
  const canAddProfessional = () => {
    if (!subscription) return false;
    
    const planLimits = {
      'autonomo': 1,
      'ate_3': 3,
      'ate_5': 5
    };
    
    const limit = planLimits[subscription.plan] || 0;
    return professionals.length < limit;
  };

  // Função para excluir profissional
  const handleDeleteProfessional = async (professionalId, professionalName) => {
    if (!confirm(`Tem certeza que deseja excluir o profissional "${professionalName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      await deleteProfessional(professionalId);
      
      // Atualizar a lista removendo o profissional excluído
      setProfessionals(prev => prev.filter(p => p.id !== professionalId));
      
      toast.success('Profissional excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir profissional:', error);
      toast.error(error.message || 'Erro ao excluir profissional');
    }
  };

  // Função para lidar com o clique no botão de cadastrar profissional
  const handleAddProfessional = (e) => {
    e.preventDefault();
    
    if (!subscription) {
      toast.error('Erro ao verificar informações da assinatura.');
      return;
    }

    const planLimits = {
      'autonomo': 1,
      'ate_3': 3,
      'ate_5': 5
    };

    const limit = planLimits[subscription.plan] || 0;
    
    if (professionals.length >= limit) {
      toast.error(`Seu plano permite apenas ${limit} profissional(is) cadastrado(s). Faça upgrade do seu plano para cadastrar mais profissionais.`);
      return;
    }

    // Se passou na validação, navegar para a tela de cadastro
    window.location.href = '/dashboard/professionals/new';
  };

  return (
    <Layout title="Profissionais">
      <Head>
        <title>Profissionais | CinthIA</title>
      </Head>

      <div className="py-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="mt-1 text-sm text-gray-500">
              Visualize os profissionais da sua clínica
            </p>
          </div>
          {canAddProfessional() && (
            <div>
              <button 
                onClick={handleAddProfessional}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Cadastrar Profissional
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : professionals.length > 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {professionals.map((professional) => {
              // Extrair a primeira localização para exibição
              const locations = professional.locations_json || [];
              const firstLocation = locations.length > 0 ? locations[0] : null;
              
              return (
                <li key={professional.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <Link href={`/dashboard/professionals/${professional.id}`} className="flex items-center flex-1 hover:bg-gray-50 -mx-4 px-4 py-2 rounded">
                        <div className="flex-shrink-0 h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-bold text-lg">
                            {professional.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4 flex-1">
                          <p className="text-lg font-medium text-blue-600 truncate">{professional.name}</p>
                          <p className="text-sm text-gray-500">{professional.specialty}</p>
                        </div>
                      </Link>
                      <div className="ml-4 flex items-center space-x-2">
                        <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          professional.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {professional.status === 'active' ? 'Ativo' : 'Inativo'}
                        </p>
                        <button
                          onClick={() => handleDeleteProfessional(professional.id, professional.name)}
                          className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                          title="Excluir profissional"
                        >
                          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        {firstLocation && (
                          <p className="flex items-center text-sm text-gray-500">
                            <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                            {firstLocation.city} - {firstLocation.clinic}
                          </p>
                        )}
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/20 20" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        <p>
                          Cadastrado em {new Date(professional.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-12 sm:px-6 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">Nenhum profissional encontrado</h3>
            <p className="mt-1 text-sm text-gray-500">
              Não há profissionais registrados no sistema.
            </p>
          </div>
        </div>
      )}
    </Layout>
  );
}