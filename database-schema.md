# Diário Escolar – Dom João VI

## Variáveis de Ambiente
- `GEMINI_API_KEY`: Chave para recursos de IA (opcional).
- `APP_URL`: URL base do aplicativo.

## Estrutura do Banco de Dados (SQLite)
- `teachers`: id, name, email, password, discipline, classes (JSON), role (teacher/admin).
- `students`: id, name, age, grade, parent_name, phone, address.
- `attendance`: id, student_id, date, status (present/absent/justified), teacher_id.
- `lessons`: id, teacher_id, date, grade, content, activities, observations.
- `grades`: id, student_id, teacher_id, activity_name, score, type (activity/test).
