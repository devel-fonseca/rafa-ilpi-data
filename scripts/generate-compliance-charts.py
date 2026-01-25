#!/usr/bin/env python3
"""
Gerador de Gráficos de Evolução de Compliance - Marketing
Gera visualizações profissionais da jornada de conformidade RDC 502/2021
"""

import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from datetime import datetime
import numpy as np
from pathlib import Path

# Configurar estilo profissional
plt.style.use('seaborn-v0_8-darkgrid')
plt.rcParams['figure.figsize'] = (14, 8)
plt.rcParams['font.size'] = 12
plt.rcParams['font.family'] = 'sans-serif'

# Dados da jornada
dates = [
    datetime(2025, 5, 20),
    datetime(2025, 6, 22),
    datetime(2025, 7, 18),
    datetime(2025, 8, 21),
    datetime(2025, 9, 19),
    datetime(2025, 10, 20),
    datetime(2025, 11, 22),
    datetime(2026, 1, 20),
]

compliance_percentages = [55.00, 60.00, 65.00, 70.00, 74.29, 77.86, 80.71, 85.00]
compliance_levels = ['IRREGULAR', 'IRREGULAR', 'PARCIAL', 'PARCIAL', 'PARCIAL', 'PARCIAL', 'REGULAR', 'REGULAR']

# Criar diretório de saída
output_dir = Path('/home/emanuel/Documentos/GitHub/rafa-ilpi-data/docs/marketing/compliance-charts')
output_dir.mkdir(parents=True, exist_ok=True)

# ============================================
# GRÁFICO 1: Linha de Evolução Principal
# ============================================
fig, ax = plt.subplots(figsize=(16, 9))

# Linha principal
ax.plot(dates, compliance_percentages,
        linewidth=4,
        marker='o',
        markersize=12,
        color='#2E7D32',
        label='Conformidade RDC 502/2021',
        zorder=3)

# Área preenchida abaixo da linha
ax.fill_between(dates, compliance_percentages, alpha=0.3, color='#4CAF50')

# Adicionar pontos de dados com valores
for i, (date, pct) in enumerate(zip(dates, compliance_percentages)):
    ax.annotate(f'{pct:.1f}%',
                xy=(date, pct),
                xytext=(0, 15),
                textcoords='offset points',
                ha='center',
                fontsize=11,
                fontweight='bold',
                bbox=dict(boxstyle='round,pad=0.5', facecolor='white', edgecolor='#2E7D32', linewidth=2))

# Linhas de referência para níveis de conformidade
ax.axhline(y=50, color='#D32F2F', linestyle='--', linewidth=2, alpha=0.5, label='Mínimo IRREGULAR (50%)')
ax.axhline(y=60, color='#F57C00', linestyle='--', linewidth=2, alpha=0.5, label='Mínimo PARCIAL (60%)')
ax.axhline(y=75, color='#388E3C', linestyle='--', linewidth=2, alpha=0.5, label='Mínimo REGULAR (75%)')
ax.axhline(y=90, color='#1976D2', linestyle='--', linewidth=2, alpha=0.5, label='Mínimo ÓTIMO (90%)')

# Destacar momento de alcance REGULAR
regular_date = dates[6]
regular_pct = compliance_percentages[6]
ax.plot(regular_date, regular_pct,
        marker='*',
        markersize=30,
        color='#FFD700',
        markeredgecolor='#F57F17',
        markeredgewidth=2,
        zorder=4)
ax.annotate('🎉 Alcançado nível REGULAR!',
            xy=(regular_date, regular_pct),
            xytext=(30, -40),
            textcoords='offset points',
            fontsize=13,
            fontweight='bold',
            color='#F57F17',
            bbox=dict(boxstyle='round,pad=0.7', facecolor='#FFF9C4', edgecolor='#F57F17', linewidth=2),
            arrowprops=dict(arrowstyle='->', color='#F57F17', lw=2))

# Configurações do eixo X
ax.xaxis.set_major_formatter(mdates.DateFormatter('%b/%Y'))
ax.xaxis.set_major_locator(mdates.MonthLocator())
plt.xticks(rotation=45, ha='right')

