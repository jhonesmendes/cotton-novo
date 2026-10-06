import { PrismaClient } from '@prisma/client';
import { contextoAtual } from '../services/auditoria-contexto';

// Cliente "cru", sem auditoria — usado pela própria auditoria (leitura do estado
// anterior e gravação do log) para não auditar a si mesma.
export const prismaBase = new PrismaClient();

// Logs/tokens gerados pelo próprio sistema não são auditados.
const MODELOS_IGNORADOS = new Set(['AuditoriaLog', 'AlertaLog', 'PasswordResetToken']);
const OPERACOES_AUDITADAS = new Set(['create', 'update', 'upsert', 'delete', 'updateMany', 'deleteMany']);
// Campos que mudam sozinhos e só poluiriam o histórico.
const CAMPOS_IGNORADOS = new Set(['createdAt', 'updatedAt', 'lastLogin']);
const CAMPOS_SENSIVEIS = new Set(['senhaHash', 'senha']);
// Teto de registros lidos por updateMany/deleteMany — protege contra varreduras enormes.
const LIMITE_EM_LOTE = 1000;

type Registro = Record<string, unknown>;

function delegate(model: string) {
  return (prismaBase as any)[model.charAt(0).toLowerCase() + model.slice(1)];
}

// Só campos escalares (relações vindas de `include` são objetos/arrays e ficam de fora).
function escalares(registro: Registro | null | undefined): Registro {
  const saida: Registro = {};
  if (!registro) return saida;
  for (const [campo, valor] of Object.entries(registro)) {
    if (CAMPOS_IGNORADOS.has(campo)) continue;
    if (valor !== null && typeof valor === 'object' && !(valor instanceof Date)) continue;
    saida[campo] = valor instanceof Date ? valor.toISOString() : valor;
  }
  return saida;
}

function mascarar(dados: Registro): Registro {
  const saida = { ...dados };
  for (const campo of Object.keys(saida)) {
    if (CAMPOS_SENSIVEIS.has(campo)) saida[campo] = saida[campo] == null ? null : '***';
  }
  return saida;
}

function descrever(model: string, r: Registro): string | null {
  const valor =
    model === 'Veiculo' ? r.placa
    : model === 'Liberacao' ? r.instrucao
    : model === 'Usuario' ? r.email
    : model === 'ModeloCarreta' ? [r.nomeDescricao, r.placaVeiculo].filter(Boolean).join(' · ')
    : model === 'ReferenciaCadastro' ? `${r.tipo}: ${r.valor}`
    : r.nome ?? null;
  return valor == null || valor === '' ? null : String(valor).slice(0, 255);
}

function liberacaoDe(model: string, r: Registro): number | null {
  if (model === 'Liberacao') return r.id as number;
  return typeof r.liberacaoId === 'number' ? r.liberacaoId : null;
}

// `data` de updateMany só com valores simples (sem increment/connect etc.):
// dá pra calcular o "depois" sem reler o banco — importante dentro de
// $transaction, onde uma leitura fora da transação ainda veria o valor antigo.
function dadosSimples(data: unknown): Registro | null {
  if (!data || typeof data !== 'object') return null;
  for (const valor of Object.values(data)) {
    if (valor !== null && typeof valor === 'object' && !(valor instanceof Date)) return null;
  }
  return data as Registro;
}

interface Entrada {
  model: string;
  acao: 'INSERT' | 'UPDATE' | 'DELETE';
  antes: Registro | null;
  depois: Registro | null;
}

