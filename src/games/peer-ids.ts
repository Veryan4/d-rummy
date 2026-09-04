export function gamePeerId(user: string, namespace: string): string {
  return `${user}-${namespace}-game`;
}

export function lobbyPeerId(user: string, namespace: string): string {
  return `${user}-${namespace}-lobby`;
}

export function publicHostId(namespace: string): string {
  return `public-${namespace}-host`;
}

export function publicPeerId(user: string, namespace: string): string {
  return `public-${namespace}-${user}`;
}

export function playerFromGamePeer(peerId: string, namespace: string): string {
  return peerId.replace(new RegExp(`-${escapeRegExp(namespace)}-game$`), "");
}

export function playerFromLobbyPeer(peerId: string, namespace: string): string {
  return peerId.replace(new RegExp(`-${escapeRegExp(namespace)}-lobby$`), "");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
