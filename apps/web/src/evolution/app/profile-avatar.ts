import {readSession} from '../../app/auth-client';
import {patchCloudStateProperties,readCloudState} from '../../app/app-state-client';

export type EvolutionAvatarPreference=
  | {kind:'initials'}
  | {kind:'preset';presetId:string}
  | {kind:'photo';dataUrl:string};

export type EvolutionAvatarPreset={id:string;label:string};
export const evolutionAvatarPresets:EvolutionAvatarPreset[]=[
  ['people-01','Aurora'],['people-02','Enzo'],['people-03','Amara'],['people-04','Kenji'],['people-05','Serena'],['people-06','Hugo'],
  ['people-07','Theo'],['people-08','Clara'],['people-09','Malik'],['people-10','Maya'],['people-11','Vicente'],['people-12','Ravi'],
  ['people-13','Luna'],['people-14','Gael'],['people-15','Nina'],['people-16','Arthur'],['people-17','Noah'],['people-18','Cora'],
  ['people-19','Safira'],['people-20','Ben'],['people-21','Íris'],['people-22','Raul'],['people-23','Leo'],['people-24','Bella'],
  ['people-25','Davi'],['people-26','Mel'],['people-27','Lia'],['people-28','Caio'],['people-29','Eva'],['people-30','Otto'],
  ['people-31','Zion'],['people-32','Chloe'],['people-33','Jade'],['people-34','Alex'],['people-35','Elisa'],['people-36','Dara'],
].map(([id,label])=>({id,label}));

const key=(userId:string)=>`meg.profile.avatar.${userId}`;
const userId=()=>readSession()?.user.id||'local-user';
function defaultPreset(id:string){
  let hash=2166136261;
  for(let i=0;i<id.length;i+=1){hash^=id.charCodeAt(i);hash=Math.imul(hash,16777619)}
  return evolutionAvatarPresets[Math.abs(hash>>>0)%evolutionAvatarPresets.length]?.id||'people-01';
}
function normalize(value:unknown,id:string):EvolutionAvatarPreference|null{
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const x=value as {kind?:string;presetId?:string;dataUrl?:string};
  if(x.kind==='photo'&&x.dataUrl?.startsWith('data:image/')&&x.dataUrl.length<500000)return{kind:'photo',dataUrl:x.dataUrl};
  if(x.kind==='preset'&&evolutionAvatarPresets.some(p=>p.id===x.presetId))return{kind:'preset',presetId:x.presetId!};
  if(x.kind==='initials')return{kind:'initials'};
  return{kind:'preset',presetId:defaultPreset(id)};
}
export function readEvolutionAvatar(id=userId()):EvolutionAvatarPreference{
  try{const raw=localStorage.getItem(key(id));return raw?normalize(JSON.parse(raw),id)||{kind:'preset',presetId:defaultPreset(id)}:{kind:'preset',presetId:defaultPreset(id)}}catch{return{kind:'preset',presetId:defaultPreset(id)}}
}
export function evolutionAvatarImage(pref:EvolutionAvatarPreference){
  if(pref.kind==='photo')return pref.dataUrl;
  if(pref.kind==='preset'){
    const base=(import.meta.env.BASE_URL||'/').replace(/\/?$/,'/');
    return `${base}brand/avatars/meg-user-base-v2/${pref.presetId}.webp`;
  }
  return '';
}
export async function saveEvolutionAvatar(pref:EvolutionAvatarPreference,id=userId()){
  const normalized=normalize(pref,id)||{kind:'preset' as const,presetId:defaultPreset(id)};
  try{localStorage.setItem(key(id),JSON.stringify(normalized))}catch{}
  window.dispatchEvent(new CustomEvent('meg:profile-avatar-changed',{detail:{userId:id,preference:normalized}}));
  for(let attempt=0;attempt<3;attempt+=1){
    try{
      const cloud=await readCloudState();
      const existing=cloud.state?.profileAvatars&&typeof cloud.state.profileAvatars==='object'&&!Array.isArray(cloud.state.profileAvatars)
        ? cloud.state.profileAvatars as Record<string,unknown>:{};
      await patchCloudStateProperties({profileAvatars:{...existing,[id]:normalized}},cloud.revision);
      return{preference:normalized,synced:true};
    }catch(error){
      if((error as {status?:number}).status===409&&attempt<2)continue;
      return{preference:normalized,synced:false};
    }
  }
  return{preference:normalized,synced:false};
}
export async function imageToEvolutionAvatar(file:File){
  if(!file.type.startsWith('image/'))throw new Error('Selecione uma imagem válida.');
  if(file.size>8*1024*1024)throw new Error('A imagem deve ter no máximo 8 MB.');
  const source=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(new Error('Não foi possível ler a imagem.'));reader.readAsDataURL(file)});
  const image=await new Promise<HTMLImageElement>((resolve,reject)=>{const element=new Image();element.onload=()=>resolve(element);element.onerror=()=>reject(new Error('Não foi possível abrir a imagem.'));element.src=source});
  const canvas=document.createElement('canvas');canvas.width=320;canvas.height=320;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Seu navegador não conseguiu preparar a foto.');
  const side=Math.min(image.naturalWidth,image.naturalHeight),sx=(image.naturalWidth-side)/2,sy=(image.naturalHeight-side)/2;
  ctx.drawImage(image,sx,sy,side,side,0,0,320,320);
  return canvas.toDataURL('image/jpeg',.84);
}
