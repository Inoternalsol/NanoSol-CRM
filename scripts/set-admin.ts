
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function setAdmin() {
    const email = process.argv[2];

    if (!email) {
        console.error("Please provide an email address as an argument.");
        process.exit(1);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error("Missing Supabase credentials in .env.local");
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Looking up user with email: ${email}...`);

    // 1. Get User ID from Auth Admin API
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) {
        console.error("Error listing users:", userError);
        process.exit(1);
    }

    const user = users.find((u) => u.email === email);

    if (!user) {
        console.error(`❌ User with email '${email}' not found in Supabase Auth.`);
        console.log("Ensure the user has signed up.");
        process.exit(1);
    }

    console.log(`Found Auth User ID: ${user.id}`);

    // 2. Check or Create Organization
    let orgId: string;
    const { data: existingOrg, error: orgError } = await supabase
        .from("organizations")
        .select("id")
        .limit(1)
        .maybeSingle();

    if (existingOrg) {
        orgId = existingOrg.id;
        console.log(`Using existing organization: ${orgId}`);
    } else {
        console.log("No organization found. Creating default organization...");
        const { data: newOrg, error: createOrgError } = await supabase
            .from("organizations")
            .insert({
                name: "My Organization",
                slug: "my-org-" + Date.now(), // timestamp for uniqueness
            })
            .select()
            .single();

        if (createOrgError) {
            console.error("Error creating organization:", createOrgError);
            process.exit(1);
        }
        orgId = newOrg.id;
        console.log(`Created new organization: ${orgId}`);
    }

    // 3. Upsert Profile
    console.log("Updating/Creating profile...");
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .upsert(
            {
                user_id: user.id,
                email: email,
                organization_id: orgId,
                role: "admin",
                full_name: "Admin User", // Set a default name if missing
            },
            { onConflict: "user_id" }
        )
        .select()
        .single();

    if (profileError) {
        console.error("Error upserting profile:", profileError);
        process.exit(1);
    }

    console.log(`✅ Successfully updated/created profile for ${email}`);
    console.log("Profile:", profile);
}

setAdmin();
