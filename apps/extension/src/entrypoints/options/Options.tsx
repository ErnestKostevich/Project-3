import { useEffect, useState } from 'react';
import {
  getSettings,
  setProvider,
  setApiKey,
  clearApiKey,
  getLicense,
  setLicense,
  clearLicense,
} from '@/lib/settings';
import {
  ChromeBuiltinProvider,
  createAnthropicProvider,
  createGeminiProvider,
  createOpenAIProvider,
  type AIProvider,
  type AISettings,
  type ProviderId,
} from '@/lib/ai';
import { listJobs, FREE_TIER_MAX_JOBS } from '@/lib/storage';
import { verifyLicense, type LicensePayload } from '@/lib/license';

type TestStatus = { kind: 'idle' } | { kind: 'testing' } | { kind: 'ok' } | { kind: 'err'; msg: string };

interface ProviderUi {
  id: ProviderId;
  label: string;
  description: string;
  requiresApiKey: boolean;
  apiKeyUrl?: string;
  apiKeyPlaceholder?: string;
  buildProvider(settings: AISettings): AIProvider | null;
}

const PROVIDERS_UI: ProviderUi[] = [
  {
    id: 'chrome-builtin',
    label: ChromeBuiltinProvider.meta.label,
    description: ChromeBuiltinProvider.meta.description,
    requiresApiKey: false,
    buildProvider: () => ChromeBuiltinProvider,
  },
  {
    id: 'anthropic',
    label: 'Anthropic Claude (BYOK)',
    description:
      'Highest-quality inference. Bring your own Anthropic API key — your bill, not ours.',
    requiresApiKey: true,
    apiKeyUrl: 'https://console.anthropic.com/settings/keys',
    apiKeyPlaceholder: 'sk-ant-…',
    buildProvider: (s) => createAnthropicProvider(() => s),
  },
  {
    id: 'gemini',
    label: 'Google Gemini (BYOK)',
    description:
      'Direct call to Google\'s API with your key. Generous free tier — a second truly free path next to Chrome built-in AI.',
    requiresApiKey: true,
    apiKeyUrl: 'https://aistudio.google.com/app/apikey',
    apiKeyPlaceholder: 'AI…',
    buildProvider: (s) => createGeminiProvider(() => s),
  },
  {
    id: 'openai',
    label: 'OpenAI (BYOK)',
    description:
      'GPT-4o mini with your OpenAI API key. ~$0.0001 per inference, rock-solid JSON output.',
    requiresApiKey: true,
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    apiKeyPlaceholder: 'sk-…',
    buildProvider: (s) => createOpenAIProvider(() => s),
  },
];

