import {EvolutionSystem} from './EvolutionSystem';

const previews=['home','movements','launch','payables','settlement','cards','card-center','benefit','cashflow','analytics','history','settings','period','menu','transfer','card-payment','edit-launch','benefit-recharge'];
/** Mesmos componentes do produto, com dados de prévia e gravações desativadas. */
export function EvolutionPreview(){
  const requested=new URLSearchParams(location.search).get('preview')||'home';
  return <div data-evolution-screen="preview"><EvolutionSystem previewKey={previews.includes(requested)?requested:'home'}/></div>;
}
