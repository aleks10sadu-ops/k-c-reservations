
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRoles() {
    console.log('Checking roles in public.roles...');

    // 1. Check all roles in public.roles
    const { data: roles, error: rolesError } = await supabase
        .from('roles')
        .select('*');

    if (rolesError) {
        console.error('Error fetching roles:', rolesError);
    } else {
        console.log('Found roles in public.roles:', roles);
    }

    // 2. Check specific function get_role_id_by_name
    console.log("Checking function 'get_role_id_by_name('Администратор')...");
    const { data: roleId, error: rpcError } = await supabase
        .rpc('get_role_id_by_name', { role_name: 'Администратор' });

    if (rpcError) {
        console.error('Error calling get_role_id_by_name:', rpcError);
    } else {
        console.log("Result of get_role_id_by_name('Администратор'):", roleId);
    }
}

checkRoles().catch(console.error);
