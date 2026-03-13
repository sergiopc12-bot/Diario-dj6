import { jsPDF } from "jspdf";
import "jspdf-autotable";

// Extend jsPDF with autotable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export const generateStudentReportPDF = (data: any) => {
  const doc = new jsPDF();
  const { student, attendance, grades } = data;

  doc.setFontSize(18);
  doc.text("Escola Municipal Dom João VI", 105, 20, { align: "center" });
  doc.setFontSize(12);
  doc.text("Povoado São Domingos dos Castros", 105, 28, { align: "center" });
  doc.text("Boletim Escolar", 105, 36, { align: "center" });

  doc.setFontSize(10);
  doc.text(`Aluno: ${student.name}`, 20, 50);
  doc.text(`Série: ${student.grade}`, 20, 56);
  doc.text(`Pai/Responsável: ${student.parent_name}`, 20, 62);

  // Grades Table
  doc.text("Notas", 20, 75);
  doc.autoTable({
    startY: 80,
    head: [["Atividade", "Tipo", "Nota", "Data"]],
    body: grades.map((g: any) => [g.activity_name, g.type, g.score, g.date]),
  });

  // Attendance Summary
  const total = attendance.length;
  const present = attendance.filter((a: any) => a.status === "present").length;
  const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : "100";

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.text("Resumo de Frequência", 20, finalY);
  doc.text(`Total de Aulas: ${total}`, 20, finalY + 8);
  doc.text(`Presenças: ${present}`, 20, finalY + 14);
  doc.text(`Frequência: ${percentage}%`, 20, finalY + 20);

  doc.save(`boletim_${student.name.replace(/\s+/g, "_")}.pdf`);
};

export const generateClassAttendancePDF = (grade: string, date: string, records: any[]) => {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(`Frequência - ${grade} - ${date}`, 105, 20, { align: "center" });
  
  doc.autoTable({
    startY: 30,
    head: [["Aluno", "Status"]],
    body: records.map(r => [r.student_name, r.status === 'present' ? 'Presente' : r.status === 'absent' ? 'Faltou' : 'Justificado']),
  });

  doc.save(`frequencia_${grade}_${date}.pdf`);
};
