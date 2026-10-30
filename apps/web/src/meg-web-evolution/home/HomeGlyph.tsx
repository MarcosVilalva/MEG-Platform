import type {ReactNode} from 'react';

export type HomeIconName='wallet'|'eye'|'eyeOff'|'arrow'|'income'|'expense'|'receipt'|'card'|'clock'|'check'|'gift'|'transfer'|'plus'|'chart'|'settings'|'calendar'|'sparkle'|'shopping'|'layers'|'alert'|'reload';
const shapes:Record<HomeIconName,ReactNode>={
 wallet:<><rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 9h18M16 14h2"/></>,
 eye:<><path d="M2 12s3.7-6.5 10-6.5S22 12 22 12s-3.7 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.7"/></>,
 eyeOff:<><path d="m3 3 18 18M10.6 5.6c.5-.1.9-.1 1.4-.1 6.3 0 10 6.5 10 6.5a15 15 0 0 1-3 3.7M6.2 6.9A15 15 0 0 0 2 12s3.7 6.5 10 6.5a10 10 0 0 0 3.3-.6"/><path d="M10 10a2.8 2.8 0 0 0 4 4"/></>,
 arrow:<><path d="M5 12h14m-6-6 6 6-6 6"/></>,
 income:<><path d="m5 13 7-7 7 7M12 6v13"/></>,
 expense:<><path d="m5 11 7 7 7-7M12 18V5"/></>,
 receipt:<><path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z"/><path d="M9 8h6M9 12h6"/></>,
 card:<><rect x="2.5" y="5" width="19" height="14" rx="2.7"/><path d="M2.5 10h19M7 15h4"/></>,
 clock:<><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></>,
 check:<><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>,
 gift:<><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M3 7h18v4H3zM12 7v14M12 7c-5 0-7-2-5-4 2.5-2.5 5 2 5 4Zm0 0c5 0 7-2 5-4-2.5-2.5-5 2-5 4Z"/></>,
 transfer:<><path d="M4 7h16m-5-4 5 4-5 4M20 17H4m5-4-5 4 5 4"/></>,
 plus:<><path d="M12 4v16M4 12h16"/></>,
 chart:<><path d="M4 19V5M4 19h16M8 15l4-4 3 2 5-6"/></>,
 settings:<><circle cx="12" cy="12" r="3"/><path d="M10 2h4l.6 2.6 2 1 2.3-1.2 2.6 2.7-1.2 2.3 1 2 .7.6-.7 2-1 2 1.2 2.3-2.6 2.7-2.3-1.2-2 1L14 22h-4l-.6-2.6-2-1-2.3 1.2-2.6-2.7 1.2-2.3-1-2 1-2-1.2-2.3L5.1 4.4l2.3 1.2 2-1L10 2Z"/></>,
 calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></>,
 sparkle:<><path d="m12 2 2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6L12 2Z"/></>,
 shopping:<><path d="M4 9h16l-1.5 12h-13L4 9ZM9 10V6a3 3 0 0 1 6 0v4"/></>,
 layers:<><path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/></>,
 alert:<><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 17h.01"/></>,
 reload:<><path d="M20 11a8 8 0 1 0-2 5.5M20 4v7h-7"/></>
};
export function HomeGlyph({name,size=20,className=''}:{name:HomeIconName;size?:number;className?:string}){
 return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{shapes[name]}</svg>;
}
