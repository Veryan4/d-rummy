import { Card, EncryptedCard } from "../models";
import { encryptService } from "./encrypt.service";

describe("encryptService", () => {
  beforeEach(() => {
    sessionStorage.clear();
    encryptService.resetSecretMaps();
  });

  describe("encryptDeck and decryptCards (single-layer)", () => {
    it("should encrypt a deck of cards and decrypt them back to the original cards", async () => {
      const originalCards = [
        new Card(1, 1),
        new Card(2, 5),
        new Card(3, 10),
        new Card(4, 13),
      ];

      const encrypted = await encryptService.encryptDeck(originalCards);

      expect(encrypted.length).toBe(originalCards.length);
      encrypted.forEach((enc, index) => {
        expect(enc.id).toBe(index + 1);
        expect(enc.card).toBeDefined();
        expect(enc.ivArr.length).toBe(12);
      });

      // Verify secretMap was populated
      expect(encryptService.secretMaps.length).toBeGreaterThan(0);
      expect(encryptService.secretMaps.at(-1)!.size).toBe(originalCards.length);

      // Decrypt cards using the internal secretMap
      const decrypted = await encryptService.decryptCards(encrypted);

      expect(decrypted.length).toBe(originalCards.length);
      expect(decrypted.map((c) => c.id)).toEqual(
        originalCards.map((c) => c.id),
      );
    });
  });

  describe("onion encryption and multi-layer decryption", () => {
    it("should support multi-player mental poker flow (encrypt -> reEncrypt -> decryptLayers -> decryptCards)", async () => {
      const cards = [new Card(1, 2), new Card(2, 3), new Card(3, 4)];

      // --- Player 1 Encrypts ---
      encryptService.resetSecretMaps();
      const p1Encrypted = await encryptService.encryptDeck(cards);
      const p1Secrets = new Map(encryptService.secretMaps.at(-1)!);

      // --- Player 2 Re-encrypts (layer 2) ---
      encryptService.resetSecretMaps();
      const p2Encrypted = await encryptService.reEncryptDeck(p1Encrypted);
      const p2Secrets = new Map(encryptService.secretMaps.at(-1)!);

      expect(p2Encrypted.length).toBe(cards.length);

      // --- Decrypt Layer 2 (Player 2 peeling off outer layer) ---
      const peeledLayers = await encryptService.decryptLayers(
        p2Encrypted,
        p2Secrets,
      );
      expect(peeledLayers.length).toBe(cards.length);

      // --- Decrypt Cards (Player 1 peeling off innermost layer) ---
      const finalCards = await encryptService.decryptCards(
        peeledLayers,
        p1Secrets,
      );

      expect(finalCards.length).toBe(cards.length);
      // Since reEncryptDeck shuffles, all original cards should still exist in finalCards
      const originalIds = cards.map((c) => c.id).sort();
      const decryptedIds = finalCards.map((c) => c.id).sort();
      expect(decryptedIds).toEqual(originalIds);
    });
  });

  describe("giveKeys", () => {
    it("should return the requested JsonWebKeys by id", async () => {
      const cards = [new Card(1, 1), new Card(1, 2), new Card(1, 3)];
      await encryptService.encryptDeck(cards);

      const keys = encryptService.giveKeys([1, 3]);

      expect(keys[1]).toBeDefined();
      expect(keys[1].kty).toBe("oct");
      expect(keys[3]).toBeDefined();
      expect(keys[3].kty).toBe("oct");
      expect(keys[2]).toBeUndefined();
    });
  });

  describe("secretMaps management", () => {
    it("should reset and increment secret maps", () => {
      expect(encryptService.secretMaps.length).toBe(1);

      encryptService.incrementSecretMaps();
      expect(encryptService.secretMaps.length).toBe(2);

      encryptService.resetSecretMaps();
      expect(encryptService.secretMaps.length).toBe(1);
    });
  });

  describe("storeSecrets and persistence in sessionStorage", () => {
    it("should persist secrets in sessionStorage when encrypting", async () => {
      const cards = [new Card(1, 1)];
      await encryptService.encryptDeck(cards);

      const stored = sessionStorage.getItem("secretMap");
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0][0][0]).toBe(1); // id = 1
    });
  });
});
