import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

function walkFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

console.log('🧪 Validando Lotes 2 e 3 (RBAC, Folha, Configurações, UI Industrial, Notificações, Assets)...\n');

// 1. Fluxo da Folha (Baixa / Estorno / Fechamento / Sem WhatsApp)
const folhaSrc = readFileSync(resolve('src/pages/FolhaPage.tsx'), 'utf-8');
assert.ok(folhaSrc.includes('Dar Baixa') || folhaSrc.includes('dar baixa'), 'FolhaPage deve oferecer ação de Dar Baixa');
assert.ok(folhaSrc.includes('Estornar'), 'FolhaPage deve oferecer ação de Estornar pagamento');
assert.ok(folhaSrc.includes('dataPagamento') && folhaSrc.includes('formaPagamento'), 'FolhaPage deve registrar dataPagamento e formaPagamento na baixa');
assert.ok(!folhaSrc.toLowerCase().includes('wa.me') && !folhaSrc.toLowerCase().includes('whatsapp'), 'FolhaPage não deve enviar recibos via WhatsApp');

const fechamentoSrc = readFileSync(resolve('src/features/folha/FechamentoFolhaDialog.tsx'), 'utf-8');
assert.ok(fechamentoSrc.includes('useEffect'), 'FechamentoFolhaDialog deve resetar estado via useEffect');
assert.ok(fechamentoSrc.includes('periodoInvalido'), 'FechamentoFolhaDialog deve validar período inicio <= fim');
assert.ok(fechamentoSrc.includes('type="button"'), 'Botão Adicionar ajuste deve ter type="button"');

const reciboIndSrc = readFileSync(resolve('src/features/folha/RecibosFolhaDialog.tsx'), 'utf-8');
const reciboEmpSrc = readFileSync(resolve('src/features/folha/ReciboEmpreiteiroDialog.tsx'), 'utf-8');
assert.ok(!reciboIndSrc.toLowerCase().includes('whatsapp') && !reciboIndSrc.includes('wa.me'), 'RecibosFolhaDialog não deve conter integração WhatsApp');
assert.ok(!reciboEmpSrc.toLowerCase().includes('whatsapp') && !reciboEmpSrc.includes('wa.me'), 'ReciboEmpreiteiroDialog não deve conter integração WhatsApp');
console.log('1. ✅ Fluxo de Folha, Baixa/Estorno e Recibos (sem WhatsApp) validado.');

// 2. Configurações da Empresa e RBAC de Abas
const configSrc = readFileSync(resolve('src/pages/ConfiguracoesPage.tsx'), 'utf-8');
assert.ok(configSrc.includes('Dados da Empresa'), 'ConfiguracoesPage deve exibir seção Dados da Empresa');
assert.ok(configSrc.includes('atualizarConfig'), 'ConfiguracoesPage deve salvar Dados da Empresa via atualizarConfig');
assert.ok(configSrc.includes("!isAdmin && (abaAtiva === 'usuarios' || abaAtiva === 'empresa')"), 'Abas empresa e usuarios devem exigir isAdmin');
assert.ok(configSrc.includes("queryTab") || configSrc.includes("aba"), 'ConfiguracoesPage deve aceitar parâmetro de aba');
console.log('2. ✅ Dados da Empresa editáveis e RBAC de configurações validados.');

// 3. Notificações, Toast e Diálogos Acessíveis (zero window.confirm)
const notifSrc = readFileSync(resolve('src/lib/notifications.ts'), 'utf-8');
assert.ok(notifSrc.includes('STORAGE_KEY_DISPAROS'), 'notifications.ts deve persistir disparos diários em localStorage');
assert.ok(notifSrc.includes('t.data < hoje') || notifSrc.includes('atrasad'), 'notifications.ts deve contemplar tarefas atrasadas');

const toastSrc = readFileSync(resolve('src/components/ui/Toast.tsx'), 'utf-8');
assert.ok(toastSrc.includes('dismiss'), 'Toast deve expor dismiss');
assert.ok(toastSrc.includes('onMouseEnter'), 'Toast deve pausar timer no hover');

const srcFiles = walkFiles(resolve('src'));
for (const filePath of srcFiles) {
  const code = readFileSync(filePath, 'utf-8');
  assert.ok(!/\b(?:window\.)?confirm\s*\(/.test(code), `${filePath} não deve usar confirm()/window.confirm() nativo`);
}
console.log('3. ✅ Notificações persistentes, Toast com dismiss e zero confirm() nativo validados.');

// 4. Estética Industrial Limpa ("Zero Cara de IA") e Contraste WCAG AA
assert.ok(!existsSync(resolve('src/components/ui/AntigravityParticlesCanvas.tsx')), 'AntigravityParticlesCanvas.tsx deve estar removido');

const uiFiles = [
  ...walkFiles(resolve('src/components')),
  ...walkFiles(resolve('src/pages')),
  ...walkFiles(resolve('src/features')),
];
for (const filePath of uiFiles) {
  const code = readFileSync(filePath, 'utf-8');
  assert.ok(!code.includes('AntigravityParticlesCanvas'), `${filePath} não deve referenciar AntigravityParticlesCanvas`);
  assert.ok(!/\b(?:Sparkles|Rocket)\b/.test(code), `${filePath} não deve usar ícones Sparkles/Rocket`);
  assert.ok(!code.includes('blur-3xl'), `${filePath} não deve usar halos blur-3xl estilo IA`);
}

const cssSrc = readFileSync(resolve('src/index.css'), 'utf-8');
assert.ok(cssSrc.includes('--brand-solid: #c94600'), 'index.css deve definir --brand-solid WCAG AA');
assert.ok(cssSrc.includes('--brand-orange: #c94600'), 'index.css deve definir --brand-orange alto contraste no modo claro');

const favSize = statSync(resolve('public/favicon.svg')).size;
assert.ok(favSize < 2048, `public/favicon.svg deve ser SVG vetorial leve (< 2KB), atual: ${favSize} bytes`);

const publicFiles = readdirSync(resolve('public'));
const duplicatePngs = publicFiles.filter((name) => name.includes(' 2.png'));
assert.equal(duplicatePngs.length, 0, `Não devem existir arquivos duplicados " 2.png" em public/: ${duplicatePngs.join(', ')}`);

const apontamentoSrc = readFileSync(resolve('src/features/folha/ApontamentoGrade.tsx'), 'utf-8');
assert.ok(apontamentoSrc.includes('Copiar último dia'), 'ApontamentoGrade deve manter fluxo "Copiar último dia" via Dialog');
assert.ok(apontamentoSrc.includes('Pendente') && apontamentoSrc.includes('planejarCopiaUltimoDia'), 'ApontamentoGrade deve tratar estado neutro Pendente e planejarCopiaUltimoDia');
assert.ok(apontamentoSrc.includes('min-h-[44px]') && apontamentoSrc.includes('min-w-[44px]'), 'ApontamentoGrade deve respeitar alvo de toque >= 44px no mobile');

console.log('4. ✅ Estética industrial limpa, WCAG AA e assets otimizados validados.');
console.log('\n🎉 TODOS OS TESTES DOS LOTES 2 E 3 PASSARAM COM SUCESSO!\n');
