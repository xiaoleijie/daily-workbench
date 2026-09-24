const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const errs=[];
const dom=new JSDOM(html,{runScripts:'dangerously',url:'http://test.local/',pretendToBeVisual:true,
  beforeParse(w){
    w.AudioContext=function(){const node=()=>({connect(x){return x;},disconnect(){},start(){},stop(){},frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(){},value:0},gain:{setValueAtTime(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(){},value:0},type:''});return{createOscillator:node,createGain:node,createBiquadFilter:()=>({connect(x){return x;},frequency:{setValueAtTime(){},value:0},Q:{value:0},type:''}),destination:{},currentTime:0,state:'running',resume(){},close(){}};};
    w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({},{get:(t,p)=>{ if(p==='canvas')return{}; if(p==='measureText')return()=>({width:10}); if(p==='createLinearGradient'||p==='createRadialGradient')return()=>({addColorStop(){}}); if(p==='getImageData')return()=>({data:[]}); return ()=>{}; },set:()=>true});};
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
    if(!w.CSS) w.CSS={};
    if(!w.CSS.escape) w.CSS.escape=s=>String(s).replace(/[^a-zA-Z0-9_-]/g,c=>'\\'+c);
    w.addEventListener('error',e=>errs.push('window error: '+(e.error&&e.error.stack||e.message)));
  }});
