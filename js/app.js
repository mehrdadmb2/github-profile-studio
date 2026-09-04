import { SITE_CONFIG } from '../data/config.js';
import { THEMES } from '../data/themes.js';
import { PROFILE_TEMPLATES } from '../data/templates.js';

const $ = (q, root=document) => root.querySelector(q);
const $$ = (q, root=document) => [...root.querySelectorAll(q)];

const state = {
  profile:null, repos:[], selectedTheme: SITE_CONFIG.defaultTheme, goal:'showcase', voice:'confident', view:'preview',
  glass:true, motion:true, accent:null,
  sections:['hero','about','projects','stack','stats','connect','support'],
  sectionEnabled:{}, links:[...SITE_CONFIG.links], donations: SITE_CONFIG.donations.map(x=>({...x,enabled:true}))
};

const sectionNames = {hero:'Hero',about:'About',impact:'Impact',projects:'Featured projects',stack:'Stack',stats:'GitHub stats',connect:'Connect',support:'Support / Donate',terminal:'Terminal',opensource:'Open source',learning:'Learning journey'};

function esc(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function mdEsc(s=''){return String(s).replace(/([\\`*_{}\[\]()#+\-.!>])/g,'\\$1');}
function formatNum(n){return new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(n||0)}
function calcStars(repos){return repos.reduce((sum,r)=>sum+(r.stargazers_count||0),0)}
function repoLangs(repos){const map={}; for(const r of repos){if(r.language)map[r.language]=(map[r.language]||0)+1;} return Object.entries(map).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);}
function topRepos(repos){return [...repos].sort((a,b)=>((b.stargazers_count*10+b.forks_count*3)+new Date(b.pushed_at)-new Date(a.pushed_at))-((a.stargazers_count*10+a.forks_count*3)+new Date(a.pushed_at)-new Date(b.pushed_at))).filter(r=>!r.fork && !r.archived).slice(0,6)}

function setTheme(id){
  const t=THEMES.find(x=>x.id===id)||THEMES[0]; state.selectedTheme=t.id; state.accent=t.accent;
  document.documentElement.style.setProperty('--accent',t.accent); document.documentElement.style.setProperty('--accent2',t.accent2); document.documentElement.style.setProperty('--bg',t.bg); document.documentElement.style.setProperty('--panel',hexToRgba(t.bg,0.72));
  $('#accentInput').value=t.accent; $$('.theme-swatch').forEach(b=>b.classList.toggle('active',b.dataset.theme===t.id)); renderPreview(); persist();
}
function hexToRgba(hex,a){const n=parseInt(hex.slice(1),16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`;}
function persist(){localStorage.setItem('profile-studio-settings',JSON.stringify({theme:state.selectedTheme,goal:state.goal,voice:state.voice,glass:state.glass,motion:state.motion,sections:state.sections,sectionEnabled:state.sectionEnabled,links:state.links,donations:state.donations}));$('#saveState').textContent='Saved locally';setTimeout(()=>$('#saveState').textContent='Local settings',1000)}
function restore(){try{const x=JSON.parse(localStorage.getItem('profile-studio-settings'));if(!x)return;Object.assign(state,x)}catch{}}
function renderTemplates(){
  $('#templateGrid').innerHTML=PROFILE_TEMPLATES.map(t=>`<button type="button" class="template-card ${state.goal===t.id?'active':''}" data-template="${t.id}"><b>${esc(t.name)}</b><small>${esc(t.desc)}</small></button>`).join('');
  $$('[data-template]').forEach(b=>b.addEventListener('click',()=>{state.goal=b.dataset.template;$('#goalSelect').value=state.goal;state.sections=getTemplateSections(state.goal);renderSections();renderTemplates();renderPreview();persist()}));
}

function renderThemes(){
  $('#themeGrid').innerHTML=THEMES.map(t=>`<button type="button" class="theme-swatch ${state.selectedTheme===t.id?'active':''}" data-theme="${t.id}"><span class="swatch-dot" style="background:linear-gradient(135deg,${t.accent},${t.accent2})"></span><span>${esc(t.name)}</span></button>`).join('');
}
function renderSections(){
  $('#sectionList').innerHTML=state.sections.map((id,i)=>`<label class="section-row"><span class="drag-handle">⋮⋮</span><b>${esc(sectionNames[id]||id)}</b><input type="checkbox" data-section="${id}" ${state.sectionEnabled[id]!==false?'checked':''}></label>`).join('');
  $$('.section-row input').forEach(x=>x.addEventListener('change',()=>{state.sectionEnabled[x.dataset.section]=x.checked;renderPreview();persist()}));
}
function renderDonations(){
  $('#donationToggleList').innerHTML=state.donations.map(d=>`<label class="donation-toggle"><span>${esc(d.label)}</span><input type="checkbox" data-donation="${d.id}" ${d.enabled?'checked':''}></label>`).join('');
  $$('.donation-toggle input').forEach(x=>x.addEventListener('change',()=>{const d=state.donations.find(a=>a.id===x.dataset.donation);d.enabled=x.checked;renderPreview();persist()}));
}
function renderLinks(){
  $('#linksEditor').innerHTML=state.links.map((l,i)=>`<div class="link-editor-row"><input data-link-label="${i}" value="${esc(l.label)}" placeholder="Label"><input data-link-value="${i}" value="${esc(l.value)}" placeholder="URL"><button class="remove-btn" data-remove-link="${i}" type="button">×</button></div>`).join('');
  $$('[data-link-label]').forEach(x=>x.addEventListener('input',()=>{state.links[Number(x.dataset.linkLabel)].label=x.value;renderPreview();persist()}));
  $$('[data-link-value]').forEach(x=>x.addEventListener('input',()=>{state.links[Number(x.dataset.linkValue)].value=x.value;renderPreview();persist()}));
  $$('[data-remove-link]').forEach(x=>x.addEventListener('click',()=>{state.links.splice(Number(x.dataset.removeLink),1);renderLinks();renderPreview();persist()}));
}
function renderProjectEditor(){
  const repos=topRepos(state.repos); $('#projectCount').textContent=repos.length;
  $('#projectEditor').innerHTML=repos.map(r=>`<div class="project-edit-card"><strong>${esc(r.name)}</strong><small>${esc(r.language||'General')} · ★ ${r.stargazers_count||0}</small></div>`).join('') || '<div class="micro-copy">Scan a profile to populate project proof.</div>';
}
function updateProfileUI(){
  const p=state.profile;if(!p)return;
  $('#avatar').src=p.avatar_url; $('#profileName').textContent=p.name||p.login; $('#profileHandle').textContent='@'+p.login; $('#displayName').value=p.name||p.login; $('#headline').value=deriveHeadline(p); $('#bio').value=p.bio||deriveBio(p);
  const stars=calcStars(state.repos); const vals=[p.public_repos,p.followers,p.following,stars]; $$('#profileStats .metric b').forEach((x,i)=>x.textContent=formatNum(vals[i]));
  renderProjectEditor();
}
function deriveHeadline(p){ if(p.company)return `${p.company.replace('@','')} · Builder · Open source`; return 'Software engineer · Builder · Open source'; }
function deriveBio(p){return p.bio||`Building software, automation, and useful systems with ${repoLangs(state.repos).slice(0,4).join(', ')||'modern tools'}.`}
function scanProfile(username){
  username=username.trim().replace(/^@/,''); if(!/^[a-zA-Z0-9-]{1,39}$/.test(username)){throw new Error('Enter a valid GitHub username.')}
  return Promise.all([
    fetch(`https://api.github.com/users/${encodeURIComponent(username)}`).then(r=>{if(!r.ok)throw new Error(r.status===404?'GitHub user not found.':'GitHub API request failed.');return r.json()}),
    fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`).then(r=>{if(!r.ok)throw new Error('Unable to load repositories.');return r.json()})
  ]).then(([profile,repos])=>{state.profile=profile;state.repos=repos;state.sections=getTemplateSections(state.goal);state.sectionEnabled={}; updateProfileUI();renderSections();renderProjectEditor();renderPreview();$('#canvasTitle').textContent=`${profile.login} · README Preview`;$('#openGithubButton').onclick=()=>window.open(`https://github.com/${profile.login}/${profile.login}`,'_blank');$('#apiStatus').textContent=`Loaded ${repos.length} public repositories`;$('#syncBadge').textContent='SYNCED';$('#scanError').hidden=true;document.getElementById('workspace').scrollIntoView({behavior:'smooth',block:'start'});persist();})
}
function getTemplateSections(goal){return (PROFILE_TEMPLATES.find(t=>t.id===goal)||PROFILE_TEMPLATES[0]).sections.slice()}
function sectionEnabled(id){return state.sectionEnabled[id]!==false}
function getHeadline(){return $('#headline').value.trim()||deriveHeadline(state.profile)}
function getBio(){return $('#bio').value.trim()||deriveBio(state.profile)}
function getSelectedRepos(){
  return topRepos(state.repos).slice(0,6);
}
function renderPreview(){if(!state.profile){return} const p=state.profile,repos=getSelectedRepos(),langs=repoLangs(state.repos).slice(0,9), enabled=state.sections.filter(sectionEnabled);
  const sections=[];
  for(const id of enabled){
    if(id==='hero')sections.push(`<section class="readme-section"><div class="readme-eyebrow">${esc(p.login)} / PERSONAL README</div><img class="readme-avatar" src="${esc(p.avatar_url)}" alt=""><h1>${esc($('#displayName').value||p.name||p.login)}</h1><p><strong>${esc(getHeadline())}</strong></p><p>${esc(getBio())}</p></section>`);
    if(id==='about')sections.push(`<section class="readme-section"><h2>About</h2><p>${esc(getBio())}</p><div class="link-row">${state.links.map(l=>`<a class="link-pill" href="${esc(l.value)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join('')}</div></section>`);
    if(id==='impact')sections.push(`<section class="readme-section"><h2>Impact</h2><div class="readme-grid"><div class="readme-stat"><b>${formatNum(p.public_repos)}</b><span>public repositories</span></div><div class="readme-stat"><b>${formatNum(calcStars(state.repos))}</b><span>repository stars</span></div><div class="readme-stat"><b>${formatNum(p.followers)}</b><span>followers</span></div></div></section>`);
    if(id==='projects')sections.push(`<section class="readme-section"><h2>Featured work</h2><div class="project-cards">${repos.map(r=>`<a class="project-card" href="${esc(r.html_url)}" target="_blank" rel="noopener"><div class="pc-title"><h3>${esc(r.name)}</h3><span>↗</span></div><p>${esc(r.description||'Open-source project by '+p.login+'.')}</p><div class="tag-row">${[r.language,r.license?.spdx_id].filter(Boolean).slice(0,2).map(x=>`<span class="tag">${esc(x)}</span>`).join('')}<span class="tag">★ ${r.stargazers_count||0}</span></div></a>`).join('')}</div></section>`);
    if(id==='stack')sections.push(`<section class="readme-section"><h2>Stack</h2><div class="tag-row">${langs.map(x=>`<span class="tag">${esc(x)}</span>`).join('')}</div></section>`);
    if(id==='stats')sections.push(`<section class="readme-section"><h2>GitHub signal</h2><div class="readme-grid"><div class="readme-stat"><b>${formatNum(p.followers)}</b><span>followers</span></div><div class="readme-stat"><b>${formatNum(p.following)}</b><span>following</span></div><div class="readme-stat"><b>${formatNum(calcStars(state.repos))}</b><span>stars across repos</span></div></div></section>`);
    if(id==='terminal')sections.push(`<section class="readme-section"><h2>Terminal</h2><pre style="padding:14px;border:1px solid var(--line);border-radius:14px;background:#05070b;color:#a5f3fc;overflow:auto">$ whoami\n${esc(p.login)}\n$ cat focus.txt\n${esc(getHeadline())}\n$ ls featured/\n${repos.map(r=>esc(r.name)).join('  ')}</pre></section>`);
    if(id==='opensource')sections.push(`<section class="readme-section"><h2>Open source</h2><p>Explore the repositories above, open issues, and contribute where it helps. Public project metadata is pulled live from GitHub.</p></section>`);
    if(id==='learning')sections.push(`<section class="readme-section"><h2>Learning journey</h2><p>Documenting experiments, new tools, and lessons learned through public projects.</p></section>`);
    if(id==='connect')sections.push(`<section class="readme-section"><h2>Connect</h2><div class="link-row">${state.links.map(l=>`<a class="link-pill" href="${esc(l.value)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join('')}</div></section>`);
    if(id==='support'&&state.donations.some(d=>d.enabled))sections.push(`<section class="readme-section"><h2>Support</h2><div class="donate-box"><p>If this work helped you, you can support future open-source projects.</p><div class="wallet-list">${state.donations.filter(d=>d.enabled).map(d=>`<div class="wallet"><b>${esc(d.label)}</b><code>${esc(d.address)}</code></div>`).join('')}</div></div></section>`);
  }
  $('#readmePreview').innerHTML=`<div class="readme-shell"><div class="readme-top">${sections.shift()||''}</div><div class="readme-body">${sections.join('')}</div></div>`;
  $('#readmePreview').hidden=state.view==='markdown'; $('#markdownPreview').hidden=state.view!=='markdown'; $('#markdownPreview').textContent=generateMarkdown();
  $('#canvas').classList.toggle('no-motion',!state.motion); document.body.classList.toggle('no-glass',!state.glass);
}
function generateMarkdown(){
  if(!state.profile)return '# Your Name\n\nScan a GitHub username to generate your profile README.';
  const p=state.profile,repos=getSelectedRepos(),langs=repoLangs(state.repos).slice(0,10); let out=[];
  for(const id of state.sections.filter(sectionEnabled)){
    if(id==='hero'){out.push(`<div align="center">\n\n# ${mdEsc($('#displayName').value||p.name||p.login)}\n\n**${mdEsc(getHeadline())}**\n\n${mdEsc(getBio())}\n\n[GitHub](https://github.com/${p.login})\n\n</div>`)}
    if(id==='about')out.push(`## About\n\n${getBio()}\n\n${state.links.map(l=>`[${l.label}](${l.value})`).join(' · ')}`);
    if(id==='impact')out.push(`## Impact\n\n| Signal | Value |\n|---|---:|\n| Public repositories | ${p.public_repos} |\n| Repository stars | ${calcStars(state.repos)} |\n| Followers | ${p.followers} |`);
    if(id==='projects')out.push(`## Featured work\n\n${repos.map(r=>`- **[${r.name}](${r.html_url})** — ${r.description||'Open-source project'}${r.language?` · \\`${r.language}\\``:''} · ★ ${r.stargazers_count||0}`).join('\n')}`);
    if(id==='stack')out.push(`## Stack\n\n${langs.map(x=>`\`${mdEsc(x)}\``).join(' · ')}`);
    if(id==='stats')out.push(`## GitHub stats\n\n![GitHub Stats](https://github-readme-stats.vercel.app/api?username=${encodeURIComponent(p.login)}&show_icons=true&theme=${themeForStats(state.selectedTheme)}&hide_border=true)\n\n![Top Languages](https://github-readme-stats.vercel.app/api/top-langs/?username=${encodeURIComponent(p.login)}&layout=compact&theme=${themeForStats(state.selectedTheme)}&hide_border=true)`);
    if(id==='terminal')out.push(`## Terminal\n\n\\`\\`\\`text\n$ whoami\n${p.login}\n$ focus\n${getHeadline()}\n$ featured\n${repos.map(r=>r.name).join(' | ')}\n\\`\\`\\``);
    if(id==='opensource')out.push(`## Open source\n\nOpen issues, contribute to projects, or use the repositories as building blocks for your own work.`);
    if(id==='learning')out.push(`## Learning journey\n\nExperiments, prototypes, and lessons learned live in the public repository history.`);
    if(id==='connect')out.push(`## Connect\n\n${state.links.map(l=>`- [${l.label}](${l.value})`).join('\n')}`);
    if(id==='support'&&state.donations.some(d=>d.enabled))out.push(`## Support\n\nIf these projects are useful, you can support future open-source work. **Always verify the network before sending.**\n\n${state.donations.filter(d=>d.enabled).map(d=>`- **${d.label} (${d.network})** — \\`${d.address}\\``).join('\n')}`);
  }
  out.push(`---\n\n> Generated with Profile Studio · Edit anything you want before publishing.`);
  return out.filter(Boolean).join('\n\n');
}
function themeForStats(t){return ({aurora:'tokyonight',matrix:'dark',dracula:'dracula',ocean:'algolia',sunset:'radical',midnight:'dark',cyber:'highcontrast',minimal:'transparent'}[t]||'dark')}
function changeView(v){state.view=v;$$('.view-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===v));renderPreview()}
function wire(){
  restore(); renderThemes();renderTemplates();renderSections();renderDonations();renderLinks();
  if(state.selectedTheme)setTheme(state.selectedTheme); $('#goalSelect').value=state.goal;$('#voiceSelect').value=state.voice;$('#glassToggle').checked=state.glass;$('#motionToggle').checked=state.motion;
  $('#scanForm').addEventListener('submit',async e=>{e.preventDefault();$('#scanButton').disabled=true;$('#scanButton').textContent='Scanning…';$('#apiStatus').textContent='Reading public GitHub data…';try{await scanProfile($('#username').value)}catch(err){$('#scanError').hidden=false;$('#scanError').textContent=err.message;$('#apiStatus').textContent='Scan failed';$('#syncBadge').textContent='ERROR'}finally{$('#scanButton').disabled=false;$('#scanButton').innerHTML='Scan profile <span>→</span>'}});
  $('#demoButton').addEventListener('click',()=>{$('#username').value=SITE_CONFIG.defaultUsername;$('#scanForm').requestSubmit()});
  $$('.side-tab').forEach(b=>b.addEventListener('click',()=>{$$('.side-tab').forEach(x=>x.classList.remove('active'));$$('.tab-pane').forEach(x=>x.classList.remove('active'));b.classList.add('active');$(`[data-pane="${b.dataset.tab}"]`).classList.add('active')}));
  $$('.view-btn').forEach(b=>b.addEventListener('click',()=>changeView(b.dataset.view)));
  $$('#themeButton,#langButton').forEach(()=>{}); $('#themeButton').addEventListener('click',()=>{document.body.classList.toggle('light-ui')});
  $('#langButton').addEventListener('click',()=>{alert('The interface is English-first. Persian README text can be added directly in the editable profile fields and template data.')});
  $('#goalSelect').addEventListener('change',e=>{state.goal=e.target.value;state.sections=getTemplateSections(state.goal);renderSections();renderTemplates();renderPreview();persist()});
  $('#voiceSelect').addEventListener('change',e=>{state.voice=e.target.value;renderPreview();persist()});
  $('#glassToggle').addEventListener('change',e=>{state.glass=e.target.checked;renderPreview();persist()}); $('#motionToggle').addEventListener('change',e=>{state.motion=e.target.checked;renderPreview();persist()});
  ['displayName','headline','bio'].forEach(id=>$( '#'+id).addEventListener('input',()=>renderPreview()));
  $('#accentInput').addEventListener('input',e=>{state.accent=e.target.value;document.documentElement.style.setProperty('--accent',e.target.value);renderPreview();persist()});
  $('#addLinkButton').addEventListener('click',()=>{state.links.push({label:'New link',value:'https://'});renderLinks();renderPreview();persist()});
  $('#resetSections').addEventListener('click',()=>{state.sections=getTemplateSections(state.goal);state.sectionEnabled={};renderSections();renderPreview();persist()});
  $('#copyMdButton').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(generateMarkdown());$('#syncBadge').textContent='COPIED'}catch{alert('Clipboard permission was not available. Use Markdown view and copy manually.')}});
  $('#downloadMdButton').addEventListener('click',()=>{const blob=new Blob([generateMarkdown()],{type:'text/markdown'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='README.md';a.click();URL.revokeObjectURL(a.href)});
  $('#fullscreenButton').addEventListener('click',()=>{$('#canvas').requestFullscreen?.()});
  $('#username').value=SITE_CONFIG.defaultUsername;
}
wire();
