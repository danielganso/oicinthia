import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../../../components/Layout';
import { supabase } from '../../../lib/supabase';

export default function Absences() {
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [professionals, setProfessionals] = useState([]);

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
          .order('name', { ascending: true });

        if (professionalsError) throw professionalsError;
        
        setProfessionals(professionalsData || []);

        // Buscar ausências
        const { data: absencesData, error: absencesError } = await supabase
          .from('absences')
          .select(`
            id,
            professional_id,
            start_at,
            end_at,
            reason,
            type,
            professionals(name)
          `)
          .eq('owner_user_id', session.user.id)
          .order('start_at', { ascending: false });

        if (absencesError) throw absencesError;
        
        setAbsences(absencesData || []);
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Formatar data para exibição
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Traduzir tipo de ausência
  const translateType = (type) => {
    const types = {
      'custom': 'Personalizado',
      'day_off': 'Folga',
      'vacation': 'Férias',
      'holiday': 'Feriado'
    };
    return types[type] || type;
  };

  return (
    <Layout title="Ausências">
      <Head>
        <title>Ausências | CinthIA</title>
      </Head>

      <div className="py-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="mt-1 text-sm text-gray-500">
              Gerencie os períodos de ausência dos profissionais
            </p>
          </div>
          <div>
            <Link href="/dashboard/absences/new" className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Cadastrar Ausência
            </Link>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : absences.length > 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {absences.map((absence) => (
              <li key={absence.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-blue-800">
                        {absence.professionals.name}
                      </h3>
                      <p className="mt-1 text-sm text-gray-600">
                        <span className="font-medium">Período:</span> {formatDate(absence.start_at)} até {formatDate(absence.end_at)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                        {translateType(absence.type)}
                      </span>
                      {absence.reason && (
                        <span className="mt-1 text-sm text-gray-500">{absence.reason}</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <Link href={`/dashboard/absences/${absence.id}`} className="text-sm text-blue-600 hover:text-blue-800">
                      Editar
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="bg-white shadow sm:rounded-md p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma ausência cadastrada</h3>
          <p className="mt-1 text-sm text-gray-500">Cadastre períodos de ausência para seus profissionais.</p>
          <div className="mt-6">
            <Link href="/dashboard/absences/new" className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Cadastrar Ausência
            </Link>
          </div>
        </div>
      )}
    </Layout>
  );
}