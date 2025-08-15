import bcrypt from 'bcrypt';
import { supabase } from '../lib/supabase.js';

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Create demo tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: 'Demo Financial Services',
        domain: 'demo',
        settings: {
          theme: 'default',
          currency: 'INR',
          timezone: 'Asia/Kolkata'
        }
      })
      .select()
      .single();

    if (tenantError) {
      console.error('Error creating tenant:', tenantError);
      return;
    }

    console.log('✅ Tenant created:', tenant.name);

    // Create demo users
    const users = [
      {
        email: 'admin@demo.com',
        password: 'admin123',
        name: 'System Admin',
        role: 'Admin'
      },
      {
        email: 'maker@demo.com',
        password: 'maker123',
        name: 'John Maker',
        role: 'Maker'
      },
      {
        email: 'checker@demo.com',
        password: 'checker123',
        name: 'Jane Checker',
        role: 'Checker'
      },
      {
        email: 'underwriter@demo.com',
        password: 'underwriter123',
        name: 'Bob Underwriter',
        role: 'Underwriter'
      }
    ];

    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      const { error: userError } = await supabase
        .from('users')
        .insert({
          tenant_id: tenant.id,
          email: user.email,
          password_hash: hashedPassword,
          name: user.name,
          role: user.role
        });

      if (userError) {
        console.error(`Error creating user ${user.email}:`, userError);
      } else {
        console.log(`✅ User created: ${user.name} (${user.role})`);
      }
    }

    // Create demo workflow
    const workflowConfig = {
      workflowId: 'micro_loan_v1',
      version: 1,
      tenantId: tenant.id,
      name: 'Micro Loan Processing',
      description: 'Standard micro loan processing workflow',
      stages: [
        { id: 'draft', label: 'Draft', slaHours: 48, description: 'Initial loan application' },
        { id: 'doc_verify', label: 'Document Verification', slaHours: 24, description: 'Verify submitted documents' },
        { id: 'underwriting', label: 'Underwriting', slaHours: 48, description: 'Credit assessment and risk evaluation' },
        { id: 'approval', label: 'Approval', slaHours: 12, description: 'Final approval decision' },
        { id: 'disbursement', label: 'Disbursement', slaHours: 24, description: 'Loan disbursement process' },
        { id: 'completed', label: 'Completed', slaHours: 0, description: 'Loan successfully disbursed' }
      ],
      transitions: [
        {
          id: 'submit_application',
          from: 'draft',
          to: 'doc_verify',
          label: 'Submit Application',
          condition: 'true',
          roles: ['Maker'],
          actions: ['validate_basic_info']
        },
        {
          id: 'verify_documents',
          from: 'doc_verify',
          to: 'underwriting',
          label: 'Documents Verified',
          condition: 'docs_verified == true',
          roles: ['Checker'],
          actions: ['trigger_ai_scoring']
        },
        {
          id: 'complete_underwriting',
          from: 'underwriting',
          to: 'approval',
          label: 'Underwriting Complete',
          condition: 'underwriting_complete == true',
          roles: ['Underwriter'],
          actions: ['generate_recommendation']
        },
        {
          id: 'approve_loan',
          from: 'approval',
          to: 'disbursement',
          label: 'Approve Loan',
          condition: 'decision == "approved"',
          roles: ['Admin', 'Underwriter'],
          actions: ['create_loan_account']
        },
        {
          id: 'disburse_loan',
          from: 'disbursement',
          to: 'completed',
          label: 'Disburse Funds',
          condition: 'disbursement_ready == true',
          roles: ['DisbursementOfficer'],
          actions: ['transfer_funds', 'send_confirmation']
        }
      ],
      autoRules: [
        {
          id: 'auto_score',
          stage: 'doc_verify',
          trigger: 'onEnter',
          action: 'call:ai/score',
          params: { model: 'credit_scoring_v1' },
          condition: 'documents_complete == true'
        },
        {
          id: 'auto_approve_low_risk',
          stage: 'underwriting',
          trigger: 'onEnter',
          action: 'auto_transition',
          params: { target_stage: 'approval', decision: 'auto_approved' },
          condition: 'pd_score < 0.05 && requested_amount < 100000'
        }
      ]
    };

    const { data: workflowData, error: workflowError } = await supabase
      .from('workflow_configs')
      .insert({
        workflow_id: workflowConfig.workflowId,
        tenant_id: tenant.id,
        name: workflowConfig.name,
        description: workflowConfig.description,
        config: workflowConfig,
        created_by: (await supabase.from('users').select('id').eq('email', 'admin@demo.com').eq('tenant_id', tenant.id).single()).data?.id
      })
      .select()
      .single();

    if (workflowError) {
      console.error('Error creating workflow:', workflowError);
    } else {
      console.log('✅ Workflow created:', workflowConfig.name);
    }

    // Create sample borrowers
    const borrowers = [
      {
        name: 'Rajesh Kumar',
        email: 'rajesh.kumar@email.com',
        phone: '+91-9876543210',
        date_of_birth: '1985-06-15',
        pan: 'ABCDE1234F',
        aadhar: '1234-5678-9012',
        kyc_status: 'completed',
        address: {
          street: '123, MG Road',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560001',
          country: 'India'
        },
        financial_info: {
          monthlyIncome: 45000,
          employmentType: 'Salaried',
          creditScore: 720,
          existingLoans: 0
        }
      },
      {
        name: 'Priya Sharma',
        email: 'priya.sharma@email.com',
        phone: '+91-9876543211',
        date_of_birth: '1990-03-22',
        pan: 'FGHIJ5678K',
        kyc_status: 'in_progress',
        address: {
          street: '456, Park Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          country: 'India'
        },
        financial_info: {
          monthlyIncome: 35000,
          employmentType: 'Self-Employed',
          existingLoans: 1
        }
      }
    ];

    for (const borrower of borrowers) {
      const { error: borrowerError } = await supabase
        .from('borrowers')
        .insert({
          tenant_id: tenant.id,
          ...borrower
        });

      if (borrowerError) {
        console.error(`Error creating borrower ${borrower.name}:`, borrowerError);
      } else {
        console.log(`✅ Borrower created: ${borrower.name}`);
      }
    }

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Demo Credentials:');
    console.log('Tenant: demo');
    console.log('Admin: admin@demo.com / admin123');
    console.log('Maker: maker@demo.com / maker123');
    console.log('Checker: checker@demo.com / checker123');
    console.log('Underwriter: underwriter@demo.com / underwriter123');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase();
}

export { seedDatabase };