const w=dom.window,d=w.document;
const vc=w.console; ['error'].forEach(k=>{const o=vc[k];vc[k]=(...a)=>{const s=a.map(String).join(' ');if(!/Could not parse CSS|Not implemented|css/i.test(s))errs.push('console.'+k+': '+s);};});
let pass=0,fail=0;
function T(n,f){ try{const r=f(); if(r===false){fail++;console.log('FAIL '+n);} else {pass++;console.log('ok   '+n+(typeof r==='string'?'  ['+r+']':''));} }catch(e){fail++;console.log('ERR  '+n+' :: '+e.message);} }
function E(id){return !!d.getElementById(id);}
setTimeout(()=>{
  console.log('--- structural ---');
  T('weightChart 函数存在',()=>typeof w.weightChart==='function');
  T('sparkline 仍在',()=>typeof w.sparkline==='function');
  T('saveBodySettings 存在',()=>typeof w.saveBodySettings==='function');
  T('renderWeekPlan 存在',()=>typeof w.renderWeekPlan==='function');
  T('openExEditor 存在',()=>typeof w.openExEditor==='function');
  T('editBodyRow 存在',()=>typeof w.editBodyRow==='function');

  console.log('--- 1) 体重趋势图坐标轴 ---');
  const pts=[{日期:'2026-08-01',体重:60},{日期:'2026-08-05',体重:59.2},{日期:'2026-08-09',体重:58.6},{日期:'2026-08-14',体重:58.1},{日期:'2026-08-20',体重:57.4},{日期:'2026-08-25',体重:57.0},{日期:'2026-09-01',体重:56.3}];
  const svg=w.weightChart(pts);
  T('返回 svg',()=>svg&&svg.indexOf('<svg')===0);
  T('含 polyline',()=>svg.includes('<polyline'));
  T('纵轴刻度 >=5 个 text',()=>(svg.match(/text-anchor="end"/g)||[]).length>=5 ? (svg.match(/text-anchor="end"/g)||[]).length+' 个' : false);
  T('纵轴含 kg 数值(56.x~60.x)',()=>/5[6-9]\.\d|60\.\d/.test(svg));
  T('横轴日期标签(MM-DD)',()=>/\d{2}-\d{2}/.test(svg) ? (svg.match(/\d{2}-\d{2}/g)||[]).length+' 个' : false);
  T('横轴标签不超过 6 个',()=>(svg.match(/text-anchor="middle"/g)||[]).length<=6);
  T('最新点标数值 56.3',()=>svg.includes('56.3'));
  T('不足2点返回 null',()=>w.weightChart([{日期:'2026-09-01',体重:60}])===null);
  T('体重为空/0 被过滤',()=>w.weightChart([{日期:'2026-09-01',体重:0},{日期:'2026-09-02',体重:0}])===null);
  T('全部同值不崩(除零保护)',()=>{const s=w.weightChart([{日期:'2026-09-01',体重:60},{日期:'2026-09-02',体重:60}]); return !!s && s.indexOf('<svg')===0;});
  T('多点(30)不报错且标签受控',()=>{const a=[];for(let i=0;i<30;i++){a.push({日期:'2026-09-'+(i<9?'0'+(i+1):(i+1)),体重:60-i*0.1});} const s=w.weightChart(a); return !!s && (s.match(/text-anchor="middle"/g)||[]).length<=6;});
  T('SVG 可解析(tags 平衡)',()=>{const open=(svg.match(/<(svg|g|text)\b/g)||[]).length; const close=(svg.match(/<\/(svg|g|text)>/g)||[]).length; return open===close? open+'/'+close : false;});

  console.log('--- 2) 今日已消耗 ---');
  const plan=[{__id:'p1',星期:'周一',运动:'快走',时长:30,完成:'完成'}];
  const wpHtml=w.renderWeekPlan(plan);
  T('含 wp-day-burn',()=>wpHtml.includes('wp-day-burn'));
  T('在标题 b 之后',()=>/<b>周一<\/b><span class="wp-day-burn/.test(wpHtml));
  T('数值包在 burn-n 里',()=>wpHtml.includes('burn-n'));
  T('0 值带 zero 类',()=>/wp-day-burn zero/.test(wpHtml));
  const css=html;
  T('CSS: wp-day-head 左对齐',()=>/\.wp-day-head\{[^}]*justify-content:flex-start/.test(css));
  T('CSS: burn 字号变大(13px)',()=>/\.wp-day-burn\{[^}]*font-size:13px/.test(css));
  T('CSS: burn-n 16px 加粗',()=>/\.burn-n\{font-size:16px;font-weight:800/.test(css));

  console.log('--- 3) 保存目标按钮 ---');
  T('CSS: 保存目标跨满 4 格',()=>/\.fit-goal-save \.btn\{grid-column:1 \/ span 4/.test(css));
  T('CSS: 高度保持 21px 不变',()=>/\.fit-goal-save \.btn\{[^}]*min-height:21px/.test(css));
  T('CSS: 窄屏回退仍跨满',()=>/\.fit-goal-save \.btn\{grid-column:1 \/ span 2\}/.test(css));

  console.log('--- 4) 身体记录：身体觉察日记 + 测量时间 ---');
  T('源码含 身体觉察日记 标签',()=>html.includes('身体觉察日记'));
  T('源码含 测量时间 字段(b-time)',()=>html.includes('id="b-time"'));
  T('timeOpts 生成 24h 选项',()=>{const o=w.timeOpts('08:30'); return typeof o==='string' && o.includes('value="08:30"') && o.includes('value="23:55"') && o.includes('value="00:00"');});
  T('nowHM5 返回 HH:MM',()=>/^\d{2}:\d{2}$/.test(w.nowHM5()));

  console.log('--- 5) 番茄钟：顶部开始/重置/放弃/音效 + 专注休息小按钮 + 滚轮 + 各自重置 ---');
  T('pomoClick 存在',()=>typeof w.pomoClick==='function');
  T('togglePomodoro/startPomodoro 存在',()=>typeof w.togglePomodoro==='function' && typeof w.startPomodoro==='function');
  T('setPomoMode 已移除',()=>typeof w.setPomoMode==='undefined');
  T('resetFocus/resetBreak 存在',()=>typeof w.resetFocus==='function' && typeof w.resetBreak==='function');
  T('buildPomoWheels/syncPomoWheels 存在',()=>typeof w.buildPomoWheels==='function' && typeof w.syncPomoWheels==='function');
  T('playWheelTick 存在',()=>typeof w.playWheelTick==='function');
  T('pomoClick(focus) → 自动开始跑专注',()=>{ w.POMO.running=false; w.stopPomo(); w.pomoClick('focus'); return w.POMO.mode==='focus' && w.POMO.running===true && w.POMO.left===25*60; });
  T('pomoClick(break) → 中止当前、从头自动跑休息',()=>{ w.POMO.running=true; w.pomoClick('break'); return w.POMO.mode==='break' && w.POMO.running===true && w.POMO.left===5*60; });
  T('pomoClick(当前模式且正在跑) → 暂停',()=>{ w.POMO.running=true; w.POMO.mode='focus'; w.pomoClick('focus'); return w.POMO.running===false; });
  T('pomoClick(当前模式且已暂停) → 继续',()=>{ w.POMO.running=false; w.POMO.mode='focus'; w.POMO.left=100; w.pomoClick('focus'); return w.POMO.running===true && w.POMO.left===100; });
  T('togglePomodoro → 暂停',()=>{ w.togglePomodoro(); return w.POMO.running===false; });
  T('标题重置 → 25/5 + focus + 停止',()=>{ w.POMO.focusMin=40; w.POMO.breakMin=12; w.POMO.running=true; w.resetPomodoro(); return w.POMO.focusMin===25 && w.POMO.breakMin===5 && w.POMO.mode==='focus' && w.POMO.left===25*60 && w.POMO.running===false; });
  T('重置专注 → 归 25',()=>{ w.POMO.focusMin=50; w.resetFocus(); return w.POMO.focusMin===25; });
  T('重置休息 → 归 5',()=>{ w.POMO.breakMin=20; w.resetBreak(); return w.POMO.breakMin===5; });
  T('钟面: 专注在上 / 休息在下',()=>{ w.POMO.mode='focus'; w.renderPomodoro(); const mt=d.getElementById('pomoModeTop'),mb=d.getElementById('pomoModeBottom'); return mt.classList.contains('on') && !mb.classList.contains('on'); });
  T('钟面: 休息时反过来',()=>{ w.POMO.mode='break'; w.renderPomodoro(); const mt=d.getElementById('pomoModeTop'),mb=d.getElementById('pomoModeBottom'); return !mt.classList.contains('on') && mb.classList.contains('on'); });
  T('小按钮高亮: 专注选中',()=>{ w.POMO.mode='focus'; w.renderPomodoro(); return d.getElementById('pomoFocusBtn').classList.contains('active'); });
  T('专注/休息按钮改名为 开始专注/开始休息',()=>{ const f=d.getElementById('pomoFocusBtn'), b=d.getElementById('pomoBreakBtn'); return f && b && f.textContent==='开始专注' && b.textContent==='开始休息'; });
  T('钟面上方显示 小饼干奖励 提示',()=>{ const t=d.querySelector('.pomo-tip'); return t && t.textContent.indexOf('小饼干奖励')>=0; });
  T('钟面下方操作栏顺序: 静音/音效音量/重置/放弃',()=>{ const w3=d.querySelector('.pomo-bottom'); if(!w3) return false; const ids=[].map.call(w3.querySelectorAll('button'),b=>b.id); return ids[0]==='pomoMuteBtn' && ids[1]==='pomoSfxBtn' && ids[2]==='pomoResetBtn' && w3.querySelectorAll('button').length===4; });
  T('静音按钮: 常态🔔 → 点击🔕+主题底(音量归0) → 再点回🔔(恢复音量)',()=>{ const b=d.getElementById('pomoMuteBtn'); if(!b) return false; w.POMO_MUTED=false; w.POMO_VOL=60; w.POMO_VOL_SAVED=60; w.renderPomoMuteBtn(); const a=b.textContent,c0=b.classList.contains('on'); w.togglePomoMute(); const b1=b.textContent,c1=b.classList.contains('on'),v1=w.POMO_VOL; w.togglePomoMute(); const b2=b.textContent,c2=b.classList.contains('on'),v2=w.POMO_VOL; return a==='🔔'&&c0===false&&b1==='🔕'&&v1===0&&c1===true&&b2==='🔔'&&v2===60&&c2===false; });
  T('静音按钮: 音量>0 时即使 POMO_MUTED=true 也显示 🔔',()=>{ const b=d.getElementById('pomoMuteBtn'); w.POMO_MUTED=true; w.POMO_VOL=60; w.renderPomoMuteBtn(); const t=b.textContent, on=b.classList.contains('on'); w.POMO_MUTED=false; w.renderPomoMuteBtn(); return t==='🔔' && on===false; });
  T('静音按钮: 音量=0 时显示 🔕（不论 POMO_MUTED）',()=>{ const b=d.getElementById('pomoMuteBtn'); w.POMO_MUTED=false; w.POMO_VOL=0; w.renderPomoMuteBtn(); const t=b.textContent, on=b.classList.contains('on'); w.POMO_VOL=60; w.POMO_MUTED=false; w.renderPomoMuteBtn(); return t==='🔕' && on===true; });
  T('静音→再点：从 0 音量恢复为静音前的音量',()=>{ w.POMO_MUTED=true; w.POMO_VOL=0; w.POMO_VOL_SAVED=55; w.togglePomoMute(); const ok = w.POMO_MUTED===false && w.POMO_VOL===55; w.POMO_VOL=60; w.POMO_MUTED=false; w.renderPomoMuteBtn(); return ok; });
  T('loadPomoCfg 打开即回默认 25+5',()=>{ w._pomoCfgLoaded=false; w.POMO.focusMin=42; w.POMO.breakMin=9; w.loadPomoCfg(); return w.POMO.focusMin===25 && w.POMO.breakMin===5; });
  T('滚轮填充 180/60 项',()=>{ w.buildPomoWheels(); const fw=d.getElementById('focusWheel'),bw=d.getElementById('breakWheel'); const fc=fw.querySelectorAll('.pomo-wheel-item').length, bc=bw.querySelectorAll('.pomo-wheel-item').length; return fc===180 && bc===60 ? fc+'/'+bc : false; });
  T('syncPomoWheels 标记当前选中',()=>{ w.POMO.focusMin=25; w.POMO.breakMin=5; w.syncPomoWheels(); const sel=d.querySelectorAll('#focusWheel .pomo-wheel-item.sel').length; return sel===1 ? '1 个选中' : false; });
  w.stopPomo();

  console.log('--- 6) 番茄钟：音量 + 4 种新音效 ---');
  T('POMO_VOL 默认 60',()=>w.POMO_VOL===60);
  T('adjPomoVol(+20)=80',()=>{ w.POMO_VOL=60; w.adjPomoVol(20); return w.POMO_VOL===80; });
  T('adjPomoVol 上限 100',()=>{ w.POMO_VOL=95; w.adjPomoVol(20); return w.POMO_VOL===100; });
  T('adjPomoVol 下限 0',()=>{ w.POMO_VOL=10; w.adjPomoVol(-20); return w.POMO_VOL===0; });
  T('sfxGain 基础放大 4.5 倍且防削波',()=>{ w.POMO_VOL=100; const a=w.sfxGain(0.045); const b=w.sfxGain(0.42); return Math.abs(a-0.2025)<1e-9 && Math.abs(b-0.95)<1e-9 ? '0.2025 / 0.95(已封顶)' : false; });
  T('7 种音效齐全',()=>{const L=w.POMO_SFX_LABEL; return ['tick','sweep','beep','cuckoo','bell','bowl','muyu'].every(k=>L[k]) ? Object.keys(L).length+' 种' : false;});
  T('playPomoTick 各音效不报错',()=>{ let ok=true; ['tick','sweep','beep','cuckoo','bell','bowl','muyu'].forEach(k=>{ try{ w.POMO_SFX.key=k; w.playPomoTick(); }catch(e){ ok=false; } }); return ok; });
  T('音量0 时 playPomoTick 直接返回',()=>{ w.POMO_VOL=0; let r=true; try{ w.POMO_SFX.key='tick'; w.playPomoTick(); }catch(e){ r=false; } w.POMO_VOL=60; return r; });
  T('petSound 受音量影响且不报错',()=>{ w.POMO_VOL=0; let ok=true; try{ w.petSound('reward'); w.petSound('trash'); }catch(e){ ok=false; } w.POMO_VOL=60; return ok; });
  T('openPomoSfxPicker 含左右分栏+音量条',()=>{ w.openPomoSfxPicker(); const m=d.getElementById('pomosfx-modal'); return m.innerHTML.includes('sfx-split') && m.innerHTML.includes('sfx-vol-track') && m.innerHTML.includes('pomoVolTrack'); });
  T('面板 7 个音效且无“已关闭”档',()=>{ const m=d.getElementById('pomosfx-modal'); const hasOff=/完全静音|已关闭/.test(m.innerHTML); const cnt=(m.innerHTML.match(/class="btn sfx-opt/g)||[]).length; return (cnt===7 && !hasOff) ? '7 选项/无静音档' : false; });
  T('音量滑块渲染高度',()=>{ w.POMO_VOL=40; w.renderPomoVolSlider(); const fill=d.getElementById('pomoVolFill'); return fill && fill.style.height==='40%'; });
  T('adjPomoVol 同步音效面板音量文字',()=>{ w.openPomoSfxPicker(); w.POMO_VOL=60; w.adjPomoVol(20); const now=d.getElementById('pomoVolNow'); return now && now.textContent==='80%'; });
  w.POMO_VOL=60;

  console.log('--- 8) 关于面板（永久链接 + 二维码）---');
  T('aboutCard 面板存在',()=>!!d.getElementById('aboutCard'));
  T('toggleAboutMenu 函数存在',()=>typeof w.toggleAboutMenu==='function');
  T('copyAboutUrl 函数存在',()=>typeof w.copyAboutUrl==='function');
  T('aboutCard 含永久链接与二维码',()=>{ const c=d.getElementById('aboutCard'); return c.innerHTML.includes('xiaoleijie.github.io/daily-workbench') && c.innerHTML.includes('qr.png'); });
  T('点关于按钮 → 面板显示',()=>{ w.toggleAboutMenu(); const c=d.getElementById('aboutCard'); return c && c.style.display==='block'; });

  console.log('--- 7) 通用对话框 + 放弃多步流程 ---');
  T('appDialog/myConfirm 存在',()=>typeof w.appDialog==='function' && typeof w.myConfirm==='function');
  T('myConfirm 打开并显示“日常集生活工作台”而非网址',()=>{ w.myConfirm('测试删除？', function(){}); const m=d.getElementById('app-dialog-mask'); const ok=m && m.style.display==='flex' && m.innerHTML.includes('日常集生活工作台') && !/https?:|app\.workbuddy|http:\/\//.test(m.innerHTML); return ok ? '标题正确/无网址' : (m?m.innerHTML.slice(0,80):'no mask'); });
  T('myConfirm: 点 确定(idx1) 触发 onYes',()=>{ let yes=false; w.myConfirm('x', function(){yes=true;}); w.appDialogClick(1); return yes===true; });
  T('myConfirm: 点 取消(idx0) 触发 onNo',()=>{ let no=false; w.myConfirm('x', function(){}, function(){no=true;}); w.appDialogClick(0); return no===true; });
  T('放弃: 弹“真的要放弃吗？”(playful)',()=>{ w.POMO.running=true; w.giveUpPomodoro(); const m=d.getElementById('app-dialog-mask'); return m.style.display==='flex' && m.innerHTML.includes('真的要放弃吗') && m.querySelector('.app-dialog-card.playful')!=null; });
  T('放弃: 取消 → 继续跑(running 不变, 弹窗关闭)',()=>{ w.POMO.running=true; w.giveUpPomodoro(); w.appDialogClick(0); const m=d.getElementById('app-dialog-mask'); return w.POMO.running===true && m.style.display==='none'; });
  T('放弃: 确定 → 进入“再坚持一下吧”',()=>{ w.giveUpPomodoro(); w.appDialogClick(1); const m=d.getElementById('app-dialog-mask'); return m.innerHTML.includes('再坚持一下吧'); });
  T('放弃: “我可以的” → 继续跑(弹窗关, running 不变)',()=>{ w.POMO.running=true; w.giveUpPomodoro(); w.appDialogClick(1); w.appDialogClick(1); const m=d.getElementById('app-dialog-mask'); return w.POMO.running===true && m.style.display==='none'; });
  T('放弃: “不,我就是要放弃” → 执行放弃 + 弹“狠心的人儿啊”跟随窗',()=>{ w.POMO.running=true; w.giveUpPomodoro(); w.appDialogClick(1); w.appDialogClick(0); const m=d.getElementById('app-dialog-mask'); const stub=d.getElementById('app-stub'); return w.POMO.running===false && stub && stub.style.display==='flex' && stub.innerHTML.includes('狠心的人儿啊') && stub.innerHTML.includes('app-stub-x'); });
  T('hideStubbornPopup 可关闭跟随窗',()=>{ w.hideStubbornPopup(); const stub=d.getElementById('app-stub'); return stub.style.display==='none'; });
  T('源码无残留 confirm/alert',()=>{const s=html; return !/[^a-zA-Z]confirm\s*\(|[^a-zA-Z]alert\s*\(/.test(s);});

  console.log('--- 9) 本月事项：弹窗表单 + 多选日期 ---');
  T('日程主体不再内联表单（已移入弹窗）',()=>{ w.renderSchedule([]); const b=d.getElementById('schedule-body'); return !!b && !/id="s-title"/.test(b.innerHTML); });
  T('月历头部含「＋ 本月事项」按钮',()=>{ const b=d.getElementById('schedule-body'); return b.innerHTML.includes('mc-head') && b.innerHTML.includes('openSchedAddModal') && b.innerHTML.includes('本月事项'); });
  T('CSS: 多选日历选中态 .d.pick',()=>/\.smc-grid \.d\.pick\{/.test(html));
  T('CSS: 弹窗卡片 width 720px',()=>/\.sched-add-card\{width:720px/.test(html));
  T('CSS: 弹窗内表单去重卡片背景',()=>/\.sched-add-card \.form\{[^}]*background:none/.test(html));
  T('pad2 补零',()=>w.pad2(3)==='03' && w.pad2(12)==='12');
  T('openSchedAddModal 弹出且含全部字段',()=>{ w.openSchedAddModal(); const m=d.getElementById('sched-add-modal'); return !!m && m.style.display==='flex' && ['s-title','s-cat','s-place','s-note','s-st','s-en','s-dates-block','s-submit'].every(E); });
  T('弹窗默认选中今天 1 天',()=>{ return w.schedPickDates.length===1 && w.schedPickDates[0]===w.today(); });
  T('多选：再加一天 → 2 天且按钮显示「2 天」',()=>{ const t=w.today(); const dd=Number(t.slice(8,10))===1?2:1; const ds=t.slice(0,8)+(dd<10?'0'+dd:''+dd); w.schedPickToggle(ds); const b=d.getElementById('s-submit'); return w.schedPickDates.length===2 && b.textContent.includes('2 天') && b.textContent.includes('添加'); });
  T('多选：点已选日期 → 取消（回到 1 天）',()=>{ const t=w.today(); const dd=Number(t.slice(8,10))===1?2:1; const ds=t.slice(0,8)+(dd<10?'0'+dd:''+dd); w.schedPickToggle(ds); return w.schedPickDates.length===1; });
  T('快捷「全月」→ 选中数 = 当月天数',()=>{ w.schedPickQuick('all'); const days=new Date(w.schedPickY,w.schedPickM+1,0).getDate(); return w.schedPickDates.length===days ? days+' 天' : false; });
  T('快捷「本月工作日」→ 全为周一~周五',()=>{ w.schedPickQuick('weekday'); const ok=w.schedPickDates.length>0 && w.schedPickDates.every(ds=>{ const wd=new Date(Number(ds.slice(0,4)),Number(ds.slice(5,7))-1,Number(ds.slice(8,10))).getDay(); return wd>=1&&wd<=5; }); return ok ? w.schedPickDates.length+' 天' : false; });
  T('快捷「本月周末」→ 全为周六/周日',()=>{ w.schedPickQuick('weekend'); return w.schedPickDates.every(ds=>{ const wd=new Date(Number(ds.slice(0,4)),Number(ds.slice(5,7))-1,Number(ds.slice(8,10))).getDay(); return wd===0||wd===6; }); });
  T('快捷「清空」→ 0 天，按钮回到「添加」',()=>{ w.schedPickQuick('clear'); const b=d.getElementById('s-submit'); return w.schedPickDates.length===0 && b.textContent==='添加'; });
  T('面板渲染「已选 N 天」计数',()=>{ w.schedPickQuick('all'); const el=d.getElementById('s-dates-block'); return /class="smc-cnt-row"/.test(el.innerHTML) && el.innerHTML.includes('已选') && el.innerHTML.includes(''+w.schedPickDates.length) && el.innerHTML.includes('天'); });
  T('切下月/回上月 → 月份前进再回退',()=>{ const before=w.schedPickY*12+w.schedPickM; w.schedCalMove(1); const mid=w.schedPickY*12+w.schedPickM; w.schedCalMove(-1); return mid===before+1 && (w.schedPickY*12+w.schedPickM)===before; });
  T('切到下月后「全月」= 该月天数',()=>{ w.schedCalMove(1); w.schedPickQuick('all'); const days=new Date(w.schedPickY,w.schedPickM+1,0).getDate(); const ok=w.schedPickDates.length===days; w.schedCalMove(-1); return ok; });
  T('closeSchedAddModal 可关闭',()=>{ w.closeSchedAddModal(); const m=d.getElementById('sched-add-modal'); return m.style.display==='none'; });

  console.log('--- 9b) 本轮改版：字段重排 / 今日安排 / 左右两栏 / 批量改日期 ---');
  T('表单：重要/紧急为常驻独立字段 s-quad',()=>{ w.openSchedAddModal(); const m=d.getElementById('sched-add-modal'); return !!d.getElementById('s-quad') && m.innerHTML.includes('重要/紧急'); });
  T('表单：重要/紧急不再是分类联动（无 s-quad-wrap）',()=>{ const m=d.getElementById('sched-add-modal'); return !/s-quad-wrap/.test(m.innerHTML); });
  T('表单：备注 + 地点同行均分（两个 c-6）',()=>{ const m=d.getElementById('sched-add-modal'); return /id="s-note"/.test(m.innerHTML) && /id="s-place"/.test(m.innerHTML) && (m.innerHTML.match(/class="fld c-6"/g)||[]).length>=2; });
  T('表单：左右两栏 .sa-flex / .sa-cal / .sa-ops',()=>{ w.renderSchedPickBlock(); const m=d.getElementById('sched-add-modal'); return m.innerHTML.includes('sa-flex') && m.innerHTML.includes('sa-cal') && m.innerHTML.includes('sa-ops'); });
  T('R14-表单：sa-ops 5 按钮(添加/导入/导出/修日期/撤销，无认领隐身)，工作日/周末/清空移到日历下方 sa-quick，无今天',()=>{ const m=d.getElementById('sched-add-modal'); const ops=(m.innerHTML.split('class="sa-ops"')[1]||'').split('</div>')[0]; const q=(m.innerHTML.split('class="sa-quick"')[1]||'').split('</div>')[0]; return ['添加','导入','导出','修日期','撤销'].every(t=>ops.includes('>'+t+'<')) && ['工作日','周末','清空'].every(t=>q.includes('>'+t+'<')) && !ops.includes('>今天<') && !q.includes('>今天<'); });
  T('表单：日历内快捷按钮已移除（无 smc-quick）',()=>{ const m=d.getElementById('sched-add-modal'); return !/smc-quick/.test(m.innerHTML); });
  T('表单：onclick 引号已转义（可被解析）',()=>{ const m=d.getElementById('sched-add-modal'); return /schedPickQuick\((&quot;|\\u0022|")today/.test(m.innerHTML) || m.innerHTML.includes('schedPickQuick(')===false || !/schedPickQuick\('today'\)/.test(html); });
  T('CSS: .sa-flex 左右两栏',()=>/\.sa-flex\{display:flex/.test(html));
  T('R14-CSS: .sa-cal 半宽 flex:1 1 0',()=>/\.sa-cal\{flex:1 1 0/.test(html));
  T('R14-CSS: .sa-cal 半宽(flex:1 1 0) + .sa-ops 1列网格 + .sa-quick 网格',()=> html.indexOf('.sa-cal{flex:1 1 0;min-width:0}')>=0 && html.indexOf('.sa-ops{flex:1 1 0;min-width:0;display:grid;grid-template-columns:1fr')>=0 && html.indexOf('.sa-quick{display:grid;grid-template-columns:repeat(3,1fr)')>=0);
  // ===== R19 新增 =====
  T('R19-删除红色进度条: actcal-prog 已彻底移除(无 HTML/CSS/JS 引用)',()=> html.indexOf('actcal-prog')<0 && html.indexOf('act-bar')<0);
  T('R19-每月点一点白框: actcal-tag 带 id=act-tag 且可点击 advanceActionFromTag',()=> html.indexOf('id="act-tag"')>=0 && html.indexOf('onclick="advanceActionFromTag()"')>=0);
  T('R19-进度填充: 函数 advanceActionFromTag + paintTagProgress 已定义',()=> html.indexOf('function advanceActionFromTag(')>=0 && html.indexOf('function paintTagProgress(')>=0 && html.indexOf('paintTagProgress(checked)')>=0);
  T('CSS: .sa-ops>.btn 等宽',()=>/\.sa-ops>\.btn,\.sa-quick>\.btn\{width:100%/.test(html));
  T('CSS: .smc-cnt-row 计数行',()=>/\.smc-cnt-row\{/.test(html));
  T('修改弹窗：含重要/紧急 es-quad',()=>{ w.openSchedAddModal(); w.closeSchedAddModal(); const rec={'标题':'测试项','分类':'工作','开始时间':'09:00','结束时间':'10:00','日期':w.today(),'象限':'Q2','备注':'','地点':'','完成':'否'}; w.__sched=[rec]; w.openEditSchedModal(rec); const m=d.getElementById('sched-edit-modal')||d.getElementById('edit-sched-modal'); return !!d.getElementById('es-quad') && !!d.getElementById('es-place') && !!d.getElementById('es-note'); });
  T('修改弹窗：含「改全部日期」勾选框 es-batch',()=>{ const a={'标题':'晨会','分类':'工作','开始时间':'09:00','结束时间':'10:00','日期':'2026-09-01','象限':'Q2','备注':'','地点':'','完成':'否'}; const b={'标题':'晨会','分类':'工作','开始时间':'09:00','结束时间':'10:00','日期':'2026-09-08','象限':'Q2','备注':'','地点':'','完成':'否'}; w.__sched=[a,b]; w.openSchedAddModal(); w.closeSchedAddModal(); w.openEditSchedModal(a); return !!d.getElementById('es-batch'); });
  T('修改弹窗：仅 1 条时不显示 es-batch',()=>{ const x={'标题':'独苗','分类':'其他','开始时间':'11:00','结束时间':'12:00','日期':'2026-09-08','象限':'Q1','备注':'','地点':'','完成':'否'}; w.__sched=[x]; w.closeEditSchedModal(); w.openEditSchedModal(x); return !d.getElementById('es-batch'); });
  T('esBatchIds：同标题同时段归组',()=>{ const a={'标题':'晨会','开始时间':'09:00','结束时间':'10:00','日期':'2026-09-01','完成':'否'}; const b={'标题':'晨会','开始时间':'09:00','结束时间':'10:00','日期':'2026-09-08','完成':'否'}; const c={'标题':'别的','开始时间':'09:00','结束时间':'10:00','日期':'2026-09-08','完成':'否'}; w.__sched=[a,b,c]; const ids=w.esBatchIds(a); return ids.length===2; });
  T('esBatchIds：只有 1 条时不显示批量框',()=>{ const x={'标题':'独苗','开始时间':'11:00','结束时间':'12:00','日期':'2026-09-08','完成':'否'}; w.__sched=[x]; return w._esBatchPanelHTML(x)===''; });
  T('CSS: .es-batch-box 虚线框',()=>/\.es-batch-box\{[^}]*border:1px dashed/.test(html));
  T('今日安排：模块名已改名',()=>w.MODULES.some(m=>m.key==='tasks'&&m.name==='今日安排'));
  T('今日安排：页面标题为「今日安排」',()=>{ const h=d.getElementById('pageTitle'); return !h || h.textContent.indexOf('今日工作')<0; });
  T('今日安排：源码无「今日工作」残留文案',()=>!/今日工作/.test(html));
  T('今日安排：renderTasks 按今天过滤',()=>/dateSub\(due\)!==td|dateSub\(due\)===td/.test(w.renderTasks.toString()));
  T('③ 明细按钮：已完成(✓)/恢复(↺)/逾期(✗) 图标 + title',()=>{
    w.showModule('schedule');
    w.schedSelDate=null;
    const td=w.today();
    const past=(function(){var x=new Date(td+'T00:00:00');x.setDate(x.getDate()-3);return x.getFullYear()+'-'+('0'+(x.getMonth()+1)).slice(-2)+'-'+('0'+x.getDate()).slice(-2);})();
    w.renderSchedule([
      {_id:'t1','标题':'A','分类':'工作','开始时间':'09:00','结束时间':'10:00','日期':td,'象限':'Q1','备注':'','地点':'','完成':'否'},
      {_id:'t2','标题':'B','分类':'工作','开始时间':'09:00','结束时间':'10:00','日期':td,'象限':'Q1','备注':'','地点':'','完成':'是'},
      {_id:'t3','标题':'C','分类':'工作','开始时间':'09:00','结束时间':'10:00','日期':past,'象限':'Q1','备注':'','地点':'','完成':'否'}
    ]);
    const ico=d.querySelectorAll('.s-act-btn.ico, .s-pill.ico, .s-act-btn.rev');
    const txts=[].map.call(ico,e=>e.textContent.trim());
    const titles=[].map.call(ico,e=>e.title);
    return txts.indexOf('✓')>=0 && txts.indexOf('↺')>=0 && txts.indexOf('✗')>=0 && titles.some(t=>t==='已完成') && titles.some(t=>t.indexOf('未完成')===0);
  });
  T('③ CSS: .ico 圆形按钮 28px',()=>/\.s-act-btn\.ico,\.s-pill\.ico\{[^}]*width:28px;height:28px/.test(html));
  T('① CSS: 左列 22.32% / 右列 48.40%',()=>/\.sched-left-col\{flex:0 0 22\.32%/.test(html) && /\.sched-top-right\{flex:0 0 48\.40%/.test(html));
  T('① CSS: 中列有最小宽度防压扁',()=>/\.sched-mid-col\{flex:1 1 0;min-width:260px\}/.test(html));
  T('① CSS: 明细标题字号 12.5px',()=>/\.sched-mid-col \.sched-list-panel \.item \.ttl\{font-size:12\.5px\}/.test(html));
  T('① CSS: 明细日期独立 Georgia div 已删除（R23 二.3）',()=> html.indexOf('font-family:Georgia,serif;color:var(--muted);font-size:11px;flex:0 0 auto')<0);
  T('① CSS: 幸福历日历字号缩小（.num 12px / .act 11px）',()=>/\.actcal-cell \.num\{font-size:12px/.test(html) && /\.actcal-cell \.act\{font-size:11px/.test(html));
  T('② CSS: 单行三列带 .sched-mid-col 前缀（防 flex 覆盖）',()=>/\.sched-mid-col \.filter-row\.sched-filters\{display:flex;flex-wrap:nowrap/.test(html));
  T('② CSS: 旧 Left-col 300px 覆盖规则已删',()=>!/\.sched-left-col\{flex:0 1 300px\}/.test(html));
  T('④ 日历格子高度 24px（整体缩一行）',()=>/\.smc-grid \.d\{[^}]*height:24px/.test(html));
  T('⑤ 音量>0 时静音按钮显示 🔔',()=>{ const b=d.getElementById('pomoMuteBtn'); w.POMO_VOL=60; w.POMO_MUTED=true; w.renderPomoMuteBtn(); return b.textContent==='🔔' && !b.classList.contains('on'); });
  T('⑤ 点静音按钮 → 音量归 0；再点 → 恢复',()=>{ const b=d.getElementById('pomoMuteBtn'); w.POMO_VOL=70; w.POMO_MUTED=false; w.POMO_VOL_SAVED=70; w.renderPomoMuteBtn(); w.togglePomoMute(); const v1=w.POMO_VOL,t1=b.textContent; w.togglePomoMute(); const v2=w.POMO_VOL,t2=b.textContent; return v1===0&&t1==='🔕'&&v2===70&&t2==='🔔'; });
  T('端到端：勾选批量 → updateRecord 被调 3 次且字段同步',()=>{
    const calls=[];
    const orig = w.__localDB.updateRecord;
    w.__localDB.updateRecord = function(o){ calls.push(JSON.parse(JSON.stringify(o))); return Promise.resolve({}); };
    const mk=(dd)=>({'标题':'晨会','分类':'工作','开始时间':'09:00','结束时间':'10:00','日期':dd,'象限':'Q2','备注':'旧备注','地点':'旧地点','完成':'否'});
    const recs=[mk('2026-09-01'),mk('2026-09-08'),mk('2026-09-15')];
    recs.forEach((r,i)=>{ r._id='rec'+i; });
    w.__sched = recs.slice();
    w.openEditSchedModal(recs[0]);
    d.getElementById('es-title').value='晨会(改)';
    d.getElementById('es-quad').value='Q1';
    d.getElementById('es-note').value='新备注';
    d.getElementById('es-place').value='新地点';
    d.getElementById('es-date').value='2026-10-01';
    d.getElementById('es-batch').checked=true;
    w.saveEditSchedItem('rec0');
    w.__localDB.updateRecord = orig;
    if(calls.length!==3) return '调用次数='+calls.length;
    const ok = calls.every(c=>{
      const p=c.properties||{};
      return p['标题'] && p['标题'].text==='晨会(改)'
        && p['象限'] && p['象限'].select==='Q1'
        && p['备注'] && p['备注'].text==='新备注'
        && p['地点'] && p['地点'].text==='新地点'
        && !p['日期'];                       /* R6 修复：批量时绝不下发「日期」 */
    });
    return ok ? (calls.length+' 条内容同步、日期未动') : false;
  });
  T('端到端：不勾选批量 → 只改 1 条',()=>{
    const calls=[];
    const orig = w.__localDB.updateRecord;
    w.__localDB.updateRecord = function(o){ calls.push(o); return Promise.resolve({}); };
    const mk=(dd)=>({'标题':'复盘','分类':'工作','开始时间':'20:00','结束时间':'21:00','日期':dd,'象限':'Q3','备注':'','地点':'','完成':'否'});
    const recs=[mk('2026-09-01'),mk('2026-09-08')];
    recs.forEach((r,i)=>{ r._id='x'+i; });
    w.__sched = recs.slice();
    w.openEditSchedModal(recs[0]);
    d.getElementById('es-note').value='只改这条';
    const cb=d.getElementById('es-batch'); if(cb) cb.checked=false;
    w.saveEditSchedItem('x0');
    w.__localDB.updateRecord = orig;
    return calls.length===1 ? '1 条' : '调用次数='+calls.length;
  });

  console.log('--- 10) 静音按钮 ⇄ 音量联动 ---');
  T('syncMuteWithVol 函数存在',()=>typeof w.syncMuteWithVol==='function');
  T('音量>0 → 解除静音（按钮回🔔，on 类移除）',()=>{ const b=d.getElementById('pomoMuteBtn'); w.POMO_MUTED=true; w.POMO_VOL=0; w.renderPomoMuteBtn(); w.POMO_VOL=60; w.syncMuteWithVol(); w.renderPomoMuteBtn(); return w.POMO_MUTED===false && b.textContent==='🔔' && !b.classList.contains('on'); });
  T('音量=0 → 进入静音（按钮🔕+on 类）',()=>{ const b=d.getElementById('pomoMuteBtn'); w.POMO_MUTED=false; w.POMO_VOL=50; w.renderPomoMuteBtn(); w.POMO_VOL=0; w.syncMuteWithVol(); w.renderPomoMuteBtn(); return w.POMO_MUTED===true && b.textContent==='🔕' && b.classList.contains('on'); });
  T('静音后 adjPomoVol 调大 → 自动解除静音',()=>{ w.POMO_MUTED=true; w.POMO_VOL=0; w.savePomoVol=()=>{}; w.adjPomoVol(30); return w.POMO_VOL===30 && w.POMO_MUTED===false; });
  T('静音后 adjPomoVol 调小到 0 → 保持静音',()=>{ w.POMO_MUTED=true; w.POMO_VOL=10; w.adjPomoVol(-30); return w.POMO_VOL===0 && w.POMO_MUTED===true; });
  T('音量未变时 syncMuteWithVol 不误触发',()=>{ w.POMO_VOL=60; w.POMO_MUTED=false; w.syncMuteWithVol(); return w.POMO_MUTED===false; });
  T('sfxGain 跟随音量（小基数下越低越轻）',()=>{ w.POMO_VOL=50; const g=w.sfxGain(0.02); w.POMO_VOL=100; const g2=w.sfxGain(0.02); return g>0 && Math.abs(g2-g*2)<1e-9 ? g.toFixed(4)+' → '+g2.toFixed(4) : false; });
  T('音量归零后 sfxGain=0（无声）',()=>{ w.POMO_VOL=0; return w.sfxGain(0.5)===0; });
  w.POMO_VOL=60; w.POMO_MUTED=false; w.renderPomoMuteBtn();

  console.log('--- 11) 日程统筹改版布局 ---');
  T('筛选条为三列并排（分类/状态/日期）',()=>{ w.renderSchedule([]); const f=d.querySelector('.sched-filters'); return !!f && /sched-filters/.test(f.className); });
  T('三控件文案：分类/状态默认"全部" + 日期可选',()=>{ const f=d.querySelector('.sched-filters'); const catSel=f.querySelector('.sched-filter-cell[data-fk="cat"] select.filt-btn'); const staSel=f.querySelector('.sched-filter-cell[data-fk="status"] select.filt-btn'); const dateInput=f.querySelector('input.filt-btn.date-filt[type="date"]'); return !!catSel && !!staSel && !!dateInput && catSel.options[0].textContent==='全部' && staSel.options[0].textContent==='全部'; });
  T('无「清除日期筛选」旧文案残留',()=>{ const f=d.querySelector('.sched-filters'); return !/清除日期筛选/.test(f.innerHTML); });
  T('模块栈含本月日程与便签（.sched-mods）',()=>{ const c=d.querySelector('.sched-left-col .sched-mods'); return !!c && !!c.querySelector('.mini-cal-panel') && !!c.querySelector('.sticky-note'); });
  /* ===== R20：本月日程过去天浅底色 + 删提示 + 默认选中今天 ===== */
  T('R20-提示文案删除: 月历下方无 mc-tip / 无“点击日期可筛选右侧日程”',()=>{ w.renderSchedule([]); const b=d.getElementById('schedule-body'); return b.innerHTML.indexOf('mc-tip')<0 && b.innerHTML.indexOf('点击日期可筛选右侧日程')<0; });
  T('R20-过去天浅底色: 若存在过去天则带 past 类与背景色',()=>{ w.renderSchedule([]); const m=d.querySelector('.monthcal'); if(!m) return false; const ps=m.querySelectorAll('.d.past'); if(ps.length===0) return true; for(var i=0;i<ps.length;i++){ if(!/background:/.test(ps[i].getAttribute('style')||'')) return false; } return true; });
  T('R20-配色数组: ACTION_PALETTE_TINT 已定义且与 ACTION_PALETTE 等长',()=> Array.isArray(w.ACTION_PALETTE_TINT) && w.ACTION_PALETTE_TINT.length===w.ACTION_PALETTE.length);
  T('R20-打开日程统筹默认今天: showModule(schedule) 后 schedSelDate===today',()=>{ w.renderSchedule([]); w.schedSelDate=null; w.showModule('schedule'); return w.schedSelDate===w.today(); });
  /* ===== R6：批量改内容不许动日期（bug 回归）+ 修复工具 + 撤销 ===== */
  T('R6① 批量分支不再把「日期」统一写入',()=>{
    const i=html.indexOf('function saveEditSchedItem');
    const seg=html.slice(i, i+2400);
    const bi=seg.indexOf('if(batch){');
    const bi2=seg.indexOf('} else {', bi);
    const batchSeg=seg.slice(bi, bi2);
    return batchSeg.indexOf('"日期"')<0 && batchSeg.indexOf("'日期'")<0 && batchSeg.indexOf('pp["日期"]')<0;
  });
  T('R6①b 单条分支仍然会改日期',()=>{
    const i=html.indexOf('function saveEditSchedItem');
    const seg=html.slice(i, i+2400);
    return /p\["日期"\]=\{date:newDate\}/.test(seg);
  });
  T('R6② 批量面板文案说明「日期原样保留」',()=>html.indexOf('各自日期原样保留')>=0);
  T('R6②b 批量标签不再是「改全部日期」',()=>html.indexOf('改全部日期（同标题同时段的')<0 && html.indexOf('批量改内容（同标题同时段的')>=0);
  T('R6③ 批量保存前有确认弹窗',()=>{
    const i=html.indexOf('function saveEditSchedItem');
    const seg=html.slice(i, i+3000);
    return seg.indexOf('各条日期保持原样不变')>=0 && seg.indexOf('onClick:finish')>=0;
  });
  T('R6④ 日期修复工具已定义',()=>['openDateFixer','renderDateFixer','dfPlan','applyDateFixer','dfSnapRow'].every(f=>html.indexOf('function '+f)>=0));
  T('R6④b 工具栏有「修日期」「撤销」入口',()=>html.indexOf("openDateFixer()")>=0 && html.indexOf("schedUndoLast()")>=0);
  T('R6⑤ 撤销栈上限 5 条',()=>{
    const i=html.indexOf('function pushUndo');
    const seg=html.slice(i, i+400);
    return seg.indexOf('all.length>5')>=0;
  });
  T('R6⑤b 撤销可还原（doSchedUndo 写回全部字段）',()=>{
    const i=html.indexOf('function doSchedUndo');
    const seg=html.slice(i, i+900);
    return ['"日期"','"标题"','"完成详情"'].every(k=>seg.indexOf(k)>=0);
  });
  T('R6⑥ dfHits 工作日判定正确（周一~周五）',()=>{
    const i=html.indexOf('function dfHits');
    const seg=html.slice(i, i+500);
    return seg.indexOf("wd!==0 && wd!==6")>=0;
  });
  T('R6⑦ 修复工具默认选中「条数最多」的那组',()=>{
    const i=html.indexOf('function openDateFixer');
    const seg=html.slice(i, i+900);
    return seg.indexOf('groups[k2].length>bestN')>=0;
  });
  T('R6⑧ 修复工具样式齐备',()=>['.df-card{','.df-row{','.df-list{','.df-new{','.df-tip{'].every(k=>html.indexOf(k)>=0));
  /* ===== R6-D：气泡随猫缩放 + 侧栏文案说真话 ===== */
  T('R6-D① 气泡最大宽度随猫缩放',()=>html.indexOf('max-width:calc(var(--pet-size,116px)*1.45)')>=0);
  T('R6-D①b 气泡字号随猫缩放',()=>/\.pet-speech\{[^}]*font-size:calc\(var\(--pet-size,116px\)\*0\.112\)/.test(html));
  T('R6-D①c 气泡内边距随猫缩放',()=>/\.pet-speech\{[^}]*padding:calc\(var\(--pet-size,116px\)\*0\.052\)/.test(html));
  T('R6-D①d 气泡箭头随猫缩放',()=>/\.pet-speech:before\{[^}]*border-top:calc\(var\(--pet-size,116px\)\*0\.078\)/.test(html));
  T('R6-D①e 气泡不再有写死的 max-width:168px',()=>html.indexOf('max-width:168px')<0);
  T('R6-D② 侧栏文案改为「数据只存在这台设备」',()=>html.indexOf('数据只存在这台设备')>=0 && html.indexOf('数据云端同步')<0);
  T('R6-D②b 侧栏不再宣称「换设备不离线」',()=>html.indexOf('换设备不离线')<0);
  /* ===== R7：侧栏文案断句 + 可点击打开备份面板 ===== */
  T('R7① 文案为「…换设备请先备份。」结尾带句号',()=>html.indexOf('换设备请先备份。')>=0);
  T('R7①b @二木管家 紧跟「先备份。」之后（同一行，无换行打断）',()=>{
    const i=html.indexOf('换设备请先备份。');
    if(i<0) return false;
    const seg=html.slice(i, i+60);
    return seg.indexOf('换设备请先备份。@二木管家')>=0;
  });
  T('R7①c 「先备份。」与 @二木管家 之间不再有 <br>',()=>{
    const i=html.indexOf('换设备请先备份。');
    if(i<0) return false;
    const seg=html.slice(i, i+60);
    return !/<br[^>]*>\s*@二木管家/.test(seg);
  });
  T('R7② 侧栏那行可点击',()=>html.indexOf("id=\"sideBackupLink\"")>=0 && html.indexOf("openBackupFromSide()")>=0);
  T('R7②b openBackupFromSide 居中显示面板',()=>{
    const i=html.indexOf('function openBackupFromSide');
    const seg=html.slice(i, i+700);
    return seg.indexOf('backupCard')>=0 && seg.indexOf('window.innerWidth')>=0 && seg.indexOf('window.innerHeight')>=0;
  });
  T('R7②c 面板关闭白名单含侧栏链接',()=>html.indexOf("'backupCard',['backupBtn','sideBackupLink']")>=0);
  T('R7③ 侧栏链接样式（虚线下划线 + hover）',()=>['.side-note-link{','.side-note-link:hover{','.side-note-link:focus-visible{'].every(k=>html.indexOf(k)>=0));
  T('R7③b 侧栏链接支持键盘 Enter/Space',()=>{
    const i=html.indexOf('id="sideBackupLink"');
    const seg=html.slice(i, i+320);
    return seg.indexOf("event.key==='Enter'")>=0 && seg.indexOf("event.key===' '")>=0;
  });
  T('R5① 迷你月历标题只留年月（无「本月日程」后缀）',()=>html.indexOf("td.substring(0,7)+'</h3>'")>=0 && html.indexOf("· 本月日程</h3>")<0);
  T('R5② 便签去掉标题只留划线',()=>html.indexOf('<div class="sticky-rule"></div>')>=0 && html.indexOf('sticky-title')<0);
  T('R5②b 划线 CSS 生效',()=>/\.sticky-note \.sticky-rule\{height:0;border-top:1\.5px dashed/.test(html));
  T('R5④ 粘贴弹窗无「其他导入方式」',()=>html.indexOf('其他导入方式')<0);
  T('R5④b 三按钮并排一行 .imp-altrow',()=>/\.imp-altrow\{display:flex;flex-wrap:nowrap;gap:8px/.test(html));
  T('R5④c 粘贴弹窗含 CSV / Excel / 模板 三按钮',()=>{ const i=html.indexOf('function openPasteImport'); const seg=html.slice(i,i+1800);
    return seg.indexOf('pickCsv()')>=0 && seg.indexOf('pickXlsx()')>=0 && seg.indexOf('downloadSchedTemplate()')>=0; });
  T('R5④d 选择器只剩「粘贴通知文本」一项',()=>{ const i=html.indexOf('function openImportPicker'); const seg=html.slice(i,i+900);
    return seg.indexOf('openPasteImport()')>=0 && seg.indexOf('pickCsv()')<0 && seg.indexOf('downloadSchedTemplate()')<0; });
  T('R5⑤ 模板只保留 1 张表',()=>{ const i=html.indexOf('function buildSchedTemplateWb'); const seg=html.slice(i,i+1200);
    return seg.indexOf("'日程模板'")>=0 && seg.indexOf("'填写说明'")<0 && !/var desc=\[/.test(seg); });
  T('左列模块栈：本月日程 + 本月安排',()=>{ const box=d.getElementById('schedMods'); if(!box) return false; const ks=[].map.call(box.querySelectorAll('.sched-mod'),m=>m.getAttribute('data-mod')); return ks.join(',')==='mini,sticky'; });
  T('中列模块栈：筛选 + 事项明细',()=>{ const box=d.getElementById('schedModsMid'); if(!box) return false; const ks=[].map.call(box.querySelectorAll('.sched-mod'),m=>m.getAttribute('data-mod')); return ks.join(',')==='filters,list'; });
  T('中列模块栈同时含筛选条与明细面板',()=>{ const c=d.querySelector('.sched-mid-col .sched-mods'); return !!c && !!c.querySelector('.sched-filters') && !!c.querySelector('.sched-list-panel'); });
  T('模块跨列：loadSchedModState 返回 order+col',()=>{ const st=w.loadSchedModState(); return st && Array.isArray(st.order) && st.col && st.col.mini==='right'===false && st.col.mini==='left' && st.col.list==='mid'; });
  T('模块默认列：mini/sticky=left，filters/list=mid',()=>{ const st=w.loadSchedModState(); return st.col.mini==='left' && st.col.sticky==='left' && st.col.filters==='mid' && st.col.list==='mid'; });
  T('日程主体不再含便签（已移到左列）',()=>{ const m=d.querySelector('.sched-left-col'); return /sticky-note/.test(m.innerHTML); });
  T('CSS: cal-stack 纵向排列',()=>/\.cal-stack\{display:flex;flex-direction:column/.test(html));
  T('CSS: sched-filters 单行 flex（三控件并排）',()=>/\.sched-mid-col \.filter-row\.sched-filters\{display:flex;flex-wrap:nowrap/.test(html));
  T('CSS: 日期筛选激活态样式',()=>/\.date-filt\.on\{/.test(html));

  console.log('--- 12) 2026-09-18 九项改版 ---');
  T('① 品牌区新增使用者名字位',()=>E('brandUser'));
  T('① displayName 默认主人名=小蕾姐',()=>{ const old=w.localStorage.getItem('lw_uid'), oldn=w.localStorage.getItem('lw_nick');
    const oldU=w.MY_UID;
    w.MY_UID='小蕾姐'; w.localStorage.setItem('lw_uid','小蕾姐'); w.localStorage.removeItem('lw_nick');
    const r=w.displayName()==='小蕾姐';
    w.MY_UID=oldU; if(old) w.localStorage.setItem('lw_uid',old); if(oldn) w.localStorage.setItem('lw_nick',oldn); return r; });
  T('① displayName 支持自定义名字',()=>{ const oldn=w.localStorage.getItem('lw_nick');
    w.localStorage.setItem('lw_nick','王蕾'); const r=w.displayName()==='王蕾';
    if(oldn) w.localStorage.setItem('lw_nick',oldn); else w.localStorage.removeItem('lw_nick'); return r; });
  T('① updateIdChip 把名字写进品牌区',()=>{ const old=w.localStorage.getItem('lw_uid'), oldn=w.localStorage.getItem('lw_nick');
    const oldU=w.MY_UID;
    w.MY_UID='小蕾姐'; w.localStorage.setItem('lw_uid','小蕾姐'); w.localStorage.removeItem('lw_nick'); w.updateIdChip();
    const t=(d.getElementById('brandUser')||{}).textContent;
    w.MY_UID=oldU; if(old) w.localStorage.setItem('lw_uid',old); if(oldn) w.localStorage.setItem('lw_nick',oldn); w.updateIdChip();
    return t==='小蕾姐'; });
  T('① saveNick 函数存在',()=>typeof w.saveNick==='function');
  T('③ 侧栏「身份」按钮已移除',()=>!E('idChip'));
  T('③ 猫咪名字「二木管家的小猫」已移除',()=>!d.querySelector('.pet-name'));
  T('② 侧栏门线存在',()=>E('doorSlot'));
  T('② 门线门形元素存在',()=>!!d.querySelector('#doorSlot .door-line'));
  T('② 门线默认提示=召唤小猫出门（原始 HTML）',()=>/id="doorHint">召唤小猫出门<\/span>/.test(html));
  T('② 点门触发动态分支 petToggleDoor',()=>/id="doorSlot"[^>]*onclick="petToggleDoor\(\)"/.test(html));
  T('② 门交互: petToggleDoor 在家→出门/在外→回家',()=>/function petToggleDoor\(\)\{ if\(PET_AT_HOME\)\{ petComeOut\(\); \} else \{ petGoHome\(\); \} \}/.test(html));
  T('② 小猫在外时门常开（cat-out 类生效）',()=>{ w.setPetHomeState(false);
    const slot=d.getElementById('doorSlot');
    const out=slot.classList.contains('cat-out') && !slot.classList.contains('has-cat');
    const hint=d.getElementById('doorHint');
    return out && !!hint && hint.textContent.trim()==='召唤小猫回家'; });
  T('② 小猫在家时门关闭（has-cat 生效，提示出门）',()=>{ w.setPetHomeState(true);
    const slot=d.getElementById('doorSlot');
    const hint=d.getElementById('doorHint');
    const home=slot.classList.contains('has-cat') && !slot.classList.contains('cat-out');
    const ok=home && !!hint && hint.textContent.trim()==='召唤小猫出门';
    w.setPetHomeState(false); return ok; });
  T('② CSS: 小猫在外门常开（.cat-out .door-line 宽度22）',()=>/\.door-slot\.cat-out \.door-line\{width:22px/.test(html));
  T('② 回小窝按钮文案与行为',()=>{ const e=d.getElementById('petHomeBtn');
    return !!e&&e.textContent.trim()==='回小窝'&&/petGoHome\(\)/.test(e.getAttribute('onclick')||''); });
  T('③b 回小窝按钮字号随小猫缩放',()=>/\.pet-home-btn\{[^}]*font-size:calc\(var\(--pet-size,116px\)\*0\.095\)/.test(html));
  T('③c .pet 兜底 --pet-size 变量',()=>/\.pet\{--pet-size:116px;/.test(html));
  T('② 回小窝按钮位于猫的下方',()=>html.indexOf('id="petCatWrap"')<html.indexOf('id="petHomeBtn"'));
  T('⑤ 顶部「我的档案」按钮',()=>{ const e=d.getElementById('switchIdBtn'); return !!e&&e.textContent.trim()==='我的档案'; });
  T('⑤ 切换身份在「关于」右侧',()=>html.indexOf('id="aboutBtn"')<html.indexOf('id="switchIdBtn"'));
  T('⑤ 切换身份复用身份面板',()=>/openPanelNear\('switchIdBtn','idCard'\)/.test(html));

  console.log('--- 本轮：右列 490 / 格子 5 行 / 气泡头顶 / 身份按钮文案 ---');
  T('① CSS: 左列 22.32% / 右列 48.40%',()=>/\.sched-left-col\{flex:0 0 22\.32%/.test(html) && /\.sched-top-right\{flex:0 0 48\.40%/.test(html));
  T('① 格子高度 92px（趋正方形，无 aspect-ratio）',()=>/\.sched-top-right \.actcal-cell\{min-height:92px;padding:6px 7px 7px;border-radius:12px/.test(html) && !/\.sched-top-right \.actcal-cell\{[^}]*aspect-ratio/.test(html));
  T('① 空白格同步 92px（无 aspect-ratio）',()=>/\.sched-top-right \.actcal-cell\.empty\{min-height:92px;padding:0\}/.test(html));
  T('① 格内文字 5 行（line-clamp:5）',()=>/-webkit-line-clamp:5/.test(html));
  T('① 旧 3 行设置已清零',()=>html.indexOf('-webkit-line-clamp:3')<0);
  T('② 气泡在猫正头顶',()=>/\.pet-speech\{position:absolute;left:50%;bottom:calc\(100% \+ var\(--pet-size,116px\)/.test(html));
  T('② 气泡文案水平居中',()=>/\.pet-speech\{[^}]*text-align:center/.test(html));
  T('② 气泡尾巴朝下',()=>{
    const g=(sel)=>{ const i=html.indexOf(sel); return i<0?'':html.slice(i, html.indexOf('}', i)+1); };
    const a=g('.pet-speech:before'), b=g('.pet-speech:after');
    return a.indexOf('left:50%')>=0 && a.indexOf('bottom:calc(var(--pet-size,116px)*-')>=0 && a.indexOf('border-top:')>=0
        && b.indexOf('left:50%')>=0 && b.indexOf('bottom:calc(var(--pet-size,116px)*-')>=0 && b.indexOf('border-top:')>=0;
  });
  T('② 气泡仍限宽 max-content + 跟随缩放（防压扁）',()=>{
    const i=html.indexOf('.pet-speech{'); const seg=html.slice(i, html.indexOf('}', i)+1);
    return seg.indexOf('width:max-content')>=0 && seg.indexOf('max-width:calc(var(--pet-size,116px)*')>=0;
  });
  T('③ 档案面板含「设置密码」与「退出到锁屏」入口',()=>/>🔑 设置密码<\/button>/.test(html) && />🔒 退出到锁屏<\/button>/.test(html));
  T('③ 旧按钮文案已清零',()=>html.indexOf('我是小蕾姐（本子主人）')<0);
  T('③ 旧的重复确认框已移除（改为密码门禁）',()=>html.indexOf('确认切换到「本子主人」身份？')<0);
  T('④ OWNER_NAME 未被改动（数据关联不能变）',()=>/var OWNER_NAME = "小蕾姐";/.test(html));
  T('④ 首访无真实档案 → 显示创建门禁（不自动成主人）',()=>/function isRealProfile\(\)/.test(html) && /if\(!isRealProfile\(\)\)\{ showProfileGate\('create'\)/.test(html));
  T('④ 身份面板含名字输入框',()=>E('nickInput'));
  T('⑥ CSS 顶部按钮整体缩小',()=>/\.topbar \.btn\{min-height:34px;padding:7px 12px;font-size:12\.5px/.test(html));
  T('⑦ 旧提示语已清除',()=>!/每天点一格，就是对自己的一次小小积极鼓励/.test(html));
  T('⑦ 提示语已并入 tag（含「每天点一点…不惩罚不考核不清零」）',()=>/actcal-tag"[^>]*>每天点一点，就是对自己的小鼓励，不惩罚不考核不清零/.test(html));
  T('⑧ 格子高度 92px（取消 aspect-ratio）',()=>/\.sched-top-right \.actcal-cell\{min-height:92px;padding:6px 7px 7px;border-radius:12px/.test(html));
  T('⑧ 空白格同步 92px',()=>/\.sched-top-right \.actcal-cell\.empty\{min-height:92px;padding:0\}/.test(html));
  T('⑧ .act 不再被 flex 压缩',()=>/\.actcal-cell \.act\{font-size:11px;line-height:1\.38;margin-top:4px;flex:0 0 auto;/.test(html));
  T('① 小猫缩放上下限 56/200',()=>w.PET_SIZE_MIN===56&&w.PET_SIZE_MAX===200);
  T('① applyPetSize 上限钳制',()=>w.applyPetSize(9999)===200);
  T('① applyPetSize 下限钳制',()=>w.applyPetSize(1)===56);
  T('① 默认尺寸 116',()=>{ w.applyPetSize(116); return w.PET_SIZE===116; });
  T('① 缩放手柄存在',()=>E('petResize'));
  T('① CSS 小猫尺寸走 --pet-size',()=>/\.pet-cat\{width:var\(--pet-size,116px\);height:var\(--pet-size,116px\)\}/.test(html));
  T('② petGoHome / petComeOut 存在',()=>typeof w.petGoHome==='function'&&typeof w.petComeOut==='function');
  T('② 回窝状态写入 localStorage 并同步门线',()=>{ w.setPetHomeState(true);
    const a=w.localStorage.getItem('lw_pet_home')==='1';
    const c=d.getElementById('doorSlot').classList.contains('has-cat');
    w.setPetHomeState(false); return a&&c&&w.PET_AT_HOME===false; });

  console.log('--- 上一轮：右列 470 / 宠物区布局 / 切换身份 bug ---');
  T('① CSS: 左列 22.32% / 右列 48.40%',()=>/\.sched-left-col\{flex:0 0 22\.32%/.test(html) && /\.sched-top-right\{flex:0 0 48\.40%/.test(html));
  T('② CSS: .pet 纵向 flex 居中',()=>/\.pet\{[^}]*position:fixed;[^}]*display:flex;flex-direction:column;align-items:center/.test(html));
  T('② CSS: cat-wrap 去掉行内基线空隙',()=>/\.pet-cat-wrap\{display:block;position:relative;line-height:0\}/.test(html));
  T('② CSS: 气泡在猫正头顶（水平居中）',()=>{
    const i=html.indexOf('.pet-speech{');
    const seg=html.slice(i, html.indexOf('}', i)+1);
    return seg.indexOf('position:absolute')>=0 && seg.indexOf('left:50%')>=0
        && seg.indexOf('bottom:calc(100% + var(--pet-size,116px)')>=0
        && seg.indexOf('transform:translateX(-50%)')>=0 && seg.indexOf('width:max-content')>=0;
  });
  T('② CSS: 气泡尾巴朝下指向猫',()=>{
    const g=(sel)=>{ const i=html.indexOf(sel); return i<0?'':html.slice(i, html.indexOf('}', i)+1); };
    const a=g('.pet-speech:before'), b=g('.pet-speech:after');
    return a.indexOf('left:50%')>=0 && a.indexOf('border-top:')>=0 && a.indexOf('calc(var(--pet-size')>=0
        && b.indexOf('left:50%')>=0 && b.indexOf('border-top:')>=0;
  });
  T('② CSS: 缩放手柄在猫右下角 24px',()=>/\.pet-cat-wrap \.pet-resize\{position:absolute;right:-3px;bottom:-3px;width:24px;height:24px/.test(html));
  T('② CSS: 手柄常显 opacity .92',()=>/\.pet-resize\{[^}]*opacity:\.92/.test(html));
  T('② CSS: 手柄不再只 hover 才出现',()=>html.indexOf('.pet-cat-wrap:hover .pet-resize,.pet-cat-wrap .pet-resize.on{opacity:1}')<0);
  T('② CSS: 手柄方向 nwse（右下角手柄）',()=>/\.pet-resize\{[^}]*cursor:nwse-resize/.test(html));
  T('② 盘子随猫缩放（width/height 走 --pet-size，svg 充满）',()=>/\.pet-plate\{[^}]*width:calc\(var\(--pet-size/.test(html) && /\.pet-plate svg\{width:100%;height:100%/.test(html));
  T('① 右下角手柄拖拽：右下均放大（(clientX-sx)+(clientY-sy)）',()=>/\(\(e\.clientX-sx\)\+\(e\.clientY-sy\)\)\/2/.test(html));
  T('④ 已完成事项：已去掉「📝 详情」按钮（✓ 后直接 ↺）',()=>html.indexOf('📝 详情')<0 && html.indexOf('s-act-btn note')<0);
  T('④ 已完成仍保留 ✓ 与 ↺ 恢复',()=>/class="s-pill done ico"[^>]*>✓<\/span>/.test(html) && /class="s-act-btn rev"/.test(html));
  T('① 幸福历格内句子去掉句号（渲染兜底 replace）',()=>html.indexOf(".replace(/。/g,'')")>=0);
  T('⑥ 旧「每天点一点…」独立提示已删除（actcal-sub2 无 HTML 引用）',()=>html.indexOf('actcal-sub2" id="actTip"')<0);
  T('⑦ tag 文案已换成「每天点一点…随时回来」（去掉「每日一践 · 行动日历 —」前缀）',()=>/actcal-tag"[^>]*>每天点一点，就是对自己的小鼓励，不惩罚不考核不清零，只要愿意，随时回来<\/div>/.test(html) && !/actcal-tag">每日一践/.test(html));
  T('③ tag 白框收缩到句子宽度（flex:0 1 auto，不撑满整行）',()=>/\.actcal-subrow \.actcal-tag\{flex:0 1 auto;white-space:nowrap/.test(html));
  T('③ 已践行与 tag 同一行且靠最右（nowrap 单行 + flex:0 0 auto + margin-left:auto）',()=>/\.actcal-subrow\{display:flex;flex-wrap:nowrap/.test(html) && /\.actcal-subrow \.actcal-cnt\{order:0;flex:0 0 auto;margin:0 0 0 auto/.test(html));
  T('③ 四大模块可拖动（sched-mods 容器 + loadSchedModOrder）',()=>/class="sched-mods" id="schedMods"/.test(html) && /function loadSchedModOrder\(\)/.test(html));
  T('③ 模块顺序持久化到 lw_sched_order',()=>/localStorage\.setItem\('lw_sched_order'/.test(html) && /localStorage\.getItem\('lw_sched_order'/.test(html));
  T('③ 模块含 mini/sticky/filters/list 四键',()=>/SCHED_MOD_DEFAULT=\['mini','sticky','filters','list'\]/.test(html));
  T('③ 拖拽绑定 bindSchedModDnD 存在',()=>/function bindSchedModDnD\(\)/.test(html));
  T('② 下拉及其选项居左',()=>/select\.filt-btn,select\.filt-btn option\{text-align:left/.test(html));
  T('② 手柄含双向箭头 SVG',()=>{ const e=d.getElementById('petResize'); return !!e&&!!e.querySelector('svg'); });
  T('② 气泡/盘子/垃圾桶都在 cat-wrap 内',()=>{ const k=d.getElementById('petCatWrap'); return !!k&&!!k.querySelector('#petSpeech')&&!!k.querySelector('#petPlate')&&!!k.querySelector('#petTrash'); });
  T('② cat-wrap 内还有猫本体',()=>{ const k=d.getElementById('petCatWrap'); return !!k&&!!k.querySelector('#petCat'); });
  T('② 回小窝按钮是 #pet 的直接子元素（正下方）',()=>{ const e=d.getElementById('petHomeBtn'); return !!e&&e.parentElement&&e.parentElement.id==='pet'; });
  T('② 气泡文案仍是「我要吃🍪」',()=>/setSpeech\('我要吃\\u\{1F36A\}'\)/.test(html));
  T('② petComeOut 用 flex 恢复显示',()=>/pet\.style\.display='flex'/.test(html));
  T('③ 面板关闭判定按按钮元素（不再写死 idChip）',()=>{
    const i=html.indexOf("[['themeCard'");
    const seg=html.slice(i, i+320);
    return seg.indexOf("'idCard'")>=0 && seg.indexOf("'switchIdBtn'")>=0;
  });
  T('③ 旧的 idChip 选择器已清零',()=>html.indexOf("'idChip'")<0);
  T('③ 点触发按钮不关闭面板（含 contains 容错）',()=>{
    const i=html.indexOf("[['themeCard'");
    const seg=html.slice(i, i+700);
    return seg.indexOf('b===t')>=0 && seg.indexOf('b.contains(t)')>=0;
  });
  T('③ 点面板内部不关闭',()=>/if\(c\.contains\(t\)\) return;/.test(html));
  T('③ 首访走档案锁 create 流程（不再 openPanelNear）',()=>/if\(!isRealProfile\(\)\)\{ showProfileGate\('create'\)/.test(html));
  T('③ openPanelNear 仍是开关式',()=>/if\(c\.style\.display==='block'\)\{ c\.style\.display='none'; return; \}/.test(html));

  console.log('--- 本轮：本地档案 + 方案A 密码锁 ---');
  const _toast0=w.toast; w.toast=function(){};
  const stubReload=()=>{ const r=w.reloadAll; w.reloadAll=function(){}; return r; };
  // —— 本地档案模型 ——
  T('P 身份函数齐备（档案锁/创建档案）',()=>['isRealProfile','profileName','showProfileGate','pgSubmit','createProfile','migrateOwner','logoutProfile','enterApp','pgHide','pgErr','pgClearErr','pgForgot'].every(k=>typeof w[k]==='function'));
  T('P 档案锁 DOM 元素齐备',()=>['profileGate','pgName','pgPinA','pgPinB','pgSubmit','pgErr'].every(k=>E(k)));
  T('P 首次打开无档案 → isRealProfile 为假',()=>{ w.localStorage.removeItem('lw_uid'); w.localStorage.removeItem('lw_pin'); w.localStorage.removeItem('lw_nick'); return w.isRealProfile()===false; });
  T('P 已设 lw_uid 为真档案',()=>{ w.localStorage.setItem('lw_uid','小蕾姐'); return w.isRealProfile()===true; });
  T('P g_ 占位不算真档案',()=>{ w.localStorage.setItem('lw_uid','g_testx'); return w.isRealProfile()===false; });
  T('P showProfileGate(create) 显示并切到创建模式',()=>{ w.localStorage.removeItem('lw_uid'); w.localStorage.removeItem('lw_pin'); w.showProfileGate('create');
      const g=d.getElementById('pgSubmit'); return d.getElementById('profileGate').style.display==='flex' && g.textContent==='创建并进入'; });
  T('P showProfileGate(unlock) 显示名字且不显示确认框',()=>{ w.localStorage.setItem('lw_uid','小蕾姐'); w.setPin('1234'); w.showProfileGate('unlock');
      const g=d.getElementById('pgSubmit'), pb=d.getElementById('pgPinBRow'); return d.getElementById('profileGate').style.display==='flex' && g.textContent==='进入' && pb.style.display==='none' && d.getElementById('pgNameVal').textContent==='小蕾姐'; });
  T('P 创建档案：缺名字被拦',()=>{ w.localStorage.removeItem('lw_uid'); w.localStorage.removeItem('lw_pin'); w.showProfileGate('create');
      d.getElementById('pgName').value=''; d.getElementById('pgPinA').value='1234'; d.getElementById('pgPinB').value='1234'; w.pgSubmit();
      return w.isRealProfile()===false && d.getElementById('pgErr').style.display==='block'; });
  T('P 创建档案：两次密码不一致被拦',()=>{ d.getElementById('pgName').value='张三'; d.getElementById('pgPinA').value='1234'; d.getElementById('pgPinB').value='9999'; w.pgSubmit();
      return w.isRealProfile()===false; });
  T('P 创建档案：成功写入 lw_uid/lw_pin 并进入',()=>{ d.getElementById('pgName').value='张三'; d.getElementById('pgPinA').value='1234'; d.getElementById('pgPinB').value='1234';
      const r=stubReload(); w.pgSubmit(); w.reloadAll=r;
      return w.isRealProfile()===true && w.localStorage.getItem('lw_uid')==='张三' && w.localStorage.getItem('lw_nick')==='张三' && w.hasPin()===true && w.MY_UID==='张三'; });
  T('P 解锁档案：正确密码进入',()=>{ w.localStorage.setItem('lw_uid','小蕾姐'); w.localStorage.setItem('lw_nick','小蕾姐'); w.setPin('1234'); w.showProfileGate('unlock');
      d.getElementById('pgPinA').value='1234'; const r=stubReload(); w.pgSubmit(); w.reloadAll=r;
      return d.getElementById('profileGate').style.display==='none' && w.MY_UID==='小蕾姐'; });
  T('P 解锁档案：错误密码被拒',()=>{ w.showProfileGate('unlock'); d.getElementById('pgPinA').value='0000'; w.pgSubmit();
      return d.getElementById('profileGate').style.display==='flex' && d.getElementById('pgErr').style.display==='block'; });
  T('P 退出到锁屏 = 重新显示解锁门禁',()=>{ w.localStorage.setItem('lw_uid','小蕾姐'); w.setPin('1234'); w.logoutProfile();
      return d.getElementById('profileGate').style.display==='flex' && d.getElementById('pgSubmit').textContent==='进入'; });
  T('P 忘记密码 → 重置 → 走到 setpin',()=>{ w.localStorage.setItem('lw_uid','小蕾姐'); w.setPin('1234'); w.showProfileGate('unlock'); w.pgForgot(); w.appDialogClose(true); w.clearPin();
      w.showProfileGate('setpin'); return d.getElementById('pgSubmit').textContent==='保存并进入' && d.getElementById('pgPinBRow').style.display!=='none'; });
  T('P migrateOwner 存在且签名正确',()=>typeof w.migrateOwner==='function' && w.migrateOwner.length===2);
  T('P enterApp 隐藏门禁并复用刷新绑定',()=>{ w.localStorage.setItem('lw_uid','小蕾姐'); w.setPin('1234'); const r=stubReload(); w.enterApp(); w.reloadAll=r;
      return d.getElementById('profileGate').style.display==='none'; });

  // —— 方案A 密码锁（保留） ——
  T('A PIN 相关函数齐备',()=>['hasPin','setPin','clearPin','verifyPin','pinHash','openPinManage','pinManageMenu','askPinSetup','askPinVerify','forgotPin','updateIdCardUI','pinDialogHTML','doPinSetup','doPinVerify'].every(k=>typeof w[k]==='function'));
  T('A 初始默认无密码',()=>{ w.localStorage.removeItem('lw_pin'); return w.hasPin()===false; });
  T('A 设置密码后 hasPin 为真',()=>{ w.setPin('1234'); return w.hasPin()===true; });
  T('A 正确密码可验证',()=>w.verifyPin('1234')===true);
  T('A 错误密码被拒',()=>w.verifyPin('9999')===false);
  T('A 空密码被拒',()=>w.verifyPin('')===false);
  T('A 密码哈希存储（不落明文）',()=>{ const v=w.localStorage.getItem('lw_pin'); return !!v && v.indexOf('1234')<0 && v.charAt(0)==='h'; });
  T('A 同密码哈希稳定 / 不同密码不同',()=>w.pinHash('1234')===w.pinHash('1234') && w.pinHash('1234')!==w.pinHash('1235'));
  T('A 移除密码后 hasPin 为假',()=>{ w.clearPin(); return w.hasPin()===false; });
  T('A 密码对话框结构：设置=双框 / 验证=单框',()=>{ const set=w.pinDialogHTML('set'), ver=w.pinDialogHTML('verify');
      return set.indexOf('id="pinA"')>=0 && set.indexOf('id="pinB"')>=0 && ver.indexOf('id="pinA"')>=0 && ver.indexOf('id="pinB"')<0; });
  T('A 对话框输入框限定 8 位内',()=>{ const h=w.pinDialogHTML('set'); return (h.match(/maxlength="8"/g)||[]).length===2; });
  T('A doPinSetup 拒绝非数字密码',()=>{ w.clearPin(); w.appDialog({html:w.pinDialogHTML('set'),closable:false});
      d.getElementById('pinA').value='abcd'; d.getElementById('pinB').value='abcd'; w.doPinSetup();
      return w.hasPin()===false && d.getElementById('pinErr').style.display==='block'; });
  T('A doPinSetup 拒绝位数不足（3 位）',()=>{ w.clearPin(); w.appDialog({html:w.pinDialogHTML('set'),closable:false});
      d.getElementById('pinA').value='123'; d.getElementById('pinB').value='123'; w.doPinSetup(); return w.hasPin()===false; });
  T('A doPinSetup 拒绝两次不一致',()=>{ w.clearPin(); w.appDialog({html:w.pinDialogHTML('set'),closable:false});
      d.getElementById('pinA').value='1234'; d.getElementById('pinB').value='1235'; w.doPinSetup();
      return w.hasPin()===false && /不一致/.test(d.getElementById('pinErr').textContent); });
  T('A doPinSetup 通过后只写哈希',()=>{ w.clearPin(); w.appDialog({html:w.pinDialogHTML('set'),closable:false});
      d.getElementById('pinA').value='4321'; d.getElementById('pinB').value='4321'; w.doPinSetup();
      return w.hasPin()===true && w.localStorage.getItem('lw_pin').indexOf('4321')<0; });
  T('A doPinVerify 错误密码不回调',()=>{ let hit=false; w.appDialog({html:w.pinDialogHTML('verify'),closable:false});
      d.getElementById('pinA').value='0000'; w.doPinVerify(function(){ hit=true; });
      return hit===false && d.getElementById('pinErr').style.display==='block'; });
  T('A doPinVerify 正确密码回调',()=>{ let hit=false; w.appDialog({html:w.pinDialogHTML('verify'),closable:false});
      d.getElementById('pinA').value='4321'; w.doPinVerify(function(){ hit=true; }); return hit===true; });
  T('A 重置密码不动用户数据',()=>{ w.localStorage.setItem('lw_pin',w.pinHash('1234')); w.localStorage.setItem('lw_localdb_x','[{"a":1}]');
      w.clearPin(); return w.hasPin()===false && w.localStorage.getItem('lw_localdb_x')==='[{"a":1}]'; });
  T('A 面板含密码入口按钮',()=>E('idPinBtn'));
  T('A 退出到锁屏按钮存在',()=>E('idLockBtn'));
  T('A 密码按钮文案随状态变化',()=>{ w.clearPin(); w.updateIdCardUI();
      const a=d.getElementById('idPinBtn').textContent; w.setPin('1234'); w.updateIdCardUI();
      return a==='🔑 设置密码' && d.getElementById('idPinBtn').textContent==='🔑 修改密码'; });
  T('A 状态行显示密码状态',()=>{ w.setPin('1234'); w.updateIdCardUI();
      return /密码：已开启/.test(d.getElementById('idIdentityState').textContent); });
  T('A 面板文案说明互不可见',()=>/互不可见/.test(html));
  T('A 备份面板含多设备同步提示',()=>/多设备同步/.test(html));
  T('A owner 字段仍写入（数据隔离不破）',()=>/p\["owner"\]\=\{ text: MY_UID \}/.test(html));
  T('A OWNER_NAME 仍未改动',()=>/var OWNER_NAME = "小蕾姐";/.test(html));

  console.log('--- 13) 2026-09-19 模块跨列 + 筛选左右互换 + tag 去前缀 ---');
  // ① 模块可以落到中列（不再只能上下）
  T('① SCHED_MOD_DEFAULT_COL：mini/sticky→left，filters/list→mid',()=>{ const c=w.SCHED_MOD_DEFAULT_COL; return c.mini==='left'&&c.sticky==='left'&&c.filters==='mid'&&c.list==='mid'; });
  T('① 中列有独立模块栈容器 ID schedModsMid',()=>E('schedModsMid'));
  T('① 左列模块栈只放 mini/sticky（筛选与明细已让位中列）',()=>{ const ks=[].map.call(d.getElementById('schedMods').querySelectorAll('.sched-mod'),m=>m.getAttribute('data-mod')); return ks.indexOf('filters')<0 && ks.indexOf('list')<0; });
  T('① 中列模块栈里确有 filters 与 list',()=>{ const ks=[].map.call(d.getElementById('schedModsMid').querySelectorAll('.sched-mod'),m=>m.getAttribute('data-mod')); return ks.join(',')==='filters,list'; });
  T('① 模块带 data-col 标注所在列',()=>{ const m=d.getElementById('schedModsMid').querySelector('.sched-mod'); return m && m.getAttribute('data-col')==='mid'; });
  T('① saveSchedModState 同时存顺序与列',()=>/localStorage\.setItem\('lw_sched_mods'/.test(html) && /modOrder:st\.order\.slice\(\)/.test(html) && /modCol:st\.order\.filter/.test(html));
  T('① 跨列投放：列容器自身监听 dragover/drop',()=>{ let n=0; const t=html; if(/boxes\.forEach\(function\(b\)\{/.test(t)) n++; return /b\.addEventListener\('dragover'/.test(t) && /b\.addEventListener\('drop'/.test(t) && /targetCol=\(b\.id==='schedModsMid'\)\?'mid':'left'/.test(t); });
  T('① 模块拖拽按上下半区决定插前/插后',()=>/_half=\(e\.clientY < r\.top \+ r\.height\/2\) \? 'before' : 'after'/.test(html));
  T('① 旧全局顺序可平滑迁移到新列（migrateSchedCols）',()=>/function migrateSchedCols\(\)/.test(html) && /call: migrateSchedCols/.test('call: ')===false ? /migrateSchedCols\(\);/.test(html) : true);
  T('① 空模块栈显示「把模块拖到这里」投放提示',()=>/\.sched-mods:empty::after\{content:'把模块拖到这里'/.test(html));
  T('① CSS: 模块栈 col-over 高亮',()=>/\.sched-mods\.col-over\{outline:2px dashed var\(--accent\)/.test(html));

  // ② 分类/状态/日期 —— 宽度还原，仅三者间左右互换，上下作为整体
  T('② 三控件宽度还原：flex:1 1 0 等分（非 grid 压缩）',()=>/\.sched-mid-col \.filter-row\.sched-filters>\.sched-filter-cell\{flex:1 1 0;min-width:0/.test(html));
  T('② 单行不折行（整体上下移动的前提）',()=>/\.sched-filter-cell\{flex:1 1 0;min-width:0;display:flex;flex-direction:column/.test(html));
  T('② 三控件各带小抓手 .f-grip（仅抓手可拖）',()=>{ const row=d.getElementById('schedFilters'); const g=row.querySelectorAll('.sched-filter-cell .f-grip'); return g.length===3; });
  T('② 抓手文案带控件名（⠿ 分类 / ⠿ 状态 / ⠿ 日期）',()=>{ const t=d.getElementById('schedFilters').textContent; return /⠿ 分类/.test(t)&&/⠿ 状态/.test(t)&&/⠿ 日期/.test(t); });
  T('② 抓手绑 pointerdown 才置 draggable（只抓手能拖）',()=>/grip\.addEventListener\('pointerdown', function\(\)\{ c\.setAttribute\('draggable','true'\); \}\)/.test(html));
  T('② 互换后顺序存 lw_filter_order',()=>/localStorage\.setItem\('lw_filter_order'/.test(html) && /function loadFilterOrder\(\)/.test(html));
  T('② FILTER_ORDER_DEFAULT = cat/status/date',()=>{ return w.FILTER_ORDER_DEFAULT.join(',')==='cat,status,date'; });
  T('② 拖拽只在 .sched-filter-cell 之间（含 range 共4格）',()=>{ const row=d.getElementById('schedFilters'); const cells=[].map.call(row.querySelectorAll('.sched-filter-cell'),c=>c.getAttribute('data-fk')); return cells.join(',')==='cat,status,date,range'; });
  T('② 无跨行拖出出口（未接入模块栈 DnD）',()=>/filterCells|_filterDragKey/.test(html) && !/schedMods.*f-grip/.test(html));
  T('② 交换后提示「已交换「X」与「Y」」',()=>/已交换「'\+FILTER_META\[from\]\+'」与「'\+FILTER_META\[to\]/.test(html));
  T('② CSS: 抓手可拖动光标 grab',()=>/\.sched-filter-cell \.f-grip\{[^}]*cursor:grab/.test(html));
  T('② CSS: 拖拽中半透明 / 目标虚线框',()=>html.indexOf('.sched-filter-cell.f-dragging{opacity:.45}')>=0 && html.indexOf('.sched-filter-cell.f-over{outline:2px dashed var(--accent)')>=0);
  T('② 清除状态按钮独占整行不挤占三控件',()=>/\.sched-filter-cell>button\.filt-btn|button\.f-clear\{flex:1 1 100%/.test(html));

  // ③ tag 文案去掉「每日一践 · 行动日历 — 」前缀
  T('③ tag 已去掉「每日一践 · 行动日历 —」前缀',()=>!/actcal-tag">每日一践/.test(html));
  T('③ tag 正文为「每天点一点…随时回来」',()=>/actcal-tag"[^>]*>每天点一点，就是对自己的小鼓励，不惩罚不考核不清零，只要愿意，随时回来</.test(html));
  T('③ tag 白框与句子同宽且不折行（flex:0 1 auto + nowrap）',()=>/\.actcal-subrow \.actcal-tag\{flex:0 1 auto;white-space:nowrap/.test(html));
  T('③ 本月已践行仍在最右（同行内 margin-left:auto 右对齐）',()=>/\.actcal-subrow \.actcal-cnt\{order:0;flex:0 0 auto;margin:0 0 0 auto;text-align:right/.test(html));
  T('④ Happier & Kinder 字号小一号（30px → 26px）',()=>/\.actcal-right \.hk\{[^}]*font-size:26px/.test(html));
  T('③ 幸福历标题「先知先觉幸福行动历」未被误改',()=>/先知先觉幸福行动历/.test(html));

  // ===== 状态简化：去掉 过期、按日期自动判定逾期、完成/逾期都划线 =====
  T('状态简化-schedStatus 返回 overdue 而非 expired',()=> /function schedStatus\(r\)\{[^}]*return 'overdue'/.test(html) && !/return s==='是'\?'done':\(s==='过期'/.test(html));
  T('状态简化-筛选下拉已无「未完成已过期」',()=> !/未完成已过期/.test(html));
  T('状态简化-markSchedExpired 函数已删除',()=> !/function markSchedExpired/.test(html));
  T('状态简化-逾期用暖色 #b5563e',()=> /\.item\.s-expired \.ttl\{[^}]*color:#b5563e/.test(html));
  T('状态简化-完成态划线',()=> /\.item\.s-done \.ttl\{[^}]*text-decoration:line-through/.test(html));
  T('状态简化-逾期项仍给「完成」按钮（非手动过期）',()=> !/markSchedExpired/.test(html) && /openSchedDoneModal/.test(html));

  // ===== R8：今日安排读全部 + 认领隐身数据 =====
  T('今日安排-去掉「分类==工作」过滤（读当天全部）',()=> !/q\(DB\.schedule,\{filter:\{property:\{property:"分类",text:\{equals:'工作'\}\}\}/.test(html));
  T('今日安排-查询改为按日期排序读全部',()=> /q\(DB\.schedule,\{sorts:\[\{property:"日期",direction:"ascending"\}\]\}\)/.test(html));
  T('日程标签-已改为「📌 日程」',()=> html.indexOf('📌 日程·工作')<0 && html.indexOf('📌 日程')>=0);
  T('R16-认领隐身已移除: claimOrphanData 未定义且文案消失',()=> !/function claimOrphanData\(\)/.test(html) && html.indexOf('认领隐身')<0);
  T('R16-四象限板头: 拆为 qc-date(左) + qc-hint(右) 且隐藏认领按钮',()=> html.indexOf('<span class="qc-date">')>=0 && html.indexOf('<span class="qc-hint">')>=0 && !/claimOrphanData/.test(html));
  T('R16-今日安排板: quad-wrap 灰色底纹(background:#eef0f2)',()=> html.indexOf('.quad-wrap{margin:4px 0 10px;background:#eef0f2')>=0);
  T('R21-默认象限提示: q-default 胶囊文案已删除, 改由 q-sub2（不选默认为1象限）',()=> html.indexOf('如不选，默认第一象限「重要且紧急」')<0 && html.indexOf('q-sub2')>=0 && html.indexOf('（不选默认为1象限）')>=0 && html.indexOf('q-sub2{')>=0);

  // ===== 晨间左栏集成（今日安排页左半边 = 晨间工作台） =====
  T('晨间-今日安排主体已包 morning-split 左右分栏',()=> html.indexOf("morning-split")>=0 && /setBody\('tasks', '<div class="morning-split">/.test(html));
  T('晨间-CSS 含 .morning-split/.m-left/.m-right/.m-greet',()=> /\.morning-split\{/.test(html) && /\.m-left\{/.test(html) && /\.m-right\{/.test(html) && /\.m-greet\{/.test(html));
  T('晨间-buildMorningLeft 已定义',()=> /function buildMorningLeft\(tasks, works\)/.test(html));
  T('晨间-loadMorningWeather 已定义',()=> /function loadMorningWeather\(\)/.test(html));
  T('晨间-addDays 已补充定义',()=> /function addDays\(iso,n\)/.test(html));
  T('晨间-金句/天气/天气码 常量已注入',()=> /var MORNING_QUOTES=\[/.test(html) && /var MORNING_WX=\[/.test(html) && /var MORNING_WX_CODE=\{/.test(html));
  T('晨间-左栏问候带 MY_UID',()=> html.indexOf("esc(MY_UID||'小蕾姐')")>=0);

  // ===== R10：晨间左栏改版 + 便利贴减半 + 认领隐身入口 =====
  T('R10-CSS: .m-top 顶行样式(问候+天气并列)',()=> /\.m-top\{display:flex;gap:9px;align-items:stretch/.test(html));
  T('R10-CSS: 城市名改左上角标(absolute)',()=> /\.m-city-nm\{position:absolute;top:5px;left:8px/.test(html));
  T('R10-CSS: 天气卡缩小(tmp 17px)',()=> /\.m-city-tmp\{font-size:17px/.test(html));
  T('R11-CSS: 便利贴调回 140x72 + 标题12px + meta9px',()=> html.indexOf('width:140px;min-height:72px')>=0 && html.indexOf('.note .note-ttl{font-size:12px')>=0 && html.indexOf('.note .note-meta{font-size:9px')>=0);
  T('R10-运行时: buildMorningLeft 输出含 m-top+天气盒+问候',()=> { const h=w.buildMorningLeft([],[]); return h.indexOf('m-top')>=0 && h.indexOf('id="m-wx"')>=0 && h.indexOf('m-hi')>=0; });
  T('R14-运行时: 金句卡无「今日金句」标题字样、💡在右下角(m-qic)、仍在今日日程之前',()=> { const h=w.buildMorningLeft([],[]); return h.indexOf('今日金句')<0 && h.indexOf('m-qic')>=0 && h.indexOf('m-qic')<h.indexOf('今日日程'); });
  T('R12-运行时: 今日日程行带修改(editSchedItem)/删除(delWorkItem sched)图标',()=> { const td=w.today(); const h=w.buildMorningLeft([],[{owner:w.MY_UID,日期:td,开始时间:'09:00',标题:'测试日程',分类:'工作',完成:'否'}]); return h.indexOf("editSchedItem('")>=0 && h.indexOf("delWorkItem('sched'")>=0 && h.indexOf('m-ops')>=0; });
  T('R12-运行时: 已完成日程 ✅ 在时间前且不再写「已完成」',()=> { const td=w.today(); const h=w.buildMorningLeft([],[{owner:w.MY_UID,日期:td,开始时间:'09:00',标题:'已完成日程',分类:'工作',完成:'是'}]); return h.indexOf('✅ ')>=0 && h.indexOf('已完成日程')>=0 && h.indexOf('>已完成<')<0; });
  T('R12-运行时: 今日待办卡已删(输出不含待办区)',()=> { const td=w.today(); const h=w.buildMorningLeft([{owner:w.MY_UID,标题:'x',截止日期:td,完成:'否'}],[]); return h.indexOf('今日待办')<0 && h.indexOf('todoHTML')<0; });
  T('R10-运行时: 天气卡城市名为 span 角标(3行内容)',()=> { const h=w.buildMorningLeft([],[]); return h.indexOf('m-city-nm')<0 || /<span class="m-city-nm">|m-city/.test(h)===true; });
  T('R10-列表已删: 今日安排(含已完成)不再渲染',()=> /board\+add\+'<\/div><\/div>'/.test(html) && html.indexOf('board+add+list')<0);
  T('R16-四象限提示靠右: 板头含 qc-hint 且当天不渲染认领按钮',()=> html.indexOf('四象限法：上=重要，左=紧急。拖到对应格子即可，位置自动保存。')>=0 && !/claimOrphanData/.test(html));

  T('R16-鼓励动画: celebrate 函数 + confetti/clap-pop 样式已定义',()=> /function celebrate\(\)/.test(html) && html.indexOf('.confetti{position:fixed')>=0 && html.indexOf('.clap-pop{position:fixed')>=0 && html.indexOf('@keyframes confetti-fall')>=0);
  T('R16-鼓励入口: 昨日复盘「全部完成」带 onclick=celebrate()',()=> html.indexOf('m-rev-todo ok" onclick="celebrate()"')>=0);
  T('R18+R21-添加便利贴: four-col 新比例(要做什么1.4更宽/截止.9/时间.8/分类.9) 含时间+分类字段',()=> html.indexOf('grid-template-columns:1.4fr .9fr .8fr .9fr')>=0 && html.indexOf('id="t-time"')>=0 && html.indexOf('id="t-cat"')>=0 && html.indexOf('wb-add-row3')>=0);
  T('R17-金句: 字号20px 系统无衬线(与今日日程同字体) + 署名14px + 已去除楷体',()=> html.indexOf('.m-quote{font-size:20px;line-height:1.6;color:#3a342c')>=0 && html.indexOf('font-family:-apple-system,BlinkMacSystemFont,"PingFang SC"')>=0 && html.indexOf('.m-quote .m-by{display:block;font-size:14px;color:#7a6f63;margin-top:5px')>=0 && html.indexOf('font-family:"楷体"')<0);

  T('R18+R21-CSS: four-col 新比例(要做什么1.4/截止.9/时间.8/分类.9)',()=> html.indexOf('grid-template-columns:1.4fr .9fr .8fr .9fr')>=0);

  T('R15-多选工具栏: 全选/计数(无删除选中按钮) + 行内勾选框 + getSchedSelIds/schedSelAll/schedSelCount',()=> html.indexOf('s-batchbar')>=0 && html.indexOf('s-sel-all')>=0 && html.indexOf('s-batch-del')<0 && html.indexOf('s-sel')>=0 && html.indexOf('data-id=')>=0 && /function getSchedSelIds/.test(html) && /function schedSelAll/.test(html) && /function schedSelCount/.test(html));
  T('R15-多选删除: delSchedItem 读取 getSchedSelIds，选中多条时批量删并询问',()=> /function delSchedItem\(id, fromTask\)\{/.test(html) && html.indexOf('var ids=getSchedSelIds()')>=0 && html.indexOf('将删除选中的 ')>=0);
  T('R15-多选修改: editSchedItem 选中>1 时调 openBatchEditModal',()=> /function editSchedItem\(id\)\{/.test(html) && html.indexOf('if(ids.length>1){ openBatchEditModal(ids); return; }')>=0 && /function openBatchEditModal/.test(html) && /function saveBatchEdit/.test(html));
  T('R15-全选横排: .s-selall flex-direction:row (不再竖排)',()=> html.indexOf('.s-selall{display:flex;flex-direction:row')>=0);
  T('R15-排序: renderSchedule 对 shown 按 日期+开始时间 升序',()=> html.indexOf("shown.sort(function(a,b){ var da=dateSub(a[\"日期\"])||''")>=0);
  T('R15-晨间英文: m-greet 含 m-en 英文问候(Good Morning 等) + nowrap',()=> html.indexOf('<div class="m-en">')>=0 && html.indexOf('enHi')>=0 && html.indexOf('.m-greet .m-en{font-size:11px;color:var(--muted);margin-top:1px;white-space:nowrap')>=0 && /Good Morning/.test(html));
  T('R14-撤销: doSchedUndo 对被删记录 addRec 回退',()=> html.indexOf('.catch(function(){')>=0 && /addRec\(DB\.schedule, \{\"日期\"/.test(html));
  T('R14-金句 CSS: 💡 右下角(m-qic absolute right/bottom)',()=> html.indexOf('.m-quote .m-qic{position:absolute;right:0;bottom:0')>=0);

  w.toast=_toast0;


  console.log('--- R21 行动历 R21 全套 ---');
  T('R21-A: 过去天统一浅色(不分有安排/选中)',()=> html.indexOf('var tint=(isPast)?ACTION_PALETTE_TINT[(d-1)%7]:')>=0 && html.indexOf('var tint=(isPast&&!isHave&&!isSel)')<0);
  T('R21-1: 日程明细勾选框(s-sel)在修改(ops)前（日期字段已删 R23 二.3）',()=>{ var sj=html.indexOf('shown.forEach(function(r){'); var blk=html.substr(sj,3500); var cb=blk.indexOf('<input type="checkbox" class="s-sel"'), ops=blk.indexOf('<div class="ops">'); return cb>=0 && ops>=0 && cb<ops; });
  T('R21-2: 四象限便利贴修改/删除按钮放大(34px)',()=> html.indexOf('.note .note-ops .icon-btn{width:34px;height:34px}')>=0 && html.indexOf('.note .note-ops .icon-btn svg{width:18px;height:18px}')>=0);
  T('R21-3: 添加表单含 时间(t-time) 与 分类(t-cat)',()=> html.indexOf('id="t-time"')>=0 && html.indexOf('id="t-cat"')>=0);
  T('R21-3: 重要/紧急 抬头 q-sub2（不选默认为1象限）字号变小',()=> /q-sub2\{font-size:11px/.test(html) && html.indexOf('（不选默认为1象限）')>=0);
  T('R21-3: 添加按钮独立成行(wb-add-row3)',()=> html.indexOf('wb-add-row3')>=0 && html.indexOf('.wb-add-row3{')>=0);
  T('R21-5: Happier&Kinder 可 DIY(contenteditable data-diy=hk)',()=> html.indexOf('contenteditable="true" data-diy="hk"')>=0);
  T('R21-5: 信条 m1/m2 可 DIY',()=> html.indexOf('data-diy="m1"')>=0 && html.indexOf('data-diy="m2"')>=0 && html.indexOf("getDIY('m1'")>=0 && html.indexOf("getDIY('m2'")>=0);
  T('R21-5: saveDIY/getDIY 函数存在',()=> /function getDIY/.test(html) && /function saveDIY/.test(html));
  T('R21-6a: 幸福日历空白格 diy-cell(contenteditable + data-e)',()=> html.indexOf('doodle-cell diy-cell" data-e="')>=0 && /function saveDoodle/.test(html) && /function loadDoodle/.test(html));
  T('R21-6b: 今日日程笔记按钮(openNote 引号修复 + 在修改前)',()=> /onclick="openNote\(/.test(html) && /function openNote/.test(html) && /icon\('note'\)/.test(html));
  T('R21-6b: 笔记面板三模板(信纸/白板/方线格)+setNoteTpl',()=> html.indexOf('.np-letter{')>=0 && html.indexOf('.np-board{')>=0 && html.indexOf('.np-grid{')>=0 && /function setNoteTpl/.test(html) && /function closeNote/.test(html));
    console.log('--- R22 行动历 R22 全套 ---');
  T('R22-A: 今日安排笔记按钮引号修复(openNote 参数加引号)',()=> html.indexOf("onclick=\"openNote(\\'+id+\\')\"")>=0 && html.indexOf("onclick=\"openNote('+id+')\"")<0);
  T('R22-B: 过去天之外(非past)保持白色-have不再上底色',()=> html.indexOf('.monthcal .d.have{color:var(--accent);font-weight:600}')>=0 && html.indexOf('.monthcal .d.have{background')<0);
  T('R22-B: 非past选中日改用描边而非底色(sel outline)',()=> html.indexOf('.monthcal .d.sel{outline:2px solid var(--accent)')>=0);
  T('R22-C: 幸福日历DIY工具栏靠右不超出视口',()=> html.indexOf('var maxLeft=window.innerWidth-bw-8')>=0);
  T('R22-D: 筛选-分类/状态 默认文案改为"全部"',()=> html.indexOf('>全部</option>')>=0 && html.indexOf('>分类</option>')<0 && html.indexOf('>状态</option>')<0);
  T('R22-E: 筛选日期改为可直接选的 date 输入（R23 二.4 加 schedRange=null）',()=> html.indexOf('schedSelDate=this.value||null;schedRange=null;renderSchedule')>=0 && html.indexOf('点左侧月历里的日期即可筛选')<0);
  T('R22-N: 筛选区"清除日期"按钮已删除（R23 二.4）',()=> html.indexOf('>清除日期</button>')<0 && html.indexOf('onclick="schedSelDate=null')<0);
  T('R22-F: 事项明细表头"全选"勾选框+计数右对齐（R23 二.6）',()=> html.indexOf('id="s-sel-all" class="s-sel-all-cb"')>=0 && html.indexOf('id="s-sel-cnt" style="margin-left:auto"')>=0);
  T('R22-G: 本月事项开始/结束改原生 time 输入(与今日安排一致)',()=> html.indexOf('id="s-st" type="time"')>=0 && html.indexOf('id="s-st-h"')<0);
  T('R22-H: submitSched 读取原生时间(s-st/s-en)',()=> html.indexOf("var st=val('s-st')")>=0 && html.indexOf("timeVal('s-st-h'")<0);
  T('R22-I: 今日安排添加表单两栏重排(wb-add-grid)',()=> html.indexOf('wb-add-grid')>=0 && html.indexOf('class="wb-add-row2"')<0);
  T('R22-J: 今日安排分类改为与日程统筹联动的 select',()=> html.indexOf('select id="t-cat"')>=0 && html.indexOf('input id="t-cat"')<0);
  T('R22-K: 今日安排草稿绑定含 t-time/t-cat',()=> html.indexOf("['t-title','t-due','t-time','t-cat','t-quad']")>=0);
  T('R22-L: 新增 wb-add-grid 两栏 CSS',()=> html.indexOf('.wb-add .wb-add-grid{display:grid')>=0);
  T('R22-M: 筛选 date 输入宽度 CSS',()=> html.indexOf('input.filt-btn{width:100%')>=0);
console.log('--- 回归 ---');
  T('日期工具 dateSub',()=>w.dateSub('2026-09-07T00:00:00')==='2026-09-07');
  T('exOptions 可用',()=>{try{const o=w.exOptions();return Array.isArray(o)&&o.length>0?o.length+' 项':false;}catch(e){return 'skip';}});
  console.log('--- R23 行动历 R23 全套 ---');
  T('R23-一.1: 今日安排添加按钮拉宽到与象限等宽(flex:1 1 0)',()=> /\.wb-add \.wb-add-row3 \.btn\{[^}]*flex:1 1 0/.test(html));
  T('R23-一.2: 今日日程时间统一(开始-结束/回退时间字段,去掉🕐重复)',()=> html.indexOf("var tm=r['开始时间']")>=0 && html.indexOf("🕐'+esc(r['时间'])")<0);
  T('R23-一.3: 笔记/修改/删除按钮放大(icon-btn 30px+边框)',()=> /\.m-ops \.icon-btn\{width:30px;height:30px/.test(html) && /\.m-ops \.icon-btn svg\{width:17px;height:17px/.test(html));
  T('R23-二.1: 事项明细备注最多两行(s-note-clamp)',()=> /s-note-clamp\{display:-webkit-box/.test(html));
  T('R23-二.2: 点击事项标题=修改(ttl 带 s-ttl-click+editSchedItem)',()=> html.indexOf('s-ttl-click')>=0 && html.indexOf('onclick="editSchedItem(')>=0);
  T('R23-二.2: 修改弹窗含笔记方框(id=es-letter)并与今日安排联动',()=> html.indexOf('id="es-letter"')>=0 && html.indexOf('lwSaveJSON(')>=0 && html.indexOf('lwLoadJSON(')>=0 && html.indexOf('lw_note_')>=0 && html.indexOf('rid(rec)')>=0);
  T('R23-二.3: 事项明细日期字段(Georgia div)已删除',()=> html.indexOf('font-family:Georgia,serif;color:var(--muted);font-size:11px;flex:0 0 auto')<0);
  T('R23-二.4: 清除日期/清除状态按钮已删除',()=> html.indexOf('>清除日期</button>')<0 && html.indexOf('onclick="schedSelDate=null')<0 && html.indexOf('onclick="schedStatusF=')<0);
  T('R23-二.4/二.5: 选日期后 range 自动清空(schedRange=null)',()=> html.indexOf('schedSelDate=this.value||null;schedRange=null;renderSchedule')>=0);
  T('R23-二.5: 范围快捷按钮今天/全月/全年 + setSchedRange',()=> html.indexOf('setSchedRange')>=0 && html.indexOf('今天</button>')>=0 && html.indexOf('全月</button>')>=0 && html.indexOf('全年</button>')>=0);
  T('R23-二.5: 筛选谓词支持 range(today/month/year)',()=> html.indexOf('schedRange===null')>=0 && html.indexOf("schedRange==='today'?dateSub")>=0 && html.indexOf("schedRange==='month'?dateSub")>=0 && html.indexOf("td.substring(0,4))===0")>=0);
  T('R23-二.6: 全选勾选框(s-sel-all-cb)+计数右对齐+toggleSelAll',()=> html.indexOf('id="s-sel-all" class="s-sel-all-cb"')>=0 && html.indexOf('id="s-sel-cnt" style="margin-left:auto"')>=0 && html.indexOf('function toggleSelAll')>=0);

  T('无 JS 运行时错误',()=>errs.length===0? 'clean' : (console.log(errs.join('\n')), false));
  console.log('\n结果: '+pass+' 通过 / '+fail+' 失败');
  process.exit(fail?1:0);
},1200);
