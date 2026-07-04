// Guias editoriais (/guias) — conteúdo de autoridade para SEO e respostas de
// IA. Cada guia é um objeto estruturado (secções + FAQ) renderizado por
// app/guias/[slug]/page.tsx com Article + FAQPage + BreadcrumbList JSON-LD.
//
// Regras de conteúdo:
// - útil e específico de Portugal (IPO, ISV, IUC, DGAV… nada de tradução US)
// - sem números inventados: valores concretos só quando são estáveis/verificáveis
// - links internos para as páginas programáticas e ferramentas do site

export interface GuideSection {
  h2: string;
  paragraphs: string[]; // texto corrido; **negrito** não suportado — prosa limpa
  bullets?: string[]; // lista opcional após os parágrafos
}

export interface Guide {
  slug: string;
  title: string; // H1
  description: string; // meta description + lead
  updated: string; // ISO date — usado no lastmod do sitemap e no Article LD
  sections: GuideSection[];
  faq: { q: string; a: string }[];
  related: { label: string; href: string }[];
}

export const GUIDES: Guide[] = [
  {
    slug: "comprar-carro-usado-checklist",
    title: "Comprar carro usado: checklist completa em Portugal",
    description:
      "Tudo o que deves verificar antes de comprar um carro usado em Portugal: documentos, histórico, inspeção ao carro, test drive e negociação — passo a passo.",
    updated: "2026-07-04",
    sections: [
      {
        h2: "Antes de ir ver o carro",
        paragraphs: [
          "A maior parte dos maus negócios evita-se antes de sair de casa. Começa por comparar o preço pedido com anúncios semelhantes — mesmo modelo, ano próximo e quilómetros parecidos. Se o preço está muito abaixo do mercado sem justificação clara, desconfia: ou tem histórico complicado, ou é isco para atrair contactos.",
          "Pede ao vendedor a matrícula e os dados básicos por mensagem. Com a matrícula consegues confirmar o histórico de IPO (inspeções periódicas) no portal do IMT, incluindo os quilómetros registados em cada inspeção — a forma mais simples de despistar contadores adulterados.",
        ],
        bullets: [
          "Compara o preço com a mediana de mercado para o mesmo modelo e ano",
          "Confirma os km no histórico de IPO (portal do IMT)",
          "Pergunta há quanto tempo o carro está à venda e porquê",
          "Pede fotos do livro de revisões e das faturas de manutenção",
        ],
      },
      {
        h2: "Documentos a verificar",
        paragraphs: [
          "O carro deve ter Documento Único Automóvel (DUA), IPO válida (para carros com mais de 4 anos), IUC pago e seguro em vigor. Confirma que o nome no documento corresponde ao vendedor — se não corresponder, exige explicação (pode ser venda por procuração, mas também pode ser sinal de intermediário disfarçado de particular).",
          "Verifica se existe reserva de propriedade (comum quando o carro foi comprado a crédito e ainda não está pago) — consta no registo automóvel. Comprar um carro com reserva de propriedade sem tratar do cancelamento é um dos erros mais caros que podes cometer.",
        ],
      },
      {
        h2: "Inspeção visual e mecânica",
        paragraphs: [
          "Vê o carro de dia e com a pintura seca — a chuva esconde defeitos. Procura diferenças de tom entre painéis, folgas irregulares entre peças e vidros com datas de fabrico diferentes: podem indicar acidente reparado.",
          "Abre o capot com o motor frio. Óleo com aspeto leitoso, fugas visíveis ou cheiro a queimado são sinais de alarme. Verifica o desgaste dos pneus: desgaste irregular pode indicar problemas de direção ou suspensão.",
          "Se não percebes de mecânica, considera pagar uma inspeção pré-compra numa oficina independente ou centro de inspeção. Custa tipicamente menos de 1% do preço do carro e pode poupar-te milhares de euros.",
        ],
      },
      {
        h2: "O test drive certo",
        paragraphs: [
          "Insiste em arrancar com o motor frio — muitos problemas só se manifestam a frio. Faz pelo menos 20-30 minutos com cidade e estrada: testa a caixa em todas as mudanças, trava a fundo num local seguro, ouve ruídos na suspensão em piso irregular e verifica se o carro puxa para algum lado.",
          "Testa tudo o que é elétrico: vidros, ar condicionado (tem de arrefecer a sério), sensores, câmara, luzes e infotainment. Reparações de eletrónica podem ser surpreendentemente caras.",
        ],
      },
      {
        h2: "Negociação e fecho",
        paragraphs: [
          "Usa factos, não pressão: aponta as reparações necessárias que encontraste (pneus, revisão em atraso, IPO próxima) e propõe um valor com base nisso. A comparação com a mediana de mercado é o teu melhor argumento.",
          "No fecho, o registo de propriedade faz-se online (Automóvel Online), numa conservatória ou num balcão IRN. Nunca pagues a totalidade sem o registo tratado ou sem um contrato de compra e venda assinado com identificação completa de ambas as partes.",
        ],
      },
    ],
    faq: [
      {
        q: "Como confirmo os quilómetros reais de um carro usado?",
        a: "Cruza o conta-quilómetros com o histórico de IPO no portal do IMT (os km ficam registados em cada inspeção), com o livro de revisões e com faturas de oficina. Desconfia de médias anuais muito baixas sem explicação.",
      },
      {
        q: "Que documentos preciso para comprar um carro usado?",
        a: "Do vendedor: Documento Único Automóvel, IPO válida e IUC pago. Para o registo: identificação de ambas as partes e o requerimento de registo automóvel (feito online, em conservatória ou balcão IRN).",
      },
      {
        q: "Vale a pena pagar uma inspeção pré-compra?",
        a: "Quase sempre. Numa compra de milhares de euros, gastar uma pequena fração numa avaliação independente é a melhor proteção contra problemas mecânicos escondidos.",
      },
      {
        q: "Comprar a particular ou a stand?",
        a: "O stand é obrigado a dar garantia (em regra 12 meses para usados vendidos a consumidores) e trata da papelada, mas tende a ser mais caro. O particular pode ser mais barato, mas compras 'como está'. Em ambos os casos, a checklist é a mesma.",
      },
    ],
    related: [
      { label: "Comprar em segurança", href: "/seguranca" },
      {
        label: "Como saber se está caro",
        href: "/guias/como-saber-se-um-carro-usado-esta-caro",
      },
      { label: "Carros usados à venda", href: "/carros" },
      { label: "O teu primeiro carro", href: "/primeiro-carro" },
    ],
  },
  {
    slug: "como-saber-se-um-carro-usado-esta-caro",
    title: "Como saber se um carro usado está caro?",
    description:
      "Aprende a avaliar o preço de um carro usado em Portugal: comparar com o mercado, pesar quilómetros e equipamento, e detetar preços artificialmente baixos.",
    updated: "2026-07-04",
    sections: [
      {
        h2: "O preço certo é o preço de mercado",
        paragraphs: [
          "Um carro usado não tem preço de tabela: vale o que carros iguais estão a ser vendidos naquele momento. A forma mais fiável de avaliar um anúncio é compará-lo com a mediana de anúncios semelhantes — mesma marca e modelo, ano próximo, quilómetros comparáveis.",
          "É exatamente isso que o Nacional 2 faz em cada anúncio: mostramos se o preço está abaixo, dentro ou acima da mediana de mercado, e com base em quantos anúncios semelhantes o cálculo foi feito. Uma diferença de milhares de euros face à mediana exige explicação.",
        ],
      },
      {
        h2: "O que justifica pagar mais (ou menos)",
        paragraphs: [
          "Dois carros do mesmo modelo e ano podem valer valores muito diferentes. Justificam preço acima da mediana: menos quilómetros que a média, histórico de manutenção completo e documentado, um só dono, extras valorizados (caixa automática, teto de abrir, bancos em pele) e versões mais equipadas.",
          "Justificam desconto: IPO ou revisão grande próximas (distribuição, embraiagem), pneus no fim, pintura com danos, muitos donos anteriores, ou histórico de importação sem documentação clara.",
        ],
      },
      {
        h2: "Cuidado com o barato que sai caro",
        paragraphs: [
          "Um preço muito abaixo do mercado raramente é sorte. As explicações mais comuns: quilómetros adulterados, acidente mal reparado, motor ou caixa em fim de vida, penhoras ou reserva de propriedade, ou simplesmente burla (o clássico 'estou no estrangeiro, envio o carro após transferência').",
          "Se o negócio parece bom demais, trata-o como suspeito por defeito: exige ver o carro e os documentos, confirma o histórico de IPO e nunca pagues sinais por transferência antes de veres o carro.",
        ],
      },
      {
        h2: "Ferramentas que ajudam",
        paragraphs: [
          "Usa o avaliador do Nacional 2 para obteres uma estimativa do valor do teu carro (ou de um que queiras comprar) com base nos anúncios reais do mercado português. Nos anúncios, o selo de preço (excelente, bom, de mercado, acima do mercado) resume a comparação num relance.",
          "Guarda os carros que te interessam nos favoritos: se o preço descer, recebes alerta — e um histórico de descidas de preço é, em si, informação valiosa para negociar.",
        ],
      },
    ],
    faq: [
      {
        q: "Quanto negoceia-se num carro usado em Portugal?",
        a: "Não há regra fixa. A margem depende de há quanto tempo o anúncio está publicado, do estado real do carro e da distância ao preço de mercado. Argumentos concretos (reparações necessárias, comparação com anúncios semelhantes) valem mais do que percentagens arbitrárias.",
      },
      {
        q: "Os preços dos stands são negociáveis?",
        a: "Em geral, menos do que os de particulares — o stand tem custos de garantia e preparação. Mas há sempre margem, sobretudo em carros parados há semanas ou em fim de mês/trimestre.",
      },
      {
        q: "Como sei quantos anúncios semelhantes existem?",
        a: "Cada anúncio no Nacional 2 indica o número de anúncios semelhantes usados no cálculo da mediana. Quanto maior a amostra, mais fiável é a comparação.",
      },
    ],
    related: [
      { label: "Avaliar o meu carro", href: "/avaliar" },
      {
        label: "Checklist de compra",
        href: "/guias/comprar-carro-usado-checklist",
      },
      { label: "Carros até 10 000 €", href: "/carros-ate/10000" },
    ],
  },
  {
    slug: "diesel-ou-gasolina",
    title: "Diesel ou gasolina: o que compensa em Portugal?",
    description:
      "Diesel, gasolina, híbrido ou elétrico? Como escolher o combustível certo em função dos quilómetros que fazes, do tipo de trajetos e dos custos reais.",
    updated: "2026-07-04",
    sections: [
      {
        h2: "A conta que interessa: quilómetros por ano",
        paragraphs: [
          "A regra prática mantém-se válida: o diesel compensa para quem roda muito, sobretudo em estrada e autoestrada. O gasóleo rende mais quilómetros por litro e os motores diesel são eficientes em velocidade de cruzeiro. Para quem faz poucos quilómetros, maioritariamente em cidade, a diferença de consumo não cobre o preço de compra tipicamente mais alto e a manutenção mais cara do diesel.",
          "Como referência aproximada: abaixo de ~15 000 km/ano, a gasolina (ou um híbrido) tende a ganhar; acima de ~20 000 km/ano com muita estrada, o diesel continua competitivo. Entre os dois, decide pelos teus trajetos típicos.",
        ],
      },
      {
        h2: "O problema do diesel em cidade",
        paragraphs: [
          "Os diesel modernos têm filtro de partículas (DPF/FAP) que precisa de atingir temperatura para se regenerar — o que só acontece em viagens de estrada. Um diesel usado só em trajetos curtos de cidade acumula problemas: filtro entupido, EGR suja, regenerações forçadas. São avarias caras e evitáveis escolhendo o combustível certo para o uso.",
          "Além disso, zonas de emissões reduzidas (como a ZER de Lisboa) restringem a circulação de veículos mais antigos em certas áreas — verifica a norma Euro do carro que estás a considerar.",
        ],
      },
      {
        h2: "E os híbridos e elétricos?",
        paragraphs: [
          "Para uso urbano e suburbano, um híbrido usado resolve o dilema: consumo baixo em cidade sem dependência de carregadores. Os híbridos plug-in compensam sobretudo se puderes carregar em casa e a maioria dos trajetos couber na autonomia elétrica.",
          "Um elétrico usado é imbatível em custo por quilómetro se carregares em casa, e a manutenção é mais simples (sem óleo, embraiagem ou escape). O ponto crítico é a avaliação da bateria — vê o nosso guia dedicado a elétricos usados.",
        ],
      },
      {
        h2: "Custos além do combustível",
        paragraphs: [
          "Compara sempre o custo total: preço de compra, seguro, IUC (que depende de cilindrada/CO₂ e data de matrícula), manutenção e desvalorização. Um diesel pode gastar menos ao quilómetro e ainda assim sair mais caro no total para o teu perfil de utilização.",
          "No Nacional 2, cada anúncio inclui simulação de financiamento e comparação de preço com o mercado — usa-os para pôr números na decisão em vez de intuições.",
        ],
      },
    ],
    faq: [
      {
        q: "O diesel vai acabar?",
        a: "A oferta de diesel novos tem vindo a diminuir na Europa e as restrições urbanas apertam gradualmente, mas o parque existente vai circular durante muitos anos. Para muitos km de estrada, um diesel usado recente e bem mantido continua a ser uma escolha racional.",
      },
      {
        q: "Um híbrido usado é fiável?",
        a: "Os sistemas híbridos das marcas com mais historial têm reputação sólida de fiabilidade e as baterias híbridas costumam durar a vida do carro. Como em qualquer usado, o histórico de manutenção é o melhor indicador.",
      },
      {
        q: "Gasolina com GPL compensa?",
        a: "O GPL é mais barato ao litro e a conversão pode compensar para quem roda bastante. Em contrapartida: menos rede de abastecimento, ligeira perda de potência e manutenção adicional do sistema. Confirma sempre se a instalação está legalizada e inspecionada.",
      },
    ],
    related: [
      { label: "Carros diesel usados", href: "/carros-diesel-usados" },
      { label: "Elétricos usados", href: "/carros-eletricos-usados" },
      {
        label: "Guia do elétrico usado",
        href: "/guias/carro-eletrico-usado-o-que-verificar",
      },
    ],
  },
  {
    slug: "carro-eletrico-usado-o-que-verificar",
    title: "Carro elétrico usado: o que verificar antes de comprar",
    description:
      "Bateria, garantia, carregamento e histórico: o guia completo para comprar um carro elétrico usado em Portugal sem surpresas.",
    updated: "2026-07-04",
    sections: [
      {
        h2: "A bateria é 80% da decisão",
        paragraphs: [
          "Num elétrico usado, o estado de saúde da bateria (SoH — State of Health) é o fator que mais importa. Uma bateria degradada significa menos autonomia e, no limite, uma substituição caríssima. Pede um relatório de diagnóstico da bateria — muitas marcas conseguem emiti-lo no concessionário, e há oficinas e apps especializadas que o fazem para vários modelos.",
          "Na prática: compara a autonomia real (carga completa, condução mista) com a autonomia WLTP original. Alguma degradação é normal e esperada; quedas abruptas ou células desequilibradas não são.",
        ],
      },
      {
        h2: "Garantia da bateria: a tua rede de segurança",
        paragraphs: [
          "A maioria dos fabricantes garante a bateria de tração por 8 anos ou cerca de 160 000 km (o que ocorrer primeiro), tipicamente contra degradação abaixo de ~70% da capacidade original. Num usado, confirma a data de início da garantia (primeira matrícula) e o que ela cobre exatamente — e se é transferível, o que em regra é.",
          "Um elétrico com 3-4 anos ainda tem metade da garantia da bateria pela frente: é um dos argumentos mais fortes a favor de comprar usado em vez de novo.",
        ],
      },
      {
        h2: "Histórico de carregamento e utilização",
        paragraphs: [
          "Carregamentos rápidos (DC) frequentes aceleram a degradação face a carga lenta em casa. Pergunta ao vendedor como carregava: um carro de utilização suburbana carregado à noite em wallbox é o cenário ideal; um carro de frota que viveu de carregadores rápidos merece uma avaliação de bateria mais exigente.",
          "Verifica também o funcionamento de todos os modos de carregamento: AC em tomada doméstica/wallbox e DC rápido, incluindo o estado dos cabos incluídos (são caros de substituir).",
        ],
      },
      {
        h2: "O resto do carro (que também conta)",
        paragraphs: [
          "A mecânica de um elétrico é simples — sem embraiagem, óleo de motor ou escape — mas há pontos específicos: pneus (os elétricos gastam-nos mais depressa, pelo peso e binário), travões (podem ganhar corrosão por pouco uso, graças à travagem regenerativa) e bomba de calor/AC, essencial para a autonomia no inverno.",
          "Confirma as atualizações de software em dia e — importante — se o carro depende de subscrições ou contas de app para funções relevantes, garante a transferência para o teu nome no ato da venda.",
        ],
      },
    ],
    faq: [
      {
        q: "Quanto custa substituir a bateria de um elétrico?",
        a: "Varia muito por modelo e capacidade, mas é o componente mais caro do carro — pode representar uma fração substancial do valor do veículo. Daí a importância do relatório de estado da bateria e da garantia remanescente na compra de um usado.",
      },
      {
        q: "Posso carregar em casa sem garagem?",
        a: "É possível carregar numa tomada exterior segura ou em carregadores públicos de bairro, mas o conforto e o custo por km pioram. Antes de comprar, faz as contas ao teu cenário real de carregamento — é ele que determina se o elétrico compensa.",
      },
      {
        q: "Um elétrico usado barato com muita idade é boa compra?",
        a: "Os primeiros elétricos têm autonomias curtas e baterias com mais desgaste. Podem servir como segundo carro urbano, se o preço refletir isso — mas avalia a bateria com especial cuidado e assume autonomia real bem abaixo da anunciada de origem.",
      },
    ],
    related: [
      { label: "Elétricos usados à venda", href: "/carros-eletricos-usados" },
      { label: "Diesel ou gasolina?", href: "/guias/diesel-ou-gasolina" },
      {
        label: "Checklist de compra",
        href: "/guias/comprar-carro-usado-checklist",
      },
    ],
  },
  {
    slug: "isv-e-iuc-como-funcionam",
    title: "ISV e IUC: como funcionam os impostos automóveis em Portugal",
    description:
      "O que é o ISV, quando se paga, como funciona o IUC anual e o que muda na importação de um carro usado — explicado de forma simples, com calculadora.",
    updated: "2026-07-04",
    sections: [
      {
        h2: "ISV: o imposto de entrada",
        paragraphs: [
          "O Imposto Sobre Veículos (ISV) paga-se uma única vez, quando o carro é matriculado pela primeira vez em Portugal — seja um carro novo, seja um usado importado. O cálculo combina duas componentes: a cilindrada do motor e as emissões de CO₂ (com tabelas diferentes consoante a norma de homologação, NEDC ou WLTP), com agravamento para diesel em certas condições.",
          "Nos usados importados de países da UE aplica-se uma redução percentual em função da idade do veículo — quanto mais velho o carro, maior a redução sobre o ISV que pagaria em novo. As tabelas exatas são atualizadas no Orçamento do Estado, por isso o valor concreto deve ser sempre simulado com valores atuais.",
        ],
      },
      {
        h2: "IUC: o imposto anual",
        paragraphs: [
          "O Imposto Único de Circulação (IUC) paga-se todos os anos, no mês da matrícula do carro. Para carros matriculados a partir de julho de 2007 (categoria B), o valor depende da cilindrada e das emissões de CO₂; para matrículas anteriores, de cilindrada, voltagem e idade. Na prática: carros mais recentes e com mais CO₂ registado pagam em geral mais.",
          "Atenção ao comprar usado: o IUC é devido pelo proprietário à data da matrícula fiscal — confirma que está pago antes do negócio e não te esqueças de o pagar no mês certo todos os anos (a AT emite avisos, mas a responsabilidade é do dono).",
        ],
      },
      {
        h2: "Importar um usado: o processo em traços largos",
        paragraphs: [
          "Importar um carro usado da UE envolve: transporte, inspeção B (IPO de importado), Declaração Aduaneira de Veículo (DAV) na AT, pagamento do ISV, homologação/atribuição de matrícula no IMT e, por fim, registo. O ISV é normalmente a maior fatia do custo — simula antes de comprar lá fora, porque um negócio aparentemente bom pode deixar de o ser depois do imposto.",
          "Usa a calculadora ISV/IUC do Nacional 2 para estimar os valores com as tabelas em vigor antes de tomar qualquer decisão de importação.",
        ],
      },
    ],
    faq: [
      {
        q: "Pago ISV quando compro um usado já matriculado em Portugal?",
        a: "Não. O ISV pagou-se na primeira matrícula portuguesa do carro. Na compra de um usado nacional só tens custos de registo — e o IUC anual a partir daí.",
      },
      {
        q: "Elétricos pagam ISV e IUC?",
        a: "Os 100% elétricos beneficiam de isenção de ISV, e os matriculados a partir de 2007 estão em geral isentos de IUC. Os híbridos e plug-in têm regimes próprios com reduções — confirma as regras em vigor no ano da matrícula.",
      },
      {
        q: "Porque é que o mesmo modelo pode pagar IUC diferente?",
        a: "Porque o IUC depende da data de matrícula (regime antigo vs. pós-2007), da homologação de CO₂ (NEDC vs. WLTP) e de alterações legislativas ao longo dos anos. Dois carros iguais matriculados em anos diferentes podem ter IUC distinto.",
      },
    ],
    related: [
      { label: "Calculadora ISV / IUC", href: "/calcular-isv" },
      {
        label: "Checklist de compra",
        href: "/guias/comprar-carro-usado-checklist",
      },
      { label: "Carros usados à venda", href: "/carros" },
    ],
  },
];

export const guideBySlug = (slug: string): Guide | undefined =>
  GUIDES.find((g) => g.slug === slug);
