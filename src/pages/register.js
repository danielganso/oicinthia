import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [telefone, setTelefone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [plan, setPlan] = useState('autonomo');
  const [userType, setUserType] = useState('pessoa_fisica'); // pessoa_fisica ou pessoa_juridica
  const router = useRouter();

  useEffect(() => {
    // Verificar se há um plano selecionado na URL
    if (router.query.plan) {
      setPlan(router.query.plan);
    }
  }, [router.query]);

  // Função para formatar CPF
  const formatCPF = (value) => {
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length <= 11) {
      return cleanValue.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return cleanValue.slice(0, 11).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  // Função para formatar CNPJ
  const formatCNPJ = (value) => {
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length <= 14) {
      return cleanValue.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return cleanValue.slice(0, 14).replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  // Função para formatar telefone
  const formatPhone = (value) => {
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length <= 11) {
      return cleanValue.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return cleanValue.slice(0, 11).replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

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
          },
          emailRedirectTo: `${window.location.origin}/login`
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
            nome: name, // Adicionando o nome na tabela subscriptions
            cpf: userType === 'pessoa_fisica' ? cpf.replace(/\D/g, '') : null,
            cnpj: userType === 'pessoa_juridica' ? cnpj.replace(/\D/g, '') : null,
            telefone: telefone.replace(/\D/g, ''),
          }
        ]);

      if (subscriptionError) throw subscriptionError;

      // Redirecionar para a tela de confirmação de email
      router.push(`/email-confirmation?email=${encodeURIComponent(email)}`);
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
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="CinthIA" className="h-16 w-auto max-w-none" style={{display: 'block'}} />
        </div>
        
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
            {/* Tipo de usuário */}
            <div>
              <label className="block text-sm font-medium text-blue-800 mb-3">
                Tipo de cadastro
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="userType"
                    value="pessoa_fisica"
                    checked={userType === 'pessoa_fisica'}
                    onChange={(e) => setUserType(e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-blue-300"
                  />
                  <span className="ml-2 text-sm text-blue-800">Pessoa Física</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="userType"
                    value="pessoa_juridica"
                    checked={userType === 'pessoa_juridica'}
                    onChange={(e) => setUserType(e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-blue-300"
                  />
                  <span className="ml-2 text-sm text-blue-800">Pessoa Jurídica</span>
                </label>
              </div>
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-blue-800">
                Nome {userType === 'pessoa_juridica' ? 'da Empresa' : 'Completo'}
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
                  placeholder={userType === 'pessoa_juridica' ? 'Nome da empresa' : 'Seu nome completo'}
                />
              </div>
            </div>

            {/* CPF ou CNPJ baseado no tipo de usuário */}
            {userType === 'pessoa_fisica' ? (
              <div>
                <label htmlFor="cpf" className="block text-sm font-medium text-blue-800">
                  CPF
                </label>
                <div className="mt-1">
                  <input
                    id="cpf"
                    name="cpf"
                    type="text"
                    required
                    value={cpf}
                    onChange={(e) => setCpf(formatCPF(e.target.value))}
                    className="appearance-none block w-full px-3 py-2 border border-blue-200 rounded-md shadow-sm placeholder-blue-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-blue-900"
                    placeholder="000.000.000-00"
                    maxLength="14"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label htmlFor="cnpj" className="block text-sm font-medium text-blue-800">
                  CNPJ
                </label>
                <div className="mt-1">
                  <input
                    id="cnpj"
                    name="cnpj"
                    type="text"
                    required
                    value={cnpj}
                    onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                    className="appearance-none block w-full px-3 py-2 border border-blue-200 rounded-md shadow-sm placeholder-blue-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-blue-900"
                    placeholder="00.000.000/0000-00"
                    maxLength="18"
                  />
                </div>
              </div>
            )}

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
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="telefone" className="block text-sm font-medium text-blue-800">
                Telefone/WhatsApp
              </label>
              <div className="mt-1">
                <input
                  id="telefone"
                  name="telefone"
                  type="tel"
                  required
                  value={telefone}
                  onChange={(e) => setTelefone(formatPhone(e.target.value))}
                  className="appearance-none block w-full px-3 py-2 border border-blue-200 rounded-md shadow-sm placeholder-blue-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-blue-900"
                  placeholder="(11) 99999-9999"
                  maxLength="15"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-blue-800">
                Telefone Adicional (opcional)
              </label>
              <div className="mt-1">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-blue-200 rounded-md shadow-sm placeholder-blue-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-blue-900"
                  placeholder="Telefone adicional"
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