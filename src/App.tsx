import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { 
  BookOpen, 
  Users, 
  BarChart3, 
  Calendar, 
  FileText, 
  Settings, 
  LogOut, 
  Plus, 
  Search,
  ChevronRight,
  Printer,
  Download,
  Save,
  UserPlus,
  Trash2,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Student, AttendanceRecord, Lesson, Grade } from './types';
import { generateStudentReportPDF, generateClassAttendancePDF } from './utils/pdfGenerator';

// --- Components ---

const Button = ({ children, onClick, className = "", variant = "primary", icon: Icon }: any) => {
  const base = "flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all active:scale-95 shadow-sm";
  const variants: any = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-white text-blue-600 border border-blue-100 hover:bg-blue-50",
    danger: "bg-red-500 text-white hover:bg-red-600",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100"
  };
  return (
    <button onClick={onClick} className={`${base} ${variants[variant]} ${className}`}>
      {Icon && <Icon size={20} />}
      {children}
    </button>
  );
};

const Card = ({ children, className = "", title }: any) => (
  <div className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-100 ${className}`}>
    {title && <h3 className="text-lg font-semibold mb-4 text-gray-800">{title}</h3>}
    {children}
  </div>
);

const Input = ({ label, ...props }: any) => (
  <div className="flex flex-col gap-1 w-full">
    {label && <label className="text-sm font-medium text-gray-600">{label}</label>}
    <input 
      {...props} 
      className="px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
    />
  </div>
);

const Select = ({ label, options, ...props }: any) => (
  <div className="flex flex-col gap-1 w-full">
    {label && <label className="text-sm font-medium text-gray-600">{label}</label>}
    <select 
      {...props} 
      className="px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
    >
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

// --- Views ---

const LoginView = () => {
  const { login } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', discipline: '', classes: [] });
  const [configStatus, setConfigStatus] = useState<any>(null);
  const [isResetting, setIsResetting] = useState(false);

  const fetchWithTimeout = async (url: string, options: any = {}, timeout = 10000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  };

  useEffect(() => {
    fetchWithTimeout('/api/config-check')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => setConfigStatus(data))
      .catch(err => {
        console.error("Erro ao checar config:", err);
        // Silently fail here to not annoy user if it's just a slow start
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    try {
      const res = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        if (isRegister && data.message) {
          alert(data.message);
          setIsRegister(false);
        } else {
          login(data);
        }
      } else {
        let errorMessage = data.error || 'Ocorreu um erro inesperado.';
        if (errorMessage.includes('email rate limit exceeded')) {
          errorMessage = 'Limite de envios de e-mail excedido. Por favor, aguarde alguns minutos antes de tentar novamente ou verifique as configurações de Rate Limit no seu painel do Supabase.';
        }
        alert(`Erro: ${errorMessage}`);
      }
    } catch (error) {
      console.error("Erro na requisição:", error);
      alert("Erro de conexão com o servidor. Verifique se o servidor está rodando.");
    }
  };

  const handleResetPassword = async () => {
    if (!formData.email) {
      alert("Por favor, insira seu e-mail primeiro.");
      return;
    }
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
      } else {
        alert(`Erro: ${data.error}`);
      }
    } catch (error) {
      alert("Erro ao enviar e-mail de recuperação.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl"
      >
        {configStatus && (
          <div className="mb-6 p-4 rounded-xl text-sm border">
            {!configStatus.supabaseConfigured ? (
              <div className="text-red-600 bg-red-50 p-2 rounded">
                <p className="font-bold mb-1">⚠️ Configuração Necessária</p>
                <p>As chaves do Supabase não foram encontradas. Adicione <strong>SUPABASE_URL</strong> e <strong>SUPABASE_SERVICE_ROLE_KEY</strong> nos Secrets do AI Studio.</p>
              </div>
            ) : !configStatus.dbConnection ? (
              <div className="text-amber-600 bg-amber-50 p-2 rounded">
                <p className="font-bold mb-1">⚠️ Erro de Conexão</p>
                <p>Conectado ao Supabase, mas falhou ao acessar as tabelas. Verifique se as tabelas foram criadas no SQL Editor.</p>
                {configStatus.dbError && <p className="mt-1 text-xs opacity-75">Erro: {configStatus.dbError}</p>}
              </div>
            ) : (
              <div className="text-green-600 bg-green-50 p-2 rounded">
                <p className="font-bold">✅ Banco de Dados Conectado</p>
              </div>
            )}
          </div>
        )}
        
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <BookOpen size={40} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Diário Escolar</h1>
          <p className="text-gray-500">Escola Dom João VI</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <Input 
              label="Nome Completo" 
              placeholder="Seu nome" 
              required 
              value={formData.name} 
              onChange={(e: any) => setFormData({...formData, name: e.target.value})}
            />
          )}
          <Input 
            label="E-mail" 
            type="email" 
            placeholder="seu@email.com" 
            required 
            value={formData.email}
            onChange={(e: any) => setFormData({...formData, email: e.target.value})}
          />
          <Input 
            label="Senha" 
            type="password" 
            placeholder="••••••••" 
            required 
            value={formData.password}
            onChange={(e: any) => setFormData({...formData, password: e.target.value})}
          />
          {!isRegister && (
            <div className="flex justify-end">
              <button 
                type="button"
                onClick={handleResetPassword}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                <Key size={12} />
                Esqueci minha senha
              </button>
            </div>
          )}
          {isRegister && (
            <Input 
              label="Disciplina" 
              placeholder="Ex: Matemática" 
              required 
              value={formData.discipline}
              onChange={(e: any) => setFormData({...formData, discipline: e.target.value})}
            />
          )}
          
          <Button className="w-full mt-6">{isRegister ? 'Criar Conta' : 'Entrar'}</Button>
        </form>

        <button 
          onClick={() => setIsRegister(!isRegister)}
          className="w-full mt-6 text-sm text-blue-600 font-medium hover:underline"
        >
          {isRegister ? 'Já tem uma conta? Entre aqui' : 'Não tem conta? Cadastre-se'}
        </button>
      </motion.div>
    </div>
  );
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [selectedGrade, setSelectedGrade] = useState('6º ano');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  const grades = ['6º ano', '7º ano', '8º ano', '9º ano'];

  useEffect(() => {
    fetchStudents();
  }, [selectedGrade]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/students?grade=${selectedGrade}`);
      const data = await res.json();
      if (res.ok) {
        setStudents(data || []);
      } else {
        console.error("Erro ao buscar alunos:", data.error);
      }
    } catch (error) {
      console.error("Erro de conexão ao buscar alunos:", error);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { id: 'home', label: 'Início', icon: BookOpen },
    { id: 'students', label: 'Alunos', icon: Users },
    { id: 'attendance', label: 'Frequência', icon: Calendar },
    { id: 'lessons', label: 'Aulas', icon: FileText },
    { id: 'grades', label: 'Notas', icon: BarChart3 },
    { id: 'reports', label: 'Relatórios', icon: Printer },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <BookOpen size={24} />
            </div>
            <span className="font-bold text-gray-800 leading-tight">Dom João VI</span>
          </div>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Diário Digital</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id 
                ? 'bg-blue-50 text-blue-600 font-semibold' 
                : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-bold">
              {(user?.name || (user as any)?.nome || 'P')[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{user?.name || (user as any)?.nome || 'Professor'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.discipline}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut size={20} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {menuItems.find(m => m.id === activeTab)?.label}
            </h2>
            <p className="text-gray-500">Escola Municipal Dom João VI</p>
          </div>
          <div className="flex items-center gap-3">
            <Select 
              options={grades.map(g => ({ value: g, label: g }))}
              value={selectedGrade}
              onChange={(e: any) => setSelectedGrade(e.target.value)}
            />
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'home' && <HomeView user={user} students={students} />}
            {activeTab === 'students' && <StudentsView grade={selectedGrade} students={students} onUpdate={fetchStudents} />}
            {activeTab === 'attendance' && <AttendanceView grade={selectedGrade} students={students} user={user} />}
            {activeTab === 'lessons' && <LessonsView grade={selectedGrade} user={user} />}
            {activeTab === 'grades' && <GradesView grade={selectedGrade} students={students} user={user} />}
            {activeTab === 'reports' && <ReportsView grade={selectedGrade} students={students} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

const HomeView = ({ user, students }: any) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <Card className="bg-blue-600 text-white border-none">
      <h4 className="text-blue-100 text-sm font-medium mb-1">Bem-vindo(a), Prof.</h4>
      <h3 className="text-2xl font-bold mb-4">{user?.name}</h3>
      <p className="text-blue-100 text-sm">Disciplina: {user?.discipline}</p>
    </Card>
    <Card title="Total de Alunos">
      <div className="flex items-end gap-2">
        <span className="text-4xl font-bold text-gray-800">{students.length}</span>
        <span className="text-gray-400 mb-1">Alunos na turma</span>
      </div>
    </Card>
    <Card title="Acesso Rápido">
      <div className="grid grid-cols-2 gap-2">
        <button className="p-3 bg-gray-50 rounded-xl text-sm font-medium hover:bg-blue-50 hover:text-blue-600 transition-all">Nova Aula</button>
        <button className="p-3 bg-gray-50 rounded-xl text-sm font-medium hover:bg-blue-50 hover:text-blue-600 transition-all">Lançar Notas</button>
      </div>
    </Card>
  </div>
);

const StudentsView = ({ grade, students, onUpdate }: any) => {
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({ name: '', age: '', parent_name: '', phone: '', address: '' });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, grade })
    });
    if (res.ok) {
      setShowAdd(false);
      setFormData({ name: '', age: '', parent_name: '', phone: '', address: '' });
      onUpdate();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este aluno?')) return;
    
    const res = await fetch(`/api/students/${id}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      onUpdate();
    } else {
      const data = await res.json();
      alert(`Erro ao excluir: ${data.error}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">Lista de Alunos - {grade}</h3>
        <Button onClick={() => setShowAdd(true)} icon={UserPlus}>Cadastrar Aluno</Button>
      </div>

      {showAdd && (
        <Card title="Novo Aluno" className="border-blue-200 bg-blue-50/30">
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Nome Completo" required value={formData.name} onChange={(e: any) => setFormData({...formData, name: e.target.value})} />
            <Input label="Idade" type="number" value={formData.age} onChange={(e: any) => setFormData({...formData, age: e.target.value})} />
            <Input label="Nome do Pai/Responsável" value={formData.parent_name} onChange={(e: any) => setFormData({...formData, parent_name: e.target.value})} />
            <Input label="Telefone" value={formData.phone} onChange={(e: any) => setFormData({...formData, phone: e.target.value})} />
            <div className="md:col-span-2">
              <Input label="Endereço" value={formData.address} onChange={(e: any) => setFormData({...formData, address: e.target.value})} />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 mt-2">
              <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancelar</Button>
              <Button type="submit">Salvar Aluno</Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden p-0">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Nome</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Idade</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Responsável</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Telefone</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {students.map((s: Student) => (
              <tr key={s.id} className="hover:bg-gray-50/50 transition-all">
                <td className="px-6 py-4 text-sm text-gray-800 font-medium">{s.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{s.age} anos</td>
                <td className="px-6 py-4 text-sm text-gray-500">{s.parent_name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{s.phone}</td>
                <td className="px-6 py-4 text-sm text-right">
                  <button 
                    onClick={() => handleDelete(s.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Excluir Aluno"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

const AttendanceView = ({ grade, students, user }: any) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<any>({});

  useEffect(() => {
    fetchAttendance();
  }, [date, grade]);

  const fetchAttendance = async () => {
    const res = await fetch(`/api/attendance?grade=${grade}&date=${date}`);
    const data = await res.json();
    const mapping: any = {};
    data.forEach((r: any) => {
      mapping[r.student_id] = r.status;
    });
    setRecords(mapping);
  };

  const setStatus = (studentId: number, status: string) => {
    setRecords({ ...records, [studentId]: status });
  };

  const handleSave = async () => {
    const payload = Object.entries(records).map(([student_id, status]) => ({
      student_id: parseInt(student_id),
      status
    }));
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: payload, teacher_id: user.id, date })
    });
    if (res.ok) alert('Frequência salva com sucesso!');
  };

  const handleExport = () => {
    const data = students.map((s: Student) => ({
      student_name: s.name,
      status: records[s.id] || 'absent'
    }));
    generateClassAttendancePDF(grade, date, data);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Input type="date" value={date} onChange={(e: any) => setDate(e.target.value)} className="max-w-xs" />
        <div className="flex gap-2">
          <Button variant="secondary" icon={Printer} onClick={handleExport}>Exportar PDF</Button>
          <Button icon={Save} onClick={handleSave}>Salvar Chamada</Button>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Aluno</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {students.map((s: Student) => (
              <tr key={s.id} className="hover:bg-gray-50/50">
                <td className="px-6 py-4 text-sm text-gray-800 font-medium">{s.name}</td>
                <td className="px-6 py-4">
                  <div className="flex justify-center gap-2">
                    <button 
                      onClick={() => setStatus(s.id, 'present')}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${records[s.id] === 'present' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}
                    >P</button>
                    <button 
                      onClick={() => setStatus(s.id, 'absent')}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${records[s.id] === 'absent' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400'}`}
                    >F</button>
                    <button 
                      onClick={() => setStatus(s.id, 'justified')}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${records[s.id] === 'justified' ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-400'}`}
                    >J</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

const LessonsView = ({ grade, user }: any) => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({ date: new Date().toISOString().split('T')[0], content: '', activities: '', observations: '' });

  useEffect(() => {
    fetchLessons();
  }, [grade]);

  const fetchLessons = async () => {
    const res = await fetch(`/api/lessons?grade=${grade}`);
    const data = await res.json();
    setLessons(data);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/lessons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, grade, teacher_id: user.id })
    });
    if (res.ok) {
      setShowAdd(false);
      setFormData({ date: new Date().toISOString().split('T')[0], content: '', activities: '', observations: '' });
      fetchLessons();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Excluir este registro de aula?')) return;
    const res = await fetch(`/api/lessons/${id}`, { method: 'DELETE' });
    if (res.ok) fetchLessons();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">Conteúdo das Aulas</h3>
        <Button onClick={() => setShowAdd(true)} icon={Plus}>Registrar Aula</Button>
      </div>

      {showAdd && (
        <Card title="Novo Registro de Aula">
          <form onSubmit={handleAdd} className="space-y-4">
            <Input type="date" label="Data" required value={formData.date} onChange={(e: any) => setFormData({...formData, date: e.target.value})} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-600">Conteúdo Trabalhado</label>
              <textarea 
                required
                className="px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none h-24"
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
              />
            </div>
            <Input label="Atividades Aplicadas" value={formData.activities} onChange={(e: any) => setFormData({...formData, activities: e.target.value})} />
            <Input label="Observações" value={formData.observations} onChange={(e: any) => setFormData({...formData, observations: e.target.value})} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancelar</Button>
              <Button type="submit">Salvar Registro</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-4">
        {lessons.map((lesson) => (
          <Card key={lesson.id} className="border-l-4 border-l-blue-500">
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm font-bold text-blue-600">{lesson.date}</span>
              <button 
                onClick={() => handleDelete(lesson.id)}
                className="p-1 text-gray-400 hover:text-red-500 transition-all"
                title="Excluir Aula"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <h4 className="font-semibold text-gray-800 mb-2">{lesson.content}</h4>
            <div className="text-sm text-gray-500 space-y-1">
              <p><strong>Atividades:</strong> {lesson.activities}</p>
              {lesson.observations && <p><strong>Obs:</strong> {lesson.observations}</p>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

const GradesView = ({ grade, students, user }: any) => {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({ student_id: '', activity_name: '', score: '', type: 'activity', date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    fetchGrades();
  }, [grade]);

  const fetchGrades = async () => {
    const res = await fetch(`/api/grades?grade=${grade}`);
    const data = await res.json();
    setGrades(data);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/grades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, teacher_id: user.id })
    });
    if (res.ok) {
      setShowAdd(false);
      setFormData({ student_id: '', activity_name: '', score: '', type: 'activity', date: new Date().toISOString().split('T')[0] });
      fetchGrades();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Excluir esta nota?')) return;
    const res = await fetch(`/api/grades/${id}`, { method: 'DELETE' });
    if (res.ok) fetchGrades();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">Lançamento de Notas</h3>
        <Button onClick={() => setShowAdd(true)} icon={Plus}>Lançar Nota</Button>
      </div>

      {showAdd && (
        <Card title="Nova Nota">
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select 
              label="Aluno" 
              required 
              value={formData.student_id} 
              onChange={(e: any) => setFormData({...formData, student_id: e.target.value})}
              options={[{ value: '', label: 'Selecione um aluno' }, ...students.map((s: Student) => ({ value: s.id, label: s.name }))]}
            />
            <Input label="Nome da Atividade" required value={formData.activity_name} onChange={(e: any) => setFormData({...formData, activity_name: e.target.value})} />
            <Input label="Nota" type="number" step="0.1" required value={formData.score} onChange={(e: any) => setFormData({...formData, score: e.target.value})} />
            <Select 
              label="Tipo" 
              value={formData.type} 
              onChange={(e: any) => setFormData({...formData, type: e.target.value})}
              options={[{ value: 'activity', label: 'Atividade' }, { value: 'test', label: 'Prova' }]}
            />
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancelar</Button>
              <Button type="submit">Lançar</Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden p-0">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Aluno</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Atividade</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Tipo</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Nota</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {grades.map((g: Grade) => (
              <tr key={g.id} className="hover:bg-gray-50/50">
                <td className="px-6 py-4 text-sm text-gray-800 font-medium">{g.student_name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{g.activity_name}</td>
                <td className="px-6 py-4 text-sm text-gray-500 uppercase">{g.type}</td>
                <td className="px-6 py-4 text-sm font-bold text-blue-600">{g.score.toFixed(1)}</td>
                <td className="px-6 py-4 text-sm text-right">
                  <button 
                    onClick={() => handleDelete(g.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-all"
                    title="Excluir Nota"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

const ReportsView = ({ students }: any) => {
  const handleExport = async (studentId: number) => {
    const res = await fetch(`/api/reports/student/${studentId}`);
    const data = await res.json();
    generateStudentReportPDF(data);
  };

  return (
    <div className="space-y-6">
      <Card title="Gerar Boletins">
        <div className="space-y-2">
          {students.map((s: Student) => (
            <div key={s.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all">
              <span className="font-medium text-gray-800">{s.name}</span>
              <Button variant="secondary" icon={Download} onClick={() => handleExport(s.id)}>Boletim PDF</Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
    </div>
  );

  return user ? <Dashboard /> : <LoginView />;
}
