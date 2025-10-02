import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { supabase } from '../lib/supabase';

/**
 * Componente para vincular WhatsApp usando a Evolution API
 * @param {object} props - Propriedades do componente
 * @param {string} props.professionalId - ID do profissional
 * @param {string} props.deviceId - ID do dispositivo WhatsApp (se já existir)
 * @param {function} props.onSuccess - Função chamada após vinculação bem-sucedida
 */
export default function WhatsAppLinkButton({ professionalId, deviceId, onSuccess }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [qrImage, setQrImage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [pollingInterval, setPollingInterval] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showQrCode, setShowQrCode] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [countdownActive, setCountdownActive] = useState(false);
  const [countdownFinished, setCountdownFinished] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [instanceExists, setInstanceExists] = useState(false);
  const countdownRef = useRef(null);
  
  // Verificar se existe uma instância ativa para este profissional
  useEffect(() => {
    const checkInstance = async () => {
      if (professionalId) {
        try {
          const { data, error } = await supabase
            .from('evolution_instances')
            .select('id, state')
            .eq('professional_id', professionalId);
            
          // Considera que existe instância se há registro E o estado não é disconnected/close
          const hasActiveInstance = data && data.length > 0 && 
            data.some(instance => 
              instance.state !== 'disconnected' && 
              instance.state !== 'close' && 
              instance.state !== null
            );
          
          setInstanceExists(hasActiveInstance);
        } catch (error) {
          console.error('Erro ao verificar instância:', error);
          setInstanceExists(false);
        }
      } else {
        setInstanceExists(false);
      }
    };
    
    checkInstance();
  }, [professionalId]);

  // Função para iniciar o processo de vinculação
  const handleLinkWhatsApp = async () => {
    setIsLoading(false);
    setShowQrCode(false);
    setCountdownFinished(false);
    setIsModalOpen(true);
  };
  
  // Função para desconectar WhatsApp antes de reconectar
  const handleDisconnectBeforeReconnect = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão não encontrada');

      const response = await fetch('/api/evolution/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          professionalId
        })
      });

      if (!response.ok) {
        const data = await response.json();
        // Se a instância não existe (404), continuar normalmente
        if (response.status !== 404) {
          throw new Error(data.error || 'Erro ao desconectar WhatsApp');
        }
      }

      console.log('WhatsApp desconectado com sucesso, prosseguindo com nova conexão...');
      return true;
    } catch (error) {
      console.error('Erro ao desconectar WhatsApp:', error);
      // Não bloquear o processo se a desconexão falhar
      toast.warn('Aviso: Não foi possível desconectar a instância anterior. Prosseguindo com nova conexão...');
      return true;
    }
  };

  // Função para salvar o número e iniciar o processo de vinculação
  const handleSaveNumber = async () => {
    if (!phoneNumber || phoneNumber.trim() === '') {
      toast.error('Por favor, insira o número de WhatsApp');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Se é uma reconexão (deviceId existe), desconectar primeiro
      if (deviceId) {
        console.log('Reconectando WhatsApp - desconectando instância anterior...');
        await handleDisconnectBeforeReconnect();
      }
      
      // Formatar o número no formato solicitado: 557581823998@s.whatsapp.net
      let cleanNumber = phoneNumber.trim().replace(/\D/g, '');
      
      // Garantir que o número comece com 55 (Brasil)
      if (!cleanNumber.startsWith('55')) {
        cleanNumber = '55' + cleanNumber;
      }
      
      const formattedNumber = `${cleanNumber}@s.whatsapp.net`;
      console.log('Número formatado:', formattedNumber);
      
      // Obter a sessão atual do Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Sessão não encontrada. Por favor, faça login novamente.');
      }
      
      // Iniciar o fluxo da API do Evolution
      const response = await fetch('/api/evolution/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          professionalId,
          phoneNumber: formattedNumber
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao vincular WhatsApp');
      }

      setQrImage(data.qrImage);
      setShowQrCode(true);
      startPolling();
      startCountdown();
    } catch (error) {
      console.error('Erro ao vincular WhatsApp:', error);
      toast.error(error.message || 'Erro ao vincular WhatsApp');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Função para continuar para a próxima etapa (mantida para compatibilidade)
  const handleStartLinking = async () => {
    handleSaveNumber();
  };

  // Função para verificar o status da vinculação
  const checkStatus = async () => {
    try {
      // Obter a sessão atual do Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Sessão não encontrada');
      }
      
      const response = await fetch(`/api/evolution/status?professionalId=${professionalId}&numero_informado=${encodeURIComponent(phoneNumber)}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao verificar status');
      }

      setStatus(data.state);

      // Se conectado, finaliza o polling e fecha o modal
      if (data.connected) {
        stopPolling();
        stopCountdown();
        setIsModalOpen(false);
        toast.success('WhatsApp vinculado com sucesso!');
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      // Não exibimos toast de erro aqui para não incomodar o usuário durante o polling
    }
  };

  // Função para verificar conexão manualmente
  const handleCheckConnection = async () => {
    setCheckingConnection(true);
    try {
      console.log("Iniciando verificação de conexão para o profissional:", professionalId);
      
      // Obter a sessão atual do Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Sessão não encontrada');
      }
      
      console.log("Verificando conexão para profissional:", professionalId);
      
      // Usar API interna segura em vez de chamar Evolution API diretamente
      const response = await fetch('/api/evolution/check-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          professionalId
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Erro na API:", errorData);
        throw new Error(errorData.error || `Erro ao verificar status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Resposta da verificação de status:", data);

      // Atualizar o status na tabela evolution_instances via API (se necessário)
      const updateResponse = await fetch(`/api/evolution/update-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          professionalId,
          instanceName: data.instanceKey,
          state: data.state,
          connected: data.connected,
          ownerJid: data.ownerJid,
          numero_informado: phoneNumber // Salvar o número informado pelo usuário
        }),
      });
      
      if (!updateResponse.ok) {
        const updateErrorData = await updateResponse.json();
        console.error("Erro ao atualizar o status no banco de dados:", updateErrorData);
        throw new Error('Não foi possível atualizar o status no banco de dados');
      } else {
        console.log("Status atualizado com sucesso no banco de dados");
      }

      setStatus(data.state);

      // Sempre fechar o modal quando o usuário clicar em "Verificar Conexão"
      console.log('Usuário clicou em verificar conexão, fechando modal...');
      setIsModalOpen(false);
      
      // Se o estado for 'open', mostrar sucesso
      if (data.connected) {
        toast.success('WhatsApp conectado com sucesso!');
        console.log('Chamando onSuccess...');
        if (onSuccess) onSuccess();
      } else {
        // Mostrar mensagem com o status atual
        const statusDisplay = data.connected ? 'Conectado' : data.state;
        toast.info(`Status atual: ${statusDisplay}`);
      }
      
      // Refresh da página para atualizar informações
      console.log('Fazendo refresh da página...');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      toast.error(error.message || 'Erro ao verificar status');
    } finally {
      setCheckingConnection(false);
    }
  };

  // Inicia o polling para verificar o status
  const startPolling = () => {
    if (pollingInterval) return;
    const interval = setInterval(checkStatus, 3000); // A cada 3 segundos
    setPollingInterval(interval);
  };
  
  // Inicia a contagem regressiva
  const startCountdown = () => {
    if (countdownActive) return;
    
    setCountdown(30);
    setCountdownActive(true);
    
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          setCountdownActive(false);
          setCountdownFinished(true);
          
          // Verificação automática quando o countdown termina
          console.log('Countdown terminou, iniciando verificação automática...');
          setTimeout(() => {
            handleCheckConnection();
          }, 1000); // Aguarda 1 segundo antes de verificar
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  // Para a contagem regressiva
  const stopCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      setCountdownActive(false);
      setCountdownFinished(false);
    }
  };

  // Para o polling
  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  };

  // Limpa o intervalo quando o componente é desmontado
  const closeModal = () => {
    stopPolling();
    stopCountdown();
    setIsModalOpen(false);
    
    // Refresh da página para atualizar informações
    console.log('Modal fechado, fazendo refresh da página...');
    if (onSuccess) {
      onSuccess(); // Chama callback se existir
    }
    // Força um refresh da página após um pequeno delay
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };
  
  // Limpa os intervalos quando o componente é desmontado
  useEffect(() => {
    return () => {
      stopPolling();
      stopCountdown();
    };
  }, []);

  return (
    <div className="flex space-x-2">
      <button
        type="button"
        onClick={handleLinkWhatsApp}
        disabled={isLoading}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Carregando...
          </>
        ) : (
          <>
            <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {deviceId ? 'Reconectar WhatsApp' : 'Vincular WhatsApp'}
          </>
        )}
      </button>
      
      {deviceId && instanceExists && (
        <button
          type="button"
          onClick={() => {
            console.log("Verificando conexão para o profissional:", professionalId);
            setCheckingConnection(true);
            handleCheckConnection();
          }}
          disabled={checkingConnection}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {checkingConnection ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Verificando...
            </>
          ) : (
            <>
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Verificar Conexão
            </>
          )}
        </button>
      )}

      {/* Modal para exibir o QR Code */}
      {isModalOpen && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Vincular WhatsApp</h3>
                  
                  {!showQrCode ? (
                    <div className="mt-4">
                      <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                        Número do WhatsApp (com DDD)
                      </label>
                      <div className="mt-1">
                        <input
                          type="tel"
                          name="phoneNumber"
                          id="phoneNumber"
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          placeholder="+5511999999999"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                        />
                      </div>
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={handleSaveNumber}
                          disabled={isLoading}
                          className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:text-sm"
                        >
                          {isLoading ? 'Carregando...' : 'Salvar'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Abra o WhatsApp → Aparelhos conectados → Conectar um aparelho → aponte a câmera para este QR
                        </p>
                      </div>
                      <div className="mt-4 flex justify-center">
                        {qrImage ? (
                          <div className="text-center">
                            <img src={qrImage} alt="QR Code para vincular WhatsApp" className="w-64 h-64 mx-auto" />
                            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <p className="text-sm text-yellow-800 font-medium">
                                ⏳ Aguarde o time processar a conexão...
                              </p>
                              <p className="text-xs text-yellow-600 mt-1">
                                Após escanear o QR code, aguarde alguns segundos para a confirmação da conexão.
                              </p>
                            </div>
                            {countdownActive && (
                              <div className="mt-3 bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto text-lg font-bold">
                                {countdown}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-64 h-64 flex items-center justify-center bg-gray-100">
                            <svg className="animate-spin h-10 w-10 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          </div>
                        )}
                      </div>
                      {status && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-gray-700">
                            Status: {status === 'connected' || status === 'open' || status === 'Open' ? 'Conectado' : status}
                          </p>
                        </div>
                      )}
                      {(instanceExists || countdownFinished) && (
                        <div className="mt-4">
                          <button
                            type="button"
                            onClick={handleCheckConnection}
                            disabled={checkingConnection}
                            className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                          >
                            {checkingConnection ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Verificando...
                              </>
                            ) : (
                              'Verificar Conexão'
                            )}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="mt-5 sm:mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}