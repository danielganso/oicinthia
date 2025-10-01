import { useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function EmailConfirmation() {
  const router = useRouter();
  const { email } = router.query;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-amber-50 flex flex-col justify-center">
      <Head>
        <title>Confirme seu Email | CinthIA</title>
        <meta name="description" content="Confirme seu email para ativar sua conta CinthIA" />
      </Head>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="CinthIA" className="h-16 w-auto max-w-none" style={{display: 'block'}} />
        </div>
        
        <div className="bg-white py-8 px-4 shadow-lg rounded-lg sm:px-10 border border-blue-100">
          {/* Ícone de Email */}
          <div className="flex justify-center mb-6">
            <div className="bg-blue-100 rounded-full p-4">
              <svg className="h-12 w-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          <h2 className="text-center text-2xl font-bold text-blue-900 mb-4">
            Verifique seu email
          </h2>
          
          <div className="text-center space-y-4">
            <p className="text-blue-700">
              Enviamos um email de confirmação para:
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="font-semibold text-blue-800">
                {email || 'seu email'}
              </p>
            </div>
            
            <p className="text-sm text-blue-600">
              Clique no link do email para ativar sua conta e começar a usar a plataforma CinthIA.
            </p>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800">
                    Não recebeu o email?
                  </h3>
                  <div className="mt-2 text-sm text-amber-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>Verifique sua caixa de spam</li>
                      <li>Aguarde alguns minutos</li>
                      <li>Verifique se o email está correto</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="mt-8 space-y-3">
            <Link 
              href="/login"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300"
            >
              Voltar ao Login
            </Link>
            
            <Link 
              href="/register"
              className="w-full flex justify-center py-3 px-4 border border-blue-300 rounded-lg shadow-sm text-sm font-medium text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300"
            >
              Cadastrar Novamente
            </Link>
          </div>

          {/* Informações Adicionais */}
          <div className="mt-6 text-center">
            <p className="text-xs text-blue-500">
              Após confirmar seu email, você terá acesso a 7 dias grátis da plataforma CinthIA.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}