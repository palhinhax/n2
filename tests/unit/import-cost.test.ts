import {
  DEFAULT_ASSUMPTIONS,
  estimateImportCost,
  rateImportDeal,
  taxFuelOf,
  toEur,
} from "@/lib/import-cost";
import {
  normalizeFirstRegistration,
  normalizeFuel,
  normalizeGearbox,
  normalizeSellerType,
} from "../../scripts/scraper/foreign/normalize";

describe("import-cost", () => {
  const a = DEFAULT_ASSUMPTIONS;

  it("elétricos ficam isentos de ISV e IUC, com confiança alta", () => {
    const b = estimateImportCost(
      {
        price: 28500,
        country: "NL",
        fuel: "Elétrico",
        year: 2022,
        power: 283,
      },
      a
    );
    expect(b.isv).toBe(0);
    expect(b.iucAnnual).toBe(0);
    expect(b.confidence).toBe("alta");
    expect(b.difficulty).toBe("facil");
    // total = preço + linhas (sem fee de serviço por omissão)
    const linesSum = b.lines.reduce((s, l) => s + l.amount, 0);
    expect(b.totalEur).toBe(28500 + linesSum);
  });

  it("diesel com dados completos calcula ISV com redução por idade", () => {
    const b = estimateImportCost(
      {
        price: 22500,
        country: "DE",
        fuel: "Diesel",
        year: 2021,
        firstRegistration: "2021-06",
        displacement: 1995,
        power: 190,
        co2: 125,
      },
      a
    );
    expect(b.isv).toBeGreaterThan(0);
    expect(b.isvEstimated).toBe(false);
    expect(b.confidence).toBe("alta");
    expect(b.totalEur).toBeGreaterThan(b.vehiclePriceEur + b.isv);
    // transporte da Alemanha (~2400 km) tem de estar incluído
    const transport = b.lines.find((l) => l.key === "transport");
    expect(transport).toBeDefined();
    expect(transport!.amount).toBeGreaterThan(1000);
  });

  it("estima CO₂/cilindrada em falta e baixa a confiança", () => {
    const b = estimateImportCost(
      { price: 15000, country: "FR", fuel: "Gasolina", year: 2019 },
      a
    );
    expect(b.assumptionsUsed.co2Estimated).toBe(true);
    expect(b.assumptionsUsed.displacementEstimated).toBe(true);
    expect(b.confidence).toBe("baixa");
    expect(b.isv).toBeGreaterThan(0);
  });

  it("distância de Espanha torna o transporte mais barato do que da Alemanha", () => {
    const es = estimateImportCost(
      { price: 10000, country: "ES", fuel: "Gasolina", year: 2020 },
      a
    );
    const de = estimateImportCost(
      { price: 10000, country: "DE", fuel: "Gasolina", year: 2020 },
      a
    );
    const t = (b: typeof es) =>
      b.lines.find((l) => l.key === "transport")!.amount;
    expect(t(es)).toBeLessThan(t(de));
  });

  it("fee de serviço opcional entra no total quando configurado", () => {
    const withFee = estimateImportCost(
      { price: 20000, country: "DE", fuel: "Diesel", year: 2020 },
      { ...a, serviceFeePct: 5, serviceFeeMin: 500 }
    );
    const fee = withFee.lines.find((l) => l.key === "serviceFee");
    expect(fee?.amount).toBe(1000); // 5% de 20.000
  });

  it("converte moedas não-euro segundo os pressupostos", () => {
    const fx = { ...a, fxToEur: { CHF: 1.05 } };
    expect(toEur(10000, "CHF", fx)).toBe(10500);
    expect(toEur(10000, "EUR", fx)).toBe(10000);
    // moeda desconhecida: mantém o valor (melhor do que inventar)
    expect(toEur(10000, "XXX", fx)).toBe(10000);
  });

  it("classifica o negócio face à mediana portuguesa", () => {
    expect(rateImportDeal(28300, 33500)?.rating).toBe("EXCELLENT");
    expect(rateImportDeal(28300, 33500)?.savings).toBe(5200);
    expect(rateImportDeal(30000, 31800)?.rating).toBe("GOOD");
    expect(rateImportDeal(31500, 31800)?.rating).toBe("NEUTRAL");
    expect(rateImportDeal(36000, 31800)?.rating).toBe("BAD");
    expect(rateImportDeal(28300, null)).toBeNull();
  });

  it("mapeia combustíveis PT para o combustível fiscal", () => {
    expect(taxFuelOf("Híbrido Plug-In")).toBe("plugin");
    expect(taxFuelOf("Elétrico")).toBe("eletrico");
    expect(taxFuelOf("Híbrido")).toBe("hibrido");
    expect(taxFuelOf("Diesel")).toBe("diesel");
    expect(taxFuelOf("Gasolina")).toBe("gasolina");
    expect(taxFuelOf(null)).toBe("gasolina");
  });
});

describe("normalização de anúncios estrangeiros", () => {
  it("normaliza combustíveis multilingues", () => {
    expect(normalizeFuel("Benzin")).toBe("Gasolina");
    expect(normalizeFuel("Essence")).toBe("Gasolina");
    expect(normalizeFuel("Gazole")).toBe("Diesel");
    expect(normalizeFuel("Elektrisch")).toBe("Elétrico");
    expect(normalizeFuel("Hybride rechargeable")).toBe("Híbrido Plug-In");
    expect(normalizeFuel("Ibrida")).toBe("Híbrido");
    expect(normalizeFuel(null)).toBeNull();
  });

  it("normaliza caixas de velocidades", () => {
    expect(normalizeGearbox("Schaltgetriebe")).toBe("Manual");
    expect(normalizeGearbox("Automatik")).toBe("Automática");
    expect(normalizeGearbox("Boîte mécanique")).toBe("Manual");
    expect(normalizeGearbox("DSG")).toBe("Automática");
  });

  it("normaliza tipo de vendedor", () => {
    expect(normalizeSellerType("Privatverkäufer")).toBe("Particular");
    expect(normalizeSellerType("Dealer")).toBe("Profissional");
    expect(normalizeSellerType("Händler")).toBe("Profissional");
  });

  it("normaliza a 1ª matrícula para YYYY-MM", () => {
    expect(normalizeFirstRegistration("03/2019")).toBe("2019-03");
    expect(normalizeFirstRegistration("2019-3")).toBe("2019-03");
    expect(normalizeFirstRegistration("2019")).toBe("2019-06");
    expect(normalizeFirstRegistration("n/a")).toBeNull();
  });
});
