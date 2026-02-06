/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const { createDecipheriv, scryptSync } = require('crypto');
require('dotenv').config({ path: '.env.local' });

// --- DECRYPTION LOGIC (Inlined from lib/crypto.ts) ---
const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY || 'nanosol-crm-default-encryption-secret-key-2024';

function decrypt(hash) {
    try {
        const parts = hash.split(':');
        if (parts.length !== 4) throw new Error('Invalid format');
        const [saltHex, ivHex, tagHex, encryptedHex] = parts;

        const salt = Buffer.from(saltHex, 'hex');
        const iv = Buffer.from(ivHex, 'hex');
        const tag = Buffer.from(tagHex, 'hex');
        const encrypted = Buffer.from(encryptedHex, 'hex');

        const key = scryptSync(ENCRYPTION_KEY, salt, 32);
        const decipher = createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);

        let decrypted = decipher.update(encrypted, undefined, 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        console.error("Decryption failed:", e.message);
        return null;
    }
}

// --- MAIN SETUP ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runManualProcess() {
    console.log('--- Manual Sequence Processing (Service Role) ---');

    // 1. Fetch Enrollments
    const { data: enrollments, error } = await supabase
        .from('sequence_enrollments')
        .select(`
        *,
        contact:contacts(id, email, first_name, last_name, organization_id),
        sequence:email_sequences(id, name, steps, smtp_config_id, organization_id)
    `)
        .eq('status', 'active')
        .or(`next_send_at.lte.${new Date().toISOString()},next_send_at.is.null`);

    if (error) {
        console.error("Fetch Error:", error);
        return;
    }

    if (!enrollments || enrollments.length === 0) {
        console.log("No enrollments due.");
        return;
    }

    console.log(`Processing ${enrollments.length} enrollments...`);

    for (const e of enrollments) {
        console.log(`\n--- Processing Enrollment ${e.id} ---`);

        try {
            const contact = e.contact;
            const sequence = e.sequence;

            // Template
            const step = sequence.steps[e.current_step];
            if (!step) {
                console.error("Step not found. Completing.");
                continue;
            }

            const { data: template } = await supabase.from('email_templates').select('*').eq('id', step.template_id).single();
            if (!template) {
                console.error("Template not found");
                continue;
            }

            // SMTP
            const { data: smtp } = await supabase.from('smtp_configs').select('*').eq('id', sequence.smtp_config_id).single();
            if (!smtp) {
                console.error("SMTP not found");
                continue;
            }

            console.log(`SMTP Config ID: ${smtp.id}`);
            console.log(`Encrypted Hash: "${smtp.smtp_pass_encrypted}"`);
            console.log(`Key Source: ${process.env.EMAIL_ENCRYPTION_KEY ? "Env Var" : "Default Fallback"}`);

            const password = decrypt(smtp.smtp_pass_encrypted);
            if (!password) {
                console.error("Password decryption failed");
                continue;
            }

            console.log(`Using SMTP: ${smtp.smtp_user} (${smtp.smtp_host})`);

            const transporter = nodemailer.createTransport({
                host: smtp.smtp_host,
                port: smtp.smtp_port,
                secure: smtp.smtp_port === 465,
                auth: { user: smtp.smtp_user, pass: password },
                tls: { rejectUnauthorized: false }
            });

            // VERIFY CONNECTION
            try {
                await transporter.verify();
                console.log("SMTP Connection Values: OK");
            } catch (verifyErr) {
                console.error("SMTP Verify FAILED:", verifyErr);
                continue; // Stop here if SMTP is bad
            }

            // PREPARE EMAIL
            const subject = step.subject_override || template.subject;
            let body = template.body_html || template.body_text || '';
            body = body.replace(/{{first_name}}/g, contact.first_name || '');

            // INSERT DB LOG (Simulating the failure point in route.ts)
            console.log("Attempting to insert email record...");
            const { data: emailRec, error: dbErr } = await supabase.from('emails').insert({
                account_id: smtp.id,
                organization_id: smtp.organization_id,
                from_addr: smtp.email_addr,
                to_addr: contact.email,
                subject: subject,
                body_html: body,
                folder: 'sent',
                is_read: true,
                received_at: new Date().toISOString(),
                enrollment_id: e.id // optional relation
            }).select().single();

            if (dbErr) {
                console.error("DB INSERT FAILED (emails):", dbErr);
                // If this fails, this is likely the cause of "0 sent, 2 failed"
            } else {
                console.log("DB Insert Success:", emailRec.id);

                // SEND EMAIL
                console.log("Sending email via Nodemailer...");
                const info = await transporter.sendMail({
                    from: `"${smtp.name}" <${smtp.email_addr}>`,
                    to: contact.email,
                    subject: subject,
                    html: body
                });
                console.log("Email Sent! MessageID:", info.messageId);

                // Log activity
                await supabase.from('activities').insert({
                    organization_id: smtp.organization_id,
                    contact_id: contact.id,
                    type: 'email',
                    title: `Sent: ${subject}`,
                    description: 'Manual process test',
                    created_by: smtp.user_id || contact.owner_id // fallback
                });
            }

        } catch (err) {
            console.error("Processing Exception:", err);
        }
    }
}

runManualProcess();
