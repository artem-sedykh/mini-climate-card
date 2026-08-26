// The websocket API, for what REST does not carry: lovelace resources,
// dashboards and the entity registry. Node has had a WebSocket of its own
// since 22, so this needs no dependency.
export const connect = async (base, token) => {
  const socket = new WebSocket(`${base.replace(/^http/, 'ws')}/api/websocket`);
  const pending = new Map();
  let id = 0;

  await new Promise((resolve, reject) => {
    socket.addEventListener('error', () => reject(new Error('websocket failed')), { once: true });
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);

      if (message.type === 'auth_required') {
        socket.send(JSON.stringify({ type: 'auth', access_token: token }));
        return;
      }
      if (message.type === 'auth_ok') {
        resolve();
        return;
      }
      if (message.type === 'auth_invalid') {
        reject(new Error(message.message));
        return;
      }
      if (message.type === 'result' && pending.has(message.id)) {
        const { resolve: done, reject: failed } = pending.get(message.id);
        pending.delete(message.id);

        if (message.success) done(message.result);
        else failed(new Error(`${message.error.code}: ${message.error.message}`));
      }
    });
  });

  return {
    send: message => {
      id += 1;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ ...message, id }));
      });
    },
    close: () => socket.close(),
  };
};
