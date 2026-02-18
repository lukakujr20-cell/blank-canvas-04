import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChefHat, BarChart3, Package, ClipboardList, Shield, Users, Check, X, ChevronDown, ChevronUp, Star, ArrowRight, Utensils, TrendingDown, Clock, Zap, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Lang = "pt" | "en";
type Region = "BR" | "EU" | "US";

const copy = {
  pt: {
    nav_cta: "Testar Grátis",
    hero_badge: "Gestão Inteligente para Restaurantes",
    hero_title: "Seu restaurante está perdendo em média",
    hero_title_accent: "R$3.200 por mês",
    hero_title_end: "em desperdício. Nós mostramos exatamente onde.",
    hero_sub: "Sistema completo de gestão — estoque, cozinha e financeiro integrados — que fecha o caixa sem surpresas e mostra seu lucro real em tempo real.",
    hero_cta: "Testar grátis por 14 dias — sem cartão de crédito",
    hero_social: "Mais de 200 restaurantes confiam no sistema",
    problem_title: "Você conhece essa cena?",
    problem_body: "É sexta-feira à noite, a casa está cheia, e o cozinheiro vem te avisar que acabou o molho da casa. O garçom anotou o pedido errado na mesa 7. E amanhã de manhã você vai passar 2 horas tentando fechar o financeiro em uma planilha que não bate.",
    problem_conclusion: "Não é falta de esforço. É falta de sistema.",
    solution_title: "Um sistema. Tudo integrado.",
    solution_sub: "Do pedido ao financeiro, sem ruído no meio.",
    modules: [
      {
        icon: "utensils",
        title: "Frente de Loja",
        what: "Pedidos digitais que chegam direto à cozinha, sem intermediários.",
        how: "Interface otimizada para garçons — toque, confirme, enviado.",
        result: "Clientes atendidos até 40% mais rápido no horário de pico. Zero retrabalho.",
      },
      {
        icon: "monitor",
        title: "KDS — Painel da Cozinha",
        what: "Tela de preparo com priorização automática por tempo e mesa.",
        how: "Organiza a fila por chegada, urgência e destino (cozinha ou bar).",
        result: "Sua cozinha para de trabalhar no caos e começa a trabalhar em sequência.",
      },
      {
        icon: "package",
        title: "Estoque Inteligente",
        what: "Baixa automática de ingredientes a cada pedido.",
        how: "Alertas configuráveis de estoque mínimo com lista de compras gerada com um clique.",
        result: "Você para de comprar por intuição e começa a comprar por dado.",
      },
      {
        icon: "chart",
        title: "Dashboard do Dono",
        what: "Lucro líquido do dia, CMV por prato, custo de mão de obra e ticket médio.",
        how: "Tudo em uma tela. Acesse do celular às 22h.",
        result: "Saiba exatamente como foi o dia antes de dormir.",
      },
      {
        icon: "shield",
        title: "Auditoria e Controle",
        what: "Cada ação no sistema é registrada com usuário, horário e IP.",
        how: "Relatório de inconsistências com timeline completa.",
        result: "Para operações com mais de um funcionário no caixa, isso é seguro de fraude.",
      },
    ],
    social_title: "Resultados reais de quem já usa",
    social_sub: "Números verificados dos primeiros 60 dias de operação.",
    testimonials: [
      {
        quote: "Reduzi R$1.800 de desperdício no primeiro mês. Agora sei exatamente o que pedir para cada semana.",
        name: "João Silva",
        place: "Hamburgueria Artesanal, São Paulo",
        metric: "−R$1.800/mês",
      },
      {
        quote: "Fechei o caixa do mês sem planilha pela primeira vez em 6 anos. O sistema fez tudo automaticamente.",
        name: "Carla Mendes",
        place: "Pizzaria Dom Marco, Belo Horizonte",
        metric: "2h economizadas/dia",
      },
      {
        quote: "O KDS transformou minha cozinha. Antes saía pedido errado toda sexta. Agora não saio mais.",
        name: "Ricardo Pinto",
        place: "Bistrô Central, Curitiba",
        metric: "Erro zero em 45 dias",
      },
    ],
    stat1_num: "18%",
    stat1_label: "redução média em compras desnecessárias nos primeiros 60 dias",
    stat2_num: "40%",
    stat2_label: "mais rapidez no atendimento com KDS ativo",
    stat3_num: "2h",
    stat3_label: "economizadas por dia no fechamento financeiro",
    pricing_title: "Escolha o plano certo para a sua operação",
    pricing_sub: "Sem taxa de adesão. Cancele quando quiser.",
    plans: [
      {
        name: "Mensal",
        for: "1 unidade, até 5 usuários",
        price: "R$197",
        period: "/mês",
        features: ["Frente de loja ✅", "KDS Cozinha ❌", "Estoque inteligente ❌", "Financeiro e CMV ❌", "Multi-unidade ❌", "Suporte via Chat"],
        cta: "Começar Agora",
        highlight: false,
        badge: null,
        checkoutLinks: {
          BR: "https://buy.stripe.com/aFadR3cbDfwQ4jtetXfrW00",
          EU: "",
          US: "",
        },
      },
      {
        name: "Semestral",
        for: "1 unidade, operação completa",
        price: "R$397",
        period: "/mês",
        features: ["Frente de loja ✅", "KDS Cozinha ✅", "Estoque inteligente ✅", "Financeiro e CMV ✅", "Multi-unidade ❌", "Chat + Email prioritário"],
        cta: "Escolher Semestral",
        highlight: true,
        badge: "Mais escolhido",
        checkoutLinks: {
          BR: "https://buy.stripe.com/8x2aER1wZdoI6rB85zfrW01",
          EU: "",
          US: "",
        },
      },
      {
        name: "Anual",
        for: "Múltiplas unidades",
        price: "R$697",
        period: "/mês",
        features: ["Frente de loja ✅", "KDS Cozinha ✅", "Estoque inteligente ✅", "Financeiro e CMV ✅", "Multi-unidade ✅", "Gerente de conta dedicado"],
        cta: "Falar com Vendas",
        highlight: false,
        badge: null,
        checkoutLinks: {
          BR: "https://buy.stripe.com/4gM00d7Vn0BWaHRbhLfrW02",
          EU: "",
          US: "",
        },
      },
    ],
    faq_title: "Perguntas frequentes",
    faqs: [
      {
        q: "Minha equipe não é tecnológica. Vão conseguir usar?",
        a: "Sim. A interface foi desenhada para cozinheiros e garçons, não para programadores. O treinamento completo leva menos de 2 horas e nossa equipe acompanha os primeiros dias.",
      },
      {
        q: "E se eu quiser cancelar?",
        a: "Sem multa, sem burocracia. Você cancela com um clique e seus dados ficam disponíveis para exportar por 30 dias.",
      },
      {
        q: "Funciona sem internet?",
        a: "O módulo de caixa e KDS tem modo offline. Os dados sincronizam automaticamente quando a conexão voltar.",
      },
      {
        q: "Preciso trocar meu equipamento atual?",
        a: "Não. Roda em qualquer tablet Android ou iPad, PC com Windows ou Mac, e celular.",
      },
      {
        q: "Como funciona a migração do que eu já uso hoje?",
        a: "Nossa equipe faz a migração do seu cardápio e cadastro em até 48 horas. Você não começa do zero.",
      },
    ],
    final_cta_title: "Pronto para fechar o caixa sem surpresas?",
    final_cta_sub: "14 dias grátis. Sem cartão. Suporte incluído.",
    final_cta_btn: "Começar agora — é grátis",
    footer_rights: "Todos os direitos reservados.",
  },
  en: {
    nav_cta: "Try for Free",
    hero_badge: "Smart Restaurant Management",
    hero_title: "Most restaurant managers spend",
    hero_title_accent: "11 hours a week",
    hero_title_end: "on tasks our system does in minutes.",
    hero_sub: "One platform for your floor, kitchen and finances. Built for operators who want to run smarter, not harder.",
    hero_cta: "Start free for 14 days — no credit card",
    hero_social: "Trusted by 200+ restaurants",
    problem_title: "You know this scene.",
    problem_body: "It's Friday night, the place is packed, and your chef tells you you've run out of the house sauce. The waiter took the wrong order at table 7. And tomorrow morning you'll spend 2 hours trying to close the financials in a spreadsheet that doesn't add up.",
    problem_conclusion: "It's not a lack of effort. It's a lack of system.",
    solution_title: "One system. Everything connected.",
    solution_sub: "From order to financials, with no noise in between.",
    modules: [
      {
        icon: "utensils",
        title: "Floor Operations",
        what: "Digital orders sent directly to the kitchen — no intermediaries.",
        how: "Optimised interface for waitstaff — tap, confirm, done.",
        result: "Guests served up to 40% faster during peak hours. Zero rework.",
      },
      {
        icon: "monitor",
        title: "KDS — Kitchen Display",
        what: "Preparation screen with automatic prioritisation by time and table.",
        how: "Organises the queue by arrival, urgency and destination.",
        result: "Your kitchen stops working in chaos and starts working in sequence.",
      },
      {
        icon: "package",
        title: "Smart Inventory",
        what: "Automatic stock deduction with every order.",
        how: "Configurable low-stock alerts with one-click purchase list.",
        result: "Stop buying on instinct — start buying on data.",
      },
      {
        icon: "chart",
        title: "Owner Dashboard",
        what: "Daily net profit, food cost per dish, labour cost and average ticket.",
        how: "Everything on one screen. Access from your phone at 10pm.",
        result: "Know exactly how the day went before you sleep.",
      },
      {
        icon: "shield",
        title: "Audit & Control",
        what: "Every action is logged with username, timestamp and IP.",
        how: "Inconsistency report with full timeline.",
        result: "For multi-staff operations, this is your fraud protection layer.",
      },
    ],
    social_title: "Real results from real operators",
    social_sub: "Verified numbers from the first 60 days.",
    testimonials: [
      {
        quote: "Cut €900 in waste in the first month. Now I know exactly what to order each week.",
        name: "Marco Ferreira",
        place: "Bistro Central, Lisbon",
        metric: "−€900/month",
      },
      {
        quote: "Closed the month without a spreadsheet for the first time in 6 years. The system did everything.",
        name: "Ana Rodrigues",
        place: "Casa do Chef, Porto",
        metric: "2h saved/day",
      },
      {
        quote: "The KDS transformed my kitchen. We used to send wrong orders every Friday. Not anymore.",
        name: "Pedro Alves",
        place: "Taberna Moderna, Madrid",
        metric: "Zero errors in 45 days",
      },
    ],
    stat1_num: "18%",
    stat1_label: "average reduction in unnecessary purchases in the first 60 days",
    stat2_num: "40%",
    stat2_label: "faster service with KDS active",
    stat3_num: "2h",
    stat3_label: "saved per day on financial closing",
    pricing_title: "Choose the right plan for your operation",
    pricing_sub: "No setup fee. Cancel anytime.",
    plans: [
      {
        name: "Monthly",
        for: "1 unit, up to 5 users",
        price: "€97",
        period: "/month",
        features: ["Floor ✅", "Kitchen KDS ❌", "Smart Inventory ❌", "Financials & CMV ❌", "Multi-unit ❌", "Chat support"],
        cta: "Start Now",
        highlight: false,
        badge: null,
        checkoutLinks: {
          BR: "https://buy.stripe.com/aFadR3cbDfwQ4jtetXfrW00",
          EU: "",
          US: "",
        },
      },
      {
        name: "Biannual",
        for: "1 unit, full operation",
        price: "€197",
        period: "/month",
        features: ["Floor ✅", "Kitchen KDS ✅", "Smart Inventory ✅", "Financials & CMV ✅", "Multi-unit ❌", "Chat + Priority email"],
        cta: "Choose Biannual",
        highlight: true,
        badge: "Most popular",
        checkoutLinks: {
          BR: "https://buy.stripe.com/8x2aER1wZdoI6rB85zfrW01",
          EU: "",
          US: "",
        },
      },
      {
        name: "Annual",
        for: "Multiple units",
        price: "€347",
        period: "/month",
        features: ["Floor ✅", "Kitchen KDS ✅", "Smart Inventory ✅", "Financials & CMV ✅", "Multi-unit ✅", "Dedicated account manager"],
        cta: "Talk to Sales",
        highlight: false,
        badge: null,
        checkoutLinks: {
          BR: "https://buy.stripe.com/4gM00d7Vn0BWaHRbhLfrW02",
          EU: "",
          US: "",
        },
      },
    ],
    faq_title: "Frequently asked questions",
    faqs: [
      {
        q: "My team isn't technical. Will they manage?",
        a: "Yes. The interface was designed for chefs and waitstaff, not developers. Full training takes less than 2 hours and our team supports you in the first days.",
      },
      {
        q: "What if I want to cancel?",
        a: "No penalty, no hassle. Cancel with one click and your data is available to export for 30 days.",
      },
      {
        q: "Does it work offline?",
        a: "The POS and KDS modules have offline mode. Data syncs automatically when the connection returns.",
      },
      {
        q: "Do I need to replace my current equipment?",
        a: "No. Runs on any Android tablet or iPad, Windows or Mac PC, and mobile phone.",
      },
      {
        q: "How does migration work from what I use today?",
        a: "Our team migrates your menu and records within 48 hours. You don't start from scratch.",
      },
    ],
    final_cta_title: "Ready to close the books without surprises?",
    final_cta_sub: "14 days free. No card. Support included.",
    final_cta_btn: "Start now — it's free",
    footer_rights: "All rights reserved.",
  },
};

