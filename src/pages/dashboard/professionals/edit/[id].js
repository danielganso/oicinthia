import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../../../../components/Layout';
import { toast } from 'react-toastify';
import { getProfessionalById, updateProfessional } from '../../../../services/professionalService';
import { supabase } from '../../../../lib/supabase';

export default function EditProfessional() {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [locations, setLocations] = useState([{ 
    cep: '', 
    city: '', 
    clinic: '', 
    address: '', 
    price: '',
    schedule: {
      monday: { enabled: false, start: '', end: '' },
      tuesday: { enabled: false, start: '', end: '' },
      wednesday: { enabled: false, start: '', end: '' },
      thursday: { enabled: false, start: '', end: '' },
      friday: { enabled: false, start: '', end: '' },
      saturday: { enabled: false, start: '', end: '' }
    }
  }]);
  const [formData, setFormData] = useState({
    name: '',
    specialty: '',
    status: 'active',
    timezone: 'America/Bahia',
  });
  
  // Estado separado para especialidade personalizada (não será salvo diretamente no banco)
  const [customSpecialty, setCustomSpecialty] = useState('');

  const specialties = [
    'Clínico Geral',
    'Ortodontista',
    'Endodontista',
    'Periodontista',
    'Implantodontista',
    'Odontopediatra',
    'Cirurgião Bucomaxilofacial',
    'Protesista',
    'Dentística',
    'Radiologista',
    'Estomatologista',
    'Odontogeriatria',
    'Harmonização Facial',
    'Outros',
  ];

  // Carregar dados do profissional quando o ID estiver disponível
  useEffect(() => {
    if (id) {
      loadProfessional();
    }
  }, [id]);

  // Função para carregar os dados do profissional
  const loadProfessional = async () => {
    try {
      setLoading(true);
      const professional = await getProfessionalById(id);
      
      if (professional) {
        // Preencher o formulário com os dados do profissional
        setFormData({
          name: professional.name || '',
          specialty: specialties.includes(professional.specialty) ? professional.specialty : 'Outros',
          status: professional.status || 'active',
          timezone: professional.timezone || 'America/Bahia',
        });
        
        // Se a especialidade não estiver na lista, é uma especialidade personalizada
        if (!specialties.includes(professional.specialty) && professional.specialty) {
          setCustomSpecialty(professional.specialty);
        }
        
        // Preencher as localizações
        if (professional.locations_json && professional.locations_json.length > 0) {
          // Garantir que cada localização tenha a estrutura de horários
          const locationsWithSchedule = professional.locations_json.map(location => ({
            ...location,
            schedule: location.schedule || {
              monday: { enabled: false, start: '', end: '' },
              tuesday: { enabled: false, start: '', end: '' },
              wednesday: { enabled: false, start: '', end: '' },
              thursday: { enabled: false, start: '', end: '' },
              friday: { enabled: false, start: '', end: '' },
              saturday: { enabled: false, start: '', end: '' }
            }
          }));
          setLocations(locationsWithSchedule);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar profissional:', error);
      setError('Não foi possível carregar os dados do profissional.');
      toast.error('Erro ao carregar dados do profissional');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'customSpecialty') {
      setCustomSpecialty(value);
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleLocationChange = (index, field, value) => {
    const newLocations = [...locations];
    
    // Formatar CEP automaticamente (00000-000)
    if (field === 'cep') {
      const cepDigits = value.replace(/\D/g, '');
      if (cepDigits.length <= 8) {
        // Formata o CEP com hífen após os primeiros 5 dígitos
        if (cepDigits.length > 5) {
          value = `${cepDigits.slice(0, 5)}-${cepDigits.slice(5)}`;
        } else {
          value = cepDigits;
        }
        
        // Buscar endereço quando tiver 8 dígitos
        if (cepDigits.length === 8) {
          fetchAddressByCep(cepDigits, index);
        }
      } else {
        // Limita a 8 dígitos
        const formatted = `${cepDigits.slice(0, 5)}-${cepDigits.slice(5, 8)}`;
        value = formatted;
      }
    }
    
    newLocations[index][field] = value;
    setLocations(newLocations);
  };
  
  const fetchAddressByCep = async (cep, index) => {
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        const newLocations = [...locations];
        newLocations[index].city = data.localidade;
        newLocations[index].address = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}, ${data.cep}`;
        setLocations(newLocations);
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    }
  };

  const handleScheduleChange = (locationIndex, day, field, value) => {
    const newLocations = [...locations];
    if (field === 'enabled') {
      newLocations[locationIndex].schedule[day].enabled = value;
      // Se desabilitar o dia, limpar os horários
      if (!value) {
        newLocations[locationIndex].schedule[day].start = '';
        newLocations[locationIndex].schedule[day].end = '';
      }
    } else {
      newLocations[locationIndex].schedule[day][field] = value;
    }
    setLocations(newLocations);
  };

  const getDayLabel = (day) => {
    const labels = {
      monday: 'Segunda-feira',
      tuesday: 'Terça-feira',
      wednesday: 'Quarta-feira',
      thursday: 'Quinta-feira',
      friday: 'Sexta-feira'
    };
    return labels[day];
  };

  const addLocation = () => {
    setLocations([...locations, { 
      cep: '', 
      city: '', 
      clinic: '', 
      address: '', 
      price: '',
      schedule: {
        monday: { enabled: false, start: '', end: '' },
        tuesday: { enabled: false, start: '', end: '' },
        wednesday: { enabled: false, start: '', end: '' },
        thursday: { enabled: false, start: '', end: '' },
        friday: { enabled: false, start: '', end: '' },
        saturday: { enabled: false, start: '', end: '' }
      }
    }]);
  };

  const removeLocation = (index) => {
    const newLocations = [...locations];
    newLocations.splice(index, 1);
    setLocations(newLocations);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      
      // Verificar se o usuário está autenticado
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Usuário não autenticado');
      }
      
      // Preparar os dados para atualização
      const professionalData = {
        ...formData,
        // Use customSpecialty if specialty is 'Outros'
        specialty: formData.specialty === 'Outros' ? customSpecialty : formData.specialty,
        // Filtrar localizações vazias
        locations_json: locations.filter(loc => loc.city.trim() !== '' || loc.clinic.trim() !== ''),
      };
      
      // Atualizar o profissional
      await updateProfessional(id, professionalData);
      
      toast.success('Profissional atualizado com sucesso!');
      router.push(`/dashboard/professionals/${id}`);
    } catch (error) {
      console.error('Erro ao atualizar profissional:', error);
      setError(error.message || 'Erro ao atualizar profissional');
      toast.error(error.message || 'Erro ao atualizar profissional');
    } finally {
      setSaving(false);
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

  return (
    <Layout title="Editar Profissional">
      <Head>
        <title>Editar Profissional | CinthIA</title>
      </Head>

      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="py-4">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
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

            <form onSubmit={handleSubmit}>
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-3">
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Nome Completo
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          name="name"
                          id="name"
                          value={formData.name}
                          onChange={handleChange}
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-base text-base border-gray-300 rounded-md h-12"
                          placeholder="Nome do profissional"
                          required
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-3">
                      <label htmlFor="specialty" className="block text-sm font-medium text-gray-700">
                        Especialidade
                      </label>
                      <div className="mt-1">
                        <select
                          id="specialty"
                          name="specialty"
                          value={formData.specialty}
                          onChange={handleChange}
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-base text-base border-gray-300 rounded-md h-12"
                          required
                        >
                          <option value="">Selecione uma especialidade</option>
                          {specialties.map((specialty) => (
                            <option key={specialty} value={specialty}>
                              {specialty}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {formData.specialty === 'Outros' && (
                      <div className="sm:col-span-3">
                        <label htmlFor="customSpecialty" className="block text-sm font-medium text-gray-700">
                          Especifique a especialidade
                        </label>
                        <div className="mt-1">
                          <input
                            type="text"
                            name="customSpecialty"
                            id="customSpecialty"
                            value={customSpecialty}
                            onChange={handleChange}
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-base text-base border-gray-300 rounded-md h-12"
                            placeholder="Digite a especialidade"
                            required={formData.specialty === 'Outros'}
                          />
                        </div>
                      </div>
                    )}

                    <div className="md:col-span-3">
                      <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                        Status
                      </label>
                      <div className="mt-1">
                        <select
                          id="status"
                          name="status"
                          value={formData.status}
                          onChange={handleChange}
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-base text-base border-gray-300 rounded-md h-12"
                        >
                          <option value="active">Ativo</option>
                          <option value="inactive">Inativo</option>
                        </select>
                      </div>
                    </div>
                    
                    {/* Campo de ID do dispositivo WhatsApp removido conforme solicitado */}
                  </div>

                  <div className="pt-6">
                    <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500 mb-6">
                      <h3 className="text-lg font-medium leading-6 text-blue-800">Locais de Atendimento</h3>
                      <p className="text-sm text-blue-600 mt-1">Adicione os locais onde o profissional atende</p>
                    </div>

                    {locations.map((location, index) => (
                      <div key={index} className="mb-8 p-4 border border-gray-200 rounded-lg bg-gray-50">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-md font-medium text-gray-700">Local {index + 1}</h4>
                          {locations.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeLocation(index)}
                              className="text-red-600 hover:text-red-800 transition duration-150 ease-in-out"
                            >
                              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 md:grid-cols-6">
                          <div className="md:col-span-2">
                            <label htmlFor={`cep-${index}`} className="block text-sm font-medium text-gray-700">
                              CEP
                            </label>
                            <div className="mt-1">
                              <input
                                type="text"
                                id={`cep-${index}`}
                                value={location.cep || ''}
                                onChange={(e) => handleLocationChange(index, 'cep', e.target.value)}
                                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-base text-base border-gray-300 rounded-md h-12"
                                placeholder="00000-000"
                                maxLength="9"
                              />
                              <p className="mt-1 text-xs text-gray-500">Digite o CEP para preencher automaticamente</p>
                            </div>
                          </div>
                          
                          <div className="md:col-span-2">
                            <label htmlFor={`city-${index}`} className="block text-sm font-medium text-gray-700">
                              Cidade
                            </label>
                            <div className="mt-1">
                              <input
                                type="text"
                                id={`city-${index}`}
                                value={location.city || ''}
                                onChange={(e) => handleLocationChange(index, 'city', e.target.value)}
                                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-base text-base border-gray-300 rounded-md h-12"
                                placeholder="Nome da cidade"
                              />
                            </div>
                          </div>

                          <div className="md:col-span-3">
                            <label htmlFor={`clinic-${index}`} className="block text-sm font-medium text-gray-700">
                              Clínica/Consultório
                            </label>
                            <div className="mt-1">
                              <input
                                type="text"
                                id={`clinic-${index}`}
                                value={location.clinic || ''}
                                onChange={(e) => handleLocationChange(index, 'clinic', e.target.value)}
                                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-base text-base border-gray-300 rounded-md h-12"
                                placeholder="Nome da clínica ou consultório"
                              />
                            </div>
                          </div>

                          <div className="md:col-span-4">
                            <label htmlFor={`address-${index}`} className="block text-sm font-medium text-gray-700">
                              Endereço
                            </label>
                            <div className="mt-1">
                              <input
                                type="text"
                                id={`address-${index}`}
                                value={location.address || ''}
                                onChange={(e) => handleLocationChange(index, 'address', e.target.value)}
                                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-base text-base border-gray-300 rounded-md h-12"
                                placeholder="Endereço completo"
                              />
                            </div>
                          </div>

                          <div className="md:col-span-2">
                            <label htmlFor={`price-${index}`} className="block text-sm font-medium text-gray-700">
                              Valor da Consulta (R$)
                            </label>
                            <div className="mt-1">
                              <input
                                type="text"
                                id={`price-${index}`}
                                value={location.price || ''}
                                onChange={(e) => handleLocationChange(index, 'price', e.target.value)}
                                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-base text-base border-gray-300 rounded-md h-12"
                                placeholder="0,00"
                              />
                            </div>
                          </div>

                          {/* Horários de Atendimento */}
                          <div className="md:col-span-6">
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                              Horários de Atendimento
                            </label>
                            <div className="space-y-3">
                              {Object.keys(location.schedule || {}).map((day) => (
                                <div key={day} className="flex items-center space-x-4">
                                  <div className="flex items-center">
                                    <input
                                      type="checkbox"
                                      id={`${day}-${index}`}
                                      checked={location.schedule[day]?.enabled || false}
                                      onChange={(e) => handleScheduleChange(index, day, 'enabled', e.target.checked)}
                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor={`${day}-${index}`} className="ml-2 text-sm text-gray-700 w-24">
                                      {getDayLabel(day)}
                                    </label>
                                  </div>
                                  
                                  {location.schedule[day]?.enabled && (
                                    <div className="flex items-center space-x-2">
                                      <div>
                                        <label className="block text-xs text-gray-500">Início</label>
                                        <input
                                          type="time"
                                          value={location.schedule[day]?.start || ''}
                                          onChange={(e) => handleScheduleChange(index, day, 'start', e.target.value)}
                                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full text-sm border-gray-300 rounded-md h-8"
                                          step="60"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs text-gray-500">Fim</label>
                                        <input
                                          type="time"
                                          value={location.schedule[day]?.end || ''}
                                          onChange={(e) => handleScheduleChange(index, day, 'end', e.target.value)}
                                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full text-sm border-gray-300 rounded-md h-8"
                                          step="60"
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="mt-6 flex justify-center">
                      <button
                        type="button"
                        onClick={addLocation}
                        className="inline-flex items-center px-4 py-2 border border-blue-300 shadow-sm text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out"
                      >
                        <svg className="-ml-0.5 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Adicionar Novo Local
                      </button>
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
                      disabled={saving}
                      className="flex justify-center items-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? (
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
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}