import { PopCategory } from '@prisma/client'

/**
 * Interface para templates de POPs
 */
export interface PopTemplate {
  id: string
  title: string
  category: PopCategory
  description: string
  defaultContent: string
  suggestedReviewMonths?: number
}

/**
 * Templates de POPs baseados em RDC 502/2021 (ANVISA) e boas práticas de ILPIs
 *
 * Categoria 1: Gestão e Operação (8 templates)
 * Categoria 2: Enfermagem e Cuidados Diretos (20 templates)
 */
export const POP_TEMPLATES: PopTemplate[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORIA 1: GESTÃO E OPERAÇÃO (8 itens)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'POP_ADMISSAO_RESIDENTE',
    title: 'Admissão de Residente',
    category: PopCategory.GESTAO_OPERACAO,
    description:
      'Procedimento para admissão de novos residentes na ILPI, incluindo documentação, avaliações iniciais e integração.',
    suggestedReviewMonths: 12,
    defaultContent: `
<h1>Admissão de Residente</h1>

<h2>1. Objetivo</h2>
<p>Estabelecer procedimentos padronizados para admissão de novos residentes na instituição.</p>

<h2>2. Documentação Necessária</h2>
<ul>
  <li>Documentos pessoais (RG, CPF)</li>
  <li>Cartão SUS</li>
  <li>Comprovante de residência</li>
  <li>Documentos do responsável legal</li>
  <li>Relatórios médicos e exames recentes</li>
</ul>

<h2>3. Avaliações Iniciais</h2>
<ul>
  <li>Avaliação médica completa</li>
  <li>Avaliação de enfermagem</li>
  <li>Avaliação nutricional</li>
  <li>Avaliação funcional (Katz, Lawton)</li>
  <li>Avaliação cognitiva (MEEM)</li>
  <li>Avaliação de risco de quedas</li>
</ul>

<h2>4. Processo de Integração</h2>
<p>Descrever procedimentos de acolhimento, apresentação da instituição, regras de convivência e adaptação.</p>

<h2>5. Responsabilidades</h2>
<p>[Definir responsabilidades de cada profissional no processo de admissão]</p>
    `.trim(),
  },

  {
    id: 'POP_CONTROLE_INFECCAO',
    title: 'Controle de Infecção e Biossegurança',
    category: PopCategory.GESTAO_OPERACAO,
    description:
      'Medidas de prevenção e controle de infecções, incluindo higienização, isolamento e manejo de surtos.',
    suggestedReviewMonths: 6,
    defaultContent: `
<h1>Controle de Infecção e Biossegurança</h1>

<h2>1. Objetivo</h2>
<p>Prevenir e controlar infecções relacionadas à assistência à saúde (IRAS) na ILPI.</p>

<h2>2. Higienização das Mãos</h2>
<p>Momentos obrigatórios:</p>
<ul>
  <li>Antes de contato com o residente</li>
  <li>Antes de procedimento limpo/asséptico</li>
  <li>Após risco de exposição a fluidos corporais</li>
  <li>Após contato com o residente</li>
  <li>Após contato com áreas próximas ao residente</li>
</ul>

<h2>3. Uso de EPIs</h2>
<p>Indicações para luvas, máscaras, aventais e proteção ocular.</p>

<h2>4. Precauções de Isolamento</h2>
<ul>
  <li>Precauções padrão</li>
  <li>Precauções de contato</li>
  <li>Precauções para gotículas</li>
  <li>Precauções aerossóis</li>
</ul>

<h2>5. Manejo de Surtos</h2>
<p>[Definir fluxo de identificação, notificação e controle de surtos infecciosos]</p>
    `.trim(),
  },

  {
    id: 'POP_GESTAO_MEDICAMENTOS',
    title: 'Gestão de Medicamentos',
    category: PopCategory.GESTAO_OPERACAO,
    description:
      'Recebimento, armazenamento, dispensação e descarte de medicamentos.',
    suggestedReviewMonths: 12,
    defaultContent: `
<h1>Gestão de Medicamentos</h1>

<h2>1. Objetivo</h2>
<p>Garantir o armazenamento adequado, controle de estoque e rastreabilidade de medicamentos.</p>

<h2>2. Recebimento</h2>
<ul>
  <li>Conferência de nota fiscal</li>
  <li>Verificação de lote, validade e integridade</li>
  <li>Registro de entrada no sistema</li>
</ul>

<h2>3. Armazenamento</h2>
<ul>
  <li>Temperatura e umidade adequadas</li>
  <li>Segregação por classe terapêutica</li>
  <li>Identificação clara (nome, lote, validade)</li>
  <li>PEPS (Primeiro que Expira, Primeiro que Sai)</li>
</ul>

<h2>4. Dispensação</h2>
<p>Procedimentos para dispensação individualizada e controle de medicamentos controlados.</p>

<h2>5. Descarte</h2>
<p>Descarte de vencidos, fracionados e resíduos conforme legislação sanitária.</p>
    `.trim(),
  },

  {
    id: 'POP_GERENCIAMENTO_RESIDUOS',
    title: 'Gerenciamento de Resíduos',
    category: PopCategory.GESTAO_OPERACAO,
    description:
      'Segregação, acondicionamento, coleta e destinação de resíduos conforme RDC 222/2018.',
    suggestedReviewMonths: 12,
    defaultContent: `
<h1>Gerenciamento de Resíduos</h1>

<h2>1. Objetivo</h2>
<p>Assegurar o manejo adequado dos resíduos de serviços de saúde conforme RDC ANVISA 222/2018.</p>

<h2>2. Classificação de Resíduos</h2>
<ul>
  <li><strong>Grupo A:</strong> Resíduos infectantes</li>
  <li><strong>Grupo B:</strong> Resíduos químicos</li>
  <li><strong>Grupo C:</strong> Rejeitos radioativos</li>
  <li><strong>Grupo D:</strong> Resíduos comuns</li>
  <li><strong>Grupo E:</strong> Perfurocortantes</li>
</ul>

<h2>3. Segregação e Acondicionamento</h2>
<table>
  <thead>
    <tr>
      <th>Grupo</th>
      <th>Cor do Saco</th>
      <th>Símbolo</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>A</td>
      <td>Branco leitoso</td>
      <td>Infectante</td>
    </tr>
    <tr>
      <td>B</td>
      <td>Laranja</td>
      <td>Químico</td>
    </tr>
    <tr>
      <td>E</td>
      <td>Container rígido</td>
      <td>Perfurocortante</td>
    </tr>
  </tbody>
</table>

<h2>4. Coleta e Transporte Interno</h2>
<p>[Definir rotas, horários e responsáveis]</p>

<h2>5. Destinação Final</h2>
<p>Empresa contratada, manifesto de transporte de resíduos (MTR), certificado de destinação.</p>
    `.trim(),
  },

  {
    id: 'POP_PREVENCAO_QUEDAS',
    title: 'Prevenção de Quedas',
    category: PopCategory.GESTAO_OPERACAO,
    description:
      'Avaliação de risco, medidas preventivas e protocolo de manejo pós-queda.',
    suggestedReviewMonths: 6,
    defaultContent: `
<h1>Prevenção de Quedas</h1>

<h2>1. Objetivo</h2>
<p>Reduzir a incidência de quedas e minimizar danos quando ocorrerem.</p>

<h2>2. Avaliação de Risco</h2>
<p>Aplicar escalas de avaliação (ex: Escala de Morse) na admissão e periodicamente:</p>
<ul>
  <li>Histórico de quedas</li>
  <li>Diagnósticos secundários</li>
  <li>Auxílio para deambulação</li>
  <li>Terapia intravenosa</li>
  <li>Marcha e equilíbrio</li>
  <li>Estado mental</li>
</ul>

<h2>3. Medidas Preventivas</h2>
<ul>
  <li>Iluminação adequada</li>
  <li>Pisos antiderrapantes</li>
  <li>Barras de apoio em banheiros</li>
  <li>Camas com grades</li>
  <li>Calçados adequados</li>
  <li>Revisão de medicamentos</li>
</ul>

<h2>4. Protocolo Pós-Queda</h2>
<ol>
  <li>Avaliação imediata de lesões</li>
  <li>Notificação ao médico e familiares</li>
  <li>Registro em prontuário</li>
  <li>Investigação de causas</li>
  <li>Revisão do plano de cuidados</li>
</ol>
    `.trim(),
  },

  {
    id: 'POP_LIMPEZA_DESINFECCAO',
    title: 'Limpeza e Desinfecção de Ambientes',
    category: PopCategory.GESTAO_OPERACAO,
    description:
      'Rotinas de limpeza, desinfecção e desinfecção terminal de ambientes.',
    suggestedReviewMonths: 12,
    defaultContent: `
<h1>Limpeza e Desinfecção de Ambientes</h1>

<h2>1. Objetivo</h2>
<p>Manter ambientes limpos, seguros e com redução de carga microbiana.</p>

<h2>2. Tipos de Limpeza</h2>
<ul>
  <li><strong>Limpeza concorrente:</strong> Diária, com residente no ambiente</li>
  <li><strong>Limpeza terminal:</strong> Após alta, óbito ou transferência</li>
  <li><strong>Desinfecção:</strong> Superfícies críticas e após contaminação</li>
</ul>

<h2>3. Produtos e Diluições</h2>
<table>
  <thead>
    <tr>
      <th>Produto</th>
      <th>Diluição</th>
      <th>Indicação</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Hipoclorito de sódio</td>
      <td>1% (10.000 ppm)</td>
      <td>Desinfecção de superfícies</td>
    </tr>
    <tr>
      <td>Álcool 70%</td>
      <td>Pronto uso</td>
      <td>Desinfecção de superfícies pequenas</td>
    </tr>
    <tr>
      <td>Detergente neutro</td>
      <td>Conforme fabricante</td>
      <td>Limpeza geral</td>
    </tr>
  </tbody>
</table>

<h2>4. Frequências</h2>
<p>[Definir frequência de limpeza para cada ambiente: quartos, banheiros, áreas comuns, refeitório, etc.]</p>

<h2>5. EPIs Necessários</h2>
<p>Luvas de borracha, avental impermeável, óculos de proteção, calçado fechado.</p>
    `.trim(),
  },

  {
    id: 'POP_NOTIFICACAO_EVENTOS_ADVERSOS',
    title: 'Notificação de Eventos Adversos',
    category: PopCategory.GESTAO_OPERACAO,
    description:
      'Identificação, notificação e investigação de eventos adversos e quase-eventos.',
    suggestedReviewMonths: 12,
    defaultContent: `
<h1>Notificação de Eventos Adversos</h1>

<h2>1. Objetivo</h2>
<p>Promover cultura de segurança com identificação, notificação e aprendizado com eventos adversos.</p>

<h2>2. Definições</h2>
<ul>
  <li><strong>Evento adverso:</strong> Incidente que resulta em dano ao residente</li>
  <li><strong>Quase-evento:</strong> Incidente que não atingiu o residente</li>
  <li><strong>Never event:</strong> Erro grave e evitável</li>
</ul>

<h2>3. Eventos Notificáveis</h2>
<ul>
  <li>Quedas com lesão</li>
  <li>Erros de medicação</li>
  <li>Lesões por pressão adquiridas</li>
  <li>Infecções relacionadas à assistência</li>
  <li>Perda de sonda, cateter ou dispositivo</li>
  <li>Falhas em equipamentos</li>
</ul>

<h2>4. Fluxo de Notificação</h2>
<ol>
  <li>Identificação do evento pelo profissional</li>
  <li>Preenchimento de ficha de notificação</li>
  <li>Comunicação imediata à coordenação</li>
  <li>Investigação e análise de causa raiz</li>
  <li>Implementação de ações corretivas</li>
  <li>Monitoramento de indicadores</li>
</ol>

<h2>5. Cultura Não Punitiva</h2>
<p>Incentivar notificações sem punição, focando em melhorias de processos.</p>
    `.trim(),
  },

  {
    id: 'POP_GESTAO_DOCUMENTOS',
    title: 'Gestão de Documentos e Prontuários',
    category: PopCategory.GESTAO_OPERACAO,
    description:
      'Organização, armazenamento e descarte de prontuários e documentos.',
    suggestedReviewMonths: 12,
    defaultContent: `
<h1>Gestão de Documentos e Prontuários</h1>

<h2>1. Objetivo</h2>
<p>Garantir organização, confidencialidade e rastreabilidade de documentos e prontuários.</p>

<h2>2. Prontuário do Residente</h2>
<p>Documentos obrigatórios:</p>
<ul>
  <li>Ficha de identificação</li>
  <li>Anamnese e exame físico</li>
  <li>Prescrições médicas</li>
  <li>Evolução multiprofissional</li>
  <li>Exames complementares</li>
  <li>Plano de cuidados individualizado</li>
  <li>Termo de consentimento</li>
</ul>

<h2>3. Prontuário Eletrônico</h2>
<p>Uso do sistema RAFA ILPI para registro digital com:</p>
<ul>
  <li>Backup diário</li>
  <li>Controle de acesso por perfil</li>
  <li>Assinatura digital</li>
  <li>Auditoria de alterações</li>
</ul>

<h2>4. Armazenamento</h2>
<ul>
  <li>Prontuários ativos: Acesso rápido</li>
  <li>Prontuários inativos: Arquivo morto</li>
  <li>Prazo de guarda: Mínimo 20 anos (CFM 1.821/2007)</li>
</ul>

<h2>5. Descarte</h2>
<p>Fragmentação e incineração após prazo legal, com registro de destruição.</p>
    `.trim(),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORIA 2: ENFERMAGEM E CUIDADOS DIRETOS (20 itens)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'POP_HIGIENIZACAO_MAOS',
    title: 'Higienização das Mãos',
    category: PopCategory.ENFERMAGEM_CUIDADOS,
    description: 'Técnicas de lavagem e fricção antisséptica das mãos.',
    suggestedReviewMonths: 6,
    defaultContent: `
<h1>Higienização das Mãos</h1>

<h2>1. Objetivo</h2>
<p>Prevenir transmissão cruzada de micro-organismos através da higienização adequada das mãos.</p>

<h2>2. Quando Higienizar</h2>
<ul>
  <li>Antes de contato com o residente</li>
  <li>Antes de procedimento limpo/asséptico</li>
  <li>Após risco de exposição a fluidos corporais</li>
  <li>Após contato com o residente</li>
  <li>Após contato com áreas próximas ao residente</li>
</ul>

<h2>3. Técnica de Lavagem com Água e Sabão</h2>
<ol>
  <li>Molhar as mãos com água</li>
  <li>Aplicar sabão líquido</li>
  <li>Ensaboar palmas, dorso, entre dedos, polegares</li>
  <li>Friccionar unhas e punhos</li>
  <li>Enxaguar com água corrente</li>
  <li>Secar com papel toalha</li>
  <li>Fechar torneira com papel toalha</li>
</ol>

<p><strong>Duração:</strong> 40-60 segundos</p>

<h2>4. Fricção Antisséptica com Álcool Gel 70%</h2>
<p>Aplicar quantidade suficiente e friccionar por 20-30 segundos até secar completamente.</p>

<p><strong>Contraindicações:</strong> Mãos visivelmente sujas ou com matéria orgânica.</p>
    `.trim(),
  },

  {
    id: 'POP_SINAIS_VITAIS',
    title: 'Verificação de Sinais Vitais',
    category: PopCategory.ENFERMAGEM_CUIDADOS,
    description:
      'Aferição de temperatura, pressão arterial, frequência cardíaca e respiratória.',
    suggestedReviewMonths: 12,
    defaultContent: `
<h1>Verificação de Sinais Vitais</h1>

<h2>1. Objetivo</h2>
<p>Monitorar estado clínico do residente através de sinais vitais.</p>

<h2>2. Temperatura</h2>
<ul>
  <li><strong>Axilar:</strong> 35,5°C a 37,0°C</li>
  <li><strong>Oral:</strong> 36,0°C a 37,4°C</li>
  <li><strong>Retal:</strong> 36,5°C a 37,5°C (mais 0,5°C)</li>
</ul>

<h2>3. Pressão Arterial</h2>
<p>Valores de referência:</p>
<ul>
  <li>Ótima: < 120/80 mmHg</li>
  <li>Normal: < 130/85 mmHg</li>
  <li>Hipertensão: ≥ 140/90 mmHg</li>
</ul>

<h2>4. Frequência Cardíaca</h2>
<p>Normal: 60-100 bpm (adultos)</p>

<h2>5. Frequência Respiratória</h2>
<p>Normal: 12-20 irpm (adultos)</p>

<h2>6. Saturação de Oxigênio (SpO2)</h2>
<p>Normal: ≥ 95%</p>

<h2>7. Registro</h2>
<p>Documentar no prontuário com data, hora e observações.</p>
    `.trim(),
  },

  {
    id: 'POP_ADMINISTRACAO_MEDICAMENTOS',
    title: 'Administração de Medicamentos',
    category: PopCategory.ENFERMAGEM_CUIDADOS,
    description:
      'Preparo e administração segura de medicamentos (VO, SC, IM, EV).',
    suggestedReviewMonths: 12,
    defaultContent: `
<h1>Administração de Medicamentos</h1>

<h2>1. Objetivo</h2>
<p>Garantir administração segura de medicamentos seguindo os 9 certos.</p>

<h2>2. Os 9 Certos</h2>
<ol>
  <li>Residente certo</li>
  <li>Medicamento certo</li>
  <li>Dose certa</li>
  <li>Via certa</li>
  <li>Hora certa</li>
  <li>Registro certo</li>
  <li>Orientação certa</li>
  <li>Forma certa</li>
  <li>Resposta certa</li>
</ol>

<h2>3. Vias de Administração</h2>

<h3>3.1. Via Oral (VO)</h3>
<ul>
  <li>Verificar capacidade de deglutição</li>
  <li>Posicionar residente sentado ou semi-sentado</li>
  <li>Oferecer água suficiente</li>
</ul>

<h3>3.2. Via Subcutânea (SC)</h3>
<ul>
  <li>Ângulo: 45° a 90°</li>
  <li>Locais: Região abdominal, deltóide, coxa</li>
  <li>Volume máximo: 1,5 mL</li>
</ul>

<h3>3.3. Via Intramuscular (IM)</h3>
<ul>
  <li>Ângulo: 90°</li>
  <li>Locais: Deltoide, vasto lateral da coxa, ventroglúteo</li>
  <li>Volume máximo: 5 mL (deltoide: 2 mL)</li>
</ul>

<h3>3.4. Via Endovenosa (EV)</h3>
<ul>
  <li>Verificar permeabilidade do acesso</li>
  <li>Seguir velocidade de infusão prescrita</li>
  <li>Monitorar sinais de flebite ou infiltração</li>
</ul>

<h2>4. Registro</h2>
<p>Documentar imediatamente após administração: medicamento, dose, via, horário e intercorrências.</p>
    `.trim(),
  },

  {
    id: 'POP_CURATIVO_SIMPLES',
    title: 'Curativo Simples',
    category: PopCategory.ENFERMAGEM_CUIDADOS,
    description: 'Técnica de limpeza e cobertura de feridas simples.',
    suggestedReviewMonths: 12,
    defaultContent: `
<h1>Curativo Simples</h1>

<h2>1. Objetivo</h2>
<p>Promover cicatrização de feridas através de curativo limpo e adequado.</p>

<h2>2. Materiais Necessários</h2>
<ul>
  <li>Luvas de procedimento</li>
  <li>Soro fisiológico 0,9%</li>
  <li>Gazes estéreis</li>
  <li>Micropore ou esparadrapo</li>
  <li>Tesoura (se necessário)</li>
  <li>Saco de lixo infectante</li>
</ul>

<h2>3. Técnica</h2>
<ol>
  <li>Higienizar as mãos</li>
  <li>Reunir materiais</li>
  <li>Explicar procedimento ao residente</li>
  <li>Calçar luvas de procedimento</li>
  <li>Remover curativo anterior (do centro para fora)</li>
  <li>Avaliar ferida (tamanho, aspecto, exsudato)</li>
  <li>Limpar com SF 0,9% e gazes (do centro para fora)</li>
  <li>Secar com gaze estéril</li>
  <li>Aplicar cobertura adequada</li>
  <li>Fixar com micropore</li>
  <li>Descartar materiais</li>
  <li>Retirar luvas e higienizar mãos</li>
  <li>Registrar em prontuário</li>
</ol>

<h2>4. Registro</h2>
<p>Documentar: localização, dimensões, características da ferida, cobertura utilizada, data e hora.</p>
    `.trim(),
  },

  {
    id: 'POP_PREVENCAO_LESAO_PRESSAO',
    title: 'Prevenção de Lesão por Pressão',
    category: PopCategory.ENFERMAGEM_CUIDADOS,
    description:
      'Avaliação de risco (Escala de Braden) e medidas preventivas.',
    suggestedReviewMonths: 6,
    defaultContent: `
<h1>Prevenção de Lesão por Pressão</h1>

<h2>1. Objetivo</h2>
<p>Prevenir o desenvolvimento de lesões por pressão em residentes acamados ou com mobilidade reduzida.</p>

<h2>2. Avaliação de Risco (Escala de Braden)</h2>
<p>Avaliar na admissão e semanalmente:</p>
<ul>
  <li>Percepção sensorial</li>
  <li>Umidade</li>
  <li>Atividade</li>
  <li>Mobilidade</li>
  <li>Nutrição</li>
  <li>Fricção e cisalhamento</li>
</ul>

<p><strong>Escore de risco:</strong></p>
<ul>
  <li>≤ 9: Risco muito alto</li>
  <li>10-12: Risco alto</li>
  <li>13-14: Risco moderado</li>
  <li>15-18: Risco baixo</li>
  <li>≥ 19: Sem risco</li>
</ul>

<h2>3. Medidas Preventivas</h2>
<ul>
  <li>Mudança de decúbito a cada 2 horas</li>
  <li>Uso de colchão piramidal ou pneumático</li>
  <li>Hidratação da pele</li>
  <li>Manter pele limpa e seca</li>
  <li>Nutrição adequada (proteínas, vitaminas)</li>
  <li>Evitar fricção e cisalhamento</li>
  <li>Elevação de calcanhares com travesseiro</li>
</ul>

<h2>4. Inspeção Diária da Pele</h2>
<p>Avaliar áreas de proeminências ósseas: sacral, trocantérica, calcâneos, escapular, occipital.</p>
    `.trim(),
  },

  {
    id: 'POP_GLICEMIA_CAPILAR',
    title: 'Glicemia Capilar',
    category: PopCategory.ENFERMAGEM_CUIDADOS,
    description: 'Técnica de verificação de glicemia capilar.',
    suggestedReviewMonths: 12,
    defaultContent: `
<h1>Glicemia Capilar</h1>

<h2>1. Objetivo</h2>
<p>Monitorar níveis glicêmicos de residentes diabéticos.</p>

<h2>2. Materiais</h2>
<ul>
  <li>Glicosímetro</li>
  <li>Tiras reagentes (dentro da validade)</li>
  <li>Lancetador e lancetas descartáveis</li>
  <li>Algodão e álcool 70%</li>
  <li>Luvas de procedimento</li>
  <li>Coletor de perfurocortantes</li>
</ul>

<h2>3. Técnica</h2>
<ol>
  <li>Higienizar mãos e calçar luvas</li>
  <li>Ligar glicosímetro e inserir tira reagente</li>
  <li>Limpar lateral de polpa digital com álcool 70%</li>
  <li>Aguardar secar</li>
  <li>Puncionar lateral de polpa digital</li>
  <li>Descartar lanceta em coletor</li>
  <li>Encostar primeira gota de sangue na tira</li>
  <li>Aguardar leitura</li>
  <li>Fazer compressão local com algodão</li>
  <li>Registrar valor no prontuário</li>
</ol>

<h2>4. Valores de Referência</h2>
<ul>
  <li><strong>Jejum:</strong> 70-100 mg/dL (normal)</li>
  <li><strong>Pós-prandial (2h):</strong> < 140 mg/dL</li>
  <li><strong>Hipoglicemia:</strong> < 70 mg/dL</li>
  <li><strong>Hiperglicemia:</strong> > 180 mg/dL</li>
</ul>

<h2>5. Conduta em Hipoglicemia</h2>
<p>Se < 70 mg/dL: oferecer 15g de carboidrato simples (suco, mel), reavaliar em 15 minutos.</p>
    `.trim(),
  },

  {
    id: 'POP_SONDAGEM_VESICAL',
    title: 'Sondagem Vesical de Alívio',
    category: PopCategory.ENFERMAGEM_CUIDADOS,
    description: 'Técnica asséptica de cateterismo vesical intermitente.',
    suggestedReviewMonths: 12,
    defaultContent: `
<h1>Sondagem Vesical de Alívio</h1>

<h2>1. Objetivo</h2>
<p>Esvaziar bexiga de forma asséptica em caso de retenção urinária aguda.</p>

<h2>2. Materiais</h2>
<ul>
  <li>Cateter vesical estéril (12-16 Fr)</li>
  <li>Luvas estéreis</li>
  <li>Gaze estéril</li>
  <li>Antisséptico (PVPI ou clorexidina)</li>
  <li>Lidocaína gel 2%</li>
  <li>Campo fenestrado estéril</li>
  <li>Coletor de urina graduado</li>
  <li>Saco coletor (se demora)</li>
</ul>

<h2>3. Técnica (Mulher)</h2>
<ol>
  <li>Higienizar mãos e preparar materiais</li>
  <li>Posicionar residente em decúbito dorsal com pernas fletidas</li>
  <li>Calçar luvas estéreis</li>
  <li>Fazer antissepsia de grandes lábios, pequenos lábios e meato (sentido crânio-caudal)</li>
  <li>Colocar campo fenestrado</li>
  <li>Lubrificar sonda com lidocaína gel</li>
  <li>Introduzir sonda no meato uretral (6-8 cm) até sair urina</li>
  <li>Drenar urina em coletor graduado</li>
  <li>Retirar sonda lentamente</li>
  <li>Descartar materiais</li>
  <li>Registrar procedimento e volume drenado</li>
</ol>

<h2>4. Complicações</h2>
<ul>
  <li>Infecção do trato urinário</li>
  <li>Trauma uretral</li>
  <li>Hematúria</li>
</ul>
    `.trim(),
  },

  {
    id: 'POP_ASPIRACAO_VIAS_AEREAS',
    title: 'Aspiração de Vias Aéreas',
    category: PopCategory.ENFERMAGEM_CUIDADOS,
    description: 'Técnica de aspiração orotraqueal e nasotraqueal.',
    suggestedReviewMonths: 12,
    defaultContent: `
<h1>Aspiração de Vias Aéreas</h1>

<h2>1. Objetivo</h2>
<p>Remover secreções de vias aéreas superiores quando o residente não consegue expectorar.</p>

<h2>2. Indicações</h2>
<ul>
  <li>Acúmulo de secreções visíveis ou audíveis</li>
  <li>Aumento de esforço respiratório</li>
  <li>Dessaturação (SpO2 < 90%)</li>
  <li>Tosse ineficaz</li>
</ul>

<h2>3. Materiais</h2>
<ul>
  <li>Aspirador a vácuo (pressão: 80-120 mmHg)</li>
  <li>Sonda de aspiração estéril (nº 10-14)</li>
  <li>Luvas estéreis</li>
  <li>Luvas de procedimento</li>
  <li>Óculos de proteção</li>
  <li>Máscara cirúrgica</li>
  <li>SF 0,9% estéril</li>
  <li>Copo descartável com água</li>
</ul>

<h2>4. Técnica</h2>
<ol>
  <li>Higienizar mãos e explicar procedimento</li>
  <li>Elevar cabeceira 30-45°</li>
  <li>Calçar EPI (máscara, óculos, luvas)</li>
  <li>Abrir sonda estéril sem contaminar</li>
  <li>Conectar sonda ao aspirador</li>
  <li>Lubrificar sonda com SF 0,9%</li>
  <li>Introduzir sonda sem aspirar (10-15 cm)</li>
  <li>Aspirar ao retirar com movimentos rotatórios</li>
  <li>Cada aspiração: máximo 10-15 segundos</li>
  <li>Lavar sonda com SF 0,9%</li>
  <li>Repetir se necessário (máximo 3 vezes)</li>
</ol>

<h2>5. Complicações</h2>
<ul>
  <li>Hipóxia</li>
  <li>Bradicardia</li>
  <li>Broncoespasmo</li>
  <li>Trauma de mucosa</li>
</ul>
    `.trim(),
  },

  {
    id: 'POP_BANHO_LEITO',
    title: 'Banho no Leito',
    category: PopCategory.ENFERMAGEM_CUIDADOS,
    description: 'Higiene corporal completa de residentes acamados.',
    suggestedReviewMonths: 12,
    defaultContent: `
<h1>Banho no Leito</h1>

<h2>1. Objetivo</h2>
<p>Promover higiene, conforto e avaliação da pele de residentes acamados.</p>

<h2>2. Materiais</h2>
<ul>
  <li>Bacia com água morna</li>
  <li>Sabonete neutro</li>
  <li>Toalhas de banho (2)</li>
  <li>Lençóis limpos</li>
  <li>Roupas limpas</li>
  <li>Luvas de procedimento</li>
  <li>Fralda geriátrica (se necessário)</li>
  <li>Hidratante corporal</li>
  <li>Pente/escova</li>
</ul>

<h2>3. Técnica</h2>
<ol>
  <li>Higienizar mãos e reunir materiais</li>
  <li>Proporcionar privacidade (biombos, cortinas)</li>
  <li>Calçar luvas de procedimento</li>
  <li>Despir residente e cobrir com lençol</li>
  <li>Lavar sequência: rosto, pescoço, MMSS, tórax, abdome, MMII, dorso, região genital</li>
  <li>Trocar água entre segmentos corporais</li>
  <li>Secar bem entre dobras cutâneas</li>
  <li>Aplicar hidratante</li>
  <li>Vestir com roupas limpas</li>
  <li>Trocar roupa de cama</li>
  <li>Pentear cabelos</li>
  <li>Deixar residente confortável</li>
</ol>

<h2>4. Observações</h2>
<ul>
  <li>Avaliar integridade da pele</li>
  <li>Observar hiperemia em proeminências ósseas</li>
  <li>Registrar intercorrências</li>
</ul>
    `.trim(),
  },

  {
    id: 'POP_MUDANCA_DECUBITO',
    title: 'Mudança de Decúbito',
    category: PopCategory.ENFERMAGEM_CUIDADOS,
    description: 'Posicionamento correto e cronograma de mudanças.',
    suggestedReviewMonths: 12,
    defaultContent: `
<h1>Mudança de Decúbito</h1>

<h2>1. Objetivo</h2>
<p>Prevenir lesões por pressão através de reposicionamento programado.</p>

<h2>2. Frequência</h2>
<p>A cada 2 horas para residentes acamados de alto risco.</p>

<h2>3. Posições</h2>

<h3>3.1. Decúbito Dorsal (Supino)</h3>
<ul>
  <li>Travesseiro sob cabeça e ombros</li>
  <li>Travesseiro sob joelhos (leve flexão)</li>
  <li>Coxins laterais para evitar rotação externa de MMII</li>
</ul>

<h3>3.2. Decúbito Lateral Direito/Esquerdo</h3>
<ul>
  <li>Inclinação de 30° (não 90°)</li>
  <li>Travesseiro entre os joelhos</li>
  <li>Braço superior apoiado em travesseiro</li>
  <li>Evitar apoio direto sobre trocânter</li>
</ul>

<h3>3.3. Decúbito Ventral (Prono)</h3>
<ul>
  <li>Cabeça lateralizada</li>
  <li>Travesseiro sob abdome</li>
  <li>Travesseiro sob tornozelos</li>
  <li><strong>Contraindicado:</strong> Fratura de coluna, aumento de PIC</li>
</ul>

<h3>3.4. Fowler (Sentado 45-60°)</h3>
<ul>
  <li>Cabeceira elevada</li>
  <li>Travesseiro sob joelhos</li>
  <li>Apoio para pés</li>
</ul>

<h2>4. Registro</h2>
<p>Documentar horário e posição em mapa de mudança de decúbito.</p>
    `.trim(),
  },

  {
    id: 'POP_OXIGENOTERAPIA',
    title: 'Oxigenoterapia',
    category: PopCategory.ENFERMAGEM_CUIDADOS,
    description: 'Administração de oxigênio suplementar (cateter, máscara).',
    suggestedReviewMonths: 12,
    defaultContent: `
<h1>Oxigenoterapia</h1>

<h2>1. Objetivo</h2>
<p>Corrigir hipoxemia e garantir adequada oxigenação tecidual.</p>

<h2>2. Indicações</h2>
<ul>
  <li>SpO2 < 90%</li>
  <li>Dispneia, cianose</li>
  <li>Taquipneia (> 24 irpm)</li>
  <li>Insuficiência respiratória</li>
</ul>

<h2>3. Dispositivos</h2>

<table>
  <thead>
    <tr>
      <th>Dispositivo</th>
      <th>Fluxo (L/min)</th>
      <th>FiO2 (%)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Cateter nasal</td>
      <td>1-6</td>
      <td>24-44%</td>
    </tr>
    <tr>
      <td>Máscara simples</td>
      <td>5-8</td>
      <td>40-60%</td>
    </tr>
    <tr>
      <td>Máscara Venturi</td>
      <td>Variável</td>
      <td>24-50% (preciso)</td>
    </tr>
    <tr>
      <td>Máscara reservatório</td>
      <td>10-15</td>
      <td>60-95%</td>
    </tr>
  </tbody>
</table>

<h2>4. Cuidados</h2>
<ul>
  <li>Umidificar oxigênio se fluxo > 4 L/min</li>
  <li>Verificar fixação e conforto</li>
  <li>Monitorar SpO2 continuamente</li>
  <li>Observar ressecamento de mucosas</li>
  <li>Trocar dispositivo diariamente</li>
</ul>

<h2>5. Complicações</h2>
<ul>
  <li>Ressecamento de mucosa nasal</li>
  <li>Epistaxe</li>
  <li>Toxicidade por O2 (FiO2 > 60% prolongado)</li>
</ul>
    `.trim(),
  },

  {
    id: 'POP_COLETA_EXAMES',
    title: 'Coleta de Exames Laboratoriais',
    category: PopCategory.ENFERMAGEM_CUIDADOS,
    description: 'Coleta de sangue, urina e fezes.',
    suggestedReviewMonths: 12,
    defaultContent: `
<h1>Coleta de Exames Laboratoriais</h1>

<h2>1. Coleta de Sangue Venoso</h2>

<h3>Materiais</h3>
<ul>
  <li>Luvas de procedimento</li>
  <li>Garrote</li>
  <li>Algodão e álcool 70%</li>
  <li>Agulha 21-23G</li>
  <li>Tubos a vácuo (cores conforme exame)</li>
  <li>Adaptador para tubos a vácuo</li>
  <li>Esparadrapo ou micropore</li>
</ul>

<h3>Técnica</h3>
<ol>
  <li>Verificar jejum e preparo conforme exame</li>
  <li>Identificar tubos com nome, data e hora</li>
  <li>Higienizar mãos e calçar luvas</li>
  <li>Posicionar braço estendido</li>
  <li>Garrotear 3-4 dedos acima do local</li>
  <li>Palpar veia (preferencialmente cubital média)</li>
  <li>Fazer antissepsia com álcool 70%</li>
  <li>Puncionar veia com ângulo de 15-30°</li>
  <li>Coletar nos tubos na ordem correta</li>
  <li>Soltar garrote antes de retirar agulha</li>
  <li>Comprimir com algodão (não friccionar)</li>
</ol>

<h3>Ordem de Coleta dos Tubos</h3>
<ol>
  <li>Hemocultura (frasco)</li>
  <li>Tampa azul (coagulação)</li>
  <li>Tampa vermelha (soro sem anticoagulante)</li>
  <li>Tampa amarela/gel (bioquímica)</li>
  <li>Tampa roxa (hemograma)</li>
  <li>Tampa cinza (glicose)</li>
</ol>

<h2>2. Coleta de Urina Tipo I</h2>
<ul>
  <li>Colher primeiro jato da manhã</li>
  <li>Desprezar primeiro jato, coletar jato médio</li>
  <li>Higiene íntima prévia</li>
  <li>Coletor estéril</li>
  <li>Enviar ao laboratório em até 1 hora</li>
</ul>

<h2>3. Coleta de Fezes (Parasitológico)</h2>
<ul>
  <li>Coletor limpo e seco</li>
  <li>Quantidade: tamanho de uma noz</li>
  <li>Evitar contaminação com urina</li>
  <li>Enviar rapidamente ao laboratório</li>
</ul>
    `.trim(),
  },

  {
    id: 'POP_CONTROLE_DOR',
    title: 'Avaliação e Controle da Dor',
    category: PopCategory.ENFERMAGEM_CUIDADOS,
    description: 'Escalas de avaliação e medidas farmacológicas/não farmacológicas.',
    suggestedReviewMonths: 12,
    defaultContent: `
<h1>Avaliação e Controle da Dor</h1>

<h2>1. Objetivo</h2>
<p>Avaliar, registrar e aliviar a dor de forma eficaz.</p>

<h2>2. Escalas de Avaliação</h2>

<h3>2.1. Escala Visual Analógica (EVA)</h3>
<p>De 0 (sem dor) a 10 (pior dor imaginável)</p>

<h3>2.2. Escala de Faces (Wong-Baker)</h3>
<p>Para residentes com dificuldade de verbalização</p>

<h3>2.3. Escala PAINAD (demência)</h3>
<p>Avalia:</p>
<ul>
  <li>Respiração</li>
  <li>Vocalização</li>
  <li>Expressão facial</li>
  <li>Linguagem corporal</li>
  <li>Consolabilidade</li>
</ul>

<h2>3. Classificação da Intensidade</h2>
<ul>
  <li><strong>Leve:</strong> 1-3</li>
  <li><strong>Moderada:</strong> 4-6</li>
  <li><strong>Intensa:</strong> 7-10</li>
</ul>

<h2>4. Medidas Farmacológicas</h2>
<p>Escada analgésica da OMS:</p>
<ol>
  <li>Analgésicos simples (paracetamol, dipirona)</li>
  <li>Opioides fracos (codeína, tramadol)</li>
  <li>Opioides fortes (morfina)</li>
</ol>

<h2>5. Medidas Não Farmacológicas</h2>
<ul>
  <li>Posicionamento adequado</li>
  <li>Massagem terapêutica</li>
  <li>Compressas (quente/fria)</li>
  <li>Musicoterapia</li>
  <li>Distração e relaxamento</li>
</ul>

<h2>6. Registro</h2>
<p>Documentar: intensidade, localização, característica, frequência, fatores de melhora/piora.</p>
    `.trim(),
  },

  {
    id: 'POP_INSULINOTERAPIA',
    title: 'Administração de Insulina',
    category: PopCategory.ENFERMAGEM_CUIDADOS,
    description: 'Preparo, técnica e armazenamento de insulina.',
    suggestedReviewMonths: 12,
    defaultContent: `
<h1>Administração de Insulina</h1>

<h2>1. Objetivo</h2>
<p>Garantir administração segura de insulina para controle glicêmico.</p>

<h2>2. Tipos de Insulina</h2>
<table>
  <thead>
    <tr>
      <th>Tipo</th>
      <th>Início</th>
      <th>Pico</th>
      <th>Duração</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Regular (rápida)</td>
      <td>30-60 min</td>
      <td>2-4h</td>
      <td>6-8h</td>
    </tr>
    <tr>
      <td>NPH (intermediária)</td>
      <td>1-2h</td>
      <td>4-12h</td>
      <td>18-24h</td>
    </tr>
    <tr>
      <td>Glargina (lenta)</td>
      <td>2-4h</td>
      <td>Sem pico</td>
      <td>24h</td>
    </tr>
    <tr>
      <td>Ultrarrápida (lispro)</td>
      <td>10-15 min</td>
      <td>1-2h</td>
      <td>3-5h</td>
    </tr>
  </tbody>
</table>

<h2>3. Preparo</h2>
<ul>
  <li>Verificar tipo, validade e aspecto</li>
  <li>Homogeneizar NPH (rolar entre as mãos)</li>
  <li>NÃO agitar (formação de bolhas)</li>
  <li>Aspirar dose prescrita com seringa de insulina (U-100)</li>
  <li>Se mistura: aspirar Regular primeiro, depois NPH</li>
</ul>

<h2>4. Locais de Aplicação</h2>
<ul>
  <li><strong>Abdome:</strong> Absorção mais rápida (Regular, Ultrarrápida)</li>
  <li><strong>Coxa:</strong> Absorção intermediária (NPH)</li>
  <li><strong>Braço:</strong> Absorção variável</li>
  <li><strong>Glúteo:</strong> Absorção lenta</li>
</ul>

<h2>5. Técnica</h2>
<ol>
  <li>Higienizar local com álcool 70% (aguardar secar)</li>
  <li>Fazer prega cutânea</li>
  <li>Inserir agulha em ângulo de 90° (ou 45° se muito magro)</li>
  <li>Injetar insulina lentamente</li>
  <li>Aguardar 10 segundos antes de retirar</li>
  <li>NÃO massagear o local</li>
  <li>Descartar agulha em coletor de perfurocortantes</li>
</ol>

<h2>6. Armazenamento</h2>
<ul>
  <li>Frasco fechado: Geladeira (2-8°C) - validade do fabricante</li>
  <li>Frasco em uso: Temperatura ambiente (até 25°C) - 30 dias</li>
  <li>NÃO congelar</li>
  <li>Proteger da luz direta</li>
</ul>
    `.trim(),
  },

  {
    id: 'POP_ALIMENTACAO_ENTERAL',
    title: 'Alimentação por Sonda Enteral',
    category: PopCategory.ENFERMAGEM_CUIDADOS,
    description: 'Administração de dieta por SNE/SGT.',
    suggestedReviewMonths: 12,
    defaultContent: `
<h1>Alimentação por Sonda Enteral</h1>

<h2>1. Objetivo</h2>
<p>Garantir aporte nutricional adequado via sonda nasoenteral (SNE) ou gastrostomia (GTT).</p>

<h2>2. Antes da Administração</h2>
<ul>
  <li>Verificar prescrição dietética</li>
  <li>Conferir posicionamento da sonda</li>
  <li>Verificar resíduo gástrico (SNE)</li>
  <li>Elevar cabeceira 30-45°</li>
  <li>Higienizar mãos e calçar luvas</li>
</ul>

<h2>3. Verificação de Posicionamento (SNE)</h2>
<ul>
  <li>Auscultar ar injetado na sonda sobre epigástrio</li>
  <li>Aspirar conteúdo gástrico (pH < 5)</li>
  <li><strong>Nunca</strong> testar com água (risco de broncoaspiração)</li>
</ul>

<h2>4. Técnica de Administração</h2>

<h3>4.1. Administração em Bolus</h3>
<ol>
  <li>Conectar seringa de 60 mL à sonda</li>
  <li>Infundir dieta lentamente (20-30 min)</li>
  <li>Lavar sonda com 30-50 mL de água após</li>
  <li>Fechar ou clampear sonda</li>
</ol>

<h3>4.2. Administração Contínua (Bomba)</h3>
<ol>
  <li>Conectar equipo à bomba de infusão</li>
  <li>Programar velocidade conforme prescrição</li>
  <li>Lavar sonda a cada 4-6 horas</li>
  <li>Trocar equipo a cada 24 horas</li>
</ol>

<h2>5. Cuidados</h2>
<ul>
  <li>Manter cabeceira elevada por 30-60 min após dieta</li>
  <li>Higiene oral 2x/dia</li>
  <li>Trocar fixação de SNE diariamente</li>
  <li>Observar sinais de broncoaspiração</li>
  <li>Monitorar balanço hídrico</li>
</ul>

<h2>6. Complicações</h2>
<ul>
  <li>Broncoaspiração</li>
  <li>Diarreia/constipação</li>
  <li>Náuseas/vômitos</li>
  <li>Obstrução da sonda</li>
  <li>Lesão nasal (SNE)</li>
</ul>
    `.trim(),
  },

  {
    id: 'POP_RCP_BASICA',
    title: 'RCP Básica (Suporte Básico de Vida)',
    category: PopCategory.ENFERMAGEM_CUIDADOS,
    description: 'Reanimação cardiopulmonar básica para adultos.',
    suggestedReviewMonths: 6,
    defaultContent: `
<h1>RCP Básica (Suporte Básico de Vida)</h1>

<h2>1. Objetivo</h2>
<p>Realizar manobras de reanimação cardiopulmonar em caso de parada cardiorrespiratória (PCR).</p>

<h2>2. Reconhecimento de PCR</h2>
<ul>
  <li>Vítima não responde</li>
  <li>Não respira ou respira de forma anormal (gasping)</li>
  <li>Ausência de pulso carotídeo (verificar por até 10 segundos)</li>
</ul>

<h2>3. Sequência C-A-B (AHA 2020)</h2>

<h3>C - Compressões Torácicas</h3>
<ul>
  <li><strong>Local:</strong> Centro do tórax (metade inferior do esterno)</li>
  <li><strong>Profundidade:</strong> 5-6 cm (adultos)</li>
  <li><strong>Frequência:</strong> 100-120/minuto</li>
  <li><strong>Retorno completo do tórax</strong> entre compressões</li>
  <li><strong>Minimizar interrupções</strong> (< 10 segundos)</li>
</ul>

<h3>A - Vias Aéreas</h3>
<ul>
  <li>Manobra de inclinação da cabeça e elevação do queixo</li>
  <li>Se trauma: tração da mandíbula</li>
</ul>

<h3>B - Ventilação</h3>
<ul>
  <li>2 ventilações de resgate após cada 30 compressões</li>
  <li>Duração: 1 segundo cada</li>
  <li>Volume: suficiente para elevar o tórax</li>
</ul>

<h2>4. Ciclos de RCP</h2>
<p><strong>30:2</strong> (30 compressões : 2 ventilações)</p>
<ul>
  <li>Avaliar pulso a cada 2 minutos</li>
  <li>Alternar socorrista a cada 2 minutos (se disponível)</li>
  <li>Continuar até: retorno de circulação espontânea, chegada do SAMU, ou exaustão</li>
</ul>

<h2>5. DEA (Desfibrilador Externo Automático)</h2>
<ol>
  <li>Ligar o DEA</li>
  <li>Aplicar as pás conforme orientação visual</li>
  <li>Seguir comandos de voz do aparelho</li>
  <li>Afastar-se durante análise de ritmo</li>
  <li>Aplicar choque se indicado</li>
  <li>Retomar RCP imediatamente após choque</li>
</ol>

<h2>6. Acionamento do SAMU</h2>
<p>Ligar <strong>192</strong> imediatamente após reconhecimento de PCR.</p>
    `.trim(),
  },

  {
    id: 'POP_ISOLAMENTO_PRECAUCOES',
    title: 'Precauções e Isolamento',
    category: PopCategory.ENFERMAGEM_CUIDADOS,
    description: 'Tipos de precauções (contato, gotículas, aerossóis).',
    suggestedReviewMonths: 6,
    defaultContent: `
<h1>Precauções e Isolamento</h1>

<h2>1. Objetivo</h2>
<p>Prevenir transmissão de micro-organismos através de medidas de precaução adequadas.</p>

<h2>2. Precauções Padrão</h2>
<p>Aplicar para TODOS os residentes:</p>
<ul>
  <li>Higienização das mãos</li>
  <li>Uso de EPIs conforme risco de exposição</li>
  <li>Descarte adequado de perfurocortantes</li>
  <li>Limpeza e desinfecção de superfícies</li>
  <li>Manejo adequado de roupas</li>
</ul>

<h2>3. Precauções de Contato</h2>

<h3>Indicações:</h3>
<ul>
  <li>Bactérias multirresistentes (MRSA, VRE, KPC)</li>
  <li>Clostridioides difficile</li>
  <li>Escabiose</li>
  <li>Vírus entéricos (rotavírus, norovírus)</li>
</ul>

<h3>EPIs:</h3>
<ul>
  <li>Luvas ao entrar no quarto</li>
  <li>Avental ao ter contato com residente ou superfícies</li>
  <li>Retirar EPIs antes de sair do quarto</li>
</ul>

<h2>4. Precauções para Gotículas</h2>

<h3>Indicações:</h3>
<ul>
  <li>Influenza</li>
  <li>Coqueluche</li>
  <li>Meningite meningocócica</li>
  <li>COVID-19 (+ aerossóis)</li>
</ul>

<h3>EPIs:</h3>
<ul>
  <li>Máscara cirúrgica ao entrar no quarto (< 1 metro)</li>
  <li>Quarto privativo (ou coorte)</li>
  <li>Distância mínima: 1 metro</li>
</ul>

<h2>5. Precauções para Aerossóis</h2>

<h3>Indicações:</h3>
<ul>
  <li>Tuberculose pulmonar</li>
  <li>Sarampo</li>
  <li>Varicela</li>
  <li>COVID-19</li>
</ul>

<h3>EPIs:</h3>
<ul>
  <li>Respirador N95/PFF2</li>
  <li>Quarto privativo com pressão negativa (se disponível)</li>
  <li>Porta fechada</li>
</ul>

<h2>6. Sinalização</h2>
<p>Placa na porta indicando tipo de precaução e EPIs necessários.</p>
    `.trim(),
  },

  {
    id: 'POP_CUIDADOS_TRAQUEOSTOMIA',
    title: 'Cuidados com Traqueostomia',
    category: PopCategory.ENFERMAGEM_CUIDADOS,
    description: 'Limpeza, troca de curativo e aspiração de cânula.',
    suggestedReviewMonths: 12,
    defaultContent: `
<h1>Cuidados com Traqueostomia</h1>

<h2>1. Objetivo</h2>
<p>Manter permeabilidade da via aérea e prevenir infecções em residentes traqueostomizados.</p>

<h2>2. Materiais</h2>
<ul>
  <li>Luvas estéreis</li>
  <li>Luvas de procedimento</li>
  <li>Gazes estéreis</li>
  <li>SF 0,9% estéril</li>
  <li>Sonda de aspiração estéril</li>
  <li>Aspirador a vácuo</li>
  <li>Cadarço ou fixador de traqueostomia</li>
  <li>Cânula interna sobressalente (se aplicável)</li>
</ul>

<h2>3. Limpeza da Cânula Interna</h2>
<ol>
  <li>Higienizar mãos e calçar luvas de procedimento</li>
  <li>Retirar cânula interna</li>
  <li>Lavar com SF 0,9% e escova própria</li>
  <li>Enxaguar bem</li>
  <li>Secar com gaze estéril</li>
  <li>Recolocar cânula interna</li>
</ol>

<p><strong>Frequência:</strong> 2-3 vezes ao dia ou conforme necessidade</p>

<h2>4. Troca de Curativo</h2>
<ol>
  <li>Higienizar mãos e calçar luvas estéreis</li>
  <li>Remover curativo anterior</li>
  <li>Limpar ao redor do estoma com SF 0,9%</li>
  <li>Secar bem</li>
  <li>Colocar gaze fenestrada estéril sob a cânula</li>
  <li>Verificar fixação do cadarço (deve permitir 1 dedo)</li>
</ol>

<p><strong>Frequência:</strong> 2 vezes ao dia e quando necessário</p>

<h2>5. Aspiração de Secreções</h2>
<ol>
  <li>Calçar luvas estéreis</li>
  <li>Introduzir sonda de aspiração sem aspirar</li>
  <li>Aspirar ao retirar com movimentos rotatórios</li>
  <li>Máximo 10-15 segundos por aspiração</li>
  <li>Lavar sonda com SF 0,9% entre aspirações</li>
</ol>

<h2>6. Complicações</h2>
<ul>
  <li>Infecção do estoma</li>
  <li>Obstrução da cânula por rolha de secreção</li>
  <li>Sangramento</li>
  <li>Decanulação acidental</li>
  <li>Granuloma</li>
</ul>

<h2>7. Emergência: Decanulação Acidental</h2>
<ol>
  <li>Manter calma</li>
  <li>Recolocar cânula (ou uma numeração menor)</li>
  <li>Se impossível: ventilar por estoma com Ambu</li>
  <li>Acionar médico imediatamente</li>
</ol>
    `.trim(),
  },

  {
    id: 'POP_CONTROLE_GLICEMICO',
    title: 'Controle Glicêmico e Aplicação de Escala Móvel',
    category: PopCategory.ENFERMAGEM_CUIDADOS,
    description: 'Monitoramento e correção de glicemia conforme protocolo.',
    suggestedReviewMonths: 12,
    defaultContent: `
<h1>Controle Glicêmico e Aplicação de Escala Móvel</h1>

<h2>1. Objetivo</h2>
<p>Manter glicemia dentro de limites adequados através de monitoramento e correção conforme protocolo.</p>

<h2>2. Frequência de Verificação</h2>

<h3>2.1. Diabéticos em Uso de Insulina</h3>
<ul>
  <li>Jejum (antes café manhã)</li>
  <li>Pré-almoço</li>
  <li>Pré-jantar</li>
  <li>Antes de dormir</li>
</ul>

<h3>2.2. Diabéticos em Hipoglicemiantes Orais</h3>
<ul>
  <li>Jejum</li>
  <li>2h pós-prandial (conforme prescrição)</li>
</ul>

<h2>3. Metas Glicêmicas</h2>
<ul>
  <li><strong>Jejum e pré-prandial:</strong> 80-130 mg/dL</li>
  <li><strong>Pós-prandial (2h):</strong> < 180 mg/dL</li>
  <li><strong>Antes de dormir:</strong> 100-140 mg/dL</li>
</ul>

<h2>4. Escala Móvel de Insulina Regular</h2>

<table>
  <thead>
    <tr>
      <th>Glicemia (mg/dL)</th>
      <th>Dose de Insulina Regular (UI)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>< 70</td>
      <td>NÃO aplicar - Protocolo de hipoglicemia</td>
    </tr>
    <tr>
      <td>70-150</td>
      <td>0 UI</td>
    </tr>
    <tr>
      <td>151-200</td>
      <td>2 UI</td>
    </tr>
    <tr>
      <td>201-250</td>
      <td>4 UI</td>
    </tr>
    <tr>
      <td>251-300</td>
      <td>6 UI</td>
    </tr>
    <tr>
      <td>301-350</td>
      <td>8 UI</td>
    </tr>
    <tr>
      <td>> 350</td>
      <td>10 UI + Avisar médico</td>
    </tr>
  </tbody>
</table>

<p><em>Obs: Valores de exemplo. Seguir sempre prescrição médica individualizada.</em></p>

<h2>5. Protocolo de Hipoglicemia (< 70 mg/dL)</h2>

<h3>Residente Consciente:</h3>
<ol>
  <li>Oferecer 15g de carboidrato simples (1 copo de suco ou 1 colher de sopa de mel)</li>
  <li>Reavaliar glicemia em 15 minutos</li>
  <li>Se ainda < 70 mg/dL: repetir carboidrato</li>
  <li>Após normalização: oferecer lanche com carboidrato complexo</li>
</ol>

<h3>Residente Inconsciente:</h3>
<ol>
  <li>Acesso venoso + Glicose 50% EV (1-2 ampolas)</li>
  <li>Se sem acesso: Glucagon 1mg IM</li>
  <li>Acionar médico imediatamente</li>
</ol>

<h2>6. Registro</h2>
<p>Documentar: glicemia, horário, dose de insulina aplicada, intercorrências.</p>
    `.trim(),
  },

  {
    id: 'POP_CUIDADOS_OSTOMIAS',
    title: 'Cuidados com Ostomias (Colostomia/Ileostomia)',
    category: PopCategory.ENFERMAGEM_CUIDADOS,
    description: 'Higiene, troca de bolsa e cuidados com pele periestoma.',
    suggestedReviewMonths: 12,
    defaultContent: `
<h1>Cuidados com Ostomias</h1>

<h2>1. Objetivo</h2>
<p>Manter integridade da pele periestoma, prevenir complicações e garantir conforto ao residente ostomizado.</p>

<h2>2. Materiais</h2>
<ul>
  <li>Luvas de procedimento</li>
  <li>Bolsa coletora (1 ou 2 peças)</li>
  <li>Placa de resina sintética</li>
  <li>Água morna</li>
  <li>Sabonete neutro</li>
  <li>Gazes ou compressas</li>
  <li>Saco plástico para descarte</li>
  <li>Tesoura</li>
  <li>Cinto elástico (opcional)</li>
  <li>Pó ou pasta protetora (se necessário)</li>
</ul>

<h2>3. Troca da Bolsa Coletora</h2>

<h3>Frequência:</h3>
<ul>
  <li><strong>Bolsa drenável:</strong> Esvaziar quando 1/3 a 1/2 cheia</li>
  <li><strong>Troca completa:</strong> A cada 3-7 dias ou conforme necessidade</li>
</ul>

<h3>Técnica:</h3>
<ol>
  <li>Higienizar mãos e calçar luvas</li>
  <li>Remover bolsa antiga de cima para baixo, com cuidado</li>
  <li>Lavar estoma e pele periestoma com água e sabonete neutro</li>
  <li>Secar bem com movimentos leves</li>
  <li>Avaliar estoma (cor, edema, sangramento) e pele periestoma</li>
  <li>Medir estoma e recortar placa (2-3mm maior que estoma)</li>
  <li>Aplicar protetor cutâneo se necessário</li>
  <li>Colar placa de baixo para cima, moldando bem</li>
  <li>Acoplar bolsa coletora</li>
  <li>Registrar características do efluente</li>
</ol>

<h2>4. Características Normais do Estoma</h2>
<ul>
  <li>Cor: Vermelho-brilhante ou rosa (mucosa saudável)</li>
  <li>Umidade: Úmido e brilhante</li>
  <li>Tamanho: Tende a reduzir nas primeiras 6-8 semanas</li>
  <li>Pequeno sangramento ao toque é normal</li>
</ul>

<h2>5. Complicações</h2>

<table>
  <thead>
    <tr>
      <th>Complicação</th>
      <th>Sinais</th>
      <th>Conduta</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Dermatite periestoma</td>
      <td>Vermelhidão, ardência</td>
      <td>Trocar bolsa, protetor cutâneo</td>
    </tr>
    <tr>
      <td>Prolapso</td>
      <td>Estoma evertido</td>
      <td>Avaliar médico</td>
    </tr>
    <tr>
      <td>Retração</td>
      <td>Estoma afundado</td>
      <td>Bolsa convexa</td>
    </tr>
    <tr>
      <td>Estenose</td>
      <td>Estreitamento do estoma</td>
      <td>Avaliar médico</td>
    </tr>
    <tr>
      <td>Hérnia paraestomal</td>
      <td>Abaulamento ao redor</td>
      <td>Avaliar médico, cinta</td>
    </tr>
  </tbody>
</table>

<h2>6. Orientações Gerais</h2>
<ul>
  <li>Dieta equilibrada (evitar alimentos formadores de gases se ileostomia)</li>
  <li>Hidratação adequada</li>
  <li>Atividade física liberada (com proteção)</li>
  <li>Banho normal (pode molhar o estoma)</li>
</ul>
    `.trim(),
  },
]

/**
 * Funções auxiliares para buscar templates
 */

export function getTemplateById(id: string): PopTemplate | undefined {
  return POP_TEMPLATES.find((template) => template.id === id)
}

export function getTemplatesByCategory(
  category: PopCategory,
): PopTemplate[] {
  return POP_TEMPLATES.filter((template) => template.category === category)
}

export function getAllTemplates(): PopTemplate[] {
  return POP_TEMPLATES
}

export function getTemplateCount(): {
  total: number
  gestaoOperacao: number
  enfermagemCuidados: number
} {
  return {
    total: POP_TEMPLATES.length,
    gestaoOperacao: POP_TEMPLATES.filter(
      (t) => t.category === PopCategory.GESTAO_OPERACAO,
    ).length,
    enfermagemCuidados: POP_TEMPLATES.filter(
      (t) => t.category === PopCategory.ENFERMAGEM_CUIDADOS,
    ).length,
  }
}
