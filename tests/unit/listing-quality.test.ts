import {
  assessListingQuality,
  matchSuspiciousKeywords,
  SUSPICION_REASONS,
} from "@/lib/listing-quality";

describe("assessListingQuality", () => {
  it("marks IKEA beds and furniture listings as non-vehicle listings", () => {
    expect(
      assessListingQuality({
        title: "Cama Ikea Slattum Colchao Vesteroy 140x200",
        price: 200,
      }).reasons
    ).toContain(SUSPICION_REASONS.nonVehicle);

    expect(
      assessListingQuality({
        title: "Sofa de sala em pele",
        price: 900,
      }).reasons
    ).toContain(SUSPICION_REASONS.nonVehicle);
  });

  it("does not flag a normal car listing as non-vehicle", () => {
    expect(
      assessListingQuality({
        title: "Renault Clio 1.5 dCi",
        price: 8500,
        km: 120000,
        year: 2018,
      }).reasons
    ).not.toContain(SUSPICION_REASONS.nonVehicle);
  });

  it("does not flag adapted cars that mention wheelchairs", () => {
    expect(
      assessListingQuality({
        title: "Opel Combo 1.6 D com rampa para cadeira de rodas",
        price: 12500,
        km: 150000,
        year: 2017,
      }).reasons
    ).not.toContain(SUSPICION_REASONS.nonVehicle);
  });

  it("flags electronics and bikes by title keyword", () => {
    expect(
      assessListingQuality({
        title: "iphone 17 pro 256gb",
        price: 1050,
      }).reasons
    ).toContain(SUSPICION_REASONS.nonVehicle);

    expect(
      assessListingQuality({
        title: "Bicicleta BTT Shimano roda 29",
        price: 600,
      }).reasons
    ).toContain(SUSPICION_REASONS.nonVehicle);

    expect(
      assessListingQuality({
        title: "Trek Emonda SL6",
        price: 2500,
      }).reasons
    ).toContain(SUSPICION_REASONS.nonVehicle);

    expect(
      assessListingQuality({
        title: "Trotinete eletrica e scooter Reebok Urban",
        price: 5200,
        fuel: "Elétrico",
      }).reasons
    ).toContain(SUSPICION_REASONS.nonVehicle);
  });

  it("does not flag cars whose title mentions a bike rack or a phone trade", () => {
    // "suporte/porta bicicletas" é acessório de carro, não bicicleta à venda.
    expect(
      assessListingQuality({
        title: "Renault Megane ST 1.5 dCi c/ suporte 2 bicicletas",
        price: 5700,
      }).reasons
    ).not.toContain(SUSPICION_REASONS.nonVehicle);

    expect(
      assessListingQuality({
        title: "Renault Clio 1.5 dCi c/ porta bicicletas Thule",
        price: 4000,
      }).reasons
    ).not.toContain(SUSPICION_REASONS.nonVehicle);

    // palavra "carro" no título protege
    expect(
      assessListingQuality({
        title: "Troco carro por iphone 17 pro max",
        price: 1600,
      }).reasons
    ).not.toContain(SUSPICION_REASONS.nonVehicle);
  });

  it("does not flag campervans whose title mentions a bed", () => {
    expect(
      assessListingQuality({
        title: "Fiat Ducato camper com cama e wc",
        price: 28000,
        km: 180000,
        year: 2015,
        fuel: "Diesel",
      }).reasons
    ).not.toContain(SUSPICION_REASONS.nonVehicle);
  });

  it("does not flag sparse listings just for missing data", () => {
    // milhares de anúncios OLX reais chegam só com título+preço — a falta de
    // dados nunca chega, sozinha, para marcar não-veículo
    expect(
      assessListingQuality({
        title: "vendo dacia sandero",
        price: 4300,
        year: null,
        km: null,
        fuel: null,
        gearbox: null,
        power: null,
        displacement: null,
      }).reasons
    ).not.toContain(SUSPICION_REASONS.nonVehicle);
  });
});

describe("suspicious keywords (admin list)", () => {
  const keywords = ["mota", "cama articulada", "brinquedo"];

  it("flags a keyword match in the title even with mechanical data", () => {
    // uma mota tem km/ano/combustível — o gate looksLikeCar não a protege
    expect(
      assessListingQuality({
        title: "Mota Honda CBR 600",
        price: 4500,
        km: 30000,
        year: 2018,
        fuel: "Gasolina",
        suspiciousKeywords: keywords,
      }).reasons
    ).toContain(SUSPICION_REASONS.keyword);
  });

  it("flags a keyword match in the description", () => {
    expect(
      assessListingQuality({
        title: "Artigo em bom estado",
        price: 900,
        description: "Vendo brinquedo elétrico para crianças até 8 anos.",
        suspiciousKeywords: keywords,
      }).reasons
    ).toContain(SUSPICION_REASONS.keyword);
  });

  it("matches accent-insensitively and as whole words only", () => {
    expect(matchSuspiciousKeywords(["movel"], "Móvel de sala IKEA")).toEqual([
      "movel",
    ]);
    // "camada" não contém a palavra inteira "cama"
    expect(matchSuspiciousKeywords(["cama"], "Pintura com nova camada")).toEqual(
      []
    );
  });

  it("supports multi-word phrases", () => {
    expect(
      matchSuspiciousKeywords(
        ["cama articulada"],
        null,
        "Vendo cama  articulada elétrica"
      )
    ).toEqual(["cama articulada"]);
  });

  it("does not flag when no keyword matches", () => {
    expect(
      assessListingQuality({
        title: "Renault Clio 1.5 dCi",
        price: 7500,
        km: 120000,
        year: 2016,
        description: "Carro impecável, sempre na garagem.",
        suspiciousKeywords: keywords,
      }).reasons
    ).not.toContain(SUSPICION_REASONS.keyword);
  });

  it("does not flag when the keyword list is empty", () => {
    expect(
      assessListingQuality({
        title: "Mota Honda CBR 600",
        price: 4500,
        suspiciousKeywords: [],
      }).reasons
    ).not.toContain(SUSPICION_REASONS.keyword);
  });
});
