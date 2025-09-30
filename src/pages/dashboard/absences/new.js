import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../../../components/Layout';
import { supabase } from '../../../lib/supabase';

export default function NewAbsence() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [professionals, setProfessionals] = useState([]);
  
  const [formData, setFormData] = useState({
    professional_id: '',
    start_at: '',
    end_at: '',
    reason: '',
    type: 'custom',
    clinic: ''
  });

  // Estado para armazenar as clínicas do profissional selecionado
  const [clinics, setClinics] = useState([]);

  useEffect(() => {
    async function fetchProfessionals() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/login');
          return;
        }

        // Buscar profissionais
        const { data, error } = await supabase
          .from('professionals')
          .select('*')
          .eq('owner_user_id', session.user.id)
          .order('name', { ascending: true });

        if (error) throw error;
        
        setProfessionals(data || []);
      } catch (error) {
        console.error('Erro ao buscar profissionais:', error);
        setError('Falha ao carregar profissionais. Por favor, tente novamente.');
      }
    }

    fetchProfessionals();
  }, [router]);

  // Quando o profissional é selecionado, buscar suas clínicas
  useEffect(() => {
    if (formData.professional_id) {
      const professional = professionals.find(p => p.id === formData.professional_id);
      if (professional && professional.locations_json) {
        const professionalClinics = professional.locations_json.map(loc => ({
          city: loc.city,
          clinic: loc.clinic,
          address: loc.address
        }));
        setClinics(professionalClinics);
        // Limpar a clínica selecionada quando mudar de profissional
        setFormData(prev => ({ ...prev, clinic: '' }));
      } else {
        setClinics([]);
      }
    } else {
      setClinics([]);
    }
  }, [formData.professional_id, professionals]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      // Validar datas
      const startDate = new Date(formData.start_at);
      const endDate = new Date(formData.end_at);

      if (endDate <= startDate) {
        throw new Error('A data de término deve ser posterior à data de início.');
      }

      // Criar ausência
      const { error } = await supabase
        .from('absences')
        .insert([
          {
            professional_id: formData.professional_id,
            owner_user_id: session.user.id,
            start_at: formData.start_at,
            end_at: formData.end_at,
            reason: formData.reason,
            type: formData.type
          }
        ]);

      if (error) throw error;

      router.push('/dashboard/absences');
    } catch (error) {
      console.error('Erro ao criar ausência:', error);
      setError(error.message || 'Falha ao criar ausência. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Nova Ausência">
      <Head>
        <title>Nova Ausência | CinthIA</title>
      </Head>

      <div className="py-6">
        <p className="mt-1 text-sm text-gray-500">
          Cadastre um período de ausência para um profissional
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-4 md:p-6 max-w-4xl mx-auto">
        <div className="space-y-6">
          <div>
            <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500 mb-6">
              <h3 className="text-lg font-medium leading-6 text-blue-800">Informações da Ausência</h3>
              <p className="mt-1 text-sm text-blue-600">Preencha os dados abaixo para registrar o período de ausência do profissional</p>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3 col-span-6">
                <label htmlFor="professional_id" className="block text-sm font-medium text-gray-700">
                  Profissional
                </label>
                <div className="mt-1">
                  <select
                    id="professional_id"
                    name="professional_id"
                    required
                    value={formData.professional_id}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md transition duration-150 ease-in-out"
                    placeholder="Selecione um profissional"
                  >
                    <option value="">Selecione um profissional</option>
                    {professionals.map((professional) => (
                      <option key={professional.id} value={professional.id}>{professional.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="sm:col-span-3 col-span-6">
                <label htmlFor="clinic" className="block text-sm font-medium text-gray-700">
                  Clínica
                </label>
                <div className="mt-1 relative">
                  <select
                    id="clinic"
                    name="clinic"
                    required
                    value={formData.clinic}
                    onChange={handleChange}
                    disabled={!formData.professional_id || clinics.length === 0}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md disabled:bg-gray-100 disabled:text-gray-500 transition duration-150 ease-in-out"
                    placeholder="Selecione uma clínica"
                  >
                    <option value="">Selecione uma clínica</option>
                    {clinics.map((clinic, index) => (
                      <option key={index} value={`${clinic.city} - ${clinic.clinic}`}>
                        {clinic.city} - {clinic.clinic}
                      </option>
                    ))}
                  </select>
                  {(!formData.professional_id || clinics.length === 0) && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                {!formData.professional_id && (
                  <p className="mt-1 text-xs text-gray-500">Selecione um profissional primeiro</p>
                )}
              </div>

              <div className="sm:col-span-3 col-span-6">
                <label htmlFor="start_at" className="block text-sm font-medium text-gray-700">
                  Data e Hora de Início
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    type="datetime-local"
                    name="start_at"
                    id="start_at"
                    required
                    value={formData.start_at}
                    onChange={handleChange}
                    className="pl-10 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md transition duration-150 ease-in-out"
                  />
                </div>
              </div>

              <div className="sm:col-span-3 col-span-6">
                <label htmlFor="end_at" className="block text-sm font-medium text-gray-700">
                  Data e Hora de Término
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    type="datetime-local"
                    name="end_at"
                    id="end_at"
                    required
                    value={formData.end_at}
                    onChange={handleChange}
                    className="pl-10 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md transition duration-150 ease-in-out"
                  />
                </div>
              </div>

              <div className="sm:col-span-3 col-span-6">
                <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                  Tipo de Ausência
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="pl-10 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md transition duration-150 ease-in-out"
                  >
                    <option value="custom">Personalizado</option>
                    <option value="day_off">Folga</option>
                    <option value="vacation">Férias</option>
                    <option value="holiday">Feriado</option>
                  </select>
                </div>
              </div>

              <div className="sm:col-span-6 col-span-6">
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                  Motivo (opcional)
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <textarea
                    id="reason"
                    name="reason"
                    rows="3"
                    value={formData.reason}
                    onChange={handleChange}
                    placeholder="Descreva o motivo da ausência..."
                    className="pl-10 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md transition duration-150 ease-in-out"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row justify-center sm:justify-end space-y-3 sm:space-y-0 sm:space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex justify-center items-center py-2 px-6 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out"
          >
            <svg className="mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex justify-center items-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Salvando...
              </>
            ) : (
              <>
                <svg className="mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Salvar
              </>
            )}
          </button>
        </div>
      </form>
    </Layout>
  );
}