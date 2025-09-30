import { useState } from 'react';

export default function PlanSelectionModal({ isOpen, onClose, onSelectPlan }) {
  const [selectedPlan, setSelectedPlan] = useState(null);

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

  const handleSelectPlan = (planId) => {
    setSelectedPlan(planId);
  };

  const handleConfirm = () => {
    if (selectedPlan) {
      onSelectPlan(selectedPlan);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Escolha seu Plano</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Alert */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Sua assinatura está bloqueada
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>Para continuar usando o sistema, escolha um plano e efetue o pagamento.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Plans Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                onClick={() => handleSelectPlan(plan.id)}
                className={`relative bg-white p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:transform hover:scale-105 ${
                  plan.popular 
                    ? 'border-blue-500 transform scale-105' 
                    : selectedPlan === plan.id 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <span className="bg-gradient-to-r from-amber-400 to-amber-500 text-white text-sm font-bold uppercase py-1 px-4 rounded-full">
                      Mais popular
                    </span>
                  </div>
                )}
                
                {selectedPlan === plan.id && (
                  <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
                    <span className="bg-green-500 text-white text-xs font-bold uppercase py-1 px-3 rounded-full">
                      Selecionado
                    </span>
                  </div>
                )}

                <div className="text-center mb-4">
                  <div className="text-3xl mb-2">{plan.icon}</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    R$ {plan.price}
                    <span className="text-sm text-gray-500">/mês</span>
                  </div>
                  <div className="h-1 w-16 bg-amber-400 mx-auto"></div>
                </div>

                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm text-gray-700">
                      <svg className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedPlan}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                selectedPlan
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Continuar para Pagamento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}