export function Options() {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [testStatuses, setTestStatuses] = useState<Record<ProviderId, TestStatus>>({
    'chrome-builtin': { kind: 'idle' },
    anthropic: { kind: 'idle' },
    gemini: { kind: 'idle' },
    openai: { kind: 'idle' },
  });
  const [licenseJwt, setLicenseJwt] = useState('');
  const [licenseStatus, setLicenseStatus] = useState<
    { kind: 'none' } | { kind: 'verifying' } | { kind: 'ok'; payload: LicensePayload } | { kind: 'err'; msg: string }
  >({ kind: 'none' });
  const [jobCount, setJobCount] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const s = await getSettings();
      setSettings(s);
      const lic = await getLicense();
      if (lic) {
        setLicenseJwt(lic);
        const res = await verifyLicense(lic);
        setLicenseStatus(res.valid ? { kind: 'ok', payload: res.payload } : { kind: 'err', msg: res.reason });
      }
      setJobCount((await listJobs()).length);
    })();
  }, []);

  if (!settings) {
    return (
      <main>
        <p>Loading…</p>
      </main>
    );
  }

  const isPro = licenseStatus.kind === 'ok' && licenseStatus.payload.plan === 'pro';

  async function chooseProvider(id: ProviderId) {
    if (!settings) return;
    await setProvider(id);
    setSettings({ ...settings, provider: id });
  }

  async function updateKey(id: Exclude<ProviderId, 'chrome-builtin'>, value: string) {
    if (!settings) return;
    if (value === '') {
      await clearApiKey(id);
      const next = { ...settings, apiKeys: { ...settings.apiKeys } };
      delete next.apiKeys[id];
      setSettings(next);
    } else {
      await setApiKey(id, value);
      setSettings({ ...settings, apiKeys: { ...settings.apiKeys, [id]: value } });
    }
  }

  async function testProvider(ui: ProviderUi) {
    if (!settings) return;
    setTestStatuses((prev) => ({ ...prev, [ui.id]: { kind: 'testing' } }));
    try {
      const provider = ui.buildProvider(settings);
      if (!provider) {
        setTestStatuses((prev) => ({
          ...prev,
          [ui.id]: { kind: 'err', msg: 'Provider not implemented yet.' },
        }));
        return;
      }
      const avail = await provider.isAvailable();
      if (!avail.ok) {
        setTestStatuses((prev) => ({ ...prev, [ui.id]: { kind: 'err', msg: avail.reason } }));
        return;
      }
      setTestStatuses((prev) => ({ ...prev, [ui.id]: { kind: 'ok' } }));
    } catch (err) {
      setTestStatuses((prev) => ({
        ...prev,
        [ui.id]: { kind: 'err', msg: err instanceof Error ? err.message : String(err) },
      }));
    }
  }

  async function applyLicense() {
    setLicenseStatus({ kind: 'verifying' });
    const res = await verifyLicense(licenseJwt);
    if (res.valid) {
      await setLicense(licenseJwt);
      setLicenseStatus({ kind: 'ok', payload: res.payload });
    } else {
      setLicenseStatus({ kind: 'err', msg: res.reason });
    }
  }

  async function removeLicense() {
    await clearLicense();
    setLicenseJwt('');
    setLicenseStatus({ kind: 'none' });
  }

  return (
    <main>
      <header className="page">
        <h1>Pluck — Settings</h1>
        <span className={`plan-badge ${isPro ? 'pro' : ''}`}>
          {isPro ? 'PRO · lifetime' : 'FREE'}
        </span>
      </header>

      {!isPro && jobCount != null && (
        <div className="callout">
          <strong>Free tier:</strong> {jobCount} of {FREE_TIER_MAX_JOBS} saved jobs used.{' '}
          {jobCount >= FREE_TIER_MAX_JOBS ? (
            <>You've hit the free-tier cap. Upgrade to Pro for unlimited jobs.</>
          ) : (
            <>You have {FREE_TIER_MAX_JOBS - jobCount} job slot(s) left.</>
          )}{' '}
          <a href="#license">Upgrade to Pro</a> to remove this cap and unlock scheduled runs +
          integrations.
        </div>
      )}

      <section>
        <h2>AI provider</h2>
        <p className="callout">
          Pluck runs AI inference on <strong>your machine</strong> or with <strong>your API key</strong>.
          There is no Pluck server in the loop — your usage cost is paid directly to your provider.
        </p>
        <div className="body">
          {PROVIDERS_UI.map((ui) => {
            const selected = settings.provider === ui.id;
            const key = settings.apiKeys[ui.id as Exclude<ProviderId, 'chrome-builtin'>];
            const status = testStatuses[ui.id];
            return (
              <div
                key={ui.id}
                className={`provider-card ${selected ? 'selected' : ''}`}
                onClick={() => chooseProvider(ui.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') chooseProvider(ui.id);
                }}
              >
                <div className="provider-card-header">
                  <span className="radio" />
                  {ui.label}
                </div>
                <div className="provider-card-desc">
                  {ui.description}
                  {ui.apiKeyUrl && (
                    <>
                      {' '}
                      <a
                        href={ui.apiKeyUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Get a key
                      </a>
                    </>
                  )}
                </div>

                {ui.requiresApiKey && (
                  <div className="provider-card-key" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="password"
                      placeholder={ui.apiKeyPlaceholder ?? 'API key'}
                      value={key ?? ''}
                      onChange={(e) =>
                        updateKey(
                          ui.id as Exclude<ProviderId, 'chrome-builtin'>,
                          e.target.value.trim(),
                        )
                      }
                    />
                    <button
                      onClick={() => testProvider(ui)}
                      disabled={ui.buildProvider(settings) == null}
                    >
                      {status.kind === 'testing' ? 'Testing…' : 'Test'}
                    </button>
                  </div>
                )}
                {!ui.requiresApiKey && (
                  <div className="provider-card-key" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => testProvider(ui)}>
                      {status.kind === 'testing' ? 'Testing…' : 'Test availability'}
                    </button>
                  </div>
                )}

                {status.kind === 'ok' && <div className="status ok">✓ Available</div>}
                {status.kind === 'err' && <div className="status err">✗ {status.msg}</div>}
              </div>
            );
          })}
        </div>
      </section>

      <section id="license">
        <h2>License</h2>
        <p className="callout">
          Paste your Pluck Pro license JWT here to unlock scheduled runs, unlimited saved jobs, and
          export integrations. Don't have one yet?{' '}
          <a href="https://pluck.app/pricing" target="_blank" rel="noreferrer">
            Buy a lifetime license for $29 →
          </a>
        </p>
        <div className="license-input">
          <textarea
            placeholder="eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9…"
            value={licenseJwt}
            onChange={(e) => setLicenseJwt(e.target.value)}
          />
          <div className="license-actions">
            <button className="primary" onClick={applyLicense} disabled={!licenseJwt.trim()}>
              {licenseStatus.kind === 'verifying' ? 'Verifying…' : 'Apply license'}
            </button>
            {licenseStatus.kind === 'ok' && <button onClick={removeLicense}>Remove</button>}
          </div>
          {licenseStatus.kind === 'ok' && (
            <div className="status ok">
              ✓ Valid Pro license for {licenseStatus.payload.sub}
              {licenseStatus.payload.exp
                ? ` · expires ${new Date(licenseStatus.payload.exp * 1000).toLocaleDateString()}`
                : ' · lifetime'}
            </div>
          )}
          {licenseStatus.kind === 'err' && <div className="status err">✗ {licenseStatus.msg}</div>}
        </div>
      </section>

      <section>
        <h2>How Pluck stays cheap</h2>
        <div className="callout">
          Pluck never runs an LLM on a server we pay for. Your scrape jobs run in this browser, on
          your schedule (Pro only), using your AI provider. There is no monthly fee for us, and no
          recurring fee for you — buy Pro once, use forever.
          <br />
          <br />
          <strong>Caveat for scheduled runs:</strong> Chrome must be running when the alarm fires. A
          true cloud-worker option is on the roadmap as a paid Business tier.
        </div>
      </section>

      <footer>
        <span>Pluck v0.1 · pre-alpha</span>
        <a href="https://github.com/ErnestKostevich/Project-3" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </footer>
    </main>
  );
}
