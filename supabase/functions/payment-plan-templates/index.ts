import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createApiRoute, corsHeaders, type ApiContext } from '../_shared/handler.ts';
import { db } from '../_shared/db.ts';
import { NotFoundError, ValidationError as _ValidationError } from '../_shared/errors.ts';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';

const TemplateCreateSchema = z.object({
  name: z.string().min(1),
  is_default: z.boolean().optional(),
});

const TemplateUpdateSchema = z.object({
  is_default: z.boolean(),
});

const InstalmentsReplaceSchema = z.array(z.object({
  description: z.string().min(1),
  amount: z.number().nonnegative(),
  offset_days: z.number().int().nonnegative().default(0),
  sort_order: z.number().int().nonnegative().default(0),
}));

const DeriveSchema = z.object({
  templateId: z.string().uuid(),
  // Deprecated: startDate retained for backward compatibility
  startDate: z.coerce.date().optional(),
  anchor: z.enum(['OFFER_LETTER','COMMENCEMENT','CUSTOM']).optional(),
  anchorDate: z.coerce.date().optional(),
});

const listTemplates = async (_req: Request, _ctx: ApiContext, programId: string) => {
  const rows = await db.selectFrom('sms_op.payment_plan_templates')
    .selectAll()
    .where('program_id','=',programId)
    .orderBy('is_default','desc')
    .orderBy('created_at','desc')
    .execute();
  return new Response(JSON.stringify(rows), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
};

const createTemplate = async (_req: Request, _ctx: ApiContext, programId: string, body: unknown) => {
  const { name, is_default = false } = TemplateCreateSchema.parse(body);
  const created = await db.insertInto('sms_op.payment_plan_templates')
    .values({ program_id: programId, name, is_default })
    .returningAll().executeTakeFirstOrThrow();
  return new Response(JSON.stringify(created), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
};

const getInstalments = async (_req: Request, _ctx: ApiContext, templateId: string) => {
  const rows = await db.selectFrom('sms_op.payment_plan_template_instalments')
    .selectAll()
    .where('template_id','=',templateId)
    .orderBy('sort_order','asc')
    .execute();
  return new Response(JSON.stringify(rows), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
};

const replaceInstalments = async (_req: Request, _ctx: ApiContext, templateId: string, body: unknown) => {
  const items = InstalmentsReplaceSchema.parse(body);
  await db.transaction().execute(async (trx) => {
    await trx.deleteFrom('sms_op.payment_plan_template_instalments').where('template_id','=',templateId).execute();
    if (items.length > 0) {
      await trx.insertInto('sms_op.payment_plan_template_instalments')
        .values(items.map((i: { description: string; amount: number; offset_days: number; sort_order: number; }) => ({ template_id: templateId, description: i.description, amount: i.amount, offset_days: i.offset_days, sort_order: i.sort_order })))
        .execute();
    }
  });
  return new Response(JSON.stringify({ message: 'Updated' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
};

const updateTemplate = async (_req: Request, _ctx: ApiContext, templateId: string, body: unknown) => {
  const { is_default } = TemplateUpdateSchema.parse(body);
  const template = await db.selectFrom('sms_op.payment_plan_templates')
    .select(['id','program_id'])
    .where('id','=',templateId)
    .executeTakeFirst();
  if (!template) throw new NotFoundError('Template not found');
  await db.transaction().execute(async (trx) => {
    if (is_default) {
      await trx.updateTable('sms_op.payment_plan_templates')
        .set({ is_default: false })
        .where('program_id','=',template.program_id)
        .execute();
      await trx.updateTable('sms_op.payment_plan_templates')
        .set({ is_default: true })
        .where('id','=',templateId)
        .execute();
    } else {
      await trx.updateTable('sms_op.payment_plan_templates')
        .set({ is_default: false })
        .where('id','=',templateId)
        .execute();
    }
  });
  const updated = await db.selectFrom('sms_op.payment_plan_templates').selectAll().where('id','=',templateId).executeTakeFirstOrThrow();
  return new Response(JSON.stringify(updated), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
};

const deriveSchedule = async (_req: Request, _ctx: ApiContext, _applicationId: string, body: unknown) => {
  const { templateId, startDate, anchor, anchorDate } = DeriveSchema.parse(body);
  const instalments = await db.selectFrom('sms_op.payment_plan_template_instalments')
    .select(['description','amount','offset_days','sort_order'])
    .where('template_id','=',templateId)
    .orderBy('sort_order','asc')
    .execute();

  // Resolve effective start date
  let effectiveStart: Date | null = null;
  if (anchor === 'OFFER_LETTER') {
    effectiveStart = new Date();
  } else if (anchor === 'COMMENCEMENT') {
    // For now, require anchorDate until offering integration is wired
    if (!anchorDate) {
      throw new _ValidationError('anchorDate is required when anchor=COMMENCEMENT until offering dates are provided.');
    }
    effectiveStart = new Date(anchorDate);
  } else if (anchor === 'CUSTOM') {
    if (!anchorDate) {
      throw new _ValidationError('anchorDate is required when anchor=CUSTOM');
    }
    effectiveStart = new Date(anchorDate);
  } else if (startDate) {
    effectiveStart = new Date(startDate);
  } else {
    // Default fallback: today
    effectiveStart = new Date();
  }

  const items = instalments.map((i: { description: string; amount: string; offset_days: number; sort_order: number; }) => ({
    description: i.description,
    amount: Number(i.amount),
    dueDate: new Date(effectiveStart!.getTime() + i.offset_days * 86400000).toISOString().slice(0,10),
  }));
  return new Response(JSON.stringify({ items }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
};

const router = async (req: Request, ctx: ApiContext, body: unknown) => {
  const url = new URL(req.url);
  const p = url.pathname.split('/').filter(Boolean);
  const m = req.method;

  // GET /programs/{programId}/payment-plan-templates
  if (m === 'GET' && p.length === 3 && p[0] === 'programs' && p[2] === 'payment-plan-templates') {
    return listTemplates(req, ctx, p[1]);
  }
  // Support: /payment-plan-templates/programs/{programId}/payment-plan-templates
  if (m === 'GET' && p.length === 4 && p[0] === 'payment-plan-templates' && p[1] === 'programs' && p[3] === 'payment-plan-templates') {
    return listTemplates(req, ctx, p[2]);
  }

  // POST /programs/{programId}/payment-plan-templates
  if (m === 'POST' && p.length === 3 && p[0] === 'programs' && p[2] === 'payment-plan-templates') {
    return createTemplate(req, ctx, p[1], body);
  }
  // Support: /payment-plan-templates/programs/{programId}/payment-plan-templates
  if (m === 'POST' && p.length === 4 && p[0] === 'payment-plan-templates' && p[1] === 'programs' && p[3] === 'payment-plan-templates') {
    return createTemplate(req, ctx, p[2], body);
  }

  // GET /payment-plan-templates/{templateId}/instalments
  if (m === 'GET' && p.length === 3 && p[0] === 'payment-plan-templates' && p[2] === 'instalments') {
    return getInstalments(req, ctx, p[1]);
  }

  // PUT /payment-plan-templates/{templateId}/instalments
  if (m === 'PUT' && p.length === 3 && p[0] === 'payment-plan-templates' && p[2] === 'instalments') {
    return replaceInstalments(req, ctx, p[1], body);
  }

  // PATCH /payment-plan-templates/{templateId}
  if (m === 'PATCH' && p.length === 2 && p[0] === 'payment-plan-templates') {
    return updateTemplate(req, ctx, p[1], body);
  }

  // POST /applications/{applicationId}/derive-payment-plan
  if (m === 'POST' && p.length === 3 && p[0] === 'applications' && p[2] === 'derive-payment-plan') {
    return deriveSchedule(req, ctx, p[1], body);
  }
  // Support: /payment-plan-templates/applications/{applicationId}/derive-payment-plan
  if (m === 'POST' && p.length === 4 && p[0] === 'payment-plan-templates' && p[1] === 'applications' && p[3] === 'derive-payment-plan') {
    return deriveSchedule(req, ctx, p[2], body);
  }

  throw new NotFoundError();
};

serve(createApiRoute(router));


