/* ProfileForge v3 — no framework, no backend, no required API keys. */
(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const CFG = window.PF_CONFIG || {};
  const CATALOG = window.PF_CATALOG || {};
  const THEMES = CATALOG.themes || [];
  const GOALS = CATALOG.goals || [];
  const TEMPLATES = CATALOG.templates || [];
  const SECTIONS = CATALOG.sections || [];
  const STORAGE_KEY = CFG.storageKey || 'profileforge:v3';
  const DEFAULT_SECTIONS = ['hero', 'about', 'highlights', 'skills', 'projects', 'stats', 'activity', 'connect'];
  const DEFAULT_STATE = {
    version: 3,
    username: CFG.defaultUsername || 'octocat',
    profile: null,
    repos: [],
    languages: {},
    contributions: [],
    selectedRepos: [],
    goal: 'hired',
    template: 'aurora',
    theme: 'aurora',
    view: 'preview',
    sections: [...DEFAULT_SECTIONS],
    density: 'balanced',
    settings: { showAvatar: true, showBadges: true, showStats: true, glass: true, glow: true, motion: true },
    content: {
      name: '', headline: '', about: '', location: '', company: '', website: '', email: '',
      links: [], skills: [], experience: '', education: '', achievements: '', support: ''
    }
  };
  let state = structuredCloneSafe(DEFAULT_STATE);
  let toastTimer = null;
  let scanController = null;
  let scanSequence = 0;

  function structuredCloneSafe(value) {
    return JSON.parse(JSON.stringify(value));
  }
  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }
  function escapeXml(value = '') {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));
  }
  function escapeMarkdown(value = '') {
    return String(value).replace(/\\/g, '\\\\').replace(/([`*_{}\[\]()#+.!|>])/g, '\\$1');
  }
  function formatNumber(value) {
    const number = Number(value) || 0;
    return new Intl.NumberFormat('en-US', { notation: number >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(number);
  }
  function slug(value = '') {
    return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'profile';
  }
  function theme() { return THEMES.find(item => item.id === state.theme) || THEMES[0]; }
  function template() { return TEMPLATES.find(item => item.id === state.template) || TEMPLATES[0]; }
  function section(id) { return SECTIONS.find(item => item.id === id) || { id, name: id, icon: '✦', desc: '' }; }
  function toast(message) {
    const node = $('#toast');
    if (!node) return;
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove('show'), 2600);
  }
  function setScanState(status, message) {
    const indicator = $('#apiIndicator');
    indicator?.classList.remove('loading', 'success', 'error');
    if (status) indicator?.classList.add(status);
    if ($('#scanStatus')) $('#scanStatus').textContent = message;
  }
  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      $('#workspaceStatus') && ($('#workspaceStatus').textContent = 'Draft saved locally');
    } catch (error) {
      console.warn('ProfileForge could not persist the draft:', error);
      $('#workspaceStatus') && ($('#workspaceStatus').textContent = 'Local storage unavailable');
    }
  }
  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved || typeof saved !== 'object') return;
      state = {
        ...structuredCloneSafe(DEFAULT_STATE),
        ...saved,
        settings: { ...DEFAULT_STATE.settings, ...(saved.settings || {}) },
        content: sanitizeContent(saved.content || {}),
        sections: Array.isArray(saved.sections) ? saved.sections.filter(id => SECTIONS.some(s => s.id === id)) : [...DEFAULT_SECTIONS],
        repos: Array.isArray(saved.repos) ? saved.repos.filter(item => item && typeof item.full_name === 'string') : [],
        selectedRepos: Array.isArray(saved.selectedRepos) ? saved.selectedRepos.filter(item => typeof item === 'string') : [],
        contributions: Array.isArray(saved.contributions) ? saved.contributions.filter(item => item && item.date) : [],
        languages: saved.languages && typeof saved.languages === 'object' ? saved.languages : {},
        username: typeof saved.username === 'string' && /^[a-zA-Z0-9-]{1,39}$/.test(saved.username) ? saved.username : DEFAULT_STATE.username,
        goal: GOALS.some(item => item.id === saved.goal) ? saved.goal : DEFAULT_STATE.goal,
        template: TEMPLATES.some(item => item.id === saved.template) ? saved.template : DEFAULT_STATE.template,
        theme: THEMES.some(item => item.id === saved.theme) ? saved.theme : DEFAULT_STATE.theme,
        view: ['preview', 'github', 'markdown'].includes(saved.view) ? saved.view : 'preview',
        density: ['compact', 'balanced', 'spacious'].includes(saved.density) ? saved.density : 'balanced'
      };
    } catch (error) {
      console.warn('ProfileForge draft could not be restored:', error);
    }
  }
  function applyQuery() {
    const params = new URLSearchParams(location.search);
    const username = params.get('username');
    const templateId = params.get('template');
    const themeId = params.get('theme');
    const goalId = params.get('goal');
    if (username && /^[a-zA-Z0-9-]{1,39}$/.test(username)) {
      if (state.profile?.login && state.profile.login.toLowerCase() !== username.toLowerCase()) {
        state.profile = null; state.repos = []; state.languages = {}; state.contributions = []; state.selectedRepos = [];
      }
      state.username = username;
    }
    if (TEMPLATES.some(item => item.id === templateId)) state.template = templateId;
    if (THEMES.some(item => item.id === themeId)) state.theme = themeId;
    if (GOALS.some(item => item.id === goalId)) state.goal = goalId;
  }
  function writeQuery() {
    const url = new URL(location.href);
    url.searchParams.set('username', state.username || '');
    url.searchParams.set('template', state.template);
    url.searchParams.set('theme', state.theme);
    url.searchParams.set('goal', state.goal);
    history.replaceState({}, '', url);
  }
  function applyTheme() {
    const selected = theme();
    const root = document.documentElement;
    root.dataset.theme = selected.id;
    root.style.setProperty('--bg', selected.bg);
    root.style.setProperty('--surface', selected.surface);
    root.style.setProperty('--accent', selected.a);
    root.style.setProperty('--accent-2', selected.b);
    root.style.setProperty('--text', selected.text);
    root.style.setProperty('--muted', selected.muted);
    $('meta[name="theme-color"]')?.setAttribute('content', selected.bg);
    document.body.classList.toggle('no-glass', !state.settings.glass);
    document.body.classList.toggle('no-glow', !state.settings.glow);
    document.body.classList.toggle('no-motion', !state.settings.motion);
  }
  function setDefaultContentFromProfile(profile, force = false) {
    const c = state.content;
    const canFill = key => force || !String(c[key] || '').trim();
    if (canFill('name')) c.name = profile.name || profile.login || '';
    if (canFill('about')) c.about = profile.bio || '';
    if (canFill('location')) c.location = profile.location || '';
    if (canFill('company')) c.company = profile.company || '';
    if (canFill('website')) c.website = profile.blog || '';
    if (canFill('headline')) c.headline = inferHeadline();
    if (!c.links.length) c.links = [{ label: 'GitHub', url: `https://github.com/${profile.login}` }];
  }
  function inferHeadline() {
    const languages = Object.entries(state.languages).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([name]) => name);
    const byGoal = {
      hired: `Software developer focused on ${languages.join(' and ') || 'building reliable software'}.`,
      opensource: `Open-source contributor building useful tools with ${languages.join(' and ') || 'modern technology'}.`,
      freelance: `Independent developer turning complex ideas into practical digital products.`,
      founder: `Product-minded builder turning ideas into useful, scalable software.`,
      student: `Computer science learner sharing projects, experiments and progress in public.`,
      research: `Exploring software, systems and applied technology through hands-on research.`,
      creator: `Creative technologist blending software, design and experimentation.`,
      general: `Developer building useful things and learning in public.`
    };
    return byGoal[state.goal] || byGoal.general;
  }
  function normalizeUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
    try {
      const parsed = new URL(candidate);
      return ['http:', 'https:', 'mailto:'].includes(parsed.protocol) ? parsed.href : '';
    } catch { return ''; }
  }
  function parseLinks(rawText) {
    return String(rawText || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
      const pieces = line.split('|').map(piece => piece.trim());
      if (pieces.length > 1) return { label: pieces[0] || 'Link', url: normalizeUrl(pieces.slice(1).join('|')) };
      const url = normalizeUrl(pieces[0]);
      let label = 'Website';
      try { label = new URL(url).hostname.replace(/^www\./, '').split('.')[0] || label; } catch { /* keep fallback */ }
      return { label: label.charAt(0).toUpperCase() + label.slice(1), url };
    }).filter(link => link.url);
  }
  function parsePipeLines(text) {
    return String(text || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
      const [title = '', organization = '', period = '', detail = ''] = line.split('|').map(part => part.trim());
      return { title, organization, period, detail };
    });
  }
  function sanitizeContent(raw = {}) {
    const content = { ...DEFAULT_STATE.content, ...(raw && typeof raw === 'object' ? raw : {}) };
    const stringFields = ['name','headline','about','location','company','website','email','experience','education','achievements','support'];
    stringFields.forEach(key => { content[key] = String(content[key] ?? ''); });
    content.links = Array.isArray(content.links)
      ? content.links.map(item => ({ label: String(item?.label || 'Link'), url: normalizeUrl(item?.url) })).filter(item => item.url)
      : parseLinks(String(content.links || ''));
    content.skills = Array.isArray(content.skills)
      ? content.skills.map(item => String(item).trim()).filter(Boolean).slice(0, 40)
      : String(content.skills || '').split(',').map(item => item.trim()).filter(Boolean).slice(0, 40);
    return content;
  }
  function getSelectedRepos() {
    const byName = new Map(state.repos.map(repo => [repo.full_name, repo]));
    return state.selectedRepos.map(fullName => byName.get(fullName)).filter(Boolean).slice(0, Number(CFG.limits?.featuredProjects || 8));
  }
  function getStats() {
    const profile = state.profile || {};
    return {
      repos: Number(profile.public_repos ?? state.repos.length) || 0,
      scannedRepos: state.repos.length,
      stars: state.repos.reduce((sum, repo) => sum + (Number(repo.stargazers_count) || 0), 0),
      forks: state.repos.reduce((sum, repo) => sum + (Number(repo.forks_count) || 0), 0),
      followers: Number(profile.followers) || 0,
      following: Number(profile.following) || 0,
      contributions: state.contributions.reduce((sum, item) => sum + (Number(item.count) || 0), 0),
      publicGists: Number(profile.public_gists) || 0
    };
  }
  function getLanguages() {
    return Object.entries(state.languages || {}).filter(([, count]) => Number(count) > 0).sort((a, b) => b[1] - a[1]);
  }
  async function fetchJson(url, signal) {
    const response = await fetch(url, {
      headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      signal,
      cache: 'no-store'
    });
    if (!response.ok) {
      if (response.status === 404) throw new Error('GitHub user not found. Check the username and try again.');
      if (response.status === 403 || response.status === 429) {
        const reset = response.headers.get('x-ratelimit-reset');
        const resetText = reset ? ` Try again after ${new Date(Number(reset) * 1000).toLocaleTimeString()}.` : ' Try again later.';
        throw new Error(`GitHub API rate limit reached.${resetText}`);
      }
      throw new Error(`GitHub API request failed (${response.status}).`);
    }
    return response.json();
  }
  async function fetchContributions(username, signal) {
    try {
      const base = CFG.api?.contributionsBase || 'https://github-contributions-api.jogruber.de/v4';
      const response = await fetch(`${base}/${encodeURIComponent(username)}?y=last`, { signal, cache: 'no-store' });
      if (!response.ok) return [];
      const data = await response.json();
      const list = Array.isArray(data) ? data : (Array.isArray(data.contributions) ? data.contributions : []);
      return list.filter(item => item && item.date).map(item => ({ date: String(item.date), count: Number(item.count) || 0, level: Number(item.level) || 0 })).sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      console.info('Contribution calendar unavailable; the rest of the profile can still be used.', error);
      return [];
    }
  }
  async function scanGitHub(usernameOverride) {
    const username = String(usernameOverride || $('#usernameInput')?.value || state.username).trim().replace(/^@/, '');
    if (!/^[a-zA-Z0-9-]{1,39}$/.test(username) || username.startsWith('-') || username.endsWith('-') || username.includes('--')) {
      setScanState('error', 'Enter a valid GitHub username.');
      toast('Invalid GitHub username');
      return;
    }
    if (scanController) scanController.abort();
    scanController = new AbortController();
    const sequence = ++scanSequence;
    const timeoutMs = Number(CFG.api?.requestTimeoutMs || 12000) * (Number(CFG.api?.repositoryPages || 3) + 1);
    const timeout = setTimeout(() => scanController?.abort(), timeoutMs);
    setScanState('loading', 'Scanning profile and repositories…');
    $('#scanBtn').disabled = true;
    $('#workspaceStatus').textContent = 'Fetching public GitHub data…';
    try {
      const profile = await fetchJson(`${CFG.api?.githubBase || 'https://api.github.com'}/users/${encodeURIComponent(username)}`, scanController.signal);
      const pageLimit = Math.max(1, Math.min(5, Number(CFG.api?.repositoryPages || 3)));
      const repositories = [];
      for (let page = 1; page <= pageLimit; page += 1) {
        const batch = await fetchJson(`${CFG.api?.githubBase || 'https://api.github.com'}/users/${encodeURIComponent(username)}/repos?per_page=100&page=${page}&sort=updated&direction=desc`, scanController.signal);
        if (!Array.isArray(batch)) break;
        repositories.push(...batch);
        if (batch.length < 100) break;
      }
      const contributions = await fetchContributions(profile.login, scanController.signal);
      if (sequence !== scanSequence) return;
      state.profile = profile;
      state.username = profile.login;
      state.repos = repositories.slice(0, Number(CFG.limits?.visibleProjects || 100));
      state.contributions = contributions;
      const languageCounts = {};
      state.repos.filter(repo => !repo.fork && !repo.archived).forEach(repo => {
        if (repo.language) languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
      });
      state.languages = languageCounts;
      const rank = state.repos.filter(repo => !repo.fork).sort((a, b) => (b.stargazers_count + b.forks_count) - (a.stargazers_count + a.forks_count));
      if (!state.selectedRepos.length || !state.selectedRepos.some(fullName => state.repos.some(repo => repo.full_name === fullName))) {
        state.selectedRepos = rank.slice(0, Number(CFG.limits?.featuredProjects || 8)).map(repo => repo.full_name);
      } else {
        state.selectedRepos = state.selectedRepos.filter(fullName => state.repos.some(repo => repo.full_name === fullName));
      }
      setDefaultContentFromProfile(profile);
      $('#usernameInput').value = profile.login;
      setScanState('success', `Loaded ${state.repos.length} repositories · ${contributions.length ? 'contribution calendar ready' : 'calendar unavailable'}`);
      $('#workspaceStatus').textContent = 'GitHub profile synced';
      writeQuery();
      renderAll();
      persist();
      toast(`@${profile.login} profile loaded`);
    } catch (error) {
      if (error.name === 'AbortError') {
        if (sequence === scanSequence) setScanState('error', 'The request timed out or was cancelled. Try again.');
      } else {
        setScanState('error', error.message || 'Could not load this GitHub profile.');
        $('#workspaceStatus').textContent = 'Using current local draft';
        toast(error.message || 'GitHub scan failed');
      }
    } finally {
      clearTimeout(timeout);
      if (sequence === scanSequence) $('#scanBtn').disabled = false;
    }
  }
  function setProfileValue(key, value) {
    state.content[key] = value;
    persist();
    renderPreview();
    renderMarkdown();
    renderHeroDemo();
  }
  function syncInputs() {
    const c = state.content;
    const values = {
      nameInput: c.name, headlineInput: c.headline, aboutInput: c.about, locationInput: c.location,
      companyInput: c.company, websiteInput: c.website, emailInput: c.email,
      linksInput: c.links.map(item => `${item.label} | ${item.url}`).join('\n'),
      skillsInput: c.skills.join(', '), experienceInput: c.experience, educationInput: c.education,
      achievementsInput: c.achievements, supportInput: c.support
    };
    Object.entries(values).forEach(([id, value]) => { if ($('#' + id)) $('#' + id).value = value ?? ''; });
    $('#usernameInput').value = state.username || '';
    $('#densitySelect').value = state.density;
    $$('[data-setting]').forEach(input => { input.checked = Boolean(state.settings[input.dataset.setting]); });
  }
  function updateContentFromInput(event) {
    const keyById = {
      nameInput: 'name', headlineInput: 'headline', aboutInput: 'about', locationInput: 'location',
      companyInput: 'company', websiteInput: 'website', emailInput: 'email', experienceInput: 'experience',
      educationInput: 'education', achievementsInput: 'achievements', supportInput: 'support'
    };
    const key = keyById[event.target.id];
    if (key) state.content[key] = event.target.value;
    if (event.target.id === 'linksInput') state.content.links = parseLinks(event.target.value);
    if (event.target.id === 'skillsInput') state.content.skills = event.target.value.split(',').map(item => item.trim()).filter(Boolean).slice(0, 40);
    persist();
    renderPreview();
    renderMarkdown();
    renderHeroDemo();
  }
  function selectedLinks() {
    const links = [...(state.content.links || [])];
    if (state.content.website) links.unshift({ label: 'Website', url: normalizeUrl(state.content.website) });
    if (state.content.email) links.push({ label: 'Email', url: `mailto:${state.content.email.trim()}` });
    if (state.profile?.html_url && !links.some(item => item.url === state.profile.html_url)) links.unshift({ label: 'GitHub', url: state.profile.html_url });
    const seen = new Set();
    return links.filter(link => link.url && !seen.has(link.url) && seen.add(link.url));
  }
  function contributionLevels() {
    const entries = state.contributions || [];
    const byDate = new Map(entries.map(item => [item.date, Number(item.count) || 0]));
    const result = [];
    const end = new Date(); end.setHours(0, 0, 0, 0);
    const start = new Date(end); start.setDate(start.getDate() - 363);
    start.setDate(start.getDate() - start.getDay());
    for (let index = 0; index < 371; index += 1) {
      const date = new Date(start); date.setDate(start.getDate() + index);
      const key = date.toISOString().slice(0, 10);
      const count = byDate.get(key) || 0;
      const level = count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : count <= 9 ? 3 : 4;
      result.push({ date: key, count, level });
    }
    return result;
  }
  function sectionHeading(icon, title) { return `<h2><span>${escapeHtml(icon)}</span>${escapeHtml(title)}</h2>`; }
  function renderHeroSection() {
    const profile = state.profile || {};
    const avatar = profile.avatar_url || 'assets/avatar-placeholder.svg';
    const c = state.content;
    const stats = getStats();
    const metrics = [
      ['REPOSITORIES', stats.repos], ['STARS', stats.stars], ['FOLLOWERS', stats.followers], ['FORKS', stats.forks]
    ];
    const badges = state.settings.showBadges ? `<div class="rf-badges">${[
      c.location && `📍 ${c.location}`, c.company && `🏢 ${c.company}`, c.headline && '⚡ Available for collaboration'
    ].filter(Boolean).map(label => `<span class="rf-badge">${escapeHtml(label)}</span>`).join('')}</div>` : '';
    return `<header class="rf-hero">${state.settings.showAvatar ? `<img class="rf-avatar" src="${escapeHtml(avatar)}" alt="${escapeHtml(c.name || profile.login || 'Profile')} avatar" loading="lazy" onerror="this.src='assets/avatar-placeholder.svg'">` : ''}<div class="rf-handle">@${escapeHtml(profile.login || state.username || 'username')}</div><h1 class="rf-name">${escapeHtml(c.name || profile.name || state.username || 'Your name')}</h1><div class="rf-headline">${escapeHtml(c.headline || 'Your professional headline goes here.')}</div>${c.about ? `<p class="rf-bio">${escapeHtml(c.about)}</p>` : ''}${badges}${state.settings.showStats ? `<div class="rf-metrics">${metrics.map(([label, value]) => `<div class="rf-metric"><b>${formatNumber(value)}</b><span>${label}</span></div>`).join('')}</div>` : ''}</header>`;
  }
  function renderSectionHtml(id) {
    const c = state.content;
    const profile = state.profile || {};
    const stats = getStats();
    const languages = getLanguages().slice(0, 10);
    const projects = getSelectedRepos();
    switch (id) {
      case 'hero': return renderHeroSection();
      case 'about': return c.about ? `<section class="rf-section">${sectionHeading('👋', 'About me')}<p>${escapeHtml(c.about).replace(/\n/g, '<br>')}</p></section>` : '';
      case 'highlights': {
        const bits = [c.location && `📍 ${c.location}`, c.company && `🏢 ${c.company}`, profile.created_at && `🗓️ GitHub member since ${new Date(profile.created_at).getFullYear()}`].filter(Boolean);
        if (!bits.length && !state.settings.showStats) return '';
        return `<section class="rf-section">${sectionHeading('📌', 'Highlights')}<div class="rf-tag-list">${bits.map(item => `<span class="rf-tag">${escapeHtml(item)}</span>`).join('')}${state.settings.showStats ? `<span class="rf-tag">⭐ ${formatNumber(stats.stars)} stars earned</span><span class="rf-tag">🍴 ${formatNumber(stats.forks)} forks</span>` : ''}</div></section>`;
      }
      case 'skills': {
        const values = [...new Set([...(c.skills || []), ...languages.map(([name]) => name)])].slice(0, 32);
        return values.length ? `<section class="rf-section">${sectionHeading('🧰', 'Tech stack & skills')}<div class="rf-tag-list">${values.map(name => `<span class="rf-tag">${escapeHtml(CATALOG.tech?.[name]?.icon || '✦')} ${escapeHtml(name)}</span>`).join('')}</div></section>` : '';
      }
      case 'projects': {
        const cards = projects.map(repo => `<a class="rf-project" href="${escapeHtml(repo.html_url)}" target="_blank" rel="noreferrer"><h3>📦 ${escapeHtml(repo.name)}</h3><p>${escapeHtml(repo.description || 'A public repository. Explore the source and documentation.')}</p><div class="rf-project-meta"><span>⭐ ${formatNumber(repo.stargazers_count)}</span><span>⑂ ${formatNumber(repo.forks_count)}</span><span>${escapeHtml(repo.language || 'Code')}</span></div></a>`).join('');
        return `<section class="rf-section">${sectionHeading('🚀', 'Featured projects')}<div class="rf-project-grid">${cards || '<p>No projects selected yet. Choose repositories in the project curator.</p>'}</div></section>`;
      }
      case 'stats':
        return `<section class="rf-section">${sectionHeading('📊', 'GitHub statistics')}<div class="rf-metrics">${[['Repositories', stats.repos], ['Stars', stats.stars], ['Followers', stats.followers], ['Forks', stats.forks]].map(([label, value]) => `<div class="rf-metric"><b>${formatNumber(value)}</b><span>${label.toUpperCase()}</span></div>`).join('')}</div><p>Repository metadata is sampled from public repositories visible to the GitHub API.</p></section>`;
      case 'activity': {
        const levels = contributionLevels();
        const total = stats.contributions;
        return `<section class="rf-section">${sectionHeading('🟩', 'Contribution activity')}<div class="rf-activity-grid" aria-label="Contribution calendar">${levels.map(day => `<i class="rf-day" data-level="${day.level}" title="${day.count} contributions on ${day.date}"></i>`).join('')}</div><p>${total ? `${formatNumber(total)} contributions recorded by the public calendar source.` : 'Contribution data is unavailable for this profile. You can still publish the rest of the README.'}</p></section>`;
      }
      case 'experience': {
        const rows = parsePipeLines(c.experience);
        return rows.length ? `<section class="rf-section">${sectionHeading('💼', 'Experience')}<div class="rf-list">${rows.map(row => `<div class="rf-list-item"><b>${escapeHtml(row.title || 'Role')}${row.organization ? ` · ${escapeHtml(row.organization)}` : ''}</b>${row.period ? `<small>${escapeHtml(row.period)}</small>` : ''}${row.detail ? `<p>${escapeHtml(row.detail)}</p>` : ''}</div>`).join('')}</div></section>` : '';
      }
      case 'education': {
        const rows = parsePipeLines(c.education);
        return rows.length ? `<section class="rf-section">${sectionHeading('🎓', 'Education')}<div class="rf-list">${rows.map(row => `<div class="rf-list-item"><b>${escapeHtml(row.title || 'Education')}${row.organization ? ` · ${escapeHtml(row.organization)}` : ''}</b>${row.period ? `<small>${escapeHtml(row.period)}</small>` : ''}${row.detail ? `<p>${escapeHtml(row.detail)}</p>` : ''}</div>`).join('')}</div></section>` : '';
      }
      case 'achievements': {
        const rows = String(c.achievements || '').split(/\r?\n/).map(row => row.trim()).filter(Boolean);
        return rows.length ? `<section class="rf-section">${sectionHeading('🏆', 'Achievements & certifications')}<div class="rf-tag-list">${rows.map(row => `<span class="rf-tag">🏅 ${escapeHtml(row)}</span>`).join('')}</div></section>` : '';
      }
      case 'connect': {
        const links = selectedLinks();
        return links.length ? `<section class="rf-section">${sectionHeading('🔗', 'Connect')}<div class="rf-links">${links.map(link => `<a class="rf-link" href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)} ↗</a>`).join('')}</div></section>` : '';
      }
      case 'support':
        return c.support && normalizeUrl(c.support) ? `<section class="rf-section">${sectionHeading('☕', 'Support my work')}<p>If my work has been useful to you, you can support future experiments and open-source projects.</p><div class="rf-links"><a class="rf-link" href="${escapeHtml(normalizeUrl(c.support))}" target="_blank" rel="noreferrer">Support this work ↗</a></div></section>` : '';
      default: return '';
    }
  }
  function buildPreviewHtml() {
    const sections = state.sections.map(id => renderSectionHtml(id)).filter(Boolean);
    return `<div class="readme-inner density-${escapeHtml(state.density)}">${sections.join('')}<div class="rf-footer">Designed with ProfileForge · ${escapeHtml(template().name)} · ${escapeHtml(theme().name)}</div></div>`;
  }
  function renderPreview() {
    const canvas = $('#previewCanvas');
    if (!canvas) return;
    canvas.innerHTML = buildPreviewHtml();
    canvas.classList.toggle('github-mode', state.view === 'github');
    $('#previewPath').textContent = `github.com / ${state.username || 'username'}`;
  }
  function markdownLink(label, url) {
    const safe = normalizeUrl(url);
    return safe ? `[${String(label).replace(/[\[\]]/g, '')}](${safe.replace(/\)/g, '%29')})` : '';
  }
  function buildMarkdown() {
    const profile = state.profile || {};
    const c = state.content;
    const stats = getStats();
    const lines = [];
    const add = (...parts) => lines.push(...parts);
    const has = id => state.sections.includes(id);
    add('<!-- ProfileForge generated README. Edit this file freely after publishing. -->', '');
    if (has('hero')) {
      add('<div align="center">', '');
      add(`<img src="assets/${slug(state.username)}-hero.svg" width="100%" alt="${escapeHtml(c.name || profile.login || state.username)} profile banner" />`, '');
      if (state.settings.showAvatar && profile.avatar_url) add(`<img src="${escapeHtml(profile.avatar_url)}" width="96" alt="${escapeHtml(c.name || profile.login || state.username)} avatar" />`, '');
      add(`<h1>${escapeHtml(c.name || profile.name || profile.login || state.username)}</h1>`);
      if (c.headline) add(`<p><strong>${escapeHtml(c.headline)}</strong></p>`);
      if (state.settings.showBadges) {
        const badgeLinks = [];
        if (profile.html_url) badgeLinks.push(`<a href="${escapeHtml(profile.html_url)}"><img src="https://img.shields.io/badge/GitHub-${encodeURIComponent(profile.login || state.username)}-181717?style=for-the-badge&logo=github" alt="GitHub" /></a>`);
        if (c.website) badgeLinks.push(`<a href="${escapeHtml(normalizeUrl(c.website))}"><img src="https://img.shields.io/badge/Portfolio-Visit-0ea5a4?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Portfolio" /></a>`);
        if (badgeLinks.length) add('', badgeLinks.join(' '));
      }
      add('', '</div>', '');
    }
    if (has('about') && c.about) add('## 👋 About me', '', c.about, '');
    if (has('highlights')) {
      const details = [c.location && `📍 ${c.location}`, c.company && `🏢 ${c.company}`, profile.created_at && `🗓️ GitHub member since ${new Date(profile.created_at).getFullYear()}`].filter(Boolean);
      if (details.length || state.settings.showStats) add('## 📌 Highlights', '', ...details, ...(state.settings.showStats ? [`⭐ **${formatNumber(stats.stars)}** stars · 🍴 **${formatNumber(stats.forks)}** forks · 👥 **${formatNumber(stats.followers)}** followers`] : []), '');
    }
    if (has('skills')) {
      const skills = [...new Set([...(c.skills || []), ...getLanguages().slice(0, 10).map(([name]) => name)])].slice(0, 32);
      if (skills.length) add('## 🧰 Tech stack & skills', '', skills.map(skill => `- ${CATALOG.tech?.[skill]?.icon || '✦'} ${skill}`).join('\n'), '');
    }
    if (has('projects')) {
      add('## 🚀 Featured projects', '');
      const repos = getSelectedRepos();
      if (!repos.length) add('_No featured repositories selected yet._', '');
      repos.forEach(repo => add(`### ${markdownLink(repo.name, repo.html_url)}`, '', escapeMarkdown(repo.description || 'A public repository. Explore the source and documentation.'), '', `**${escapeMarkdown(repo.language || 'Code')}** · ⭐ ${repo.stargazers_count || 0} · ⑂ ${repo.forks_count || 0}`, ''));
    }
    if (has('stats')) add('## 📊 GitHub statistics', '', `![GitHub statistics](assets/${slug(state.username)}-stats.svg)`, '');
    if (has('activity')) add('## 🟩 Contribution activity', '', `![Contribution heatmap](assets/${slug(state.username)}-heatmap.svg)`, '');
    if (has('experience')) {
      const rows = parsePipeLines(c.experience);
      if (rows.length) add('## 💼 Experience', '', rows.map(row => `- **${row.title}**${row.organization ? ` · ${row.organization}` : ''}${row.period ? ` (${row.period})` : ''}${row.detail ? `\n  ${row.detail}` : ''}`).join('\n'), '');
    }
    if (has('education')) {
      const rows = parsePipeLines(c.education);
      if (rows.length) add('## 🎓 Education', '', rows.map(row => `- **${row.title}**${row.organization ? ` · ${row.organization}` : ''}${row.period ? ` (${row.period})` : ''}${row.detail ? `\n  ${row.detail}` : ''}`).join('\n'), '');
    }
    if (has('achievements')) {
      const achievements = String(c.achievements || '').split(/\r?\n/).map(item => item.trim()).filter(Boolean);
      if (achievements.length) add('## 🏆 Achievements & certifications', '', achievements.map(item => `- 🏅 ${item}`).join('\n'), '');
    }
    if (has('connect')) {
      const links = selectedLinks();
      if (links.length) add('## 🔗 Connect', '', links.map(link => `- ${markdownLink(link.label, link.url)}`).filter(Boolean).join('\n'), '');
    }
    if (has('support') && c.support && normalizeUrl(c.support)) add('## ☕ Support my work', '', `If my work has been useful to you, you can [support future experiments](${normalizeUrl(c.support)}).`, '');
    add('---', `<!-- ProfileForge · ${template().name} · ${theme().name} -->`);
    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }
  function renderMarkdown() { if ($('#markdownCanvas')) $('#markdownCanvas').textContent = buildMarkdown(); }
  function renderGoalGrid() {
    $('#goalGrid').innerHTML = GOALS.map(goal => `<button type="button" class="goal-btn ${state.goal === goal.id ? 'active' : ''}" data-goal="${goal.id}" title="${escapeHtml(goal.desc)}"><b>${goal.icon} ${escapeHtml(goal.name)}</b><small>${escapeHtml(goal.desc)}</small></button>`).join('');
  }
  function renderTemplateList() {
    const recent = TEMPLATES.filter(item => ['aurora', 'recruiter', 'maintainer', 'minimal', 'matrix', 'frosted'].includes(item.id));
    $('#templateList').innerHTML = recent.map(item => `<button type="button" class="template-btn ${state.template === item.id ? 'active' : ''}" data-template="${item.id}"><span class="template-meta"><span class="template-icon">${item.icon}</span>${escapeHtml(item.name)}</span><span>›</span></button>`).join('');
  }
  function renderTimeline() {
    $('#timeline').innerHTML = state.sections.map((id, index) => {
      const item = section(id);
      return `<div class="timeline-item" data-section="${id}"><span class="timeline-icon">${item.icon}</span><b>${escapeHtml(item.name)}</b><small>${String(index + 1).padStart(2, '0')} / ${escapeHtml(item.desc)}</small><div class="timeline-controls"><button type="button" data-move="up" aria-label="Move ${escapeHtml(item.name)} up" ${index === 0 ? 'disabled' : ''}>↑</button><button type="button" data-move="down" aria-label="Move ${escapeHtml(item.name)} down" ${index === state.sections.length - 1 ? 'disabled' : ''}>↓</button><button type="button" data-move="remove" aria-label="Remove ${escapeHtml(item.name)}">×</button></div></div>`;
    }).join('');
    const available = SECTIONS.filter(item => !state.sections.includes(item.id));
    $('#addSectionSelect').innerHTML = available.map(item => `<option value="${item.id}">${item.icon} ${escapeHtml(item.name)}</option>`).join('') || '<option value="">All sections added</option>';
    $('#addSectionBtn').disabled = !available.length;
  }
  function renderSignals() {
    const stats = getStats();
    $('#signalGrid').innerHTML = [
      ['Stars', stats.stars], ['Followers', stats.followers], ['Repositories', stats.repos], ['Forks', stats.forks]
    ].map(([label, value]) => `<div class="signal"><b>${formatNumber(value)}</b><span>${label}</span></div>`).join('');
    const langs = getLanguages().slice(0, 5);
    const total = langs.reduce((sum, [, value]) => sum + value, 0) || 1;
    $('#languageSummary').innerHTML = langs.length ? langs.map(([name, count]) => `<div class="language-row"><span>${escapeHtml(name)}</span><span class="lang-track"><i style="width:${Math.max(4, count / total * 100)}%"></i></span><em>${Math.round(count / total * 100)}%</em></div>`).join('') : '<span class="empty-note">Scan a profile to see its language signal.</span>';
  }
  function sortRepositories(repositories) {
    const mode = $('#projectSortSelect')?.value || 'stars';
    return [...repositories].sort((a, b) => {
      if (mode === 'updated') return new Date(b.pushed_at || b.updated_at) - new Date(a.pushed_at || a.updated_at);
      if (mode === 'forks') return (b.forks_count || 0) - (a.forks_count || 0);
      if (mode === 'name') return a.name.localeCompare(b.name);
      return (b.stargazers_count || 0) - (a.stargazers_count || 0);
    });
  }
  function renderProjects() {
    const query = ($('#projectSearchInput')?.value || '').trim().toLowerCase();
    const list = sortRepositories(state.repos).filter(repo => `${repo.name} ${repo.description || ''} ${repo.language || ''}`.toLowerCase().includes(query)).slice(0, 55);
    $('#projectPicker').innerHTML = list.length ? list.map(repo => `<label class="project-item"><input type="checkbox" data-repo="${escapeHtml(repo.full_name)}" ${state.selectedRepos.includes(repo.full_name) ? 'checked' : ''}><span><b>${escapeHtml(repo.name)} <em class="project-stars">★ ${formatNumber(repo.stargazers_count)}</em></b><small>${escapeHtml(repo.language || 'Code')} · ${escapeHtml(repo.visibility || 'public')} · ${formatNumber(repo.forks_count)} forks</small></span></label>`).join('') : `<span class="empty-note">${state.repos.length ? 'No repositories match this filter.' : 'Scan a GitHub profile to load repositories.'}</span>`;
  }
  function renderThemeGrid() {
    const quick = THEMES.slice(0, 16);
    $('#themeGrid').innerHTML = quick.map(item => `<button type="button" class="theme-btn ${state.theme === item.id ? 'active' : ''}" data-theme="${item.id}" style="--t1:${item.a};--t2:${item.b}" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</button>`).join('');
  }
  function renderTemplateCatalog() {
    const query = ($('#templateSearchInput')?.value || '').trim().toLowerCase();
    const category = $('#templateCategorySelect')?.value || 'all';
    const list = TEMPLATES.filter(item => (category === 'all' || item.category === category) && `${item.name} ${item.category} ${item.desc}`.toLowerCase().includes(query));
    $('#catalogGrid').innerHTML = list.map(item => `<article class="catalog-card ${state.template === item.id ? 'active' : ''}" style="--card-accent:${theme().a}"><div class="catalog-card-top"><span class="catalog-icon">${item.icon}</span><span class="catalog-category">${escapeHtml(item.category)}</span></div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.desc)}</p><div class="catalog-card-bottom"><span class="section-count">${item.sections.length} sections · ${item.sections.map(id => section(id).name).slice(0, 2).join(' + ')}</span><button type="button" class="use-template" data-template="${item.id}">${state.template === item.id ? 'Selected ✓' : 'Use template'}</button></div></article>`).join('') || '<span class="empty-note">No templates match this filter.</span>';
  }
  function renderThemeCatalog() {
    const query = ($('#themeSearchInput')?.value || '').trim().toLowerCase();
    const list = THEMES.filter(item => item.name.toLowerCase().includes(query));
    $('#themeCatalog').innerHTML = list.map(item => `<button type="button" class="theme-swatch-card ${state.theme === item.id ? 'active' : ''}" data-theme="${item.id}"><div class="theme-swatch" style="--swatch-a:${item.a};--swatch-b:${item.b}"></div><b>${escapeHtml(item.name)}</b><small>${item.a} · ${item.b}</small></button>`).join('') || '<span class="empty-note">No theme found.</span>';
  }
  function renderHeroDemo() {
    const c = state.content;
    $('#heroDemoName').textContent = c.name || state.profile?.name || 'Your profile';
    $('#heroDemoHandle').textContent = `@${state.username || 'yourusername'}`;
    $('#heroDemoHeadline').textContent = c.headline || 'A profile with a clear point of view.';
    const stats = getStats();
    $('#heroDemoRepos').textContent = formatNumber(stats.repos);
    $('#heroDemoStars').textContent = formatNumber(stats.stars);
    $('#heroDemoFollowers').textContent = formatNumber(stats.followers);
    if (!$('#heroHeatmap').children.length) $('#heroHeatmap').innerHTML = Array.from({ length: 104 }, (_, i) => `<i style="opacity:${[.07,.15,.3,.5,.78][(i * 7) % 5]}"></i>`).join('');
  }
  function renderAll() {
    applyTheme();
    renderGoalGrid();
    renderTemplateList();
    renderThemeGrid();
    renderTimeline();
    renderSignals();
    renderProjects();
    renderTemplateCatalog();
    renderThemeCatalog();
    syncInputs();
    renderPreview();
    renderMarkdown();
    renderHeroDemo();
    updateView();
  }
  function updateView() {
    $$('.view-tab').forEach(button => button.classList.toggle('active', button.dataset.view === state.view));
    $('#previewCanvas').classList.toggle('hidden', state.view === 'markdown');
    $('#markdownCanvas').classList.toggle('hidden', state.view !== 'markdown');
    $('#previewCanvas').classList.toggle('github-mode', state.view === 'github');
    $('#previewFrame').classList.toggle('markdown-mode', state.view === 'markdown');
  }
  function applyTemplate(id) {
    const chosen = TEMPLATES.find(item => item.id === id);
    if (!chosen) return;
    state.template = chosen.id;
    state.sections = [...chosen.sections];
    writeQuery();
    renderAll();
    persist();
    toast(`${chosen.name} template applied`);
  }
  function applyThemeId(id) {
    if (!THEMES.some(item => item.id === id)) return;
    state.theme = id;
    writeQuery();
    renderAll();
    persist();
    toast(`${theme().name} theme applied`);
  }
  function improveCopy() {
    const c = state.content;
    const languages = getLanguages().slice(0, 3).map(([name]) => name);
    const projects = getSelectedRepos().slice(0, 2).map(repo => repo.name);
    const topLanguages = languages.join(', ') || (c.skills.slice(0, 3).join(', ') || 'software development');
    const lead = {
      hired: `Software developer focused on ${topLanguages}, building reliable products and solving practical problems.`,
      opensource: `Open-source builder working with ${topLanguages}; interested in maintainable tools, clear documentation and useful community projects.`,
      freelance: `Independent developer helping turn product ideas into reliable digital experiences with ${topLanguages}.`,
      founder: `Product-minded engineer building useful products with ${topLanguages}, from the first prototype to a dependable release.`,
      student: `Computer engineering student exploring ${topLanguages} through hands-on projects, continuous learning and open experimentation.`,
      research: `Technology enthusiast exploring software systems and applied engineering through research, prototypes and reproducible work.`,
      creator: `Creative technologist combining ${topLanguages} with design, 3D experiments and interactive ideas.`,
      general: `Developer building practical software with ${topLanguages} and sharing the process in public.`
    };
    c.headline = lead[state.goal] || lead.general;
    if (!c.about || c.about.length < 28) {
      const proof = projects.length ? ` Recent work includes ${projects.join(' and ')}.` : ' I enjoy shipping practical projects and learning by building.';
      c.about = `I am a developer who values useful products, thoughtful engineering and continuous improvement.${proof} My current focus is ${topLanguages}.`;
    }
    syncInputs();
    renderPreview(); renderMarkdown(); renderHeroDemo(); persist();
    $('#suggestionBox').textContent = 'Updated your headline and, when needed, your introduction using your selected objective, repository languages and featured projects. Review the result before publishing.';
    toast('Profile copy refreshed');
  }
  function makeHeroSvg() {
    const c = state.content;
    const t = theme();
    const name = escapeXml(c.name || state.profile?.name || state.username);
    const headline = escapeXml(c.headline || 'Building useful things in public.');
    const handle = escapeXml(`@${state.username}`);
    const width = 1200, height = 320;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${t.a}"/><stop offset="1" stop-color="${t.b}"/></linearGradient><radialGradient id="glow"><stop stop-color="${t.a}" stop-opacity=".32"/><stop offset="1" stop-color="${t.a}" stop-opacity="0"/></radialGradient></defs><rect width="1200" height="320" rx="28" fill="${t.bg}"/><circle cx="1070" cy="35" r="250" fill="url(#glow)"/><circle cx="80" cy="310" r="190" fill="${t.b}" opacity=".07"/><rect x="28" y="28" width="1144" height="264" rx="22" fill="${t.surface}" stroke="#ffffff" stroke-opacity=".14"/><rect x="70" y="88" width="76" height="76" rx="23" fill="url(#g)"/><text x="108" y="136" text-anchor="middle" fill="${t.bg}" font-family="Arial,sans-serif" font-size="32" font-weight="700">${escapeXml((c.name || state.username).slice(0, 1).toUpperCase())}</text><text x="180" y="104" fill="${t.b}" font-family="Arial,sans-serif" font-size="17" font-weight="700">${handle}</text><text x="180" y="158" fill="${t.text}" font-family="Arial,sans-serif" font-size="43" font-weight="700">${name.slice(0, 36)}</text><text x="180" y="202" fill="${t.muted}" font-family="Arial,sans-serif" font-size="19">${headline.slice(0, 78)}</text><rect x="180" y="228" width="185" height="36" rx="18" fill="url(#g)"/><text x="272" y="251" text-anchor="middle" fill="${t.bg}" font-family="Arial,sans-serif" font-size="12" font-weight="700">PROFILEFORGE</text><text x="1100" y="255" text-anchor="end" fill="${t.muted}" font-family="monospace" font-size="11" letter-spacing="2">GITHUB / IDENTITY</text></svg>`;
  }
  function makeStatsSvg() {
    const t = theme();
    const stats = getStats();
    const items = [['REPOSITORIES', stats.repos], ['STARS EARNED', stats.stars], ['FOLLOWERS', stats.followers], ['FORKS', stats.forks]];
    const cards = items.map(([label, value], index) => {
      const x = 20 + index * 292;
      return `<rect x="${x}" y="22" width="270" height="126" rx="17" fill="${t.surface}" stroke="#ffffff" stroke-opacity=".14"/><text x="${x + 22}" y="58" fill="${t.muted}" font-family="Arial,sans-serif" font-size="12" letter-spacing="1.6">${label}</text><text x="${x + 22}" y="112" fill="${index % 2 ? t.b : t.a}" font-family="Arial,sans-serif" font-size="39" font-weight="700">${escapeXml(formatNumber(value))}</text>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="170" viewBox="0 0 1200 170"><rect width="1200" height="170" rx="22" fill="${t.bg}"/>${cards}</svg>`;
  }
  function makeHeatmapSvg() {
    const t = theme();
    const days = contributionLevels();
    const cells = days.map((day, index) => {
      const x = 34 + Math.floor(index / 7) * 18;
      const y = 52 + (index % 7) * 17;
      const opacity = day.level === 0 ? .09 : .3 + day.level * .16;
      return `<rect x="${x}" y="${y}" width="12" height="12" rx="3" fill="${day.level >= 4 ? t.b : t.a}" opacity="${opacity.toFixed(2)}"><title>${day.count} contributions on ${day.date}</title></rect>`;
    }).join('');
    const total = getStats().contributions;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1040" height="190" viewBox="0 0 1040 190"><rect width="1040" height="190" rx="20" fill="${t.bg}"/><text x="32" y="29" fill="${t.text}" font-family="Arial,sans-serif" font-size="14" font-weight="700">CONTRIBUTION ACTIVITY</text><text x="1008" y="29" text-anchor="end" fill="${t.muted}" font-family="Arial,sans-serif" font-size="12">${escapeXml(formatNumber(total))} CONTRIBUTIONS</text>${cells}<text x="32" y="179" fill="${t.muted}" font-family="Arial,sans-serif" font-size="10">LESS</text><rect x="68" y="168" width="10" height="10" rx="2" fill="${t.a}" opacity=".12"/><rect x="84" y="168" width="10" height="10" rx="2" fill="${t.a}" opacity=".4"/><rect x="100" y="168" width="10" height="10" rx="2" fill="${t.a}" opacity=".7"/><rect x="116" y="168" width="10" height="10" rx="2" fill="${t.b}"/><text x="135" y="179" fill="${t.muted}" font-family="Arial,sans-serif" font-size="10">MORE</text></svg>`;
  }
  function automationScript() {
    const selectedTheme = theme();
    return `import fs from 'node:fs/promises';\nimport path from 'node:path';\n\nconst username = process.argv[2] || process.env.GITHUB_REPOSITORY_OWNER;\nif (!username) throw new Error('Pass a GitHub username or set GITHUB_REPOSITORY_OWNER.');\nconst safe = username.toLowerCase().replace(/[^a-z0-9-]/g, '');\nconst accent = '${selectedTheme.a}';\nconst accent2 = '${selectedTheme.b}';\nconst response = await fetch(\`https://github-contributions-api.jogruber.de/v4/\${encodeURIComponent(safe)}?y=last\`);\nif (!response.ok) throw new Error(\`Contribution source returned HTTP \${response.status}\`);\nconst payload = await response.json();\nconst days = Array.isArray(payload.contributions) ? payload.contributions : [];\nconst cells = days.slice(-371).map((item, index) => {\n  const column = Math.floor(index / 7); const row = index % 7;\n  const count = Number(item.count) || 0;\n  const level = count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : count <= 9 ? 3 : 4;\n  const opacity = level === 0 ? 0.09 : 0.3 + level * 0.16;\n  return \`<rect x="\${30 + column * 16}" y="48" width="11" height="11" rx="2" fill="\${accent}" opacity="\${opacity}"><title>\${count} contributions · \${item.date || ''}</title></rect>\`;\n}).join('');\nconst svg = \`<svg xmlns="http://www.w3.org/2000/svg" width="920" height="170" viewBox="0 0 920 170"><rect width="920" height="170" rx="18" fill="#0b1220"/><text x="30" y="28" fill="\${accent2}" font-family="Arial" font-size="13" font-weight="700">CONTRIBUTION ACTIVITY · \${safe}</text>\${cells}</svg>\`;\nconst out = path.join(process.cwd(), 'assets', \`\${safe}-heatmap.svg\`);\nawait fs.mkdir(path.dirname(out), { recursive: true });\nawait fs.writeFile(out, svg, 'utf8');\nconsole.log(\`Updated \${out}; \${days.length} calendar days. README.md was not changed.\`);\n`;
  }
  function workflowFile() {
    return `name: Refresh contribution asset\n\non:\n  workflow_dispatch:\n  schedule:\n    - cron: '17 4 * * 1'\n\npermissions:\n  contents: write\n\njobs:\n  refresh:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 22\n      - name: Refresh contribution SVG\n        run: node scripts/refresh-profile.mjs \"$GITHUB_REPOSITORY_OWNER\"\n      - name: Commit updated asset\n        run: |\n          git config user.name 'github-actions[bot]'\n          git config user.email '41898282+github-actions[bot]@users.noreply.github.com'\n          git add assets/*-heatmap.svg\n          git diff --cached --quiet && exit 0\n          git commit -m 'chore: refresh contribution asset'\n          git push\n`;
  }
  function publishingGuide() {
    return `# Publish your ProfileForge README\n\n1. Create a **public** GitHub repository whose name exactly matches your GitHub username.\n2. Extract this package and upload \`README.md\` and the complete \`assets/\` folder to the repository root.\n3. Open your profile at \`https://github.com/USERNAME\`. The README appears on the profile automatically.\n4. To enable contribution asset refresh, also upload \`scripts/refresh-profile.mjs\` and \`.github/workflows/refresh-profile-assets.yml\`.\n5. Open the repository's **Actions** tab and run **Refresh contribution asset** once manually. The workflow only updates the SVG asset; it never overwrites README.md.\n\n## Important notes\n\n- The generated README is regular Markdown and works without ProfileForge.\n- Local SVG files must be uploaded with the README.\n- The contribution calendar uses a public community data source and can occasionally be unavailable. Other profile data is still valid.\n- The browser scanner uses GitHub's unauthenticated public API. Its hourly rate limit is controlled by GitHub.\n- Never put a personal access token in a public GitHub Pages repository.\n`;
  }
  function createPackageFiles() {
    const userSlug = slug(state.username);
    return [
      { name: 'README.md', data: buildMarkdown() },
      { name: `assets/${userSlug}-hero.svg`, data: makeHeroSvg() },
      { name: `assets/${userSlug}-stats.svg`, data: makeStatsSvg() },
      { name: `assets/${userSlug}-heatmap.svg`, data: makeHeatmapSvg() },
      { name: 'PROFILEFORGE-PUBLISHING.md', data: publishingGuide() },
      { name: 'profileforge-draft.json', data: JSON.stringify(state, null, 2) + '\n' },
      { name: 'scripts/refresh-profile.mjs', data: automationScript() },
      { name: '.github/workflows/refresh-profile-assets.yml', data: workflowFile() }
    ];
  }
  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i += 1) {
      crc ^= bytes[i];
      for (let j = 0; j < 8; j += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
    return (crc ^ 0xffffffff) >>> 0;
  }
  function zipBlob(files) {
    const encoder = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    let offset = 0;
    const dosTime = 0;
    const dosDate = ((2024 - 1980) << 9) | (1 << 5) | 1;
    const writeHeader = (length, build) => { const bytes = new Uint8Array(length); build(new DataView(bytes.buffer)); return bytes; };
    files.forEach(file => {
      const name = encoder.encode(file.name);
      const data = encoder.encode(file.data);
      const crc = crc32(data);
      const local = writeHeader(30, view => {
        view.setUint32(0, 0x04034b50, true); view.setUint16(4, 20, true); view.setUint16(6, 0x0800, true);
        view.setUint16(8, 0, true); view.setUint16(10, dosTime, true); view.setUint16(12, dosDate, true);
        view.setUint32(14, crc, true); view.setUint32(18, data.length, true); view.setUint32(22, data.length, true);
        view.setUint16(26, name.length, true); view.setUint16(28, 0, true);
      });
      localParts.push(local, name, data);
      const central = writeHeader(46, view => {
        view.setUint32(0, 0x02014b50, true); view.setUint16(4, 20, true); view.setUint16(6, 20, true);
        view.setUint16(8, 0x0800, true); view.setUint16(10, 0, true); view.setUint16(12, dosTime, true); view.setUint16(14, dosDate, true);
        view.setUint32(16, crc, true); view.setUint32(20, data.length, true); view.setUint32(24, data.length, true);
        view.setUint16(28, name.length, true); view.setUint16(30, 0, true); view.setUint16(32, 0, true);
        view.setUint16(34, 0, true); view.setUint16(36, 0, true); view.setUint32(38, 0, true); view.setUint32(42, offset, true);
      });
      centralParts.push(central, name);
      offset += local.length + name.length + data.length;
    });
    const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
    const end = writeHeader(22, view => {
      view.setUint32(0, 0x06054b50, true); view.setUint16(4, 0, true); view.setUint16(6, 0, true);
      view.setUint16(8, files.length, true); view.setUint16(10, files.length, true);
      view.setUint32(12, centralSize, true); view.setUint32(16, offset, true); view.setUint16(20, 0, true);
    });
    return new Blob([...localParts, ...centralParts, end], { type: 'application/zip' });
  }
  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename; anchor.style.display = 'none';
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  function downloadText(filename, text, type = 'text/plain;charset=utf-8') {
    downloadBlob(filename, new Blob([text], { type }));
  }
  async function copyText(text) {
    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) await navigator.clipboard.writeText(text);
      else {
        const helper = document.createElement('textarea'); helper.value = text; helper.style.position = 'fixed'; helper.style.opacity = '0';
        document.body.appendChild(helper); helper.select();
        const copied = document.execCommand('copy'); helper.remove();
        if (!copied) throw new Error('Clipboard is not available in this browser.');
      }
      return true;
    } catch (error) { toast(error.message || 'Could not copy to clipboard'); return false; }
  }
  function openExportModal() {
    const files = createPackageFiles();
    $('#exportFileList').innerHTML = files.map(file => `<div class="export-file"><b>✓</b>${escapeHtml(file.name)}</div>`).join('');
    $('#exportModalText').textContent = `Ready to create a ${files.length}-file README package for @${state.username}.`;
    $('#exportModal').classList.remove('hidden');
  }
  function exportZip() {
    const files = createPackageFiles();
    const blob = zipBlob(files);
    downloadBlob(`${slug(state.username)}-profileforge.zip`, blob);
    $('#exportModal').classList.add('hidden');
    toast('README package downloaded');
  }
  function exportDraftJson() {
    downloadText(`${slug(state.username)}-profileforge-draft.json`, JSON.stringify(state, null, 2) + '\n', 'application/json;charset=utf-8');
    toast('Editable draft exported');
  }
  async function importDraft(file) {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || typeof data !== 'object' || !data.content || typeof data.content !== 'object') throw new Error('This file is not a valid ProfileForge draft.');
      state = {
        ...structuredCloneSafe(DEFAULT_STATE), ...data,
        settings: { ...DEFAULT_STATE.settings, ...(data.settings || {}) },
        content: sanitizeContent(data.content || {}),
        sections: Array.isArray(data.sections) ? data.sections.filter(id => SECTIONS.some(s => s.id === id)) : [...DEFAULT_SECTIONS],
        repos: Array.isArray(data.repos) ? data.repos : [], selectedRepos: Array.isArray(data.selectedRepos) ? data.selectedRepos : [],
        languages: data.languages && typeof data.languages === 'object' ? data.languages : {}, contributions: Array.isArray(data.contributions) ? data.contributions.filter(item => item && item.date) : [],
        username: typeof data.username === 'string' && /^[a-zA-Z0-9-]{1,39}$/.test(data.username) ? data.username : DEFAULT_STATE.username,
        goal: GOALS.some(item => item.id === data.goal) ? data.goal : DEFAULT_STATE.goal,
        template: TEMPLATES.some(item => item.id === data.template) ? data.template : DEFAULT_STATE.template,
        theme: THEMES.some(item => item.id === data.theme) ? data.theme : DEFAULT_STATE.theme,
        view: ['preview', 'github', 'markdown'].includes(data.view) ? data.view : 'preview',
        density: ['compact', 'balanced', 'spacious'].includes(data.density) ? data.density : 'balanced'
      };
      writeQuery(); renderAll(); persist();
      toast('Draft imported successfully');
    } catch (error) { toast(error.message || 'Could not import draft'); }
    finally { $('#importJsonInput').value = ''; }
  }
  function resetDraft() {
    if (!confirm('Reset the complete local ProfileForge draft? This removes the saved content and scan cache from this browser.')) return;
    localStorage.removeItem(STORAGE_KEY);
    state = structuredCloneSafe(DEFAULT_STATE);
    writeQuery(); syncInputs(); renderAll(); persist();
    setScanState('', 'Waiting for a username');
    toast('Local draft reset');
  }
  function bindEvents() {
    $('#heroStartBtn').addEventListener('click', () => { $('#studio').scrollIntoView({ behavior: 'smooth' }); setTimeout(() => $('#usernameInput').focus(), 400); });
    $('#scanBtn').addEventListener('click', () => scanGitHub());
    $('#usernameInput').addEventListener('keydown', event => { if (event.key === 'Enter') scanGitHub(); });
    $('#sampleBtn').addEventListener('click', () => scanGitHub('octocat'));
    $('#goalGrid').addEventListener('click', event => {
      const button = event.target.closest('[data-goal]'); if (!button) return;
      state.goal = button.dataset.goal;
      if (!state.content.headline || state.content.headline === inferHeadline()) state.content.headline = inferHeadline();
      writeQuery(); renderAll(); persist(); toast(`${GOALS.find(item => item.id === state.goal)?.name || 'Objective'} selected`);
    });
    $('#templateList').addEventListener('click', event => { const button = event.target.closest('[data-template]'); if (button) applyTemplate(button.dataset.template); });
    $('#catalogGrid').addEventListener('click', event => { const button = event.target.closest('[data-template]'); if (button) { applyTemplate(button.dataset.template); $('#studio').scrollIntoView({ behavior: 'smooth' }); } });
    $('#themeGrid').addEventListener('click', event => { const button = event.target.closest('[data-theme]'); if (button) applyThemeId(button.dataset.theme); });
    $('#themeCatalog').addEventListener('click', event => { const button = event.target.closest('[data-theme]'); if (button) { applyThemeId(button.dataset.theme); $('#studio').scrollIntoView({ behavior: 'smooth' }); } });
    ['nameInput','headlineInput','aboutInput','locationInput','companyInput','websiteInput','emailInput','linksInput','skillsInput','experienceInput','educationInput','achievementsInput','supportInput'].forEach(id => $('#' + id).addEventListener('input', updateContentFromInput));
    $('#projectPicker').addEventListener('change', event => {
      const input = event.target.closest('[data-repo]'); if (!input) return;
      const name = input.dataset.repo;
      if (input.checked && !state.selectedRepos.includes(name)) {
        const limit = Number(CFG.limits?.featuredProjects || 8);
        if (state.selectedRepos.length >= limit) { input.checked = false; toast(`Choose up to ${limit} featured repositories.`); return; }
        state.selectedRepos.push(name);
      }
      if (!input.checked) state.selectedRepos = state.selectedRepos.filter(item => item !== name);
      persist(); renderPreview(); renderMarkdown(); renderHeroDemo();
    });
    $('#projectSearchInput').addEventListener('input', renderProjects);
    $('#projectSortSelect').addEventListener('change', renderProjects);
    $('#selectTopProjectsBtn').addEventListener('click', () => {
      state.selectedRepos = sortRepositories(state.repos.filter(repo => !repo.fork)).slice(0, Number(CFG.limits?.featuredProjects || 8)).map(repo => repo.full_name);
      renderProjects(); renderPreview(); renderMarkdown(); persist(); toast('Top repositories selected');
    });
    $('#densitySelect').addEventListener('change', event => { state.density = event.target.value; renderPreview(); persist(); });
    $$('[data-setting]').forEach(input => input.addEventListener('change', () => {
      state.settings[input.dataset.setting] = input.checked;
      applyTheme(); renderPreview(); renderMarkdown(); persist();
    }));
    $$('.view-tab').forEach(button => button.addEventListener('click', () => { state.view = button.dataset.view; updateView(); persist(); }));
    $$('.inspector-tab').forEach(button => button.addEventListener('click', () => {
      $$('.inspector-tab').forEach(item => item.classList.toggle('active', item === button));
      $$('.inspector-panel').forEach(item => item.classList.toggle('active', item.id === `inspector${button.dataset.inspector[0].toUpperCase()}${button.dataset.inspector.slice(1)}`));
    }));
    $('#timeline').addEventListener('click', event => {
      const button = event.target.closest('[data-move]');
      const item = event.target.closest('[data-section]');
      if (!button || !item) return;
      const index = state.sections.indexOf(item.dataset.section);
      const action = button.dataset.move;
      if (action === 'remove') state.sections = state.sections.filter(id => id !== item.dataset.section);
      if (action === 'up' && index > 0) [state.sections[index - 1], state.sections[index]] = [state.sections[index], state.sections[index - 1]];
      if (action === 'down' && index >= 0 && index < state.sections.length - 1) [state.sections[index + 1], state.sections[index]] = [state.sections[index], state.sections[index + 1]];
      renderTimeline(); renderPreview(); renderMarkdown(); persist();
    });
    $('#addSectionBtn').addEventListener('click', () => {
      const id = $('#addSectionSelect').value;
      if (!id || state.sections.includes(id)) return;
      state.sections.push(id); renderTimeline(); renderPreview(); renderMarkdown(); persist(); toast(`${section(id).name} added`);
    });
    $('#resetSectionsBtn').addEventListener('click', () => { state.sections = [...(template().sections || DEFAULT_SECTIONS)]; renderTimeline(); renderPreview(); renderMarkdown(); persist(); toast('Template structure restored'); });
    $('#browseTemplatesBtn').addEventListener('click', () => $('#templates').scrollIntoView({ behavior: 'smooth' }));
    $('#browseThemesBtn').addEventListener('click', () => $('#themes').scrollIntoView({ behavior: 'smooth' }));
    $('#templateSearchInput').addEventListener('input', renderTemplateCatalog);
    $('#templateCategorySelect').addEventListener('change', renderTemplateCatalog);
    $('#themeSearchInput').addEventListener('input', renderThemeCatalog);
    $('#improveBtn').addEventListener('click', improveCopy);
    $('#copyBtn').addEventListener('click', async () => { if (await copyText(buildMarkdown())) toast('README Markdown copied'); });
    $('#downloadBtn').addEventListener('click', () => { downloadText('README.md', buildMarkdown(), 'text/markdown;charset=utf-8'); toast('README.md downloaded'); });
    $('#exportBtn').addEventListener('click', openExportModal);
    $('#exportTopBtn').addEventListener('click', openExportModal);
    $('#confirmExportBtn').addEventListener('click', exportZip);
    $('#exportReadmeOnlyBtn').addEventListener('click', () => { downloadText('README.md', buildMarkdown(), 'text/markdown;charset=utf-8'); $('#exportModal').classList.add('hidden'); toast('README.md downloaded'); });
    $('#closeExportModal').addEventListener('click', () => $('#exportModal').classList.add('hidden'));
    $('#exportModal').addEventListener('click', event => { if (event.target === event.currentTarget) event.currentTarget.classList.add('hidden'); });
    $('#copyLinkBtn').addEventListener('click', async () => { writeQuery(); if (await copyText(location.href)) toast('Shareable settings link copied'); });
    $('#exportJsonBtn').addEventListener('click', exportDraftJson);
    $('#importJsonInput').addEventListener('change', event => importDraft(event.target.files?.[0]));
    $('#resetDraftBtn').addEventListener('click', resetDraft);
    $('#mobileMenuBtn').addEventListener('click', () => $('#topnav')?.classList.toggle('open'));
    $$('.topnav a').forEach(link => link.addEventListener('click', () => $('.topnav')?.classList.remove('open')));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') $('#exportModal').classList.add('hidden'); });
  }
  function populateTemplateCategories() {
    const categories = [...new Set(TEMPLATES.map(item => item.category))].sort();
    $('#templateCategorySelect').innerHTML = '<option value="all">All categories</option>' + categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('');
  }
  function init() {
    restore();
    applyQuery();
    populateTemplateCategories();
    bindEvents();
    $('#yearNow').textContent = new Date().getFullYear();
    $('#usernameInput').value = state.username;
    if (state.profile) setScanState('success', `Restored ${state.repos.length} cached repositories`);
    else setScanState('', 'Waiting for a username');
    renderAll();
    if (state.profile) {
      $('#workspaceStatus').textContent = 'Restored local profile cache';
    }
    persist();
    // The app remains usable without a network connection; scan only when there is no cached profile.
    if (!state.profile && state.username) scanGitHub(state.username);
  }
  document.addEventListener('DOMContentLoaded', init);
})();
