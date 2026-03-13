import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";

// Initialize with placeholders if missing to prevent crash, but routes will check config
const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co", 
  supabaseKey || "placeholder"
);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check for Supabase config
  app.get("/api/config-check", async (req, res) => {
    let dbConnection = false;
    let dbError = null;

    if (supabaseUrl && supabaseKey) {
      try {
        // Try a simple query to check connection
        const { error } = await supabase.from('alunos').select('id').limit(1);
        if (!error) {
          dbConnection = true;
        } else {
          dbError = error.message;
        }
      } catch (err: any) {
        dbError = err.message;
      }
    }

    res.json({ 
      supabaseConfigured: !!(supabaseUrl && supabaseKey),
      dbConnection,
      dbError,
      nodeEnv: process.env.NODE_ENV
    });
  });

  // Auth Routes (Proxying to Supabase Auth)
  app.post("/api/auth/register", async (req, res) => {
    const { name, email, password, discipline } = req.body;
    console.log(`Tentativa de registro para: ${email}`);

    if (!supabaseUrl || !supabaseKey) {
      console.error("ERRO: Chaves do Supabase não configuradas no ambiente.");
      return res.status(500).json({ error: "Configuração do Supabase ausente. Verifique os Secrets do AI Studio." });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome: name, discipline }
      }
    });

    if (error) {
      console.error("Erro no registro Supabase:", error.message);
      return res.status(400).json({ error: error.message });
    }
    
    console.log("Registro bem-sucedido no Supabase Auth");
    
    // Se a sessão for nula, significa que a confirmação de e-mail está ativada no Supabase
    if (!data.session) {
      return res.status(200).json({ 
        message: "Cadastro realizado! Verifique seu e-mail para confirmar a conta antes de fazer o login.",
        requiresConfirmation: true
      });
    }

    res.json({
      ...data.user,
      name: data.user.user_metadata?.nome || name
    });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        console.error("Erro no login Supabase Auth:", error.message);
        return res.status(401).json({ error: error.message });
      }

      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('professores')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.warn("Perfil não encontrado na tabela 'professores'. Verifique se o script SQL foi executado no Supabase.", profileError.message);
        // Return user data even if profile is missing, to allow login if possible
        return res.json({ 
          ...data.user, 
          name: data.user.user_metadata?.nome || 'Professor',
          discipline: data.user.user_metadata?.discipline || 'Não informada'
        });
      }

      // Map 'nome' to 'name' if necessary
      const mappedProfile = {
        ...profile,
        name: profile.nome || data.user.user_metadata?.nome || 'Professor'
      };

      res.json({ ...data.user, ...mappedProfile });
    } catch (err: any) {
      console.error("Erro inesperado no login:", err);
      res.status(500).json({ error: "Erro interno no servidor." });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const { email } = req.body;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${req.headers.origin}/reset-password`,
    });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: "E-mail de recuperação enviado! Verifique sua caixa de entrada." });
  });

  // Student Routes
  app.get("/api/students", async (req, res) => {
    const { grade } = req.query;
    try {
      let query = supabase.from('alunos').select('*');
      
      if (grade) {
        const serieNum = parseInt(grade.toString());
        if (!isNaN(serieNum)) {
          query = query.eq('serie', serieNum);
        }
      }

      const { data, error } = await query;
      if (error) {
        console.error("Erro ao buscar alunos:", error.message);
        return res.status(500).json({ error: "Erro ao buscar alunos. Verifique se a tabela 'alunos' existe." });
      }
      res.json((data || []).map(s => ({
        id: s.id,
        name: s.nome,
        age: s.idade,
        grade: s.serie,
        parent_name: s.responsavel,
        phone: s.telefone_responsavel,
        address: s.endereco
      })));
    } catch (err) {
      console.error("Erro inesperado em /api/students:", err);
      res.status(500).json({ error: "Erro interno." });
    }
  });

  app.post("/api/students", async (req, res) => {
    const { name, age, grade, parent_name, phone, address } = req.body;
    const serieNum = parseInt(grade.toString());
    
    const { data, error } = await supabase
      .from('alunos')
      .insert([{ 
        nome: name, 
        idade: age, 
        serie: serieNum, 
        responsavel: parent_name, 
        telefone_responsavel: phone, 
        endereco: address 
      }])
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  app.delete("/api/students/:id", async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase
      .from('alunos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Erro ao excluir aluno:", error.message);
      return res.status(500).json({ error: error.message });
    }
    res.json({ message: "Aluno excluído com sucesso" });
  });

  // Lesson Routes
  app.get("/api/lessons", async (req, res) => {
    const { grade } = req.query;
    const serieNum = parseInt(grade?.toString() || "0");
    
    const { data, error } = await supabase
      .from('aulas')
      .select('*')
      .eq('serie', serieNum)
      .order('data', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data.map(r => ({
      ...r,
      content: r.conteudo,
      activities: r.atividades,
      observations: r.observacoes,
      teacher_id: r.professor_id,
      grade: r.serie
    })));
  });

  app.post("/api/lessons", async (req, res) => {
    const { teacher_id, date, grade, content, activities, observations } = req.body;
    const serieNum = parseInt(grade.toString());

    const { data, error } = await supabase
      .from('aulas')
      .insert([{
        professor_id: teacher_id,
        data: date,
        serie: serieNum,
        conteudo: content,
        atividades: activities,
        observacoes: observations
      }])
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  app.delete("/api/lessons/:id", async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase
      .from('aulas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Erro ao excluir aula:", error.message);
      return res.status(500).json({ error: error.message });
    }
    res.json({ message: "Aula excluída com sucesso" });
  });

  // Grade Routes
  app.get("/api/grades", async (req, res) => {
    const { grade } = req.query;
    const serieNum = parseInt(grade?.toString() || "0");

    const { data, error } = await supabase
      .from('notas')
      .select('*, alunos!inner(nome, serie)')
      .eq('alunos.serie', serieNum);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data.map(r => ({ 
      ...r, 
      student_name: (r as any).alunos.nome,
      activity_name: r.atividade,
      score: r.nota,
      type: r.tipo,
      date: r.data
    })));
  });

  app.post("/api/grades", async (req, res) => {
    const { student_id, teacher_id, activity_name, score, type, date } = req.body;

    const { data, error } = await supabase
      .from('notas')
      .insert([{
        aluno_id: student_id,
        professor_id: teacher_id,
        atividade: activity_name,
        nota: parseFloat(score),
        tipo: type,
        data: date
      }])
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  app.delete("/api/grades/:id", async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase
      .from('notas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Erro ao excluir nota:", error.message);
      return res.status(500).json({ error: error.message });
    }
    res.json({ message: "Nota excluída com sucesso" });
  });

  // Attendance Routes
  app.get("/api/attendance", async (req, res) => {
    const { grade, date } = req.query;
    const serieNum = parseInt(grade?.toString() || "0");
    
    const { data, error } = await supabase
      .from('frequencia')
      .select('*, alunos!inner(nome, serie)')
      .eq('alunos.serie', serieNum)
      .eq('data_aula', date);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data.map(r => ({ ...r, student_name: (r as any).alunos.nome })));
  });

  app.post("/api/attendance", async (req, res) => {
    const { records, teacher_id, date } = req.body;
    
    const studentIds = records.map((r: any) => r.student_id);
    await supabase.from('frequencia').delete().eq('data_aula', date).in('aluno_id', studentIds);

    const { data, error } = await supabase
      .from('frequencia')
      .insert(records.map((r: any) => ({
        aluno_id: r.student_id,
        status: r.status,
        data_aula: date,
        registrado_por: teacher_id,
        turma_id: r.turma_id || '00000000-0000-0000-0000-000000000000'
      })));

    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  });

  // Report Routes
  app.get("/api/reports/student/:id", async (req, res) => {
    const { id } = req.params;
    
    try {
      const { data: student, error: studentError } = await supabase
        .from('alunos')
        .select('*')
        .eq('id', id)
        .single();

      if (studentError) throw studentError;

      const { data: attendance, error: attendanceError } = await supabase
        .from('frequencia')
        .select('*')
        .eq('aluno_id', id);

      if (attendanceError) throw attendanceError;

      const { data: grades, error: gradesError } = await supabase
        .from('notas')
        .select('*')
        .eq('aluno_id', id);

      if (gradesError) throw gradesError;

      res.json({
        student: {
          name: student.nome,
          grade: student.serie,
          parent_name: student.responsavel
        },
        attendance: attendance.map(a => ({ date: a.data_aula, status: a.status })),
        grades: grades.map(g => ({ activity: g.atividade, score: g.nota, type: g.tipo, date: g.data }))
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ... other routes updated similarly ...

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