# Configurações do eixo Y
ax.set_ylim(45, 95)
ax.set_ylabel('Conformidade (%)', fontsize=14, fontweight='bold')
ax.set_xlabel('Período de Avaliação', fontsize=14, fontweight='bold')

# Título
ax.set_title('Evolução de Conformidade RDC 502/2021\nJornada de 8 Meses: De IRREGULAR (55%) para REGULAR (85%)',
             fontsize=18,
             fontweight='bold',
             pad=20)

# Grade
ax.grid(True, alpha=0.3, linestyle='--', linewidth=0.8)
ax.set_axisbelow(True)

# Legenda
ax.legend(loc='lower right', fontsize=11, framealpha=0.95, edgecolor='gray')

# Adicionar nota de rodapé
fig.text(0.99, 0.01,
         '🤖 Powered by Rafa ILPI - Módulo de Compliance RDC 502/2021',
         ha='right',
         fontsize=10,
         style='italic',
         color='gray')

plt.tight_layout()
plt.savefig(output_dir / '01-evolucao-linha-principal.png', dpi=300, bbox_inches='tight')
print(f"✅ Gráfico 1 salvo: {output_dir / '01-evolucao-linha-principal.png'}")
plt.close()

# ============================================
# GRÁFICO 2: Barras Verticais com Gradiente
# ============================================
fig, ax = plt.subplots(figsize=(16, 9))

# Cores baseadas no nível de conformidade
colors = []
for level in compliance_levels:
    if level == 'IRREGULAR':
        colors.append('#E57373')  # Vermelho claro
    elif level == 'PARCIAL':
        colors.append('#FFB74D')  # Laranja claro
    elif level == 'REGULAR':
        colors.append('#81C784')  # Verde claro

# Criar barras
bars = ax.bar(range(len(dates)),
               compliance_percentages,
               color=colors,
               edgecolor='black',
               linewidth=2,
               alpha=0.9,
               width=0.7)

# Adicionar valores nas barras
for i, (bar, pct, level) in enumerate(zip(bars, compliance_percentages, compliance_levels)):
    height = bar.get_height()
    ax.text(bar.get_x() + bar.get_width()/2., height + 1.5,
            f'{pct:.1f}%\n{level}',
            ha='center', va='bottom',
            fontsize=11,
            fontweight='bold')

# Adicionar setas de evolução entre barras
for i in range(len(compliance_percentages) - 1):
    diff = compliance_percentages[i+1] - compliance_percentages[i]
    mid_x = i + 0.5
    mid_y = (compliance_percentages[i] + compliance_percentages[i+1]) / 2

    ax.annotate(f'+{diff:.1f}%',
                xy=(mid_x, mid_y),
                fontsize=9,
                ha='center',
                color='#1976D2',
                fontweight='bold',
                bbox=dict(boxstyle='round,pad=0.3', facecolor='white', alpha=0.8, edgecolor='#1976D2'))

# Configurações dos eixos
ax.set_xticks(range(len(dates)))
ax.set_xticklabels([d.strftime('%b/%Y') for d in dates], rotation=45, ha='right')
ax.set_ylabel('Conformidade (%)', fontsize=14, fontweight='bold')
ax.set_ylim(0, 100)

# Título
ax.set_title('Progresso Mensal de Conformidade\nGanho Total: +30 pontos percentuais em 8 meses',
             fontsize=18,
             fontweight='bold',
             pad=20)

# Grade
ax.grid(True, axis='y', alpha=0.3, linestyle='--', linewidth=0.8)
ax.set_axisbelow(True)

# Adicionar legenda de níveis
from matplotlib.patches import Patch
legend_elements = [
    Patch(facecolor='#E57373', edgecolor='black', label='IRREGULAR (< 60%)'),
    Patch(facecolor='#FFB74D', edgecolor='black', label='PARCIAL (60-75%)'),
    Patch(facecolor='#81C784', edgecolor='black', label='REGULAR (75-90%)')
]
ax.legend(handles=legend_elements, loc='upper left', fontsize=11, framealpha=0.95, edgecolor='gray')

