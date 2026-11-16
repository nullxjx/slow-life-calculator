import {cities,defaults,evaluate,calculate} from './model.js';
const $=selector=>document.querySelector(selector);
const form=$('#calculator');
const citySelect=$('#city');
for(const city of Object.keys(cities)){const option=document.createElement('option');option.value=city;option.textContent=city;citySelect.append(option);}
let current=null, chartMode='real';
const colors={生活:'#597c4c',住房:'#97ae7c',医疗:'#c4ad7d',养育:'#c7956c',教育:'#9eafba',生育:'#c8a7ad',照护:'#9a9b78',赡养:'#c1b7a5',应急储备:'#d7dfc5'};
const money=n=>Math.round(n).toLocaleString('zh-CN');
const wan=n=>(n/10000).toLocaleString('zh-CN',{maximumFractionDigits:1});
function syncConditional(){
  const housing=form.elements.housing.value, children=form.elements.children.value;
  const groups=[['#mortgage-fields',housing==='mortgage'],['#existing-fields',children==='existing'],['#birth-fields',children.startsWith('plan')]];
  for(const [id,visible] of groups){const element=$(id);element.hidden=!visible;for(const input of element.querySelectorAll('input'))input.disabled=!visible;}
  $('#housing-label').textContent=housing==='rent'?'全家月租金（元）':'全家月物业 / 维修费（元）';
  $('#housing-hint').textContent=housing==='rent'?'两人或有孩子时适度增加面积':'不含月供；有房贷时单独填写月供';
  for(const group of document.querySelectorAll('[data-for]'))for(const button of group.querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.value===form.elements[group.dataset.for].value));
}
function readState(){
  const s={};
  for(const key of Object.keys(defaults)) {
    const input=form.elements.namedItem(key);
    if(input&&!input.disabled)s[key]=input.value;
  }
  s.monthlyLiving=s.monthlyLiving===''?null:s.monthlyLiving;
  s.monthlyHousing=s.monthlyHousing===''?null:s.monthlyHousing;
  return s;
}
function renderChart(base){
  const points=base.trajectory;
  const W=Math.max(280,Math.round($('#chart').getBoundingClientRect().width)||620),H=208,left=47,right=17,top=16,bottom=31;
  const max=Math.max(...points.map(p=>p[chartMode]),1);
  const nice=Math.ceil(max/10000/4)*10000*4||40000;
  const x=i=>left+(W-left-right)*i/(points.length-1),y=v=>H-bottom-(H-top-bottom)*v/nice;
  const path=points.map((p,i)=>`${i?'L':'M'}${x(i).toFixed(2)},${y(p[chartMode]).toFixed(2)}`).join(' ');
  let svg=`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="presentation"><defs><linearGradient id="fade" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#a8bd88" stop-opacity=".36"/><stop offset="1" stop-color="#d9e5c8" stop-opacity=".12"/></linearGradient></defs>`;
  for(let i=0;i<=4;i++){const v=nice*i/4,Y=y(v);svg+=`<line x1="${left}" x2="${W-right}" y1="${Y}" y2="${Y}" stroke="#e9ecdf" stroke-dasharray="3 5"/><text x="${left-9}" y="${Y+3}" text-anchor="end">${Math.round(v/10000)}万</text>`;}
  svg+=`<path d="${path} L${x(points.length-1)},${H-bottom} L${left},${H-bottom} Z" fill="url(#fade)"/><path d="${path}" fill="none" stroke="#62824f" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`;
  const step=W<420?20:10;
  const tickGap=Math.ceil(55/((W-left-right)/(points.length-1)));
  const ticks=[0,...Array.from({length:Math.floor((base.s.endAge-base.s.age)/step)},(_,i)=>(i+1)*step).filter(i=>i<(points.length-1)-tickGap),points.length-1];
  for(const i of ticks) svg+=`<text x="${x(i)}" y="${H-8}" text-anchor="${i===0?'start':i===points.length-1?'end':'middle'}">${points[i].age}岁</text>`;
  for(let i=0;i<points.length;i++) svg+=`<circle cx="${x(i)}" cy="${y(points[i][chartMode])}" r="6" fill="transparent"><title>${points[i].age}岁：${chartMode==='real'?'今天购买力':'账面余额'}约 ${wan(points[i][chartMode])} 万元</title></circle>`;
  svg+='</svg>';
  $('#chart').innerHTML=svg;
  $('#chart').setAttribute('aria-label',`从${base.s.age}岁到${base.s.endAge}岁，日常资金${chartMode==='real'?'按今天购买力':'按账面金额'}从${wan(base.capital)}万元逐步消耗到零，不含应急储备。`);
  $('#chart-end').textContent=`规划到 ${base.s.endAge} 岁 · 共 ${base.rows.length} 年`;
}
function render(base,pressure){
  const s=base.s;
  $('#total').textContent=Math.ceil(base.total/10000).toLocaleString('zh-CN');
  $('#location-tag').textContent=`${s.city} · ${s.adults===1?'一个人':'两位成人'}`;
  $('#monthly').textContent=`¥ ${money(base.monthly)}`;
  $('#reserve').textContent=`${wan(base.reserve)} 万`;
  $('#stress').textContent=`${Math.ceil(pressure.total/10000).toLocaleString('zh-CN')} 万`;
  const kidLabel=s.kids.length?` · ${s.kids.length} 个${s.children.startsWith('plan')?'计划中的':''}孩子`:'';
  $('#result-context').textContent=`从 ${s.age} 岁到 ${s.endAge} 岁，${s.endAge-s.age} 年的生活${kidLabel}。金额为全家合计。`;
  const real=(1+s.rate/100)/(1+s.inflation/100)-1;
  $('#rate-warning').textContent=`按年利率 ${s.rate}%、生活通胀 ${s.inflation}% 估算，实际利率约 ${(real*100).toFixed(2)}%。${real<0?'利息跑不赢物价，需要把未来涨价也存下来。':'利率是长期假设，未来实际水平仍会变化。'}`;
  $('.pill').lastChild.textContent=s.income>0?' 含你设置的收入补充':' 从现在起，不依赖工作收入';
  renderChart(base);
  const marks=[];
  if(s.children.startsWith('plan')&&s.birthAfter<base.rows.length) marks.push(`${s.age+s.birthAfter} 岁 · 第一个孩子出生`);
  if(s.housing==='mortgage'&&s.mortgageYears>0&&s.mortgageYears<base.rows.length)marks.push(`${s.age+s.mortgageYears} 岁 · 房贷还清`);
  if(s.pension>0&&s.pensionAge<s.endAge)marks.push(`${Math.max(s.age,s.pensionAge)} 岁起 · 计入养老金`);
  if(s.endAge>80)marks.push(`${Math.max(80,s.age)} 岁起 · 增加照护预算`);
  marks.push(`${s.endAge} 岁 · 规划终点（非终身保证）`);
  $('#milestones').replaceChildren(...marks.map(text=>{const el=document.createElement('span');el.textContent=text;return el;}));
  const entries=[...Object.entries(base.pvParts).filter(([,v])=>v>.01),['应急储备',base.reserve]];
  const gross=entries.reduce((n,[,v])=>n+v,0);
  $('#stacked-bar').innerHTML=entries.map(([key,value])=>`<span style="width:${value/gross*100}%;background:${colors[key]}" title="${key}"></span>`).join('');
  $('#breakdown').innerHTML=entries.map(([key,value])=>`<div class="breakdown-item"><i style="background:${colors[key]}"></i><span>${key}</span><strong>${wan(value)} 万</strong></div>`).join('');
  $('#income-offset').hidden=base.incomePV<.01;
  $('#income-offset').textContent=`扣减你设置的收入后，所需本金减少约 ${wan(base.incomePV)} 万元（已折现；超出当年支出的收入不累积）。`;
  const comparison=['成都','长沙','昆明','上海','杭州','北京'].filter(c=>c!==s.city).slice(0,4);
  $('#compare').replaceChildren(...comparison.map(city=>{
    const value=calculate({...s,city,monthlyLiving:null,monthlyHousing:null}).total;
    const btn=document.createElement('button');btn.type='button';btn.dataset.city=city;
    const diff=Math.round((value-base.total)/10000);
    btn.innerHTML=`<span class="compare-city">${city}<span aria-hidden="true">↗</span></span><strong>${Math.ceil(value/10000).toLocaleString('zh-CN')}<small>万</small></strong><span class="delta">${diff<0?'少':diff>0?'多':'相差约'} ${Math.abs(diff)} 万${s.monthlyLiving!==null||s.monthlyHousing!==null?' · 默认预算':''}</span>`;
    btn.setAttribute('aria-label',`切换到${city}，城市默认预算需约${Math.ceil(value/10000)}万元`);return btn;
  }));
}
function update(){
  syncConditional();
  try{
    current=evaluate(readState());
    $('#dashboard').hidden=false;$('#result-error').hidden=true;$('#form-error').hidden=true;
    render(current.base,current.pressure);
  }catch(error){
    current=null;$('#dashboard').hidden=true;$('#result-error').hidden=false;$('#form-error').hidden=false;
    $('#form-error').textContent=error.message;$('#result-error-text').textContent=error.message;
  }
}
function changeCity(city){form.elements.city.value=city;form.elements.monthlyLiving.value='';form.elements.monthlyHousing.value='';update();}
form.addEventListener('submit',event=>event.preventDefault());
form.addEventListener('input',update);
form.addEventListener('change',event=>{if(event.target.name==='city')changeCity(event.target.value);else update();});
for(const group of document.querySelectorAll('[data-for]'))group.addEventListener('click',event=>{const button=event.target.closest('[data-value]');if(!button)return;form.elements[group.dataset.for].value=button.dataset.value;if(group.dataset.for==='housing')form.elements.monthlyHousing.value='';update();});
$('#compare').addEventListener('click',event=>{const btn=event.target.closest('[data-city]');if(btn)changeCity(btn.dataset.city);});
for(const button of document.querySelectorAll('[data-chart]'))button.addEventListener('click',()=>{chartMode=button.dataset.chart;for(const item of document.querySelectorAll('[data-chart]'))item.setAttribute('aria-pressed',String(item===button));if(current)renderChart(current.base);});
$('#reset').addEventListener('click',()=>{
  form.reset();for(const [key,value] of Object.entries(defaults)){const el=form.elements.namedItem(key);if(el)el.value=value??'';}
  chartMode='real';for(const item of document.querySelectorAll('[data-chart]'))item.setAttribute('aria-pressed',String(item.dataset.chart==='real'));update();
});
$('#export').addEventListener('click',()=>{
  if(!current)return;
  const {base,pressure}=current;
  const names={city:'城市',age:'当前年龄',adults:'成人数',housing:'住房类型',children:'孩子计划',childAges:'已有孩子年龄',lifestyle:'生活档位',endAge:'规划终点年龄',inflation:'生活年通胀%',rate:'名义年利率%',medicalInflation:'医疗年涨幅%',rentInflation:'租金年涨幅%',monthlyLiving:'自填全家月生活费',monthlyHousing:'自填全家月住房费',mortgage:'月供',mortgageYears:'剩余还贷年数',birthAfter:'几年后生育',education:'教育路线',medicalBase:'每人年医疗自付基础',insurance:'每人年医保保险预算',reservePerAdult:'每人应急医疗储备',pension:'全家月养老金',pensionAge:'养老金起领年龄',income:'全家月其他净收入',incomeYears:'其他收入年数',parentSupport:'每月赡养预算',careAnnual:'高龄每人年照护'};
  const labels={rent:'租房',own:'有房无贷',mortgage:'还房贷',none:'无子女',plan1:'计划1个孩子',plan2:'计划2个孩子',existing:'已有孩子',lean:'简简单单',standard:'舒服就好',comfortable:'自在一点',public:'公立为主',enriched:'更多课外投入',private:'民办/国际'};
  const rows=[['松弛有数 · 测算快照'],['提示','规划情景，非投资建议；城市费用为假设，非实时行情。'],['计费口径','每年年初支出，剩余资金按年计息；终点允许日常本金耗尽；应急储备独立留存。'],['基础所需本金（元）',Math.ceil(base.total)],['压力情景所需本金（元）',Math.ceil(pressure.total)],['压力情景说明','生活/租金/医疗涨幅各+1个百分点；利率-0.5个百分点（最低0）'],['日常所需本金（元）',Math.ceil(base.capital)],['独立储备（元）',Math.ceil(base.reserve)],[],['输入参数','数值']];
  for(const [key,label] of Object.entries(names))rows.push([label,base.s[key]===null?'城市自动估算':labels[base.s[key]]??base.s[key]]);
  rows.push(['估算全家月生活费',Math.round(base.livingMonthly)],['估算全家月租金/物业维修费（不含月供）',Math.round(base.housingMonthly)],[],['年龄','生活','住房','医疗','养育','教育','生育','照护','赡养','总支出','设定收入','需资产补足','年末日常余额（名义元，不含储备）']);
  for(const [i,r] of base.rows.entries())rows.push([r.age,...Object.values(r.parts).map(Math.round),Math.round(r.gross),Math.round(r.income),Math.round(r.net),Math.round(base.trajectory[i+1].balance)]);
  const csv='\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
  const a=document.createElement('a');a.href=url;a.download=`松弛有数-${base.s.city}-测算.csv`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
for(const [key,value] of Object.entries(defaults)){const el=form.elements.namedItem(key);if(el)el.value=value??'';}
update();

window.addEventListener('resize',()=>{if(current)renderChart(current.base);});
