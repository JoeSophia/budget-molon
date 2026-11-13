// node scripts/test-categories.mjs
import assert from "node:assert/strict";
import { categoriser, enseigne, libelle, norm } from "../lib/categories.ts";

assert.equal(enseigne("Fp Paris Sogiec Paris Fp5070/ Fp Paris Sogiec"), "Courses");
assert.equal(enseigne("Boulanger Antibes"), "High-tech");
assert.equal(enseigne("Boulangerie Paul"), "Courses");
assert.equal(enseigne("Hubert Thionville Hubert"), undefined);
assert.equal(norm("Prlv Vir Inst De Edf 123"), "edf");
assert.equal(libelle(["PRELEVEMENT  EDF", "REF 12ab|x"]), "Prlv Edf Ref 12Ab/X");

const connues = [{ lib: "Carte Picard Antibes 01", credit: false, categorie: "Courses maison" }];
assert.equal(categoriser("Carte Picard Antibes 99", -10, "5411", {}, connues), "Courses maison"); // historique avant MCC
assert.equal(categoriser("Urban Padel Club", -20, "7997", {}, []), "Padel");
assert.equal(categoriser("Urban Padel Club", -20, null, { urbanpadelclub: "Sport" }, []), "Sport"); // règle d'abord
assert.equal(categoriser("Inconnu", -5, "5812", {}, []), "Restaurants");
assert.equal(categoriser("Carrefour", 5, null, {}, []), "A catégoriser"); // pas d'enseigne sur un crédit
console.log("ok");
