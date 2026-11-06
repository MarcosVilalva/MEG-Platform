import {LaunchIcon} from './LaunchIcon';
import {launchCategoryPresentation} from './category-presentation';

/** Componente exclusivamente visual. Mantém o rótulo acessível da API. */
export function LaunchCategoryBadge({category}:{category:string}){
 const appearance=launchCategoryPresentation(category);
 return <span
  className="meg-l09-category-chip"
  data-category-tone={appearance.tone}
  data-category-glyph={appearance.icon}
  title={category}
 >
  <span className="meg-l09-category-mark" aria-hidden="true">
   <LaunchIcon name={appearance.icon} width={20} height={20}/>
  </span>
  <span className="meg-l09-category-label">{category}</span>
 </span>;
}