# Nota de rodapé
fig.text(0.99, 0.01,
         '🤖 Powered by Rafa ILPI - Módulo de Compliance RDC 502/2021',
         ha='right',
         fontsize=10,
         style='italic',
         color='gray')

plt.tight_layout()
plt.savefig(output_dir / '02-evolucao-barras-vertical.png', dpi=300, bbox_inches='tight')
print(f"✅ Gráfico 2 salvo: {output_dir / '02-evolucao-barras-vertical.png'}")
plt.close()

# ============================================
# GRÁFICO 3: Comparativo Antes x Depois
# ============================================
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 8))

# ANTES (Maio 2025)
antes_pct = compliance_percentages[0]
antes_resto = 100 - antes_pct
antes_data = [antes_pct, antes_resto]
antes_colors = ['#E57373', '#EEEEEE']
antes_labels = [f'Conforme\n{antes_pct:.1f}%', f'Não Conforme\n{antes_resto:.1f}%']

wedges1, texts1, autotexts1 = ax1.pie(antes_data,
                                        labels=antes_labels,
                                        colors=antes_colors,
                                        autopct='',
                                        startangle=90,
                                        explode=(0.05, 0),
                                        textprops={'fontsize': 14, 'fontweight': 'bold'})

ax1.set_title('ANTES (Maio/2025)\n🔴 IRREGULAR',
              fontsize=16,
              fontweight='bold',
              pad=20)

# DEPOIS (Janeiro 2026)
depois_pct = compliance_percentages[-1]
depois_resto = 100 - depois_pct
depois_data = [depois_pct, depois_resto]
depois_colors = ['#81C784', '#EEEEEE']
depois_labels = [f'Conforme\n{depois_pct:.1f}%', f'Não Conforme\n{depois_resto:.1f}%']

wedges2, texts2, autotexts2 = ax2.pie(depois_data,
                                        labels=depois_labels,
                                        colors=depois_colors,
                                        autopct='',
                                        startangle=90,
                                        explode=(0.05, 0),
                                        textprops={'fontsize': 14, 'fontweight': 'bold'})

ax2.set_title('DEPOIS (Janeiro/2026)\n🟢 REGULAR',
              fontsize=16,
              fontweight='bold',
              pad=20)

# Título geral
fig.suptitle('Transformação em 8 Meses\nImpacto do Módulo de Compliance Rafa ILPI',
             fontsize=20,
             fontweight='bold',
             y=0.98)

# Adicionar destaque do ganho
fig.text(0.5, 0.08,
         f'📈 GANHO: +{depois_pct - antes_pct:.0f} pontos percentuais',
         ha='center',
         fontsize=18,
         fontweight='bold',
         color='#1976D2',
         bbox=dict(boxstyle='round,pad=1', facecolor='#E3F2FD', edgecolor='#1976D2', linewidth=3))

# Nota de rodapé
fig.text(0.99, 0.01,
         '🤖 Powered by Rafa ILPI - Módulo de Compliance RDC 502/2021',
         ha='right',
         fontsize=10,
         style='italic',
         color='gray')

plt.tight_layout(rect=[0, 0.12, 1, 0.95])
plt.savefig(output_dir / '03-comparativo-antes-depois.png', dpi=300, bbox_inches='tight')
print(f"✅ Gráfico 3 salvo: {output_dir / '03-comparativo-antes-depois.png'}")
plt.close()

# ============================================
# GRÁFICO 4: Dashboard Executivo
# ============================================
fig = plt.figure(figsize=(18, 10))
gs = fig.add_gridspec(3, 3, hspace=0.4, wspace=0.3)

# Painel 1: Gráfico de linha (principal)
ax1 = fig.add_subplot(gs[0:2, 0:2])
ax1.plot(dates, compliance_percentages,
         linewidth=4,
         marker='o',
         markersize=10,
         color='#2E7D32',
         label='Evolução Mensal')
