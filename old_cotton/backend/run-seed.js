const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const seedData = require('./seed_data.json');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed com dados do Excel...');

  try {
    // Clientes
    const clientesNomes = seedData.clientes;
    const clientesCreated = [];
    for (let i = 0; i < clientesNomes.length; i++) {
      const nome = clientesNomes[i];
      const cliente = await prisma.cliente.upsert({
        where: { nome },
        update: {},
        create: {
          nome: nome.trim(),
          cnpj: `00000000000${String(i + 1).padStart(3, '0')}`,
          email: `contato@${nome.toLowerCase().replace(/\s+/g, '')}.com`,
        },
      });
      clientesCreated.push(cliente);
    }
    console.log(`✅ ${clientesCreated.length} clientes criados do Excel`);

    // Origens
    const origensData = seedData.origens_principais;
    const origensCreated = [];
    for (const nomeCompleto of origensData) {
      const [cidade, estado] = nomeCompleto.split('-');
      const origem = await prisma.origem.upsert({
        where: { nome: nomeCompleto },
        update: {},
        create: {
          nome: nomeCompleto,
          localizacao: cidade?.trim() || 'Desconhecida',
          estado: estado?.trim() || 'XX',
        },
      });
      origensCreated.push(origem);
    }
    console.log(`✅ ${origensCreated.length} origens criadas do Excel`);

    // Terminais
    const terminaisData = seedData.terminais;
    const terminaisCreated = [];
    for (const term of terminaisData) {
      const terminal = await prisma.terminal.upsert({
        where: { nome: term.nome },
        update: {},
        create: {
          nome: term.nome,
          tipoAcesso: term.dados_agendamento?.toLowerCase().includes('link') ? 'LINK' : 'EMAIL',
          linkSistema: term.dados_agendamento?.match(/https?:\/\/[^\s]+/)?.[0],
          login: term.login || null,
          senha: term.senha || null,
          emailsContato: term.dados_agendamento?.includes('EMAIL') ? [term.dados_agendamento] : null,
          instrucoesEspecificas: term.dados_agendamento,
        },
      });
      terminaisCreated.push(terminal);
    }
    console.log(`✅ ${terminaisCreated.length} terminais criados do Excel`);

    // Modelos de Carretas
    const modelosNomes = seedData.modelos;
    const capacidadesMap = {
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

    const modelosCreated = [];
    for (const nome of modelosNomes) {
      const cap = capacidadesMap[nome] || { fardos: 200, peso: 45000 };
      const modelo = await prisma.modeloCarreta.upsert({
        where: { nomeDescricao: nome },
        update: {},
        create: {
          nomeDescricao: nome,
          capacidadeMaximaFardos: cap.fardos,
          pesoMaximoKg: cap.peso,
        },
      });
      modelosCreated.push(modelo);
    }
    console.log(`✅ ${modelosCreated.length} modelos de carretas criados do Excel`);

    // Transportadoras
    const transportadoras = [];
    const t1 = await prisma.transportadora.upsert({
      where: { nome: 'FIBRA FORTE TRANSPORTES' },
      update: {},
      create: {
        nome: 'FIBRA FORTE TRANSPORTES',
        cnpj: '38948791000159',
        email: 'contato@fibraforte.com',
      },
    });
    transportadoras.push(t1);

    const t2 = await prisma.transportadora.upsert({
      where: { nome: 'TRANSPORTADORA CENTRAL' },
      update: {},
      create: {
        nome: 'TRANSPORTADORA CENTRAL',
        cnpj: '12345678000100',
        email: 'contato@central.com',
      },
    });
    transportadoras.push(t2);
    console.log(`✅ ${transportadoras.length} transportadoras criadas`);

    // Usuário Admin
    const senhaHash = await bcrypt.hash('admin123', 12);
    const admin = await prisma.usuario.upsert({
      where: { email: 'admin@cottonfibraforte.com' },
      update: {},
      create: {
        nome: 'Administrador',
        email: 'admin@cottonfibraforte.com',
        senhaHash,
        perfil: 'ADMIN',
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

  } catch (error) {
    console.error('Erro durante seed:', error);
    throw error;
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
