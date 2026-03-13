-- Migração SQL para Supabase - Diário Escolar Dom João VI

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Professores (Vinculada ao Auth do Supabase)
CREATE TABLE professores (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    telefone TEXT,
    disciplina TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Turmas
CREATE TABLE turmas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome_turma TEXT NOT NULL,
    serie INTEGER NOT NULL,
    turno TEXT NOT NULL,
    ano_letivo INTEGER NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela de Alunos
CREATE TABLE alunos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    idade INTEGER,
    serie INTEGER NOT NULL,
    responsavel TEXT,
    telefone_responsavel TEXT,
    endereco TEXT,
    turma_id UUID REFERENCES turmas(id) ON DELETE SET NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabela de Frequência
CREATE TABLE frequencia (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
    data_aula DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL CHECK (status IN ('presente', 'falta', 'justificado')),
    registrado_por UUID NOT NULL REFERENCES professores(id),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabela Conteúdo das Aulas
CREATE TABLE conteudos_aula (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
    professor_id UUID NOT NULL REFERENCES professores(id) ON DELETE CASCADE,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    disciplina TEXT NOT NULL,
    conteudo TEXT,
    atividade TEXT,
    observacoes TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Tabela de Notas
CREATE TABLE notas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
    disciplina TEXT NOT NULL,
    tipo_avaliacao TEXT NOT NULL, -- atividade, prova, trabalho
    nota NUMERIC(4,2) NOT NULL CHECK (nota >= 0 AND nota <= 10),
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    professor_id UUID NOT NULL REFERENCES professores(id) ON DELETE CASCADE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Tabela de Relatórios
CREATE TABLE relatorios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
    tipo_relatorio TEXT NOT NULL,
    arquivo_url TEXT NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Índices para Performance
CREATE INDEX idx_alunos_turma_id ON alunos(turma_id);
CREATE INDEX idx_frequencia_aluno_id ON frequencia(aluno_id);
CREATE INDEX idx_frequencia_data_aula ON frequencia(data_aula);
CREATE INDEX idx_notas_aluno_id ON notas(aluno_id);
CREATE INDEX idx_conteudos_turma_data ON conteudos_aula(turma_id, data);

-- 10. Configuração de Row Level Security (RLS)

-- Habilitar RLS em todas as tabelas
ALTER TABLE professores ENABLE ROW LEVEL SECURITY;
ALTER TABLE turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE frequencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE conteudos_aula ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE relatorios ENABLE ROW LEVEL SECURITY;

-- Políticas para Professores
-- Professores podem ler seus próprios dados
CREATE POLICY "Professores podem ler seus próprios dados" ON professores
    FOR SELECT USING (auth.uid() = id);

-- Turmas: Todos os professores autenticados podem ver as turmas
CREATE POLICY "Professores autenticados veem turmas" ON turmas
    FOR SELECT TO authenticated USING (true);

-- Alunos: Professores autenticados podem ver e editar alunos
CREATE POLICY "Professores gerenciam alunos" ON alunos
    FOR ALL TO authenticated USING (true);

-- Frequência: Professores gerenciam frequência
CREATE POLICY "Professores gerenciam frequência" ON frequencia
    FOR ALL TO authenticated USING (true);

-- Conteúdos: Professores gerenciam seus próprios conteúdos
CREATE POLICY "Professores gerenciam seus conteúdos" ON conteudos_aula
    FOR ALL TO authenticated USING (auth.uid() = professor_id);

-- Notas: Professores gerenciam notas
CREATE POLICY "Professores gerenciam notas" ON notas
    FOR ALL TO authenticated USING (auth.uid() = professor_id);

-- Relatórios: Professores veem relatórios
CREATE POLICY "Professores veem relatórios" ON relatorios
    FOR SELECT TO authenticated USING (true);

-- 11. Trigger para criar perfil de professor automaticamente ao criar usuário no Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.professores (id, nome, email)
  VALUES (new.id, new.raw_user_meta_data->>'nome', new.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
