/**
 * Fluxo do mês - ECharts 6, já existente no workspace.
 * Entradas e saídas aparecem lado a lado, AMBAS acima do zero:
 * isso deixa a comparação mais legível que barras opostas.
 * Os valores vêm unicamente de /finance/cashflow (camada canônica).
 * Não soma saldo, faturas ou parcelas na camada visual.
 */
import { useEffect,useRef } from 'react';
import * as echarts from 'echarts';

type FlowDay={date:string;income:number;expense:number;net:number};
const brl=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const axisBRL=new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:1});
const asDate=(date:string)=>/^\d{4}-\d{2}-\d{2}$/.test(date)?date.slice(8,10)+'/'+date.slice(5,7):date;
const format=(value:number,hidden:boolean)=>hidden?'R$ •••••':brl.format(value);

export function HomeCashflowChart({days,hidden}:{days:FlowDay[];hidden:boolean}){
 const container=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(!container.current||days.length===0)return;
  const el=container.current;
  const chart=echarts.init(el,undefined,{renderer:'canvas',devicePixelRatio:Math.min(window.devicePixelRatio||1,2)});
  const income=days.map(d=>Number.isFinite(d.income)?Math.max(0,d.income):0);
  const expense=days.map(d=>Number.isFinite(d.expense)?Math.abs(d.expense):0);
  const net=days.map(d=>Number.isFinite(d.net)?d.net:0);
  const labels=days.map(d=>/^\d{4}-\d{2}-\d{2}$/.test(d.date)?d.date.slice(8,10):d.date);
  const colorIn=new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#6dffe2'},{offset:1,color:'#058e8b'}]);
  const colorOut=new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#ffa1ad'},{offset:1,color:'#cb536c'}]);
  chart.setOption({
    animationDuration:240,
    backgroundColor:'transparent',
    textStyle:{fontFamily:'Inter,system-ui,sans-serif',color:'#c2e1dd'},
    color:['#52f1d2','#f4899c','#56a9ff'],
    legend:{show:true,top:0,right:3,itemGap:12,itemWidth:10,itemHeight:8,icon:'roundRect',
      textStyle:{color:'#c5dbd7',fontSize:10,fontWeight:600}},
    grid:{left:12,right:50,top:33,bottom:24,containLabel:false},
    xAxis:{type:'category',boundaryGap:true,data:labels,
      axisLine:{lineStyle:{color:'rgba(92,189,179,.5)'}},axisTick:{show:false},
      axisLabel:{color:'#9fc7bf',fontSize:10,interval:Math.max(0,Math.ceil(days.length/7)-1),hideOverlap:true}},
    yAxis:{type:'value',scale:true,splitNumber:4,position:'right',
      axisLine:{show:false},axisTick:{show:false},
      axisLabel:{color:'#8cb4b0',fontSize:10,formatter:(value:number)=>hidden?'•••':axisBRL.format(value)},
      splitLine:{lineStyle:{color:'rgba(87,156,153,.16)',type:'dashed',width:1}}},
    tooltip:{show:true,trigger:'axis',confine:true,appendToBody:false,backgroundColor:'#06252d',
      borderColor:'#2eafaa',borderWidth:1,extraCssText:'border-radius:9px;box-shadow:0 12px 25px rgba(0,0,0,.35);',
      axisPointer:{type:'shadow',shadowStyle:{color:'rgba(112,242,213,.08)'}},
      textStyle:{color:'#ecfff9',fontSize:11},
      formatter:(params:unknown)=>{
        const p=Array.isArray(params)?params as Array<{dataIndex:number}>:[];
        const idx=p[0]?.dataIndex;
        if(idx===undefined||!days[idx])return '';
        const d=days[idx];
        return '<div style="min-width:138px"><div style="font-weight:750;margin-bottom:7px">'+asDate(d.date)+'</div>'+
          '<div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:3px"><span style="color:#69efcf">● Entradas</span><b>'+format(d.income,hidden)+'</b></div>'+
          '<div style="display:flex;justify-content:space-between;gap:16px"><span style="color:#fa97a8">● Saídas</span><b>'+format(d.expense,hidden)+'</b></div>'+
          '<div style="display:flex;justify-content:space-between;gap:16px;margin-top:3px"><span style="color:#6caeff">● Resultado diário</span><b>'+format(d.net,hidden)+'</b></div></div>';
      }},
    series:[
      {name:'Entradas',type:'bar',data:income,barMaxWidth:11,barMinHeight:0,barGap:'25%',
       itemStyle:{color:colorIn,borderRadius:[3,3,0,0]},
       emphasis:{focus:'series',itemStyle:{color:'#88ffdf'}}},
      {name:'Saídas',type:'bar',data:expense,barMaxWidth:11,barMinHeight:0,
       itemStyle:{color:colorOut,borderRadius:[3,3,0,0]},
       emphasis:{focus:'series',itemStyle:{color:'#ffb4bf'}}},
      {name:'Resultado diário',type:'line',data:net,smooth:0.32,symbol:'circle',showSymbol:false,symbolSize:7,
       lineStyle:{width:2.7,color:'#55b5ff',shadowColor:'rgba(66,170,255,.45)',shadowBlur:9},
       itemStyle:{color:'#86d5ff',borderColor:'#d8f5ff',borderWidth:1},
       emphasis:{focus:'series',scale:true},z:5}
    ]
  });
  const observer=new ResizeObserver(()=>chart.resize());observer.observe(el);
  return ()=>{observer.disconnect();chart.dispose()};
 },[days,hidden]);
 return <div className="meg-home-flow-chart" role="img" aria-label={days.length?'Comparativo diário de entradas, saídas e resultado do período conforme dados financeiros oficiais':'Sem dados diários de fluxo disponíveis no período'}>
   {days.length>0?<div className="meg-home-flow-canvas" ref={container}/>:<p className="meg-home-flow-empty">Sem movimentações diárias neste período.</p>}
 </div>;
}
