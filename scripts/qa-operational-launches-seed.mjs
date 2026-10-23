import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const db=new PrismaClient();
try{
  if(process.env.NODE_ENV!=='test' || process.env.DATABASE_URL!=='postgresql://ci:ci@127.0.0.1:5432/meg' || !process.env.MEG_TEST_PASSWORD) {
    throw new Error('Ephemeral QA requires local database and generated password');
  }
  const plan=await db.plan.create({data:{code:'QA-LAUNCHES',name:'Plano de Teste Local',maxMembers:3,features:{}}});
  for (const [n,email] of [[1,'finance-owner-a@example.test'],[2,'finance-owner-b@example.test']]){
    const user=await db.user.create({data:{
      email,name:'Usuário Fictício '+n,role:'ADMIN',status:'ACTIVE',isActive:true,
      passwordHash:await bcrypt.hash(process.env.MEG_TEST_PASSWORD,12)
    }});
    const workspace=await db.workspace.create({data:{
      name:'Espaço Fictício '+n,slug:'qa-launches-'+n,ownerId:user.id,
      members:{create:{userId:user.id,role:'ADMIN',status:'ACTIVE',isActive:true}},
      subscription:{create:{planId:plan.id,status:'ACTIVE'}}
    }});
    const account=await db.account.create({data:{userId:user.id,name:'Conta QA '+n,type:'checking',openingBalance:'0'}});
    const records=n===1?251:2;
    await db.financialEvent.createMany({data:Array.from({length:records},(_,i)=>({
      userId:user.id,workspaceId:workspace.id,accountId:account.id,
      description:'Registro Financeiro QA '+n+' #'+String(i).padStart(3,'0'),
      type:i%2===0?'income':'expense',
      status:'paid',
      date:new Date(Date.UTC(2026,((i%2)===0?8:9),i%28+1)),
      competence:(i%2)===0?'2026-09':'2026-10',
      amount:'31.45',signedAmount:i%2===0?'31.45':'-31.45',
      notes:'Somente banco temporário'
    }))});
  }
  console.log('QA_USERS=2 QA_HISTORY_A=251 QA_HISTORY_B=2');
}finally{await db.$disconnect()}
