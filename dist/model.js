import {housingMarket} from './housing-data.js';
export {housingMarket};
// 城市生活费与养育系数仍是情景假设；住房使用独立的有来源数据，不用房价系数放大所有消费。
export const cities = {
  '北京':[3000,1.35], '上海':[3100,1.4], '深圳':[2900,1.3], '广州':[2500,1.15],
  '杭州':[2600,1.15], '南京':[2400,1.1], '苏州':[2300,1.05], '成都':[2100,1],
  '重庆':[2000,.95], '武汉':[2100,1], '长沙':[2000,.95], '西安':[2000,.95],
  '天津':[2200,1], '郑州':[1900,.9], '合肥':[2000,.95], '青岛':[2200,1],
  '厦门':[2400,1.1], '昆明':[1900,.9], '贵阳':[1800,.85], '南宁':[1800,.85],
  '大连':[2100,.95], '沈阳':[1800,.85], '海口':[2100,1], '大理':[2100,1],
  '其他城市':[2000,1]
};
export const defaults = {
  city:'杭州', age:30, adults:1, housing:'buy', children:'none', childAges:'5', lifestyle:'standard',
  endAge:85, inflation:2, rate:1, medicalInflation:3, rentInflation:2, monthlyLiving:null,
  monthlyHousing:null, homeArea:null, homePrice:null, homeFeeRate:3, fitOutPrice:1000, movingCost:20000, mortgage:4000, mortgageYears:20, education:'public',
  medicalBase:2000, insurance:1200, reservePerAdult:100000, pension:0, pensionAge:65,
  income:0, incomeYears:10, parentSupport:0, careAnnual:18000
};
const finite = (n, min, max, label) => {
  if (n === '' || n === null || n === undefined || !Number.isFinite(Number(n)) || Number(n)<min || Number(n)>max) throw new Error(`${label}须在 ${min}～${max} 之间`);
  return Number(n);
};
export function normalize(input={}) {
  const s={...defaults,...input};
  if (!cities[s.city]) throw new Error('请选择支持的城市');
  const ranges={age:[18,85,'年龄'],adults:[1,2,'成人数'],endAge:[19,110,'规划年龄'],inflation:[0,10,'通胀率'],rate:[0,8,'年利率'],medicalInflation:[0,12,'医疗涨幅'],rentInflation:[0,10,'租金涨幅'],mortgage:[0,100000,'月供'],mortgageYears:[0,40,'剩余还款年数'],medicalBase:[0,100000,'医疗自付'],insurance:[0,100000,'医保及保险预算'],reservePerAdult:[0,2000000,'应急医疗储备'],pension:[0,50000,'养老金'],pensionAge:[40,85,'养老金起领年龄'],income:[0,100000,'其他收入'],incomeYears:[0,92,'收入持续年数'],parentSupport:[0,100000,'每月赡养费'],careAnnual:[0,500000,'高龄照护预算'],homeFeeRate:[0,15,'购房杂费预算比例'],fitOutPrice:[0,20000,'每平方米装修预算'],movingCost:[0,1000000,'家具搬家预算']};
  for(const [key,[min,max,label]] of Object.entries(ranges)) s[key]=finite(s[key],min,max,label);
  if(!Number.isInteger(s.age)||!Number.isInteger(s.endAge)||!Number.isInteger(s.adults)) throw new Error('年龄与成人数请使用整数');
  if(s.endAge<=s.age) throw new Error('规划年龄必须大于当前年龄');
  for(const key of ['mortgageYears','pensionAge','incomeYears']) if(!Number.isInteger(s[key])) throw new Error('年数和年龄请使用整数');
  const enums={housing:['buy','rent','own','mortgage'],children:['none','plan1','plan2','existing'],lifestyle:['lean','standard','comfortable'],education:['public','enriched','private']};
  for(const [key,values] of Object.entries(enums)) if(!values.includes(s[key])) throw new Error('选项无效');
  for(const key of ['monthlyLiving','monthlyHousing']) if(s[key]!==null) s[key]=finite(s[key],0,100000,'月度预算');
  if(s.homeArea!==null)s.homeArea=finite(s.homeArea,20,300,'住房面积');
  if(s.homePrice!==null)s.homePrice=finite(s.homePrice,1,500000,'购房单价');
  // 首胎时间是自动假设，不接收独立输入；超过35岁按当年开始，避免倒算已发生费用。
  s.birthAfter=s.children.startsWith('plan')?Math.max(0,35-s.age):null;
  s.kids=[];
  if(s.children==='existing') {
    const ages=String(s.childAges).trim().split(/[,，\s]+/);
    if(!String(s.childAges).trim()||ages.length>4) throw new Error('请填写 1～4 个孩子的年龄，以逗号分隔');
    s.kids=ages.map(v=>{const age=finite(v,0,21,'孩子年龄');if(!Number.isInteger(age)) throw new Error('孩子年龄请使用整数');return {age,planned:false};});
  } else if(s.children.startsWith('plan')) {
    const count=s.children==='plan2'?2:1;
    s.kids=Array.from({length:count},(_,i)=>({age:-(s.birthAfter+i*3),planned:true}));
  }
  return s;
}
function housingPlan(s){
  const area=s.homeArea??(60+(s.adults-1)*20+s.kids.length*20);
  const market=housingMarket.prices[s.city]??{};
  const price=s.homePrice??market.salePerSqm??null;
  const rentPerSqm=market.rentPerSqm??null;
  if(s.housing==='buy'&&price===null)throw new Error('该城市暂无同口径房价，请在高级设置填写购房单价；不会用其他城市价格代替');
  if(s.housing==='rent'&&s.monthlyHousing===null&&rentPerSqm===null)throw new Error('该城市暂无同口径租金，请在高级设置填写全家月租金');
  const property=s.housing==='buy'?area*price:0;
  const fees=property*s.homeFeeRate/100;
  const fitOut=s.housing==='buy'?area*s.fitOutPrice+s.movingCost:0;
  const housingMonthly=s.monthlyHousing??(s.housing==='rent'?area*rentPerSqm:area*6);
  return {area,price,rentPerSqm,property,fees,fitOut,upfront:property+fees+fitOut,housingMonthly,customPrice:s.homePrice!==null};
}
export function makeSchedule(input={}) {
  const s=normalize(input), [living,factor]=cities[s.city];
  const home=housingPlan(s);
  const lifestyle={lean:.8,standard:1,comfortable:1.4}[s.lifestyle];
  const livingMonthly=s.monthlyLiving??living*(s.adults===2?1.75:1)*lifestyle;
  const housingMonthly=home.housingMonthly;
  const rows=[];
  for(let t=0;t<s.endAge-s.age;t++) {
    const age=s.age+t, general=(1+s.inflation/100)**t, med=(1+s.medicalInflation/100)**t;
    const parts={生活:livingMonthly*12*general,住房:housingMonthly*12*(s.housing==='rent'?(1+s.rentInflation/100)**t:general),医疗:0,养育:0,教育:0,生育:0,照护:0,赡养:s.parentSupport*12*general};
    if(s.housing==='mortgage'&&t<s.mortgageYears) parts.住房+=s.mortgage*12;
    const ageFactor=age<45?1:age<60?1.6:age<75?3:5;
    parts.医疗=s.adults*(s.medicalBase*ageFactor*med+s.insurance*general);
    if(age>=80) parts.照护=s.careAnnual*s.adults*med;
    for(const kid of s.kids) {
      const a=kid.age+t;
      if(a<0||a>=22) continue;
      if(kid.planned&&a===0) parts.生育+=30000*factor*med;
      const upkeep=a<3?24000:a<6?18000:a<12?12000:18000;
      const edu=a<3?0:a<6?12000:a<12?4000:a<18?7000:15000;
      const education=s.education==='private'?(a<3?0:a<6?80000:a<12?120000:a<18?160000:200000):edu*(s.education==='enriched'?2.5:1);
      parts.养育+=upkeep*factor*general;
      parts.教育+=education*factor*general;
    }
    const gross=Object.values(parts).reduce((a,b)=>a+b,0);
    const income=(age>=s.pensionAge?s.pension*12:0)+(t<s.incomeYears?s.income*12:0);
    rows.push({t,age,parts,gross,income,net:Math.max(0,gross-income)});
  }
  return {s,rows,livingMonthly,housingMonthly,home};
}
export function calculate(input={}) {
  const {s,rows,livingMonthly,housingMonthly,home}=makeSchedule(input);
  const pvParts=Object.fromEntries(Object.keys(rows[0].parts).map(k=>[k,0]));
  let capital=0, incomePV=0;
  for(const row of rows) {
    const discount=(1+s.rate/100)**row.t;
    capital+=row.net/discount;
    incomePV+=Math.min(row.gross,row.income)/discount;
    for(const [key,value] of Object.entries(row.parts)) pvParts[key]+=value/discount;
  }
  const recurring=rows[0].gross-rows[0].parts.生育;
  const cashReserve=recurring/2, medicalReserve=s.reservePerAdult*s.adults;
  const reserve=cashReserve+medicalReserve;
  let balance=capital;
  const trajectory=[{age:s.age,balance:capital,real:capital}];
  for(const row of rows) {
    balance=(balance-row.net)*(1+s.rate/100);
    if(Math.abs(balance)<.01) balance=0;
    trajectory.push({age:row.age+1,balance:Math.max(0,balance),real:Math.max(0,balance)/(1+s.inflation/100)**(row.t+1)});
  }
  return {s,rows,capital,reserve,cashReserve,medicalReserve,home,total:home.upfront+capital+reserve,pvParts,incomePV,trajectory,livingMonthly,housingMonthly,monthly:recurring/12};
}
export function evaluate(input={}) {
  const base=calculate(input);
  const pressure=calculate({...base.s,inflation:Math.min(10,base.s.inflation+1),rentInflation:Math.min(10,base.s.rentInflation+1),medicalInflation:Math.min(12,base.s.medicalInflation+1),rate:Math.max(0,base.s.rate-.5)});
  return {base,pressure};
}

// 城市比较只改变城市：自填预算、单价和面积在所有城市保持一致，避免用自填基准减城市默认值。
export function compareCities(input,targets){
  const base=calculate(input);
  return targets.map(city=>{const result=calculate({...base.s,city});return {city,result,delta:result.total-base.total};});
}
