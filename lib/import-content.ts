// Conteúdo estático da área de importação: passos do processo, documentos,
// riscos e disclaimers — partilhado pela página de detalhe e pelas landing
// pages SEO. Módulo sem imports (usável em client components).

export const IMPORT_DISCLAIMER =
  "Todos os valores apresentados são estimativas e podem variar consoante as " +
  "regras fiscais portuguesas em vigor, as emissões de CO₂ homologadas, o " +
  "combustível, a idade, a cilindrada, a documentação e o estado real do " +
  "veículo. Confirma sempre o ISV no simulador oficial das Finanças antes de " +
  "comprar.";

export interface ImportStep {
  title: string;
  body: string;
}

export const IMPORT_STEPS: ImportStep[] = [
  {
    title: "Escolher e verificar o carro",
    body: "Confirma o historial (quilómetros, acidentes, manutenção), pede fotos e vídeos atuais e, idealmente, uma inspeção independente no país de origem antes de pagar.",
  },
  {
    title: "Negociar e comprar",
    body: "Fecha o preço com o vendedor, assina o contrato de compra e venda e guarda a fatura ou recibo. Nunca pagues a totalidade sem documentos do carro à vista.",
  },
  {
    title: "Documentos e matrícula de exportação",
    body: "Reúne o certificado de conformidade (COC), o documento único do veículo e, se fores conduzir o carro, a matrícula de trânsito/exportação com seguro temporário.",
  },
  {
    title: "Trazer o carro para Portugal",
    body: "Transporte em camião porta-carros (mais simples) ou viagem por estrada com matrícula de exportação. Guarda o comprovativo da data de entrada em Portugal.",
  },
  {
    title: "Declaração Aduaneira de Veículo (DAV)",
    body: "Submete a DAV no portal das Finanças até 20 dias úteis após a entrada. É aqui que o ISV é liquidado (com redução por idade para usados da UE).",
  },
  {
    title: "Inspeção tipo B e homologação",
    body: "Inspeção técnica tipo B num centro autorizado e homologação do modelo no IMT (Modelo 9) caso o carro não tenha homologação nacional.",
  },
  {
    title: "Matrícula portuguesa e IUC",
    body: "Com o ISV pago e a inspeção aprovada, o IMT atribui a matrícula portuguesa. Regista o carro na Conservatória, paga o IUC e coloca as chapas.",
  },
];

export const IMPORT_DOCUMENTS: string[] = [
  "Certificado de conformidade (COC) do fabricante",
  "Documento único / título de registo do país de origem",
  "Fatura ou contrato de compra e venda",
  "Comprovativo de entrada do veículo em Portugal",
  "Declaração Aduaneira de Veículo (DAV)",
  "Ficha de inspeção tipo B aprovada",
  "Modelo 9 do IMT (homologação), quando aplicável",
  "Documento de identificação e NIF do comprador",
];

export const IMPORT_RISKS: string[] = [
  "Quilometragem adulterada — verifica o historial de inspeções e manutenção do país de origem (ex.: relatórios TÜV/NAP/Car-Pass).",
  "CO₂ homologado diferente do anunciado — pequenas diferenças de g/km podem mudar o ISV em centenas ou milhares de euros.",
  "Falta do certificado de conformidade (COC) — pedir uma segunda via ao fabricante custa tempo e dinheiro.",
  "Burlas em pagamentos à distância — nunca pagues por transferência sem veres o carro e os documentos originais.",
  "Danos ocultos ou histórico de acidente não declarado — uma inspeção independente antes da compra é o melhor seguro.",
  "Custos de transporte e prazos podem variar com a época do ano e a disponibilidade de camiões.",
];

export const IMPORT_FAQ: { q: string; a: string }[] = [
  {
    q: "Quanto custa importar um carro da Europa para Portugal?",
    a: "Além do preço do carro, conta com transporte (300–1.700 € consoante o país), documentos e matrícula de exportação (~150 €), inspeção tipo B (~55 €), legalização e matrícula (~325 €) e o ISV, que depende da cilindrada, do CO₂ e da idade do carro — pode ir de 0 € (elétricos) a vários milhares de euros.",
  },
  {
    q: "Quanto tempo demora o processo de importação?",
    a: "Tipicamente 4 a 8 semanas entre a compra e a matrícula portuguesa. Elétricos (isentos de ISV) costumam ser mais rápidos; carros antigos ou sem COC podem demorar mais.",
  },
  {
    q: "Vale a pena importar um carro usado?",
    a: "Depende do modelo. Em carros premium, elétricos e híbridos plug-in recentes, a poupança face ao mercado português pode ultrapassar os milhares de euros mesmo depois do ISV e transporte. Em citadinos baratos, raramente compensa. O Nacional 2 compara automaticamente cada anúncio estrangeiro com o mercado português.",
  },
  {
    q: "Os carros elétricos pagam ISV na importação?",
    a: "Não. Veículos 100% elétricos estão isentos de ISV e de IUC, o que os torna dos melhores candidatos a importação.",
  },
  {
    q: "O que é a redução de ISV por idade?",
    a: "Carros usados importados da UE/EEE têm um desconto no ISV que cresce com a idade: 10% no primeiro ano até 80% acima de 10 anos.",
  },
];
