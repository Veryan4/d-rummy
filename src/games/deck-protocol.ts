export function isDeckDealer(user: string, order: string[]): boolean {
  return order[0] === user;
}

export function nextEncryptHop(user: string, order: string[]): string | null {
  const index = order.indexOf(user);
  if (index < 0 || index >= order.length - 1) {
    return null;
  }
  return order[index + 1];
}