ax1.fill_between(dates, compliance_percentages, alpha=0.2, color='#4CAF50')
ax1.axhline(y=75, color='#388E3C', linestyle='--', linewidth=2, alpha=0.5, label='Meta REGULAR (75%)')
ax1.set_ylabel('Conformidade (%)', fontsize=12, fontweight='bold')
ax1.set_title('Evolução Temporal', fontsize=14, fontweight='bold')
ax1.grid(True, alpha=0.3)
ax1.legend(fontsize=10)
ax1.xaxis.set_major_formatter(mdates.DateFormatter('%b/%y'))
plt.setp(ax1.xaxis.get_majorticklabels(), rotation=45, ha='right')

# Painel 2: KPIs principais
ax2 = fig.add_subplot(gs[0, 2])
ax2.axis('off')
kpi_text = f"""
📊 INDICADORES CHAVE

🎯 Conformidade Atual
   {compliance_percentages[-1]:.1f}%

📈 Ganho Total
   +{compliance_percentages[-1] - compliance_percentages[0]:.0f} p.p.

⏱️ Período
   8 meses

🏆 Status
   REGULAR
"""
ax2.text(0.1, 0.5, kpi_text,
         fontsize=13,
         verticalalignment='center',
         fontfamily='monospace',
         bbox=dict(boxstyle='round,pad=1', facecolor='#E8F5E9', edgecolor='#2E7D32', linewidth=2))

# Painel 3: Velocímetro (simulado com semi-círculo)
ax3 = fig.add_subplot(gs[1, 2])
ax3.axis('off')
ax3.set_xlim(-1.2, 1.2)
ax3.set_ylim(-0.2, 1.2)

# Desenhar arco de fundo
theta = np.linspace(0, np.pi, 100)
for i, (color, start, end) in enumerate([
    ('#E57373', 0, 50),
    ('#FFB74D', 50, 60),
    ('#FFD54F', 60, 75),
    ('#81C784', 75, 90),
    ('#4CAF50', 90, 100)
]):
    theta_section = np.linspace(np.pi * (1 - start/100), np.pi * (1 - end/100), 20)
    x = 0.9 * np.cos(theta_section)
    y = 0.9 * np.sin(theta_section)
    ax3.fill_between(x, 0, y, alpha=0.7, color=color)

# Desenhar ponteiro
current_pct = compliance_percentages[-1]
angle = np.pi * (1 - current_pct/100)
ax3.arrow(0, 0,
          0.7 * np.cos(angle), 0.7 * np.sin(angle),
          head_width=0.1, head_length=0.1,
          fc='#D32F2F', ec='#B71C1C',
          linewidth=3)

# Valor central
ax3.text(0, -0.15, f'{current_pct:.1f}%',
         ha='center', va='center',
         fontsize=20, fontweight='bold',
         bbox=dict(boxstyle='round,pad=0.5', facecolor='white', edgecolor='#2E7D32', linewidth=2))
ax3.text(0, 0.5, 'Nível Atual',
         ha='center', va='center',
         fontsize=11, style='italic')

# Painel 4: Marcos da jornada
ax4 = fig.add_subplot(gs[2, :])
ax4.axis('off')

marcos_text = """
🎯 MARCOS DA JORNADA:

Maio/25:  🔴 Primeira avaliação - Identificados problemas graves em RH e infraestrutura
Jun/25:   ✅ Regularizados documentos e RT | Iniciada contratação
Jul/25:   ✅ Equipe completa | Sistema de chamada instalado | Vacinação atualizada
Ago/25:   ✅ Todos vínculos regularizados | Farmácia adequada
Set/25:   ✅ Refeitório adequado | POPs atualizados | Projeto protocolado
Out/25:   ✅ Projeto APROVADO | PAIS completo | Educação permanente iniciada
Nov/25:   🟢 REGULAR alcançado! Sem não conformidades críticas
Jan/26:   🏆 85% de conformidade - ILPI modelo de gestão de qualidade
"""

