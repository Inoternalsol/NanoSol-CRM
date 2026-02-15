import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function verifyDeletion() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting verification...");

    // 1. Get an organization
    const { data: orgs } = await supabase.from("organizations").select("id").limit(1);
    if (!orgs || orgs.length === 0) throw new Error("No organization found");
    const orgId = orgs[0].id;

    // 2. Create a test contact
    console.log("Creating test contact...");
    const { data: contact, error: contactError } = await supabase
        .from("contacts")
        .insert({
            organization_id: orgId,
            first_name: "Test",
            last_name: "Deletion",
            email: `test-delete-${Date.now()}@example.com`
        })
        .select()
        .single();

    if (contactError) throw contactError;
    console.log(`Created contact: ${contact.id}`);

    // 3. Create a sequence (if none exist) or get one
    const { data: sequences } = await supabase.from("email_sequences").select("id").limit(1);
    let sequenceId;
    if (!sequences || sequences.length === 0) {
        console.log("Creating test sequence...");
        const { data: seq } = await supabase.from("email_sequences").insert({
            organization_id: orgId,
            name: "Test Sequence"
        }).select().single();
        sequenceId = seq.id;
    } else {
        sequenceId = sequences[0].id;
    }

    // 4. Create an enrollment
    console.log("Creating enrollment...");
    const { data: enrollment, error: enrollError } = await supabase
        .from("sequence_enrollments")
        .insert({
            sequence_id: sequenceId,
            contact_id: contact.id,
            organization_id: orgId,
            status: "active"
        })
        .select()
        .single();

    if (enrollError) throw enrollError;
    console.log(`Created enrollment: ${enrollment.id}`);

    // 5. Create an email for that enrollment
    // We need an email account first
    const { data: accounts } = await supabase.from("smtp_configs").select("id").limit(1);
    if (!accounts || accounts.length === 0) {
        console.warn("Skipping email check as no email accounts exist.");
    } else {
        console.log("Creating email record...");
        const { data: email, error: emailError } = await supabase
            .from("emails")
            .insert({
                account_id: accounts[0].id,
                organization_id: orgId,
                from_addr: "test@example.com",
                to_addr: contact.email,
                enrollment_id: enrollment.id,
                subject: "Test Cascade"
            })
            .select()
            .single();
        if (emailError) console.warn("Could not create email record:", emailError.message);
        else console.log(`Created email: ${email.id}`);
    }

    // 6. Delete the contact
    console.log("Deleting contact...");
    const { error: deleteError } = await supabase.from("contacts").delete().eq("id", contact.id);
    if (deleteError) {
        console.error("Deletion FAILED:", deleteError.message);
        process.exit(1);
    }
    console.log("Deletion call successful.");

    // 7. Verify enrollment is gone
    const { data: enrollCheck } = await supabase
        .from("sequence_enrollments")
        .select("id")
        .eq("id", enrollment.id)
        .maybeSingle();

    if (enrollCheck) {
        console.error("FAILURE: Enrollment still exists!");
        process.exit(1);
    } else {
        console.log("SUCCESS: Enrollment cascadingly deleted.");
    }

    console.log("Verification COMPLETE.");
}

verifyDeletion().catch(console.error);
