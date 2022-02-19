export const config = {
  peerjs: {
    host: import.meta.env.VITE_PEER_HOST as string,
    path: import.meta.env.VITE_PEER_PATH as string,
    secure: true,
  },
};