async function gravar(entradas: Entrada[]) {
  const contexto = contextoAtual();
  if (!contexto) return;

  const linhas = entradas.flatMap(({ model, acao, antes, depois }) => {
    const a = escalares(antes);
    const d = escalares(depois);
    const referencia = (depois ?? antes) as Registro;
    let campos: string[];
    let dadosAntigos: Registro | null = null;
    let dadosNovos: Registro | null = null;

    if (acao === 'UPDATE') {
      campos = Object.keys(d).filter((c) => c in a && JSON.stringify(a[c]) !== JSON.stringify(d[c]));
      if (campos.length === 0) return []; // nada mudou de fato (ex: carregado recalculado igual)
      dadosAntigos = mascarar(Object.fromEntries(campos.map((c) => [c, a[c]])));
      dadosNovos = mascarar(Object.fromEntries(campos.map((c) => [c, d[c]])));
    } else if (acao === 'INSERT') {
      campos = Object.keys(d);
      dadosNovos = mascarar(d);
    } else {
      campos = Object.keys(a);
      dadosAntigos = mascarar(a);
    }

    return [{
      usuarioId: contexto.usuarioId,
      tabelaAfetada: model,
      registroId: Number(referencia.id),
      acao,
      dadosAntigos: dadosAntigos ? JSON.stringify(dadosAntigos) : null,
      dadosNovos: dadosNovos ? JSON.stringify(dadosNovos) : null,
      camposAlterados: campos.join(','),
      descricao: descrever(model, referencia),
      liberacaoId: liberacaoDe(model, referencia),
      ip: contexto.ip,
      rota: contexto.rota,
    }];
  });

  if (linhas.length > 0) await prismaBase.auditoriaLog.createMany({ data: linhas });
}

const prisma = prismaBase.$extends({
  name: 'auditoria',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        // Fora de requisição autenticada (login, seed, scripts) não há quem
        // responsabilizar — segue sem auditar.
        if (!contextoAtual() || MODELOS_IGNORADOS.has(model) || !OPERACOES_AUDITADAS.has(operation)) {
          return query(args);
        }
        const tabela = delegate(model);
        const a = args as any;

        let antes: Registro[] = [];
        try {
          if (operation === 'update' || operation === 'delete' || operation === 'upsert') {
            const atual = await tabela.findUnique({ where: a.where });
            if (atual) antes = [atual];
          } else if (operation === 'updateMany' || operation === 'deleteMany') {
            antes = await tabela.findMany({ where: a.where, take: LIMITE_EM_LOTE });
          }
        } catch (err) {
          console.error('[auditoria] falha ao ler estado anterior', model, operation, err);
        }

        const resultado: any = await query(args);

        try {
          // Com `select` o retorno pode não ter todos os campos — relê pelo id.
          const completo = async (r: any) =>
            a.select && r?.id != null ? (await tabela.findUnique({ where: { id: r.id } })) ?? r : r;

          let entradas: Entrada[] = [];
          if (operation === 'create') {
            entradas = [{ model, acao: 'INSERT', antes: null, depois: await completo(resultado) }];
          } else if (operation === 'upsert') {
            entradas = [{ model, acao: antes.length ? 'UPDATE' : 'INSERT', antes: antes[0] ?? null, depois: await completo(resultado) }];
          } else if (operation === 'update') {
            entradas = [{ model, acao: 'UPDATE', antes: antes[0] ?? null, depois: await completo(resultado) }];
          } else if (operation === 'updateMany') {
            const simples = dadosSimples(a.data);
            const depois: Registro[] = simples
              ? antes.map((r) => ({ ...r, ...simples }))
              : await tabela.findMany({ where: { id: { in: antes.map((r) => r.id) } } });
            const porId = new Map(depois.map((r) => [r.id, r]));
            entradas = antes.map((r) => ({ model, acao: 'UPDATE' as const, antes: r, depois: porId.get(r.id) ?? null }));
          } else {
            entradas = antes.map((r) => ({ model, acao: 'DELETE' as const, antes: r, depois: null }));
          }
          await gravar(entradas.filter((e) => e.antes || e.depois));
        } catch (err) {
          // Falha na auditoria não pode desfazer/derrubar a operação que já foi feita.
          console.error('[auditoria] falha ao gravar log', model, operation, err);
        }

        return resultado;
      },
    },
  },
});

export default prisma;
