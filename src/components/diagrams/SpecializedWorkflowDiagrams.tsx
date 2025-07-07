
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SpecializedWorkflowDiagrams = () => {
  return (
    <div className="space-y-8 p-6">
      <h1 className="text-3xl font-bold text-center mb-8">KUMULUS AWG - Specialized Workflow Diagrams</h1>
      
      {/* User Invitation and Onboarding Flow */}
      <Card>
        <CardHeader>
          <CardTitle>1. User Invitation & Onboarding Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="text-sm font-mono leading-relaxed">
              <div className="text-blue-600 font-bold mb-4">INVITATION FLOW:</div>
              <div className="ml-4 space-y-2">
                <div>Admin/Commercial → InvitationManagement.tsx</div>
                <div>↓</div>
                <div>create_invitation() SQL function</div>
                <div>↓</div>
                <div>send-invitation Edge Function</div>
                <div>↓</div>
                <div>Resend API → Email to User</div>
                <div>↓</div>
                <div>User clicks link → Login.tsx?token=XXX</div>
                <div>↓</div>
                <div>Supabase Auth validates token</div>
                <div>↓</div>
                <div>handle_new_user() trigger → profiles table</div>
                <div>↓</div>
                <div>User redirected to Dashboard</div>
              </div>
              
              <div className="text-green-600 font-bold mt-6 mb-4">USER ROLES:</div>
              <div className="ml-4 space-y-1">
                <div>• client → Can view own machines only</div>
                <div>• kumulus_personnel → Can view all machines</div>
                <div>• kumulus_admin → Full admin access</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin Impersonation Workflow */}
      <Card>
        <CardHeader>
          <CardTitle>2. Admin Impersonation Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="text-sm font-mono leading-relaxed">
              <div className="text-purple-600 font-bold mb-4">IMPERSONATION PROCESS:</div>
              <div className="ml-4 space-y-2">
                <div>Admin logs in → AuthContext checks role</div>
                <div>↓</div>
                <div>if (role === 'admin') → Show ImpersonationControls</div>
                <div>↓</div>
                <div>Admin selects user → startImpersonation(targetProfile)</div>
                <div>↓</div>
                <div>AuthContext updates state:</div>
                <div className="ml-4">
                  <div>• isImpersonating = true</div>
                  <div>• impersonatedProfile = targetProfile</div>
                  <div>• All hooks use impersonated profile</div>
                </div>
                <div>↓</div>
                <div>Dashboard shows impersonated user's view</div>
                <div>↓</div>
                <div>Admin can stopImpersonation() → Return to normal</div>
              </div>
              
              <div className="text-orange-600 font-bold mt-6 mb-4">SECURITY:</div>
              <div className="ml-4 space-y-1">
                <div>• Only kumulus_admin can impersonate</div>
                <div>• Frontend-only impersonation (no backend changes)</div>
                <div>• All RLS policies still apply to admin's actual user</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Synchronization Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>3. Data Synchronization Between InfluxDB and Supabase</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="text-sm font-mono leading-relaxed">
              <div className="text-red-600 font-bold mb-4">EVERY 15 MINUTES (CRON):</div>
              <div className="ml-4 space-y-2">
                <div>1. get-machine-data Edge Function</div>
                <div className="ml-4">
                  <div>• Queries InfluxDB for latest data</div>
                  <div>• Processes CSV response</div>
                  <div>• Stores in raw_machine_data table</div>
                  <div>• Updates simple_water_snapshots</div>
                </div>
                <div>↓</div>
                <div>2. track-water-production Edge Function</div>
                <div className="ml-4">
                  <div>• Compares current vs previous water levels</div>
                  <div>• Detects production/drainage events</div>
                  <div>• Stores in water_production_events</div>
                </div>
                <div>↓</div>
                <div>3. calculate-water-production Edge Function</div>
                <div className="ml-4">
                  <div>• Creates 15-minute production periods</div>
                  <div>• Calculates production rates</div>
                  <div>• Stores in water_production_periods</div>
                </div>
              </div>
              
              <div className="text-blue-600 font-bold mt-6 mb-4">DATA FLOW:</div>
              <div className="ml-4 space-y-1">
                <div>InfluxDB → raw_machine_data → water_production_events → water_production_periods</div>
                <div>Frontend fetches from: raw_machine_data, water_production_events, water_production_periods</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Production Metrics Calculation Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>4. Production Metrics Calculation Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="text-sm font-mono leading-relaxed">
              <div className="text-green-600 font-bold mb-4">PRODUCTION DETECTION LOGIC:</div>
              <div className="ml-4 space-y-2">
                <div>1. Water Level Monitoring (every 15 min)</div>
                <div className="ml-4">
                  <div>• Current level {'>'}  Previous level = PRODUCTION</div>
                  <div>• Current level {'<'} Previous level = DRAINAGE</div>
                  <div>• Level unchanged = NO_CHANGE</div>
                </div>
                <div>↓</div>
                <div>2. Production Event Creation</div>
                <div className="ml-4">
                  <div>• event_type: 'production' | 'drainage'</div>
                  <div>• production_liters: Math.abs(current - previous)</div>
                  <div>• Only positive production counts toward totals</div>
                </div>
                <div>↓</div>
                <div>3. Period Status Classification</div>
                <div className="ml-4">
                  <div>• 'producing': Active water production</div>
                  <div>• 'tank_full': Full tank, no production</div>
                  <div>• 'idle': No production, tank not full</div>
                </div>
              </div>
              
              <div className="text-purple-600 font-bold mt-6 mb-4">AGGREGATION:</div>
              <div className="ml-4 space-y-1">
                <div>• Daily: Sum of production events per day</div>
                <div>• Monthly: Average of daily percentages</div>
                <div>• All-time: Sum of ALL production events</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RLS Policy Enforcement */}
      <Card>
        <CardHeader>
          <CardTitle>5. Row Level Security (RLS) Policy Enforcement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="text-sm font-mono leading-relaxed">
              <div className="text-red-600 font-bold mb-4">POLICY HIERARCHY:</div>
              <div className="ml-4 space-y-2">
                <div>1. Service Role (Edge Functions)</div>
                <div className="ml-4">
                  <div>• Full access to all tables</div>
                  <div>• Bypasses all RLS policies</div>
                  <div>• Used for automated data ingestion</div>
                </div>
                <div>↓</div>
                <div>2. Authenticated Users</div>
                <div className="ml-4">
                  <div>• profiles: Can view/update own profile</div>
                  <div>• machines: Clients see own, personnel see all</div>
                  <div>• raw_machine_data: Only personnel can view</div>
                </div>
                <div>↓</div>
                <div>3. Role-Based Access</div>
                <div className="ml-4">
                  <div>• get_user_role(auth.uid()) function</div>
                  <div>• 'kumulus_personnel' = broad access</div>
                  <div>• 'kumulus_admin' = full admin access</div>
                  <div>• 'client' = limited to own data</div>
                </div>
              </div>
              
              <div className="text-orange-600 font-bold mt-6 mb-4">ENFORCEMENT POINTS:</div>
              <div className="ml-4 space-y-1">
                <div>• Database level: RLS policies on all tables</div>
                <div>• API level: Supabase enforces policies</div>
                <div>• Frontend level: Conditional rendering based on role</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cron Job Scheduling */}
      <Card>
        <CardHeader>
          <CardTitle>6. Cron Job Scheduling for Automated Functions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="text-sm font-mono leading-relaxed">
              <div className="text-blue-600 font-bold mb-4">CRON SCHEDULE (Every 15 minutes):</div>
              <div className="ml-4 space-y-2">
                <div>Job 1: 'track-water-production-every-15min'</div>
                <div className="ml-4">
                  <div>• Pattern: '*/15 * * * *'</div>
                  <div>• Calls: track-water-production function</div>
                  <div>• Purpose: Detect production events</div>
                </div>
                <div>↓</div>
                <div>Job 2: 'water-production-calculation-15min'</div>
                <div className="ml-4">
                  <div>• Pattern: '*/15 * * * *'</div>
                  <div>• Calls: calculate-water-production function</div>
                  <div>• Purpose: Calculate production periods</div>
                </div>
              </div>
              
              <div className="text-green-600 font-bold mt-6 mb-4">EXECUTION FLOW:</div>
              <div className="ml-4 space-y-2">
                <div>PostgreSQL pg_cron extension</div>
                <div>↓</div>
                <div>HTTP POST to Edge Functions</div>
                <div>↓</div>
                <div>Edge Function processes data</div>
                <div>↓</div>
                <div>Results stored in Supabase tables</div>
                <div>↓</div>
                <div>Frontend polls for updated data</div>
              </div>
              
              <div className="text-purple-600 font-bold mt-6 mb-4">MONITORING:</div>
              <div className="ml-4 space-y-1">
                <div>• data_ingestion_logs table tracks all operations</div>
                <div>• Edge Function logs available in Supabase dashboard</div>
                <div>• Frontend shows last update timestamps</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Handling and Recovery */}
      <Card>
        <CardHeader>
          <CardTitle>7. Error Handling and Recovery Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="text-sm font-mono leading-relaxed">
              <div className="text-red-600 font-bold mb-4">ERROR SCENARIOS:</div>
              <div className="ml-4 space-y-2">
                <div>1. InfluxDB Connection Failure</div>
                <div className="ml-4">
                  <div>• get-machine-data returns error</div>
                  <div>• Logged to data_ingestion_logs</div>
                  <div>• Frontend shows "Disconnected" status</div>
                </div>
                <div>↓</div>
                <div>2. Data Processing Errors</div>
                <div className="ml-4">
                  <div>• Invalid water level readings</div>
                  <div>• Malformed CSV responses</div>
                  <div>• Edge function timeout (30s limit)</div>
                </div>
                <div>↓</div>
                <div>3. Database Constraint Violations</div>
                <div className="ml-4">
                  <div>• Duplicate entries prevented</div>
                  <div>• Invalid timestamps rejected</div>
                  <div>• RLS policy violations</div>
                </div>
              </div>
              
              <div className="text-orange-600 font-bold mt-6 mb-4">RECOVERY MECHANISMS:</div>
              <div className="ml-4 space-y-1">
                <div>• Cron jobs retry automatically every 15 minutes</div>
                <div>• Frontend polling continues to check for updates</div>
                <div>• Data gaps filled when connection restored</div>
                <div>• Admin panel shows diagnostic information</div>
              </div>
              
              <div className="text-green-600 font-bold mt-6 mb-4">MONITORING TOOLS:</div>
              <div className="ml-4 space-y-1">
                <div>• DataIngestionMonitor component</div>
                <div>• DataFlowDiagnostics panel</div>
                <div>• Real-time connection status indicators</div>
                <div>• Error logging in data_ingestion_logs</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Machine State Transitions */}
      <Card>
        <CardHeader>
          <CardTitle>8. Machine State Transitions and Status Logic</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="text-sm font-mono leading-relaxed">
              <div className="text-blue-600 font-bold mb-4">STATUS CALCULATION LOGIC:</div>
              <div className="ml-4 space-y-2">
                <div>calculateMachineStatus(waterLevel, compressorOn, dataAge):</div>
                <div>↓</div>
                <div>if (dataAge {'>'}  60000ms) → "Disconnected"</div>
                <div>↓</div>
                <div>if (waterLevel {'>'}  9.9L) → "Full Water"</div>
                <div>↓</div>
                <div>if (compressorOn === 1) → "Producing"</div>
                <div>↓</div>
                <div>else → "Idle"</div>
              </div>
              
              <div className="text-green-600 font-bold mt-6 mb-4">STATE TRANSITIONS:</div>
              <div className="ml-4 space-y-2">
                <div>Disconnected ↔ Any State (based on data freshness)</div>
                <div>Idle → Producing (compressor starts)</div>
                <div>Producing → Full Water (tank reaches 9.9L+)</div>
                <div>Full Water → Idle (water consumed, compressor off)</div>
                <div>Full Water → Producing (compressor on despite full tank)</div>
              </div>
              
              <div className="text-purple-600 font-bold mt-6 mb-4">STATUS ANALYTICS:</div>
              <div className="ml-4 space-y-1">
                <div>• Daily: Percentage of time in each state</div>
                <div>• Monthly: Average of daily percentages</div>
                <div>• Real-time: Current machine status</div>
                <div>• Historical: 7-day and 3-month trends</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Frontend Data Flow */}
      <Card>
        <CardHeader>
          <CardTitle>9. Frontend Data Flow and Component Architecture</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="text-sm font-mono leading-relaxed">
              <div className="text-purple-600 font-bold mb-4">COMPONENT HIERARCHY:</div>
              <div className="ml-4 space-y-2">
                <div>App.tsx</div>
                <div>├── AuthContext (auth state)</div>
                <div>├── ProtectedRoute</div>
                <div>└── Dashboard Components:</div>
                <div className="ml-4">
                  <div>├── MachineSelector</div>
                  <div>├── MetricsCards</div>
                  <div>├── ProductionAnalytics</div>
                  <div>├── WaterTankIndicator</div>
                  <div>└── AdminPanel (if admin)</div>
                </div>
              </div>
              
              <div className="text-orange-600 font-bold mt-6 mb-4">DATA HOOKS:</div>
              <div className="ml-4 space-y-2">
                <div>useMachineData() → machines list</div>
                <div>useLiveMachineData() → real-time status</div>
                <div>useProductionAnalytics() → charts data</div>
                <div>useSimpleWaterProduction() → total production</div>
                <div>useDashboardData() → combined data</div>
              </div>
              
              <div className="text-red-600 font-bold mt-6 mb-4">UPDATE CYCLE:</div>
              <div className="ml-4 space-y-1">
                <div>• Live data: 10-second polling</div>
                <div>• Analytics: 5-minute refresh</div>
                <div>• Machine list: On profile change</div>
                <div>• Charts: When machine selected</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Integration Points */}
      <Card>
        <CardHeader>
          <CardTitle>10. API Integration Points and External Dependencies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="text-sm font-mono leading-relaxed">
              <div className="text-blue-600 font-bold mb-4">EXTERNAL APIS:</div>
              <div className="ml-4 space-y-2">
                <div>1. InfluxDB API</div>
                <div className="ml-4">
                  <div>• URL: INFLUXDB_URL secret</div>
                  <div>• Auth: INFLUXDB_TOKEN</div>
                  <div>• Queries: Flux query language</div>
                  <div>• Response: CSV format</div>
                </div>
                <div>↓</div>
                <div>2. Resend Email API</div>
                <div className="ml-4">
                  <div>• Used for: User invitations</div>
                  <div>• Auth: RESEND_API_KEY</div>
                  <div>• Triggered by: send-invitation function</div>
                </div>
                <div>↓</div>
                <div>3. Supabase APIs</div>
                <div className="ml-4">
                  <div>• Auth: User authentication</div>
                  <div>• Database: PostgreSQL via REST</div>
                  <div>• Functions: Edge function execution</div>
                  <div>• Storage: File uploads (if needed)</div>
                </div>
              </div>
              
              <div className="text-green-600 font-bold mt-6 mb-4">INTEGRATION FLOW:</div>
              <div className="ml-4 space-y-2">
                <div>Frontend → Supabase Client → PostgreSQL</div>
                <div>Cron Jobs → Edge Functions → External APIs</div>
                <div>Edge Functions → Supabase Database</div>
                <div>Email Service → User's Inbox</div>
              </div>
              
              <div className="text-red-600 font-bold mt-6 mb-4">DEPENDENCY MANAGEMENT:</div>
              <div className="ml-4 space-y-1">
                <div>• Secrets stored in Supabase vault</div>
                <div>• Environment-specific configurations</div>
                <div>• Fallback mechanisms for API failures</div>
                <div>• Rate limiting and retry logic</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SpecializedWorkflowDiagrams;
