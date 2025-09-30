import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [plan, setPlan] = useState('autonomo');
  const router = useRouter();

  useEffect(() => {
    // Verificar se há um plano selecionado na URL
    if (router.query.plan) {
      setPlan(router.query.plan);
    }
  }, [router.query]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Registrar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone,
          }
        }
      });

      if (authError) throw authError;

      // Criar assinatura em trial com expiração em 7 dias
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 7);

      const { error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert([
          {
            owner_user_id: authData.user.id,
            plan: plan,
            status: 'test',
            current_period_end: trialEndDate.toISOString(),
          }
        ]);

      if (subscriptionError) throw subscriptionError;

      // Redirecionar para o dashboard após registro bem-sucedido
      router.push('/dashboard');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col justify-center">
      <Head>
        <title>Cadastro | CinthIA</title>
        <meta name="description" content="Crie sua conta na plataforma CinthIA" />
      </Head>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-extrabold text-blue-900">
          Crie sua conta
        </h2>
        <p className="mt-2 text-center text-sm text-blue-600">
          Ou{' '}
          <Link href="/login" className="font-medium text-amber-500 hover:text-amber-600 transition-colors duration-300">
            faça login se já possui uma conta
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg rounded-lg sm:px-10 border border-blue-100">
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

          <form className="space-y-6" onSubmit={handleRegister}>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-blue-800">
                Nome
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-blue-200 rounded-md shadow-sm placeholder-blue-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-blue-900"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-blue-800">
                E-mail
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-blue-200 rounded-md shadow-sm placeholder-blue-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-blue-900"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-blue-800">
                Telefone/WhatsApp
              </label>
              <div className="mt-1">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-blue-200 rounded-md shadow-sm placeholder-blue-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-blue-900"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-blue-800">
                Senha
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-blue-200 rounded-md shadow-sm placeholder-blue-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-blue-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-800">
                Plano selecionado
              </label>
              <div className="mt-1">
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-blue-200 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-blue-900"
                >
                  <option value="autonomo">Autônomo - R$ 97/mês</option>
                  <option value="ate_3">Clínica Pequena - R$ 197/mês</option>
                  <option value="ate_5">Clínica Média - R$ 297/mês</option>
                </select>
              </div>
              <p className="mt-2 text-sm text-blue-600">
                Você terá 7 dias grátis para testar a plataforma.
              </p>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300"
              >
                {loading ? 'Cadastrando...' : 'Cadastrar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}