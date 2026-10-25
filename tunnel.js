import localtunnel from 'localtunnel';

async function startTunnel() {
  try {
    const tunnel = await localtunnel({ port: 3000 });
    console.log('PUBLIC_TUNNEL_URL: ' + tunnel.url);

    tunnel.on('close', () => {
      console.log('Tunnel closed. Reconnecting in 3s...');
      setTimeout(startTunnel, 3000);
    });

    tunnel.on('error', (err) => {
      console.error('Tunnel error:', err?.message || err);
      setTimeout(startTunnel, 3000);
    });
  } catch (err) {
    console.error('Failed to connect tunnel. Retrying in 3s...', err?.message || err);
    setTimeout(startTunnel, 3000);
  }
}

startTunnel();