ax4.text(0.05, 0.5, marcos_text,
         fontsize=10,
         verticalalignment='center',
         fontfamily='monospace',
         bbox=dict(boxstyle='round,pad=0.8', facecolor='#FFF9C4', edgecolor='#F57F17', linewidth=2))

# Título geral
fig.suptitle('Dashboard Executivo - Jornada de Conformidade RDC 502/2021\nCaso de Sucesso: Rafa ILPI',
             fontsize=20,
             fontweight='bold',
             y=0.98)

# Nota de rodapé
fig.text(0.99, 0.01,
         '🤖 Powered by Rafa ILPI - Módulo de Compliance RDC 502/2021',
         ha='right',
         fontsize=10,
         style='italic',
         color='gray')

plt.savefig(output_dir / '04-dashboard-executivo.png', dpi=300, bbox_inches='tight')
print(f"✅ Gráfico 4 salvo: {output_dir / '04-dashboard-executivo.png'}")
plt.close()

# ============================================
# GRÁFICO 5: Ganhos Mensais (Velocidade)
# ============================================
fig, ax = plt.subplots(figsize=(16, 9))

# Calcular ganhos mensais
monthly_gains = [0]  # Primeiro mês não tem ganho anterior
for i in range(1, len(compliance_percentages)):
    gain = compliance_percentages[i] - compliance_percentages[i-1]
    monthly_gains.append(gain)

# Cores baseadas no tamanho do ganho
gain_colors = ['#81C784' if g > 3 else '#FFB74D' for g in monthly_gains]
gain_colors[0] = '#E0E0E0'  # Primeiro mês em cinza

# Criar barras
bars = ax.bar(range(len(dates)),
               monthly_gains,
               color=gain_colors,
               edgecolor='black',
               linewidth=2,
               alpha=0.9)

# Adicionar valores nas barras
for i, (bar, gain) in enumerate(zip(bars, monthly_gains)):
    if gain > 0:
        height = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2., height + 0.1,
                f'+{gain:.1f}%',
                ha='center', va='bottom',
                fontsize=12,
                fontweight='bold')

# Linha de tendência
z = np.polyfit(range(1, len(monthly_gains)), monthly_gains[1:], 1)
p = np.poly1d(z)
ax.plot(range(len(dates)), [0] + [p(x) for x in range(1, len(monthly_gains))],
        "r--", linewidth=2, alpha=0.7, label='Tendência')

# Configurações
ax.set_xticks(range(len(dates)))
ax.set_xticklabels([d.strftime('%b/%Y') for d in dates], rotation=45, ha='right')
ax.set_ylabel('Ganho Mensal (%)', fontsize=14, fontweight='bold')
ax.set_title('Velocidade de Melhoria Mensal\nGanhos Progressivos ao Longo da Jornada',
             fontsize=18,
             fontweight='bold',
             pad=20)
ax.grid(True, axis='y', alpha=0.3)
ax.legend(fontsize=11)

# Nota de rodapé
fig.text(0.99, 0.01,
         '🤖 Powered by Rafa ILPI - Módulo de Compliance RDC 502/2021',
         ha='right',
         fontsize=10,
         style='italic',
         color='gray')

plt.tight_layout()
plt.savefig(output_dir / '05-ganhos-mensais.png', dpi=300, bbox_inches='tight')
print(f"✅ Gráfico 5 salvo: {output_dir / '05-ganhos-mensais.png'}")
plt.close()

print("\n" + "="*70)
print("🎉 TODOS OS GRÁFICOS FORAM GERADOS COM SUCESSO!")
print("="*70)
print(f"\n📁 Localização: {output_dir}\n")
print("📊 Gráficos criados:")
print("  1. Evolução em Linha (Principal)")
print("  2. Barras Verticais com Gradiente")
print("  3. Comparativo Antes x Depois (Pizza)")
print("  4. Dashboard Executivo Completo")
print("  5. Ganhos Mensais (Velocidade)")
print("\n✨ Pronto para suas apresentações de marketing!\n")
