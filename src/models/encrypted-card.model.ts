export class EncryptedCard {
  card: string;
  id: number;
}

export class EncryptedDeck {
  secretMap: Record<number, string>;
  encryptedCards: EncryptedCard[];
}
