import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-toastify';

export default function MeusDados() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    cnpj: '',
    telefone: '',
    telefone_adicional: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [showWhatsAppSection, setShowWhatsAppSection] = useState(false);
  
  // Estados do WhatsApp Modal
  const [whatsappStatus, setWhatsappStatus] = useState({
    connected: false,
    qrCode: '',
    loading: false,
    instanceKey: '',
    state: 'disconnected'
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [countdown, setCountdown] = useState(30);
  const [countdownActive, setCountdownActive] = useState(false);
  const [countdownFinished, setCountdownFinished] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const countdownRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  useEffect(() => {
    loadUserData();
  }, []);

  // Verificar status do WhatsApp ao carregar (para planos ate_3 e ate_5)
  useEffect(() => {
    console.log('🔄 useEffect: Executando com subscriptionData:', subscriptionData);
    console.log('🔄 useEffect: Plan:', subscriptionData?.plan);
    console.log('🔄 useEffect: showWhatsAppSection:', showWhatsAppSection);
    
    if (subscriptionData && (subscriptionData.plan === 'ate_3' || subscriptionData.plan === 'ate_5')) {
      setShowWhatsAppSection(true);
      
      checkWhatsAppStatus().catch(error => {
        console.error('❌ useEffect: Erro em checkWhatsAppStatus:', error);
      });
    } else {
      setShowWhatsAppSection(false);
    }
  }, [subscriptionData]);

  const loadUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      setUser(session.user);

      // Buscar dados da subscription
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('owner_user_id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar dados da subscription:', error);
      } else if (subscription) {
        setSubscriptionData(subscription);
        setFormData({
          nome: subscription.nome || '',
          cpf: subscription.cpf || '',
          cnpj: subscription.cnpj || '',
          telefone: subscription.telefone || '',
          telefone_adicional: subscription.telefone_adicional || '',
          email: session.user.email || '',
          password: '',
          confirmPassword: ''
        });

        // Mostrar seção WhatsApp apenas para planos ate_3 e ate_5
        setShowWhatsAppSection(subscription.plan === 'ate_3' || subscription.plan === 'ate_5');
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!formData.telefone.trim()) {
      newErrors.telefone = 'Telefone é obrigatório';
    }

    // Validar CPF ou CNPJ
    if (!formData.cpf.trim() && !formData.cnpj.trim()) {
      newErrors.cpf = 'CPF ou CNPJ é obrigatório';
      newErrors.cnpj = 'CPF ou CNPJ é obrigatório';
    }

    // Se preencheu senha, validar confirmação
    if (formData.password && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Senhas não coincidem';
    }

    if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setErrors({});
    setSuccessMessage('');

    try {
      // Atualizar dados na tabela subscriptions
      const { error: subscriptionError } = await supabase
        .from('subscriptions')
        .update({
          nome: formData.nome,
          cpf: formData.cpf || null,
          cnpj: formData.cnpj || null,
          telefone: formData.telefone,
          telefone_adicional: formData.telefone_adicional || null,
          updated_at: new Date().toISOString()
        })
        .eq('owner_user_id', user.id);

      if (subscriptionError) {
        throw subscriptionError;
      }

      // Atualizar email no Supabase Auth se mudou
      if (formData.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: formData.email
        });

        if (emailError) {
          throw emailError;
        }
      }

      // Atualizar senha se foi fornecida
      if (formData.password) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: formData.password
        });

        if (passwordError) {
          throw passwordError;
        }
      }

      setSuccessMessage('Dados atualizados com sucesso!');
      
      // Limpar campos de senha
      setFormData(prev => ({
        ...prev,
        password: '',
        confirmPassword: ''
      }));

      // Sair do modo de edição
      setIsEditing(false);

      // Recarregar dados
      await loadUserData();

    } catch (error) {
      console.error('Erro ao salvar dados:', error);
      setErrors({ general: 'Erro ao salvar dados. Tente novamente.' });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Limpar erro do campo quando usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const formatCPF = (value) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatCNPJ = (value) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const formatPhone = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  // Funções do WhatsApp (para planos ate_3 e ate_5)
  const connectWhatsApp = async () => {
    if (!subscriptionData?.public_code) {
      alert('Código público da clínica não encontrado');
      return;
    }

    setWhatsappStatus(prev => ({ ...prev, loading: true }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Sessão não encontrada. Por favor, faça login novamente.');
      }

      const response = await fetch('/api/evolution/clinic-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'connect'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao conectar WhatsApp');
      }

      const data = await response.json();
      
      setWhatsappStatus({
        connected: data.connected,
        qrCode: data.qrImage,
        loading: false,
        instanceKey: data.instanceKey
      });

      // Iniciar polling para verificar conexão
      if (!data.connected && data.qrImage) {
        startPolling();
      }

    } catch (error) {
      console.error('Erro ao conectar WhatsApp:', error);
      setWhatsappStatus(prev => ({ ...prev, loading: false }));
      alert('Erro ao conectar WhatsApp: ' + error.message);
    }
  };

  const disconnectWhatsApp = async () => {
    setWhatsappStatus(prev => ({ ...prev, loading: true }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Sessão não encontrada. Por favor, faça login novamente.');
      }

      const response = await fetch('/api/evolution/clinic-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'disconnect'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao desconectar WhatsApp');
      }

      setWhatsappStatus({
        connected: false,
        qrCode: null,
        loading: false,
        instanceKey: null
      });

      alert('WhatsApp desconectado com sucesso!');

    } catch (error) {
      console.error('Erro ao desconectar WhatsApp:', error);
      setWhatsappStatus(prev => ({ ...prev, loading: false }));
      alert('Erro ao desconectar WhatsApp: ' + error.message);
    }
  };

  const checkWhatsAppStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return;
      }

      // Verificar diretamente na tabela evolution_instances usando o public_code da clínica
      if (!subscriptionData?.public_code) {
        return false;
      }
      
      const { data: instances, error } = await supabase
        .from('evolution_instances')
        .select('*')
        .eq('instance_key', subscriptionData.public_code)
        .eq('owner_user_id', session.user.id);

      if (error) {
        console.error('❌ checkWhatsAppStatus: Erro ao consultar tabela:', error);
        return false;
      }

      if (!instances || instances.length === 0) {
        setWhatsappStatus(prev => ({
          ...prev,
          connected: false,
          loading: false,
          instanceKey: null,
          state: 'disconnected'
        }));
        return false;
      }

      // Pegar a primeira instância (deveria haver apenas uma para a clínica)
      const instance = instances[0];

      // Verificar se o state é 'open' (conectado)
      const isConnected = instance.state === 'open';
      
      setWhatsappStatus(prev => {
        const newStatus = {
          ...prev,
          connected: isConnected,
          loading: false,
          instanceKey: instance.instance_key || instance.instance_name,
          state: instance.state || 'unknown'
        };
        return newStatus;
      });

      return isConnected;

    } catch (error) {
      console.error('❌ checkWhatsAppStatus: Erro:', error);
      setWhatsappStatus(prev => ({ ...prev, loading: false }));
      return false;
    }
  };

  // Polling para verificar conexão
   const startPolling = () => {
     const interval = setInterval(async () => {
       const isConnected = await checkWhatsAppStatus();
       
       if (isConnected) {
         clearInterval(interval);
         setWhatsappStatus(prev => ({
           ...prev,
           connected: true,
           qrCode: null,
           loading: false
         }));
         alert('WhatsApp conectado com sucesso!');
       }
     }, 3000); // Verificar a cada 3 segundos

     // Parar polling após 2 minutos
     setTimeout(() => {
       clearInterval(interval);
     }, 120000);
   };

   // Funções do WhatsApp Modal (baseadas no WhatsAppLinkButton)
   const handleLinkWhatsApp = async () => {
     if (!subscriptionData?.public_code) {
       alert('Código público da clínica não encontrado');
       return;
     }

     // Se já está conectado, primeiro desconectar para reconectar
     if (whatsappStatus.connected) {
       setWhatsappStatus(prev => ({ ...prev, loading: true }));
       
       try {
         const { data: { session } } = await supabase.auth.getSession();
         
         if (!session) {
           throw new Error('Sessão não encontrada. Por favor, faça login novamente.');
         }

         // Desconectar primeiro
         const disconnectResponse = await fetch('/api/evolution/clinic-whatsapp', {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${session.access_token}`,
           },
           body: JSON.stringify({
             action: 'disconnect'
           }),
         });

         if (!disconnectResponse.ok) {
           const errorData = await disconnectResponse.json();
           throw new Error(errorData.error || 'Erro ao desconectar WhatsApp');
         }

         // Aguardar um pouco para garantir que a desconexão foi processada
         await new Promise(resolve => setTimeout(resolve, 2000));
         
         // Atualizar status local
         setWhatsappStatus({
           connected: false,
           qrCode: null,
           loading: false,
           instanceKey: null,
           state: 'disconnected'
         });

       } catch (error) {
         console.error('Erro ao desconectar antes de reconectar:', error);
         setWhatsappStatus(prev => ({ ...prev, loading: false }));
         alert('Erro ao desconectar WhatsApp atual: ' + error.message);
         return;
       }
     }
   
     setIsModalOpen(true);
     setShowQrCode(false);
     setCountdownFinished(false);
     setCountdown(30);
   };
   
   const handleSaveNumber = async () => {
     setWhatsappStatus(prev => ({ ...prev, loading: true }));
     setShowQrCode(false);
   
     try {
       const { data: { session } } = await supabase.auth.getSession();
       
       if (!session) {
         throw new Error('Sessão não encontrada. Por favor, faça login novamente.');
       }
   
       const response = await fetch('/api/evolution/clinic-whatsapp', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${session.access_token}`,
         },
         body: JSON.stringify({
           action: 'connect'
         }),
       });
   
       if (!response.ok) {
         const errorData = await response.json();
         throw new Error(errorData.error || 'Erro ao conectar WhatsApp');
       }
   
       const data = await response.json();
       
       setWhatsappStatus({
         connected: data.connected,
         qrCode: data.qrImage,
         loading: false,
         instanceKey: data.instanceKey
       });
   
       if (data.qrImage && !data.connected) {
         setShowQrCode(true);
         startPollingModal();
         startCountdown();
       }
   
     } catch (error) {
       console.error('Erro ao conectar WhatsApp:', error);
       setWhatsappStatus(prev => ({ ...prev, loading: false }));
       toast.error('Erro ao conectar WhatsApp: ' + error.message);
     }
   };
   
   const checkStatus = async () => {
     try {
       const { data: { session } } = await supabase.auth.getSession();
       
       if (!session) return false;
   
       const response = await fetch('/api/evolution/clinic-whatsapp', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${session.access_token}`,
         },
         body: JSON.stringify({
           action: 'status'
         }),
       });
   
       if (response.ok) {
         const data = await response.json();
         
         // Verificar se está conectado: data.connected OU se o state é 'open'
         const isConnected = data.connected || data.state === 'open';
         
         if (isConnected) {
           // Atualizar o banco de dados com os dados da API
           if (data.instanceKey) {
             const updateResponse = await fetch(`/api/evolution/update-status`, {
               method: 'POST',
               headers: {
                 'Content-Type': 'application/json',
                 'Authorization': `Bearer ${session.access_token}`,
               },
               body: JSON.stringify({
                 instanceName: data.instanceKey,
                 state: data.state,
                 connected: isConnected,
                 ownerJid: data.ownerJid || null
               }),
             });
             
             if (!updateResponse.ok) {
               console.error("Erro ao atualizar o status no banco de dados");
             } else {
               console.log("Status atualizado com sucesso no banco de dados");
             }
           }
           
           setWhatsappStatus(prev => ({
             ...prev,
             connected: true,
             qrCode: null,
             loading: false
           }));
           
           stopPollingModal();
           stopCountdown();
           closeModal();
           
           toast.success('WhatsApp conectado com sucesso!');
           
           // Refresh da página após 2 segundos
           setTimeout(() => {
             window.location.reload();
           }, 2000);
           
           return true;
         }
         
         return false;
       }
     } catch (error) {
       console.error('Erro ao verificar status do WhatsApp:', error);
     }
     
     return false;
   };
   
   const handleCheckConnection = async () => {
     setCheckingConnection(true);
     
     try {
       // Obter a sessão atual do Supabase
       const { data: { session } } = await supabase.auth.getSession();
       
       if (!session) {
         throw new Error('Sessão não encontrada');
       }
   
       // Buscar TODAS as instâncias do owner_user_id
       const { data: instances, error: instanceError } = await supabase
         .from('evolution_instances')
         .select('*')
         .eq('owner_user_id', session.user.id);
   
       if (instanceError) {
         throw new Error('Erro ao buscar instâncias: ' + instanceError.message);
       }
       
       if (!instances || instances.length === 0) {
         throw new Error('Nenhuma instância encontrada para este usuário');
       }
   
       // Verificar cada instância individualmente
       let successCount = 0;
       let errorCount = 0;
       const results = [];
       
       for (const instance of instances) {
         try {
           const response = await fetch('/api/evolution/check-connection', {
             method: 'POST',
             headers: {
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${session.access_token}`,
             },
             body: JSON.stringify({
               professionalId: instance.professional_id || null,
               instanceKey: instance.instance_key,
               instanceName: instance.instance_name || instance.instance_key
             }),
           });

           if (!response.ok) {
             const errorData = await response.json();
             errorCount++;
             results.push({
               instanceKey: instance.instance_key,
               success: false,
               error: errorData.error || `Erro ${response.status}`
             });
             continue;
           }

           const data = await response.json();
           
           successCount++;
           results.push({
             instanceKey: instance.instance_key,
             success: true,
             connected: data.connected,
             state: data.state,
             ownerJid: data.ownerJid,
             number_e164: data.number_e164
           });
           
         } catch (error) {
           errorCount++;
           results.push({
             instanceKey: instance.instance_key,
             success: false,
             error: error.message
           });
         }
       }

       // Sempre fechar o modal quando verificar conexão
       closeModal();
       
       // Atualizar estado local do WhatsApp baseado nos resultados
       // Verificar se pelo menos uma instância está conectada
       const hasConnectedInstance = results.some(r => r.success && r.connected);
       const connectedInstance = results.find(r => r.success && r.connected);
       
       setWhatsappStatus(prev => ({
         ...prev,
         connected: hasConnectedInstance,
         state: hasConnectedInstance ? 'open' : 'disconnected',
         instanceKey: connectedInstance?.instanceKey || prev.instanceKey,
         loading: false
       }));
       
       // Mostrar mensagem baseada nos resultados
       if (successCount === 0) {
         toast.error(`Erro ao verificar ${instances.length} instância(s)`);
       } else if (errorCount === 0) {
         const connectedCount = results.filter(r => r.success && r.connected).length;
         if (connectedCount > 0) {
           toast.success('WhatsApp conectado');
         } else {
           toast.info(`${instances.length} instância(s) verificada(s) - nenhuma conectada`);
         }
       } else {
          const connectedCount = results.filter(r => r.success && r.connected).length;
          if (connectedCount > 0) {
            toast.success('WhatsApp conectado');
          } else {
            toast.warning(`${successCount} verificada(s), ${errorCount} erro(s) - nenhuma conectada`);
          }
        }
       
        // Refresh da página para atualizar informações
        setTimeout(() => {
          window.location.reload();
        }, 1500);
       
     } catch (error) {
       toast.error(error.message || 'Erro ao verificar conexão');
     } finally {
       setCheckingConnection(false);
     }
   };
   
   const startPollingModal = () => {
     if (pollingInterval) {
       clearInterval(pollingInterval);
     }
     
     const interval = setInterval(async () => {
       await checkStatus();
     }, 3000);
     
     setPollingInterval(interval);
   };
   
   const startCountdown = () => {
     setCountdownActive(true);
     setCountdown(30);
     
     countdownRef.current = setInterval(() => {
       setCountdown(prev => {
         if (prev <= 1) {
           setCountdownActive(false);
           setCountdownFinished(true);
           clearInterval(countdownRef.current);
           handleCheckConnection();
           return 0;
         }
         return prev - 1;
       });
     }, 1000);
   };
   
   const stopPollingModal = () => {
     if (pollingInterval) {
       clearInterval(pollingInterval);
       setPollingInterval(null);
     }
   };
   
   const stopCountdown = () => {
     if (countdownRef.current) {
       clearInterval(countdownRef.current);
       countdownRef.current = null;
     }
     setCountdownActive(false);
   };
   
   const closeModal = () => {
     setIsModalOpen(false);
     setShowQrCode(false);
     setWhatsappStatus(prev => ({ ...prev, qrCode: null }));
     setCountdownActive(false);
     setCountdownFinished(false);
     
     // Parar o polling se estiver ativo
     if (pollingIntervalRef.current) {
       clearInterval(pollingIntervalRef.current);
       pollingIntervalRef.current = null;
     }
     
     // Verificar automaticamente a conexão ao fechar o modal
     checkWhatsAppStatus();
   };
   
   if (loading) {
    return (
      <Layout title="Meus Dados">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Meus Dados">
      <div className="max-w-4xl mx-auto">
        {/* Mensagens */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            {successMessage}
          </div>
        )}

        {errors.general && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {errors.general}
          </div>
        )}

        {/* Informações da Conta */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Informações da Conta</h2>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="-ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editar
              </button>
            ) : (
              <div className="space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setErrors({});
                    setSuccessMessage('');
                    // Recarregar dados originais
                    loadUserData();
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {!isEditing ? (
            /* Modo de Visualização */
            <div className="space-y-6">
              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{formData.nome || 'Não informado'}</p>
              </div>

              {/* CPF e CNPJ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                  <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{formData.cpf || 'Não informado'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
                  <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{formData.cnpj || 'Não informado'}</p>
                </div>
              </div>

              {/* Telefones */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{formData.telefone || 'Não informado'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone Adicional</label>
                  <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{formData.telefone_adicional || 'Não informado'}</p>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{formData.email || 'Não informado'}</p>
              </div>

              {/* Public Code da Clínica (apenas para planos ate_3 e ate_5) */}
              {subscriptionData && (subscriptionData.plan === 'ate_3' || subscriptionData.plan === 'ate_5') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código da Clínica</label>
                  <p className="text-sm text-gray-900 bg-blue-50 px-3 py-2 rounded-md font-mono">{subscriptionData.public_code || 'Não gerado'}</p>
                  <p className="mt-1 text-xs text-gray-500">Este código identifica sua clínica no sistema</p>
                </div>
              )}
            </div>
          ) : (
            /* Modo de Edição */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.nome ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Seu nome completo"
                />
                {errors.nome && <p className="mt-1 text-sm text-red-600">{errors.nome}</p>}
              </div>

            {/* CPF e CNPJ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CPF
                </label>
                <input
                  type="text"
                  value={formData.cpf}
                  onChange={(e) => handleInputChange('cpf', formatCPF(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.cpf ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="000.000.000-00"
                  maxLength="14"
                />
                {errors.cpf && <p className="mt-1 text-sm text-red-600">{errors.cpf}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CNPJ
                </label>
                <input
                  type="text"
                  value={formData.cnpj}
                  onChange={(e) => handleInputChange('cnpj', formatCNPJ(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.cnpj ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="00.000.000/0000-00"
                  maxLength="18"
                />
                {errors.cnpj && <p className="mt-1 text-sm text-red-600">{errors.cnpj}</p>}
              </div>
            </div>

            {/* Telefones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone *
                </label>
                <input
                  type="tel"
                  value={formData.telefone}
                  onChange={(e) => handleInputChange('telefone', formatPhone(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.telefone ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="(11) 99999-9999"
                  maxLength="15"
                />
                {errors.telefone && <p className="mt-1 text-sm text-red-600">{errors.telefone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone Adicional
                </label>
                <input
                  type="tel"
                  value={formData.telefone_adicional}
                  onChange={(e) => handleInputChange('telefone_adicional', formatPhone(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="(11) 99999-9999"
                  maxLength="15"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="seu@email.com"
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            {/* Senhas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nova Senha
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Deixe em branco para manter atual"
                />
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Nova Senha
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Confirme a nova senha"
                />
                {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
              </div>
            </div>

            {/* Código Público (somente leitura) */}
            {subscriptionData && (subscriptionData.plan === 'ate_3' || subscriptionData.plan === 'ate_5') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código da Clínica
                </label>
                <input
                  type="text"
                  value={subscriptionData.public_code || 'Não gerado'}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-600 font-mono"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Este código identifica sua clínica no sistema e é gerado automaticamente.
                </p>
              </div>
            )}

            {/* Botão Salvar */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
            </form>
          )}
        </div>

        {/* Seção WhatsApp (apenas para planos ate_3 e ate_5) */}
        {showWhatsAppSection && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">WhatsApp da Clínica</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">Status da Conexão</h3>
                  <p className={`text-sm ${whatsappStatus.connected ? 'text-green-600' : 'text-red-600'}`}>
                    {whatsappStatus.connected ? 'Conectado' : 'Desconectado'}
                  </p>
                </div>
                
                <div className="space-x-2">
                  {whatsappStatus.connected ? (
                    // Quando conectado: mostrar Verificar Conexão e Desconectar
                    <>
                      <button
                        onClick={handleCheckConnection}
                        disabled={checkingConnection}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                      >
                        {checkingConnection ? 'Verificando...' : 'Verificar Conexão'}
                      </button>
                      <button
                        onClick={handleLinkWhatsApp}
                        disabled={whatsappStatus.loading}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                      >
                        {whatsappStatus.loading ? 'Reconectando...' : 'Reconectar WhatsApp'}
                      </button>
                      <button
                        onClick={disconnectWhatsApp}
                        disabled={whatsappStatus.loading}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
                      >
                        {whatsappStatus.loading ? 'Desconectando...' : 'Desconectar WhatsApp'}
                      </button>
                    </>
                  ) : whatsappStatus.instanceKey ? (
                    // Quando há instância mas não conectado: mostrar Reconectar e Verificar Conexão
                    <>
                      <button
                        onClick={handleLinkWhatsApp}
                        disabled={whatsappStatus.loading}
                        className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50"
                      >
                        {whatsappStatus.loading ? 'Reconectando...' : 'Reconectar WhatsApp'}
                      </button>
                      <button
                        onClick={handleCheckConnection}
                        disabled={checkingConnection}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                      >
                        {checkingConnection ? 'Verificando...' : 'Verificar Conexão'}
                      </button>
                    </>
                  ) : (
                    // Quando não há conexão nem instância: mostrar apenas Conectar
                    <button
                      onClick={handleLinkWhatsApp}
                      disabled={whatsappStatus.loading}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                      {whatsappStatus.loading ? 'Conectando...' : 'Conectar WhatsApp'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal WhatsApp */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Vincular WhatsApp
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {!showQrCode ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Clique em "Conectar" para gerar o QR Code e vincular seu WhatsApp.
                  </p>
                  <button
                    onClick={handleSaveNumber}
                    disabled={whatsappStatus.loading}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {whatsappStatus.loading ? 'Gerando QR Code...' : 'Conectar'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-4">
                      Escaneie o QR Code abaixo com seu WhatsApp:
                    </p>
                    
                    {whatsappStatus.qrCode && (
                      <div className="flex justify-center mb-4">
                        <img 
                          src={whatsappStatus.qrCode} 
                          alt="QR Code WhatsApp" 
                          className="max-w-xs border rounded-lg"
                        />
                      </div>
                    )}

                    {countdownActive && (
                      <div className="mb-4">
                        <p className="text-sm text-blue-600">
                          Verificação automática em: <span className="font-bold">{countdown}s</span>
                        </p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
                            style={{ width: `${(countdown / 30) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {countdownFinished && (
                      <p className="text-sm text-green-600 mb-4">
                        Verificando conexão...
                      </p>
                    )}

                    <button
                      onClick={handleCheckConnection}
                      disabled={checkingConnection}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {checkingConnection ? 'Verificando...' : 'Verificar Conexão'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}