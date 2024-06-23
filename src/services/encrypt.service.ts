import * as CryptoJS from "crypto-js";
import { Card } from "../models";
import {
  EncryptedCard,
  EncryptedDeck,
} from "../models/encrypted-card.model";
import { cardsService } from "./cards.service";

export const encryptService = {
  encryptDeck,
  reEncryptDeck,
  decryptLayer,
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
  const rand = crypto.getRandomValues(arr);
  return Array.from(rand, dec2hex).join("");
}

function encryptDeck(deck: Card[]): EncryptedDeck {
  const secretMap: Record<number, string> = {};
  const encryptedCards = deck.map((card, i) => {
    const secretKey = generateSecret();
    const id = i + 1;
    secretMap[id] = secretKey;
    return {
      card: encrypt(card.id, secretKey),
      id
    };
  });
  return {
    secretMap,
    encryptedCards,
  };
}

function reEncryptDeck(
  layers: EncryptedCard[]
): EncryptedDeck {
  const secretMap: Record<number, string> = {};
  const encryptedCards = cardsService.shuffle(layers).map((layer, i) => {
    const secretKey = generateSecret();
    const id = i + 1;
    secretMap[id] = secretKey;
    return {
      card: encrypt(JSON.stringify(layer), secretKey),
      id
    };
  });
  return {
    secretMap,
    encryptedCards,
  };
}

function decryptLayer(
  encryptedLayer: string,
  secretKey: string
): EncryptedCard {
  const card = decrypt(encryptedLayer, secretKey)
  return JSON.parse(card);
}

function decryptCard(
  encryptedLayer: string,
  secretKey: string
): Card {
  const card = decrypt(encryptedLayer, secretKey)
  const cardArr = card.split("-");
  return new Card(Number(cardArr[0]), Number(cardArr[1]));
}
