const App = (() => {
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const esc = (v='') => String(v).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const mdEsc = (v='') => String(v).replace(/\[/g,'\\[').replace(/\]/g,'\\]').replace(/_/g,'\\_');
  const formatNum = n => Intl.NumberFormat('en',{notation:n>9999?'compact':'standard',maximumFractionDigits:1}).format(n||0);
  const slug = s => String(s||'profileforge').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

  const themes = [
    ['Satan','#ff4500','#7c2d12'],['Neon','#38bdf8','#06b6d4'],['Zen','#66bb6a','#2f7f46'],['GitHub Dark','#58a6ff','#1f6feb'],['Dracula','#bd93f9','#ff79c6'],
    ['Winter','#60a5fa','#1e40af'],['Spring','#ec4899','#f9a8d4'],['Summer','#fbbf24','#f59e0b'],['Autumn','#d97706','#7c2d12'],['Christmas','#ef4444','#16a34a'],
    ['Halloween','#f97316','#7c3aed'],['Ocean','#38bdf8','#0e7490'],['Forest','#4ade80','#166534'],['Sunset','#e879f9','#fb7185'],['Midnight','#818cf8','#312e81'],
    ['Aurora','#2dd4bf','#8b5cf6'],['Retro','#ec4899','#22d3ee'],['Minimal','#64748b','#334155'],['Pastel','#a78bfa','#f9a8d4'],['Matrix','#22c55e','#14532d']
  ].map(([name,a,b])=>({name,a,b,id:slug(name)}));
  const goals = [
    ['Get Hired','Proof + clarity'],['Open Source','Maintainer trust'],['Freelance','Services + outcomes'],['Founder','Product story'],['Student','Learning trajectory'],['Personal Brand','Distinct identity']
  ].map(([name,sub])=>({name,sub,id:slug(name)}));
  const visuals = [
    ['Hero card','signature hero'],['Portrait','avatar portrait'],['Wordmark','typographic identity'],['System scan','technical signal'],['Stats grid','impact metrics'],['Language mix','technology breakdown'],['Projects','featured work'],['Heatmap','contribution signal'],['Social row','contact links'],['Contribution game','playground'],
  ].map(([name,sub])=>({name,sub,id:slug(name)}));
  const sectionsDefault = ['Header','About Me','Skills','GitHub Stats','Projects','Connect','Streak','Highlights','Heatmap'];
  const templates = [
    {id:'renaissance',name:'Renaissance',type:'Signature profile',accent:'#eab308',desc:'Editorial profile with a crafted hero, wordmark and story-led sections.',parts:['Hero','Wordmark','Projects','Stats','Heatmap']},
    {id:'aurora',name:'Aurora',type:'Visual portfolio',accent:'#2dd4bf',desc:'Luminous profile with portrait, stack, projects and signal widgets.',parts:['Hero','Portrait','Wordmark','Stack','Projects']},
    {id:'matrix',name:'Matrix',type:'System profile',accent:'#22c55e',desc:'Technical HUD with scan readouts, stack bars and activity.',parts:['Hero','System Scan','Projects','Stack','Heatmap']},
    {id:'studio',name:'Studio',type:'Product profile',accent:'#38bdf8',desc:'Balanced product-engineering layout with highlights and metrics.',parts:['Hero','Portrait','Highlights','Projects','Stats']},
    {id:'dracula',name:'Dracula',type:'Classic dark',accent:'#bd93f9',desc:'Dark coding aesthetic with wordmark, portrait and social details.',parts:['Hero','Wordmark','Portrait','Stats','Social']},
    {id:'cyber',name:'Cyber',type:'Framework creator',accent:'#22d3ee',desc:'High-contrast cyber layout focused on system scan and technology.',parts:['Hero','System Scan','Projects','Stack','Heatmap']},
    {id:'jet-runner',name:'Jet Runner',type:'Arcade profile',accent:'#f97316',desc:'Energetic arcade treatment built around projects and contributions.',parts:['Hero','Projects','Playground','Stats','Social']},
    {id:'erased',name:'Erased',type:'Creative profile',accent:'#f8fafc',desc:'Monochrome editorial profile with portrait and contribution signal.',parts:['Hero','Portrait','Heatmap','Highlights','Social']},
    {id:'snake-trail',name:'Snake Trail',type:'Game profile',accent:'#84cc16',desc:'Contribution-first game aesthetic with streak and projects.',parts:['Hero','Projects','Heatmap','Stats','Social']},
    {id:'space-shooter',name:'Space Shooter',type:'Contribution game',accent:'#60a5fa',desc:'Your contribution history becomes a playful visual playground.',parts:['Hero','Projects','Playground','Stats','Social']},
    {id:'chess-replay',name:'Chess Replay',type:'Strategy profile',accent:'#f59e0b',desc:'A strategy-inspired identity with replay panel, projects and stats.',parts:['Hero','Playground','Projects','Stats','Heatmap','Social']},
    {id:'frosted',name:'Frosted',type:'Glass portfolio',accent:'#67e8f9',desc:'Soft cinematic glass system inspired by modern profile showcases.',parts:['Hero','Portrait','Projects','Stats','Language Mix']}
  ];

  const state = {
    username:'octocat', profile:null, repos:[], languages:{}, selectedRepos:[], contributions:[], template:'studio', theme:'github-dark', goal:'get-hired', density:'balanced', view:'preview', activeSection:'Header', sections:[...sectionsDefault], headline:'Developer building useful things in public.', about:'A GitHub profile generated from public work, repositories, language signal and activity. Edit this story to make the profile sound like you.', links:['GitHub'], effects:{glass:true,glow:true,noise:true}, visuals:new Set(['hero-card','portrait','stats-grid','language-mix','projects','heatmap','social-row'])
  };

  function persist(){localStorage.setItem('pf-state', JSON.stringify({...state, visuals:[...state.visuals]}));}
  function restore(){try{const raw=localStorage.getItem('pf-state');if(!raw)return;const s=JSON.parse(raw);Object.assign(state,s,{visuals:new Set(s.visuals||[])});}catch{}}
  function setQuery(){const u=new URL(location.href);u.searchParams.set('username',state.username);u.searchParams.set('template',state.template);u.searchParams.set('theme',state.theme);u.searchParams.set('goal',state.goal);history.replaceState({},'',u)}
  function loadQuery(){const u=new URL(location.href); if(u.searchParams.get('username'))state.username=u.searchParams.get('username'); if(u.searchParams.get('template'))state.template=u.searchParams.get('template'); if(u.searchParams.get('theme'))state.theme=u.searchParams.get('theme'); if(u.searchParams.get('goal'))state.goal=u.searchParams.get('goal')}
  function applyTheme(){const t=themes.find(x=>x.id===state.theme)||themes[3];document.documentElement.style.setProperty('--accent',t.a);document.documentElement.style.setProperty('--accent-rgb',hexToRgb(t.a));document.documentElement.style.setProperty('--accent2',t.b);}
  function hexToRgb(hex){const n=hex.replace('#','');return `${parseInt(n.slice(0,2),16)},${parseInt(n.slice(2,4),16)},${parseInt(n.slice(4,6),16)}`}
  function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2200)}

  async function fetchGitHub(){
    const u=state.username.trim().replace(/^@/,'');
    if(!/^[a-zA-Z0-9-]{1,39}$/.test(u)){toast('Enter a valid GitHub username');return false}
    $('#scanStatus').textContent='Scanning public profile…';
    try{
      const profileRes=await fetch(`https://api.github.com/users/${encodeURIComponent(u)}`,{headers:{Accept:'application/vnd.github+json'}});
      if(!profileRes.ok) throw new Error(profileRes.status===404?'GitHub user not found':'GitHub API error');
      const profile=await profileRes.json(); state.profile=profile; state.username=profile.login;
      const repos=[]; let page=1;
      while(page<=3){
        const r=await fetch(`https://api.github.com/users/${encodeURIComponent(u)}/repos?per_page=100&page=${page}&sort=updated&direction=desc`,{headers:{Accept:'application/vnd.github+json'}}); if(!r.ok)break; const arr=await r.json(); repos.push(...arr); if(arr.length<100)break; page++;
      }
      state.repos=repos.filter(r=>!r.fork);
      try {
        const c=await fetch(`https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(u)}?y=last`);
        if(c.ok){const cj=await c.json(); state.contributions=Array.isArray(cj.contributions)?cj.contributions:[];}
      } catch { state.contributions=[]; }
      const langs={}; state.repos.slice(0,60).forEach(r=>Object.entries(r.language?{[r.language]:1}:{}).forEach(([k,v])=>langs[k]=(langs[k]||0)+v)); state.languages=langs;
      const ranked=[...state.repos].sort((a,b)=>(b.stargazers_count+b.forks_count)-(a.stargazers_count+a.forks_count)).slice(0,6); state.selectedRepos=ranked.map(r=>r.full_name);
      state.headline=inferHeadline(); state.about=inferAbout();
      $('#scanStatus').textContent=`Loaded ${state.repos.length} public repositories.`; toast('Profile scanned');
      persist(); setQuery(); renderAll(); return true;
    }catch(e){$('#scanStatus').textContent=e.message;toast(e.message);return false}
  }

  function inferHeadline(){
    const langs=Object.entries(state.languages).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k])=>k).join(' · ');
    const topics=[...state.repos.flatMap(r=>r.topics||[])].slice(0,4);
    if(topics.length)return `Building ${topics.slice(0,2).join(' + ')} with ${langs||'code'}.`;
    return `Building useful things in ${langs||'code'} and sharing the journey.`;
  }
  function inferAbout(){
    const p=state.profile||{}; const role=p.bio||'Developer profile generated from public GitHub work.'; return role;
  }

  function githubContributionGrid(){
    const vals=state.contributions.map(x=>x.count||0); const max=Math.max(1,...vals);
    const cells=Array.from({length:168},(_,i)=>{const n=state.contributions[i]?.count||0; const ratio=n/max; const c=n===0?'':ratio<.25?'on1':ratio<.5?'on2':ratio<.75?'on3':'on4'; return `<i class="heat-cell ${c}" title="${n} contributions"></i>`});
    return cells.join('');
  }
  function selectedRepos(){
    const chosen=state.repos.filter(r=>state.selectedRepos.includes(r.full_name));
    return chosen.length?chosen.slice(0,4):state.repos.slice(0,4);
  }
  function template(){return templates.find(t=>t.id===state.template)||templates[3]}
  function renderPreview(){
    const p=state.profile||{login:state.username,name:state.username,bio:'Developer profile generated from public GitHub work.',avatar_url:'assets/avatar-placeholder.svg',followers:0,following:0,public_repos:state.repos.length};
    const langs=Object.entries(state.languages).sort((a,b)=>b[1]-a[1]).slice(0,5); const total=langs.reduce((a,[,v])=>a+v,0)||1;
    const repos=selectedRepos(); const tech=langs.length?langs:['JavaScript', 'TypeScript', 'Python'].map(x=>[x,1]);
    const metricCards=[['STARS',state.repos.reduce((s,r)=>s+r.stargazers_count,0)],['REPOS',p.public_repos||state.repos.length],['FOLLOWERS',p.followers||0],['CONTRIB','LIVE*']];
    const sectionByName=name=>state.sections.includes(name);
    const projectHtml=repos.map(r=>`<article class="project-card"><h4>${esc(r.name)}</h4><p>${esc(r.description||'Public project with no description yet.')}</p><div class="project-meta"><span>★ ${formatNum(r.stargazers_count)}</span><span>⑂ ${formatNum(r.forks_count)}</span><span>${esc(r.language||'Code')}</span></div></article>`).join('');
    const statRows=tech.map(([n,v],i)=>`<div class="bar-line"><span>${esc(n)}</span><div class="bar"><i style="width:${Math.max(22,Math.round(v/total*100))}%"></i></div><span>${Math.round(v/total*100)}%</span></div>`).join('');
    const social=state.links.map(x=>`<a class="social-link" href="#">${esc(x)}</a>`).join('');
    const parts=[];
    parts.push(`<section class="readme-hero"><div class="avatar-wrap"><img src="${esc(p.avatar_url||'assets/avatar-placeholder.svg')}" alt="${esc(p.login)} avatar"></div><div class="hero-copy"><div class="hero-handle">@${esc(p.login)}</div><div class="hero-name">${esc(p.name||p.login)}</div><div class="hero-bio">${esc(state.headline)}</div><div class="metric-row">${metricCards.map(([k,v])=>`<div class="metric"><b>${esc(formatNum(typeof v==='number'?v:0))}${v==='LIVE*'?'*':''}</b><span>${k}</span></div>`).join('')}</div></div></section>`);
    if(sectionByName('About Me')) parts.push(`<section class="readme-section"><div class="section-label">WHOAMI</div><div class="terminal-block">$ cat about.md\n\n${esc(state.about)}\n\n$ echo "open to collaboration"</div></section>`);
    if(sectionByName('Skills')) parts.push(`<section class="readme-section"><div class="section-label">TECH ARSENAL</div><div class="tag-row">${tech.map(([n])=>`<span class="tag">${esc(n)}</span>`).join('')}</div></section>`);
    if(sectionByName('GitHub Stats')) parts.push(`<section class="readme-section"><div class="stats-grid"><div class="stat-visual"><div class="section-label">GITHUB STATS</div><h3 style="margin:0;font-size:26px">${formatNum(metricCards[0][1])} ★</h3><p style="color:var(--muted);margin:4px 0 14px">indexed impact across public repositories</p>${['Stars','Repositories','Followers'].map((k,i)=>`<div class="bar-line"><span>${k}</span><div class="bar"><i style="width:${[78,55,62][i]}%"></i></div><span>signal</span></div>`).join('')}</div><div class="stat-visual"><div class="section-label">LANGUAGE MIX</div><div class="bar-stack">${statRows}</div></div></div></section>`);
    if(sectionByName('Projects')) parts.push(`<section class="readme-section"><div class="section-label">FEATURED PROJECTS</div><div class="project-grid">${projectHtml||'<div class="project-card"><h4>No projects yet</h4><p>Run the GitHub scan to populate real repositories.</p></div>'}</div></section>`);
    if(sectionByName('Highlights')) parts.push(`<section class="readme-section"><div class="section-label">HIGHLIGHTS</div><div class="metric-row"><div class="metric"><b>${formatNum(p.public_repos||0)}</b><span>public repos</span></div><div class="metric"><b>${formatNum(p.followers||0)}</b><span>followers</span></div><div class="metric"><b>${formatNum(state.repos.reduce((s,r)=>s+r.forks_count,0))}</b><span>forks</span></div><div class="metric"><b>${esc(p.company||'Independent')}</b><span>workspace</span></div></div></section>`);
    if(sectionByName('Heatmap')) parts.push(`<section class="readme-section"><div class="section-label">CONTRIBUTION SIGNAL</div><div class="stat-visual"><div class="heatmap">${githubContributionGrid()}</div></div></section>`);
    if(sectionByName('Streak')) parts.push(`<section class="readme-section"><div class="section-label">STREAK</div><div class="terminal-block">Contribution streak widget ready for your generated package.\nConnect the optional Action to refresh it automatically.</div></section>`);
    if(sectionByName('Connect')) parts.push(`<section class="readme-section"><div class="section-label">CONTACT</div><div class="social-row">${social}</div></section>`);
    const visualNote=state.visuals.has('contribution-game')?`<section class="readme-section"><div class="section-label">CONTRIBUTION PLAYGROUND</div><div class="terminal-block">[ PLAYGROUND READY ]\nThe exported package can include a theme-matched contribution game asset.</div></section>`:'';
    parts.push(visualNote);
    parts.push(`<div class="readme-footer">Generated by ProfileForge · ${esc(template().name)} · ${esc((themes.find(t=>t.id===state.theme)||themes[3]).name)}</div>`);
    const density=state.density==='compact'?'':state.density==='cinematic'?' style="padding:34px"':'';
    $('#previewCanvas').innerHTML=`<div class="readme-inner"${density}>${parts.join('')}</div>`;
  }

  function buildMarkdown(){
    const p=state.profile||{login:state.username,name:state.username,bio:'Developer profile generated from public GitHub work.',avatar_url:'assets/avatar-placeholder.svg',followers:0,following:0,public_repos:state.repos.length};
    const theme=themes.find(t=>t.id===state.theme)||themes[3]; const repos=selectedRepos();
    const lines=[`# ${p.name||p.login}`, '', `> ${state.headline}`, '', `![Profile avatar](${p.avatar_url||'assets/avatar-placeholder.svg'})`, '', `## WHOAMI`, '', state.about, ''];
    if(state.sections.includes('Skills')) lines.push('## TECH ARSENAL','',Object.keys(state.languages).sort((a,b)=>state.languages[b]-state.languages[a]).slice(0,8).map(x=>`- ${x}`).join('\n'),'');
    if(state.sections.includes('GitHub Stats')) lines.push('## GITHUB STATS','',`- ⭐ Stars indexed: ${formatNum(state.repos.reduce((s,r)=>s+r.stargazers_count,0))}`,`- 📦 Public repositories: ${formatNum(p.public_repos||state.repos.length)}`,`- 👥 Followers: ${formatNum(p.followers||0)}`,'');
    if(state.sections.includes('Projects')){lines.push('## FEATURED PROJECTS','');repos.forEach(r=>lines.push(`### [${r.name}](${r.html_url})`,``,mdEsc(r.description||'Public project.'),``, `**${r.language||'Code'}** · ⭐ ${r.stargazers_count} · ⑂ ${r.forks_count}`,'') )}
    if(state.sections.includes('Heatmap')) lines.push('## CONTRIBUTION SIGNAL','',`![Contribution grid](assets/${slug(p.login)}-heatmap.svg)`,'');
    if(state.sections.includes('Connect')) lines.push('## CONTACT','',state.links.map(x=>`- ${x}`).join('\n'),'');
    if(state.visuals.has('contribution-game')) lines.push('## CONTRIBUTION PLAYGROUND','',`![Contribution playground](assets/${slug(p.login)}-playground.svg)`,'');
    lines.push(`---`,`Theme: **${theme.name}** · Template: **${template().name}** · Generated with ProfileForge`);
    return lines.join('\n');
  }

  function renderMarkdown(){ $('#markdownCanvas').textContent=buildMarkdown(); }

  function renderAll(){
    applyTheme(); renderGoalGrid(); renderTemplateList(); renderVisualList(); renderThemeGrid(); renderTimeline(); renderSignals(); renderProjects(); renderPreview(); renderMarkdown(); $('#headlineInput').value=state.headline; $('#aboutInput').value=state.about; $('#linksInput').value=state.links.join('\n'); $('[data-view="'+state.view+'"]')?.classList.add('active'); updateView();
  }
  function renderGoalGrid(){ $('#goalGrid').innerHTML=goals.map(g=>`<button class="goal-btn ${state.goal===g.id?'active':''}" data-goal="${g.id}"><b>${g.name}</b><small>${g.sub}</small></button>`).join('') }
  function renderTemplateList(){ $('#templateList').innerHTML=templates.map(t=>`<button class="template-btn ${state.template===t.id?'active':''}" data-template="${t.id}"><span class="template-meta"><span class="swatch" style="color:${t.accent};background:${t.accent}"></span>${t.name}</span><span>›</span></button>`).join('') }
  function renderVisualList(){ $('#visualList').innerHTML=visuals.map(v=>`<button class="visual-btn ${state.visuals.has(v.id)?'active':''}" data-visual="${v.id}"><span>${v.name}</span><small>${v.sub}</small></button>`).join('') }
  function renderThemeGrid(){ $('#themeGrid').innerHTML=themes.map(t=>`<button class="theme-btn ${state.theme===t.id?'active':''}" data-theme="${t.id}" style="--t1:${t.a};--t2:${t.b}">${esc(t.name)}<small>${esc(t.name==='GitHub Dark'?'Pro standard':'Theme')}</small></button>`).join(''); $('#themeCatalog').innerHTML=themes.map(t=>`<div class="theme-swatch-card"><div class="theme-swatch" style="--g1:${t.a};--g2:${t.b}"></div><b>${esc(t.name)}</b><span>${t.a}</span></div>`).join('') }
  function renderTimeline(){ $('#timeline').innerHTML=state.sections.map((s,i)=>`<div class="timeline-item ${state.activeSection===s?'active':''}" data-section="${s}"><div class="num">${String(i+1).padStart(2,'0')}</div><b>${s}</b><div class="timeline-controls"><button data-move="up">↑</button><button data-move="down">↓</button><button data-move="remove">×</button></div></div>`).join('') }
  function renderSignals(){ const p=state.profile; const total=state.repos.reduce((s,r)=>s+r.stargazers_count,0); $('#signalGrid').innerHTML=`<div class="signal"><b>${formatNum(total)}</b><span>Stars</span></div><div class="signal"><b>${formatNum(p?.followers||0)}</b><span>Followers</span></div><div class="signal"><b>${formatNum(state.repos.length)}</b><span>Repos</span></div><div class="signal"><b>${formatNum(state.repos.reduce((s,r)=>s+r.forks_count,0))}</b><span>Forks</span></div>` }
  function renderProjects(){ $('#projectPicker').innerHTML=state.repos.slice(0,30).map(r=>`<label class="project-item"><input type="checkbox" data-repo="${esc(r.full_name)}" ${state.selectedRepos.includes(r.full_name)?'checked':''}><span><b>${esc(r.name)}</b><small style="display:block;color:var(--muted)">${esc(r.language||'Code')} · ★ ${r.stargazers_count}</small></span></label>`).join('') || '<div class="hint">Scan a profile to load repositories.</div>' }
  function updateView(){ $$('.tab').forEach(t=>t.classList.toggle('active',t.dataset.view===state.view)); $('#previewCanvas').classList.toggle('hidden',state.view!=='preview'&&state.view!=='github'); $('#markdownCanvas').classList.toggle('hidden',state.view!=='markdown'); $('#previewCanvas').style.background=state.view==='github'?'#fff':'#0d1217'; $('#previewCanvas').style.color=state.view==='github'?'#222':'inherit'; }

  function buildAssetSvgs(){
    const p=state.profile||{login:state.username,name:state.username,avatar_url:''}; const t=themes.find(x=>x.id===state.theme)||themes[3]; const u=slug(p.login);
    const base=(w,h,body)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="${t.a}"/><stop offset="1" stop-color="${t.b}"/></linearGradient><filter id="s"><feGaussianBlur stdDeviation="18"/></filter></defs><rect width="${w}" height="${h}" rx="28" fill="#0b0f14"/><circle cx="${w-80}" cy="70" r="100" fill="url(#g)" opacity=".18" filter="url(#s)"/>${body}</svg>`;
    const hero=base(1200,420,`<rect x="40" y="40" width="1120" height="340" rx="22" fill="#10161d" stroke="#2a3642"/><circle cx="150" cy="180" r="82" fill="url(#g)"/><circle cx="150" cy="180" r="67" fill="#111821"/><text x="250" y="155" fill="${t.a}" font-family="Arial" font-size="18" font-weight="700">@${esc(p.login)}</text><text x="250" y="205" fill="#f5f7f5" font-family="Arial" font-size="38" font-weight="700">${esc(p.name||p.login)}</text><text x="250" y="250" fill="#94a3af" font-family="Arial" font-size="20">${esc(state.headline.slice(0,58))}</text><rect x="250" y="290" width="155" height="38" rx="19" fill="url(#g)"/><text x="327" y="315" text-anchor="middle" fill="#07110a" font-family="Arial" font-size="13" font-weight="700">ProfileForge</text>`);
    const vals=state.contributions.map(x=>x.count||0); const max=Math.max(1,...vals); const heatCells=Array.from({length:420},(_,i)=>{const x=45+(i%60)*18,y=68+Math.floor(i/60)*24,n=state.contributions[i]?.count||0;const ratio=n/max;const op=n===0?.06:ratio<.25?.22:ratio<.5?.46:ratio<.75?.7:.95;return `<rect x="${x}" y="${y}" width="14" height="14" rx="3" fill="${t.a}" opacity="${op}"/>`}).join(''); const heat=base(1200,240,`<text x="45" y="42" fill="${t.a}" font-family="Arial" font-size="14" font-weight="700">CONTRIBUTION SIGNAL</text>${heatCells}`);
    const play=base(1000,320,`<text x="40" y="58" fill="${t.a}" font-family="Arial" font-size="15" font-weight="700">CONTRIBUTION PLAYGROUND</text><text x="40" y="94" fill="#d9e2dc" font-family="Arial" font-size="24" font-weight="700">${esc(template().name)}</text><text x="40" y="124" fill="#8895a2" font-family="Arial" font-size="14">Game-ready visual placeholder generated locally.</text><rect x="40" y="160" width="920" height="110" rx="18" fill="#090d12" stroke="#2a3642"/>${Array.from({length:18},(_,i)=>`<rect x="${65+i*47}" y="${210+((i%3)-1)*12}" width="26" height="12" rx="5" fill="${t.a}" opacity="${0.15+(i%5)*0.15}"/>`).join('')}`);
    return {'hero.svg':hero,'heatmap.svg':heat,'playground.svg':play, [u+'-heatmap.svg']:heat, [u+'-playground.svg']:play};
  }
  function downloadText(name,text,type='text/plain'){const blob=new Blob([text],{type});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
  function openExport(){ $('#exportSummary').textContent=`README.md\nassets/${slug(state.username)}-heatmap.svg\nassets/${slug(state.username)}-playground.svg (optional)\n.github/workflows/update-profile.yml (optional)\n\nTemplate: ${template().name}\nTheme: ${themes.find(t=>t.id===state.theme)?.name}\nGoal: ${goals.find(g=>g.id===state.goal)?.name}`; $('#modalBackdrop').classList.remove('hidden') }

  function improve(){
    const lang=Object.keys(state.languages).slice(0,3); const top=selectedRepos().slice(0,2).map(r=>r.name).join(' and '); state.headline = state.goal==='get-hired'?`Developer focused on ${lang.join(', ')||'software'} · shipping ${top||'useful projects'}.`:state.goal==='open-source'?`Open-source builder focused on ${lang.join(', ')||'software'} and sustainable maintainer workflows.`:`Building products with ${lang.join(', ')||'software'} and turning ideas into shipped work.`; state.about = state.profile?.bio || `I build and iterate in public, with a focus on ${lang.join(', ')||'software'}. Recent work includes ${top||'open repositories and experiments'}.`; $('#headlineInput').value=state.headline; $('#aboutInput').value=state.about; $('#suggestionBox').textContent='Applied a profile-aware headline and about section based on your selected goal and public GitHub signal.'; renderPreview(); renderMarkdown(); persist(); toast('README improved'); }

  function bind(){
    $('#heroStartBtn').addEventListener('click',()=>{document.querySelector('#studio')?.scrollIntoView({behavior:'smooth'});setTimeout(()=>$('#usernameInput')?.focus(),450)}); $('#scanBtn').addEventListener('click',fetchGitHub); $('#usernameInput').addEventListener('keydown',e=>{if(e.key==='Enter')fetchGitHub()}); $('#sampleBtn').addEventListener('click',()=>{state.username='octocat';$('#usernameInput').value='octocat';fetchGitHub()});
    $('#headlineInput').addEventListener('input',e=>{state.headline=e.target.value;renderPreview();renderMarkdown();persist()}); $('#aboutInput').addEventListener('input',e=>{state.about=e.target.value;renderPreview();renderMarkdown();persist()}); $('#linksInput').addEventListener('input',e=>{state.links=e.target.value.split(/\n|\|/).map(s=>s.trim()).filter(Boolean);renderPreview();renderMarkdown();persist()});
    $('#goalGrid').addEventListener('click',e=>{const b=e.target.closest('[data-goal]');if(!b)return;state.goal=b.dataset.goal;setQuery();renderGoalGrid();persist();toast('Goal changed')});
    $('#templateList').addEventListener('click',e=>{const b=e.target.closest('[data-template]');if(!b)return;state.template=b.dataset.template;state.sections=templates.find(t=>t.id===state.template)?.parts.map(x=>x==='Hero'?'Header':x==='Stack'?'Skills':x==='Portrait'?'About Me':x==='System Scan'?'About Me':x==='Language Mix'?'Skills':x==='Playground'?'Heatmap':x).filter((x,i,a)=>a.indexOf(x)===i) || [...sectionsDefault];state.activeSection=state.sections[0]||'Header';setQuery();renderAll();persist();toast('Template applied')});
    $('#visualList').addEventListener('click',e=>{const b=e.target.closest('[data-visual]');if(!b)return;const id=b.dataset.visual;state.visuals.has(id)?state.visuals.delete(id):state.visuals.add(id);renderVisualList();renderPreview();renderMarkdown();persist()});
    $('#themeGrid').addEventListener('click',e=>{const b=e.target.closest('[data-theme]');if(!b)return;state.theme=b.dataset.theme;setQuery();applyTheme();renderThemeGrid();renderPreview();renderMarkdown();persist();toast('Theme changed')});
    $('#densityControl').addEventListener('click',e=>{const b=e.target.closest('[data-density]');if(!b)return;state.density=b.dataset.density;$$('#densityControl button').forEach(x=>x.classList.toggle('active',x===b));renderPreview();persist()});
    $$('.toggle-row input').forEach(i=>i.addEventListener('change',()=>{document.body.classList.toggle('no-glass',!$$('[data-effect="glass"]')[0].checked);document.body.classList.toggle('no-glow',!$$('[data-effect="glow"]')[0].checked);document.body.classList.toggle('no-noise',!$$('[data-effect="noise"]')[0].checked);state.effects={glass:$$('[data-effect="glass"]')[0].checked,glow:$$('[data-effect="glow"]')[0].checked,noise:$$('[data-effect="noise"]')[0].checked};persist()}));
    $$('.tab').forEach(t=>t.addEventListener('click',()=>{state.view=t.dataset.view;updateView();renderMarkdown();}));
    $$('.panel-tab').forEach(t=>t.addEventListener('click',()=>{$$('.panel-tab').forEach(x=>x.classList.remove('active'));t.classList.add('active');$$('.inspector-pane').forEach(x=>x.classList.remove('active'));$('#inspector'+t.dataset.inspector[0].toUpperCase()+t.dataset.inspector.slice(1)).classList.add('active')}));
    $('#timeline').addEventListener('click',e=>{const item=e.target.closest('[data-section]');if(!item)return;const section=item.dataset.section;const control=e.target.closest('[data-move]');if(!control){state.activeSection=section;$('#editingTitle').textContent=section;renderTimeline();return}const i=state.sections.indexOf(section);if(control.dataset.move==='remove'&&state.sections.length>1)state.sections.splice(i,1);if(control.dataset.move==='up'&&i>0)[state.sections[i-1],state.sections[i]]=[state.sections[i],state.sections[i-1]];if(control.dataset.move==='down'&&i<state.sections.length-1)[state.sections[i+1],state.sections[i]]=[state.sections[i],state.sections[i+1]];state.activeSection=state.sections[Math.max(0,Math.min(i,state.sections.length-1))];renderTimeline();renderPreview();renderMarkdown();persist()});
    $('#resetSectionsBtn').addEventListener('click',()=>{state.sections=[...sectionsDefault];renderTimeline();renderPreview();renderMarkdown();persist()}); $('#refreshProjectsBtn').addEventListener('click',fetchGitHub); $('#improveBtn').addEventListener('click',improve); $('#copyBtn').addEventListener('click',async()=>{await navigator.clipboard.writeText(buildMarkdown());toast('Markdown copied')}); $('#downloadBtn').addEventListener('click',()=>downloadText('README.md',buildMarkdown(),'text/markdown')); $('#exportBtn').addEventListener('click',openExport); $('#closeModal').addEventListener('click',()=>$('#modalBackdrop').classList.add('hidden')); $('#modalBackdrop').addEventListener('click',e=>{if(e.target===e.currentTarget)e.currentTarget.classList.add('hidden')});
    $('#downloadPackageBtn').addEventListener('click',()=>{downloadText('README.md',buildMarkdown(),'text/markdown');const assets=buildAssetSvgs();Object.entries(assets).forEach(([n,c])=>downloadText(n,c,'image/svg+xml'));toast('README + SVG assets downloaded')});
    $('#downloadActionBtn').addEventListener('click',()=>downloadText('update-profile.yml',workflowText(),'text/yaml')); $('#copyLinkBtn').addEventListener('click',async()=>{setQuery();await navigator.clipboard.writeText(location.href);toast('Studio link copied')});
    $('#catalogGrid').addEventListener('click',e=>{const b=e.target.closest('[data-template]');if(!b)return;state.template=b.dataset.template;setQuery();renderAll();window.scrollTo({top:0,behavior:'smooth'})});
  }
  function workflowText(){return `name: Refresh Profile Assets\n\non:\n  workflow_dispatch:\n  schedule:\n    - cron: '0 3 * * 0'\n\npermissions:\n  contents: write\n\njobs:\n  refresh:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n      - run: node scripts/build-profile.mjs ${state.username}\n      - name: Commit refreshed assets\n        run: |\n          git config user.name 'github-actions[bot]'\n          git config user.email '41898282+github-actions[bot]@users.noreply.github.com'\n          git add .\n          git commit -m 'chore: refresh profile assets' || exit 0\n          git push\n`}

  function init(){
    restore(); loadQuery(); $('#usernameInput').value=state.username; bind();
    $('#catalogGrid').innerHTML=templates.map(t=>`<article class="catalog-card"><div class="catalog-art" style="--grad:linear-gradient(135deg,${t.accent},#0e141b 68%)"><div style="padding:12px;font-size:10px;letter-spacing:.16em;color:rgba(255,255,255,.78)">${esc(t.type)}</div><div style="position:absolute;left:12px;bottom:12px;font-size:20px;font-weight:800">${esc(t.name)}</div></div><h3>${esc(t.name)}</h3><p>${esc(t.desc)}</p><div class="catalog-foot"><small>${t.parts.join(' · ')}</small><button class="use-link" data-template="${t.id}">Use</button></div></article>`).join('');
    renderAll(); fetchGitHub();
  }
  return {init};
})();
document.addEventListener('DOMContentLoaded',App.init);
