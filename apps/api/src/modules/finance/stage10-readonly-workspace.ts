import {Prisma,UserStatus,prisma} from '@meg/database';

/**
 * Etapa 10: autorização e leituras na MESMA transação estritamente consultiva.
 * Não usa resolveWorkspaceContext/ensurePrimaryWorkspace, que podem escrever.
 * A consulta sem membership ativo falha sem reparar ou criar dados.
 */
export type Stage10ReadOnlyScope={
 actorId:string;ownerId:string;workspaceId:string;membershipId:string;
};
export async function withStage10ReadOnlyWorkspace<T>(
 actorId:string,
 read:(tx:Prisma.TransactionClient,scope:Stage10ReadOnlyScope)=>Promise<T>,
):Promise<T>{
 if(typeof actorId!=='string'||!actorId.trim())
  throw new Error('STAGE10_READ_ACCESS_DENIED');
 return prisma.$transaction(async tx=>{
  await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
  const actor=await tx.user.findUnique({
   where:{id:actorId},select:{id:true,isActive:true,status:true},
  });
  if(!actor?.isActive||actor.status!==UserStatus.ACTIVE)
   throw new Error('STAGE10_READ_ACCESS_DENIED');
  const where={userId:actorId,isActive:true,status:UserStatus.ACTIVE} as const;
  const owned=await tx.workspaceMember.findFirst({
   where:{...where,workspace:{isActive:true,ownerId:actorId}},
   orderBy:{createdAt:'asc'},include:{workspace:true},
  });
  const membership=owned??await tx.workspaceMember.findFirst({
   where:{...where,workspace:{isActive:true}},
   orderBy:{createdAt:'asc'},include:{workspace:true},
  });
  if(!membership||!membership.workspace.isActive)
   throw new Error('STAGE10_READ_ACCESS_DENIED');
  return read(tx,{actorId,ownerId:membership.workspace.ownerId,
   workspaceId:membership.workspaceId,membershipId:membership.id});
 },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead,
     maxWait:5000,timeout:20000});
}
export function resolveStage10ReadOnlyWorkspace(actorId:string){
 return withStage10ReadOnlyWorkspace(actorId,async(_tx,scope)=>scope);
}
