import { WebNextIcon, type WebNextIconName } from './WebNextIcon';
import '../styles/states.css';

export function WebNextStatus({
  kind,
  title,
  message,
  actionLabel,
  onAction,
  icon,
}: {
  kind:'loading'|'error'|'empty';
  title:string;
  message?:string;
  actionLabel?:string;
  onAction?:()=>void;
  icon?:WebNextIconName;
}) {
  const iconName=icon || (kind==='error'?'bell':kind==='empty'?'search':'analytics');
  return <section className={`mnx-status is-${kind}`} role={kind==='error'?'alert':'status'} aria-live={kind==='loading'?'polite':undefined}>
    <div className="mnx-status-card">
      <span className="mnx-status-icon">{kind==='loading'?<i aria-hidden="true"/>:<WebNextIcon name={iconName} aria-hidden="true"/>}</span>
      <strong>{title}</strong>
      {message?<p>{message}</p>:null}
      {actionLabel&&onAction?<button type="button" onClick={onAction}>{actionLabel}</button>:null}
    </div>
  </section>;
}
