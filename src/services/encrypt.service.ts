import * as CryptoJS from "crypto-js";
import { Card } from "../models";
import {
  EncryptedCard,
  EncryptedDeck,
  PlayerKey,
} from "../models/encrypted-card";
import { cardsService } from "./cards.service";

export const encryptService = {
  createEncryptedDeck,
  playerReEncryptDeck,
  decryptCard
};

function encrypt(message: string, secretKey: string) {
  return CryptoJS.AES.encrypt(message, secretKey).toString();
}

function decrypt(message: string, secretKey: string) {
  const bytes = CryptoJS.AES.decrypt(message, secretKey);
  return bytes.toString(CryptoJS.enc.Utf8);
}

function dec2hex(dec: number) {
  return dec.toString(16).padStart(2, "0");
}

function generateSecret(length = 6) {
  const arr = new Uint8Array((length || 40) / 2);
  crypto.getRandomValues(arr);
  return Array.from(arr, dec2hex).join("");
}

function createEncryptedDeck(player: string): EncryptedDeck {
  const deck = cardsService.createDeck();
  const secretMap: Record<number, string> = {};
  const encryptedCards = deck.map((card, i) => {
    const secretKey = generateSecret();
    const id = i + 1;
    secretMap[id] = secretKey;
    return {
      card: encrypt(card.id, secretKey),
      player: [player],
      id: [id],
    };
  });
  return {
    secretMap,
    encryptedCards,
  };
}

function playerReEncryptDeck(
  player: string,
  layers: EncryptedCard[]
): EncryptedDeck {
  const secretMap: Record<number, string> = {};
  const encryptedCards = cardsService.shuffle(layers).map((layer, i) => {
    const secretKey = generateSecret();
    const id = i + 1;
    secretMap[id] = secretKey;
    return {
      card: encrypt(layer.card, secretKey),
      player: [...layer.player, player],
      id: [...layer.id, id],
    };
  });
  return {
    secretMap,
    encryptedCards,
  };
}

function decryptCard(
  encryptedCard: EncryptedCard,
  playerKeys: PlayerKey[]
): Card {
  const card = playerKeys.reduce(
    (acc, val) => decrypt(acc, val.secretKey),
    encryptedCard.card
  );
  const cardArr = card.split("-");
  return new Card(Number(cardArr[0]), Number(cardArr[1]));
}
