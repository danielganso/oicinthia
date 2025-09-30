import { useState } from 'react';
import Link from 'next/link';

export default function TrialExpiredModal({ isOpen, onClose, subscription }) {
  if (!isOpen) return null;

  const daysExpired = subscription?.current_period_end 
    ? Math.ceil((new Date() - new Date(subscription.current_period_end)) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">
            Período de Teste Expirado
          </h3>
          <div className="mt-2 px-7 py-3">
            <p className="text-sm text-gray-500">
              Seu período de teste gratuito de 7 dias expirou há {daysExpired} dia(s). 
              Para continuar usando a CinthIA, você precisa escolher um plano.
            </p>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Planos Disponíveis:</h4>
              <div className="space-y-2 text-xs text-blue-800">
                <div className="flex justify-between">
                  <span>🏃‍♂️ Autônomo</span>
                  <span className="font-medium">R$ 97/mês</span>
                </div>
                <div className="flex justify-between">
                  <span>🏢 Clínica Pequena</span>
                  <span className="font-medium">R$ 197/mês</span>
                </div>
                <div className="flex justify-between">
                  <span>🏥 Clínica Média</span>
                  <span className="font-medium">R$ 297/mês</span>
                </div>
              </div>
            </div>
          </div>
          <div className="items-center px-4 py-3">
            <div className="flex flex-col space-y-2">
              <Link href="/dashboard/subscriptions">
                <button className="px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300">
                  Escolher Plano
                </button>
              </Link>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-800 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}