import {useEffect,useState} from 'react';
import {EvolutionLoading} from '../screens/EvolutionLoading';

export function EvolutionApp(){
  const [progress,setProgress]=useState(18);

  useEffect(()=>{
    const steps=[32,48,63,78,92];
    let index=0;
    const timer=window.setInterval(()=>{
      setProgress(steps[index] ?? 92);
      index+=1;
      if(index>=steps.length) window.clearInterval(timer);
    },520);
    return()=>window.clearInterval(timer);
  },[]);

  return <EvolutionLoading progress={progress}/>;
}
