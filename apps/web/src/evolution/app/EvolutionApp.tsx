import {useEffect,useMemo,useState} from 'react';
import {EvolutionLoading} from '../screens/EvolutionLoading';
import {EvolutionLogin} from '../screens/EvolutionLogin';

type EvolutionPhase='loading'|'login';

function requestedScreen():EvolutionPhase|null{
  const screen=new URLSearchParams(window.location.search).get('screen');
  return screen==='loading'||screen==='login'?screen:null;
}

export function EvolutionApp(){
  const forcedScreen=useMemo(requestedScreen,[]);
  const [phase,setPhase]=useState<EvolutionPhase>(forcedScreen||'loading');
  const [progress,setProgress]=useState(forcedScreen==='login'?100:18);

  useEffect(()=>{
    if(phase!=='loading'||forcedScreen==='login')return;
    const steps=[32,48,63,78,92,100];
    let index=0;
    let transitionTimer=0;
    const timer=window.setInterval(()=>{
      const next=steps[index] ?? 100;
      setProgress(next);
      index+=1;
      if(index>=steps.length){
        window.clearInterval(timer);
        if(forcedScreen!=='loading'){
          transitionTimer=window.setTimeout(()=>setPhase('login'),520);
        }
      }
    },520);
    return()=>{
      window.clearInterval(timer);
      if(transitionTimer)window.clearTimeout(transitionTimer);
    };
  },[phase,forcedScreen]);

  if(phase==='loading')return <EvolutionLoading progress={progress}/>;
  return <EvolutionLogin/>;
}
