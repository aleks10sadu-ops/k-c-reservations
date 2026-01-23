
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

async function checkStaffRoles() {
    console.log('Checking roles in public.staff_roles...');

    const { data: roles, error } = await supabase
        .from('staff_roles')
        .select('*');

    if (error) {
        console.error('Error fetching staff_roles:', error);
    } else {
        console.log('Found roles in public.staff_roles:', roles);
        const adminRole = roles?.find(r => r.name === 'Администратор');
        if (adminRole) {
            console.log("✅ 'Администратор' role found with ID:", adminRole.id);
        } else {
            console.log("❌ 'Администратор' role NOT found.");
        }
    }

    // Check function again to be sure
    console.log("Checking function 'get_role_id_by_name('Администратор')...");
    const { data: roleId, error: rpcError } = await supabase
        .rpc('get_role_id_by_name', { role_name: 'Администратор' });

    if (rpcError) {
        console.error('Error calling get_role_id_by_name:', rpcError);
    } else {
        console.log("Result of get_role_id_by_name('Администратор'):", roleId);
    }

}

checkStaffRoles().catch(console.error);
