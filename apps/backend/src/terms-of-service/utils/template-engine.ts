/**
 * Template Engine para substituir variáveis dinâmicas em termos de uso
 *
 * Variáveis suportadas:
 * - {{tenant.name}}, {{tenant.cnpj}}, {{tenant.email}}
 * - {{user.name}}, {{user.cpf}}, {{user.email}}
 * - {{plan.name}}, {{plan.displayName}}, {{plan.price}}, {{plan.maxUsers}}, {{plan.maxResidents}}
 * - {{trial.days}}
 * - {{today}}
 */

interface TemplateVariables {
  tenant?: {
    name?: string;
    cnpj?: string;
    email?: string;
  };
  user?: {
    name?: string;
    cpf?: string;
    email?: string;
  };
  plan?: {
    name?: string;
    displayName?: string;
    price?: number | null;
    maxUsers?: number;
    maxResidents?: number;
  };
  trial?: {
    days?: number;
  };
}

/**
 * Substitui variáveis no formato {{var.path}} por valores reais
 */
export function renderTemplate(
  template: string,
  variables: TemplateVariables,
): string {
  let rendered = template;

  // Data de hoje no formato brasileiro
  const today = new Date().toLocaleDateString('pt-BR');
  rendered = rendered.replace(/\{\{today\}\}/g, today);

  // Tenant variables
  if (variables.tenant) {
    if (variables.tenant.name) {
      rendered = rendered.replace(
        /\{\{tenant\.name\}\}/g,
        variables.tenant.name,
      );
    }
    if (variables.tenant.cnpj) {
      rendered = rendered.replace(
        /\{\{tenant\.cnpj\}\}/g,
        variables.tenant.cnpj,
      );
    }
    if (variables.tenant.email) {
      rendered = rendered.replace(
        /\{\{tenant\.email\}\}/g,
        variables.tenant.email,
      );
    }
  }

  // User variables (responsável pela contratação)
  if (variables.user) {
    if (variables.user.name) {
      rendered = rendered.replace(
        /\{\{user\.name\}\}/g,
        variables.user.name,
      );
    }
    if (variables.user.cpf) {
      rendered = rendered.replace(
        /\{\{user\.cpf\}\}/g,
        variables.user.cpf,
      );
    }
    if (variables.user.email) {
      rendered = rendered.replace(
        /\{\{user\.email\}\}/g,
        variables.user.email,
      );
    }
  }

  // Plan variables
  if (variables.plan) {
    if (variables.plan.name) {
      rendered = rendered.replace(/\{\{plan\.name\}\}/g, variables.plan.name);
    }
    if (variables.plan.displayName) {
      rendered = rendered.replace(
        /\{\{plan\.displayName\}\}/g,
        variables.plan.displayName,
      );
    }
    if (variables.plan.price !== undefined) {
      const priceFormatted =
        variables.plan.price === null
          ? 'sob consulta'
          : `R$ ${Number(variables.plan.price).toFixed(2)}`;
      rendered = rendered.replace(/\{\{plan\.price\}\}/g, priceFormatted);
    }
    if (variables.plan.maxUsers !== undefined) {
      rendered = rendered.replace(
        /\{\{plan\.maxUsers\}\}/g,
        variables.plan.maxUsers === -1
          ? 'ilimitado'
          : variables.plan.maxUsers.toString(),
      );
    }
    if (variables.plan.maxResidents !== undefined) {
      rendered = rendered.replace(
        /\{\{plan\.maxResidents\}\}/g,
        variables.plan.maxResidents === -1
          ? 'ilimitado'
          : variables.plan.maxResidents.toString(),
      );
    }
  }

  // Trial variables
  if (variables.trial?.days !== undefined) {
    rendered = rendered.replace(
      /\{\{trial\.days\}\}/g,
      variables.trial.days.toString(),
    );
  }

  return rendered;
}
