import { test, expect } from '@playwright/test';
const APP='http://127.0.0.1:4173/web-evolution.html';
test.use({launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROME_PATH||undefined}});
test.setTimeout(25_000);
async function doubleSubmit(page){return page.evaluate(()=>{const f=document.querySelector('form');if(!f)throw new Error('form absent');f.requestSubmit();f.requestSubmit();});}
test('Criar Conta: envio síncrono duplo deve chamar API somente uma vez',async({page})=>{
 let calls=0;
 await page.route('**/api/auth/register',async r=>{calls++;await r.fulfill({status:202,contentType:'application/json',body:JSON.stringify({status:'PENDING_APPROVAL',message:'Solicitação recebida.',administratorEmail:'fixture@example.test'})})});
 await page.goto(APP+'?auth=create-account');
 await page.locator('input[name=name]').fill('Usuário Teste');
 await page.locator('input[name=email]').fill('create.fixture@example.test');
 await page.locator('input[name=phone]').fill('11999999999');
 await page.locator('input[name=password]').fill('FictionalPassword123!');
 await page.locator('input[name=confirmPassword]').fill('FictionalPassword123!');
 await doubleSubmit(page);
 await expect.poll(()=>calls).toBeGreaterThan(0);
 await expect(page.getByRole('heading',{name:'Aguardando aprovação'})).toBeVisible();
 expect(calls,'duplicate register must not occur').toBe(1);
});
test('Criar Conta: confirmação deve ter uma só ação Voltar ao login',async({page})=>{
 await page.route('**/api/auth/register',r=>r.fulfill({status:202,contentType:'application/json',body:JSON.stringify({status:'PENDING_APPROVAL',message:'Recebida',administratorEmail:'fixture@example.test'})}));
 await page.goto(APP+'?auth=create-account');
 await page.locator('input[name=name]').fill('Usuário Teste');
 await page.locator('input[name=email]').fill('create.fixture@example.test');
 await page.locator('input[name=phone]').fill('11999999999');
 await page.locator('input[name=password]').fill('FictionalPassword123!');
 await page.locator('input[name=confirmPassword]').fill('FictionalPassword123!');
 await page.getByRole('button',{name:'Continuar'}).click();
 await expect(page.getByRole('heading',{name:'Aguardando aprovação'})).toBeVisible();
 expect(await page.getByRole('button',{name:'Voltar ao login'}).count()).toBe(1);
});
test('Recuperar Senha: submissão síncrona dupla deve realizar somente uma chamada',async({page})=>{
 let calls=0;
 await page.route('**/api/auth/forgot-password',async r=>{calls++;await r.fulfill({status:202,contentType:'application/json',body:JSON.stringify({status:'PASSWORD_SENT',deliveredTo:'fixture@example.test',notifications:[]})})});
 await page.goto(APP+'?auth=recover-password');
 await page.locator('input[name=email]').fill('fixture@example.test');
 await doubleSubmit(page);
 await expect.poll(()=>calls).toBeGreaterThan(0);
 await expect(page.getByRole('heading',{name:'Solicitação recebida'})).toBeVisible();
 expect(calls,'duplicate forgot-password must not occur').toBe(1);
});
test('Login: duas submissões no mesmo ciclo não duplicam /auth/login',async({page})=>{
 let calls=0;
 await page.route('**/api/auth/login',async r=>{calls++;await r.fulfill({status:401,contentType:'application/json',body:JSON.stringify({error:'INVALID_CREDENTIALS'})})});
 await page.goto(APP);
 await page.locator('input[name=email]').fill('fixture@example.test');
 await page.locator('input[name=password]').fill('FictionalPassword123!');
 await doubleSubmit(page);
 await expect.poll(()=>calls).toBeGreaterThan(0);
 await expect(page.getByText('E-mail ou senha incorretos. Confira os dados e tente novamente.')).toBeVisible();
 expect(calls,'duplicate login attempts must not occur').toBe(1);
});
