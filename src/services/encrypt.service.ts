import { Card } from "../models";
import { EncryptedCard } from "../models/encrypted-card.model";
import { cardsService } from "./cards.service";

const SECRET_MAP_STRING = "secretMap";
const secretMap = new Map<number, JsonWebKey>();
retrieveSecrets();

export const encryptService = {
  encryptDeck,
  reEncryptDeck,
  decryptLayers,
  decryptCards,
  giveKeys,
};

async function encryptDeck(deck: Card[]): Promise<EncryptedCard[]> {
  const encryptedCards$ = deck.map(async (card, i) => {
    const { encrypted, jwk, ivArr } = await aesGcmEncrypt(card.id);
    const id = i + 1;
    secretMap.set(id, jwk);
    return {
      card: encrypted,
      id,
      ivArr,
    };
  });
  const encryptedCards = await Promise.all(encryptedCards$);
  storeSecrets();
  return encryptedCards;
}

async function reEncryptDeck(
  layers: EncryptedCard[]
): Promise<EncryptedCard[]> {
  const encryptedCards$ = cardsService.shuffle(layers).map(async (layer, i) => {
    const { encrypted, jwk, ivArr } = await aesGcmEncrypt(
      JSON.stringify(layer)
    );
    const id = i + 1;
    secretMap.set(id, jwk);
    return {
      card: encrypted,
      id,
      ivArr,
    };
  });
  const encryptedCards = await Promise.all(encryptedCards$);
  storeSecrets();
  return encryptedCards;
}

async function decryptLayers(
  encryptedLayers: EncryptedCard[],
  secrets?: JsonWebKey[]
): Promise<EncryptedCard[]> {
  const encryptedLayers$ = encryptedLayers.map(async (encryptedLayer, i) => {
    const card = await aesGcmDecrypt(
      new Uint8Array(encryptedLayer.card).buffer,
      secrets ? secrets[i] : secretMap.get(encryptedLayer.id)!,
      new Uint8Array(encryptedLayer.ivArr).buffer
    );
    return JSON.parse(card);
  });
  return Promise.all(encryptedLayers$);
}

async function decryptCards(
  encryptedLayers: EncryptedCard[],
  secrets?: JsonWebKey[]
): Promise<Card[]> {
  const encryptedLayers$ = encryptedLayers.map(async (encryptedLayer, i) => {
    const card = await aesGcmDecrypt(
      new Uint8Array(encryptedLayer.card).buffer,
      secrets ? secrets[i] : secretMap.get(encryptedLayer.id)!,
      new Uint8Array(encryptedLayer.ivArr).buffer
    );
    const cardArr = card.split("-");
    return new Card(Number(cardArr[0]), Number(cardArr[1]));
  });
  return Promise.all(encryptedLayers$);
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

function giveKeys(ids: number[]) {
  return ids.map((id) => secretMap.get(id)!);
}

function storeSecrets() {
  sessionStorage.setItem(
    SECRET_MAP_STRING,
    JSON.stringify(Array.from(secretMap.entries()))
  );
}

function retrieveSecrets() {
  const secretMapString = sessionStorage.getItem(SECRET_MAP_STRING);
  if (secretMapString) {
    JSON.parse(secretMapString).map((entry: any) => {
      secretMap.set(entry[0], entry[1]);
    });
  }
}
