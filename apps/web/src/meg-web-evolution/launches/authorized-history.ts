import type {FinancialEvent, FinancialEventPage, FinancialHistorySnapshot} from '../../app/finance-client';

export type HistoryProgress = { loaded: number; total: number; pass: 1 | 2; mode?: 'snapshot' | 'legacy' };
export type HistoryPageRequest = (page: number, pageSize: number, signal: AbortSignal) => Promise<FinancialEventPage>;
const PAGE_SIZE = 100;
const MAX_CONCURRENT_PAGES = 4;

/**
 * GET /finance/events ainda nao expoe uma revisao/snapshot transacional.
 * Leitura em duas passagens: nunca expor resultados parciais a filtros/exportacao.
 *
 * O primeiro GET fixa a contagem da passagem; as paginas restantes sao
 * consultadas em lotes limitados, anexadas em ordem de pagina e validadas
 * por total, tamanho e ID unico. Comparar as duas passagens e o sync-token
 * no chamador reduz o risco de alteração concorrente, mas nao e snapshot.
 * Nao recalcula valores nem altera eventos financeiros.
 */
export async function readAuthorizedHistory(
  fetchPage: HistoryPageRequest,
  signal: AbortSignal,
  onProgress: (progress: HistoryProgress) => void = () => {},
): Promise<FinancialEvent[]> {
  async function pass(number: 1 | 2): Promise<FinancialEvent[]> {
    const ids = new Set<string>();
    const rows: FinancialEvent[] = [];
    const assertActive = () => {
      if (signal.aborted) throw new DOMException('Consulta cancelada.', 'AbortError');
    };
    const first = await fetchPage(1, PAGE_SIZE, signal);
    assertActive();
    if (!first || !Number.isSafeInteger(first.total) || first.total < 0 ||
        first.page !== 1 || first.pageSize !== PAGE_SIZE || !Array.isArray(first.items)) {
      throw new Error('A API retornou paginação financeira inválida.');
    }
    const expected = first.total;
    const totalPages = Math.max(1, Math.ceil(expected / PAGE_SIZE));

    function append(page: number, result: FinancialEventPage) {
      assertActive();
      if (!result || !Number.isSafeInteger(result.total) || result.total !== expected ||
          result.page !== page || result.pageSize !== PAGE_SIZE || !Array.isArray(result.items)) {
        throw new Error('O número de lançamentos mudou durante a consulta. Atualize o histórico.');
      }
      const offset = (page - 1) * PAGE_SIZE;
      const requiredLength = Math.min(PAGE_SIZE, Math.max(0, expected - offset));
      if (result.items.length !== requiredLength || rows.length !== offset) {
        throw new Error('A consulta retornou uma página incompleta ou repetida. Atualize o histórico.');
      }
      for (const item of result.items) {
        if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id)) {
          throw new Error('Foram encontrados registros inválidos ou repetidos. Atualize o histórico.');
        }
        ids.add(item.id);
        rows.push(item);
      }
      onProgress({loaded: rows.length, total: expected, pass: number});
    }

    append(1, first);
    for (let begin = 2; begin <= totalPages; begin += MAX_CONCURRENT_PAGES) {
      assertActive();
      const pages = Array.from(
        {length: Math.min(MAX_CONCURRENT_PAGES, totalPages - begin + 1)},
        (_, index) => begin + index,
      );
      const responses = await Promise.all(pages.map(page => fetchPage(page, PAGE_SIZE, signal)));
      assertActive();
      // Respostas podem chegar fora de ordem; anexar somente na ordem canonica.
      responses.forEach((result, index) => append(pages[index]!, result));
    }
    return rows;
  }
  const first = await pass(1);
  const second = await pass(2);
  if (first.length !== second.length ||
      first.some((entry, index) => JSON.stringify(entry) !== JSON.stringify(second[index]))) {
    throw new Error('O histórico mudou durante a verificação. Atualize para evitar resultados incompletos.');
  }
  return second;
}

/**
 * Preferir snapshot REPEATABLE READ da API: uma consulta autenticada traz
 * todas as linhas consistentes, sem duas passagens HTTP. O fallback continua
 * seguro: endpoint ausente (404/405/501), falha de transporte da
 * rota opcional ou limite explicitamente excedido. Somente o histórico antigo
 * integralmente validado pode ser exibido. Erros 5xx e conteúdo inválido
 * retornado pela autoridade financeira continuam bloqueantes.
 */
export async function readSmartAuthorizedHistory(
  fetchSnapshot: (signal:AbortSignal)=>Promise<FinancialHistorySnapshot>,
  fetchPage: HistoryPageRequest,
  signal: AbortSignal,
  onProgress:(progress:HistoryProgress)=>void=()=>{},
): Promise<FinancialEvent[]> {
  const legacy=()=>readAuthorizedHistory(fetchPage,signal,progress=>onProgress({...progress,mode:'legacy'}));
  let snapshot:FinancialHistorySnapshot;
  try {
    snapshot=await fetchSnapshot(signal);
  }catch(error){
    if(signal.aborted)throw new DOMException('Consulta cancelada.','AbortError');
    const status=(error as {status?:number}|null)?.status;
    // Em previews com proxy/CORS legado, a nova rota opcional pode falhar
    // no transporte antes de retornar um HTTP. Só neste caso tentamos a
    // leitura existente, que ainda exige duas passagens e integridade total.
    // Uma falha da leitura legada também interrompe a tela, sem dados parciais.
    const optionalNetworkFailure=error instanceof TypeError &&
      /^(?:Failed to fetch|NetworkError.*|Load failed)$/i.test(error.message);
    if(status===404||status===405||status===501||optionalNetworkFailure)return legacy();
    throw error;
  }
  if(signal.aborted)throw new DOMException('Consulta cancelada.','AbortError');
  if(!snapshot||snapshot.protocol!=='financial-history-v1') {
    throw new Error('A API retornou um protocolo de histórico desconhecido.');
  }
  if(snapshot.kind==='limit-exceeded'){
    if(!Number.isSafeInteger(snapshot.total)||!Number.isSafeInteger(snapshot.limit)||
       snapshot.total<=snapshot.limit||snapshot.limit<=0) {
      throw new Error('A API retornou limite de histórico inconsistente.');
    }
    return legacy();
  }
  if(snapshot.kind!=='complete'||snapshot.consistency!=='repeatable-read'||
     !Array.isArray(snapshot.items)||!Number.isSafeInteger(snapshot.total)||
     snapshot.total<0||snapshot.total>5000||snapshot.items.length!==snapshot.total){
    throw new Error('A API retornou snapshot financeiro incompleto.');
  }
  const ids=new Set<string>();
  for(const item of snapshot.items){
    if(!item||typeof item.id!=='string'||!item.id||ids.has(item.id)){
      throw new Error('O snapshot financeiro contém registros inválidos ou repetidos.');
    }
    ids.add(item.id);
  }
  onProgress({loaded:snapshot.total,total:snapshot.total,pass:2,mode:'snapshot'});
  return snapshot.items;
}

export function displayMoney(value: string | number): number {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new Error('Valor monetario invalido na consulta.');
  }
  const amount = Number(value);
  if (!Number.isFinite(amount) || !Number.isSafeInteger(Math.round(amount * 100))) {
    throw new Error('Valor monetario fora dos limites de exibicao.');
  }
  return amount; // Conversao apenas para Intl.NumberFormat; sem calculos de negocio.
}
