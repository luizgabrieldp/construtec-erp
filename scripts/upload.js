import { execSync } from 'node:child_process';

function run(cmd, silent = false) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: silent ? 'pipe' : 'inherit' });
  } catch (err) {
    if (silent) return null;
    throw err;
  }
}

function dataHoraAtual() {
  const d = new Date();
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const ano = d.getFullYear();
  const hora = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${ano} às ${hora}:${min}`;
}

console.log('\n🚀 Iniciando sincronização e upload para o GitHub...\n');

// 1. Verificar status
const status = run('git status --porcelain', true);

// 2. Adicionar modificações
run('git add .');

const customMsg = process.argv.slice(2).join(' ').trim();
const commitMsg = customMsg || `feat: atualização do sistema (${dataHoraAtual()})`;

if (status && status.trim().length > 0) {
  console.log(`📦 Criando commit: "${commitMsg}"...`);
  run(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`);
} else {
  console.log('ℹ️  Nenhum arquivo modificado pendente de commit.');
}

// 3. Verificar se o repositório remoto está configurado
const remote = run('git remote -v', true);

if (!remote || !remote.includes('origin')) {
  console.log('\n⚠️  Repositório remoto do GitHub ainda não está vinculado!');
  console.log('------------------------------------------------------------');
  console.log('Para vincular ao seu GitHub e ativar o upload automático:');
  console.log('1. Crie um novo repositório em https://github.com/new');
  console.log('2. Copie a URL do repositório e execute no terminal:');
  console.log('\n   git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git');
  console.log('   git push -u origin main\n');
  console.log('Depois disso, sempre que quiser subir as alterações bastará rodar:');
  console.log('👉 npm run upload\n');
  process.exit(0);
}

// 4. Enviar para o GitHub
console.log('📤 Enviando modificações para o GitHub (git push)...');
try {
  run('git push -u origin main');
  console.log('\n✅ Upload concluído com sucesso!');
  console.log('🌐 O GitHub receberá as alterações e disparará o deploy automático na Vercel / Firebase Hosting.');
} catch (err) {
  console.error('\n❌ Erro ao enviar para o GitHub. Verifique suas credenciais do Git.');
}
