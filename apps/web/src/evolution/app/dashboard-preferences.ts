export type EvolutionDashboardPrefs={
  balance:boolean;
  projection:boolean;
  summary:boolean;
  benefit:boolean;
  history:boolean;
  agenda:boolean;
};

export const evolutionDashboardDefaults:EvolutionDashboardPrefs={
  balance:true,
  projection:true,
  summary:true,
  benefit:true,
  history:true,
  agenda:true,
};

const PREF_KEY='meg.dashboard.preferences';

export function readEvolutionDashboardPrefs():EvolutionDashboardPrefs{
  try{return{...evolutionDashboardDefaults,...JSON.parse(localStorage.getItem(PREF_KEY)||'{}')}}catch{return evolutionDashboardDefaults}
}

export function applyEvolutionDashboardPrefs(value:EvolutionDashboardPrefs){
  try{localStorage.setItem(PREF_KEY,JSON.stringify(value))}catch{}
  Object.entries(value).forEach(([key,enabled])=>{
    document.documentElement.setAttribute('data-meg-dashboard-'+key.replace(/[A-Z]/g,l=>'-'+l.toLowerCase()),enabled?'on':'off');
  });
  window.dispatchEvent(new CustomEvent('meg:dashboard-preferences-changed',{detail:value}));
}

export function hydrateEvolutionDashboardPrefs(){
  const value=readEvolutionDashboardPrefs();
  applyEvolutionDashboardPrefs(value);
  return value;
}
