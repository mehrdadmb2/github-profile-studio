(() => {
  'use strict';
  const CFG = window.PROFILE_STUDIO_CONFIG || {};
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const md = v => String(v ?? '').replace(/([\\`*_{}\[\]()#+.!|>~-])/g,'\\$1');
  const num = n => new Intl.NumberFormat('en-US').format(Number(n||0));
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const clone = x => JSON.parse(JSON.stringify(x));

  const THEMES = [
    ['aurora','Aurora','Northern lights',' #8b5cf6','#22d3ee'],['matrix','Matrix','Terminal green','#22c55e','#84cc16'],['dracula','Dracula','Purple coding classic','#bd93f9','#ff79c6'],['ocean','Ocean','Deep blue glass','#38bdf8','#06b6d4'],['sunset','Sunset','Warm gradient','#fb7185','#f59e0b'],['midnight','Midnight','Indigo night','#818cf8','#6366f1'],['cyber','Cyber','High-energy HUD','#38bdf8','#f43f5e'],['minimal','Minimal','Quiet neutral','#64748b','#94a3b8']
  ];
  const TEMPLATES = [
    ['showcase','Showcase','Whole-profile personal brand','hero,about,impact,projects,stack,stats,connect'],
    ['recruiter','Recruiter-ready','Fast scan for hiring & freelance','hero,impact,projects,stack,connect'],
    ['opensource','Open-source','Maintainer / contributor profile','hero,about,projects,opensource,stack,connect'],
    ['technical','Technical authority','Architecture, proof and systems','hero,impact,projects,stack,terminal,connect'],
    ['student','Student / learning','Learning in public and growth','hero,about,projects,learning,stack,connect'],
    ['terminal','Terminal','Neofetch-inspired developer identity','hero,terminal,impact,projects,stack,connect'],
    ['minimal','Minimal','Focused, lightweight profile','hero,projects,connect'],
    ['cinematic','Cinematic','Visual-first and motion friendly','hero,about,projects,stats,connect']
  ];
  const PROJECT_TEMPLATES = [
    ['launch','Project Launch','README for apps, tools and websites'],['technical','Technical Case Study','Architecture, tradeoffs and implementation'],['iot','IoT / Embedded','Hardware, firmware, wiring and setup'],['research','Research / ML','Dataset, method, metrics and findings'],['minimal','Minimal Project','Short README for compact repos']
  ];
  const SECTION_META = {hero:'Header',about:'About',impact:'Proof / impact',projects:'Featured projects',stack:'Stack',stats:'GitHub stats',terminal:'Terminal',opensource:'Open source',learning:'Learning journey',connect:'Connect',support:'Support'};
  const DEFAULT_SECTIONS = ['hero','about','impact','projects','stack','stats','connect'];
  const state = { profile:null,repos:[],languages:{}, selectedRepos:[], projectTemplate:'launch', profileTemplate:'showcase', theme:'aurora', accent:'#8b5cf6', accent2:'#22d3ee', goal:'showcase', locale:'en', glass:true,motion:true,compact:false,view:'preview',support:false,sections:DEFAULT_SECTIONS.map(id=>({id,enabled:true})), links:[], wallets:clone(CFG.donation?.wallets || []), projectRepo:null };

  function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2200)}
  function save(){try{localStorage.setItem('profileStudioState',JSON.stringify({...state,profile:null,repos:[],languages:{}}));$('#savedText').textContent='saved locally';}catch{}}
  function restore(){try{const s=JSON.parse(localStorage.getItem('profileStudioState'));if(!s)return;['profileTemplate','projectTemplate','theme','accent','accent2','goal','locale','glass','motion','compact','support','links','wallets','sections'].forEach(k=>{if(k in s)state[k]=s[k]});}catch{}}
  function applyTheme(){const t=THEMES.find(x=>x[0]===state.theme)||THEMES[0];state.accent2=t[4];document.documentElement.style.setProperty('--accent',state.accent||t[3]);document.documentElement.style.setProperty('--accent2',state.accent2);document.body.classList.toggle('no-glass',!state.glass);document.body.classList.toggle('no-motion',!state.motion);renderThemeList()}
  function defaultLinks(p){return [{label:'GitHub',value:p.html_url},{label:'Portfolio',value:'https://mehrdadmb2.github.io/mehrdad-dev/'},{label:'Email',value:'mailto:game.developer.mb@gmail.com'}]}
  function setStatus(text,badge='SYNCED'){ $('#scanStatus').textContent=text; $('#syncBadge').textContent=badge; }
  async function fetchJSON(url){const res=await fetch(url,{headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}}); updateRate(res); if(!res.ok){if(res.status===403)throw new Error('GitHub API rate limit reached. Wait a few minutes or retry from another public network.'); if(res.status===404)throw new Error('GitHub username not found. Check the spelling and try again.'); throw new Error(`GitHub API error (${res.status}).`)} return res.json()}
  function updateRate(res){const remaining=res.headers.get('X-RateLimit-Remaining');const limit=res.headers.get('X-RateLimit-Limit');if(remaining&&limit)$('#rateStatus').textContent=`API: ${remaining}/${limit}`}
  async function scan(username){
    username=username.trim().replace(/^@/,''); if(!/^[A-Za-z0-9-]{1,39}$/.test(username)) throw new Error('Enter a valid GitHub username.');
    setStatus('Reading profile…','SCANNING'); $('#scanButton').disabled=true; $('#scanButton').textContent='Scanning…'; $('#scanError').hidden=true;
    try{
      const profile=await fetchJSON(`https://api.github.com/users/${encodeURIComponent(username)}`);
      const repos=[]; let page=1;
      while(page<=3){const batch=await fetchJSON(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&page=${page}&sort=updated`); repos.push(...batch); if(batch.length<100)break; page++; await sleep(40)}
      state.profile=profile;state.repos=repos;state.languages={};
      for(const r of repos){if(r.language)state.languages[r.language]=(state.languages[r.language]||0)+1}
      state.selectedRepos=[]; state.projectRepo=repos[0]||null;
      if(!state.links.length)state.links=defaultLinks(profile);
      if(username.toLowerCase()===(CFG.defaultUsername||'').toLowerCase()) state.support=Boolean(CFG.donation?.enabledForDefaultUser);
      $('#username').value=username; $('#avatar').src=profile.avatar_url; $('#railName').textContent=profile.name||profile.login; $('#railHandle').textContent='@'+profile.login; $('#displayName').value=profile.name||profile.login; $('#headline').value=profile.bio?'Developer · '+(profile.company?profile.company.replace('@',''):'Builder'):'Software developer · Builder · Open source'; $('#bio').value=profile.bio||'I build practical software, tools and experiments and share the work openly on GitHub.'; $('#openProfile').href=profile.html_url; $('#exportName').textContent=`${profile.login} / README.md`;
      $('#empty').hidden=true; $('#rendered').hidden=false; setStatus(`Synced @${profile.login} · ${repos.length} repositories`,'SYNCED'); renderAll(); toast(`Loaded @${profile.login}`); save(); document.querySelector('#studio').scrollIntoView({behavior:'smooth',block:'start'});
    }catch(err){$('#scanError').hidden=false;$('#scanError').textContent=err.message;setStatus('Scan failed','ERROR');toast(err.message)}finally{$('#scanButton').disabled=false;$('#scanButton').innerHTML='Generate <span>→</span>'}
  }
  function renderTemplates(){const box=$('#templateList');box.innerHTML=TEMPLATES.map(t=>`<button class="template-card ${state.profileTemplate===t[0]?'active':''}" data-template="${t[0]}" type="button"><strong>${t[1]}</strong><small>${t[2]}</small></button>`).join(''); $$('.template-card',box).forEach(b=>b.onclick=()=>{state.profileTemplate=b.dataset.template;const t=TEMPLATES.find(x=>x[0]===state.profileTemplate);state.sections=t[3].split(',').map(id=>({id,enabled:true}));$('#goal').value=state.profileTemplate;renderAll();save()}); const pbox=$('#projectTemplateList');pbox.innerHTML=PROJECT_TEMPLATES.map(t=>`<button class="template-card ${state.projectTemplate===t[0]?'active':''}" data-pt="${t[0]}" type="button"><strong>${t[1]}</strong><small>${t[2]}</small></button>`).join('');$$('.template-card',pbox).forEach(b=>b.onclick=()=>{state.projectTemplate=b.dataset.pt;renderProjectPreview();renderTimeline();save()})}
  function renderThemeList(){const box=$('#themeList');box.innerHTML=THEMES.map(t=>`<button class="theme-card ${state.theme===t[0]?'active':''}" data-theme="${t[0]}" type="button"><div class="theme-swatch" style="--sw1:${t[3]};--sw2:${t[4]}"></div><strong>${t[1]}</strong><small>${t[2]}</small></button>`).join('');$$('.theme-card',box).forEach(b=>b.onclick=()=>{state.theme=b.dataset.theme;const t=THEMES.find(x=>x[0]===state.theme);state.accent=t[3];$('#accent').value=t[3];applyTheme();renderPreview();save()})}
  function renderSectionEditor(){const box=$('#sectionEditor');box.innerHTML=state.sections.map((s,i)=>`<div class="section-row"><input type="checkbox" data-toggle="${i}" ${s.enabled?'checked':''}><div><strong>${esc(SECTION_META[s.id]||s.id)}</strong><small>${s.id}</small></div><div class="arrows"><button data-up="${i}" type="button">↑</button><button data-down="${i}" type="button">↓</button></div></div>`).join('');$$('[data-toggle]',box).forEach(x=>x.onchange=()=>{state.sections[+x.dataset.toggle].enabled=x.checked;renderPreview();renderTimeline();save()});$$('[data-up]',box).forEach(x=>x.onclick=()=>moveSection(+x.dataset.up,-1));$$('[data-down]',box).forEach(x=>x.onclick=()=>moveSection(+x.dataset.down,1))}
  function moveSection(i,d){const n=i+d;if(n<0||n>=state.sections.length)return;[state.sections[i],state.sections[n]]=[state.sections[n],state.sections[i]];renderSectionEditor();renderTimeline();renderPreview();save()}
  function renderTimeline(){const box=$('#timelineItems');box.innerHTML=state.sections.map((s,i)=>`<div class="timeline-item ${s.enabled?'':'off'}"><span>${esc(SECTION_META[s.id]||s.id)}</span><button data-tu="${i}" aria-label="Move up">↑</button><button data-td="${i}" aria-label="Move down">↓</button></div>`).join('');$$('[data-tu]',box).forEach(b=>b.onclick=()=>moveSection(+b.dataset.tu,-1));$$('[data-td]',box).forEach(b=>b.onclick=()=>moveSection(+b.dataset.td,1))}
  function renderWallets(){const box=$('#walletEditor');box.innerHTML=state.wallets.map((w,i)=>`<div class="wallet"><div class="wallet-title"><div><b>${esc(w.label)}</b><small> · ${esc(w.network)}</small></div><label><input type="checkbox" data-wallet="${i}" ${w.enabled!==false?'checked':''}></label></div><code>${esc(w.address)}</code></div>`).join('');$$('[data-wallet]',box).forEach(x=>x.onchange=()=>{state.wallets[+x.dataset.wallet].enabled=x.checked;renderPreview();save()})}
  function activeSections(){return state.sections.filter(s=>s.enabled).map(s=>s.id)}
  function selectedRepos(){const all=[...state.repos].sort((a,b)=>((b.stargazers_count||0)-(a.stargazers_count||0))*0.65 + (new Date(b.updated_at)-new Date(a.updated_at))*0.0000000001);return (state.selectedRepos.length?state.repos.filter(r=>state.selectedRepos.includes(r.id)):all).filter(r=>!r.fork).slice(0,state.compact?3:6)}
  function profileHeadline(){const v=$('#headline').value.trim();return v||'Developer · Builder · Open source'}
  function profileBio(){const v=$('#bio').value.trim();return v||'I build practical software, tools and experiments and share the work openly on GitHub.'}
  function langList(){return Object.entries(state.languages).sort((a,b)=>b[1]-a[1]).map(([k])=>k).slice(0,10)}
  function stars(){return state.repos.reduce((s,r)=>s+(r.stargazers_count||0),0)}
  function renderProfileHTML(){const p=state.profile;if(!p)return'';let body='';for(const id of activeSections()){if(id==='hero')body+=`<section class="readme-hero"><img class="readme-avatar" src="${esc(p.avatar_url)}" alt="${esc(p.login)} avatar"><h1>${esc($('#displayName').value||p.name||p.login)}</h1><div class="headline">${esc(profileHeadline())}</div><p class="bio">${esc(profileBio())}</p><div class="readme-links">${state.links.map(l=>`<a href="${esc(l.value)}" target="_blank" rel="noreferrer">${esc(l.label)}</a>`).join('')}</div></section>`;if(id==='about')body+=section('About',`<p>${esc(profileBio())}</p><p>Based on public GitHub profile context, this profile highlights the work, tools and experiments that best represent the author.</p>`);if(id==='impact')body+=section('Proof / impact',`<div class="metric-grid"><div class="metric-card"><b>${num(p.public_repos)}</b><span>public repositories</span></div><div class="metric-card"><b>${num(stars())}</b><span>repository stars</span></div><div class="metric-card"><b>${num(p.followers)}</b><span>followers</span></div></div>`);if(id==='projects')body+=section('Featured work',`<div class="repo-grid">${selectedRepos().map(repoCard).join('')}</div>`);if(id==='stack')body+=section('Stack',`<div class="tag-row">${langList().map(x=>`<span class="tag">${esc(x)}</span>`).join('')}</div>`);if(id==='stats')body+=section('GitHub stats',`<div class="metric-grid"><div class="metric-card"><b>${num(p.followers)}</b><span>followers</span></div><div class="metric-card"><b>${num(p.following)}</b><span>following</span></div><div class="metric-card"><b>${num(p.public_repos)}</b><span>public repos</span></div></div>`);if(id==='terminal')body+=section('Terminal',`<div style="background:#0b0f15;color:#b9fbc0;padding:15px;border-radius:12px;font:12px/1.75 JetBrains Mono">$ whoami<br>${esc(p.login)}<br>$ focus<br>${esc(profileHeadline())}<br>$ ls featured/<br>${selectedRepos().map(r=>esc(r.name)).join(' &nbsp; ')}</div>`);if(id==='opensource')body+=section('Open source',`<p>Public repositories are available for exploration, issues and contributions. Use the project links above as the starting point.</p>`);if(id==='learning')body+=section('Learning journey',`<p>Experiments, prototypes and lessons learned are documented through public repositories and iteration.</p>`);if(id==='connect')body+=section('Connect',`<div class="readme-links" style="background:#f7f8fa;padding:10px;border-radius:12px">${state.links.map(l=>`<a style="color:#344054;border-color:#d0d5dd;background:#fff" href="${esc(l.value)}" target="_blank" rel="noreferrer">${esc(l.label)}</a>`).join('')}</div>`);if(id==='support'&&state.support)body+=supportHTML();}
    return `<div class="readme-shell"><div class="readme-body" style="padding-top:0">${body}</div></div>`;
  }
  function section(title,html){return `<section class="readme-section"><h2>${title}</h2>${html}</section>`}
  function repoCard(r){return `<a class="repo-card" href="${esc(r.html_url)}" target="_blank" rel="noreferrer"><h3>${esc(r.name)}</h3><p>${esc(r.description||'Open-source project on GitHub.')}</p><div class="tag-row"><span class="tag">★ ${num(r.stargazers_count)}</span>${r.language?`<span class="tag">${esc(r.language)}</span>`:''}${r.forks_count?`<span class="tag">⑂ ${num(r.forks_count)}</span>`:''}</div></a>`}
  function supportHTML(){const enabled=state.wallets.filter(w=>w.enabled!==false);return section('Support',`<p>If this work is useful, you can support future open-source projects. Always verify the network before sending.</p>${enabled.map(w=>`<div style="border:1px solid #e5e7eb;border-radius:12px;padding:11px;margin-top:8px"><strong>${esc(w.label)}</strong><div style="font-size:11px;color:#667085;margin-top:3px">${esc(w.network)}</div><code style="display:block;margin-top:7px;overflow-wrap:anywhere;font-size:10px">${esc(w.address)}</code></div>`).join('')}`)}
  function renderProjectRepoSelect(){
    const sel=$('#projectRepoSelect');
    if(!sel)return;
    const repos=state.repos.filter(r=>!r.fork);
    sel.innerHTML=repos.length?repos.slice(0,100).map(r=>`<option value="${r.id}" ${state.projectRepo&&state.projectRepo.id===r.id?'selected':''}>${esc(r.name)}</option>`).join(''):'<option value="">Scan a profile first</option>';
  }
  function projectMarkdown(){
    const r=state.projectRepo||state.repos.find(x=>!x.fork);
    if(!r)return '# Project README\n\nScan a GitHub profile and choose a repository.';
    const tpl=state.projectTemplate;
    const title=r.name;
    const desc=r.description||'A GitHub project documented with Profile Studio.';
    const stack=r.language?`\`${r.language}\``:'`GitHub`';
    if(tpl==='minimal') return `# ${title}\n\n${desc}\n\n## Install\n\nSee the repository files and releases for installation instructions.\n\n## Usage\n\nOpen the project at ${r.html_url} and follow the latest usage instructions.\n\n## Notes\n\n- Language: ${stack}\n- Stars: ${r.stargazers_count||0}\n- Forks: ${r.forks_count||0}`;
    if(tpl==='technical') return `# ${title}\n\n${desc}\n\n## Problem\n\nWhat problem this project solves and who it is for.\n\n## Architecture\n\nDescribe the main components, data flow and key trade-offs.\n\n## Implementation\n\n- Language: ${stack}\n- Repository: ${r.html_url}\n\n## Testing\n\nDocument important checks, test commands and known edge cases.\n\n## Roadmap\n\n- Improve documentation\n- Add focused tests\n- Ship the next useful feature\n\n## License\n\nSee the repository license.`;
    if(tpl==='iot') return `# ${title}\n\n${desc}\n\n## Hardware\n\nList boards, sensors, modules and required parts.\n\n## Wiring\n\nDocument connections, pins and power requirements.\n\n## Firmware\n\nExplain flashing, configuration and runtime behavior.\n\n## Setup\n\n1. Clone ${r.html_url}\n2. Install the required toolchain.\n3. Configure the device.\n4. Flash and test.\n\n## Troubleshooting\n\nAdd the most common wiring, firmware and connectivity fixes.`;
    if(tpl==='research') return `# ${title}\n\n${desc}\n\n## Abstract\n\nSummarize the research question and the practical outcome.\n\n## Dataset\n\nDocument source, preprocessing and split strategy.\n\n## Method\n\nDescribe the model, baseline and experimental setup.\n\n## Results\n\nReport the important metrics and observations.\n\n## Reproducibility\n\nList environment, commands, seeds and dependencies.`;
    return `# ${title}\n\n${desc}\n\n[![GitHub](https://img.shields.io/badge/GitHub-Repository-18181b?logo=github)](${r.html_url})\n\n## Overview\n\nExplain what the project does, why it exists, and who it helps.\n\n## Features\n\n- Clear feature one\n- Clear feature two\n- Clear feature three\n\n## Demo\n\nAdd a live link, screenshot or short video here.\n\n## Installation\n\n\`\`\`bash\ngit clone ${r.html_url}.git\n\`\`\`\n\n## Usage\n\nShow the main workflow with one real example.\n\n## Tech stack\n\n${stack}\n\n## Roadmap\n\n- Improve documentation\n- Add tests\n- Ship the next milestone\n\n## License\n\nSee the repository license.`;
  }
  function generateMarkdown(){
    const p=state.profile;
    if(!p) return '# GitHub Profile\n\nEnter a GitHub username to generate a README.';
    const lines=[];
    const fence='```';
    for(const id of activeSections()){
      if(id==='hero'){
        lines.push(`<div align="center">\n\n<img src="${p.avatar_url}" width="96" height="96" alt="${md(p.login)} avatar">\n\n# ${md($('#displayName').value||p.name||p.login)}\n\n**${md(profileHeadline())}**\n\n${md(profileBio())}\n\n${state.links.map(l=>`[${md(l.label)}](${l.value})`).join(' · ')}\n\n</div>`);
      }
      if(id==='about') lines.push(`## About\n\n${profileBio()}`);
      if(id==='impact') lines.push(`## Proof / impact\n\n| Signal | Value |\n|---|---:|\n| Public repositories | ${p.public_repos} |\n| Repository stars | ${stars()} |\n| Followers | ${p.followers} |`);
      if(id==='projects') lines.push(`## Featured work\n\n${selectedRepos().map(r=>`- **[${md(r.name)}](${r.html_url})** — ${r.description||'Open-source project'}${r.language?` · ${fence}${md(r.language)}${fence}`:''} · ★ ${r.stargazers_count||0}`).join('\n')}`);
      if(id==='stack') lines.push(`## Stack\n\n${langList().map(x=>`${fence}${md(x)}${fence}`).join(' · ')}`);
      if(id==='stats') lines.push(`## GitHub stats\n\n![GitHub Stats](https://github-readme-stats.vercel.app/api?username=${encodeURIComponent(p.login)}&show_icons=true&theme=${statsTheme()}&hide_border=true&rank_icon=github)\n\n![Top Languages](https://github-readme-stats.vercel.app/api/top-langs/?username=${encodeURIComponent(p.login)}&layout=compact&theme=${statsTheme()}&hide_border=true)`);
      if(id==='terminal') lines.push(`## Terminal\n\n${fence}text\n$ whoami\n${p.login}\n$ focus\n${profileHeadline()}\n$ featured\n${selectedRepos().map(r=>r.name).join(' | ')}\n${fence}`);
      if(id==='opensource') lines.push(`## Open source\n\nPublic repositories are available for exploration, issues and contributions.`);
      if(id==='learning') lines.push(`## Learning journey\n\nExperiments and lessons learned are documented through public projects.`);
      if(id==='connect') lines.push(`## Connect\n\n${state.links.map(l=>`- [${md(l.label)}](${l.value})`).join('\n')}`);
      if(id==='support' && state.support){
        const ws=state.wallets.filter(w=>w.enabled!==false);
        lines.push(`## Support\n\nIf this work is useful, you can support future projects. **Always verify the network before sending.**\n\n${ws.map(w=>`- **${md(w.label)} — ${md(w.network)}** · ${fence}${w.address}${fence}`).join('\n')}`);
      }
    }
    lines.push(`---\n\n> Generated with Profile Studio. Edit anything before publishing.`);
    return lines.filter(Boolean).join('\n\n');
  }
  function statsTheme(){return ({aurora:'tokyonight',matrix:'dark',dracula:'dracula',ocean:'algolia',sunset:'radical',midnight:'dark',cyber:'highcontrast',minimal:'transparent'}[state.theme]||'dark')}
  function renderProjectPreview(){/* Project generator is rendered inside the inspector when a repo exists. */}
  function renderPreview(){if(!state.profile)return;applyTheme();$('#rendered').innerHTML=renderProfileHTML();$('#markdown').textContent=$('#outputType')?.value==='project'?projectMarkdown():generateMarkdown();$('#rendered').hidden=state.view==='markdown';$('#markdown').hidden=state.view!=='markdown';$('#rendered').style.opacity=state.motion?'1':'.98';$('#rendered').classList.toggle('compact',state.compact)}
  function renderAll(){renderTemplates();renderThemeList();renderSectionEditor();renderTimeline();renderWallets();renderProjectRepoSelect();renderPreview()}
  function switchPanel(name){$$('.rail-tab').forEach(b=>b.classList.toggle('active',b.dataset.panel===name));$$('.inspector-panel').forEach(p=>p.classList.toggle('active',p.id===`panel-${name}`))}
  async function copy(text){if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);return true}const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();let ok=false;try{ok=document.execCommand('copy')}catch{}ta.remove();return ok}
  function bind(){
    restore(); $('#username').value=CFG.defaultUsername||''; $('#goal').value=state.goal; $('#locale').value=state.locale; $('#glass').checked=state.glass; $('#motion').checked=state.motion; $('#compact').checked=state.compact; $('#supportEnabled').checked=state.support; applyTheme(); renderAll();
    $('#scanForm').addEventListener('submit',e=>{e.preventDefault();scan($('#username').value)}); $('#demoBtn').onclick=()=>{ $('#username').value=CFG.defaultUsername||'octocat'; scan($('#username').value)}; $('#emptyDemo').onclick=()=>scan(CFG.defaultUsername||'octocat');
    $$('.rail-tab').forEach(b=>b.onclick=()=>switchPanel(b.dataset.panel)); $$('.mode').forEach(b=>b.onclick=()=>{state.view=b.dataset.mode;$$('.mode').forEach(x=>x.classList.toggle('active',x===b));$('#canvasHeading').textContent=b.dataset.mode==='preview'?'README Preview':b.dataset.mode==='github'?'GitHub-style View':'Generated Markdown';renderPreview()});
    $('#goal').onchange=e=>{state.goal=e.target.value;state.profileTemplate=e.target.value;const t=TEMPLATES.find(x=>x[0]===state.profileTemplate)||TEMPLATES[0];state.sections=t[3].split(',').map(id=>({id,enabled:true}));renderAll();save()};
    ['displayName','headline','bio'].forEach(id=>$('#'+id).addEventListener('input',()=>{renderPreview();save()})); $('#locale').onchange=e=>{state.locale=e.target.value;renderPreview();save()}; $('#accent').oninput=e=>{state.accent=e.target.value;applyTheme();renderPreview();save()}; $('#glass').onchange=e=>{state.glass=e.target.checked;document.body.classList.toggle('no-glass',!state.glass);save()}; $('#motion').onchange=e=>{state.motion=e.target.checked;document.body.classList.toggle('no-motion',!state.motion);save()}; $('#compact').onchange=e=>{state.compact=e.target.checked;renderPreview();save()}; $('#supportEnabled').onchange=e=>{state.support=e.target.checked;renderPreview();save()}; $('#outputType').onchange=e=>{renderPreview();save()}; $('#projectRepoSelect').onchange=e=>{state.projectRepo=state.repos.find(r=>String(r.id)===e.target.value)||null;renderPreview();save()};
    $('#copyMd').onclick=async()=>{const text=$('#outputType')?.value==='project'?projectMarkdown():generateMarkdown(); const ok=await copy(text);toast(ok?'README copied to clipboard':'Copy failed — use Markdown view manually')}; $('#downloadMd').onclick=()=>{const text=$('#outputType')?.value==='project'?projectMarkdown():generateMarkdown(); const blob=new Blob([text],{type:'text/markdown;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=($('#outputType')?.value==='project'?(state.projectRepo?.name||'project'):(state.profile?.login||'profile'))+'-README.md';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);toast('README.md downloaded')};
    $('#openRepo').onclick=()=>{if(!state.profile){toast('Scan a profile first');return}window.open(`https://github.com/${encodeURIComponent(state.profile.login)}/${encodeURIComponent(state.profile.login)}`,'_blank','noopener')}; $('#copyProfile').onclick=async()=>{if(!state.profile){toast('Scan a profile first');return}const ok=await copy(state.profile.html_url);toast(ok?'Profile URL copied':'Copy failed')}; $('#fullBtn').onclick=()=>$('#canvas').requestFullscreen?.(); $('#themeBtn').onclick=()=>document.body.classList.toggle('light-ui');
  }
  bind();
  if(new URLSearchParams(location.search).get('demo')==='1') scan(CFG.defaultUsername||'octocat');
})();
