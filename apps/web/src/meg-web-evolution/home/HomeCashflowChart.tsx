/**
 * Fluxo diário da Home. Valores recebidos exclusivamente da projeção
 * canônica /finance/cashflow; sem inferência ou cálculo de saldo no React.
 * ECharts já é dependência do MEG Web.
 */
import { useEffect,useRef } from 'react';
import * as echarts from 'echarts';
type Day={date:string;income:number;expense:number;net:number};
export function HomeCashflowChart({days,hidden}:{days:Day[];hidden:boolean}){
 const host=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const el=host.current;
  if(!el||!days.length)return;
  const chart=echarts.init(el,undefined,{renderer:'canvas',devicePixelRatio:Math.min(window.devicePixelRatio||1,2)});
  const labels=days.map(item=>{
   const date=item.date;
   return /^\d{4}-\d{2}-\d{2}/.test(date)?date.slice(8,10):date;
  });
  const income=days.map(d=>Number.isFinite(d.income)?Math.max(0,d.income):0);
  const expense=days.map(d=>Number.isFinite(d.expense)?-Math.abs(d.expense):0);
  const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
  chart.setOption({
   animation:false,backgroundColor:'transparent',
   grid:{left:5,right:49,top:12,bottom:25,containLabel:false},
   textStyle:{fontFamily:'Inter, sans-serif',color:'#add5d0'},
   xAxis:{type:'category',data:labels,axisLine:{lineStyle:{color:'#1a6465'}},axisTick:{show:false},
    axisLabel:{fontSize:10,color:'#a2c3bf',interval:Math.max(0,Math.ceil(days.length/7)-1),hideOverlap:true}},
   yAxis:{type:'value',position:'right',splitNumber:4,axisLine:{show:false},
    axisLabel:{fontSize:10,color:'#98bfbb',formatter:(v:number)=>hidden?'•••':new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:1}).format(v)},
    splitLine:{lineStyle:{color:'rgba(69,157,150,.18)',width:1}},axisTick:{show:false}},
   tooltip:{trigger:'axis',confine:true,appendToBody:false,
    backgroundColor:'#061f28',borderColor:'#178c88',borderWidth:1,
    textStyle:{color:'#e9fffa',fontSize:11},
    axisPointer:{type:'line',lineStyle:{color:'#55e9d0',type:'dashed'}},
    formatter:(params:unknown)=>{
      const entries=Array.isArray(params)?params as Array<{dataIndex:number}>:[];
      const idx=entries[0]?.dataIndex;
      if(idx===undefined||!days[idx])return '';
      const d=days[idx];
      const date=/^\d{4}-\d{2}-\d{2}/.test(d.date)?d.date.slice(8,10)+'/'+d.date.slice(5,7):d.date;
      return '<b>'+date+'</b><br/>Entradas: '+(hidden?'R$ •••••':money.format(d.income))+'<br/>Saídas: '+(hidden?'R$ •••••':money.format(d.expense));
    }},
   series:[
    {name:'Entradas',type:'bar',data:income,barWidth:'32%',barGap:'12%',itemStyle:{borderRadius:[2,2,0,0],color:new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#5af8d7'},{offset:1,color:'#0b8e8c'}])},emphasis:{focus:'series'}},
    {name:'Saídas',type:'bar',data:expense,barWidth:'32%',itemStyle:{borderRadius:[0,0,2,2],color:new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#e97688'},{offset:1,color:'#ad3d57'}])},emphasis:{focus:'series'}}
   ]
  });
  const resize=new ResizeObserver(()=>chart.resize());resize.observe(el);
  return ()=>{resize.disconnect();chart.dispose()};
 },[days,hidden]);
 return <div className="meg-home-flow-chart" role="img" aria-label={days.length?'Gráfico diário de entradas e saídas apuradas pelo sistema financeiro':'Sem dados diários disponíveis no período'}>
   {days.length?<div ref={host} className="meg-home-flow-canvas"/>:<span className="meg-home-flow-empty">Sem movimentos diários disponíveis para o período.</span>}
 </div>;
}
