import { Card } from "../models";
import { EncryptedCard } from "../models/encrypted-card.model";
import { cardsService } from "./cards.service";

const SECRET_MAP_STRING = "secretMap";
const secretMaps = [new Map<number, JsonWebKey>()];
retrieveSecrets();

export const encryptService = {
  encryptDeck,
  reEncryptDeck,
  decryptLayers,
  decryptCards,
  giveKeys,
  secretMaps,
  resetSecretMaps,
  incrementSecretMaps,
};

async function encryptDeck(deck: Card[]): Promise<EncryptedCard[]> {
  const encryptedCards$ = deck.map(async (card, i) => {
    const { encrypted, jwk, ivArr } = await aesGcmEncrypt(card.id);
    const id = i + 1;
    setSecretMap(id, jwk);
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
    setSecretMap(id, jwk);
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
  secrets?: Map<number, JsonWebKey>
): Promise<EncryptedCard[]> {
  const encryptedLayers$ = encryptedLayers.map(async (encryptedLayer) => {
    const card = await aesGcmDecrypt(
      new Uint8Array(encryptedLayer.card).buffer,
      secrets
        ? secrets.get(encryptedLayer.id)!
        : getSecretMap(encryptedLayer.id)!,
      new Uint8Array(encryptedLayer.ivArr).buffer
    );
    return JSON.parse(card);
  });
  return Promise.all(encryptedLayers$);
}

async function decryptCards(
  encryptedLayers: EncryptedCard[],
  secrets?: Map<number, JsonWebKey>
): Promise<Card[]> {
  const encryptedLayers$ = encryptedLayers.map(async (encryptedLayer) => {
    const card = await aesGcmDecrypt(
      new Uint8Array(encryptedLayer.card).buffer,
      secrets
        ? secrets.get(encryptedLayer.id)!
        : getSecretMap(encryptedLayer.id)!,
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
  const map: Record<number, JsonWebKey> = {};
  ids.map((id) => (map[id] = getSecretMap(id)!));
  return map;
}

function storeSecrets() {
  sessionStorage.setItem(
    SECRET_MAP_STRING,
    JSON.stringify(
      secretMaps.map((secretMap) => Array.from(secretMap.entries()))
    )
  );
}

function retrieveSecrets() {
  secretMaps.length = 0;
  const secretMapString = sessionStorage.getItem(SECRET_MAP_STRING);
  if (secretMapString) {
    JSON.parse(secretMapString).map((secretMap: any[], i: number) => {
      if (secretMaps.length == i) {
        secretMaps.push(new Map<number, JsonWebKey>());
      }
      secretMap.map((entry) => secretMaps[i].set(entry[0], entry[1]));
    });
  }
}

function getSecretMap(id: number) {
  return secretMaps.at(-1)!.get(id);
}

function setSecretMap(id: number, secret: JsonWebKey) {
  secretMaps.at(-1)!.set(id, secret);
}

function resetSecretMaps() {
  secretMaps.length = 0;
  incrementSecretMaps();
}

function incrementSecretMaps() {
  secretMaps.push(new Map<number, JsonWebKey>());
}
