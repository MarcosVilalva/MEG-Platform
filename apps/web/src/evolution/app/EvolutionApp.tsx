import {useEffect,useMemo,useState} from 'react';
import {EvolutionLoading} from '../screens/EvolutionLoading';
import {EvolutionLogin} from '../screens/EvolutionLogin';
import {EvolutionHome} from '../screens/EvolutionHome';

type EvolutionPhase='login'|'loading'|'system';

function requestedScreen():EvolutionPhase|null{
  const screen=new URLSearchParams(window.location.search).get('screen');
  return screen==='login'||screen==='loading'||screen==='system'?screen:null;
}

export function EvolutionApp(){
  const forcedScreen=useMemo(requestedScreen,[]);
  const [phase,setPhase]=useState<EvolutionPhase>(forcedScreen||'login');
  const [progress,setProgress]=useState(18);

  useEffect(()=>{
    if(phase!=='loading')return;
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
          transitionTimer=window.setTimeout(()=>setPhase('system'),520);
        }
      }
    },520);

    return()=>{
      window.clearInterval(timer);
      if(transitionTimer)window.clearTimeout(transitionTimer);
    };
  },[phase,forcedScreen]);

  if(phase==='loading')return <EvolutionLoading progress={progress}/>;
  if(phase==='system')return <EvolutionHome/>;

  return <EvolutionLogin onAuthenticated={()=>{
    setProgress(18);
    setPhase('loading');
  }}/>;
}
