export class EncryptedCard {
  card: string;
  id: number[];
  player: string[];
}

export class EncryptedDeck {
  secretMap: Record<number, string>;
  encryptedCards: EncryptedCard[];
}


export class PlayerKey {
  player: string;
  secretKey: string;
  id: number;
}