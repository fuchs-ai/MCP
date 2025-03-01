/**
 * Datenbankmodelle für Artefakte und zugehörige Tabellen
 */
import { z } from 'zod';
import { db } from '../index';

// Zod-Schema für Artefakte
export const artifactSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  tool_name: z.string(),
  allowed_parameters: z.string().transform(val => JSON.parse(val)),
  required_approval: z.boolean().default(true),
  user_id: z.string(),
  created_at: z.string().or(z.date()),
  expires_at: z.string().or(z.date()).optional(),
  usage_count: z.number().default(0),
  max_usage: z.number().optional(),
  data_storage_enabled: z.boolean().default(false),
  data_storage_db_table: z.string().optional(),
  data_storage_store_results: z.boolean().default(true)
});

// Zod-Schema für Tool-Ergebnisse
export const toolResultSchema = z.object({
  id: z.number(),
  artifact_id: z.string(),
  tool_name: z.string(),
  parameters: z.string().transform(val => JSON.parse(val)),
  result: z.string().transform(val => JSON.parse(val)),
  executed_at: z.string().or(z.date()),
  user_id: z.string()
});

// Zod-Schema für Genehmigungen
export const approvalSchema = z.object({
  id: z.number(),
  artifact_id: z.string(),
  token: z.string(),
  parameters: z.string().transform(val => JSON.parse(val)),
  user_id: z.string(),
  created_at: z.string().or(z.date()),
  expires_at: z.string().or(z.date()).optional(),
  used: z.boolean().default(false)
});

// Typen basierend auf Schemas
export type Artifact = z.infer<typeof artifactSchema>;
export type ToolResult = z.infer<typeof toolResultSchema>;
export type Approval = z.infer<typeof approvalSchema>;

// DB-Zugriffsfunktionen
export const artifacts = {
  async create(artifact: Omit<Artifact, 'id'> & { id: string }): Promise<Artifact> {
    const serializedArtifact = {
      ...artifact,
      allowed_parameters: JSON.stringify(artifact.allowed_parameters)
    };
    
    await db.insertInto('artifacts')
      .values(serializedArtifact)
      .execute();
    
    return artifact;
  },
  
  async findById(id: string): Promise<Artifact | undefined> {
    const result = await db.selectFrom('artifacts')
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirst();
    
    if (!result) return undefined;
    
    return artifactSchema.parse(result);
  },
  
  async update(id: string, updates: Partial<Artifact>): Promise<boolean> {
    const serializedUpdates: Record<string, any> = { ...updates };
    
    if (updates.allowed_parameters) {
      serializedUpdates.allowed_parameters = JSON.stringify(updates.allowed_parameters);
    }
    
    const result = await db.updateTable('artifacts')
      .set(serializedUpdates)
      .where('id', '=', id)
      .execute();
    
    return result.numUpdatedRows > 0;
  },
  
  async incrementUsage(id: string): Promise<boolean> {
    const result = await db.updateTable('artifacts')
      .set(eb => ({ 
        usage_count: eb('usage_count', '+', 1) 
      }))
      .where('id', '=', id)
      .execute();
    
    return result.numUpdatedRows > 0;
  }
};

// Tool-Ergebnisse DB-Zugriffsfunktionen
export const toolResults = {
  async create(result: Omit<ToolResult, 'id'>): Promise<number> {
    const serializedResult = {
      ...result,
      parameters: JSON.stringify(result.parameters),
      result: JSON.stringify(result.result)
    };
    
    const insertResult = await db.insertInto('tool_results')
      .values(serializedResult)
      .returning('id')
      .executeTakeFirst();
    
    return insertResult?.id as number;
  },
  
  async findByArtifactId(artifactId: string, limit: number = 10): Promise<ToolResult[]> {
    const results = await db.selectFrom('tool_results')
      .where('artifact_id', '=', artifactId)
      .orderBy('executed_at', 'desc')
      .limit(limit)
      .selectAll()
      .execute();
    
    return results.map(result => toolResultSchema.parse(result));
  }
};

// Genehmigungen DB-Zugriffsfunktionen
export const approvals = {
  async create(approval: Omit<Approval, 'id'>): Promise<string> {
    const serializedApproval = {
      ...approval,
      parameters: JSON.stringify(approval.parameters)
    };
    
    await db.insertInto('approvals')
      .values(serializedApproval)
      .execute();
    
    return approval.token;
  },
  
  async findValidToken(token: string, artifactId: string): Promise<Approval | undefined> {
    const result = await db.selectFrom('approvals')
      .where('token', '=', token)
      .where('artifact_id', '=', artifactId)
      .where('used', '=', false)
      .where(eb => 
        eb('expires_at', '>', new Date().toISOString())
        .or('expires_at', 'is', null)
      )
      .selectAll()
      .executeTakeFirst();
    
    if (!result) return undefined;
    
    return approvalSchema.parse(result);
  },
  
  async markAsUsed(token: string): Promise<boolean> {
    const result = await db.updateTable('approvals')
      .set({ used: true })
      .where('token', '=', token)
      .execute();
    
    return result.numUpdatedRows > 0;
  }
}; 