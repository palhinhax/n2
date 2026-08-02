import { assessListingQuality, SUSPICION_REASONS } from "@/lib/listing-quality";

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
});
