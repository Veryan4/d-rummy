import { Card } from "../models";
import { EncryptedCard, EncryptedDeck } from "../models/encrypted-card.model";
import { cardsService } from "./cards.service";

export const encryptService = {
  encryptDeck,
  reEncryptDeck,
  decryptLayer,
  decryptCard,
};

async function encryptDeck(deck: Card[]): Promise<EncryptedDeck> {
  const secretMap: Record<number, JsonWebKey> = {};
  const encryptedCards$ = deck.map(async (card, i) => {
    const { encrypted, jwk, ivArr } = await aesGcmEncrypt(card.id);
    const id = i + 1;
    secretMap[id] = jwk;
    return {
      card: encrypted,
      id,
      ivArr,
    };
  });
  const encryptedCards = await Promise.all(encryptedCards$);
  return {
    secretMap,
    encryptedCards,
  };
}

async function reEncryptDeck(layers: EncryptedCard[]): Promise<EncryptedDeck> {
  const secretMap: Record<number, JsonWebKey> = {};
  const encryptedCards$ = cardsService.shuffle(layers).map(async (layer, i) => {
    const { encrypted, jwk, ivArr } = await aesGcmEncrypt(
      JSON.stringify(layer)
    );
    const id = i + 1;
    secretMap[id] = jwk;
    return {
      card: encrypted,
      id,
      ivArr,
    };
  });
  const encryptedCards = await Promise.all(encryptedCards$);
  return {
    secretMap,
    encryptedCards,
  };
}

async function decryptLayer(
  encryptedLayer: EncryptedCard,
  secretKey: JsonWebKey
): Promise<EncryptedCard> {
  const card = await aesGcmDecrypt(
    new Uint8Array(encryptedLayer.card).buffer,
    secretKey,
    new Uint8Array(encryptedLayer.ivArr).buffer
  );
  return JSON.parse(card);
}

async function decryptCard(
  encryptedLayer: EncryptedCard,
  secretKey: JsonWebKey
): Promise<Card> {
  const card = await aesGcmDecrypt(
    new Uint8Array(encryptedLayer.card).buffer,
    secretKey,
    new Uint8Array(encryptedLayer.ivArr).buffer
  );
  const cardArr = card.split("-");
  return new Card(Number(cardArr[0]), Number(cardArr[1]));
}

async function aesGcmEncrypt(toEncode: string) {
  const key = await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 128,
    },
    true,
    ["encrypt", "decrypt"]
  );
  const encoder = new TextEncoder();
  const encodedPlaintext = encoder.encode(toEncode);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    encodedPlaintext
  );
  const jwk = await crypto.subtle.exportKey("jwk", key);
  return {
    encrypted: Array.from(new Uint8Array(encryptedBuffer)),
    jwk,
    ivArr: Array.from(iv),
  };
}

async function aesGcmDecrypt(
  ciphertext: ArrayBuffer,
  jwk: JsonWebKey,
  ivBuffer: ArrayBuffer
) {
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "AES-GCM", length: 128 },
    true,
    ["encrypt", "decrypt"]
  );
  const iv = new Uint8Array(ivBuffer);
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    ciphertext
  );
  const decoder = new TextDecoder();
  const decryptedPlaintext = decoder.decode(decryptedData);
  return decryptedPlaintext;
}
