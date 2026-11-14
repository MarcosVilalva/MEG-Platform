import {Prisma,UserStatus,prisma} from '@meg/database';

/**
 * Etapa 10: resolução estritamente consultiva de proprietário/workspace.
 * Não chama resolveWorkspaceContext/ensurePrimaryWorkspace, que podem escrever.
 * Não conecta este módulo automaticamente a endpoints ou produção.
 */
export async function resolveStage10ReadOnlyWorkspace(actorId:string){
 if(!actorId.trim())throw new Error('STAGE10_READ_ACCESS_DENIED');
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
  return {actorId,ownerId:membership.workspace.ownerId,
   workspaceId:membership.workspaceId,membershipId:membership.id};
 },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead,timeout:10000});
}
