// A token for the bench, whichever state the instance is in: onboarding it if
// it has never been used, logging in if it has. Both paths end in the same
// place, which is what lets a run attach to an instance that is already up.
export const BASE = process.env.BENCH_URL || 'http://localhost:8124';
export const CLIENT_ID = `${BASE}/`;

const USER = { name: 'Bench', username: 'bench', password: 'benchbench' };

export const request = async (path, body, token) => {
  const res = await fetch(BASE + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await res.text();

  try {
    return { status: res.status, body: JSON.parse(text) };
  } catch {
    return { status: res.status, body: text };
  }
};

const exchange = async code => {
  const res = await fetch(`${BASE}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, client_id: CLIENT_ID }),
  });
  if (!res.ok) throw new Error(`token: ${res.status} ${await res.text()}`);
  return res.json();
};

const onboardUser = async () => {
  const created = await request('/api/onboarding/users', {
    client_id: CLIENT_ID,
    language: 'en',
    ...USER,
  });
  if (created.status !== 200) return null;
  return exchange(created.body.auth_code);
};

const login = async () => {
  const flow = await request('/auth/login_flow', {
    client_id: CLIENT_ID,
    handler: ['homeassistant', null],
    redirect_uri: CLIENT_ID,
    type: 'authorize',
  });
  if (flow.status !== 200) throw new Error(`login_flow: ${flow.status}`);

  const step = await request(`/auth/login_flow/${flow.body.flow_id}`, {
    client_id: CLIENT_ID,
    username: USER.username,
    password: USER.password,
  });
  if (step.body.type !== 'create_entry') {
    throw new Error(`login: ${JSON.stringify(step.body).slice(0, 200)}`);
  }
  return exchange(step.body.result);
};

/**
 * The whole token payload - the browser side needs the refresh token too, not
 * just the access token.
 */
export const authenticate = async () => {
  const steps = await request('/api/onboarding');
  const fresh =
    Array.isArray(steps.body) && steps.body.some(s => s.step === 'user' && s.done === false);

  const tokens = fresh ? await onboardUser() : await login();
  if (!tokens) throw new Error('no token');

  // Every step has to be closed, not just the user. While any is open the
  // frontend sends a browser to /onboarding.html, which from the outside looks
  // exactly like a card that will not load.
  for (const step of ['core_config', 'analytics']) {
    await request(`/api/onboarding/${step}`, {}, tokens.access_token);
  }
  await request(
    '/api/onboarding/integration',
    { client_id: CLIENT_ID, redirect_uri: CLIENT_ID },
    tokens.access_token,
  );

  const left = await request('/api/onboarding');
  if (Array.isArray(left.body) && left.body.some(s => s.done === false)) {
    throw new Error(`onboarding incomplete: ${JSON.stringify(left.body)}`);
  }
  return tokens;
};