const iconMap: Record<string, React.ReactNode> = {
  utensils: <Utensils className="h-6 w-6" />,
  monitor: <ClipboardList className="h-6 w-6" />,
  package: <Package className="h-6 w-6" />,
  chart: <BarChart3 className="h-6 w-6" />,
  shield: <Shield className="h-6 w-6" />,
};

export default function LandingPage() {
  const navigate = useNavigate();
  const [lang, setLang] = useState<Lang>("pt");
  const [region, setRegion] = useState<Region>("BR");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const c = copy[lang];

  const handleCta = () => navigate("/auth");

  const handlePlanCta = (checkoutLinks: { BR: string; EU: string; US: string }) => {
    const link = checkoutLinks[region];
    if (link) {
      window.open(link, "_blank", "noopener,noreferrer");
    } else {
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(220,20%,8%)] text-[hsl(60,9%,97%)] font-sans antialiased">
      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b border-[hsl(220,20%,16%)] bg-[hsl(220,20%,8%)/80] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(37,92%,50%)]">
              <ChefHat className="h-5 w-5 text-[hsl(220,20%,8%)]" />
            </div>
            <span className="text-lg font-bold tracking-tight">RestaurantOS</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Region selector */}
            <div className="flex rounded-full border border-[hsl(220,20%,25%)] p-0.5 text-xs">
              {(["BR", "EU", "US"] as Region[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRegion(r)}
                  className={`rounded-full px-2.5 py-1 font-medium transition-all ${
                    region === r
                      ? "bg-[hsl(37,92%,50%)] text-[hsl(220,20%,8%)]"
                      : "text-[hsl(60,9%,60%)] hover:text-[hsl(60,9%,90%)]"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            {/* Lang toggle */}
            <button
              onClick={() => setLang(lang === "pt" ? "en" : "pt")}
              className="flex items-center gap-1.5 rounded-full border border-[hsl(220,20%,25%)] px-3 py-1.5 text-xs text-[hsl(60,9%,70%)] transition hover:border-[hsl(37,92%,50%)] hover:text-[hsl(37,92%,50%)]"
            >
              <Globe className="h-3.5 w-3.5" />
              {lang === "pt" ? "EN" : "PT"}
            </button>
            {/* Login button */}
            <button
              onClick={() => navigate("/auth")}
              className="rounded-full border border-[hsl(220,20%,25%)] px-3 py-1.5 text-xs text-[hsl(60,9%,70%)] transition hover:border-[hsl(60,9%,50%)] hover:text-[hsl(60,9%,97%)]"
            >
              Login
            </button>
            <Button
              onClick={handleCta}
              size="sm"
              className="bg-[hsl(37,92%,50%)] text-[hsl(220,20%,8%)] font-semibold hover:bg-[hsl(37,92%,45%)]"
            >
              {c.nav_cta}
            </Button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden px-6 pb-24 pt-20">
        {/* Subtle gradient orb */}
        <div className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-[hsl(37,92%,50%/0.07)] blur-[120px]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[hsl(37,92%,50%/0.3)] bg-[hsl(37,92%,50%/0.1)] px-4 py-1.5 text-sm text-[hsl(37,92%,65%)]">
            <Zap className="h-3.5 w-3.5" />
            {c.hero_badge}
          </div>
          <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            {c.hero_title}{" "}
            <span className="text-[hsl(37,92%,50%)]">{c.hero_title_accent}</span>{" "}
            {c.hero_title_end}
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-[hsl(60,9%,65%)]">
            {c.hero_sub}
          </p>
          <button
            onClick={handleCta}
            className="group inline-flex items-center gap-3 rounded-xl bg-[hsl(37,92%,50%)] px-8 py-4 text-base font-semibold text-[hsl(220,20%,8%)] shadow-[0_0_40px_hsl(37,92%,50%/0.3)] transition-all hover:scale-[1.02] hover:bg-[hsl(37,92%,45%)] hover:shadow-[0_0_60px_hsl(37,92%,50%/0.4)]"
          >
            {c.hero_cta}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
          <p className="mt-5 flex items-center justify-center gap-2 text-sm text-[hsl(60,9%,50%)]">
            <span className="flex">
              {[1,2,3,4,5].map(i => (
                <Star key={i} className="h-3.5 w-3.5 fill-[hsl(37,92%,50%)] text-[hsl(37,92%,50%)]" />
              ))}
            </span>
            {c.hero_social}
          </p>
        </div>

        {/* Stats bar */}
        <div className="mx-auto mt-16 max-w-3xl">
          <div className="grid grid-cols-3 divide-x divide-[hsl(220,20%,20%)] rounded-2xl border border-[hsl(220,20%,20%)] bg-[hsl(220,20%,11%)]">
            {[
              { num: c.stat1_num, label: c.stat1_label },
              { num: c.stat2_num, label: c.stat2_label },
              { num: c.stat3_num, label: c.stat3_label },
            ].map((s, i) => (
              <div key={i} className="px-6 py-5 text-center">
                <div className="text-2xl font-bold text-[hsl(37,92%,50%)] sm:text-3xl">{s.num}</div>
                <div className="mt-1 text-xs leading-snug text-[hsl(60,9%,55%)]">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="border-y border-[hsl(220,20%,16%)] bg-[hsl(220,20%,11%)] px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 flex justify-center">
            <TrendingDown className="h-10 w-10 text-[hsl(0,72%,55%)]" />
          </div>
          <h2 className="mb-6 text-3xl font-bold sm:text-4xl">{c.problem_title}</h2>
          <p className="mb-6 text-lg leading-relaxed text-[hsl(60,9%,65%)]">
            {c.problem_body}
          </p>
          <p className="inline-block rounded-xl border border-[hsl(37,92%,50%/0.4)] bg-[hsl(37,92%,50%/0.1)] px-6 py-3 text-lg font-semibold text-[hsl(37,92%,65%)]">
            {c.problem_conclusion}
          </p>
        </div>
      </section>

      {/* SOLUTION */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="mb-3 text-3xl font-bold sm:text-4xl">{c.solution_title}</h2>
            <p className="text-[hsl(60,9%,60%)]">{c.solution_sub}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {c.modules.map((mod, i) => (
              <div
                key={i}
                className="group relative rounded-2xl border border-[hsl(220,20%,18%)] bg-[hsl(220,20%,11%)] p-6 transition-all hover:border-[hsl(37,92%,50%/0.4)] hover:bg-[hsl(220,20%,13%)]"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(37,92%,50%/0.15)] text-[hsl(37,92%,50%)] ring-1 ring-[hsl(37,92%,50%/0.2)]">
                  {iconMap[mod.icon]}
                </div>
                <h3 className="mb-2 text-lg font-semibold">{mod.title}</h3>
                <p className="mb-1 text-sm font-medium text-[hsl(60,9%,80%)]">{mod.what}</p>
                <p className="mb-3 text-sm text-[hsl(60,9%,55%)]">{mod.how}</p>
                <div className="rounded-lg bg-[hsl(142,76%,36%/0.1)] px-3 py-2">
                  <p className="text-xs font-semibold text-[hsl(142,76%,55%)]">→ {mod.result}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="border-y border-[hsl(220,20%,16%)] bg-[hsl(220,20%,11%)] px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-bold sm:text-4xl">{c.social_title}</h2>
            <p className="text-[hsl(60,9%,60%)]">{c.social_sub}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {c.testimonials.map((t, i) => (
              <div key={i} className="flex flex-col rounded-2xl border border-[hsl(220,20%,20%)] bg-[hsl(220,20%,13%)] p-6">
                <div className="mb-3 flex gap-0.5">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className="h-4 w-4 fill-[hsl(37,92%,50%)] text-[hsl(37,92%,50%)]" />
                  ))}
                </div>
                <p className="mb-4 flex-1 text-sm leading-relaxed text-[hsl(60,9%,75%)]">
                  "{t.quote}"
                </p>
                <div className="border-t border-[hsl(220,20%,20%)] pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-xs text-[hsl(60,9%,50%)]">{t.place}</p>
                    </div>
                    <span className="rounded-full bg-[hsl(142,76%,36%/0.15)] px-3 py-1 text-xs font-bold text-[hsl(142,76%,55%)]">
                      {t.metric}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-bold sm:text-4xl">{c.pricing_title}</h2>
            <p className="text-[hsl(60,9%,60%)]">{c.pricing_sub}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {c.plans.map((plan, i) => (
              <div
                key={i}
                className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
                  plan.highlight
                    ? "border-[hsl(37,92%,50%)] bg-[hsl(37,92%,50%/0.07)] shadow-[0_0_40px_hsl(37,92%,50%/0.15)]"
                    : "border-[hsl(220,20%,20%)] bg-[hsl(220,20%,11%)]"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-[hsl(37,92%,50%)] px-4 py-1 text-xs font-bold text-[hsl(220,20%,8%)]">
                      {plan.badge}
                    </span>
                  </div>
                )}
                <div className="mb-1 text-xs font-medium uppercase tracking-widest text-[hsl(60,9%,50%)]">
                  {plan.for}
                </div>
                <div className="mb-2 text-xl font-bold">{plan.name}</div>
                <div className="mb-6 flex items-end gap-1">
                  <span className="text-4xl font-bold text-[hsl(37,92%,50%)]">{plan.price}</span>
                  <span className="mb-1 text-sm text-[hsl(60,9%,50%)]">{plan.period}</span>
                </div>
                <ul className="mb-8 flex-1 space-y-2">
                  {plan.features.map((f, fi) => {
                    const enabled = f.includes("✅");
                    const label = f.replace("✅", "").replace("❌", "").trim();
                    return (
                      <li key={fi} className="flex items-center gap-2 text-sm">
                        {enabled ? (
                          <Check className="h-4 w-4 flex-shrink-0 text-[hsl(142,76%,50%)]" />
                        ) : (
                          <X className="h-4 w-4 flex-shrink-0 text-[hsl(60,9%,35%)]" />
                        )}
                        <span className={enabled ? "text-[hsl(60,9%,85%)]" : "text-[hsl(60,9%,40%)]"}>
                          {label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <button
                  onClick={() => handlePlanCta(plan.checkoutLinks)}
                  className={`w-full rounded-xl py-3 text-sm font-semibold transition-all ${
                    plan.highlight
                      ? "bg-[hsl(37,92%,50%)] text-[hsl(220,20%,8%)] hover:bg-[hsl(37,92%,45%)]"
                      : "border border-[hsl(220,20%,30%)] text-[hsl(60,9%,80%)] hover:border-[hsl(37,92%,50%)] hover:text-[hsl(37,92%,50%)]"
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-[hsl(220,20%,16%)] bg-[hsl(220,20%,11%)] px-6 py-24">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-10 text-center text-3xl font-bold">{c.faq_title}</h2>
          <div className="space-y-3">
            {c.faqs.map((faq, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-xl border border-[hsl(220,20%,20%)] bg-[hsl(220,20%,13%)] transition-all hover:border-[hsl(220,20%,28%)]"
              >
                <button
                  className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span>{faq.q}</span>
                  {openFaq === i ? (
                    <ChevronUp className="h-4 w-4 flex-shrink-0 text-[hsl(37,92%,50%)]" />
                  ) : (
                    <ChevronDown className="h-4 w-4 flex-shrink-0 text-[hsl(60,9%,50%)]" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="border-t border-[hsl(220,20%,20%)] px-5 py-4 text-sm leading-relaxed text-[hsl(60,9%,65%)]">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-6 py-24">
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-[hsl(37,92%,50%/0.3)] bg-[hsl(220,20%,11%)] p-12 text-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(37,92%,50%/0.08)_0%,_transparent_70%)]" />
          <div className="relative">
            <h2 className="mb-3 text-3xl font-bold sm:text-4xl">{c.final_cta_title}</h2>
            <p className="mb-8 text-[hsl(60,9%,60%)]">{c.final_cta_sub}</p>
            <button
              onClick={handleCta}
              className="group inline-flex items-center gap-3 rounded-xl bg-[hsl(37,92%,50%)] px-10 py-4 text-base font-bold text-[hsl(220,20%,8%)] shadow-[0_0_40px_hsl(37,92%,50%/0.4)] transition-all hover:scale-[1.02] hover:bg-[hsl(37,92%,45%)]"
            >
              {c.final_cta_btn}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[hsl(220,20%,16%)] px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[hsl(37,92%,50%)]">
              <ChefHat className="h-4 w-4 text-[hsl(220,20%,8%)]" />
            </div>
            <span className="text-sm font-semibold">RestaurantOS</span>
          </div>
          <p className="text-xs text-[hsl(60,9%,40%)]">© 2026 RestaurantOS. {c.footer_rights}</p>
          <button
            onClick={() => navigate("/auth")}
            className="text-xs text-[hsl(60,9%,50%)] underline-offset-2 hover:text-[hsl(37,92%,50%)] hover:underline"
          >
            Login
          </button>
        </div>
      </footer>
    </div>
  );
}
