import {useEffect,useMemo,useRef,useState} from 'react';
import {
  prefetchAuthenticatedData,
  readSession,
  refreshAuthSession,
  validateSession,
  type AuthSession,
} from '../../app/auth-client';
import {EvolutionLoading} from '../screens/EvolutionLoading';
import {EvolutionLogin} from '../screens/EvolutionLogin';
import {EvolutionHome} from '../screens/EvolutionHome';
import {EvolutionPreview} from '../screens/EvolutionPreview';

type EvolutionPhase='login'|'loading'|'system'|'preview';

function requestedScreen():EvolutionPhase|null{
  const screen=new URLSearchParams(window.location.search).get('screen');
  return screen==='login'||screen==='loading'||screen==='system'||screen==='preview'?screen:null;
}
function requestedMonth(){
  return new URLSearchParams(window.location.search).get('month')?.match(/^\d{4}-\d{2}$/)?.[0]
    ||new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).format(new Date());
}
function statusOf(error:unknown){return Number((error as {status?:number}|null)?.status||0)}

export function EvolutionApp(){
  const forcedScreen=useMemo(requestedScreen,[]);
  const month=useMemo(requestedMonth,[]);
  const storedSession=useMemo(()=>forcedScreen?null:readSession(),[forcedScreen]);
  const [phase,setPhase]=useState<EvolutionPhase>(()=>forcedScreen||(storedSession?'loading':'login'));
  const [progress,setProgress]=useState(forcedScreen==='loading'?18:storedSession?12:18);
  const bootId=useRef(0);

  useEffect(()=>{
    if(phase!=='loading')return;
    if(forcedScreen==='loading'){
      const steps=[32,48,63,78,92,100];
      let index=0;
      const timer=window.setInterval(()=>{
        setProgress(steps[index]??100);
        index+=1;
        if(index>=steps.length)window.clearInterval(timer);
      },520);
      return()=>window.clearInterval(timer);
    }

    const currentBoot=++bootId.current;
    let active=true;
    let completed=false;
    const timer=window.setInterval(()=>{
      if(!active||completed)return;
      setProgress(value=>Math.min(88,value+Math.max(2,Math.round((90-value)*.14))));
    },180);

    const finish=(next:EvolutionPhase)=>{
      if(!active||bootId.current!==currentBoot)return;
      completed=true;
      window.clearInterval(timer);
      if(next==='system'){
        setProgress(100);
        window.setTimeout(()=>{if(active&&bootId.current===currentBoot)setPhase('system')},260);
      }else{
        setProgress(18);
        setPhase(next);
      }
    };

    void (async()=>{
      let session=readSession();
      if(!session){finish('login');return}

      try{
        setProgress(value=>Math.max(value,28));
        await validateSession(session);
      }catch(error){
        if(statusOf(error)===401||statusOf(error)===403){
          try{session=await refreshAuthSession()}catch{session=null}
          if(!session){finish('login');return}
          try{await validateSession(session)}catch(secondError){
            if(statusOf(secondError)===401||statusOf(secondError)===403){finish('login');return}
          }
        }
        // Falha transitória de rede não apaga uma sessão ainda recuperável.
      }

      setProgress(value=>Math.max(value,48));
      await prefetchAuthenticatedData(month).catch(()=>undefined);
      setProgress(value=>Math.max(value,92));
      finish('system');
    })();

    return()=>{active=false;window.clearInterval(timer)};
  },[phase,forcedScreen,month]);

  function authenticated(_session:AuthSession){
    setProgress(18);
    setPhase('loading');
  }

  if(phase==='loading')return <EvolutionLoading progress={progress}/>;
  if(phase==='system')return <EvolutionHome/>;
  if(phase==='preview')return <EvolutionPreview/>;

  return <EvolutionLogin onAuthenticated={authenticated}/>;
}
