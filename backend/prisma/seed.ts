import { PrismaClient, TipoAcesso, PerfilUsuario } from '@prisma/client';
import bcrypt from 'bcryptjs';
import seedData from '../seed_data.json';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed com dados do Excel...');

  // Clientes a partir do Excel
  const clientesNomes = seedData.clientes;
  const clientesCreated = await Promise.all(
    clientesNomes.map((nome, idx) =>
      prisma.cliente.upsert({
        where: { nome },
        update: {},
        create: {
          nome: nome.trim(),
          cnpj: `00000000000${String(idx + 1).padStart(3, '0')}`,
          email: `contato@${nome.toLowerCase().replace(/\s+/g, '')}.com`,
        },
      })
    )
  );
  console.log(`✅ ${clientesCreated.length} clientes criados do Excel`);

  // Origens / Filiais a partir do Excel
  const origensData = seedData.origens_principais;
  const origensCreated = await Promise.all(
    origensData.map((nomeCompleto) => {
      const [cidade, estado] = nomeCompleto.split('-');
      return prisma.origem.upsert({
        where: { nome: nomeCompleto },
        update: {},
        create: {
          nome: nomeCompleto,
          localizacao: cidade?.trim() || 'Desconhecida',
          estado: estado?.trim() || 'XX',
        },
      });
    })
  );
  console.log(`✅ ${origensCreated.length} origens criadas do Excel`);

  // Terminais a partir do Excel
  const terminaisData = seedData.terminais;
  const terminaisCreated = await Promise.all(
    terminaisData.map((term) =>
      prisma.terminal.upsert({
        where: { nome: term.nome },
        update: {},
        create: {
          nome: term.nome,
          tipoAcesso: term.dados_agendamento?.toLowerCase().includes('link') ? TipoAcesso.LINK : TipoAcesso.EMAIL,
          linkSistema: term.dados_agendamento?.match(/https?:\/\/[^\s]+/)?.[0],
          login: term.login || undefined,
          senha: term.senha || undefined,
          emailsContato: term.dados_agendamento?.includes('EMAIL') ? [term.dados_agendamento] : undefined,
          instrucoesEspecificas: term.dados_agendamento,
        },
      })
    )
  );
  console.log(`✅ ${terminaisCreated.length} terminais criados do Excel`);

  // Modelos de Carretas
  const modelosNomes = seedData.modelos;
  const capacidadesMap: Record<string, { fardos: number; peso: number }> = {
    'RODOTREM': { fardos: 280, peso: 74000 },
    'RODOTREM SIDER': { fardos: 280, peso: 74000 },
    'LS SIDER': { fardos: 220, peso: 45000 },
    'LS GRANELEIRO': { fardos: 200, peso: 45000 },
    '4º EIXOS': { fardos: 180, peso: 35000 },
    '4º EIXOS SIDER': { fardos: 180, peso: 35000 },
    'VANDERLEIA': { fardos: 300, peso: 57000 },
    'VANDERLEIA SIDER': { fardos: 300, peso: 57000 },
    'BITREM': { fardos: 260, peso: 57000 },
    'BITRUCK': { fardos: 140, peso: 29000 },
    'BITRUCK SIDER': { fardos: 140, peso: 29000 },
    'TRUCK': { fardos: 100, peso: 14000 },
    'TRUCK SIDER': { fardos: 100, peso: 14000 },
  };

  const modelosCreated = await Promise.all(
    modelosNomes.map((nome) => {
      const cap = capacidadesMap[nome] || { fardos: 200, peso: 45000 };
      return prisma.modeloCarreta.upsert({
        where: { nomeDescricao: nome },
        update: {},
        create: {
          nomeDescricao: nome,
          capacidadeMaximaFardos: cap.fardos,
          pesoMaximoKg: cap.peso,
        },
      });
    })
  );
  console.log(`✅ ${modelosCreated.length} modelos de carretas criados do Excel`);

  // Transportadoras padrão
  const transportadoras = await Promise.all([
    prisma.transportadora.upsert({
      where: { nome: 'FIBRA FORTE TRANSPORTES' },
      update: {},
      create: {
        nome: 'FIBRA FORTE TRANSPORTES',
        cnpj: '38948791000159',
        email: 'contato@fibraforte.com',
      },
    }),
    prisma.transportadora.upsert({
      where: { nome: 'TRANSPORTADORA CENTRAL' },
      update: {},
      create: {
        nome: 'TRANSPORTADORA CENTRAL',
        cnpj: '12345678000100',
        email: 'contato@central.com',
      },
    }),
  ]);
  console.log(`✅ ${transportadoras.length} transportadoras criadas`);

  // Usuário Admin padrão
  const senhaHash = await bcrypt.hash('admin123', 12);
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@cottonfibraforte.com' },
    update: {},
    create: {
      nome: 'Administrador',
      email: 'admin@cottonfibraforte.com',
      senhaHash,
      perfil: PerfilUsuario.ADMIN,
    },
  });
  console.log(`✅ Usuário admin criado: ${admin.email}`);

  console.log('\n🎉 Seed concluído com sucesso!');
  console.log('   Email: admin@cottonfibraforte.com');
  console.log('   Senha: admin123');
  console.log(`\n📊 Resumo:`);
  console.log(`   - ${clientesCreated.length} clientes`);
  console.log(`   - ${origensCreated.length} origens`);
  console.log(`   - ${terminaisCreated.length} terminais`);
  console.log(`   - ${modelosCreated.length} modelos de carretas`);
  console.log(`   - ${transportadoras.length} transportadoras`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
