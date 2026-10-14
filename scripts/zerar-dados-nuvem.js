import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDveNWfmv6TIHe7FSD0xXFsGqa1pmlGV7c",
  authDomain: "construtec-erp-2026.firebaseapp.com",
  projectId: "construtec-erp-2026",
  storageBucket: "construtec-erp-2026.firebasestorage.app",
  messagingSenderId: "2271943759",
  appId: "1:2271943759:web:7f11a22447e78c6fcade3a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const hoje = new Date().toISOString().slice(0, 10);

const dadosVazios = {
  version: 3,
  config: { empresa: 'CONSTRUTEC', saldoInicial: 0, dataSaldoInicial: hoje },
  obras: [],
  fornecedores: [],
  materiais: [],
  compras: [],
  movimentos: [],
  locacoes: [],
  funcionarios: [],
  funcoesCustomizadas: [],
  apontamentos: {},
  fechamentos: [],
  servicos: [],
  tarefas: [],
  contasPagar: [],
  contasReceber: [],
  recorrencias: [],
  audit: [
    {
      id: 'au-' + Date.now(),
      ts: new Date().toISOString(),
      perfil: 'admin',
      acao: 'Sistema',
      descricao: 'Sistema zerado para início da operação real'
    }
  ]
};

async function zerar() {
  console.log('🔄 Conectando ao Cloud Firestore para zerar obras, funcionários, presenças e tarefas fictícias...');
  await setDoc(doc(db, 'erp', 'dados'), dadosVazios);
  console.log('✅ Banco de dados zerado com sucesso! Nenhuma conta de usuário foi afetada.');
  process.exit(0);
}

zerar().catch((err) => {
  console.error('❌ Erro ao zerar:', err);
  process.exit(1);
});
