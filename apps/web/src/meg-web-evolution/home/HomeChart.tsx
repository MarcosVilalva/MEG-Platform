import {useEffect,useRef} from 'react';
import * as echarts from 'echarts';

export type CashflowDay={date:string;income:number;expense:number;net:number;realizedBalance?:number};
const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const compact=new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:1});
const day=(date:string)=>date.slice(8,10)+'/'+date.slice(5,7);
function validDay(d:CashflowDay){return /^\d{4}-\d{2}-\d{2}$/.test(d.date)&&[d.income,d.expense,d.net].every(Number.isFinite)}
export function HomeChart({days,hidden}:{days:CashflowDay[];hidden:boolean}){
 const element=useRef<HTMLDivElement|null>(null);
 const valid=days.filter(validDay).slice().sort((a,b)=>a.date.localeCompare(b.date));
 useEffect(()=>{
  if(!element.current||!valid.length||hidden)return;
  const chart=echarts.init(element.current,undefined,{renderer:'canvas'});
  const incomes=valid.map(d=>Math.max(0,d.income));
  const expenses=valid.map(d=>Math.max(0,d.expense));
  const results=valid.map(d=>d.net);
  const inGradient=new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#48f5ce'},{offset:1,color:'#067e78'}]);
  const outGradient=new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#ff7f88'},{offset:1,color:'#a03b58'}]);
  chart.setOption({
   animationDuration:300,backgroundColor:'transparent',
   textStyle:{fontFamily:'Inter, system-ui, sans-serif',color:'#d2e6e4'},
   grid:{left:14,right:45,top:35,bottom:26,containLabel:false},
   legend:{show:true,right:8,top:1,itemWidth:11,itemHeight:10,itemGap:15,icon:'roundRect',
    data:['Entradas','Saídas','Resultado diário'],textStyle:{color:'#b6d6d2',fontSize:12}},
   xAxis:{type:'category',data:valid.map(d=>day(d.date)),axisTick:{show:false},
    axisLine:{lineStyle:{color:'#35666a'}},axisLabel:{color:'#b4d4cf',fontSize:12,hideOverlap:true,
    interval:Math.max(0,Math.ceil(valid.length/8)-1)}},
   yAxis:{type:'value',scale:true,splitNumber:4,position:'right',
    axisLabel:{color:'#b4d2cf',fontSize:12,formatter:(n:number)=>compact.format(n)},
    axisLine:{show:false},axisTick:{show:false},splitLine:{lineStyle:{color:'rgba(93,155,157,.13)',type:'dashed'}}},
   tooltip:{trigger:'axis',confine:true,appendToBody:false,backgroundColor:'#052b32',borderColor:'#218b85',borderWidth:1,
    axisPointer:{type:'line',lineStyle:{color:'#75fce2',type:'dashed'}},
    textStyle:{fontSize:12,color:'#eefefa'},
    formatter:(params:unknown)=>{
     const arr=Array.isArray(params)?params as Array<{dataIndex:number}>:[];
     const idx=arr[0]?.dataIndex;
     if(idx==null||!valid[idx])return '';
     const d=valid[idx];
     return '<div style="min-width:165px"><b style="display:block;margin-bottom:7px">'+day(d.date)+'</b>'+
      '<div style="display:flex;gap:14px;justify-content:space-between"><span style="color:#59f1ce">● Entradas</span><b>'+money.format(d.income)+'</b></div>'+
      '<div style="display:flex;gap:14px;justify-content:space-between"><span style="color:#ff9b9f">● Saídas</span><b>'+money.format(d.expense)+'</b></div>'+
      '<div style="display:flex;gap:14px;justify-content:space-between"><span style="color:#73beff">● Resultado</span><b>'+money.format(d.net)+'</b></div></div>';
    }},
   series:[
    {name:'Entradas',type:'bar',data:incomes,barMaxWidth:13,barGap:'15%',itemStyle:{color:inGradient,borderRadius:[3,3,0,0]},
     emphasis:{focus:'series'},z:2},
    {name:'Saídas',type:'bar',data:expenses,barMaxWidth:13,itemStyle:{color:outGradient,borderRadius:[3,3,0,0]},
     emphasis:{focus:'series'},z:2},
    {name:'Resultado diário',type:'line',data:results,smooth:.28,showSymbol:false,symbol:'circle',symbolSize:7,
     lineStyle:{width:2.75,color:'#59aeff',shadowColor:'rgba(62,161,255,.35)',shadowBlur:7},
     itemStyle:{color:'#a6deff'},emphasis:{focus:'series',scale:true},z:5}
   ]
  },{notMerge:true});
  // O gráfico mantém todas as séries/valores. Somente tipografia,
  // legenda e quantidade de datas mudam conforme a largura real do painel.
  const fit=()=>{
   if(!element.current)return;
   chart.resize();
   const width=element.current.clientWidth;
   const compact=width<560;
   const maxTicks=width<400?4:width<620?6:9;
   chart.setOption({
    grid:{left:12,right:55,top:compact?18:39,bottom:31,containLabel:false},
    legend:{show:!compact,right:8,top:1,
     textStyle:{fontSize:width<760?11:12,color:'#b6d6d2'}},
    xAxis:{axisLabel:{fontSize:width<440?11:12,
     interval:Math.max(0,Math.ceil(valid.length/maxTicks)-1)}},
    yAxis:{axisLabel:{fontSize:width<440?11:12}}
   });
  };
  fit();
  const ob=new ResizeObserver(fit);
  ob.observe(element.current);
  return ()=>{ob.disconnect();chart.dispose()};
 },[days,hidden]);
 if(hidden)return <div className="pano-chart-placeholder" role="status">Gráfico oculto para preservar seus valores.</div>;
 if(!valid.length)return <div className="pano-chart-placeholder" role="status">Sem dados de fluxo diário para este período.</div>;
 return <div ref={element} className="pano-chart" role="img" aria-label="Gráfico financeiro diário: barras de entradas e saídas, linha de resultado. Valores apresentados pela API financeira."/>;
}
