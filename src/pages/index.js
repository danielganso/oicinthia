import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';

function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);
  
  const faqs = [
    {
      question: "1. Meu WhatsApp fica inutilizado?",
      answer: "Não. Você continua usando o WhatsApp normalmente. A integração apenas conecta o número para que a CinthIA responda automaticamente às mensagens dos pacientes. Se preferir, pode usar um número dedicado só para a clínica."
    },
    {
      question: "2. Preciso ter site ou sistema próprio para usar a CinthIA?",
      answer: "Não precisa. Todo o agendamento e gerenciamento é feito diretamente pelo nosso dashboard online, acessível de qualquer computador ou celular."
    },
    {
      question: "3. Posso usar o mesmo número de WhatsApp em mais de uma clínica?",
      answer: "Sim, desde que todas as clínicas pertençam à mesma conta e o plano permita múltiplos profissionais. Caso cada clínica tenha gestão separada, recomendamos um número exclusivo para cada uma."
    },
    {
      question: "4. O Google Calendar é obrigatório?",
      answer: "Não. O sistema já tem sua própria agenda. O feed ICS é apenas um recurso extra para quem deseja visualizar os compromissos no Google Calendar ou Outlook."
    },
    {
      question: "5. E se eu não pagar depois do teste grátis?",
      answer: "Após os 7 dias de teste, o sistema é bloqueado automaticamente. Basta ativar uma assinatura para continuar usando sem perder nenhum dado já cadastrado."
    },
    {
      question: "6. Meus pacientes precisam instalar algum aplicativo?",
      answer: "Não. Eles interagem apenas pelo WhatsApp comum, enviando mensagens como já estão acostumados."
    },
    {
      question: "7. Consigo bloquear feriados ou férias?",
      answer: "Sim. No dashboard é possível marcar folgas, intervalos ou períodos de férias, e a CinthIA nunca oferecerá horários nesses dias."
    },
    {
      question: "8. O que acontece se eu mudar de número de WhatsApp?",
      answer: "É só acessar o dashboard, abrir a seção de integração e vincular o novo número através do QR code. A agenda e os dados permanecem intactos."
    }
  ];

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <>
      {faqs.map((faq, index) => (
        <div key={index} className="bg-gradient-to-b from-white to-blue-50 rounded-xl shadow-md border-2 border-blue-200 hover:border-amber-300 overflow-hidden transition-all duration-300">
          <button 
            className="w-full text-left p-6 flex justify-between items-center focus:outline-none" 
            onClick={() => toggleFAQ(index)}
          >
            <h3 className="text-xl font-bold text-blue-800">{faq.question}</h3>
            <div className="bg-gradient-to-r from-amber-400 to-amber-500 rounded-full p-1">
              <svg 
                className={`h-5 w-5 text-white transform transition-transform duration-300 ${openIndex === index ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
          </button>
          <div className={`${openIndex === index ? 'block' : 'hidden'} px-6 pb-6 pt-0 bg-blue-50 border-t-2 border-amber-300`}>
            <p className="text-blue-700">{faq.answer}</p>
          </div>
        </div>
      ))}
    </>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50">
      <Head>
        <title>CinthIA - Atendente Virtual para Clínicas Odontológicas</title>
        <meta name="description" content="Automatize o agendamento de consultas via WhatsApp para sua clínica odontológica" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="container mx-auto px-4 py-6 flex justify-between items-center bg-white shadow-sm rounded-lg my-2">
        <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 text-transparent bg-clip-text">CinthIA</div>
        <nav>
          <ul className="flex space-x-6">
            <li><a href="#como-funciona" className="text-blue-700 hover:text-amber-500 transition-colors duration-300">Como Funciona</a></li>
            <li><a href="#funcionalidades" className="text-blue-700 hover:text-amber-500 transition-colors duration-300">Funcionalidades</a></li>
            <li><a href="#planos" className="text-blue-700 hover:text-amber-500 transition-colors duration-300">Planos</a></li>
            <li><a href="#faq" className="text-blue-700 hover:text-amber-500 transition-colors duration-300">FAQ</a></li>
            <li><Link href="/login" className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white py-2 px-4 rounded-lg transition-all duration-300">Login</Link></li>
          </ul>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20 flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 mb-10 md:mb-0">
            <h1 className="text-5xl font-bold mb-6 text-blue-800">Automatize o agendamento da sua clínica</h1>
            <p className="text-xl text-blue-700 mb-8">
              CinthIA é uma atendente virtual que gerencia o agendamento de consultas via WhatsApp para sua clínica odontológica.
            </p>
            <div className="flex space-x-4">
              <Link href="/register" className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-6 rounded-lg text-lg shadow-md hover:shadow-lg transition-all duration-300">
                Teste grátis por 7 dias
              </Link>
              <Link href="#planos" className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white font-bold py-3 px-6 rounded-lg text-lg shadow-md hover:shadow-lg transition-all duration-300">
                Ver planos
              </Link>
            </div>
          </div>
          <div className="md:w-1/2">
            <img src="/hero-image.svg" alt="CinthIA Bot" className="w-full" />
          </div>
        </section>

        {/* Como Funciona */}
        <section id="como-funciona" className="bg-gradient-to-b from-blue-50 to-white py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-4 text-blue-800">Como Funciona</h2>
            <p className="text-center text-lg text-blue-600 mb-16">Simples, rápido e eficiente</p>
            <div className="grid md:grid-cols-3 gap-10">
              <div className="text-center bg-white p-8 rounded-xl shadow-md border-2 border-blue-100 hover:border-amber-300 transition-all duration-300">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-blue-800">Conecte seu WhatsApp</h3>
                <p className="text-blue-700">Vincule o número de WhatsApp de cada profissional através de um simples QR Code.</p>
              </div>
              <div className="text-center bg-white p-8 rounded-xl shadow-md border-2 border-blue-100 hover:border-amber-300 transition-all duration-300">
                <div className="bg-gradient-to-r from-amber-400 to-amber-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-blue-800">Configure sua agenda</h3>
                <p className="text-blue-700">Defina horários disponíveis, bloqueios e folgas para cada profissional.</p>
              </div>
              <div className="text-center bg-white p-8 rounded-xl shadow-md border-2 border-blue-100 hover:border-amber-300 transition-all duration-300">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-blue-800">Atendimento automático</h3>
                <p className="text-blue-700">A CinthIA responde automaticamente aos pacientes e agenda consultas conforme disponibilidade.</p>
              </div>
              <div className="bg-white p-8 rounded-xl shadow-md border-2 border-blue-100 hover:border-amber-300 transition-all duration-300">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-blue-800">Planos Flexíveis e Teste Grátis de 7 Dias</h3>
                <p className="text-blue-700">Período de teste automático, sem cartão, e três opções de plano (Autônomo, Até 3 Profissionais, Até 5 Profissionais).</p>
              </div>
            </div>
          </div>
        </section>

        {/* Funcionalidades */}
        <section id="funcionalidades" className="py-20 bg-gradient-to-b from-white to-blue-50">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-4 text-blue-800">Funcionalidades</h2>
            <p className="text-center text-lg text-blue-600 mb-16">Tudo que você precisa para sua clínica</p>
            <div className="grid md:grid-cols-2 gap-10">
              <div className="bg-white p-8 rounded-xl shadow-md border-2 border-blue-100 hover:border-amber-300 transition-all duration-300">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-blue-800">Agendamento Automático via WhatsApp</h3>
                <p className="text-blue-700">Pacientes marcam consultas enviando mensagem para o WhatsApp do profissional e a assistente virtual CinthIA responde em tempo real, confirma o horário e registra tudo no sistema.</p>
              </div>
              <div className="bg-white p-8 rounded-xl shadow-md border-2 border-blue-100 hover:border-amber-300 transition-all duration-300">
                <div className="bg-gradient-to-r from-amber-400 to-amber-500 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-blue-800">Dashboard Moderno e Responsivo</h3>
                <p className="text-blue-700">Painel web com menu lateral elegante, acessível de qualquer dispositivo, para gerenciar profissionais, horários, bloqueios de atendimento e acompanhar as próximas consultas.</p>
              </div>
              <div className="bg-white p-8 rounded-xl shadow-md border-2 border-blue-100 hover:border-amber-300 transition-all duration-300">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-blue-800">Agenda Online com Feed ICS</h3>
                <p className="text-blue-700">Todas as consultas ficam em uma agenda central, que a clínica pode assinar no Google Calendar ou Outlook através de um link ICS seguro, sem precisar de integrações complexas.</p>
              </div>
              <div className="bg-white p-8 rounded-xl shadow-md border-2 border-blue-100 hover:border-amber-300 transition-all duration-300">
                <div className="bg-gradient-to-r from-amber-400 to-amber-500 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-blue-800">Bloqueio e Controle de Horários Inteligente</h3>
                <p className="text-blue-700">O dentista pode bloquear dias ou períodos de férias/feriados e o sistema já impede novos agendamentos nesses horários, garantindo que a agenda esteja sempre atualizada.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Planos */}
        <section id="planos" className="py-20 bg-gradient-to-b from-blue-50 to-white">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-4 text-blue-800">Planos e Preços</h2>
            <p className="text-center text-lg text-blue-600 mb-16">Escolha o plano ideal para sua clínica</p>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-gradient-to-b from-white to-blue-50 p-8 rounded-xl shadow-lg border-2 border-blue-200 hover:transform hover:scale-105 transition-all duration-300">
                <div className="flex justify-center mb-6">
                  <img src="/autonomo-plan.svg" alt="Plano Autônomo" className="h-24" />
                </div>
                <h3 className="text-xl font-bold text-center mb-2 text-blue-800">Autônomo</h3>
                <div className="text-4xl font-bold mb-4 text-center text-blue-600">R$ 97<span className="text-lg text-blue-400">/mês</span></div>
                <div className="h-1 w-24 bg-amber-400 mx-auto mb-6"></div>
                <ul className="mb-8 space-y-4">
                  <li className="flex items-center text-slate-700">
                    <svg className="h-5 w-5 text-amber-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span className="font-medium">1 profissional</span>
                  </li>
                  <li className="flex items-center text-slate-700">
                    <svg className="h-5 w-5 text-amber-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>Agendamento via WhatsApp</span>
                  </li>
                  <li className="flex items-center text-slate-700">
                    <svg className="h-5 w-5 text-amber-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>Feed ICS</span>
                  </li>
                </ul>
                <Link href="/register?plan=autonomo" className="block text-center bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
                  Começar agora
                </Link>
              </div>
              <div className="bg-gradient-to-b from-white to-blue-100 p-8 rounded-xl shadow-xl border-2 border-blue-500 transform scale-105 z-10">
                <div className="bg-gradient-to-r from-amber-400 to-amber-500 text-white text-sm font-bold uppercase py-1 px-4 rounded-full inline-block mb-4">Mais popular</div>
                <div className="flex justify-center mb-6">
                  <img src="/pequena-plan.svg" alt="Plano Clínica Pequena" className="h-24" />
                </div>
                <h3 className="text-xl font-bold text-center mb-2 text-blue-800">Clínica Pequena</h3>
                <div className="text-4xl font-bold mb-4 text-center text-blue-600">R$ 197<span className="text-lg text-blue-400">/mês</span></div>
                <div className="h-1 w-24 bg-amber-400 mx-auto mb-6"></div>
                <ul className="mb-8 space-y-4">
                  <li className="flex items-center text-slate-700">
                    <svg className="h-5 w-5 text-amber-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span className="font-medium">Até 3 profissionais</span>
                  </li>
                  <li className="flex items-center text-slate-700">
                    <svg className="h-5 w-5 text-amber-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>Agendamento via WhatsApp</span>
                  </li>
                  <li className="flex items-center text-slate-700">
                    <svg className="h-5 w-5 text-amber-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>Feed ICS</span>
                  </li>
                  <li className="flex items-center text-slate-700">
                    <svg className="h-5 w-5 text-amber-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>Suporte prioritário</span>
                  </li>
                </ul>
                <Link href="/register?plan=ate_3" className="block text-center bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
                  Começar agora
                </Link>
              </div>
              <div className="bg-gradient-to-b from-white to-blue-50 p-8 rounded-xl shadow-lg border-2 border-blue-200 hover:transform hover:scale-105 transition-all duration-300">
                <div className="flex justify-center mb-6">
                  <img src="/media-plan.svg" alt="Plano Clínica Média" className="h-24" />
                </div>
                <h3 className="text-xl font-bold text-center mb-2 text-blue-800">Clínica Média</h3>
                <div className="text-4xl font-bold mb-4 text-center text-blue-600">R$ 297<span className="text-lg text-blue-400">/mês</span></div>
                <div className="h-1 w-24 bg-amber-400 mx-auto mb-6"></div>
                <ul className="mb-8 space-y-4">
                  <li className="flex items-center text-slate-700">
                    <svg className="h-5 w-5 text-amber-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span className="font-medium">Até 5 profissionais</span>
                  </li>
                  <li className="flex items-center text-slate-700">
                    <svg className="h-5 w-5 text-amber-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>Agendamento via WhatsApp</span>
                  </li>
                  <li className="flex items-center text-slate-700">
                    <svg className="h-5 w-5 text-amber-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>Feed ICS</span>
                  </li>
                  <li className="flex items-center text-slate-700">
                    <svg className="h-5 w-5 text-amber-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>Suporte prioritário</span>
                  </li>
                  <li className="flex items-center text-slate-700">
                    <svg className="h-5 w-5 text-amber-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>Relatórios avançados</span>
                  </li>
                </ul>
                <Link href="/register?plan=ate_5" className="block text-center bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
                  Começar agora
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-20 bg-gradient-to-b from-blue-50 to-blue-100">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <div className="inline-block bg-gradient-to-r from-amber-400 to-amber-500 rounded-full p-2 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-4xl font-bold text-center mb-4 text-blue-800">Perguntas Frequentes</h2>
              <p className="text-center text-lg text-blue-600">Tire suas dúvidas sobre a CinthIA</p>
              <div className="h-1 w-24 bg-amber-400 mx-auto mt-4"></div>
            </div>
            
            <div className="max-w-3xl mx-auto space-y-6">
              <FAQSection />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-blue-600 to-blue-800 py-16 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold mb-6">Pronto para automatizar o agendamento da sua clínica?</h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">Experimente a CinthIA gratuitamente por 7 dias e veja como ela pode transformar o atendimento da sua clínica.</p>
            <Link href="/register" className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white font-bold py-4 px-10 rounded-lg text-lg inline-block shadow-lg hover:shadow-xl transition-all duration-300">
              Começar teste grátis
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-gradient-to-b from-blue-900 to-slate-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-4 text-amber-400">CinthIA</h3>
              <p className="text-blue-100">Atendente virtual para clínicas odontológicas.</p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4 text-amber-400">Links Rápidos</h4>
              <ul className="space-y-2">
                <li><a href="#como-funciona" className="text-blue-100 hover:text-white transition-colors duration-300">Como Funciona</a></li>
                <li><a href="#funcionalidades" className="text-blue-100 hover:text-white transition-colors duration-300">Funcionalidades</a></li>
                <li><a href="#planos" className="text-blue-100 hover:text-white transition-colors duration-300">Planos</a></li>
                <li><a href="#faq" className="text-blue-100 hover:text-white transition-colors duration-300">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4 text-amber-400">Contato</h4>
              <p className="text-blue-100">contato@cinthia.com.br</p>
              <p className="text-blue-100">(71) 99999-9999</p>
            </div>
          </div>
          <div className="border-t border-blue-800 mt-8 pt-8 text-center text-blue-100">
            <p>&copy; {new Date().getFullYear()} CinthIA. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}