export class EncryptedCard {
  card: number[];
  id: number;
  ivArr: number[];
}

export class EncryptedDeck {
  secretMap: Record<number, JsonWebKey>;
  encryptedCards: EncryptedCard[];
}
