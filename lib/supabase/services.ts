import { createClient } from "@/lib/supabase/client";
import type { Contact, Deal, Activity, Task, Pipeline } from "@/types";

const supabase = createClient();

// ============================================
// CONTACTS
// ============================================

export async function getContacts(organizationId?: string) {
    const query = supabase
        .from("contacts")
        .select("*")
        .order("created_at", { ascending: false });

    if (organizationId) {
        query.eq("organization_id", organizationId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Contact[];
}

export async function getContact(id: string) {
    const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", id)
        .single();

    if (error) throw error;
    return data as Contact;
}

export async function createContact(
    contact: Omit<Contact, "id" | "created_at" | "updated_at">
) {
    const { data, error } = await supabase
        .from("contacts")
        .insert(contact)
        .select()
        .single();

    if (error) throw error;
    return data as Contact;
}

export async function updateContact(
    id: string,
    updates: Partial<Contact>
) {
    const { data, error } = await supabase
        .from("contacts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return data as Contact;
}

export async function deleteContact(id: string) {
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (error) throw error;
}

// ============================================
// DEALS
// ============================================

export async function getDeals(organizationId?: string) {
    const query = supabase
        .from("deals")
        .select(`
      *,
      contact:contacts(id, first_name, last_name, email),
      pipeline:pipelines(id, name, stages)
    `)
        .order("created_at", { ascending: false });

    if (organizationId) {
        query.eq("organization_id", organizationId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Deal[];
}

export async function getDeal(id: string) {
    const { data, error } = await supabase
        .from("deals")
        .select(`
      *,
      contact:contacts(id, first_name, last_name, email, phone, company),
      pipeline:pipelines(id, name, stages)
    `)
        .eq("id", id)
        .single();

    if (error) throw error;
    return data as Deal;
}

export async function createDeal(
    deal: Omit<Deal, "id" | "created_at" | "updated_at">
) {
    const { data, error } = await supabase
        .from("deals")
        .insert(deal)
        .select()
        .single();

    if (error) throw error;
    return data as Deal;
}

export async function updateDeal(id: string, updates: Partial<Deal>) {
    const { data, error } = await supabase
        .from("deals")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return data as Deal;
}

export async function updateDealStage(id: string, stage: string, probability?: number) {
    const updates: Partial<Deal> = { stage };
    if (probability !== undefined) {
        updates.probability = probability;
    }
    return updateDeal(id, updates);
}

export async function deleteDeal(id: string) {
    const { error } = await supabase.from("deals").delete().eq("id", id);
    if (error) throw error;
}

// ============================================
// PIPELINES
// ============================================

export async function getPipelines(organizationId?: string) {
    const query = supabase
        .from("pipelines")
        .select("*")
        .order("created_at", { ascending: true });

    if (organizationId) {
        query.eq("organization_id", organizationId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Pipeline[];
}

export async function getDefaultPipeline(organizationId: string) {
    const { data, error } = await supabase
        .from("pipelines")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("is_default", true)
        .single();

    if (error) throw error;
    return data as Pipeline;
}

export async function createPipeline(
    pipeline: Omit<Pipeline, "id" | "created_at">
) {
    const { data, error } = await supabase
        .from("pipelines")
        .insert(pipeline)
        .select()
        .single();

    if (error) throw error;
    return data as Pipeline;
}

// ============================================
// ACTIVITIES
// ============================================

export async function getActivities(options: {
    organizationId?: string;
    contactId?: string;
    dealId?: string;
    limit?: number;
}) {
    let query = supabase
        .from("activities")
        .select(`
      *,
      created_by:profiles(id, full_name, avatar_url)
    `)
        .order("created_at", { ascending: false });

    if (options.organizationId) {
        query = query.eq("organization_id", options.organizationId);
    }
    if (options.contactId) {
        query = query.eq("contact_id", options.contactId);
    }
    if (options.dealId) {
        query = query.eq("deal_id", options.dealId);
    }
    if (options.limit) {
        query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Activity[];
}

export async function createActivity(
    activity: Omit<Activity, "id" | "created_at">
) {
    const { data, error } = await supabase
        .from("activities")
        .insert(activity)
        .select()
        .single();

    if (error) throw error;
    return data as Activity;
}

// ============================================
// TASKS
// ============================================

export async function getTasks(options: {
    organizationId?: string;
    assignedTo?: string;
    status?: "pending" | "in_progress" | "completed";
    limit?: number;
}) {
    let query = supabase
        .from("tasks")
        .select(`
      *,
      assigned_to:profiles(id, full_name, avatar_url),
      contact:contacts(id, first_name, last_name),
      deal:deals(id, name)
    `)
        .order("due_date", { ascending: true });

    if (options.organizationId) {
        query = query.eq("organization_id", options.organizationId);
    }
    if (options.assignedTo) {
        query = query.eq("assigned_to", options.assignedTo);
    }
    if (options.status) {
        query = query.eq("status", options.status);
    }
    if (options.limit) {
        query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Task[];
}

export async function createTask(task: Omit<Task, "id" | "created_at" | "updated_at">) {
    const { data, error } = await supabase
        .from("tasks")
        .insert(task)
        .select()
        .single();

    if (error) throw error;
    return data as Task;
}

export async function updateTask(id: string, updates: Partial<Task>) {
    const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return data as Task;
}

export async function completeTask(id: string) {
    return updateTask(id, { status: "completed" });
}

export async function deleteTask(id: string) {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) throw error;
}
